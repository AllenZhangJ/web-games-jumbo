# Arena V2 A3–A6 生产批准独立决策记录候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：在同一资产七槽accepted Evidence Set之后，形成独立生产批准人的批准/拒绝决策记录，供未来新不可变账本组装消费。
- 明确不做：不读取证据、不执行批准工作、不写当前账本、不授予当前资产使用，不生成新账本，不接正式Bundle、Preloader或Entry。

## 独立批准条件

- 输入必须重新规范化完整七槽Evidence Set并核对`evidenceSetIdentity`。
- `approverId`不得是该Evidence Set中任一collector或reviewer。
- 决策时间不能早于七项独立评估中的最晚时间。
- approved必须同时确认来源与权利闭合、当前预算身份闭合、模型/纹理等依赖闭合，并只使用`seven-slot-current-identity-independent-approval`原因。
- rejected只能使用规范来源/权利、预算、依赖或独立批准人拒绝原因；布尔失败事实必须由原因覆盖。
- 决策记录locator与SHA-256必须显式提供，但当前纯数据合同不读取其字节。

## Approved仍不修改当前账本

approved返回只表示：

- `eligibleForNewImmutableLedgerAssembly=true`；
- `decisionRecordDoesNotMutateCurrentLedger=true`；
- `ledgerMutationApplied=false`；
- `currentLedgerProductionApprovalStatus=missing-not-approved`；
- `currentLedgerAssetUsePermitted=false`；
- `grantsApprovalForCurrentLedger=false`；
- `grantsApproval / hardGate / formalReady / assetUsePermitted=false`。

这保持“决策记录”和“账本发布”分离。未来只有新版本不可变账本组装Owner能够读取approved Decision Record，并重新检查Catalog、预算、依赖、全部Identity和批准状态；当前V1缺失账本不得原位修改。

## 回滚点

删除决策记录源码、公开导出、延期测试、治理登记和本文即可；证据提交、独立评估、七槽聚合、统一评审程序、九批准备、当前账本和运行时不受影响。
