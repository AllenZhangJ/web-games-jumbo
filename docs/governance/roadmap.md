# 项目治理路线图

## 决策基线

以下决策已经由项目负责人确认：

1. 当前仓库只服务“数域跃迁”，内部采用 npm workspaces。
2. 使用渐进式迁移，每个批次保持可构建、可运行、可回滚。
3. 新模块直接使用 TypeScript；第四批结束全面 TypeScript，不保留旧业务 JS。
4. P0–P8 冻结现有玩法、碰撞和手感。
5. 内置 easy/normal/hard，治理首版只开放 normal。
6. workspace 包全部 private，不发布 npm。
7. Web 用于日常快速验收，三端始终保持构建，里程碑做小游戏真机验收。
8. 角色、场景和声音优先原创或程序化，并记录许可证。
9. 声音与震动默认开启，可分别关闭并本地保存。
10. 只做版本化本地存档，不建设云服务，不采集个人信息。

## 第 0 批：文档和事实基线

目标：任何新参与者可以从文档理解项目是什么、目录做什么、主流程如何运行、当前有哪些证据和缺口，以及每批如何验收提交。

交付：

- 项目文档索引。
- 项目概览。
- 当前仓库结构和模块目录。
- 启动、输入、固定步长、跳跃事务和生命周期说明。
- 测试与发布说明。
- 完整治理路线图、状态页和批次清单。
- ADR-004。
- 项目贡献和 Agent 工作规则。

第 0 批不改变游戏行为和运行代码。

## 第一批 P0–P2：基线、契约和难度

### P0 基线冻结

- 固化当前 seed、回放、截图、包体和性能基线。
- 建立治理期间的行为兼容检查。

### P1 契约与 workspace

- 建立 npm workspaces。
- 新增 Command、Event、Snapshot 和小型 Port。
- 建立 Gameplay、Task、Character 注册契约。
- 入口层成为唯一组合根。

### P2 难度版本化

- 拆分领域、物理和表现配置。
- 建立 easy/normal/hard Schema、版本和构建校验。
- 每个难度执行大样本可解性验证。

TypeScript 节点：`packages/game-contracts`、`packages/difficulty` 和新测试使用严格 TS；全部现有 `src/**/*.js` 进入 `allowJs + checkJs` 门禁，不用 `@ts-nocheck` 掩盖错误。

## 第二批 P3–P5：玩法内核

### P3 Jump Engine

- 提取 RNG、几何、蓄力、轨迹、碰撞和 WorldState。
- Node 环境独立运行，不依赖 Three/DOM/平台。

### P4 Gameplay 与 Task

- 提取数值运算、目标、回合、胜负和求解器。
- 建立 GameplayRegistry、TaskRegistry 和契约测试。
- 使用测试夹具证明可注册 5 个玩法和 5 个任务。

### P5 Application

- 将 637 行 Runtime 拆成 Session、CommandHandler、Lifecycle、Clock、EventCollector 和 SnapshotFactory。
- Renderer、Feedback、Storage、Input 通过端口注入。

TypeScript 节点：Core、Runtime、Difficulty、Gameplay、Task、Jump Engine 及其测试全部 TS，删除对应 JS 旧实现。

## 第三批 P6–P8：表现和内容

### P6 Three Renderer

- 通过 RendererPort 消费快照和事件。
- 拆分 World、HUD、Camera、Resource 和 Context Lifecycle。

### P7 场景和角色

- 场景改为版本化 SceneDefinition。
- 角色改为版本化 CharacterDefinition 和 Manifest。
- 使用测试 Manifest 证明 10 个角色可注册、切换、回退和销毁。

### P8 声音与震动

- 由 GameEvent 驱动 FeedbackController。
- 声音和震动分别通过小型 Port 实现。
- 支持设置持久化和平台静默降级。

TypeScript 节点：Renderer、Scene、Character、Feedback 及测试全部 TS。

## 第四批 P9–P10：生产治理

### P9 存档和回放

- 版本化 SaveEnvelope。
- 存档校验、迁移、回放和诊断导出。
- 支持当前与前两个正式版本迁移 fixture。

### P10 全面 TypeScript 与门禁

- 迁移平台适配器、入口、构建脚本和全部测试工具。
- 删除 `allowJs/checkJs` 和所有旧 JS 兼容层。
- `apps/`、`packages/`、`tools/`、`tests/`、`src/` 人工维护 `.js` 数量为 0。
- 强制 strict TypeScript、lint、覆盖率、依赖边界、三端构建、资源与许可证检查。
- 建立 CI、分支保护、CODEOWNERS、CHANGELOG 和发布清单。

### 全面 TypeScript 的不可延期节点

| 批次结束点 | 必须达到的迁移状态 |
|---|---|
| 第一批 | 新 workspace 包为 strict TS；全部旧 `src` JS 由 `allowJs/checkJs` 检查。 |
| 第二批 | Core、Runtime、Difficulty、Gameplay、Task、Jump Engine 及对应测试不再保留 JS 实现。 |
| 第三批 | Renderer、Scene、Character、Feedback 及对应测试不再保留 JS 实现。 |
| 第四批 | 平台适配器、入口、构建工具、测试和剩余配置全部迁移；删除 `tsconfig.legacy.json`、`allowJs/checkJs` 和兼容导出。 |
| 第四批门禁 | `apps/`、`packages/`、`tools/`、`tests/`、`src/` 人工维护 `.js` 文件数必须为 0；发现 1 个即失败。 |

因此“渐进迁移”只描述中间批次，不允许成为第四批后继续保留旧代码的理由。

## 最终终验

第四批提交推送后进行独立终验：全量测试、1000 会话、难度可解性、Web 主流程/生命周期、三端构建、资源 soak、存档迁移、扩展注册证明和游戏验收。任何阻断问题必须修复、复测、更新文档并追加中文提交。

## 非交付范围

- 治理本身不等于立即制作 5 个正式玩法、5 个正式任务和 10 个正式美术角色。
- 不建设账号、排行榜、云存档或后端服务。
- 不在 P0–P8 借治理名义调整游戏平衡。
