# Arena V2 A2.0 三模式事件与 Cue 预生产合同

## 文档状态

- 日期：2026-08-11
- 状态：`preproduction-contract-candidate / static-bound-to-mode-match-runtime-v6 / verification-deferred-by-ADR-118 / formalGate=false`
- 阶段范围：仅 A2.0 权威模式事件、只读投影与音画 Cue 的预生产合同；不表示 A2、Blockout、正式资产、Presentation 接入、设备、真人或 Final 通过
- 文档写域：本文只维护表现消费合同；同期P2源码由Rule/Core/Product各自写域维护，本文不得成为其规则输入
- 当前绑定：已静态绑定`packages/arena-match/src/mode-match-runtime-v6.ts`的公开`step()`结果，以及其承载的`packages/arena-contracts/src/match-event-v6.ts`、`match-read-frame-v3.ts`和`arena-public-supply-projection-v3.ts`；`step()`对未来Presentation唯一开放的exact-key为`events / readFrame / readFrameAudit`。P2.5e复合checkpoint与三模式恢复静态候选已经落盘，P2.6工厂候选已串起continuous/restored两条同seed/同输入链及每局一次checkpoint→销毁→恢复→终局逐字段对照；P5.3a本地consumer-epoch与Audio/VFX切代清理也已由正式候选原子宿主组合，并在静态代码中闭合HUD ViewModel顶层exact-key、完整V6事件批次、水位连续、反馈来源与同tick空批次边界。上述源码均未运行，P2.5e未获签核，默认Registry/Composition/入口继续断开；所有运行验证继续顺延
- 验证状态：按 [ADR-118](../decisions/118-arena-v2-development-first-deferred-validation-window.md) 不运行检查、构建、生成器、浏览器、模拟器、设备或性能任务；所有运行证据顺延，不得写成通过
- 提交状态：不 commit、不 push

本文档只把当前候选权威事实翻译为未来表现职责。上述runtime/V6/V3候选任一exact-key、枚举、路径或同tick裁决变化，都会使受影响条目立即失效并要求重绑；静态绑定不等于生产可达、测试、浏览器、设备或真人通过，本文档绝不反向定义Rule/Core数值。

## 1. 权威来源、技能与已知红缺口

### 1.1 当前只读来源

| 来源 | 本文使用范围 | 当前证据边界 |
|---|---|---|
| [ADR-112](../decisions/112-arena-v2-formal-mode-definition-and-policy-boundary.md) | Duel/Race/Survival 的 Definition/Policy 所有权、同 tick 裁决、V6 schema 与模式事件边界 | 只提供治理边界；当前实现状态以真实源码为准，不能由本文反向宣布ADR或P2总门通过 |
| [P2 实施台账](arena-v2-p2-implementation-ledger.md) | P2.0–P2.5e版本化候选、生产不可达边界、P2.5e恢复与P2.6延期验证 | 复合checkpoint/restore、每局一次恢复链及continuous/restored逐字段对照源码已形成静态候选；运行证据与小门签核仍缺，生产默认Registry/Composition/入口继续不可达 |
| `packages/arena-match/src/mode-match-runtime-v6.ts` | 三模式候选runtime统一输出、事件/Frame/Result原子闭合与Presentation公开边界 | 公开`step()`结果仅`events / readFrame / readFrameAudit`；静态候选，不等于生产接线或运行通过 |
| [Arena Art Bible](arena-art-bible.md) | 三模式形状语法、非颜色冗余、VFX 五类反馈、来源/预算与四门 | A0.3 真人仍为 `0/10`；Art Bible 方向不能替代运行时证据 |
| [美术与音频开发流程](arena-art-and-audio-development-flow.md) | `Rule → Core → Bot → Presentation → Platform`、14 技能路由、低动效/静音/失败回退与生命周期 | 本轮只到行为合同门，不进入 Blockout 或资产制作 |
| [生产计划](arena-v2-production-development-plan.md) | ADR-118 条件窗口、P2/A2 依赖和延期验证边界 | 延期的是执行时间，不是旗舰通过标准 |

### 1.2 本轮技能使用

- `game-art-director`：强制形状先于颜色、游戏镜头距离可读、视觉语义一致；因此三模式、终点、安全锚、供给与结果必须拥有不同形状句法，颜色只作辅助。
- `vfx-realtime`：采用 `Shape → Timing → Color`、value-first 与“核心/方向/结果/装饰”可降级层级；因此 reduced-motion 和低质量级只能裁掉位移、闪烁、震屏与装饰，不得裁掉因果核心。
- `audio-design`：音频只走既有 `Master → Music / SFX / Ambience / UI / Voice` 总线，并遵守一次性声音有界、静音等价、pause/resume 不补播和销毁清理；声音长度、节拍或播放完成绝不成为权威时钟。

`game-art-director` 强制要求的 `docs/collaboration-protocol.md` 与 `docs/game-design-theory.md` 当前不存在。两项继续登记为 `missing-mandatory-skill-reference / red-gap`；本文不创建占位文件，也不声称已满足该技能引用门。当前任务不设计自适应音乐，因此不把 `audio-design/references/adaptive-music.md` 作为本轮输入。

## 2. A2.0 不可越过的消费边界

### 2.1 唯一允许的runtime事实入口

未来A2事件/Cue适配器只接受`ModeMatchRuntimeV6.step()`返回的exact-key对象：

