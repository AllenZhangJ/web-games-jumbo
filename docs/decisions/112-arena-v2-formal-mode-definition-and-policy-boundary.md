# ADR-112：正式三模式采用数据 Definition 与注册 Policy 组合

## 状态

提议：`P2.0 implementation-candidate / verification-deferred-by-ADR-118 / production-unreachable / hardGate=false`。自2026-08-10起，[ADR-118](118-arena-v2-development-first-deferred-validation-window.md)仅授权P2.0a/P2.0b按精确新增文件形成生产不可达候选；本ADR仍未完成自动化、性能、设备、真人、美术与最终主协调验收，不得据此修改生产入口、注册未决生产数值、执行push或声称P2通过。

## 日期

2026-08-02

## 背景

Arena V2 已冻结三种首发模式：常规1v1、2–4人竞速和单人生存1vE。研究工具链已经分别证明多人KZ流程、同规则敌人、第一/第二次掉落、分阶段压力和临时武器等级假设；P1又把生存三实体供给、持有者原子替换、600 tick回收、Replay/hash、Bot观察与Presentation read model迁入生产。

这些证据仍不能直接成为正式P2：

- 当前 `ArenaMatchConfig` 与 `MatchParticipantSystem` 要求恰好两个participant；
- 当前超时、最后存活者、生命和重生语义只服务Duel；
- Map Definition没有竞速终点、权威路线进度或安全重入锚点；
- MatchAssignment与Product Result固定单个opponent和二元winner/draw；
- Replay V5、checkpoint v1与config schema v5没有Mode身份、参与者角色或模式未来状态；
- 研究原型位于`arena-v1-experiment`，按生产约束不能被正式MatchCore、Session或发布入口依赖。

直接扩大现有二人分支会把模式判断散落到Core、Session、Bot和UI；复制三套MatchCore又会让命中、拾取、物理、Replay和生命周期逐渐分叉。两种方式都违背 `Rule → Core → Bot → Presentation`、Definition/Runtime分离和单一写入者约束。

## 决策

### 1. Mode是不可变数据，不是脚本或回调

新增版本化 `ModeDefinition` 与独立只读 `ModeRegistry`。Definition只允许冻结的普通数据与Definition ID引用，不允许函数、类实例、getter、Proxy、DOM/Three.js对象、平台句柄或可变容器。

每个Mode Definition至少绑定：

- 稳定 `modeDefinitionId`、schema与模式类别；
- participant model Definition：角色、控制来源、队伍关系、最小/最大数量和初始活动状态；
- timeline policy Definition：准备、运行、硬时限及模式阶段；
- objective/ranking policy Definition：胜负、终点排名或生存计分；
- elimination/respawn policy Definition：掉落后果、重生延迟和终局阈值；
- relationship policy Definition：谁可命中谁，禁止敌人绕过普通Targeting；
- Map capability与内容引用要求，包括终点、进度、安全锚点或P1供给Definition；
- Result/Replay/Profile奖励投影的稳定policy ID，不包含表现文案或资产。
- Survival额外绑定有界pressure policy与本局equipment tier policy；其它Mode对这两个引用显式为null。pressure按预注册slot与阶段数据增加同视觉族敌人，tier policy把永久collection武器身份映射到等级专属Equipment/Action Definition，禁止运行时修改基础Definition或把临时等级写入Profile。

每类policy Definition由专属Registry校验，组合阶段一次性解析为冻结的policy bundle。禁止万能 `parameters: unknown`、自由字符串分支、运行时全局Registry查找或Definition携带任意callback。

### 2. MatchModeSystem拥有模式状态，已有System继续拥有各自权威状态

新增 `MatchModeSystem` 作为模式特有状态的唯一写入者：Duel阶段事实、Race进度/完成排名、Survival玩家掉落计数与有界敌人slot generation。它不能直接改物理、装备、参与者、时间线或Profile。

每个tick由已有权威System产出事实，注册policy只计算冻结的候选裁决；MatchCore按固定顺序把候选交给对应唯一写入者：

1. 时间线、地图与供给命令；
2. P1过期与自动拾取；
3. InputFrame与ActionResolver；
4. 物理推进与地图接触事实；
5. Mode policy对终点、掉落、排名和终局作稳定裁决；
6. Participant/Timeline/Mode各自提交状态并发布权威事件；
7. 生成snapshot、checkpoint、Replay与只读表现投影。

