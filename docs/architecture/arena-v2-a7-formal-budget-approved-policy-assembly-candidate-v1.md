# Arena V2 A7 已批准正式资产预算 Policy 装配候选 V1

## 状态

- 日期：2026-08-15
- production reachability：`production-unreachable`
- implementation：`code-written-not-run`
- validation：`not-run`
- assembly：`approved-policy-candidate-assembled-not-activated`
- 外层阶段门：`hardGate=false / hardGateUsable=false`
- 当前预算V2仍为：`proposed-not-approved / structuralLimits=unresolved-not-approved`

本候选只在收到完整Independent Approval Decision后，构造一个新的不可变预算候选。它不覆盖当前V2文件或身份，不写文件，不接默认Bundle、Preloader、Entry，也不直接改变A7/P7状态。

## 第五角色

Policy Assembler必须不同于此前四个角色：Collector、Evidence Reviewer、Limit Proposer和Independent Approver。装配时间必须是仓库Evidence合同验证的规范UTC instant且不得早于独立批准时间。这样Source、Process、Deliver、Manage及最终不可变装配不会由同一主体自证闭环，也不会把不存在的日历时间写入Policy交付身份。

## 新Policy候选内容

新候选ID为`arena.stage7.formal-asset-budget.v3-independent-approved-candidate`，内容身份覆盖：

- 当前V2基座Policy和当前130项Catalog identity；
- clean source、lock和toolchain identity；
- Structural Evidence Evaluation、Limit Proposal、Independent Approval identities；
- 130项资产路径、类型、编码容器格式、纹理解码格式、SHA、当前编码字节、当前纹理宽高/解码字节、已接受音频解码字节观察、全部结构maximum和余量理由；Source事实与Process观察必须经Proposal/Decision原样保留，Assembler无权改写；
- P7六环境build identity、峰值maximum、Context恢复/清理要求和余量理由；
- 独立批准的四类复核结果与零余量处置摘要。

Policy证据身份区还显式保存Structural Evidence Submission identity、Observation Batch ID和Captured At UTC。它们与Evaluation、报告、Proposal、Decision及Assembly身份并列保留，不替代任何一层记录，也不能由Assembler重新命名。

Policy的`governanceProvenance`保存Collector、Reviewer、Proposer、Approver四角色和Captured、Reviewed、Proposed、Decided四个时间点。装配前必须确认角色互异且时间单调；Assembler与Assembled At仍只存在于外层Assembly，不混入Policy治理来源。

`approvalSummary`同时保存六环境实测生命周期全通过事实，以及四类独立复核、零余量处置数量和全部接受状态。处置数量必须来源于Decision中的完整处置清单，不能由Assembler重新计算成另一个结果。

Assembler与Assembled At继续只保存在外层Assembly封套；它们不进入`governanceProvenance`。外层记录必须晚于批准，并与六环境原始证据及报告、评估、提案、批准记录的Locator/SHA全部分域。

`policyContentHash`只由上述不可变Policy数据派生；装配记录另有独立`approvedPolicyAssemblyIdentity`，避免把Policy内容身份和交付记录身份混为一体。

每项资产和环境还会保存完整`acceptedObservation`，不允许Policy只剩maximum而失去证据下限。资产当前字节/纹理/音频投影必须与该观察一致；六环境build、峰值、上传耗时、Context恢复和清理结果同时进入Policy内容身份。

环境`acceptedObservation`还必须保留原始Evidence Locator和SHA。Assembler按P7六环境规范顺序，将每项环境ID、Locator、SHA与`structuralEnvironmentEvidenceRecords`逐项核对；数量、顺序或任一身份不一致都会失败关闭，避免观察数值和证据记录来自不同采集结果。

装配记录的Locator/SHA必须与六环境原始证据、结构报告、独立评估、上限提案和批准记录全部不同；任一跨域复用都失败关闭。新Policy同时保留六环境来源清单、前三层证据记录和独立批准记录身份，但不会把外部装配证明错误混入Policy内容hash。

Assembler与Policy Revision最多256字符，装配Locator最多2048字符，备注最多4096字符；身份和Locator拒绝首尾空白与控制字符，防止第五角色以空白变体伪装为新主体或把无界文本写入Policy交付身份。

## 门语义

内层新Policy候选可声明`hardGateUsableForA7V3BudgetCheck=true`，仅表示它具备被未来A7 V3预算证据复核的结构资格。外层装配仍固定：

- `productionConsumptionAllowed=false`；
- `assemblyDoesNotReplaceCurrentV2Policy=true`；
- `currentV2PolicyMutationApplied=false`；
- `hardGate=false / hardGateUsable=false`。

因此测试夹具中的future approved链不能直接打开当前生产门。

## 延后验证与后续

定向测试规格、P7 runner、治理边界和可达性检查已登记但未运行。A7 V3预算证据绑定已写，并逐项复核新Policy保留当前24项GLB、98项OGG、8项PNG格式身份以及六环境Accepted Observation的原始证据身份；默认消费、真实测量、设备、性能和最终冻结继续顺延。
