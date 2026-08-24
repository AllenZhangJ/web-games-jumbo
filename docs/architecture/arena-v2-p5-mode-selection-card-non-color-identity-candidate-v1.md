# Arena V2 P5 模式选择卡非颜色身份 Candidate V1

## 1. 状态与范围

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 本批只增强既有 `mode-select:selection-mode` 的 `duel / race / survival` 三张选择卡，不新增页面、卡片、按钮、点击、输入、模式、规则或资产。
- 不修改模式文案、模式 Definition/Registry、胜负、奖励或 Authority；几何只解释玩家已经选择的三种既有模式身份。
- 默认入口、正式资产、A0.3、Blockout、设备、真人与 Final 门均不因本批开放。

## 2. 技能与参考账本

使用 `threejs-game-ui-designer`，并读取：

| 参考 | 已读 | 本批约束 |
|---|---|---|
| `references/ui-patterns.md` | 是 | 游戏菜单而非Dashboard；模式身份不新增功能容器 |
| `references/checklists/game-ui-quality.md` | 是 | 稳定卡片尺寸、状态和世界视觉语义 |
| `references/checklists/hud-readability.md` | 是 | 颜色之外保留形状与既有文字通道 |
| `references/checklists/responsive-ui-fit.md` | 是 | 窄屏112px、桌面96px卡片合同不变 |

本批不改变触控控件、安全区或手势，因此不扩展 `mobile-input` 合同。项目真值来自 Art Bible、标准 Information Selection RenderPlan、UI RenderPlan与现有隔离 Information Surface；没有读取或复制模式规则数值。

## 3. 三模式纯几何词汇

每张既有卡片右侧加入精确三个非交互 `panel` primitive。三种唯一性只认 panel 的相对位置、尺寸与圆角；tone、颜色、glyph、文字和模式名称均不参与放行。

| 模式 | 纯几何身份 | 语义边界 |
|---|---|---|
| duel | 左右对峙块＋中央分界 | 只表达两方对峙，不判定人数、命中或胜负 |
| race | 三段上升路线/终点柱 | 只表达前进路线，不读取坐标、进度或终点事实 |
| survival | 中心核心＋左右包围柱 | 只表达被围压力，不读取敌人数、波次或淘汰 |

三个 profile 是模式选择视觉词汇，不是模式逻辑、数值或胜负说明；正式规则与完整读屏仍由原 label/description/action 提供。

## 4. RenderPlan 与预算合同

`addArenaV2ModeSelectionCardNonColorIdentityToRenderPlanCandidateV1` 的边界：

- 只对身份精确为 `mode-select:selection-mode` 的计划生效；其他页面返回原引用。
- 必须精确闭合 `duel / race / survival`，且每卡已有唯一 `panel / label / description / action`。缺失、重复、未知模式或未知 selection primitive 在输出前拒绝。
- 窄屏模式卡必须保持 `112px` 高与 description 三行；桌面卡必须保持 `96px` 高与 description 两行。
- 原 panel 与 action 对象保持不变；action rect、48px下限、selected/available、intent、label、disabledReason与完整 accessibilityText 不变。
- label/description 的文字、读屏、tone、role、行数和 clip 不变；仅收窄绘制宽度，为右侧身份轨留出不遮挡区域。
- 每卡精确新增三个 panel，总增量精确 `+9`；增强后的完整 RenderPlan primitive 总量必须 `<=128`。源计划预算不足、输出增量不是9或总量越界时失败关闭。
- 完整增强结果再次输入时必须逐值复核9个panel、文字避让矩形与primitive预算后按原引用幂等返回；部分增强、几何/tone/clip漂移或伪增强identity一律拒绝，不能因输出identity变化而旁路检查。
- 输出不创建 DOM、Three、Renderer、asset loader、lease、mount、RAF、timer、input或新点击。

现有 Information Surface 在调用底层 `surface.render` 前依次应用模式卡与角色卡增强器。模式页的角色preview `contextProvider`继续收到原始稳定计划并返回null，因此资源Owner与Renderer工厂调用保持0；角色页不受模式增强器影响。

## 5. 无障碍与降级

- 信息通道为纯几何＋原文字＋完整action读屏；颜色不是唯一编码。
- reduced-motion：几何恒定静态，无旋转、闪烁、脉冲或过渡。
- muted：视觉、文字和读屏完全不变。
- 辅助panel不具备action、focus、intent或pointer语义，不改变既有点击区域。
- 几何合同失败时拒绝整个增强输出，保留上游原计划，不生成半完成身份图形。

## 6. 未运行测试设计

已写但未运行的测试源码覆盖：

- 112px窄屏与96px桌面三卡；
- duel/race/survival三种纯panel几何signature唯一；
- 原panel/action对象、action矩形、48px、文字和完整读屏事实不变；
- 精确`+9`且完整计划`<=128`；预算越界失败关闭；
- 同输入同输出、非模式页原引用返回；
- 完整增强结果同引用重放、增强panel漂移与缺项失败关闭；
- 缺卡、重复primitive、未知模式失败关闭；
- 模式页底层Surface收到增强计划，角色Three/Renderer资源工厂调用为0。

测试、typecheck、lint、format、diff-check、build、浏览器、设备、截图、压力与性能均为`not-run`。

## 7. 静态六维自检与回滚

| 维度 | 静态结论 | 顺延证据 |
|---|---|---|
| 视觉/范围 | 三卡纯几何3/3唯一；无页面、按钮、输入或规则增量 | 双视口截图和玩家理解 |
| 非颜色编码 | panel几何独立放行，tone/文字不参与signature | 色觉和灰度设备证据 |
| 响应式/触控 | 112/96px卡高、原action矩形与48px保持 | 390×844、1440×900实际截图 |
| 恶意边界 | 模式闭集、卡结构、clip、intent和预算失败关闭 | 未运行测试与严格类型 |
| 生命周期/副作用 | 纯RenderPlan；零Three/DOM直建/资源/RAF/timer/input | 浏览器与销毁实测 |
| 治理/回滚 | code-written-not-run；默认入口及所有硬门不变 | 主协调签核与运行门 |

最小回滚：删除新增模式卡增强器、测试和本文，移除包导出，并从 Information Surface 的增强链移除模式增强函数；无需回滚模式文案、选择投影、Authority、资产或角色A6.19代码。
