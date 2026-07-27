# ADR-072：正式武器反馈事件接入 Three 灰盒表现

## 状态

已接受，适用于 V2 开发/测试工具链；灰盒效果、镜头、震动和现有音频触发链已接入，最终资产与真机可读性仍未验收。

## 日期

2026-07-28

## 背景

ADR-071 已经把五种因果反馈映射成 `WeaponFeedbackPresented`，但如果 Three 只消费旧的 `HitResolved`，正式反馈事件就不会进入实际的画面和设备反馈链。这样会让“语义合同已存在”和“玩家确实看见差异”之间留下断层。

## 决策

1. `WeaponFeedbackPresented` 保留来源动作、目标 ID 和攻击者 ID；Three 只使用这些字段定位效果、朝向和选择已有音频入口，不从位置或状态重新推导命中原因。
2. `GreyboxEventEffects` 消费五种 `visualCue`：命中确认、落点转移和击落使用冲击效果；避开攻击线和路线失误使用警告脉冲；`emphasis` 只影响表现强度。
3. `ArenaWorldStage` 只对冲击类 Cue 触发既有镜头冲击参数，路线失误和避开攻击不伪装成命中镜头。
4. `ArenaGreyboxRenderer` 对正式反馈事件复用现有震动和 `ArenaImpactAudio` 入口；只有冲击类 Cue 播放来源动作音效，避开攻击线和路线失误不伪装成命中音效；没有来源动作时不猜测音效。
5. 真实音频文件、最终特效、不同设备尺寸下的可读性和低动效体验仍需独立验收，不能因为灰盒链路通过就标记为生产完成。

## 验证证据

- `packages/arena-presentation-runtime/src/arena-v2-weapon-feedback-presentation.ts`
- `packages/arena-presentation-three/src/greybox-event-effects.ts`
- `packages/arena-presentation-three/src/arena-world-stage.ts`
- `packages/arena-presentation-three/src/arena-greybox-renderer.ts`
- `packages/arena-presentation-three/test/presentation-three.test.ts`
- `packages/arena-presentation-runtime/test/arena-v2-weapon-feedback-presentation.test.ts`

## 不采用

- 在 Three 层根据目标当前位置、支撑面或掉落状态猜测 `hit-ring-out` 与 `movement-fall`。
- 为每个反馈语义增加新的操作按键或新的规则事件。
- 把灰盒颜色、环形脉冲或现有音频入口当作最终美术与声音资产验收。
