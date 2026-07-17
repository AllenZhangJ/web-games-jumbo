# Arena Stage4 Rule/Core 执行管线

## 目的

本文件定义 ADR-007 在阶段 4 的可执行合同。它不是表现或平衡说明，而是动作、装备与 MatchCore 之间的依赖和事务边界。

## 固定 Tick 阶段

每个 RUNNING/SUDDEN_DEATH tick 按以下顺序执行：

1. 在任何权威写入前校验完整 `InputFrame`。
2. 推进 Life、Equipment Cooldown 与 ActionState 计时器。
3. 处理到期装备刷新，并用 tick 开始时的角色位置解析自动拾取。
4. 各系统只生成 `ActionCandidate`；`ActionResolver` 统一选择或忽略动作。
5. `ActionExecutionSystem` 原子启动所有已选择动作。
6. 从同一份只读角色快照收集 active action、target 和 defense modifier。
7. `ActionEffectRegistry` 把 Definition effect 转为不可变 `RuleCommand`。
8. 对同 tick 的命中和命令排序、合并并统一提交，不能边遍历边改变后续命中输入。
9. 提交移动意图并推进物理世界。
10. 解析淘汰；EquipmentSystem 执行死亡掉落或回退，并产生诊断。
11. 生成只读 Snapshot、稳定事件和 StateHash 输入。

准备阶段不推进动作、装备、刷新或冷却，只推进当前兼容物理；比赛结束后不再接受 tick。

## 单一写入者

| 状态 | 唯一写入者 | 其他模块允许行为 |
|---|---|---|
| `ActionState` | `ActionExecutionSystem` | Resolver 只返回选择结果，Effect 只返回命令 |
| `EquipmentRuntime` / 持有关系 | `EquipmentSystem` | Pickup、Drop、Cooldown、Spawner 返回决策 |
| participant Life/Hitstun/LastHit | Match rule mutation port | Action/Equipment 返回命令，不持有 participant 引用 |
| character transform/velocity | Physics adapter | Rule command 通过显式 port 提交冲量或 reset |
| SessionState | Session | Core 不读 App 生命周期或墙钟 |

## 动作合同

```text
ActionCandidate
  ↓ ActionResolver
ActionResolution(selected / ignored / none)
  ↓ ActionExecutionSystem
ActionState(windup / active / recovery)
  ↓ TargetingRegistry + ActionEffectRegistry
RuleCommand[]
  ↓ deterministic batch commit
Authority mutation + stable gameplay events
```

- Resolver 不知道大锤、锁链、盾牌或具体 Runtime。
- ActionExecutionSystem 不知道物理、装备、Bot、Renderer 或 MatchCore。
- Targeting handler 只读取 source 与可命中 actor 的位置/朝向快照。
- Effect handler 只能返回可序列化命令，不能直接写 participant、physics 或 event buffer。
- 所有 handler 在 Core 构造期验证其参数；比赛中不允许出现未注册 effect/targeting kind。
- Action/Equipment Definition 的完整标准化内容生成 `ruleContentHash`；它与用户对局配置的 `configHash` 分开，并同时进入初始快照、状态 hash 和回放元数据。

## 同 Tick 公平性

同 tick 的 source/target/guard 全部来自提交前快照。命令按稳定 participant ID、action ID、effect 顺序排列，然后统一提交。一个命中可以中断目标的下一阶段动作，但不能追溯取消同 tick 已经收集的合法命中；这保持双方同时出手时可交换，不产生 participant 数组顺序优势。

## 装备生命周期合同

```text
spawned/dropped: ownerId = null, position != null
held:           ownerId != null, position = null
despawned:      ownerId = null, position = null
```

- Definition、spawn ID、instance ID 与展示资源 ID 相互独立。
- 每名角色只有一个 primary slot；自动拾取按距离、装备 instance ID、participant ID 稳定决胜。
- 使用动作时启动该实例 cooldown；冷却期间装备候选用 `blocksFallback` 消费动作输入。
- 淘汰掉落使用已验证的最后安全位置；无效时回退原始 spawner，并产生诊断命令。
- Serializer 只输出 schema 化纯数据，不序列化 Registry、函数、Set、Map 或表现对象。

## Bot 观察边界

- Bot 自身使用当前 tick 的持有装备、冷却和公开动作规则。
- 对手持有装备、对手动作范围与世界装备位置全部来自同一份延迟快照。
- BotObservation 不包含装备 origin/last-safe/revision、RNG 状态、未公布刷新点或内部 Registry。
- 资源争夺、装备使用和威胁规避只能产生标准限幅 `InputFrame`，冷却、碰撞、命中和掉落仍由同一 Rule/Core 处理。

## 迁移约束

现有基础推击已整体迁移到本管线，三件装备也只经过同一 Action/Effect 链路。旧私有命中实现已删除；后续新动作不得再向 MatchCore 增加特例命中分支。
