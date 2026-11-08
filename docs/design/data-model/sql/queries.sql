-- Session-local prepared statements. Parameters come from verified API inputs.
SET search_path = bookstore, public;
PREPARE dashboard(timestamptz) AS
WITH bounds AS (
  SELECT $1 AS as_of,
    date_trunc('month', $1 AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS month_start,
    (date_trunc('month', $1 AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC' AS month_end
)
SELECT
  (SELECT count(*) FROM v_order_summary WHERE status = 'PENDING') AS pending_orders,
  (SELECT count(*) FROM v_order_summary WHERE delivery_due_date < (bounds.as_of AT TIME ZONE 'UTC')::date
     AND status NOT IN ('DELIVERED','CANCELLED')) AS past_due_orders,
  (SELECT count(*) FROM sales_order WHERE ordered_at >= month_start AND ordered_at < month_end) AS monthly_orders,
  (SELECT count(*) FROM sales_order) AS total_orders,
  (SELECT coalesce(sum(subtotal),0) FROM v_order_summary WHERE status <> 'CANCELLED'
     AND ordered_at >= month_start AND ordered_at < month_end) AS monthly_sales,
  (SELECT coalesce(sum(subtotal),0) FROM v_order_summary WHERE status <> 'CANCELLED') AS total_sales,
  (SELECT coalesce(sum(gross_profit),0) FROM v_order_summary WHERE status <> 'CANCELLED'
     AND ordered_at >= month_start AND ordered_at < month_end) AS monthly_gross_profit,
  (SELECT coalesce(sum(subtotal),0) FROM v_order_summary WHERE status <> 'CANCELLED'
     AND ordered_at >= month_start AND ordered_at < month_end) AS cost_known_sales,
  (SELECT count(*) FROM offer_state WHERE status = 'PENDING_APPROVAL') AS pending_offers,
  (SELECT count(*) FROM offer WHERE submitted_at >= month_start AND submitted_at < month_end) AS monthly_offers,
  (SELECT count(*) FROM offer) AS total_offers,
  (SELECT coalesce(sum(o.offered_price),0) FROM offer o JOIN offer_state s USING (offer_id)
     WHERE s.status = 'PENDING_APPROVAL') AS pending_offer_amount,
  (SELECT coalesce(sum(offered_price),0) FROM v_paid_offer WHERE paid_at >= month_start AND paid_at < month_end) AS monthly_purchase_spend,
  (SELECT coalesce(sum(offered_price),0) FROM v_paid_offer) AS total_purchase_spend,
  (SELECT count(*) FROM v_inventory WHERE out_of_stock) AS out_of_stock_books,
  (SELECT count(*) FROM v_inventory WHERE low_in_stock) AS low_in_stock_books,
  (SELECT coalesce(sum(available),0) FROM v_inventory) AS inventory_copies
FROM bounds;

PREPARE customer_orders(text) AS
SELECT order_id, order_number, ordered_at, delivery_due_date, status, total,
  ship_line1, ship_line2, ship_city, ship_state_code, ship_postal_code, ship_country_code
FROM v_order_summary WHERE customer_subject = $1 ORDER BY ordered_at DESC, order_id DESC;

PREPARE customer_offers(text) AS
SELECT o.offer_id, o.title, o.offered_price, o.submitted_at, s.status, s.stocked,
  e.reason, p.paid_at
FROM offer o JOIN offer_state s USING (offer_id)
JOIN offer_event e ON e.offer_id = s.offer_id AND e.sequence_no = s.head_sequence
LEFT JOIN v_paid_offer p ON p.offer_id = o.offer_id
WHERE o.customer_subject = $1 ORDER BY o.submitted_at DESC, o.offer_id DESC;

PREPARE best_sellers AS
SELECT b.book_id, b.title, sum(i.quantity) AS copies_sold
FROM book b JOIN order_item i USING (book_id) JOIN order_state s USING (order_id)
WHERE NOT b.unlisted AND s.status <> 'CANCELLED'
GROUP BY b.book_id ORDER BY copies_sold DESC, b.book_id LIMIT 4;

PREPARE search_books(text, bigint, bigint, integer, integer) AS
SELECT book_id, title, author, isbn, current_price, available, cover_url
FROM v_inventory
WHERE NOT unlisted AND (title ILIKE '%' || $1 || '%' OR author ILIKE '%' || $1 || '%' OR isbn ILIKE '%' || $1 || '%')
  AND ($2 IS NULL OR genre_id = $2) AND ($3 IS NULL OR condition_id = $3)
ORDER BY title, book_id LIMIT $4 OFFSET $5;

PREPARE past_due_orders(timestamptz) AS
SELECT order_id FROM v_order_summary
WHERE delivery_due_date < ($1 AT TIME ZONE 'UTC')::date AND status NOT IN ('DELIVERED','CANCELLED')
ORDER BY order_id;

PREPARE low_stock_books AS
SELECT book_id FROM v_inventory WHERE low_in_stock ORDER BY book_id;
