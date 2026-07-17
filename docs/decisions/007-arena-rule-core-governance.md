# ADR-007：Arena 采用项目内数据驱动 Rule/Core 分层

## 状态

已接受。

## 日期

2026-07-17。

## 背景

阶段 4～9 将连续引入装备、地图、触控动作、角色表现、局外进度和批量平衡。如果继续把规则直接加入现有 `MatchCore`，它会同时承担配置解析、动作选择、装备生命周期、命中效果、地图事件和会话编排，最终形成无法独立验证和替换的 God Class。

项目需要保持固定 tick、seed、回放和状态 hash，同时支持未来新增装备、地图、角色、Buff、机关、Bot 与 Mode。当前 1v1 实体规模很小，完整 ECS 或 Actor 运行时的依赖、调度和生命周期成本还没有性能证据支持。

## 决策

### 1. 固定依赖方向

Arena 采用以下单向层次：

```text
不可变 Definition 与显式 State
                ↓
只读 Registry、Resolver、独立 System
                ↓
按固定阶段编排的 MatchCore
                ↓
Replay、Bot Observation、Session Adapter
                ↓
Renderer、UI、Animation、Audio
```

下层不能反向导入上层。Definition 不包含函数、渲染对象或运行时引用；Runtime 只保存稳定 ID 和可序列化状态，不拥有 Registry 或表现对象。

### 2. Definition、Registry 与 Runtime 分离

- `ActionDefinition`、`EquipmentDefinition` 等是经过 schema 校验、克隆和深冻结的纯数据。
- Registry 在组合阶段一次性建立，拒绝重复 ID 和失效引用，运行时只读。
- Runtime Instance 只表示当前权威状态；每类状态由一个 System 写入，并通过只读快照对外暴露。
- 平衡配置版本、内容 ID 与实例 ID 分开，不能用显示名或资源路径充当权威身份。

### 3. 所有上下文动作经统一解析

装备、移动、空中动作和机关系统只能提交 `ActionCandidate`。`ActionResolver` 按显式优先级和稳定 ID 产生 `selected / ignored / none` 三类确定结果，不直接执行装备或物理效果。

不可行动是全局门禁；装备冷却可以用 `blocksFallback` 明确消费输入，因此不会意外回退为基础推击。新增动作通过新增 Definition、候选提供者和效果策略扩展，不在 Resolver 中增加装备类型分支。

### 4. Command 与 Effect 代替跨 Manager 调用

Resolver 只产生稳定命令。后续 `ActionExecutionSystem` 在固定 tick 阶段读取命令，通过按 effect kind 注册的策略生成命中、冲量、防御或状态变更。系统间使用显式命令、返回值和权威事件，不使用全局 Event Bus。

同 tick 的观察、选择、命中收集、效果提交和状态写入保持固定阶段；需要公平结算时先收集再统一提交，不能依赖 participant 遍历顺序。

### 5. 状态机归项目所有

`MovementState`、`ActionState`、`LifeState`、`EquipmentState` 和 `SessionState` 使用项目内枚举与显式转换表。当前不引入 XState Actor 运行时；只有状态组合复杂度、可视化或模型测试收益经证据证明后，才通过 Adapter 评估替换。

### 6. 确定性和失败语义是公共合同

- 权威时间只用整数 tick；随机只用 seed 派生的具名流。
- Definition 与运行时快照必须可稳定序列化；禁止非有限数、函数、循环引用和隐式墙钟。
- 外部输入与 Definition 在状态修改前验证；tick 内未知异常 fail closed，不让半提交的 Core 继续运行。
- Renderer、动画、摄像机和音频开关不得改变事件序列和 replay hash。
- 权威快照或 hash 字段发生语义变化时必须提升 Match/Replay schema；旧回放显式拒绝，不能在新规则下静默重放。

## GitHub 借鉴

- [ecsyjs/ecsy](https://github.com/ecsyjs/ecsy)：借鉴 Component 只存数据、System 承担逻辑、World 内有序执行的边界；其仓库自述为实验性项目，因此不引入依赖。
- [NateTheGreatt/bitECS](https://github.com/NateTheGreatt/bitECS)：借鉴小型数据导向 ECS、查询与序列化思路；当前实体数不足以证明迁移成本，且不复制 MPL-2.0 代码。
- [boardgameio/boardgame.io](https://github.com/boardgameio/boardgame.io)：借鉴 move/command 作为权威状态转换、先模拟后表现和可追溯日志；不引入其回合制与网络运行时。
- [statelyai/xstate](https://github.com/statelyai/xstate)：借鉴显式状态、事件和可测试转换；暂不引入 Actor、异步服务与计时器语义。

本 ADR 只吸收模式，没有从以上四个项目复制代码，也没有新增第三方依赖。

## 考虑过的替代方案

### 直接采用完整 ECS

能统一实体查询和对象池，但阶段 4 只有两名参赛者和少量装备。当前主要风险是规则耦合而非实体遍历性能，因此完整迁移属于无证据的结构成本。

### 每件装备实现自己的技能类

短期直观，但每个类会重复输入、冷却、碰撞、命中和掉落生命周期，并诱发 `instanceof` 或 switch 分支。拒绝该方案，使用数据 Definition 与 effect strategy 组合。

### 继续扩展 MatchCore 私有方法

改动最少，但会让动作选择、内容数据、效果执行和物理提交绑定在同一个生命周期中，无法独立测试或替换，因此只把现有基础推击视为待迁移的兼容实现。

## 后果

- 初期文件和合同测试增多，功能接入速度会慢于直接堆进 MatchCore。
- Definition 和候选命令可在 Node 中独立测试，Bot、回放和 Renderer 只需依赖稳定边界。
- 后续若采用 ECS、状态机或空间索引，可在 Registry/System/Adapter 内替换，不改变上层玩法合同。
- 现有基础推击已在阶段 4 迁移到统一 ActionDefinition 与 ActionExecutionSystem，旧私有命中路径已删除。
- 阶段 4 将 Match schema 和 Replay schema 升至 V2，以纳入 ActionDefinition ID、装备持有/冷却/世界位置与掉落状态。
- `configHash` 只标识对局配置；所有注册 Action/Equipment Definition 另生成 `ruleContentHash`。回放在起始时同时校验规则 schema、物理版本、配置签名和规则内容签名。

## 验收门禁

- Definition 深冻结并拒绝未知字段、非法引用、非有限值和循环数据。
- Registry 顺序稳定、ID 唯一、运行时不可注册。
- ActionResolver 对不可行动、装备冷却阻断、动作优先级和同优先级顺序有无渲染测试。
- `definition`、`registry`、`action`、`equipment` 层没有渲染、平台、AI、Session 或墙钟依赖。
- 新增一个测试装备只需新增数据和组合注册，不修改 Resolver。
- 同一候选集合即使输入注册顺序不同也得到相同解析结果。
