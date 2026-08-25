# Arena 美术与音频开发流程

## 文档状态

- 状态：已接受的 Presentation / Platform 执行基线
- 日期：2026-07-28
- 适用产品：Arena Product；历史数值跳台 v3、研究页、Pilot 和灰盒不属于生产交付
- 技能安装目录：`.agents/skills/`
- 技能锁定清单：[`skills-lock.json`](../../skills-lock.json)
- 关联治理：[`AGENTS.md`](../../AGENTS.md)、[V2 生产化分阶段开发与治理计划](arena-v2-production-development-plan.md)、[ADR-109](../decisions/109-arena-art-and-audio-skill-routing.md)
- 视觉生产基线：[Arena Art Bible](arena-art-bible.md)
- 注释参考登记：[六类70/20/10登记](arena-art-reference-register.md)；A0.2三个子门已签核，[独立视觉方向总门](arena-art-reference-total-gate-a0.2.md)以96/100通过，A0.2与Reference Board视觉方向为`ready`；[A0.3技术/代理候选](arena-art-silhouette-a0.3.md)已在`60fbc13`完成clean-source机器重生成，仍为85/100、真人0/10和`incomplete`，正式模型/VFX样件、Blockout及后续成熟度继续fail closed
- 阶段协作基线：[美术 A0–A7 与开发 P0–P7 对齐矩阵](arena-art-development-alignment-matrix.md)
- 当前供给表现合同：[A1.0供给表现预生产合同](arena-art-supply-presentation-contract-a1.0.md)保留v1不可变语义身份；A1.0-v2已在最终clean source `5e84714`完整重建28源、25映射与51项规格，正向和90/90隔离矩阵通过，并由主协调以94/100完成最终source外部签核，机器包自身继续`hardGate=false`。[A1.1来源与测量就绪包](arena-art-supply-readiness-a1.1.md)已在`16861edc`重算六artifact与调用链，正向及93/93隔离拒绝通过，只关闭当前source绑定和测量方案机器就绪。A0.3真人、A1.1协调/来源批准/捕获批准、代表样件、Blockout、正式VFX/音频、浏览器/设备/真人与Final仍关闭
- 当前模式表现合同：[A2.0三模式事件与Cue预生产合同](arena-v2-a2.0-mode-event-cue-preproduction-contract.md)以clean baseline `92bafbd`建立33项源码身份、17项直接fixture与44项隔离拒绝的可复算机器包；Jump capability已在机器schema、checker、探针和直接规格统一为start/step必填权威能力，状态显式为未提交待协调复核。A2.0仅为`preproduction-contract-machine-closed / hardGate=false`；默认入口、正式媒体、截图、浏览器/设备/性能和真人门仍关闭

## 1. 目的与项目特化边界

本流程把本项目已安装的14个外部技能变成可重复的生产路由。技能只负责帮助设计、制作、导出、接入和验收，不会成为运行时依赖，也不能改变 Arena 的权威规则。

项目真值优先级固定为：

1. Arena 的 Definition、Registry、MatchCore、稳定表现事件和现有正式资产合同；
2. `docs/product/`、`docs/gameplay/`、`docs/research/`、`docs/architecture/` 和已接受 ADR；
3. 本流程和14个 `.agents/skills/*/SKILL.md`；
4. 技能中的通用示例、引擎假设和推荐预算。

以下边界不可被技能示例覆盖：

- 生产继续按 `Rule → Core → Bot → Presentation → Platform` 推进。美术、VFX、UI、音乐和音效只能消费只读快照与权威事件，不能重新判定命中、拾取、淘汰、计时、随机或胜负。
- Three.js、DOM、平台 API、墙钟时间和未注入随机源不得进入 Arena 权威层。动画和粒子使用表现层注入的时间步；音乐可以使用音频时钟做声部对齐，但不能回写比赛状态。
- `greybox`、研究、Pilot 和概念验证的素材只能留在开发/测试工具链。程序化角色只能在正式资产加载失败时兜底，不能成为正常生产渲染路径。
- 第三方素材必须有来源 revision、许可证文本、权利证明、SHA-256、批准记录和可重建路径。技能仓库本身也通过 `skills-lock.json` 记录来源与内容 hash。
- 泛化技能里的 Unity、Unreal、Godot、GDScript、JavaScript 或 `Clock.getElapsedTime()` 示例只作为方法参考；Arena 生产实现必须落到严格 TypeScript、Three.js 表现层和现有生命周期合同。

## 2. 14个技能的使用路由

每个美术或音频任务在任务记录、PR 描述或阶段交付包中写明使用的技能 ID。不是每次任务都机械调用14个技能，而是按产物类型选择对应路由；凡是技能明确要求读取 `references/` 的，实施前必须读取相应参考文件。

