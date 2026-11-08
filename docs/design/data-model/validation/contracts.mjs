// Executable design examples for DB verification. Not a production API/DAO.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { quote as q, transaction, query } from './db.mjs';

const money = value => {
  const v = String(value);
  assert.match(v, /^\d+(\.\d{1,2})?$/, 'MONEY_PRECISION');
  return v;
};
const positive = value => { assert.ok(Number.isSafeInteger(value) && value > 0, 'QUANTITY'); return value; };
const required = (row, message = 'NOT_FOUND') => { assert.ok(row, message); return row; };
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);

export async function command(actor, operation, key, payload, work) {
  const digest = createHash('sha256').update(canonical(payload)).digest('hex');
  return transaction(async s => {
    const inserted = await s.rows(`INSERT INTO command_receipt(actor_subject,operation,command_key,payload_digest,result)
      VALUES (${q(actor)},${q(operation)},${q(key)},${q(digest)},'{}')
      ON CONFLICT DO NOTHING RETURNING command_key`);
    if (!inserted.length) {
      const [receipt] = await s.rows(`SELECT payload_digest,result FROM command_receipt WHERE actor_subject=${q(actor)}
        AND operation=${q(operation)} AND command_key=${q(key)}`);
      assert.equal(receipt.payload_digest, digest, 'IDEMPOTENCY_CONFLICT');
      return receipt.result;
    }
    const result = await work(s);
    await s.exec(`UPDATE command_receipt SET result=${q(JSON.stringify(result))}::jsonb WHERE actor_subject=${q(actor)}
      AND operation=${q(operation)} AND command_key=${q(key)};`);
    return result;
  });
}

export async function addBook(s, { actor = 'staff', sourceOffer = null, title = 'Synthetic book', price = '10.00', cost = '4.00', quantity = 1, at = '2026-11-01T00:00:00Z', fields = null } = {}) {
  assert.ok(Number.isSafeInteger(quantity) && quantity >= 0, 'QUANTITY');
  const cols = fields ?? { title, author: 'Synthetic author', isbn: 'duplicate-isbn', publisher_id: 1, book_type_id: 2, genre_id: 3, condition_id: 4 };
  const [b] = await s.rows(`INSERT INTO book(title,author,isbn,publisher_id,book_type_id,genre_id,condition_id,current_price)
    VALUES (${q(cols.title)},${q(cols.author)},${q(cols.isbn)},${cols.publisher_id},${cols.book_type_id},${cols.genre_id},${cols.condition_id},${money(price)}) RETURNING book_id`);
  await s.exec(`INSERT INTO book_receipt(book_id,source_offer_id,purchase_cost,initial_quantity,actor_subject,recorded_at)
    VALUES (${b.book_id},${sourceOffer ?? 'NULL'},${money(cost)},${quantity},${q(actor)},${q(at)});
    INSERT INTO stock_movement(book_id,sequence_no,kind,quantity_before,quantity_after,actor_subject,occurred_at)
    VALUES (${b.book_id},1,${q(sourceOffer === null ? 'REGISTERED' : 'SHELVED')},0,${quantity},${q(actor)},${q(at)});
    INSERT INTO stock_balance VALUES (${b.book_id},1,${quantity});`);
  return b.book_id;
}

export async function movement(s, bookId, kind, after, actor, at, orderId = null, eventSequence = null, reason = null) {
  const [balance] = await s.rows(`SELECT * FROM stock_balance WHERE book_id=${bookId} FOR UPDATE`);
  required(balance, 'MISSING_BALANCE');
  assert.ok(Number.isSafeInteger(after) && after >= 0, 'INSUFFICIENT_STOCK');
  const next = balance.head_sequence + 1;
  await s.exec(`INSERT INTO stock_movement(book_id,sequence_no,previous_sequence,kind,quantity_before,quantity_after,
    order_id,order_event_sequence,reason,actor_subject,occurred_at)
    VALUES (${bookId},${next},${balance.head_sequence},${q(kind)},${balance.available},${after},
      ${orderId ?? 'NULL'},${eventSequence ?? 'NULL'},${q(reason)},${q(actor)},${q(at)});
    UPDATE stock_balance SET head_sequence=${next},available=${after} WHERE book_id=${bookId};`);
}

export async function confirm(cartId, actor) {
  const [cart] = await query(`SELECT * FROM cart WHERE cart_id=${q(cartId)} AND customer_subject=${q(actor)}`);
  required(cart);
  const items = await query(`SELECT i.book_id,i.quantity,b.current_price::text AS price,s.available FROM cart_item i
    JOIN book b USING(book_id) JOIN stock_balance s USING(book_id) WHERE i.cart_id=${q(cartId)} AND i.kind='PURCHASE' ORDER BY i.book_id`);
  return { cartId, revision: cart.revision, items: items.filter(i => i.available > 0).map(({ available, ...i }) => i),
    excluded: items.filter(i => i.available === 0).map(i => i.book_id) };
}

