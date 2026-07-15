# 仓库结构与模块目录

本文描述第四批 P9–P10 的实际模块化单体结构。

## 根目录

| 路径 | 职责 |
|---|---|
| `packages/` | 领域、应用、内容、反馈、持久化、渲染和平台 private workspaces。 |
| `src/entry/` | 三端入口、启动协调器与唯一具体组合根。 |
| `src/config.ts` | 默认难度向既有规则/物理/世界配置的只读投影。 |
| `tests/` | 跨包基线、架构、文档、入口和 1000 会话 soak。 |
| `scripts/` | TypeScript 三端构建、零 JS 与资产/许可证审计。 |
| `.github/` | CI 与 CODEOWNERS。 |
| `docs/` | 当前事实、ADR、治理、资产许可与发布证据。 |

`src/core`、`src/runtime`、`src/render3d`、`src/platform` 的旧 JS 已删除；维护目录不保留平行实现。

## 依赖方向

```text
game-contracts      jump-engine
   ↑   ↑                 ↑
content feedback     gameplay ← difficulty
   ↑       ↑          ↑      ↑
renderer-three   application ← persistence
        ↑             ↑
        └── src/entry/compose-game.ts ── platform
```

- Gameplay、Difficulty、Jump Engine、Persistence、Application、Content、Feedback 禁止依赖 Three 或宿主全局。
- Renderer 可以依赖 Three 和 Content，但不能访问 DOM、`window`、`wx`、`tt` 或改写领域真相。
- Platform 可以接触宿主 API，但不能依赖 Gameplay、Application 或 Renderer。
- 具体类只在 `compose-game.ts` 组装；入口启动器仅依赖工厂与 `LaunchableGame`。

架构测试核对 private 属性、精确依赖、平台泄漏、小游戏 DOM 泄漏和 IIFE 可构建性。

## workspace 职责

| 包 | 高内聚职责 |
|---|---|
| `game-contracts` | 版本化定义、Command/Event/Snapshot 与小型 Port。 |
| `difficulty` | easy/normal/hard 校验、注册与旧规则投影。 |
| `jump-engine` | RNG、几何、轨迹、落点解析、WorldState。 |
| `gameplay` | 运算、求解、GameState、Gameplay/Task 注册表。 |
| `application` | Session、Command、Clock、Lifecycle、Event、Snapshot、落地事务与存档编排。 |
| `persistence` | SaveEnvelope、迁移、Repository、ReplayRecorder、回放与诊断导出。 |
| `content` | Scene/Character 定义、注册、回退和资源替换事务。 |
| `feedback` | 事件到声音/震动、独立设置与失败隔离。 |
| `renderer-three` | World/HUD/Camera/Resource/Context Lifecycle，只消费快照/事件。 |
| `platform` | Web/微信/抖音 Canvas、输入、帧、生命周期、设备能力与本地存储。 |

## 扩展边界

- 新玩法实现 `GameplayDefinition` 并注册，不在主循环添加 ID 分支。
- 新任务实现 `TaskDefinition`，声明验证/创建/评估逻辑，并由玩法声明兼容类型。
- 新角色提供版本化 `CharacterDefinition` 和受审计的 `assetManifest`；具体 Three 工厂通过 `rendererKey` 注册。
- 新难度提供版本化 `DifficultyProfile`；产品曝光与注册是两个独立决定。
- 存档保存所有定义的 ID/版本；不兼容定义不能被静默替换。

自动化证明 5 个玩法、5 个任务和 10 个角色可静态注册、选择、回退与销毁。这是扩展容量证明，不是相应数量正式内容的交付声明。

## TypeScript 与质量门禁

- `tsconfig.base.json` 为统一 strict 基线；每个包和 `tsconfig.app.json` 不关闭 strict 子项。
- `scripts/check-zero-js.ts` 扫描 `packages/src/tests/scripts`，拒绝维护 `.js/.mjs/.cjs/.jsx`、`@ts-nocheck`、`strict:false` 与 `allowJs/checkJs`。
- 覆盖率门禁只统计可确定性单测的领域/应用/服务与启动边界；平台和 WebGL 仍执行测试，但以三端构建、浏览器和真机矩阵作为适配证据。
- `scripts/audit-assets.ts` 校验第三方运行时依赖、许可文本、发行声明、角色资源清单和外链资源。
- `scripts/build.ts` 生成三端产物、复制许可并执行 Web gzip 与小游戏包体预算。

## 测试地图

- 单元/契约：Contracts、Difficulty、RNG、Physics、World、Gameplay、Application、Persistence、Content、Feedback、Platform、Renderer。
- 回归/集成：v0.1.0 固定 seed/整局/截图、入口竞态、三端边界、文档链接、workspace 依赖。
- 大样本：easy/normal/hard 各 10,000 seed 可解性。
- soak：1,000 个完整 normal 会话；100 局 Three 平台资源有界并最终释放。
- 扩展：5 Gameplay、5 Task、10 Character Manifest 容量证明。
- 构建：Web ESM、微信 IIFE、抖音 IIFE，三端均带许可文本。

当前构建 Web JS 651.45 kB、gzip 170.81 kB；Web gzip 硬预算 180 KiB，微信/抖音 `game.js` 硬预算各 700 KiB。