| 技能 | 分流 | 在 Arena 中何时使用 | 必须留下的产物或证据 |
|---|---|---|---|
| `art-bible` | 视觉总纲 | 新增角色、地图、武器、反馈、UI 主题，或视觉方向发生变化 | 视觉身份、情绪、形状、色彩、角色、环境、UI、VFX、资产标准和禁用项；Arena 以现有 V2 产品文档替代技能默认的 `design/gdd/game-concept.md` |
| `game-art-director` | 美术指导 | 概念评审、参考板、风格统一、外包/协作交付和最终视觉签核 | 轮廓、色彩、材质、光照、镜头距离、LOD、命名、来源和评审意见；AI 生成内容不得未经人工批准成为最终资产 |
| `character-design-sheet` | 角色设计 | 新角色、角色变体、动作语义、颜色识别和六方向可读性 | 转面/姿态/表情/颜色 bible、角色差异点、镜头缩略图检查和动作映射；现有 KayKit 正式角色仍必须保留18条正式动画 |
| `game-3d-assets` | GLB/GLTF资产工程 | 正式角色、武器附件、地图道具和 Three.js 模型接入 | 资产来源、GLB/GLTF 选择、`SkeletonUtils.clone()`、clipMap、包围盒/朝向/落地/缩放检查和浏览器截图；未经授权不调用 Meshy 或下载商业素材 |
| `blender-web-pipeline` | DCC导出 | Blender 建模、贴图烘焙、批量 GLB 导出、LOD 和 Web 优化 | GLB 导出配置、PBR 材质、纹理尺寸、LOD、对象命名、清理记录和 glTF viewer/浏览器检查 |
| `glb-compressor-cli` | GLB压缩 | GLB 已完成内容评审后进入交付包或构建预算压缩 | 压缩前后大小、动画数量/名称、骨骼、材质和视觉回归；蒙皮角色不得只为减小体积盲用 aggressive/max preset |
| `media-asset-management` | 媒体资产管理 | 素材库、交付格式、图片/视频/截图、命名、元数据和权利审计 | source → process → deliver → manage 清单；源文件与交付文件分离、尺寸/格式/alt 或语义元数据、弃用和权利记录 |
| `threejs-animation` | Three.js动画 | GLB 动画播放、动作混合、攻击/受击/移动动画和骨骼附件 | 稳定 clipMap、动画语义映射、混合/淡入淡出规则、注入 dt、不可见暂停和 `destroy()` 释放证据 |
| `threejs-materials-lighting` | 材质与灯光 | 角色、地图、武器、反馈特效的 PBR/非 PBR 选择和场景光照 | 材质类型、色彩空间、key/fill/IBL、阴影开关、透明度策略和目标设备截图；不得以大量点光源替代可测量的照明设计 |
| `vfx-realtime` | 实时VFX | 五类武器反馈、击落、攻击预警、移动轨迹、环境氛围和屏幕效果 | Shape–Timing–Color 表、anticipation/action/follow-through、灰度读出、层级/LOD、reduced-motion 变体、overdraw 和构建验证 |
| `particle-systems` | 粒子系统 | VFX 需要粒子发射、模拟、渲染、回收、对象池或多质量级时 | 发射—模拟—渲染—死亡生命周期、显式上限、池化、透明度/overdraw、低端变体和资源释放；技能的 Unity/Unreal API 不直接复制到 Arena |
| `threejs-game-ui-designer` | HUD/UI | 11个局外页面、竞技准备、生存 HUD、设置、结算和 Canvas/DOM 同源界面 | 信息层级、稳定尺寸、焦点/触控/语义/reduced-motion 检查、390×844 与桌面截图；UI 不得持有规则状态 |
| `level-design` | 地图与关卡美术 | P3 KZ 正式地图、分叉路线、重入锚点、景别、引导和环境装饰 | blockout → playtest → iterate → dress 记录、critical/golden path、节奏/教学/引导和真人路线理解证据；研究地图不直接变成生产地图 |
| `audio-design` | 音乐、音效和混音 | 武器反馈、移动/掉落/重生、UI、环境氛围、循环音乐和自适应音乐 | Master → Music/SFX/Ambience/UI/Voice 总线、dB/ducking、一次性音效池、循环点、声部强度、声音开关、reduced-motion/静音行为和目标设备录音 |

### 2.1 强制参考文件路由

未来实施对应任务时，除 `SKILL.md` 外按下表读取参考文件：

