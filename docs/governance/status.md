# 当前治理状态

更新时间：2026-07-15

当前分支：`governance/batch-1-foundation`

## 批次状态

| 批次 | 状态 | 当前事实 |
|---|---|---|
| 第 0 批：文档基线 | 已完成 | 文档、自动化和浏览器验收通过；远端收口提交 `eae92d1`，标签 `governance-b0`。 |
| 第一批 P0–P2 | 已完成 | P0 基线、private workspaces、TS 契约、三档难度和累积门禁已实现；远端实现提交 `f8685ae` 已确认。 |
| 第二批 P3–P5 | 未开始 | Core/Runtime 仍在原 `src` 结构。 |
| 第三批 P6–P8 | 未开始 | Renderer、场景、角色和反馈仍为具体实现。 |
| 第四批 P9–P10 | 未开始 | 尚无存档/回放；源码仍为 JavaScript。 |
| 最终终验 | 未开始 | 只能在第四批推送后执行。 |

## 第 0 批基线证据

- 起点提交：`d53e7349ff718b3fa0638af197e8f7c43d190b38`。
- Node：项目要求 20 或更高版本。
- 依赖安装：成功，审计 0 个已知漏洞。
- 起点自动化测试：87/87 通过。
- 当前自动化测试：89/89 通过（新增文档链接和权威入口检查）。
- Web 构建：通过。
- 微信构建：通过。
- 抖音构建：通过。
- Web JS 基线：约 612.73 kB，gzip 约 160.33 kB，含 Three.js。
- 390×844 浏览器首屏、左右长按、失败后重开：通过。
- frozen→active 后 Canvas 保留且可继续交互；浏览器 warning/error 为 0。

## 第一批当前证据

- 远端分支 `governance/batch-1-foundation` 与本地实现提交一致：`f8685ae83763404aff0e4d2df28bdc2447d20776`。
- `@number-strategy/game-contracts` 和 `@number-strategy/difficulty` 为 private strict TypeScript workspace 包。
- Command、Event、Snapshot、Renderer/Feedback/Storage/Clock Port，以及 Gameplay、Task、Character 版本化契约已建立；具体注册表按路线图在第二/三批实现。
- `easy@1`、`normal@1`、`hard@1` 均通过运行时 Schema 校验和不可变注册；当前只开放 `normal@1`。
- 三档难度各 10,000 seed（共 30,000）均沿实际候选在步数内获胜。
- v0.1.0 固定 seed、seed 45 完整回放、390×844 截图哈希、包体和信息型性能基线已冻结。
- 新包 strict TypeScript 和 ESLint 通过；全部旧 `src/**/*.js` 已进入 `allowJs/checkJs` 且无屏蔽文件。
- 全量自动化：Node 98/98，Vitest 6/6，共 104/104。
- Web、微信、抖音构建通过；Web JS 622,786 bytes，gzip 161,826 bytes，低于 655,360 bytes 兼容报警线。
- 浏览器首屏、单 Canvas、左右按钮短按的两条失败分支、重开、页面重载和禁止选择样式通过；console error/warn 为 0。
- `npm audit`：0 个已知漏洞；`git diff --check`：通过。

## 已确认的现状

- Core 不直接依赖 Three.js 或平台 API。
- Runtime 使用固定步长并有重复启动、活动 pointer、帧失败和销毁防护。
- Three.js 世界和 HUD 共用一个上屏 Canvas。
- Web、微信和抖音共用玩法和 Renderer。
- 当前只有一个具体玩法、一个任务模型、一个场景和一个角色。
- 难度已版本化并拆出，现有 Runtime 仍通过迁移投影使用旧规则/物理/世界配置形状；领域与表现配置尚未完全分离。
- 声音、震动、存储能力存在于平台层，但没有独立业务编排。

## 明确未完成

- Core、Runtime、Renderer、平台和入口的 TypeScript 迁移；当前仍有 34 个 `src` JS 文件受 checkJs 约束。
- Gameplay/Task 注册表、独立 Jump Engine 和 Application。
- Scene/Character 注册表与 10 角色测试 Manifest。
- 覆盖率阈值、CI、资源审计和零 JS 门禁。
- 独立 Feedback 与设置持久化。
- 场景/角色 Manifest。
- 存档、迁移、回放和诊断导出。
- 1000 完整会话 soak。
- 5 玩法、5 任务、10 角色扩展容量证明（基础接口已存在，注册和夹具尚未完成）。
- 全量 TypeScript 和零旧 JS。

## 当前不明确或证据不足

- 微信和抖音 iOS/Android 当前构建的 WebGL2、音频、前后台和安全区表现。
- WebGL context restored 后是否能在所有设备完整恢复 GPU 资源。
- 低端设备连续运行的帧率、内存和发热。
- 当前 104 项测试的真实行/分支覆盖率。
- 浏览器页面 frozen/active 已有基线证据，但真实 `visibilitychange/pagehide` 与 WebGL context lost/restored 仍缺少自动化端到端证据。
- 正式声音和角色资源的最终版权与发行许可。

## 状态维护规则

- 每批开始时更新“当前分支”和目标。
- 每批验证后记录命令、数量、构建和浏览器/真机证据。
- 未完成和不明确项不能因计划存在而改成完成。
- 只有远端分支哈希确认后，当前批次才能改为“已完成”。
