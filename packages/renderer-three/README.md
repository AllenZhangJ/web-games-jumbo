# @number-strategy/renderer-three

Three.js 单 Canvas Renderer。只消费 GameSnapshot/GameEvent，内部按 World、HUD、Camera、Resource 和 Context Lifecycle 分层，不决定玩法与碰撞。

新增渲染能力必须遵循以下内部边界：

- `frame` 定义每帧输入与 Layer 生命周期。
- `resources` 是 GPU/Canvas 资源所有权和预算的唯一内核。
- `hud`、`effects`、`scene`、`character`、`world` 只消费帧输入，不访问宿主 API。
- `diagnostics` 定义高/低画质预算和可观察指标。
- Facade/FrameCoordinator 可以组合低层模块，低层模块禁止反向依赖。

执行 `npm run check:render-architecture` 和 `npm run check:render-hot-path` 验证边界。FrameCoordinator 固定执行 `world → character → effects → camera → hud → render`；热路径 AST 守卫要求受检更新方法的 Three 对象分配为零。