| 任务 | 参考文件 |
|---|---|
| VFX 创作与评审 | `.agents/skills/vfx-realtime/references/patterns.md`、`sharp_edges.md`、`validations.md` |
| 粒子系统 | `.agents/skills/particle-systems/references/PARTICLES_GUIDE.md` |
| 音乐/自适应音乐 | `.agents/skills/audio-design/references/adaptive-music.md` |
| KZ 节奏、教学和路线 | `.agents/skills/level-design/references/pacing-and-flow.md` |
| Three.js 材质和灯光 | `.agents/skills/threejs-materials-lighting/references/materials-lights-table.md` |
| HUD/菜单/移动端 UI | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` 以及对应的 `references/checklists/` |
| Blender 导出和优化 | `.agents/skills/blender-web-pipeline/references/gltf_export_guide.md`、`optimization_strategies.md`、`bpy_api_reference.md` |
| 图片/视频交付 | `.agents/skills/media-asset-management/references/responsive-image-patterns.md` |

## 3. 按阶段执行的生产流程

本节的 A–F 是单件资产的门禁顺序；跨项目阶段的排期、输入、评分、硬门和返工范围以[美术 A0–A7 与开发 P0–P7 对齐矩阵](arena-art-development-alignment-matrix.md)为准。任何单件 Final 资产都必须完整经过 `Concept → Blockout → Integration → Final`，不得因开发阶段推进而跳门。

跨阶段A0前置拆为：A0.1视觉宪法/来源登记/对齐合同、A0.2六类实际注释参考板、A0.3剪影工具与盲测基线。A0.1签核只批准合同；A0.2/A0.3任一`incomplete`时，后续可继续Rule/Core和合同准备，但生产资产不得进入Blockout。

### A. 视觉与声音 Brief 门

输入是当前产品总纲、玩法框架、角色规范、武器/地图研究结论、页面合同和本流程。先使用 `art-bible` 与 `game-art-director` 收敛一条能够解决歧义的视觉规则，再用 `character-design-sheet`、`level-design`、`threejs-game-ui-designer` 和 `audio-design` 把它分别翻译为角色、地图、HUD 和声音语言。

本阶段必须产出：

- 视觉身份、形状语言、语义色彩、光照和材质原则；
- 角色/武器/地图/UI 的轮廓与镜头距离规则；
- 音频总线、声音优先级、循环音乐和反馈声音的命名；
- 反馈事件到视觉 Cue、音频 Cue、reduced-motion Cue 的映射表；
- 明确哪些内容仍是研究、哪些才允许进入生产。

没有 Brief、来源边界和反馈映射，不进入正式资产制作。

### B. Rule/Core 行为合同门

表现资产必须等待权威行为合同。对每件武器和地图，先确认事件由 Rule/Core 产生，再规定表现层如何消费；不能先做一个动画或粒子效果，再让它反向决定玩法。

当前优先使用的五类反馈语义为：

| 权威反馈 | 视觉层职责 | 音频层职责 | 低动效/静音替代 |
|---|---|---|---|
| 命中确认 | 接触闪、受击姿态、方向和短时冲击层级 | 短促命中音，按武器语义区分 | 保留静态高对比标记和文本/语义提示，关闭闪烁与震动 |
| 支撑面转移 | 位移方向、落点/表面转移和路线结果 | 摩擦/落点/位移音 | 使用方向图形和稳定位置提示 |
| 击落出圈 | 出圈方向、掉落轨迹、重生前后果 | 低频结果音或短 sting | 保留结果图标、颜色以外的形状与文字 |
| 攻击被避开 | 攻击线/危险区被错开的结果 | 轻量 whiff/空放音，不冒充命中 | 保留攻击结束状态或方向标记，不用强闪光 |
| 移动失足 | 运动轨迹、失去支撑和恢复机会 | 移动/失足提示，不能与被击落混淆 | 只保留状态图标和方向提示 |

上述表是表现合同，不是新的规则定义。事件去重、来源 tick、武器 ID、地图上下文和结果必须来自现有稳定事件；表现层不得从坐标或动画时间重新猜测原因。

### C. Blockout、轮廓与可玩性门

使用 `level-design` 先按当前两张正式KZ基座地图的完整20段（首图12段、折返图8段）建立主路线、分叉、窄路、楼梯、走钢丝、断层、终点和安全重入锚点，再进行装饰。按 `critical path → golden path → branch → recovery` 检查，确保所有跳跃和重入有真实物理证据。

使用 `character-design-sheet` 与 `game-art-director` 检查角色、武器持握和敌我身份在游戏镜头距离、六方向和多人拥挤中的轮廓。使用 `threejs-materials-lighting` 先确定明暗层级，再补贴图和装饰。

本阶段拒绝以下做法：

- 用地面装饰掩盖无法通行、路线不清或安全重入缺失；
- 用发光、颜色或屏幕震动掩盖角色/武器轮廓冲突；
- 把研究 KZ 地图、研究武器或程序化几何直接列为生产资产；
- 在没有事件语义的情况下批量制作五类反馈特效。

### D. 正式资产制作、导出与入库门

#### 3D资产

1. `game-art-director` 锁定轮廓、材质和镜头目标；`character-design-sheet` 锁定角色转面、颜色和动作语义。
2. `blender-web-pipeline` 负责 Blender → GLB，使用 glTF 2.0、PBR/Principled BSDF、正确 UV、明确对象名、无未使用数据，并保留动画导出设置。
3. `glb-compressor-cli` 只在动画和视觉验收之后压缩。每次压缩都重新检查骨骼、18条动画、clip 名称、材质、朝向、包围盒、落地和截图。
4. `game-3d-assets` 负责 Three.js 加载合同：静态模型可普通 clone，蒙皮动画模型必须 `SkeletonUtils.clone()`；必须记录 clipMap、朝向、目标高度和资源销毁路径。
5. `media-asset-management` 记录源文件、交付 GLB、纹理依赖、license、revision、SHA-256、使用位置和弃用版本。

#### 图片、UI、VFX和音频

- 图片/UI 先保留可追溯源文件，生成明确尺寸的 WebP/PNG/SVG 交付版本；带语义的图片有文本/语义说明，装饰图不伪装成信息。
- VFX 用 `vfx-realtime` 的 Shape–Timing–Color 和 value-first 评审；核心反馈层先通过，装饰粒子、扭曲和环境粒子可以按质量级关闭。
- 粒子必须有最大数量、生命周期、池化/回收和 overdraw 记录。技能示例中的通用粒子数不是 Arena 合同；以项目资产预算和目标设备 Trace 为准。
- 音频按 `audio-design` 分总线并控制 headroom；短音效复用池，长音乐按循环点/声部/切换策略设计。声音开关不能让表现层重新判定事件，只改变播放策略。

### E. Presentation 接入门

接入顺序固定为：

```text
权威 Snapshot / Stable Event
        ↓
Presentation ViewModel / Cue 选择
        ↓
Three.js Animation / Material / VFX
        ↓
Audio Bus / Music Layer / UI
        ↓
