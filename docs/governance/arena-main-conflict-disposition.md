# Arena 与 main 冲突处置矩阵

## 适用范围

本矩阵绑定：

- Arena 代码候选：`a71ecc1c0493a30fd1e94402a662cea9a46b5014`
- 最新审计基准：`origin/main@4c340f1c5bc00dcae712c2261462661d842339da`
- 共同祖先：`d53e7349ff718b3fa0638af197e8f7c43d190b38`
- 只读 rename-aware 虚拟合并结果：52 个冲突文件

本文件先作为预审矩阵，后由 Allen 授权的 `feature/arena-main-integration` 实际批次逐项执行。目标不是让 Git “没有冲突”，而是在不恢复旧数值跳台的前提下承接 `main` 的治理意图。本批只在集成分支合入一次固定 main，没有 rebase、修改或合并 `main`，也没有 force push。

## 处置原则

处置分为四类：

- **保留 Arena**：文件的生产语义必须以 Arena 为准；不能选入旧产品入口、规则、资源或测试。
- **吸收治理意图**：把 `main` 中仍适用于 Arena 的安全、质量或生命周期要求重新表达为 Arena 代码和门禁。
- **保持删除**：文件属于退役产品，冲突解决结果必须仍不存在，并由产品边界检查保护。
- **重新生成**：锁文件等派生产物不手工拼接，先完成 manifest 裁决，再用固定工具链生成并复验。

禁止对 52 个文件整体使用 `ours` 或 `theirs`。即使某一行的最终字节等于 Arena 版本，也必须按下表留下裁决记录。旧 23 文件口径来自非 rename-aware 文本冲突审计，已被本矩阵取代。

## 逐文件裁决