1. `events`：只接受逐项通过`ArenaMatchEventV6` exact-key validator的数组，用于一次性Cue；
2. `readFrame`：只接受通过`MatchReadFrameV3`审计的完整frame，用于`modeProjection`、`worldSnapshot.result`、equipment与嵌套SupplyProjection持续状态；
3. `readFrameAudit`：exact-key仅为`worldSupplyEquipmentInstanceIds / expectedWorldSupplyIdentities`，只用于复算Frame与供给身份闭包，不直接渲染、不生成规则状态。

适配器不得消费runtime内部的`stateHash`、`appliedModeCommandHash`、`commands`、`modeState`、checkpoint或Replay导出，也不得读取world authority、mode driver、config或内部participant role表。ProductPublicMatchInfo V2与Product Match Result V3仍可作为产品层静态身份/结算封套参考，但它们不在`step()`结果内，不得成为A2 live Cue的第二入口；正式身份视觉与产品结算接线必须等待后续Composition明确绑定。

任何step顶层缺字段、额外字段、future schema、未知event type、event/frame sequence不闭合、终局event与frame result不一致、`readFrameAudit`缺失/漂移、跨局旧frame、V2/V3混用或supply resync未就绪都必须整包fail closed：本step不提交持续状态、不播放任何一次性Cue，清除时间敏感Marker/倒计时/Result候选并显示“表现数据暂不可用”的中性文字或基础glyph；不得保留上一局或上一epoch状态假装连续。

### 2.2 明确禁止的第二权威

| 禁止输入 | 禁止推断 | 安全行为 |
|---|---|---|
| Renderer/物体坐标、killY、屏幕内外 | 终点、fall、领先者、淘汰、重生点 | 等权威事件、projection 或 Result；缺失则隐藏相关 Cue |
| 动画 clip 完成、混合权重、姿态 | 命中成立、重生完成、淘汰完成、比赛结束 | 动画只能跟随事实；失败时退回静态图形/文字 |
| 事件到达先后、数组顺序、participant ID 字典序 | Race 先后、同 tick 并列、finish 与 fall 胜负 | 只读同 tick 裁决后的 Result/projection；矛盾则 resync |
| 音频时长、stinger 完成、节拍、总线状态 | 倒计时、无敌结束、重生、结算或奖励 | 静音与解码失败时规则和静态结果完全不变 |
| 墙钟、`setTimeout`、平台前后台时长 | preparing、respawn、供给过期、hard limit | 只用权威整数 tick 与投影的 remaining/ready 字段 |
| 颜色、发光、模型尺寸、粒子密度 | participant、武器 tier、enemy generation、危险等级 | 使用 ID 对应的 glyph/纹理/数字/文字；颜色仅辅助 |

### 2.3 事件、持续状态与终局的分工

- `event.id` 只用于一次性 Cue 去重；`sequence` 只用于同一已验证流的稳定消费和诊断，不可制造模式语义；`tick` 只用于权威时间对齐和迟到丢弃，不可由表现修改。
- 每个step必须先整体验证`events / readFrame / readFrameAudit`，确认`readFrame.worldSnapshot.eventSequence`与事件水位闭合后再原子提交持续状态；任一项失败时不得部分更新Frame后继续播放已验证的单条event。
- 稳定V6事件驱动 one-shot；`modeProjection`与SupplyProjection只重建当前持续静态状态。projection不得反向补造已经缺失的one-shot；PublicInfo不在step内，不能作为live Cue输入。
- pause 保留静态状态并停止新增 voice/非必要动画；同一runtime的`resume()`不产生历史事件，表现只从最新完整`readFrame`恢复持续静态状态，不补播过期 Cue。
- live终局只在同一step中同时出现末项`MatchEnded.modeResult`、`readFrame.worldSnapshot.phase='ended'`和完全相等的`readFrame.worldSnapshot.result`时提交。Product Match Result V3是下游产品封套，不反向触发live终局Cue；加载失败仍显示同一ModeResult的文字/基础glyph。
- P2.5e静态候选的checkpoint restore会在全新runtime内部校验并恢复`readFrame / readFrameAudit / stateHash / eventsPrefix / inputFrames / Replay与Mode checkpoint前缀`，并由`eventsPrefix`重建内部event ID集合；这些checkpoint字段与历史前缀全部属于runtime内部，Presentation零消费，restore构造本身也不向Presentation返回历史`events`。未来宿主只能在runtime替换边界建立新的**本地consumer epoch**：先使旧generation、异步加载、Cue池和临时DOM/粒子引用失效，再以恢复后经过完整审计的当前`readFrame.worldSnapshot.eventSequence`初始化水位线并仅据该Frame重建持续态，绝不从checkpoint、`eventsPrefix`、projection差分或音频状态补播历史one-shot。
- `ModeMatchRuntimeV6.step()`没有公开epoch字段，因此consumer epoch不能冒充权威数据，也不能由美术从tick回退或对象实例变化猜测；宿主若不能原子通知runtime替换并交付已验证当前Frame，表现保持resync/中性fallback。新epoch首个step仍须满足：事件`sequence`从已提交Frame水位起连续、事件ID在该epoch无冲突、末Frame `eventSequence = 旧水位 + 本批事件数`；小于水位、断号、重复ID、跨epoch旧回调或Frame/Audit漂移一律整包拒绝，不重播one-shot。
- P5.3a已新增`ArenaV2ModeHudConsumerEpochV1`及效果消费者切代入口：无one-shot基线、同tick持续态、下一tick、旧generation拒绝、`visual.clear()`、`audio.stopAll()`和本地去重重置的方向与本合同一致，也没有读取checkpoint或接入默认宿主。`consume()`现要求exact-key `consumerEpochId / model / sourceEvents / preferences`，HUD ViewModel顶层字段完整且拒绝future/extra；`sourceEvents`逐项通过V6 validator，并证明`新水位 = 旧水位 + 批次数量`、sequence逐项连续、ID唯一、tick早于post-step Model、Mode身份闭合，且weapon/mode/supply反馈来源只能属于本批。上述结论仅是未运行的静态候选；正式宿主仍须原子组合两个consumer并只交付由已验证step投影得到的Model与完整事件批次，故P5.3a仍为`static-candidate / host-unwired / verification-deferred / hardGate=false`。

