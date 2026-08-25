# Arena V2 P2 正式模式实施状态台账

## 当前状态

- 状态：`P2.5-contract-system-integration-candidate-landed / P2.5d-concrete-mode-runtime-static-candidate-landed / P2.5e-mid-match-restore-static-candidate-landed / P2.5e-mode-driver-checkpoint-v3-code-written-not-run / P2.5f-terminal-tick-static-contract-patched-not-run / P2.5g-result-replay-settlement-evidence-code-written-not-run / P2.5h-mode-driver-terminal-settlement-identity-v2-code-written-not-run / P2.5i-supply-terminal-evidence-code-written-not-run / P2.5j-explicit-per-step-supply-facts-code-written-not-run / P2.5k-explicit-local-jump-availability-code-written-not-run / P2.5l-real-primary-press-hold-affordance-code-written-not-run / P2.6-real-runtime-factory-static-candidate-landed / P2.0o-P2.0q-resolved-policy-terminal-assertions-code-written-not-run / P2.0r-explicit-timeline-runtime-mirror-capability-code-written-unwired / P2.0s-declared-then-sync-boundary-code-written-not-run / P2.0t-timeline-wiring-eligibility-code-written-unwired / P2.0u-survival-execution-timing-separation-code-written-not-run / P2.0v-race-execution-timing-separation-code-written-not-run / P2.0w-three-mode-timeline-product-proposal-code-written-not-run / verification-deferred-by-ADR-119 / production-unreachable / hardGate=false`。
- 日期：2026-08-24。
- 2026-08-24 证据状态校正：`feature/arena-v2-design-docs@787ce27`是本批之前的历史clean基线；当时记录了`typecheck:app`、52包workspace build、P2候选`351/421`和P3边界门。该记录不等于P2全量候选门、P4–P7候选门、严格性能/设备/真人或发布通过；未取得独立运行记录的门继续保持`not-run`。
- SF-DG.1 首轮证据（2026-08-24，基线`de1ef89`）：`check:p2:candidate-boundaries`首轮因预检 consumer 标记陈旧失败；`arena:p2:candidate:test`的52包构建通过，但54份Vitest中28份、520项中113项失败。已确认并修复：V6局部跳跃可用性被错误升级为全局必填、验证Authority遗漏显式空supply facts、零延迟/零保护的Duel配置被误拒、Race roster构造先读未创建物理角色、Survival配置哈希传入class实例及Mode Registry-only内容身份拒绝。边界门现已复跑通过；候选门尚未通过，剩余红项必须继续按独立失败簇处理，不能将本记录写成P2验收通过。
- SF-DG.1 最终证据（2026-08-24，当前工作树）：P2边界门通过；Vitest `56/56`文件、`531/531`用例通过；Node架构测试`59/59`通过，其中独立Node long-run continuation parity覆盖5940 tick continuous/restored、恢复点、最终hash和资源归零。`typecheck:app`与`git diff --check`通过。长跑因Vitest worker进度通道在约230秒产生假红，已移至P2 Node子进程，未减少覆盖。该证据只证明P2候选自动化门当前通过，不代表P1 advance、P4–P7全量门、性能、设备、真人、资产批准或发布通过。
- SF-DG.INT.1 跨阶段集成证据（2026-08-25，基线`03a7ceff`）：首轮P2 gate的boundary与52包构建通过，但`arena-mode-verification-runtime-factory-v1`遗漏Runtime当前必填的`localJumpAvailability`，导致55/56文件、516/531项；验证Authority现从同一权威Frame的phase、本地participant状态、hitstun、respawn与grounded事实投影start/step/restore能力，未知空跳保持false，不把Runtime合同降级为optional或伪常量。最终P2 gate再次通过：boundary、52包/11波、Vitest`56/56`文件与`531/531`项、Node`59/59`（5940 tick连续/恢复长跑）。A2正向checker（33个审计source）、44项fail-closed、13个Vitest文件/122项及Web Audio Node`9/9`均通过；typecheck、文档与diff复验见本批最终记录。该证据不打开默认入口、正式资产、浏览器、设备、性能、真人或发布门。
- 目标：严格执行[生产化分阶段开发与治理计划](arena-v2-production-development-plan.md)的 P2，把 1v1、2–4 人竞速和单人生存从研究原型迁入同一正式 Mode/MatchCore。
- 前置红门：P1整体尚未取得独立`advance`；PA6正式CPU ABBA×3、PA7正式300/120、设备、真人和美术外部门继续延期且`formalGate=false`。
- 权限边界：按[ADR-119](../decisions/119-arena-v2-continuous-development-with-deferred-gates.md)连续开放P2后续与P3-P6生产不可达候选开发；默认Registry、生产Composition、三端入口、正式阶段完成、commit和push仍由主协调独立签核，不因开发授权自动开放。

### 2026-08-10 开发优先条件实现窗口

- 当前冻结起点：分支`feature/arena-v2-design-docs`，HEAD `524a5dc0a21fd6f3cc8c7058168b9d2b664e6a64`；ADR-118治理修改后形成新的dirty候选，旧PA6/PA7 source identity不得复用。
- 用户明确要求不等待验证、测试或压测，无法立即执行的门禁统一顺延，以开发为主；该授权不把任何门写成通过。
- 当前已从P2.0顺序推进到P2.5h静态候选：`ModeMatchRuntimeV6`除新局主链外已新增复合runtime checkpoint、Race/Survival/Duel driver恢复和world-authority同步恢复端口，并统一终局authority tick `T`与post-step read frame tick `T+1`；实际Mode Driver身份现同时进入中局Checkpoint V3、开局Admission V2和终局Runtime结算证据V2。P2.6 factory的三模式continuous/restored完整逐字段等价检查代码也已落盘。对应测试、类型、构建与运行证明仍未执行；现有V5 Duel默认链和三端产品入口没有切换。
- 允许编写测试和恶意输入夹具但不要求运行；交接必须标记`deferred-by-ADR-119`并提交七维静态自检、精确diff和回滚边界。
- P2.0-P2.5h的Definition、合同、独立Mode System、Assignment/Product/Session/Replay、新局与中局恢复runtime已到达静态候选状态；P2.6真实runtime factory现在对每局分别执行continuous基线链与精确一次checkpoint→旧实例销毁→新实例恢复的restored链，二者完成完整input/event/Replay V6/ModeCheckpoint V2/result/final identity逐字段闭合后才进入聚合。测试、构建、压力与性能仍统一顺延；ADR-119允许P3-P6生产不可达开发继续，但不表示P2通过。
- P2.5g新增不升级Result V3或Replay V6 schema的严格结算证据信封：Result终局权威字段、模式/seed、参与者/角色/slot、modeResult和Replay事件重建的武器使用摘要必须完全闭合，证据信封保存真实`replayIdentityHash`并生成独立settlement evidence hash。三模式runtime、Authority Session和Mode Product Session仅在终局导出完整Replay；默认Product Composition和入口仍断开，测试、类型、构建与三模式运行矩阵均顺延。
- P2.5h按ADR-123把实际Mode Driver身份贯通开局与终局：Runtime在`created`状态公开标准化Driver hash，正式Quick Match在Session所有权转移前签发Admission V2；终局Runtime证据V1和Product结算证据V2再次携带同一hash，Registry注册结算V2要求二者精确相等。每局Driver hash不进入静态Registry白名单，V1 Admission/Replay结算保留兼容；默认Registry、Composition与入口仍断开，全部运行验证顺延。
- ADR-120把P3 shared-world已存在的首次复活60 tick等待、30 tick保护从Runtime私有常量收敛到`arena-product-content`唯一Respawn Policy候选；两张KZ路线注册同一语义safe anchor并绑定各自安全首段，三模式Registry拒绝完整Policy hash漂移。该候选仍未运行、未获平衡批准，不开放默认Registry、Composition或入口。
- ADR-121把Race真实纵向Runtime既有180 tick等待、30 tick保护与双地图公共fallback锚收敛到同一Respawn Policy候选；2–4人独立起跑格继续只负责开局，规则fallback不再借用participant起跑格。Race hard-limit仍未冻结，候选未运行、未获保护平衡批准，也不开放默认Registry、Composition或入口。
- ADR-122新增Runtime Checkpoint V3：完整嵌套V2并绑定标准化Mode Driver内容hash。Duel取经Resolver标准化的完整Policy Bundle，Race/Survival取经Mode System标准化的fixture；V3恢复在读取替换world authority前完成Mode内容预检。P2.6三模式continuous/restored工厂已迁移V3，V1/V2继续只作兼容与历史窄能力；未运行任何验证。
- 美术线程只开放A2.0事件/projection/Cue/回退草案，不生成或替换正式资产字节。

### 当前source identity与越权写入复核

- 当前候选基线：分支`feature/arena-v2-design-docs`，起始HEAD `524a5dc0a21fd6f3cc8c7058168b9d2b664e6a64`；工作树是未提交候选，不是可发布source identity。
- 当前已存在`ModeDefinition`、V6/V3合同、通用Mode Core、Duel/Race/Survival独立系统、Assignment/Content、QuickMatch/Session端口、新局/中局恢复Mode runtime、Result/Reward、Replay/Checkpoint、真实无渲染factory、回归验证与显式Product Composition候选；它们均为ADR-118/119允许的生产不可达版本化实现。运行、构建与压力闭环仍未完成，不能把静态候选外推成P2主链已经通过。
- 现有P1权威、Bot、Presentation、runner与大量测试仍处于同一dirty source identity；P2不得借共享文件已修改而“顺手接入”。后续每个线程必须提供自己的起止fingerprint和精确patch，主协调按写域拒绝重叠。
- 2026-08-10仅使用当前Arena项目的同目录开发线程完成P2.1-P2.4、Replay/Checkpoint及Replay V6回归候选；未联系、读取或修改其他项目。各批均未运行test/typecheck/build/performance，不能把静态交接写成自动化通过。

## 起始代码独立审计结论（历史基线）

P1 生存供给组合已经是生产 Rule/Core/Bot/Presentation read model 证据，但它不是完整 P2 生存 Mode。当前正式代码仍有以下结构缺口：

| 现状证据 | 已证明 | P2 缺口 |
|---|---|---|
| `packages/arena-match/src/match-config.ts` | schema v5、固定 tick、地图、装备与角色分配均有严格校验 | `participantIds.length === 2`，没有 Mode Definition/Registry、队伍、模式终局或模式重生策略 |
| `packages/arena-match/src/match-participant-system.ts` | 生命、淘汰、重生、命中归因和二人超时胜负由单一系统写入 | 构造器要求恰好两人，超时只比较前两名；无法表达2–4人竞速排名或玩家与有界敌人的角色关系 |
| `packages/arena-definitions/src/map-definition.ts` | 地图表面、出生点、供给点和整数tick事件是不可变 Definition | 没有竞速终点、路线进度、最近合法安全重入锚点或 Mode 适配引用 |
| `packages/arena-match/src/match-timeline-system.ts` | preparing/running/sudden-death/ended 与单一 winner/draw 结果确定性推进 | 没有按模式组合的倒计时、排名完成、生存时间/轮次或第二次掉落终局策略 |
| `packages/arena-matchmaking/src/match-assignment.ts` | 单对手、单Bot难度和具名随机流稳定 | 固定一个 `opponent` 与 `player-2` Bot seed，不能表达竞速参与者或生存敌人 assignments |
| `packages/arena-product-contracts/src/product-match-result.ts` | Replay身份、内容与二元胜负结果有hash校验 | 固定单个 opponent；结果没有mode、ranking、survival duration/round等版本化字段 |
| `packages/arena-v1-composition/src/arena-v2-survival-supply-*` | P1供给时间线、原子替换、只读Bot供给观察已经进入生产组合 | 组合仍是玩家+单Bot供给压力，不实现第一次掉落复活、第二次终局、敌人刷新或临时等级 |
| `packages/arena-v1-experiment/src/arena-v2-*prototype.ts` | 竞速、生存、地图和等级假设有研究证据 | experiment 依赖不得进入生产 Mode、Replay、Session 或发布构建 |

结论：该历史缺口已由当前P2.0-P2.5版本化候选按Definition/Registry、通用参与者、Mode System与下游合同顺序覆盖；旧V5生产默认链仍保持原状，是否可替换必须等待P2.6验证。

## 固定目标架构

```text
Mode Definition / Registry
        ↓
MatchConfig + Participant Role Assignment
        ↓
Mode Policy Resolver（终局、排名、掉落、重生、时间线）
        ↓
MatchCore（唯一权威写入）
        ↓
Replay / Assignment / Result / Session
        ↓
Bot Observation / Presentation Events
```

硬性边界：

1. Definition 只含冻结数据；Registry 在组合阶段校验引用、参与者范围、队伍、终局、重生和内容兼容性。
2. Mode policy 只能生成候选/裁决结果，MatchCore 与现有权威 System 仍是状态唯一写入者。
3. Race、Survival、Duel 不复制三套 MatchCore；不得让 Session、Renderer、UI、Bot 或 Profile 推断胜负。
4. 所有时间均为整数 tick；模式随机只使用 match seed 派生的具名流。
5. 任意人数、Result、Replay、Assignment 或 snapshot 公共合同变化必须显式升级 schema，并提供历史拒绝或迁移策略。
6. `arena-v1-experiment`、Three.js、DOM、平台API、墙钟和未注入随机不得进入权威依赖图。

## P2.0 候选字段合同 v0.1（尚未签核）

本节把[ADR-112](../decisions/112-arena-v2-formal-mode-definition-and-policy-boundary.md)变成可审查字段。按ADR-118，P2.0a可据此实现生产不可达候选；开发A仍必须逐字段反证健壮性和扩展边界，发现必须增加万能字段、模式分支或第二权威时，应退回设计而不是直接编码。

### Mode Definition

| 字段 | 候选语义 | 必须拒绝 |
|---|---|---|
| `schemaVersion` | 初版精确为1 | 缺失、未来/旧版本、浮点或字符串版本 |
| `id` | 稳定非空Mode Definition ID | 空白、重复、运行时随机ID |
| `kind` | 严格判别`duel / race / survival`，只用于schema/result投影，不作为MatchCore分支入口 | 未知kind、大小写降级、缺失时默认Duel |
| `participantPolicyDefinitionId` | 角色、控制来源、队伍、总数和有界slot规则 | 未注册引用、人数范围不闭合、无界enemy集合 |
| `timelinePolicyDefinitionId` | preparation、active阶段、硬时限与Duel sudden-death规则 | 墙钟、负tick、hard limit不大于准备/阶段边界 |
| `objectivePolicyDefinitionId` | Duel终局、Race首个终点、Survival第二次掉落/计分 | UI/Session回调、自由字符串reason、无终局路径 |
| `eliminationPolicyDefinitionId` | 各role掉落后的计数、失活或终局候选 | 武器/Renderer直接淘汰、同role多写入者 |
| `respawnPolicyDefinitionId` | role级重生延迟、锚点策略和次数 | 原始任意坐标、墙钟计时、无效锚点静默回出生点 |
| `relationshipPolicyDefinitionId` | role/team间Targeting关系 | 敌人旁路命中、缺关系时默认hostile |
| `resultPolicyDefinitionId` | Duel/Race/Survival判别式结果投影 | 把Survival伪造成winner/draw、排名丢失并列事实 |
| `requiredMapCapabilities` | 唯一、稳定排序的能力ID集合 | 重复、未知能力、由Renderer补终点/锚点 |
| `equipmentSupplyDefinitionId` | Survival必须引用ADR-108正式供给；其它模式为显式`null`或注册引用 | 缺失语义、引用experiment、未注册供给 |
| `survivalPressurePolicyDefinitionId` | Survival引用有界enemy slot压力阶段；Duel/Race精确为`null` | 非Survival携带值、无界slot、把研究0/15/30/45秒当正式数值 |
| `survivalEquipmentTierPolicyDefinitionId` | Survival引用本局wave→等级专属Equipment Definition映射；Duel/Race精确为`null` | 运行时修改永久Definition、等级写Profile、用统一百分比万能缩放 |

`policyDefinitionId`只能由对应专属Registry解析；Definition不允许`parameters: unknown`、函数、class instance或外部可变对象。Registry组合必须在创建MatchCore前一次性验证引用闭包并生成内容hash，tick中不做全局查找。

### Policy Definition exact-key候选v0.1

所有Policy Definition共享且只共享`schemaVersion / id / contentVersion / modeKind`四个封套字段；`schemaVersion`初版为1，`contentVersion`为大于等于1的安全整数，`modeKind`严格为`duel / race / survival`并必须与引用它的Mode一致。以下表格列出的字段追加到共享封套，未列字段、getter/Proxy、函数、稀疏/循环数组、非有限数和不安全整数全部在组合前拒绝。Policy只含数据；行为由对应Registry绑定的具名Resolver执行，不把函数放回Definition。

