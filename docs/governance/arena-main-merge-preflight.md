# Arena 与最新 main 集成后独立终审

## 结论

本报告在终审时给出的结论是 **可合并**。最新 `main` 的 12 个独有提交继续治理已退役的数值跳台，因此不能直接自动合并；授权后的独立集成批次已经以 Arena 为第一父，只合入一次固定 main，并显式处置 52 个冲突及 main 没有文本冲突的旧产品新增。结果树与集成前 Arena 树完全相同，旧实现没有回流。

终审批次只在 `feature/arena-main-integration` 创建并推送候选，没有修改或合并 `main`，没有 rebase 或 force push。终审完成后，候选于 2026-07-24 通过 [PR #1](https://github.com/AllenZhangJ/web-games-jumbo/pull/1) 按受保护分支流程合入 `main@8ab707ba52d925268e19fbe8c00be763cd6bec31`。逐项裁决与替代方案见 [ADR-042](../decisions/042-arena-first-main-integration.md)；微信/抖音四端真机材料仍是发布门禁，不阻断代码合并。

## 审计身份

| 项目 | 值 |
| --- | --- |
| 审计日期 | 2026-07-24 |
| 最新远端 main | `4c340f1c5bc00dcae712c2261462661d842339da` |
| 共同祖先 | `d53e7349ff718b3fa0638af197e8f7c43d190b38` |
| 治理代码候选 | `a71ecc1c0493a30fd1e94402a662cea9a46b5014` |
| main 独有非 merge 提交 | 12 |
| 截至代码候选的治理分支独有提交 | 445 |
| rename-aware 虚拟合并冲突 | 52 个文件 |
| 集成分支 | `feature/arena-main-integration` |
| 集成提交 | `b4faa2c8f1af59605a95281948406376cb442ea6` |
| 第一父 / 第二父 | `55230dd5e5d655913fed2a8968c1720ec7538b16` / `4c340f1c5bc00dcae712c2261462661d842339da` |
| 合并树 / 第一父树 | `f3621cf35bddf90af1ceccd196d782a724cde5a2` / `f3621cf35bddf90af1ceccd196d782a724cde5a2` |
| 受保护合并 PR | [#1](https://github.com/AllenZhangJ/web-games-jumbo/pull/1) |
| Arena 代码主干合并 / 父提交 | `8ab707ba52d925268e19fbe8c00be763cd6bec31` / `4c340f1`、`36b9959` |
| 代码合并树 / 候选树 | `021338ed4f2cf0803bfd48d60216ac30c9497051` / `021338ed4f2cf0803bfd48d60216ac30c9497051` |

候选 `a71ecc1` 在 `2f28df1` 的冲突治理基础上关闭开发依赖 high 风险，并把 movement stress/replay 场景升级为不依赖平台三角函数末位差异的版本 2。其 clean build ID 为 `arena-a71ecc1c0493-product`，Web/微信/抖音 Manifest hash 分别为 `cc188290`、`35499189`、`c427e65f`。

## main 新增能力承接

| main 的治理主题 | Arena 当前承接 | 裁决 |
| --- | --- | --- |
| strict TypeScript 模块化单体 | 53 个 manifest、完整 workspace 构建、受维护 JavaScript 为 0 | 治理目标已超集承接，不引入旧 `gameplay`/`jump-engine` 产品包 |
| 固定步长、确定性与 Replay | Arena MatchCore、整数 tick、具名随机流、Replay V5、黄金 manifest `a53b401d` | 使用 Arena 权威链，不保留数值跳台规则；跨平台方向离散化见 ADR-041 |
| 难度与本地对手 | 受限 Bot Observation、easy/normal/hard 隐藏档、确定性 Matchmaking | 使用 Arena Bot；不暴露旧产品难度选择 |
| 注册表与内容扩展 | Action/Character/Equipment/Map/Bot/Profile/Presentation Definition 与只读 Registry | 已按 Rule → Core → Bot → Presentation 承接 |
| 存档、迁移与诊断 | Profile schema、A/B slot、CAS、lease/holder fencing、未来 schema fail closed | Arena 实现更完整；用户已确认无旧真实数据迁移 |
| Renderer/反馈/资源生命周期 | Presentation Runtime、Three Surface、Audio、context loss、迟到资源与幂等清理 | 已承接，不引入旧 renderer/runtime |
| 多端构建与预算 | Web/微信/抖音唯一 Product、clean Manifest、包体/资产预算和产物边界 | 已承接 |
| CI、CODEOWNERS、文档与发布治理 | 完整 Action SHA、`@AllenZhangJ`、Dependabot、供应链/secret/资产/文档门禁 | 已承接；`main` 保护已在 GitHub 服务端写入并回读 |

因此，`main` 的治理思想已经逐项审计并承接适用部分，但其具体代码、旧产品文档、旧入口、旧配置、旧基线和旧资产审计没有进入 Arena 生产树。52 个文件的逐项裁决、已吸收能力和实际集成结果见 [冲突处置矩阵](arena-main-conflict-disposition.md)。

## 虚拟合并冲突

只读、rename-aware 的 `git merge-tree --write-tree --name-only origin/main HEAD` 在以下 52 个文件发现冲突：

```text
.github/CODEOWNERS
.github/workflows/ci.yml
.gitignore
AGENTS.md
README.md
docs/architecture.md
docs/gameplay-rules.md
docs/platform-checklist.md
eslint.config.ts
package-lock.json
package.json
packages/application/src/bootstrap.ts
packages/application/test/number-strategy-game.test.ts
packages/gameplay/test/game-state.test.ts
packages/gameplay/test/operations.test.ts
packages/jump-engine/src/geometry.ts
packages/jump-engine/src/rng.ts
packages/jump-engine/test/physics.test.ts
packages/jump-engine/test/world-state.test.ts
packages/platform/src/douyin.ts
packages/platform/src/mini-game.ts
packages/platform/src/platform-contract.ts
packages/platform/src/web.ts
packages/platform/src/wechat.ts
packages/platform/test/platform.test.ts
packages/renderer-three/src/camera-rig.ts
packages/renderer-three/src/character-rig.ts
packages/renderer-three/src/constants.ts
packages/renderer-three/src/dispose.ts
packages/renderer-three/src/effects/particle-burst.ts
packages/renderer-three/src/effects/tail-trail.ts
packages/renderer-three/src/hud/hud-scene.ts
packages/renderer-three/src/lighting-rig.ts
packages/renderer-three/src/platform-mesh-factory.ts
packages/renderer-three/src/platform-view-registry.ts
packages/renderer-three/src/renderer3d.ts
packages/renderer-three/src/stage.ts
packages/renderer-three/src/texture-manager.ts
packages/renderer-three/test/renderer-three.test.ts
scripts/build.ts
src/entry/douyin.ts
src/entry/launch-game.ts
src/entry/mini-game-startup-fallback.ts
src/entry/web-startup-fallback.ts
src/entry/web.ts
src/entry/wechat.ts
tests/architecture.test.ts
tests/entry-lifecycle.test.ts
tsconfig.app.json
tsconfig.base.json
tsconfig.json
vitest.config.ts
```

其中 `docs/architecture.md`、`docs/gameplay-rules.md`、旧 `application/gameplay/jump-engine/platform/renderer-three` 产品包及旧启动辅助的最终裁决是保持删除；入口、构建、配置和根 manifest 以 Arena 为产品真值；ESLint、公开命令前置构建与启动失败测试已把 `main` 的适用治理意图重新表达为 Arena 实现。它们仍不能按文本相似度或 rename 猜测自动裁决。

## 集成候选验证

- 在 clean merge commit `b4faa2c` 上，项目 `audit=false`，公开 `npm run check` 通过：52 个 workspace 包按 11 个依赖波次构建，61 个 Vitest 文件、387 项测试通过。
- 全量 Node TypeScript 测试：88 个文件、706/706 通过。审计先后修复了旧入口空跑 0 项、干净安装时内部包 `dist` 缺失、Git 不保存已迁移空目录导致的 12 项架构假失败，以及两个未承接的启动边界场景；门禁现拒绝空测试集、依赖图环和公开命令构建顺序回退。
- 黄金 Replay：manifest `a53b401d`，4 个场景通过；movement 场景版本 2 的 replay/final hash 为 `8673e0bf / e560dd88`，其余三组保持不变。
- 输入 fuzz：120 场、120 个唯一 final hash、6 次 Replay 复验。
- 生命周期专项：104/104；Presentation/Product soak 各 100 场，无帧、监听、Canvas 或输入所有权残留，堆增长低于 8 MiB。
- 正式资产：Bundle `e03ff2b4`；预算 `82a8b378`；3 个来源、10 个运行时产物和 3 个正式 GLTF Definition 已由 Allen 批准。
- 三端 clean build：build ID `arena-b4faa2c8f1af-product`，默认入口均为 Product，`sourceDirty=false`，产物边界和预算通过；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`。除 `arena-build-manifest.json` 中随 Git 身份变化的 commit/buildId 外，三端构建与已验收基线逐文件相同。
- Allen 已确认完成 iPhone 13 Pro / iOS 26 / Google Chrome 真机验收。集成候选的产品交付字节与该验收基线相同，因此验收结论可继承；本机 Chrome 390×844 结果只作为自动化补充，不冒充真机记录。
- Allen 已于 2026-07-24 授权 npm 审计元数据外发。初次全依赖审计定位到开发工具链 `@gltf-transform/functions → ndarray-pixels → sharp@0.34.5` 的 3 个 high；未使用 `audit fix --force`，而是以根级精确 override 将 `sharp` 固定到 `0.35.3` 并加入 Node `>=20.9.0` 和供应链回归。修复后的 `npm audit --audit-level=high` 与 `npm audit --omit=dev --audit-level=high` 均为 0 vulnerabilities。

## GitHub 服务端状态

- 候选 `af410da` 的 Linux CI [30070748191](https://github.com/AllenZhangJ/web-games-jumbo/actions/runs/30070748191) 暴露 movement 场景使用 `atan2/sin/cos` 产生跨平台末位差异；精确 Replay 在 Linux 可重放，差异只在场景输入再生成。ADR-041 采用固定有理方向表和量化点积选择，候选 `a71ecc1` 的 Linux CI [30072120655](https://github.com/AllenZhangJ/web-games-jumbo/actions/runs/30072120655) 已于 2026-07-24 成功，`quality` 用时 7 分 43 秒。
- 双父集成提交 `b4faa2c8f1af59605a95281948406376cb442ea6` 的 Linux CI [30075683221](https://github.com/AllenZhangJ/web-games-jumbo/actions/runs/30075683221) 已于 2026-07-24 成功；run 从 `07:30:22Z` 到 `07:37:46Z`，精确 `head_sha`、提交 tree 与本地审计一致。
- 最终候选 `36b995949ca04f36d85de8d3db2bb594f554670e` 的分支 CI [30076325560](https://github.com/AllenZhangJ/web-games-jumbo/actions/runs/30076325560) 和 PR 上下文 CI [30078837950](https://github.com/AllenZhangJ/web-games-jumbo/actions/runs/30078837950) 均成功。合并前 GitHub 回读 PR 为 `CLEAN / MERGEABLE`，审查线程为 0。
- PR #1 以普通 merge commit 合入后，GitHub 签名提交为 `8ab707ba52d925268e19fbe8c00be763cd6bec31`，其 [main CI 30079353044](https://github.com/AllenZhangJ/web-games-jumbo/actions/runs/30079353044) 对精确 SHA 成功；合并提交树与候选树相同。
- GitHub owner 身份已回读为 `AllenZhangJ`。classic `main` protection 已启用：PR-only、严格且要求分支最新的 `quality`、对话必须解决、禁止 force push 和删除；唯一负责人模式下审批数为 0、不要求 CODEOWNERS 自批，管理员保留紧急通道。分支端点回读为 `protected: true`。

## 当前阻断与边界

1. **代码合并：已完成。** 目标手机验收、实际冲突处置、本地统一全门、三端产物等价、PR 保护检查和合并后 main CI 均已完成。
2. **发布而非代码合并的外部门禁：仍有。** 微信/抖音 iOS 与 Android 真机材料尚未完成，所以本报告只给出可合并结论，不宣称可正式发布。
3. **GitHub 身份：已恢复。** 旧 CLI 缓存令牌曾失效；Allen 已通过 GitHub 官方设备授权重新登录，随后完成 PR 创建和受保护合并。该历史认证问题未改变候选内容或服务端保护。
