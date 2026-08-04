# Arena A1.0 供给表现预生产合同

## 状态与边界

- 历史状态：`contract-ready-at-dd786a9`；主协调于2026-07-28以`94/100`签核当时的A1.0合同
- 当前源码适用状态：A1.0-v2 已于2026-08-03以`current-source-contract coordinator-approved / 94/100 / hardGatePassed=false`完成开发—美术联合签核；它开放PP2/PP3a非性能实现，但不开放代表样件、Blockout或任何正式资产/设备/真人门
- 权威审计基线：`dd786a922625472643b2f6c96f80c7049a57d3e2`（2026-07-28）
- 机器台账：[arena-a1.0-supply-presentation-contract-v1.json](../quality/art/supply/arena-a1.0-supply-presentation-contract-v1.json)
- 当前机器候选：[arena-a1.0-supply-presentation-contract-v2.json](../quality/art/supply/arena-a1.0-supply-presentation-contract-v2.json)；28源、25 fixture，正向通过且85/85隔离拒绝，机器包保持候选/外部门false，由本文件与P1台账记录主协调外部签核
- 交付范围：事件→只读表现合同、预算上限、生命周期与失败关闭测试夹具计划；没有生产资产、Blockout、运行时接入、正式VFX或正式音频。
- 上游边界：本次签核只关闭A1.0合同小门，不开放代表样件。A0.3真人仍为`0/10`、`incomplete`，`a1RepresentativeSpecimenStarted=false`、`a1Passed=false`、`Blockout forbidden`，所有生产、设备、真人与Final门继续关闭。

## 当前源码复验覆盖（2026-08-02）

在当前共享源码上运行`node --import tsx scripts/art/check-arena-supply-presentation-contract.ts`失败，首个错误为
`source identity drift: packages/arena-contracts/src/equipment-supply-event-payload.ts`；失败关闭脚本因正向基线预检先红而提前停止，不能记作负向矩阵通过。
逐项只读复算确认以下10个绑定来源的byteLength/SHA-256相对机器台账漂移：

- `packages/arena-contracts/src/equipment-supply-event-payload.ts`
- `packages/arena-contracts/src/match-snapshot.ts`
- `packages/arena-equipment/src/equipment-supply-timeline-system.ts`
- `packages/arena-equipment/src/equipment-system.ts`
- `packages/arena-match/src/match-core.ts`
- `tests/arena/equipment-supply-timeline.test.ts`
- `tests/arena/match-core-survival-supply.test.ts`
- `tests/arena/replay.test.ts`
- `tests/arena/local-match-session.test.ts`
- `docs/decisions/108-arena-v2-survival-auto-replace-and-expiry.md`

其中首项当前差异只新增已登记的`EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE`，但其余九项包含public projection、权威生命周期、PA read-model与测试扩展；
不能只更新一个hash，也不能用人工确认“字段仍能找到”替代15源完整复核。机器JSON继续保留2026-07-28历史签核身份，不在dirty source上原地改hash制造绿色。
待最终source identity冻结后，美术线程必须重建全部sourceAudit、复跑正向与失败关闭脚本、核对ADR-113的options/start/update/debug、half-open sequence、三类失败结果和25项fixture，
再由主协调独立评分。该复验只撤销“历史合同适用于当前源码”的主张，不否认历史签核发生过。

重建采用[ADR-114](../decisions/114-arena-v2-art-evidence-versioning-and-joint-gate.md)规定的追加版本，而不是原地改写历史v1：候选路径为
`docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v2.json`、
`scripts/art/check-arena-supply-presentation-contract-v2.ts`与
`scripts/art/test-arena-supply-presentation-contract-v2-fail-closed.ts`。v2必须显式声明supersedes的v1合同身份，保留v1 checker可独立复核历史基线；
sourceAudit除当前权威/Replay/Session来源外，还必须绑定ADR-113、PP0 presentation contract、PP1 runtime adapter及25项测试文件。
具体v2 exact-key schema由美术线程提交逐字段反证后再冻结，当前不得创建空壳、预填hash或把候选路径写成已交付。

