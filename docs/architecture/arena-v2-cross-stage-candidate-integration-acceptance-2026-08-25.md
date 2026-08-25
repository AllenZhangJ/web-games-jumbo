# Arena V2 跨阶段候选集成验收（2026-08-25）

## 结论与边界

- 验收基线：`feature/arena-v2-design-docs@0442619a219fdf9b805c791dec2ab38e7f6f06c7`。
- 基线状态：本地与远端一致、`sourceDirty=false`；开发与美术任务均停止写入后由主协调串行执行。
- 结论：`candidate-integration-automated-verified / production-unreachable / hardGate=false`。
- 本报告只证明P2–P7生产不可达候选与A1.0/A1.1/A2/A3–A6机器合同在同一clean源码上的非性能一致性；不代表默认入口、正式资产、性能、浏览器、设备、真人、200小时真实留存、A7 PASS或发布冻结通过。

## 首轮红证据与修复

1. P2首轮boundary和52包构建通过，但验证Factory未向当前六键Runtime提供必填`localJumpAvailability`，得到Vitest `55/56`文件、`516/531`项。修复提交`d993c888`从同一权威Frame的phase、participant status、hitstun、respawn和grounded事实投影start/step/restore能力；未知空跳保持关闭，未把Runtime契约降级为optional。
2. P4首轮仅十阶段、10,801 tick×16敌人的功能长链受Vitest默认5000ms限制，在约5199ms超时；生产逻辑和其余302项未红。修复提交`0442619a`只为该具名规格设置10,000ms局部上限，未缩减tick、敌人、阶段、断言或真实33项故障矩阵，也未改变正式性能预算。

红轮均保留为真实失败历史；最终结果没有删除红项、降低分母或沿用修复前绿轮。

## 同一clean基线最终机器证据

| 门 | 最终结果 | 关键范围 |
|---|---|---|
| P2 | boundary通过；52包/11波；Vitest `56/56`、`531/531`；Node `59/59` | 三模式、5940 tick连续/恢复、Replay、Checkpoint、恶意输入和资源归零；长跑约202.3秒 |
| P3 | boundary通过；52包/11波；Vitest `17/17`、126通过、12项按runner设计外置；Node `17/17` | 两图KZ、Race 2–4人拥挤、单敌人族/16槽、Survival五矩阵、Replay/恢复/清理；五矩阵约427.2秒 |
| P4 | boundary通过；52包/11波；Vitest `67/67`、303通过、1项外置；Node `19/19` | 20武器、20×10生存变体、三模式反馈/方向、Registry恢复和33项真实故障矩阵；矩阵约415.0秒 |
| P5 | boundary `82文件/6生产根`；52包/11波；Vitest `43/43`、`365/365`；Node `196/196` | 11页、三概念输入、HUD、DOM/Canvas、Audio/VFX、Pointer/Keyboard和生命周期 |
| P6 | boundary `68 authority/7生产根/11 A6候选`；52包/11波；Vitest `54/54`、`583/583`；Node `273/273` | Profile/CAS、结算恢复、收藏成长、200小时静态容量、留存候选与A6零许可资源链 |
| P7 | boundary通过且`hardGate=false`；52包/11波；Vitest `21/21`、`166/166`；Node `24/24` | 29项评价/24项自动化合同、A7 V3双门、Evidence Store、Freeze/Assembly不可发布边界 |
| A1.0 | 正向通过；PP0/PP1 `51/51`；隔离`90/90` | 28源、25 fixture、供给599/600/601、同tick替换、无三选一、静音/低动效；机器包不自签 |
| A1.1 | 正向通过；隔离`93/93` | 6个生命周期artifact、来源/权利、7项捕获方案；评分92但`hardGatePassed=false`、真人0/10 |
| A2 | 正向通过；隔离`44/44` | 六键step、三模式结果、2–4人非颜色身份、HUD/Audio/VFX只读链；`hardGate=false` |
| A3–A6准备 | 固定runner `15/15`文件、`59/59` | 9批、130资产、910缺失槽、95评审单元；批准0/130、`executesReviews=false` |

最终另行通过`typecheck:app`、文档链接/命令治理与`git diff --check`。本报告写入后应再次运行文档与diff检查；报告提交只改变治理文档，不改变上述受测生产/测试源码。

## 七维候选工程评分

| 维度 | 分数 | 判断 |
|---|---:|---|
| 健壮性 | 14/15 | exact-key、非法输入、恢复与故障矩阵闭合；正式设备异常尚未运行 |
| 竞态与确定性 | 15/15 | 同seed、Replay、连续/恢复、同tick顺序及原子水位均有证据 |
| 失败兜底 | 14/15 | 候选失败关闭与重试Owner闭合；真实平台/媒体失败仍待运行 |
| 边界输入 | 14/15 | accessor、Proxy、thenable、future字段、路径/SHA/身份漂移均有反证 |
| 生命周期与清理 | 14/15 | 构造债务、迟到settlement、重复destroy及资源归零有机器证据；设备资源仍待测 |
| 主流程阻断与架构 | 14/15 | `Rule → Core → Bot → Presentation`及默认入口关闭通过；生产接线尚未开放 |
| 治理与证据真实性 | 10/10 | 首红保留、分母未缩减、机器/正式门分离、中文提交与远端一致 |
| **合计** | **95/100** | 仅为候选工程质量，不是release-ready评分 |

## 仍未通过且不可替代的门

- A0.3真人盲测仍为`0/10`；不得由代理、脚本或制作人员补样。
- A1.1逐项来源/捕获批准、代表样件、A3–A6真实Blockout/Integration/Final与130项生产批准仍未发生。
- 严格性能、Web双视口、微信/抖音开发者工具、iOS/Android真机、真人玩法与可访问性验收仍未运行。
- 200小时仍是20把×120局×平均5分钟的静态容量，尚无纵向真实留存结论。
- P7真实29项评价、24项自动化回执、A7 V3 PASS、Freeze Manifest、发布签名/上传/tag及`main`合并均未执行。

下一合法顺序为：`A0.3十人真实输入 → A1.1协调/逐项批准 → A1代表样件 → A3–A6真实资产评审与批准 → 专用性能/设备/真人 → A7/P7最终冻结与独立发布审计`。
