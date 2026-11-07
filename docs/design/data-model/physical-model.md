---
document: データモデル・物理設計
status: proposed
---

# 物理モデル

対象はPostgreSQL 18、スキーマは `bookstore`。DDLは[作成](sql/schema.sql)・[ビュー](sql/views.sql)、カタログのスナップショットは[こちら](validation/schema-catalog.json)。
この文書の列・制約・索引一覧は実DBから生成し、`build-docs.mjs --check` でDDL適用後の定義との一致を検査する。

## 共通仕様と保証の境界

- 金額は `numeric(19,2)`。APIは小数2桁を超える入力と範囲超過を拒否し、丸めが必要な税計算だけをHALF_UPで行う。DBのnumeric型による暗黙丸めを入力検証の代わりにしない。
- IDはDB採番のbigint、かご・コマンドキーはAPI生成のランダムUUID。顧客主体は外部発行のtext。文字列の上限はこのモデルでは設けず、非空・形式・参照制約を優先する。
- 数量はinteger、0以上。かごと注文明細は1以上。在庫計算時はオーバーフローも失敗としてロールバックする。金額・数量とも上限で飽和させない。
- 生成された分類種別列は呼出側から指定しない。分類IDとの複合FKにより出版社をジャンル欄へ指定する誤りを拒否する。
- 凍結表のUPDATE/DELETE禁止、最低一明細、状態遷移、在庫連続性、棚入れ時の支払確認はAPIの責任。業務トリガー・ストアドプロシージャはない。単一DB接続ロールによる任意SQL更新を防ぐ設計ではない。
- APIには書込み対象列の許可リストを設ける。マイグレーション用DB所有者と通常運用ロールを分け、通常運用にDDL権限を付与しない。接続ロールの配備は環境設計で行う。

## 表・列・制約・索引

表の列属性・制約の正本はDDL。空欄の既定値は既定なし、`必須` はNOT NULL、identityと生成列はDBが設定する。
保持方針の「凍結」はアプリケーションによる変更禁止を意味する。

<!-- generated-dictionary:start -->

### address — 配送先住所

所有者：顧客。通常更新。所有者は不変、削除は無効化のみ。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `address_id` | `bigint` | 必須 | `identity always` | 配送先住所ID |
| `customer_subject` | `text` | 必須 | — | 所有する顧客の主体 |
| `line1` | `text` | 必須 | — | 住所行1 |
| `line2` | `text` | 任意 | — | 住所行2（任意） |
| `city` | `text` | 必須 | — | 市区町村 |
| `state_code` | `text` | 必須 | — | 米国50州またはDCのコード |
| `postal_code` | `text` | 必須 | — | 5桁またはZIP+4 |
| `country_code` | `text` | 必須 | `'US'::text` | 国コードUS |
| `active` | `boolean` | 必須 | `true` | 住所選択肢として有効か |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `address_active_not_null` | NOT NULL | `NOT NULL active` |
| `address_address_id_customer_subject_key` | UNIQUE | `UNIQUE (address_id, customer_subject)` |
| `address_address_id_not_null` | NOT NULL | `NOT NULL address_id` |
| `address_city_check` | CHECK | `CHECK (btrim(city) <> ''::text)` |
| `address_city_not_null` | NOT NULL | `NOT NULL city` |
| `address_country_code_check` | CHECK | `CHECK (country_code = 'US'::text)` |
| `address_country_code_not_null` | NOT NULL | `NOT NULL country_code` |
| `address_customer_subject_fkey` | FK | `FOREIGN KEY (customer_subject) REFERENCES customer(subject)` |
| `address_customer_subject_not_null` | NOT NULL | `NOT NULL customer_subject` |
| `address_line1_check` | CHECK | `CHECK (btrim(line1) <> ''::text)` |
| `address_line1_not_null` | NOT NULL | `NOT NULL line1` |
| `address_pkey` | PK | `PRIMARY KEY (address_id)` |
| `address_postal_code_check` | CHECK | `CHECK (postal_code ~ '^[0-9]{5}(-[0-9]{4})?$'::text)` |
| `address_postal_code_not_null` | NOT NULL | `NOT NULL postal_code` |
| `address_state_code_check` | CHECK | `CHECK (state_code = ANY (ARRAY['AL'::text, 'AK'::text, 'AZ'::text, 'AR'::text, 'CA'::text, 'CO'::text, 'CT'::text, 'DE'::text, 'FL'::text, 'GA'::text, 'HI'::text, 'ID'::text, 'IL'::text, 'IN'::text, 'IA'::text, 'KS'::text, 'KY'::text, 'LA'::text, 'ME'::text, 'MD'::text, 'MA'::text, 'MI'::text, 'MN'::text, 'MS'::text, 'MO'::text, 'MT'::text, 'NE'::text, 'NV'::text, 'NH'::text, 'NJ'::text, 'NM'::text, 'NY'::text, 'NC'::text, 'ND'::text, 'OH'::text, 'OK'::text, 'OR'::text, 'PA'::text, 'RI'::text, 'SC'::text, 'SD'::text, 'TN'::text, 'TX'::text, 'UT'::text, 'VT'::text, 'VA'::text, 'WA'::text, 'WV'::text, 'WI'::text, 'WY'::text, 'DC'::text]))` |
| `address_state_code_not_null` | NOT NULL | `NOT NULL state_code` |

| 索引 | 定義 |
| --- | --- |
| `address_address_id_customer_subject_key` | `CREATE UNIQUE INDEX address_address_id_customer_subject_key ON bookstore.address USING btree (address_id, customer_subject)` |
| `address_customer` | `CREATE INDEX address_customer ON bookstore.address USING btree (customer_subject, active)` |
| `address_pkey` | `CREATE UNIQUE INDEX address_pkey ON bookstore.address USING btree (address_id)` |

### book — 書籍の現在属性

