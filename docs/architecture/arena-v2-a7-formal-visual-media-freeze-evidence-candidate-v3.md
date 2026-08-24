# Arena V2 A7 正式视觉/媒体冻结证据候选 V3

## 状态

- 日期：2026-08-15
- production reachability：`production-unreachable`
- implementation：`code-written-not-run`
- validation：`not-run`
- 当前实例：`currentPassInstanceExists=false`
- 当前门：`incomplete / hardGate=false`
- 默认 Release Bundle / Entry：未接入

A7 V3保留V1的来源、权利、逐资产批准、A0–A6、三端交付、六环境截图/录像和人工评审封套，只替换V1旧10项与V2故意未批准的预算门。新的预算输入必须来自P7.15不可变Approved Policy Assembly。

## 闭合关系

V3重新验证：

- V1完整stored evidence identity；
- 当前130项Catalog逐项`assetId + path + bytes + SHA + source evidence`；
- Approved Policy Assembly及其Evidence→Proposal→Approval→Assembly完整身份链；
- 视觉/媒体证据与预算候选同一source commit；
- 两侧六环境ID、顺序和build SHA完全一致；
- 新Policy精确包含130项资产和六环境，且具有独立批准的结构上限。
- 新Policy逐项保留当前V2基座的`assetId + path + kind + encoded media format + decoded texture format/dimensions/bytes + SHA + current bytes`，24项GLB、98项OGG、8项PNG以及8张纹理的RGBA8尺寸事实不能在Proposal、Approval或Assembly中被改写；
- 新Policy还必须保留已接受的逐音频解码字节观察；98项音频为正安全整数且maximum不低于观察，非音频当前/maximum保持0。该观察来自Evidence，不由OGG后缀推断；
- 新Policy保存130项资产和六环境的完整Accepted Observation；V3逐项复核所有maximum不低于观察、当前投影不漂移，并要求六环境实测Context恢复与清理回基线均为true；
- 每个环境Accepted Observation的环境ID、Evidence Locator和Evidence SHA必须与Approved Policy证据身份区中的原始环境记录逐项一致，不能用另一份证据记录替换数值来源；
- Approved Policy中的Collector、Reviewer、Proposer、Approver必须保持四角色互异，Captured、Reviewed、Proposed、Decided时间必须单调，且采集时间与证据身份区一致；
- Approved Policy批准摘要必须仍为approved，四类独立复核、六环境实测生命周期和全部零余量处置均闭合；零余量处置数量必须等于Policy结构摘要中的零余量资产数与环境数之和；
- 外层Assembler必须与Policy四角色互异，Assembled At不得早于Decided At，Assembly记录Locator/SHA不得复用任一六环境或上游治理证据；
- 130项当前编码字节与maximum编码字节均按非负安全整数逐项累加，任一聚合溢出在进入预算摘要和冻结身份前失败关闭。

V1中只属于旧预算的缺失/失败原因会被V3替换；来源、许可、逐资产批准、阶段、交付、截图/录像、人工评审和三端delivery budget原因继续保留，不能由新预算候选掩盖。

## PASS语义

只有所有非旧预算证据完整且无失败时，future input才可得到：

- `evidenceStatus=PASS`；
- `hardGate=true`；
- `formalVisualMediaReady=true`；
- `currentGate=candidate-pass-not-wired`。

这只是数据函数对未来完整输入的结果。元数据仍固定`currentPassInstanceExists=false / hardGate=false`，测试fixture不是当前证据，不会接入默认入口或发布。

## P7接线

Release Freeze Manifest和Assembly已从A7 schema V2收紧为schema V3：

