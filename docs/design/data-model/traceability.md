---
document: データモデル・要件対応
status: proposed
---

# 要件と設計・検証の対応

要件の内容は参照先を正とし、ここでは識別子とモデルへの割当てを記録する。
「DB実証」は制約・SQL・検証用操作契約の試験を指す。画面・本番API・外部サービスの受入完了を表さない。
「設計のみ」「DB一部」の行は後工程での検証が必要。方法論との対応は[概念モデル](conceptual-model.md#パターンの適用)を参照する。
概念そのものの対応・分割・追加・省略・多重度は、[要件とデータモデルの照合・設計判断](requirements-model-reconciliation.md)でエンティティ・関係・主要項目ごとに照合する。要件自体の指摘・重大性・評価理由は[要件レビュー](requirements-review.md)で確認する。

<!-- generated-traceability:start -->

## 機能要件（32件）

| 要件 | 対象モデル・契約 | DB検証ケース | 検証範囲 |
| --- | --- | --- | --- |
| [FR-CMN-01](../../requirements/04-functional-requirements.md) | customer。氏名同期、メールは外部保持 | T01 | 設計のみ・認証API要検証 |
| [FR-CMN-02](../../requirements/04-functional-requirements.md) | 本人条件と管理者コンテキスト | T12、T24、T25 | DB一部・認可API要検証 |
| [FR-CMN-03](../../requirements/04-functional-requirements.md) | 競合・業務エラーと取引ロールバック | T06、T07、T16〜T21 | DB一部・画面要検証 |
| [FR-CMN-04](../../requirements/04-functional-requirements.md) | book.cover_url、画像保存とDBの補償契約 | — | 設計のみ・外部I/F要検証 |
| [FR-CUS-01](../../requirements/04-functional-requirements.md) | best_sellers、非公開除外 | T27 | DB一部・売れ筋順位と画面は後工程 |
| [FR-CUS-02](../../requirements/04-functional-requirements.md) | search_books、分類・現在売価・公開状態 | T27 | DB一部・並び替え／ページ送りは後工程 |
| [FR-CUS-03](../../requirements/04-functional-requirements.md) | book、reference_item、stock_balance。原価を応答から除外 | T01、T27 | DB一部・応答列／画面要検証 |
| [FR-CUS-04](../../requirements/04-functional-requirements.md) | cart_item、書籍／在庫を検査 | T24 | DB実証 |
| [FR-CUS-05](../../requirements/04-functional-requirements.md) | cart.revision、cart_item、v_cart_totals | T24、T28 | DB実証 |
| [FR-CUS-06](../../requirements/04-functional-requirements.md) | cart_item.kind=WISH、移動時の購入対象検査 | T05、T24 | DB一部・単件／全件移動のAPI要検証 |
| [FR-CUS-07](../../requirements/04-functional-requirements.md) | sales_order、order_item、stock_movement、かご消込み | T02、T05〜T07、T15、T16、T20、T28 | DB実証 |
| [FR-CUS-08](../../requirements/04-functional-requirements.md) | sales_orderの番号・合計・納品予定日 | T02 | DB一部・画面要検証 |
| [FR-CUS-09](../../requirements/04-functional-requirements.md) | addressの本人CRUD・論理削除、凍結住所 | T03、T12 | DB一部・住所保守API要検証 |
| [FR-CUS-10](../../requirements/04-functional-requirements.md) | customer_orders、凍結配送先・合計 | T03、T12 | DB一部・応答／画面要検証 |
| [FR-CUS-11](../../requirements/04-functional-requirements.md) | order_event.CANCELLED、在庫返却、本人条件 | T08、T12、T17、T18、T29 | DB実証 |
| [FR-CUS-12](../../requirements/04-functional-requirements.md) | offer、offer_event.SUBMITTED、offer_state | T10、T11 | DB実証 |
| [FR-CUS-13](../../requirements/04-functional-requirements.md) | customer_offers、WITHDRAWN、却下理由 | T11、T12 | DB一部・発送手順表示は画面設計 |
| [FR-ADM-01](../../requirements/04-functional-requirements.md) | dashboard、v_order_summary、v_paid_offer、v_inventory | T08、T13、T14 | DB一部・画面／統計取得失敗は後工程 |
| [FR-ADM-02](../../requirements/04-functional-requirements.md) | sales_order、order_state、past_due_orders | T14 | DB一部・状態／期間検索API要検証 |
| [FR-ADM-03](../../requirements/04-functional-requirements.md) | sales_order、order_item、order_state | T02、T03 | DB一部・画面要検証 |
| [FR-ADM-04](../../requirements/04-functional-requirements.md) | order_eventとorder_stateの原子的遷移 | T02、T17、T29 | DB実証 |
| [FR-ADM-05](../../requirements/04-functional-requirements.md) | v_inventory、分類ID・在庫条件 | T14、T27 | DB一部・管理検索API要検証 |
| [FR-ADM-06](../../requirements/04-functional-requirements.md) | v_inventoryと参照データ、取得原価 | T01、T10 | DB一部・画面要検証 |
| [FR-ADM-07](../../requirements/04-functional-requirements.md) | book、book_receipt、REGISTERED、stock_balance | T01、T02、T30 | DB実証 |
| [FR-ADM-08](../../requirements/04-functional-requirements.md) | bookの現在属性、原価の許可列除外 | T03、T28 | DB一部・入力許可列API要検証 |
| [FR-ADM-09](../../requirements/04-functional-requirements.md) | stock_movement.ADJUSTED、理由・前後・差分 | T09、T21 | DB実証 |
| [FR-ADM-10](../../requirements/04-functional-requirements.md) | book.unlisted、公開照会条件 | T27 | DB実証 |
| [FR-ADM-11](../../requirements/04-functional-requirements.md) | reference_item、種別・名称の一意性 | T01 | DB一部・保守API要検証 |
| [FR-ADM-12](../../requirements/04-functional-requirements.md) | offer、offer_state、申込日索引 | T13 | 設計のみ・管理検索API要検証 |
| [FR-ADM-13](../../requirements/04-functional-requirements.md) | APPROVED／REJECTED事実と理由 | T10〜T12 | DB実証 |
| [FR-ADM-14](../../requirements/04-functional-requirements.md) | RECEIVED／PAID、業務支払時刻 | T10、T11、T13 | DB実証 |
| [FR-ADM-15](../../requirements/04-functional-requirements.md) | book_receipt.source_offer_id、STOCKED、初期在庫1 | T10、T11、T19 | DB実証 |

## 業務ルール（42件）

| 要件 | 対象モデル・契約 | DB検証ケース | 検証範囲 |
| --- | --- | --- | --- |
| [RULE-MONEY-01](../../requirements/05-business-rules.md) | numeric(19,2)、APIの2桁検証、非負制約 | T01、T04、T30、T31 | DB実証 |
| [RULE-CART-01](../../requirements/05-business-rules.md) | v_cart_totals、現在単価×購入数量 | T24 | DB実証 |
| [RULE-CART-02](../../requirements/05-business-rules.md) | v_cart_totalsのPURCHASE条件 | T05、T24 | DB実証 |
| [RULE-ORDER-01](../../requirements/05-business-rules.md) | 注文の小計→税→合計、APIの確定契約 | T02、T04 | DB実証 |
| [RULE-ORDER-02](../../requirements/05-business-rules.md) | order_item.frozen_price×quantity | T03、T04、T30 | DB実証 |
| [RULE-ORDER-03](../../requirements/05-business-rules.md) | tax_rate=0.10、税の行内CHECK | T04 | DB実証 |
| [RULE-ORDER-04](../../requirements/05-business-rules.md) | sales_order.total=subtotal+taxのCHECK | T02、T04 | DB実証 |
| [RULE-ORDER-05](../../requirements/05-business-rules.md) | sales_order.total、v_cart_totals.total、顧客応答契約 | T02、T24 | DB一部・全画面の税込表示要検証 |
| [RULE-ORDER-06](../../requirements/05-business-rules.md) | v_order_summary.gross_profit | T04、T30 | DB実証 |
| [RULE-STOCK-01](../../requirements/05-business-rules.md) | ORDERED事実とstock_balanceの減算 | T02、T06、T16 | DB実証 |
| [RULE-STOCK-02](../../requirements/05-business-rules.md) | CANCELLED事実とstock_balanceの返却 | T08、T18、T29 | DB実証 |
| [RULE-STOCK-03](../../requirements/05-business-rules.md) | 書籍行ロック、最新在庫検査、非負CHECK | T01、T06、T16、T21 | DB実証 |
| [RULE-STOCK-04](../../requirements/05-business-rules.md) | v_inventory.low_in_stock、low_stock_books | T14 | DB実証 |
| [RULE-STOCK-05](../../requirements/05-business-rules.md) | 購入明細追加の最新在庫検査、公開検索に在庫0も残す | T24 | DB一部・在庫切れ表示要検証 |
| [RULE-STOCK-06](../../requirements/05-business-rules.md) | 確認結果の除外対象、確定後もかごに保持 | T05、T06 | DB実証 |
| [RULE-STOCK-07](../../requirements/05-business-rules.md) | stock_movement.ADJUSTED、前後・差分・理由・主体・時刻 | T09 | DB実証 |
| [RULE-STOCK-08](../../requirements/05-business-rules.md) | book.unlistedと公開照会の条件 | T27 | DB実証 |
| [RULE-TRADE-01](../../requirements/05-business-rules.md) | 棚入れ契約のPAID検査 | T10、T11 | DB実証 |
| [RULE-TRADE-02](../../requirements/05-business-rules.md) | source_offer_idの一意性、STOCKEDの一意性 | T19 | DB実証 |
| [RULE-TRADE-03](../../requirements/05-business-rules.md) | book.current_priceとbook_receipt.purchase_costの分離 | T10 | DB実証 |
| [RULE-TRADE-04](../../requirements/05-business-rules.md) | book_receipt.purchase_costの凍結、更新許可列 | T03 | DB一部・本番APIの変更拒否要検証 |
| [RULE-TRADE-05](../../requirements/05-business-rules.md) | order_item.frozen_price／frozen_cost | T03、T30 | DB実証 |
| [RULE-TRADE-06](../../requirements/05-business-rules.md) | PLACE_ORDERの最低1明細、照合時の空注文検出 | T05 | DB実証 |
| [RULE-TRADE-07](../../requirements/05-business-rules.md) | book_receipt.purchase_costの必須・非負 | T01、T02 | DB実証 |
| [RULE-OFFER-01](../../requirements/05-business-rules.md) | offer.offered_price、管理側は承認／却下のみ | T10 | DB一部・管理入力API要検証 |
| [RULE-OFFER-02](../../requirements/05-business-rules.md) | offered_priceの1〜1,000,000制約 | T01 | DB実証 |
| [RULE-OFFER-03](../../requirements/05-business-rules.md) | REJECTED理由のCHECK、customer_offers | T11 | DB一部・理由表示API要検証 |
| [RULE-OFFER-04](../../requirements/05-business-rules.md) | WITHDRAWNの本人条件と状態検査 | T12 | DB実証 |
| [RULE-OFFER-05](../../requirements/05-business-rules.md) | 申込価格の凍結、変更操作を提供しない | T10 | 設計のみ・本番APIの変更拒否要検証 |
| [RULE-PERIOD-01](../../requirements/05-business-rules.md) | timestamptz、UTC演算 | T13、T14 | DB実証 |
| [RULE-PERIOD-02](../../requirements/05-business-rules.md) | dashboardのUTC月初・翌月初境界 | T13 | DB実証 |
| [RULE-PERIOD-03](../../requirements/05-business-rules.md) | delivery_due_dateのUTC日付＋7制約 | T02 | DB実証 |
| [RULE-PERIOD-04](../../requirements/05-business-rules.md) | past_due_ordersとdashboardの同一定義 | T14 | DB実証 |
| [RULE-PERIOD-05](../../requirements/05-business-rules.md) | v_paid_offer.paid_atを支出月に使用 | T13 | DB実証 |
| [RULE-PERIOD-06](../../requirements/05-business-rules.md) | PLACED／SUBMITTEDの業務時刻と根拠行の照合 | T02、T13 | DB実証 |
| [RULE-SALES-01](../../requirements/05-business-rules.md) | 取消済以外を計上 | T08 | DB実証 |
| [RULE-SALES-02](../../requirements/05-business-rules.md) | sales_order.subtotalを売上集計 | T13 | DB実証 |
| [RULE-SALES-03](../../requirements/05-business-rules.md) | v_order_summary.gross_profit | T04、T30 | DB実証 |
| [RULE-SALES-04](../../requirements/05-business-rules.md) | v_paid_offer、offered_priceの合計 | T13 | DB実証 |
| [RULE-ACCESS-01](../../requirements/05-business-rules.md) | customer_subjectによる照会・更新条件 | T12、T24、T25 | DB一部・認証／認可API要検証 |
| [RULE-ACCESS-02](../../requirements/05-business-rules.md) | 管理照会を管理者コンテキストに限定 | — | 設計のみ・認可API要検証 |
| [RULE-ACCESS-03](../../requirements/05-business-rules.md) | DB内に権限細分化モデルを持たない | — | 設計のみ・外部認証グループ要検証 |

## 主要エンティティ（10件）

| 要件 | 対象モデル・契約 | DB検証ケース | 検証範囲 |
| --- | --- | --- | --- |
| [ENT-CUSTOMER](../../requirements/07-data-requirements.md) | customer.subject、氏名現在値（メール保持はA06） | T01、T12 | DB実証 |
| [ENT-ADDRESS](../../requirements/07-data-requirements.md) | addressとsales_orderの凍結住所 | T03、T12 | DB実証 |
| [ENT-BOOK](../../requirements/07-data-requirements.md) | book、book_receipt、stock_balance、stock_movement | T01〜T03、T09、T10 | DB実証 |
| [ENT-OFFER](../../requirements/07-data-requirements.md) | offer、offer_event、offer_state | T10〜T13、T19 | DB実証 |
| [ENT-CART](../../requirements/07-data-requirements.md) | cart、本人紐付けとrevision | T24〜T26、T28 | DB実証 |
| [ENT-CART-ITEM](../../requirements/07-data-requirements.md) | cart_item、PURCHASE／WISH | T05、T24、T25 | DB実証 |
| [ENT-ORDER](../../requirements/07-data-requirements.md) | sales_order、order_event、order_state | T02、T03、T08 | DB実証 |
| [ENT-ORDER-ITEM](../../requirements/07-data-requirements.md) | order_item、凍結売価・仕入原価 | T03、T04、T30 | DB実証 |
| [ENT-REFDATA](../../requirements/07-data-requirements.md) | reference_itemと分類種別の複合FK | T01 | DB実証 |
| [ENT-STOCK-ADJUSTMENT](../../requirements/07-data-requirements.md) | stock_movementのADJUSTED行 | T09、T21 | DB実証 |

## 非機能要件（23件）

| 要件 | 対象モデル・契約 | DB検証ケース | 検証範囲 |
| --- | --- | --- | --- |
| [NFR-AVAIL-01](../../requirements/09-non-functional-requirements.md) | 業務データモデルの外 | — | 運用で検証 |
| [NFR-AVAIL-02](../../requirements/09-non-functional-requirements.md) | 単一DB・単一APIの前提 | — | 可用性水準は対象外 |
| [NFR-AVAIL-03](../../requirements/09-non-functional-requirements.md) | 正本と派生を区別し、DB全体をバックアップ対象とする | T22 | DB一部・バックアップ復旧試験は運用で実施 |
| [NFR-PERF-01](../../requirements/09-non-functional-requirements.md) | 基本索引と照会時集計 | — | 設計のみ・想定データ量の画面性能は未計測 |
| [NFR-PERF-02](../../requirements/09-non-functional-requirements.md) | 行ロックの競合対象を限定 | T16〜T21、T29 | DB一部・50セッション負荷は未計測 |
| [NFR-PERF-03](../../requirements/09-non-functional-requirements.md) | 分散DB・非同期集計を追加しない | — | 拡張性水準は対象外 |
| [NFR-SEC-01](../../requirements/09-non-functional-requirements.md) | 業務DBの外 | — | TLS・HSTSは基盤／APIで検証 |
| [NFR-SEC-02](../../requirements/09-non-functional-requirements.md) | 未ログインは本人取引を照会できない契約 | — | 公開画面境界はAPI／画面で検証 |
| [NFR-SEC-03](../../requirements/09-non-functional-requirements.md) | 管理操作は検証済み管理者コンテキスト | — | 管理グループ認可はAPIで検証 |
| [NFR-SEC-04](../../requirements/09-non-functional-requirements.md) | 業務DBの外 | — | 偽造更新要求の拒否はAPIで検証 |
| [NFR-SEC-05](../../requirements/09-non-functional-requirements.md) | 資格情報は実行時構成、試験は専用ローカルtrust | — | リポジトリ・配備構成監査で検証 |
| [NFR-SEC-06](../../requirements/09-non-functional-requirements.md) | book.cover_url、画像判定後に保存する契約 | — | 外部I/Fで検証 |
| [NFR-SEC-07](../../requirements/09-non-functional-requirements.md) | 本人条件付きSQLと所有者付き複合FK | T12、T24、T25 | DB一部・HTTP経由の認可は未検証 |
| [NFR-SEC-08](../../requirements/09-non-functional-requirements.md) | 注文と在庫の同一取引、書籍行ロック | T06、T07、T16、T21 | DB実証 |
| [NFR-OPS-01](../../requirements/09-non-functional-requirements.md) | アプリログと不変事実の保持を区別 | — | ログ配信・30日失効は運用で検証 |
| [NFR-OPS-02](../../requirements/09-non-functional-requirements.md) | 業務データモデルの外 | — | 監視発報は運用で検証 |
| [NFR-OPS-03](../../requirements/09-non-functional-requirements.md) | DB作成・照合・再構築・掃除の手順 | T22、T23、T26 | DB一部・本番運用手順書は別成果物 |
| [NFR-MIG-01](../../requirements/09-non-functional-requirements.md) | REGISTER_BOOK、既存データ移行なし | T02 | DB一部・本番の手入力運用は別途 |
| [NFR-MIG-02](../../requirements/09-non-functional-requirements.md) | reference_item、種別整合・名称一意 | T01 | DB一部・店提供の本番選択肢は未投入 |
| [NFR-ENV-01](../../requirements/09-non-functional-requirements.md) | 業務データモデルの外 | — | ブラウザ試験で検証 |
| [NFR-ENV-02](../../requirements/09-non-functional-requirements.md) | 業務データモデルの外 | — | 画面試験で検証 |
| [NFR-ENV-03](../../requirements/09-non-functional-requirements.md) | 状態コードと用語の対応 | — | 画面文言の確認は別途 |
| [NFR-A11Y-01](../../requirements/09-non-functional-requirements.md) | 業務データモデルの外 | — | アクセシビリティ水準は対象外 |

<!-- generated-traceability:end -->

## 識別子のない制約と申し送り

| 入力 | データ設計での扱い | 検証・残る工程 |
| --- | --- | --- |
| [05章§8](../../requirements/05-business-rules.md)の状態遷移 | order_event／offer_eventの許可遷移を操作契約と照合ビューに定義 | T02、T08、T11、T12、T17〜T19、T23、T29。API実装の遷移検証は別途 |
| [07章§3](../../requirements/07-data-requirements.md)の凍結 | 金額・原価・配送先を凍結、住所は論理削除 | T03、T04、T30。DB所有者の任意更新は禁止できない |
| [07章§5](../../requirements/07-data-requirements.md)の保持 | 無期限の事実、未ログインかごの期限、画像とログの責任分担 | T26、画像削除とログ失効は外部I/F・運用で検証 |
| [10章§5](../../requirements/10-system-architecture.md)の責任分担 | 業務ルールはAPI層、DBは行内制約・一意性・FK、業務SPなし | T01、各操作契約。Spring Boot実装は対象外 |
| [D-01〜D-13・ADR](../../requirements/decisions/README.md) | 顧客かご、検索、金額、棚入れ、オンライン決済等の範囲をモデルに反映 | 各FR／RULEと対応。決済・通知・対案査定を追加しない |
| [ISSUE-01](../../requirements/12-open-issues-and-risks.md) | 初期在庫はREGISTER_BOOKで原価必須。合成データは本番投入物ではない | 登録作業の分担・操作手順は運用設計 |
| ISSUE-02・ISSUE-03 | 検索既定は書名順、ページ20件を設計案とする | 画面・性能確認は別途 |
| ISSUE-07 | 手動の未ログインかご掃除SQLを定義 | T26。運用担当・実行頻度は運用手順で定義 |
| ISSUE-04〜06・ISSUE-08 | 出荷後取消・値付け支援・権限細分化・選択肢廃止を機能化しない | 要件で定めた運用・稼働後の判断 |
| ISSUE-09 | DBは用語定義に対応する状態コードを使用 | 英語画面文言は画面設計で確定 |

全機能のデータ上の受け皿を示す表であり、機能数・見積・合意状態を変更しない。