所有者：在庫。通常更新。IDは不変、在庫と原価は別表。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `book_id` | `bigint` | 必須 | `identity always` | 書籍の在庫管理単位ID |
| `title` | `text` | 必須 | — | 書名 |
| `author` | `text` | 必須 | — | 著者 |
| `isbn` | `text` | 任意 | — | ISBN（任意・一意性なし） |
| `publisher_id` | `bigint` | 必須 | — | 出版社の参照項目ID |
| `publisher_kind` | `text` | 任意 | `generated: 'PUBLISHER'::text` | PUBLISHER固定の生成列 |
| `book_type_id` | `bigint` | 必須 | — | 書籍種別の参照項目ID |
| `book_type_kind` | `text` | 任意 | `generated: 'BOOK_TYPE'::text` | BOOK_TYPE固定の生成列 |
| `genre_id` | `bigint` | 必須 | — | ジャンルの参照項目ID |
| `genre_kind` | `text` | 任意 | `generated: 'GENRE'::text` | GENRE固定の生成列 |
| `condition_id` | `bigint` | 必須 | — | コンディションの参照項目ID |
| `condition_kind` | `text` | 任意 | `generated: 'CONDITION'::text` | CONDITION固定の生成列 |
| `current_price` | `numeric(19,2)` | 必須 | — | 現在の税抜売価 |
| `description` | `text` | 必須 | `''::text` | 概要 |
| `cover_url` | `text` | 任意 | — | 適正判定済み表紙のHTTPS配信URL（任意） |
| `unlisted` | `boolean` | 必須 | `false` | 公開検索・トップの対象外か |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `book_author_check` | CHECK | `CHECK (btrim(author) <> ''::text)` |
| `book_author_not_null` | NOT NULL | `NOT NULL author` |
| `book_book_id_not_null` | NOT NULL | `NOT NULL book_id` |
| `book_book_type_id_book_type_kind_fkey` | FK | `FOREIGN KEY (book_type_id, book_type_kind) REFERENCES reference_item(reference_id, kind)` |
| `book_book_type_id_not_null` | NOT NULL | `NOT NULL book_type_id` |
| `book_condition_id_condition_kind_fkey` | FK | `FOREIGN KEY (condition_id, condition_kind) REFERENCES reference_item(reference_id, kind)` |
| `book_condition_id_not_null` | NOT NULL | `NOT NULL condition_id` |
| `book_cover_url_check` | CHECK | `CHECK (cover_url IS NULL OR cover_url ~~ 'https://%'::text)` |
| `book_current_price_check` | CHECK | `CHECK (current_price >= 0::numeric)` |
| `book_current_price_not_null` | NOT NULL | `NOT NULL current_price` |
| `book_description_not_null` | NOT NULL | `NOT NULL description` |
| `book_genre_id_genre_kind_fkey` | FK | `FOREIGN KEY (genre_id, genre_kind) REFERENCES reference_item(reference_id, kind)` |
| `book_genre_id_not_null` | NOT NULL | `NOT NULL genre_id` |
| `book_pkey` | PK | `PRIMARY KEY (book_id)` |
| `book_publisher_id_not_null` | NOT NULL | `NOT NULL publisher_id` |
| `book_publisher_id_publisher_kind_fkey` | FK | `FOREIGN KEY (publisher_id, publisher_kind) REFERENCES reference_item(reference_id, kind)` |
| `book_title_check` | CHECK | `CHECK (btrim(title) <> ''::text)` |
| `book_title_not_null` | NOT NULL | `NOT NULL title` |
| `book_unlisted_not_null` | NOT NULL | `NOT NULL unlisted` |

| 索引 | 定義 |
| --- | --- |
| `book_classification` | `CREATE INDEX book_classification ON bookstore.book USING btree (genre_id, condition_id, book_id)` |
| `book_pkey` | `CREATE UNIQUE INDEX book_pkey ON bookstore.book USING btree (book_id)` |
| `book_price` | `CREATE INDEX book_price ON bookstore.book USING btree (current_price, book_id) WHERE (NOT unlisted)` |
| `book_title` | `CREATE INDEX book_title ON bookstore.book USING btree (title, book_id) WHERE (NOT unlisted)` |

### book_receipt — 書籍の取得事実

所有者：在庫。凍結。各書籍に一件、UPDATE/DELETEを提供しない。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `book_id` | `bigint` | 必須 | — | 書籍の在庫管理単位ID |
| `source_offer_id` | `bigint` | 任意 | — | 供給元オファー。手入力時NULL、値ありの場合一意 |
| `purchase_cost` | `numeric(19,2)` | 必須 | — | 登録時に確定した単位仕入原価 |
| `initial_quantity` | `integer` | 必須 | — | 登録／棚入れの初期数量 |
| `actor_subject` | `text` | 必須 | — | 実行した本人／スタッフの主体 |
| `recorded_at` | `timestamp with time zone` | 必須 | `CURRENT_TIMESTAMP` | DBへ記録したUTC時刻 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `book_receipt_actor_subject_fkey` | FK | `FOREIGN KEY (actor_subject) REFERENCES customer(subject)` |
| `book_receipt_actor_subject_not_null` | NOT NULL | `NOT NULL actor_subject` |
| `book_receipt_book_id_fkey` | FK | `FOREIGN KEY (book_id) REFERENCES book(book_id)` |
| `book_receipt_book_id_not_null` | NOT NULL | `NOT NULL book_id` |
| `book_receipt_check` | CHECK | `CHECK (source_offer_id IS NULL OR initial_quantity = 1)` |
| `book_receipt_initial_quantity_check` | CHECK | `CHECK (initial_quantity >= 0)` |
| `book_receipt_initial_quantity_not_null` | NOT NULL | `NOT NULL initial_quantity` |
| `book_receipt_pkey` | PK | `PRIMARY KEY (book_id)` |
| `book_receipt_purchase_cost_check` | CHECK | `CHECK (purchase_cost >= 0::numeric)` |
| `book_receipt_purchase_cost_not_null` | NOT NULL | `NOT NULL purchase_cost` |
| `book_receipt_recorded_at_not_null` | NOT NULL | `NOT NULL recorded_at` |
| `book_receipt_source_offer_id_fkey` | FK | `FOREIGN KEY (source_offer_id) REFERENCES offer(offer_id)` |
| `book_receipt_source_offer_id_key` | UNIQUE | `UNIQUE (source_offer_id)` |

| 索引 | 定義 |
| --- | --- |
| `book_receipt_pkey` | `CREATE UNIQUE INDEX book_receipt_pkey ON bookstore.book_receipt USING btree (book_id)` |
| `book_receipt_source_offer_id_key` | `CREATE UNIQUE INDEX book_receipt_source_offer_id_key ON bookstore.book_receipt USING btree (source_offer_id)` |

### cart — かご

