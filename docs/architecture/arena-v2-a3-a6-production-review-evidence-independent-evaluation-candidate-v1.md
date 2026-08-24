# Arena V2 A3–A6 生产评审证据独立评估候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：在逐资产证据提交之后增加独立评估段，确认提交Identity、证据SHA、内容结构、环境身份与采集观察，并形成可确定性引用的接受/拒绝结果。
- 明确不做：不采集或读取证据字节，不执行验证命令，不写文件或批准账本，不把“评估接受”升级为生产批准、资产可用、Formal Ready或Hard Gate。

## 独立性与接受条件

- 评估者`reviewerId`必须与提交的`collectorId`不同。
- 评估时间使用毫秒精度UTC ISO字符串，且不能早于采集时间。
- 输入必须重新携带原始Submission Input与Evidence Identity；评估函数会重新规范化提交并重算Identity，拒绝被篡改或陈旧的引用。
- 接受必须同时满足：验证后的Evidence SHA与提交一致、字节SHA已核对、Evidence Kind内容结构已核对、环境身份已核对、采集观察为`pass`。
- 接受原因只能是`identity-content-environment-verified`。

## 拒绝原因

规范原因包括：

- `evidence-sha-mismatch`；
- `evidence-content-structure-invalid`；
- `environment-identity-mismatch`；
- `collector-observation-not-pass`；
- `insufficient-samples`；
- `independent-review-rejected`。

若SHA、结构、环境或采集观察存在失败，拒绝原因必须覆盖对应事实；未知原因失败关闭。评估可记录新的Verification Record locator/SHA与可选备注，但当前合同不确认该文件存在，也不读取其字节。

## 评估接受不等于批准

无论decision为`accepted`或`rejected`，返回对象都保持：

- `evaluationAcceptanceDoesNotGrantApproval=true`；
- `ledgerMutationApplied=false`；
- `ledgerSlotStatusAfterEvaluation=missing`；
- `productionApprovalStatusAfterEvaluation=missing-not-approved`；
- `grantsApproval / hardGate / formalReady / assetUsePermitted=false`。

接受结果只提供`acceptedEvidenceIdentity`与独立`evaluationIdentity`，供后续七槽聚合Owner读取；它不能直接更新现行V1缺失账本。

## 回滚点

删除独立评估源码、公开导出、延期测试、治理登记和本文即可；证据提交合同、统一评审程序、九批准备包、现行账本与运行时不受影响。
