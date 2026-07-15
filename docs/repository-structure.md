# 仓库结构与模块目录

本文描述第二批 P3–P5 已验证的实际结构；第三、四批目标不会提前写成现状。

## 根目录

| 路径 | 当前职责 |
|---|---|
| `packages/` | private TypeScript workspaces，承载契约、难度、跳跃内核、玩法和应用编排。 |
| `src/render3d/` | 现有 Three.js 表现；第三批迁移与拆分对象。 |
| `src/platform/` | Web、微信、抖音宿主能力；第四批迁移对象。 |
| `src/entry/` | 组合根与三端入口；第四批迁移对象。 |
| `tests/` | 仍由 Node 运行的兼容、平台、渲染、架构和基线测试。 |
| `scripts/build.mjs` | Web、微信、抖音统一构建；第四批迁移对象。 |
| `docs/`、`licenses/` | 当前事实、治理、ADR、验收和许可证。 |

`src/core/` 与 `src/runtime/` 的旧 JavaScript 实现已在第二批删除；不存在双实现或转发兼容层。

## workspace 依赖方向

```text
game-contracts
      ↑
 difficulty       jump-engine
      ↑                ↑
      └──── gameplay ──┘
                  ↑
             application
                  ↑
       src/entry/compose-game.js
          ┌───────┴────────┐
     render3d            platform
```

包全部为 `private: true`。架构测试拒绝反向依赖、Three.js/DOM/`window`/`wx`/`tt` 泄漏和未声明依赖。

## `packages/game-contracts`

- 版本化 Gameplay、Task、Character 定义。
- Command、Event、Snapshot。
- Renderer、Feedback、Storage、Clock 小型 Port。
- 无游戏实现、Three.js 或平台全局对象。

## `packages/difficulty`

- `easy@1`、`normal@1`、`hard@1` 的 Schema、注册与冻结。
- 当前只对玩家开放 `normal@1`。
- 暂时保留向现有规则、物理、世界参数形状投影的函数；后续配置治理再收窄。

## `packages/jump-engine`

| 文件 | 职责 |
|---|---|
| `rng.ts` | 可快照、恢复的确定性随机数。 |
| `geometry.ts` | 向量、插值、矩形足迹和射线区间。 |
| `physics.ts` | 蓄力、目标窗口、解析轨迹采样和顶面碰撞。 |
| `world-state.ts` | 平台 ID、当前/候选/历史拓扑、玩家位置和落地事务。 |

该包可在 Node 独立运行，不依赖 Three.js、DOM、Renderer 或平台 API。

## `packages/gameplay`

| 文件 | 职责 |
|---|---|
| `operations.ts` | 运算、候选生成、目标距离和受限深度求解。 |
| `game-state.ts` | 当前数值玩法的回合、蓄力阶段、步数与胜负状态机。 |
| `registry.ts` | 版本化 GameplayRegistry、TaskRegistry，内置数值跳跃玩法和到达目标任务。 |

注册表测试证明 5 个玩法与 5 个任务定义可静态注册、按版本查询和拒绝重复；应用组件测试证明实际会话可按注入 ID 选择玩法与任务，不需要修改主循环。治理不等于已经制作 5 个正式内容。

## `packages/application`

| 文件 | 职责 |
|---|---|
| `number-strategy-game.ts` | 用例编排、输入到 Command 的映射、跳跃/落地事务和端口协调。 |
| `game-session.ts` | 难度、玩法、任务、规则、世界和表现会话的组合。 |
| `command-handler.ts` | Command 边界校验与分派。 |
| `fixed-step-clock.ts` | 60Hz 累积、时间上限和前后台 rebase。 |
| `lifecycle-controller.ts` | 显式应用生命周期转换。 |
| `event-collector.ts` | 有序、一次性消费的领域/应用事件。 |
| `snapshot-factory.ts` | Renderer 可消费的只读 GameSnapshot。 |
| `bootstrap.ts` | 可复用启动协调。 |

应用通过 Platform、Renderer、Feedback、Storage Port 依赖外部能力。Feedback 失败不会阻断帧或 Renderer；Storage 已注入但要到第四批 P9 才用于版本化存档。

## `src` 的剩余边界

- `src/entry/launch-game.js` 只接受注入的 `createGame`，不再导入具体 Application 或 Renderer。
- `src/entry/compose-game.js` 是唯一具体组合根，把 Application、Renderer3D 与平台绑定。
- `src/render3d/` 只通过 `render(snapshot, events)` 读取应用结果；内部暂时仍把快照转换为既有绘制形状。
- `src/platform/` 仍独占 DOM、`wx.*`、`tt.*` 和设备能力。
- `src/config.js` 仍含表现配置与迁移配置，属于第三/四批拆分范围。

## 测试地图

| 位置 | 当前覆盖 |
|---|---|
| `packages/jump-engine/test` | 轨迹、碰撞、边界、世界事务、快照隔离。 |
| `packages/gameplay/test` | 运算、求解、状态机、问题 seed、注册容量。 |
| `packages/application/test` | Command、Clock、Lifecycle、Event、Snapshot、输入、帧、竞态、失败隔离和主流程。 |
| `packages/difficulty/test` | 三档校验、冻结、默认开放策略。 |
| `packages/game-contracts/test` | 版本键和契约边界。 |
| `tests/*.test.js` | v0.1.0 基线、30,000 seed、入口/平台/Renderer/架构和文档。 |

第二批共有 114 项测试（62 项 workspace Vitest、52 项 Node 兼容/集成测试）。`packages/*/src` 已 strict TypeScript；迁移后的包测试目前由过渡 `tsconfig.tests.json` 类型检查但尚未全部开启 strict，第四批必须与所有剩余测试一起严格化并删除该过渡。

## 构建产物

`npm run build` 先构建 workspaces，再生成：

- `dist/web`：Vite Web 静态站点和 source map。
- `dist/wechat/game.js`：微信 IIFE。
- `dist/douyin/game.js`：抖音 IIFE。
- 三端第三方通知与许可证。

`dist/`、`node_modules/` 和 workspace 编译产物不进入 Git。