所有者：購入準備。通常更新。顧客との紐付けはログイン統合時のみ。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `cart_id` | `uuid` | 必須 | — | 暗号学的乱数UUIDのかご識別子 |
| `customer_subject` | `text` | 任意 | — | 所有する顧客の主体 |
| `revision` | `bigint` | 必須 | `0` | かご変更ごとに増える楽観照合番号 |
| `updated_at` | `timestamp with time zone` | 必須 | `CURRENT_TIMESTAMP` | かごの最終操作UTC時刻 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `cart_cart_id_not_null` | NOT NULL | `NOT NULL cart_id` |
| `cart_customer_subject_fkey` | FK | `FOREIGN KEY (customer_subject) REFERENCES customer(subject)` |
| `cart_customer_subject_key` | UNIQUE | `UNIQUE (customer_subject)` |
| `cart_pkey` | PK | `PRIMARY KEY (cart_id)` |
| `cart_revision_check` | CHECK | `CHECK (revision >= 0)` |
| `cart_revision_not_null` | NOT NULL | `NOT NULL revision` |
| `cart_updated_at_not_null` | NOT NULL | `NOT NULL updated_at` |

| 索引 | 定義 |
| --- | --- |
| `cart_customer_subject_key` | `CREATE UNIQUE INDEX cart_customer_subject_key ON bookstore.cart USING btree (customer_subject)` |
| `cart_pkey` | `CREATE UNIQUE INDEX cart_pkey ON bookstore.cart USING btree (cart_id)` |

### cart_item — かご明細・欲しい物

所有者：購入準備。通常更新・削除。取引履歴ではない。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `cart_id` | `uuid` | 必須 | — | 暗号学的乱数UUIDのかご識別子 |
| `book_id` | `bigint` | 必須 | — | 書籍の在庫管理単位ID |
| `kind` | `text` | 必須 | — | PURCHASE / WISH |
| `quantity` | `integer` | 必須 | — | 正の整数数量 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `cart_item_book_id_fkey` | FK | `FOREIGN KEY (book_id) REFERENCES book(book_id)` |
| `cart_item_book_id_not_null` | NOT NULL | `NOT NULL book_id` |
| `cart_item_cart_id_fkey` | FK | `FOREIGN KEY (cart_id) REFERENCES cart(cart_id) ON DELETE CASCADE` |
| `cart_item_cart_id_not_null` | NOT NULL | `NOT NULL cart_id` |
| `cart_item_kind_check` | CHECK | `CHECK (kind = ANY (ARRAY['PURCHASE'::text, 'WISH'::text]))` |
| `cart_item_kind_not_null` | NOT NULL | `NOT NULL kind` |
| `cart_item_pkey` | PK | `PRIMARY KEY (cart_id, book_id, kind)` |
| `cart_item_quantity_check` | CHECK | `CHECK (quantity > 0)` |
| `cart_item_quantity_not_null` | NOT NULL | `NOT NULL quantity` |

| 索引 | 定義 |
| --- | --- |
| `cart_item_book` | `CREATE INDEX cart_item_book ON bookstore.cart_item USING btree (book_id)` |
| `cart_item_pkey` | `CREATE UNIQUE INDEX cart_item_pkey ON bookstore.cart_item USING btree (cart_id, book_id, kind)` |

### command_receipt — コマンドの実行結果

所有者：操作を実行する所有者。取引内で結果を確定、コミット後は変更しない。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `actor_subject` | `text` | 必須 | — | 実行した本人／スタッフの主体 |
| `operation` | `text` | 必須 | — | 業務コマンド名 |
| `command_key` | `uuid` | 必須 | — | 再送時にも同じUUIDキー |
| `payload_digest` | `text` | 必須 | — | サーバが正規化内容から計算したSHA-256小文字16進64文字 |
| `result` | `jsonb` | 必須 | — | 確定した結果のJSONオブジェクト。個人情報のコピーを避けID・合計等に限る |
| `recorded_at` | `timestamp with time zone` | 必須 | `CURRENT_TIMESTAMP` | DBへ記録したUTC時刻 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `command_receipt_actor_subject_fkey` | FK | `FOREIGN KEY (actor_subject) REFERENCES customer(subject)` |
| `command_receipt_actor_subject_not_null` | NOT NULL | `NOT NULL actor_subject` |
| `command_receipt_command_key_not_null` | NOT NULL | `NOT NULL command_key` |
| `command_receipt_operation_check` | CHECK | `CHECK (btrim(operation) <> ''::text)` |
| `command_receipt_operation_not_null` | NOT NULL | `NOT NULL operation` |
| `command_receipt_payload_digest_check` | CHECK | `CHECK (payload_digest ~ '^[0-9a-f]{64}$'::text)` |
| `command_receipt_payload_digest_not_null` | NOT NULL | `NOT NULL payload_digest` |
| `command_receipt_pkey` | PK | `PRIMARY KEY (actor_subject, operation, command_key)` |
| `command_receipt_recorded_at_not_null` | NOT NULL | `NOT NULL recorded_at` |
| `command_receipt_result_check` | CHECK | `CHECK (jsonb_typeof(result) = 'object'::text)` |
| `command_receipt_result_not_null` | NOT NULL | `NOT NULL result` |

| 索引 | 定義 |
| --- | --- |
| `command_receipt_pkey` | `CREATE UNIQUE INDEX command_receipt_pkey ON bookstore.command_receipt USING btree (actor_subject, operation, command_key)` |

### customer — 顧客

所有者：顧客。通常更新。subjectは不変、氏名は認証基盤から同期。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `subject` | `text` | 必須 | — | 外部認証基盤の不変な主体識別子 |
| `family_name` | `text` | 必須 | — | 同期した姓の現在値 |
| `given_name` | `text` | 必須 | — | 同期した名の現在値 |
| `synced_at` | `timestamp with time zone` | 必須 | `CURRENT_TIMESTAMP` | 氏名を同期したUTC時刻 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `customer_family_name_not_null` | NOT NULL | `NOT NULL family_name` |
| `customer_given_name_not_null` | NOT NULL | `NOT NULL given_name` |
| `customer_pkey` | PK | `PRIMARY KEY (subject)` |
| `customer_subject_check` | CHECK | `CHECK (btrim(subject) <> ''::text)` |
| `customer_subject_not_null` | NOT NULL | `NOT NULL subject` |
| `customer_synced_at_not_null` | NOT NULL | `NOT NULL synced_at` |

| 索引 | 定義 |
| --- | --- |
| `customer_pkey` | `CREATE UNIQUE INDEX customer_pkey ON bookstore.customer USING btree (subject)` |