| Policy | 追加exact-key | 嵌套exact-key与交叉约束 |
|---|---|---|
| `ParticipantPolicyDefinition` | `minimumParticipants / maximumParticipants / roles / controllerKindBounds` | role项精确为`modeRole / minimumCount / maximumCount / allowedControllerKinds / teamRule / slotRule`；`teamRule`判别联合仅`kind`或`kind / teamId`，`slotRule`仅`kind`或`kind / slotIds`。controller bound精确为`controllerKind / minimumCount / maximumCount`。role/count总和、controller上下限和slot池必须闭合；Duel固定2 competitor，Race固定2–4 competitor且至少1 human，Survival固定1 human player加1–4生产候选enemy Bot。schema测试可构造到16 enemy slots，但生产Definition当前不得超过4。 |
| `TimelinePolicyDefinition` | `preparingTicks / hardLimitTicks / suddenDeathStartActiveTick` | 均为tick安全整数；只有Duel允许非null sudden death且必须小于hard limit，Race/Survival精确为null。Race首版生产候选`preparingTicks=60`来自ADR-104；其它最终时限必须在各Mode内容门冻结，不能从研究墙钟复制。 |
| `ObjectivePolicyDefinition` | `objective` | `objective`判别联合：Duel精确`kind / timeoutPolicy`，首版timeout只允许`score-or-draw`；Race精确`kind / finishGateCapabilityId / validClaimEndPolicy / sameTickRankPolicy / hardLimitPolicy`，候选值固定`claim-tick / shared-rank-1 / no-finisher`；Survival精确`kind / terminalPlayerFallCount / hardLimitPolicy`，候选固定`2 / survival-time-cap`。 |
| `EliminationPolicyDefinition` | `roleDispositions` | 每项精确`modeRole / fallDisposition`，role唯一且完整；Disposition只允许`eliminate / count-for-objective / schedule-respawn / deactivate-slot`。Duel competitor=`eliminate`，Race competitor=`schedule-respawn`，Survival player=`count-for-objective`、enemy=`deactivate-slot`；Survival玩家是否重生/终局由fall count与Objective/Respawn共同裁决，不在Equipment或Renderer重复计数。 |
| `RespawnPolicyDefinition` | `rolePolicies` | 每项精确`modeRole / enabled / delayTicks / maximumRespawns / anchorPolicy / protectionTicks`；`anchorPolicy`判别联合仅`kind`、`kind / fallbackAnchorCapabilityId`或`kind / anchorCapabilityId`。Race competitor固定180 tick、无限次、`latest-valid-safe-anchor`，ADR-121将真实Runtime既有30 tick保护和双地图公共Race fallback锚收敛为生产不可达单一候选；Survival player最多1次，ADR-120将其收敛为`60 tick delay / 30 tick protection / 双地图同语义safe anchor`候选。两项平衡批准均为`not-run`；Duel与Survival enemy必须disabled。anchor与fallback均无效时失败关闭，禁止回世界原点。 |
| `RelationshipPolicyDefinition` | `selfTargeting / relations` | `selfTargeting`首版固定`forbidden`；每项精确`sourceRole / targetRole / relationship`，完整覆盖role笛卡尔积且不重复，relationship仅`hostile / ally / neutral`。Duel/Race不同participant的competitor互为hostile；Survival player↔enemy hostile、enemy↔enemy neutral。Targeting只读该矩阵，敌人不得旁路普通Rule。 |
| `ResultPolicyDefinition` | `resultKind / allowedReasons / projectionPolicy` | resultKind必须与Mode一致；Duel projection候选`winner-ids-draw`且reason集合只允许已登记的`last-participant-standing / simultaneous-elimination / timeout-score / timeout-draw`；Race候选`finish-then-progress-with-ties`且reason仅`finish-claimed / no-finisher`；Survival候选`ticks-stage-falls`且reason仅`terminal-player-fall / survival-time-cap`。运行错误、无效锚或schema失败不生成伪Result reason。 |
| `SurvivalPressurePolicyDefinition` | `slotActivationOrder / slotEntries / stages` | 只允许Survival引用。slot entry精确为`slotId / anchorCapabilityId`，与ParticipantPolicy enemy slot池一一对应；同一slot重激活继续使用同一入口锚并只增加generation，不引入随机入口Resolver。stage项精确`stage / startActiveTick / desiredActiveEnemySlots / reactivationDelayTicks`；stage从0连续、首项tick=0、tick严格递增、desired count非递减并受生产候选4/测试天花板16约束，activation order唯一且覆盖slot池。0/15/30/45秒研究值不冻结；生产stage tick、刷新延迟和入口锚必须在P2.4前另行签核。 |
| `SurvivalEquipmentTierPolicyDefinition` | `supplyDefinitionId / tiers` | 只允许Survival引用并严格绑定ADR-108/110供给。tier项精确`minimumWaveIndex / survivalLevel / variants`，首tier wave=0、threshold严格递增；variant项精确`collectionEquipmentDefinitionId / runtimeEquipmentDefinitionId`，同tier collection唯一。同一collection跨不同survivalLevel不得复用同一runtime ID，且runtime Definition/content hash必须不同；runtime ID必须是注册的等级专属Equipment Definition并继续引用等级专属Action Definition，不得运行时改写基础Definition。 |

组合关闭条件固定如下：

1. Registry先分别校验Definition，再由Mode组合器按`Participant → Relationship → Timeline → Objective/Elimination/Respawn → Survival Pressure/Equipment Tier → Result`顺序解析完整引用闭包；任一kind、contentVersion、role、slot、Map capability或Definition引用不一致均不发布MatchConfig。
2. Survival供给不能继续把P1静态`spawnSpecs.equipmentDefinitionId`跨所有wave复用。P2 V6在每个wave只读冻结的slot content与`SurvivalEquipmentTierPolicyDefinition`，生成精确`slotId / waveIndex / survivalLevel / collectionEquipmentDefinitionId / runtimeEquipmentDefinitionId / position`供给候选，其中`position`精确为`x / y / z`有限数；全部候选校验后才交EquipmentSystem原子spawn。该解析结果、tier policy hash及所有等级专属Equipment/Action Definition hash进入config/checkpoint/Replay V6与内容hash。
3. collection ID是局外收藏/熟练身份，runtime ID只是本局权威战斗Definition。Result可以记录当局使用过的collection ID，但不得把runtime tier、临时等级或临时数值写入Profile；奖励解析也不得读取Renderer文案。
4. 同一wave重复出现同一collection weapon是合法的，但必须解析到该wave所选tier的同一runtime ID；同Definition、seed、wave和slot content必须得到相同候选。缺variant、重复collection、跨tier回退、未注册Action、内容hash漂移或计算溢出均在spawn前失败关闭，不自动退回基础武器。
5. 本节冻结schema和失败语义，不伪造尚无证据的Survival respawn delay/protection、pressure stage tick、reactivation delay或最终武器成长数值。P2.4只能先使用显式test fixture；生产Definition必须通过地图/Bot/武器平衡小门后单独登记。

本轮主协调六维自检结论：健壮性上，九类Policy和引用闭包均在Core发布前exact-key校验；竞态/确定性上，enemy slot使用固定activation order与固定入口锚，wave tier按阈值纯函数解析；兜底/失败关闭上，缺锚、缺variant、hash漂移或数值未冻结均拒绝而不补默认；边界上，生产enemy候选4与测试天花板16分层，collection/runtime/Profile身份分离；生命周期上，slot generation、respawn次数与wave候选都进入checkpoint/Replay并在destroy清零；主流程上，已关闭“压力阶段无Definition”“临时等级只能运行时改基础武器”“开局倒计时无公开权威字段”三项设计阻断。仍缺开发A/B反证、failure injection和三模式实跑，故本自检不能把小门改绿。

2026-08-11实现补充：上述“开局倒计时无公开权威字段”已由独立`ArenaSupplyCadenceSnapshotV1`落实到代码。Equipment Supply Timeline从正式供给Definition生成下一波序号、tick、剩余tick和3把数量；Survival Authority将其写入初始/逐tick状态身份并在恢复时重建，Runtime V6与Session V3强制Mode/tick闭合，Duel/Race显式为`null`。该实现尚未运行测试、类型、构建、压力、性能或设备验证，不能据此将P2硬门改绿。

### P2.0c 权威数值冻结矩阵v0.1

本矩阵把“schema已定义”“产品语义已确定”“生产数值已冻结”“设备/真人已证明”分开。文档中的`null / unresolved`是治理状态，不是允许写入Definition的运行值；任何必需数值未冻结时，对应生产Definition必须不存在，不能把null、0、研究样本或现有Duel默认值塞入Registry。

| 数值/集合 | 当前治理状态 | 当前允许用途 | 生产冻结证据与负责门 |
|---|---|---|---|
| Duel参与者、preparing/sudden-death/hard-limit、生命与timeout | `existing-V5-frozen` | P2.2只做V6等价迁移与显式Mode绑定 | 开发A逐事件/checkpoint/final/result差分；任何数值变化须独立ADR，不属于P2迁移 |
| Race参与者2–4、同tick并列、`no-finisher` | `product-semantic-frozen` | schema/test fixture；不得开放生产入口 | P2.3无渲染2/3/4人、终点+fall置换、硬时限与Replay；A2/P5再验可读性 |
| Race开局倒计时60 tick | `research-backed-production-candidate` | P2.3 test fixture；projection必须发布60→0 | P2.3正确性与A2首见任务共同签核后进入生产Definition；不能因动画节奏自行改值 |
| Race重生等待180 tick与最近合法安全锚 | `product-semantic-and-value-frozen` | P2.3实现/测试候选 | 179/180/181、锚失效回退、finish+fall、重复掉落、Replay与P3地图重入；失败不改180 |
| Race重生保护tick与双地图fallback锚 | `source-candidate-30-code-written-not-run / protection-balance-approval-not-run` | ADR-121版本化Definition、两图Race专属语义锚、显式生产不可达Registry/Runtime；起跑格与fallback分离，默认Registry/Composition/Entry关闭 | 29/30/31、179/180/181、首帧掉落、latest锚失效、2/3/4人拥挤、A2可读性和P7真机；不得标记为最终平衡通过 |
| Race硬时限tick | `unresolved` | 仅测试最小/最大边界 | P3正式路线分布、2–4人完成率与真人放弃点；必须保证可触发`no-finisher`而非无限局 |
| Survival首波1200、间隔1200、每波3、地面生命周期600 tick | `P1-frozen` | P2.4必须复用ADR-108/110正式Definition | P1同源Replay/hash继续全绿；P2只增加tier解析，禁止重写供给顺序或墙钟 |
| Survival终局fall count=2 | `product-semantic-and-value-frozen` | P2.4实现/测试候选 | 0/1/2、同tick hit+fall、第一fall恢复、第二fall终局、Replay/Result全绿 |
| Survival首次重生delay/protection与合法锚 | `source-candidate-60/30-code-written-not-run / balance-approval-not-run` | ADR-120版本化Definition、两图同语义安全锚、显式生产不可达Registry/Runtime；默认Registry/Composition/Entry仍关闭 | 59/60/61、29/30/31、双地图恢复、保护期受击、Replay/Checkpoint、敌人入口距离、A2因果与真人“复活后下一目标”；不得标记为最终平衡通过 |
| Survival pressure stage起点、目标敌人数、slot重激活delay、固定入口锚 | `unresolved` | test fixture可覆盖1/2/4与schema 16，不得称生产平衡 | P2.4正确性→P2.6资源/4/8/12/16→P3地图/Bot压力→A2遮挡/真人；研究0/15/30/45秒不直接采用 |
| Survival enemy schema/实现/已证明/首发上限 | `16 / 4 / null / null` | schema恶意矩阵到16；生产候选不得注册>4 | P2.6填engine safe；P3/A2/P7填launch，详见三层上限矩阵 |
| Survival tier等级节点、wave阈值与逐武器成长字段/数值 | `schema-frozen / values-unresolved`；1/5/10仅研究 | test fixture必须使用等级专属Equipment/Action Definition与独立hash | P4逐武器平衡、地图后果、饱和/风险与真人数值理解；不能用统一百分比或只改展示数值 |
| Survival技术硬时限 | `unresolved` | test fixture可强制`survival-time-cap`路径 | P2.4长局完成、P2.6soak/资源、P7目标设备；必须有限且不宣称“胜利” |
| Duel/Race/Survival completion、winner/draw/rank/stage经验 | `schema-frozen / values-unresolved` | P2.5只用显式test Reward Definition | P6 Profile V2/容量与公平门前不进入生产内容；不得从usage、临时tier或等待时长直接膨胀经验 |

为提高开发效率但不降低目标，ADR-118自2026-08-10起允许P1独立`advance`前连续形成P2.0-P2.5“生产不可达候选”：允许主协调导出显式版本化合同，但禁止接入default Registry、生产Composition或三端入口，并须保留测试设计、静态七维自检与精确回滚边界。P2.3/P2.4生产内容小门、P2总门、性能/设备/真人证据与用户入口继续等待本表对应证据。任何把test fixture或未决数值复制到生产Registry、或把延期验证写成通过的做法，直接判治理与主流程双红。

### Participant Assignment V2

每个assignment使用精确字段：`participantId / modeRole / teamId|null / controllerKind / characterDefinitionId / slotId|null / slotGeneration`。数组按`participantId`规范排序但不得用该顺序决定胜负；`slotGeneration`为非负安全整数，普通Duel/Race participant固定0，Survival enemy每次重新激活单调增加。

组合阶段必须拒绝：重复participant/slot、role与Mode不符、controller未注册、team关系不闭合、Character不在内容池、enemy generation回退/跳过已占slot、人数少于/超过Definition、访问器/Proxy/sparse/cycle和构造期间Registry变化。不得自动补`player-2`、单一opponent或默认enemy。

### Internal Mode State

| Mode | 未来相关最小状态 | 明确不进入 |
|---|---|---|
| Duel | policy identity及当前模式阶段；生命/命中仍由Participant/Rule已有System持有 | 复制participant生命、复制突然死亡时钟 |
| Race | 每participant的`state`、最近安全`anchorId`、权威`progressOrdinal`、`finishTick|null`、并列rank；终局原因 | Renderer坐标历史、墙钟、UI动画进度 |
| Survival | player `fallCount`、`survivedTicks`、`pressureStage`，每个enemy slot的active/generation；终局原因 | 永久收藏、表现对象、无界敌人列表 |

Mode state必须进入config/checkpoint/state/final hash和Replay V6；快照只发布冻结的最小投影。任一内部字段如果会影响未来终点、重生、刷新或终局却不进入hash，P2.0直接判红。

### Product Match Result V3

共享封套固定`schemaVersion / modeDefinitionId / matchSeed / authorityIdentity / content / participantAssignments / participantEquipmentUsage / modeResult / publicParticipants / authorityHash`。其中`participantAssignments`只保留影响权威结果的ID/role/team/slot generation并进入hash；`participantEquipmentUsage`与`modeResult`进入authority hash；`publicParticipants`承载显示名、头像和外观等非权威信息，不进入authority hash。`modeResult`是exact-key判别联合：

- Duel：`kind / winnerParticipantIds / isDraw / reason / endedAtTick`；现有单胜者投影可由长度1派生，不能反向作为权威。
- Race：`kind / winnerParticipantIds / rankings / reason / endedAtTick`；ranking项至少含participant、rank、finishTick或未完成、终局progress，真实并列共享rank。
- Survival：`kind / playerParticipantId / survivedTicks / pressureStage / fallCount / reason / endedAtTick`；没有虚构winner/draw。

所有participant引用必须来自Assignment；winner必须是rank 1且有合法finish claim；`no-finisher`不得拥有winner；Survival `fallCount`不得超过Definition终局阈值。authority hash覆盖完整判别payload，opponent展示信息不参与权威结果。

`participantEquipmentUsage`必须为与Assignment一一对应、按participantId规范排序的数组，每项exact-key为`participantId / usedCollectionEquipmentDefinitionIds`。武器ID数组按稳定字符串升序、唯一且受当局冻结content pool上限约束；只有Core已接受的`ActionStarted`在该participant持有对应runtime Equipment Definition时，才把其collection ID计为“使用过”。仅生成、看见、靠近、拾取、预测输入、被规则拒绝的攻击或Renderer播放动画均不计入。Duel/Race基础装备由冻结content映射到collection ID；Survival tier runtime必须经`SurvivalEquipmentTierPolicyDefinition`反解到collection ID，缺映射或同runtime映射多个collection时在Result发布前失败关闭。

该摘要只关闭“本局使用过的武器”与未来最小熟练输入，不声称完成P6。P2 `ModeMatchRewardDefinition V2`仍只消费模式完成/胜平/名次/pressure stage，不按usage发永久战斗数值；P6必须另行升级Profile schema并定义地面、空中、边缘、反制、生存等上下文计数、迁移和容量证据。不得把P2的唯一ID数组换算成200小时或伪造“已理解”。

### P2.0b 下游调用方与schema迁移矩阵（只读预审）

2026-08-02对当前生产链的只读审计确认：二人假设不只存在于MatchCore，而是贯穿内容选择、匹配、公开信息、Result、Session端口、奖励与表现校验。P2.0若只冻结Mode/Result字段而不冻结以下调用顺序，后续会在主流程中形成循环依赖或把Race/Survival错误解释成Duel。

推荐的单向构造顺序固定为：

```text
Mode request
  → roster assignment（participant/role/team/controller/slot，不含角色内容）
  → mode-aware content pool（地图/装备/participant character映射）
  → finalized participant assignments
  → MatchConfig V6 / MatchCore
  → Replay V6 / Product Result V3
  → mode-aware reward projection
  → Session；Presentation只在对应模式合同已接入后开放入口
```

不得让内容池反向创建权威participant，不得让MatchCore补`player-2`，也不得让公开Opponent资料参与authority hash。roster与content在创建Core前必须互相精确核对participant集合、Mode和地图能力；任一不一致都在发布资源前失败关闭。