## 3. P2.5e Runtime 与恢复当前静态绑定字段登记

下表记录当前共享工作树候选源码的静态路径和字段，不是本文冻结的新schema。`静态绑定/未验证`表示已逐字段对齐文件，但尚未执行测试、构建、浏览器、设备或真人证据；源码变化时相关矩阵立即失效。

| 候选对象 | 当前候选字段/语义 | A2.0 用途 | 当前状态 |
|---|---|---|---|
| `ModeMatchRuntimeV6.step()`公开结果 | exact-key `events / readFrame / readFrameAudit` | A2 live事件/Cue唯一runtime入口；整包验证后原子消费 | `mode-match-runtime-v6.ts / 静态绑定 / 未验证 / 生产不可达` |
| runtime内部结果 | `stateHash / appliedModeCommandHash / commands / modeState / checkpoint / Replay` | 仅authority闭包、恢复与治理；Presentation零消费 | `明确禁止 / P2.5e恢复静态候选已落盘但未签核` |
| `packages/arena-match/src/mode-match-runtime-checkpoint-v1.ts` | exact-key复合checkpoint闭合当前Frame/Audit、mode/world authority、输入/事件与Replay/Mode checkpoint前缀及identity hash | 只证明runtime内部恢复输入候选；Presentation不得解析任何字段或历史事件前缀 | `静态绑定 / 未验证 / 生产不可达` |
| `packages/arena-regression/src/arena-mode-verification-runtime-factory-v1.ts` | `VerificationWorldAuthorityV1`、每局一次checkpoint→旧runtime destroy→新runtime restore→终局链及同seed/同输入continuous/restored逐字段对照源码 | 只登记待运行验证入口；对照尚未执行，不能证明恢复等价或A2可恢复 | `static-candidate / P2.5e未签核 / 不作为live输入` |
| `packages/arena-product-presentation/src/arena-v2-mode-hud-consumer-epoch-v1.ts` | 本地`consumerEpochId / generation / tick / eventSequenceWaterline`、无one-shot基线、同tick空批次、下一tick完整V6批次闭合、反馈来源与旧generation拒绝 | 恢复后的表现生命周期隔离候选；已由正式候选宿主与效果consumer原子组合，不得冒充runtime epoch或权威状态 | `static-candidate / static-contract-aligned / 默认入口断开 / 未运行` |
| `packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts` | epoch切换调用`visual.clear / audio.stopAll`并重置active visual、audio seen、tick/revision/fingerprint | 清除旧视觉/声音与拒绝旧epoch回调；必须与HUD consumer epoch由正式宿主原子组合 | `static-candidate / defaultSurfaceWired=false / formal assets=false / 未运行` |
| `readFrameAudit` | `worldSupplyEquipmentInstanceIds / expectedWorldSupplyIdentities` | 复算Frame和供给身份闭包，不直接渲染 | `静态绑定 / 未验证`；缺失或漂移则整包拒绝 |
| V6 公共事件封套 | `id / sequence / tick / type` | 去重、迟到、诊断与单局有界消费 | `match-event-v6.ts / 静态绑定 / 未验证` |
| V6 `MatchStarted` | participant集合＋`modeDefinitionId` | 模式首见与目标静态提示 | `静态绑定 / 未验证` |
| V6 `ActionStarted` | `participantId / action / sourceKind / equipmentInstanceId / runtimeEquipmentDefinitionId / collectionEquipmentDefinitionId / survivalLevel` | 攻击/装备动作的anticipation Cue；不代表命中、fall、拾取或替换成功 | `静态绑定 / 未验证` |
| V6 `WeaponFeedbackResolved` | `kind / attackerId / targetId / actionDefinitionId / actionStartedTick / firstHitTick / targetFallTick / initialSupportSurfaceId / finalSupportSurfaceId / fallCause / creditedAttackerId` | 五类武器因果结果的唯一one-shot输入；Presentation只选Cue和文案 | `P4.4a静态绑定 / 未验证 / 生产不可达`；时序、支撑面或归因矛盾由合同失败关闭 |
| V6 `ParticipantFell` | `modeDefinitionId / participantId / modeRole / slotId / slotGeneration / fallCause / creditedAttackerId / supportSurfaceId` | 区分被击落、移动失足与环境fall | `静态绑定 / 未验证` |
| V6 `ParticipantRespawnScheduled` | participant/role/slot identity、`readyTick / anchorId / reason` | 权威重生等待与目标锚 | `静态绑定 / 未验证`；不能自行填protection或Survival delay |
| V6 `ParticipantRespawned` | participant/role/slot identity、`anchorId / invulnerableTicks` | 重生提交与保护表现 | `静态绑定 / 未验证`；字段存在不代表数值已冻结 |
| V6 `RaceSafeAnchorCommitted` | `modeDefinitionId / participantId / anchorId / progressOrdinal` | 安全锚短确认 | `静态绑定 / 未验证` |
| V6 `RaceFinishClaimed` | `modeDefinitionId / participantId / finishTick / progressOrdinal` | 终点claim与同tick共享第一Cue | `静态绑定 / 未验证` |
| V6 `SurvivalEnemySlotChanged` | slot/participant/generation、`active / anchorId / reason` | 同视觉族敌人的激活/失活与入口方向 | `静态绑定 / 未验证` |
| V6 `SurvivalPlayerFallCounted` | `participantId / fallCount / terminalFallCount / terminal` | 两格fall断环与第一/第二次后果 | `静态绑定 / 未验证` |
| V6 `MatchEnded` | `modeDefinitionId / modeResult` | 三模式live结算 | `静态绑定 / 未验证`；必须是step末项并与同step `readFrame.worldSnapshot.result`完全相等 |
| `ModeProjection` 公共字段 | `schemaVersion / modeDefinitionId / revision / preparationRemainingTicks / state` | 持续HUD与恢复重建 | `match-read-frame-v3.ts / 静态绑定 / 未验证` |
| Duel state | `kind / suddenDeath` | Duel阶段状态 | `静态绑定 / 未验证` |
| Race state | `kind / finishGateId / participants[]`；participant含`status / safeAnchorId / progressOrdinal / respawnReadyTick / finishTick / rank` | 倒计时、当前排名、重生和终点状态 | `静态绑定 / 未验证` |
| Survival state | `kind / playerParticipantId / fallCount / terminalFallCount / survivedTicks / pressureStage / enemySlots[]` | fall、存活tick、压力阶段、active enemy数 | `静态绑定 / 未验证` |
| PublicInfo V2 | `localParticipantId`与`publicParticipants[].identityOrdinal / identityGlyphKey / identityPatternKey`等 | 产品层2–4人非颜色身份参考；不在step输出内，不能驱动live Cue | `product-public-match-info-v2.ts / 非live输入 / Composition待绑定` |
| Product Result V3 | Duel winner/draw；Race winner/rank/finish/progress；Survival survived/stage/falls/reason | 下游产品结算封套；live终局只读同step的`MatchEnded.modeResult`与`readFrame.worldSnapshot.result` | `product-match-result-v3.ts / 非live输入 / 未验证` |
| SupplyProjection V3 | `snapshotTick / snapshotEventSequence / resyncReadiness / pendingAuthorityTick / pendingExpiryEquipmentInstanceIds / supplies[]`及runtime/collection/level/remainingTicks身份 | 生存供给Marker、倒计时、等级和恢复 | `arena-public-supply-projection-v3.ts / 静态绑定 / 未验证`；P1 599/600/601不得改变 |