### offer — 買取申込の成立事実

所有者：買取。凍結。申込価格・書誌・分類を変更しない。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `offer_id` | `bigint` | 必須 | `identity always` | 買取オファーID |
| `customer_subject` | `text` | 必須 | — | 所有する顧客の主体 |
| `title` | `text` | 必須 | — | 書名 |
| `author` | `text` | 必須 | — | 著者 |
| `isbn` | `text` | 任意 | — | ISBN（任意・一意性なし） |
| `publisher_id` | `bigint` | 必須 | — | 出版社の参照項目ID |
| `publisher_kind` | `text` | 任意 | `generated: 'PUBLISHER'::text` | PUBLISHER固定の生成列 |
| `book_type_id` | `bigint` | 必須 | — | 書籍種別の参照項目ID |
| `book_type_kind` | `text` | 任意 | `generated: 'BOOK_TYPE'::text` | BOOK_TYPE固定の生成列 |
| `genre_id` | `bigint` | 必須 | — | ジャンルの参照項目ID |
| `genre_kind` | `text` | 任意 | `generated: 'GENRE'::text` | GENRE固定の生成列 |
| `condition_id` | `bigint` | 必須 | — | コンディションの参照項目ID |
| `condition_kind` | `text` | 任意 | `generated: 'CONDITION'::text` | CONDITION固定の生成列 |
| `description` | `text` | 必須 | `''::text` | 概要 |
| `offered_price` | `numeric(19,2)` | 必須 | — | 顧客が申し込んだ買取価格（凍結） |
| `submitted_at` | `timestamp with time zone` | 必須 | — | 買取申込が成立したUTC日時 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `offer_author_check` | CHECK | `CHECK (btrim(author) <> ''::text)` |
| `offer_author_not_null` | NOT NULL | `NOT NULL author` |
| `offer_book_type_id_book_type_kind_fkey` | FK | `FOREIGN KEY (book_type_id, book_type_kind) REFERENCES reference_item(reference_id, kind)` |
| `offer_book_type_id_not_null` | NOT NULL | `NOT NULL book_type_id` |
| `offer_condition_id_condition_kind_fkey` | FK | `FOREIGN KEY (condition_id, condition_kind) REFERENCES reference_item(reference_id, kind)` |
| `offer_condition_id_not_null` | NOT NULL | `NOT NULL condition_id` |
| `offer_customer_subject_fkey` | FK | `FOREIGN KEY (customer_subject) REFERENCES customer(subject)` |
| `offer_customer_subject_not_null` | NOT NULL | `NOT NULL customer_subject` |
| `offer_description_not_null` | NOT NULL | `NOT NULL description` |
| `offer_genre_id_genre_kind_fkey` | FK | `FOREIGN KEY (genre_id, genre_kind) REFERENCES reference_item(reference_id, kind)` |
| `offer_genre_id_not_null` | NOT NULL | `NOT NULL genre_id` |
| `offer_offer_id_not_null` | NOT NULL | `NOT NULL offer_id` |
| `offer_offered_price_check` | CHECK | `CHECK (offered_price >= 1::numeric AND offered_price <= 1000000::numeric)` |
| `offer_offered_price_not_null` | NOT NULL | `NOT NULL offered_price` |
| `offer_pkey` | PK | `PRIMARY KEY (offer_id)` |
| `offer_publisher_id_not_null` | NOT NULL | `NOT NULL publisher_id` |
| `offer_publisher_id_publisher_kind_fkey` | FK | `FOREIGN KEY (publisher_id, publisher_kind) REFERENCES reference_item(reference_id, kind)` |
| `offer_submitted_at_not_null` | NOT NULL | `NOT NULL submitted_at` |
| `offer_title_check` | CHECK | `CHECK (btrim(title) <> ''::text)` |
| `offer_title_not_null` | NOT NULL | `NOT NULL title` |

| 索引 | 定義 |
| --- | --- |
| `offer_customer` | `CREATE INDEX offer_customer ON bookstore.offer USING btree (customer_subject, submitted_at, offer_id)` |
| `offer_date` | `CREATE INDEX offer_date ON bookstore.offer USING btree (submitted_at, offer_id)` |
| `offer_pkey` | `CREATE UNIQUE INDEX offer_pkey ON bookstore.offer USING btree (offer_id)` |

### offer_event — 買取の進行事実

所有者：買取。追記。既存行は変更しない。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `offer_id` | `bigint` | 必須 | — | 買取オファーID |
| `sequence_no` | `integer` | 必須 | — | 対象内で1から増える事実の連番 |
| `previous_sequence` | `integer` | 任意 | — | 直前の連番。初回事実のみNULL |
| `kind` | `text` | 必須 | — | SUBMITTED / APPROVED / RECEIVED / PAID / REJECTED / WITHDRAWN / STOCKED |
| `actor_subject` | `text` | 必須 | — | 実行した本人／スタッフの主体 |
| `occurred_at` | `timestamp with time zone` | 必須 | — | 業務成立／操作のUTC時刻（支払は実際の支払時刻） |
| `recorded_at` | `timestamp with time zone` | 必須 | `CURRENT_TIMESTAMP` | DBへ記録したUTC時刻 |
| `reason` | `text` | 任意 | — | 却下／棚卸調整の理由。該当する種別では非空必須 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `offer_event_actor_subject_fkey` | FK | `FOREIGN KEY (actor_subject) REFERENCES customer(subject)` |
| `offer_event_actor_subject_not_null` | NOT NULL | `NOT NULL actor_subject` |
| `offer_event_check` | CHECK | `CHECK (sequence_no = 1 AND previous_sequence IS NULL AND kind = 'SUBMITTED'::text OR sequence_no > 1 AND previous_sequence = (sequence_no - 1) AND previous_sequence IS NOT NULL AND kind <> 'SUBMITTED'::text)` |
| `offer_event_check1` | CHECK | `CHECK (kind <> 'REJECTED'::text OR reason IS NOT NULL AND btrim(reason) <> ''::text)` |
| `offer_event_kind_check` | CHECK | `CHECK (kind = ANY (ARRAY['SUBMITTED'::text, 'APPROVED'::text, 'RECEIVED'::text, 'PAID'::text, 'REJECTED'::text, 'WITHDRAWN'::text, 'STOCKED'::text]))` |
| `offer_event_kind_not_null` | NOT NULL | `NOT NULL kind` |
| `offer_event_occurred_at_not_null` | NOT NULL | `NOT NULL occurred_at` |
| `offer_event_offer_id_fkey` | FK | `FOREIGN KEY (offer_id) REFERENCES offer(offer_id)` |
| `offer_event_offer_id_kind_key` | UNIQUE | `UNIQUE (offer_id, kind)` |
| `offer_event_offer_id_not_null` | NOT NULL | `NOT NULL offer_id` |
| `offer_event_offer_id_previous_sequence_fkey` | FK | `FOREIGN KEY (offer_id, previous_sequence) REFERENCES offer_event(offer_id, sequence_no)` |
| `offer_event_pkey` | PK | `PRIMARY KEY (offer_id, sequence_no)` |
| `offer_event_recorded_at_not_null` | NOT NULL | `NOT NULL recorded_at` |
| `offer_event_sequence_no_check` | CHECK | `CHECK (sequence_no > 0)` |
| `offer_event_sequence_no_not_null` | NOT NULL | `NOT NULL sequence_no` |