| 当前生产调用方与证据 | 现有固定假设 | P2候选迁移与验收 | 未来写域 |
|---|---|---|---|
| `arena-contracts/match-content-selection.ts` | schema v1没有Mode；只绑定participant→character | 增加显式MatchContentSelection v2：绑定`modeDefinitionId`与finalized roster的完整participant集合；v1继续走历史validator/hash，禁止缺Mode默认Duel | 开发A，P2.0b独立小门 |
| `arena-product-content`的Pool/Provider/Resolver | resolve只收`matchSeed`/Profile；固定生成player与opponent两条character映射 | FrozenMatchContentPool v2与resolver输入接收冻结roster projection；Mode筛选地图能力和角色集合，返回集合必须与roster精确相等；构造/重入/异步返回继续失败关闭 | 开发B，合同冻结后 |
| `arena-matchmaking/match-assignment.ts` | 单个`opponent`、单Bot难度、`player-2`具名seed | 分离roster assignment、public participants与finalized authority assignment；每个Bot/slot使用从match seed派生的具名流，调试覆盖不得改变其它流 | 开发B |
| `arena-quick-match/quick-match-service.ts` | Core必须严格`player-1/player-2`；只创建一个BotController和一个`botId` | 改为Mode驱动的有界controller集合与Local human identity；创建失败按逆序清理全部已拥有controller/Core/Session，禁止少一个Bot时降级开局 | 开发B |
| `arena-session/local-match-session.ts`与Bot read bundle | 单Bot controller、单local/单bot ID | Session消费冻结controller registry/assignment，不拥有Mode判定；pause/resume/destroy遍历稳定顺序且部分失败可重试，结束后不再提交任何controller输入 | 开发B |
| `arena-product-contracts/product-match-result.ts` | v2固定单个`opponent`与winner/draw | Product Result v3采用判别式mode result、`participantEquipmentUsage`与`publicParticipants`；公开资料不进authority hash，assignment/usage/mode result必须进hash；usage只记录已接受ActionStarted对应的collection ID且不直接发永久战斗数值；v2保留独立validator | 开发B |
| `arena-product-match` Runtime/Coordinator/ports | local match exact-key含`opponent`；public info exact-key为seed/opponent/content；snapshot schema v1 | ProductPublicMatchInfo v2与Coordinator snapshot v2携带Mode和public participants；V6局只接受MatchReadFrame/World/SupplyProjection V3并逐字段核对collection/runtime/tier身份，Runtime不推断排名或生存结果；任一历史/新schema混用失败关闭 | 开发B |
| `arena-product-session` Controller/ports | 端口exact-key复验旧public info和Product Result v2 | 版本化端口同时保留历史读取路径；active match固定单一schema identity，rematch不得复用上局Mode/roster/result；奖励失败不释放可重试结果，fatal后不可继续比赛 | 开发B |
| `arena-progression`与`arena-product-progression` | Reward Definition v1只有completion/winner/draw；resolver直接读取`winnerId/isDraw` | 增加mode-aware Reward Definition/Resolver版本：Duel胜平、Race有效完赛/名次、Survival存活区间分别投影，但仍只生成一个幂等grant；`authorityHash`继续防重复，临时武器等级绝不写Profile | 开发B |
| `arena-regression` golden manifest/verifier | manifest只保存`winnerId/reason/endedAtTick` | 新manifest版本保存判别式mode result摘要、mode state/checkpoint identity；历史V5 manifest逐字保持，V6按Mode双跑事件、checkpoint和final hash | 开发B |
| `arena-product-presentation` Runtime/ViewModel/Canvas | 默认local=`player-1`、opponent=`player-2`；只接受单对手与win/lose/draw；Canvas只画1v1 VS | 不属于P2首轮权威写域。P2总门前，Race/Survival生产入口必须保持显式关闭；P5/A2接入public participants、ranking/survival summary和稳定Cue后再开放，表现不得临时把其转换成Duel | 后续表现批次，非P2并行写域 |

P2.0b冻结前必须回答并形成测试的四个问题：

1. roster assignment先于content selection，finalized assignment后于content selection；三个对象各自的schema、hash范围和唯一写入者必须明确，不能循环调用。
2. `modeDefinitionId`必须进入MatchContentSelection v2、Frozen pool v2、MatchConfig V6、Replay V6、Product public info v2和Product Result v3的一致性检查；任一链路缺失即红。
3. 本地可控participant ID来自assignment/composition，不再由Presentation或Session默认为`player-1`；P7真人接入只能替换controller kind，不改变Mode结果语义。
4. 在P5表现合同未完成前，生产Mode选择页只能开放Duel；Node测试中能完成Race/Survival不等于用户主路径已开放，也不能宣称P2发布通过。

### V6 权威事件候选

V5事件常量与payload保持历史验证路径。V6优先复用确实同义的`MatchStarted/Equipment*/Action*/HitResolved/KnockbackApplied/MatchEnded`；对于不同语义新增而不滥用`PlayerEliminated`：

| 事件 | 权威用途 | 禁止用途 |
|---|---|---|
| `ParticipantFell` | 记录物理越过killY的participant、role、tick和mode identity | 直接代表终局或表现层自行增加fall count |
| `ParticipantRespawnScheduled` | 记录readyTick、anchorId、reason和slot generation | 使用墙钟或原始任意坐标 |
| `ParticipantRespawned` | 记录权威重生提交及invulnerability | 由动画结束触发 |
| `RaceSafeAnchorCommitted` | 记录MapSystem确认的anchor与progress ordinal | 每帧位置遥测或Renderer checkpoint |
| `RaceFinishClaimed` | 记录有效终点claim、finishTick和并列组 | UI碰撞、客户端先到时间 |
| `SurvivalEnemySlotChanged` | 记录slot active/inactive、generation和原因 | 动态无界participant创建 |
| `SurvivalPlayerFallCounted` | 记录第一/第二次fall count及后续候选 | 武器、Bot或Profile写入计数 |

`MatchEnded`携带或引用完整V3 mode result；相同tick事件按固定phase，再按participant/slot ID稳定序列化，但ID顺序不得破坏Race并列。是否合并候选事件由P2.0最小事件审查决定，任何删除都必须证明现有事件能表达完全相同的权威事实。

#### V6模式事件exact-key候选v0.1

沿用当前权威事件公共封套`id / sequence / tick / type`；以下是新增模式事件及V6扩展既有事件的全部额外字段，生产validator必须逐类型`assertKnownKeys`，不能接收额外字段、getter、symbol或`undefined`。可空语义一律显式使用`null`，不能靠缺字段表达。

| type | 精确额外字段 | 关键一致性 |
|---|---|---|
| V6 `ActionStarted` | `participantId / action / sourceKind / equipmentInstanceId / runtimeEquipmentDefinitionId / collectionEquipmentDefinitionId / survivalLevel` | `sourceKind`仅`base-action / equipment`。base时四个equipment/tier字段全为null且不计usage；equipment时三个ID均非null，action必须等于runtime Equipment Definition的地面或空中Action引用，collection映射在当局content唯一。只有Survival tier允许正安全整数level，其它Mode精确为null |
| V6 `WeaponFeedbackResolved` | `kind / attackerId / targetId / actionDefinitionId / actionStartedTick / firstHitTick / targetFallTick / initialSupportSurfaceId / finalSupportSurfaceId / fallCause / creditedAttackerId` | P4.4a只读因果结果；五类kind由Rule/Core完成后的命中、支撑面与掉落归因解析，Presentation不得重判。Runtime校验所有非null participant身份属于当前assignment；本事件不改变Equipment Usage或Mode结果 |
| `ParticipantFell` | `modeDefinitionId / participantId / modeRole / slotId / slotGeneration / fallCause / creditedAttackerId / supportSurfaceId` | `fallCause`仅`credited-hit / movement / environment`；仅`credited-hit`允许非null attacker；非enemy的slot字段必须为null |
| `ParticipantRespawnScheduled` | `modeDefinitionId / participantId / modeRole / slotId / slotGeneration / readyTick / anchorId / reason` | 只用于Race/Survival；`readyTick>=tick`；Race固定`readyTick=tick+180`；anchor必须在当局Map capability闭包中 |
| `ParticipantRespawned` | `modeDefinitionId / participantId / modeRole / slotId / slotGeneration / anchorId / invulnerableTicks` | 只用于Race/Survival且event tick必须等于已发布的readyTick；slot/generation与schedule一致；不得由动画完成触发；Duel继续复用既有`PlayerRespawned`语义 |
| `RaceSafeAnchorCommitted` | `modeDefinitionId / participantId / anchorId / progressOrdinal` | ordinal只能单调不减；重复同anchor/ordinal不发新事件；anchor必须已启用且路线合法 |
| `RaceFinishClaimed` | `modeDefinitionId / participantId / finishTick / progressOrdinal` | `finishTick===tick`；每participant只允许一次；同tick多个claim在Result共享第一，不按sequence拆分 |
| `SurvivalEnemySlotChanged` | `modeDefinitionId / participantId / slotId / previousGeneration / generation / active / anchorId / reason` | 激活时generation精确+1且anchor非null；失活时generation不变且anchor为null；participant/slot映射固定 |
| `SurvivalPlayerFallCounted` | `modeDefinitionId / participantId / fallCount / terminalFallCount / terminal` | 生产Definition固定terminalFallCount为2；`terminal === (fallCount>=terminalFallCount)`；不能由Profile或表现递增 |
| V6 `MatchEnded` | `modeDefinitionId / modeResult` | `modeResult`必须逐字等于Product Result V3进入authority hash的判别payload；它是该tick最后一个模式事件 |

V6 `MatchStarted`在既有`participantIds`之外增加`modeDefinitionId`，且participant集合必须等于finalized assignments。V6 `ActionStarted`由MatchCore在Rule已接受动作且持有runtime身份仍一致时富化；不得由InputFrame、Action候选或Presentation提前生成。P4.4a又增加`WeaponFeedbackResolved`静态候选，它只能由完成后的Rule/Core因果快照生成，保留时序、支撑面和归因攻击者，并继续保持`not-run / production-unreachable`。旧V5事件封套和payload不修改；validator根据Replay schema选择V5或V6，禁止让同一事件对象同时通过两代validator。

同tick模式phase候选固定为：现有供给`spawn→expire→pickup→action`与普通hit/knockback/physics完成后，先收集安全锚/终点/fall候选，再由Mode resolver一次裁决；事件发布顺序为`safe-anchor→finish-claim→fell→fall-count/slot-change→respawn-scheduled/respawned→MatchEnded`。同participant有效finish claim压过同tick fall，因此不发布该participant的`ParticipantFell`或respawn；终局成立后禁止激活slot或安排respawn。每一组内只按participantId/slotId稳定序列化，排序只影响字节顺序，不改变并列、rank或胜负。

#### MatchReadFrame V3与装备公开身份exact-key候选v0.1

P2不向现有MatchReadFrame V2、`WorldParticipantSnapshotV2.equipment.definitionId`或`ArenaPublicSupplyProjection schema v2`追加可选字段；V5/P1继续只读使用V2。V6 Mode正式写入独立MatchReadFrame V3，顶层profile/authority identity沿用V2语义但`schemaVersion=3`，其WorldSnapshot增加`modeProjection`并把装备公开身份升级为以下exact-key：

- participant持有装备为null或`instanceId / runtimeEquipmentDefinitionId / collectionEquipmentDefinitionId / survivalLevel / cooldownRemainingTicks`。Duel/Race基础装备的collection与runtime ID必须等同且level为null；Survival tier必须映射到当局tier policy，level为正安全整数。
- world equipment每项在既有位置/owner/revision事实外使用`runtimeEquipmentDefinitionId / collectionEquipmentDefinitionId / survivalLevel`，不再暴露含义模糊的单一`definitionId`。同一instance在world、participant held、事件和供给projection出现时三项身份必须完全一致。
- `ArenaPublicSupplyProjection V3`顶层exact-key为`schemaVersion / modeDefinitionId / snapshotTick / snapshotEventSequence / resyncReadiness / pendingAuthorityTick / pendingExpiryEquipmentInstanceIds / supplies`。每个supply项精确为`schemaVersion / supplyDefinitionId / tierPolicyDefinitionId / supplyId / slotId / waveIndex / survivalLevel / collectionEquipmentDefinitionId / runtimeEquipmentDefinitionId / equipmentInstanceId / equipmentSpawnId / spawnPosition / spawnTick / expireTick / remainingTicks / position`；position仍精确`x / y / z`，最多3项，生命周期、599/600/601与pending readiness语义逐字复用P1，不改spawn→expire→pickup→action。

V3 consumer必须同时验证Mode、tier policy、wave、slot、collection/runtime、instance、tick/eventSequence与World equipment双向完整性；缺一项、跨wave tier、同instance身份漂移、future schema或V2/V3混用均使整个read frame失败关闭。Presentation不得解析Definition ID字符串推断level，也不得从波次、颜色、音效或当前属性反推collection身份。供给/持有正式资产加载失败只改变fallback glyph/文字，不改变上述权威身份。

##### MatchReadFrame/SupplyProjection V3身份一致性强制测试矩阵

以下矩阵是P2.1/P2.4/P2.5的共同硬门，不允许由单一happy path、类型检查或最终hash替代。开发A负责权威合同、frame生成和Replay重建；开发B只在Product/Session边界消费已冻结合同并验证，不能复制validator或重新推断身份。

| 场景 | 必须成立 | 红门 |
|---|---|---|
| V2/V3版本隔离 | V5局只生成/接受V2，V6局只生成/接受V3；future schema和同一对象混合两代字段在权威变更前拒绝 | 给V2追加可选tier字段、缺version默认V2/Duel、Product容忍混用 |
| held/world/projection三方闭包 | 同一`equipmentInstanceId`出现于任两处时，runtime、collection、level逐字段相同；projection中的活动供给与world equipment双向集合相等 | 只做单向存在检查、同instance身份漂移、缺项后隐藏局部继续运行 |
| 唯一性与恶意输入 | instance、spawn、supply、slot、wave身份唯一且有界；extra key、duplicate、恶意getter/Proxy、NaN/Infinity、非安全整数均拒绝 | 后项覆盖前项、字符串解析ID、调用方对象被保留后可变 |
| 非Survival与Survival tier | Duel/Race的collection=runtime且level=null；Survival的正整数level可经当局tier policy唯一映射回collection/runtime variant | 非生存出现level、缺variant回退基础武器、运行时改基础Definition |
| 599/600/601生命周期 | P1既有spawn→expire→pickup→action顺序与pending readiness逐字保持；V3只增加身份，不改变expireTick和竞争裁决 | V3改写P1时序、expire与pickup双成功、pending项被当成可拾取 |
| 拾取/替换/动作摘要 | 只有Rule接受且持有身份一致的equipment `ActionStarted`进入Result usage；base action所有装备字段为null且不计入usage | 候选/预测/动画计入、仅拾取即计入、level或runtime缺失仍发布事件 |
| wave/tier切换 | 每个wave候选的slot/wave/level/collection/runtime/position进入config、checkpoint、Replay与hash；同collection不同level使用不同runtime ID/hash | 跨wave复用旧runtime、checkpoint恢复后tier漂移、只存最终属性值 |
| 同tick置换 | spawn/expire/pickup/action、fall/respawn/terminal的合法置换得到相同事件、frame、usage与final hash | 依赖Map迭代或consumer调用顺序、终局后仍发布slot/装备变化 |
| reader生命周期 | pause不制造新frame，resume继续同一权威tick序；destroy/失败关闭后旧reader失效，迟到consumer不能重新挂载 | stale frame跨局可读、destroy后返回最后一帧、失败后继续奖励 |
| restore/rematch身份 | 序列化恢复逐字段重建同一V3；rematch必须获得新Mode/seed/assignment/instance集合，不复用旧frame/projection/usage | 复用上局instance、只换seed不换identity、恢复时按ID字符串猜tier |
| 边界规模 | 0/1/3个供给、1/2/4与schema 16敌slot、30分钟等效长局均保持集合和资源公式有界，destroy后归零 | 第4个供给静默截断、slot随wave增长、监听器/reader/事件窗泄漏 |
| 下游失败关闭 | ProductPublicInfo、Result、Session、Reward任一Mode/participant/equipment identity不一致时整条新schema路径拒绝；历史V5路径不漂移 | UI局部纠正权威事实、Reward忽略身份错配、Race/Survival降级Duel |

最小确定性套件必须对每个有效case执行同seed双跑，并对participant顺序、slot顺序、controller采样顺序和对象插入顺序做置换；比较完整事件字节、checkpoint、Replay V6、MatchReadFrame V3、Result V3、state/final/authority hash。负向case必须证明拒绝发生在权威状态、Profile或Presentation sink提交前，并验证所有已创建资源逆序释放。

#### MatchRead ModeProjection exact-key候选v0.1

P2 MatchReadFrame V3在WorldSnapshot增加唯一`modeProjection`数据字段。公共字段精确为`schemaVersion / modeDefinitionId / revision / preparationRemainingTicks / state`；`state`是以下判别联合，底层未来相关状态必须进入checkpoint/state/final hash，read projection本身只是冻结投影：

- `preparationRemainingTicks`在Timeline处于`preparing`时精确等于`max(0, preparingTicks - tick)`，其它phase精确为`null`。它由Core从唯一Timeline状态投影，不成为MatchModeSystem的第二写入状态，也不复用现有表示active hard limit的`WorldSnapshot.remainingTicks`。这关闭了Race表现层从墙钟、动画时长或不可见MatchConfig猜测60 tick开局倒计时的缺口。

- Duel state精确字段：`kind / suddenDeath`。
- Race state精确字段：`kind / finishGateId / participants`；每个participant项精确为`participantId / status / safeAnchorId / progressOrdinal / respawnReadyTick / finishTick / rank`。`status`仅`racing / respawning / finished`；可空字段显式null；并列使用相同非null rank。
- Survival state精确字段：`kind / playerParticipantId / fallCount / terminalFallCount / survivedTicks / pressureStage / enemySlots`；每个slot项精确为`slotId / participantId / active / generation / anchorId`，inactive时anchor必须为null。

projection不包含显示名、颜色、glyph、资产key、Renderer坐标历史、音频状态或Profile收藏。数组分别按participantId/slotId规范排序；`revision`只在上述权威状态或`preparationRemainingTicks`改变时递增。frame的modeDefinitionId、MatchConfig V6、Replay V6和Product public info v2必须完全相等，`preparationRemainingTicks`必须与Timeline tick/config逐tick一致，否则Session/Product/Presentation端口失败关闭。

#### ProductPublicMatchInfo V2 exact-key候选v0.1

公开比赛信息精确字段为`schemaVersion / modeDefinitionId / matchSeed / localParticipantId / content / participantAssignments / publicParticipants`：

- `participantAssignments`只公开`participantId / modeRole / teamId / slotId / slotGeneration`，必须与authority assignment和content participant集合一一对应；不公开Bot难度、行为seed或隐藏计划。
- `publicParticipants`每项精确为`participantId / displayName / portraitKey / appearanceKey / identityOrdinal / identityGlyphKey / identityPatternKey`。这些字段不进入authority hash，但必须按participantId唯一并与assignment集合相等；identityOrdinal在当局唯一、稳定且从1开始，颜色不能成为唯一身份字段。
- `localParticipantId`必须来自assignment中唯一local controller绑定；不得由Session、Product或Presentation默认成`player-1`。无本地玩家的纯审计/回放使用独立audit public-info schema，不能塞`null`绕过生产合同。

Product Result V3复用同一`publicParticipants`快照并逐字段核对当局公开identity；rematch必须创建全新public info，不能保留上局Mode、ordinal、glyph或participant集合。公开资料加载失败只允许表现层用基础glyph/文字兜底，不能改变assignment、Result或奖励。

#### ModeMatchRewardDefinition V2 exact-key候选v0.1

