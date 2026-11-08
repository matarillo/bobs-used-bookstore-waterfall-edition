import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { query, execute, connect, transaction, quote as q } from './db.mjs';
import { addBook, checkout, confirm, orderTransition, submitOffer, offerTransition, shelve, adjust, updateBook, editCart, mergeCart } from './contracts.mjs';
import './check-baseline.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const [environment] = await query('SELECT version() AS version, current_database() AS database, current_setting(\'data_directory\') AS directory');
assert.equal(environment.database, 'bobs_model_validation');
assert.equal(path.resolve(environment.directory).toLowerCase(), path.resolve(root, '.local/data-model-postgres/data').toLowerCase(), 'Refusing non-test PostgreSQL cluster');
assert.match(environment.version, /PostgreSQL 18\./);
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const G = '00000000-0000-4000-8000-000000000003';
const checks = [];
async function reset() {
  await execute(`DROP SCHEMA IF EXISTS bookstore CASCADE;\n${read('../sql/schema.sql')}\n${read('../sql/views.sql')}\n${read('fixture.sql')}`);
}
async function test(id, description, work) {
  try { await reset(); await work(); checks.push({ id, description, passed: true }); console.log(`PASS ${id}: ${description}`); }
  catch (error) { checks.push({ id, description, passed: false, error: error.stack }); console.error(`FAIL ${id}: ${error.stack}`); }
}
async function setup({ quantity=3, price='10.00', cost='4.00' } = {}) {
  return transaction(async s => {
    const bookId = await addBook(s, { quantity, price, cost });
    await s.exec(`INSERT INTO cart(cart_id,customer_subject) VALUES (${q(A)},'alice'),(${q(B)},'bob'),(${q(G)},NULL);
      INSERT INTO cart_item VALUES (${q(A)},${bookId},'PURCHASE',1),(${q(B)},${bookId},'PURCHASE',1);`);
    return bookId;
  });
}
const balance = async bookId => (await query(`SELECT available FROM stock_balance WHERE book_id=${bookId}`))[0].available;
async function place(actor='alice', at='2026-11-01T00:00:00Z', extra={}) {
  return checkout({ actor, confirmation: await confirm(actor==='alice'?A:B,actor), addressId: actor==='alice'?1:2, at, ...extra });
}
async function reconcile() { assert.deepEqual(await execute(read('../sql/reconcile.sql')), []); }
async function dashboard(at='2026-11-15T14:00:00Z') {
  const s = await connect();
  try { await s.exec(read('../sql/queries.sql')); return (await s.exec(`EXECUTE dashboard(${q(at)});`))[0].split('|'); }
  finally { await s.close(); }
}
async function paidOffer(price='5.00') {
  const offerId = await submitOffer('alice',price);
  for (const kind of ['APPROVED','RECEIVED','PAID']) await offerTransition({ offerId,kind });
  return offerId;
}
async function blockedRace(first, second) {
  let release, locked;
  const held = new Promise(resolve => { release=resolve; });
  const acquired = new Promise(resolve => { locked=resolve; });
  const winner = first(async () => { locked(); await held; });
  // Convert failures immediately, including while waiting for the lock barrier.
  const winnerResult = winner.then(value=>({value}),error=>({error}));
  await Promise.race([acquired, winnerResult.then(r => { if(r.error) throw r.error; throw new Error('First operation did not acquire barrier'); })]);
  const loserResult = second().then(value=>({value}),error=>({error}));
  try {
    const deadline = Date.now()+4000;
    while (true) {
      const [{ count }] = await query("SELECT count(*)::integer FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND wait_event_type='Lock'");
      if (count > 0) break;
      assert.ok(Date.now()<deadline, 'Second connection did not block on an actual database lock');
      await new Promise(resolve=>setTimeout(resolve,15));
    }
  } finally { release(); }
  return [await winnerResult, await loserResult];
}