| 文件 | `main` 中仍有效的意图 | 最终处置 | 集成时动作与验证 |
| --- | --- | --- | --- |
| `.github/CODEOWNERS` | 关键代码有明确所有者 | 保留 Arena | 保留唯一负责人 `@AllenZhangJ` 和 Arena/治理路径；运行 repository policy 与文档检查。 |
| `.github/workflows/ci.yml` | 干净安装后执行统一质量门 | 保留 Arena并吸收意图 | 保留完整 Action SHA、`feature/**`、30 分钟超时、`npm ci --ignore-scripts --no-audit` 和 `npm run check`；不得恢复浮动 Action 或安装隐式审计。 |
| `.gitignore` | 忽略依赖、构建、覆盖率、日志和 TS 增量产物 | 规范合成 | 两侧语义相同，仅保留一份规范列表；验证没有忽略治理证据或生产源码。 |
| `AGENTS.md` | 模块边界和实现顺序受约束 | 保留 Arena | 保留 Rule → Core → Bot → Presentation、确定性和生命周期约束；不恢复旧数值跳台规则。 |
| `README.md` | 新克隆可安装、开发、测试和构建 | 保留 Arena并吸收意图 | 保留 Arena 唯一产品说明；已用 `predev`、`predev:lan`、`pretest`、`prepreview:lan` 承接干净环境入口，文档继续使用无隐式审计安装命令。 |
| `docs/architecture.md` | 记录旧产品架构 | 保持删除 | Arena 架构由 `docs/architecture/` 和 ADR-030～041 表达；不得恢复同名旧产品真值。 |
| `docs/gameplay-rules.md` | 记录旧数值跳台规则 | 保持删除 | Arena 规则只由 `docs/gameplay/arena-v1-rules.md` 和版本化 Definition 表达。 |
| `docs/platform-checklist.md` | 自动化、浏览器和真机证据分离 | 保留 Arena并吸收意图 | 保留 iPhone 13 Pro/iOS 26/Chrome 与微信/抖音当前清单；不导入旧 v3 勾选项、旧地址或旧 build。 |
| `eslint.config.ts` | 包代码禁止显式 `any`，类型导入一致 | 吸收治理意图 | 候选已对全部 `packages/**/*.ts` 启用两条 error 规则并修正 3 个存量导入；集成后运行全量 lint。 |
| `package-lock.json` | 锁定完整依赖图 | 重新生成 | 先裁决 `package.json`，再以项目固定 npm/lockfile V3 生成；检查精确 semver、registry、integrity、53 个 manifest、278 个声明（含 override）和 368 个外部锁定包。不得手工拼接冲突块。 |
| `package.json` | workspace 构建、入口前置构建、测试、审计和三端构建 | 手工合成，Arena 为产品真值 | 保留 52 个 Arena 包、唯一显式 `audit:dependencies` 和统一 `check`；候选已恢复干净环境生命周期脚本。不得恢复旧产品包或旧测试/构建命令。 |
| `packages/application/src/bootstrap.ts` | 旧产品应用装配被迁为 TS | 保持删除 | 不导入旧数值跳台 bootstrap；Arena 组合由 `arena-product-composition`、`arena-v1-application` 和三端入口承接。 |
| `packages/application/test/number-strategy-game.test.ts` | 旧产品应用闭环测试被迁为 TS | 保持删除 | 不恢复旧游戏测试；以 Arena Product/Session/Launch 集成测试和产品压力门为准。 |
| `packages/gameplay/test/game-state.test.ts` | 旧数值选择状态测试被迁为 TS | 保持删除 | 不恢复退役规则；Arena 权威状态由 MatchCore、Participant/Timeline 和 Replay 回归保护。 |
| `packages/gameplay/test/operations.test.ts` | 旧数值运算规则测试被迁为 TS | 保持删除 | 不恢复旧 operations；Arena 动作候选只经 ActionResolver 裁决。 |
| `packages/jump-engine/src/geometry.ts` | 旧跳台几何实现被迁为 TS | 保持删除 | 不恢复旧世界几何；Arena 使用版本化 Map/Physics Definition 与各自系统。 |
| `packages/jump-engine/src/rng.ts` | 旧 RNG 实现被迁为 TS | 保持删除 | 不恢复旧导出；Arena 使用 `arena-contracts` 的 seed 派生和具名随机流。 |
| `packages/jump-engine/test/physics.test.ts` | 旧蓄力跳物理测试被迁为 TS | 保持删除 | 不恢复旧玩法；Arena movement/physics、30/60/120 Hz、Replay 和 movement stress 作为门禁。 |
| `packages/jump-engine/test/world-state.test.ts` | 旧跳台世界测试被迁为 TS | 保持删除 | 不恢复旧世界模型；Arena Map Timeline、MatchCore 和无渲染模拟承接有效治理意图。 |
| `packages/platform/src/douyin.ts` | 旧产品抖音适配被迁为 TS | 保持删除 | 不恢复旧 platform 包；保留 `arena-platform-runtime` 的抖音适配和当前 Product entry。 |
| `packages/platform/src/mini-game.ts` | 旧小游戏公共适配被迁为 TS | 保持删除 | 不恢复旧公共层；保留 Arena mini-game 平台合同、能力收窄和生命周期。 |
| `packages/platform/src/platform-contract.ts` | 旧平台合同被迁为 TS | 保持删除 | 不恢复旧合同；保留 strict `arena-platform-contracts`。 |
| `packages/platform/src/web.ts` | 旧产品 Web 适配被迁为 TS | 保持删除 | 不恢复旧 platform 包；保留 Arena Web 平台、teardown 和当前入口。 |
| `packages/platform/src/wechat.ts` | 旧产品微信适配被迁为 TS | 保持删除 | 不恢复旧 platform 包；保留 Arena 微信适配和当前 Product entry。 |
| `packages/platform/test/platform.test.ts` | 旧平台组合测试被迁为 TS | 保持删除 | 不恢复针对旧合同的断言；保留 Arena 平台包、三端 bundle 和入口生命周期测试。 |
| `packages/renderer-three/src/camera-rig.ts` | 旧跳台相机实现被迁为 TS | 保持删除 | 不恢复旧 Renderer；Arena 相机由 `arena-presentation-three` 的 `arena-camera` 承接。 |
| `packages/renderer-three/src/character-rig.ts` | 旧跳台角色骨架实现被迁为 TS | 保持删除 | 不恢复旧轮廓角色；Arena 使用正式 GLTF、41 关节动画控制和失败兜底。 |
| `packages/renderer-three/src/constants.ts` | 旧渲染魔法数被迁为 TS | 保持删除 | 不恢复旧常量；Arena 表现参数由版本化 Presentation Definition 管理。 |
| `packages/renderer-three/src/dispose.ts` | 旧 Three 资源清理被迁为 TS | 保持删除并承接意图 | 不复制实现；保留 Arena dispose、迟到加载、context loss 和清理重试测试。 |
| `packages/renderer-three/src/effects/particle-burst.ts` | 旧粒子命中特效被迁为 TS | 保持删除并承接意图 | 不恢复旧效果；Arena 只消费权威事件产生有界命中反馈。 |
| `packages/renderer-three/src/effects/tail-trail.ts` | 旧拖尾效果被迁为 TS | 保持删除并承接意图 | 不恢复旧效果；Arena 武器/动作表现由当前 Renderer 与资产绑定决定。 |
| `packages/renderer-three/src/hud/hud-scene.ts` | 旧 HUD 场景被迁为 TS | 保持删除 | 不恢复旧产品 HUD；保留 Arena Product UI Scene Model 和 HUD layer。 |
| `packages/renderer-three/src/lighting-rig.ts` | 旧灯光实现被迁为 TS | 保持删除 | 不恢复旧灯光树；Arena World Stage/正式资产表现为真值。 |
| `packages/renderer-three/src/platform-mesh-factory.ts` | 旧平台网格工厂被迁为 TS | 保持删除 | 不恢复旧跳台网格；Arena Surface Registry 与 Map Definition 为真值。 |
| `packages/renderer-three/src/platform-view-registry.ts` | 旧平台视图注册表被迁为 TS | 保持删除 | 不恢复旧注册表；Arena 使用只读 surface view registry。 |
| `packages/renderer-three/src/renderer3d.ts` | 旧产品 Renderer 被迁为 TS | 保持删除 | 不恢复旧渲染主循环；Arena Product Renderer 只消费只读快照/事件。 |
| `packages/renderer-three/src/stage.ts` | 旧舞台装配被迁为 TS | 保持删除 | 不恢复旧舞台；Arena World Stage、Camera、HUD 和资产加载由当前组合根拥有。 |
| `packages/renderer-three/src/texture-manager.ts` | 旧纹理管理器被迁为 TS | 保持删除并承接意图 | 不恢复旧缓存；Arena 正式纹理受资产 hash/预算和资源生命周期门禁保护。 |
| `packages/renderer-three/test/renderer-three.test.ts` | 旧 Renderer 测试被迁为 TS | 保持删除 | 不恢复旧产品断言；Arena Three、Product Presentation、context loss 与 soak 测试承接有效质量意图。 |
| `scripts/build.ts` | Web/微信/抖音可复现构建 | 保留 Arena | 保留唯一 Product 入口、Manifest、clean-source、预算和生产产物边界；不得打包旧产品或开发入口。 |
| `src/entry/douyin.ts` | 抖音启动失败可见且生命周期可清理 | 保留 Arena | 保留 Arena Product 组合、平台注入和启动协调器；运行小游戏 bundle、启动失败和销毁竞态测试。 |
| `src/entry/launch-game.ts` | 旧顶层启动器被迁为 TS | 保持删除 | 不恢复旧启动器；保留 `arena-platform-runtime` 的 launch contract 与 Arena 顶层 Launch。 |
| `src/entry/mini-game-startup-fallback.ts` | 旧小游戏兜底被迁为 TS | 保持删除并承接意图 | 不恢复旧产品文案/装配；Arena startup fallback 必须保持失败可见、清理可重试。 |
| `src/entry/web-startup-fallback.ts` | 旧 Web 兜底被迁为 TS | 保持删除并承接意图 | 不恢复旧产品 DOM；Arena Web Product 使用当前错误表面与 teardown。 |
| `src/entry/web.ts` | Web 启动、错误兜底、导航/HMR 清理 | 保留 Arena并吸收意图 | 保留 Arena Product；候选已补回无效工厂、可选回调和损坏宿主兜底用例。 |
| `src/entry/wechat.ts` | 微信启动失败可见且生命周期可清理 | 保留 Arena | 保留 Arena Product 组合、平台注入和启动协调器；运行小游戏 bundle、启动失败和销毁竞态测试。 |
| `tests/architecture.test.ts` | 平台隔离和核心无宿主依赖 | 保留 Arena | 保留 Arena 52 包依赖方向、迁移路径和证据边界测试；不恢复针对旧包名的断言。 |
| `tests/entry-lifecycle.test.ts` | 启动失败、竞态、可选回调和兜底失效均不阻断主流程 | 吸收治理意图 | 候选已把 `main` 缺失的两组边界场景迁成 Arena 测试，当前 8/8 通过；未来以 Arena 启动协调器为被测对象。 |
| `tsconfig.app.json` | 应用入口 strict TypeScript | 保留 Arena | 保留 Arena 入口、脚本与当前应用边界；不把旧产品源文件重新纳入。 |
| `tsconfig.base.json` | 全仓严格编译基础 | 保留 Arena | 保留当前 strict、module resolution 和包级构建约束；通过 52 包拓扑构建验证。 |
| `tsconfig.json` | workspace 引用完整且无环 | 保留 Arena | 保留 52 个 Arena project reference；实际构建顺序由 manifest 依赖图推导并拒绝缺包、重名和环。 |
| `vitest.config.ts` | 覆盖率必须失败关闭 | 保留 Arena并吸收意图 | 保留 Arena 分层阈值和 61 个文件范围。旧产品全局 80% 数字不直接移植；核心包采用更高分层阈值，整体阈值覆盖 52 包未完全单测的组合层，不能靠删测试抬高。 |

