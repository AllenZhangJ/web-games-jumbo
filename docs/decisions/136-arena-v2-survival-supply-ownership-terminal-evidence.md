# ADR-136：Survival 补给归属进入终局结算证据

状态：`proposed / production-unreachable / code-written-not-run / hardGate=false / validationStatus=not-run`。

## 决策

Survival 的补给生成、拾取、替换和过期继续由世界权威发布 `ArenaSupplyAuthorityFactV1`，不写入 Replay V6。Runtime 必须保留从 `sequence=0` 开始的完整事实前缀，并在同 tick 的装备 `ActionStarted` 之前应用事实，证明动作参与者当前持有精确的 `equipmentInstanceId / runtimeEquipmentDefinitionId / collectionEquipmentDefinitionId / survivalLevel`。

版本链固定为：

```text
Supply Authority Fact V1
  → Mode Runtime Checkpoint V4（完整事实前缀 + V3 checkpoint）
  → Mode Runtime Terminal Evidence V2（完整事实 + stream/sequence/count 水位）
  → Product Runtime Settlement Evidence V3
  → Authority Registered Settlement Evidence V3
  → Learning Terminal Handoff Runtime V3
```

Replay V6、ModeResult V3 和既有 V1/V2/V3 checkpoint 不改 schema。旧 checkpoint 恢复路径继续兼容运行；但 Survival V1 恢复，以及携带非空供给水位却缺少完整前缀的 V2/V3 恢复，必须标记为供给证据不完整，不得导出 V4 checkpoint 或 Terminal Evidence V2。只有新开局和 V4 恢复可以形成新 V3 正式结算证据。

## 一致性规则

- `spawned` 建立唯一 world 实例；`expired` 只能退休仍在 world 的实例。
- `picked-up` 只允许当前空手的对局参与者；`replaced` 必须精确关闭该参与者当前持有的旧实例。
- 同一装备实例跨事实的供给、运行时、收藏和等级身份不得漂移。
- 替换后旧实例立即退休；之后只能由新实例起手。
- 事实晚于终局、事实流不从 0 开始、stream/sequence/count 水位不闭合、局外参与者、未拾取/已过期/他人持有实例起手均失败关闭。
- Terminal Evidence V2 在生成和验证时直接执行共享归属门；Product Settlement V3再次执行同一门，形成终局生产者与结算消费者的双重边界，而不是只依赖下游补救。
- 完整事实数组与Runtime累计保留统一限制为1,000,000项；超限在当前step提交前失败关闭，避免长期对局直到checkpoint/终局导出时才发现证据无法发布。
- 生命周期资格、命中结果、延迟反馈和胜负仍由既有独立权威门负责；本决策不重判这些事实。

## 非目标

- 不改变每 20 秒三把武器、10 秒消失、等级成长、拾取替换操作或玩家按键。
- 不把供给事实复制进 Replay V6，也不新增玩家页面、货币、任务、资产或默认入口。
- 不声称测试、构建、压测、设备或发布门已通过；全部运行验证按开发优先约定顺延。