DOM、Canvas、Web、微信、抖音平台包装
```

接入要求：

- 动画系统使用稳定语义到实际 GLB clip 的 `clipMap`，空闲、移动、跳跃、攻击、受击、掉落、重生和胜负不能依靠字符串猜测或模型顺序。
- Three.js 动画使用注入表现时间步更新 Mixer；不可见对象暂停更新，`destroy()` 停止 mixer、释放 geometry/material/texture、清理音频和粒子句柄。
- 材质使用与目标风格相容的 `MeshStandardMaterial`/PBR 或有意选择的 unlit 方案；确认 sRGB/linear、环境贴图、阴影和透明排序，不以更低分辨率换取性能通过。
- VFX 的生成来源必须是稳定反馈事件，核心层、方向层、结果层和装饰层可独立开关；reduced-motion 至少保留因果和结果可读性。
- HUD、页面和 Canvas 只消费同一个 ViewModel；11 个页面仍遵守一页一个问题、一个主动作、首屏不超过三项关键信息和48px触控目标。
- Audio 只消费事件和状态快照；音乐的节拍切换、声部淡入淡出和 ducking 只影响听感，不创建或延长权威 tick。

### F. 自动化、浏览器、真机和真人门

验证分层记录，不互相替代：

1. **资产自动门**：格式、路径、来源记录、SHA、GLB 复杂度、动画、纹理、音频和文件大小。
2. **无渲染门**：反馈事件、Replay/hash、生命周期、资源池上限和表现事件去重不改变 Rule/Core 结果。
3. **浏览器门**：至少检查 `390×844` 和桌面视口，截图证明 HUD、角色、地图路线、武器、反馈和声音开关没有遮挡或溢出。
4. **目标设备门**：Web、微信、抖音 clean build 记录加载、峰值内存、帧时间、VFX overdraw、音频输出和前后台恢复。
5. **人工可读性门**：首次理解命中、击落、避开、失足、供给和重生原因；reduced-motion、静音、色觉差异和多人拥挤均需验证。

浏览器截图不能替代真机，Node/Replay 也不能替代表现和声音的真机证据。

## 4. Arena 正式资产合同与预算

当前生产资产合同是 `arena.stage7.formal-asset-budget.v1`。本流程不复制技能的泛化预算，所有正式资产必须通过项目的可重算政策。

2026-08-12 新增的 `arena.stage7.formal-asset-budget.v2-candidate` 只把当前正式 Presentation Catalog 的
130 个既有字节身份（2角色模型、20附件、2地图、8纹理、98音频）按 `assetId + path + byteLength +
SHA-256` 规范排序并重算总编码、音频和解码纹理字节。每项候选上限严格等于当前字节，不包含产品性能
余量；节点、关节、动作、primitive、material、纹理和设备上限仍为 `unresolved-not-approved`。因此 V2
保持 `production-unreachable / proposed-not-approved / hardGate=false`，默认 Bundle、Preloader、Entry
均不消费；V1 的 10 项正式覆盖与目录外 `uncovered` 真值继续有效。

该候选遵守 `media-asset-management` 的 `source → process → deliver → manage` 边界：来源 revision、许可、
权利与批准仍归正式 Catalog/证据账本；V2 只负责过程中的规范化预算身份和交付字节冻结；管理阶段批准、
资产修改、加载与发布均不归 V2。`game-art-director` 泛化强制参考
`docs/collaboration-protocol.md`、`docs/game-design-theory.md` 仍缺失并保持治理红门，不创建占位。
该缺口只在Art流程/台账文档登记，不得成为V2预算Definition、Readiness导出字段或content hash输入。

2026-08-15新增的A7结构预算证据候选V1只承接未来真实测量：130项资产结构/内存观察与P7六环境观察必须绑定当前Catalog、预算、clean source、lock、toolchain、build和证据SHA，再由不同Reviewer独立复核。Accepted仍不定义或批准任何上限；只有后续独立Structural Limit Proposal与预算批准才能改变`unresolved-not-approved`。当前未运行测量、测试、设备或性能任务，默认Bundle、Preloader、Entry继续关闭。

同日新增的[A7结构预算上限提案候选V1](arena-v2-a7-formal-budget-structural-limit-proposal-candidate-v1.md)把Accepted结构观察按Source→Process→Deliver→Manage边界转换为130项资产与六环境的不可变maximum提案。它强制角色分离、不低于观察值、非适用指标归零，并显式统计严格/零余量；但不猜统一余量百分比，也不批准余量充分性、资产或预算。独立预算批准、Policy变更和全部运行证据仍顺延，当前`hardGate/hardGateUsable=false`且默认消费继续关闭。

[A7预算独立批准决策候选V1](arena-v2-a7-formal-budget-independent-approval-decision-candidate-v1.md)随后把Manage职责从提案人再次拆开：Approver不得兼任Collector、Reviewer或Proposer，必须复核资产/环境余量、适用性/观察下限、Context恢复/清理，并精确处置全部零余量目标。Approved只允许进入新不可变Policy装配，当前V2仍不变、不批准、不接默认消费，所有运行证据继续顺延。

[A7已批准预算Policy装配候选V1](arena-v2-a7-formal-budget-approved-policy-assembly-candidate-v1.md)再由第五个独立Assembler把Approved Decision固化为新的V3不可变候选：130项资产、六环境、全部结构maximum、来源和批准identity进入同一Policy内容hash。内层只具备未来A7 V3复核资格，当前V2、默认Bundle/Preloader/Entry和外层hard gate均不改变，运行证据继续顺延。

[A7正式视觉/媒体冻结证据V3](arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.md)最终把新Policy候选与V1视觉/媒体封套闭合：当前130项目录、source、六环境build、来源权利、逐资产批准、三端交付、截图/录像和人审缺一不可。Freeze Manifest/Assembly只接受V3；当前无真实PASS，future fixture只证明数据流而不开放默认消费或发布。

P7.17进一步要求结构报告、独立评估、上限提案、批准记录和Policy装配五层Locator/SHA跨域互斥，防止同一美术/音频预算证据在多个治理角色中重复充数；不改变任何资产字节、预算值或当前批准状态。

P7.18把上述五层记录使用的采集、评估、提案、批准和装配时间统一到Evidence层规范UTC instant合同，不允许仅外形正确但日历无效的时间进入媒体资产治理身份；不改变Source/Process/Deliver/Manage职责、资产字节、预算数值或当前批准状态。

P7.19继续要求六环境原始证据与总报告、评估、提案、批准和Policy装配记录全部跨域互斥，并让环境证据身份沿Process→Deliver→Manage持续保留；防止同一截图、测量或报告被重新命名后承担多个独立治理角色，不改变资产字节、预算maximum或批准状态。

P7.20给媒体预算治理的角色/业务标识、证据Locator和说明文本增加统一上限，并拒绝身份/Locator的首尾空白与控制字符；防止同一角色用空白变体跨职责自证，也防止无界外部文本污染Source→Process→Deliver→Manage身份链。资产字节、预算值和批准状态不变。

P7.21要求A7 V3在汇总130项当前/maximum编码字节时保持安全整数精度，任何聚合溢出都在形成预算摘要或冻结身份前失败关闭；不得通过不精确大数伪造媒体资产总预算余量，且不以降低画质或删除资产作为修复手段。

P7.22将P7.20的角色/业务标识、证据Locator和文本上限收敛为单一内部Evidence值合同，Source、Process、Deliver和Manage各层必须消费同一Owner，禁止某一层私自放宽或复制另一套媒体证据命名规则。

P7.23要求媒体预算治理角色/业务标识使用小写ASCII规范闭集，证据Locator不得含任何空白；禁止Unicode近似角色或空格地址在Source→Process→Deliver→Manage链中生成视觉相似但字节不同的独立身份。

P7.24要求当前3张1024²材质纹理和5张128² VFX纹理以真实方形RGBA8宽高闭合解码与GPU下限；预算提案中的最大宽高、解码字节和GPU字节必须可同时成立。不得用等面积假尺寸、数字溢出或降低分辨率换取预算通过。

P7.25进一步明确正式Presentation Catalog是纹理尺寸Source Owner，预算V2只保存进入Policy identity的不可变投影，Readiness/批准账本逐项核对两者；Process/Deliver/Release不能根据解码字节猜测形状。新增或替换纹理时先更新正式Catalog的宽高，再同步预算投影中的宽、高、RGBA8解码字节和内容版本；非纹理资产宽高保持0。

P7.26要求同一个Source记录同时声明解码格式；当前8张纹理统一为`rgba8`，预算投影的非纹理项必须为`not-applicable`。尺寸、格式和解码字节共同进入Policy identity，后续若改变纹理格式，必须显式更新Source、预算内容版本和独立证据，不能只改4 B/px常量。

P7.27要求每个正式交付记录显式声明编码容器，并与路径后缀及媒体kind闭合：模型`glb`、音频`ogg`、纹理`png`。Budget只冻结该Source投影，Evidence/Release只核对，不得从OGG容器额外推断编码器、采样率、声道或解码内存；这些音频属性仍需独立manifest或实测证据。

P7.28要求Manage阶段的新不可变Approved Policy继续保存该容器身份，Proposal和Approval只能携带、不能修改；A7 V3必须逐项回查Source/Budget基座。批准结构上限不能顺带改变文件格式，若未来确需转码，必须先形成新的Source资产身份、字节/SHA、预算内容版本和独立批准链。

P7.29同样要求新Policy保留纹理当前解码格式、宽高和解码字节，而不只保存未来maximum。Manage阶段可以批准上限，不能重写Source事实；改变纹理格式或尺寸必须先更新Catalog和Budget基座，再走新的证据与批准链，不能在Assembler中静默替换。

P7.30要求音频解码内存保持Source与Process分离：OGG只是Source容器身份，当前解码字节必须来自结构测量Evidence，并随Proposal、Approval和Policy保留。A7 V3只复核观察为正安全整数、上限不低于观察和非音频为0，不允许按后缀、采样率或声道公式猜值。

P7.31要求Manage批准不能丢弃Process观察：新Policy必须同时保存maximum和对应Accepted Observation，设备Context恢复、资源清理回基线的失败观察会直接阻止批准。不能只写“以后必须通过”来覆盖本轮失败，也不能只保留上限而失去其证据下限。

P7.32进一步要求Manage层保存的环境观察能够回溯到唯一Process证据：环境ID、Evidence Locator和Evidence SHA必须在Observation、Proposal、Approved Policy与A7 V3之间逐项相同。任一层只保留数值或只保留SHA都不足以闭合来源，不能让一份观察值借用另一份环境证据记录的身份。

P7.33要求Deliver与Manage层继续显式携带Process采集批次来源：Submission Identity、Observation Batch ID和Captured At UTC不能在形成上限提案后只隐含于评估hash。它们不替代报告、环境记录或独立审批身份，只为审计者提供直接、不可变的采集批次定位。

P7.34要求Manage Policy直接保留四角色分离与完整治理时间线：Collector、Reviewer、Proposer、Approver必须互异，Captured、Reviewed、Proposed、Decided必须单调。第五角色Assembler与Assembled时间只属于交付装配封套，不能混入由预算事实和独立批准形成的Policy治理来源。

P7.35要求最终Evidence层重新读取Manage批准摘要，而不是把“能装配Policy”当作全部批准事实：四类复核、实测生命周期、零余量接受状态与处置数量必须再次闭合。处置数量只由Proposal零余量摘要决定，不能在Policy装配时补写或减少。

P7.36要求Deliver封套的第五角色继续独立于Manage Policy：A7 V3复核Assembler与前四角色分离、装配发生在批准之后、装配记录不复用任一上游证据身份。Assembler与Assembled At只证明交付装配，不成为预算事实或独立批准事实。

P7.37要求最终冻结清单直接记录所采用的Manage Policy和Deliver Assembly：Policy ID、Revision、Content Hash及Assembly Identity必须与A7内层数据一致。完整A7 Evidence仍是权威证据，直接字段只用于发布冻结审计和版本定位，不能脱离A7单独开放资产。

P7.38要求功能正确性证据与媒体预算测量使用同一依赖和工具链。即使source commit、content与六环境build ID一致，只要package lock或toolchain identity不同，也不能把两批结果拼成同一Release Freeze；Assembly Session与Manifest都必须失败关闭。

P7.39要求功能、自动化与A7媒体/结构证据保持记录域隔离：同一个Evidence SHA不能同时证明功能评价、自动化通过和视觉/媒体批准。A7索引覆盖Source权利、逐资产批准、环境/交付/捕获、人审以及结构预算治理记录，最终Manifest在资格生成前统一检查跨域复用。

P7.40要求A7索引内部也不能重复使用Evidence SHA。一个文件只能证明一个明确证据槽，不能同时作为许可、生产批准、环境通过、人工评审或结构批准记录；资产和捕获内容本身的SHA继续作为交付内容身份，不混入治理Evidence槽唯一性。

P7.41明确该索引由A7 V3拥有：A7在形成ready结论前完成索引与内部唯一性检查，Release只消费冻结投影进行跨功能域比较。媒体字段遍历不能复制到Freeze Manifest形成第二个Owner，后续新增A7证据槽必须先更新A7索引Owner。

P7.42要求Manage证据索引直接解释“哪一条记录证明了什么”：每个非空Evidence SHA必须和稳定recordId、证据kind一起冻结。Source/Process/Deliver/Manage各类证据可以独立定位，recordId与SHA都不能重复；Release只用这个结构化投影定位跨域碰撞，不维护另一个媒体目录。

P7.43进一步要求证据可以被实际取回：每个非空记录都要有独立Locator，目录与A7结构化索引一一对应，不能用一个位置承载多个治理槽，也不能给缺失证据预占假路径。结构测量与批准链已有Locator必须原样贯穿；Locator只定位证据记录，不替代Source文件、许可原文或交付内容自身的路径与SHA。

P7.44要求Manage层在取回前知道证据记录的类型和大小：每个Locator都绑定规范媒体类型和正安全整数字节长度。它们只描述治理证据文件，Source素材、Process产物、Deliver捕获或包体仍使用各自既有格式/大小/SHA字段，禁止把两类身份混为一谈。

P7.45要求Manage层的总证据字节也从同一索引安全累加，不能让数百个合法单项在聚合时整数溢出。这个总量只用于证据取回、归档和审计容量规划，不得拿来替代正式资产预算或性能测量。

P7.46要求Manage层同时保留证据记录时间。结构测量、评估、提案、批准和装配记录必须使用各自上游治理事件时间，不能在最终目录中重新标注；Legacy视觉/媒体证据仍需生产者把原始记录时间提交给A7，并随Locator、类型、大小和SHA共同冻结。

P7.47要求Manage层明确每条记录的Producer。结构采集、独立评估、上限提案、独立批准和装配必须分别保留既有角色身份，最终目录无权换人；Legacy来源、许可、逐资产批准、环境、交付、捕获和人审记录也要由未来生产者提供规范责任人。

P7.48把Manage证据地址统一到`evidence://arena-v2/...`命名空间。外部可变URL、父级跳转、空段、查询或片段不能进入A7身份；Source素材和Deliver内容仍保留各自路径，只有治理证据记录进入该集中证据库。