await test('T01','DDL、分類種別・名称一意性・数量・金額制約',async()=>{
  const book = await setup();
  await assert.rejects(()=>execute(`UPDATE book SET genre_id=1 WHERE book_id=${book};`),/23503/);
  await assert.rejects(()=>execute("INSERT INTO reference_item(kind,name) VALUES ('GENRE','fiction');"),/23505/);
  await execute("INSERT INTO reference_item(kind,name) VALUES ('PUBLISHER','Fiction');");
  await assert.rejects(()=>execute(`UPDATE stock_balance SET available=-1 WHERE book_id=${book};`),/23514/);
  await assert.rejects(()=>execute(`UPDATE book SET current_price=-1 WHERE book_id=${book};`),/23514/);
  await assert.rejects(()=>execute(`UPDATE cart_item SET quantity=0 WHERE cart_id=${q(A)};`),/23514/);
  await assert.rejects(()=>submitOffer('alice','0'),/23514/);
  await assert.rejects(()=>submitOffer('alice','1000000.01'),/23514/);
  await assert.rejects(()=>execute("UPDATE address SET state_code='XX' WHERE address_id=1;"),/23514/);
  await assert.rejects(()=>execute("UPDATE address SET postal_code='bad' WHERE address_id=1;"),/23514/);
  const duplicateIsbn = await transaction(s=>addBook(s));
  assert.notEqual(duplicateIsbn,book);
  assert.equal((await query('SELECT count(*)::integer AS n FROM information_schema.triggers WHERE trigger_schema=\'bookstore\''))[0].n,0);
});
await test('T02','手入力在庫→注文→受付→出荷→配達、出荷で二重減算しない',async()=>{
  const b=await setup(); const o=await place();
  assert.equal(o.total,'11.00'); assert.equal(o.delivery_due_date,'2026-11-08');
  for(const kind of ['ACCEPTED','SHIPPED','DELIVERED']) await orderTransition({orderId:o.order_id,kind});
  assert.equal(await balance(b),2);
  assert.equal((await query(`SELECT status FROM order_state WHERE order_id=${o.order_id}`))[0].status,'DELIVERED');
  await assert.rejects(()=>orderTransition({orderId:o.order_id,kind:'CANCELLED'}),/INVALID_ORDER_TRANSITION/);
  await reconcile();
});
await test('T03','金額・原価・配送先の凍結と住所の論理削除',async()=>{
  const b=await setup(); const o=await place();
  await updateBook(b,{current_price:'99.00',title:'Changed title'});
  await execute("UPDATE address SET line1='Changed address',active=false WHERE address_id=1;");
  const [snapshot]=await query(`SELECT o.ship_line1,i.frozen_price,i.frozen_cost,o.total FROM sales_order o JOIN order_item i USING(order_id) WHERE order_id=${o.order_id}`);
  assert.deepEqual(snapshot,{ship_line1:'1 Example Street',frozen_price:10,frozen_cost:4,total:11});
  await assert.rejects(()=>updateBook(b,{purchase_cost:'100.00'}),/FROZEN_ATTRIBUTE/);
  await assert.rejects(()=>execute('DELETE FROM address WHERE address_id=1;'),/23503/);
  await reconcile();
});
await test('T04','四捨五入は注文小計に一度、負の粗利を保持',async()=>{
  await setup({price:'0.05',cost:'1.00'});
  const second=await transaction(s=>addBook(s,{price:'0.05',cost:'1.00'}));
  await execute(`INSERT INTO cart_item VALUES (${q(A)},${second},'PURCHASE',1);`);
  const o=await place();
  assert.equal(o.total,'0.11');
  const [v]=await query(`SELECT tax,gross_profit FROM v_order_summary WHERE order_id=${o.order_id}`);
  assert.deepEqual(v,{tax:0.01,gross_profit:-1.90});
  await assert.rejects(()=>updateBook(1,{current_price:'1.001'}),/MONEY_PRECISION/);
});
await test('T05','確認時の在庫切れを除外し、欲しい物と除外明細をかごに残す',async()=>{
  const b=await setup();
  const zero=await transaction(s=>addBook(s,{quantity:0}));
  await execute(`INSERT INTO cart_item VALUES (${q(A)},${zero},'PURCHASE',1),(${q(A)},${b},'WISH',2);`);
  const c=await confirm(A,'alice'); assert.deepEqual(c.excluded,[zero]);
  await checkout({confirmation:c});
  assert.deepEqual(await query(`SELECT book_id,kind FROM cart_item WHERE cart_id=${q(A)} ORDER BY book_id`),[{book_id:b,kind:'WISH'},{book_id:zero,kind:'PURCHASE'}]);
  await assert.rejects(()=>place(),/EMPTY_ORDER/); await reconcile();
});
await test('T06','確認後の在庫競合は複数明細を含む注文全体をロールバック',async()=>{
  const b=await setup({quantity:1}); const c=await transaction(s=>addBook(s,{quantity:2}));
  await execute(`INSERT INTO cart_item VALUES (${q(A)},${c},'PURCHASE',1);`);
  const confirmed=await confirm(A,'alice'); await place('bob');
  await assert.rejects(()=>checkout({confirmation:confirmed}),/INSUFFICIENT_STOCK/);
  assert.equal(await balance(b),0); assert.equal(await balance(c),2);
  assert.equal((await query(`SELECT count(*)::integer n FROM cart_item WHERE cart_id=${q(A)}`))[0].n,2);
  assert.equal((await query('SELECT count(*)::integer n FROM sales_order'))[0].n,1); await reconcile();
});
await test('T07','在庫更新後の失敗で注文・履歴・かご・冪等記録をまとめて戻す',async()=>{
  const b=await setup();
  await assert.rejects(()=>place('alice',undefined,{failAfterStock:true}),/INJECTED_FAILURE/);
  assert.equal(await balance(b),3);
  for(const table of ['sales_order','order_item','order_event','order_state','command_receipt']) assert.equal((await query(`SELECT count(*)::integer n FROM ${table}`))[0].n,0,table);
  assert.equal((await query(`SELECT count(*)::integer n FROM cart_item WHERE cart_id=${q(A)}`))[0].n,1); await reconcile();
});
await test('T08','取消は追加事実、返却は一回、売上から除外',async()=>{
  const b=await setup(); const o=await place();
  await orderTransition({actor:'alice',customer:true,orderId:o.order_id,kind:'CANCELLED'});
  assert.equal(await balance(b),3);
  assert.deepEqual((await query(`SELECT kind FROM order_event WHERE order_id=${o.order_id} ORDER BY sequence_no`)).map(x=>x.kind),['PLACED','CANCELLED']);
  await assert.rejects(()=>orderTransition({orderId:o.order_id,kind:'CANCELLED'}),/INVALID_ORDER_TRANSITION/);
  const d=await dashboard(); assert.equal(d[5],'0'); assert.equal(d[3],'1'); await reconcile();
});
await test('T09','棚卸調整の前後・差分・理由・実施者',async()=>{
  const b=await setup(); await adjust({bookId:b,after:5,reason:'Synthetic count'});
  const [m]=await query(`SELECT quantity_before,quantity_after,quantity_delta,reason,actor_subject FROM stock_movement WHERE kind='ADJUSTED'`);
  assert.deepEqual(m,{quantity_before:3,quantity_after:5,quantity_delta:2,reason:'Synthetic count',actor_subject:'staff'});
  await assert.rejects(()=>adjust({bookId:b,after:2,reason:' '}),/ADJUSTMENT_REASON_REQUIRED/); await reconcile();
});
await test('T10','買取申込→承認→受領→支払→棚入れ→販売',async()=>{
  await setup(); const offerId=await paidOffer('12.34');
  const {bookId}=await shelve({offerId,price:'25.00'});
  const [b]=await query(`SELECT purchase_cost,current_price,available,source_offer_id FROM v_inventory WHERE book_id=${bookId}`);
  assert.deepEqual(b,{purchase_cost:12.34,current_price:25,available:1,source_offer_id:offerId});
  await execute(`DELETE FROM cart_item WHERE cart_id=${q(A)}; INSERT INTO cart_item VALUES (${q(A)},${bookId},'PURCHASE',1);`);
  await place(); assert.equal(await balance(bookId),0);
  const [st]=await query(`SELECT status,stocked FROM offer_state WHERE offer_id=${offerId}`);
  assert.deepEqual(st,{status:'PAID',stocked:true}); await reconcile();
});
await test('T11','未支払棚入れ・不正遷移・却下理由なしを拒否',async()=>{
  const offerId=await submitOffer();
  await assert.rejects(()=>shelve({offerId}),/PAYMENT_REQUIRED/);
  await assert.rejects(()=>offerTransition({offerId,kind:'PAID'}),/INVALID_OFFER_TRANSITION/);
  await assert.rejects(()=>offerTransition({offerId,kind:'REJECTED'}),/REJECTION_REASON_REQUIRED/);
  await offerTransition({offerId,kind:'APPROVED'}); await offerTransition({offerId,kind:'RECEIVED'});
  await offerTransition({offerId,kind:'REJECTED',reason:'Synthetic mismatch'});
  assert.equal((await query(`SELECT reason FROM offer_event WHERE offer_id=${offerId} AND kind='REJECTED'`))[0].reason,'Synthetic mismatch'); await reconcile();
});
await test('T12','本人の取下げは承認待ちだけ、他人のデータは操作できない',async()=>{
  await setup(); const offerId=await submitOffer();
  await assert.rejects(()=>offerTransition({actor:'bob',offerId,kind:'WITHDRAWN'}),/NOT_FOUND/);
  await offerTransition({actor:'alice',offerId,kind:'WITHDRAWN'});
  const other=await submitOffer(); await offerTransition({offerId:other,kind:'APPROVED'});
  await assert.rejects(()=>offerTransition({actor:'alice',offerId:other,kind:'WITHDRAWN'}),/INVALID_OFFER_TRANSITION/);
  const o=await place();
  await assert.rejects(()=>orderTransition({actor:'bob',customer:true,orderId:o.order_id,kind:'CANCELLED'}),/NOT_FOUND/);
  const emptyConfirmation=await confirm(A,'alice');
  await assert.rejects(()=>checkout({actor:'alice',confirmation:emptyConfirmation,addressId:2}),/ADDRESS_NOT_FOUND/);
  const s=await connect(); try { await s.exec(read('../sql/queries.sql')); assert.deepEqual(await s.exec("EXECUTE customer_orders('bob');"),[]); } finally { await s.close(); }
});
await test('T13','UTC月初・月末境界、注文日と支払日を別集計',async()=>{
  await setup(); await place('alice','2026-11-01T00:00:00Z'); await place('bob','2026-10-31T23:59:59Z');
  await paidOffer('5.00'); const pending=await submitOffer('alice','7.00','2026-11-01T00:00:00Z'); assert.ok(pending);
  const d=await dashboard('2026-11-15T14:00:00Z');
  assert.equal(d[2],'1'); assert.equal(d[4],'10.00'); assert.equal(d[5],'20.00');
  assert.equal(d[9],'1'); assert.equal(d[11],'7.00'); assert.equal(d[12],'5.00');
  assert.equal((await dashboard('2026-12-01T00:00:00Z'))[4],'0');
});
await test('T14','納期超過・在庫僅少と一覧件数が一致、在庫0も僅少',async()=>{
  await setup(); const o=await place(); await transaction(s=>addBook(s,{quantity:0}));
  const d=await dashboard('2026-11-09T00:00:00Z');
  const s=await connect(); try {
    await s.exec(read('../sql/queries.sql'));
    assert.equal((await s.exec("EXECUTE past_due_orders('2026-11-09T00:00:00Z');")).length,Number(d[1]));
    assert.equal((await s.exec('EXECUTE low_stock_books;')).length,Number(d[15]));
    assert.equal((await s.exec("EXECUTE past_due_orders('2026-11-08T23:59:59Z');")).length,0);
  } finally { await s.close(); }
  await orderTransition({orderId:o.order_id,kind:'CANCELLED'}); assert.equal((await dashboard())[1],'0');
});
await test('T15','同一キー・同一内容は既存結果、異内容は競合',async()=>{
  const b=await setup(); const c=await confirm(A,'alice'); const key=randomUUID();
  const first=await checkout({confirmation:c,key}); const repeat=await checkout({confirmation:c,key,at:'2026-11-03T00:00:00Z'});
  assert.deepEqual(first,repeat); assert.equal(await balance(b),2);
  await assert.rejects(()=>checkout({confirmation:{...c,revision:99},key}),/IDEMPOTENCY_CONFLICT/); await reconcile();
});
await test('T16','最終在庫の並行注文は一方のみ成立（実ロック待ち）',async()=>{
  const b=await setup({quantity:1}); const ca=await confirm(A,'alice'),cb=await confirm(B,'bob');
  const [a,z]=await blockedRace(hook=>checkout({confirmation:ca,hook}),()=>checkout({actor:'bob',confirmation:cb,addressId:2}));
  assert.ok(a.value); assert.match(z.error?.message??'',/INSUFFICIENT_STOCK/); assert.equal(await balance(b),0); await reconcile();
});
await test('T17','出荷と取消の競合は出荷のみ成立、在庫返却なし',async()=>{
  const b=await setup(); const o=await place(); await orderTransition({orderId:o.order_id,kind:'ACCEPTED'});
  const [a,z]=await blockedRace(hook=>orderTransition({orderId:o.order_id,kind:'SHIPPED',hook}),()=>orderTransition({orderId:o.order_id,kind:'CANCELLED'}));
  assert.ok(a.value); assert.match(z.error?.message??'',/INVALID_ORDER_TRANSITION/); assert.equal(await balance(b),2); await reconcile();
});
await test('T18','二重取消の競合は一度だけ返却',async()=>{
  const b=await setup(); const o=await place();
  const [a,z]=await blockedRace(hook=>orderTransition({orderId:o.order_id,kind:'CANCELLED',hook}),()=>orderTransition({orderId:o.order_id,kind:'CANCELLED'}));
  assert.ok(a.value); assert.match(z.error?.message??'',/INVALID_ORDER_TRANSITION/); assert.equal(await balance(b),3); await reconcile();
});
await test('T19','別キーの二重棚入れは一方のみ成立',async()=>{
  const offerId=await paidOffer();
  const [a,z]=await blockedRace(hook=>shelve({offerId,hook}),()=>shelve({offerId}));
  assert.ok(a.value); assert.match(z.error?.message??'',/ALREADY_STOCKED/);
  assert.equal((await query(`SELECT count(*)::integer n FROM book_receipt WHERE source_offer_id=${offerId}`))[0].n,1); await reconcile();
});
await test('T20','同一キーの並行再送は同じ注文結果を返す',async()=>{
  const b=await setup(); const c=await confirm(A,'alice'),key=randomUUID();
  const [a,z]=await blockedRace(hook=>checkout({confirmation:c,key,hook}),()=>checkout({confirmation:c,key}));
  assert.deepEqual(a.value,z.value); assert.equal(await balance(b),2); await reconcile();
});
await test('T21','棚卸調整と注文は直列化し、在庫不足注文を拒否',async()=>{
  const b=await setup(); const c=await confirm(A,'alice');
  const [a,z]=await blockedRace(hook=>adjust({bookId:b,after:0,reason:'Synthetic missing copy',hook}),()=>checkout({confirmation:c}));
  assert.ok(a.value); assert.match(z.error?.message??'',/INSUFFICIENT_STOCK/); assert.equal(await balance(b),0); await reconcile();
});
await test('T22','現在状態の破損・欠落を検出し正本から再構築',async()=>{
  await setup(); await place(); const offerId=await paidOffer(); await shelve({offerId}); await reconcile();
  await execute("UPDATE stock_balance SET available=99; DELETE FROM order_state; UPDATE offer_state SET status='RECEIVED',stocked=false;");
  assert.ok((await execute(read('../sql/reconcile.sql'))).length>=3);
  await execute(read('../sql/rebuild.sql')); await reconcile();
});
await test('T23','在庫履歴の連続性違反と不正状態遷移を照合で検出',async()=>{
  const b=await setup(); const o=await place();
  await execute(`UPDATE stock_movement SET quantity_before=4 WHERE book_id=${b} AND sequence_no=2;
    INSERT INTO order_event(order_id,sequence_no,previous_sequence,kind,actor_subject,occurred_at)
    VALUES (${o.order_id},2,1,'DELIVERED','staff','2026-11-02T00:00:00Z');`);
  const problems=await execute(read('../sql/reconcile.sql'));
  assert.ok(problems.some(x=>x.startsWith('stock_chain|'))); assert.ok(problems.some(x=>x.startsWith('order_transition|')));
  await assert.rejects(()=>execute(read('../sql/rebuild.sql')),/23514/);
});
await test('T24','かごの現在価格・購入種別のみ集計、在庫切れ投入を拒否',async()=>{
  const b=await setup(); await editCart({actor:'alice',cartId:A,bookId:b,kind:'WISH',quantity:5});
  assert.equal((await query(`SELECT total FROM v_cart_totals WHERE cart_id=${q(A)}`))[0].total,11);
  await updateBook(b,{current_price:'20.00'});
  assert.equal((await query(`SELECT total FROM v_cart_totals WHERE cart_id=${q(A)}`))[0].total,22);
  await assert.rejects(()=>editCart({actor:'bob',cartId:A,bookId:b}),/NOT_FOUND/);
  await adjust({bookId:b,after:0,reason:'Synthetic missing copy'});
  await assert.rejects(()=>editCart({actor:'alice',cartId:A,bookId:b}),/INSUFFICIENT_STOCK/);
});
await test('T25','ログイン時のかご統合は重複数量の最大、他人を統合しない',async()=>{
  const b=await setup(); await editCart({actor:null,cartId:G,bookId:b,quantity:2});
  const result=await mergeCart('alice',G); assert.equal(result.cartId,A);
  assert.equal((await query(`SELECT quantity FROM cart_item WHERE cart_id=${q(A)} AND kind='PURCHASE'`))[0].quantity,2);
  assert.equal((await query(`SELECT count(*)::integer n FROM cart WHERE cart_id=${q(G)}`))[0].n,0);
  await assert.rejects(()=>mergeCart('alice',B),/CART_NOT_GUEST/);
  await assert.rejects(()=>editCart({actor:null,cartId:A,bookId:b}),/NOT_FOUND/);
});
await test('T26','未ログインかごだけ一年超で掃除、ログイン済は保持',async()=>{
  await setup(); await execute(`UPDATE cart SET updated_at='2024-01-01T00:00:00Z';\n\\set as_of 2026-11-01T00:00:00Z\n${read('../sql/cleanup.sql')}`);
  assert.deepEqual((await query('SELECT cart_id FROM cart ORDER BY cart_id')).map(x=>x.cart_id),[A,B]);
});
await test('T27','非公開書籍を検索・売れ筋から除外し管理在庫に保持',async()=>{
  const b=await setup(); await place(); await updateBook(b,{unlisted:true});
  const s=await connect(); try {
    await s.exec(read('../sql/queries.sql'));
    assert.deepEqual(await s.exec('EXECUTE best_sellers;'),[]);
    assert.deepEqual(await s.exec("EXECUTE search_books('',NULL,NULL,20,0);"),[]);
  } finally { await s.close(); }
  assert.equal((await query(`SELECT count(*)::integer n FROM v_inventory WHERE book_id=${b}`))[0].n,1);
});
await test('T28','確認後の価格変更・かご変更は再確認を要求',async()=>{
  const b=await setup(); const c=await confirm(A,'alice'); await updateBook(b,{current_price:'11.00'});
  await assert.rejects(()=>checkout({confirmation:c}),/PRICE_CHANGED/);
  const c2=await confirm(A,'alice'); await editCart({actor:'alice',cartId:A,bookId:b,quantity:2});
  await assert.rejects(()=>checkout({confirmation:c2}),/CART_CHANGED/); await reconcile();
});
await test('T29','取消が先に成立した場合は出荷を拒否し一度だけ返却',async()=>{
  const b=await setup(); const o=await place(); await orderTransition({orderId:o.order_id,kind:'ACCEPTED'});
  const [a,z]=await blockedRace(hook=>orderTransition({orderId:o.order_id,kind:'CANCELLED',hook}),()=>orderTransition({orderId:o.order_id,kind:'SHIPPED'}));
  assert.ok(a.value); assert.match(z.error?.message??'',/INVALID_ORDER_TRANSITION/); assert.equal(await balance(b),3); await reconcile();
});
await test('T30','大きな十進金額でも凍結値と計算結果のセントを失わない',async()=>{
  await setup({price:'90071992547409.91',cost:'90071992547410.00'}); const o=await place();
  assert.equal(o.total,'99079191802150.90');
  const [row]=await query(`SELECT i.frozen_price::text,i.frozen_cost::text,o.tax::text,v.gross_profit::text
    FROM order_item i JOIN sales_order o USING(order_id) JOIN v_order_summary v USING(order_id)`);
  assert.deepEqual(row,{frozen_price:'90071992547409.91',frozen_cost:'90071992547410.00',tax:'9007199254740.99',gross_profit:'-0.09'});
});
await test('T31','金額上限超過は取引全体を失敗させる',async()=>{
  const b=await setup({price:'99999999999999999.99'});
  await assert.rejects(()=>place(),/22003/); assert.equal(await balance(b),3);
  assert.equal((await query('SELECT count(*)::integer n FROM sales_order'))[0].n,0); await reconcile();
});

const hashes = {};
for(const file of ['../sql/schema.sql','../sql/views.sql','../sql/queries.sql','../sql/reconcile.sql','../sql/rebuild.sql','../sql/cleanup.sql','fixture.sql','contracts.mjs','db.mjs','run.mjs']) {
  hashes[file]=createHash('sha256').update(read(file)).digest('hex');
}
const result={status:'proposed',scope:'PostgreSQL constraints and executable transaction design examples; not API acceptance',
  postgres:environment.version, isolation:'READ COMMITTED', checks, passed:checks.every(c=>c.passed), hashes};
writeFileSync(new URL('results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(`${checks.filter(c=>c.passed).length}/${checks.length} passed`);
if(!result.passed) process.exitCode=1;