## 4. Duel 权威事实 → Cue 矩阵

| 权威输入（候选） | 视觉/HUD Cue | 音频 Cue | reduced-motion | 静音等价 | 资产加载失败回退 | 禁止重判与状态 |
|---|---|---|---|---|---|---|
| V6 `MatchStarted.modeDefinitionId / participantIds`＋Duel `modeProjection.state.kind` | 两个相向括号/楔形，中间保留冲突空隙；当前只显示step内已验证participant诊断身份，正式glyph/pattern待Composition绑定 | UI 总线单次 Duel 开局提示 | 仅静态括号、模式缩写和目标文字 | 视觉、文字和语义公告完整保留 | `DUEL`文字＋participant短诊断码＋基础括号 | 不增加队伍、路线 rank 或 Survival fall；不得从内部config读取PublicInfo |
| Duel `modeProjection.state.suddenDeath` | 使用高对比但非全屏闪烁的阶段边缘；生命/剩余权威时间仍来自既有只读事实 | 可选单次中优先级阶段 sting；不得循环代替计时 | 静态阶段边缘＋文字 | 文字与形状不变 | `SD`/“决胜阶段”文字＋双侧断边 | 不从音乐强度、动画或墙钟进入 sudden death；`静态绑定 / 未验证` |
| V6 `ActionStarted` | 只表现participant、action和装备身份对应的anticipation/动作起点；无装备时保留base-action语义 | SFX仅可播放动作起始层，不播放命中/淘汰确认 | 静态动作方向/武器glyph，不用大位移 | action与sourceKind文字/形状保留 | participant诊断码＋action文字＋基础方向线 | `ActionStarted`不证明命中、fall、拾取或替换；不得从动画接触补造结果 |
| V6 `WeaponFeedbackResolved` | `hit-confirm`使用紧凑冲击核心；`hit-surface-transfer`增加明确方向/落点形状；`hit-ring-out`使用断环；`attack-evaded`使用开放攻击线；`movement-fall`使用无攻击来源的向下断线 | 只映射既有`weapon-hit / weapon-transfer / weapon-ring-out / weapon-evaded / movement-fall`语义Cue | 关闭震屏、长轨迹和装饰，只保留高明度核心、方向/结果形状与文字 | kind、来源和原因文字完整；静音不改变结果 | 基础glyph＋权威标题/解释，不等待资产 | 只接受已验证V6事件；不得由坐标、动画接触、屏幕内外或前一条Hit事件重新分类 |
| V6 `ParticipantFell`（Duel competitor） | 按`fallCause / creditedAttackerId`显示向下断线或受击来源；不立即标记winner/淘汰 | fall原因短Cue，不能覆盖终局Cue | 静态断线＋原因/来源 | participant与fall原因完整 | participant诊断码＋“受击/失足/环境” | V6没有`PlayerEliminated`；屏幕外、模型隐藏和fall动画均不算终局 |
| step末项V6 `MatchEnded.modeResult`＋同step `readFrame.worldSnapshot.result` | 两者完全相等且frame phase为`ended`后，单胜者用闭合章，draw用对称断章并显示reason | UI总线单次胜利或中性draw结算Cue | 静态结果章和完整文字 | 完整winner/draw/reason，不等待音频 | winner IDs/draw/reason纯文字＋基础章形 | 三者缺一或不一致则拒绝整个step且不显示Result；不按fall顺序挑winner |