任一步未知错误都必须fail closed并清理，不允许Mode状态已提交而Participant/Timeline未提交，或结果已发布后继续接受输入。Presentation、Session、Bot和Profile不得重新判定终点、掉落次数、排名或胜负。

### 3. 三个首发Mode使用独立策略组合，不复制Core

#### Duel

- 恰好2个competitor；控制来源可以是human或Bot，参与者身份与控制来源分离。
- 复用当前生命、突然死亡、超时和最后存活者语义。
- 历史Duel Replay V5必须继续由V5验证路径得到完全相同的事件、checkpoint/state/final/authority hash与Result；新V6 Duel用差分证明输入、动作、事件和胜负语义等价。因显式加入Mode与participant role而批准变化的V6 config/checkpoint/hash必须逐项登记，不能伪称与V5 hash相同，也不得借迁移改手感或数值。

#### Race

- 2–4个无队伍competitor，全部使用普通InputFrame、Rule、Targeting与Physics；不增加终点、重生或拾取按键。
- participant掉落不消耗终局生命，等待固定180 tick后在该participant最近的合法权威安全锚点重生，可重复发生直到比赛结束。
- 后续[ADR-121](121-arena-v2-race-respawn-single-source-candidate.md)已把真实Runtime既有30 tick重生保护与两图公共Race fallback锚收敛为生产不可达单一候选；2–4人独立起跑格与规则fallback保持分离，保护平衡批准仍为`not-run`。
- 安全锚点只能由MapSystem依据已通过的支撑面与路线进度提交；Renderer位置历史、当前最近空间点或墙钟不得作为兜底。最近锚点失效时回退到Definition指定的起始安全锚点；起始锚点也无效则构造或tick失败关闭。
- 第一个有效终点claim结束生产比赛。相同tick内多个有效claim共享第一名；participant ID只用于事件和序列化稳定排序，不制造虚假先后。其余参与者按终局tick的权威路线进度形成排名，同进度共享名次。
- 固定同tick裁决为“有效终点claim优先于同participant掉落”；被击飞穿过合法终点仍算完成。硬时限无人到达终点时以`no-finisher`结束，不把最高进度伪造成winner，进度排名只作结果事实。

#### Survival

- 恰好1个human player角色，加Definition约束下的有界enemy slots；玩家与敌人属于敌对关系，敌人之间默认不可互相命中。
- 敌人slot使用稳定ID和单调generation，只有预注册slot可以激活、失活和再次激活；禁止每轮创建无界participant ID。P2.0先冻结schema测试天花板16和实现期生产候选上限4，二者都不是安全结论；已证明引擎安全上限保持null，直到P2.6在正式Core上完成4/8/12/16无渲染、Replay、资源和清洁CPU矩阵。P2.4不得注册超过4的生产候选，P2总门不得在安全上限仍为null时通过。
- pressure policy只含连续stage、开始active tick、目标active enemy slot数、slot重激活延迟，以及每个预注册slot固定绑定的地图入口锚；重激活只增加generation，不随机更换入口。研究原型的0/15/30/45秒不得直接成为生产值。数值未签核时生产Definition不存在，不允许MatchCore补默认刷新节奏。
- 玩家开局空手并复用ADR-108/110的P1三实体供给。玩家第一次掉落增加权威fall count并在Definition指定的合法生存锚点重生；第二次掉落立即终局。后续[ADR-120](120-arena-v2-survival-first-respawn-single-source-candidate.md)已把shared-world既有60 tick等待、30 tick保护与双地图同语义safe anchor收敛为生产不可达单一候选，平衡批准仍为`not-run`。该计数不放在武器、Bot、Renderer或Profile中。
- 每个供给wave把slot content的collection武器ID经tier policy解析为等级专属runtime Equipment Definition ID；该runtime Definition继续引用等级专属Action Definition。wave、临时level、collection/runtime identity及内容hash进入Replay V6；Profile只允许记录collection熟练/收藏，不携带runtime tier或临时战斗数值。缺映射时spawn前失败关闭，不退回基础武器。
- 敌人掉落只使对应slot失活；未来刷新只能由权威整数tick计划重新激活可用slot并增加generation，不能复用未清理runtime或直接写玩家状态。
- 临时武器等级只存在于本局Definition/runtime/Replay；不得写入永久收藏或战斗数值成长。
- 生存Result记录权威survived ticks、round/pressure阶段、player fall count和结束原因，不强行伪装为Duel winner/draw。达到技术硬时限时以`survival-time-cap`结算成绩，不表示玩家获胜。

