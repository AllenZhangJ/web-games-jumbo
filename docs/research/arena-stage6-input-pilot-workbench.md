# Arena Stage 6 S6.6.3b/c 盲测终态与 Web 工作台门禁记录

## 结论

2026-07-18 的 S6.6.3b/c 已建立可恢复的 `Trial Controller`、单次终态提交、观察/复核草稿、去标识汇总与审计导出，并新增与正式游戏入口分离的 Web `pilot.html` 工作台。运行中刷新不恢复半局 `MatchCore`，而生成可审计的作废记录；复核阶段刷新则恢复全部草稿。

本批只关闭独立 Web 采集入口的本机 E1/E2 与真实浏览器工作流证据，不关闭 E3/E4：未招募新受测者，未在目标手机、微信或抖音开发者工具采集证据，不生成 Mapper 胜者。

## 模块与依赖边界

```text
Web Workbench View / Web App
        ↓ explicit actions and snapshots
InputPilotTrialController
        ├── Trial pure transitions / ReviewDraft / Export
        ├── WorkspaceCoordinator → Repository / lease / Storage Port
        └── replaceable Runtime Port
                  ↓
InputPilotPresentationRuntime
        → fixed assigned match / observed session / ArenaPresentationSession
```

- `presentation/pilot` 保持无 DOM、无 Three.js、无正式 Session 依赖，只管状态转换、持久化编排和可替换 Runtime Port。
- 具体 `ArenaPresentationSession` 适配位于 `presentation/session`；Web DOM、环境识别和 JSON 下载位于 `entry`。
- 比赛 seed 来自 assignment，Runtime 只能创建一局，UI 不能改写 seed、Mapper 或隐藏机器人配置。
- 游戏进度回调只携带只读 tick/phase，观察草稿由 Web 表单提供；表现层不参与胜负、命中或移动判定。

## 终态、恢复与失败关闭

- 入组时将 ledger 与 enrolled checkpoint 作为同一 Workspace revision 提交，不产生孤立 assignment。
- 启动 Runtime 前先持久化 running；启动失败、运行时异常或意外终结都失败关闭为单条 invalidated record。
- 正常结束、180 秒上限或参与者主动结束先原子写入 reviewing checkpoint，再释放 Runtime；自动指标与当前观察草稿同步固化。
- reviewing 表单每次修改都经过 schema 校验和 CAS 持久化；刷新后恢复计数、完成项、理解度和流程偏差标记。
- 相同内容的重复提交幂等返回已提交记录；不同内容的迟到提交明确拒绝。
- `start/pause/resume/destroy` 覆盖并发启动、迟到完成、重复销毁、隐藏/恢复、lease 续租与清理失败；失败后不留半可用 Controller。

## 数据与隐私边界

- 页面自动产生 `pilot-0001` 形式的本地匿名编号，不采集姓名、账号、原始触点、隐藏机器人难度或墙钟对局轨迹。
- 汇总导出不包含 participant/trial/assignment 明细；审计导出保留匿名原始记录，且 active trial 存在时拒绝导出。
- 环境不符合 `Web + 手机 + 竖屏 + 触控` 时页面明示警告，记录仍可保存但会被聚合器排除。
- 本地双槽与 hash 用于损坏检测，不是加密、签名或服务器级取证。

## 视觉验收与概念图对照

概念图保留在 [`docs/quality/concepts/arena-input-pilot-workbench-v1.png`](../quality/concepts/arena-input-pilot-workbench-v1.png)，不进入 Web/小游戏发行产物。实现截图保留在 `docs/quality/arena-input-pilot-*.png`。

| 对照项 | 落地结果 |
|---|---|
| 容器 | 桌面端保留“大比赛画布 + 单一右侧证据面板”，未拆成仪表盘卡片网格 |
| 流程 | 顶部状态与入组、进行中、复核、已提交四步导航一致 |
| 色彩 | 冷灰底、白色面板、深蓝文字和单一橙色主操作，不使用渐变 |
| 字阶 | 标题、阶段、说明、表单标签保持明确层级，工作台文案不泄露 Bot 或难度 |
| 响应式 | 390×844 窄屏下改为画布、进度、表单的单列流，主操作与导出栏不重叠 |
| 保留偏差 | 概念图中的城堡美术不是本批目标；画布继续渲染 Stage 6 程序化灰盒，避免把研究入口误当 Stage 7 美术定稿 |

真实浏览器已验证桌面入组/运行/复核和 390×844 窄屏入组/运行/复核。追加恢复验收为：运行中保留 1 次意图不匹配、2 次修正和“单手完成”，进入复核后追加 1 次重复输入与地面动作理解度；刷新后全部恢复并只提交一条终态记录。浏览器未报告未处理异常。

## 自动化证据

```text
npm test
npm run arena:session:soak
npm run arena:input:fuzz
npm run arena:stress
npm run build
git diff --check
```

- `npm test`：382/382 通过。
- `arena:session:soak`：100/100 局完成，残留 frame/lifecycle listener/canvas listener/input 均为 0，GC 后堆增长 `2,337,712B < 8,388,608B`。
- `arena:input:fuzz`：80/80 局完成，72,000 tick，4 份回放一致，覆盖 878 次 resize、480 次暂停恢复和 2,820 次有效 cancel。
- `arena:stress`：1,000/1,000 局完成，1,026,775 tick 无非有限状态，5 份回放一致，平均 CPU tick `0.2285ms < 0.25ms`，GC 后堆增长 `4,446,464B < 33,554,432B`。
- `npm run build`：Web、微信、抖音产物成功；独立 pilot chunk `87.01kB`/gzip `24.04kB`，共享 Web chunk `839.81kB`/gzip `219.53kB`。既有超过 650kB 警告继续作为 Stage 9 真机测量与拆包项，不伪装成本批已解决。
- `git diff --check`：通过。概念图仅保留为文档证据，重建后确认未进入 `dist/web`。

## 尚未证明

- 没有真人新手 E4 样本，浏览器操作记录只是工作流验收，不进入 Mapper 指标。
- 没有微信/抖音开发者工具、目标手机触控、前后台、安全区或 WebGL context loss E3。
- 独立 Web 工作台已落地，微信/抖音 pilot UI 仍未实现；正式游戏入口未引入本采集面板。
- 未冻结 Mapper、Gesture 参数、Stage 7 美术或 Stage 9 发行预算。
