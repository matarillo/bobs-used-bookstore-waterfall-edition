---
document: 基本設計 UI モックアップ集
status: proposed
---

# UI モックアップ集とスタイルガイド

全 26 版面の UI モックアップと、色・書体・部品を定めるスタイルガイドである。
UI モックアップは、要件定義の[画面イメージ](../../requirements/screen-images/README.md)（主要 10 画面のラフ）を受けて、全版面を配置・色・書体まで描き起こしたものである。
版面は [06 画面](../../requirements/06-screens.md) の画面一覧と一対一に対応する。`SCR-A-BOOK-EDIT` だけが 2 版面（登録／更新と、棚入れ）を持つ。

書式は **HTML** である。**ブラウザで [index.html](index.html) を開いて見る。**
GitHub 上では HTML が描画されないため、各版面の既定の状態を同じ名前の PNG で添える。
書体は Google Fonts から読み込む。ネットにつながっていないと、代わりの書体で表示される。

## 1. ファイル

```
ui-mockups/
  README.md                 本書
  index.html                全版面と状態の一覧。ここから開く
  style-guide.html          色・書体・スリップと表紙・状態の印・操作と入力・知らせ
  bob.css                   全版面が共有する色・書体・部品
  customer/                 店頭の版面
    SCR-<画面>.html           既定の状態
    SCR-<画面>.png            既定の状態の画像
    SCR-<画面>--<状態>.html   状態による差分
  admin/                    管理の版面。命名は customer/ と同じ
  source/                   Design キャンバスの原本の写し（§4）
```

画面どうしのリンクはつながっている。ボタンは動かない。
ボタンを押したあとの見え方（確認ダイアログ、通知、エラー）は「状態による差分」に描いてある。

## 2. 版面一覧

### 2.1 店頭（顧客向け）

