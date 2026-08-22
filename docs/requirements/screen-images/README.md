---
document: 要件定義書 画面イメージ
status: agreed
---

# 画面イメージ

**主要 10 画面のラフイメージ**である。何を作るのかの像を顧客と一致させるために置く。

書式は **HTML** である。版面は文章では表せず、描画して確かめるものであるため。
**ブラウザで開いて読み合わせる。GitHub 上では描画されない。**

## 1. ここで定めるもの／定めないもの

| ここで定める | ここで定めない |
| --- | --- |
| 画面に載る主要な項目と操作 | 項目の必須／任意、桁数、検証メッセージの文言 |
| 要素のおおまかな順序とグループ | 配置の確定、余白、色、書体 |
| 状態によって版面がどう変わるか | 部品の実現方式 |

**版面の確定は基本設計で行う。** ここにあるのは合意のための当たりであり、完成形ではない。

**項目の過不足は [04 機能要件](../04-functional-requirements.md) で直す。**
画面イメージ側で足さない。

## 2. ファイル

```
screen-images/
  README.md               本書
  wireframe.css           共通の描画規約。寸法・色・書体・余白はここにしか無い
  frame-customer.html     共通フレーム（店頭）
  frame-admin.html        共通フレーム（管理）
  customer/               店頭の主要画面
    SCR-SEARCH.html         書籍を探す
    SCR-BOOK.html           書籍の詳細
    SCR-CART.html           買い物かご
    SCR-CHECKOUT.html       配送先の選択と注文確定
    SCR-ORDERS.html         自分の注文
    SCR-RESALE-NEW.html     買取を申し込む
  admin/                  管理の主要画面
    SCR-A-DASH.html         ダッシュボード
    SCR-A-ORDER.html        注文の詳細
    SCR-A-OFFERS.html       買取オファー一覧
    SCR-A-BOOK-EDIT.html    書籍の登録／更新／棚入れ
```

**共通フレーム（ヘッダ・通知バナー・フッタ）は各画面では描かない。**
各画面は `body-area` の中身だけを描く。

**残る 15 画面は、これらに準じるものとして基本設計で起こす**（[06 §4](../06-screens.md)）。

## 3. 1 枚の構成

| 節 | 内容 |
| --- | --- |
| メタ表 | 経路、定める機能要件（`FR-`）、どちらのフレームか |
| 版面 | 画面に載るものの当たり |
| 状態による差分 | 状態が変わったとき版面のどこが変わるか |

**版面と差分以外を書かない。** 項目が何であるかは [04 機能要件](../04-functional-requirements.md) が定める。

## 4. 記法

寸法・色・書体・余白は [wireframe.css](wireframe.css) だけが持つ。
画面のファイルに `style` 属性や `<style>` を書かない。

| 意味 | 記法 |
| --- | --- |
| ボタン／主たるボタン | `<span class="btn">` ／ `<span class="btn primary">` |
| リンク | `<span class="link">` |
| 自由入力 | `<span class="field">`（短い欄は `field short`、複数行は `field multiline`） |
| 選択 | `<span class="select">` |
| 書き換えられない欄 | `field readonly` ／ `select disabled` |
| ファイルを選ぶ欄 | `<span class="file">` |
| 印（納期超過など） | `<span class="badge">` |
| ラジオ／チェック | `<span class="radio">` ／ `<span class="check">`（選択済は `on`） |
| 画像 | `<span class="img">` |
| 打ち消し | `<span class="oos">` |
| 警告・検証メッセージ | `<span class="warn">` |
| 補足 | `<span class="note">` |
| 0 件などの空の状態 | `<span class="empty">` |
| 条件付きで現れる要素 | `<span class="cond">ログイン済</span>` を頭に置く |
| 繰り返し | `<span class="repeat">` |

版組みは `region` / `row` / `stack` / `cards` / `split` / `form-group` / `kv` / `steps` / `pager` / `dialog` を用いる。
明細表は `<table>`、列の重みは `u1`〜`u8`（12 分割）、右寄せは `num`。
**列の重みは比であって寸法ではない。**

## 5. 版面を分ける基準

| 変わり方 | 描き方 |
| --- | --- |
| 構造は同じで、要素の有無や文言だけが変わる | **版面は 1 つ**。「状態による差分」に書く |
| 入力できる項目そのものが入れ替わる | **版面を分ける** |

判断の基準は「**利用者が別の作業をしていると感じるか**」である。
`SCR-A-BOOK-EDIT` の「登録／更新」と「棚入れ」だけがこれに当たる。

## 6. 文言

版面に書く語は [用語定義](../../glossary.md) の日本語を用いる。
**画面に出す英語表記は基本設計で確定させる**（[ISSUE-09](../12-open-issues-and-risks.md)）。
