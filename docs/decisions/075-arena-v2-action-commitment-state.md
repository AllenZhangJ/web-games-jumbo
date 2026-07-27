# ADR-075：承诺动作由统一 ActionExecutionSystem 裁决

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 research-only 武器动作的蓄力、提前取消、提交和到期处理

## 背景

热血英豪武器研究表明，读招反制的核心差异不是单纯伤害，而是玩家是否愿意承担一段可读的出手承诺。此前项目只有独立的整数 tick 探针，能够描述“提前释放、达到承诺、等过头”，但不能证明这些结果已经进入真实动作状态、命中链路和 Replay。

如果由 UI、武器装备或表现层各自解释按住/松开，会产生多个时序真相，且容易在 active 前后出现取消不一致。

## 决策

1. `ActionDefinition` 可选声明 `commitment`，包括 `commitTicks`、`expireTicks`、`expireOutcome`、`canTurn` 和 `levelThresholds`。省略该字段的既有动作行为和内容 hash 保持不变。
2. `ActionExecutionSystem` 是承诺状态的唯一写入者；承诺必须在 `active` 前结算，因此 Definition 要求 `expireTicks < timing.windupTicks`。
3. 仍处于 `charging` 时：
   - 在 `commitTicks` 前松开：取消并回到 idle；
   - 达到或超过 `commitTicks` 后松开：提交，动作继续完成；
   - `expireOutcome=cancel` 且持续按住到 `expireTicks`：取消，不自动释放；
   - `canTurn` 只决定蓄力期间是否更新结果朝向。
4. 权威快照只在动作声明承诺时增加承诺状态字段；取消和提交通过权威事件向表现层传递。表现层不得重新判断按键时序。
5. 承诺字段当前只用于研究候选；没有任何研究 `ActionDefinition` 因此进入生产 `EquipmentRegistry`。

## 后果

- 读招反制的取消/提交/到期语义与普通动作生命周期共用同一套确定性状态和 Replay；
- 武器概览和命中反馈可以使用同一份 `chargeTicks`、等级和方向状态；
- 生产基线不声明 `commitment`，因此不会引入既有内容 hash 漂移；
- 仍需补齐正式反馈资产、多人/地图边缘场景和真人可读性验证，不能把状态接入视为生产平衡完成。

## 验证入口

- `packages/arena-core/src/action-execution-system.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-read-punish-replay-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-read-punish-replay-prototype.test.ts`
- [读招反制承诺状态与 Replay 原型结果 V1](../research/arena-v2-weapon-read-punish-replay-results-v1.md)
