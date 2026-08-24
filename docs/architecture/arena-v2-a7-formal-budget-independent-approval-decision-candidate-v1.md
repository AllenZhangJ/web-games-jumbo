# Arena V2 A7 正式资产预算独立批准决策候选 V1

## 状态

- 日期：2026-08-15
- production reachability：`production-unreachable`
- implementation：`code-written-not-run`
- validation：`not-run`
- `hardGate=false / hardGateUsable=false`
- 当前预算V2仍为：`proposed-not-approved / structuralLimits=unresolved-not-approved`

本候选记录“是否允许把结构上限提案交给新的不可变预算Policy装配”的独立决策。即使决策值为`approved`，它也不修改当前V2、不直接授予当前V2预算批准、不接默认Bundle/Preloader/Entry，更不发布资产或版本。

## 角色分离

决策重新构造完整Structural Limit Proposal并核对Proposal identity。Approver必须同时不同于：

- 结构证据Collector；
- 结构证据Reviewer；
- 结构上限Proposer。

决策时间必须是仓库Evidence合同验证的规范UTC instant且不得早于提案时间；字符串外形正确但日历无效的时间不能进入决策身份。决策记录身份继续覆盖Catalog、预算Policy、source、lock、toolchain、六环境build、130项资产上限、六环境上限和全部角色身份。

Decision继续原样保留Submission identity、Observation Batch ID与Captured At UTC，Approver无权以新的批次标识覆盖已接受观察。它们会随Decision identity进入后续Approved Policy证据身份区。

Decision还保留Reviewed At和Proposed At，并加入本层Decided At，形成`captured ≤ reviewed ≤ proposed ≤ decided`时间线。后续Policy装配必须同时保留Collector、Reviewer、Proposer、Approver四个互异角色及该时间线。

批准记录的Locator/SHA不得复用六环境原始证据、结构报告、Evidence Evaluation或Limit Proposal记录；批准身份会继续保留环境证据清单与三层上游记录，供后续装配重新核对证据域互斥。

Approver与零余量处置理由标识最多256字符，批准记录Locator最多2048字符，备注最多4096字符；角色/理由/Locator拒绝首尾空白和控制字符，避免以空白变体绕过角色互斥或污染证据身份。

## 批准闭包

`approved`必须同时满足：

- 130项资产余量充分性已独立复核；
- 六环境余量充分性已独立复核；
- 指标适用性与“maximum不低于Accepted observation”已复核；
- Context恢复与清理回基线要求已复核，且六环境Accepted Observation中的`contextRestoreCompleted`与`cleanupReturnedToBaseline`必须全部为true；失败实测不能被自报复核布尔掩盖；
- 所有零余量资产和环境均按规范顺序提供独立处置，且逐项明确接受；
- 原因只能是唯一规范批准原因。

零余量处置目录由Proposal内容派生：先按Catalog顺序列资产，再按P7预注册顺序列环境。缺项、多项、乱序、目标漂移或拒绝项都会阻止`approved`。

## 拒绝闭包

`rejected`必须使用规范原因覆盖每个失败事实：资产余量、环境余量、适用性/观察下限、生命周期或零余量处置。即使所有结构事实均为true，独立Approver仍可用明确的`independent-approver-rejected`作出保守拒绝。

## 输出边界

批准记录只设置`eligibleForNewImmutableApprovedBudgetPolicyAssembly=true`，表示下一切片可以装配一个新的不可变候选；它固定保持：

- `decisionRecordDoesNotMutateCurrentV2Policy=true`；
- `currentV2PolicyMutationApplied=false`；
- `grantsBudgetApprovalForCurrentV2Policy=false`；
- `grantsBudgetApproval=false`；
- `hardGate=false / hardGateUsable=false`。

## 延后验证与后续

定向测试规格、P7 runner、治理边界和可达性检查已登记但未运行。新的不可变Approved Budget Policy装配和A7 V3消费候选已经写入；真实证据、构建、设备、性能、Policy激活和最终冻结均顺延。