为避免循环门，执行顺序固定为：`ADR-113设计输入 → PP0/PP1候选与25项Node证据 → A1.0-v2当前源码绑定包 → 开发B六维自检＋美术Cue/回退确认 → 主协调联合验收`。
历史v1可用于说明语义来源，但不能签当前PP1；v2也不能在adapter候选出现前预先签核。A1.0-v2通过仍不替代A0.3真人、A1.1来源/测量、PP3宿主、设备或代表样件门。

## 1. 技能与参考约束

| 技能 | 本阶段实际约束 |
|---|---|
| `game-art-director` | 先写支柱、形状语言、反例、预算与审阅门；颜色不能成为唯一语义，合同不能冒充成品。其强制引用的`docs/collaboration-protocol.md`与`docs/game-design-theory.md`在基线不存在，已在机器台账登记为缺失，未当作证据。 |
| `threejs-game-ui-designer` | 将三件供给保留为世界实体；HUD只读、无弹窗、无确认键、窄屏不遮挡战斗；10秒显示从权威tick投影。 |
| `vfx-realtime` | 每条Cue至少使用形状/时序/颜色中的两项；显式限定粒子、叠层、overdraw替代策略、30 FPS取样和`destroy()`清理。 |
| `audio-design` | 只定义事件声音合同、总线优先级、并发与静音等效；不生成音频。声音由稳定事件去重，不用墙钟循环或每tick提示。 |

强制参考还包括[Art Bible](arena-art-bible.md)、[美术音频流程](arena-art-and-audio-development-flow.md)、[A0–A7对齐矩阵](arena-art-development-alignment-matrix.md)、[生产计划](arena-v2-production-development-plan.md)和[ADR-108](../decisions/108-arena-v2-survival-auto-replace-and-expiry.md)。

## 2. 已实现事实与未实现表现

### 2.1 历史基线中已实现且绑定hash的权威事实

以下行号和hash只描述`dd786a9`历史基线；当前源码事实以ADR-113和最终重建后的A1.0 sourceAudit为准，不能继续把本节行号当当前自动化证据。

1. 事件名来自`packages/arena-contracts/src/match-event-types.ts:3-8`，但`type`本身不足以路由。`#startRunningIfNeeded`会发合法的扁平`EquipmentSpawned`（根部含`equipmentInstanceId/equipmentDefinitionId/spawnId/position`），供给时间轴则发`{payload: strictSupplyPayload}`，见`packages/arena-match/src/match-core.ts:659-668,695-718`。四类供给生命周期事件的严格字段位于`payload`并使用schema v1；普通`EquipmentPickedUp`的三个字段位于事件根部。未知供给payload字段拒绝，生成事件要求`tick===spawnTick`，替换/回收要求`tick∈[spawnTick,expireTick)`，过期要求`tick===expireTick`，见`packages/arena-contracts/src/equipment-supply-event-payload.ts:59-112,130-243`。
2. Definition唯一顺序为`spawn → expire → pickup → action`，策略为`atomic-recycle-held`与`world-only-at-expire-tick`，见`packages/arena-definitions/src/equipment-supply-definition.ts:12-16,78-108`。生产值为每波3实体、间隔1200 tick、半径0.8、生命周期600 tick，见`packages/arena-v1-content/src/arena-v2-survival-supply.ts:10-20`。
3. 生命周期强制`expireTick=spawnTick+lifetimeTicks`，见`packages/arena-equipment/src/equipment-supply-lifecycle.ts:59-79`。世界供给只在`[spawnTick,expireTick)`可拾取，见`packages/arena-equipment/src/equipment-system.ts:539-570`。
4. 已持有武器时，同一同步事务先产生`EquipmentRecycled`、后产生`EquipmentReplaced`；旧实例被权威集合删除，新实例进入持有态，不产生旧武器世界掉落，见`packages/arena-equipment/src/equipment-system.ts:600-680`。
5. MatchCore外层事件含`id/sequence/tick/type`，按稳定sequence生成；供给阶段依次发生成、过期、回收/替换，之后才进入action，见`packages/arena-match/src/match-core.ts:642-721`。
6. `599/600/601`已有真实测试：`+599`仍有3实体，`+600`先过期且同tick不能抢救拾取，`+601`不重复过期，见`tests/arena/equipment-supply-timeline.test.ts:112-130`。生产MatchCore、Replay、checkpoint续跑证据绑定在机器台账的测试文件hash。
7. 公共快照有当前tick、eventSequence、参与者与装备列表，但不公开完整active供给生命周期的`equipmentInstanceId/equipmentDefinitionId/spawnTick/expireTick`；该生命周期只在内部checkpoint中，见`packages/arena-contracts/src/match-snapshot.ts:128-143`与`packages/arena-match/src/match-core.ts:1254-1364`。断流恢复必须取得完整连续事件历史，或取得绑定`eventSequence`的完整active供给生命周期投影；否则整个adapter进入resync、隐藏倒计时且不处理事件。adapter无需永久保存terminal身份，这是正式代表样件的真实输入缺口与资源边界。

