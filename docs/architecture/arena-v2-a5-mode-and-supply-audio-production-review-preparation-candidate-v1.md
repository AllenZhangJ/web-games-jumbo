# Arena V2 A5 模式与供给音频生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a5-mode-and-supply-audio`第九批可做的生产前准备，把13个模式Cue、4个供给Cue、权威因果、语义优先级、混音、静音恢复和生命周期收敛成逐资产评审包。
- 明确不做：不生成、修改、加载、解码或播放音频，不改变模式、掉落、重生、终点、终局或供给规则，不改现有HUD队列、8 Voice、总线或混音运行时，不让声音参与Gameplay Authority。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a5-mode-and-supply-audio-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | 13个模式结果Cue与4个供给生命周期Cue |
| 权威来源 | Formal Audio Catalog、Readiness、批准账本、工作队列、Mode HUD ViewModel、Supply Fact Projection、Feedback Queue和正式Audio Resolver |
| 使用技能 | `audio-design`、`game-art-director` |
| 强制参考 | Art Bible、美术/音频流程、对齐矩阵、模式/供给音频生成记录及两个技能说明 |
| 正式或研究 | 正式模式/供给音频生产评审准备；不是音频批准、试听通过、Integration或Final |
| 来源 revision / license / SHA | 17项逐一继承当前Catalog/账本；均为项目衍生`authored-candidate-not-approved`，来源批准和生产批准仍缺失 |
| 目标设备 | 耳机、桌面扬声器、手机扬声器和三端目标；均未播放、录音或测量 |
| 静音 / 恢复 / 失败回退 | 静音仍推进一次性事件水位，解除静音和恢复不补播；视觉、文字和读屏继续承担因果反馈 |
| 预算影响 | 零新增字节；当前17份OGG编码共92,077 B，不把编码体积当作解码、响度或混音证据 |
| 验证 | 测试、类型、构建、治理、试听、波形、响度、拥塞、浏览器、设备、性能和生命周期全部顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响资产、Resolver、Queue、Audio Port或入口 |

## 十三个模式 Cue

| Cue | 唯一权威事实 | Gain / Voice优先级 | 听觉职责 |
|---|---|---|---|
| `mode-started` | `MatchStarted` | `-3 dB / 2` | 清晰开局边界 |
| `participant-fell-credited-hit` | `ParticipantFell + credited-hit` | `-2 dB / 3` | 武器归因重掉落 |
| `participant-fell-movement` | `ParticipantFell + movement` | `-2 dB / 3` | 较轻路线失误 |
| `participant-fell-environment` | `ParticipantFell + environment` | `-2 dB / 3` | 环境导致的暗色掉落 |
| `respawn-scheduled` | `ParticipantRespawnScheduled` | `-6 dB / 2` | 等待重生，不伪造已恢复 |
| `respawned` | `ParticipantRespawned` | `-3 dB / 2` | 完成重生确认 |
| `safe-anchor-committed` | `RaceSafeAnchorCommitted` | `-6 dB / 2` | 精确安全锚保存 |
| `race-finish-claimed` | `RaceFinishClaimed` | `-3 dB / 3` | 竞速终点释放 |
| `enemy-pressure` | `SurvivalEnemySlotChanged + active=true` | `-2 dB / 2` | 敌人进入压力 |
| `enemy-left` | `SurvivalEnemySlotChanged + active=false` | `-6 dB / 2` | 压力释放 |
| `survival-first-fall` | `SurvivalPlayerFallCounted + terminal=false` | `-2 dB / 3` | 第一次掉落、仍可恢复 |
| `survival-terminal-fall` | `SurvivalPlayerFallCounted + terminal=true` | `-2 dB / 3` | 第二次掉落、生存终结 |
| `match-ended` | `MatchEnded` | `-3 dB / 3` | 全模式对局结束最高语义 |

Gain只跟既有`normal / strong / warning`强调层级一致，Voice优先级服从结果语义。声音不能从角色位置、动画、地图边缘、播放结束或文案推断上述事件，也不能用自身结束回写重生或终局。

## 四个供给 Cue

| Cue | 唯一权威事实 | Gain / Voice优先级 | 听觉职责 |
|---|---|---|---|
| `supply-spawned` | `ArenaSupplyAuthorityFact(kind=spawned)` | `-3 dB / 1` | 可察觉的地图出现 |
| `supply-picked-up` | `ArenaSupplyAuthorityFact(kind=picked-up)` | `-6 dB / 1` | 快速所有权确认 |
| `supply-replaced` | `ArenaSupplyAuthorityFact(kind=replaced)` | `-3 dB / 1` | 两阶段替换确认 |
| `supply-expired` | `ArenaSupplyAuthorityFact(kind=expired)` | `-2 dB / 1` | 10秒生命周期轻关闭 |

供给声音不能比较世界武器列表、观察Marker消失或等待本地10秒计时来猜测结果。四个Cue始终是Voice优先级1，即使`expired`在视觉文案中为warning，也必须先于模式终局和关键战斗结果被拥塞淘汰。

## 混音、静音与生命周期

- 每个Cue只播放一次，身份来自既有`sourceEventId`；确定性选择`0.96 / 1.00 / 1.04`播放率，不使用运行随机。
- 路由保持`voice gain → SFX(0 dB) → Master(-6 dB) → limiter → destination`；Limiter目标为`-3 dB / 20:1 / 0 knee / 0.003s attack / 0.18s release`，只作安全网，不代表混音批准。
- 最多8 Voice，拥塞按语义优先级淘汰最低项；历史去重身份最多64，不扩大Queue预算。
- 静音、加载失败或候选未批准时，视觉、文字、方向/结果与读屏继续成立；不得使用振荡器或无关音效兜底。
- 静音时已消费的一次性Cue不在解除静音后补播；恢复时已过去的历史事件保持静默。
- epoch切换、`stopAll`和`destroy`必须清除Voice、去重身份与回调，当前均未运行验证。

## 十项后续评审门

以下全部为`not-run`：

1. 13个模式、4个供给Cue是否与17份资产一一闭合。
2. 17份衍生候选的revision/license/SHA是否闭合。
3. 每个Cue是否只消费显式权威事件或Supply Fact。
4. 武器击落、路线失误、环境掉落、生存第一次/第二次掉落能否盲听区分。
5. 开局、等待/完成重生、安全锚、终点和终局是否层级清晰。
6. 敌人进入/离场是否表达压力变化但不制造新敌种或stage语义。
7. 刷新、拾取、替换、消失是否准确表达10秒供给生命周期。
8. 同tick拥塞时终局是否保留、供给是否先淘汰且事件不重复。
9. Gain、Master Headroom、Limiter、耳机/扬声器/手机是否无削波与关键遮蔽。
10. 静音、恢复、加载失败、`stopAll`和`destroy`是否不补播、不泄漏、不改Authority。

## 生产边界

当前只开放`source-causality-priority-mix-mute-lifecycle-and-review-preparation-only`：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝13+4不闭合、Cue/Asset重复、path/bytes/SHA漂移、武器动作或战斗语法混入、供给优先级扩张、Queue/Voice预算漂移和伪造批准。延期测试已经登记但未运行，不能声明试听、因果辨识、混音、设备、静音、恢复或生命周期通过。
