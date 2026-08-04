# Arena V2 P2 正式模式实施状态台账

## 当前状态

- 状态：`design-preaudit-candidate / ADR-112-proposed / implementation-not-authorized / hardGate=false`。
- 日期：2026-08-02。
- 目标：严格执行[生产化分阶段开发与治理计划](arena-v2-production-development-plan.md)的 P2，把 1v1、2–4 人竞速和单人生存从研究原型迁入同一正式 Mode/MatchCore。
- 前置红门：P1整体尚未取得独立`advance`；其中PA6正式CPU ABBA×3、PA7正式300/120、Coverage、Platform/三端/真机和治理提交仍未完成。当前共享工作树不是最终clean source identity；三个协作线程的最新精确回执仍为`notification-unconfirmed`。
- 权限边界：本台账只允许 P2 只读预审和文件级拆分，不授权生产代码、schema 迁移、golden 更新、commit 或 push。

### 当前source identity与越权写入复核

- 分支：`feature/arena-v2-design-docs`；HEAD与upstream均为`d750e4caa767332b5c3caaf247080b5717d56219`。
- 共享工作树当前为`131 modified-or-staged / 41 untracked`（共172路径），不是clean commit；这些文件包含既有P1/PA6、美术与本轮治理文档，不能仅凭路径推断线程归属。
- 2026-08-02本轮再次对`packages/ scripts/ tests/ src/ public/`只读扫描，未发现`ModeDefinition`、`MatchModeSystem`、`ProductPublicMatchInfoV2`、`ProductMatchResultV3`、`ReplayV6`或`preparationRemainingTicks`生产实现；当前没有P2生产代码越权启动。命中的`schemaVersion 6`文本均属于PA6 runner自身schema，不是P2。
- 现有P1权威、Bot、Presentation、runner与大量测试仍处于同一dirty source identity；P2不得借共享文件已修改而“顺手接入”。后续每个线程必须提供自己的起止fingerprint和精确patch，主协调按写域拒绝重叠。
- 本轮主协调先调用线程列表，再向开发A、开发B与美术线程并行发送P2.0/A2.0精确复核、互认线程ID与六维自检要求；两次调用分别等待超过60秒和50秒仍无返回后由主协调终止。送达继续记为`notification-unconfirmed`，不得推定消息已到达或把静默当作同意。
- 用户于2026-08-02明确允许忽略当前无法归属或低负载的环境残留并继续非性能工作；该授权只解除文档、只读审计和后续已签核非性能实现的调度停顿，不把污染轮变绿、不豁免PA6正式ABBA×3，也不允许在未签核P2.0前写P2生产代码。后续两次线程列表重试分别等待约25秒和31秒仍无返回后终止；三线程`wait_threads(timeoutMs=0)`即时快照也卡住约22秒后终止，状态继续为`notification-unconfirmed`。

## 当前代码独立审计结论

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

结论：P2 必须先引入只含数据的 Mode Definition/Registry，再把通用参与者、终局和重生策略接入 MatchCore；不能在现有二人分支上继续堆 `if (race)` / `if (survival)`。

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

本节把[ADR-112](../decisions/112-arena-v2-formal-mode-definition-and-policy-boundary.md)变成可审查字段，不是生产API授权。开发A必须逐字段反证健壮性和扩展边界；发现必须增加万能字段、模式分支或第二权威时，应退回设计而不是直接编码。

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
| `RespawnPolicyDefinition` | `rolePolicies` | 每项精确`modeRole / enabled / delayTicks / maximumRespawns / anchorPolicy / protectionTicks`；`anchorPolicy`判别联合仅`kind`、`kind / fallbackAnchorCapabilityId`或`kind / anchorCapabilityId`。Race competitor固定180 tick、无限次、`latest-valid-safe-anchor`并回退起始安全锚；Survival player最多1次，delay/protection/合法生存锚数值仍未冻结，P2.4生产内容门前不得注册；Duel与Survival enemy必须disabled。anchor与fallback均无效时失败关闭，禁止回世界原点。 |
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

### P2.0c 权威数值冻结矩阵v0.1

本矩阵把“schema已定义”“产品语义已确定”“生产数值已冻结”“设备/真人已证明”分开。文档中的`null / unresolved`是治理状态，不是允许写入Definition的运行值；任何必需数值未冻结时，对应生产Definition必须不存在，不能把null、0、研究样本或现有Duel默认值塞入Registry。

