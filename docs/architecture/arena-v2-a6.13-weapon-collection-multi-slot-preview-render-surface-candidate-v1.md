# Arena V2 A6.13 武器收藏多槽 Three 正式预览渲染面 Candidate V1

## 状态

- `production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- `defaultSurfaceWired=false`；未修改 index、package、manifest 或默认收藏入口。
- 本批只新增 renderer-neutral 输入边界上的 Three 渲染 Surface，不代表浏览器、设备、画质、性能或资源预算通过。
- 当前生产批准账本允许的A6.9 mount数为0，因此该Surface当前没有合法武器帧输入；其多槽绘制能力只为未来新账本版本+独立gate保留，不能由伪造mount启用。

## 所有权与依赖

- Surface 构造时接收一个 descriptor-safe `RendererPort` 并成为其唯一生命周期 Owner；没有第二 renderer、canvas/context 出口或全局 Manager。
- 所有权建立时同步调用 `setScissorTest(false)` 归一未知 renderer 初态；若归一失败则尽力反向 `dispose`，两者同时失败保留聚合错误。因此每个正式帧的 whole-canvas clear 不依赖注入端口的隐式默认状态。
- 输入只消费 A6.9 已创建且仍 active 的 `ArenaV2A6WeaponPreviewThreeMountV1`：使用其 `previewGroup`、`camera`、矩形和 `entryTurnPlan`。
- Surface 不读取 A6.6、不加载 GLB、不创建或销毁 mount、不接 DOM、不生成 Three 资源，也不参与命中、位移、随机、胜负或 Profile 事实。
- frame/snapshot 使用 A6.8 四页 screen identity。weapon-index/detail 分别允许最多 20/1 个正式 mount；map-index/detail 强制 `mounts=[]`，但仍执行 clear→scissor enable/disable，以清除从武器页切换后遗留的 Three 像素。地图页不得伪装成 weapon screen，也不生成地图 Three 预览。

## 帧预检与可见策略

- 每帧输入为 exact-key plain data：epoch、整数 tick、固定 `390x844`/`1440x900` viewport、`0.5..2` pixel ratio、weapon-index/weapon-detail、content clip 与最多 20 个 A6.9 mounts。
- 在任何 renderer side effect 前完整验证：稠密数组、唯一 mount/definition/asset/lease/request/group/camera identity、mount epoch/screen/viewport、A6.9 ownership/framing/entry-turn、modelClone 仍归属 previewGroup，以及全帧 catalog/binding identity。
- 延续 A6.12a 的 `entire-preview-rect-inside-content-clip` 策略。clipped/outside mount 一律在绘制前拒绝，不把“交集绘制”解释成扩大可见集合；通过后的交集与原 preview rect 精确相同。
- CSS 顶左坐标转换为 WebGL 左下坐标：`webglY = viewportHeight - cssY - height`。renderer 已通过 `setPixelRatio` 管理 drawing buffer，因此 viewport/scissor 使用 CSS 像素合同。

## 同步渲染顺序与确定性

- 调用顺序固定为：变化时 `setPixelRatio`/`setSize(..., false)` → `clear` 整个画布 → `setScissorTest(true)` → 每槽 `setViewport`/`setScissor`/`clearDepth`/`render` → finally `setScissorTest(false)`。
- renderer 所有方法必须同步；native Promise、普通 hostile thenable、accessor method 或被吞掉的回调重入均失败关闭。
- 同 tick、同 canonical frame、同 mount/group/camera 引用精确重放返回同一 snapshot，不重复 renderer side effect；同 tick 冲突和 tick 回退在 side effect 前拒绝。
- entry yaw 只由 mount tick、frame tick、reduced-motion 与 A6.9 静态 `entryTurnPlan` 线性计算。每次 render 前设置确定 yaw，finally 恢复原 yaw；没有墙钟、RAF、自动旋转或累积漂移。

## 失败与销毁

- 输入合同错误保留 active 状态和上一 snapshot。任何 resize/clear/scissor/slot render/yaw restore side effect 失败后 Surface sticky failed，不能继续半可用绘制。
- 渲染中即使失败也尝试关闭 scissor；snapshot 只保留纯数据的当前帧诊断或失败阶段，不保存 Three handle 历史。
- `destroy()` 尝试关闭 scissor 后 dispose renderer；分别持久记录 `scissorDisabled` 与 `rendererDisposed`，任一失败返回 `dispose-incomplete`，后续只重试尚未完成的步骤。成功后的重复 destroy 返回同一结果，不二次 dispose，也不调用 force-context-loss。

## 延后验证

测试代码已覆盖坐标转换、20槽、detail单槽、weapon→map 空帧清屏、地图页夹带mount零副作用拒绝、同tick幂等、预检零副作用、调用顺序、yaw恢复、reduced-motion、重入、sticky failure 与 dispose retry，但本轮按开发优先要求全部未运行。typecheck、lint、build、diff-check、浏览器、性能和设备验证均顺延。