### 2.2 尚未实现，不能写成证据

- 当前没有供给HUD/ViewModel、事件消费adapter、世界marker、VFX、音频、屏幕阅读公告、30 FPS捕获或目标设备数据。
- 下文形色、声音、预算和恢复规则均是A1.0预生产合同，不是运行时通过。
- 程序化几何只能在资产加载失败时作可访问诊断兜底；使用兜底的代表样件必须失败，不能成为生产正常路径。

## 3. 事件到只读表现映射

| 权威输入 | 只读投影 | 视觉双编码 | 声音/静音等效 | 终止规则 |
|---|---|---|---|---|
| 严格`EquipmentSpawned.payload` | 只有公共信封＋严格payload、且供给身份校验通过时，才按`position`建立独立世界实体；三条供给事件就是三实体 | 暖白装备剪影＋三叉地标；路线提示用紫色折线箭头＋方向缺口 | 一次短促生成声；静音保留地标出现与“3个供给已出现”单次公告 | 仅后续匹配拾取/替换/过期或权威重同步移除可终止 |
| 合法扁平`EquipmentSpawned` | 由普通装备表现旁路处理，供给adapter不建marker也不报缺payload | 无供给Cue | 无供给声音/公告 | `payload`与任一扁平装备字段混合、两种shape均不完整或strict payload非法时fail closed |
| 参与者与供给只读位置接近 | 只表示“靠近将自动拾取/替换”，不做裁决 | 向内收拢的箭头＋交换图标；不能出现卡片焦点、确认/取消或三选一 | 不播放循环接近音；静音与有声均依赖同一图标/形状 | 没有权威结果时不得自行切换持有态 |
| 扁平`EquipmentPickedUp` | adapter ready后，`equipmentInstanceId`和`equipmentDefinitionId`命中唯一active身份时才作为空槽供给拾取；未命中任何active身份的合法事件安全旁路 | 持有槽闭合括号＋新装备实心图标 | 命中active时单次拾取声；旁路时不播供给Cue | 只删除匹配的一个active marker；未命中时不改任何供给状态；instance命中但definition冲突或多重active命中时fail closed；没有完整历史/绑定active投影时整个adapter先resync |
| 同tick `EquipmentRecycled`→`EquipmentReplaced` | 旧装备回收、新装备占有是一个已提交替换结果 | 旧槽断环/叉线＋新槽实心；成对交换箭头 | 最多一个合并替换声；静音保留“旧→新”状态公告 | 两事件都必须唯一命中active身份且pair身份匹配；最多暂存3个pair。该pair直接终止目标marker，不等待`EquipmentPickedUp`；未命中、缺一、反序或冲突均fail closed |
| `EquipmentExpired` | 世界供给在`expireTick`消失 | 琥珀分段缺口环到稳定叉形沙漏；不用仅淡出 | 一次低优先级消失声；静音保留稳定终态，不逐tick播报 | 必须唯一命中active身份；未命中或冲突即fail closed。当tick直接终止，不保留“0秒”救援帧，不影响已持有装备 |

