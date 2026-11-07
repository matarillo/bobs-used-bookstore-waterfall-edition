# Bob's Used Bookstore

中古書籍を顧客から**買い取り**、顧客に**売る**オンライン書店。
本リポジトリは、そのシステムの **要件定義書とデータモデル設計案** を収める。

アプリケーションの実装コードは含まない。**文書と、その設計を検証する資材のリポジトリ**である。

---

## これは何か

Bob's Used Books は実店舗を長く営んできた中古書店である。
店頭では「持ち込まれた本を検分して買い取り、棚に載せて売る」循環がすでに回っている。
本プロダクトはこの循環を、**店の棚まで来られない人**へ広げる。

```
顧客 ──買取オファー──> 店 ──棚入れ──> 在庫 ──注文──> 顧客
        （代金を支払う）              （売価をつける）
```

**安く買って高く売る。** したがってシステムが表現しなければならない最重要の事実は、
「**この 1 冊にいくら払い、いくらで売ったか**」である。

詳しくは [docs/requirements/01-background-and-goals.md](docs/requirements/01-background-and-goals.md)。

## 開発の位置づけ

**要件定義工程が完了した時点**の成果物である。

顧客（店主）とベンダの間で、**何を作るか（スコープ）** と
**いくらで・いつまでに作るか（金額・納期）** を確定させるために必要十分な情報だけを持つ。

| 確定していること | まだ確定していないこと |
| --- | --- |
| 機能の一覧（32 機能）と各機能の目的・主要な入出力 | 画面項目の必須／任意、桁数、メッセージの文言 |
| 画面の一覧（25 画面）・遷移・主要 10 画面のラフイメージ | 全画面の版面、部品の配置、色・書体 |
| 主要エンティティと主要項目、3 年後のデータ量 | テーブル定義、列型、索引 |
| 技術方式（React / Spring Boot ＋ MyBatis / PostgreSQL） | クラス構成、パッケージ構成、内部インタフェース |
| 業務ルールのうち店が決めるもの（税率・納期・しきい値） | それをどの層で守るか |
| 規模・体制・7 か月のスケジュール・25 人月の工数 | 人月単価（契約条件として別途定める） |

**データモデルの基本設計案**は [docs/design/data-model/](docs/design/data-model/README.md) にある。
概念・論理・物理モデル、PostgreSQLのDDL、トランザクション契約、DB検証を含む。
設計案の状態は `proposed` であり、合意済み要件と区別する。他の基本設計成果物は別途作成する。

## 文書の入口

| 目的 | 読むもの |
| --- | --- |
| **全体を知る** | [docs/README.md](docs/README.md) — 文書地図 |
| **データモデルを確認する** | [データモデル設計](docs/design/data-model/README.md) — 概念・論理・物理モデルとDDL・検証 |
| 用語を引く | [docs/glossary.md](docs/glossary.md) |
| 何を作るのか確かめる | [02 スコープ](docs/requirements/02-scope.md) → [04 機能要件](docs/requirements/04-functional-requirements.md) → [06 画面](docs/requirements/06-screens.md) |
| 業務を確認する | [03 業務フロー](docs/requirements/03-actors-and-business-flow.md) → [05 業務ルール](docs/requirements/05-business-rules.md) |
| どう作るのか確かめる | [10 システム方式](docs/requirements/10-system-architecture.md) |
| 見積の根拠を確かめる | [規模・体制・スケジュール](docs/estimate/scope-and-schedule.md) |
| なぜそう決めたのか知る | [決定事項](docs/requirements/decisions/README.md) |
| 残っている課題を知る | [12 課題とリスク](docs/requirements/12-open-issues-and-risks.md) |

## 画面イメージの見かた

[docs/requirements/screen-images/](docs/requirements/screen-images/) の `.html` を
**ブラウザで直接開く**（VS Code のプレビュー拡張でもよい）。

**GitHub 上では `.html` は描画されず、ソースが表示される。**
版面を確かめる場はリポジトリの閲覧画面ではなく、ブラウザである。

## 文書を書き換えるとき

1. **`agreed` の記述は、スコープ・金額・納期への影響を評価してから変える**
   （[docs/README.md §4](docs/README.md)）。再見積の引き金は
   [規模・体制・スケジュール §5](docs/estimate/scope-and-schedule.md) にある。
2. **同じ事実を二か所に書かない。** 事実は一つの章に置き、他章からは識別子で参照する。
3. **経緯を書かない。** 現時点で正しい状態だけを書く。過去は git が持つ。
4. 判断の理由は文書本文ではなく
   [decisions/](docs/requirements/decisions/README.md) に置く。

AI エージェントへの作業規律は [AGENTS.md](AGENTS.md) にある。
