-- Manual maintenance; supply -v as_of=<UTC timestamp> to psql.
BEGIN;
SET LOCAL search_path = bookstore, public;
DELETE FROM cart
WHERE customer_subject IS NULL
  AND updated_at < :'as_of'::timestamptz - interval '1 year';
COMMIT;
