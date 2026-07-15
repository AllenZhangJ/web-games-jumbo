# v3 技术架构

## 文档状态

本文档记录 v3 重构的目标架构和不可破坏的边界。它不是真机通过报告：即使 Node 测试、Web 预览和三端构建都成功，微信与抖音 iOS/Android 的 WebGL2 上下文、阴影、安全区、触摸、前后台和性能仍需使用最终构建产物验收。

## 目标与非目标

v3 的目标是保留已经可验证的玩法内核，将 Canvas 2D 伪 3D 表现重建为真实 Three.js 三维场景：

- 保留数值运算、目标、候选分支、步数和胜负规则。
- 保留平台 ID、历史/当前/候选关系、玩家真实世界位置。
- 保留蓄力到射程、解析轨迹、矩形顶面碰撞和偏心落点。
- 保留 Web、微信、抖音的画布、输入、帧循环、生命周期、存储和震动适配。
- 引入真实 Mesh、正交相机、统一光照/阴影、蓄力形变、回弹、空翻、拖尾、粒子和失败倾倒。

非目标：

- 不把 `web-jump` 的单路线随机跳台替换为本项目的玩法真相。
- 不让 Tween、Mesh 或视觉吸附决定落地结果。
- 不回退到参考项目的 Webpack、旧 `Geometry` API 或直接 DOM 输入架构。
- 不为 Web 单独增加 DOM HUD，从而造成与小游戏不同的两套表现逻辑。

## 视觉系统约束

三维表现以 [`public/assets/concept/web-jump-three-v3.png`](../public/assets/concept/web-jump-three-v3.png) 为构图与材质基线，详细令牌、正交构图、`1 个当前 + 2 个候选 + 1 个历史` 层级、极简 HUD 和动作语言见 [design-system-v3.md](design-system-v3.md)。

权威主题色为背景 `#D8DDE2`、角色红 `#E53935`、选中青 `#16A6A1` 与文字 `#263238`。旧狐狸精灵、城市背景/前景、节拍轨和常驻底部轨道不属于 v3 表现层。概念图仅作为设计参考，不作为运行时背景贴图。

## 总体链路

```text
Web / 微信 / 抖音输入、画布与生命周期
                       │
                Platform Contract
                       │
        Application / 固定步长编排
                 ┌─────┴─────┐
                 │           │
     Gameplay 数值       Jump Engine 世界/碰撞
                 │
        只读逻辑快照 + 表现事件
                 │
              Renderer3D 外观
                 │
        ┌────────┴────────┐
        │                 │
  Three.js World Scene   Three.js HUD Scene
        └────────┬────────┘
                 │
        同一上屏 WebGL2 Canvas
```

依赖只能沿图中方向流动。`packages/renderer-three` 可以读取快照，不能持有并修改 `GameState` 或 `WorldState`。

## 真相层与坐标

### Gameplay 与 Jump Engine 是唯一领域真相

`packages/gameplay` 与 `packages/jump-engine` 对以下结果拥有唯一决定权：

- 当前值、目标值、剩余步数、左右运算候选与胜负。
- 平台 ID、尺寸、绝对世界坐标、历史/当前/候选状态。
- 玩家真实 `x/y/z` 位置、蓄力、水平射程和抛物线轨迹。
- 落点是否位于目标平台顶面，以及是短跳、成功还是越过。
- 成功后的数值提交、平台晋升、未选分支淘汰和下一对候选生成。

这些模块已迁移为 strict TypeScript，并可在无 WebGL 环境独立测试；不得访问 Three.js、DOM、`tt.*` 或 `wx.*`。

### 三类坐标不混用

1. **核心世界坐标**：平台和玩家的绝对 `x/y/z`，是物理和碰撞依据。
2. **场景表现坐标**：Mesh 由核心世界坐标投影到 Three.js 场景；`worldRoot` 可为构图整体平移，但不反写核心坐标。
3. **HUD/命中坐标**：顶部信息与底部箭头分别锚定安全区；`Renderer3D.hitTest(rawPoint)` 将平台输入转换为 HUD 屏幕坐标，世界区域不会回退成选路热区。

成功落地后只校正脚底高度，不将 `x/z` 吸附到平台中心。

## 模块责任

### `packages/application`

Application 是唯一编排者：