| 数值/集合 | 当前治理状态 | 当前允许用途 | 生产冻结证据与负责门 |
|---|---|---|---|
| Duel参与者、preparing/sudden-death/hard-limit、生命与timeout | `existing-V5-frozen` | P2.2只做V6等价迁移与显式Mode绑定 | 开发A逐事件/checkpoint/final/result差分；任何数值变化须独立ADR，不属于P2迁移 |
| Race参与者2–4、同tick并列、`no-finisher` | `product-semantic-frozen` | schema/test fixture；不得开放生产入口 | P2.3无渲染2/3/4人、终点+fall置换、硬时限与Replay；A2/P5再验可读性 |
| Race开局倒计时60 tick | `research-backed-production-candidate` | P2.3 test fixture；projection必须发布60→0 | P2.3正确性与A2首见任务共同签核后进入生产Definition；不能因动画节奏自行改值 |
| Race重生等待180 tick与最近合法安全锚 | `product-semantic-and-value-frozen` | P2.3实现/测试候选 | 179/180/181、锚失效回退、finish+fall、重复掉落、Replay与P3地图重入；失败不改180 |
| Race重生保护tick | `unresolved` | 仅显式test fixture，ID必须含`.test.`且不得由生产index导出 | P3真实拥挤/出生攻击、A2可读性和P7真机；冻结前生产RespawnPolicy不存在 |
| Race硬时限tick | `unresolved` | 仅测试最小/最大边界 | P3正式路线分布、2–4人完成率与真人放弃点；必须保证可触发`no-finisher`而非无限局 |
| Survival首波1200、间隔1200、每波3、地面生命周期600 tick | `P1-frozen` | P2.4必须复用ADR-108/110正式Definition | P1同源Replay/hash继续全绿；P2只增加tier解析，禁止重写供给顺序或墙钟 |
| Survival终局fall count=2 | `product-semantic-and-value-frozen` | P2.4实现/测试候选 | 0/1/2、同tick hit+fall、第一fall恢复、第二fall终局、Replay/Result全绿 |
| Survival首次重生delay/protection与合法锚 | `unresolved` | 仅test fixture，不进入默认Registry | P3地图安全恢复、敌人入口距离、A2因果与真人“复活后下一目标”；不得默认复用Race值 |
| Survival pressure stage起点、目标敌人数、slot重激活delay、固定入口锚 | `unresolved` | test fixture可覆盖1/2/4与schema 16，不得称生产平衡 | P2.4正确性→P2.6资源/4/8/12/16→P3地图/Bot压力→A2遮挡/真人；研究0/15/30/45秒不直接采用 |
| Survival enemy schema/实现/已证明/首发上限 | `16 / 4 / null / null` | schema恶意矩阵到16；生产候选不得注册>4 | P2.6填engine safe；P3/A2/P7填launch，详见三层上限矩阵 |
| Survival tier等级节点、wave阈值与逐武器成长字段/数值 | `schema-frozen / values-unresolved`；1/5/10仅研究 | test fixture必须使用等级专属Equipment/Action Definition与独立hash | P4逐武器平衡、地图后果、饱和/风险与真人数值理解；不能用统一百分比或只改展示数值 |
| Survival技术硬时限 | `unresolved` | test fixture可强制`survival-time-cap`路径 | P2.4长局完成、P2.6soak/资源、P7目标设备；必须有限且不宣称“胜利” |
| Duel/Race/Survival completion、winner/draw/rank/stage经验 | `schema-frozen / values-unresolved` | P2.5只用显式test Reward Definition | P6 Profile V2/容量与公平门前不进入生产内容；不得从usage、临时tier或等待时长直接膨胀经验 |