export async function checkout({ actor = 'alice', confirmation, addressId = 1, key = randomUUID(), at = '2026-11-01T00:00:00Z', hook, failAfterStock = false }) {
  return command(actor, 'PLACE_ORDER', key, { confirmation, addressId }, async s => {
    await s.rows(`SELECT subject FROM customer WHERE subject=${q(actor)} FOR UPDATE`);
    const [cart] = await s.rows(`SELECT * FROM cart WHERE cart_id=${q(confirmation.cartId)} AND customer_subject=${q(actor)} FOR UPDATE`);
    required(cart);
    assert.equal(cart.revision, confirmation.revision, 'CART_CHANGED');
    const [address] = await s.rows(`SELECT * FROM address WHERE address_id=${addressId} AND customer_subject=${q(actor)} AND active FOR SHARE`);
    required(address, 'ADDRESS_NOT_FOUND');
    assert.ok(confirmation.items.length > 0, 'EMPTY_ORDER');
    const ids = confirmation.items.map(i => positive(i.book_id));
    assert.equal(new Set(ids).size, ids.length, 'DUPLICATE_ITEM');
    await s.rows(`SELECT book_id FROM book WHERE book_id IN (${ids.join(',')}) ORDER BY book_id FOR UPDATE`);
    await hook?.(s);
    for (const i of confirmation.items) {
      positive(i.quantity);
      const [row] = await s.rows(`SELECT b.current_price::text AS price,st.available,ci.quantity FROM book b
        JOIN stock_balance st USING(book_id) JOIN cart_item ci USING(book_id)
        WHERE b.book_id=${i.book_id} AND ci.cart_id=${q(cart.cart_id)} AND ci.kind='PURCHASE'`);
      required(row);
      assert.equal(row.price, i.price, 'PRICE_CHANGED');
      assert.equal(row.quantity, i.quantity, 'CART_CHANGED');
      assert.ok(row.available >= i.quantity, 'INSUFFICIENT_STOCK');
    }
    const values = confirmation.items.map(i => `(${i.book_id},${i.quantity})`).join(',');
    const [order] = await s.rows(`WITH selected(book_id,quantity) AS (VALUES ${values}),
      amount AS (SELECT sum(b.current_price*i.quantity) AS subtotal FROM selected i JOIN book b USING(book_id))
      INSERT INTO sales_order(order_number,customer_subject,source_address_id,ship_line1,ship_line2,ship_city,ship_state_code,ship_postal_code,ship_country_code,
        ordered_at,delivery_due_date,subtotal,tax,total)
      SELECT ${q('B-' + randomUUID())},${q(actor)},${address.address_id},${q(address.line1)},${q(address.line2)},${q(address.city)},
        ${q(address.state_code)},${q(address.postal_code)},'US',${q(at)},(${q(at)}::timestamptz AT TIME ZONE 'UTC')::date+7,
        subtotal,round(subtotal*0.10,2),subtotal+round(subtotal*0.10,2) FROM amount RETURNING order_id,order_number,total::text,delivery_due_date`);
    await s.exec(`INSERT INTO order_item SELECT ${order.order_id},i.book_id,i.quantity,b.current_price,r.purchase_cost
      FROM (VALUES ${values}) i(book_id,quantity) JOIN book b USING(book_id) JOIN book_receipt r USING(book_id);
      INSERT INTO order_event(order_id,sequence_no,kind,actor_subject,occurred_at) VALUES (${order.order_id},1,'PLACED',${q(actor)},${q(at)});
      INSERT INTO order_state VALUES (${order.order_id},1,'PENDING');`);
    for (const i of [...confirmation.items].sort((a,b) => a.book_id-b.book_id)) {
      const [st] = await s.rows(`SELECT available FROM stock_balance WHERE book_id=${i.book_id}`);
      await movement(s, i.book_id, 'ORDERED', st.available-i.quantity, actor, at, order.order_id, 1);
    }
    if (failAfterStock) throw new Error('INJECTED_FAILURE');
    await s.exec(`DELETE FROM cart_item WHERE cart_id=${q(cart.cart_id)} AND kind='PURCHASE' AND book_id IN (${ids.join(',')});
      UPDATE cart SET revision=revision+1,updated_at=${q(at)} WHERE cart_id=${q(cart.cart_id)};`);
    return order;
  });
}

