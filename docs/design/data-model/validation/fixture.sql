-- Synthetic identities, titles and addresses only. No real customer data.
SET search_path=bookstore,public;
INSERT INTO customer(subject,family_name,given_name) VALUES
 ('alice','Example','Alice'),('bob','Example','Bob'),('staff','Example','Staff');
INSERT INTO address(customer_subject,line1,city,state_code,postal_code) VALUES
 ('alice','1 Example Street','Example City','CA','90001'),
 ('bob','2 Example Street','Example City','NY','10001');
INSERT INTO reference_item(kind,name) VALUES
 ('PUBLISHER','Example Publisher'),('BOOK_TYPE','Paperback'),('GENRE','Fiction'),('CONDITION','Good');