- 将平台输入转为锁定候选、蓄力、起跳、暂停、继续和重开。
- 以固定步长更新解析轨迹并让 Gameplay/Jump Engine 提交碰撞结果。
- 将领域状态组装为每帧只读快照和一次性事件。
- 只有 Application/Domain 可以推进游戏状态；Renderer 的异步加载或动画不能阻塞或篡改逻辑结果。

### `packages/renderer-three`

`Renderer3D` 是 Application 能看到的唯一三维渲染外观。当前接口：

```text
constructor(canvas, platform, rendererOptions)
load()
resize()
toDesignPoint(rawPoint)
hitTest(rawPoint)
render(snapshot, events)
selectCharacter(characterId)
getDebugSnapshot()
dispose() / destroy()
```

Application 不得直接操作内部 Scene、Camera、Mesh、Material 或 Tween。

| 模块 | 责任 |
|---|---|
| `renderer3d.ts` | 初始化、快照/事件入口、两个 Scene 的渲染顺序、内容选择、诊断和销毁。 |
| `stage.ts` | 世界 Scene、地面和 SceneDefinition。 |
| `context-lifecycle.ts` | 上下文丢失/恢复监听和幂等解绑。 |
| `camera-rig.ts` | 正交相机、长屏/宽屏构图，以及与世界原点共享进度的连续世界跟随。 |
| `lighting-rig.ts` | SceneDefinition 驱动的环境光、方向光和受限阴影。 |
| `platform-mesh-factory.ts` | 以现代 `BufferGeometry` 创建 Cube/Cylinder/原创特殊平台。 |
| `platform-view-registry.ts` | 维护稳定的平台 ID→Mesh 映射，负责新建、晋升、淘汰、回收与 dispose。 |
| `character-rig.ts` | CharacterDefinition 驱动的几何层级与局部形变；根节点位置只来自领域轨迹。 |
| `effects/*` | 拖尾、粒子和失败附加动画；使用可回收对象且不决定碰撞。 |
| `hud/hud-scene.ts` | 当前值、目标、步数、安全区底部左右箭头、暂停/重开与结算覆盖层。 |

### `packages/platform`

平台层继续是平台 API 的唯一归属，并向三维层提供可验证的能力：

- `createCanvas()` 创建唯一上屏画布。
- `createOffscreenCanvas(width, height)` 仅用于离屏资源生成；离屏画布不属于第二个上屏 Canvas。
- `getWebGLContext(canvas, attributes)` 只请求/校验 `webgl2`；创建失败时应抛出包含平台 ID 的明确错误，不得默默继续黑屏。
- 输入、`requestAnimationFrame`、安全区/DPR、前后台、震动和存储继续经由平台契约。

Web 适配器可使用原生 `OffscreenCanvas`，缺失时回退到非上屏 DOM Canvas。小游戏适配器优先使用对应 API 的离屏画布能力，并隔离微信与抖音签名差异。

## 单 Canvas 渲染管线

v3 只创建一个上屏 WebGL2 Canvas：

1. 更新相机、平台注册表、角色 Rig 和特效池。
2. 渲染世界 Scene，包含平台、角色、地面、光照和阴影。
3. 清理深度缓冲，不清理已渲染的颜色。
4. 渲染 HUD Scene，保证固定屏幕信息不受世界相机和遮挡影响。

这个管线在 Web、微信和抖音之间共用，不存在 Web DOM HUD 和小游戏 WebGL HUD 的差异实现。

## 核心与表现的单向同步

### 快照同步

每帧 `render(snapshot, events)` 只允许只读状态/世界/表现快照与一次性事件：

- `state`：数值、回合、步数、阶段和胜负。
- `world`：平台快照、稳定 ID 和玩家绝对位置。
- `presentation`：蓄力比例、选中分支、跳跃姿态、一次性事件和不影响结果的视觉进度。
- `presentation.contentMenu`：兼容玩法/任务/角色的只读选择快照；Renderer 只负责绘制与命中测试，Application 提交选择。

`platform-view-registry` 以稳定平台 ID 同步 Mesh，不以对象数组下标猜测身份。缺失的 ID 创建 View，仍然存在的 ID 更新位置/状态，从快照移除的 ID 退场并回收。

### 动画不改变结果

- 蓄力时身体变矮变宽、平台受压，但碰撞顶面尺寸不因 Mesh scale 改变。
- 空翻是角色 Rig 局部旋转；角色根节点仍严格采样 Core 轨迹。
- 拖尾、粒子、平台弹性和失败倾倒只消费已经确定的事件。
- 即使表现层丢帧或 Tween 尚未结束，相同 seed 和蓄力时长仍必须得到相同落点与碰撞结果。