## 已在候选中提前吸收的 `main` 意图

代码候选 `a71ecc1` 已完成以下不需要等待实际合并的修正：

1. 对全部 Arena 包启用 `consistent-type-imports` 与 `no-explicit-any`，存量代码零违规。
2. 恢复 `dev`、`dev:lan`、`test` 的 workspace 前置构建，以及 `preview:lan` 的生产前置构建；供应链门禁阻止回退。
3. 将 `main` 中两组仍有效的启动失败边界场景迁入 Arena 生命周期测试。
4. 删除零引用的旧 `src/config.ts`，并将其纳入 Arena 唯一产品退役路径门禁。

这些是学习和承接治理意图，不是复制或恢复旧玩法实现。

## 实际集成批次的执行结果

1. fetch 后确认 `origin/main` 仍是本矩阵绑定的 `4c340f1c5bc00dcae712c2261462661d842339da`。
2. 从干净的 Arena 候选 `55230dd5e5d655913fed2a8968c1720ec7538b16` 创建专用集成分支，只执行一次普通 `--no-ff` merge。
3. 52 个冲突按上表解决；31 个旧产品 rename/delete 项保持删除，21 个同名文件保留 Arena 真值或既有治理承接。
4. main 自动加入但没有文本冲突的旧产品包、测试、脚本和发布文档同样删除。根 `package.json` 与锁文件最终字节保持 Arena 候选，不需要重新生成依赖图。
   本次暴露的 10 个旧 TypeScript 包、2 个旧治理脚本和 1 个旧组合入口已加入自动退役路径门禁，防止以后手工回流。
