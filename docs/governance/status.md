# 当前治理状态

更新时间：2026-07-15

当前分支：`governance/batch-4-production`

## 批次状态

| 批次 | 状态 | 当前事实 |
|---|---|---|
| 第 0 批：文档基线 | 已完成 | 远端收口 `eae92d1`，标签 `governance-b0`。 |
| 第一批 P0–P2 | 已完成 | 远端收口 `2844c1e`，标签 `governance-b1`。 |
| 第二批 P3–P5 | 已完成 | 远端收口 `933fcea`，标签 `governance-b2`。 |
| 第三批 P6–P8 | 已完成 | 远端收口 `c3225c1`，标签 `governance-b3`。 |
| 第四批 P9–P10 | 已完成 | 实现 `b618e01`、收口 `8633822`，远端分支与 `governance-b4` 标签已核对一致。 |
| 最终终验 | 已完成（仓库/本机范围） | 第四批标签后独立重跑完整门禁和 Web 生产主流程；结果见终验报告，小游戏真机仍属发布前人工项。 |

## 第四批已实现事实

- 新增 private `@number-strategy/persistence`：`SaveEnvelope@3`、v1/v2/v3 fixture 迁移、校验、版本化动作回放、存储隔离、迁移回写与本地诊断导出。
- `NumberStrategyGame` 在首帧前恢复本地存档并确定性重放；定义不兼容、动作无法重放或存档损坏时清除旧存档并启动新会话。
- 新增 private `@number-strategy/platform`，Web、微信、抖音 Canvas/WebGL2/输入/生命周期/音频/震动/存储/分享适配全部迁入该包。
- `src/entry`、`src/config.ts`、根测试、构建与审计脚本均为 TypeScript；删除旧 JS、`tsconfig.legacy.json`、`tsconfig.tests.json` 和 `allowJs/checkJs`。
- 所有 workspace、入口、测试与工具均使用基准 `strict: true`；`check:zero-js` 会拒绝维护目录中的 `.js/.mjs/.cjs/.jsx`、`@ts-nocheck`、`strict:false` 和 `allowJs/checkJs`。
- 确定性单测层覆盖率门禁为行/语句/函数 80%、分支 70%；当前实测高于门槛。平台与 WebGL 适配器由专用测试、三端构建与浏览器/真机矩阵验证，不混入核心覆盖率数字。
- 新增 1000 个完整 normal 会话 soak、100 局 Three 平台资源有界/最终释放测试和 RNG 快照回放测试。
- 新增 GitHub Actions、CODEOWNERS、CHANGELOG、发布清单、产物预算、生产依赖漏洞审计和资产/许可证自动审计。
- 扩展准备保持：5 个 Gameplay、5 个 Task、10 个 Character Manifest 的静态注册容量证明；当前仍只交付 1 个正式玩法、1 个正式任务和 1 个默认程序化角色。

## 当前自动化证据

- `npm run typecheck`：所有包与根级代码 strict 通过。
- `npm run lint`、`npm run check:zero-js`：通过；维护目录旧 JavaScript 数量为 0。
- 全量 Vitest 23 个文件、138 项测试通过；含三档各 10,000 seed、1000 完整会话和 100 局资源 soak。
- 确定性单测层覆盖率：行/语句 89.42%、函数 90.83%、分支 70.17%。
- `npm run audit:assets`：1 个第三方运行时依赖完成许可白名单，内置角色为程序化资源且无外链。
- `npm audit --omit=dev --audit-level=high`：0 个已知漏洞。
- Web、微信、抖音构建通过；Web JS 651.45 kB、gzip 170.81 kB，小游戏 `game.js` 受 700 KiB 硬预算约束，三端均包含归属与许可文本。
- 390×844 生产 Web：左跳 18→23、右跳 23→32；刷新恢复“当前 32 / 剩余 5”；单 Canvas、body/Canvas `user-select:none`、空选区、console 0。
- 当前局域网 `http://192.168.1.249:4173/` 回连返回生产 HTML；更换 Wi-Fi 后必须重新确认 IP。

## 最终终验证据

- 以远端 `governance-b4` / `8633822b6abfd944efe4b9540087b4735f85bf77` 为基线，独立 `npm run check` 通过。
- 生产 Web 从 32/5 存档恢复，frozen→active 后左长按到 64/4，刷新再次恢复 64/4；单 Canvas、禁选中、空选区、console 0。
- 完整证据、适用范围和仍需人工完成项见[四批治理独立终验](final-verification.md)。

## 仍需项目方或真实设备验证

- 微信/抖音开发者工具与 iOS/Android 真机的 WebGL2、程序化 data-URI 音频、震动、安全区、前后台和本地存档表现。
- 真实手机 Web 的 `pagehide/pageshow`、`visibilitychange`、WebGL context lost/restored 完整端到端证据。
- context restored 后所有 GPU 资源在各宿主的完整重建能力。
- 低端真机至少 10 分钟的帧率、内存、发热与 GPU 资源表现。
- GitHub 仓库设置中的主分支保护仍需仓库管理员启用；仓库已提供应设为 required 的 `quality` 工作流与 CODEOWNERS。
- Feedback 设置已有独立持久化 API，但当前没有玩家可见的 HUD 设置页。

## 状态维护规则

- 只有远端分支哈希确认后，本批才能改为“已完成”并创建批次标签。
- 自动化、桌面浏览器、开发者工具和真机证据必须按强度分别陈述，不能互相替代。
- 第四批的零 JS、统一 strict、存档迁移、覆盖率、soak、三端构建与许可审计均为累积硬门槛。
