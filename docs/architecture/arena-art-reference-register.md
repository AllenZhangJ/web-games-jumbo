# Arena 六类注释参考登记

## 状态与使用规则

- 状态：原A0.2.1为`source-ready`、补充来源为`supplemental-source-ready`、A0.2.2为`board-ready`；[A0.2视觉方向总门](arena-art-reference-total-gate-a0.2.md)经独立复算为`ready`（96/100），Reference Board视觉方向总门同步`ready`；A0.3与生产门仍`incomplete`
- 日期：2026-07-28
- 比例：每类按 `70% 基线 / 20% 追求 / 10% 刻意张力` 使用；比例表示评审决策权重，不表示复制面积、训练集比例或最终资产来源比例
- 边界：本文只登记“借鉴什么”和“明确不复制什么”。没有可再分发许可的外部图片只保留链接或研究文档，不下载、不嵌入、不进入模型训练、生产纹理或正式 Bundle

所有图片必须存入独立参考板目录并带来源、作者、URL/revision、许可、取得日期和用途标签。A0.2.2实际板见[正式参考板与自审](arena-art-reference-boards-a0.2.2.md)及其[机器总台账](../quality/art/reference-boards/arena-a0.2.2-reference-board-ledger-v1.json)。独立[A0.2总门](arena-art-reference-total-gate-a0.2.md)已通过，A0.2与Reference Board只在“视觉方向”范围内为`ready`。

A0.2.1原始60条来源输入见[A0.2.1来源与权利包](arena-art-reference-source-pack-a0.2.1.md)及其[机器台账](../quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json)，签核事实保持不变。武器/反馈另有16个项目原创直接视觉的[独立补充来源包](arena-art-reference-source-supplement-a0.2.1.md)，已签核但不回写原包。六类[来源抽检页manifest](../quality/art/reference-source-inspection/a0.2.1-contact-sheet-manifest-v1.json)只用于审阅原36个embedded输入；各子门本身不自动代表A0.2整体，当前整体`ready`来自其后的独立聚合总门，且仍不代表生产样件通过。

## 1. Mood / 情绪

| 权重 | 来源 | 具体借鉴点 | 明确不复制 | 许可/使用边界 | 图片状态 |
|---|---|---|---|---|---|
| 70 基线 | [Arena 双角色概念图](../characters/parkour-duo-concept-v1.png)及[角色方向](../characters/README.md) | 明快玩具体块、跑酷前倾姿态、手稿速度线形成“轻造型、真后果”的基调 | 不把概念背景、比例或线稿直接当运行时资产 | 仓库内设计资料；未进入正式 provenance，限内部方向评审 | 本地图存在，权利登记待补 |
| 20 追求 | [正式资产入库结果](../research/arena-stage7-formal-asset-intake-results.md)中的 KayKit CC0 角色 | 低多边形角色在高频动作中仍保持友好、清晰、可组合的情绪 | 不照搬 KayKit 默认角色设定、配色组合或整包世界观 | CC0来源/revision已固定；最终变体仍需原创审美和独立四门 | 待制作注释裁切板 |
| 10 张力 | [热血英豪武器研究综合](../gameplay/arena-v2-hot-blooded-weapon-design-synthesis.md) | 只吸收攻击承诺、命中后果和反制带来的热血张力 | 不复制角色、武器名、动作、特效、数值、截图或职业体系 | 官方资料仅供行为研究；图像版权未授权再分发 | 仅文字/链接，待合法替代图 |

## 2. Color / 色彩