export async function orderTransition({ actor = 'staff', orderId, kind, key = randomUUID(), at = '2026-11-02T00:00:00Z', customer = false, hook }) {
  return command(actor, kind, key, { orderId, kind, customer }, async s => {
    const [order] = await s.rows(`SELECT * FROM sales_order WHERE order_id=${positive(orderId)}${customer ? ` AND customer_subject=${q(actor)}` : ''} FOR UPDATE`);
    required(order);
    const [state] = await s.rows(`SELECT * FROM order_state WHERE order_id=${orderId} FOR UPDATE`);
    const allowed = { ACCEPTED: ['PENDING'], SHIPPED: ['ORDERED'], DELIVERED: ['SHIPPED'], CANCELLED: ['PENDING','ORDERED'] };
    assert.ok(allowed[kind]?.includes(state.status), 'INVALID_ORDER_TRANSITION');
    assert.ok(!customer || kind === 'CANCELLED', 'FORBIDDEN');
    await hook?.(s);
    const next = state.head_sequence+1;
    await s.exec(`INSERT INTO order_event(order_id,sequence_no,previous_sequence,kind,actor_subject,occurred_at)
      VALUES (${orderId},${next},${state.head_sequence},${q(kind)},${q(actor)},${q(at)});`);
    if (kind === 'CANCELLED') {
      const items = await s.rows(`SELECT i.book_id,i.quantity FROM order_item i JOIN book b USING(book_id)
        WHERE order_id=${orderId} ORDER BY i.book_id FOR UPDATE OF b`);
      for (const i of items) {
        const [st] = await s.rows(`SELECT available FROM stock_balance WHERE book_id=${i.book_id}`);
        await movement(s, i.book_id, 'CANCELLED', st.available+i.quantity, actor, at, orderId, next);
      }
    }
    const status = kind === 'ACCEPTED' ? 'ORDERED' : kind;
    await s.exec(`UPDATE order_state SET head_sequence=${next},status=${q(status)} WHERE order_id=${orderId};`);
    return { orderId, status };
  });
}

export async function submitOffer(actor = 'alice', price = '5.00', at = '2026-10-15T00:00:00Z') {
  const result = await command(actor, 'SUBMIT_OFFER', randomUUID(), { price }, async s => {
    const [o] = await s.rows(`INSERT INTO offer(customer_subject,title,author,isbn,publisher_id,book_type_id,genre_id,condition_id,offered_price,submitted_at)
      VALUES (${q(actor)},'Synthetic offer','Synthetic author','duplicate-isbn',1,2,3,4,${money(price)},${q(at)}) RETURNING offer_id`);
    await s.exec(`INSERT INTO offer_event(offer_id,sequence_no,kind,actor_subject,occurred_at) VALUES (${o.offer_id},1,'SUBMITTED',${q(actor)},${q(at)});
      INSERT INTO offer_state VALUES (${o.offer_id},1,'PENDING_APPROVAL',false);`);
    return { offerId: o.offer_id };
  });
  return result.offerId;
}

export async function offerTransition({ actor = 'staff', offerId, kind, reason = null, at = '2026-11-01T00:00:00Z', key = randomUUID() }) {
  return command(actor, kind, key, { offerId, kind, reason, ...(kind === 'PAID' ? { at } : {}) }, async s => {
    const [o] = await s.rows(`SELECT * FROM offer WHERE offer_id=${positive(offerId)}${kind === 'WITHDRAWN' ? ` AND customer_subject=${q(actor)}` : ''} FOR UPDATE`);
    required(o);
    const [st] = await s.rows(`SELECT * FROM offer_state WHERE offer_id=${offerId} FOR UPDATE`);
    const allowed = { APPROVED: ['PENDING_APPROVAL'], RECEIVED: ['APPROVED'], PAID: ['RECEIVED'], REJECTED: ['PENDING_APPROVAL','RECEIVED'], WITHDRAWN: ['PENDING_APPROVAL'] };
    assert.ok(allowed[kind]?.includes(st.status), 'INVALID_OFFER_TRANSITION');
    if (kind === 'REJECTED') assert.ok(reason?.trim(), 'REJECTION_REASON_REQUIRED');
    const next = st.head_sequence+1;
    await s.exec(`INSERT INTO offer_event(offer_id,sequence_no,previous_sequence,kind,actor_subject,occurred_at,reason)
      VALUES (${offerId},${next},${st.head_sequence},${q(kind)},${q(actor)},${q(at)},${q(reason)});
      UPDATE offer_state SET head_sequence=${next},status=${q(kind)} WHERE offer_id=${offerId};`);
    return { offerId, status: kind };
  });
}