5. 双父提交 `b4faa2c8f1af59605a95281948406376cb442ea6` 的树与第一父 tree hash 均为 `f3621cf35bddf90af1ceccd196d782a724cde5a2`。
6. 完整 `npm run check`、全依赖审计、Replay、fuzz、104 项生命周期、两组 soak、正式资产、三端 clean build、预算和产物边界通过；生产和全依赖审计均为 0 vulnerabilities。
7. 三端交付除 build manifest 的提交身份外与已验收基线逐文件相同；Allen 已确认 iPhone 13 Pro / iOS 26 / Chrome 验收。
8. 精确集成候选已推送到 `origin/feature/arena-main-integration`；最终结论与 Actions 证据见[集成后独立终审](arena-main-merge-preflight.md)。

## 集成后必须保持的否定断言

- 旧数值跳台源码、入口、配置、规则、截图和产品文档没有回流。
- Arena 任意距离挥空、动作/武器、地图、输入、确定性 Replay 和 Profile schema 没有回退。
- 权威层没有新增 Three.js、DOM、宿主 API、墙钟或未注入随机依赖。
- 安装阶段没有隐式 npm audit，完整门只调用一次显式审计。
- 没有用降低画质、动作数、关节数或删除测试换取性能和覆盖率结果。
- Allen 已确认目标 iPhone Chrome 验收；微信/抖音 iOS/Android 发布材料仍标记为未完成，不由 Web、桌面或模拟器结果代替。
