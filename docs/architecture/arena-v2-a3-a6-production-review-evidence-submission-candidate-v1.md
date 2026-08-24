# Arena V2 A3–A6 生产评审证据提交候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：为未来集中验证提供逐资产、逐批次、逐Preparation身份的纯数据证据引用合同，让截图、权利、预算、浏览器、设备/性能、真人和生命周期证据能够先被规范提交，再进入独立评估。
- 明确不做：不采集证据、不读证据字节、不写文件或账本、不执行测试/浏览器/设备/性能、不评价通过、不授予批准、不开放资产使用。

## 提交身份闭包

每次提交必须同时绑定：

1. 当前批准账本`contentHash`；
2. 当前工作队列`workQueueIdentityHash`；
3. 当前统一评审程序`reviewProgramIdentityHash`；
4. 唯一`batchId + preparationId + preparationIdentityHash`；
5. 当前账本中的`assetId + artifactPath + artifactSha256`；
6. 七个规范证据槽之一及其唯一Evidence Kind；
7. 证据locator、证据SHA-256、采集者、UTC毫秒时间、环境身份、样本数、观察结果和可选备注。

任何陈旧Program/Preparation、跨批次资产、未知资产、路径/SHA漂移、错误Evidence Kind、额外字段或已不处于`missing`的槽位都会失败关闭。

## 七类证据

| Evidence Slot | Evidence Kind |
|---|---|
| `art-direction-review` | `annotated-capture-set` |
| `production-rights-review` | `rights-review-record` |
| `approved-structure-budget` | `structure-budget-report` |
| `browser-integration-capture` | `browser-capture-set` |
| `device-visual-performance` | `device-performance-report` |
| `human-readability` | `human-review-report` |
| `lifecycle-release` | `lifecycle-release-report` |

Evidence Kind严格跟随Slot，不能用设备报告顶替真人可读性，也不能用来源权利记录顶替生产美术评审。

## 提交不等于批准

返回对象固定为：

- `submissionStatus=captured-reference-awaiting-independent-evaluation`；
- `acceptedForIndependentEvaluation=true`；
- `independentEvaluationCompleted=false`；
- `ledgerMutationApplied=false`；
- `ledgerSlotStatusAfterSubmission=missing`；
- `productionApprovalStatusAfterSubmission=missing-not-approved`；
- `grantsApproval / hardGate / formalReady / assetUsePermitted=false`。

采集者可记录`pass / fail / inconclusive`观察结果，但`pass`只是提交内容，不能成为独立评估或生产批准。证据Identity由规范化提交数据确定性生成；当前合同只传递引用，不确认locator存在，也不读取或验证证据文件内容。

## 后续边界

未来如果实现独立评估，必须是单独Owner：读取已固定字节、复核SHA、验证Evidence Kind内部结构、确认reviewer与采集者职责、输出accept/reject及原因。再后续的生产批准仍需聚合七槽、来源、预算和资产身份，并生成新版本账本；不得让本提交函数直接升级V1缺失账本。

## 回滚点

删除提交合同源码、公开导出、延期测试、治理登记和本文即可；统一评审程序、九批准备包、当前缺失账本和运行时不受影响。