### 4. 参与者身份、角色、队伍、控制来源和slot generation分离

公共Assignment不能再把`player-2`或单个`opponent`当作参与者模型。每个assignment至少拥有稳定participant ID、mode role、team/relationship identity、controller kind与可选slot generation；Character/Equipment内容引用继续独立。

Mode Registry在组合阶段验证：

- 人数与角色上下限、唯一ID和稳定排序；
- team/relationship闭合且没有自相矛盾；
- controller能力与角色一致，Bot只能读取受限Observation并输出InputFrame；
- map capability、出生/终点/安全锚点、供给与内容引用完整；
- enemy slot generation、重复激活和越界拒绝；
- 不允许任何模式在Renderer、Session或Profile补默认participant。

### 5. P2采用新schema，历史V5按原语义只读验证

Mode身份和未来相关模式状态必须进入config hash、checkpoint/state hash、Replay和Result，因此P2不能把字段静默塞进现有schema：

- P2正式写入 `ArenaMatchConfig schema v6`；
- P2正式写入 `Replay V6`；
- mode state进入 `internal checkpoint schema v2`；
- MatchContentSelection与FrozenMatchContentPool升级为v2，显式绑定`modeDefinitionId`和finalized roster的完整participant→character映射；内容解析按“roster assignment→mode-aware content→finalized assignment”单向组合，不能由内容池或Core补默认participant；
- Product Match Result升级为判别式 `schema v3`，按Duel/Race/Survival保存各自结果payload，共享authority identity与hash封套，并按participant保存由已接受`ActionStarted`产生的有界collection武器使用ID摘要；spawn、pickup、预测输入或表现动画不算使用；
- Product public match info与Coordinator snapshot升级版本，携带Mode和public participants；公开显示资料不进入authority hash，authority assignment不得携带文案或资产句柄；
- Match Reward Definition/Resolver使用新的mode-aware版本，分别投影Duel胜平、Race有效完赛/名次和Survival存活区间，同时只提交一个以result authority hash幂等的Profile grant；
- V6使用独立MatchReadFrame V3与SupplyProjection V3，同步携带mode identity、只读mode projection及collection/runtime/survival level装备身份；V2/P1原样保留，不追加可选字段。projection显式发布Timeline派生的`preparationRemainingTicks`，不得把现有active hard-limit `remainingTicks`误作开局倒计时，也不得让Presentation从墙钟或动画时长推算。

历史Replay V5、config v5、checkpoint v1、MatchContentSelection/Frozen pool v1、Product Result v2及其公开信息保持原验证器与原hash语义，不删除、不重写、不默认注入`mode=duel`后重新计算。新生产入口在P2总门前继续使用当前V5；完成一次性切换后只写V6，但读取/审计工具仍可按显式schema走历史验证器。未来schema一律拒绝，不做猜测性降级。

当前表现链默认`player-1/player-2`、单一opponent和win/lose/draw，不得在P2中临时把Race/Survival结果降级成Duel来复用UI。P2先完成无渲染权威、Result、Session与奖励链；在P5/A2对应public participants、ranking/survival summary和Cue合同通过前，生产模式入口必须显式只开放Duel。

### 6. 模式事件只发布权威事实

新增事件必须是稳定、版本化、纯数据事实，至少覆盖Mode绑定、Race安全锚点提交/掉落/重生/终点claim/终局排名，以及Survival enemy slot激活/失活、玩家fall count/重生/第二次掉落终局。表现层只能消费这些事件和只读mode projection。

事件不得包含Renderer对象、墙钟、未冻结文案或资产句柄；音画失败不能回写Mode。事件顺序、同tick多终点/多掉落和重复消费必须有Replay与差分测试。

### 7. 多controller与奖励使用事务式所有权，不允许部分继续

QuickMatch按稳定participant顺序创建有界controller集合、read bundle和Session。Session只有在全部handshake成功后才接管Core/controllers/bundles；构造中途失败时，Session只清理自身runner，外层组合按逆序清理尚未移交的资源。每tick必须先验证local input和全部controller frame，再一次性提交trusted batch；任一controller失败、错participant/tick或重入都在Core变更前终止V6比赛，不尝试用已部分推进的controller状态重跑同tick。

Profile奖励由mode-aware Definition读取Product Result V3判别payload。Duel使用胜/平，Race使用有效完赛与真实rank，Survival使用权威pressure stage档位；临时武器等级、Renderer敌人数、墙钟或事件到达顺序不参与奖励。recipient participant来自当局public/authority identity，不再写死`player-1`。