颜色只使用Art Bible现有token：`arena-paper #F4EBDD`、`arena-route #8B6DFF`、`arena-warning #FFB020`、`arena-player #35B8FF`、`arena-impact #FFF4B8`。每项同时有形状与图标/纹理；蓝紫与红绿不可只靠色相区分。

## 4. 10秒与599/600/601

表现层在已知完整生命周期身份时只计算：

```text
remainingTicks = max(0, expireTick - currentSnapshot.tick)
labelSeconds = ceil(remainingTicks / 60)
```

- 出生时`600 → 10`；`+599`为`1 tick → 1`，实体仍存在且可拾取。
- `+600`先过期，显示和实体同一权威结果移除；不显示可交互的`0`。
- `+601`不能再次播放过期Cue。
- 暂停时权威tick不增长，环形进度与数字冻结；恢复后只跟随新快照。30 FPS只可插值画面，不可提前跨过权威终态。
- 禁止`setTimeout`、音频播放头、CSS/Web动画时长或系统墙钟删除实体、推进倒计时或补判拾取。

## 5. 断流、重复、乱序、Replay与销毁

- adapter只保留一个`lastAppliedSequence`水位线和固定64项recent canonical hash ring。`sequence===waterline+1`才可前进；前向缺口立即resync。
- `sequence<=waterline`且仍在ring内：规范hash相同则幂等忽略，不重播one-shot；hash冲突则fail closed。早于ring窗口的旧事件一律不应用、不重播one-shot，只允许增加固定大小诊断计数；ring满时淘汰最旧项，不扩容。
- ready输入是无缺口历史，或绑定`eventSequence`且完整包含active供给生命周期的只读投影；active身份最多等于权威`spawnCount=3`，终止即移除，不保留永久terminal账。
- 恢复只重建持续世界标记和tick投影；历史生成/拾取/过期的一次性VFX/声音在catch-up中抑制。Replay seek/reset建立新的projection epoch，清空ring与pending pair并从新历史/投影恢复active身份；不跨epoch复用去重状态。
- adapter ready时，合法普通扁平Spawn旁路；合法Pickup未命中任何active身份也安全旁路，二者都不播供给Cue、不改变marker。Pickup定义冲突/多重active命中，以及strict Recycled/Replaced/Expired未唯一命中active时fail closed。供给shape混合/含糊、未知/未来/缺失字段或pair反序同样拒绝“尽力渲染”。
- `destroy()`必须幂等清零最多3个active身份、1个水位线、64项ring、最多3个pending pair、当前epoch，以及marker、粒子、声音voice、监听器、DOM/Canvas与池引用。销毁后事件只能拒绝，不能重新建资源。

## 6. 低动效、静音与可访问性

- reduced-motion：扩张、飞行、坍缩改为同一权威tick上的稳定边缘、缺口和状态切换；不能通过延长寿命制造尾帧。
- 静音：所有语义由形状、图标和短文本/语义公告保留；禁止以循环滴答声作为剩余时间唯一线索。
- 屏幕阅读：每波生成计数一次、替换结果一次、单个过期结果一次；不逐秒或逐tick播报。
- 窄屏：世界标记不变成遮挡战斗的底部三卡；HUD只提供轻量方向与剩余tick投影，没有新操作键。
- 资产失败：显示明显的诊断形状与通用图标码，不影响权威状态；该路径只证明失败安全，不能通过资产、风格或Final门。

## 7. 提议预算与生命周期门

以下为未测量上限，不是性能证据：最多3个持续世界标记、3个active供给身份、3个pending replacement pair、1个`lastAppliedSequence`、64项recent canonical hash ring、1个当前projection epoch；每标记burst桌面24粒子/移动12粒子，同时供给粒子桌面72/移动36；最多1层additive、0个distortion pass；供给一次性声音最多4 voice；禁止倒计时loop。替换/回收优先于过期，过期优先于生成；同tick可合并听感但不能合并或丢失权威事件身份。代表样件启动前只要求这些阈值、测量方案和捕获方法获批。