export async function shelve({ offerId, actor = 'staff', price = '20.00', key = randomUUID(), hook }) {
  return command(actor, 'SHELVE', key, { offerId, price }, async s => {
    const [o] = await s.rows(`SELECT *,offered_price::text AS offered_price_text FROM offer WHERE offer_id=${positive(offerId)} FOR UPDATE`);
    required(o);
    const [st] = await s.rows(`SELECT * FROM offer_state WHERE offer_id=${offerId} FOR UPDATE`);
    assert.equal(st.status, 'PAID', 'PAYMENT_REQUIRED');
    assert.equal(st.stocked, false, 'ALREADY_STOCKED');
    await hook?.(s);
    const bookId = await addBook(s, { actor, sourceOffer: offerId, price, cost: o.offered_price_text, fields: o });
    const next = st.head_sequence+1;
    await s.exec(`INSERT INTO offer_event(offer_id,sequence_no,previous_sequence,kind,actor_subject,occurred_at)
      VALUES (${offerId},${next},${st.head_sequence},'STOCKED',${q(actor)},'2026-11-01T00:00:00Z');
      UPDATE offer_state SET head_sequence=${next},stocked=true WHERE offer_id=${offerId};`);
    return { offerId, bookId };
  });
}

export async function adjust({ bookId, after, reason, actor = 'staff', key = randomUUID(), hook }) {
  return command(actor, 'ADJUST', key, { bookId, after, reason }, async s => {
    required((await s.rows(`SELECT book_id FROM book WHERE book_id=${positive(bookId)} FOR UPDATE`))[0]);
    await hook?.(s);
    assert.ok(reason?.trim(), 'ADJUSTMENT_REASON_REQUIRED');
    await movement(s, bookId, 'ADJUSTED', after, actor, '2026-11-02T00:00:00Z', null, null, reason);
    return { bookId, after };
  });
}

export async function updateBook(bookId, changes) {
  assert.ok(Object.keys(changes).every(k => ['current_price','title','unlisted','cover_url'].includes(k)), 'FROZEN_ATTRIBUTE');
  await transaction(async s => {
    await s.rows(`SELECT book_id FROM book WHERE book_id=${positive(bookId)} FOR UPDATE`);
    await s.exec(`UPDATE book SET ${Object.entries(changes).map(([k,v]) => `${k}=${k === 'current_price' ? money(v) : q(v)}`).join(',')} WHERE book_id=${bookId};`);
  });
}

export async function editCart({ actor, cartId, bookId, kind = 'PURCHASE', quantity = 1 }) {
  return transaction(async s => {
    const [cart] = await s.rows(`SELECT * FROM cart WHERE cart_id=${q(cartId)} AND ${actor === null ? 'customer_subject IS NULL' : `customer_subject=${q(actor)}`} FOR UPDATE`);
    required(cart);
    required((await s.rows(`SELECT book_id FROM book WHERE book_id=${positive(bookId)} FOR UPDATE`))[0]);
    positive(quantity);
    if (kind === 'PURCHASE') {
      const [st] = await s.rows(`SELECT available FROM stock_balance WHERE book_id=${bookId}`);
      assert.ok(st.available >= quantity, 'INSUFFICIENT_STOCK');
    }
    assert.ok(['PURCHASE','WISH'].includes(kind), 'ITEM_KIND');
    await s.exec(`INSERT INTO cart_item VALUES (${q(cartId)},${bookId},${q(kind)},${quantity})
      ON CONFLICT (cart_id,book_id,kind) DO UPDATE SET quantity=excluded.quantity;
      UPDATE cart SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE cart_id=${q(cartId)};`);
    return { cartId };
  });
}

export async function mergeCart(actor, guestId) {
  return transaction(async s => {
    required((await s.rows(`SELECT subject FROM customer WHERE subject=${q(actor)} FOR UPDATE`))[0]);
    const carts = await s.rows(`SELECT * FROM cart WHERE cart_id=${q(guestId)} OR customer_subject=${q(actor)} ORDER BY cart_id FOR UPDATE`);
    const guest = required(carts.find(c => c.cart_id === guestId));
    assert.ok(guest.customer_subject === null || guest.customer_subject === actor, 'CART_NOT_GUEST');
    const existing = carts.find(c => c.customer_subject === actor);
    if (existing?.cart_id === guestId) return { cartId: guestId };
    if (!existing) {
      await s.exec(`UPDATE cart SET customer_subject=${q(actor)},revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE cart_id=${q(guestId)};`);
      return { cartId: guestId };
    }
    await s.exec(`INSERT INTO cart_item SELECT ${q(existing.cart_id)},book_id,kind,quantity FROM cart_item WHERE cart_id=${q(guestId)}
      ON CONFLICT (cart_id,book_id,kind) DO UPDATE SET quantity=greatest(cart_item.quantity,excluded.quantity);
      DELETE FROM cart WHERE cart_id=${q(guestId)};
      UPDATE cart SET revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE cart_id=${q(existing.cart_id)};`);
    return { cartId: existing.cart_id };
  });
}
