# Arena 美术与音频开发流程

## 文档状态

- 状态：已接受的 Presentation / Platform 执行基线
- 日期：2026-07-28
- 适用产品：Arena Product；历史数值跳台 v3、研究页、Pilot 和灰盒不属于生产交付
- 技能安装目录：`.agents/skills/`
- 技能锁定清单：[`skills-lock.json`](../../skills-lock.json)
- 关联治理：[`AGENTS.md`](../../AGENTS.md)、[V2 生产化分阶段开发与治理计划](arena-v2-production-development-plan.md)、[ADR-109](../decisions/109-arena-art-and-audio-skill-routing.md)
- 视觉生产基线：[Arena Art Bible](arena-art-bible.md)
- 注释参考登记：[六类70/20/10登记](arena-art-reference-register.md)；A0.2三个子门已签核，[独立视觉方向总门](arena-art-reference-total-gate-a0.2.md)以96/100通过，A0.2与Reference Board视觉方向为`ready`；[A0.3技术/代理候选](arena-art-silhouette-a0.3.md)85/100但真人0/10，A0.3、正式模型/VFX样件、Blockout及后续成熟度仍`incomplete`/fail closed
- 阶段协作基线：[美术 A0–A7 与开发 P0–P7 对齐矩阵](arena-art-development-alignment-matrix.md)
- 当前供给表现合同：[A1.0供给表现预生产合同](arena-art-supply-presentation-contract-a1.0.md)保留2026-07-28的v1历史身份；追加的A1.0-v2已于2026-08-03绑定28个当前来源和25项fixture，以94/100完成主协调外部联合签核，正向与85/85隔离拒绝通过。它只证明当前PP0/PP1合同、Cue/回退和来源身份，不是正式资产门。[A1.1来源与测量就绪包](arena-art-supply-readiness-a1.1.md)仍因上游漂移待最终source重建。A0.3真人、A1.1、代表样件、Blockout、正式VFX/音频、浏览器/设备/真人与Final仍关闭

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

使用 `level-design` 先做 KZ 的六段主路线、分叉、窄路、楼梯、走钢丝、断层、终点和安全重入锚点，再进行装饰。按 `critical path → golden path → branch → recovery` 检查，确保所有跳跃和重入有真实物理证据。

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

1. **P3 KZ 正式地图表现**：把六段路线、分叉、窄路、楼梯、走钢丝、断层、终点和安全重入锚点从规则/灰盒证据翻译为原创生产地图视觉；先通过路线可读性和多人拥挤，再做装饰。
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
- 本流程只扩展开发流程，不改变 Arena 的玩法规则、Replay/hash、默认 Registry、发布入口或历史产品边界。