为提高开发效率但不降低目标，P1取得独立`advance`且P2.0合同门通过后，可先授权“通用系统＋测试Definition”：测试ID必须含`.test.`、位于测试夹具写域、不能由任何生产`index.ts`/default Registry/三端入口导出，并由architecture测试证明不可达。开发A/B可并行完成schema、Resolver、Core、Result和failure injection，不必等待全部平衡数值；但P2.3/P2.4生产内容小门、P2总门与用户入口仍等待本表对应证据。P1未advance期间只允许文档、字段反证、精确文件/测试计划和不改公共合同的夹具准备，不得创建P2生产源码或schema。任何把test fixture复制到生产Registry的做法直接判治理与主流程双红。

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
| `ParticipantFell` | `modeDefinitionId / participantId / modeRole / slotId / slotGeneration / fallCause / creditedAttackerId / supportSurfaceId` | `fallCause`仅`credited-hit / movement / environment`；仅`credited-hit`允许非null attacker；非enemy的slot字段必须为null |
| `ParticipantRespawnScheduled` | `modeDefinitionId / participantId / modeRole / slotId / slotGeneration / readyTick / anchorId / reason` | 只用于Race/Survival；`readyTick>=tick`；Race固定`readyTick=tick+180`；anchor必须在当局Map capability闭包中 |
| `ParticipantRespawned` | `modeDefinitionId / participantId / modeRole / slotId / slotGeneration / anchorId / invulnerableTicks` | 只用于Race/Survival且event tick必须等于已发布的readyTick；slot/generation与schedule一致；不得由动画完成触发；Duel继续复用既有`PlayerRespawned`语义 |
| `RaceSafeAnchorCommitted` | `modeDefinitionId / participantId / anchorId / progressOrdinal` | ordinal只能单调不减；重复同anchor/ordinal不发新事件；anchor必须已启用且路线合法 |
| `RaceFinishClaimed` | `modeDefinitionId / participantId / finishTick / progressOrdinal` | `finishTick===tick`；每participant只允许一次；同tick多个claim在Result共享第一，不按sequence拆分 |
| `SurvivalEnemySlotChanged` | `modeDefinitionId / participantId / slotId / previousGeneration / generation / active / anchorId / reason` | 激活时generation精确+1且anchor非null；失活时generation不变且anchor为null；participant/slot映射固定 |
| `SurvivalPlayerFallCounted` | `modeDefinitionId / participantId / fallCount / terminalFallCount / terminal` | 生产Definition固定terminalFallCount为2；`terminal === (fallCount>=terminalFallCount)`；不能由Profile或表现递增 |
| V6 `MatchEnded` | `modeDefinitionId / modeResult` | `modeResult`必须逐字等于Product Result V3进入authority hash的判别payload；它是该tick最后一个模式事件 |

V6 `MatchStarted`在既有`participantIds`之外增加`modeDefinitionId`，且participant集合必须等于finalized assignments。V6 `ActionStarted`由MatchCore在Rule已接受动作且持有runtime身份仍一致时富化；不得由InputFrame、Action候选或Presentation提前生成。旧V5事件封套和payload不修改；validator根据Replay schema选择V5或V6，禁止让同一事件对象同时通过两代validator。

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

本次只评价已经存在的ADR、字段、调用方矩阵和治理证据，不评价尚未实现的Core、压力、设备或真人产物。状态为`coordinator-preaudit / rejected-for-small-gate / implementation-not-authorized`。

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

P1整体独立`advance`、三线程回执与P2.0合同门通过后，P2.0首轮候选只允许开发A提出以下精确文件清单，主协调可在授权前缩减：

- 新增 `packages/arena-definitions/src/mode-definition.ts`、`mode-policy-definition.ts`、`mode-registry.ts`；
- 修改 `packages/arena-definitions/src/index.ts`；
- 新增 `packages/arena-definitions/test/mode-definition.test.ts`；
- ADR-112与本台账只由主协调更新。

该首轮不修改MatchCore、Replay、Assignment、Product、Session、Composition、package manifest或golden；只证明纯数据Definition/Registry。字段需要跨入`arena-contracts`时必须先提交依赖方向说明并另开P2.0b小门，不能顺手扩写。

### 后续实现切片、唯一写者与交接点（预注册，不构成授权）