## 连续世界事务

一次成功落地的逻辑提交顺序保持为：

1. 物理层计算所选平台顶面的精确碰撞点。
2. 数值状态执行绑定运算并扣除一步。
3. 旧当前平台转为历史平台。
4. 被选候选保持 ID 并晋升为当前平台。
5. 玩家位置保存为精确碰撞点，不吸附中心。
6. 未选择分支被淘汰。
7. 以新当前平台中心生成下一对候选。
8. Renderer 读取新快照，先保留落地确认，再用同一显式进度平移 `worldRoot` 与相机焦点完成连续构图。

第 8 步是可丢弃的表现动画，不属于前 7 步的逻辑事务。

## WebGL2 与上下文生命周期

- v3 使用现代 Three.js `WebGLRenderer`，以可创建 `webgl2` 上下文为运行前提。
- 初始化失败必须显示/上报可诊断错误，不能仅留黑屏。
- 窗口尺寸、DPR 和安全区变化由 `resize()` 统一提交到 Renderer、相机与 HUD。
- 上下文丢失时跳过渲染；当前恢复处理会重置渲染时间、刷新阴影并从后续快照继续同步，不从 Mesh 恢复玩法状态。完整 GPU 资源重建仍是待验证/待补强项。
- 微信/抖音的上下文丢失事件支持程度必须真机测量；在此之前不宣称恢复流程已通过。

## 性能与资源边界

渲染性能专项采用 [ADR-006](decisions/006-render-performance-modular-monolith.md)：Renderer 保持单一 private workspace，在包内以 RenderFrame、RenderResourceScope、EffectRuntime 和显式高/低预算建立边界。专项当前状态见 [渲染性能治理](governance/render-performance/status.md)。

- 平台数量保持有界：当前、两个候选和有限历史；未选分支退场后回收。
- Mesh、Geometry、Material、Texture 和粒子/拖尾节点必须复用或在移除时显式 `dispose()`。
- 阴影只覆盖当前游戏区域，只为必要对象开启投射/接收；阴影质量可按设备降级。
- 不启用后处理拖尾；使用轻量几何与对象池。
- 三端生产构建继续使用 esbuild/Vite 路径，不引入参考项目的 Webpack 构建。

目标帧率、draw calls、三角形、GPU 内存和包体属于验收指标，只有真实采样后才能勾选，不在架构文档中预填结果。

## 验证边界

### 自动化必须覆盖

- 数值运算、候选生成、目标命中与步数。
- 蓄力/射程互逆、边缘落点、短跳、成功和越过。
- 平台 ID 晋升、历史上限、未选分支移除和偏心位置保留。
- 平台 View 注册表与核心快照一致，渲染器无法反向修改 Core。
- `worldRoot` 平移不改变绝对坐标，角色根节点严格跟随核心轨迹。
- 世界点击不能开始蓄力，左右箭头命中只映射到各自分支；落地镜头进度连续且输入在过渡结束前保持锁定。
- WebGL2 失败是可诊断错误，三端构建不泄漏 DOM、`tt.*` 或 `wx.*` 到错误层。
- `dispose()`/重开/多次初始化不重复绑定输入或无限增长 GPU 资源。

### 真机必须覆盖

- 微信与抖音，iOS 与 Android，均能创建 WebGL2 上下文并稳定出首帧。
- 阴影、透明纹理、HUD、DPR、安全区、长屏和旋转/尺寸变更正常。
- 触摸选路、蓄力、取消、暂停、恢复、后台切换和重开无重复事件。
- 连续游玩的帧率、内存、发热、上下文恢复和包体符合发行目标。

详细记录模板见 [platform-checklist.md](platform-checklist.md)。

## 架构决策

- [ADR-001：使用 Three.js/WebGL2 单上屏 Canvas](decisions/001-threejs-webgl2-single-canvas.md)
- [ADR-002：核心状态单向驱动三维表现层](decisions/002-core-driven-presentation.md)
- [ADR-003：参考 `shenmaxg/web-jump` 并保留 MIT 归属](decisions/003-web-jump-reference-and-license.md)
- [ADR-005：正式内容目录与任务驱动胜负](decisions/005-formal-content-catalog-and-task-outcomes.md)
