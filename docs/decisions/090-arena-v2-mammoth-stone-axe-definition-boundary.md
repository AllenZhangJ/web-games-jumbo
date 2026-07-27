# ADR-090：猛犸石斧先以预判、上下文和支撑面后果收敛

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 猛犸石斧研究 Definition、公共数值投影、地面/空中 Replay 与延迟预警边界

## 背景

官方猛犸石斧说明同时包含延迟落斧、蓄力地面重击、滚动物体、墙面反弹、猛犸公共危险和恢复物。[官方说明](https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=775) 的研究价值是让玩家预判路线并理解地图几何，而不是把所有结果压缩成一次高伤害。

## 决策

1. 先用地面 `facing-capsule` 与空中 `downward-cylinder` 表达重击的两套上下文；地面使用更长前摇和更长恢复，空中单独公开高度差与自身位移。
2. 延迟落点继续由独立预警区以 `18 tick` 预警、`2 tick` 有效窗口验证；该证据不替代普通 `ActionDefinition` 的地面/空中投影。
3. 使用真实 `MatchCore + MatchReplay` 验证安全命中、active 前离开攻击线和边缘击落，反馈分别表达命中、预判失败和支撑面丢失。
4. 滚动物体、墙面反弹、公共危险、自伤、猛犸肉、三次恢复和原作属性不进入本轮权威 Definition；每个后续系统必须有自己的 Rule/地图/资源证据。
5. 所有 Definition、数值投影和 Replay 保持 `research-only`，完成 KZ 多表面、反馈、设备和真人门禁前，不得注册默认生产装备。

## 被拒绝的替代方案

### 直接把三秒落斧写成普通起手

拒绝原因：普通前摇与预警落点的回应逻辑不同，会让玩家误解“看见区域后离开”与“观察攻击者动作”的反制窗口。

### 把滚动物体、墙反弹、猛犸召唤和恢复物做成一个大招

拒绝原因：会同时引入移动实体、地图碰撞、敌我共同受影响和资源争夺，无法区分命中因果，也无法控制制作复杂度。

### 用横向击退数值直接推断击落

拒绝原因：击落仍由真实支撑面和淘汰事件决定；同一重击在宽平台、窄路和断层上的结果必须通过地图 Replay 读取。

## 后果

- 猛犸石斧成为第六件接入统一研究概览的逐件武器，六件案例全部具备地面/空中研究数值投影。
- 概览能同时展示猛犸石斧的重击作用与魔血镰刃的中距离封路差异；玩家可读性仍需专门验证。
- 延迟、预警、滚动、墙反弹、公共危险和恢复物仍是后续拆分任务，不会因为 Definition 接入而自动进入生产。

## 验证入口

- [猛犸石斧 Definition 与预判落点 Replay 原型结果 V1](../research/arena-v2-weapon-mammoth-stone-axe-definition-and-replay-results-v1.md)
- `packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-replay-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-delay-prototype.ts`
- [ADR-082：延迟落点先以预警区和整数 tick 验证](082-arena-v2-mammoth-stone-axe-delay-boundary.md)
