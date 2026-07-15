# 运行主流程与生命周期

本文描述第 0 批基线代码的实际执行链路，并记录当前已有防护和仍缺少的证据。

## 启动流程

```text
平台入口
  → launchGame(createPlatform)
  → generation +1，销毁旧实例/过期启动
  → createPlatform()
  → new NumberStrategyGame(platform)
  → renderer.resize()
  → renderer.load()
  → 绑定输入、resize、onHide、onShow
  → 调度首帧
```

`launch-game.js` 使用共享 Symbol 保存 generation、当前实例和正在启动的实例。新启动不会等待旧异步加载完成，而是立即使旧 generation 失效并销毁旧对象。

## 输入与蓄力

```text
pointer/touch start
  → Platform 归一化坐标和 pointerId
  → Renderer HUD 命中按钮
  → 根据相机投影选择屏幕左/右候选
  → GameState.startCharge(choiceIndex)
  → 保存 chargeStartedAt

pointer/touch end
  → 校验同一 pointerId
  → 用 platform.now() 计算真实按住时长
  → 创建 JumpTrajectory
  → GameState.releaseCharge()
```

当前只允许一个活动 pointer。外来 pointer 的 end/cancel 不会提交当前蓄力。Web 还会阻止上下文菜单、选择和拖拽默认行为。

## 固定步长主循环

Runtime 不相信不同小游戏宿主传入的 RAF 时间戳，而统一读取 `platform.now()`：

```text
requestFrame
  → elapsed 限制在 0..100ms
  → accumulator += elapsed
  → 每 1000/60ms 更新一次 Core
  → Renderer.draw(state, world, presentation)
  → 请求下一帧
```

单帧异常会记录诊断并继续调度。连续 3 帧失败后，Runtime 进入 `failed`，取消蓄力并解绑输入，避免无提示地停止在半交互状态。

## 跳跃和落地事务

跳跃期间每个固定步长采样解析轨迹并写入玩家真实世界位置。轨迹完成后：

### 成功落地

1. `resolveTopLanding` 计算精确落点。
2. 预计算下一数值、剩余步数和下一候选。
3. `WorldState.commitLanding` 先提交可能失败的世界事务。
4. `GameState.resolveJump` 提交数值结果。
5. `GameState.useChoices` 替换下一候选。
6. Renderer 在后续帧读取新快照，执行可丢弃的镜头和世界平移。

候选生成或世界提交异常时会恢复 GameState RNG 快照，避免世界与数值层一边成功、一边失败。

### 失败落地

- 不执行候选运算。
- 不扣除步数。
- 保存失败落点和原因。
- 玩家失去支撑平台，表现层显示失败姿态。

## Web/小游戏生命周期

### Hide

- 如果正在蓄力，强制取消当前蓄力。
- 如果未暂停，切换到暂停状态。
- 固定步长更新在暂停期间不推进。

### Show

- 清空 `lastTime` 和 accumulator。
- 下一帧重新建立时间基线，不追赶后台停留时间。
- 当前实现不会自动解除暂停，恢复需要用户明确操作。

### Resize

- 调用 Renderer.resize。
- resize 失败会记录错误，但不会立即销毁整个游戏。

### Destroy

- 标记 lifecycle 为 destroyed。
- 清理活动 pointer。
- 取消已调度帧。
- 容错执行全部事件解绑。
- 销毁 Renderer 和 GPU/Canvas 资源。

## 当前已有竞态与兜底

| 风险 | 当前防护 |
|---|---|
| 多次启动互相覆盖 | generation 使旧启动失效并销毁。 |
| start 重入 | 同一 `startPromise` 复用。 |
| 重复帧调度 | `frameId != null` 时拒绝再次调度。 |
| 销毁后异步加载完成 | 启动流程再次检查 lifecycle。 |
| 外来 pointer 结束当前输入 | 使用 activePointerId 归属。 |
| 后台时间导致巨量追帧 | show 时重置时钟；单帧 delta 上限 100ms。 |
| 单帧渲染错误杀死循环 | finally 中继续调度；连续失败后显式 failed。 |
| 落地候选生成半提交 | RNG 快照恢复和先世界后状态事务。 |
| 单个 cleanup 抛错阻止其他清理 | 逐项 try/catch。 |

## 当前仍不完整或待验证

- Renderer 参与“屏幕左右候选”的选择映射，应用层仍依赖具体表现能力。
- Runtime 同时承担输入、用例、固定时钟、事务和表现编排，职责过多。
- WebGL 上下文恢复没有完整重建 Renderer、纹理、Mesh 和缓存的自动化证据。
- 微信/抖音真实宿主的 RAF、前后台、WebGL 恢复和音频策略仍需真机证明。
- 页面隐藏/显示有单元测试，但尚无自动化浏览器生命周期测试。
- 平台存储、声音和震动存在能力接口，但尚未接入游戏主流程。
- 当前没有存档版本、回放或跨版本迁移。

这些项目必须保留为“未完成/待验证”，不得因现有 87 项测试通过而改写成已完成。
