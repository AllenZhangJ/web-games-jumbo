# 当前治理状态

更新时间：2026-07-15

当前分支：`governance/batch-3-presentation`

## 批次状态

| 批次 | 状态 | 当前事实 |
|---|---|---|
| 第 0 批：文档基线 | 已完成 | 远端收口 `eae92d1`，标签 `governance-b0`。 |
| 第一批 P0–P2 | 已完成 | 远端收口 `2844c1e`，标签 `governance-b1`。 |
| 第二批 P3–P5 | 已完成 | 远端收口 `933fcea`，标签 `governance-b2`。 |
| 第三批 P6–P8 | 已完成 | Renderer、Scene/Character、Feedback 已迁移；124 项测试、三端构建和手机尺寸浏览器验收通过；远端实现提交 `03d84d4` 已确认。 |
| 第四批 P9–P10 | 未开始 | 存档/回放、全面 strict TS、覆盖率与 CI 尚未完成。 |
| 最终终验 | 未开始 | 只能在第四批推送后独立执行。 |

## 第三批已实现事实

- `src/render3d` 全部迁入 private `@number-strategy/renderer-three` TypeScript workspace，旧 JS 与根级 Renderer 测试副本删除。
- Renderer 直接消费 GameSnapshot/GameEvent，并按 World、HUD、Camera、Resource、Context Lifecycle 组件分层。
- ContextLifecycle 独立处理 lost/restored、preventDefault 和幂等解绑；恢复后清时钟并刷新阴影状态。
- 新增 strict `@number-strategy/content`：SceneRegistry、CharacterRegistry、ContentSelection、默认场景与默认角色。
- 生产 Stage 使用 SceneDefinition 的背景、地面、雾和光照；CharacterRig 使用 CharacterDefinition 的 rendererKey、主色与缩放。
- 测试静态注册 10 个角色 Manifest，覆盖切换、缺失 ID 回退、资源构造失败回退、先建后换和幂等销毁。
- 新增 strict `@number-strategy/feedback`：GameEvent→声音/震动、独立开关、`feedback-settings@1` 本地持久化和诊断。
- 声音为运行时原创程序化 WAV；平台能力缺失、播放/震动/存储失败不会阻断主循环。
- 组合根实际注入 Renderer3D、FeedbackController、AudioFactorySoundPort、Haptic 和 Storage 适配。
- normal@1 的固定 seed、完整回放、碰撞和冻结截图基线保持通过，未有意调整玩法或视觉手感。

## 第三批验证证据

- `npm run lint`、`npm run typecheck`、`npm run check`：通过。
- Node 兼容/集成 40/40；workspace Vitest 84/84；总计 124/124。
- 三档各 10,000 seed，共 30,000 可解回合通过。
- Content 10 角色容量与回退/销毁，Feedback 独立设置/失败隔离，Renderer context lifecycle 均有自动化测试。
- Web、微信、抖音构建通过；Web JS 643,245 bytes，Vite 报告 gzip 168.80 kB。
- 390×844：单 Canvas、`user-select: none`、左右各一次真实长按成功落地、连续回合、镜头过渡和音频触发后运行稳定。
- 浏览器 console error/warn 为 0。
- `npm audit`：0 个已知漏洞；`git diff --check`：通过。

## 当前 TypeScript 迁移事实

- strict 源码：Contracts、Difficulty、Jump Engine、Gameplay、Task、Application、Content、Feedback。
- Renderer 源码已经全部为 `.ts`，但为本批兼容迁移暂时关闭 strict，并含宽松类索引签名；这不是最终完成状态。
- package 测试已为 `.ts`，但 `tsconfig.tests.json` 仍为过渡非 strict。
- 尚余 13 个 `src/**/*.js`、7 个 `tests/*.js` 和 1 个 `scripts/build.mjs`。
- 第四批必须迁移上述全部文件，严格化 Renderer 和测试，删除 renderer ESLint 宽松例外、`tsconfig.legacy.json`、`allowJs/checkJs` 和过渡配置，并启用人工维护 `.js` 为 0 门禁。

## 明确未完成

- SaveEnvelope、版本迁移 fixture、确定性回放、诊断导出和本地存档编排。
- Renderer 宽松类型清理与所有包统一 strict。
- 全部平台/入口/测试/构建工具 TypeScript。
- 覆盖率阈值、1000 完整会话 soak、100 局资源有界测试和资源许可证自动审计。
- CI、CODEOWNERS、CHANGELOG、发布清单和可在仓库内落地的分支治理文件。
- Feedback 设置的玩家 HUD 入口；当前已有可持久化 API，但没有可见设置页。

## 当前不明确或证据不足

- 微信/抖音 iOS 与 Android 的 WebGL2、程序化 data-URI 音频、震动、安全区和前后台真机表现。
- Web pagehide/pageshow、真实 visibilitychange 与 context lost/restored 的完整浏览器端到端证据。
- context restored 后所有 GPU 资源在各宿主的完整重建能力。
- 低端真机长时间运行的帧率、内存、发热和 GPU 资源上限。
- 当前测试真实行/分支覆盖率。
- 正式角色与声音资源的最终发行许可；当前默认内容为程序生成且无第三方音频文件。

## 状态维护规则

- 只有远端分支哈希确认后，本批才能从“待远端收口”改为“已完成”。
- 接口、测试 fixture 或开发工具成功不能替代正式内容与目标真机证据。
- 第四批零 JS/统一 strict 是硬门槛，不得以第三批“已是 `.ts`”延期宽松类型。
