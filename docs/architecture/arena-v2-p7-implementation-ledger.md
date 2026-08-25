# Arena V2 P7 实施状态台账

## 1. 当前状态

- 日期：2026-08-25
- implementation：`code-written-not-run`
- gate：`incomplete`
- `hardGate=false`
- production reachability：`production-unreachable`
- 默认 Release Bundle / Web / 微信 / 抖音入口：未接入
- 2026-08-24 证据状态校正：当前 clean 基线`feature/arena-v2-design-docs@787ce27`已有`typecheck:app`与52包workspace build通过记录，P2候选测试记录为`351/421`且P3边界门通过；P7自动化/评价、严格性能、设备、真人、真实A7资产证据与发布动作仍全部`not-run`，上述通用构建记录不构成P7 gate或freeze资格。
- 2026-08-25 候选自动化证据：`arena:p7:candidate:test`完成52包/11波构建、21个Vitest文件/166项和2个Node文件/24项；`check:p7:candidate-boundaries`、`typecheck:app`、`check:documentation`与`git diff --check`均通过。该证据只证明production-unreachable候选代码、夹具与治理脚本的当前一致性；24项正式自动化、29项评价、真实A7 V3、设备、真人、性能及任何freeze资格仍为`not-run`。

本台账只记录 P7 版本化候选代码和延后验证入口已经写入；不把纯夹具中的未来 `PASS`、`advance` 或 freeze manifest 解释为真实执行证据。

## 2. 候选链与唯一职责

| 顺序 | 候选 | 职责 | 当前边界 |
|---:|---|---|---|
| 1 | `arena-v2-p7-preregistration-candidate-v1.ts` | 冻结六环境、六真人任务、两子组、七纵向节点、八评分维度、总分90/单维80及缺陷上限 | 不收集结果；`not-run` |
| 2 | `arena-v2-p7-evidence-evaluation-candidate-v1.ts` | 对已发生聚合证据做身份、分母、阈值、缺陷和审计判定；八维评分逐项显式区分`missing/available` | 缺失评分不伪造0分或SHA，只能得到`INCOMPLETE`；不执行设备/真人任务 |
| 3 | `arena-v2-p7-automation-execution-evidence-candidate-v1.ts` | 冻结24项 canonical suite 与回执 manifest 合同 | 不执行命令；当前无 PASS 实例 |
| 4 | `arena-v2-p7-automation-evidence-producer-candidate-v1.ts` | 仅通过注入 runner 串行执行；非零 fail-fast，后续回执写 `not-run` | 无默认 runner；settle 后释放 runner 引用 |
| 5 | `arena-v2-p7-stage-report-candidate-v1.ts` | 评价-only历史固定报告；自动化始终 `not-run` | 不能 advance |
| 6 | `arena-v2-p7-stage-report-candidate-v2.ts` | 合并已验证评价与24项自动化 manifest | FAIL 优先于 INCOMPLETE；rollback 优先 |
| 7 | `arena-v2-p7-automation-stage-report-session-candidate-v1.ts` | 单次异步 producer→V2报告装配 | 异常不发布半结果；settle 后释放冗余 owner |
| 8 | `arena-v2-p7-release-freeze-manifest-candidate-v1.ts` | 从全 PASS/advance 的 stored V2 报告与同源同构建集 A7 PASS 证据生成资格清单 | A7缺失、未通过或身份漂移均拒绝；不 publish/tag/upload/sign/merge，不写文件 |
| 9 | `arena-v2-p7-release-freeze-assembly-session-candidate-v1.ts` | 唯一拥有producer→V2报告会话与已验证 A7 证据，并在双门闭合时原子生成freeze manifest | 功能报告可独立完成；功能或A7任一未通过都只发布不可冻结结果，runner异常无半结果 |

依赖方向固定为 preregistration→evaluation→report，automation contract→producer，evaluation+automation→V2 report→freeze manifest→assembly owner；index 只提供显式包导出，不改变默认生产可达性。

A7 正式视觉/媒体冻结证据仍是独立前置证据候选，不加入上述九个 P7 功能决策节点，也不计算 `advance`；因此玩法、页面、成长和表现读取合同可以继续并行开发，不需要等待 A7。A7 V1保留旧10项预算证据历史语义，A7 V2记录当前130项目录与未批准预算V2的失败关闭历史；A7 V3只接受P7.15新不可变Approved Policy Assembly，并继续要求同一source/content/六环境build identity。最终freeze manifest与assembly现只接受schema V3。当前没有真实结构测量、批准Policy或完整视觉/媒体证据，所以A7 V3元数据固定`currentPassInstanceExists=false / hardGate=false`；该事实只阻断最终冻结，不阻断继续开发。包index显式导出V1/V2/V3，但默认Release Bundle和三端入口仍不可达。

`A7-formal-budget-structural-evidence-candidate-v1`继续补齐预算V2的前置数据链：提交端要求当前130项资产逐项结构/内存观察和P7六环境观察同时绑定clean source、lock、toolchain、build与证据SHA；独立评估端要求reviewer与collector分离并重验报告、覆盖和身份。即使独立接受，也只允许进入后续Structural Limit Proposal，不能定义或批准上限，`hardGate/hardGateUsable`仍为false。

`A7-formal-budget-structural-limit-proposal-candidate-v1`承接Accepted Evaluation，为130项资产和六环境逐项提出不得低于观察值的maximum、余量理由和不可变Proposal identity。Proposer不得兼任Collector或Evidence Reviewer；不适用结构指标必须为0，零余量必须留给后续独立批准明确处置。本层不判断余量是否充分、不改V2 Policy、不授予批准，`hardGate/hardGateUsable`继续为false。