grant ID只由稳定权威Result身份派生，不得包含Profile revision。RewardCommitter必须在写入前冻结pending grant；可恢复错误重试同一grant，`committed`与`duplicate`均逐字段复验。奖励确认和Match释放是两个提交阶段：释放失败只进入cleanup/release重试，不能再次计算或提交奖励；上局释放完成前不得开始rematch。

## 选择该方案的原因

- 保留一套命中、装备、物理、Replay和生命周期权威，玩家在三模式中学习同一武器与地图后果。
- 数据Definition让新增Mode或内容优先新增注册数据和策略，不修改既有同类实现。
- 专属policy Registry比Mode枚举分支更容易验证依赖方向、失败关闭和扩展边界，又避免引入通用脚本引擎。
- 有界enemy slots阻止长局participant/runtime无限增长，同时保留分阶段刷新能力。
- 判别式Result诚实表达竞速排名与生存成绩，不用二元winner/draw扭曲规则。
- 显式V6迁移保护现有V5 Replay与Duel证据，防止静默hash漂移。
- 事务式多controller采样与稳定grant ID关闭部分tick、跨重启重复奖励和“奖励成功但释放失败”重入窗口。

## 未采用的方案

### 在MatchCore中持续增加`if (mode === ...)`

短期文件少，但终点、掉落、重生、排名和Result会散落在Core多个阶段；新增Mode必须修改已有分支，难以证明Duel等价与同tick顺序。

### 为三模式复制三个MatchCore

会复制命中、装备、物理、Replay与生命周期，长期平衡和bug修复无法保持同源，直接破坏“熟悉同一武器”的产品目标。

### 让Mode Definition携带函数或通用脚本

函数无法稳定序列化/hash，脚本会扩大安全、确定性和设备差异面；当前三个模式不需要引入解释器或DSL。

### 让Session、Renderer或UI判断终点和第二次掉落

会产生第二权威、前后台/帧率差异和Replay不可重演；因此全部拒绝。

### 动态创建无限敌人participant ID

实现直观但会放大Map、Physics、Rule、Replay、事件和内存集合，长局无法证明有界；采用固定slot+generation。

### 在原schema上把缺失Mode解释为Duel

会让相同schema出现两种hash/结果语义，未来无法区分历史数据和缺失字段；采用显式V5/V6验证路径。

## 影响与代价

- `arena-definitions`需要Mode及policy Definition/Registry；`arena-match`需要ModeSystem、可变参与者基础与策略组合。
- Map Definition后续必须提供P3正式终点、路线进度和安全锚点能力；P2只能使用测试Definition证明Core，不得把研究地图作为生产内容。
- MatchAssignment、Replay、checkpoint、snapshot、Product Result、Session、Regression与Profile奖励投影均需版本化迁移。
- MatchContentSelection、FrozenMatchContentPool、内容解析输入和公开比赛信息同样需要版本化；否则Mode与地图/参与者池之间无法形成可审计的一致性链。
- Reward grant ID格式会升级但历史grant记录不重写；Profile identifier预算、重复提交、响应丢失和release-pending恢复必须形成独立测试证据。
- P2迁移面较大，必须按P2.0→P2.6逐门推进；双开发只能在合同冻结后按[P2台账](../architecture/arena-v2-p2-implementation-ledger.md)的零重叠写域并行。
- Presentation与美术需要新的稳定事件和只读projection，但A0.3真人与A1.1 source identity门未通过前不得扩大正式资产。
- 当前没有真实用户存档迁移要求，但仍必须实现future schema拒绝、历史V5验证、构造失败回收和Profile奖励失败关闭。

## 验收条件

本ADR只有同时满足以下条件才可由主协调改为Accepted：