| 索引 | 定義 |
| --- | --- |
| `offer_event_offer_id_kind_key` | `CREATE UNIQUE INDEX offer_event_offer_id_kind_key ON bookstore.offer_event USING btree (offer_id, kind)` |
| `offer_event_pkey` | `CREATE UNIQUE INDEX offer_event_pkey ON bookstore.offer_event USING btree (offer_id, sequence_no)` |

### offer_state — 買取の現在状態

所有者：買取。派生。offer_eventと同一取引で更新。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `offer_id` | `bigint` | 必須 | — | 買取オファーID |
| `head_sequence` | `integer` | 必須 | — | 派生現在値の根拠となる連鎖末端の連番 |
| `status` | `text` | 必須 | — | 現在の進行状態 |
| `stocked` | `boolean` | 必須 | `false` | 棚入れ済か。PAID状態とは別の派生値 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `offer_state_check` | CHECK | `CHECK (NOT stocked OR status = 'PAID'::text)` |
| `offer_state_head_sequence_not_null` | NOT NULL | `NOT NULL head_sequence` |
| `offer_state_offer_id_fkey` | FK | `FOREIGN KEY (offer_id) REFERENCES offer(offer_id)` |
| `offer_state_offer_id_head_sequence_fkey` | FK | `FOREIGN KEY (offer_id, head_sequence) REFERENCES offer_event(offer_id, sequence_no)` |
| `offer_state_offer_id_not_null` | NOT NULL | `NOT NULL offer_id` |
| `offer_state_pkey` | PK | `PRIMARY KEY (offer_id)` |
| `offer_state_status_check` | CHECK | `CHECK (status = ANY (ARRAY['PENDING_APPROVAL'::text, 'APPROVED'::text, 'RECEIVED'::text, 'PAID'::text, 'REJECTED'::text, 'WITHDRAWN'::text]))` |
| `offer_state_status_not_null` | NOT NULL | `NOT NULL status` |
| `offer_state_stocked_not_null` | NOT NULL | `NOT NULL stocked` |

| 索引 | 定義 |
| --- | --- |
| `offer_state_pkey` | `CREATE UNIQUE INDEX offer_state_pkey ON bookstore.offer_state USING btree (offer_id)` |
| `offer_state_status` | `CREATE INDEX offer_state_status ON bookstore.offer_state USING btree (status, offer_id)` |

### order_event — 注文の進行事実

所有者：販売。追記。取消も追加行として保存。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `order_id` | `bigint` | 必須 | — | 注文ID |
| `sequence_no` | `integer` | 必須 | — | 対象内で1から増える事実の連番 |
| `previous_sequence` | `integer` | 任意 | — | 直前の連番。初回事実のみNULL |
| `kind` | `text` | 必須 | — | PLACED / ACCEPTED / SHIPPED / DELIVERED / CANCELLED |
| `actor_subject` | `text` | 必須 | — | 実行した本人／スタッフの主体 |
| `occurred_at` | `timestamp with time zone` | 必須 | — | 業務成立／操作のUTC時刻（支払は実際の支払時刻） |
| `recorded_at` | `timestamp with time zone` | 必須 | `CURRENT_TIMESTAMP` | DBへ記録したUTC時刻 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `order_event_actor_subject_fkey` | FK | `FOREIGN KEY (actor_subject) REFERENCES customer(subject)` |
| `order_event_actor_subject_not_null` | NOT NULL | `NOT NULL actor_subject` |
| `order_event_check` | CHECK | `CHECK (sequence_no = 1 AND previous_sequence IS NULL AND kind = 'PLACED'::text OR sequence_no > 1 AND previous_sequence = (sequence_no - 1) AND previous_sequence IS NOT NULL AND kind <> 'PLACED'::text)` |
| `order_event_kind_check` | CHECK | `CHECK (kind = ANY (ARRAY['PLACED'::text, 'ACCEPTED'::text, 'SHIPPED'::text, 'DELIVERED'::text, 'CANCELLED'::text]))` |
| `order_event_kind_not_null` | NOT NULL | `NOT NULL kind` |
| `order_event_occurred_at_not_null` | NOT NULL | `NOT NULL occurred_at` |
| `order_event_order_id_fkey` | FK | `FOREIGN KEY (order_id) REFERENCES sales_order(order_id)` |
| `order_event_order_id_kind_key` | UNIQUE | `UNIQUE (order_id, kind)` |
| `order_event_order_id_not_null` | NOT NULL | `NOT NULL order_id` |
| `order_event_order_id_previous_sequence_fkey` | FK | `FOREIGN KEY (order_id, previous_sequence) REFERENCES order_event(order_id, sequence_no)` |
| `order_event_pkey` | PK | `PRIMARY KEY (order_id, sequence_no)` |
| `order_event_recorded_at_not_null` | NOT NULL | `NOT NULL recorded_at` |
| `order_event_sequence_no_check` | CHECK | `CHECK (sequence_no > 0)` |
| `order_event_sequence_no_not_null` | NOT NULL | `NOT NULL sequence_no` |

| 索引 | 定義 |
| --- | --- |
| `order_event_order_id_kind_key` | `CREATE UNIQUE INDEX order_event_order_id_kind_key ON bookstore.order_event USING btree (order_id, kind)` |
| `order_event_pkey` | `CREATE UNIQUE INDEX order_event_pkey ON bookstore.order_event USING btree (order_id, sequence_no)` |

