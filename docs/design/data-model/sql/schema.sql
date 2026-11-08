-- status: proposed; PostgreSQL 18; empty database only. No destructive reset.
BEGIN;
CREATE SCHEMA bookstore;
SET LOCAL search_path = bookstore, public;

CREATE TABLE customer (
    subject text PRIMARY KEY CHECK (btrim(subject) <> ''),
    family_name text NOT NULL,
    given_name text NOT NULL,
    synced_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE address (
    address_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_subject text NOT NULL REFERENCES customer(subject),
    line1 text NOT NULL CHECK (btrim(line1) <> ''),
    line2 text,
    city text NOT NULL CHECK (btrim(city) <> ''),
    state_code text NOT NULL CHECK (state_code IN
      ('AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY',
       'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
       'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC')),
    postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
    country_code text NOT NULL DEFAULT 'US' CHECK (country_code = 'US'),
    active boolean NOT NULL DEFAULT true,
    UNIQUE (address_id, customer_subject)
);
CREATE INDEX address_customer ON address(customer_subject, active);

CREATE TABLE reference_item (
    reference_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kind text NOT NULL CHECK (kind IN ('PUBLISHER','BOOK_TYPE','GENRE','CONDITION')),
    name text NOT NULL CHECK (name = btrim(name) AND name <> ''),
    UNIQUE (reference_id, kind)
);
CREATE UNIQUE INDEX reference_name ON reference_item(kind, lower(name));

CREATE TABLE offer (
    offer_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_subject text NOT NULL REFERENCES customer(subject),
    title text NOT NULL CHECK (btrim(title) <> ''),
    author text NOT NULL CHECK (btrim(author) <> ''),
    isbn text,
    publisher_id bigint NOT NULL,
    publisher_kind text GENERATED ALWAYS AS ('PUBLISHER'::text) STORED,
    book_type_id bigint NOT NULL,
    book_type_kind text GENERATED ALWAYS AS ('BOOK_TYPE'::text) STORED,
    genre_id bigint NOT NULL,
    genre_kind text GENERATED ALWAYS AS ('GENRE'::text) STORED,
    condition_id bigint NOT NULL,
    condition_kind text GENERATED ALWAYS AS ('CONDITION'::text) STORED,
    description text NOT NULL DEFAULT '',
    offered_price numeric(19,2) NOT NULL CHECK (offered_price BETWEEN 1 AND 1000000),
    submitted_at timestamptz NOT NULL,
    FOREIGN KEY (publisher_id, publisher_kind) REFERENCES reference_item(reference_id, kind),
    FOREIGN KEY (book_type_id, book_type_kind) REFERENCES reference_item(reference_id, kind),
    FOREIGN KEY (genre_id, genre_kind) REFERENCES reference_item(reference_id, kind),
    FOREIGN KEY (condition_id, condition_kind) REFERENCES reference_item(reference_id, kind)
);
CREATE INDEX offer_customer ON offer(customer_subject, submitted_at, offer_id);
CREATE INDEX offer_date ON offer(submitted_at, offer_id);

CREATE TABLE offer_event (
    offer_id bigint NOT NULL REFERENCES offer(offer_id),
    sequence_no integer NOT NULL CHECK (sequence_no > 0),
    previous_sequence integer,
    kind text NOT NULL CHECK (kind IN
      ('SUBMITTED','APPROVED','RECEIVED','PAID','REJECTED','WITHDRAWN','STOCKED')),
    actor_subject text NOT NULL REFERENCES customer(subject),
    occurred_at timestamptz NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason text,
    PRIMARY KEY (offer_id, sequence_no),
    UNIQUE (offer_id, kind),
    CHECK ((sequence_no = 1 AND previous_sequence IS NULL AND kind = 'SUBMITTED') OR
      (sequence_no > 1 AND previous_sequence = sequence_no - 1 AND previous_sequence IS NOT NULL AND kind <> 'SUBMITTED')),
    CHECK (kind <> 'REJECTED' OR (reason IS NOT NULL AND btrim(reason) <> '')),
    FOREIGN KEY (offer_id, previous_sequence) REFERENCES offer_event(offer_id, sequence_no)
);

CREATE TABLE offer_state (
    offer_id bigint PRIMARY KEY REFERENCES offer(offer_id),
    head_sequence integer NOT NULL,
    status text NOT NULL CHECK (status IN ('PENDING_APPROVAL','APPROVED','RECEIVED','PAID','REJECTED','WITHDRAWN')),
    stocked boolean NOT NULL DEFAULT false,
    CHECK (NOT stocked OR status = 'PAID'),
    FOREIGN KEY (offer_id, head_sequence) REFERENCES offer_event(offer_id, sequence_no)
);
CREATE INDEX offer_state_status ON offer_state(status, offer_id);

CREATE TABLE book (
    book_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL CHECK (btrim(title) <> ''),
    author text NOT NULL CHECK (btrim(author) <> ''),
    isbn text,
    publisher_id bigint NOT NULL,
    publisher_kind text GENERATED ALWAYS AS ('PUBLISHER'::text) STORED,
    book_type_id bigint NOT NULL,
    book_type_kind text GENERATED ALWAYS AS ('BOOK_TYPE'::text) STORED,
    genre_id bigint NOT NULL,
    genre_kind text GENERATED ALWAYS AS ('GENRE'::text) STORED,
    condition_id bigint NOT NULL,
    condition_kind text GENERATED ALWAYS AS ('CONDITION'::text) STORED,
    current_price numeric(19,2) NOT NULL CHECK (current_price >= 0),
    description text NOT NULL DEFAULT '',
    cover_url text CHECK (cover_url IS NULL OR cover_url LIKE 'https://%'),
    unlisted boolean NOT NULL DEFAULT false,
    FOREIGN KEY (publisher_id, publisher_kind) REFERENCES reference_item(reference_id, kind),
    FOREIGN KEY (book_type_id, book_type_kind) REFERENCES reference_item(reference_id, kind),
    FOREIGN KEY (genre_id, genre_kind) REFERENCES reference_item(reference_id, kind),
    FOREIGN KEY (condition_id, condition_kind) REFERENCES reference_item(reference_id, kind)
);
CREATE INDEX book_title ON book(title, book_id) WHERE NOT unlisted;
CREATE INDEX book_price ON book(current_price, book_id) WHERE NOT unlisted;
CREATE INDEX book_classification ON book(genre_id, condition_id, book_id);

CREATE TABLE book_receipt (
    book_id bigint PRIMARY KEY REFERENCES book(book_id),
    source_offer_id bigint UNIQUE REFERENCES offer(offer_id),
    purchase_cost numeric(19,2) NOT NULL CHECK (purchase_cost >= 0),
    initial_quantity integer NOT NULL CHECK (initial_quantity >= 0),
    actor_subject text NOT NULL REFERENCES customer(subject),
    recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (source_offer_id IS NULL OR initial_quantity = 1)
);

CREATE TABLE cart (
    cart_id uuid PRIMARY KEY,
    customer_subject text UNIQUE REFERENCES customer(subject),
    revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_item (
    cart_id uuid NOT NULL REFERENCES cart(cart_id) ON DELETE CASCADE,
    book_id bigint NOT NULL REFERENCES book(book_id),
    kind text NOT NULL CHECK (kind IN ('PURCHASE','WISH')),
    quantity integer NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (cart_id, book_id, kind)
);
CREATE INDEX cart_item_book ON cart_item(book_id);

CREATE TABLE sales_order (
    order_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number text NOT NULL UNIQUE CHECK (btrim(order_number) <> ''),
    customer_subject text NOT NULL REFERENCES customer(subject),
    source_address_id bigint NOT NULL,
    ship_line1 text NOT NULL CHECK (btrim(ship_line1) <> ''),
    ship_line2 text,
    ship_city text NOT NULL CHECK (btrim(ship_city) <> ''),
    ship_state_code text NOT NULL,
    ship_postal_code text NOT NULL,
    ship_country_code text NOT NULL CHECK (ship_country_code = 'US'),
    ordered_at timestamptz NOT NULL,
    delivery_due_date date NOT NULL,
    subtotal numeric(19,2) NOT NULL CHECK (subtotal >= 0),
    tax_rate numeric(3,2) NOT NULL DEFAULT 0.10 CHECK (tax_rate = 0.10),
    tax numeric(19,2) NOT NULL CHECK (tax >= 0 AND tax = round(subtotal * tax_rate, 2)),
    total numeric(19,2) NOT NULL CHECK (total = subtotal + tax),
    CHECK (delivery_due_date = (ordered_at AT TIME ZONE 'UTC')::date + 7),
    FOREIGN KEY (source_address_id, customer_subject) REFERENCES address(address_id, customer_subject)
);
CREATE INDEX order_customer ON sales_order(customer_subject, ordered_at, order_id);
CREATE INDEX order_date ON sales_order(ordered_at, order_id);
CREATE INDEX order_due ON sales_order(delivery_due_date, order_id);

CREATE TABLE order_item (
    order_id bigint NOT NULL REFERENCES sales_order(order_id),
    book_id bigint NOT NULL REFERENCES book(book_id),
    quantity integer NOT NULL CHECK (quantity > 0),
    frozen_price numeric(19,2) NOT NULL CHECK (frozen_price >= 0),
    frozen_cost numeric(19,2) NOT NULL CHECK (frozen_cost >= 0),
    PRIMARY KEY (order_id, book_id)
);
CREATE INDEX order_item_book ON order_item(book_id, order_id);

CREATE TABLE order_event (
    order_id bigint NOT NULL REFERENCES sales_order(order_id),
    sequence_no integer NOT NULL CHECK (sequence_no > 0),
    previous_sequence integer,
    kind text NOT NULL CHECK (kind IN ('PLACED','ACCEPTED','SHIPPED','DELIVERED','CANCELLED')),
    actor_subject text NOT NULL REFERENCES customer(subject),
    occurred_at timestamptz NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id, sequence_no),
    UNIQUE (order_id, kind),
    CHECK ((sequence_no = 1 AND previous_sequence IS NULL AND kind = 'PLACED') OR
      (sequence_no > 1 AND previous_sequence = sequence_no - 1 AND previous_sequence IS NOT NULL AND kind <> 'PLACED')),
    FOREIGN KEY (order_id, previous_sequence) REFERENCES order_event(order_id, sequence_no)
);

CREATE TABLE order_state (
    order_id bigint PRIMARY KEY REFERENCES sales_order(order_id),
    head_sequence integer NOT NULL,
    status text NOT NULL CHECK (status IN ('PENDING','ORDERED','SHIPPED','DELIVERED','CANCELLED')),
    FOREIGN KEY (order_id, head_sequence) REFERENCES order_event(order_id, sequence_no)
);
CREATE INDEX order_state_status ON order_state(status, order_id);

CREATE TABLE stock_movement (
    book_id bigint NOT NULL REFERENCES book(book_id),
    sequence_no integer NOT NULL CHECK (sequence_no > 0),
    previous_sequence integer,
    kind text NOT NULL CHECK (kind IN ('REGISTERED','SHELVED','ORDERED','CANCELLED','ADJUSTED')),
    quantity_before integer NOT NULL CHECK (quantity_before >= 0),
    quantity_after integer NOT NULL CHECK (quantity_after >= 0),
    quantity_delta integer GENERATED ALWAYS AS (quantity_after - quantity_before) STORED,
    order_id bigint,
    order_event_sequence integer,
    reason text,
    actor_subject text NOT NULL REFERENCES customer(subject),
    occurred_at timestamptz NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (book_id, sequence_no),
    CHECK ((sequence_no = 1 AND previous_sequence IS NULL AND quantity_before = 0 AND kind IN ('REGISTERED','SHELVED')) OR
      (sequence_no > 1 AND previous_sequence = sequence_no - 1 AND previous_sequence IS NOT NULL AND kind NOT IN ('REGISTERED','SHELVED'))),
    CHECK ((kind IN ('ORDERED','CANCELLED') AND order_id IS NOT NULL AND order_event_sequence IS NOT NULL) OR
      (kind NOT IN ('ORDERED','CANCELLED') AND order_id IS NULL AND order_event_sequence IS NULL)),
    CHECK (kind <> 'ORDERED' OR quantity_after < quantity_before),
    CHECK (kind <> 'CANCELLED' OR quantity_after > quantity_before),
    CHECK (kind <> 'SHELVED' OR quantity_after = 1),
    CHECK (kind <> 'ADJUSTED' OR (quantity_after <> quantity_before AND reason IS NOT NULL AND btrim(reason) <> '')),
    FOREIGN KEY (book_id, previous_sequence) REFERENCES stock_movement(book_id, sequence_no),
    FOREIGN KEY (order_id, book_id) REFERENCES order_item(order_id, book_id),
    FOREIGN KEY (order_id, order_event_sequence) REFERENCES order_event(order_id, sequence_no)
);
CREATE UNIQUE INDEX stock_order_once ON stock_movement(book_id, order_id, kind) WHERE order_id IS NOT NULL;

CREATE TABLE stock_balance (
    book_id bigint PRIMARY KEY REFERENCES book(book_id),
    head_sequence integer NOT NULL,
    available integer NOT NULL CHECK (available >= 0),
    FOREIGN KEY (book_id, head_sequence) REFERENCES stock_movement(book_id, sequence_no)
);

CREATE TABLE command_receipt (
    actor_subject text NOT NULL REFERENCES customer(subject),
    operation text NOT NULL CHECK (btrim(operation) <> ''),
    command_key uuid NOT NULL,
    payload_digest text NOT NULL CHECK (payload_digest ~ '^[0-9a-f]{64}$'),
    result jsonb NOT NULL CHECK (jsonb_typeof(result) = 'object'),
    recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_subject, operation, command_key)
);
COMMIT;