为满足用户要求的双开发提速，后续按“合同先冻结、共享出口单写、每片可独立回滚”拆分。表中路径是最大候选写域，实际授权必须再次缩小到精确文件；前一片未提交六维自检、变更治理和主协调评分时，下一片不得开始。P1整体独立`advance`是P2生产实现前置，当前仅允许继续完善本表、只读反证和不改公共合同的夹具计划；PA6单门通过不会越级开放P2。

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
| P2.5b Product/Session/Reward | 开发B | 经授权的`arena-product-match/**`、`arena-quick-match/**`、`arena-session/**`、`arena-product-session/**`、`arena-product-progression/**`、`arena-progression/**` | 多controller事务、Result/Reward幂等、release-pending、跨Mode rematch；Race/Survival入口保持关闭 | Presentation、复制Core规则、Profile加入战斗属性成长 |
| P2.5c Replay/Regression/Composition | 开发B | `arena-regression/**`与经交接授权的Composition/golden场景文件 | 三模式二次执行、恢复identity、V5历史策略、生产不可达测试 | 改开发A权威实现、直接修改共享manifest/index |
| P2.6 聚合门 | 主协调指定单写者 | 共享`index.ts`、package manifest、根脚本、golden manifest、架构测试 | 按已签核提交顺序一次接线，完整门禁与可反向hunk | A/B并发编辑共享出口、在聚合时修规则或补默认值 |

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
| Mode/参与者模型20 | 九Policy Definition/Registry exact-key与引用闭包；1v1、Race 2/3/4、Survival 1+有界slot从正式Composition构造；架构检查无双人/模式旁路 | 开发A；开发B验证下游无泄漏 | 合同候选存在；代码/测试缺失，`not-achieved` |
| 终局与重生20 | Race倒计时、并列/未完赛、finish+fall、179/180/181、锚点失效；Survival 0/1/2 fall、终局+slot冲突；完整事件与Result断言 | 开发A；A2只读消费 | exact-key候选存在；正式Core缺失，`not-achieved` |
| 确定性/Replay20 | 三模式golden；每case同seed双跑及输入/participant/slot/对象插入置换；checkpoint恢复；V5历史接受/拒绝/future拒绝；完整事件与state/final/authority hash | 开发A权威；开发B Regression聚合 | V5/P1历史证据不可替P2；V6缺失，`not-achieved` |
| 生命周期/失败关闭15 | 第1/N/末项Definition、controller、bundle、handshake失败注入；start/pause/resume/destroy/reentry；奖励响应丢失、release-pending、迟到Promise；最终资源归零 | A负责Core；B负责Product/Session/Reward | 设计矩阵存在；实现证据缺失，`not-achieved` |
| Duel兼容性10 | 旧V5 Replay/hash/事件/手感保持；V6 Duel批准封套差异逐字段说明；P1 599/600/601与PA5只读性能边界不漂移 | 开发A，主协调差分审计 | 当前代码仍旧行为；迁移尚未发生，不能判迁移兼容，`unproven` |
| 无渲染压力5 | 三模式可完整结束；4/8/12/16各30+ seed正确性/资源，30分钟等效长局，100局rematch，destroy归零；正确性冻结后清洁CPU性能 | A实现；B编排；主协调性能门 | P1整体advance前置与P2 Core均未完成，`not-achieved` |
| 公共schema/迁移/奖励 | V5/V6、Result v2/v3、Content v1/v2、PublicInfo v2、Read V2/V3、Reward v1/v2 exact validator；历史策略、future拒绝、grant幂等与Profile不含临时战斗等级 | 开发A权威合同；开发B下游合同 | 合同候选存在；回执/实现/迁移测试缺失，`not-achieved` |
| Rule→Core→Bot→Presentation依赖硬门 | 生产依赖图/architecture test证明不依赖experiment、Three.js、DOM、平台API、墙钟、`Math.random()`、通用事件总线；Presentation只读V3/Result/PublicInfo | A/B；美术A2反证 | 目标边界已文档化；P2代码不存在，`unproven` |
| A2模式/参与者音画对齐 | 美术线程六维自检；PublicInfo/Result/V3/Cue逐字段消费；2/3/4人、并列、no-finisher、两次fall、静音/低动效；A0.3真人10人与A1.1同源重建 | 美术线程；A/B提供稳定合同 | 合同预审87/100；治理与真人硬红，`not-achieved` |
| 统一治理与发布 | 七项自检、精确patch、失败轮、评分原始证据、clean commit/build/content hash、本地远端一致、独立`advance`；最终三端/真人由P7另门 | 三线程；主协调唯一签核/提交 | 回执未确认、dirty 172路径、禁止commit/push，`not-achieved` |

最终审计必须逐行把`not-achieved/unproven`替换为指向当前候选身份的直接证据，并复核该证据真实覆盖本行完整范围；窄测试、计划文本、研究原型、旧提交或单方口头回执均不能关闭整行。P2总门通过后仍只允许进入P3，不自动宣称美术、设备、真人、200小时容量或发布完成。

## 当前未完成项

- P1 PA6正式CPU ABBA×3清洁复验。
- P2.0 Mode合同、九类Policy、P2.0b下游schema和A2.0音画职责已完成主协调预审，当前`92/100`但治理维度低于80%且硬门仍红；开发A/开发B/美术回执、六维自检、enemy slot三层上限、exact-key候选反证及主协调重验均未完成。Survival respawn/protection、pressure stage/刷新与正式等级成长数值有意保持未冻结，不能被实现者自行填默认值。
- 三线程精确回执尚未取得，写域授权未生效。
- Race终点/安全锚点、Survival两次掉落、临时等级和多参与者Result尚无生产实现。
- 三模式golden、历史Replay策略、无渲染最大规模压力、Profile奖励和设备/真人证据均不存在。
