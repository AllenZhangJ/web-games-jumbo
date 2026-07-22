# ADR-020：小游戏产品 UI 使用单 WebGL Canvas 叠层，三端默认入口切换到 Product Session

- 状态：部分被 ADR-030 取代（第 4 节的灰盒生产回退构建）；其余已接受并实施（S8.5.5，G5.25 完成 strict workspace 归真）
- 日期：2026-07-18

## 背景

S8.5.4 已建立 `ProductRenderer` 和 Web 语义 DOM Surface，但 Web、微信和抖音默认入口仍是 Stage 6 灰盒。小游戏没有 DOM，且平台只保证一个可见主 Canvas；若在同一 Canvas 上再创建第二个 `THREE.WebGLRenderer`，会形成两个渲染器争用同一 WebGL context，导致清屏、context restore 和资源释放所有权不确定。

三端又必须共享相同的 Product ViewModel、Intent、奖励、Profile lease 和比赛所有权，不能为小游戏复制一套产品状态机，也不能让 Canvas 按钮直接调用 Controller。

## 决策

### 1. 产品场景模型保持无宿主

`createProductUiSceneModel(viewModel)` 只把公开 ViewModel 投影为标题、文案、角色卡、对手名、奖励和动作数据。它现位于 strict `@number-strategy-jump/arena-product-presentation`，不包含 Three、DOM、Canvas、平台 API 或资产 URL。

Web Surface 在 entry 侧把角色 ID 映射到已接受概念资产；Canvas Surface 使用同一场景模型进行程序化绘制。两者不得读取 Bot profile、隐藏难度、MatchCore 或 Profile Repository。

### 2. Canvas Surface 通过同一 WebGLRenderer 合成

小游戏 UI 的拥有关系为：

```text
ProductRenderer
  ├── ArenaGreyboxRenderer
  │    └── 唯一 THREE.WebGLRenderer
  └── ProductCanvasUiSurface
       ├── 平台离屏 2D Canvas
       ├── THREE.CanvasTexture
       └── 透明正交叠层 Scene
```

`ProductCanvasUiSurface.render(viewModel)` 只更新离屏纹理；`present(renderer)` 借用当前帧的 WebGLRenderer 绘制透明叠层。`ArenaGreyboxRenderer.renderComposite(matchFrame, overlay)` 是窄合成端口：有比赛帧时依次绘制世界、HUD、产品叠层；无比赛帧时清屏后只绘制产品叠层。Surface 不拥有、缓存或销毁 WebGLRenderer。

Canvas 内部继续拆成三个单向模块：`product-canvas-layout` 只计算安全区、卡片、按钮与命中矩形；`product-canvas-painter` 只把场景模型和布局绘制到注入的 2D context；`product-canvas-ui-surface` 只管理离屏 Canvas、CanvasTexture、输入坐标换算和资源生命周期。Painter 不知道 Three、平台或 Product Controller。

G5.25 后，layout/painter 位于宿主无关 `@number-strategy-jump/arena-product-presentation`，Surface 位于窄适配包 `@number-strategy-jump/arena-product-presentation-three`；通用 `arena-presentation-three` 不反向依赖 Product。Surface 构造期快照 Canvas 能力，使用 SceneModel 身份与 viewport revision 避免重复序列化，并通过通用 Three 资源租约保留部分清理失败的精确重试所有权。

Web DOM Surface 也实现无操作的 `present()`，因此 `ProductRenderer` 对所有宿主只有一套组合流程。

### 3. Canvas 命中仍进入统一 ProductInputRouter

Canvas layout 使用平台 viewport 与 safe area 生成只读矩形；`hitTestUi` 把主 Canvas buffer 坐标映射回布局坐标并只返回公开 intent。触摸开始和结束必须命中同一 intent，之后仍由 `ProductInputRouter → ProductPresentationFlow → ProductSessionIntentDispatcher` 串行处理。

Canvas Surface 的 `bindIntent()` 只承担显式生命周期合同，不另绑平台事件；平台触摸监听只有 `PointerInputAdapter` 一个拥有者。DOM Surface 保持事件委托，但也进入同一 dispatcher。

### 4. 三端默认入口与回退入口显式分离

本节中的灰盒生产构建开关属于 S8.5.5 历史决策，已被 [ADR-030](030-arena-only-enterprise-governance.md) 取代。现行 `npm run build` 只生成 Arena Product 的 Web/微信/抖音产物，manifest `defaultEntry` 固定为 `product`；仓库不存在 `build:greybox` 或 `ARENA_MINI_ENTRY_MODE` 生产开关。灰盒源入口当前仅用于迁移期架构回归，不能被当作发行产物。