### order_item — 注文と書籍の成立関係

所有者：販売。凍結。数量・売価・原価を変更しない。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `order_id` | `bigint` | 必須 | — | 注文ID |
| `book_id` | `bigint` | 必須 | — | 書籍の在庫管理単位ID |
| `quantity` | `integer` | 必須 | — | 正の整数数量 |
| `frozen_price` | `numeric(19,2)` | 必須 | — | 注文時の単位税抜売価 |
| `frozen_cost` | `numeric(19,2)` | 必須 | — | 注文時の単位仕入原価 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `order_item_book_id_fkey` | FK | `FOREIGN KEY (book_id) REFERENCES book(book_id)` |
| `order_item_book_id_not_null` | NOT NULL | `NOT NULL book_id` |
| `order_item_frozen_cost_check` | CHECK | `CHECK (frozen_cost >= 0::numeric)` |
| `order_item_frozen_cost_not_null` | NOT NULL | `NOT NULL frozen_cost` |
| `order_item_frozen_price_check` | CHECK | `CHECK (frozen_price >= 0::numeric)` |
| `order_item_frozen_price_not_null` | NOT NULL | `NOT NULL frozen_price` |
| `order_item_order_id_fkey` | FK | `FOREIGN KEY (order_id) REFERENCES sales_order(order_id)` |
| `order_item_order_id_not_null` | NOT NULL | `NOT NULL order_id` |
| `order_item_pkey` | PK | `PRIMARY KEY (order_id, book_id)` |
| `order_item_quantity_check` | CHECK | `CHECK (quantity > 0)` |
| `order_item_quantity_not_null` | NOT NULL | `NOT NULL quantity` |

| 索引 | 定義 |
| --- | --- |
| `order_item_book` | `CREATE INDEX order_item_book ON bookstore.order_item USING btree (book_id, order_id)` |
| `order_item_pkey` | `CREATE UNIQUE INDEX order_item_pkey ON bookstore.order_item USING btree (order_id, book_id)` |

### order_state — 注文の現在状態

所有者：販売。派生。order_eventと同一取引で更新。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `order_id` | `bigint` | 必須 | — | 注文ID |
| `head_sequence` | `integer` | 必須 | — | 派生現在値の根拠となる連鎖末端の連番 |
| `status` | `text` | 必須 | — | 現在の進行状態 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `order_state_head_sequence_not_null` | NOT NULL | `NOT NULL head_sequence` |
| `order_state_order_id_fkey` | FK | `FOREIGN KEY (order_id) REFERENCES sales_order(order_id)` |
| `order_state_order_id_head_sequence_fkey` | FK | `FOREIGN KEY (order_id, head_sequence) REFERENCES order_event(order_id, sequence_no)` |
| `order_state_order_id_not_null` | NOT NULL | `NOT NULL order_id` |
| `order_state_pkey` | PK | `PRIMARY KEY (order_id)` |
| `order_state_status_check` | CHECK | `CHECK (status = ANY (ARRAY['PENDING'::text, 'ORDERED'::text, 'SHIPPED'::text, 'DELIVERED'::text, 'CANCELLED'::text]))` |
| `order_state_status_not_null` | NOT NULL | `NOT NULL status` |

| 索引 | 定義 |
| --- | --- |
| `order_state_pkey` | `CREATE UNIQUE INDEX order_state_pkey ON bookstore.order_state USING btree (order_id)` |
| `order_state_status` | `CREATE INDEX order_state_status ON bookstore.order_state USING btree (status, order_id)` |

### reference_item — 参照データ項目

所有者：在庫。名称のみ通常更新。ID・種別は不変。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `reference_id` | `bigint` | 必須 | `identity always` | 参照データID |
| `kind` | `text` | 必須 | — | PUBLISHER / BOOK_TYPE / GENRE / CONDITION |
| `name` | `text` | 必須 | — | 選択肢の名称（前後空白なし） |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `reference_item_kind_check` | CHECK | `CHECK (kind = ANY (ARRAY['PUBLISHER'::text, 'BOOK_TYPE'::text, 'GENRE'::text, 'CONDITION'::text]))` |
| `reference_item_kind_not_null` | NOT NULL | `NOT NULL kind` |
| `reference_item_name_check` | CHECK | `CHECK (name = btrim(name) AND name <> ''::text)` |
| `reference_item_name_not_null` | NOT NULL | `NOT NULL name` |
| `reference_item_pkey` | PK | `PRIMARY KEY (reference_id)` |
| `reference_item_reference_id_kind_key` | UNIQUE | `UNIQUE (reference_id, kind)` |
| `reference_item_reference_id_not_null` | NOT NULL | `NOT NULL reference_id` |

| 索引 | 定義 |
| --- | --- |
| `reference_item_pkey` | `CREATE UNIQUE INDEX reference_item_pkey ON bookstore.reference_item USING btree (reference_id)` |
| `reference_item_reference_id_kind_key` | `CREATE UNIQUE INDEX reference_item_reference_id_kind_key ON bookstore.reference_item USING btree (reference_id, kind)` |
| `reference_name` | `CREATE UNIQUE INDEX reference_name ON bookstore.reference_item USING btree (kind, lower(name))` |

### sales_order — 注文の合意・配送先凍結値