| 画面 | 名称 | 既定の状態（画像） | 状態による差分 |
| --- | --- | --- | --- |
| `SCR-HOME` | [トップ](customer/SCR-HOME.html) | [既定](customer/SCR-HOME.png) | — |
| `SCR-SEARCH` | [書籍を探す](customer/SCR-SEARCH.html) | [検索結果あり](customer/SCR-SEARCH.png) | [検索結果なし](customer/SCR-SEARCH--no-results.html) |
| `SCR-BOOK` | [書籍の詳細](customer/SCR-BOOK.html) | [残り 2 冊](customer/SCR-BOOK.png) | [在庫あり](customer/SCR-BOOK--in-stock.html)、[在庫切れ](customer/SCR-BOOK--out-of-stock.html) |
| `SCR-CART` | [買い物かご](customer/SCR-CART.html) | [ログイン済・在庫切れの明細あり](customer/SCR-CART.png) | [未ログイン](customer/SCR-CART--signed-out.html)、[空](customer/SCR-CART--empty.html)、[取り除く確認](customer/SCR-CART--remove-dialog.html) |
| `SCR-WISH` | [欲しい物リスト](customer/SCR-WISH.html) | [在庫切れの本を含む](customer/SCR-WISH.png) | [かごへ移したあと](customer/SCR-WISH--moved.html)、[空](customer/SCR-WISH--empty.html) |
| `SCR-CHECKOUT` | [配送先の選択と注文確定](customer/SCR-CHECKOUT.html) | [住所 2 件・在庫切れの明細あり](customer/SCR-CHECKOUT.png) | [住所なし](customer/SCR-CHECKOUT--no-address.html)、[注文できなかった](customer/SCR-CHECKOUT--failed.html) |
| `SCR-CHECKOUT-DONE` | [注文完了](customer/SCR-CHECKOUT-DONE.html) | [在庫切れの本を除いて注文](customer/SCR-CHECKOUT-DONE.png) | [除いた本なし](customer/SCR-CHECKOUT-DONE--no-exclusion.html) |
| `SCR-ADDRESSES` | [自分の住所](customer/SCR-ADDRESSES.html) | [住所 3 件](customer/SCR-ADDRESSES.png) | [空](customer/SCR-ADDRESSES--empty.html)、[削除の確認](customer/SCR-ADDRESSES--delete-dialog.html) |
| `SCR-ADDRESS-EDIT` | [住所の登録／更新](customer/SCR-ADDRESS-EDIT.html) | [更新](customer/SCR-ADDRESS-EDIT.png) | [登録](customer/SCR-ADDRESS-EDIT--new.html)、[注文の確定から登録](customer/SCR-ADDRESS-EDIT--from-checkout.html)、[入力の不備](customer/SCR-ADDRESS-EDIT--errors.html) |
| `SCR-ORDERS` | [自分の注文](customer/SCR-ORDERS.html) | [全状態の注文](customer/SCR-ORDERS.png) | [空](customer/SCR-ORDERS--empty.html)、[取消の確認](customer/SCR-ORDERS--cancel-dialog.html)、[取り消したあと](customer/SCR-ORDERS--cancelled.html) |
| `SCR-ORDER` | [注文の詳細](customer/SCR-ORDER.html) | [受付済](customer/SCR-ORDER.png) | [受付待ち](customer/SCR-ORDER--pending.html)、[出荷済](customer/SCR-ORDER--shipped.html)、[配達済](customer/SCR-ORDER--delivered.html)、[取消済](customer/SCR-ORDER--cancelled.html)、[取消の確認](customer/SCR-ORDER--cancel-dialog.html) |
| `SCR-RESALE` | [自分の買取申込](customer/SCR-RESALE.html) | [全状態の申込](customer/SCR-RESALE.png) | [空](customer/SCR-RESALE--empty.html)、[取下げの確認](customer/SCR-RESALE--withdraw-dialog.html) |
| `SCR-RESALE-NEW` | [買取を申し込む](customer/SCR-RESALE-NEW.html) | [入力済](customer/SCR-RESALE-NEW.png) | [入力の不備](customer/SCR-RESALE-NEW--errors.html) |
| `SCR-PRIVACY` | [プライバシー](customer/SCR-PRIVACY.html) | [既定](customer/SCR-PRIVACY.png) | — |
| `SCR-ERROR` | [エラー](customer/SCR-ERROR.html) | [既定](customer/SCR-ERROR.png) | — |

### 2.2 管理（スタッフ向け）

