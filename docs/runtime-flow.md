# 运行主流程与生命周期

本文描述第二批 P3–P5 当前可验证的单向运行链路。

## 启动与组合

```text
Web / 微信 / 抖音入口
  → launchGame(createPlatform, { createGame })
  → createPlatform()
  → compose-game.js 绑定 NumberStrategyGame + Renderer3D
  → GameSession 选择 Difficulty / Gameplay / Task
  → renderer.resize() / load()
  → 绑定 Input / Resize / Hide / Show
  → FixedStepClock rebase，调度首帧
```

入口只负责平台选择和错误展示，`launch-game.js` 不知道具体游戏类。generation 会使过期异步启动失效并销毁旧实例；同一游戏的重复 `start()` 复用 Promise。

## 输入、Command 与跳跃

```text
Platform Input
  → Renderer hitTest / 屏幕左右候选映射
  → CommandHandler 校验 Command
  → GameState 开始/释放/取消蓄力
  → Jump Engine 创建并采样解析轨迹
```

只允许一个活动 pointer。只有底部左右按钮产生 `start-charge`；场景点击不开始蓄力。释放必须属于同一 pointer。Web 继续阻止选择、上下文菜单和拖拽默认行为。

## 固定步长与帧输出

```text
requestFrame
  → 统一读取 platform.now()
  → FixedStepClock 将 elapsed 限制在 0..100ms
  → 以 1000/60ms 分派 tick Command
  → EventCollector.drain()
  → SnapshotFactory.create()
  → FeedbackPort.handle(events)
  → RendererPort.render(snapshot, events)
  → 请求下一帧
```

快照携带真实 `gameplayId`、`taskId`、难度版本、规则状态、世界快照和表现状态。Renderer 不能持有或改写 GameState/WorldState。Feedback 异常会被记录但不阻断绘制；连续 3 帧不可恢复错误会进入明确的 `failed` 生命周期并解绑输入。

## 成功落地事务

1. Jump Engine 计算脚底真实落点。
2. Application 预计算下一数值、步数和候选，保存 Gameplay RNG 快照。
3. `WorldState.commitLanding` 提交可能失败的世界事务。
4. `GameState.resolveJump` 与 `useChoices` 提交数值状态。
5. 产生 `landed`，落地阶段完成后评估当前 Task。
6. 产生 `task-completed`/`task-failed` 及既有 `won`/`lost` 事件。
7. Renderer 在下一帧从快照和事件执行镜头、HUD 和特效。

候选生成或世界提交异常时恢复 RNG，避免世界与数值真相半提交。失败落地不执行运算、不扣步数，并保留失败落点与原因。

## 可扩展定义的运行入口

`GameSession` 接受 GameplayRegistry、TaskRegistry、gameplayId 和 taskId。它在运行前验证：

- 定义和版本存在。
- Gameplay 声明支持所选 Task。
- Gameplay/Task 配置通过验证。
- 当前跳跃应用族返回兼容 GameState。

因此新增同一跳跃应用族的玩法/任务可通过组合根注册选择，不修改主循环。完全不同交互模型仍可能需要新的 Application 实现，但继续复用 Command/Event/Snapshot/Port 契约。

## 生命周期

| 事件 | 当前行为 |
|---|---|
| Hide | 取消活动蓄力，进入暂停，不推进固定步长。 |
| Show | rebase 时钟，下一帧重新建立时间原点，不追赶后台时间；不自动解除暂停。 |
| Resize | 调用 Renderer，失败被记录但不直接销毁会话。 |
| Restart | 清 pointer、重置状态/世界/任务、rebase 时钟并发事件。 |
| Destroy | 终结生命周期、取消 RAF、逐项解绑、销毁 Renderer/Feedback、清事件；重复调用安全。 |

## 已有防护

| 风险 | 防护与证据 |
|---|---|
| 并发启动、旧异步覆盖 | generation、启动后生命周期复查和入口测试。 |
| 重复 RAF、负数/巨量 delta | frameId 门禁、Command 校验、100ms 上限、rebase 测试。 |
| 多指和外来 release/cancel | activePointerId 归属测试。 |
| Renderer/Feedback/cleanup 抛错 | 分层捕获、诊断记录、继续清理或显式 failed。 |
| 落地半提交 | 世界先提交、玩法后提交、RNG 回滚测试。 |
| Renderer 篡改真相 | 只读快照、包依赖边界和平台/Three 泄漏测试。 |
| 错误玩法/任务组合 | 注册表、支持列表与配置边界校验。 |

## 仍未完成或证据不足

- `NumberStrategyGame` 仍拥有当前跳跃应用族的输入映射与事务，这是有意的 Application 内聚，不是通用所有玩法的万能循环。
- Renderer 内部拆分、场景/角色 Manifest、资源恢复和 FeedbackController 属于第三批。
- Storage 已是端口但尚无 SaveEnvelope、迁移和回放，属于第四批。
- pagehide/pageshow、真实 WebGL context lost/restored 和微信/抖音真机生命周期仍缺少当前批次端到端证据。
- 测试还没有覆盖率阈值；过渡测试 tsconfig 尚未 strict。