1. 开发A给出Definition/Registry/ModeSystem字段映射及健壮、竞态、兜底、边界、生命周期、主流程六维自检；美术线程按[对齐矩阵A2.0](../architecture/arena-art-development-alignment-matrix.md#a20-权威事件音画职责候选)确认事件/projection足以表达权威开局倒计时、多人身份、并列、无完赛、两次掉落和重生，且不含规则重判。
2. 冻结Survival enemy slot三层协议：schema测试天花板16、实现期生产候选上限4、已证明引擎安全与首发内容上限初始为null；P2.6以4/8/12/16矩阵填入安全上限，P3/A2/P7再冻结不高于4和安全上限的首发值，不允许先写无限集合或把研究原型当正式安全证据。
3. 三模式每条产品规则映射到唯一Definition字段、policy或权威System，没有自由字符串和双人默认泄漏。
4. 明确V5/V6、checkpoint v1/v2、Product Result v2/v3和future schema的validator、写入切换与回滚路径。
5. 固定同tick多终点、终点+掉落、多掉落、第一/第二次生存掉落、slot重复激活和结束后输入的裁决与测试矩阵。
6. 更新架构依赖测试，证明权威层不依赖experiment、Three.js、DOM、平台API、墙钟、`Math.random()`或通用事件总线。
7. P1仍必须在清洁source/build/content identity上完成PA6、PA7及计划要求的Coverage、Platform/三端/真机和治理证据，并由独立审计明确`advance`后，才可开放P2生产入口、生产Registry与正式advance。ADR-118仅允许在此前形成P2.0a/P2.0b生产不可达候选，不改变任何正式门禁；PA6单门、ADR设计签核或候选代码均不能冒充阶段通过。
8. 文档检查、链接、术语、命令片段和`git diff --check`通过；最终clean commit/push仍由主协调单独授权。
9. 多controller第1/N/末项构造与采样失败、部分handshake、destroy重试、奖励写入成功但响应丢失、duplicate、Match释放失败和跨Mode rematch均有失败关闭测试；同一Result跨Profile revision必须得到同一grant ID。
10. 九类Policy Definition全部执行exact-key、kind与交叉引用闭包验证；Survival每wave的collection→runtime tier解析进入config/content/checkpoint/Replay hash，缺variant、跨tier回退、运行时改基础Definition或临时等级进入Profile均有负向测试。
11. V6 `ActionStarted`区分base/equipment并携带已接受动作对应的runtime、collection与可选Survival level身份；Result V3的`participantEquipmentUsage`与Assignment一一对应、稳定排序并可直接从Replay V6事件重建，Survival runtime tier只能映射回唯一collection ID。P2 reward不得用该摘要增加生命、速度、击退或冷却，P6完整熟练/收藏仍以独立Profile schema、迁移和真人容量门实施。
12. 按P2台账的P2.0c矩阵区分已冻结、候选与未决数值；未决必需值使生产Definition不存在。通用系统可在前置通过后使用不可生产导出的`.test.` Definition验证，但Race/Survival生产Registry、入口和奖励不得借测试数值提前开放。
13. MatchReadFrame V3、World held/world equipment与SupplyProjection V3对同一instance逐字段核对runtime、collection与Survival level；V2/V3混用、字符串解析tier、双向集合缺失和跨wave身份漂移均失败关闭，Presentation只消费不推断。
14. 实现必须遵守P2台账预注册的唯一写者切片与V3身份一致性矩阵：共享`index.ts`、manifest和golden manifest只能在聚合片单写，held/world/projection/action/result/Replay身份闭包必须完成正负向、置换、恢复、rematch和生命周期测试；任一跨域写入或只验证最终hash都不满足本ADR。

## 回滚

在本ADR仍为提议且没有生产实现时，安全回滚仅删除本文件并撤回P2台账/索引对应链接。后续若进入实现，每个P2小门必须记录精确文件、source fingerprint和可反向应用的hunk；禁止用reset/checkout覆盖共享工作树，也不得触碰已冻结P1、历史Replay V5或美术资产。

## 关联决策

- [ADR-104](104-arena-v2-kz-race-multiplayer-contract.md)：保留为本地竞速研究证据，不代表生产Mode。
- [ADR-047](047-arena-v2-survival-entity-boundary.md)与[ADR-048](048-arena-v2-survival-multi-enemy-pressure-boundary.md)：保留敌我共享Rule/Physics和受限输入研究边界。
- [ADR-108](108-arena-v2-survival-auto-replace-and-expiry.md)与[ADR-110](110-arena-v2-expired-held-release-disposition.md)：P2 Survival必须复用已经实现的供给生命周期。
- [ADR-111](111-arena-v2-action-read-model-performance-boundary.md)：P2不得回退PA5/PA6只读边界或以新Mode重引入全量热路径。
- [ADR-120](120-arena-v2-survival-first-respawn-single-source-candidate.md)：固定Survival首次复活单一源码候选与双地图语义锚，不把候选冒充最终平衡批准。
- [ADR-121](121-arena-v2-race-respawn-single-source-candidate.md)：固定Race 180/30重生候选、双地图公共fallback锚及起跑格职责分离。