奖励Definition不再固定`participantId='player-1'`，也不把Race/Survival伪装成winner/draw。共享字段精确为`schemaVersion / id / contentVersion / modeDefinitionId / completionExperience / policy`；Progression Registry必须拒绝同一modeDefinitionId注册多个生产奖励Definition。`policy`是exact-key判别联合：

- Duel：`kind / winnerBonusExperience / drawBonusExperience`。
- Race：`kind / finishBonusExperience / rankBonuses`；每个rank项精确为`rank / experience`，rank仅允许1–4、唯一并升序。同rank并列获得同一bonus；未完赛者没有finish/rank bonus，不能用终局progress伪造名次奖励。
- Survival：`kind / stageBonuses`；每项精确为`minimumPressureStage / experience`，阈值唯一并升序，只取已满足的最高一档而不累加；不读取临时武器等级、表现敌人数或墙钟。

Resolver输入精确为`registry / profileDefinition / profile / result / recipientParticipantId`。recipient必须存在于Result V3 authority assignment，且等于Product public info v2的localParticipantId；Mode、result kind和reward policy必须三方一致。完成经验与bonus相加必须保持安全整数，再按Profile上限截断；未知Mode、无对应Definition、future schema、非法rank/stage或recipient不一致均在Profile写入前拒绝。

P2 Resolver必须完整验证但不消费`participantEquipmentUsage`计算经验或战斗属性，避免把“用过”误报为“已理解”。P6未来若消费该摘要，必须使用新的Profile/Reward schema和迁移门；不能在V2 resolver里通过可选字段或隐藏分支提前接入。

P2新grant ID固定从权威结果身份派生，例如`arena-result:v2:<seedHex>:<configHash>:<finalHash>:<authorityHash>`；禁止包含Profile revision、当前经验、展示名或随机值。这样同一Result在进程重启、Profile revision变化或“写入成功但响应丢失”后仍得到同一grant ID。历史v1 grant ID只读保留，不重写；实际字符串必须通过Profile identifier长度和碰撞测试后才能冻结。

RewardCommitter在调用Profile前先冻结`pendingGrant`。可恢复错误保留同一个pendingGrant供重试，不重新按新Profile计算delta；返回`committed`或`duplicate`后必须逐字段验证Profile revision、经验、unlocks和committed grant ID。非恢复错误、恶意返回、同一authority hash对应不同grant或不同authority hash重用grant ID均永久失败关闭。

#### 多controller、奖励与rematch生命周期矩阵v0.1

| 阶段 | 成功提交点 | 失败行为与资源所有权 | 强制测试 |
|---|---|---|---|
| roster/content/Core构造 | 全部Definition、assignment、content和Core互相验证后才发布Core候选 | 创建者持有已创建资源并按逆序清理；任何失败不发布Session/public info，不自动少建participant | 第1/N/末项失败、unknown/duplicate、清理主错+次错、再次创建 |
| N个controller/read bundle构造 | 按participantId稳定顺序全部创建并完成能力静态校验 | QuickMatch仍持有Core、controller和bundle；第k个失败反向清理前k个，集合大小不得增长 | 1/2/4/max slots每个索引注入失败、destroy失败重试 |
| LocalMatchSession握手 | runner创建且所有controller/bundle handshake成功后一次性移交所有权 | 构造失败的Session只清理自己创建的runner；调用方继续拥有Core/controllers/bundles并逆序回收，禁止双destroy | 首/中/末handshake拒绝、hostile method、runner清理失败 |
| 每tick输入采样 | local input和全部controller frame均验证后才创建一个trusted batch并进入Core step | 任何controller失败或返回错participant/tick时V6 Session失败关闭并清理；不得提交部分Core输入，也不得在已改变某个controller内部状态后重试同tick | controller调用顺序置换、首/中/末失败、重复participant、thenable/reentry |
| Core step/Mode裁决 | 完整tick的命令、模式phase、事件、checkpoint和read frame提交 | 未知错误关闭Session并使reader失效；不得返回半tick事件/frame，Result和奖励保持null | hit+finish+fall、second fall+slot activation、事件发布中异常 |
| 终局/Replay/Result | Core ended后Replay V6与Result V3全部验证，再发布一次completion | export、validator或completion sink失败均不得进入奖励；Runtime失败关闭并保留可重试清理，不发布伪Result | 重复completion、sink抛错/thenable、Replay/Result identity不一致 |
| 奖励提交 | frozen pendingGrant收到`committed`或`duplicate`且Profile结果复验通过 | 可恢复错误停在results/recoverable并保留同grant；非恢复错误fatal；Match Runtime尚不释放 | 写前失败、写成功响应丢失、duplicate、恶意Profile、重入 |
| Match释放 | 奖励结果已保存后，Runtime/Session/controllers/Core/bundles全部释放或登记精确cleanup retry | 释放失败进入`release-pending`语义，只重试清理，不重新解析/提交奖励；成功后才允许reward/unlock/rematch | 每层destroy失败、二次释放、主错+多清理错、最终资源归零 |
| rematch | 上局奖励已幂等确认且Match释放完成，新Mode/seed/roster/public info全部准备后原子切换 | 新局准备失败保留上局reward/unlock可见状态；不得复用上局Result、ModeProjection、ordinal、controller或pendingGrant | 同Mode/跨Mode重赛、准备取消、前后台、连续100局 |
| destroy | generation失效、异步准备取消、全部当前/待清理资源归零 | destroy可重试失败资源；完成后所有入口拒绝，迟到Promise/result/sink不能重新挂载 | prepare中destroy、step中拒绝、双destroy、迟到resolve/reject |

V6多controller路径不沿用V5单Bot的“trusted source可恢复后重试同tick”语义，除非未来为所有controller提供可证明的输入事务/回滚合同；当前最小安全方案是任一controller采样失败即整局失败关闭。V5单Bot路径与历史Replay继续由原validator/Session实现维护，不因V6收紧而静默改变。

### 2026-08-02 主协调P2.0合同预验收

本段保留2026-08-02历史预审结论，只评价当时已经存在的ADR、字段、调用方矩阵和治理证据，不评价尚未实现的Core、压力、设备或真人产物。当时状态为`coordinator-preaudit / rejected-for-small-gate / implementation-not-authorized`；当前P2.0a/P2.0b候选授权以ADR-118和本台账后续状态段为准，历史评分不代表验证通过。

| 合同维度 | 分值 | 当前 | 当前证据与扣分原因 |
|---|---:|---:|---|
| 三模式规则→字段/策略唯一映射 | 20 | 20 | 七类基础Policy、Survival pressure与tier policy已逐项展开，并补上collection/runtime武器身份和每wave解析；仍待开发反证，不在本维提前扣治理分 |
| schema/hash/历史读取策略 | 20 | 19 | V5/V6、Result v2/v3、content/pool v1/v2、read/public与mode reward exact-key候选已明确；三方签核仍未冻结 |
| 依赖方向与双开发写域 | 15 | 14 | Rule→Core→Bot→Presentation及roster→content→final assignment已固定；共享index/manifest的逐批交接尚未绑定实际回执 |
| 竞态、同tick与确定性 | 15 | 14 | finish+fall、并列、slot generation、具名流和V6 mode phase已形成exact-key候选；开发反证与重复命令实现测试仍缺失 |
| 健壮性、失败关闭与生命周期 | 15 | 13 | 多controller构造/握手/采样、readers失效、pending grant、release-pending、rematch与destroy已有逐阶段矩阵；仍缺开发反证和实际failure injection |
| 下游主流程与发布隔离 | 10 | 9 | 已识别content、Result、Session、reward和Presentation双人泄漏，并字段化mode-aware rematch/恢复identity；Race/Survival在P5/A2前继续显式关闭入口 |
| 治理、回执与可追溯 | 5 | 3 | ADR/台账/回滚边界齐全；开发A、开发B、美术即时通知均`notification-unconfirmed`，强制六维自检未取得 |

当前合计`92/100`；治理维度`3/5`低于80%，开发/美术强制自检与回执均缺失，并且存在硬门红，因此不能以总分达到90为由授权实现。

必须返工/补证后重新提请小门：

1. 开发A逐字段反证或修订本台账的Mode/policy Definition、V6事件phase/payload和read projection exact-key候选，并提交六维自检，逐项说明恶意输入、同tick置换、构造失败回收、结束后输入与主流程。
2. 开发B逐字段反证或修订roster→content→final assignment、PublicInfo/Result/Session/Reward exact-key与生命周期矩阵，并提交六维自检，明确部分controller构造失败、reward可重试失败及rematch identity。
3. 美术提交A2.0事件/projection消费回执与六维自检，确认没有从事件顺序、坐标、动画或音频完成重判规则。
4. 开发A/B确认Survival enemy slot三层口径：schema测试天花板16、实现期生产候选上限4、已证明引擎安全/首发内容上限均保持null；未知值不能伪装成生产默认值。
5. 三方回执到齐后由主协调逐条复核并重新评分；任何一方自称通过、开始代码或扩资产均不构成授权。

### Definition/Registry 实现风格与候选文件

必须沿用现有项目风格：先`cloneFrozenData`，再`assertKnownKeys/assertPlainRecord`；所有整数为安全整数，有限数拒绝NaN/Infinity；集合去重并规范排序；Registry构造时规范化、拒绝重复ID、冻结自身，并只暴露`size/has/get/require/list`的只读snapshot。不得把调用方数组、Map、Set或Definition对象原样保存。

按ADR-118，P1整体独立`advance`不再阻塞P2.0a候选编码；首轮只允许开发A使用以下精确文件清单，主协调已经缩减共享出口：

- 新增 `packages/arena-definitions/src/mode-definition.ts`、`mode-policy-definition.ts`、`mode-registry.ts`；
- 新增 `packages/arena-definitions/test/mode-definition.test.ts`；
- ADR-112与本台账只由主协调更新。

该首轮不修改`index.ts`、MatchCore、Replay、Assignment、Product、Session、Composition、package manifest或golden；只形成生产不可达的纯数据Definition/Registry。字段需要跨入`arena-contracts`时必须先完成P2.0a静态交接并另开P2.0b小门，不能顺手扩写。

### 2026-08-10 P2.0a静态交接与P2.0b开发授权

- P2.0a实际新增`mode-definition.ts / mode-policy-definition.ts / mode-registry.ts / mode-definition.test.ts`，未修改`arena-definitions/src/index.ts`，因此生产入口仍不可达。
- Definition与九类Policy均先深复制冻结、再做exact-key/schema/kind/安全整数/集合闭包校验；Mode Registry拒绝缺引用、错Policy类型、modeKind/contentVersion漂移、孤儿Policy、Map/供给/collection/runtime/slot闭包缺失，并对规范化完整内容生成`contentHash`。
- 首发Duel/Race/Survival固定无隐藏team分支；Survival保持`schema enemy slot ceiling=16 / production candidate<=4 / engine-safe=null / launch=null`，压力stage至少1个active enemy，临时tier的collection/runtime双向唯一且每level collection闭合。
- 健壮性：getter、Symbol、稀疏数组、循环、Proxy异常、future字段和调用方构造后变异均由合同或未来测试夹具覆盖；尚未运行。
- 竞态与确定性：Registry和所有集合规范排序，slot activation order单独保留语义顺序，内容hash不受调用方插入顺序影响；Core同tick裁决尚未进入本切片。
- 兜底与失败关闭：未知Policy/能力/供给/装备、非Survival携带Survival Policy、tier缺映射与身份漂移均拒绝，不补默认Duel、默认武器、默认锚或默认数值。
- 边界：测试ID均含`.test.`，Policy闭包有界；ADR-120/121只允许Survival首次复活与Race重生保护以完整hash锁定的生产不可达候选进入显式Registry，其余未决hard-limit、pressure/tier正式数值仍不能进入默认生产Registry。
- 生命周期：本切片只有不可变Definition与Registry，无异步/监听器/设备资源；输入数组和对象不被保留，整片可通过删除四个新增文件回滚。
- 主流程：未导出、未接MatchCore/Replay/Product/Session/Presentation，不改变当前Duel生产路径；P2.0a状态为`implementation-candidate / static-reviewed / verification-deferred / formalGate=false`。
- 变更治理：起始HEAD仍为`524a5dc0a21fd6f3cc8c7058168b9d2b664e6a64`；未运行test/typecheck/lint/build/performance，全部记为`deferred-by-ADR-118`，不commit、不push。

### 2026-08-12 P2.0d 三模式Registry显式装配边界

- `arena-product-content`新增`arena-v2-three-mode-registry-candidate-v1.ts`与对应未运行测试源码，并从该包显式导出工厂；它不是默认Registry实例，`defaultRegistryWired / defaultCompositionWired / defaultEntryWired`继续为`false`。
- 工厂固定绑定现有Duel/Race/Survival稳定Mode ID、两张KZ路线已登记的anchor capability全集、现有Survival Supply Definition、Pressure Policy和Tier Policy；Map、供给、Pressure、Tier或装备引用漂移继续由既有`ModeRegistry`失败关闭。
- Race/Survival hard-limit等未冻结值没有默认值。Race重生已由ADR-121收敛为唯一`180/30 + 双地图公共fallback`候选，Survival首次重生已由ADR-120收敛为唯一`60/30`候选；调用方只能提交与两项完整Definition hash一致的Policy。三模式基础Policy仍必须一次提交各7类、共21项，封套显式为`production-unreachable`、ID必须是具名`.candidate.`身份并拒绝`.test.`；缺项、重复类型、modeKind/ID漂移、任一Respawn hash漂移、future字段或未知Map capability均不构造Registry。
- 本批只闭合“可以在不猜值时安全装配”的产品内容边界，不声称未决值已冻结，不批准当前16-slot Pressure作为首发上限，也未修改三模式Regression Composition。后续唯一接线点是：待全部未决Policy由对应内容门冻结后，由三模式QuickMatch/Runtime组合显式消费该Registry并核对resolved bundle identity。
- 新测试源码已登记到`run-arena-p2-candidate-tests.ts`的延期执行清单；P2治理脚本同步固定包级导出、21项显式基础Policy、总计23项注册Policy、`.test.`身份拒绝以及默认Registry/Composition/Entry均关闭。两份脚本本轮只更新未执行，不能形成绿证据。
- 状态为`code-written-not-run / production-unreachable / hardGate=false`；测试、类型、构建、三模式运行、压力、性能、设备与真人证据均未执行。

### 2026-08-12 P2.0e 三模式QuickMatch显式Mode Registry预检

- `arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts`新增独立`ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1`；新入口使用`modeRegistryCandidate`，旧武器原子引用仅以`weaponRegistryReference`传入并在委托边界映射，两个Registry概念不复用字段名。
- 新入口不提供人数默认：调用方必须显式提交`raceParticipantCount`和`survivalEnemyCount`。QuickMatch读取seed、构造roster/content/runtime前，Owner先验证候选exact-key/自有数据字段、冻结封套、`production-unreachable / hardGate=false`、三项默认接线关闭、真实`ModeRegistry`实例、contentHash、三稳定Mode ID/kind、两图目录及resolved Participant Policy；Race人数同时受真实runtime支持目录约束，Survival敌人数同时受Policy、预注册slot与真实runtime支持目录约束。
- 预检Owner在每次创建前后重做不可变候选身份闭包，并捕获`ModeRegistry`原始`size/list/resolve`描述符、拒绝原型漂移；before预检后、delegate返回后及after预检后均复核被吞掉的嵌套create/destroy水位。创建后漂移会清理刚创建的Session并粘性失败关闭。
- `contentIdentityWired=true`：只有Preflight Owner通过内部factory seam把已验证的Mode Registry contentHash稳定追加到`MatchContentSelectionV2.contentDefinitionId`，进而进入selection `contentHash`、PublicInfo与终局身份闭包；旧公开隔离factory仍固定传`null`，不存在可由普通调用方伪造的公开hash option。Owner返回bundle前以descriptor-only读取PublicInfo并精确复核hash后缀，缺失/篡改时销毁新Session并粘性失败关闭。Presentation不导入/持有Registry，hash也不参与Cue/VFX/音频/HUD/文案选择。
- 本切片仍保持通用`runtimePolicyConsumptionWired=false`。现有runtime尚未从完整resolved Policy bundle派生全部timeline/respawn值；但Race authority已按ADR-121消费同一180/30候选并将起跑格与公共fallback分离，Survival shared-world authority已按ADR-120消费同一60/30候选。后续P2.0w只补未批准Timeline产品提案，不构成默认值批准或接线。
- 正例、content identity稳定/Policy内容变化、缺字段、ID/kind/hash/伪Registry/原型漂移、getter/thenable/future字段、人数/slot边界、无默认以及回调吞掉嵌套create/destroy的测试源码已写入独立`arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts`，并登记到P2延期runner；`arena-product-content/test`不反向依赖Regression。未新增默认生产可达路径。状态为`code-written-not-run / production-unreachable / hardGate=false`，所有运行验证继续顺延。
- P2.0e邻接源码静态复读发现同一Composition候选内残留第二份`ownDataField()`实现，属于确定TypeScript重复实现阻断；现已删除后部重复声明并统一复用前部descriptor-safe实现。整文件顶层`function/class/interface/type/const`名称纯文本复核后重复数为0，P2.0e邻接函数也未发现连续不可达`throw/return`；该结论未通过typecheck/test/build执行验证，仍只记`source-duplicate-declaration-closure-code-written-not-run`。

### 2026-08-12 P2.0f Information Host显式Mode Registry预检消费

