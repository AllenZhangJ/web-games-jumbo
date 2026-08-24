# Arena V2 A6.18 收藏语义回退视觉词汇 Candidate V1

## 1. 状态与不变量

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 当前逐资产生产批准账本仍对 130 项给出 `productionApprovalStatus=missing-not-approved`；A6.4 的 20 武器和 2 地图槽继续全部 `formalReady=false / assetUsePermitted=false / requestToken=null`。
- A6.18 不改变 A6.4→A6.17 的零资源真值：0 loader、0 lease、0 mount、0 A6.14 Host、0 Three Renderer。
- 回退图形是标准 DOM/Canvas primitive 组合，不是正式资产、程序化 3D 正常路径、批准替代物或玩法事实。
- 页面数、主动作数、输入概念和 Profile/Authority 写入均为 0 增量；仍只使用既有 `weapon-index / weapon-detail / map-index / map-detail`。

## 2. 技能与强制参考

本批按以下顺序使用项目技能：

1. `game-art-director`
   - 回退必须延续低多边形玩具体块与手稿式反馈语义，优先轮廓、明暗和稳定图形标签，不以颜色或装饰替代身份。
2. `threejs-game-ui-designer`
   - 已读取 `ui-patterns`、`game-ui-quality`、`hud-readability`、`responsive-ui-fit`、`mobile-input`；回退复用 A6.15 既有双视口矩形、标准 RenderPlan、DOM/Canvas 消费链和 48px 原动作区。
3. `media-asset-management`
   - 遵守 `source → process → deliver → manage`：既有 Definition/阅读目录是 source，A6.18 只生成 renderer-neutral profile 与 primitive；生产批准、资产字节、加载和发布仍归后续 manage gate。

强制项目参考：

- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-and-audio-development-flow.md`
- `arena-v2-character-weapon-first-screen-readability-candidate-v1.ts` 的 20 武器轮廓/拾取图形目录
- `arena-v2-information-content-read-catalog-candidate-v1.ts` 的 20 武器 core verb 与 2 图 20 段节奏/地标/引导线目录
- A6.4、A6.15、A6.16、A6.17 当前合同

泛化技能要求的 `docs/collaboration-protocol.md` 与 `docs/game-design-theory.md` 仍不存在，只登记为治理红缺口；本批没有创建占位，也没有把该缺口写入产品机器合同或 content hash。

## 3. 语义来源与身份闭包

`ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1` 只读投影既有内容目录：

- 20 武器：`weaponDefinitionId / collectionOrder / coreVerb`；
- 2 地图：`mapDefinitionId / routeDefinitionId / 逐图完整 route rhythm（12+8） / pacingArc / landmarkCue / leadingLineCue`；
- 总量严格闭合为 20 武器、2 地图、20 段，不从 Definition ID 字符串猜玩法，不复制攻击数值、路线规则、奖励或胜负事实。

Three 包内的 `ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_VISUAL_PROFILE_CANDIDATE_V1` 再与既有 20 武器首屏可读性目录和 A6.4 当前 asset binding 逐项闭合。每项 profile 固定：

- 主形状语义及有限 geometry family；
- 辅助形状/地面标识语义；
- 纹理或线型语义及稳定 glyph；
- `武01…武20` 或 `图1/图2` 稳定标签；
- 轻/中/重或路线深度明暗层级；
- `definitionId + assetId + source content hash` 身份。

22 项 `profileId / definitionId / visualSignature` 必须唯一。A6.18b 进一步导出
`ARENA_V2_COLLECTION_SEMANTIC_FALLBACK_PRIMITIVE_GEOMETRY_CLOSURE_CANDIDATE_V1`：20 武器直接使用
`collectionOrder=1..20`，两张地图则在 `collectionOrder / pacingArc / segmentCount=12+8` 全部闭合后占用独立的
`geometryIdentityOrdinal=21/22`。未知 definition、asset coherent substitution、future field、顺序越界或地图节奏漂移均在 RenderPlan primitive 发布前失败关闭。

## 4. 视觉词汇与预算

每个回退槽固定最多 4 个标准 primitive：

1. 主体形状 panel；
2. 辅助形状 panel；
3. 线型/明暗节奏 panel；
4. 唯一 glyph + 语义短标签 text。

因此 A6.18 替换的是 A6.15 原先同质的“三条斜移横杠 + 通用文字”，不增加每槽 primitive 数量，也不改变 256 primitive 页面硬上限。A6.18b 让实际 projector 与诊断签名共用同一个纯函数：三块 panel 的位置、宽高与圆角组合在 A6.4 的 `72 / 96 / 168 / 240px` 四种标准槽中分别形成 22/22 唯一的非文字 geometry signature。模块构造期会逐尺寸拒绝重复签名；低于 72px、非有限/溢出边界或使 panel 越出 preview rect 的输入全部失败关闭，clip 仍沿用 A6.15 原值。颜色只来自现有八 tone，但不参与 geometry identity 放行；文字/glyph 与 accessibilityText 继续是并行信息通道。

A5/A6战斗语法增强在这组三panel上做零增量的有界重排：索引与详情复用同一核心，保留panel ID/role、fallback text和A6.18主体整数尺寸，只把现有`coreVerb / ground+aerial failureRisk / counterInputs`编码为位置与圆角的第二阅读层。同武器同标准rect在index/detail得到相同相对签名；四种标准槽仍须20武器+2地图22/22纯几何唯一，详情实际200/260px槽须保持20/20整数几何身份，否则构造失败。未来获批GLB透明中心不受重排；A6.18的批准、token和零资源边界不变。

两张地图的详情回退同样不新建spec：`map-index`路线轨与`map-detail`的3个既有fallback panel都调用同一route geometry核心，空港断层保持12段的前进断层/跨越落点语义，折返天梯保持8段折返阶梯语义。同地图同rect的相对panel签名一致；详情仅接受A6.15固定200/260槽并保持原ID/clip/tone/zIndex与文字，当前仍是零许可、零资源正常路径。

- 武器 profile 的动作语义只引用既有 `push / pull / charge / suppress / counter / flank`，不重判命中或动作时序。
- 地图 profile 的节奏/地标只引用既有 20 段体验目录，不从 ID、坐标或胜负结果反推路线。
- reduced-motion：始终静态，无自动旋转、闪烁、pulse、RAF 或 timer。
- muted：视觉信息完全一致；理解不依赖声音。
- 390×844 / 1440×900：继续使用 A6.15 当前 slot、安全内边距、滚动与 clip，不新增第 12 页或横向滚动。

## 5. RenderPlan / DOM / Canvas 接入

A6.15 在 slot 不满足 `formalReady && assetUsePermitted` 时调用 A6.18 primitive projector。输出仍是既有 `panel + text`，因此：

- DOM 与 Canvas 继续消费同一 preview-aware RenderPlan，不增加第二套 renderer 算法；
- selection action、详情返回/选择动作、名称、收藏/熟练事实和滚动坐标不变；
- 当前 22 项全部走 A6.18；没有 preview border、透明 Three center、request token 或资源调用；
- A6.16/A6.17 看到纯 fallback frame 后继续不调用 rendererFactory，也不创建 A6.14 Host。

未来只有新 production approval ledger 版本与独立 gate 能开放 GLB 路径。届时 A6.18 仍是 missing/失败回退，不得被改成程序化 3D 正常路径。

## 6. 未运行测试源码

已写但未运行的测试覆盖：

- 20 武器 + 2 地图的 profile/definition/signature 唯一性；
- 同输入同输出、深冻结和固定 4 primitive / 1 text 上限；
- A6.4 四种标准槽内，22 项实际三 panel 的非文字 geometry signature 均唯一且所有 panel 不越出 preview rect/clip 合同；
- 每项同时存在主形状、辅助形状、线型/glyph、标签和 accessibilityText，颜色不是唯一编码；
- unknown definition、asset 漂移、future field、零尺寸或顺序/12+8节奏漂移在输出前拒绝；
- A6.15 当前 20 武器与 2 地图全部产生不同语义标签，同时 0 formal transparent preview；
- 当前全 false 账本下，A6.16/A6.17 既有零 loader/lease/mount/renderer 反证继续有效。

测试、typecheck、lint、format、build、浏览器、截图、设备、性能与真人证据全部 `not-run`，不得据此声称视觉通过。

## 7. 六维静态自检与回滚

| 维度 | 静态结论 | 顺延证据 |
|---|---|---|
| 视觉/内容范围 | 22 项在四种标准槽中均有唯一三panel几何signature，并保留图案＋标签；无新页面/动作/玩法维度 | 双视口截图、识别率与真人理解 |
| 来源/权利 | 只读引用既有 Definition、阅读目录、Catalog binding；不改变许可或批准 | 当前 source 的最终审批与 A1.1 重建 |
| 预算确定性 | 每槽 4 primitive/1 text；页面 256 上限不变；零资产字节 | 实际 DOM/Canvas 计数和性能 |
| 恶意边界 | ID/asset/source hash 闭合，unknown/future/coherent substitution 拒绝 | 未运行测试与类型检查 |
| 生命周期/副作用 | 纯数据；不创建 Three、loader、lease、mount、timer | 浏览器销毁和迟到结果实测 |
| 治理/回滚 | `code-written-not-run/not-run`，批准账本和默认入口不变 | 协调签核、设备、真人、Final |

最小回滚：删除 A6.18 两个新增源码及其测试、移除包导出，并把 A6.15 两处 fallback 调用恢复为旧通用 pattern/text；无需回滚任何资产、批准账本、loader、默认入口或 Profile 数据。
