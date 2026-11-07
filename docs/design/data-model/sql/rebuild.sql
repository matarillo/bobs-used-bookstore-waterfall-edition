-- Maintenance window only. First verify immutable facts (see transactions.md).
BEGIN;
SET LOCAL search_path = bookstore, public;
LOCK TABLE book, book_receipt, sales_order, order_item, offer, order_event, offer_event,
  stock_movement, stock_balance, order_state, offer_state IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE rebuild_guard (facts_valid boolean NOT NULL CHECK (facts_valid)) ON COMMIT DROP;
INSERT INTO rebuild_guard SELECT NOT EXISTS (SELECT 1 FROM v_model_issues WHERE issue NOT IN ('stock_cache','order_cache','offer_cache'));
INSERT INTO stock_balance SELECT * FROM v_stock_fact_balance
ON CONFLICT (book_id) DO UPDATE SET head_sequence=excluded.head_sequence, available=excluded.available;
INSERT INTO order_state SELECT * FROM v_order_fact_state
ON CONFLICT (order_id) DO UPDATE SET head_sequence=excluded.head_sequence, status=excluded.status;
INSERT INTO offer_state SELECT * FROM v_offer_fact_state
ON CONFLICT (offer_id) DO UPDATE SET head_sequence=excluded.head_sequence, status=excluded.status, stocked=excluded.stocked;
COMMIT;