`A7-formal-budget-independent-approval-decision-candidate-v1`继续强制Approver与Collector/Reviewer/Proposer四角色分离。Approved必须闭合资产与环境余量、适用性/观察下限、生命周期以及全部零余量逐项处置；它只允许进入新的不可变Policy装配，仍不修改或批准当前V2，`hardGate/hardGateUsable`继续为false。

`A7-formal-budget-approved-policy-assembly-candidate-v1`增加第五个独立Assembler，把Approved Decision中的130项资产/六环境上限、来源和批准身份装配为新的V3不可变候选。内层候选只具备未来A7 V3预算复核资格，外层仍`hardGate=false / productionConsumptionAllowed=false`，当前V2不被覆盖。

## 3. 失败关闭与身份闭包

- 所有数据入口要求 exact plain enumerable data fields，深复制并冻结；accessor、Symbol、thenable、未来字段、稀疏/重复/乱序目录失败关闭。六环境构建清单另行派生冻结的`environmentBuildSetIdentityHash`，聚合证据与独立审计必须同时绑定同一source/content/preregistration/build-set身份。
- stored preregistration、evaluation、automation manifest、stage report 和 freeze manifest 均从嵌入的下游最小事实重新构造并比较完整确定性 hash，不信任自报 gate/status/decision。
- 缺失事实不得绑定伪SHA：环境`missing`、零样本真人任务/纵向节点、独立审计`missing`都必须令`evidenceSha256=null`；一旦存在部分或完整实测则必须绑定SHA。八维评分也不能用0分代表“未采集”：`missing`必须同时令`score/evidenceSha256=null`，`available`必须同时提供有限分数与SHA；任一评分缺失使总分与两个评分通过结论保持`null`，评价只能`INCOMPLETE`。固定报告仍保留29个稳定证据槽，缺失槽的SHA为`null`，release-freeze再次拒绝任何缺SHA槽。
- 总分90、单维80、blocking/high开放缺陷上限、中低缺陷资料要求、缺失证据策略和独立审计要求都由preregistration的`releaseGates`进入同一identity；evaluation只读取该冻结门，不再维护第二组数值或策略开关。
- producer 只接受具 Promise internal slot 的 native/foreign Promise；普通 hostile thenable 不执行其 `then`。runner 返回的 suite、command、source/content/prereg/evaluation、package/lock/toolchain、run/attempt 全部与请求闭合。
- runner 非零退出是完整业务失败回执：保留此前 passed、当前 failed，后续21项或对应剩余项全部由 producer 写为 `not-run`；runner 抛错或非法返回则整个生产失败且无半 manifest。
- session 与 producer 都是 single-use；running 时拒绝 reentry/destroy，完成或失败后只保留合同允许的冻结结果，destroy 幂等清引用。
- freeze manifest只接受29项评价证据与24项 passed自动化回执闭合、无 blocking/high 开放缺陷、独立审计 advance 且 A7 正式视觉/媒体证据完整 PASS 的双输入；A7、报告必须绑定同一source/content与相同顺序的六环境build identity，正式目录、资产集、预算策略和A7证据hash进入最终资格身份。资料完整的 medium/low 缺陷保留在资格身份中。
- assembly owner启动前先验证A7 stored结果与评价身份；功能链可继续完成自己的V2报告，但只有V2报告精确PASS/advance且A7精确PASS时才调用唯一freeze manifest creator。真实命令FAIL、功能证据INCOMPLETE、审计rollback或A7 INCOMPLETE/FAIL都保留完整可审计结果而manifest为null，runner/报告/manifest异常均不发布部分结果。

## 4. 已写但延后运行的门