- V1或V2即使伪造PASS也不能进入最终冻结；
- 功能P7报告与A7 V3必须同source、content和六环境build set；
- 当前A7 V3 INCOMPLETE时，功能报告仍可完成，但manifest必须为null；
- 只有未来功能PASS + A7 V3 PASS才能构造不可发布的资格manifest。
- 资格manifest直接保存Approved Budget Policy ID、Revision、Content Hash与Assembly Identity，并在生成前与A7预算摘要和完整装配重新对账；A7 Evidence hash与完整嵌套Evidence仍是权威来源。
- 最外层Assembly Session与资格manifest还要求Approved Policy结构测量使用的package lock、toolchain identity与功能报告自动化链完全一致；同commit、同build但不同依赖或工具链的证据不能拼接。
- 资格manifest会建立A7非空Evidence SHA索引，并拒绝功能评价或自动化回执复用其中任一SHA；同一记录不能跨功能、自动化、媒体/结构治理三域重复计数。
- A7索引内部的非空Evidence SHA也必须逐槽唯一；交付资产、捕获文件等内容SHA继续留在各自内容身份字段，不作为治理Evidence槽参与该唯一性检查。
- Evidence SHA索引由A7 V3单一拥有，并随stored evidence重算；索引及计数进入A7 identity。Freeze Manifest只消费该投影检查功能/自动化跨域复用，不维护第二套媒体字段遍历。
- A7索引不是裸SHA数组，而是冻结的`recordId + kind + evidenceSha256`记录：正式预算、阶段、资产许可/批准、环境、交付、捕获、人审及五类结构治理槽都有稳定身份。A7同时拒绝recordId和Evidence SHA重复；Freeze发生跨域碰撞时可以直接报告具体A7 recordId。
- 每个非空Evidence槽还必须由独立Locator目录提供一个无空白、受长度约束且不与其他槽复用的`evidenceLocator`；目录总量硬限583项，不能缺项，也不能夹带无非空证据的记录。结构环境/报告/评估/提案/批准/Assembly Locator继续与其上游治理记录直接对账，调用方不能为同一结构SHA另写位置。规范化后的Locator随结构化索引进入A7 identity。
- Locator目录同时为每条记录提供`evidenceMediaType`和正安全整数`evidenceByteLength`。媒体类型必须是小写、无参数、无空白且最长128字符的规范`type/subtype`；这些字段描述证据记录本身，不覆盖Source素材、截图/录像内容或交付包已有的格式和字节身份。三项取回元数据随索引共同冻结并参与stored重算。
- 全部证据记录字节长度使用逐项防溢出的安全整数累加，`coverageSummary.totalFormalEvidenceBytes`直接给出同一索引的规范总量；单项合法但聚合溢出的目录仍失败关闭，不能把截断总量交给后续取回或归档计划。
- 每条证据记录还必须包含规范`evidenceRecordedAtUtc`。结构环境和结构报告绑定Captured At，独立评估绑定Reviewed At，上限提案绑定Proposed At，批准绑定Decided At，Assembly绑定Assembled At；这些上游时间不能由V3目录另写。Legacy视觉/媒体记录的时间当前由目录提供并进入身份，未来真实生产者仍需用原始记录证明。
- 每条记录同时保存规范`evidenceProducerId`。结构环境/报告、评估、提案、批准和Assembly分别绑定Collector、Reviewer、Proposer、Approver、Assembler；V3目录不得替换问责角色。Legacy记录Producer当前来自future-only目录，真实生产者仍需在来源、权利、资产批准、环境、交付、捕获和人审记录中提供可审计身份。
- 所有Locator必须位于统一`evidence://arena-v2/...`证据库，路径只允许小写规范段；外部HTTP(S)、其他scheme、空段、`.`/`..`、查询与片段全部拒绝。Locator是冻结证据记录地址，不允许依赖可变远端URL或越出Arena V2证据命名空间。
- A7 V3对规范化后的完整结构化索引单独生成`formalEvidenceRecordIndexIdentityHash`；该身份覆盖recordId、kind、Locator、媒体类型、字节、时间、Producer和Evidence SHA。stored evidence必须重算一致，Release Freeze只直接保留该A7-owned身份，不重新生成或维护第二套索引。
- 每条结构化记录还必须有独立取回核验回执。回执逐项复述实际观察到的Locator、媒体类型、字节、记录时间、Producer与SHA，且必须与A7源记录完全一致；Verifier不得兼任目录中的任一Evidence Producer，核验时间不得早于证据记录时间。回执自身拥有独立的规范Locator、媒体类型、正安全整数字节与SHA，不能复用任何源证据或其他回执身份；A7对规范回执索引生成`formalEvidenceRecordVerificationIndexIdentityHash`并安全累加回执总字节，Freeze直接保留该身份与数量/总量，同时拒绝回执SHA与功能评价或自动化证据跨域复用。

这里闭合的是未来真实取回器必须提交的数据合同与失败关闭边界，不代表当前代码已经读取证据库、重算文件SHA或产生真实回执。future-only fixture只用于描述合法形状，不能成为当前A7 PASS证据。

P7.51–P7.52继续提供生产不可达的执行候选：A7 V3可先从Legacy Evidence、Approved Policy Assembly和Locator目录生成`grantsA7Pass=false`的规范Retrieval Plan，再交给只接受注入Reader、SHA-256 Hasher和原子批Receipt Writer的单次核验器。由此链路变为`Plan → Retrieval Verification → final A7`，不要求先构造最终A7。当前没有任何默认Adapter或真实执行，候选成功结果也不能授予A7 PASS。

P7.55–P7.56把Evidence Store Snapshot Identity加入Retrieval Plan identity，并要求每条独立验证目录记录同时保留同一Snapshot Identity和A7自行派生的Retrieval Plan Identity。最终A7先重建Plan，再核对所有回执记录；同一Record Index来自不同Snapshot，或同一Snapshot使用不同Plan的组合都会失败关闭。Snapshot Manifest的真实文件读取由显式Node Store Adapter负责，A7数据层不获得文件系统能力。

## 延后验证

V3定向测试规格、P7 runner、治理、可达性及Freeze/Assembly回归规格已写但未运行。真实结构测量、130项生产批准、六环境视觉/媒体、人审、构建、设备、性能和发布全部顺延。