- 既有`ArenaThreeModeAuthoritativeInformationHostCandidateV1`继续是唯一Information/Session/bundle-factory生命周期Owner；当调用方显式提交`modeRegistryCandidate`时，它在读取Profile快照、消费seed或构造Session/Presentation前先复用P2.0e候选与resolved Participant Policy做完整预检，并切换为`ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1`。未提交该字段时继续走旧隔离factory，旧路径的content definition不追加Mode Registry hash，不改变默认行为。
- 显式路径的`raceParticipantCount`与`survivalEnemyCount`必须同时存在且是可枚举自有数据字段；缺项、accessor、Policy/slot/runtime目录越界、伪Registry、原型漂移或身份漂移均在创建比赛前失败关闭。旧`registryReference`只在此边界重命名映射为`weaponRegistryReference`，不与Mode Registry候选混用。
- Host的`#bundleFactory`已收敛为两种factory共享的`createMatchBundle + destroy`最小端口，未增加第二套Host或destroy流程。构造后Session factory/Host失败仍逆序销毁实际bundle factory；正常destroy继续保留失败子Owner并精确重试，成功子Owner不重复清理。Playable Host在任何Information/HUD Owner构造前完成偏好与全部option的数据字段捕获，只透传显式候选与人数，不让Presentation导入、持有或查询Registry/Policy。
- `modeRegistryPreflightInformationHostWired=true / contentIdentityWired=true`：显式Host开局经过P2.0e内部seam，将已验证Registry hash绑定到`MatchContentSelectionV2.contentDefinitionId`并由bundle postcondition复核；Host对外仍只公开既有opaque开局/表现端口，没有为测试开放Registry或hash注入口。该切片保持通用`runtimePolicyConsumptionWired=false`、三项default接线为`false`，当时Race/Survival未冻结运行数值未被猜测；后续ADR-120/121分别把Survival首次复活与Race重生保护形成单一候选并直接绑定对应Runtime，不改变本切片的通用接线状态。
- `ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1`新增可选`modeRegistryCandidate`并在storage/Profile owner/wallNow/seed及任何子Owner之前执行同一Registry/count预检；显式路径的人数必须为可枚举自有数据字段并透传到既有Playable，缺省路径不创建默认Registry且content identity不追加hash。武器`registryReference`继续独立命名、由Registry-backed Local自然携带，不代建或混用Mode Registry。
- 独立Regression测试源码补充Host与Local显式/旧路径分流、Local缺人数且storage/Profile/wallNow/seed端口零调用、非法偏好构造零seed/Profile/HUD端口调用、人数accessor、伪Registry/原型漂移、构造后Learning recovery→Profile逆序清理与metadata反证；沿用已登记的P2延期测试文件，不新增反向包依赖。治理脚本增加`modeRegistryPreflightLocalPlayableHostWired=true`等P2.0f marker。状态仅为`code-written-not-run / production-unreachable / hardGate=false`，所有运行门禁继续顺延。

### 2026-08-12 P2.0g-A 可复用纯Mode Registry前置预检边界

- `preflightArenaThreeModeModeRegistryCandidateV1()`提供无资源、无副作用、同步确定性的顶层前置预检API；输入严格只有`modeRegistryCandidate / raceParticipantCount / survivalEnemyCount`三个可枚举自有数据字段，复用唯一`modeRegistryPreflightBinding()`与`assertRequestedParticipantCounts()`实现，拒绝getter、Symbol、extra/future、thenable、伪Registry、原型漂移及缺失/非法人数。
- 输出仅为深冻结身份摘要：Registry content hash、显式人数以及Duel/Race/Survival各自Mode ID、contentVersion和实际resolved Policy ID；不返回候选、Registry实例、授权token或资源句柄。摘要不能绕过后续检查，Information/Playable/Local仍必须持有并重新验证原始候选与人数。
- API不读取seed/Profile/storage/wallNow，不构造DOM、Three、audio、loader或任何Owner。现有`arena-regression/src/index.ts`已整体导出该版本化候选文件，无需新增重复出口；测试继续使用已登记的独立Regression文件，P2 runner与治理marker已同步。
- 该小片落盘时状态为`code-written-not-run / production-unreachable / hardGate=false / top-level-consumer-unwired`；后续P2.0g-C2只接通显式Formal Web顶层consumer。通用`runtimePolicyConsumptionWired=false`，默认Registry/Composition/Entry继续为`false`；当时未决运行值未被补默认，后续ADR-120/121的两个Respawn单一候选也不反向把该门改绿。

### 2026-08-12 P2.0g-B Replay beforeStep同步返回值无副作用拒绝

- `arena-match/src/replay.ts`不再为“收容”而调用普通对象的`then`。Replay在模块加载时捕获原生`Promise.prototype.then`数据方法和描述符标志；每次同步返回校验先拒绝原生Promise并挂接无副作用拒绝处理器，再以纯描述符方式遍历普通对象的`then`原型链，外部getter、then方法、重入或抛错回调均不会被执行。
- 原型链扫描上限固定为32层；循环、超深、访问器`then`、函数`then`以及原生Promise原型描述符漂移全部在`core.step()`前失败关闭。普通对象的非函数数据`then`保持同步值语义。Replay Core仍由既有`executeReplay()`统一销毁，拒绝当前tick时不提交输入、事件或checkpoint。
- `tests/arena/replay.test.ts`新增 hostile then调用计数为0、重入/抛错不执行、getter为0、拒绝Promise、循环/超深原型、Promise原型漂移与tick未推进反证，并登记到P2延期runner；治理脚本将`replay.ts`纳入权威边界扫描，固定描述符遍历标记并禁止重新出现`descriptor.value.call(verification, ...)`。
- 状态仅为`replay-before-step-side-effect-containment-code-written-not-run`。默认Registry/Composition/Entry、Replay schema、Core step、输入和结果合同均未改变；测试、类型、构建、压力、性能和设备验证仍未运行。

### 2026-08-12 P2.0g-C1 Formal Web显式Mode Registry纯前置适配器

- 新增`arena-v2-formal-web-mode-registry-preflight-adapter-candidate-v1.ts`，输入严格只有`modeRegistryCandidate / raceParticipantCount / survivalEnemyCount`三个可枚举自有数据字段；它把三项原样提交给`preflightArenaThreeModeModeRegistryCandidateV1()`，不复制Registry/Policy校验，也不把Survival敌人数转换为第二套总参与者数语义。
- 返回值直接使用既有深冻结preflight summary，仅包含Registry content hash、显式人数和三模式Policy身份，不含Registry、候选、授权token或任何资源句柄。下游Information/Playable/Local仍必须持有并重新验证原候选与人数，摘要不能绕过P2.0e/P2.0f检查。
- 适配器无seed/Profile/storage/wallNow/DOM/Three/audio/loader端口，不构造Owner且没有外部回调。C1落盘时`topLevelConsumerWired=false`，后续C2显式接线后当前metadata为`adapterWired=true / topLevelConsumerWired=true / defaultRegistryWired=false / defaultCompositionWired=false / defaultEntryWired=false / runtimePolicyConsumptionWired=false / validationStatus=not-run`；该变化只表示显式顶层调用点存在，不代表默认入口或runtime Policy消费开放。
- 独立Node测试源码覆盖稳定摘要、三字段原样语义、缺失/未来/Symbol/accessor/thenable/错误原型、Registry hash漂移和人数边界；只登记P5延期runner，避免在P2/P5两阶段重复执行同一测试。C1自身不拥有顶层资源，后续C2消费该适配器；Race/Survival未冻结运行值仍没有默认值，状态仅为`code-written-not-run / production-unreachable / hardGate=false`。

### 2026-08-12 P2.0g-C2 Formal Web顶层显式预检接线

- Formal Web候选现可选接收`modeRegistryCandidate`；只有显式路径要求同时提交`raceParticipantCount / survivalEnemyCount`。三项在读取`hostRoot`、创建DOM、访问storage/Profile/seed或构造Three、音频与loader前先交给C1适配器，随后原候选与原人数继续透传Local Host并再次完整验证，摘要不作为授权token。
- 旧路径与`web-arena-v2-formal-candidate.ts`保持不传Mode Registry，默认Registry、默认Composition、默认Entry及runtime Policy消费继续关闭。该接线未冻结Race/Survival运行数值，也未改变当前开发入口行为。
- 生命周期与治理测试源码增加顺序、透传和默认入口反证；状态仅为`top-level-explicit-preflight-code-written-not-run / production-unreachable / hardGate=false`，所有运行验证继续顺延。

### 2026-08-12 P2.0g-D 无效Core工厂结果有界同步清理

- Replay与internal checkpoint保留“无效factory结果若提供同步data `destroy`则尝试一次清理”的既有资源责任，但所有`MatchCore.prototype`身份检查、`destroy`查找及其返回值的`then/constructor`检查均改为descriptor-only、visited集合和最多32层原型扫描；不再先执行可能在循环Proxy上无界的`instanceof MatchCore`。
- `destroy`访问器不执行；同步data方法最多调用一次。普通hostile thenable/accessor then、Promise子类或自定义constructor路径只拒绝、不调用外部then；仅当constructor数据描述符精确等于模块捕获的原生Promise构造器、且`Promise.prototype.then`与`Promise[Symbol.species]`描述符身份/flags均未漂移时，才允许原生品牌探测并用NOOP收容真实Promise。候选自己的constructor getter以及漂移后的species getter均不会执行。
- 循环/超过32层原型、`getPrototypeOf` Proxy trap、destroy异常和异步返回均作为cleanup failure，通过`combineCleanupFailure`附在原始“coreFactory必须返回MatchCore”错误之后，不覆盖主因。合法MatchCore、Replay逐tick与checkpoint恢复路径不改变。
- 两份既有Node测试源码补充循环、33层、destroy getter零调用、destroy一次、hostile then零调用、Promise constructor getter零调用、species漂移零调用及`getPrototypeOf`异常聚合反证；测试、类型、构建、压力与设备验证均未运行，状态仅为`invalid-core-factory-cleanup-boundary-code-written-not-run`。

### 2026-08-12 P2.0g-E MatchCore依赖工厂合同与构造清理边界

- `MatchCore`对Rule、Map、Physics与可选Supply Timeline候选的合同检查和无效候选清理现统一使用descriptor-only、visited集合和最多32层原型扫描；Rule/Map/Physics各自公开断言也拒绝访问器方法、循环原型与超深原型，不再通过普通属性读取执行外部getter。
- 候选校验失败时只捕获并调用一次同步data `destroy`。清理返回普通thenable、访问器then/constructor、Promise子类/自定义constructor或真实Promise均失败关闭，不执行普通`then`；原生Promise只在捕获的`Promise.prototype.then`和`Promise[Symbol.species]`描述符未漂移时做品牌探测并收容拒绝。已经通过合同并由MatchCore正式接管的资源仍按其既有捕获合同执行可重试生命周期，避免绕过Proxy包装、私有字段品牌与故障注入语义。
- `tests/arena/match-core.test.ts`及Map/Physics包测试源码补充循环、33层、方法getter零调用、destroy getter零调用、destroy一次、hostile then零调用和Promise constructor getter零调用反证。该切片不改变Rule/Core数值、tick、Replay schema、hash、Registry、Composition或默认入口；测试、类型、构建、压力、性能和设备验证均未运行，状态仅为`match-core-factory-boundary-code-written-not-run`。

### 2026-08-12 P2.0g-F 参与者资源与Mode Runtime同步端口边界

- `MatchParticipantSystemV2`资源工厂结果与`ModeMatchRuntimeV6`世界Authority的start/step/export/restore/pause/resume/destroy返回值统一捕获原生`Promise.prototype.then`数据描述符和`Promise[Symbol.species]`访问器身份；同步检查先以descriptor-only方式同时收集`then/constructor`，带visited集合并固定最多32层。
- 普通thenable、访问器then/constructor、Promise子类或自定义constructor只拒绝、不执行外部then/getter；只有constructor精确为模块捕获的原生Promise且then/species描述符均未漂移时做原生品牌探测，并以NOOP收容真实Promise拒绝。方法端口捕获同样区分循环与超过32层，既有失败关闭、逆序清理、清理重试与资源所有权不变。
- `match-participant-system-v2.test.ts`与`mode-match-runtime-v6.test.ts`补充精确cause读取、hostile then零调用、then/constructor getter零调用、循环/33层、Promise子类、then/species漂移零调用和原生Promise拒绝收容源码反证。玩法、人数、输入、事件、Replay/checkpoint/hash、Registry、Composition与默认入口未改变；全部测试、类型、构建、压力、性能和设备验证仍未运行，状态仅为`core-sync-port-boundary-code-written-not-run`。

### 2026-08-12 P2.0g-G 终局Authority身份同步读取边界

- `ModeProductResultAssemblerV3`仍只在唯一`MatchEnded`已进入规范V6事件流后读取`getTerminalAuthorityIdentity()`；该延迟读取端口与返回值现改为descriptor-only、循环检测、最多32层，并复用原生Promise then/species描述符身份闭包。普通then/accessor、Promise子类与描述符漂移不执行外部代码且失败关闭，不能把伪终局hash带入Reward/Learning结果链。
- 测试源码补充终局前零读取、终局后精确一次、hostile then与getter零调用、source循环、结果33层、Promise子类及then/species漂移反证。Result V3字段、装备使用事实、奖励/成长算法、Mode数值、Replay/hash来源和默认入口均未改变；所有运行验证继续顺延，状态仅为`terminal-authority-sync-read-boundary-code-written-not-run`。

### 2026-08-12 P2.0g-H QuickMatch V3同步工厂与runtime移交边界

- `ModeAuthoritativeQuickMatchServiceV3`的seed、roster、content与runtime factory返回值，以及失败runtime的destroy返回值统一使用then/constructor纯描述符扫描、循环检测、最多32层和原生Promise then/species身份复核；普通then/getter、Promise子类与描述符漂移均零外部执行并失败关闭。
- runtime factory的原始候选现在先进入局部所有权，再执行同步合同校验；只有通过后才移交`ModeAuthoritativeLocalMatchSessionV3`。因此带同步data destroy的无效thenable候选不再因赋值表达式中途抛错而丢失，失败路径最多清理一次；Session端口捕获失败继续由Session构造器清理已提交runtime，QuickMatch不重复释放。
- 新增V3专用测试源码覆盖正常移交、hostile then/accessor、Promise子类、循环/33层、无效runtime destroy一次以及then/species漂移零调用。roster、content、seed顺序、Session类型、玩法、Replay/hash和默认入口均未改变；验证未运行，状态仅为`quick-match-v3-sync-ownership-code-written-not-run`。

### 2026-08-12 P2.0h Session同步端口描述符边界

- `ModeLocalMatchSessionV2`与`ModeAuthoritativeLocalMatchSessionV3`的runtime/controller同步端口统一复用`arena-session`包内私有边界：模块加载时捕获原生`Promise.prototype.then`数据描述符及flags、`Promise[Symbol.species]` getter及flags；每次同步返回以descriptor-only同时扫描`then/constructor`，visited集合与最多32层分别拒绝循环和超深原型。
- 普通hostile then、访问器then/constructor、Promise子类或custom constructor均失败关闭且不执行外部代码；只有constructor数据描述符精确为捕获的原生Promise构造器、且then/species描述符未漂移时才调用捕获的原生then做品牌探测并用NOOP收容。start/step/controller input/pause/resume/destroy与V3终局Authority identity读取均经同一边界；方法捕获同样区分循环与超过32层。
- V2既有测试和新增V3定向测试源码覆盖hostile then零调用、then/constructor getter零调用、原生Promise/Promise子类、then/species漂移零调用、方法与返回值的循环/33层，以及合法同步生命周期；V3测试已登记P2延期runner。玩法数值、输入、事件、Replay/checkpoint/hash、默认Registry/Composition/Entry均未改变，状态仅为`session-sync-port-boundary-code-written-not-run`，所有运行门禁继续顺延。

### 2026-08-12 P2.0i Product Session同步端口与构造所有权边界

- `ModeProductSessionV2`新增包内私有同步端口边界，不从公共`index.ts`导出，也不改变旧`ProductSessionController`明确允许异步的Profile/prepare合同。match、assembler与reward的data method捕获，以及start/step/pause/resume/finalize/commit/destroy返回值，统一使用then/constructor纯描述符扫描、循环检测、最多32层和原生Promise then/species身份复核；普通then/getter、Promise子类和描述符漂移均零外部执行并失败关闭。
- 构造改为两阶段资源接管：先分别捕获match与assembler的同步data destroy句柄，再捕获其余端口；只有全部端口成功后Session才接收两个子Owner，任一步失败均把原始资源留给调用层唯一回滚。Composition继续持有自己创建的assembler直至Session成功，并在失败时只回收assembler；外层Mode/Learning Factory继续唯一持有并重试调用方match，消除三层相邻Owner重复销毁。options与step必需字段使用可枚举自有数据描述符读取；终局Product Result先完整纯数据克隆后再比较Mode结果和身份，避免校验后属性读取触发外部getter。
- `mode-product-session-v2.test.ts`新增hostile then/constructor accessor零调用、Promise子类、原生拒绝Promise收容、循环/33层、方法getter零调用、构造失败零接管并由调用方按assembler→match清理、step字段访问器在append前拒绝及then/species漂移反证。玩法、奖励数值、Result/Replay/hash、Registry、Composition和默认入口未改变；所有测试、类型、构建、压力、性能和设备验证仍未运行，状态仅为`product-session-sync-ownership-code-written-not-run`。

### 2026-08-12 P2.0j Product Composition同步工厂与QuickMatch服务所有权链

- `arena-product-composition`新增包内私有同步边界，两套Product Composition不再调用`Promise.resolve(ordinaryThenable)`；工厂返回、构造清理与Mode组合清理统一使用then/constructor纯描述符扫描、循环/32层上限和原生Promise then/species身份复核。内部端口方法捕获也统一为descriptor-only有界查找，普通then/getter与Promise子类不执行外部代码。
- `createProductSessionComposition()`在调用`quickMatchServiceFactory`后同时尝试捕获原始候选destroy和同步合同：无效候选若有同步data destroy则保留清理责任；合法候选按`service → QuickMatchProductFactory → ProductMatchCoordinator → ProductSessionController`逐级移交，只有下游destroy句柄捕获成功后才清空上游临时所有权。
- `QuickMatchProductFactory`可选接管`QuickMatchService.destroy()`并在destroy后拒绝create；`ProductMatchFactoryPort`保持destroy可选以兼容旧工厂。`ProductMatchCoordinator.destroy()`在释放runtime后销毁factory，失败时保留同一factory，下一次destroy精确重试。新增生命周期源码反证覆盖service只销毁一次、首次清理失败后二次成功和异步/hostile清理拒绝；相关测试只登记延期runner，未运行。默认Registry/Composition/Entry和玩法/奖励/Replay/hash均未改变，状态仅为`product-composition-service-ownership-code-written-not-run`。

### 2026-08-12 P2.0k Product Match共享同步端口与销毁重入边界