P7.49由Manage单一Owner对完整结构化证据索引生成独立身份。Release只保留并消费这个身份，不重新遍历Source/Process/Deliver/Manage字段；新增证据槽必须先更新A7索引Owner，避免目录和冻结清单分叉。

2026-08-12 的 `arena-v2.a3-a6.production-approval-evidence-ledger.candidate.v1` 又把同一130项逐项绑定
Catalog content hash、V2 policy identity、来源revision/license/rights/proof和七类生产批准证据槽。当前
29项仅有第三方intake来源批准记录，130项生产批准均为`missing-not-approved`；910个生产证据槽全部
`missing`，没有伪造reviewer、设备、真人或性能结果。该账本只管理证据缺口，
`grantsApproval=false / assetUsePermitted=false / formalReady=false / hardGate=false`，不被A7、P7、
默认Bundle/Preloader/Entry消费。A6.4—A6.18已按该账本纠偏：当前22个收藏预览槽全部零token、零loader、
零lease、零mount；A6.18只读组合既有20武器轮廓/动作语义与2图20段路线节奏/地标，为每项形成唯一的
文字＋主/辅形状＋线型/glyph fallback，并通过A6.15标准RenderPlan由DOM/Canvas同源消费。来源intake批准
不再被当作生产批准，2D回退也不成为正式资产或程序化3D正常路径。
两个缺失的泛化技能文档仍只登记在流程文档，不进入机器账本或hash。