- `arena:p7:candidate:test`：2026-08-25 已执行通过：52包/11波构建、21个Vitest文件/166项、2个版本化Node文件/24项。测试辅助中的future-only V3 PASS仍不代表当前项目资产批准或P7实际执行。
- `check:p7:candidate-boundaries`：2026-08-25 已执行通过，输出`candidateFileCount=9 / a7EvidenceCandidateCount=3 / formalAssetPrerequisiteCandidateCount=24 / deferredTestFileCount=35 / hardGate=false`；继续检查默认入口/既有Release Bundle不可达和无发布能力。
- `P7.10-a7-final-freeze-prerequisite-code-written-not-run`：最终freeze manifest从单一报告输入收紧为报告+A7双输入；assembly启动前冻结并校验A7身份，功能报告PASS但A7未通过时结果仍完整完成且`releaseFreezeManifest=null`。随后补充项目正式目录专用只读子入口，freeze/assembly逐项绑定当前130项资产；旧10项V1 PASS夹具只能作为自选目录绕过反证，不能再生成资格。当前真实A7仍无PASS实例，130项候选资产也未被V1十项预算或任何测试夹具越权批准；本批未运行测试、类型、构建或治理命令。
- `P7.11-a7-v2-current-catalog-budget-closure-code-written-not-run`：新增A7 V2，复用V1证据封套并以单一入口同时绑定当前Catalog identity、130项逐资产来源账本和预算V2字节身份；P7 Freeze/Assembly删除重复映射并只接受V2。预算候选批准、结构上限、真实observation、六环境和人工证据仍缺失，故V2固定`hardGate=false / formalVisualMediaReady=false`。V2单测、runner、治理与不可达检查已登记但未运行。
- `P7.12-a7-structural-budget-evidence-submission-and-independent-evaluation-code-written-not-run`：新增130项资产结构/内存与六环境观察的exact-key提交合同，以及独立reviewer评估合同。Accepted仅证明证据身份/覆盖可供后续上限提案，绝不定义或批准预算；独立批准由P7.14承接，真实测量和全部运行验证顺延。
- `P7.13-a7-structural-budget-limit-proposal-code-written-not-run`：新增只接受Accepted Evaluation的130项资产/六环境上限提案合同；maximum不得低于观察值，非适用指标必须为0，Proposer与Collector/Reviewer分离，严格/零余量均形成显式统计与理由。余量充分性由P7.14独立决策记录承接，V2 Policy变更和全部运行验证顺延。
- `P7.14-a7-formal-budget-independent-approval-decision-code-written-not-run`：新增只接受不可变上限提案的独立批准记录；Approver与前三角色分离，Approved必须闭合四类复核和全部零余量处置。记录只开放新不可变Policy装配资格；装配和A7消费分别由P7.15/P7.16承接，当前V2不变且全部运行验证顺延。
- `P7.15-a7-formal-budget-approved-policy-assembly-code-written-not-run`：新增第五角色Assembler，只接受完整Approved Decision并生成新的V3不可变预算候选及独立内容hash；内层仅具备A7 V3预算复核资格，不覆盖当前V2、不接生产消费。A7 V3由P7.16承接，全部运行验证顺延。
- `P7.16-a7-v3-approved-budget-evidence-binding-and-final-freeze-rewire-code-written-not-run`：新增A7 V3，只替换旧预算门并强制当前130项目录、Approved Policy Assembly、同source/content/六环境build闭合；Freeze Manifest/Assembly只接受schema V3。当前无真实PASS，future fixture不接生产；全部运行验证顺延。
- `P7.17-a7-budget-evidence-domain-separation-code-written-not-run`：结构报告、独立评估、上限提案、批准决策和Policy装配五层记录的Locator/SHA必须跨域互斥；下游持续保留上游记录身份并拒绝重复背书。未运行测试、治理或构建。
- `P7.18-a7-budget-evidence-canonical-utc-instant-closure-code-written-not-run`：P7.12–P7.15采集、评估、提案、批准与装配时间删除仅校验字符串外形的局部正则，统一复用`arena-evidence-contracts`规范UTC instant校验；不存在的月份、日期或非规范毫秒格式在进入身份hash和先后关系比较前失败关闭。延期反证、治理和可达性标记已写但未运行。
- `P7.19-a7-environment-evidence-domain-chain-closure-code-written-not-run`：六环境原始证据除彼此唯一外，总报告、独立评估、上限提案、批准和Policy装配记录均不得复用其Locator/SHA；提案、批准与新Policy持续保留规范顺序的环境证据身份，避免下游只保留build摘要后失去跨域复核能力。延期反证与治理标记已写但未运行。
- `P7.20-a7-budget-evidence-bounded-canonical-string-closure-code-written-not-run`：采集、评估、提案、批准与装配层的角色/业务标识统一限制256字符，证据Locator限制2048字符，说明/备注限制4096字符；身份和Locator拒绝首尾空白与控制字符，关闭角色空白变体绕过和无界字符串进入确定性hash的路径。延期反证与治理标记已写但未运行。
- `P7.21-a7-v3-budget-byte-safe-aggregate-closure-code-written-not-run`：A7 V3对130项当前与maximum编码字节改为逐项安全整数累加，聚合超过`Number.MAX_SAFE_INTEGER`即在预算摘要与冻结身份生成前失败关闭，防止每项合法但总和失真的候选进入PASS计算。延期溢出反证与治理标记已写但未运行。
- `P7.22-a7-budget-evidence-shared-value-contract-code-written-not-run`：P7.12–P7.15删除四份重复的标识/Locator/文本边界实现，统一依赖内部`arena-v2-a7-formal-budget-evidence-value-candidate-v1.ts`；256/2048/4096上限、首尾空白和控制字符策略现只有一个Owner，治理同时要求四层显式导入该合同。行为规格保持P7.20不变且未运行。
- `P7.23-a7-budget-evidence-canonical-identifier-and-locator-closure-code-written-not-run`：共享值合同进一步把角色/业务标识限制为`[a-z0-9._:-]`小写ASCII闭集并要求首字符为字母或数字，Locator拒绝任意内部空白；关闭Unicode近似角色、大小写漂移和带空格证据地址形成不同hash的路径。延期混淆字符与空白Locator反证已写但未运行。
- `P7.24-a7-current-texture-dimension-and-budget-coherence-code-written-not-run`：当前3张1024²材质纹理与5张128² VFX纹理的结构观察必须精确匹配方形RGBA8 Catalog footprint并满足GPU实测下限；纹理提案要求`maxWidth × maxHeight × 4 <= maxDecodedBytes <= maxGpuBytes`且乘法保持安全整数。关闭`1 × N`假尺寸与尺寸/字节/GPU上限分叉，延期反证已写未运行。
- `P7.25-a7-texture-source-dimension-metadata-closure-code-written-not-run`：正式Presentation Catalog继续作为纹理尺寸Source Owner；预算V2候选内容版本升至2，并为130项资产保存进入Policy hash的规范尺寸投影。3张材质纹理固定1024×1024，5张VFX纹理固定128×128，非纹理固定0×0；Readiness/批准账本逐项闭合Source与投影，结构证据和A7 V2冻结链只消费预算投影，不再从字节数反推方形边长。批准、生产接入、测试、治理和构建均未运行。
- `P7.26-a7-texture-decoded-format-source-projection-closure-code-written-not-run`：正式Presentation Catalog为8张纹理显式声明`rgba8`解码格式；预算V2内容版本由2升至3，为全部130项保存`rgba8/not-applicable`规范投影，并以格式×宽高闭合解码字节。Readiness、批准账本和A7 V2拒绝Source/Policy格式漂移，Release不再依赖无字段的4 B/px假设。资产文件、画质、批准、默认消费和hard gate不变，延期规格已写未运行。
- `P7.27-a7-formal-media-encoded-format-source-projection-closure-code-written-not-run`：正式Presentation Catalog为当前130项资产声明可由交付路径直接证明的编码容器格式，预算V2内容版本由3升至4并把24项`glb`、98项`ogg`、8项`png`纳入Policy hash。Readiness、批准账本、A7 V2、结构证据和上限提案持续绑定同一格式身份；本批不把容器格式扩大解释为音频编码器、采样率或声道证明，也不修改资产字节、批准、默认消费和hard gate。测试、治理、构建、设备和性能均未运行。
- `P7.28-a7-approved-policy-encoded-format-retention-code-written-not-run`：结构上限提案把Budget V2的编码容器身份作为派生只读字段带入Proposal identity，Independent Decision原样保留，Approved Policy Assembly再把它写入130项新Policy资产记录；A7 V3逐项重验`ID + path + kind + encoded format + SHA + current bytes`与当前V2基座一致。由此24项`glb`、98项`ogg`、8项`png`不会在Proposal→Approval→Policy→V3链中丢失或被改写。当前Policy仍未激活，默认消费、hard gate和全部运行验证继续关闭。
- `P7.29-a7-approved-policy-texture-decoded-metadata-retention-code-written-not-run`：Proposal从Budget V2派生`rgba8/not-applicable`，Approved Policy同时保存当前解码纹理字节与宽高；A7 V3逐项核对格式、字节和尺寸。3张1024×1024材质纹理、5张128×128 VFX纹理及非纹理0值约束不会在批准装配层丢失，也不能只保留maximum后改写当前Source事实。新Policy未激活，画质、资产、默认消费、hard gate及全部运行验证均不改变。
- `P7.30-a7-approved-policy-decoded-audio-observation-retention-code-written-not-run`：Approved Policy保存已接受结构证据中的逐音频解码字节观察；A7 V3要求98项音频观察为正安全整数且`maximumDecodedAudioBytes >= currentDecodedAudioBytes`，32项非音频的当前/maximum音频解码字节必须为0。该字段属于Process实测事实，不从OGG后缀、采样率或声道猜测；当前仍无真实测量实例，Policy未激活，所有运行验证顺延。
- `P7.31-a7-approved-policy-observation-floor-and-lifecycle-closure-code-written-not-run`：Independent Approval新增真实生命周期事实门，任一六环境`contextRestoreCompleted=false`或`cleanupReturnedToBaseline=false`都不能被`lifecycleRequirementsVerified=true`掩盖后批准。Approved Policy保留130项资产和六环境完整Accepted Observation；A7 V3逐项复核13项资产maximum、4项环境maximum均不低于观察，并要求六环境实测恢复/清理均已完成。当前无真实批准实例，默认消费、hard gate及运行验证继续关闭。
- `P7.32-a7-environment-observation-evidence-identity-closure-code-written-not-run`：修复六环境Accepted Observation进入Proposal时丢失原始证据Locator的问题，现随环境ID、SHA完整保留。Approved Policy装配逐环境核对Accepted Observation与`structuralEnvironmentEvidenceRecords`的ID、Locator、SHA；A7 V3再次复核，阻止“数值来自一份证据、Policy引用另一份记录”的分叉。当前无真实证据或批准实例，默认消费、hard gate及全部运行验证继续关闭。
- `P7.33-a7-structural-evidence-capture-provenance-retention-code-written-not-run`：将结构证据的`submissionIdentity / observationBatchId / capturedAtUtc`从Accepted Evaluation继续贯穿Proposal、Independent Decision和Approved Policy证据身份区。下游除报告与评估hash外可直接定位具体采集批次和时间，不再依赖反查嵌套输入恢复来源。当前不产生或认可真实采集证据，Policy、默认消费、hard gate与全部运行验证不变。
- `P7.34-a7-independent-governance-role-and-timeline-retention-code-written-not-run`：Proposal继续保留Review时间，Decision继续保留Proposal时间；Approved Policy显式保存Collector、Reviewer、Proposer、Approver四个独立角色及`captured → reviewed → proposed → decided`规范时间线。Assembly与A7 V3均复核角色唯一和时间单调，Assembler仍只存在于外层装配记录，避免Policy内容与交付记录混权。当前无真实批准实例，全部运行验证继续顺延。
- `P7.35-a7-independent-approval-summary-and-zero-headroom-closure-code-written-not-run`：Approved Policy批准摘要补回六环境实测生命周期全通过事实；A7 V3显式重验Decision为approved、四类独立复核、实测生命周期、全部零余量处置接受，并要求处置数量等于Proposal摘要中的零余量资产数加环境数。最终冻结层不再只依赖装配入口曾经放行。当前无真实批准实例，全部运行验证顺延。
- `P7.36-a7-fifth-actor-assembly-governance-envelope-closure-code-written-not-run`：A7 V3新增外层Assembly治理封套复核，要求Assembler与Collector/Reviewer/Proposer/Approver五角色互异、Assembled At不早于Decided At，Assembly记录Locator/SHA不复用六环境、报告、评估、提案或批准记录。Assembler仍不进入Policy治理来源，保持Policy内容与交付封套分离。当前无真实装配实例，全部运行验证顺延。
- `P7.37-release-freeze-approved-budget-policy-and-assembly-identity-retention-code-written-not-run`：Release Freeze Manifest在既有A7 Evidence hash、Catalog与Asset Set之外，直接保存Approved Budget Policy ID、Revision、Content Hash及Approved Policy Assembly Identity；生成前重验A7预算摘要、内层Policy和外层Assembly身份一致。最终冻结清单无需反查嵌套Evidence即可定位预算版本，同时完整A7仍保留在Manifest中。当前无真实PASS，全部运行验证顺延。
- `P7.38-release-freeze-a7-package-lock-and-toolchain-source-closure-code-written-not-run`：Release Freeze Manifest与最外层Assembly Session新增A7结构测量同源门，要求Approved Policy中的`packageLockSha256 / toolchainIdentitySha256`精确等于功能报告自动化链的lock与toolchain identity。Source commit、content和六环境build相同但依赖或工具链不同的证据不能共同形成冻结资格。future-only夹具可注入对应身份，当前无真实PASS，全部运行验证顺延。
- `P7.39-release-freeze-functional-automation-a7-evidence-domain-separation-code-written-not-run`：Freeze Manifest建立A7证据SHA索引，覆盖正式预算、阶段、逐资产许可/批准、六环境、三端交付、截图/录像、人工评审、结构环境、结构报告/评估/提案/批准与Assembly记录；29项功能评价和24项自动化回执不得复用其中任一SHA。Manifest只记录A7证据槽数量，完整证据仍由嵌套A7持有。future-only跨域碰撞反证已写未运行。
- `P7.40-release-freeze-a7-evidence-slot-uniqueness-code-written-not-run`：同一A7 SHA不得在正式预算、阶段、许可、批准、环境、交付、捕获、人审或结构治理的不同证据槽之间重复；Freeze Manifest在跨功能/自动化域检查前同时要求A7索引自身全局唯一。资产内容SHA不进入该Evidence槽索引，避免把交付内容误当治理记录。future-only同域重复反证已写未运行。
- `P7.41-a7-v3-formal-evidence-sha-index-single-owner-code-written-not-run`：将A7 Evidence SHA索引与内部唯一性从Freeze Manifest下沉到A7 V3单一Owner。A7 V3在声明PASS/ready前生成冻结索引、拒绝槽位重复，并把索引及计数纳入Evidence identity；Freeze Manifest只消费该只读索引检查功能/自动化跨域碰撞，不再复制A7字段遍历。P7.40语义不变，延期规格与治理已更新未运行。
- `P7.42-a7-v3-structured-formal-evidence-record-index-code-written-not-run`：A7 V3把裸Evidence SHA数组升级为冻结的结构化记录索引，每项直接携带稳定`recordId`、证据`kind`和`evidenceSha256`。正式预算、阶段、逐资产许可/批准、环境、交付、捕获、人审、结构环境/报告/评估/提案/独立批准/Assembly均有可定位槽身份；recordId和SHA分别全局唯一，跨功能域碰撞由Freeze报告具体A7槽。旧裸索引被替换而非双写，Owner仍唯一；规格与治理已写未运行。
- `P7.43-a7-v3-formal-evidence-record-locator-closure-code-written-not-run`：结构化A7索引继续绑定每个非空证据槽的独立`evidenceLocator`。输入Locator目录必须与实际非空记录一一对应，recordId/Locator均唯一，不能缺项或夹带missing槽；结构预算六环境、报告、评估、提案、批准和Assembly的Locator还必须与上游记录逐项一致。规范化目录与索引共同进入stored重算和Evidence identity，Release仍只读消费索引，跨域碰撞同时报告recordId与Locator。本批不创建任何真实Evidence或路径，future-only目录与反证已写未运行。
- `P7.44-a7-v3-formal-evidence-content-metadata-closure-code-written-not-run`：每个结构化证据记录继续冻结证据文件自身的规范媒体类型与正安全整数字节长度，调用方不能只提交Locator和SHA。媒体类型仅接受最长128字符的小写无参数`type/subtype`；该元数据不替代素材、捕获内容或交付包原有格式/大小身份。Locator目录、结构化索引与stored evidence均保留同一值，future-only非法类型、零字节反证已写未运行。
- `P7.45-a7-v3-formal-evidence-byte-aggregate-overflow-closure-code-written-not-run`：A7 V3从同一结构化索引逐项安全累加全部证据记录字节，并在Coverage Summary保存规范总量；任一累加越过安全整数上限即在身份生成前失败关闭，Freeze Qualification直接保留同一总量。该值只描述治理Evidence文件，不是资产包、纹理解码或音频预算；future-only聚合溢出反证已写未运行。
- `P7.46-a7-v3-formal-evidence-recorded-at-timeline-binding-code-written-not-run`：每条结构化Evidence记录新增规范UTC记录时间。结构环境/报告、评估、提案、独立批准、Assembly分别与Captured/Reviewed/Proposed/Decided/Assembled上游时间直接对账；Locator目录不能把旧结构记录重新标成新时间。Legacy视觉/媒体记录时间暂由future-only目录提供并进入A7 identity，不构成真实证据。非法时间与结构时间漂移反证已写未运行。
- `P7.47-a7-v3-formal-evidence-producer-role-binding-code-written-not-run`：每条结构化Evidence记录新增规范Producer ID；结构环境/报告、评估、提案、批准和Assembly分别与Collector/Reviewer/Proposer/Approver/Assembler直接对账。最终目录不能替换上游问责角色，Legacy记录Producer仍只是future-only输入并须由未来真实记录证明。非法Producer和结构角色漂移反证已写未运行。
- `P7.48-a7-v3-canonical-evidence-store-locator-code-written-not-run`：A7 V3只接受统一`evidence://arena-v2/...`证据库Locator，并逐段拒绝外部scheme、空段、`.`/`..`、大小写漂移、查询和片段。最终冻结身份不再接受可变HTTP地址或Arena命名空间外路径；future-only外部URL与跳转路径反证已写未运行。
- `P7.49-a7-v3-formal-evidence-record-index-identity-code-written-not-run`：A7 V3为规范结构化Evidence索引生成独立确定性身份，覆盖槽ID/Kind、Locator、类型、字节、记录时间、Producer与SHA，并纳入stored重算和外层A7 identity。Freeze Manifest在Identity中只读保留该A7-owned hash，不复制索引生成逻辑；延期规格与治理已写未运行。
- `P7.50-a7-v3-independent-evidence-retrieval-verification-receipt-code-written-not-run`：A7 V3要求每条结构化Evidence记录都有独立取回核验回执，逐项核对实际观察到的Locator、媒体类型、字节、记录时间、Producer与SHA；Verifier不得兼任任一Evidence Producer，核验不得早于记录。回执Locator/SHA与全部源证据及其他回执全局互斥，回执字节安全累加并形成A7-owned独立索引identity；Freeze只读保留该identity、数量与总字节，同时把回执SHA纳入功能/自动化/A7跨域冲突检查。future-only规格、治理和失败反证已写未运行；本批不读取真实证据库、不生成真实回执，也不改变当前hard gate。
- `P7.51-a7-injected-formal-evidence-retrieval-verifier-code-written-not-run`：新增单次取回核验器候选，只通过显式注入且ID互异的Evidence Reader、SHA-256 Hasher和Receipt Writer工作。全部记录按规范索引串行取回，实际元数据、字节与内容SHA逐项对账；全部读取/哈希成功后才调用一次原子批Writer，回执Payload/Session/Adapter/Plan/Index身份被固定，任一失败不发布部分结果且结算后释放端口。源码无默认文件、网络、进程或发布能力，延期规格、治理和导出已写未运行。
- `P7.52-a7-formal-evidence-retrieval-plan-cycle-closure-code-written-not-run`：A7 V3从Legacy Evidence、Approved Policy Assembly和Locator目录先生成`grantsA7Pass=false`的规范Retrieval Plan，冻结同一Record Index、Index Identity与Plan Identity；最终A7复用该Plan的Index，形成`Plan → Verifier → A7`单向链，关闭“先有最终A7才能取得待核验索引”的循环。future-only等价与身份漂移规格已写未运行，计划不授予PASS、不接默认入口。
- `P7.53-a7-explicit-formal-evidence-store-adapters-code-written-not-run`：新增显式Node Store Adapter候选与可复用原子Evidence目录发布工具。Reader把`evidence://arena-v2/...`映射到调用方绝对根目录，独立读取metadata sidecar和原始二进制，复用稳定descriptor/path identity、字节上限与符号链接逃逸防线；Hasher对取回字节重算SHA-256；Writer要求治理父目录预配置，将整批回执与sidecar写入staging后一次发布到不可覆盖的`<session>/committed`。临时目录、重复Session、逃逸和原子失败规格已写未运行；Adapter没有默认根目录、默认接线或A7批准权。
- `P7.54-a7-committed-receipt-readback-attestation-code-written-not-run`：原子目录发布新增返回前`afterPublish`证明段；A7 Store Writer在`committed`落盘并同步后逐文件重新打开回执与sidecar，以稳定路径/文件身份核对真实字节、长度、SHA和规范metadata，全部一致后才返回批结果。同步或回读失败只尝试删除本次新建Session并再次同步治理父目录，清理失败与主错误合并上报，既有Session从不覆盖或删除。延期故障规格、治理标记和文档已写未运行；默认Store、入口、A7 PASS和hard gate不变。
- `P7.55-a7-evidence-store-snapshot-identity-closure-code-written-not-run`：Retrieval Plan新增显式Store Snapshot Identity并纳入Plan hash；Verifier把它贯穿Session、Reader/Hasher/Writer请求、每条Payload、原子批结果、Verification Result及A7目录。Node Adapter实例只能服务一个固定Snapshot Identity，跨Snapshot请求在文件读取或回执发布前失败关闭。当前无真实Snapshot或默认接线，延期规格与治理已写未运行。
- `P7.56-a7-derived-retrieval-plan-identity-retention-code-written-not-run`：Verifier对外A7目录逐条保留实际使用的Retrieval Plan Identity；A7 V3从Legacy Evidence、Approved Policy Assembly、Locator Directory与Snapshot Identity自行重建Plan并逐项比对，关闭同一Snapshot下不同Plan回执拼接。Plan仍不授予PASS，当前门、入口与验证状态不变。
- `P7.57-a7-store-snapshot-manifest-and-timeline-closure-code-written-not-run`：显式Node Store要求规范根路径`arena-v2/store-snapshot.json`；Manifest冻结Snapshot ID/Revision、创建时间、Record Index Identity与数量并生成确定性身份。Reader每条读取、Writer发布前和`committed`返回前均稳定重读并核对，Snapshot创建时间不得早于任一记录。Adapter不创建或更新真实Manifest，时间失败规格已写未运行。
- `P7.58-release-freeze-retrieval-plan-and-store-snapshot-projection-code-written-not-run`：Release Freeze Identity在既有A7 Record/Verification Index identity之外，直接保存A7自行派生的Retrieval Plan Identity和Store Snapshot Identity。Manifest仍只由完整A7 V3验证后生成，不复制Plan或Snapshot生成逻辑；新增投影只减少归档反查，不改变资格判定、发布能力或当前hard gate。
- `P7.59-a7-store-snapshot-canonical-exact-bytes-code-written-not-run`：Node Store Adapter在解析并验证Snapshot Manifest后，重新生成唯一规范UTF-8字节并与稳定读取到的文件文本、长度及SHA逐项一致；字段重排、缩进、额外空白或其他语义等价重写均失败关闭。同一Snapshot Identity因此不能对应多个磁盘表示。延期反证、治理和文档已写未运行；Adapter仍不创建真实Manifest、不接默认Store或生产入口。
- `P7.60-a7-store-snapshot-canonical-serializer-code-written-not-run`：Store Adapter公开唯一规范Snapshot Manifest序列化器，输入必须先通过完整stored Manifest验证，输出为可直接写入规范路径的唯一UTF-8文本。Reader的精确字节校验与延期Store准备规格统一调用该入口，调用方不再依赖偶然字段插入顺序手拼JSON。该入口不执行I/O、不创建或替换真实Snapshot，也不赋予A7 PASS或发布能力。
- `P7.61-a7-source-metadata-sidecar-canonical-exact-bytes-code-written-not-run`：原始Evidence metadata sidecar在稳定读取并完成字段/值验证后，必须与公开规范序列化器生成的唯一UTF-8文本、字节长度和SHA完全一致；字段重排、缩进、额外空白及其他语义等价重写失败关闭。延期Store helper改用同源序列化器，另补非规范sidecar反证源码。Evidence内容字节与metadata仍分离，Adapter不信任sidecar自报内容长度或SHA。
- `P7.62-a7-store-snapshot-per-record-read-toctou-closure-code-written-not-run`：每条Reader调用在读取原始Evidence字节后、返回记录前再次稳定读取并完整验证同一Snapshot Manifest，复核Snapshot/Record Index/数量身份、规范字节和时间覆盖。Snapshot在metadata/原始字节读取窗口内切换、消失或漂移时，该记录不交付给Verifier。Writer既有发布前与`committed`返回前复核保持不变；本批不增加可变Owner或默认I/O入口。
- `P7.63-a7-store-adapter-port-identity-ownership-code-written-not-run`：Node Store Adapter Factory固定并返回Reader、SHA-256 Hasher和Receipt Writer三个互异ID；每个端口在执行能力前精确拒绝请求ID错配。规范Verifier组合可直接展开Factory结果，不再由调用方把函数与ID分开手填，避免本实现被错误标注为另一Adapter身份并进入Session、Payload或回执。延期三端口冒用反证已写未运行。
- `P7.64-a7-receipt-writer-nested-payload-identity-closure-code-written-not-run`：Receipt Writer在任何Store I/O前精确捕获批请求、每个条目和完整Verification Payload，验证字段集合、索引、全部hash/Locator/媒体/字节/时间/Producer/Verifier及三端口ID，并用Verifier同一record-scoped domain重算`verificationPayloadIdentityHash`。外层Writer ID正确但内层Adapter ID、Payload内容或Identity自报漂移时，整批失败且不发布。延期内层冒用与伪hash反证已写未运行。
- `P7.65-a7-reader-hasher-request-canonical-closure-code-written-not-run`：Reader在首次Store I/O前精确捕获外层请求、全部hash、索引/数量和单条Expected Record，拒绝future字段、访问器和非法记录；Hasher精确捕获同组身份，只接受显式上限内的非共享`Uint8Array`并复制后计算SHA。调用方可变对象、共享字节或额外字段不能跨越Adapter边界；延期恶意请求反证已写未运行。
- `P7.66-a7-reader-sidecar-and-writer-byte-boundary-closure-code-written-not-run`：Reader在读取原始Evidence前要求规范sidecar的Record ID、Locator、Media Type、Recorded At与Producer逐项等于Expected Record；Writer在任何Store I/O前要求每条Payload自报字节不超过Factory单记录上限。三端因此共同服从同一记录身份与大小边界，延期sidecar漂移和超限Payload反证已写未运行。
- `P7.67-a7-writer-session-and-batch-preflight-closure-code-written-not-run`：Writer在首次Store I/O前逐项闭合recordIndex/count、Session/Plan/Index/Snapshot与Writer身份，并按每条Payload的Verifier、Verified At和三端口ID重算规范Verification Session Identity。不同Verifier/时间、伪Session或批次身份漂移不能先触发Store读取再失败，也不能被拼入同一原子回执批；延期伪Session反证已写未运行。
- `P7.68-a7-evidence-root-directory-identity-pinning-code-written-not-run`：Store Adapter Factory首次执行Reader/Writer时捕获Evidence Root真实路径与目录device/inode，并在读取、写入及返回前复核；根路径符号链接改指另一份即使内容相同的Store也失败关闭。首次捕获Promise由Factory单一拥有且失败粘滞，不能在后续请求中静默换根；延期双Store改指反证已写未运行。
- `P7.69-a7-receipt-parent-directory-identity-pinning-code-written-not-run`：Factory首次Writer调用固定预配置`verification-receipts`治理父目录的真实路径与device/inode，后续批次写入前及`committed`回读返回前复核；父目录符号链接在同一Root内改指另一目录也失败关闭。首次捕获失败粘滞，不创建或接管父目录；延期双回执库改指反证已写未运行。
- `P7.70-a7-receipt-metadata-canonical-serializer-single-source-code-written-not-run`：Writer生成回执metadata sidecar时直接调用P7.61公开规范序列化器，原始Evidence与回执metadata不再各自维护JSON字段顺序或文本表示。`committed`回读仍核对同一字节/长度/SHA；延期落盘文本与公开序列化器等价反证已写未运行。
- `P7.71-a7-receipt-body-canonical-serializer-single-source-code-written-not-run`：新增公开回执正文规范序列化器，精确重建外层Session/Plan/Index/Snapshot、完整Verification Payload与Payload Identity并校验内外身份闭合；Writer只消费该序列化结果生成待写字节，不再独立拼接回执JSON。延期字段重排等价与内外身份漂移反证已写未运行。
- `P7.72-candidate-identity-domain-and-automation-closure-code-written-not-run`：automation manifest补入遗失的`sourceDirty=false` canonical字段；外部`toolchainIdentitySha256`与内部短确定性toolchain identity分域并贯穿24项回执、报告、Assembly和Freeze；A7 V3/Verifier/Node Store将Plan、Index、Session和Payload的8位确定性身份与64位外部SHA分开校验，Snapshot Manifest以其规范核心UTF-8字节派生SHA-256。首轮57项候选红中的identity/schema/fixture/governance漂移已修。候选自动化、boundary、类型、文档与diff检查已执行通过；不生成真实A7证据、不授予PASS、不接默认Release或三端入口。
- `arena:p7:candidate:gate`：先跑边界检查，再跑候选测试。
- `project-reference-closure-code-written-not-run`：补齐活跃复合项目`arena-product-progression`对Definitions/Storage、`arena-platform-runtime`对Platform Contracts，以及P7证据工具`arena-input-pilot`对其manifest既有六个workspace依赖的TypeScript project references；只修编译图，不新增依赖、不修改锁文件，也不恢复或接入V1产品行为。V1 experiment/application/greybox其余缺引用，以及`arena-v1-experiment`缺少`arena-core` manifest声明，继续作为历史迁移债务留待对应旧链删除或独立治理，本批不维护且不接生产。
- `root-project-reference-closure-code-written-not-run`：根`tsconfig.json`已写入52/52个`packages/*`复合项目引用，治理源码从`createWorkspaceBuildPlan()`识别的全部workspace项目目录派生期望集合，对根references规范化后检查缺失、额外与重复，不维护第二份52项手工清单。实际workspace构建波次仍只由manifest内部依赖图推导；本批未运行测试、类型或构建验证。`arena-v1-experiment`缺`arena-core` manifest/reference仍是历史删除债务，本批不背书、不修复且不恢复V1产品。
- `authority-boundary-dependency-closure-code-written-not-run`：Action Phase、Match Phase与Participant Status下沉到`arena-contracts`单一冻结契约源，Core/Match只消费并兼容重导出同一对象；`arena-bot`移除Match依赖，角色自动踏步高度与tick时长分别由受限Arena视图和Bot构造显式注入，不再读取Physics/Match默认值；`arena-presentation-runtime`改从Definitions正式单位读取tick rate并移除Match依赖。manifest、project references与workspace lock同步更新；V1删除债、默认Registry/Composition/入口和生产资产状态均未改变。
- `snapshot-authority-enum-closure-code-written-not-run`：`ArenaMatchSnapshot`/`WorldSnapshotV2`的Match Phase、Participant Status与Action Phase类型及unknown审计均改为复用`arena-authority-state`私有集合纯断言，V3通用phase亦复用同源校验；Map occurrence phase、Movement mode、Action commitment status与Race模式专属状态保持原合同。Bot受限观察同步收紧三类静态字段且不新增依赖；未运行测试、类型、构建或阶段门。默认Registry/Composition/入口、V1删除债与美术门均未改变。

