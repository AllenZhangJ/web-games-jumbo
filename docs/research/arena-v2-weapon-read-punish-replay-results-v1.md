# Arena V2 读招反制承诺状态与 Replay 原型结果 V1

## 状态与边界

- 状态：候选 Definition 已通过统一动作状态与 MatchReplay 验证，仍未进入默认生产内容
- 日期：2026-07-28
- 候选：`launch-05-read-punish`
- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-read-punish-replay-prototype.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-read-punish-replay-prototype.test.ts`
- 关联决策：[ADR-075：承诺动作由统一 ActionExecutionSystem 裁决](../decisions/075-arena-v2-action-commitment-state.md)

本原型把读招反制从独立整数 tick 探针接入真实 `MatchCore → ArenaRuleEngine → ActionExecutionSystem → MatchReplay` 链路。它只验证承诺状态和可回放行为，不新增玩家存档字段、页面或默认生产武器。

## 固定 Definition 语义

读招反制地面动作使用内容层候选 `ActionDefinition`：

- 承诺门槛：12 tick；达到后松开才会提交；
- 到期：18 tick；仍持续按住则取消；
- 蓄力等级：6、12 tick 两个可观察节点；
- 蓄力期间允许转向；
- 动作前摇：24 tick，保证承诺取消在进入 active 前结算；
- 命中后保留 2 tick 有效窗口和高横向击退；
- 提前松开不会命中，成功提交后才进入有效窗口。

## 三组固定 Replay 结果

固定 seed 为 `1380270404`，Replay schema 为 V5，每场 9 个 checkpoint、96 个输入帧。

| 场景 | 动作开始事件 | 承诺结算 | 首次命中 | 最终 hash | 结论 |
|---|---:|---|---:|---|---|
| 提前释放 | tick 1 | tick 9 取消 | 无 | `42d4f4b9` | 提前松开承担空放结果，但不会进入 active |
| 成功提交 | tick 1 | tick 13 提交 | tick 25 | `ceda8789` | 达到 12 tick 后释放，进入有效窗口并命中 |
| 到期持续按住 | tick 1 | tick 19 取消 | 无 | `42d4f4b9` | 等过承诺窗口会取消，不自动替玩家释放 |

三组均通过二次 Replay 最终 hash 校验。前两组虽然最终状态 hash 相同，但承诺事件类型和结算 tick 不同；评审必须同时检查事件序列，不能只看最终 hash。

## 快照可读性证据

权威动作快照在承诺阶段公开：

- `status=charging`；
- `chargeTicks`；
- `chargeLevel`；
- `facingAtStart` 与 `facingAtResult`；
- 成功释放后 `status=committed`，并持续到 active/recovery 结束。

这让武器概览可以展示“承诺时间”和“是否允许转向”，对局反馈可以解释“提前取消 / 成功提交 / 到期取消”，而不是把差异隐藏在外观或伤害数字中。

## 迁移门禁影响

读招反制现在通过五项门禁中的：

- 正式动作状态：研究候选已使用统一动作状态机验证承诺、取消、提交和到期；
- 候选 Replay：三种承诺场景均有 checkpoint、事件和最终 hash。

仍阻塞：默认生产注册、正式反馈资产和生产迁移。候选继续留在显式 opt-in 工具链，不能被玩家获得。

## 后续

1. 为提交、取消和到期取消补齐正式反馈 Cue 与声音/特效映射；
2. 增加多人拥挤、目标主动转身和地图边缘的承诺场景；
3. 通过真人任务验证玩家是否能在短时间内说出“为什么这次松开没有收益”；
4. 完成后再独立评审是否把该候选迁移为生产武器。
