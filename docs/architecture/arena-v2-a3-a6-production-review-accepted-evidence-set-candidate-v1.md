# Arena V2 A3–A6 生产评审七槽接受证据集候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：把同一当前资产的七类独立接受Evaluation按规范顺序聚合为确定性Evidence Set，作为未来独立生产批准决策的完整输入。
- 明确不做：不采集、读取、验证或评审证据，不写文件或账本，不作生产批准决策，不授予资产使用、Formal Ready或Hard Gate。

## 七槽聚合规则

输入必须绑定当前Ledger/Queue/Program、唯一Batch/Preparation和一个当前Asset，并按以下规范顺序精确提供7个Evaluation：

1. `art-direction-review`；
2. `production-rights-review`；
3. `approved-structure-budget`；
4. `browser-integration-capture`；
5. `device-visual-performance`；
6. `human-readability`；
7. `lifecycle-release`。

每个Evaluation都会重新执行纯数据独立评估解析，要求：

- `evaluationIdentity`可重算且一致；
- decision为`accepted`；
- `acceptedEvidenceIdentity === evidenceIdentity`；
- Asset、Batch、Preparation全部相同；
- Slot与规范位置一致；
- Evidence Identity和Evaluation Identity各自唯一；
- 评估阶段没有写账本、批准或开放资产。

缺少、重复、调序、跨资产、跨批次、陈旧Preparation或被篡改Identity全部失败关闭。

## 完整集合仍不批准

成功聚合后固定输出：

- `acceptedEvidenceSlotCount=7`；
- `completeAcceptedEvidenceSet=true`；
- `eligibleForIndependentProductionApprovalDecision=true`；
- `productionApprovalDecisionStatus=pending-not-decided`；
- `completeEvidenceSetDoesNotGrantApproval=true`；
- `ledgerMutationApplied=false`；
- `ledgerSlotStatusAfterAggregation=missing`；
- `productionApprovalStatusAfterAggregation=missing-not-approved`；
- `grantsApproval / hardGate / formalReady / assetUsePermitted=false`。

这一步只证明数据引用集合完整，不能证明评审实际运行过，也不能在当前分支伪造130项中的任何一项真实集合。未来批准决策必须是单独Owner，并重新检查来源批准、资产/预算身份、七槽Evaluation与批准人职责；批准后还需生成新版本账本，不能修改V1缺失账本。

`evidenceSetIdentity`与七条`evaluationIdentity`沿用八位确定性数据身份；每条真实证据及验证记录的SHA字段仍为64位。聚合Owner按完整值复算和比较，不把短数据identity解释为媒体或证据字节SHA。

## 回滚点

删除七槽聚合源码、公开导出、延期测试、治理登记和本文即可；提交、独立评估、统一程序、九批准备、现行账本与运行时不受影响。