## 5. Race 权威事实 → Cue 矩阵

| 权威输入（候选） | 视觉/HUD Cue | 音频 Cue | reduced-motion | 静音等价 | 资产加载失败回退 | 禁止重判与状态 |
|---|---|---|---|---|---|---|
| V6 `MatchStarted.participantIds`＋Race mode identity | 分叉菱形路线、2–4人step内已验证participant诊断身份和终点门框概览；正式glyph/pattern待Composition绑定 | UI总线单次Race开局提示 | 静态模式标、名单和目标文字 | 名单、模式与目标全部可读 | `RACE`文字＋participant短诊断码＋基础槽位 | 不从participant数组顺序生成名次，也不从内部config读取PublicInfo |
| `modeProjection.preparationRemainingTicks` | 固定宽数字＋收拢门框；仅在非 null 时显示 | UI 总线候选节拍；最后一拍与开局 Cue 分离 | 数字逐 tick/合法节拍更新，不位移缩放 | 数字、边框与语义公告不变 | 等宽数字＋基础边框 | 不使用 active hard-limit `WorldSnapshot.remainingTicks`、墙钟或动画；60 tick仍是候选门，字段路径`静态绑定 / 未验证` |
| `RaceSafeAnchorCommitted` | 小型圆角门框＋回转锚短确认，和大型终点门框、圆弧供给区保持剪影差异 | 默认 visual-only；若未来批准只允许低优先级、低频 SFX | 静态锚 glyph 短显示 | 锚 ID/glyph 可读 | 回转箭头＋`anchorId`文字 | 不画成碰撞体、按钮或任意坐标 checkpoint；只认权威 anchor |
| `ParticipantFell.fallCause / creditedAttackerId` | `credited-hit`：接触来源后接向下断环；`movement/environment`：向下断线且无命中红闪 | 被击落与失足使用不同音型；同 tick 有界合声 | 关闭震屏和长轨迹，保留来源/原因静态标 | participant、原因、来源文字完整 | 短编号＋向下断线＋“受击/失足/环境” | 不从前一条 Hit 事件顺序或坐标猜原因；payload 矛盾即 resync |
| `ParticipantRespawnScheduled.readyTick / anchorId`＋Race projection participant 状态 | 固定宽 remaining tick/ready tick、锚门和 respawning 状态；180 tick只读权威结果 | scheduled 默认不循环蜂鸣 | 数字＋静态环/锚门 | 完整显示等待与锚 | participant编号＋ready tick＋anchorId | 不用动画时长、墙钟或当前位置；ADR-121源码候选保护30 tick并使用双地图公共Race fallback锚，A2不得拥有该数值，平衡批准仍为`not-run` |
| `ParticipantRespawned.anchorId / invulnerableTicks` | 安全门框、participant 身份和有限保护边缘 | SFX 总线单次重生 Cue | 静态门框＋保护图标，不闪烁 | 同一身份/锚/保护文字 | 编号＋锚 ID＋“已重生”＋保护 tick（若权威非零） | 只在事件 tick 提交；动画完成不得触发，未决数值不得由美术补默认 |
| 同 tick `RaceFinishClaimed` 批次 | 一个共享终点核心 Cue；同 tick claim participant进入同一第一名容器 | UI 总线只播放一次共享 finish stinger | 稳定闭合门框＋“并列第一” | participant列表、并列和终点完整 | claim participant数字列表＋闭合门框 | 不按 `sequence`、到达时间或 participant ID 拆分先后；finish+fall 只认权威输出 |
| Race projection 的 `rank / progressOrdinal / status` | 进行中排名使用固定宽 rank 与非颜色身份；只显示 projection 已发布事实 | 排名变化默认不逐次播放，避免噪声 | 数字/纹理静态更新 | 排名和身份完整 | `#N`＋participant数字/glyph | 不读取世界坐标或镜头前后；rank 为 null 时不得自行补名次 |
| step末项V6 `MatchEnded.modeResult`＋同step `readFrame.worldSnapshot.result` | 完全相等后，有finisher才闭合终点章；真实并列共享rank；`no-finisher`保持开放门框并显示权威progress | 有winner才用胜利Cue；`no-finisher`只用中性结束Cue | 静态排名表、开放/闭合门框和reason | 完整rankings/reason，音频不影响页面开放 | winner/ranking/finishTick或progress/reason纯文字表 | 三者缺一/不一致则整包拒绝；不按事件序挑冠军或把最高progress伪造成winner |