| 画面 | 名称 | 既定の状態（画像） | 状態による差分 |
| --- | --- | --- | --- |
| `SCR-A-DASH` | [ダッシュボード](admin/SCR-A-DASH.html) | [既定](admin/SCR-A-DASH.png) | [売上を取得できなかった](admin/SCR-A-DASH--stats-failed.html) |
| `SCR-A-ORDERS` | [注文一覧](admin/SCR-A-ORDERS.html) | [絞り込みなし](admin/SCR-A-ORDERS.png) | [受付待ちで絞り込み](admin/SCR-A-ORDERS--pending.html)、[納期超過で絞り込み](admin/SCR-A-ORDERS--past-due.html) |
| `SCR-A-ORDER` | [注文の詳細](admin/SCR-A-ORDER.html) | [受付済・納期超過](admin/SCR-A-ORDER.png) | [受付待ち](admin/SCR-A-ORDER--pending.html)、[出荷済](admin/SCR-A-ORDER--shipped.html)、[配達済](admin/SCR-A-ORDER--delivered.html)、[取消済](admin/SCR-A-ORDER--cancelled.html)、[ほかのスタッフが先に処理](admin/SCR-A-ORDER--conflict.html)、[出荷したあと](admin/SCR-A-ORDER--shipped-done.html) |
| `SCR-A-OFFERS` | [買取オファー一覧](admin/SCR-A-OFFERS.html) | [全状態の申込](admin/SCR-A-OFFERS.png) | [承認したあと](admin/SCR-A-OFFERS--approved.html)、[却下の確認](admin/SCR-A-OFFERS--reject-dialog.html)、[却下の理由が未入力](admin/SCR-A-OFFERS--reject-reason-missing.html) |
| `SCR-A-BOOKS` | [在庫一覧](admin/SCR-A-BOOKS.html) | [絞り込みなし](admin/SCR-A-BOOKS.png) | [在庫僅少で絞り込み](admin/SCR-A-BOOKS--low-stock.html)、[在庫切れで絞り込み](admin/SCR-A-BOOKS--out-of-stock.html) |
| `SCR-A-BOOK` | [書籍の詳細](admin/SCR-A-BOOK.html) | [公開中](admin/SCR-A-BOOK.png) | [非公開](admin/SCR-A-BOOK--hidden.html)、[表紙画像なし](admin/SCR-A-BOOK--no-cover.html) |
| `SCR-A-BOOK-EDIT` | [書籍の登録／更新](admin/SCR-A-BOOK-EDIT.html) | [更新](admin/SCR-A-BOOK-EDIT.png) | [登録](admin/SCR-A-BOOK-EDIT--new.html)、[表紙画像が不適正](admin/SCR-A-BOOK-EDIT--image-rejected.html) |
| `SCR-A-BOOK-EDIT`（版面 2） | [棚入れ](admin/SCR-A-BOOK-EDIT-shelving.html) | [入力済](admin/SCR-A-BOOK-EDIT-shelving.png) | [売価が未入力](admin/SCR-A-BOOK-EDIT-shelving--price-missing.html) |
| `SCR-A-REFDATA` | [参照データ一覧](admin/SCR-A-REFDATA.html) | [出版社](admin/SCR-A-REFDATA.png) | [書籍種別](admin/SCR-A-REFDATA--type.html)、[ジャンル](admin/SCR-A-REFDATA--genre.html)、[コンディション](admin/SCR-A-REFDATA--condition.html) |
| `SCR-A-REFDATA-EDIT` | [参照データの登録／改名](admin/SCR-A-REFDATA-EDIT.html) | [改名](admin/SCR-A-REFDATA-EDIT.png) | [登録](admin/SCR-A-REFDATA-EDIT--new.html)、[名称の重複](admin/SCR-A-REFDATA-EDIT--duplicate.html) |
| `SCR-A-ERROR` | [エラー（管理）](admin/SCR-A-ERROR.html) | [既定](admin/SCR-A-ERROR.png) | — |

## 3. 描き方の約束

| 事項 | 約束 |
| --- | --- |
| 文言 | [用語定義](../../glossary.md) の日本語を用いる。画面の文言はすべて日本語で、サイト名 Bob's Used Books だけを英語で書く |
| 金額 | 円で示す。顧客向けは税込、管理向けは税抜で、注文は小計・税・合計の 3 段で示す |
| 日付 | 年/月/日で示す。時刻は出さない |
| 住所 | 郵便番号・都道府県・市区町村・番地・建物名の順に書く |
| `[ ]` で囲んだ語 | 店が決める値の仮置き（店の住所、営業時間、プライバシーの方針、エラー番号など） |
| 見本のデータ | 書名・人名・番号・金額は見本である。画面どうしで値を合わせてある（例: 注文 10433 は合計 2,310 円、納品予定日 2026/11/11） |
| 表紙 | 写真の代わりの仮の表紙である。書名を縦書きにし、右綴じの本として背を右に置く。表紙画像がない書籍は店の既定の表紙で示す |

## 4. 原本

原本は Design キャンバス
[Bob's Used Books — UI Mockups & Style Guide](https://claude.ai/artifact/2mDkuezK9c6oQJVk2c2NgQ) にある。
閲覧には持ち主からの共有が要る。キャンバスでは、ボタンの操作と状態の切り替えを試せる。

`source/` はその原本の写しである。`.dc.html` はキャンバスの実行環境で描画するもので、ブラウザで直接開いても表示されない。
`customer/`・`admin/`・`style-guide.html`・`index.html`・`bob.css` は、原本から書き出したものである。
