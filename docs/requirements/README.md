---
document: 要件定義書
status: agreed
---

# 要件定義書

## 章立て

| 章 | 表題 | 何を確定させるか |
| --- | --- | --- |
| [01](01-background-and-goals.md) | 背景と目標 | なぜ作るのか。何をもって成功とするか |
| [02](02-scope.md) | スコープ | 引き受ける範囲と、引き受けない範囲。フェーズ分割 |
| [03](03-actors-and-business-flow.md) | 利用者と業務フロー | 誰が使い、業務がどう流れるか |
| [04](04-functional-requirements.md) | 機能要件 | 機能の一覧 `FR-`。見積の単位 |
| [05](05-business-rules.md) | 業務ルール | 店が決めた取り決め `RULE-` |
| [06](06-screens.md) | 画面 | 画面一覧 `SCR-`、画面遷移、画面共通方針、主要画面の姿 |
| [07](07-data-requirements.md) | データ要件 | 主要エンティティ `ENT-` と主要項目、件数の見当 |
| [08](08-external-interfaces.md) | 外部インタフェース | 外部システム `EXT-` との境界と契約 |
| [09](09-non-functional-requirements.md) | 非機能要件 | 品質水準 `NFR-` |
| [10](10-system-architecture.md) | システム方式 | 技術方式・システム構成 `CMP-` |
| [11](11-constraints-and-assumptions.md) | 前提と制約 | 見積の土台になる前提 |
| [12](12-open-issues-and-risks.md) | 課題とリスク | 基本設計への申し送り `ISSUE-` とリスク `RISK-` |
| [決定事項](decisions/README.md) | — | 要件定義中に確定した判断 `D-` と `ADR-` |
| [画面イメージ](screen-images/README.md) | — | 主要画面のラフイメージ |

## 識別子

| 接頭辞 | 意味 | 例 |
| --- | --- | --- |
| `FR-` | 機能要件 | `FR-CUS-02` |
| `RULE-` | 業務ルール | `RULE-ORDER-03` |
| `SCR-` | 画面 | `SCR-CART` |
| `ENT-` | 主要エンティティ | `ENT-BOOK` |
| `EXT-` | 外部システム | `EXT-AUTH` |
| `NFR-` | 非機能要件 | `NFR-SEC-01` |
| `CMP-` | システム構成要素 | `CMP-API` |
| `D-` | 要件定義中の決定事項 | `D-05` |
| `ADR-` | 重い決定の記録（採らなかった案を含む） | `ADR-0001` |
| `ISSUE-` | 基本設計への申し送り | `ISSUE-03` |
| `RISK-` | リスク | `RISK-01` |

## 記述の規律

1. **同じ事実を二か所に書かない。** 事実は一つの章に置き、他章からは識別子で参照する。
2. **決めていないことは「決めていない」と書く。** 沈黙で表さない（[12 章](12-open-issues-and-risks.md)）。
3. **経緯を書かない。** 現時点で正しい状態だけを書く。判断の理由は [決定事項](decisions/README.md) に置く。
4. **図は本文の表から機械的に導けるものだけを保存する。** 導けない図は読み合わせの場で使い捨てる。
