# 渲染性能治理路线图

本路线图是既有 P0–P10 项目治理完成后的专项治理，不改写 `governance-b0` 至 `governance-b4` 的历史。

## 已确认基线

- 必验 Web 设备：iPhone 13 Pro、iOS 26、Chrome。
- 用户可选画质：高、低。
- 低画质可减少阴影、粒子、拖尾，不改变玩法、碰撞、任务和 HUD 可读性。
- 存档在动作后的下一渲染帧异步写入，生命周期结束前强制刷新。
- 分支：`feature/render-performance-governance`。
- 标签：`render-governance-b1` 至 `render-governance-b4`。

## 第一批：基线、契约与守卫

- 固化 59,536,000 bytes 内容菜单纹理基线和设备验收信息。
- 建立 RenderFrame、RenderLayer、EffectRuntime、RenderResourceScope 和两档预算。
- 新增依赖守卫与热路径分配基线守卫。
- 接受 ADR-006。

## 第二批：资源内核与 HUD

- TextureManager 改为字节预算、引用安全 LRU 和可观察统计。
- 内容菜单改为单一可重绘 DynamicCanvasTexture。
- 预热起跳必需的顶部、状态和控制纹理。
- 加入全内容遍历、首跳纹理零新增和资源释放测试。
- 完成 iPhone Web 第一轮验收准备。

## 第三批：帧协调、场景、角色和特效

- Renderer3D 收敛为 Facade，FrameCoordinator 统一更新顺序。
- Scene、Character、Effect 通过注册表接入。
- TailTrail 和 ParticleBurst 使用预分配池，热路径 Three 对象分配归零。
- 新增扩展夹具、生命周期和 100 局稳定性守卫。

## 第四批：调度、画质与生产门禁

- 引入 SaveScheduler，将同步存储移出释放/起跳关键帧。
- 用户可在单 Canvas 内容菜单选择高/低画质并持久化。
- 两档控制 DPR、阴影、粒子和拖尾预算；切档不改变领域状态。
- 加入帧指标、自动化性能门禁、三端构建和平台验收矩阵。
- 完成最终文档校准、标签、合并准备和局域网真机验收。
