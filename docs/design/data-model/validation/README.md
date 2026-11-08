---
document: データモデル検証
status: proposed
---

# データモデル検証

DDLと操作契約のDB上での成立性を検証する。Node標準機能と `psql` のみを使い、アプリケーションコードは含まない。
要件のベースライン検証を先に行い、試験ごとに専用DBのスキーマへDDL・ビュー・合成データを適用する。

## 実行手順

リポジトリのルートでPowerShell 7、Node、PostgreSQL 18のバイナリを使う。

```powershell
./docs/design/data-model/validation/Manage-Postgres.ps1 -Action Start
node docs/design/data-model/validation/run.mjs
node docs/design/data-model/validation/build-docs.mjs --check
node docs/design/data-model/validation/check-docs.mjs
./docs/design/data-model/validation/Manage-Postgres.ps1 -Action Stop
```

`Manage-Postgres.ps1 -PgBin <bin>` でインストール先を指定できる。既定ポートは55468。
変更する場合は管理スクリプトの `-Port` と、Node実行時の `BOBS_MODEL_PORT` を揃える。`PSQL` でpsqlの絶対パスも指定できる。
接続先ホスト・ユーザー・DB名は試験用に固定し、実データを含むクラスタでは実行しない。ランナーは `SHOW data_directory` の実パスを照合する。
`.local/` はGit対象外。ローカルtrust認証はこの使い捨て検証に限る。本番の資格情報を保存しない。

DDLを変更して文書を再生成する場合は、DB検証を実行した後に以下を使う。

```powershell
node docs/design/data-model/validation/build-docs.mjs
node docs/design/data-model/validation/build-docs.mjs --check
node docs/design/data-model/validation/check-docs.mjs
```

一般の空DBへDDLだけを適用するときは、実行環境から認証を提供して `schema.sql`、`views.sql` の順に `psql -X -v ON_ERROR_STOP=1 -f <file>` を実行する。
`schema.sql` は既存スキーマを削除しない。`queries.sql` はセッション内のPREPAREであり、同一セッションでEXECUTEする。
`cleanup.sql` は `psql -X -v ON_ERROR_STOP=1 -v as_of=2026-11-08T00:00:00Z -f <file>` のように基準時刻を渡す。

## 検証項目と結果

[results.json](results.json)に各ケースの説明と成否、実行したSQL・検証コードのハッシュを保持する。
T01〜T31はDB制約・通常フロー・凍結値・取消・在庫調整・月境界・所有者条件・競合・再構築・かご・十進精度の検証である。
正確な対応は[要件対応表](../traceability.md)を参照する。
並行試験は別のpsqlプロセスを使い、一方の処理がロックを保持した後、`pg_stat_activity` に他方のロック待ちが現れたことを確認して解除する。
固定時間のsleepだけで実行順を推測しない。接続切断・SQLエラー時は未確定取引をロールバックする。

`schema-catalog.json` は実DBから取得した全列・制約・索引。`build-docs.mjs --check` は実カタログと保存済みカタログ、生成ER図・データ辞書の一致を検査する。
`check-docs.mjs` は文書リンク・要件ID・検証ID・パターンID・成果物の状態を検査する。要件内容の不変性は `check-baseline.mjs` で検査する。

ER図の構文検証結果は [概念図](diagram-conceptual.json) と [論理図](diagram-logical.json) に保存する。
構文だけを別途検証する場合は、任意の開発用依存としてMermaid 12.3.0・jsdom 31.0.0をGit対象外の場所に用意する。
DB検証・カタログ照合・文書検査はこれらのnpmパッケージに依存しない。

```powershell
npm install --prefix .local/diagram-tools --no-save mermaid@12.3.0 jsdom@31.0.0
node docs/design/data-model/validation/check-diagrams.mjs
```

既に依存がある環境は `--tools-dir <directory>` で指定できる。この検査は図の描画レイアウトや業務意味を保証せず、意味上の対応はカタログ照合とモデルのレビューで確認する。

## 検証の限界

`contracts.mjs` は設計を実行可能にした試験補助であり、本番の入力検証・認可・署名・BigDecimal計算・Spring Bootトランザクションを実装するものではない。
金額計算はSQLのnumericで行い、保存結果の比較に一部JSON数値を用いる。将来のAPIでは十進表現を維持する必要がある。
所有者条件の試験はSQLと操作契約のもので、認証基盤・管理者グループ・RLS・HTTPの認可試験ではない。DBにRLSは設定しない。
書籍原価の変更拒否は試験補助の許可列検査を通して確認する。DB所有者の任意SQLによる凍結表の更新を拒否する保証はない。
画像・外部認証・画面表示・CSRF・TLS・50セッションの性能・バックアップ復旧・監視・ログ配信の試験は含まない。
同一キーで再送しても外部サービスの副作用が一度だけ起きることまでは保証しない。
