# Arena Product Presentation Three

该 strict TypeScript workspace 只承接 Product UI 到 Three.js/Canvas 宿主的窄适配。它消费 `arena-product-presentation` 的冻结 SceneModel、Layout 与 Painter，并复用 `arena-presentation-three` 的资源租约；通用 Three 包不反向依赖 Product。

边界约束：

- 只拥有 Product 离屏 Canvas、2D context 端口、CanvasTexture、正交 Scene/Camera/Quad 与其清理租约。
- 构造期快照平台和 Canvas 方法；绘制热路径不重复反射宿主能力，不使用 DOM、墙钟、随机、网络或游戏权威写口。
- ViewModel、布局和命中结果均来自宿主无关 Product 表现包；Surface 不拥有 Controller、Match、Profile 或 Renderer。
- 初始化、绘制和 resize 的宿主失败会失败关闭；Three 资源清理失败保留精确重试所有权，完成后 dispose 幂等。
- DPR/纹理上限沿用既有产品值，不以降低分辨率、抗锯齿、动作或关节换取性能。
