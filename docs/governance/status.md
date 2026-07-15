# 当前治理状态

更新时间：2026-07-15

当前分支：`governance/batch-2-core`

## 批次状态

| 批次 | 状态 | 当前事实 |
|---|---|---|
| 第 0 批：文档基线 | 已完成 | 远端收口 `eae92d1`，标签 `governance-b0`。 |
| 第一批 P0–P2 | 已完成 | 远端收口 `2844c1e`，标签 `governance-b1`。 |
| 第二批 P3–P5 | 验证通过，待远端收口 | Jump Engine、Gameplay/Task、Application 已迁移并通过 114 项测试、三端构建和手机尺寸浏览器验收；尚需中文提交、推送、远端哈希确认和标签。 |
| 第三批 P6–P8 | 未开始 | Renderer、场景、角色与反馈仍待治理。 |
| 第四批 P9–P10 | 未开始 | 存档/回放、全面 TS、覆盖率和 CI 尚未完成。 |
| 最终终验 | 未开始 | 只能在第四批推送后独立执行。 |

## 第二批已实现事实

- 新增 private strict TypeScript 包：`jump-engine`、`gameplay`、`application`。
- RNG、几何、蓄力/轨迹/碰撞、WorldState 已从 `src/core` 迁入 Jump Engine；旧 JS 删除。
- 数值运算、求解、GameState、GameplayRegistry、TaskRegistry 已迁入 Gameplay；旧 JS 删除。
- Runtime 已拆为 GameSession、CommandHandler、FixedStepClock、LifecycleController、EventCollector、SnapshotFactory 和 NumberStrategyGame；`src/runtime` 旧 JS 删除。
- 入口 `launchGame` 只接受注入的 `createGame`；`compose-game.js` 是 Application、Renderer 与平台的唯一具体组合根。
- Renderer 端口每帧消费只读 GameSnapshot 与一次性 GameEvent；Feedback 和 Storage 通过端口注入。
- GameSession 实际按注入 `gameplayId`/`taskId` 选择注册定义，验证支持关系和配置，并在落地阶段评估任务。
- 注册表 fixture 证明至少 5 个玩法和 5 个任务可静态注册；这不等于已交付 5 个正式玩法/任务。
- normal@1 的固定 seed、完整回放、碰撞和视觉基线保持不变；P0–P8 行为冻结未被有意调整。

## 第二批验证证据

- `npm run lint`：通过。
- `npm run typecheck`：workspace 源码 strict、TS 测试类型检查、剩余 JS checkJs 均通过。
- Node 兼容/集成：52/52；workspace Vitest：62/62；总计 114/114。
- 三档难度各 10,000 seed（共 30,000）均在实际候选和步数约束内可解。
- Web、微信、抖音构建通过；Web JS 632,864 bytes，Vite 报告 gzip 165.55 kB。
- 390×844 浏览器：单 Canvas 满屏、页面 `user-select: none`、失败重开、左右按钮各一次真实长按成功落地、连续回合和镜头过渡通过。
- 浏览器 console error/warn 为 0。
- `npm audit`：0 个已知漏洞；`git diff --check`：通过。

## 当前 TypeScript 迁移事实

- 已完成 strict TS 源码：Contracts、Difficulty、Jump Engine、Gameplay、Task、Application。
- 已删除旧实现：`src/core/**/*.js`、`src/runtime/**/*.js` 及其根级 JS 单元测试副本。
- 尚余 27 个 `src/**/*.js`（Renderer、平台、入口和配置）、8 个 `tests/*.js`、1 个 `scripts/build.mjs`。
- package 测试文件已经是 `.ts`，但 `tsconfig.tests.json` 当前为过渡非 strict 配置；这是明确技术债，不得在第四批后保留。
- 第三批必须迁移 Renderer/Scene/Character/Feedback 及测试。
- 第四批必须迁移平台、入口、构建工具、全部剩余测试和配置，删除 `tsconfig.legacy.json`、`allowJs/checkJs` 及过渡非 strict 测试配置，并启用零 JS 门禁。

## 明确未完成

- SceneDefinition、CharacterRegistry、10 角色 Manifest 容量与回退/销毁测试。
- FeedbackController、声音/震动独立设置和本地持久化。
- SaveEnvelope、存档迁移、回放和诊断导出。
- Renderer 内部分层与 WebGL 资源完整恢复。
- 覆盖率阈值、资源审计、CI、CODEOWNERS、CHANGELOG 和分支保护。
- 1000 完整会话 soak 和 100 局资源有界测试。
- 全面 strict TypeScript 和人工维护 `.js` 为 0。

## 当前不明确或证据不足

- 微信与抖音 iOS/Android 当前构建的 WebGL2、触摸、安全区、音频和前后台表现。
- Web pagehide/pageshow、真实 visibilitychange 与 WebGL context lost/restored 的完整端到端证据。
- 低端真机持续运行的帧率、内存、发热和 GPU 资源上限。
- 当前测试的真实行/分支覆盖率。
- 正式声音和角色资源的最终版权与发行许可。
- 新的完全不同交互模型是否复用当前 NumberStrategyGame；当前承诺是同一跳跃应用族可注册扩展，其他应用族可复用契约并拥有独立 Application。

## 状态维护规则

- 只有远端分支哈希确认后，本批才能从“待远端收口”改为“已完成”。
- 未完成和不明确项不能因接口或计划存在而改成完成。
- 每批完成实现审计、问题修复、文档校准、中文提交与推送后，才进入下一批。