- `arena-product-match/ports.ts`对明确要求同步的Runtime、Session、completion sink、factory cleanup与coordinator cleanup返回值改为then/constructor纯描述符扫描，方法捕获与返回值扫描分别区分原型循环和超过32层；只有constructor精确为模块捕获的原生Promise且then/species描述符未漂移时才做品牌探测并用NOOP收容。普通then/getter、Promise子类和描述符漂移均不执行外部代码并失败关闭。
- 明确允许异步的`ProductMatchCoordinator.prepare()`与`resolveSyncOrNativePromise()`合同未在本片改成同步，也未删除既有跨realm Promise接受路径。`QuickMatchProductFactory.destroy()`新增重入哨兵：QuickMatch service即使吞掉内层destroy重入错误，外层仍失败并保留同一service owner；下一次destroy精确重试，成功后才标记destroyed并拒绝create。
- `product-match-lifecycle.test.ts`新增service ownership贯通、首次destroy失败后二次成功、swallowed destroy reentry、Promise子类species零调用、constructor getter零调用、循环/33层和then/species漂移反证，并已登记P2延期runner。玩法、匹配内容、Result、Replay/hash、Registry/默认入口均未改变；运行验证全部顺延，状态仅为`product-match-sync-port-and-destroy-reentry-code-written-not-run`。

### 2026-08-12 P2.0l Product Content与旧Product Session同步权威端口

- `ProfileContentPoolProvider`的Profile快照与Content Pool resolver返回值改为then/constructor纯描述符扫描、方法与返回值循环/32层上限、原生Promise then/species身份闭包；普通then/getter和Promise子类不执行外部代码。相同profile+seed的内容池选择、hash、replacement和fallback算法未改。
- 旧`ProductSessionController`中明确同步的StateMachine、MatchCoordinator、Reward、renewLease与destroy调用复用Mode Session包内严格同步返回边界；明确允许异步的`ProfileService.open()`、`MatchCoordinator.prepare()`和诊断观察者仍走原有异步/收容通道，跨realm Promise合同未在本片收窄。
- Product Content测试源码新增then/constructor getter零调用、Promise子类、循环/33层及then/species漂移；旧Product Session生命周期测试加入P2延期runner。所有运行验证未执行，状态仅为`product-content-and-legacy-session-sync-port-code-written-not-run`；模式数值、内容池、奖励、Replay/hash和默认入口均不变。

### 2026-08-12 P2.0m Input Pilot同步观察端口边界

- `InputPilotObservedSession`的delegate与collector方法捕获、同步返回值判定改为descriptor-only有界扫描：原型链循环与超过32层分别失败关闭，`then`和`constructor`访问器不执行，普通thenable与Promise子类不调用其外部`then`。
- 只有constructor数据描述符精确为捕获的原生Promise构造器、且`Promise.prototype.then`与`Promise[Symbol.species]`描述符未漂移时，才使用捕获的原生then执行品牌探测并以NOOP收容拒绝分支。输入事件、Replay/hash、观察调用顺序、暂停语义与销毁重试所有权未改。
- 恶意thenable、访问器、Promise子类、描述符漂移、循环和超深原型链测试源码已写并登记P2延期runner；未运行任何测试、类型、构建或压力，状态仅为`input-pilot-sync-observation-boundary-code-written-not-run`。

### 2026-08-12 P2.0n Reward同步Profile端口边界

- `RewardCommitter`与`ModeRewardCommitterV2`的Profile快照、Grant提交与返回结果统一复用包内私有严格同步边界：data method捕获和返回值扫描均限制32层、拒绝循环/访问器/普通thenable/Promise子类，并固定原生Promise then/species描述符身份。
- Committer继续在权威Result校验后才解析奖励，提交未知错误继续失败关闭，可恢复错误保留精确重试，重复Result复用同一grant/outcome；奖励Definition、三模式经验数值、解锁算法、Result身份与Profile schema均未改变。
- 两套Reward测试源码已覆盖hostile then、constructor/then getter、Promise子类、描述符漂移、重入与提交未知状态；全部验证继续顺延，状态仅为`reward-sync-profile-port-boundary-code-written-not-run`。

### 2026-08-12 P2.0o 已冻结resolved Policy接入真实Runtime

- 按[ADR-128](../decisions/128-arena-v2-resolved-frozen-policy-runtime-binding.md)新增不可变Runtime Policy Binding。显式Mode Registry Preflight Factory为Duel/Race/Survival分别绑定Registry hash和完整resolved bundle；旧无Registry工厂、Replay工具、默认Registry/Composition/Entry仍不注入。
- 三模式Runtime在资源构造前按resolved Participant Policy复核人数、角色、controller、team和slot；Duel进一步把Elimination/Respawn/Relationship投影给既有Resolver；Race直接消费competitor等待/保护并闭合无限复活、latest-safe-anchor与公共fallback；Survival直接消费player首次复活、Pressure slot激活顺序/阶段和Tier身份。
- Race与Survival现进一步在每次权威掉落时消费resolved Elimination语义：Race必须为`schedule-respawn`，Survival player必须为`count-for-objective`、enemy必须为`deactivate-slot`。两种Runtime按[ADR-129](../decisions/129-arena-v2-rule-target-eligibility-policy-port.md)把resolved Relationship在Rule构造时冻结为有向目标资格矩阵并纳入Rule checkpoint身份；Survival同角色中立，敌人不能互相命中。
- resolved Objective先由[ADR-132](../decisions/132-arena-v2-terminal-objective-policy-authority-fact-assertion.md)在终局用独立权威事实断言结束原因；随后按[ADR-131](../decisions/131-arena-v2-terminal-result-policy-assertion.md)，三模式真实终局结果在进入`MatchEnded`与终局ReadFrame前由独立Result Policy Resolver断言当前tick、允许原因、本局participant身份及既有Duel/Race/Survival投影。两者都不重新计算或覆盖胜负。
- [ADR-130](../decisions/130-arena-v2-race-finish-semantic-capability.md)新增唯一Race终点语义能力。两张KZ地图分别将该能力映射到自己的真实`finishAnchorId`；Registry不再把任一物理finish anchor当作通用Objective能力，Race Runtime按所选地图闭合语义能力、物理锚与本局finish gate。
- Survival active武器Registry仍是唯一可玩子集，完整resolved Tier只做精确超集约束，不能自动激活未准入武器；Pressure中的抽象锚能力继续通过所选地图路线段适配，不硬编码首图物理锚ID到第二图。
- 显式路径把绑定身份、冻结目标资格矩阵、Objective Policy和Result Policy纳入Mode Driver/Rule身份，Checkpoint V3、Admission V2及终局证据继续闭合同一规则。通用`runtimePolicyConsumptionWired=false`仍保留，因为Race/Survival正式hard-limit、Timeline最终消费和两项保护平衡批准尚未完成；精确标记为`resolvedFrozenRuntimePolicyConsumptionWired=true / threeModeObjectivePolicyAssertedAtTerminal=true / threeModeResultPolicyAssertedAtTerminal=true / raceEliminationAndRelationshipPolicyConsumedByRuntime=true / survivalEliminationAndRelationshipPolicyConsumedByRuntime=true / objectiveAndResultExistingSemanticsIdentityBound=true / timelineRuntimePolicyConsumptionWired=false`。
- 延后测试源码增加相同Registry稳定Driver、Policy变化导致Driver变化和默认旧路径不携带Registry身份的反证；P2治理脚本登记新版本化源码与边界标记。本批未运行test/typecheck/build/stress/performance/device，状态仅为`code-written-not-run / production-unreachable / hardGate=false`。

### 2026-08-12 P2.0p 三模式终局Result Policy逐局断言

- 按[ADR-131](../decisions/131-arena-v2-terminal-result-policy-assertion.md)在`arena-match`新增独立`ModeResultPolicyResolverV1`。Resolver只验证现有Mode System生成的Result，不读取地图/武器/表现/存档，也不重新计算胜负。
- 显式Registry路径将resolved Result Policy裁剪为深冻结终局bundle。Duel在Mode Driver内断言；Race与Survival在Authority发布`MatchEnded`和终局ReadFrame前断言。三模式统一闭合result kind、allowed reason与`endedAtTick=current authority tick`。
- Duel winner必须属于本局participant；Race rankings必须精确覆盖本局participant，当前tick finishers共享rank 1，未完赛者按progress降序且同progress并列；Survival result必须引用本局唯一player，`survival-time-cap`不得覆盖已经达到第二次掉落的终局。
- Duel只有显式Registry路径提交Result bundle并把规范化bundle纳入Driver hash；旧独立候选不提交该字段，保持原行为与原hash。Race/Survival原Runtime Policy Binding content hash已包含Result Policy，Checkpoint V3、Admission V2与结算证据继续闭合同一身份。
- 新Resolver测试源码、三模式组合元数据和P2治理标记已登记但未执行。Timeline、Race/Survival hard-limit、重生保护平衡和敌人首发上限均未改变；状态为`code-written-not-run / production-unreachable / hardGate=false`。

### 2026-08-12 P2.0q 三模式终局Objective Policy权威事实断言

- 按[ADR-132](../decisions/132-arena-v2-terminal-objective-policy-authority-fact-assertion.md)在`arena-match`新增`ModeObjectivePolicyResolverV1`。Resolver读取当前tick独立权威事实并验证现有Result的结束原因，只拒绝错误结果，不写入或修正胜负。
- Duel Authority向Mode Driver提交不包含Result reason的参与者`status / lives / eliminations`事实：一人/两人淘汰分别闭合`last-participant-standing / simultaneous-elimination`，无人淘汰时按既有稳定分数顺序闭合`timeout-score / timeout-draw`和winner。
- Race Mode System用同tick有效finish claim集合闭合`finish-claimed`与共享winner；无claim只有达到本局显式fixture hard limit才允许`no-finisher`。Survival用`playerFell / fallCount`闭合第二次掉落终局；未达两次掉落只有达到本局显式fixture hard limit才允许`survival-time-cap`。
- Objective断言先于Result结构断言和终局身份提交。显式Registry路径把Objective bundle纳入三模式Driver hash；旧无Registry路径不提交该bundle，原行为和原hash算法保持不变。
- 本批只验证既有`.test.` fixture的因果一致性，不把fixture hard limit提升为产品Timeline批准；`timelineRuntimePolicyConsumptionWired=false`、默认Registry/Composition/Entry关闭。延期测试源码和治理登记已写，所有运行验证继续为`not-run`。

### 2026-08-12 P2.0r 显式Timeline Policy运行镜像能力

- 按[ADR-133](../decisions/133-arena-v2-explicit-timeline-policy-runtime-mirror-capability.md)新增`ModeTimelinePolicyResolverV1`。它不推进时间，只验证resolved Timeline bundle与当前唯一权威时间写入者的准备时长、active hard limit和sudden-death语义逐字段一致。
- Duel Mode Driver新增可选`timelinePolicyBundle`，启用后以MatchCore输出的总tick、active tick、phase和准备剩余时间做开局、逐tick与恢复断言；未提交bundle时保留原行为、原Objective/Result路径Driver hash和原无Policy Driver hash。
- Duel动作/淘汰在时间线推进前结束比赛时，总tick已完成而active tick保持终局前值；Timeline Resolver只在首个active step已经开始、active tick严格小于hard limit且同拍终局Result存在时接受精确一拍差，并以该active tick复核突然死亡边界。只有硬时限终局允许active tick推进到hard limit后结束；倒计时刚结束但尚未执行active step、越过hard limit、早期终局却已推进active tick、非终局差值或更大差值继续失败关闭。
- Race/Survival Mode System新增相同可选端口；构造期必须先让fixture镜像与Timeline Policy完全相同，之后才允许把bundle纳入Driver身份并作为同一hard limit来源。不存在运行中切换或Policy/fixture二选一。
- Runtime Policy Binding新增唯一Timeline bundle投影函数；在本切片落盘时Registry候选与部分纵向研究Runtime时间值不一致，因此不自动注入。后续P2.0w已用未批准产品提案对齐镜像，但未改变`explicitTimelinePolicyRuntimeMirrorWired=false / timelineRuntimePolicyConsumptionWired=false`。
- 当前Duel 30/1800/3600、Race纵向fixture与Survival场景时限均未修改；正式时长和平衡批准、默认Registry/Composition/Entry及三模式真实接线继续顺延。延期测试和治理源码已写，所有运行验证为`not-run`。
- Survival同tick第一次玩家掉落与显式fixture hard limit重合时，Mode System仍提交`count-player-fall`，但终局优先于复活调度，不再生成随后必然失效的`schedule-player-respawn`；第二次掉落仍以`terminal-player-fall`优先，数值与Result合同不变。
- Race/Survival Authority现在会在应用任何返回命令、发布事件/公开帧或提交新hash前，先闭合`resolution.tick`、ModeProjection、ModeState、Result和唯一末尾终局命令；Projection/ModeState必须为同一Mode、同一Definition、同一revision与当前`lastProcessedTick`，revision每tick只允许原地或前进1。终局命令与顶层Result必须完全同一；任一漂移都会让World Authority/Runtime失败关闭，不对外暴露半提交帧。ModeSystem在Resolver内部的状态提交仍属Driver所有，不写成“Mode状态尚未变更”。
- 共享WorldSnapshot参与者状态严格保持`active / respawning / eliminated`；Race的`racing / finished`和Survival的slot active只存在ModeProjection。Race已完赛/仍在场角色与Survival time-cap存活玩家保持`active`以支持终局展示；终局时仍在掉落复位、未激活enemy slot或第二次掉落玩家才投影为`eliminated`。本批不新增schema或修改胜负规则，运行验证继续为`not-run`。

### 2026-08-14 P2.0t Timeline接线资格报告

- Duel配置、Race fixture和Survival动态hard limit现各自公开同一权威消费源派生的只读runtime mirror；原运行逻辑也改为读取该镜像，避免为了报告再维护第二套手写时间值。
- 新资格报告只接受来自同一Registry的三份已验证Runtime Policy Binding，拒绝混合Registry或由调用方提交mirror。它比较三模式Policy，其中Survival覆盖全部1/4/8/12/16敌人数及resolved Pressure阶段，逐变体列出三个时间字段的精确差异。
- 真实Mode Registry Preflight摘要携带该报告，使上层无需创建比赛资源即可知道当前为何不能接线；摘要仍不是授权令牌。存在差异时为`blocked-by-runtime-policy-mismatch`，完全一致时也只为`awaiting-balance-approval`。
- `balanceApprovalStatus=not-run / mayWireRuntimeTimelinePolicy=false / explicitTimelinePolicyRuntimeMirrorWired=false`保持不变，不注入Timeline bundle，不修改现有Duel/Race/Survival数值、Replay、Driver hash或默认入口。延期测试、治理反证和文档已写，未运行任何测试、类型、构建或性能任务。

### 2026-08-15 P2.0u / P3.4g Survival交互式与验证时间身份拆分

- 静态审计确认同一Survival shared-world Authority此前把验证脚本等待压力目标后再驱动两次掉落的`fallDriveStartTick`同时写成玩家初始无敌时间；真实QuickMatch因此会在开局后数千至上万tick内错误屏蔽敌人命中。当前Authority改为显式接收深冻结、exact-key的execution timing：交互式产品候选固定`initialPlayerProtectionTicks=0`，首次复活后的30 tick保护仍只由既有Respawn Policy提供；验证runner才持有`scenarioFallDriveStartTick / verificationScenarioMaximumTick`。
- execution timing的purpose、人数、交互式本地hard limit、验证调度字段和content hash进入Match config内容身份、Mode Driver fixture identity及Authority checkpoint V3。恢复时完整重算并核对execution timing，不能把verification checkpoint换成interactive purpose，也不能靠相同seed/roster绕过。
- Survival现有1/4/8/12/16本地hard limit行为被原值冻结为单一`unresolved`候选表，避免继续从验证场景预算实时派生；这只保留当前Runtime行为，不是Timeline产品批准。`explicitTimelinePolicyRuntimeMirrorWired=false / balanceApprovalStatus=not-run / defaultRegistryWired=false / defaultCompositionWired=false / defaultEntryWired=false`保持。
- 延期行为测试、P2/P3 reachability和边界治理源码已写但未运行。状态：`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### 2026-08-15 P2.0v / P3.4h Race交互式与验证时间身份拆分

- Race本地hard limit此前由`MAXIMUM_SCENARIO_TICKS - preparingTicks`反向生成，同一fixture又同时供交互式QuickMatch和验证runner使用。当前保留既有5940 active tick行为为独立、未批准的本地产品候选；6000 tick仅作为verification scenario watchdog，不再参与产品fixture或公开帧时钟推导。
- 交互式与验证路径分别创建deep-frozen、exact-key的execution timing。timing hash进入私有`createConfig`生成的mode policy/config身份，并进入保持`.test.fixture`治理身份的Mode fixture；有Registry binding时原有`.registry-${runtimePolicyBinding.contentHash}`后缀继续保留。Mode Driver/checkpoint恢复因此不能跨purpose接管。
- Race Authority的准备期、active tick和remaining tick统一读取同一execution timing；产品wrapper只创建`interactive-product-candidate`，scenario runner只创建`verification-scenario`。Timeline Policy仍未接线、hard limit未获得balance approval，默认Registry/Composition/Entry保持关闭。
- 延期规格、P2/P3 reachability和边界治理源码已写但未运行。状态：`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

### 2026-08-15 P2.0w 三模式Timeline产品提案与Survival变体

- 按[ADR-135](../decisions/135-arena-v2-three-mode-timeline-product-proposal-and-variants.md)新增Timeline V2变体：Duel/Race精确一个default，Survival按1/4/8/12/16敌人数严格有序覆盖。旧字段形状仍按V1处理，`contentVersion`保留原任意正安全整数语义；旧形状`contentVersion=2/3`不会被误判为V2，规范化字节与hash保持。
- `arena-product-content`新增唯一`preserved-current-runtime-values / proposed-not-approved`提案，三模式Runtime镜像只读该来源，数值保持Duel 30/1800/3600、Race 60/5940及Survival 4930/6130/9730/12130/13330不变。验证watchdog不再拥有这些产品值。
- 产品三模式Registry候选强制Timeline提交与提案逐模式hash一致；通用ModeRegistry仍支持合法旧Timeline。Runtime Binding仅允许“旧形状全同版”或“基础Policy V1 + Timeline V2”，V2 selector与绑定身份进入投影hash。
- 资格报告现逐变体得到`runtimeMirrorsAligned=true / alignmentStatus=awaiting-balance-approval`，但`mayWireRuntimeTimelinePolicy=false / timelineRuntimePolicyConsumptionWired=false`保持。默认Registry/Composition/Entry仍关闭；延期规格和治理标记已写，所有验证均`not-run`。