- Web `/` 使用 Product Session + DOM Surface；`product.html` 作为旧验收链接跳转到 `/`。
- Web `/greybox.html` 使用独立 `web-greybox.js`，可直接执行旧 `ArenaPresentationSession`。
- 微信、抖音 `game.js` 默认来自 Product entry + Canvas Surface。
- 每个小游戏发行包只保留当前选择的 `game.js`，避免正式角色资产接入后仍重复交付两份未启用入口。
- （已取代）`npm run build` 生成 Product 发行包；曾规划用独立 `build:greybox` 生成紧急回退包。
- （已取代）曾规划用 `ARENA_MINI_ENTRY_MODE=greybox` 在构建期选择小游戏入口。

回退是构建期选择，不在运行时同时打入两套 Session 所有权根，也不让线上全局变量静默改变入口。

### 5. 生命周期与失败策略

- Renderer、Surface 候选在合同校验前先登记所有权；构造失败会回收已创建候选。
- Surface 独立拥有 CanvasTexture、材质、几何和叠层 Scene；部分销毁失败由上层保留句柄并重试。
- G5.25 起 Surface 自身以 `dispose-incomplete` 和 Three 资源租约记录未完成清理，上层保留 Surface 句柄并再次调用 `dispose()`；已完成资源不重复释放。
- context restore 后 Session 统一 resize，Canvas 纹理重新标记上传。
- hide/show 暂停输入和权威 tick，不补跑后台墙钟。
- destroy 解绑触摸、resize、show/hide、DOM intent 和 Profile lease；重复调用幂等。

## 被否决方案

### 为产品 UI 创建第二个 THREE.WebGLRenderer

同一主 Canvas 上两个 Renderer 会争用 context、清屏和 context loss；小游戏平台也不保证第二个可见 Canvas。

### 微信和抖音各复制一套 Canvas 菜单

会复制布局、命中、文案和状态分支，后续必然产生平台行为漂移。平台差异应停留在 `Platform` 的离屏 Canvas、触摸和安全区适配。

### Canvas 按钮直接调用 ProductController

会绕过 intent 串行、自动奖励、错误恢复和重复点击防护，形成第二条产品写入路径。

### 运行时全量打包 Product 与灰盒并通过全局变量选择

会增加首包、初始化分支和被误触发的隐藏模式。构建期双产物既能快速回退，又保持线上 `game.js` 只有一个入口所有权根。

## 后果

正面：

- 三端共享 Product Session、ViewModel、Intent 和比赛所有权。
- 小游戏产品菜单、比赛和 HUD 使用一个 WebGLRenderer、一个主 Canvas。
- safe area、buffer/CSS 坐标换算和触摸生命周期有独立纯布局与宿主组合测试。
- 默认入口切换可通过可执行页面或构建变量立即回退，不需修改权威层。

代价：

- Canvas Surface 只负责 Product UI；比赛世界当前优先加载 Stage 7 正式 GLB/动画，程序化角色仅作为资源失败回退，二者都不改变 Canvas Surface 的输入与生命周期边界。
- Web 继续用 DOM 获得完整语义；小游戏无障碍只能依赖平台后续可用的替代文本能力。
- 微信/抖音开发者工具与真机最终截图、内存和前后台证据仍属于 S8.5.6。

## 证据

- Product Canvas 单测覆盖 safe area、最小触控高度、buffer 坐标映射、场景显隐、叠层渲染和幂等销毁。
- 小游戏宿主组合测试覆盖真实 MiniGame Platform、Product Session、Canvas Surface、触控 intent、hide/show、监听解绑和 lease 释放。
- 架构测试确认默认小游戏 bundle 包含 Product Session/Canvas Surface、不导入 Web；灰盒 bundle 独立包含旧 Session。
- strict 故障测试覆盖宿主 getter 零执行、方法快照、坏 resize 原子拒绝、吞异常重入失败关闭与 Three 资源清理精确重试。
- Web 真实浏览器覆盖默认入口、角色切换、1v1、奖励、重赛、移动端、旧产品链接和灰盒回退，控制台无警告/错误。
- 完整记录见 [S8.5.5 结果](../research/arena-stage8-canvas-product-entry-results.md)。