所有者：販売。凍結。合計と配送先も変更しない。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `order_id` | `bigint` | 必須 | `identity always` | 注文ID |
| `order_number` | `text` | 必須 | — | 顧客に提示する一意な注文番号 |
| `customer_subject` | `text` | 必須 | — | 所有する顧客の主体 |
| `source_address_id` | `bigint` | 必須 | — | 配送先値のコピー元となった本人住所ID |
| `ship_line1` | `text` | 必須 | — | 凍結した住所行1 |
| `ship_line2` | `text` | 任意 | — | 凍結した住所行2 |
| `ship_city` | `text` | 必須 | — | 凍結した市区町村 |
| `ship_state_code` | `text` | 必須 | — | 凍結した州コード |
| `ship_postal_code` | `text` | 必須 | — | 凍結した郵便番号 |
| `ship_country_code` | `text` | 必須 | — | 凍結した国コードUS |
| `ordered_at` | `timestamp with time zone` | 必須 | — | 注文確定のUTC日時 |
| `delivery_due_date` | `date` | 必須 | — | UTC注文日付＋7日の納品予定日 |
| `subtotal` | `numeric(19,2)` | 必須 | — | 注文時の税抜小計 |
| `tax_rate` | `numeric(3,2)` | 必須 | `0.10` | 適用税率0.10（凍結） |
| `tax` | `numeric(19,2)` | 必須 | — | 小計×税率を小数2桁に四捨五入 |
| `total` | `numeric(19,2)` | 必須 | — | 凍結した税込合計 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `sales_order_check` | CHECK | `CHECK (tax >= 0::numeric AND tax = round(subtotal * tax_rate, 2))` |
| `sales_order_check1` | CHECK | `CHECK (total = (subtotal + tax))` |
| `sales_order_check2` | CHECK | `CHECK (delivery_due_date = ((ordered_at AT TIME ZONE 'UTC'::text)::date + 7))` |
| `sales_order_customer_subject_fkey` | FK | `FOREIGN KEY (customer_subject) REFERENCES customer(subject)` |
| `sales_order_customer_subject_not_null` | NOT NULL | `NOT NULL customer_subject` |
| `sales_order_delivery_due_date_not_null` | NOT NULL | `NOT NULL delivery_due_date` |
| `sales_order_order_id_not_null` | NOT NULL | `NOT NULL order_id` |
| `sales_order_order_number_check` | CHECK | `CHECK (btrim(order_number) <> ''::text)` |
| `sales_order_order_number_key` | UNIQUE | `UNIQUE (order_number)` |
| `sales_order_order_number_not_null` | NOT NULL | `NOT NULL order_number` |
| `sales_order_ordered_at_not_null` | NOT NULL | `NOT NULL ordered_at` |
| `sales_order_pkey` | PK | `PRIMARY KEY (order_id)` |
| `sales_order_ship_city_check` | CHECK | `CHECK (btrim(ship_city) <> ''::text)` |
| `sales_order_ship_city_not_null` | NOT NULL | `NOT NULL ship_city` |
| `sales_order_ship_country_code_check` | CHECK | `CHECK (ship_country_code = 'US'::text)` |
| `sales_order_ship_country_code_not_null` | NOT NULL | `NOT NULL ship_country_code` |
| `sales_order_ship_line1_check` | CHECK | `CHECK (btrim(ship_line1) <> ''::text)` |
| `sales_order_ship_line1_not_null` | NOT NULL | `NOT NULL ship_line1` |
| `sales_order_ship_postal_code_not_null` | NOT NULL | `NOT NULL ship_postal_code` |
| `sales_order_ship_state_code_not_null` | NOT NULL | `NOT NULL ship_state_code` |
| `sales_order_source_address_id_customer_subject_fkey` | FK | `FOREIGN KEY (source_address_id, customer_subject) REFERENCES address(address_id, customer_subject)` |
| `sales_order_source_address_id_not_null` | NOT NULL | `NOT NULL source_address_id` |
| `sales_order_subtotal_check` | CHECK | `CHECK (subtotal >= 0::numeric)` |
| `sales_order_subtotal_not_null` | NOT NULL | `NOT NULL subtotal` |
| `sales_order_tax_not_null` | NOT NULL | `NOT NULL tax` |
| `sales_order_tax_rate_check` | CHECK | `CHECK (tax_rate = 0.10)` |
| `sales_order_tax_rate_not_null` | NOT NULL | `NOT NULL tax_rate` |
| `sales_order_total_not_null` | NOT NULL | `NOT NULL total` |

| 索引 | 定義 |
| --- | --- |
| `order_customer` | `CREATE INDEX order_customer ON bookstore.sales_order USING btree (customer_subject, ordered_at, order_id)` |
| `order_date` | `CREATE INDEX order_date ON bookstore.sales_order USING btree (ordered_at, order_id)` |
| `order_due` | `CREATE INDEX order_due ON bookstore.sales_order USING btree (delivery_due_date, order_id)` |
| `sales_order_order_number_key` | `CREATE UNIQUE INDEX sales_order_order_number_key ON bookstore.sales_order USING btree (order_number)` |
| `sales_order_pkey` | `CREATE UNIQUE INDEX sales_order_pkey ON bookstore.sales_order USING btree (order_id)` |

### stock_balance — 現在の販売可能在庫

所有者：在庫。派生。stock_movementと同一取引で更新。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `book_id` | `bigint` | 必須 | — | 書籍の在庫管理単位ID |
| `head_sequence` | `integer` | 必須 | — | 派生現在値の根拠となる連鎖末端の連番 |
| `available` | `integer` | 必須 | — | 販売可能在庫の差分合計（非負） |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `stock_balance_available_check` | CHECK | `CHECK (available >= 0)` |
| `stock_balance_available_not_null` | NOT NULL | `NOT NULL available` |
| `stock_balance_book_id_fkey` | FK | `FOREIGN KEY (book_id) REFERENCES book(book_id)` |
| `stock_balance_book_id_head_sequence_fkey` | FK | `FOREIGN KEY (book_id, head_sequence) REFERENCES stock_movement(book_id, sequence_no)` |
| `stock_balance_book_id_not_null` | NOT NULL | `NOT NULL book_id` |
| `stock_balance_head_sequence_not_null` | NOT NULL | `NOT NULL head_sequence` |
| `stock_balance_pkey` | PK | `PRIMARY KEY (book_id)` |

| 索引 | 定義 |
| --- | --- |
| `stock_balance_pkey` | `CREATE UNIQUE INDEX stock_balance_pkey ON bookstore.stock_balance USING btree (book_id)` |

### stock_movement — 在庫増減・棚卸調整の事実

所有者：在庫。追記。各書籍の連番、既存行は変更しない。

| 列 | 型 | 必須 | DB設定 | 意味 |
| --- | --- | --- | --- | --- |
| `book_id` | `bigint` | 必須 | — | 書籍の在庫管理単位ID |
| `sequence_no` | `integer` | 必須 | — | 対象内で1から増える事実の連番 |
| `previous_sequence` | `integer` | 任意 | — | 直前の連番。初回事実のみNULL |
| `kind` | `text` | 必須 | — | REGISTERED / SHELVED / ORDERED / CANCELLED / ADJUSTED |
| `quantity_before` | `integer` | 必須 | — | ロック後の変更前の販売可能在庫 |
| `quantity_after` | `integer` | 必須 | — | 変更後の販売可能在庫 |
| `quantity_delta` | `integer` | 任意 | `generated: (quantity_after - quantity_before)` | 変更後−変更前の生成列 |
| `order_id` | `bigint` | 任意 | — | 注文ID |
| `order_event_sequence` | `integer` | 任意 | — | 根拠となる元注文のイベント連番 |
| `reason` | `text` | 任意 | — | 却下／棚卸調整の理由。該当する種別では非空必須 |
| `actor_subject` | `text` | 必須 | — | 実行した本人／スタッフの主体 |
| `occurred_at` | `timestamp with time zone` | 必須 | — | 業務成立／操作のUTC時刻（支払は実際の支払時刻） |
| `recorded_at` | `timestamp with time zone` | 必須 | `CURRENT_TIMESTAMP` | DBへ記録したUTC時刻 |