### 2026-08-13 P2.0s 声明then字段的同步端口失败关闭

- 静态复核发现多份同步返回边界只拒绝函数型`then`，会把`{ then: null }`或同时遮蔽`constructor/then`的Promise对象当成普通同步数据继续传递。该形状虽然不满足JavaScript thenable调用条件，但在项目同步端口属于含异步协议保留字段的歧义对象，不能进入后续业务解析。
- `arena-contracts`共享`assertSynchronousReturn()`和Product Content、Reward、Session、Product Session、Product Match、Composition、MatchCore/checkpoint/Replay/Mode Runtime、Participant、QuickMatch、Result Assembler等包内私有副本统一为：原型链任意层级只要声明`then`描述符就失败关闭；访问器保持专属错误，数据字段无论函数、`null`或其他值都不执行并拒绝。Input Pilot的Workspace CAS/Enrollment持久化、Regression Runner与三模式Quick Match预检也改为复用同一共享合同，删除各自只识别函数then或`instanceof Promise`的分叉。原生Promise仍只在捕获的`then/species`描述符完整时品牌探测并用NOOP收容。
- HUD相机投影删除手写无界`then`扫描，改为有界捕获`project`数据方法并复用共享同步合同；相机结果再按五个自有数据字段归一化，访问器不执行、缺字段和未知字段均失败关闭。明确允许异步的Profile open、Coordinator prepare、诊断观察和`resolveSyncOrNativePromise()`没有收窄；普通对象`{ then: null }`在这些异步业务端口仍按原合同处理，只有明确同步端口改变。
- 待执行反证覆盖共享合同、遮蔽Promise、Content、Reward、Session、Product Match、Presentation同步读取、Input Pilot原子CAS/持久化、Regression候选销毁、MatchCore/checkpoint清理、Mode Runtime记录回滚、Participant候选回收、Quick Match后续端口隔离与Result发布失败关闭；全部登记进P2聚合测试入口但本批不执行。其余已有函数then/accessor/Promise子类/循环/32层/描述符漂移用例继续作为同一边界证据。玩法、输入、事件、Result、Replay/hash、奖励数值、Profile schema、默认Registry/Composition/Entry均未改变。
- 本批只写源码、测试源码和台账；测试、类型、lint、构建、压力、性能、浏览器、设备与真人验证全部按ADR-119顺延，状态为`code-written-not-run / production-unreachable / hardGate=false`。

主协调据此开放P2.0b生产不可达候选，精确新增写域为：

- 主线程：`packages/arena-contracts/src/match-event-v6.ts`、`match-read-frame-v3.ts`及对应`packages/arena-contracts/test/match-event-v6.test.ts`、`match-read-frame-v3.test.ts`；
- 当前Arena开发线程：`packages/arena-contracts/src/arena-public-supply-projection-v3.ts`与`packages/arena-contracts/test/arena-public-supply-projection-v3.test.ts`；
- 首轮曾冻结共享出口；后续ADR-118仅允许主协调单写导出显式版本化P2候选。V2/V5语义、manifest、默认MatchCore/Replay、生产Composition和所有三端入口继续冻结；测试只编写不运行。

### 后续实现切片、唯一写者与交接点（预注册，不构成授权）

后续按“合同先冻结、共享出口单写、每片可独立回滚”拆分。表中路径是最大候选写域，实际授权必须再次缩小到精确文件；前一片未提交七维静态自检、变更治理和主协调审阅时，下一片不得开始。用户于2026-08-10进一步明确要求开发到下一性能聚合点再统一补验，因此ADR-118现开放P2.1-P2.5候选实现；该授权不开放默认Registry、三端生产入口、P3、阶段完成或发布。

### 2026-08-10 P2.0b静态交接与P2.1连续开发授权

- P2.0b新增`match-event-v6.ts`、`match-read-frame-v3.ts`、`arena-public-supply-projection-v3.ts`及三份对应测试代码；未修改V2/V5语义，未接入共享生产组合。
- 静态审查已修正事件规范排序、Race/Survival终局tick边界、供给子集双向闭包、V3 world/Mode/Result/sidecar身份闭包；`git diff --check`通过，但test/typecheck/build/performance均为`deferred-by-ADR-118`，不能记绿。
- P2.1a由当前Arena开发线程只新增V6 config、participant、ModeSystem与policy resolver候选；主协调并行负责P2.1b Product Result V3/PublicInfo V2及共享版本化导出。两写域不重叠，禁止修改默认生产入口或旧V5合同。
- P2.1完成静态交接后可继续P2.2-P2.5；到P2.6前必须停止功能扩展并按ADR-118集中补验。

### 2026-08-10 P2.1-P2.6连续开发落盘状态

- **P2.1**：已落下V6 MatchConfig、2-17人Roster/ParticipantSystem、ModePolicyResolver、ModeSystem、Participant Assignment V2、ProductPublicMatchInfo V2与ProductMatchResult V3候选；角色、队伍、controller、slot/generation与public identity分离，未切换旧V5默认入口。
- **P2.2-P2.4**：已落下Duel等价适配、Race ModeSystem、Survival ModeSystem、共享Mode runtime合同及对应测试代码。Race基础候选冻结60 tick倒计时与180 tick重生语义；后续ADR-121新增30 tick保护和双地图公共fallback锚的唯一生产不可达Respawn Policy候选。Survival基础候选冻结两次fall、固定slot/generation和显式pressure/tier输入；ADR-120新增60/30及双地图同语义safe anchor候选。两类保护最终平衡、hard-limit与其余未决数值均未注册为默认生产内容。
- **P2.5a**：已落下具名随机流Assignment Plan V2与Frozen Mode Content Pool V2，形成`roster → content → finalized assignment`原子闭包；调试或未来覆盖不得改变其它具名流。
- **P2.5b**：已落下V6事件→Equipment Usage→Product Result V3汇总、模式奖励Definition/Registry/Resolver/Committer、具名随机流QuickMatch、多controller本地Session与Product Session `reward-pending`事务候选；奖励只读取终局Mode结果，不按武器使用次数、临时tier或等待时长增加经验。
- **P2.5c**：已落下Replay V6、Mode Checkpoint V2、V6双跑/恢复identity回归验证，以及显式`ModeProductSessionCompositionV2`候选；保存完整Mode/assignment/content/config/checkpoint/final identity。默认Replay、既有golden manifest、默认生产Composition和三端入口保持冻结。
- **P2.5d具体Mode runtime**：已新增生产不可达的`ModeMatchRuntimeV6`静态候选及测试代码，可统一驱动Duel/Race/Survival现有候选系统，并在提交前闭合seed/config/backend、participant、mode command hash、V6 event、V3 post-frame、Replay V6与ModeCheckpoint V2身份；生命周期、失败关闭、清理重试和ModeLocal exact-key已完成源码级七维复核。测试、类型和构建均未运行，因此只标记`static-candidate-landed`。
- **P2.5e中局恢复runtime**：已新增exact-key复合runtime checkpoint、authority opaque checkpoint、输入/事件/Replay/Mode checkpoint前缀闭包、Duel/Race/Survival driver恢复及原子恢复入口。ADR-122进一步新增V3，在完整V2外绑定标准化Mode Driver内容hash，并在读取替换authority前预检Duel Policy Bundle或Race/Survival fixture；V1/V2兼容入口仍保留。P2.6真实工厂已改为每局并列执行continuous与restored两条链，restored使用V3精确一次导出中局checkpoint、销毁旧runtime、恢复新runtime并继续，随后对完整输入前缀、事件内容/顺序、Replay V6、ModeCheckpoint V2序列、ModeResult、authority/final hash和终局tick逐字段比较，失败时两链均先清理归零。该断言与反证测试源码已落盘，但编译和运行均未执行，仍不能标记行为通过。
- **P2.5f终局tick合同修正**：`MatchReadFrame V3`保持schemaVersion 3，终局帧现静态约束为authority在pre-step tick `T`发布`MatchEnded`且`ModeResult.endedAtTick=T`，post-step `world.tick=T+1`并携带同一result；`ModeMatchRuntimeV6`在提交事件、输入与checkpoint前再次核对resolution/event/post-frame三方关系。旧`endedAtTick===post world.tick`、过旧tick、tick0终局、future key与访问器终局帧反证已写入测试代码；P2/P3回归夹具已机械迁移，但任何测试、类型、构建或运行命令均未执行，状态只能是`static-contract-patched-not-run`。
- **P2.5g/P2.5h终局结算身份闭包**：P2.5g先以Result/完整Replay V6证据信封闭合终局权威字段、参与者和事件重建摘要；P2.5h再以Runtime终局证据V1、Admission V2和Product结算证据V2绑定实际Mode Driver hash。正式Quick Match只从已构造未启动的Session读取Driver身份，正式Learning Bridge只在终局读取同一Runtime证据；V1/V2版本不能混用或在绑定后切换。Replay V6、Result V3、Profile和玩法数值均未升级，源码与反证测试已写但未运行。
- **P2.5i完整补给事实恢复与终局证明**：Runtime Checkpoint V4在完整V3上绑定Survival从sequence 0开始的补给事实前缀；Runtime Terminal Evidence V2绑定Replay V6、Mode Driver、完整事实、stream/lastSequence/count与对应hash，并在创建和验证时重放精确装备实例归属。旧Checkpoint V1/V2/V3继续兼容恢复，但当Survival旧恢复已越过非空补给水位且缺少前缀时，只允许继续旧能力，禁止导出V4或Terminal V2伪装完整证据。三模式Runtime、Session、Product与正式Learning Bridge的V2/V3消费链源码和反证规格已写，测试、类型、构建及运行均未执行。
- **P2.5j逐帧补给事实显式传递**：三模式Authority每次已提交step都必须显式发布`supplyFacts`；Duel/Race提交空数组，Survival提交本tick完整事实增量。Runtime、Authoritative Local Session、Mode Product Session和Learning Bridge逐层把该字段列为required，任一层缺失都在事件、HUD投影、终局证据或成长消费者前失败关闭；不再允许下游以空数组兼容掩盖上游丢失。延期反证规格与治理标记已写，测试、类型、构建及运行均未执行。
- **P2.5k本地跳跃能力开局/逐帧显式传递**：Duel、Race、Survival三个正式Authority已在start与每个step发布本地玩家`localJumpAvailability`；Mode Match Runtime现在于提交自身状态前要求该字段，Authoritative Local Session继续核对tick、event sequence和participant身份，Product Session与Learning Bridge在状态、Result Assembler或Learning事件推进前要求同一纯数据字段。补给事实与命中方向仍严格只属于step，不被错误扩大到start。缺失不能延迟到正式触控入口才暴露。该批不新增按键、技能、空中跳次数或Movement推导，测试、类型、构建及运行均未执行。
- **P2.5l真实primary press/hold可用性**：Duel从MatchCore已生成的Action Affordance读取本地`primary / primaryHold`；Race和Survival从各自当帧Rule Actor集合调用同一Action Resolver的`local-context-primary`投影。正式local sidecar不再硬编码“primary永远selected、primaryHold永远none”，因此准备期、冷却、动作占用、硬直、掉落/冲线终态和蓄力武器均能公布真实可用性。不改Action Resolver、输入或武器数值；所有运行验证顺延。
- **P2.0-P2.5h七维静态加固**：开发线程已在不运行命令的前提下完成全链静态复核并落下最小修复：生命周期错误使用opaque包装，Local/Product Session失败清理保留retry ownership，swallowed reentry失败关闭，participant异步resource factory rejection被收容，Result assembler拒绝authority tick回退，Registry hostile ID与Reward recoverable descriptor trap不再绕过终态。主协调随后对上述关键源码做独立只读复核，未发现需要扩大写域的阻断性问题；这仍不是编译或运行通过。
- **P2.6a聚合基础设施**：已新增P2候选定向测试编排器、生产入口不可达/禁止依赖/工作区幽灵依赖与环依赖治理脚本，以及独立`ArenaModeGoldenManifestV2`与`ArenaModeVerificationPlanV1`合同候选。新Golden合同可表达Duel、Race排名和Survival结果身份；验证计划预注册Race 2/3/4人、Survival 4/8/12/16 slots每档30+ seed、三模式30分钟等效长局与100局rematch，并固定`production-unreachable`和`.test.`fixture边界。二者都没有修改旧V5 golden manifest、写入游戏硬时限/默认敌人数或生成任何绿证据。
- **P2.6b无渲染编排候选**：已新增`runArenaModeVerificationPlanV1`，只接受注入的同步runtime factory，逐case/seed强制双跑，核对authority/replay/checkpoint/mode result/final身份，并对长局tick、rematch数量、资源归零、构造/执行/清理失败和异步Promise执行做失败关闭；`validateArenaModeVerificationReportV1`再按原Plan逐case/seed重算持久化报告身份，拒绝顺序、计数或hash篡改。该编排器尚未绑定生产Composition，也未运行，所以只关闭“后续如何执行/复核”的代码缺口，不形成任何正确性、压力或性能结论。
- **P2.6a命令入口**：根脚本已登记`npm run check:p2:candidate-boundaries`、`npm run arena:p2:candidate:test`与串联入口`npm run arena:p2:candidate:gate`；完整`check:governance`也将消费P2只读边界检查。上述命令均只表示未来聚合顺序，当前一条也未执行，退出码和Coverage仍为`not-run`。
- 上述源码与测试均未执行test/typecheck/lint/build/stress/performance，统一标记`deferred-by-ADR-119`。当前仅表示实现候选已落盘，不表示P2完成或引擎安全上限已知；P3并行开发仅限生产不可达候选。

| 切片 | 唯一写者 | 最大候选文件/目录 | 输出与独立门 | 明确禁止 |
|---|---|---|---|---|
| P2.0a Mode/Policy Definition | 开发A | 新增`arena-definitions/src/mode-definition.ts`、`mode-policy-definition.ts`、`mode-registry.ts`及独立测试 | 九Policy exact-key、引用闭包、`.test.`隔离、恶意输入与冻结复制；不接Core | 修改MatchCore/Contracts/Product、注册未决生产数值 |
| P2.0b V6权威合同 | 开发A | 新增`arena-contracts/src/match-read-frame-v3.ts`、`arena-public-supply-projection-v3.ts`、`match-event-v6.ts`及独立合同测试 | V2/V3隔离、V6事件payload、V3 identity validator和future-schema拒绝 | 修改V2/V5文件语义、Product自行复制validator |
| P2.1a Core通用参与者/Mode系统 | 开发A | `arena-match/src/match-config.ts`、`match-participant-system.ts`及新增`match-mode-system.ts`、`mode-policy-resolver.ts`与权威测试 | 可变有界参与者、唯一写者、构造失败回收、Duel尚未迁移前入口关闭 | Replay/Session/Product/Composition、顺手改Duel手感 |
| P2.1b Result/Public下游封套 | 开发B | `arena-product-contracts/src/product-match-result-v3.ts`、后续独立public-info v2合同文件及测试 | Result V3、usage摘要、public participant identity exact-key；只消费已冻结authority合同 | Contracts/MatchCore、默认local=`player-1`、把新模式降级Duel |
| P2.2 Duel等价迁移 | 开发A | `arena-match/**`的已授权Mode策略/Replay适配文件与Duel golden测试 | V5历史只读、V6 Duel逐事件/hash等价、失败关闭 | Product/Session/golden manifest；任何数值或手感调整 |
| P2.3 Race Core | 开发A | 已授权Race policy、ModeSystem、checkpoint/read-frame生成与无渲染测试 | 2/3/4人、倒计时、终点/并列/锚点/180 tick重生、hard-limit；生产入口仍关闭 | 地图正式内容、Renderer/UI、猜测未决保护值 |
| P2.4 Survival Core | 开发A | 已授权Survival pressure/tier、slot/generation、V3供给身份与权威测试 | 两次fall、固定slot、P1 599/600/601、tier identity、最大候选4；生产入口仍关闭 | 动态敌人ID、Profile临时等级、改P1生命周期 |
| P2.5a Assignment/Content | 开发B | `arena-matchmaking/**`、`arena-product-content/**`的独立v2文件与测试 | roster→content→final assignment原子化、具名流隔离、构造失败无半发布 | MatchCore/Definitions、未决production Definition |
| P2.5b Product/Session/Reward | 开发B | 经授权的`arena-product-match/**`、`arena-quick-match/**`、`arena-session/**`、`arena-product-session/**`、`arena-product-progression/**`、`arena-progression/**` | 多controller事务、Result/Reward幂等、reward-pending、跨Mode rematch；Race/Survival入口保持关闭 | Presentation、复制Core规则、Profile加入战斗属性成长 |
| P2.5c Replay/Regression/Composition | 开发B | `arena-regression/**`与经交接授权的Composition/golden场景文件 | 三模式二次执行、恢复identity、V5历史策略、生产不可达测试 | 改开发A权威实现、直接修改共享manifest/index |
| P2.6 聚合门 | 主协调指定单写者 | 版本化`index.ts`复核、package manifest、根脚本、golden manifest、无渲染验证编排器、架构测试 | 审计已提前单写的版本化导出，再按签核顺序接测试/构建聚合；不得接生产默认入口 | A/B并发编辑共享出口、在聚合时修规则或补默认值 |

交接协议固定为：写者先报告`起始HEAD + 起始dirty fingerprint + 精确文件白名单`；完成后提交七项自检、逐文件diff、命令原文/退出码、失败轮和回滚hunk；主协调只在共享树无重叠后批准下一片。`index.ts`、manifest与golden manifest由主协调在聚合片指定一个临时唯一写者，另一开发保持只读。任何越过白名单的必要修复必须停止当前片、记录原因并重新授权，不能以“只改一行”为由跨域。

### Survival enemy slot上限预注册矩阵

必须区分两个数值，二者都未通过前不得写入默认Definition：

- **引擎安全上限**：权威Core在无渲染、严格Replay、资源有界和清洁CPU证据下允许注册的绝对最大slot数。
- **首发内容上限**：在引擎安全上限以内，经P3镜头/遮挡/路线、A2身份可读、真机性能和真人压力曲线验证后实际用于生产内容的更低上限。

