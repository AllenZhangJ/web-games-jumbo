# 第三批：帧协调与扩展模块验证

验证日期：2026-07-15

## 结构事实

- `facade`：Renderer3D 和 WebGL Context 生命周期。
- `frame`：RenderFrame/RenderLayer 契约与 FrameCoordinator。
- `resources`：纹理、通用 dispose 和 RenderResourceScope。
- `scene`：Stage、Camera、Lighting 和 SceneRendererRegistry。
- `character`：CharacterRig 和 CharacterRendererRegistry。
- `world`：PlatformMeshFactory 和 PlatformViewRegistry。
- `effects`：EffectRegistry、CoreEffectsRuntime、ParticleBurst、TailTrail。
- `hud`、`diagnostics`：单 Canvas HUD 与性能/画质预算。

低层模块允许的依赖矩阵由 `check-render-architecture.ts` 强制执行。新增场景、角色和特效使用注册表；Application 和 FrameCoordinator 不增加 ID 条件分支。

## 自动化证据

- FrameCoordinator 顺序测试和重复 ID 拒绝测试通过。
- EffectRegistry 缺失/注册/创建测试通过；低画质容量由 profile 注入。
- ParticleBurst 只维护活动前缀，不再空闲时上传 72 个实例矩阵。
- TailTrail 使用构造时预分配 Vector3 数组，更新路径不再创建 Vector3。
- TypeScript AST 守卫确认受检更新方法中的 `new THREE.*` 数量为 0。
- 100 轮低画质特效 soak：场景始终两个固定特效节点，每轮粒子归零，最终 dispose 后节点归零。
- 完整门禁：25 个测试文件、155 项测试通过；三端构建和包体预算通过。

## 390×844 浏览器证据

| 检查 | 结果 |
|---|---|
| 页面身份、非空首屏、错误层 | 通过 |
| 帧顺序 | `world → character → effects → camera → hud → render` |
| 输入主流程 | `ready → charging → jumping` 通过 |
| 特效运行时 | `three-core-effects`，起跳观测到 2 个拖尾点 |
| 起跳纹理创建 | 松开前后不增长 |
| 错误 | Runtime error 0；console warn/error 0 |

本批只迁移和池化现有效果，没有增加新场景、角色或视觉特效，也没有改变跳跃、数值、任务、碰撞和世界状态。