## 6. Survival 权威事实 → Cue 矩阵

| 权威输入（候选） | 视觉/HUD Cue | 音频 Cue | reduced-motion | 静音等价 | 资产加载失败回退 | 禁止重判与状态 |
|---|---|---|---|---|---|---|
| V6 `MatchStarted.participantIds`＋Survival mode identity | 外围压力箭头、两格fall断环、存活tick/阶段区域；玩家与敌人身份只读step事件/Frame | UI总线单次Survival开局提示 | 静态模式标和目标文字 | 所有目标、fall上限和玩家诊断身份可读 | `SURVIVAL`＋`0/2`＋基础压力箭头 | 不从角色模型或内部assignment猜玩家/敌人角色 |
| SupplyProjection V3 active supply | 场上最多3个 Marker，显示 collection/runtime/level、位置和权威 `remainingTicks`；不是三选一弹窗 | 生成 Cue 只由 P1 严格供给生命周期产生；不为每帧倒计时发声 | 静态 Marker、数字和方向；关闭脉冲/旋转 | Marker、Lv.N、剩余 tick完整 | collection基础glyph＋`Lv.N`＋固定宽tick；若身份不闭合则隐藏整项并显示resync | 不从波次、颜色、模型或属性猜tier；不使用墙钟删除；P1 599/600/601保持原语义 |
| 同step `readFrame.worldSnapshot.equipment / activeSupplyProjection`状态变化 | 只原子更新当前持有装备与Marker集合；若V6 events没有对应供给原因，只做中性静态切换 | A2不播放拾取/替换/过期one-shot；这些Cue仍由A1.0-v2独立稳定事件合同所有 | 静态旧/新身份与Marker增删 | 装备文字和Marker状态完整 | collection/runtime/level文字＋基础glyph | 禁止从前后Frame差分推断`picked-up/replaced/expired`；不得复制A1事件词表 |
| `SurvivalEnemySlotChanged.active=true` | 同一敌人视觉族的入口方向、active enemy 数和压力层级；generation只用于内部身份，不显示为稀有度 | 同 tick 多slot合并一次压力 Cue，防止 voice storm | 静态入口箭头＋敌人数 | 敌人数、入口方向和stage完整 | `敌人 N`＋方向箭头 | 不通过发光、体型、颜色或generation伪造新敌种/技能；压力阶段数值仍未冻结 |
| `SurvivalEnemySlotChanged.active=false` | 对应 slot 的失活/淘汰状态；必要时短显示来源方向，不生成玩家胜利章 | 低优先级失活 Cue，可被更高优先级fall/终局 Cue抑制 | 静态slot划除 | active count/slot状态完整 | slot短ID＋“已失活” | enemy fall本身不等于终局；只认slot权威失活，不从模型隐藏推断淘汰 |
| `ParticipantFell`（Survival player） | 先按 `fallCause`区分被击落/失足，再等待权威 fall count；不提前填断环 | SFX fall原因 Cue；不冒充最终结算 | 静态原因＋向下断线 | 原因和participant可读 | 编号＋原因文字 | fall事件不自行增加count、不决定是否重生或终局 |
| `SurvivalPlayerFallCounted` | `0/2 → 1/2 → 2/2`两格断环；第一次显示等待重生，第二次仅在权威terminal/result后闭合中性成绩章 | 第一次fall和终局使用不同优先级/音型 | 数字＋静态断环，不闪烁 | fallCount/terminal文字完整 | `fallCount/terminalFallCount`文字＋两格框 | 不从生命条、掉落次数动画或Profile递增；终局阈值只读payload/Definition |
| `ParticipantRespawnScheduled/Respawned`（Survival player） | 合法生存锚、ready tick和保护状态；不复用Race外观为相同语义，可共享基础锚形但加Survival fall上下文 | scheduled默认静音，respawn单次中优先级 Cue | 数字＋静态锚/保护边缘 | 锚、等待、fall上下文完整 | 编号＋anchorId＋ready tick | ADR-120源码候选为60 tick等待、30 tick保护与双地图同语义safe anchor；A2只读事件值且不得拥有数值，平衡批准仍为`not-run`，不得复制Race 180 tick |
| Survival projection `survivedTicks / pressureStage / enemySlots` | 固定宽存活 tick、权威stage与active enemy count | 持续音乐/氛围如未来制作只能跟随状态，不回写阶段；本轮不批准音乐资产 | 静态数值，不依赖呼吸/脉冲 | 数值与文字完整 | `T / Stage / Enemies`文字 | 不从敌人数、音乐层或墙钟反推stage；首发敌人数上限仍为null |
| step末项V6 `MatchEnded.modeResult`＋同step `readFrame.worldSnapshot.result` | 完全相等后显示survived ticks、pressure stage、fall count与reason；第二次fall或time cap均用中性成绩章 | UI总线单次中性结算Cue | 静态成绩章和完整数值 | Result完整，声音/解码失败不阻塞结算 | player ID＋survived/stage/falls/reason纯文字 | 三者缺一/不一致则整包拒绝；不把生存时长伪造成胜利 |

## 7. 角色、武器、地图、VFX、HUD 与音频的预生产约束