代表样件形成后，其通过门必须取得30 FPS终态、overdraw、GPU/内存、voice并发、暂停恢复和双次destroy的实际证据；实测超预算应优化生命周期与着色，不得通过降低正式资产分辨率或删动作绕门。该实证属于“代表样件通过门”，不属于“代表样件启动门”。

## 8. 测试夹具计划

机器台账固定25项：三实体无弹窗；合法普通扁平Spawn旁路；混合Spawn拒绝；active Pickup只终止一个marker；Pickup未命中active安全旁路；定义冲突/多重active Pickup拒绝；缺历史/绑定active投影先resync；替换pair不等PickedUp；strict replacement未命中active拒绝；strict expiry未命中active拒绝；599/600/601；过期先于拾取；回收→替换且拾取先于action；ring内相同重复幂等；ring内冲突重复拒绝；早于ring窗口不应用/不重播；sequence缺口/乱序重同步；缺失/未来字段拒绝；暂停恢复无墙钟推进；30 FPS终态精确；Replay/catch-up不双播；Replay新epoch清ring/pending；资产失败不通过资产门；低动效/静音等效；双次destroy清零全部有界资源。

A1.0只校验合同与源文件身份。失败关闭脚本只对合同JSON做篡改探针，证明字段、shape、有界active投影、ring/epoch、旁路语义、预算和下游状态不能静默漂移；它不是运行时adapter测试。
当前正向基线因10源漂移而红，所以失败关闭脚本本轮没有形成可用当前证据。上述25项运行时夹具要等表现adapter/ViewModel获批后实现。

## 9. 代表样件启动硬门

以下全部满足前不得启动A1代表样件：

1. A0.3取得至少10名合格真人、≥90%阈值与主协调签核；当前0/10，不满足。
2. 获批的无缺口事件历史，或绑定`eventSequence`且完整包含active供给生命周期的只读投影。adapter据此建立最多3项active ledger后才处理事件；当前公共快照缺完整active供给身份和`expireTick`，单独使用不满足。
3. 获批的代表装备剪影/图标、临时VFX/音频来源manifest、许可与hash。
4. 桌面与390×844捕获夹具，以及获批的30 FPS、GPU、overdraw、内存、voice、destroy测量方案、预算阈值和捕获方法；启动时不要求实际测量结果。
5. A1.0当前源码重绑定并由主协调签核。2026-07-28历史签核仍可作为设计输入，但当前sourceAudit为stale，必须在最终source上重建并通过正向/失败关闭脚本；该项不替代前四项，也不自动启动代表样件。

代表样件完成后，必须再以第7节列出的实际GPU/overdraw/内存/voice/生命周期数据通过独立样件门；这项证据不能倒置为启动前输入。

## 10. A1.0合同评分

| 维度 | 得分 | 依据/扣分 |
|---|---:|---|
| 权威审计 | 24/25 | 15份源码/测试/ADR绑定byteLength与SHA；公共恢复投影仍缺生命周期字段 |
| 事件→Cue映射 | 19/20 | 六种事件shape、接近态、旁路/拒绝与同tick顺序完整；尚无运行时adapter |
| 可访问语义 | 14/15 | 色形图标、低动效、静音、窄屏合同完整；无人测 |
| 异常/Replay | 14/15 | 重复、乱序、断流、Replay、30 FPS策略完整；尚无实现夹具 |
| 预算/生命周期 | 13/15 | 上限和清理责任明确；无设备测量 |
| 证据/夹具治理 | 10/10 | 机器台账、hash、25项计划和下游false状态可复算 |
| **合计** | **94/100** | 各维度≥80%；仅合同成熟度 |

主协调于2026-07-28以`94/100`签核历史A1.0合同；该分数只属于`dd786a9`历史source identity。当前15源中10源漂移，故当前源码状态为
`stale-upstream-evidence / hardGatePassed=false`，`runtimeAdapterTested=false`。A1、A0.3、Blockout、正式VFX/音频、设备、真人与Final全部保持`incomplete`/false。