2026-08-02冻结的三层口径如下，数值身份不得互相替代：

| 层级 | 当前值/状态 | 允许用途 | 禁止解释 |
|---|---|---|---|
| schema/测试候选绝对天花板 | `16` | Definition基础validator拒绝大于16；测试工具可注册4/8/12/16档以寻找真实安全上限 | 不是性能安全值、不是生产默认、不是首发敌人数 |
| P2实现期生产内容候选上限 | `4` | P2.0通过后，生产组合候选最多预注册4个enemy slots；先实现稳定slot/generation与失败关闭 | 不代表4已通过正式Core、长局、性能、镜头或真人 |
| 已证明引擎安全上限 | `null / unresolved` | P2.6在正式Core和最终source identity上完成4/8/12/16矩阵后，取连续全绿最高档 | 不得用ADR-048研究原型、单seed或污染CPU填值 |
| 首发内容上限 | `null / unresolved`，且未来必须`<=min(4, 已证明引擎安全上限)` | P3/A2/P7完成地图、遮挡、压力曲线、三端和真人后再冻结；若证据支持更高值，必须另开ADR而非自动抬升 | 不得自动等于引擎安全上限，也不得因“同一种敌人制作便宜”增加 |

候选`4`只来自[ADR-048](../decisions/048-arena-v2-survival-multi-enemy-pressure-boundary.md)与[研究结果](../research/arena-v2-survival-loop-prototype-results-v1.md#6-多敌自主压力与武器争夺原型验证)：1/2/4敌人曾在研究工具中共享Rule/Physics并保持确定性，分阶段4敌样本在27.08秒触发第二次掉落。但该样本没有完成全部刷新阶段，也没有生产MatchCore、Replay V6、30分钟等效资源、清洁CPU、正式地图/镜头或真人可读证据，所以只能支撑“实现候选不超过4”，不能支撑`engineSafeCap=4`。

P2.0小门只冻结上述天花板、候选值和证明协议，因此可以在不伪造最终安全数值的前提下授权有界实现；P2.4不得注册超过4的生产内容候选，P2.6和P2总门不得在`engineSafeCap`仍为null时通过。4档若任一权威、资源或性能硬门失败，Survival生产Mode退回设计；8/12/16测试即使绿，也不能绕过首发内容上限的A2/P3/P7证据。

验证候选固定为`4 / 8 / 12 / 16`个enemy slots，不假定最高档必过，也不把研究原型已验证的1/2/4敌人外推到8以上。每档至少30个唯一seed，总计120+ seed；先做正确性/资源，再在最终source identity与清洁机器上单独做性能，禁止把污染轮、不同源码或不同档位拼接。

| 维度 | 每档必须证明 | 红门 |
|---|---|---|
| Assignment/Registry | 1 human＋精确N个预注册enemy slots，ID唯一、规范排序、总数不越界 | 动态生成slot、缺失时自动补enemy、未知role降级 |
| generation/lifecycle | inactive→active→inactive→active单调generation，30分钟等效长局反复刷新后slot集合大小恒定 | generation回退/重复、失活runtime残留、集合随波次增长 |
| Rule/Physics/Targeting | 所有enemy仍提交InputFrame并共享普通命中/冲量/killY，relationship禁止敌人互击 | NPC旁路、跳过碰撞/输入、直接写玩家掉落 |
| 确定性/Replay | 每seed双跑InputFrame、事件、checkpoint、mode state、Result和final hash一致 | 只比最终hash、跳case、事件序依赖对象迭代偶然顺序 |
| 同tick边界 | 玩家第二次fall、多人enemy fall、slot刷新、供给599/600/601和终局冲突有固定裁决 | 终局后激活、已失活enemy继续命中、半提交slot |
| 资源 | participant/physics/rule/equipment/事件窗/reader/voice候选计数均有公式上限；destroy后归零 | 仅看heap快照、忽略容器/监听器/回调增长 |
| 主流程 | 每档均可从创建→多轮刷新→玩家两次fall→Result→Replay→双destroy完成 | 只能靠测试直接调用淘汰/刷新旁路完成 |
| 性能 | 正确性冻结后记录process CPU、P50/P95/P99、每tick动作/目标数和最坏档；门槛不得因敌人数下调 | wall time代替CPU、降低tick/action、污染环境挑绿 |

引擎安全上限取“连续通过全部权威、资源和正式性能门的最高档”，不是取平均；若4档也红则P2设计退回。首发内容上限不得自动等于该值，还必须在`390×844`与`1280×720`完成最小/最大敌人、多人遮挡、同一视觉族、静音/低动效和真人“威胁来自哪里/应走哪条路”任务。A2/P3/P7任一红都只能降低首发内容上限，不能篡改已记录的引擎证据。

## 分阶段实施与验收门

### P2.0：Mode 合同与 Registry 设计门

- 输出：[ADR-112](../decisions/112-arena-v2-formal-mode-definition-and-policy-boundary.md)候选、Mode Definition字段、Registry校验、三模式不可变数据、参与者角色/数量约束、终局/重生/排名策略引用、schema与历史策略，以及[美术对齐矩阵A2.0](arena-art-development-alignment-matrix.md#a20-权威事件音画职责候选)的只读事件/Cue合同。
- 只允许先写 ADR、行为映射和精确文件清单；主协调签核前不写生产代码。
- 小门：三模式规则逐项能映射到唯一字段或策略；不存在自由字符串旁路、双人默认泄漏、未决数值伪装成默认值。

### P2.1：可变参与者与通用结果基础

- 把参与者系统从“恰好两人”迁移为由已验证Mode合同给出的有界集合；角色、队伍、活动/完成/淘汰状态分离。
- Duel 必须保持现有事件、Replay、checkpoint和final hash，除已批准schema封套外不得漂移。
- 构造中途任一 registry、角色、出生点或资源失败，都必须反向回收且不发布半可用Core。
- 大门：1/2/3/4及最大敌人边界、重复/未知participant、同tick多人掉落、暂停/恢复/destroy/重入、异常注入全部通过。

### P2.2：Duel 策略等价迁移

- 先把当前1v1生命、突然死亡、超时和最后存活者语义迁入正式Duel policy。
- 小门：既有1v1黄金Replay、事件序、结果与hash严格等价；禁止借迁移修改手感、数值或拾取。

### P2.3：Race 正式 Core

- 固定2–4人、权威倒计时、终点穿越、稳定排名、攻击击落、180 tick后在最近合法安全点重生和全部完成/硬时限终局。
- “最近合法安全点”必须由权威路线进度与地图锚点决定，不能读取Renderer位置历史或墙钟。
- 小门：2/3/4人终点同tick置换、未完成者排序、重复终点、击落临界tick、锚点失效、无合法重入点fail closed、结束后输入拒绝全部覆盖。

### P2.4：Survival 正式 Core

- 固定单一人类玩家、开局空手、P1三实体供给、第一次掉落后权威复活、第二次掉落终局；敌人是有界参与者角色，临时武器等级不写入Profile。
- 敌人刷新、路线和等级Definition可延后到P3/P4注册正式内容，但P2必须先提供可验证的受限端口和上限。
- 小门：第一/第二次掉落、同tick玩家与敌人掉落、供给599/600/601、过期held release、复活时持有态、末敌状态、硬时限和异常清理覆盖。

### P2.5：Replay、Assignment、Result、Session 集成

- Replay与checkpoint记录Mode身份、参与者角色和未来相关状态；Result支持Duel胜负、Race排名、Survival生存时长/轮次，但共享同一版本化封套。
- Assignment使用具名流生成所有Bot/地图/供给身份；调试覆盖不能改变其它流。
- Session生命周期保持start/pause/resume/destroy幂等或明确拒绝；失败后不得继续运行或结算奖励。
- 大门：旧Replay策略、三模式严格二次执行、序列化恢复、构造/暂停/恢复/销毁failure injection、Profile奖励失败关闭全部通过。

### P2.6：无渲染压力与P2总门

- 三模式均可在无渲染环境完整结束；覆盖最大参与者、最大敌人、长局、100+ seed与资源上限。
- 必跑：受影响单测、三模式golden、architecture、strict typecheck、lint、包构建、完整`npm test`、stress/soak、文档检查和`git diff --check`。
- P2总分必须 `>=90/100` 且每个维度 `>=80%`；性能、Coverage、设备或真人硬门不能由Node通过替代。

## 双开发零重叠写域

线程服务恢复并取得精确回执后，按以下固定边界授权；在此之前全部保持只读：

| 线程 | 顺序与职责 | 独占写域 | 禁止写域 |
|---|---|---|---|
| 主开发 `019fa7c7-d26e-7111-9054-782634e5c54c` | P2.0后负责Definition/Registry、Contracts、MatchCore、participant/mode policy、权威单测 | `packages/arena-definitions/**`、`packages/arena-contracts/**`、`packages/arena-match/**`及对应权威测试 | Product/Session/Composition/Presentation、美术资产、commit/push |
| 第二开发 `019fb364-d211-7513-b040-640045598ad6` | 合同冻结后负责Assignment、mode-aware content pool、Product Result、QuickMatch/Session、奖励、Composition、Regression/golden与集成测试 | 经逐小门授权的`packages/arena-matchmaking/**`、`packages/arena-product-content/**`、`packages/arena-product-contracts/**`、`packages/arena-product-match/**`、`packages/arena-quick-match/**`、`packages/arena-session/**`、`packages/arena-product-session/**`、`packages/arena-product-progression/**`、`packages/arena-progression/**`、`packages/arena-product-v1-content/**`、`packages/arena-product-composition/**`、`packages/arena-v1-composition/**`、`packages/arena-regression/**` | Definition/Contracts/MatchCore、Presentation、美术资产、commit/push；不得把整行写域视为一次性授权 |
| 美术 `019fa7c3-a20b-7130-b99a-cba1e6cbd4b2` | 只读消费稳定事件与地图/模式合同，维护美术对齐矩阵；A0.3与A1.1未过门前不扩正式资产 | 经主协调逐批授权的美术文档、来源包和表现资产 | Rule/Core/Mode/Replay/Result/随机/胜负、开发线程写域、commit/push |

共享 `index.ts`、package manifest、根脚本、golden manifest和治理文档默认由主协调指定唯一线程单写；未指定时任何线程不得修改。若批次必须跨写域，先停另一线程并在本台账记录精确交接，不允许“顺手修复”。

## 每个小门/大门的强制开发自检

开发线程通知验收前必须先提交自检报告；缺少任一项，主协调不开始验收：

1. **健壮性**：未知字段、恶意getter/Proxy、非法schema、缺失Definition、重复ID、越界人数、非有限数、超安全整数均在权威变更前拒绝。
2. **竞态与确定性**：同tick输入置换、多人同时终点/掉落/拾取、pause/resume与异步消费者重入，不依赖调用顺序、墙钟或对象枚举偶然顺序。
3. **兜底与失败关闭**：构造、step、Replay、存储、奖励和destroy异常不留下半提交状态；兜底不能伪造胜负、排名、奖励或资产成熟度。
4. **边界情况**：最小/最大参与者、0/1/2次掉落、179/180/181重生tick、终点临界、硬时限、无合法锚点、全部同时结束与空集合路径有明确测试。
5. **生命周期**：start/pause/resume/destroy、双destroy、构造失败回收、结束后输入、reader失效、恢复identity与资源上限均有证据。
6. **主流程阻断性Bug**：三模式从创建、开始、输入、掉落/终点、结束、Replay到Result全链路无渲染跑通；任何不能完成一局的问题直接判红。
7. **变更治理**：列出精确文件、行为映射、测试命令与结果、未覆盖项、风险、回滚hunk、当前HEAD/dirty fingerprint；不得隐藏失败或只挑绿轮。

## 主协调评分与提交权

每门按生产计划评分：Mode/参与者20、终局/重生20、确定性/Replay20、生命周期/失败关闭15、兼容性10、无渲染压力5、治理10。总分不足90、任一维不足80%、任一硬门红或证据身份不一致，均退回对应线程修改。

只有主协调可以把状态改为 `coordinator-approved`，并决定是否执行commit/push。开发、美术或机器检查不得自行宣称P2、真机、真人、性能或发布通过；当前明确禁止commit/push。

### P2生产计划逐项完成审计表

本表是P2最终完成审计的最小证据索引，不以“未发现问题”代替证明。每个证据必须绑定同一候选commit/build/content hash；代码、测试、Replay、压力、设备和真人证据分别声明，历史绿轮只能证明其原source identity。当前全部实现类证据仍为缺失或前置红，不能因合同完整而改成`implemented`。

| 生产计划要求 | 完成所需权威证据 | 所有者/对齐方 | 当前判断 |
|---|---|---|---|
| Mode/参与者模型20 | 九Policy Definition/Registry exact-key与引用闭包；1v1、Race 2/3/4、Survival 1+有界slot从正式Composition构造；架构检查无双人/模式旁路 | 开发A；开发B验证下游无泄漏 | 代码与测试候选已落盘但未运行，默认Composition仍关闭；`candidate/unproven` |
| 终局与重生20 | Race倒计时、并列/未完赛、finish+fall、179/180/181、锚点失效；Survival 0/1/2 fall、终局+slot冲突；完整事件与Result断言 | 开发A；A2只读消费 | Race/Survival ModeSystem与边界测试候选已落盘但未运行；`candidate/unproven` |
| 确定性/Replay20 | 三模式golden；每case同seed双跑及输入/participant/slot/对象插入置换；checkpoint恢复；V5历史接受/拒绝/future拒绝；完整事件与state/final/authority hash | 开发A权威；开发B Regression聚合 | Replay V6、Checkpoint V2、双跑回归和V6 Golden清单合同候选已落盘；实际三模式golden与运行证据缺失，`not-achieved` |
| 生命周期/失败关闭15 | 第1/N/末项Definition、controller、bundle、handshake失败注入；start/pause/resume/destroy/reentry；奖励响应丢失、release-pending、迟到Promise；最终资源归零 | A负责Core；B负责Product/Session/Reward | 生命周期实现/测试候选已落盘且正在七维静态复核；自动化与资源归零证据缺失，`candidate/unproven` |
| Duel兼容性10 | 旧V5 Replay/hash/事件/手感保持；V6 Duel批准封套差异逐字段说明；P1 599/600/601与PA5只读性能边界不漂移 | 开发A，主协调差分审计 | 当前代码仍旧行为；迁移尚未发生，不能判迁移兼容，`unproven` |
| 无渲染压力5 | 三模式可完整结束；4/8/12/16各30+ seed正确性/资源，30分钟等效长局，100局rematch，destroy归零；正确性冻结后清洁CPU性能 | A实现；B编排；主协调性能门 | P1整体advance前置与P2 Core均未完成，`not-achieved` |
| 公共schema/迁移/奖励 | V5/V6、Result v2/v3、Content v1/v2、PublicInfo v2、Read V2/V3、Reward v1/v2 exact validator；历史策略、future拒绝、grant幂等与Profile不含临时战斗等级 | 开发A权威合同；开发B下游合同 | 版本化合同、奖励Resolver/Committer与测试候选已落盘；迁移/自动化未运行，`candidate/unproven` |
| Rule→Core→Bot→Presentation依赖硬门 | 生产依赖图/architecture test证明不依赖experiment、Three.js、DOM、平台API、墙钟、`Math.random()`、通用事件总线；Presentation只读V3/Result/PublicInfo | A/B；美术A2反证 | P2不可达Node测试和只读治理脚本候选已落盘但未运行；`candidate/unproven` |
| A2模式/参与者音画对齐 | 美术线程六维自检；PublicInfo/Result/V3/Cue逐字段消费；2/3/4人、并列、no-finisher、两次fall、静音/低动效；A0.3真人10人与A1.1同源重建 | 美术线程；A/B提供稳定合同 | A2.0静态合同已绑定当前候选源码，Art Bible/Alignment Matrix正在同源重建；A0.3真人与A1.1硬红，`not-achieved` |
| 统一治理与发布 | 七项自检、精确patch、失败轮、评分原始证据、clean commit/build/content hash、本地远端一致、独立`advance`；最终三端/真人由P7另门 | 三线程；主协调唯一签核/提交 | 当前为多文件dirty候选，验证、commit和push均未执行，`not-achieved` |

最终审计必须逐行把`not-achieved/unproven`替换为指向当前候选身份的直接证据，并复核该证据真实覆盖本行完整范围；窄测试、计划文本、研究原型、旧提交或单方口头回执均不能关闭整行。P2总门通过后仍只允许进入P3，不自动宣称美术、设备、真人、200小时容量或发布完成。

## 当前未完成项

- P1 PA6正式CPU ABBA×3清洁复验。
- P2.0-P2.5h实现与测试候选已经落盘并完成对应源码级静态自检；P2.6 continuous/restored双链逐字段闭合候选也已落盘。任何测试、类型、构建或运行证据均未生成，不能据此评分或晋级。
- P2 收口时 Race/Survival respawn protection、pressure stage/刷新、硬时限与正式等级成长数值有意保持未冻结，不能被实现者自行填默认值。后续 P3 已在生产不可达候选中落下 `arena-v2-survival-pressure-candidate-v1`；ADR-120又把shared-world既有首次复活行为收敛为唯一`60 tick delay / 30 tick protection / 双地图同语义safe anchor`候选，ADR-121把Race既有行为收敛为唯一`180 tick delay / 30 tick protection / 双地图公共fallback`候选，两者均由三模式Registry和对应Runtime共同消费。P2.0w再把当前三模式hard limit收敛为`proposed-not-approved`Timeline提案，但未授予最终平衡批准。所有候选均未运行、未接默认 Registry/Composition，不反向把 P2 门标记为通过；最终平衡数值仍未冻结。
- P2.6当前已有聚合脚本、不可达治理、Golden清单、压力矩阵合同和同步无渲染双跑编排器候选；实际三模式runtime factory/fixture绑定、golden生成、历史Replay兼容运行、4/8/12/16压力、30分钟等效长局、100局rematch和资源归零仍未执行。
- Profile奖励自动化、P1 PA6/PA7性能、设备、真人、A0.3和A1.1证据均不存在或未更新；默认Registry、生产Composition、三端入口、P3、commit和push继续关闭。