| 制約 | 種類 | 定義 |
| --- | --- | --- |
| `stock_movement_actor_subject_fkey` | FK | `FOREIGN KEY (actor_subject) REFERENCES customer(subject)` |
| `stock_movement_actor_subject_not_null` | NOT NULL | `NOT NULL actor_subject` |
| `stock_movement_book_id_fkey` | FK | `FOREIGN KEY (book_id) REFERENCES book(book_id)` |
| `stock_movement_book_id_not_null` | NOT NULL | `NOT NULL book_id` |
| `stock_movement_book_id_previous_sequence_fkey` | FK | `FOREIGN KEY (book_id, previous_sequence) REFERENCES stock_movement(book_id, sequence_no)` |
| `stock_movement_check` | CHECK | `CHECK (sequence_no = 1 AND previous_sequence IS NULL AND quantity_before = 0 AND (kind = ANY (ARRAY['REGISTERED'::text, 'SHELVED'::text])) OR sequence_no > 1 AND previous_sequence = (sequence_no - 1) AND previous_sequence IS NOT NULL AND (kind <> ALL (ARRAY['REGISTERED'::text, 'SHELVED'::text])))` |
| `stock_movement_check1` | CHECK | `CHECK ((kind = ANY (ARRAY['ORDERED'::text, 'CANCELLED'::text])) AND order_id IS NOT NULL AND order_event_sequence IS NOT NULL OR (kind <> ALL (ARRAY['ORDERED'::text, 'CANCELLED'::text])) AND order_id IS NULL AND order_event_sequence IS NULL)` |
| `stock_movement_check2` | CHECK | `CHECK (kind <> 'ORDERED'::text OR quantity_after < quantity_before)` |
| `stock_movement_check3` | CHECK | `CHECK (kind <> 'CANCELLED'::text OR quantity_after > quantity_before)` |
| `stock_movement_check4` | CHECK | `CHECK (kind <> 'SHELVED'::text OR quantity_after = 1)` |
| `stock_movement_check5` | CHECK | `CHECK (kind <> 'ADJUSTED'::text OR quantity_after <> quantity_before AND reason IS NOT NULL AND btrim(reason) <> ''::text)` |
| `stock_movement_kind_check` | CHECK | `CHECK (kind = ANY (ARRAY['REGISTERED'::text, 'SHELVED'::text, 'ORDERED'::text, 'CANCELLED'::text, 'ADJUSTED'::text]))` |
| `stock_movement_kind_not_null` | NOT NULL | `NOT NULL kind` |
| `stock_movement_occurred_at_not_null` | NOT NULL | `NOT NULL occurred_at` |
| `stock_movement_order_id_book_id_fkey` | FK | `FOREIGN KEY (order_id, book_id) REFERENCES order_item(order_id, book_id)` |
| `stock_movement_order_id_order_event_sequence_fkey` | FK | `FOREIGN KEY (order_id, order_event_sequence) REFERENCES order_event(order_id, sequence_no)` |
| `stock_movement_pkey` | PK | `PRIMARY KEY (book_id, sequence_no)` |
| `stock_movement_quantity_after_check` | CHECK | `CHECK (quantity_after >= 0)` |
| `stock_movement_quantity_after_not_null` | NOT NULL | `NOT NULL quantity_after` |
| `stock_movement_quantity_before_check` | CHECK | `CHECK (quantity_before >= 0)` |
| `stock_movement_quantity_before_not_null` | NOT NULL | `NOT NULL quantity_before` |
| `stock_movement_recorded_at_not_null` | NOT NULL | `NOT NULL recorded_at` |
| `stock_movement_sequence_no_check` | CHECK | `CHECK (sequence_no > 0)` |
| `stock_movement_sequence_no_not_null` | NOT NULL | `NOT NULL sequence_no` |

| 索引 | 定義 |
| --- | --- |
| `stock_movement_pkey` | `CREATE UNIQUE INDEX stock_movement_pkey ON bookstore.stock_movement USING btree (book_id, sequence_no)` |
| `stock_order_once` | `CREATE UNIQUE INDEX stock_order_once ON bookstore.stock_movement USING btree (book_id, order_id, kind) WHERE (order_id IS NOT NULL)` |

<!-- generated-dictionary:end -->

## ビューと索引の使い方

| ビュー | 責務 |
| --- | --- |
| `v_order_fact_state`・`v_offer_fact_state` | イベント連鎖の末端から進行状態を再構築 |
| `v_stock_fact_balance` | 差分合計から現在在庫を再構築 |
| `v_inventory` | 管理在庫・検索の現在属性、原価・在庫状態。公開照会では必ず `NOT unlisted` を追加 |
| `v_order_summary` | 注文の凍結値・現在状態・原価・粗利。顧客向けは必ず本人条件と列の許可リストを適用 |
| `v_paid_offer` | 支払ったオファーと支払の業務時刻 |
| `v_cart_totals` | 現在売価による購入明細だけの税込合計 |
| `v_model_issues` | 現在状態と正本の一致、事実同士の整合性を照合 |

FKは索引を自動作成しない。PK・UNIQUE索引に加え、顧客別・期間別の取引、状態別の一覧、在庫の分類・公開価格順などの索引を設ける。
低件数の参照表・一対一のヘッド参照など、PKで十分な箇所には重ねて索引を作らない。
書名・著者・ISBNの部分一致はこの規模では走査を許容する。通常のB-tree索引が `%語%` の検索を高速化するとは扱わない。
並び順の列はAPIで列挙して選び、生のORDER BY式を要求から受け取らない。書名／価格の昇降順に書籍IDを足してページ送りを安定させる。
実行例の検索は書名順。ISSUE-02は書名順、ISSUE-03は20件を設計案とする。性能目標の達成は実アプリ・想定件数で別途計測する。
