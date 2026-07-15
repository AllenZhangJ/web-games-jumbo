# 仓库结构与模块目录

本文描述第一批 P0–P2 的实际结构，不提前把后续治理目标写成现状。未来目录迁移后，本文件必须随对应批次校准。

## 根目录

| 路径 | 当前职责 |
|---|---|
| `index.html` | Web 入口 HTML，只挂载一个 `#game` Canvas 和无障碍说明。 |
| `src/` | 当前全部运行时源码。 |
| `packages/` | 第一批建立的私有 TypeScript workspace 包；当前包含跨模块契约和版本化难度。 |
| `tests/` | Node 内建测试运行器执行的单元、集成、架构和适配层测试。 |
| `scripts/build.mjs` | 统一生成 Web、微信和抖音构建，并复制许可证。 |
| `public/` | 构建时复制的公共资源；概念图不进入小游戏发行资源。 |
| `docs/` | 项目事实、设计、架构、治理、验收与 ADR。 |
| `licenses/` | Three.js 与 `web-jump` 的许可证文本。 |
| `PRODUCT.md` | 产品定位、用户、约束和明确非目标。 |
| `THIRD_PARTY_NOTICES.md` | 第三方代码和许可归属。 |
| `package.json` | npm workspaces、Node 版本、累积门禁和直接依赖。 |
| `package-lock.json` | 可复现安装的依赖锁。 |
| `tsconfig.base.json` | 新 TypeScript 包共用的 strict 编译规则。 |
| `tsconfig.legacy.json` | 第一至第三批临时检查旧 `src/**/*.js` 的 `allowJs/checkJs` 门禁；第四批必须删除。 |
| `eslint.config.mjs` | 当前 TypeScript workspace 包的 ESLint 规则。 |

## `packages`：第一批 TypeScript 边界

| 包 | 当前职责 |
|---|---|
| `@number-strategy/game-contracts` | 版本化定义、Command、Event、Snapshot、小型 Renderer/Feedback/Storage/Clock Port，以及 Gameplay、Task、Character 扩展契约。不得依赖 Three.js 或平台全局对象。 |
| `@number-strategy/difficulty` | `easy@1`、`normal@1`、`hard@1`，运行时结构校验、不可变注册表，以及向现有 GameState/物理/World 配置投影的迁移适配器。当前只开放 normal。 |

两个包都为 `private: true`。依赖方向固定为 `difficulty → game-contracts`，反向依赖和平台/渲染依赖由架构测试拒绝。

## `src/core`：玩法与物理真相

当前 Core 是纯 JavaScript，不应访问 Three.js、DOM、微信或抖音 API。

| 文件 | 当前职责 |
|---|---|
| `game-state.js` | 回合状态机、当前/目标值、步数、候选运算、蓄力阶段和胜负。默认使用 normal，但可注入经过校验的规则。 |
| `operations.js` | 运算执行、候选生成、目标距离和受限深度求解器；求解和候选均服从 `allowedOperations`。 |
| `jump-physics.js` | 蓄力↔射程、目标蓄力窗口、轨迹创建/采样和顶面落点解析。 |
| `geometry.js` | 与表现无关的地面向量、插值、矩形足迹和射线区间。 |
| `world-state.js` | 平台 ID、当前/候选/历史拓扑、玩家位置和成功落地事务。 |
| `rng.js` | 可快照与恢复的确定性伪随机数。 |

当前耦合：`game-state.js` 仍以旧配置形状运行，靠 Difficulty 的投影适配器注入；数值任务和回合仍集中在一个类中。第二批会删除这层旧形状并把 Gameplay、Task 和 Jump Engine 分开。

## `src/runtime`：当前应用编排

| 文件 | 当前职责 |
|---|---|
| `game.js` | `NumberStrategyGame`；入口可注入版本化 Difficulty，并投影到 State、Jump 和 World；仍同时负责输入、生命周期、固定步长、落地事务、表现状态、错误恢复和 Renderer 调用。 |
| `bootstrap.js` | 较早的通用启动入口，负责销毁旧全局实例和处理并发启动。当前 Web/小游戏正式入口主要使用 `entry/launch-game.js`。 |

`game.js` 当前 637 行，是治理的主要拆分对象。它已经支持 Renderer 工厂注入，但默认实现仍直接依赖 `Renderer3D`。

## `src/render3d`：Three.js 表现

