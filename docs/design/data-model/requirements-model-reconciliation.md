---
document: 要件とデータモデルの照合・設計判断
status: proposed
---

# 要件とデータモデルの照合・設計判断

[要件07章](../../requirements/07-data-requirements.md)の業務概念を、[設計の概念モデル](conceptual-model.md)と照合し、分割・一般化・追加・省略の判断を示す。
概念の対応と、属性が論理・物理モデルのどこに実現されるかを別の節に置く。物理表が増えたことを、そのまま業務概念の増加とは数えない。

## 1. レビューの入口

欠陥の重大性・評価理由・解消条件の正本は[要件レビュー](requirements-review.md)である。本書は指摘と設計判断・対応箇所を結び、要件の修正や設計案の承認を表すものではない。
まず要件レビューで判断対象を把握し、本書の設計判断を確認してから、必要な概念・関係・属性の行を参照する。

| 確認対象 | 要件レビューでの参照 | 本書の参照 |
| --- | --- | --- |
| 書籍の識別単位・在庫数の意味 | RQ-01・RQ-05 | DM-01・DM-04・DM-09、F14・F18 |
| 金額・丸め・注文確認の境界 | RQ-02・RQ-06 | F16・F48〜F50、設計仮定A01・A02と[注文確定契約](transactions.md#注文確定の原子性) |
| 図と機能要件の不整合 | RQ-03・RQ-04 | DM-05・DM-06、R04・R10・F36 |
| メール保持・かご統合・欲しい物移動 | RQ-07・RQ-08・RQ-11 | DM-07、F04・F36・F41、[操作契約](transactions.md#共通契約) |
| 参照名称・予定日の粒度 | RQ-09・RQ-10 | DM-10・DM-12、F47・F57 |
| 誤入力時の運用・価格凍結の表現 | RQ-12・RQ-13 | DM-03、本書末尾のP006の境界 |
| 導入・検収条件 | RQ-14 | データ項目の対応だけでは解消しない。要件レビューで扱う |
| 図上の表現不足・設計規模の影響 | DS-01〜DS-03 | DM-04・DM-06・DM-11 |

要件側の10エンティティ・13関係・主要項目63件を、それぞれ一件一行で照合する。
対応先は一つとは限らず、元概念を分割した行には複数の設計要素を示す。R01〜R13・F01〜F63・DM-01〜DM-12は本書内の識別子で、要件のD・ISSUE番号を置き換えない。
数が一致していても、未対応や解釈差を解消済みにはしない。列名は保存・導出先の補助情報であり、実装や試験の完了を表さない。

## 2. 設計判断と未解決事項

### 照合の判定

| 判定 | 意味 |
| --- | --- |
| 一致 | 要件の業務概念・関係・値を保つ。これだけでは実装・検証完了を意味しない |
| 名称変更 | ORDER→SALES_ORDER、REFDATA→REFERENCE_ITEMのように同じ意味を別名で表す |
| 分割 | 一つの要件概念の属性・進行・現在値を別の設計要素で表す |
| 一般化 | 要件概念を、より広い概念の部分集合として表す。元の概念の意味を別途保つ必要がある |
| 解釈差 | 要件内の記述の揺れや未規定部分について、設計案として一方を選んでいる |
| 未対応 | 要件の要素が設計の該当する図・項目に表れていない。別の層で表現していても未対応の場所を示す |
| 追加 | 要件07章に独立要素としてはない設計要素。機能要件・ルール・技術上の仮定からの根拠を別記する |

根拠は「要件が求めること」と「本設計が選んだ表現」を分ける。パターンの適用は表現の候補を説明するもので、要件の変更や要素の省略を正当化するものではない。
P009・P010・P011の更新・再送・保存方式だけを根拠に、別の業務概念が必須だとは判断しない。要件の欠陥、設計の未対応、意図的な表現選択を分ける。

### 差異と設計判断（12件）

| 差異ID・対象 | 判定 | 要件に基づく設計判断 | パターンと適用の限界 | 確認事項・対応先 |
| --- | --- | --- | --- | --- |
| DM-01 書籍の現在属性・取得原価・在庫 | 分割する設計選択 | RULE-TRADE-04・07、FR-ADM-07・08・15に沿い、原価・供給元は取得事実、売価等は現在属性、数量は増減からの現在値に分ける | P001・P004・P008・P011。取得事実を独立ノード・表にすることは必須ではない | 書籍の業務同一性は保つ。識別単位と在庫の意味はRQ-01・RQ-05。F17・F18・F22 |
| DM-02 注文の合意・進行・状態 | 分割する設計選択 | FR-ADM-04、FR-CUS-11、05章§8.1に沿い、同じ注文の各履行・取消を点事実として残し、現在状態を導出する | P001・P002・P005・P007・P008・P011。原子性はP009。要件は全段階の独立履歴表やActivity専用表まで指定していない | 要件欠陥の指摘ではない。新たな注文の合意を増やさない。確定の観測点はRQ-06。F45・F46 |
| DM-03 買取申込・段階・状態・理由・日付 | 分割する設計選択 | FR-ADM-13〜15、05章§8.2に沿い、申込と承認・受領・支払・却下・取下げ・棚入れを分ける。価格は07章§3の申込時凍結を採る | P001・P002・P007・P008・P011。凍結時点はパターンから決まらない | RQ-13は表現整備。申込時凍結と支払後禁止は両立し、弱い禁止から支払前変更の許可を推論しない。F29〜F34 |
| DM-04 棚卸調整と在庫移動 | 一般化＋図の表現不足 | ENT-STOCK-ADJUSTMENT・RULE-STOCK-01・02・07の増減を上位概念にまとめ、ADJUSTEDで棚卸調整を識別する | P001・P007・P008。同じ物理表への統合や元概念の図からの省略はパターンの必須条件ではない | DS-02は設計側の問題。棚卸調整の0..nと全移動の1..nを混同しない。在庫の意味はRQ-05。R13・F58〜F63 |
| DM-05 供給元オファーと取得経路 | 経路分割＋任意性の整合化案 | FR-ADM-07・15、RULE-TRADE-01・02・04・07に沿い、手入力では供給元なし、買取由来では一意な供給元を持つ | P001・P004は取得と凍結の説明。P009は支払済・重複拒否。任意性の根拠は手入力要件である | 要件図の必須参照はRQ-04。取得事実を経由するかは別の設計選択。R10・F22 |
| DM-06 未ログインかごの顧客関与 | 概念図が未対応 | FR-CUS-07、04章§2.1、D-01に沿い、保存先では顧客未設定を許す。概念図は顧客必須のままである | P001で関与主体を再確認する箇所。P010・P011で多重度の矛盾は解決しない | 要件図の不整合はRQ-03、設計図の表現不足はDS-01。未ログイン利用自体は明記済みである。R04・F36 |
| DM-07 メールの保持先 | 省略する解釈案 | 外部保持を示す07章§5・08章・11章を採り、ローカルの顧客をsub・姓・名に限る。一方ENT-CUSTOMER・03章はメール取込みを示す | 省略を決める適用パターンはない。P001・P012は、要求された属性を落とす許可ではない | RQ-07。ローカル保持する解釈には未対応であり、外部保持で要件が確定したとは扱わない。F04 |
| DM-08 注文住所の凍結 | 関係維持＋値の複製 | 07章§3、FR-CUS-09・10に沿い、コピー元住所IDと注文時点の値を併存させ、現在住所の更新に追随させない | P004の必要な過去値保持をスナップショットとして具体化。全住所属性の世代表・二時制は導入しない | 要件欠陥の指摘ではない。注文→住所関係を残し、新しい住所所有者や登録機能は追加しない。R07・F44 |
| DM-09 書籍IDの識別単位 | 設計仮定 | A09として異なる仕入原価は別書籍ID、同ISBNの別IDを許す。用語定義の1タイトル・通常1冊と、ENT-BOOKの数量・単位原価から検討する | P001は同一性の検討の手掛かり。原価ごとにIDを分けること自体をパターンは決めない | RQ-01。複数冊のまとめ方・検索表示・タイトル別集計を確定する必要がある。F14・F17・F18 |
| DM-10 参照データ名の一意性 | 設計仮定 | FR-ADM-11・D-15の同一出版社の重複防止を踏まえ、A05として種別内で前後空白・大小文字を正規化して一意にする | P004-V2は現在値の改名方法の説明のみ。一意範囲・正規化の条件を決めるパターン上の根拠はない | RQ-09。種別をまたぐ同名が禁止なら現制約は不足する。F57 |
| DM-11 現在状態・実行結果・補助属性 | 派生・技術上の追加 | 在庫・状態照会、NFR-SEC-08の競合対処のため現在値を保持し、再送を想定して要求キー・内容ハッシュ・結果を保存する | P008・P009・P010・P011。保存方式を新たな業務概念と数えない。要件07章に独立した相手はない | 要件欠陥の指摘ではない。追加表・履歴量等の影響はDS-03。本書の追加要素の逆引きを参照 |
| DM-12 納品予定日の粒度 | 設計仮定 | RULE-PERIOD-03・04・06について、A03としてUTC注文日付＋7日をdateで保持し、翌日から超過とする | P007は時点・粒度を検討する手掛かり。日付への切捨てをパターンが指定するわけではない | RQ-10。厳密な7日後の時刻という解釈には未対応。F47 |

## 3. 概念・関係の照合

### エンティティ（10件）

概念の対応を示す。実現列・表は次節の属性照合で確認する。現在状態は概念表に記載される派生責務で、現概念図には独立ノードがない。

| 要件ID | 要件の概念 | 設計の概念 | 判定・差異ID |
| --- | --- | --- | --- |
| ENT-CUSTOMER | CUSTOMER／顧客 | CUSTOMER／顧客 | 同一性と氏名は一致。メールの保持先はDM-07・F04 |
| ENT-ADDRESS | ADDRESS／配送先住所 | ADDRESS／配送先住所、注文時点の値を注文にも保存 | 一致＋値の複製。DM-08 |
| ENT-BOOK | BOOK／書籍 | BOOK／現在属性、BOOK_RECEIPT／取得事実、現在在庫 | 分割。書籍という業務同一性は維持する。DM-01・DM-09 |
| ENT-OFFER | OFFER／買取オファー | OFFER／申込、OFFER_EVENT／進行事実、現在状態 | 分割。新しい申込を増やすものではない。DM-03 |
| ENT-CART | CART／買い物かご | CART／買い物かご | 概念は一致。顧客任意性は図が未対応。DM-06 |
| ENT-CART-ITEM | CART_ITEM／かご明細 | CART_ITEM／購入・欲しい物の作業明細 | 一致。要件も種別で両者を分ける。P001で成立前のデータと分類 |
| ENT-ORDER | ORDER／注文 | SALES_ORDER／合意、ORDER_EVENT／進行事実、現在状態 | 名称変更＋分割。DM-02 |
| ENT-ORDER-ITEM | ORDER_ITEM／注文明細 | ORDER_ITEM／注文の一書籍分の合意 | 一致。P003・P004は既存の成立回と凍結の説明であり、新しい明細概念を要求しない |
| ENT-REFDATA | REFDATA／参照データ項目 | REFERENCE_ITEM／参照データ項目 | 名称変更。一意制約の解釈はDM-10 |
| ENT-STOCK-ADJUSTMENT | STOCK_ADJUSTMENT／棚卸調整 | STOCK_MOVEMENTのADJUSTED部分、概念表の在庫移動・棚卸調整 | 一般化。専用ノード・部分集合は図に未表現。DM-04 |

### 関係・多重度（13件）

要件図の行順にR01〜R13を付ける。「A 1 — B 0..n」は、各BのAが1、各AのBが0..nという関係を示す。
設計図で経路を分けた関係は中間概念を省略しない。

| ID | 要件図の関係 | 設計図の関係／対応経路 | 判定 | 根拠・パターン・残る差異 |
| --- | --- | --- | --- | --- |
| R01 | CUSTOMER 1 — ADDRESS 0..n：配送先を持つ | CUSTOMER 1 — ADDRESS 0..n：owns | 一致 | 本人の住所を扱う。ENT-ADDRESS、RULE-ACCESS-01。履歴関係の追加は不要 |
| R02 | CUSTOMER 1 — ORDER 0..n：注文する | CUSTOMER 1 — SALES_ORDER 0..n：places | 名称変更 | 顧客と注文の関係は維持。DM-02。進行イベントを顧客の新しい注文とは数えない |
| R03 | CUSTOMER 1 — OFFER 0..n：買取を申し込む | CUSTOMER 1 — OFFER 0..n：submits | 一致 | 申込者と申込の関係を維持。DM-03 |
| R04 | CUSTOMER 1 — CART 0..1：かごを持つ | CUSTOMER 1 — CART 0..1：owns | 図は一致、未ログイン要件には未対応 | 要件図も設計図も、かごに顧客1人を要求して見える。FR-CUS-07の未ログインかごとは整合しない。DDLは顧客0..1。RQ-03・DS-01、DM-06。パターンでこの矛盾を解消済みとは扱わない |
| R05 | CART 1 — CART_ITEM 0..n：明細を持つ | CART 1 — CART_ITEM 0..n：contains | 一致 | かごの作業明細。削除・種別移動は履歴を作らない |
| R06 | ORDER 1 — ORDER_ITEM 1..n：明細を持つ | SALES_ORDER 1 — ORDER_ITEM 1..n：agrees | 名称変更 | 最低1明細を維持。RULE-TRADE-06。APIの原子的確定はP009、FKだけでは最低1明細は保証しない |
| R07 | ORDER 0..n — ADDRESS 1：配送先 | ADDRESS 1 — SALES_ORDER 0..n：source_of_snapshot、注文に凍結住所値も保持 | 関係維持＋値の複製 | コピー元への関係は残す。住所の更新・無効化が注文時点の届け先を変えないようにする。DM-08、07章§3、P004 |
| R08 | BOOK 1 — CART_ITEM 0..n：入れられる | BOOK 1 — CART_ITEM 0..n：selected | 一致 | 現在書籍への参照を維持。在庫引当関係を追加しない。RULE-STOCK-01・RULE-STOCK-05 |
| R09 | BOOK 1 — ORDER_ITEM 0..n：売られる | BOOK 1 — ORDER_ITEM 0..n：sold | 一致 | 売れた合意を注文単位で識別。P003・P004。数量・金額の凍結は明細の属性で表す |
| R10 | OFFER 1 — BOOK 0..1：棚入れされる | OFFER 0..1 — BOOK_RECEIPT 0..1：source、BOOK 1 — BOOK_RECEIPT 1：acquired | 経路分割＋必須性の解釈差 | 要件図の各BOOKにOFFER必須という読みに対し、FR-ADM-07は手入力を許す。任意の供給元を取得事実に持たせる選択。RQ-04、DM-01・DM-05、P001・P004。支払済・二重棚入れ拒否はP009 |
| R11 | REFDATA 1 — BOOK 0..n：分類する | REFERENCE_ITEM 1 — BOOK 0..n：classifies | 名称変更、図の抽象度は維持 | 実際には4軸すべてが必須。両図とも4本を一つの分類関係へまとめる。複合FKは論理設計の具体化であり新概念ではない |
| R12 | REFDATA 1 — OFFER 0..n：分類する | REFERENCE_ITEM 1 — OFFER 0..n：classifies | 名称変更、図の抽象度は維持 | R11と同じ4軸。申込と棚入れ後書籍の分類のコピーを03章§4に基づいて定義 |
| R13 | BOOK 1 — STOCK_ADJUSTMENT 0..n：調整される | BOOK 1 — STOCK_MOVEMENT 1..n：changes のうちADJUSTED部分は0..n | 一般化＋最小多重度の比較対象が異なる | 全移動は登録・棚入れを最低1件持つが、棚卸調整は0件でもよい。全移動の1..nを棚卸調整の1..nと読んではならない。DS-02、DM-04、P001・P008 |

## 4. 属性の実現先（63件）

要件07章§2の「主要項目」を読点で区切った単位を一行にする。元の「住所行 1・2」「分類 4 軸」はそれぞれ一項目として照合し、実現列を列挙する。業務概念の構成と区別するため、この列レベルの表は補足として置く。
一致・分割という判定は保存・導出先の対応であり、APIの実装済みを表さない。派生属性は元事実からの導出規則を併せて読む。

| ID | 要件エンティティ | 要件の主要項目 | 設計での対応先 | 判定・設計根拠 |
| --- | --- | --- | --- | --- |
| F01 | ENT-CUSTOMER | 主体識別子 | `customer.subject` | 一致。外部認証の同一性を保持 |
| F02 | ENT-CUSTOMER | 姓 | `customer.family_name` | 一致。現在値、P004-V2 |
| F03 | ENT-CUSTOMER | 名 | `customer.given_name` | 一致。現在値、P004-V2 |
| F04 | ENT-CUSTOMER | メールアドレス | ローカル項目なし。外部認証基盤 | 未対応／解釈差。RQ-07、DM-07。適用パターンによる省略根拠はない |
| F05 | ENT-ADDRESS | 顧客 | `address.customer_subject` | 一致。本人所有の関係 |
| F06 | ENT-ADDRESS | 住所行 1・2 | `address.line1`・`address.line2` | 一致。二列への具体化 |
| F07 | ENT-ADDRESS | 市区町村 | `address.city` | 一致 |
| F08 | ENT-ADDRESS | 州 | `address.state_code` | 一致。米国50州＋DC |
| F09 | ENT-ADDRESS | 郵便番号 | `address.postal_code` | 一致。5桁／ZIP+4は設計仮定A10 |
| F10 | ENT-ADDRESS | 国 | `address.country_code` | 一致。米国固定 |
| F11 | ENT-ADDRESS | 有効フラグ | `address.active` | 一致。削除は無効化 |
| F12 | ENT-BOOK | 書名 | `book.title` | 一致。現在値 |
| F13 | ENT-BOOK | 著者 | `book.author` | 一致。現在値 |
| F14 | ENT-BOOK | ISBN | `book.isbn` | 一致。識別子・一意性への変更はしない |
| F15 | ENT-BOOK | 分類 4 軸 | `book.publisher_id`・`book.book_type_id`・`book.genre_id`・`book.condition_id` | 一致。4軸を個別参照へ具体化 |
| F16 | ENT-BOOK | 売価 | `book.current_price` | 一致。現在売価。税込表示はAPI側の契約 |
| F17 | ENT-BOOK | 仕入原価 | `book_receipt.purchase_cost` | 分割。登録時の取得事実、DM-01、P004 |
| F18 | ENT-BOOK | 在庫数 | `stock_balance.available`、正本は`stock_movement.quantity_delta`の合計 | 分割・導出。販売可能在庫と解釈。RQ-05、DM-01・DM-04、P008・P011 |
| F19 | ENT-BOOK | 概要 | `book.description` | 一致。現在値 |
| F20 | ENT-BOOK | 表紙画像 URL | `book.cover_url` | 一致。画像の原本・適正判定は外部責任 |
| F21 | ENT-BOOK | 非公開フラグ | `book.unlisted` | 一致 |
| F22 | ENT-BOOK | 供給元オファー | `book_receipt.source_offer_id` | 分割。手入力はNULL、DM-01・DM-05 |
| F23 | ENT-OFFER | 顧客 | `offer.customer_subject` | 一致 |
| F24 | ENT-OFFER | 書名 | `offer.title` | 一致。申込値として保存 |
| F25 | ENT-OFFER | 著者 | `offer.author` | 一致。申込値として保存 |
| F26 | ENT-OFFER | ISBN | `offer.isbn` | 一致。申込値として保存 |
| F27 | ENT-OFFER | 分類 4 軸 | `offer.publisher_id`・`offer.book_type_id`・`offer.genre_id`・`offer.condition_id` | 一致。4軸を個別参照へ具体化 |
| F28 | ENT-OFFER | 概要 | `offer.description` | 一致。棚入れ後の概要とは別 |
| F29 | ENT-OFFER | 希望買取価格 | `offer.offered_price` | 一致。07章§3の申込時凍結。RQ-13は表現整備。DM-03 |
| F30 | ENT-OFFER | 状態 | `offer_state.status`、正本は`offer_event.kind`の連鎖 | 分割・導出。DM-03、P002・P008・P011 |
| F31 | ENT-OFFER | 却下理由 | `offer_event.reason`、REJECTED事実に限定 | 分割。理由は申込の一般属性でなく却下行為の内容、DM-03、P001 |
| F32 | ENT-OFFER | 申込日 | `offer.submitted_at`、SUBMITTEDの`offer_event.occurred_at`と一致 | 一致。二つの保持箇所を照合する。DM-03、P007 |
| F33 | ENT-OFFER | 支払日 | PAIDの`offer_event.occurred_at` | 分割。実際の支払時刻、DM-03、P007 |
| F34 | ENT-OFFER | 棚入れ済フラグ | `offer_state.stocked`、正本はSTOCKED事実 | 分割・導出。PAIDとは別、DM-03、P008・P011 |
| F35 | ENT-CART | かご識別子 | `cart.cart_id` | 一致。UUIDは論理設計上の選択 |
| F36 | ENT-CART | 顧客（ログイン後に紐づく） | `cart.customer_subject`、NULL可 | 保存先は一致、概念図の任意性は未対応。RQ-03・DS-01、DM-06。統合結果はRQ-08 |
| F37 | ENT-CART | 最終更新日時 | `cart.updated_at` | 一致。通常更新 |
| F38 | ENT-CART-ITEM | かご | `cart_item.cart_id` | 一致 |
| F39 | ENT-CART-ITEM | 書籍 | `cart_item.book_id` | 一致 |
| F40 | ENT-CART-ITEM | 数量 | `cart_item.quantity` | 一致。正の整数 |
| F41 | ENT-CART-ITEM | 種別（購入／欲しい物） | `cart_item.kind` | 一致。PURCHASE／WISH。全件移動の失敗単位はRQ-11 |
| F42 | ENT-ORDER | 注文番号 | `sales_order.order_number` | 名称変更のみ。内部IDと別に一意な番号を持つ |
| F43 | ENT-ORDER | 顧客 | `sales_order.customer_subject` | 名称変更のみ |
| F44 | ENT-ORDER | 配送先 | `sales_order.source_address_id`と凍結住所`ship_line1`・`ship_line2`・`ship_city`・`ship_state_code`・`ship_postal_code`・`ship_country_code` | 分割・値の複製。DM-08、07章§3、P004 |
| F45 | ENT-ORDER | 状態 | `order_state.status`、正本は`order_event.kind`の連鎖 | 分割・導出。DM-02、P002・P008・P011 |
| F46 | ENT-ORDER | 注文日 | `sales_order.ordered_at`、PLACEDの`order_event.occurred_at`と一致 | 一致。二つの保持箇所を照合。P007 |
| F47 | ENT-ORDER | 納品予定日 | `sales_order.delivery_due_date` | 一致＋日付精度の解釈差。RQ-10、DM-12 |
| F48 | ENT-ORDER | 小計 | `sales_order.subtotal`、注文明細の凍結売価×数量の合計と照合 | 一致。確定時の合意額を保存 |
| F49 | ENT-ORDER | 税 | `sales_order.tax` | 一致。丸め方はRQ-02と設計仮定A01・A02 |
| F50 | ENT-ORDER | 合計 | `sales_order.total` | 一致。凍結した小計＋税 |
| F51 | ENT-ORDER-ITEM | 注文 | `order_item.order_id` | 一致。成立回を注文で識別、P003 |
| F52 | ENT-ORDER-ITEM | 書籍 | `order_item.book_id` | 一致。P003 |
| F53 | ENT-ORDER-ITEM | 数量 | `order_item.quantity` | 一致。注文確定後は凍結 |
| F54 | ENT-ORDER-ITEM | 凍結売価 | `order_item.frozen_price` | 一致。P004 |
| F55 | ENT-ORDER-ITEM | 凍結仕入原価 | `order_item.frozen_cost` | 一致。P004 |
| F56 | ENT-REFDATA | 種別（出版社／書籍種別／ジャンル／コンディション） | `reference_item.kind` | 名称変更のみ。4種を同じ概念で扱う |
| F57 | ENT-REFDATA | 名称 | `reference_item.name` | 一致＋一意範囲の解釈差。RQ-09、DM-10 |
| F58 | ENT-STOCK-ADJUSTMENT | 書籍 | ADJUSTEDの`stock_movement.book_id` | 一般化。以下6項目はADJUSTED部分で対応。DM-04 |
| F59 | ENT-STOCK-ADJUSTMENT | 調整前在庫数 | ADJUSTEDの`stock_movement.quantity_before` | 一般化。移動全体の前数量と共通化 |
| F60 | ENT-STOCK-ADJUSTMENT | 調整後在庫数 | ADJUSTEDの`stock_movement.quantity_after` | 一般化。移動全体の後数量と共通化 |
| F61 | ENT-STOCK-ADJUSTMENT | 理由 | ADJUSTEDの`stock_movement.reason` | 一般化。ADJUSTEDでは非空必須 |
| F62 | ENT-STOCK-ADJUSTMENT | 実施者 | ADJUSTEDの`stock_movement.actor_subject` | 一般化。本人確認・スタッフ権限はAPI責任、P012 |
| F63 | ENT-STOCK-ADJUSTMENT | 実施日時 | ADJUSTEDの`stock_movement.occurred_at` | 一般化。記録時刻`stock_movement.recorded_at`と区別、P007 |

## 5. 追加要素の逆引きと対象範囲

| 設計で独立させた要素 | 要件側の対応元 | 設計根拠・適用パターン | 業務概念と保存方式の区別 |
| --- | --- | --- | --- |
| ORDER_EVENT、注文の進行事実 | ENT-ORDERの状態、FR-ADM-04、FR-CUS-11、05章§8.1 | DM-02、P001・P002・P005・P007 | 独立した注文ではなく、同じ注文について起きた各段階。図のSALES_ORDER→ORDER_EVENT関係は設計で追加 |
| OFFER_EVENT、買取の進行事実 | ENT-OFFERの状態・理由・支払日・棚入れ済、FR-ADM-13〜15 | DM-03、P001・P002・P007 | 同じ申込についての各段階。図のOFFER→OFFER_EVENT関係は設計で追加 |
| BOOK_RECEIPT、書籍の取得事実 | ENT-BOOKの原価・供給元、FR-ADM-07・15、RULE-TRADE-04・07 | DM-01・DM-05、P001・P004 | 書籍と別の在庫管理対象ではない。図のBOOK→BOOK_RECEIPTとOFFER→BOOK_RECEIPTは、取得と供給元を表す設計上の経路 |
| STOCK_MOVEMENTのREGISTERED・SHELVED・ORDERED・CANCELLED部分 | 書籍初期登録・棚入れ、RULE-STOCK-01・02 | DM-04、P001・P005・P008 | ENT-STOCK-ADJUSTMENTに追加した別種の在庫増減。ADJUSTEDと同じ業務行為とは扱わない |
| 現在在庫・注文状態・買取状態・棚入れ済 | ENT-BOOKの在庫数、ENT-ORDER・ENT-OFFERの状態等 | DM-11、P008・P011-V2 | 概念表にはあるが独立図ノードはない。`stock_balance`・`order_state`・`offer_state`は保存方式の選択 |
| 売上・粗利・買取支出・売れ筋 | FR-ADM-01、FR-CUS-01、RULE-SALES-01〜04、D-12 | P008・P011-V1 | 要件にある計算結果。新しい正本事実・取引ではなく、照会時の派生値 |
| コマンド実行結果 | 通信再送・応答喪失を想定する技術設計 | DM-11、P010 | `command_receipt`は技術記録。入金・支払・注文の別名ではなく、要件07章の追加業務エンティティとも扱わない |
| 連番・前連番・記録時刻・かごrevision・内容ハッシュ | 元事実の順序、現在値の再現、競合・再送への対処 | P007・P008・P009・P010・P011 | 論理設計の補助属性。元の主要項目を置き換えるものではない |

### 対象範囲

要件の重大性は要件レビュー、設計の選択と対応先は本書、機能・ルール・検証ケースの対応は[要件対応表](traceability.md)で管理する。
P006の汎用訂正モデルは実装していない。誤記を実際の取消・返金に見せかけず、必要な運用をRQ-12で確認する。訂正機能の追加は別の要件判断である。
パターンランゲージが全属性の不変化や全関係の履歴化を要求しているとは解釈しない。
要件の主要項目にない設計仮定と運用・検証の限界は、[設計の入口](README.md#設計仮定)と[検証範囲](validation/README.md#検証の限界)を併せて読む。
