# ADR-071：武器反馈先映射为表现事件，再绑定声音与特效

## 状态

已接受，适用于 V2 开发/测试工具链和现有 Presentation Runtime；尚未形成真机声音/特效验收。

## 日期

2026-07-28

## 背景

ADR-069 已经把武器×地图结果区分为五种因果语义，但仅有语义还不能保证玩家在对局中看到不同反馈。如果 UI、音效或特效各自重新判断最终位置，就会出现表现与回放不一致。

## 决策

1. 五种权威反馈语义通过 `projectArenaV2WeaponFeedbackPresentationEvent` 映射为统一的 `WeaponFeedbackPresented` 只读表现事件。
2. 表现事件只携带展示所需的 `visualCue`、`audioCue`、`emphasis`、标题和解释；它不计算命中、掉落、支撑面或回应结果。
3. 事件使用稳定的 `presentation:weapon-feedback:<sourceEventId>` 身份，复用现有 `PresentationEventWindow` 的去重和顺序约束。
4. 事件可以携带来源动作、目标和攻击者 ID 作为表现上下文；这些字段只用于定位和选择表现，不允许在表现层重新判断命中结果。
5. 当前的声音/特效字段是语义 Cue，不代表已经存在对应最终资产或通过真机验证；实际资产绑定必须继续走现有 Presentation 资产预算和设备验收。接入现状见[ADR-072](072-arena-v2-feedback-presentation-three-consumption.md)。

## 映射

| 因果语义 | 视觉 Cue | 音频 Cue | 强度 |
|---|---|---|---|
| `hit-confirm` | `impact-confirm` | `weapon-hit` | 普通 |
| `hit-surface-transfer` | `impact-surface-transfer` | `weapon-transfer` | 强 |
| `hit-ring-out` | `ring-out` | `weapon-ring-out` | 强 |
| `attack-evaded` | `evaded-warning` | `weapon-evaded` | 警告 |
| `movement-fall` | `movement-fall-warning` | `movement-fall` | 警告 |

## 不采用

- 在 Canvas/Three 层根据位置重新判断原因；这会让表现成为第二个规则判定器。
- 所有结果都播放同一种命中音效；这会掩盖“攻击被躲开”和“路线失误”的区别。
- 在本批直接新增声音文件或镜头系统；当前先闭合事件语义和去重边界，再用设备证据决定资产。

## 验证证据

- `packages/arena-presentation-runtime/src/arena-v2-weapon-feedback-presentation.ts`
- `packages/arena-presentation-runtime/test/arena-v2-weapon-feedback-presentation.test.ts`
- [ADR-069：命中反馈必须保留失败原因的因果区分](069-arena-v2-hit-feedback-causal-contract.md)
