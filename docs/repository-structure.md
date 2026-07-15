# 仓库结构与模块目录

本文描述第三批 P6–P8 已验证的实际结构，不把第四批目标提前写成现状。

## 根目录与依赖方向

| 路径 | 当前职责 |
|---|---|
| `packages/` | private TypeScript 模块化单体。 |
| `src/platform/` | Web、微信、抖音宿主适配；第四批迁移 TS。 |
| `src/entry/` | 三端入口和唯一具体组合根；第四批迁移 TS。 |
| `src/config.js` | 剩余表现迁移配置；第四批消除。 |
| `tests/` | 7 个 Node 兼容/平台/架构/基线 JS 测试；第四批迁移。 |
| `scripts/build.mjs` | 三端构建；第四批迁移。 |

`src/core`、`src/runtime`、`src/render3d` 的旧 JS 已依批次删除，没有双实现。

```text
game-contracts       jump-engine
   ↑    ↑                 ↑
content feedback      gameplay ← difficulty
   ↑       ↑             ↑
renderer-three     application
        ↑             ↑
        └── src/entry/compose-game.js ── src/platform
```

Domain/Application/Content/Feedback 禁止依赖 Three 和宿主全局；Renderer 可以依赖 Three，但禁止 DOM、`window`、`wx`、`tt`。架构测试核对每个包的 private 属性和精确依赖方向。

## 领域与应用包

- `game-contracts`：Gameplay/Task/Scene/Character、Command/Event/Snapshot 和小型 Port。
- `difficulty`：easy/normal/hard 版本化校验与迁移投影，只开放 normal。
- `jump-engine`：RNG、几何、轨迹、碰撞、WorldState。
- `gameplay`：运算、求解、GameState、GameplayRegistry、TaskRegistry。
- `application`：GameSession、CommandHandler、FixedStepClock、LifecycleController、EventCollector、SnapshotFactory 和 NumberStrategyGame。

玩法/任务注册表有 5+5 容量证明，且生产 GameSession 实际按注入 ID 选择定义。

## `packages/content`

- SceneDefinition/SceneRegistry：主题、雾、光照和 rendererKey。
- CharacterDefinition/CharacterRegistry：资源 Manifest、动画集合、rendererKey、缩放与主色。
- ContentSelection：切换时先成功创建新资源再销毁旧资源；缺失 ID 或资源创建失败回退默认内容；销毁幂等。
- 默认场景和默认程序化红色角色进入生产 Renderer。
- 测试注册 10 个版本化程序角色 Manifest，并覆盖切换、缺失回退、加载失败回退和逐项销毁。

这证明可扩展容量，不代表已交付 10 个正式美术角色。

## `packages/feedback`

- FeedbackController 从 GameEvent 映射 jump/land/miss/win/restart 声音与轻/重震动。
- 声音与震动默认开启，可独立关闭；`feedback-settings@1` 经 Storage 小端口本地保存。
- AudioFactorySoundPort 运行时生成原创 WAV 提示音，不引入第三方音频资产。
- 声音、震动、存储不可用或抛错时静默降级并累积诊断，不阻断 Renderer 或游戏循环。
- 组合根把 Web/小游戏现有 `createAudio`、`vibrate`、`storageGet/storageSet` 绑定到小端口。

当前没有 HUD 设置页面；设置由 FeedbackController API 管理。第四批可在存档/设置入口暴露，不改变反馈内部边界。

## `packages/renderer-three`

| 模块 | 职责 |
|---|---|
| `renderer3d.ts` | RendererPort 外观、快照/事件入口、渲染顺序、诊断与组合。 |
| `stage.ts` | World Scene、地面与 SceneDefinition 应用。 |
| `camera-rig.ts` | 正交相机、手机构图和共享进度过渡。 |
| `lighting-rig.ts` | SceneDefinition 驱动的灯光和阴影。 |
| `platform-mesh-factory.ts`、`platform-view-registry.ts` | 平台 Mesh、稳定 ID 同步、回收和销毁。 |
| `character-rig.ts` | CharacterDefinition 驱动的程序化 Rig、蓄力、空翻和失败姿态。 |
| `character-renderer-registry.ts`、`scene-renderer-registry.ts` | 将内容 `rendererKey` 映射为具体 Three 工厂，拒绝未知/重复渲染器。 |
| `hud/hud-scene.ts` | 单 Canvas HUD、左右按钮、安全区和结果覆盖层。 |
| `texture-manager.ts`、`dispose.ts` | Canvas 纹理、引用、延迟淘汰和容错销毁。 |
| `effects/*` | 有界粒子和拖尾。 |
| `context-lifecycle.ts` | WebGL context lost/restored 监听与幂等解绑。 |

Renderer 直接实现 `render(snapshot, events)`，不再由入口把可变 GameState/WorldState 传给 `draw`。为保持第三批可运行迁移，其源码当前为 `.ts` 但 tsconfig 暂时关闭 strict 并含宽松索引签名；第四批必须逐模块声明具体类型、删除宽松规则并通过统一 strict 门禁。

## 剩余 `src`

- `entry/launch-game.js`：并发启动 generation、过期实例销毁和错误回调。
- `entry/compose-game.js`：绑定 Application、Renderer、Feedback、Storage 与具体平台。
- `platform/*.js`：Canvas、输入、帧、生命周期、WebGL2、音频、震动、存储和分享。

当前剩余 13 个 `src/**/*.js`、7 个 `tests/*.js` 和 1 个 `scripts/build.mjs`，全部属于第四批零 JS 范围。

## 测试地图与证据

- workspace Vitest 84 项：Contracts、Difficulty、Jump Engine、Gameplay、Application、Content、Feedback、Renderer。
- Node 兼容/集成 40 项：基线、30,000 seed、入口、平台、IIFE、架构和文档。
- 合计 124 项。
- 三端构建：Web、微信、抖音通过。
- Web 包：643,245 bytes，Vite 报告 gzip 168.80 kB。

测试 TS 文件仍由过渡非 strict `tsconfig.tests.json` 检查；覆盖率阈值、资源 soak 和统一 strict 属于第四批。
