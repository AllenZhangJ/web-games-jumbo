# ADR-002：核心状态单向驱动三维表现层

## 状态

已接受。

## 日期

2026-07-14

## 背景

v3 要引入平台 Mesh、角色 Rig、蓄力形变、空翻、拖尾、粒子、失败倾倒和 `worldRoot` 连续平移。这些对象都带有自己的局部位置、缩放、旋转、时间轴和生命周期。如果它们同时成为玩法状态，同一平台和角色将有 Core 与 Three.js 两个权威来源。

双向或渲染驱动的状态会导致：

- Tween 的帧率与 easing 影响碰撞和落点。
- 为了视觉对齐把真实偏心落点吸附到平台中心。
- `worldRoot` 的构图平移反写到绝对世界坐标，破坏下一跳距离。
- 异步资源加载、丢帧或上下文恢复改变游戏结果。
- 现有数值、世界和碰撞测试无法与视觉层隔离。

## 决策

1. 领域真相位于 `packages/gameplay` 与 `packages/jump-engine`：数值、世界、角色绝对位置、跳跃轨迹和碰撞结果只有一个权威来源。
2. `packages/application` 是唯一编排者：它处理 Command、以固定步长更新领域，然后生成只读快照和事件。
3. `RendererPort.render(snapshot, events)` 只消费快照与表现事件，不持有可回写的 GameState 或 WorldState。
4. 平台表现以稳定平台 ID 与 Core 快照对齐，不以数组下标、Mesh 身份或视觉位置推断逻辑平台。
5. 角色 Rig 根节点的世界位置每帧由 Core 轨迹设置；形变和空翻只作用于局部子节点。
6. `worldRoot`、Camera 和 HUD 只能改变构图，不得改变平台或角色的 Core 绝对坐标。
7. Tween 只使用已确定的状态和事件驱动局部视觉参数，绝不用 Tween 的最终位置判定成功、失败或数值提交。
8. 上下文恢复、重开或重建 Scene 时，表现层必须从 Core 快照重建，不从 Mesh 反推玩法。

单向数据流为：

```text
Platform input / Command
      ↓
Application fixed-step orchestration
      ↓
Gameplay state + Jump Engine collision transaction
      ↓
Read-only state/world snapshot + presentation events
      ↓
Renderer3D / Three.js objects / Tween / effects
```

## 边界事例

| 问题 | 拥有者 | 表现层可做 | 表现层不可做 |
|---|---|---|---|
| 蓄力多久 | Runtime/Core | 将比例映射为身体和平台压缩 | 根据 Mesh 压缩量反算射程 |
| 角色在哪里 | Core 轨迹 | 设置 Rig 根节点，旋转局部视觉 | 用 Tween 根节点位置作为碰撞点 |
| 是否落地 | Core 几何和碰撞 | 播放回弹、粒子或失败倾倒 | 将边缘失败修正为成功 |
| 平台是谁 | Core 稳定 ID | 映射到 Mesh、更换视觉状态 | 以 Mesh 顺序代替 ID |
| 世界是否前进 | Core 平台晋升 | 平移 `worldRoot` 保持构图 | 反写平台绝对坐标 |

## 考虑过的替代方案

### 以 Three.js Scene 作为世界真相

能减少表面上的坐标复制，但物理将依赖渲染对象、动画时间和 GPU 生命周期，破坏现有确定性测试，因此拒绝。

### Core 与 Renderer 双向同步

允许 Renderer 提交“动画已落地”等回调会使运行时更容易按视觉节奏编排，但回调丢失、中断或顺序会影响逻辑结果，因此拒绝。Renderer 可以报告设备错误与资源状态，但这些不是玩法提交。

### 为动画另建完整世界模型

可以隔离 Core 与 Three.js，但会引入第二套平台关系、角色位置和状态机。v3 只允许有限的 `presentation` 参数与事件，不建立可独立演进的第二世界。

## 后果

- 相同 seed、输入序列和蓄力时长可以在无 WebGL 环境下重放并得到相同数值和碰撞结果。
- 表现层可以迭代形变、阴影、粒子和相机，而不重写物理测试。
- 每帧需要做快照到 View 的同步，并维护稳定 ID 注册表。
- 必须区分“逻辑阶段”和“表现阶段”；动画可以追赶最新快照，但不得阻止真相更新。

## 验收门禁

- 无 WebGL 的 Core 测试仍能覆盖数值、世界和碰撞。
- 渲染快照或调试快照可以验证角色根位置与 Core 轨迹一致。
- 变更 `worldRoot` 或 Camera 后，Core 平台坐标与玩家落点不变。
- 运行 Tween 或关闭特效时，同一输入的碰撞和数值结果不变。
- 上下文恢复或 Renderer 重建后，Scene 可从 Core 快照恢复，不需要从 Mesh 反向写入。