2026-08-14新增的[A3–A6正式资产生产准备队列候选V1](arena-v2-a3-a6-formal-asset-production-work-queue-candidate-v1.md)
把当前130项按A3地图/敌人、A4角色/武器/材质/武器音频、A5核心VFX/模式供给音频拆成九个稳定批次。
当前只允许来源、Brief、预算和评审准备；A0.3真人、A1.1协调/逐项批准与130项生产批准未闭合前，Blockout、Integration、
Final和资产使用批次均为0。该队列不改资产字节、不授予批准、不加载媒体，也不进入默认Bundle或入口。

同日新增的[A3地图生产评审准备候选V1](arena-v2-a3-map-production-review-preparation-candidate-v1.md)已落实首批合同准备：按现有Definition精确收拢2图20段、方向+跳跃、统一移动包络、两条节奏曲线、分支/恢复、地标/引导线与竞速/生存双读法，并逐图预登记八项Blockout评审。它使用`level-design`节奏/引导规则，但所有评审仍为`not-run`；不改GLB、Surface、碰撞、路线或输入，不把注册顺序写成已验证Critical Path，生产许可继续全关。

[A3生存敌人生产评审准备候选V1](arena-v2-a3-survival-enemy-production-review-preparation-candidate-v1.md)随后落实第二批：同一个Character/Presentation覆盖16个Slot与十段`1→…→16`压力数量，不允许按stage造变体、放大碰撞、增加技能轮廓或用稀有色表达压力。候选绑定当前Skeleton模型、外部纹理、六扇区方向和19动作语义，并登记四视图、缩略图、拥挤度、动作、回退及生命周期九项评审；没有生成图片、修改资产或运行检查，模型和纹理生产批准仍缺失。

[A4六角色生产评审准备候选V1](arena-v2-a4-playable-character-production-review-preparation-candidate-v1.md)继续落实第三批：6个有限操作Definition和6个Presentation身份当前复用1个Rogue模型，并以六套选择姿态、七部件明暗Pattern、participant glyph/pattern和文字组成非颜色身份。该方案不要求六套独立模型，但共享中性几何也不得被宣称成六个独立黑色剪影；模型/纹理、19动作语义、六角色×武器、设备和生命周期十项评审均未运行，生产与加载门继续全关。

[A4二十武器附件生产评审准备候选V1](arena-v2-a4-weapon-attachment-production-review-preparation-candidate-v1.md)继续落实第四批：20个Gameplay Weapon、20个附件GLB和20个轮廓族按收藏顺序一一闭合，逐把冻结右手挂点、地面拾取、ground/aerial动作、windup/active/recovery及0/5/12米读法。`game-3d-assets`要求的Bounding Box、朝向、尺度、落地和截图全部保留`not-run`；本批不下载/转换/加载模型，也不改变命中、位移或时序。

[A4正式材质贴图生产评审准备候选V1](arena-v2-a4-formal-material-texture-production-review-preparation-candidate-v1.md)继续落实第五批：3张1024² Albedo纹理与圆盾、共享Rogue、Skeleton三个GLTF Consumer一一闭合，要求sRGB采样与PBR材质兼容，并把六角色七部件明暗Pattern、统一敌人材质、Neutral Key、两地图环境、桌面/390×844和解码生命周期纳入十项评审。RGBA8无mip估算为12,582,912 B且不是运行峰值；不修改灯光/材质/资产或加载路径，所有评审和生产批准继续为`not-run/false`。

