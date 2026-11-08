BEGIN;
SET LOCAL search_path = bookstore, public;

CREATE VIEW v_order_fact_state AS
SELECT DISTINCT ON (order_id) order_id, sequence_no AS head_sequence,
  CASE kind WHEN 'PLACED' THEN 'PENDING' WHEN 'ACCEPTED' THEN 'ORDERED' ELSE kind END AS status
FROM order_event ORDER BY order_id, sequence_no DESC;

CREATE VIEW v_offer_fact_state AS
SELECT DISTINCT ON (offer_id) offer_id, sequence_no AS head_sequence,
  CASE kind WHEN 'SUBMITTED' THEN 'PENDING_APPROVAL' WHEN 'STOCKED' THEN 'PAID' ELSE kind END AS status,
  kind = 'STOCKED' AS stocked
FROM offer_event ORDER BY offer_id, sequence_no DESC;

CREATE VIEW v_stock_fact_balance AS
SELECT book_id, max(sequence_no) AS head_sequence, sum(quantity_delta)::integer AS available
FROM stock_movement GROUP BY book_id;

CREATE VIEW v_inventory AS
SELECT b.*, r.purchase_cost, r.source_offer_id, r.recorded_at AS registered_at,
  s.available, s.available = 0 AS out_of_stock, s.available <= 5 AS low_in_stock
FROM book b JOIN book_receipt r USING (book_id) JOIN stock_balance s USING (book_id);

CREATE VIEW v_order_summary AS
SELECT o.*, s.status,
  (SELECT sum(i.frozen_cost * i.quantity) FROM order_item i WHERE i.order_id = o.order_id) AS cost,
  o.subtotal - (SELECT sum(i.frozen_cost * i.quantity) FROM order_item i WHERE i.order_id = o.order_id) AS gross_profit
FROM sales_order o JOIN order_state s USING (order_id);

CREATE VIEW v_paid_offer AS
SELECT o.*, e.occurred_at AS paid_at
FROM offer o JOIN offer_event e USING (offer_id) WHERE e.kind = 'PAID';

CREATE VIEW v_cart_totals AS
SELECT c.cart_id, c.customer_subject, c.revision,
  coalesce(sum(b.current_price * i.quantity) FILTER (WHERE i.kind = 'PURCHASE'), 0)::numeric(19,2) AS subtotal,
  round(coalesce(sum(b.current_price * i.quantity) FILTER (WHERE i.kind = 'PURCHASE'), 0) * 0.10, 2) AS tax,
  coalesce(sum(b.current_price * i.quantity) FILTER (WHERE i.kind = 'PURCHASE'), 0)
    + round(coalesce(sum(b.current_price * i.quantity) FILTER (WHERE i.kind = 'PURCHASE'), 0) * 0.10, 2) AS total
