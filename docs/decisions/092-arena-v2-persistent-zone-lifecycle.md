# ADR-092：延迟区域必须区分瞬时命中和持续封路

- 状态：已接受，研究工具链已接入；不代表生产规则已接受
- 日期：2026-07-28
- 范围：Arena V2 延迟/预警区域的研究生命周期、命中反馈和研究 Definition 字段

## 背景

热血英豪研究中，陷阱型武器的价值不只来自危险窗口开始时的一次命中，还来自命中后继续改变路线；延迟重击则可能在短窗口结束后立即失效。若两者都只使用 `active/expired`，概览、反馈和地图探针无法解释“为什么玩家重新进入后仍然被封路”或“为什么同样重新进入却没有再次命中”。

## 决策

1. 研究区预警区域使用 `telegraph → active → lingering → expired` 四阶段生命周期。
2. `lingerTicks` 是研究 Definition 的明确字段，必须是非负整数；`0` 表示瞬时区域，正数表示有效窗口结束后仍占用路线。
3. `isArenaV2WarningZonePointInside` 在 `active` 和 `lingering` 阶段都可以返回命中，但反馈必须区分 `impact-hit` 与 `linger-zone-hit`。
4. 所有权威时间仍使用整数 tick；区域中心、半径和高度差继续由同一份研究 Definition 读取，不由 Renderer 或测试脚本临时改写。
5. 该能力保持在 `arena-v1-experiment` 研究工具链，不能因为研究探针通过就进入默认生产 `ActionDefinition`、Product 武器矩阵、存档或网络合同。

## 被拒绝的替代方案

### 把持续封路当作更长的 active 窗口

拒绝原因：会丢失“有效命中”和“命中后继续占位”的反馈语义，也无法验证玩家在持续阶段重新进入的结果。

### 让表现层根据标记动画猜测区域是否仍有效

拒绝原因：会让 Renderer 重新判断权威命中，违反 Rule → Core → Presentation 边界；区域阶段必须来自研究运行时快照。

### 直接把原作描述时间换算为 Arena tick

拒绝原因：原作时间、Arena 物理尺度和设备帧率没有一一对应关系；本轮只验证时间结构，具体平衡需独立测量。

## 后果

正面影响：

- 魔血镰刃的持续封路与猛犸石斧的瞬时延迟重击有可比较的结构差异；
- 重新进入持续区可以形成独立反馈和地图后果探针；
- `lingerTicks=0` 保持已有延迟重击兼容，不强迫所有武器都拥有持续区域；
- 研究结果可以在不污染生产 Definition 的前提下继续进入 KZ、多人和真人可读性验证。

限制：

- 当前只验证单区域、单点和固定回应策略；
- 还没有定义区域叠加、刷新、重复命中、持续伤害或多人优先级；
- 研究阶段的 `lingerTicks` 不是玩家可见的正式数值，也不能作为生产平衡承诺。

## 验证证据

- 运行时：`packages/arena-v1-experiment/src/arena-v2-warning-zone-prototype.ts`
- 对照原型：`packages/arena-v1-experiment/src/arena-v2-weapon-persistent-zone-prototype.ts`
- 自动化：[持续封路原型结果 V1](../research/arena-v2-weapon-persistent-zone-prototype-results-v1.md)
- 相关边界：[ADR-082：延迟落点先以预警区和整数 tick 验证](082-arena-v2-mammoth-stone-axe-delay-boundary.md)、[ADR-089：魔血镰刃先以封路、上下文和路线后果收敛](089-arena-v2-magic-blood-scythe-definition-boundary.md)