| 权重 | 来源 | 具体借鉴点 | 明确不复制 | 许可/使用边界 | 图片状态 |
|---|---|---|---|---|---|
| 70 基线 | [Art Bible 色彩 Token](arena-art-bible.md#3-语义色彩)与现有 Arena Product 页面 | 暖纸白、深墨色作稳定底，蓝/红/黄/绿只承担具名语义 | 不从现有截图反采未经声明的随机颜色，不让颜色单独承担状态 | 项目内部 token；实际 UI 截图仍须绑定构建身份 | 待生成项目自有色板 |
| 20 追求 | KayKit 正式角色的三张 CC0 纹理及[来源清单](../../governance/third-party/arena-runtime-assets-v1.json) | 观察低纹理密度下大色块如何维持角色分区 | 不直接复用纹理上的身份色作为 Arena 规则色，不扩展为一角色一张1024纹理 | CC0且hash已固定；只能在预算与语义色约束内改造 | 待制作取色注释板 |
| 10 张力 | [弹壳特攻队界面研究](../research/arena-v2-survivor-io-ui-study-v1.md) | 研究高饱和奖励色如何迅速抓取注意力，用作“克制上限”的张力样本 | 不复制其渐变、稀有度色、货币色、图标或商店氛围 | 官方商店图仅可链接研究，不下载/再分发 | 仅文字/链接，待合法替代图 |

## 3. Composition / 构图

| 权重 | 来源 | 具体借鉴点 | 明确不复制 | 许可/使用边界 | 图片状态 |
|---|---|---|---|---|---|
| 70 基线 | [KZ 分叉镜头观察](../research/arena-v2-kz-branch-camera-observation-results-v1.md) | 同屏保留选择点、两条路线前段和重入关系；构图中心是下一决策而非角色肖像 | 不把研究视锥或waypoint当成生产镜头已通过 | 项目研究数据；只证明几何可见，不证明真人理解 | 无渲染图，待真实Renderer截图 |
| 20 追求 | [KZ 路线研究](../research/arena-v2-cs16-kz-map-study-v1.md)登记的长跳、分叉、连续修正资料 | 借鉴“入口—承诺—落点—恢复”连续空间句法和地标层级 | 不复制任一CS地图布局、比例、材质、标志、名称或截图 | 外部地图页面只作研究来源，不证明可商用授权 | 仅文字/链接，待原创构图板 |
| 10 张力 | [武器×KZ后果研究](../research/arena-v2-weapon-language-kz-consequence-results-v1.md) | 用边缘、高低差和狭窄空间制造构图压力，检验反馈是否仍可读 | 不用特写镜头、重遮挡或屏幕特效掩盖真实路线信息 | 项目研究结果；生产构图必须重新由正式Map验证 | 待合法生成原创压力样图 |

## 4. Character / 角色

| 权重 | 来源 | 具体借鉴点 | 明确不复制 | 许可/使用边界 | 图片状态 |
|---|---|---|---|---|---|
| 70 基线 | 两名 KayKit 正式角色及[角色索引](../characters/README.md) | 头肩、躯干、背部、肢体间隙和六方向朝向构成当前两槽基线 | 不宣称已有六角色，不把换色当新角色，不改变碰撞暗示 | KayKit CC0且正式入库；当前只覆盖2个正式角色 | 资产存在，六方向板待渲染 |
| 20 追求 | [跑酷学徒模型/动作拆解](../characters/parkour-apprentice-model-sheet-v1.png)与[发条方块拆解](../characters/wind-up-cube-model-sheet-v1.png) | 追求“轻型有方向性”与“方型有机械节奏”在动作中持续可辨 | 不把设计图直接作为纹理/背景，不提前推导新角色技能 | 仓库设计资料，未形成正式运行时provenance | 本地图存在，注释板待补 |
| 10 张力 | [热血英豪案例研究](../gameplay/arena-v2-hot-blooded-weapon-design-synthesis.md) | 观察夸张装备如何改变姿态和重心，作为武器压过角色轮廓的压力测试 | 不复制角色造型、服装、职业、武器或招式 | 官方资料仅供分析；无图像再分发权 | 仅文字/链接，待合法替代图 |

## 5. Environment / 环境

| 权重 | 来源 | 具体借鉴点 | 明确不复制 | 许可/使用边界 | 图片状态 |
|---|---|---|---|---|---|
| 70 基线 | [KZ 独立灰盒结果](../research/arena-v2-kz-branch-greybox-results-v1.md) | surface边界、分叉、窄路、楼梯、钢丝、断层、恢复面先构成可玩骨架 | 不把greybox、研究材质、研究代码或waypoint列为生产资产 | 项目研究工具链，禁止进入生产交付清单 | 灰盒证据存在，正式环境板待补 |
| 20 追求 | [KZ 地图研究来源登记](../research/arena-v2-cs16-kz-map-study-v1.md) | 追求宏/中/微地标和不同段落节奏在远景中可辨 | 不复制第三方地图几何、装饰、纹理、标志、名称或配色 | 外部档案只证明观察对象；商用授权未知 | 仅文字/链接，待开放许可建筑图 |
| 10 张力 | 当前生产预算与移动端拥挤研究 | 用少量超尺度玩具地标测试导航，不以道具密度制造“丰富” | 不做主题乐园式堆物、不遮边缘、不伪装可落地面 | 必须由项目原创或可商用来源，逐件记录hash | 无图，待原创张力草图 |

## 6. UI / 界面

| 权重 | 来源 | 具体借鉴点 | 明确不复制 | 许可/使用边界 | 图片状态 |
|---|---|---|---|---|---|
| 70 基线 | [V2界面地图](../product/arena-v2-screen-map.md)与[局外布局结果](../research/arena-v2-survivor-io-ui-surface-results-v1.md) | 一页一问题、一主动作、首屏≤3项、48px触控和390×844单列 | 不把研究页样式或截图直接当最终UI，不建立第二套ViewModel | 项目自产研究页面；需以生产构建重新截图 | 研究图存在，生产组件板待补 |
| 20 追求 | [弹壳特攻队官方资料研究](../research/arena-v2-survivor-io-ui-study-v1.md) | 借鉴快速回到主循环、武器行为卡优先于细枝末节的组织方式 | 不复制页面数量、排版、卡片皮肤、图标、货币和成长系统 | 官方商店页面仅链接研究，不下载/再分发 | 仅文字/链接，待项目原创线框 |
| 10 张力 | 同一研究中的当前版本复杂系统记录 | 作为“信息密度失控”压力样本，检查Arena是否仍只有一个下一目标 | 不引入宠物、载具、多货币、活动入口或密集红点 | 仅用于Anti-reference分析 | 不建立图片板，保留文字反例 |

## 7. Anti-reference 登记

| 拒绝方向 | 拒绝原因 | 触发后的处理 |
|---|---|---|
| 写实军事/末世脏污/高频磨损 | 吞掉玩具体块和移动方向，纹理成本超预算 | 退回Concept，改为大色块与材质类别差异 |
| 全屏赛博霓虹/所有事件发光 | 语义色失去优先级，色觉与低端设备均不可靠 | 先灰度重做核心Cue，只恢复一个必要强调色 |
| 角色只换色、装备只换拖尾 | 黑剪影无法区分，不能支撑最多六角色和逐武器学习 | 退回Blockout，至少改体块/重心/头肩/背部/步态三项 |
| KZ地图复刻或灰盒直接贴材质 | 来源风险且没有原创路线视觉语言 | 拒绝入库，回到正式Map Definition做原创翻译 |
| 密集卡片、红点、货币和渐变 | 破坏11页单一问题与快速开局 | 删除非必要层级，以同源事实重排 |
| AI原图或来源不明网络图直接Final | 无法证明权利、风格一致性和可重建性 | 只能研究/Concept，补来源和人工重制后重走四门 |

## 8. A0.2 六张实际板执行规格

### 8.1 必须交付的文件

| 类别 | 可编辑源文件 | 审阅板面 | Manifest |
|---|---|---|---|
| mood | `docs/quality/art/reference-boards/arena-mood-board-v01.svg` | `arena-mood-board-v01.png` | `arena-mood-board-v01.manifest.json` |
| color | `docs/quality/art/reference-boards/arena-color-board-v01.svg` | `arena-color-board-v01.png` | `arena-color-board-v01.manifest.json` |
| composition | `docs/quality/art/reference-boards/arena-composition-board-v01.svg` | `arena-composition-board-v01.png` | `arena-composition-board-v01.manifest.json` |
| character | `docs/quality/art/reference-boards/arena-character-board-v01.svg` | `arena-character-board-v01.png` | `arena-character-board-v01.manifest.json` |
| environment | `docs/quality/art/reference-boards/arena-environment-board-v01.svg` | `arena-environment-board-v01.png` | `arena-environment-board-v01.manifest.json` |
| ui | `docs/quality/art/reference-boards/arena-ui-board-v01.svg` | `arena-ui-board-v01.png` | `arena-ui-board-v01.manifest.json` |

板面是设计证据，不进入 `public/`，也不占运行时正式资产预算；但仍必须记录自身和所有嵌入输入的hash。

### 8.2 画布与版式

- 可编辑源和PNG均固定 `2560×1440`、sRGB、无透明背景；PNG不得经过有损压缩。
- 画布：顶部40px安全边；标题区100px；中部10格参考区`2400×960`，左右各80px；底部说明区280px；底部60px安全边。
- 参考区为`5列×2行`，每格`480×480`。每格上部`480×320`显示合法视觉或link-only卡，下部`480×160`显示注释摘要。
- 10格按固定顺序组成实际70/20/10区块：`B01–B07`为70%基线、`A01–A02`为20%追求、`T01`为10%刻意张力。三类用区块标题、边框型式和编号区分，不只用颜色。
- 底部说明区必须显示：本板一句话目的、3条Key Takeaways、2条Anti-reference、Art Bible版本、manifest ID、状态和签核栏。
- 图片不得拉伸；使用contain裁切并显示原始宽高比。任何必要裁切必须在manifest记录`crop`，不得裁掉会改变判断的上下文。

### 8.3 每格可见注释与完整字段

每格板面至少可见：`entryId`、来源短名、具体借鉴点、明确不复制点、许可徽标和`embedded/link-only`状态。完整信息写入manifest：

- `entryId`、`weightClass`、`boardSlot`、`sourceKind`、`title`、`creator/rightsHolder`；
- `sourceLocator`、固定`sourceRevision`或`retrievedAt`、`licenseId`、`licenseLocator/proofArtifact`；
- `embeddingMode`、输入artifact路径/尺寸/byteLength/SHA-256；
- `crop`、`specificTakeaway`、`doNotCopy`、`usageBoundary`、`antiReferenceReason`；
- `reviewStatus`和审阅意见。

`具体借鉴点`必须能指导一个视觉决定；“氛围好”“颜色高级”“参考这个游戏”均视为无效注释。

### 8.4 嵌入与link-only规则

| 来源状态 | 板面处理 | 是否计为合法视觉格 |
|---|---|---|
| 项目原创且作者/权利/源文件已登记 | 可嵌入，记录源artifact与hash | 是 |
| CC0/Public Domain且许可文本或官方证明已固定 | 可嵌入，记录revision、proof、artifact hash | 是 |
| 允许商业使用、修改和再分发的购买/委托素材 | 经权利批准后可嵌入 | 是 |
| 版权受限、仅研究、授权未知或官方商店截图 | 只能显示纯文字link-only卡，不缓存缩略图、不截屏、不转绘 | 否 |
| AI生成图 | 只有模型/checkpoint、训练许可结论、提示词版本、人工作者和源hash完整时可作Concept格；永不直接成为Final依据 | 有条件，必须标AI |
| 来源不明、无proof、仅搜索结果缩略图 | 禁止进入板面和manifest | 否，直接拒绝 |

每张板10格必须全部有真实entry，不允许空白、`TBD`、纯色空框或重复一张图充数。至少6格必须是可合法嵌入视觉，其中基线至少4格、追求至少1格；link-only最多4格，且不得让某一70/20/10区块完全没有合法视觉。Color板中的项目自产色板可以占1个合法视觉格，但不能替代其余来源。

### 8.5 Manifest schema

```json
{
  "schemaVersion": 1,
  "id": "arena.art.reference-board.mood.v1",
  "category": "mood",
  "artBibleRevision": "a0.1",
  "weights": { "baseline": 70, "aspiration": 20, "tension": 10 },
  "sourceArtifact": {
    "path": "docs/quality/art/reference-boards/arena-mood-board-v01.svg",
    "sha256": "<64 lowercase hex>",
    "byteLength": 0
  },
  "reviewArtifact": {
    "path": "docs/quality/art/reference-boards/arena-mood-board-v01.png",
    "sha256": "<64 lowercase hex>",
    "byteLength": 0,
    "width": 2560,
    "height": 1440,
    "colorSpace": "srgb"
  },
  "entries": [
    {
      "entryId": "mood-b01",
      "weightClass": "baseline",
      "boardSlot": "B01",
      "sourceKind": "original|open-source|public-domain|purchased|commissioned|research-link|ai-concept",
      "title": "<source title>",
      "creator": "<creator or rights holder>",
      "sourceLocator": "<stable path or URL>",
      "sourceRevision": "<commit/version/retrieved date>",
      "licenseId": "<SPDX-like id or RIGHTS-RESTRICTED>",
      "licenseLocator": "<license/proof path or URL>",
      "embeddingMode": "embedded|link-only",
      "artifact": null,
      "crop": null,
      "specificTakeaway": "<one actionable visual rule>",
      "doNotCopy": "<explicit exclusion>",
      "usageBoundary": "<allowed use>",
      "antiReferenceReason": null,
      "reviewStatus": "source-verified"
    }
  ],
  "keyTakeaways": ["<1>", "<2>", "<3>"],
  "antiReferences": ["<1>", "<2>"],
  "signOff": {
    "status": "draft|source-verified|art-director-approved|coordination-approved|rejected",
    "artDirector": { "name": null, "signedAt": null },
    "coordinator": { "name": null, "signedAt": null }
  }
}
```

`artifact`在`embedded`时必须是含`path/sha256/byteLength/width/height`的对象，在`link-only`时必须为`null`。Manifest必须恰好10条entry，slot和权重分布必须为7/2/1，所有路径位于仓库内或是稳定来源URL。

本节所有 `sha256` 字段统一使用 SHA-256，编码为64位小写十六进制；SVG、PNG与每个嵌入输入素材分别计算，不得以来源网页hash或下载前声明值代替仓库实际文件hash。

### 8.6 A0.2评分与硬门

| 维度 | 分值 | 满分标准 |
|---|---:|---|
| 六板完整与70/20/10 | 25 | 六类各10格，7/2/1准确，无空占位 |
| 注释可执行性 | 20 | 每格借鉴点、不复制点和用途边界可指导制作 |
| 来源/许可/hash | 20 | 嵌入与link-only合法，源/板/输入hash可复算 |
| 视觉一致性与Anti-reference | 15 | 六板共同支撑Art Bible，张力不推翻基线 |
| 版式与可审阅性 | 10 | 2560×1440、缩放后文字可读、无裁切误导 |
| 双签核与状态诚实度 | 10 | 美术指导与协调签名/日期齐全，状态无越级 |

通过条件：总分≥90、每维度≥80%、六份PNG/SVG/manifest齐全、manifest校验通过、签核状态为`coordination-approved`。任一板为空占位、全是link-only、缺hash/许可、只有文字无实际视觉或未双签核，A0.2整体保持`incomplete`并阻断后续生产Blockout。

### 8.7 当前结论

A0.2.2六张实际板每板恰好10条7采用/2规避/1实验，消费44条原签核来源和16条补充来源，共40个embedded与20个link-only。独立总门再复算来源、权利、hash、板面使用、签核和下游false状态，以96/100通过为`ready`。武器与反馈仍为`direction-contract`而非生产样件；A0.3、Blockout、LOD、设备、真人与Final继续`incomplete`/fail closed。
