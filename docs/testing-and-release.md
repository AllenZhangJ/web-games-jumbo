# 测试、验证与发布

## 当前命令

| 命令 | 作用 |
|---|---|
| `npm ci` | 严格按锁文件安装依赖。 |
| `npm run dev` | 构建 workspaces 后在 `127.0.0.1` 启动 Vite。 |
| `npm run dev:lan` | 监听所有网卡，供同一 Wi-Fi 手机访问。 |
| `npm test` | 运行全部单元、契约、集成、迁移、回放和 soak 测试。 |
| `npm run test:coverage` | 运行确定性单测层并强制 80% 行/语句/函数、70% 分支。 |
| `npm run test:soak` | 单独执行 1000 完整会话与 100 局资源测试。 |
| `npm run test:renderer-performance` | 执行纹理字节基线、资源作用域与 Renderer soak。 |
| `npm run check:render-architecture` | 拒绝 Renderer 宿主 API 泄漏与低层模块反向依赖。 |
| `npm run check:render-hot-path` | 冻结已知热路径分配；第三批将允许数降为零。 |
| `npm run typecheck` | strict 检查所有 workspace、入口、测试、构建和配置。 |
| `npm run check:zero-js` | 拒绝维护 JS、`@ts-nocheck`、宽松 tsconfig 与旧迁移开关。 |
| `npm run audit:assets` | 审计运行时依赖、许可、归属、角色资源清单和外链。 |
| `npm run audit:dependencies` | 查询生产依赖高危漏洞。 |
| `npm run build` | 构建三端、复制许可并检查包体预算。 |
| `npm run check` | 按顺序执行上述所有可自动化门禁。 |
| `npm run preview:lan` | 构建后在 4173 端口提供局域网生产预览。 |

GitHub Actions 在 push 与 pull request 上使用 Node 20、`npm ci` 和 `npm run check`。生产依赖审计需要可访问 npm 漏洞服务；离线失败不能伪装成“0 漏洞”。

## 当前自动化证据

- 所有维护代码 strict TypeScript；零旧 JS 门禁通过。
- 全量测试覆盖 Contracts、Difficulty、RNG、Physics、World、Gameplay、Application、Persistence、Content、Feedback、Platform、Renderer、入口、架构和文档。
- easy/normal/hard 各 10,000 seed，共 30,000 个可解回合。
- 独立 1,000 个完整 normal 会话全部获胜且步数非负。
- 100 局 Three 平台视图保持 3 个活动 View；100 轮低画质粒子/拖尾保持固定池并在结束后完整释放。
- 存档 v1/v2/v3/v4 fixture、迁移回写、损坏隔离、动作回放和首帧恢复通过。
- 5 个正式 Gameplay 各执行 1,000 个 normal 初始 seed；5 个正式 Task 和 10 个正式 Character 完成注册、兼容选择、回退与资源销毁测试。
- 全量 Vitest 25 个文件、155 项测试通过；确定性单测层行/语句 89.70%、函数 93.16%、分支 71.44%。
- 生产依赖审计 0 个已知漏洞；资产/许可证审计通过。
- Web、微信、抖音构建通过；Web JS 672.91 kB、gzip 177.55 kB，Web gzip 预算 180 KiB，小游戏 `game.js` 687,289 bytes、预算各 700 KiB。

覆盖率统计不包含需要真实 GPU/宿主的 Platform 与 Renderer3D 适配代码，但这些文件仍执行专用单元测试，并由三端构建、浏览器与真机矩阵约束。该分层必须在报告中保持透明，不能称为“全部代码 89%”。

## 每批开发的强制验证顺序

1. 运行本批直接相关的最小测试。
2. 运行完整单元、契约、集成、回放和 soak。
3. 检查依赖方向、平台泄漏、零旧 JS 和构建入口。
4. 审计竞态：重复启动/输入、异步完成、销毁后回调、帧重入。
5. 审计兜底：非法配置、旧/坏存档、资源失败、平台能力缺失、清理异常。
6. 审计边界：零尺寸、非有限数、空候选、极端 seed、蓄力边界、存档版本与回放上限。
7. 审计 Web 生命周期：resize、hide/show、pagehide/pageshow、pointercancel、context lost/restored。
8. 浏览器验证首屏、左右长按、刷新恢复、暂停/重开和 console 健康。
9. 运行覆盖率、依赖/资产/许可证审计、三端构建和包体预算。
10. 修复发现的问题并重复相关检查。
11. 校准文档中的完成、未完成和证据强度。
12. `git diff --check`、暂存审计、中文提交、推送并核对远端哈希。

## 证据强度

| 声明 | 至少需要的证据 |
|---|---|
| 纯规则正确 | 单元、边界、属性/seed 测试。 |
| 无竞态 | 可控时钟/Promise 的并发测试。 |
| 存档兼容 | 真实旧版 fixture 迁移和首帧恢复测试。 |
| Web 生命周期正常 | 单元测试加真实浏览器事件。 |
| Three.js 表现正常 | 浏览器截图、交互和控制台日志。 |
| 微信/抖音正常 | 对应开发者工具与 iOS/Android 真机。 |
| 性能达标 | 指定设备的 FPS、内存、draw calls、三角形和包体。 |
| 1000 名单机玩家可用 | 1000 完整会话 soak 加长时设备运行。 |

Node 或桌面浏览器通过不能证明小游戏真机通过；开发者工具通过也不能代替 iOS/Android。

## 分支、CI 与发布

| 批次 | 分支 | 标签 |
|---|---|---|
| 第 0 批 | `governance/batch-0-documentation` | `governance-b0` |
| 第一批 | `governance/batch-1-foundation` | `governance-b1` |
| 第二批 | `governance/batch-2-core` | `governance-b2` |
| 第三批 | `governance/batch-3-presentation` | `governance-b3` |
| 第四批 | `governance/batch-4-production` | `governance-b4` |

仓库管理员应把 GitHub Actions `quality` 设为 main 的 required check，禁止直接推送并要求至少 1 名 CODEOWNER 审批。仓库内 CI/CODEOWNERS 不能自动替代 GitHub 服务端分支保护设置。

正式发布按 [发布清单](release-checklist.md)执行，并更新 [CHANGELOG](../CHANGELOG.md)。

## 最终终验

第四批远端收口后单独执行最终终验，至少包括：

- 全量门禁与独立覆盖率报告。
- 30,000 seed、1,000 完整会话和 100 局资源 soak。
- Web 完整主流程、刷新存档恢复和生命周期。
- 微信/抖音三端构建及可获得的开发者工具/真机矩阵。
- v1/v2/v3/v4 存档迁移与损坏隔离。
- 5 玩法、5 任务、10 角色的正式目录、兼容组合和资源生命周期。
- 零旧 JS、统一 strict、许可归属和包体预算。

发现阻断问题必须修复、复测、更新文档并追加中文提交，不能只记录后结束。
