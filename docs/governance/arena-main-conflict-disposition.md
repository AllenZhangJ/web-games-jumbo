# Arena 与 main 冲突处置矩阵

## 适用范围

本矩阵绑定：

- Arena 代码候选：`2f28df1bc7082d5ca1759f4c14547e6277ce4d68`
- 最新审计基准：`origin/main@4c340f1c5bc00dcae712c2261462661d842339da`
- 共同祖先：`d53e7349ff718b3fa0638af197e8f7c43d190b38`
- 只读虚拟合并结果：23 个文本冲突

本文件只规定未来集成批次如何处置冲突，不授权也不执行 merge、rebase、修改 `main` 或 force push。目标不是让 Git “没有冲突”，而是在不恢复旧数值跳台的前提下承接 `main` 的治理意图。

## 处置原则

处置分为四类：

- **保留 Arena**：文件的生产语义必须以 Arena 为准；不能选入旧产品入口、规则、资源或测试。
- **吸收治理意图**：把 `main` 中仍适用于 Arena 的安全、质量或生命周期要求重新表达为 Arena 代码和门禁。
- **保持删除**：文件属于退役产品，冲突解决结果必须仍不存在，并由产品边界检查保护。
- **重新生成**：锁文件等派生产物不手工拼接，先完成 manifest 裁决，再用固定工具链生成并复验。

禁止对 23 个文件整体使用 `ours` 或 `theirs`。即使某一行的最终字节等于 Arena 版本，也必须按下表留下裁决记录。

## 逐文件裁决

| 文件 | `main` 中仍有效的意图 | 最终处置 | 集成时动作与验证 |
| --- | --- | --- | --- |
| `.github/CODEOWNERS` | 关键代码有明确所有者 | 保留 Arena | 保留唯一负责人 `@AllenZhangJ` 和 Arena/治理路径；运行 repository policy 与文档检查。 |
| `.github/workflows/ci.yml` | 干净安装后执行统一质量门 | 保留 Arena并吸收意图 | 保留完整 Action SHA、`feature/**`、30 分钟超时、`npm ci --ignore-scripts --no-audit` 和 `npm run check`；不得恢复浮动 Action 或安装隐式审计。 |
| `.gitignore` | 忽略依赖、构建、覆盖率、日志和 TS 增量产物 | 规范合成 | 两侧语义相同，仅保留一份规范列表；验证没有忽略治理证据或生产源码。 |
| `AGENTS.md` | 模块边界和实现顺序受约束 | 保留 Arena | 保留 Rule → Core → Bot → Presentation、确定性和生命周期约束；不恢复旧数值跳台规则。 |
| `README.md` | 新克隆可安装、开发、测试和构建 | 保留 Arena并吸收意图 | 保留 Arena 唯一产品说明；已用 `predev`、`predev:lan`、`pretest`、`prepreview:lan` 承接干净环境入口，文档继续使用无隐式审计安装命令。 |
| `docs/architecture.md` | 记录旧产品架构 | 保持删除 | Arena 架构由 `docs/architecture/` 和 ADR-030～040 表达；不得恢复同名旧产品真值。 |
| `docs/gameplay-rules.md` | 记录旧数值跳台规则 | 保持删除 | Arena 规则只由 `docs/gameplay/arena-v1-rules.md` 和版本化 Definition 表达。 |
| `docs/platform-checklist.md` | 自动化、浏览器和真机证据分离 | 保留 Arena并吸收意图 | 保留 iPhone 13 Pro/iOS 26/Chrome 与微信/抖音当前清单；不导入旧 v3 勾选项、旧地址或旧 build。 |
| `eslint.config.ts` | 包代码禁止显式 `any`，类型导入一致 | 吸收治理意图 | 候选已对全部 `packages/**/*.ts` 启用两条 error 规则并修正 3 个存量导入；集成后运行全量 lint。 |
| `index.html` | Web 生产入口可访问且仅挂载一个游戏 | 保留 Arena | 保留 Arena Product 页面和入口；不得恢复旧跳台 DOM、按钮或文案。 |
| `package-lock.json` | 锁定完整依赖图 | 重新生成 | 先裁决 `package.json`，再以项目固定 npm/lockfile V3 生成；检查精确 semver、registry、integrity、53 个 manifest 和 366 个外部锁定包。不得手工拼接冲突块。 |
| `package.json` | workspace 构建、入口前置构建、测试、审计和三端构建 | 手工合成，Arena 为产品真值 | 保留 52 个 Arena 包、唯一显式 `audit:dependencies` 和统一 `check`；候选已恢复干净环境生命周期脚本。不得恢复旧产品包或旧测试/构建命令。 |
| `scripts/build.ts` | Web/微信/抖音可复现构建 | 保留 Arena | 保留唯一 Product 入口、Manifest、clean-source、预算和生产产物边界；不得打包旧产品或开发入口。 |
| `src/config.ts` | 旧跳台屏幕、规则、颜色和跳跃参数 | 保持删除 | 候选已删除该零引用魔法数文件并加入 16 个退役路径门禁；Arena 数值仅由版本化 tuning/Definition 管理。 |
| `src/entry/douyin.ts` | 抖音启动失败可见且生命周期可清理 | 保留 Arena | 保留 Arena Product 组合、平台注入和启动协调器；运行小游戏 bundle、启动失败和销毁竞态测试。 |
| `src/entry/web.ts` | Web 启动、错误兜底、导航/HMR 清理 | 保留 Arena并吸收意图 | 保留 Arena Product；候选已补回无效工厂、可选回调和损坏宿主兜底用例。 |
| `src/entry/wechat.ts` | 微信启动失败可见且生命周期可清理 | 保留 Arena | 保留 Arena Product 组合、平台注入和启动协调器；运行小游戏 bundle、启动失败和销毁竞态测试。 |
| `tests/architecture.test.ts` | 平台隔离和核心无宿主依赖 | 保留 Arena | 保留 Arena 52 包依赖方向、迁移路径和证据边界测试；不恢复针对旧包名的断言。 |
| `tests/entry-lifecycle.test.ts` | 启动失败、竞态、可选回调和兜底失效均不阻断主流程 | 吸收治理意图 | 候选已把 `main` 缺失的两组边界场景迁成 Arena 测试，当前 8/8 通过；未来以 Arena 启动协调器为被测对象。 |
| `tsconfig.app.json` | 应用入口 strict TypeScript | 保留 Arena | 保留 Arena 入口、脚本与当前应用边界；不把旧产品源文件重新纳入。 |
| `tsconfig.base.json` | 全仓严格编译基础 | 保留 Arena | 保留当前 strict、module resolution 和包级构建约束；通过 52 包拓扑构建验证。 |
| `tsconfig.json` | workspace 引用完整且无环 | 保留 Arena | 保留 52 个 Arena project reference；实际构建顺序由 manifest 依赖图推导并拒绝缺包、重名和环。 |
| `vitest.config.ts` | 覆盖率必须失败关闭 | 保留 Arena并吸收意图 | 保留 Arena 分层阈值和 61 个文件范围。旧产品全局 80% 数字不直接移植；核心包采用更高分层阈值，整体阈值覆盖 52 包未完全单测的组合层，不能靠删测试抬高。 |

