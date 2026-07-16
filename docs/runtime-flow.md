# 运行主流程与生命周期

## 启动、恢复与组合

```text
Web / 微信 / 抖音入口
  → launchGame(createPlatform, { createGame })
  → @number-strategy/platform 创建宿主端口
  → compose-game.ts 绑定 Application + Renderer + Feedback + Storage
  → SaveRepository 读取/校验/迁移本地 SaveEnvelope
  → GameSession 选择 Difficulty / Gameplay / Task
  → ContentMenu 选择兼容玩法/任务/角色/画质，角色与画质预览交给 Renderer Port
  → 在首帧前按顺序重放动作；失败则清旧存档并新建会话
  → renderer.resize() / load()
  → 绑定 Input / Resize / Hide / Show，调度首帧
```

入口只负责平台选择和错误展示。`launch-game.ts` 用 WeakMap generation 协调同一 root：旧异步启动不能覆盖新实例，替换和停止会幂等销毁旧游戏；错误展示本身抛错也不会造成未处理拒绝。

## 输入、Command 与跳跃

```text
Platform Input
  → Renderer hitTest / 屏幕左右候选映射
  → CommandHandler 校验 Command
  → GameState 开始/释放/取消蓄力
  → Jump Engine 创建并采样解析轨迹
```

只允许一个活动 pointer。只有底部左右按钮产生 `start-charge`，场景点击不蓄力；释放必须属于同一 pointer。Web 平台阻止选择、上下文菜单、拖拽和相关长按手势。

## 固定步长与帧输出

```text
requestFrame
  → 统一读取 platform.now()
  → FixedStepClock 将 elapsed 限制在 0..100ms
  → 以 1000/60ms 分派 tick Command
  → 用 jump elapsed + accumulator 生成只读 RenderMotionProjection
  → EventCollector.drain()
  → SnapshotFactory.create()
  → FeedbackPort.handle(events)
  → RendererPort.render(snapshot, events)
  → 请求下一帧
```

Renderer 只读 `GameSnapshot/GameEvent`，不能持有或改写 `GameState/WorldState`。RenderMotionProjection 只补足固定步长之间的显示位置与翻转进度，碰撞、落点和回放仍使用 60 Hz 固定步长真相。反馈失败只进入诊断。连续 3 帧不可恢复错误进入显式 `failed` 生命周期并解绑输入。

Renderer 内部由 FrameCoordinator 固定执行 `world → character → effects → camera → hud → render`。各模块只接收当前帧上下文，不互相调用；场景、角色和特效通过版本/rendererKey 注册表创建。粒子与拖尾运行时复用构造期对象，更新方法禁止创建 Three 对象。落地标签、粒子和 HUD 动态纹理按帧错峰，平台标签使用预建 SpriteMaterial 池与启动期预上传纹理。

## 成功落地与存档事务

1. Jump Engine 计算脚底真实落点。
2. Application 预计算下一数值、步数和候选，并保存 Gameplay RNG 快照。
3. `WorldState.commitLanding` 提交可能失败的世界事务。
4. `GameState.resolveJump/useChoices` 提交数值状态；异常时恢复 RNG，避免半提交。
5. TaskDefinition 根据当前值、剩余步数和运算历史返回 active/completed/failed。
6. GameState 应用任务结果，产生 landed/task/won/lost 事件，Renderer 从下一帧快照表现镜头、HUD 和特效。
7. ReplayRecorder 只在命令成功接受后记录 jump/restart/next-round，并把完整新 Envelope 放入 SaveScheduler。
8. 首个成功 Renderer 帧只 arm pending；后续成功帧在 render 后写入。Hide/PageHide/Destroy 立即 flush。

失败落地不执行运算、不扣步数；存储写入失败不阻断当前会话。存档是确定性动作日志而不是可变对象图，因此恢复过程可校验、可迁移、可重放。

## 可扩展定义入口

`GameSession` 接受 GameplayRegistry、TaskRegistry、gameplayId 和 taskId，并在运行前验证定义版本、玩法支持的任务类型、配置和当前应用族的 Session 兼容性。新增同一跳跃应用族的玩法/任务通过注册与组合选择进入，不修改固定步长主循环；完全不同交互模型可新建 Application，但复用 Contracts、Persistence 和 Platform Port。

首次无存档启动会打开单 Canvas 内容菜单；已有存档直接恢复，玩家可用顶部菜单按钮再次进入。切换角色和画质立即预览，点击“开始游戏”后玩法、任务、角色和画质一起提交并清除旧回放，关闭菜单则回退到已应用角色与画质。

## 生命周期

| 事件 | 行为 |
|---|---|
| Hide | 取消活动蓄力，暂停，不推进固定步长。 |
| Show | rebase 时钟，不追赶后台时间；不自动解除玩家暂停。 |
| Resize | 调用 Renderer；失败记录诊断但不直接销毁会话。 |
| Restart | 清 pointer、重置会话、记录 replay、保存并 rebase。 |
| Next round | 新建下一轮，记录 replay 并保存。 |
| Destroy | 取消 RAF、逐项解绑、销毁 Renderer/Feedback；重复调用安全。 |

## 防护与证据

| 风险 | 防护 |
|---|---|
| 并发启动、旧异步覆盖 | generation、WeakMap 协调器、可控 Promise 测试。 |
| 重复 RAF、负数/巨量 delta | frameId、Command 校验、100ms 上限、rebase 测试。 |
| 多指和外来 release/cancel | activePointerId 归属测试。 |
| 落地半提交 | 世界先提交、玩法后提交、RNG 回滚测试。 |
| 损坏/旧/不兼容存档 | Envelope 校验、v1/v2/v3 fixture、迁移回写、失败清除与新会话测试。 |
| Renderer/Feedback/Storage/cleanup 抛错 | 边界捕获、诊断、继续清理或显式 failed。 |
| Renderer 篡改真相 | 只读快照、依赖方向和平台/Three 泄漏测试。 |
| 资源增长 | 有界历史、纹理 LRU/引用、粒子/拖尾上限、100 局资源 soak。 |

## 仍需真实宿主证据

- `NumberStrategyGame` 仍是当前跳跃应用族的 Application，不是所有交互模型的万能循环。
- 真实 Web `pagehide/pageshow/visibilitychange`、WebGL context lost/restored 和完整 GPU 重建仍需设备端到端验证。
- 微信/抖音 iOS 与 Android 的 WebGL2、音频、震动、安全区、前后台与存档恢复仍需真机证据。