[A4武器命中音频生产评审准备候选V1](arena-v2-a4-weapon-impact-audio-production-review-preparation-candidate-v1.md)继续落实第六批：20武器命中音、1徒手基础推击和40个地面/空中Action身份闭合，4份Kenney intake与17份项目衍生候选保持来源/生产批准分离。`audio-design`约束被固化为SFX分组、dB阶梯、Master Headroom、Limiter安全网、确定性三档播放率、8 Voice与低优先级淘汰；所有盲听、响度、削波、设备和生命周期证据仍为`not-run`，本批不播放或改动音频。

[A4武器阶段音频生产评审准备候选V1](arena-v2-a4-weapon-phase-audio-production-review-preparation-candidate-v1.md)继续落实第七批：20把武器各自的windup/release/recovery精确形成60份未批准候选，只消费本地ActionStarted与权威动作阶段。前摇/收招为`-6 dB / priority 1`，释放为`-3 dB / priority 2`，并继续受确定性变化和8 Voice约束；release不等于命中，恢复中段不补播，静音只推进水位。试听、设备、遮蔽、恢复和生命周期仍全部`not-run`。

[A5核心反馈VFX生产评审准备候选V1](arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.md)继续落实第八批：5张128²候选纹理与命中、表面转移、武器击落、闪避、移动坠落五类语义一一闭合，总计483个专用Cue。`vfx-realtime`与`particle-systems`约束被固化为Shape–Timing–Color、灰度先行、核心/方向/结果必要层、装饰先裁剪、关闭档0粒子、High最多96粒子、`2x`平均过度绘制目标、无扭曲和64个活动身份；武器接触几何不能替代正式结果纹理。本批不生成/加载/渲染资产，也不扩大运行预算，所有证据仍为`not-run`。

[A5模式与供给音频生产评审准备候选V1](arena-v2-a5-mode-and-supply-audio-production-review-preparation-candidate-v1.md)继续落实第九批：13个模式Cue只消费Match/Participant/Race/Survival显式事件，4个供给Cue只消费`ArenaSupplyAuthorityFact`，不观察Marker消失或本地计时猜结果。既有语义Voice梯级保持终局/关键掉落优先、供给恒为1，Gain仍服从强调层级；确定性播放率、8 Voice、64去重身份、SFX/Master/Limiter和静音不补播均冻结为评审合同。17份批准0/17，本批不播放、不改Queue或混音运行时，试听、设备和生命周期仍全部`not-run`。

[A3–A6正式资产生产评审程序候选V1](arena-v2-a3-a6-formal-asset-production-review-program-candidate-v1.md)把九个逐批准备包汇总为唯一交接面：工作队列顺序、130项资产、910个缺失证据槽、95个评审单元、受阻时源码动作和解阻后真实评审动作一一固定。它不执行命令、不加载媒体、不授予批准；每批仍需独立证据、独立批准和独立回滚。

[A3–A6生产评审证据提交候选V1](arena-v2-a3-a6-production-review-evidence-submission-candidate-v1.md)继续提供只读证据引用入口：七个规范Slot各有唯一Kind，并强制Ledger/Queue/Program、Preparation和Asset path/SHA同代闭合。合同不采集、读取或持久化证据，不把采集者的`pass`变成独立评估或批准，因而不会绕过九批门禁。

[A3–A6生产评审证据独立评估候选V1](arena-v2-a3-a6-production-review-evidence-independent-evaluation-candidate-v1.md)在提交后要求不同reviewer重算Submission Identity，并确认Evidence SHA、Kind结构、环境和时间顺序；接受只允许唯一规范原因，拒绝必须显式覆盖失败事实。Evaluation仍不改`missing`槽或`missing-not-approved`批准状态。

[A3–A6生产评审七槽接受证据集候选V1](arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.md)把同一资产七类accepted Evaluation按规范顺序聚合并重算每项，拒绝缺失、重复、调序或跨代身份。完整Evidence Set只供后续独立批准决策，不自行更新V1缺失账本。

[A3–A6生产批准独立决策记录候选V1](arena-v2-a3-a6-production-approval-decision-record-candidate-v1.md)在完整Evidence Set后增加第三职责人：approved要求来源/权利、预算和依赖均确认，且批准记录有独立locator/SHA。记录只供未来不可变账本版本消费，不原位修改当前账本或开放正式媒体。

SF-A3A6P.1新增固定复验入口`npm run arena:a3-a6:production-preparation:test`，精确覆盖上述队列、九批Preparation、Program与截至独立Decision的15文件/59项直接规格；P7边界检查同时固定runner清单和package命令。自动化通过不执行95项真实评审、不写910槽、不授予130项批准，也不触碰媒体字节或默认消费。

| 项目 | 项目上限 |
|---|---:|
| 正式资产总编码体积 | 2,359,296 B |
| 音频总编码体积 | 64 KiB |
| 解码纹理总内存 | 16 MiB |
| 单纹理解码内存 | 4 MiB |
| 单边纹理尺寸 | 1024 |
| 单角色节点 / 关节 | 64 / 48 |
| 正式角色动作 | 必须18条，最大18条 |
| 单角色 primitive / 材质 | 16 / 4 |
| 附件节点 / primitive / 材质 | 8 / 4 / 2 |
| 单角色 GLB | 1 MiB |
| 单纹理 | 64 KiB |
| 单附件 GLB | 64 KiB |
| 单 OGG | 16 KiB |
| 三端内部 delivery 构建预算 | 4 MiB |

当前正式 Bundle 仍是 `verified-intake-only`，不是 `ready`。已有 KayKit 两套角色、圆盾、PNG 和四个 Kenney OGG 已有来源与入库记录，但 reduced-motion 人工验收、目标真机可读性/性能记录和 Stage 9 正式资产 producer 仍未完成。重锤、引力锁链、冲锋盾的正式资产与五类反馈的最终视觉/音频仍按 P4/P5 单独推进。

## 5. 资产命名、目录与元数据

交付目录按消费领域分开：

```text
public/assets/arena/
  characters/    # 正式角色 GLB 与纹理
  equipment/     # 正式武器附件 GLB 与纹理
  maps/          # 生产地图装饰与环境资产
  vfx/           # 反馈与环境 VFX 交付材质/纹理
  audio/         # 音乐、SFX、Ambience、UI 音频
  ui/            # 语义图标、界面素材和必要图片
```