## 已在候选中提前吸收的 `main` 意图

代码候选 `2f28df1` 已完成以下不需要等待实际合并的修正：

1. 对全部 Arena 包启用 `consistent-type-imports` 与 `no-explicit-any`，存量代码零违规。
2. 恢复 `dev`、`dev:lan`、`test` 的 workspace 前置构建，以及 `preview:lan` 的生产前置构建；供应链门禁阻止回退。
3. 将 `main` 中两组仍有效的启动失败边界场景迁入 Arena 生命周期测试。
4. 删除零引用的旧 `src/config.ts`，并将其纳入 Arena 唯一产品退役路径门禁。

这些是学习和承接治理意图，不是复制或恢复旧玩法实现。

## 未来集成批次的执行顺序

1. 再次 fetch，并确认 `origin/main` 仍是本矩阵绑定的 SHA；若变化，先重做虚拟合并和矩阵差异审计。
2. 从干净的 Arena 候选创建专用集成分支；只执行一次普通 merge，不使用整树策略覆盖。
3. 按矩阵逐文件解决；每个冲突在集成记录中标记对应行。
4. 删除项必须保持不存在；manifest 裁决完成后重新生成锁文件，不手改锁文件。
5. 先运行 lint、typecheck、产品/供应链/文档/架构门禁，再运行完整非联网测试、Replay、fuzz、生命周期、soak、三端 clean build 和预算。
6. 获得 Allen 对依赖元数据外发的明确授权后，才运行唯一显式 npm 漏洞审计。
7. 推送精确集成候选，等待 GitHub Actions 绿灯并核对 `main` 保护规则。
8. 在同一 clean 候选上完成 iPhone 13 Pro/iOS 26/Chrome 验收；只在全部代码合并阻断关闭后给出“可合并”结论。

## 集成后必须保持的否定断言

- 旧数值跳台源码、入口、配置、规则、截图和产品文档没有回流。
- Arena 任意距离挥空、动作/武器、地图、输入、确定性 Replay 和 Profile schema 没有回退。
- 权威层没有新增 Three.js、DOM、宿主 API、墙钟或未注入随机依赖。
- 安装阶段没有隐式 npm audit，完整门只调用一次显式审计。
- 没有用降低画质、动作数、关节数或删除测试换取性能和覆盖率结果。
- 未完成的目标手机与小游戏真机材料仍标记为未完成，不由桌面或模拟器结果代替。