FROM cart c LEFT JOIN cart_item i USING (cart_id) LEFT JOIN book b USING (book_id)
GROUP BY c.cart_id;
CREATE VIEW v_model_issues AS
WITH differences AS (
 SELECT 'stock_cache' AS issue, coalesce(f.book_id,c.book_id)::text AS entity
 FROM v_stock_fact_balance f FULL JOIN stock_balance c USING (book_id)
 WHERE c.book_id IS NULL OR f.book_id IS NULL OR (f.head_sequence,f.available) IS DISTINCT FROM (c.head_sequence,c.available)
 UNION ALL
 SELECT 'order_cache', coalesce(f.order_id,c.order_id)::text
 FROM v_order_fact_state f FULL JOIN order_state c USING (order_id)
 WHERE c.order_id IS NULL OR f.order_id IS NULL OR (f.head_sequence,f.status) IS DISTINCT FROM (c.head_sequence,c.status)
 UNION ALL
 SELECT 'offer_cache', coalesce(f.offer_id,c.offer_id)::text
 FROM v_offer_fact_state f FULL JOIN offer_state c USING (offer_id)
 WHERE c.offer_id IS NULL OR f.offer_id IS NULL OR (f.head_sequence,f.status,f.stocked) IS DISTINCT FROM (c.head_sequence,c.status,c.stocked)
 UNION ALL
 SELECT 'stock_chain', m.book_id::text FROM stock_movement m
 JOIN stock_movement p ON p.book_id=m.book_id AND p.sequence_no=m.previous_sequence
 WHERE m.quantity_before <> p.quantity_after
 UNION ALL
 SELECT 'order_transition', e.order_id::text FROM order_event e
 JOIN order_event p ON p.order_id=e.order_id AND p.sequence_no=e.previous_sequence
 WHERE (p.kind,e.kind) NOT IN (('PLACED','ACCEPTED'),('PLACED','CANCELLED'),('ACCEPTED','SHIPPED'),('ACCEPTED','CANCELLED'),('SHIPPED','DELIVERED'))
 UNION ALL
 SELECT 'offer_transition', e.offer_id::text FROM offer_event e
 JOIN offer_event p ON p.offer_id=e.offer_id AND p.sequence_no=e.previous_sequence
 WHERE (p.kind,e.kind) NOT IN (('SUBMITTED','APPROVED'),('SUBMITTED','REJECTED'),('SUBMITTED','WITHDRAWN'),
   ('APPROVED','RECEIVED'),('RECEIVED','PAID'),('RECEIVED','REJECTED'),('PAID','STOCKED'))
 UNION ALL
 SELECT 'order_amount_or_empty', o.order_id::text FROM sales_order o LEFT JOIN order_item i USING (order_id)
 GROUP BY o.order_id HAVING count(i.book_id)=0 OR o.subtotal <> sum(i.quantity*i.frozen_price)
 UNION ALL
 SELECT 'book_receipt_missing', b.book_id::text FROM book b LEFT JOIN book_receipt r USING (book_id)
 LEFT JOIN stock_movement m ON m.book_id=b.book_id AND m.sequence_no=1
 WHERE r.book_id IS NULL OR m.book_id IS NULL OR r.initial_quantity <> m.quantity_after
   OR (r.source_offer_id IS NULL AND m.kind <> 'REGISTERED') OR (r.source_offer_id IS NOT NULL AND m.kind <> 'SHELVED')
 UNION ALL
 SELECT 'order_root_missing', o.order_id::text FROM sales_order o LEFT JOIN order_event e ON e.order_id=o.order_id AND e.sequence_no=1
 WHERE e.order_id IS NULL OR e.occurred_at <> o.ordered_at
 UNION ALL
 SELECT 'offer_root_missing', o.offer_id::text FROM offer o LEFT JOIN offer_event e ON e.offer_id=o.offer_id AND e.sequence_no=1
 WHERE e.offer_id IS NULL OR e.occurred_at <> o.submitted_at
 UNION ALL
 SELECT 'stock_order_effect', i.order_id::text || ':' || i.book_id::text FROM order_item i
 WHERE NOT EXISTS (SELECT 1 FROM stock_movement m WHERE m.order_id=i.order_id AND m.book_id=i.book_id
   AND m.kind='ORDERED' AND m.quantity_delta=-i.quantity)
 OR (EXISTS (SELECT 1 FROM order_event e WHERE e.order_id=i.order_id AND e.kind='CANCELLED')) IS DISTINCT FROM
    (EXISTS (SELECT 1 FROM stock_movement m WHERE m.order_id=i.order_id AND m.book_id=i.book_id AND m.kind='CANCELLED' AND m.quantity_delta=i.quantity))
 UNION ALL
 SELECT 'shelving_contract', r.book_id::text FROM book_receipt r JOIN offer o ON o.offer_id=r.source_offer_id
 WHERE r.purchase_cost <> o.offered_price OR NOT EXISTS (SELECT 1 FROM offer_event e WHERE e.offer_id=o.offer_id AND e.kind='PAID')
   OR NOT EXISTS (SELECT 1 FROM offer_event e WHERE e.offer_id=o.offer_id AND e.kind='STOCKED')
 UNION ALL
 SELECT 'stocked_book_missing', e.offer_id::text FROM offer_event e
 WHERE e.kind='STOCKED' AND NOT EXISTS (SELECT 1 FROM book_receipt r WHERE r.source_offer_id=e.offer_id)
 UNION ALL
 SELECT 'movement_event_kind', m.book_id::text FROM stock_movement m
 JOIN order_event e ON e.order_id=m.order_id AND e.sequence_no=m.order_event_sequence
 WHERE (m.kind='ORDERED' AND e.kind<>'PLACED') OR (m.kind='CANCELLED' AND e.kind<>'CANCELLED')
)
SELECT issue, entity FROM differences;
COMMIT;