| 文件/目录 | 当前职责 |
|---|---|
| `renderer3d.js` | Runtime 看到的三维外观；初始化 WebGLRenderer、同步快照、更新相机/世界原点、渲染世界和 HUD、记录调试信息并销毁资源。 |
| `stage.js` | 世界 Scene、地面、相机和光照的组合。 |
| `camera-rig.js` | 正交相机尺寸、焦点计算和连续跟随。 |
| `lighting-rig.js` | 环境光、方向光和阴影相机。 |
| `character-rig.js` | 当前程序化红色角色、蓄力压缩、朝向、空翻和失败姿态。 |
| `platform-mesh-factory.js` | 创建方台、圆台、材质和运算标签。 |
| `platform-view-registry.js` | 以稳定平台 ID 同步、复用和移除 Three.js View。 |
| `texture-manager.js` | 离屏 Canvas 文本纹理、引用计数、缓存和销毁。 |
| `effects/tail-trail.js` | 轻量轨迹拖尾。 |
| `effects/particle-burst.js` | 落地粒子。 |
| `hud/hud-scene.js` | 顶部数值、状态文案、左右按钮、暂停/重开和结果覆盖层。 |
| `dispose.js` | Object3D、材质和纹理的容错销毁。 |
| `constants.js` | 当前渲染尺寸、主题、相机、阴影和缓动常量。 |
| `index.js` | Renderer3D 导出入口。 |

当前耦合：场景、角色、主题和特效均为具体实现，尚未通过 Scene/Character Manifest 注入。

## `src/platform`：平台能力适配

| 文件 | 当前职责 |
|---|---|
| `platform-contract.js` | 默认平台契约、Canvas 尺寸、帧调度和 WebGL2 校验。 |
| `web.js` | DOM Canvas、Pointer Events、页面生命周期、DPR、Web Audio、震动、localStorage 和 Web Share。 |
| `mini-game.js` | 微信/抖音共用的 Canvas、Touch、RAF、安全区、声音、震动、存储和分享适配。 |
| `wechat.js` | 将 `wx` 注入共用小游戏适配器。 |
| `douyin.js` | 将 `tt` 注入共用小游戏适配器。 |

当前平台契约是一个较宽接口；后续会拆成 Input、Clock、RendererHost、Storage、Sound 和 Haptic 等小端口。

## `src/entry`：组合与启动

| 文件 | 当前职责 |
|---|---|
| `launch-game.js` | 统一启动协调器；用 generation 防止过期异步启动覆盖新实例，并负责销毁旧实例。 |
| `web.js` | 注入 Web 平台并展示/清除 Web 启动错误。 |
| `wechat.js` | 注入微信平台并显示小游戏启动错误。 |
| `douyin.js` | 注入抖音平台并显示小游戏启动错误。 |
| `web-startup-fallback.js` | Web 可访问错误提示。 |
| `mini-game-startup-fallback.js` | 微信/抖音模态错误提示。 |

未来 `apps/number-strategy-jump` 将成为唯一组合根，具体实现只能在入口层绑定。

## 根级配置与样式

| 文件 | 当前职责 |
|---|---|
| `src/config.js` | 迁移期组合适配器：从默认或注入 Difficulty 生成旧 GameState、Jump 和 World 配置，同时保留设计尺寸与颜色。第二/三批继续拆除混合职责。 |
| `src/styles.css` | Web 全屏 Canvas、禁止选中/长按菜单、无障碍隐藏文本。 |

## `tests`：测试地图

| 文件 | 主要覆盖 |
|---|---|
| `architecture.test.js` | 平台 API/DOM 泄漏、小游戏 IIFE 打包和目录依赖边界。 |
| `baseline-v0.1.0.test.js` | 默认难度固定 seed、完整获胜回放和 390×844 基线截图哈希。 |
| `difficulty-profiles.test.js` | 三档各 10,000 seed 的真实候选可解路径、非法配置和受限运算集合。 |
| `documentation.test.js` | 本地 Markdown 链接和第 0 批权威文档入口。 |
| `entry-lifecycle.test.js` | 并发启动、停止、错误提示和过期实例销毁。 |
| `game-state.test.js` | 数值状态机、5000 seed 可解路径、高轮次和非法候选。 |
| `operations.test.js` | 运算、候选和求解器。 |
| `jump-physics.test.js` | 蓄力、轨迹、碰撞、边缘与非法配置。 |
| `world-state.test.js` | 平台拓扑、ID、事务、偏心位置和快照隔离。 |
| `runtime-game.test.js` | 主循环、输入、生命周期、帧错误、事务和端到端 seed。 |
| `render3d.test.js` | 相机、HUD、注册表、纹理、销毁和渲染错误隔离。 |
| `platform-webgl.test.js` | Web/小游戏平台能力、WebGL2、输入、存储、分享和回退。 |
| `workspace-architecture.test.js` | workspace 私有性、包依赖方向和 Three/平台全局泄漏。 |
| `packages/*/test` | 版本键、契约、难度校验、不可变性、注册表和默认开放策略。 |

第一批收口前的当前测试总数为 104（Node 98、Vitest 6）。项目尚未启用覆盖率统计，因此“有测试”不能等同于已经满足未来覆盖率门槛。

## 构建产物

`scripts/build.mjs` 每次先清空 `dist/`，然后：

- Vite 构建 `dist/web`，保留 source map。
- esbuild 将微信入口打为 `dist/wechat/game.js` IIFE。
- esbuild 将抖音入口打为 `dist/douyin/game.js` IIFE。
- 三端复制第三方通知与许可证。

`dist/` 和 `node_modules/` 不进入 Git。