本节只定义未来代表样件的输入规格，不创建任何资产。

| 消费面 | A2.0 可冻结的约束 | 当前禁止 |
|---|---|---|
| 角色/多人身份 | 视觉目标仍为glyph＋pattern＋ordinal＋本地外环；但`ModeMatchRuntimeV6.step()`当前只含participant/event/frame身份，PublicInfo不在step内，因此正式非颜色身份接线保持pending | 从内部config读取PublicInfo、把participant数组顺序当ordinal/rank、只换色或为Survival generation制作新敌种 |
| 武器/供给 | collection/runtime/level三身份闭合后才显示；模型缺失只回退基础glyph＋文字，碰撞/动作仍由权威层决定 | 从模型名解析tier、用更大模型暗示更大hitbox、把程序化fallback列为正式资产 |
| Race地图 | 终点=大型闭合门框，安全锚=小型圆角回转门，供给=圆/软弧；三者需纯黑剪影和灰度可区分 | 修改surface、终点碰撞、锚坐标或用装饰地箭当权威进度 |
| Survival环境/敌人 | 同一低多边形视觉族；压力只通过权威同屏数量、入口方向、疏密与stage HUD表达 | 用generation、发光、稀有色、放大碰撞或新增技能轮廓表达未冻结规则 |
| VFX | 每类 Cue 拆为核心、方向、结果、装饰层；核心先灰度可读，装饰最先关闭；未来必须有容量、overdraw、池化与destroy证据 | 本轮制作粒子、扭曲、贴图或把技能示例预算写成项目通过值 |
| HUD | 三模式采用Art Bible形状语法；数字固定宽；DOM/Canvas未来必须同一ViewModel | UI持有第二份fall/rank/计时状态，或用动画过程填补缺失权威字段 |
| 音频 | 模式 Cue只走SFX/UI；静音只关闭播放；one-shot有界并在resume不补播；终局不等待stinger | 本轮下载/生成音频、以声音时长驱动规则、把候选headroom写成设备通过 |

## 8. 尚未冻结、不得由美术填值的 P2.5e/P2 字段

以下缺口必须保持 `pending-binding / unresolved`：

1. `ModeMatchRuntimeV6`、V6事件、MatchReadFrame V3与SupplyProjection V3已静态绑定路径、公开exact-key和内部禁止面；byteLength、SHA-256、编译/运行证据仍待P2.6固定；
2. V6公共封套、10类事件与每类payload源码字段已静态绑定；runtime已静态拒绝mode/participant/role/sequence/专属事件类型漂移，但运行证据仍待P2.6；
3. `ModeMatchRuntimeV6.step()`公开结果已绑定为`events / readFrame / readFrameAudit`；`MatchReadFrame V3`的mode/Supply projection与Result路径已绑定，revision/resync和整包原子消费尚未运行验证；
4. ProductPublicMatchInfo V2与Product Match Result V3不在step输出内；它们的正式Composition/产品页面接线仍待定义，A2 live Cue不得绕行读取；
5. Race 重生保护 tick、Race 硬时限 tick；
6. Survival 首次重生 delay/protection/合法锚；
7. Survival pressure stage tick、目标active enemy数、slot重激活delay与入口锚；
8. Survival 已证明引擎安全上限与首发内容上限；当前只能记录 `schema=16 / implementation-candidate<=4 / engine-safe=null / launch=null`，不能把4写成安全或首发值；
9. Survival tier阈值、逐武器成长字段/数值与正式等级资产；
10. Survival 技术硬时限、三模式奖励数值、任何正式音频响度/voice/overdraw/设备预算实测；
11. P2.5e复合checkpoint与三模式恢复、P2.6同seed/同输入continuous/restored逐字段对照，以及P5.3a consumer-epoch/效果清理与正式候选原子宿主代码均已形成静态候选；P5.3a源码已闭合HUD ViewModel顶层exact-key、V6原始事件批次`startSequence/count/endWaterline`、来源ID、同tick空批次和旧generation边界，但这些候选以及同tick/跳空/重复/future字段/跨epoch旧回调反证均未运行；
12. A0.3真人 `0/10`、A1.1当前source重建、正式资产来源/许可/SHA、浏览器/设备/真人证据。

这些字段未冻结不阻止本文定义fail-closed消费边界，但阻止任何截图、代表样件、Blockout、正式VFX/音频、生产HUD和入口开放。

## 9. P2.5e Runtime/恢复候选落盘后的集中重绑定门

当前已完成路径与字段级静态绑定；进入任何表现实现前仍必须在P2.6最终同源上完成以下集中审计，本轮没有执行运行验证：

