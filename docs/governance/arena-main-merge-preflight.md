# Arena 与最新 main 合并前独立审计

## 结论

当前结论是 **不可直接合并**。这不表示 Arena 治理路线失败，而是说明最新 `main` 与审计候选已经形成两个互斥产品方向：`main` 的 12 个新增提交继续治理已退役的数值跳台，当前治理分支的 439 个新增提交把 Arena 建成唯一生产产品并记录本审计。普通自动合并会在入口、构建、配置、测试和治理真值上重新引入旧实现。

本审计没有执行 merge、rebase、修改 `main` 或 force push。后续只有在所有阻断关闭后，才能单独批准一次“保留 Arena 产品树、显式处置 23 个冲突”的集成提交；不能用无审计的整树 `ours`、`theirs` 或逐文件猜测解决。

## 审计身份

| 项目 | 值 |
| --- | --- |
| 审计日期 | 2026-07-23 |
| 最新远端 main | `4c340f1c5bc00dcae712c2261462661d842339da` |
| 共同祖先 | `d53e7349ff718b3fa0638af197e8f7c43d190b38` |
| 治理代码候选 | `3b81f238efecbed9fe69917abd9f3876c9dfde35` |
| main 独有非 merge 提交 | 12 |
| 治理分支独有提交（含本审计文档提交） | 439 |
| 文本虚拟合并冲突 | 23 个文件 |

候选 `3b81f23` 只修复 clean checkout 下 workspace 构建顺序和已迁移空目录测试语义；Arena 生产字节相对前一候选未变化。其 clean build ID 为 `arena-3b81f238efec-product`，Web/微信/抖音 Manifest hash 分别为 `05091eb7`、`d5172814`、`423e9fc6`。

## main 新增能力承接

| main 的治理主题 | Arena 当前承接 | 裁决 |
| --- | --- | --- |
| strict TypeScript 模块化单体 | 53 个 manifest、完整 workspace 构建、受维护 JavaScript 为 0 | 治理目标已超集承接，不引入旧 `gameplay`/`jump-engine` 产品包 |
| 固定步长、确定性与 Replay | Arena MatchCore、整数 tick、具名随机流、Replay V5、黄金 manifest `0dace228` | 使用 Arena 权威链，不保留数值跳台规则 |
| 难度与本地对手 | 受限 Bot Observation、easy/normal/hard 隐藏档、确定性 Matchmaking | 使用 Arena Bot；不暴露旧产品难度选择 |
| 注册表与内容扩展 | Action/Character/Equipment/Map/Bot/Profile/Presentation Definition 与只读 Registry | 已按 Rule → Core → Bot → Presentation 承接 |
| 存档、迁移与诊断 | Profile schema、A/B slot、CAS、lease/holder fencing、未来 schema fail closed | Arena 实现更完整；用户已确认无旧真实数据迁移 |
| Renderer/反馈/资源生命周期 | Presentation Runtime、Three Surface、Audio、context loss、迟到资源与幂等清理 | 已承接，不引入旧 renderer/runtime |
| 多端构建与预算 | Web/微信/抖音唯一 Product、clean Manifest、包体/资产预算和产物边界 | 已承接 |
| CI、CODEOWNERS、文档与发布治理 | 完整 Action SHA、`@AllenZhangJ`、Dependabot、供应链/secret/资产/文档门禁 | 已承接；远端分支保护仍需在 GitHub 服务端单独确认 |

因此，`main` 的治理思想没有遗漏，但其具体代码、旧产品文档、旧入口、旧配置、旧基线和旧资产审计不能进入 Arena 生产树。

## 虚拟合并冲突

只读 `git merge-tree` 在以下 23 个文件发现冲突：

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
index.html
package-lock.json
package.json
scripts/build.ts
src/config.ts
src/entry/douyin.ts
src/entry/web.ts
src/entry/wechat.ts
tests/architecture.test.ts
tests/entry-lifecycle.test.ts
tsconfig.app.json
tsconfig.base.json
tsconfig.json
vitest.config.ts
```

其中 `docs/architecture.md`、`docs/gameplay-rules.md` 是“当前分支已删除、main 继续修改”的产品真值冲突；入口、构建、配置和根 manifest 是生产主流程冲突；其余是治理体系冲突。它们不能按文本相似度自动裁决。

## 候选验证

- 在第二个无历史 `dist`/`.tsbuildinfo` 的隔离克隆中，`npm ci --ignore-scripts` 后的 `check:governance` 全量通过：52 个 workspace 包按 11 个依赖波次构建，61 个 Vitest 文件、385 项测试通过；语句/行 `59.99%`、分支 `64.18%`、函数 `64.29%`。
- 全量 Node TypeScript 测试：88 个文件、704/704 通过。审计先后修复了旧入口空跑 0 项、干净安装时内部包 `dist` 缺失，以及 Git 不保存已迁移空目录导致的 12 项架构假失败；门禁现拒绝空测试集、依赖图环和构建顺序回退。
- 黄金 Replay：manifest `0dace228`，4 个场景通过。
- 输入 fuzz：120 场、120 个唯一 final hash、6 次 Replay 复验。
- 生命周期专项：104/104；Presentation/Product soak 各 100 场，无帧、监听、Canvas 或输入所有权残留，堆增长低于 8 MiB。
- 正式资产：Bundle `e03ff2b4`；预算 `82a8b378`；3 个来源、10 个运行时产物和 3 个正式 GLTF Definition 已由 Allen 批准。
- 三端 clean build：默认入口均为 Product，`sourceDirty=false`，产物边界和预算通过；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`。
- Chrome 390×844 移动视口：首页、开始匹配、攻击和跳跃均可操作；攻击帧出现武器动作/命中特效，跳起后切换为空中攻击；无横向溢出、alert、warning 或 error。本记录是桌面 Chrome 移动视口，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机结果。

## GitHub 服务端状态

- 当前分支没有 Pull Request，仓库 rulesets API 返回空集；classic `main` branch protection 由于本机 `gh` 凭证失效而无法认证复验，不得假定已开启。
- 截至审计时，最新已推送候选 `3fd4be5` 的 GitHub Actions 运行 [30002587702](https://github.com/AllenZhangJ/web-games-jumbo/actions/runs/30002587702) 失败。本地已在隔离克隆中复现并修复 clean-install 根因，但修复候选 `3b81f23` 尚未推送，因此不得将本地通过写成远端 CI 通过。

## 当前阻断与关闭条件

1. **联网依赖审计**：`npm audit --omit=dev --audit-level=high` 会向 npm 服务发送依赖元数据，尚未得到 Allen 对该外发的明确授权；不能沿用旧结果或跳过后宣称全门通过。
2. **GitHub CI 与分支保护**：必须推送修复候选并获得该精确 commit 的 GitHub Actions 绿灯；同时用有效 owner 认证确认 `main` 所需检查与保护规则。
3. **目标手机验收**：仍需 Allen 在 iPhone 13 Pro、iOS 26、Google Chrome 上验收最终候选。桌面 390×844 只能作为预检。
4. **冲突处置授权**：23 个冲突必须通过一次独立集成批次显式保留 Arena、拒绝旧产品回流，并在解决后重新执行完整门禁；本审计批次明确禁止实际合并。
5. **发布而非代码合并的外部门禁**：微信/抖音 iOS 与 Android 真机材料仍未完成，所以即使未来代码可合并，也不能宣称可正式发布。

关闭 1～4 后才可重新给出“可合并”结论；关闭 5 后才可给出“可发布”结论。
