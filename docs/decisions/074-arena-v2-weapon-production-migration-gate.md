# ADR-074：首发武器必须通过五项生产迁移门禁

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 六个首发武器候选从研究工具链进入生产内容前的评审边界

## 背景

首发六个位置已经具备统一的公开数值投影。三个研究候选也已经有地面/空中 research-only Definition，并在 KZ 灰盒上产生了可观察的地图后果。如果把这些证据直接解释为“已经实现”，会把数值原型、地图探针和正式内容混成同一层，后续容易出现动作状态、回放和表现事件不一致。

## 决策

候选只有在以下五项全部通过时，才可以进入正式生产迁移评审：

1. 正式 Definition：地面/空中动作和 Equipment 身份来自正式 Registry，公开数值由权威调优投影；
2. 正式动作状态：前摇、有效、收招、冷却、冲突和取消语义由 Rule/Core 统一裁决；
3. 正式回放：候选拥有固定输入 Replay、checkpoint、事件序列和最终 hash 证据；
4. 地图后果：至少在宽平台、窄路、边缘或高低差中形成可解释的命中安全、击落或路线转移差异；
5. 反馈表现：命中反馈从权威事件映射到 `WeaponFeedbackPresented`，表现层不重新判断原因，并有候选动作来源。

门禁结果只能是“通过”或“阻塞”，不得用综合评分替代缺失证据。研究候选的 research-only Definition 可以通过数值结构检查，但不能通过正式 Definition 和正式动作状态门禁。

## 当前基线

- 三把生产基线通过正式 Definition、正式动作状态、地图后果和共享反馈表现合同，但尚未补齐候选专属 Replay，因此当前仍不能被本门禁标为生产迁移完成；
- 直线压制、读招反制、绕后三把研究候选已有研究 Definition 和 KZ 地图后果证据，但仍缺少正式 Definition、正式动作状态、候选专属 Replay 和正式动作来源反馈；
- 当前六把候选的生产就绪数为 `0/6`，这是门禁的预期结果，不是实现失败。

## 被拒绝的替代方案

### 只检查武器概览数值

拒绝原因：数值可比较不代表动作状态、回放和地图后果已经统一，无法保证玩家看到的行为与实际命中一致。

### 用研究原型的确定性运行代替正式 Replay

拒绝原因：研究探针只能证明脚本场景稳定，不能证明候选已经进入 MatchReplay schema、事件序列和最终 hash 合同。

### 先把三个研究候选注册进生产 Equipment

拒绝原因：会让未完成的动作状态和表现来源进入生产入口，并把 research-only 身份变成玩家可获得内容。

## 后果

- 迁移工作有明确的最小闭环：Definition → Action State → Replay → Map Consequence → Feedback；
- 研究可以继续推进，而不会因为“已有数值和地图探针”误触生产注册表；
- 生产基线也必须补候选专属 Replay，避免旧武器被默认视为 V2 迁移完成；
- 仍需后续完成正式动作实现、回放样本、多人/复活场景、最终声音特效和真人/设备验证。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-production-migration-gate.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-production-migration-gate.test.ts`
- [Arena V2 首发武器生产迁移门禁结果 V1](../research/arena-v2-weapon-production-migration-gate-results-v1.md)