1. 读取并固定实际`mode-match-runtime-v6`、`mode-match-runtime-checkpoint-v1`、`arena-mode-verification-runtime-factory-v1`、`match-event-v6`、`match-read-frame-v3`、`arena-public-supply-projection-v3`文件路径、byteLength和SHA-256；测试文件路径以开发授权后的真实登记为准，不自行猜测。
2. 对照本文第3节逐项核对step顶层只能是`events / readFrame / readFrameAudit`，并验证枚举、null语义、数组排序、identity闭包、future schema拒绝、resync行为以及内部`stateHash/command/checkpoint`不得泄露给Presentation。
3. 建立逐项模式/Cue fixture计划，至少覆盖三模式首见、Race 2/3/4人、同tick并列、finish+fall、`no-finisher`、179/180/181、Survival 0/1/2 fall、slot active/inactive、P1 599/600/601、重复/迟到/乱序、pause/resume、静音、低动效、资产失败、双destroy与Replay重建；每个恢复case必须另有同seed/同输入continuous对照，逐项比较step事件、Frame/Audit、Result、Replay/checkpoint与终局身份。fixture数量以P2.5e runtime真实联合和失败面为准，不从A1.0的25项历史矩阵借数。
4. 证明任一unknown/future/mixed schema、identity漂移、缺字段、额外字段、事件与projection矛盾都不会生成伪Cue或保留旧状态；终局必须证明末项`MatchEnded`、frame phase/result三者原子闭合。
5. P2.5e签核前必须运行证明正式候选宿主在restore/seek时原子驱动HUD consumer与Audio/VFX consumer建立同一新epoch、只从恢复后的已验证Frame重建持续态、首step原始事件批次从旧水位连续且不补播旧one-shot；同时证明已写的恢复链与continuous对照在同seed/同输入下逐项相等。P5.3a已静态实现HUD ViewModel顶层exact-key验证、可复算批次起点/数量闭包和双consumer原子组合，但runtime没有公开epoch字段；运行反证缺失时仍必须fail closed，不得把静态恢复候选写成可恢复生产路径。
6. 更新本文件的“待绑定”为具体源码身份；任何字段变化只修改受影响映射，不扩写规则或资产范围。

## 10. P2.5e恢复同源静态回绑六维自检

| 维度 | 静态结论 | 未执行/阻断 |
|---|---|---|
| 公开边界与健壮性 | A2 live入口仍收敛为step exact-key `events / readFrame / readFrameAudit`；P5.3a已静态拒绝HUD ViewModel顶层extra/future字段、逐项调用V6事件validator，并由正式候选宿主只接收已验证step投影，不能扩大该入口 | 正式宿主尚未运行证明；runtime/validator/恶意输入测试未执行，生产入口不可达 |
| Cue语义与第二权威 | 三模式Cue只绑定V6事件、Frame projection和同step ModeResult；ActionStarted不冒充命中，Frame差分不冒充供给原因，坐标/动画/音频均不反判 | P1供给one-shot仍归A1.0-v2；PublicInfo/产品Result不在step，Composition待绑定 |
| 竞态、去重与原子性 | `id/sequence/tick`仅用于去重、稳定消费和迟到；P5.3a已静态闭合完整批次水位、来源ID、同tick空批次、旧generation拒绝、效果清理与双consumer原子宿主，历史前缀/checkpoint仍不进入Presentation；continuous/restored对照源码已写 | 原子宿主、continuous/restored对照及同tick/跳空/乱序/重复/跨epoch旧回调的运行测试均未执行 |
| 静音、低动效与资产失败 | 核心形状/数字/文字在静音、低动效和资源失败时保持；装饰、震屏、闪烁与声音可降级，程序化fallback不计正式资产 | 未生成/注入资产，来源/license/SHA、截图与设备证据仍缺 |
| 异步生命周期与恢复 | P5.3a候选已写旧generation拒绝、epoch切换`clear/stopAll`及去重重置；pause/resume/restore仍只允许重建持续态，Replay/checkpoint及历史前缀零消费 | 两个consumer尚无正式原子宿主；P2.5e未签核，无continuous等价、双destroy、迟到resolve/reject、资源归零或seek运行证据 |
| 治理、主流程与回滚 | 保持`preproduction-contract-candidate / formalGate=false`，仅三文档静态回绑；runtime/source漂移时按段落回滚，不开放资产或入口 | A0.3真人0/10、A1.1当前source重建、P2.6、正式资产/Blockout/设备/真人全部红 |

静态自检只说明当前文档没有主动引入第二权威或虚构数值，不构成自动化、设备、真人或阶段评分。A2.0继续为`preproduction-contract-candidate / static-bound-to-mode-match-runtime-v6 / hardGate=false`。

## 11. 变更治理与整文件回滚

- 本轮精确修改文件：本文、`docs/architecture/arena-art-bible.md`、`docs/architecture/arena-art-development-alignment-matrix.md`；仅回绑P2.5e runtime/恢复候选状态、公开消费边界与失败关闭生命周期
- A2写域明确未改：任何表现/authority源码、ADR、台账、索引、流程、脚本与`public/assets/`字节；同一工作树中的P2 Core/Product/Session修改属于开发批次，不属于美术实现
- 未运行：文档检查、链接检查、typecheck、lint、测试、构建、生成器、浏览器、模拟器、设备、性能与资产预算；统一记为 `deferred-by-ADR-118`
- 下游失效范围：runtime step、V6事件、Frame/Projection/Result任何字段或裁决漂移时，第2–10节受影响条目失效；若公开step不再只有三键或模式规则变化，整份A2.0合同退回重审
- 回滚方式：在不使用`reset/checkout`的前提下，分别撤销本文的runtime/step/Cue/六维自检段落、Art Bible的A2.0来源与依赖段落、Alignment Matrix的A2.0状态/绑定/自检段落；整文件回滚点均为本轮开始前版本
- 下一步权限：仅主协调可在审阅静态七维自检后决定是否保留本文、要求修订或开放P2.0b真实字节重绑定；美术线程不得自行进入资产制作
