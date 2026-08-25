# Arena V2 A4 武器阶段音频生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a4-weapon-phase-audio`第七批可做的生产前准备，把20把武器各自的`windup / release / recovery`共60份音频、权威阶段因果、混音优先级、恢复/静音与设备试听收敛成逐资产评审包。
- 明确不做：不生成、修改、加载、解码或播放音频，不改变ActionStarted、动作阶段、控制锁、命中、击落或移动，不调整既有Owner或混音运行时，不把“release”写成命中确认。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a4-weapon-phase-audio-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | 20武器×前摇/释放/收招三阶段动作可读性 |
| 权威来源 | Formal Audio Catalog、Readiness、批准账本、工作队列、二十武器音画Manifest、Weapon Phase Audio Owner |
| 使用技能 | `audio-design`、`game-art-director` |
| 强制参考 | Art Bible、美术/音频流程、对齐矩阵、阶段音频生成记录、阶段Owner和两个技能说明 |
| 正式或研究 | 正式武器阶段音频生产评审准备；不是音频批准、试听通过、Integration或Final |
| 来源 revision / license / SHA | 60项逐一继承当前Catalog/账本；均为已登记命中候选派生的项目候选，生产批准仍缺失 |
| 目标设备 | 耳机、桌面扬声器、手机扬声器和三端目标；均未播放或录音 |
| 静音 / 恢复 / 失败回退 | 静音仍推进去重水位但不补播；恢复到半截动作且未观察到ActionStarted时保持静默 |
| 预算影响 | 零新增字节；源码逐项汇总当前60份编码字节，但不把编码体积当作解码、响度或混音证据 |
| 验证 | 直接规格已纳入SF-A3A6P.1固定runner；试听、波形、响度、多人拥塞、浏览器、设备和性能仍顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响资产、Owner、Resolver、混音或入口 |

## 二十把武器三阶段闭包

- 每把武器精确拥有`windup / release / recovery`各1份，共60份互不重复Asset ID和Cue ID。
- 每组阶段音频继承同一武器的地面/空中两个Action Definition；阶段Cue自身`combatGrammarIdentity=null`，不得复制或改写战斗语法。
- `windup`读取权威`windup`，表达承诺开始，固定较低`-6 dB / priority 1`，绝不表达命中。
- `release`读取权威`active`，表达动作释放，固定`-3 dB / priority 2`；即使没有命中也可能播放，所以必须与命中/击落确认清楚分离。
- `recovery`读取权威`recovery`，表达收招，固定`-6 dB / priority 1`；它不能授予控制、就绪或取消窗口。
- 运行因果只允许本地玩家`ActionStarted + participant.action.phase`，不从动画、姿态、音频播放结束或墙钟推断阶段。

## 重复、混音与生命周期

- 每个阶段只对同一动作开始身份发出一次，source identity为`ActionStarted.id + weapon phase`。
- 变化只允许`sourceEventId`确定性选择`0.96 / 1.00 / 1.04`播放率，不使用运行随机。
- 全部走`SFX`，最多8 Voice，拥塞时丢最低优先级；必须后续证明阶段音不会遮蔽命中、击落、终局、模式和供给结果。
- 同局tick/sequence、装备实例、Collection Definition与Survival Tier必须闭合；身份漂移失败关闭。
- 静音时已到达的阶段只计为静音消费，不在解除静音后补播。
- 恢复到动作中段但没有观察到原始ActionStarted时保持静默，避免历史前缀补播。
- reset/stopAll/destroy后不得留下Active Action、去重条目、Voice或异步回调写入。

## 十项后续评审门

以下全部为`not-run`：

1. 20武器是否各有且只有3份阶段音频。
2. 60份衍生候选的revision/license/SHA是否闭合。
3. ActionStarted与权威阶段映射是否不依赖动画推断。
4. windup是否能读出承诺开始但不像命中。
5. release是否清晰且与命中/击落确认分离。
6. recovery是否表达收招但不伪造控制或就绪。
7. 阶段Gain/Priority是否不遮蔽命中、模式和供给。
8. 三档确定性变化、8 Voice和去重是否在重复动作中稳定。
9. 中段恢复、静音、reset、stopAll和destroy是否不补播、不泄漏。
10. 20套三段序列在盲听、耳机、扬声器和手机上是否可读。

## 生产边界

当前只开放`source-phase-causality-mix-budget-and-review-preparation-only`：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝20×3不闭合、Cue/Asset重复、path/bytes/SHA漂移、阶段与Manifest不一致、动作情境缺失、Gain/Priority漂移、Owner权威来源漂移和伪造批准；直接规格已由固定runner执行。十项真实评审仍`not-run`，不能声明试听、阶段区分、混音、恢复、静音、设备或生命周期通过。