推荐文件名为 `category_subject_variant_LOD.ext`，Asset ID 与路径一一对应。每个交付资产的 manifest 至少包含：

- Asset ID、路径、类型、版本、状态（`planned`/`research-proven`/`implemented`/`automated-verified`/`device-verified`/`human-verified`/`release-ready`）；
- sourceLocator、sourceRevision、许可证文本、proofArtifact、approvedBy、approvedAt；
- contentArtifact/dependencyArtifacts 的大小与 SHA-256；
- 角色动作/骨骼/材质、GLB 朝向与目标高度，或音频采样率/时长/loop point/总线；
- 使用的技能 ID、读取的参考文件和最终验证命令；
- reduced-motion、静音、低质量级、加载失败和销毁策略。

源文件、制作中间文件和交付文件分离保存。任何“下载后直接放进 `public/`”的资产都不视为完成入库。

## 6. 任务模板：美术或音频改动必须回答什么

每个任务开始前写下：

```text
任务产物：
消费面：角色 / 武器 / 地图 / VFX / HUD / 音乐 / SFX / UI
权威来源：Snapshot / Stable Event / Definition ID
使用技能：
强制参考：
正式或研究：
来源 revision / license / SHA：
目标设备与视口：
reduced-motion / 静音 / 失败回退：
预算影响：
验证命令与证据路径：
回滚点：
```

任务完成时必须能够回答：

- 这个资产表达的是哪个权威事件或状态，是否会与其他反馈混淆？
- 视觉、声音、颜色、形状、运动和文本是否至少有两个独立的可读线索？
- 低动效、静音、色觉差异、窄屏、多人拥挤和低端设备是否仍能理解结果？
- 资产来源、许可、revision、SHA 和交付预算是否可重算？
- 接入失败时是否安全回退、释放已创建资源并保持生产入口为 Arena Product？

## 7. 本项目当前可落地的美术与音频优先级

按当前 Git 最近维护的文档和生产计划，下一批工作应按以下顺序落地：

1. **P3 KZ 正式地图表现**：把两张正式KZ基座地图的20段路线（12+8）、分叉、窄路、楼梯、走钢丝、断层、终点和安全重入锚点从规则/灰盒证据翻译为原创生产地图视觉；先通过路线可读性和多人拥挤，再做装饰。
2. **P4 首批武器资产**：为重锤、引力锁链、冲锋盾分别建立动作身份、持握/起手/收手附件、材质、命中特征和低动效方案；重锤与锁链当前仍有程序化表现，不能直接称为正式资产。
3. **P4 五类反馈资产**：按稳定 `WeaponFeedbackPresented` 事件补齐命中确认、支撑面转移、击落出圈、攻击被避开、移动失足的视觉、音频和 reduced-motion Cue；每种反馈必须保留失败原因差异。
4. **P5 11页面与 HUD**：以 `threejs-game-ui-designer` 的 UI patterns 和 checklist 复核局外页面、竞技准备、生存供给、武器数值、结算和声音设置；DOM 与 Canvas 继续共享 ViewModel。
5. **正式发布证据**：补 Stage 7/9 producer、目标设备可读性/性能记录、声音输出、资产预算和 clean build；在此之前只能标为 intake 或 verified，不写 `ready`。

## 8. 验收命令与交付门

至少运行以下项目命令；具体批次仍需补对应的测试、stress/soak、浏览器和设备记录：

```bash
npm run arena:assets:budget
npm run arena:assets:intake:verify -- --describe
npm run check:formal-assets
npm run check:third-party-assets
npm test
npm run build
git diff --check
```

对涉及 VFX、动画、UI 或音频的批次，交付包还必须包含：

- 使用技能与参考文件清单；
- 源文件/交付文件/manifest 的路径和 hash；
- 关键状态截图或录屏，至少包含默认、命中/失败、reduced-motion、窄屏和静音/声音开关状态；
- Web、微信、抖音目标环境的构建身份；
- 已知缺陷、回滚点、未完成的真人/真机证据和下一阶段门槛。

## 9. 变更规则

- 新增或替换技能必须同时更新 `skills-lock.json`、本流程的路由表和 ADR；不能只把技能目录复制进仓库。
- 技能源仓库变更时先审阅内容 hash、许可证和项目适配差异，再决定是否更新锁定版本。
- 新增资产能力应优先新增 Definition、资产记录、Presentation Cue 和组合注册，不在已有渲染器中堆积特殊判断。
- 任何改变反馈语义、动作语义、音频总线、资产预算或交付平台的变化，都必须在状态台账中写明行为映射、风险、验证证据和回滚点。
- 编码容器格式属于Source元数据：当前正式Catalog只允许模型`glb`、音频`ogg`、纹理`png`，Budget/Evidence/Release只做不可变投影和核对。文件后缀不得被当作音频编码器、采样率、声道或解码内存的证明；这些属性必须由独立manifest或实测证据补齐。
- 正式Evidence入库必须保持`Source → Process → Deliver → Manage`身份分离：Producer记录证据，独立Verifier从`evidence://arena-v2/...`重新取回并核对Locator、类型、字节与SHA，回执再以独立Locator/SHA保存。核验者不得兼任该批任一Evidence Producer；目录合同或future-only fixture不能替代真实取回和哈希重算。
- Evidence Store中原始记录与`*.metadata.json` sidecar分离；Reader必须从文件系统观察实际字节，并对sidecar的Record ID、Locator、类型、时间和Producer逐项对账。Store Root必须有绑定Record Index的只读Snapshot Manifest，Snapshot创建时间不得早于所含记录。回执只能在整批成功后发布到不可覆盖的Session `committed`目录，并在返回前稳定回读真实字节、长度、SHA、sidecar和同一Snapshot；staging、fixture、跨Snapshot/Plan、回读失败或没有`committed`水位的目录不能被Freeze消费。
- 本流程只扩展开发流程，不改变 Arena 的玩法规则、Replay/hash、默认 Registry、发布入口或历史产品边界。