2026-08-25 前述P7候选命令已按本节记录执行通过；严格性能、设备、真人、真实24项自动化、29项评价、真实A7 V3与发布仍未运行。当前结论仍只能是 `code-written-not-run / incomplete / hardGate=false`。

## 5. 七维静态自检

| 维度 | 静态结论 | 未完成门 |
|---|---|---|
| 健壮性 | exact-key、深复制、有限数/安全整数、固定目录、评分/缺陷门单一预注册源与stored重算已存在 | 需实际类型与恶意输入测试 |
| 竞态与确定性 | 单次捕获输入；runner串行；同身份hash可重算；不使用墙钟/随机 | 需真实runner与重复构造验证 |
| 失败关闭 | FAIL优先、评分缺失优先保持INCOMPLETE且不伪造0分、nonzero fail-fast、异常无半manifest；freeze拒绝功能非PASS、缺SHA、A7非PASS或A7身份漂移 | 需运行失败矩阵 |
| 边界与恶意输入 | getter/thenable/future/重复/乱序/身份混用测试代码已登记；missing与伪SHA/伪0分组合失败关闭 | 原生/foreign/shadowed Promise仍需运行证据 |
| 生命周期与清理 | producer/session single-use；运行中destroy拒绝；settle释放冗余引用 | 无取消型runner端口，永不settle由未来执行宿主管理 |
| 主流程阻断 | 候选没有默认runner、Release Bundle或三端入口接线；A7未通过只阻断最终freeze，不阻断继续开发或功能报告生成 | P7真实设备/真人/自动化与A7正式资产证据尚不存在 |
| 治理与回滚 | 9个P7候选显式导出，A7视觉/媒体V1/V2/V3、结构预算证据、结构上限提案、独立批准记录和新Policy装配分层；评分/缺陷门、六环境build-set、130项观察、独立评估、不可变提案、四角色批准、第五角色装配与V3最终绑定均有稳定身份，runner/边界/可达性脚本已登记 | 所有治理命令未运行；可按候选文件整批回滚 |

## 6. 回滚点

删除九个 `arena-v2-p7-*candidate`、三个A7视觉/媒体候选、A7结构预算证据、结构上限提案、独立批准记录与新Policy装配候选的显式导出、本台账、P7 runner/边界/可达性接线及根脚本登记即可回退；默认 Release Bundle、三端入口、既有发布证据合同和生产资产不受影响。
