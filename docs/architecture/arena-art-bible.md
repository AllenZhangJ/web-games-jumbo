# Arena Art Bible：生产视觉与声音基线

## 文档状态

- 状态：A0.1为`contract-ready`；A0.2独立聚合总门与Reference Board视觉方向为`ready`（96/100）；A0.3已在`60fbc13` clean source完成两次确定性机器重生成，现为`current-source-machine-regenerated / tooling-review-candidate-human-blocked / incomplete`，机器候选85/100且真人0/10；A1.0-v2已在最终clean source `5e84714`完成28源/25映射重建并获主协调94/100外部签核，A1.1已在`16861edc`完成来源/权利与测量方案机器重建；A1.1 hard gate、逐项批准、样件和运行门仍全关。A2.0现为`preproduction-contract-machine-closed / hardGate=false`，默认Registry/Composition/入口仍未接
- 日期：2026-08-25
- 审计基线：A2.0机器账本以clean baseline `92bafbdb15c268c7465d5321e209473b072024c7`固定当前33项P2/P5公开合同、表现Owner与直接规格；唯一未存在于baseline的测试字节是本批Jump capability必填夹具修正，已显式登记为`uncommitted-review-candidate`。正式资产与视觉来源事实不因A2.0机器闭环获得生产批准
- 上游真值：[V2 产品总纲](../product/arena-v2-product-brief.md)、[V2 玩法框架](../gameplay/arena-v2-gameplay-framework.md)、[V2 生产计划](arena-v2-production-development-plan.md)、[ADR-108](../decisions/108-arena-v2-survival-auto-replace-and-expiry.md)、[ADR-112](../decisions/112-arena-v2-formal-mode-definition-and-policy-boundary.md)与[ADR-118](../decisions/118-arena-v2-development-first-deferred-validation-window.md)；候选实现不等于生产冻结或运行通过
- 执行基线：[美术与音频开发流程](arena-art-and-audio-development-flow.md)、[A0–A7 对齐矩阵](arena-art-development-alignment-matrix.md)
- 参考登记：[六类注释参考登记](arena-art-reference-register.md)（原来源包、武器/反馈补充来源与六张板面小门均已签核；A0.2独立聚合总门与Reference Board视觉方向为 `ready`，A0.3真人门仍为 `incomplete`）

本文件是 Arena Product 的视觉宪法与生产约束，不是完成度声明。任何资产仍须独立通过 `Concept → Blockout → Integration → Final`。研究图、AI 原图、KZ 灰盒、程序化角色或程序化武器只能作为研究、样件或加载失败兜底，不能标为正式生产资产。

## 0. A0.1 技能与流程审计

| 审计项 | d6f9060 事实 | 判定 |
|---|---|---|
| 项目技能目录与锁 | `.agents/skills/` 有14个技能目录，`skills-lock.json` 有14个来源与 computed hash | 数量和身份闭环；技能不进入运行时 |
| 视觉总纲 | `art-bible`、`game-art-director` | 可用于视觉宪法；Arena 产品文档替代技能默认的 `design/gdd` 路径 |
| 角色/3D/动画 | `character-design-sheet`、`game-3d-assets`、`blender-web-pipeline`、`glb-compressor-cli`、`threejs-animation` | 覆盖转面、GLB、LOD、压缩、clipMap与生命周期；通用脚本不直接改生产资产 |
| 环境/UI/VFX | `level-design`、`threejs-materials-lighting`、`threejs-game-ui-designer`、`vfx-realtime`、`particle-systems` | 覆盖KZ路线、材质灯光、11页面、五类反馈和粒子预算 |
| 媒体/声音 | `media-asset-management`、`audio-design` | 覆盖source→deliver→manage、总线、循环、静音和设备录音 |
| 项目流程 | `arena-art-and-audio-development-flow.md` 已将14技能按产物路由 | 与 Rule→Core→Bot→Presentation、来源、三端、低动效边界一致 |

已知技能包缺口：项目内 `game-art-director` 引用了未随安装包提供的 `templates/art-bible.md`、`docs/collaboration-protocol.md` 和 `docs/game-design-theory.md`。A0.1 不臆造这些文件内容，改用本仓库产品总纲、生产计划、Art Bible、对齐矩阵和 `AGENTS.md` 作为项目真值；若未来补齐上游附件，必须先审计冲突再采用。

## 1. 视觉规则与支柱

> **用低多边形玩具的清晰体块承载高速 KZ 路线与武器后果，再用克制的手稿线和瞬时反馈解释“从哪里来、往哪里去、为什么失败”。**

1. **轮廓先于细节**：角色、武器、供给、危险边缘和重入点在纯黑剪影、游戏镜头距离和六方向下仍可辨。冲突时改体块，不用发光或震屏补救。
2. **移动轨迹就是构图**：主路、快线、恢复线、边缘与落点形成连续视觉句子；装饰不能遮挡起跳、转折、出口和安全重入。
3. **玩具质感，真实后果**：造型轻巧、色块明快、材质克制；击退、失足、落点和淘汰必须有重量与因果。外观不改变碰撞、命中或速度。
4. **每条语义至少两种线索**：颜色必须搭配形状、方向、图标、文字、动作或声音。低动效、静音、色觉差异和低质量级下仍保留因果。

## 2. 形状语言

| 形状族 | 语义 | 允许 | 禁止 |
|---|---|---|---|
| 圆、软弧、厚边 | 安全、恢复、生命感 | 角色头身、恢复锚点、供给、确认 | 用于尖锐攻击预警或不可恢复边缘 |
| 方、台阶、水平线 | 支撑、稳定、规则 | 可落地面、HUD 容器、重锤主体 | 所有环境同尺寸方盒，抹平路线层级 |
| 楔形、箭头、尖角 | 方向、威胁、承诺 | 攻击前摇、击退、快线路标、链钩 | 在装饰中滥用，造成处处危险 |
| 环、门框、括号 | 入口、目标、重入 | 终点、重生、供给作用范围 | 冒充真实碰撞或扩大权威半径 |
| 断线、缺口、悬挑 | 风险、节奏中断 | 断层、钢丝、路线分叉 | 没有恢复关系的无预警必死点 |

角色主体保持重心明确的玩具体块；角色差异优先通过头肩、躯干比例、背部轮廓和武器外伸方向表达。HUD 用圆角矩形承载稳定信息，箭头/缺口只用于方向或危险，不做多层卡片堆叠。

## 3. 语义色彩

颜色为 sRGB 基准；材质可在同色相内小幅变化，语义不得互换。

| Token | Hex | 用途 | 限制 |
|---|---|---|---|
| `arena-ink` | `#172033` | HUD 文字、轮廓、深色结构 | 不作虚空纯黑；正文保证对比 |
| `arena-paper` | `#F4EBDD` | UI 暖白底、柔和高光 | 不长期覆盖为强闪 |
| `arena-player` | `#35B8FF` | 本地玩家、可控输入、己方方向 | 不表示安全；敌我另配轮廓/标记 |
| `arena-opponent` | `#FF5C5C` | 对手、伤害来源、淘汰危险 | 不用于奖励/装饰；避免持续红屏 |
| `arena-warning` | `#FFB020` | 前摇、即将过期、边缘风险 | 只表示“将发生”，不冒充命中 |
| `arena-safe` | `#45D483` | 可恢复面、成功重入、确认 | 不表示阵营；不得单独表示成功 |
| `arena-route` | `#8B6DFF` | 分叉、进阶路线、长期目标 | 必须配路线形状或标签 |
| `arena-impact` | `#FFF4B8` | 极短接触闪、命中核心 Cue | reduced-motion 改稳定边缘标记 |
| `arena-depth` | `#273451` | 虚空、远景、非交互背景 | 与可落地面保持明度分离 |
| `arena-surface` | `#CFC6B3` | 中性可落地面、结构基色 | 不与恢复面同形同色 |

- 红/绿必须增加不同外轮廓、图标或纹理方向；蓝/紫必须增加标签或明度差。
- HUD 正文目标对比度不低于 `4.5:1`；大字、必要边框和关键图形不低于 `3:1`。
- 浅黄强闪只属于瞬时命中核心层；供给过期、挥空和移动失足不得复用。

### 3.1 WCAG 对比实测

按 WCAG 2.x 相对亮度公式，以当前 Hex 的 sRGB 值计算；正文门槛 `4.5:1`，大字与非文字图形门槛 `3:1`。结果保留两位小数，颜色位置互换不改变比值。

| 前景 / 背景 | Ratio | 正文 | 大字 | 图形/UI边界 | 允许用途 |
|---|---:|---|---|---|---|
| `ink` / `paper` | 13.77:1 | PASS | PASS | PASS | 默认正文与浅色页面 |
| `ink` / `surface` | 9.59:1 | PASS | PASS | PASS | 表面标签、稳定HUD |
| `paper` / `depth` | 10.48:1 | PASS | PASS | PASS | 深色背景主文字 |
| `player` / `ink` | 7.32:1 | PASS | PASS | PASS | 玩家标签、方向图形 |
| `opponent` / `ink` | 5.37:1 | PASS | PASS | PASS | 对手标签、危险图形 |
| `warning` / `ink` | 8.90:1 | PASS | PASS | PASS | 前摇、过期提示 |
| `safe` / `ink` | 8.52:1 | PASS | PASS | PASS | 重入/确认状态 |
| `route` / `paper` | 3.10:1 | **FAIL** | PASS | PASS | 只用于大字/图形；正文改用`ink`并以紫色作图标 |
| `route` / `depth` | 3.38:1 | **FAIL** | PASS | PASS | 同上，不用于小字 |
| `impact` / `depth` | 11.13:1 | PASS | PASS | PASS | 瞬时核心Cue；非正文常驻色 |
| `surface` / `depth` | 7.30:1 | PASS | PASS | PASS | 地面/虚空边界 |
| `player` / `depth` | 5.57:1 | PASS | PASS | PASS | 深背景玩家标记 |
| `opponent` / `depth` | 4.09:1 | **FAIL** | PASS | PASS | 深背景小字改`paper`/`ink`；红色仅作大标记 |

### 3.2 非色彩冗余

| 易混组合 | 颜色外的固定组合 | 识别问题 |
|---|---|---|
| 红色对手 / 绿色安全 | 对手=`尖角菱形头像框 + 45°斜线纹 + 双剑图标`；安全=`圆角门框 + 点阵纹 + 回转锚图标` | “这是敌人还是可恢复位置？” |
| 蓝色玩家 / 紫色路线 | 玩家=`实心圆名牌 + 竖向单条纹 + 人形图标`；路线=`分叉菱形 + 虚线轨迹 + 路径叉图标` | “这是角色身份还是路径提示？” |
| 黄色预警 / 浅黄命中 | 预警=`空心楔形 + 倒计时刻度 + 感叹号`；命中=`实心短十字 + 接触环 + 来源箭头` | “即将命中还是已经命中？” |

上述组合是不可拆分的语义合同；低质量级可移除装饰粒子，不能移除形状、纹理和图标三者中的全部两项。

## 4. 材质、灯光与渲染

### 材质

- 默认是少噪声的 stylized PBR；大色块和倒角承担形体，贴图只补身份与材质类别。
- 木、石、布、皮革：`metalness = 0`，粗糙度目标 `0.55–0.9`；不做高频法线噪声。
- 金属：仅真实金属部件使用，`metalness = 0.75–1`、粗糙度 `0.3–0.65`；禁止镜面 chrome。
- 发光仅用于短时核心 Cue、目标/重入或必要 UI；透明材质仅用于 VFX/少量 UI。
- [A4正式材质贴图生产评审准备候选V1](arena-v2-a4-formal-material-texture-production-review-preparation-candidate-v1.md)已把圆盾、共享Rogue与Skeleton的3张1024² Albedo、3个外部GLTF绑定和3个模型Consumer一一闭合；要求sRGB采样与PBR兼容，但实际材质、UV、decode、mipmap和颜色偏差仍全部`not-run`。Rogue共享贴图不能替代六套七部件明暗Pattern，Skeleton贴图不能制造新敌种或stage身份，圆盾颜色不能替代武器轮廓。

### 灯光与渲染

- 基准为一个明确主光、柔和环境/半球补光和克制接触阴影；角色面与地面接触必须可读。
- 可用低成本边缘提亮，但轮廓不能依赖每角色点光源。KZ 主路线与虚空保持稳定明度关系。
- Three.js 表现层负责色彩空间、tone mapping、阴影和质量级；权威层不依赖渲染结果。
- 质量级只关闭装饰阴影、环境粒子、扭曲和远景细节；不得降低分辨率、抗锯齿、动作数量或关节数量换通过。
- AnimationMixer、geometry、material、texture、render target、粒子池与音频句柄必须有 owner；不可见/暂停时停无效更新，`destroy()` 时释放。
- 同一A4准备候选只允许低成本Hemisphere Fill与Directional Key方向，禁止把点光阴影当默认解法；Neutral Key与两张地图环境、桌面与390×844均须独立评审。三张RGBA8无mip解码估算12,582,912 B只用于候选包络，不是GPU峰值、缓存或销毁证据。

## 5. 角色与动作

- 可玩Rogue共享模型：轻、前倾、肢体外展，突出起跳、转向和空中姿态；六个操作身份通过选择姿态、七部件明暗、glyph/pattern和文字区分。
- Skeleton生存敌人：稳定机械节奏、明显头部/下颌/披风方向；始终是同一个敌人族，不能让体型或后期表现暗示更大碰撞体。
- 当前玩法层已有6个`production-unreachable`角色Definition和6个Presentation身份，但六者复用同一个Rogue模型；另有一个Skeleton敌人模型。这个事实不等于6套独立角色模型或任何生产批准。
- 六个可玩角色只提供`balanced / sprint / air-control / high-jump / quick-start / forgiving`有限手感差异，共用三概念输入、碰撞与最大空中跳跃次数；不增加职业、技能树、隐藏主动技能或角色专属武器语义。
- 正式角色必须保留恰好18条动画与当前41关节，不得为性能擅自降级。
- Presentation 语义包括 `idle/walk/run/jump/double-jump/crouch-charge/crouch-jump/land/hitstun/knockback/eliminated/win/lose/draw/equipment/defend/down-smash/attack-windup/attack-active`；可显式复用 clip，不按顺序猜测。
- 攻击读出抬臂、挥动、随挥、收势；动作轨迹不改变 hitbox。表现性武器放大在收招、中断、切换或销毁时恢复。
- 每个角色/武器组合提交正、背、左、右、左前、右前六方向纯黑剪影和 `390×844` 游戏镜头缩略图；盲测身份/武器识别目标≥90%。

### 5.1 最多六角色的轮廓槽位合同

| 槽位 | 当前状态 | Gameplay手感 | 选择姿态 | 七部件明暗身份 | 其他非颜色通道 | 允许进入的门 |
|---|---|---|---|---|---|---|
| C01 balanced | Definition/Presentation候选，未批准 | 无偏科基准 | idle稳定姿态 | center-core七部件明暗 | participant glyph/pattern＋文字 | `review-preparation-only` |
| C02 sprint | Definition/Presentation候选，未批准 | 直线跑速/地面推进 | run完整跨步 | fast-legs七部件明暗 | participant glyph/pattern＋文字 | `review-preparation-only` |
| C03 air-control | Definition/Presentation候选，未批准 | 空中横向修正 | jump中段展开 | air-wings七部件明暗 | participant glyph/pattern＋文字 | `review-preparation-only` |
| C04 high-jump | Definition/Presentation候选，未批准 | 竖直起跳 | jump离地初段 | jump-springs七部件明暗 | participant glyph/pattern＋文字 | `review-preparation-only` |
| C05 quick-start | Definition/Presentation候选，未批准 | 起步/变向 | run起步初帧 | start-diagonal七部件明暗 | participant glyph/pattern＋文字 | `review-preparation-only` |
| C06 forgiving | Definition/Presentation候选，未批准 | 输入容错/稳定恢复 | land恢复后段 | stable-bracket七部件明暗 | participant glyph/pattern＋文字 | `review-preparation-only` |

- 六身份共享中性几何，不能凭同一中性姿态宣称6个独立黑色剪影；当前识别方案必须联合handling专属选择姿态、七部件明暗Pattern、participant glyph/pattern和文字，并在灰度/色觉差异下独立验收。
- 共享模型复用是降低制作复杂度的明确方案，不要求为六个操作模板各做一套模型；但若多通道识别未达到门槛，必须改表现方案或退回Concept，不能靠颜色和Definition数量放行。
- [A4六角色生产评审准备候选V1](arena-v2-a4-playable-character-production-review-preparation-candidate-v1.md)已冻结上述真实边界与十项未运行评审；没有模型/纹理生产批准、正式事件/动作、设备和真人证据不得进入Integration或Final。
- A6.19把现有角色选择页已经登记的六条`handlingKind / handlingShapeAxis / selectionPose / valuePatternCue`
  候选身份投影到每张既有卡片右侧的静态身份轨：固定`2 panel + 1 glyph text`，其中六项唯一性只由
  两个panel的相对位置、尺寸与圆角构成的纯几何signature证明，glyph和颜色均不参与唯一性放行。卡片原
  action矩形、48px命中、selected/available、文字与accessibility事实保持不变；移动/桌面继续沿用82/90px
  卡高。六卡每卡精确新增`2 panel + 1 glyph text`，总增量固定为18项；增强后的完整RenderPlan primitive
  总量必须`<=128`，预算不足、非精确增量或越界在发布前失败关闭。角色3D预览context继续消费同一次未增强的稳定RenderPlan，A6.19不创建Three、loader、renderer、
  lease、mount、RAF或timer。状态仅为`production-unreachable / code-written-not-run / not-run`，六条候选
  身份不等于新增六个正式批准角色，也不改变A0.3、Blockout、设备、真人或Final门。

### 5.2 可重复剪影与游戏镜头检查

**权威相机来源**：[`packages/arena-presentation-three/src/arena-camera.ts`](../../packages/arena-presentation-three/src/arena-camera.ts)；六方向来源：[`six-sector-direction-resolver.ts`](../../packages/arena-presentation-runtime/src/six-sector-direction-resolver.ts)。生产相机当前是正交/跟随正交：竖屏世界高度14、横屏12、阈值0.82、相机高度16、深度偏移16、目标高度0、near/far=`0.1/80`。研究镜头结果不能替代该配置。

固定程序如下：

1. 使用 `createLocalFollowArenaCamera`，视口分别为 `390×844 @2x` 与 `1280×720 @1x`；`d00`时相机target锁定被测角色脚底投影，`d05/d12`时target锁定本地玩家原点、被测角色沿`cameraBasis.screenUp`放置在5/12世界单位处。禁用动态镜头、VFX、HUD、阴影和后期。
2. 六方向严格使用 `front/front-right/back-right/back/back-left/front-left`；每次切换调用resolver reset，模型front axis沿正式Presentation Definition。
3. 角色为纯黑 `#000000`、背景为中性灰 `#808080`（对比约5.32:1）；附件也为黑色，不保留纹理、材质高光、敌我色或描边。
4. 角色距离固定为相机target处 `0m`、决策距离 `5m`、多人/路线距离 `12m`；正交投影不产生透视缩放，因此5m/12m用于验证遮挡与画面位置。A0.3基线只测试当前可合法加载的两名正式角色，以及赤手/正式圆盾两态。重锤、锁链和未来角色在各自A4/角色Blockout出现正式资产后复用同一工具单独过测；不得用程序化几何顶替。
5. 原图输出 `780×1688` 与 `1280×720`；盲测缩略图固定缩至原图10%，即 `78×169` 与 `128×72`，禁用插值锐化和额外裁切。
6. 输出路径：`docs/quality/art/silhouette/<asset-id>/<asset-id>__<weapon-id>__<direction>__d00|d05|d12__390x844@2x.png`；桌面后缀改为`1280x720@1x`。同目录写manifest，记录commit、Asset/Definition hash、相机常量、像素尺寸、renderer与生成时间。
7. 盲测至少10名未参与制作的受试者；随机顺序回答“哪个角色槽位？”“赤手/锤/链/盾？”“朝向六选一？”。角色、武器、方向三个指标分别≥90%，且任一角色×武器组合不得低于80%。
8. 失败时退回Blockout：优先改体块、重心、头肩、背部识别点、武器端点或负空间；禁止先加颜色、文字、发光或扩大权威hitbox。改后重跑全部受影响方向/距离，不能只补失败截图。

当前状态：`incomplete / current-source-machine-regenerated / human-blocked`。仓库当前144/144、匿名题包和85/100结果来自`60fbc13` clean source，两次完整生成聚合SHA一致，正向与失败关闭矩阵通过；旧dirty-toolchain包只作历史审计。真人仍为0/10，因此不计真人可读性通过分，也不授权Blockout。

## 6. 武器视觉与声音语言

P4 Rule/Definition/事件合同未冻结前，本节只定义样件，不授权批量 Final。

| 武器 | 形状/重心 | 动作承诺 | 核心视觉 | 声音方向 | 禁止混淆 |
|---|---|---|---|---|---|
| 重锤 | 大方头、短颈、重心远离手 | 明显抬起、延迟下落、长收势 | 厚楔下压与接触环 | 低频主体+硬瞬态 | 不做轻快刀光；不扩大范围 |
| 引力锁链 | 连线+明确钩/坠端点 | 先给方向，再拉扯/回收 | 单一主方向线与端点 | 金属张力+拉回尾音 | 转移不冒充直接击落 |
| 冲锋盾 | 宽前脸、圆弧边、稳定背面 | 蓄势后整块推进 | 正面弧/楔与移动同向 | 中低频撞击+短推进 | 防御姿态不等于格挡系统 |

赤手、锤、链、盾只看轮廓即可区分。圆盾可作 Integration 输入；程序化重锤和锁链不是正式资产。

P4完整生产范围与顺序固定为：

1. 先逐把补齐重锤、引力锁链、冲锋盾三把生产基线；
2. 再逐件推进“直线压制”的默认生产注册；
3. “读招反制”补齐承诺、取消、反馈与真人理解后才能推进；
4. “绕后”补齐朝向、遮挡、多人和真人理解后才能推进；
5. “封路、延迟重击”在持续区生命周期/预警成为正式权威字段前保持 blocked，不制作批量 Final。

每把武器都使用独立 `Concept → Blockout → Integration → Final`、独立100分评审、独立提交和独立回滚点。前一把通过不自动批准下一把；研究完成、共享VFX或共享骨架也不能合并门禁。

2026-08-11静态接入：完整20把武器已有唯一附件、动作/挂点读取档案、五类命中反馈配方，以及每把windup/release/recovery三份候选音频，共60份阶段音频身份。正式Three Stage的阶段音频owner只消费本地权威`ActionStarted + participant.action.phase`；动作、装备实例、运行时/收藏Equipment、生存等级和事件水位任一不一致即在播放前失败关闭。静音只抑制当前声音、不在稍后补播旧阶段；无开始事件的恢复中动作保持静默；跨局清空去重和统计。代码与测试仅写入未运行，候选音频的来源登记不等于逐把生产批准。

P5.3zzzvm静态候选让同一把附件在“角色持有”与“世界拾取”共享唯一非色彩轮廓比例。每把在现有首屏可读性档案内冻结一个有界`identityScaleAxes`，仅强化已有Object3D的宽/长/厚；持有与拾取可使用各自确定Euler姿态，但不能修改这一共享轮廓身份。该子节点变换不创建程序化几何、材质、碰撞或新draw call，不从位置、动画或颜色反推拾取/命中。数值只是`code-written-not-run`候选；0/5/12m截图、六角色穿插、两个视口、设备与真人辨识仍是红门。

## 7. KZ 环境

- 只迁移 KZ 的路线学习价值，不复制 CS1.6 地图几何、材质、标志、名称或装饰。
- 两张正式候选地图共20段路线，从版本化 Map/Route Definition 读取表面、分叉、窄路、断层、楼梯、迷宫、钢丝、终点、供给和重入；美术不增删支撑面。
- 快线用方向楔形和高对比，稳定线用连续方形支撑，恢复线用圆角/门框重入标记；都必须有空间/形状线索，不能只换色。
- 地标分宏观（跨段）、中观（分叉）、微观（起跳/转折/落点）三级；装饰不得遮边缘或伪装为可站立面。
- 顺序固定为 `critical path → golden path → branch → recovery → dress`。可达、拥挤、遮挡与重入未通过前不做 Final dressing。
- 2026-08-11静态接入：两张自制KZ GLB已由正式Catalog/预加载/Three Stage按地图身份加载；新增只读路线/Cue投影只从权威`supportSurfaceId`、Mode Projection和稳定V6事件读取当前段、重入、锚点、终点与掉落。腾空不猜最近路线；小回转锚与大型终点门、断线与重入门框、单开环与双闭环保持形状区分。Three owner只变换GLB已有且声明`presentationOnly`的TopCap/入口/终点节点，按权威tick有界去重，销毁恢复原始scale与rotation，不创建几何、材质或碰撞。P5.3zzzvl进一步把投影既有六种`guidanceShape`与四种`riskShape`收敛为单一深冻结形状目录：冻结Route/Experience Definition为12+8全部路段提供静态入口形状，当前精确支撑Surface只负责额外强调，不推算下一段；引导形状以XZ比例/朝向表达平台、断层、台阶、分叉、窄轨和钢丝，风险形状以同一入口Cue的高度/静态倾斜表达安全、压力、选择和恢复。三类Anchor Cue均相对已应用形状后的最大轴按目标节点聚合且恰好强调一次，普通模式增加`0.28`、低动效增加`0.12`，多Cue不乘法叠加。不从坐标、摄像机、动画或颜色猜路线/危险。代码与测试仅写入未运行，资产批准、浏览器/设备/真人仍未完成。
- P5.3zzzvo在这一局部形状之上补齐跨段“章节记忆”：12段基座图按`3+3+3+3`分成4章，8段折返图按`2+2+2+2`分成4章。章节只由冻结Map/Route Definition、段序号和既有Experience节奏目录生成，以开放跑道框、分流冠、抬升节奏栈、折返横梁、终章门五种非颜色轮廓语法复用每段已有`ArenaV2SegmentEntryCue`；每章首段只作一次`1.04`统一边界强调。组合顺序固定为`原始基准 → 路段shape → 章节landmark → 当前段 → safe-anchor/respawn`，每帧从基准重算，同节点多Cue只聚合一次。竞速与生存复用同一地图章节语言；不新建Geometry/Material/Texture/draw call，不改世界父节点位置、碰撞、路线或Authority。reduced-motion保留完整静态地标。状态仅为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`；`0/5/12m`截图、路线遮挡、浏览器/真机/性能与真人章节识别仍顺延。

## 8. HUD 与页面

- 11个入口、页面职责和 ViewModel 以生产计划为准；Art Bible 不改导航或规则。
- 每页一个问题、一个主动作、首屏≤3项关键信息；触控目标≥48px，`390×844` 无页面级溢出。
- HUD 为轻量 overlay：稳定数据用圆角矩形，方向/预警用楔形，结果用环/章形；避免嵌套卡片和装饰渐变。
- 倒计时/排名用固定宽数字；时间视觉只投影权威tick并使用以下层级：主局时钟 `MM:SS` ＞ 准备倒计时 ＞ 本地冷却 ＞ 下一批供给 ＞ 单件消失。表现层不自行计时或改舍入方向。
- `MM:SS`主槽在窄/宽布局最小宽度分别为`164/184 CSS px`，保留5个等宽字符列；`N秒`、`0.x秒`与零冷却“就绪”的值槽至少`64 CSS px`。数字使用tabular monospace，不用负字距，不因冒号、小数点或中英文切换推动相邻HUD。
- 单件供给在拥塞时固定拆为“武器名称”与“`Lv.N · N秒/0.x秒/现在`”两行；先延后反馈条，再延后无空间的单件供给条，绝不隐藏主时钟、准备倒计时或把隐藏值改成推算值。
- DOM/Canvas 使用同一 ViewModel、token 和语义顺序；UI 不写命中、拾取、奖励、终局或计时。
- `arena-v2.ui-visual-tokens.v1`是11页DOM与局内HUD Canvas唯一共享视觉值合同：闭合`background / surface / primary / secondary / muted / strong / warning / transparent`八种tone的填充/文字色，以及中文/数字字体栈、tabular数字、圆角和描边等级。合同深冻结、拒绝未来tone，不新增渐变、Dashboard卡片或装饰功能；当前仅`production-unreachable / not-run`，不代表浏览器、截图、设备或Final通过。
- P5模式选择卡非颜色身份候选只增强既有`mode-select:selection-mode`三卡：duel以左右对峙块＋中线、race以三段前进路线、survival以中心核心＋两侧包围柱表达模式手感。每卡精确新增3个静态panel，总增量9，完整RenderPlan primitive总量必须`<=128`；三种唯一性只认panel相对位置、尺寸和圆角，颜色、glyph与文字均不参与放行。窄屏112px/桌面96px卡高、原panel/action、48px、selected/available、intent、文字和完整读屏语义保持不变；辅助panel无action/focus/input。该候选不读取规则、坐标、人数、波次或胜负，不创建Three/DOM节点/asset/RAF/timer，状态仅为`production-unreachable / code-written-not-run / not-run`。
- P5地图非颜色路线身份候选增强既有`map-index:selection-map`两卡，并把同一route geometry核心延伸到当前`map-detail`回退：首图以“前进支撑→断层跨越→落点”、第二图以三段左右折返阶梯形成纯panel几何。语义只取现有地图目录的`collectionOrder / pacingArc / 12+8段`闭包，不解析Definition ID或读取路线运行态。索引每卡精确新增3个静态panel、总增量6、完整计划`<=128`；详情只原位重排既有3 panel、增量0，390×844/1440×900严格使用200/260槽。两种唯一性只认panel相对位置、尺寸与圆角，颜色、glyph和文字不能放行重复几何；同地图同rect的index/detail签名来自同一核心。原panel/action、clip、action rect、48px、availability、intent、label、description和完整读屏语义保持；browse source identity与当前地图必须闭合。该候选不创建资源、Three、DOM节点、RAF、timer或input，状态仅为`production-unreachable / code-written-not-run / not-run`。
- A5/A6武器收藏战斗语法几何只在当前20武器走A6.18 fallback时生效：不新增panel，而是以同一核心原位、有界重排索引卡或当前武器详情既有3个shape/pattern panel。主形状绑定现有`coreVerb`，辅助形状绑定ground/aerial的`failureRisk`，pattern绑定两态`counterInputs`；四类值域直接来自`arena-definitions`正式常量，不复制枚举或战斗数值。当前没有稳定批准的距离档位分类，故不投影距离。重排保留三panel全部整数width/height，尤其保留A6.18已有且四种标准槽均20/20唯一的pattern整数宽度；语法只改变有界位置和整数圆角，不用collectionOrder制造小数微差，也不声称语法本身20种唯一。20张索引卡共重排60项、详情每次重排3项但primitive增量均为0，A6.15硬上限仍为256；ID/role/text/action/48px/accessibility保持，index/detail同武器同标准rect的相对签名一致，72/96/168/240px四种标准槽继续满足A6.18b的22项纯几何唯一闭包，详情实际200/260px槽保持20/20整数几何身份。未来获批GLB透明中心原引用返回，不被fallback覆盖。状态仅为`production-unreachable / code-written-not-run / not-run / hardGate=false`，不授予资产许可、不接默认入口、不创建资源或改变Profile/Authority。
- P5局内二十武器正式VFX样式现在直接绑定上述唯一`ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1`：每个`weaponId × ground/aerial`输出深冻结`combatGrammarIdentity`，逐值保留语法源content hash、动作Definition、`coreVerb / failureRisk / counterInputs`。六个`familyShape`必须与六类`coreVerb`双向一一闭合，20把武器已有接触轮廓继续作为独立可读层，但不得与核心动词家族矛盾。`movement-fall`保持全局语义且语法身份恒为`null`；任何情境、动作、风险、反制或family漂移均在正式Three样式形成前失败关闭。该接线不增加VFX层、粒子、draw call、纹理或生命周期Owner，仍受3效果、96粒子、2x overdraw和reduced-motion静态因果形状约束；静音不改变视觉。状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，不表示5份VFX纹理获批或默认入口开放。
- P5.3zzzvn把同一武器样式的结果层级直接落实到正式Three执行器已经消费的`shape / particles / direction`字段，而不是新增装饰层：`hit-confirm`为最小接触确认（形状/粒子/方向倍率`0.82 / 0.80 / 0.86`），`surface-transfer`为方向更清楚的转移（`1.00 / 1.00 / 1.15`），`ring-out`为最大但有界的终局分离（`1.16 / 1.15 / 1.30`）；`attack-evaded`保持rank 0的非命中whiff，粒子范围归零，只保留非命中形状/正式Cue，不得伪装命中火花。三档继续复用正式Owner既有`18 / 28 / 42` tick包络和目标材质`0.55 / 0.75 / 0.95`峰值，形成Shape→Timing→Value→Color层级；颜色只作辅证。倍率在每把武器原轮廓上恰好应用一次，不改变20把接触身份、同tick最多3项、96粒子、2x overdraw、低质量核心层、reduced-motion静态结果、去重或清理Owner；`movement-fall`仍无武器样式/语法身份。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`，运行、截图、设备、性能和真人因果识别继续顺延。
- P5.3zzzvp补齐同一角色/世界锚点最多3项当前可见反馈的形状互遮：正式VFX先按既有tick包络排除已隐藏项，再解析其余锚点但不改Three节点，并按既有结果rank、权威整数tick/sequence与`sourceEventId`确定性排序；最高结果留在中心，第二/第三项分别使用镜头平面`(-0.24, 0.18)`与`(0.24, 0.18)`的静态分槽。同锚点仅改变既有效果根节点位置，不改变事件语义、形状、方向、时长、透明度或目标角色/相机冲击；不同参与者、body-impact/held-weapon-tip和不同权威世界锚点各自从中心开始。组合顺序固定为`稳定Cue/样式 → 可见性 → 锚点解析 → 同锚点分槽 → 既有tick透明度/尺度与方向 → 绘制`；reduced-motion保留同样分离。总量仍为3效果、每项96粒子、2x overdraw，不新增Geometry、Material、Texture、draw call、资源Owner或历史；未知字段、重复ID、超量与缺失lane在节点提交前失败关闭。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`，重叠截图、双视口、设备、性能和真人辨识继续顺延。
- P5.3zzzvq在上述固定三槽之后增加相机边缘内向偏置：正式Stage已先更新正交相机矩阵，VFX只把同一表现锚点正向投影到NDC；中心区域与底边沿用向上扇形，左/右/上边把第二、第三槽旋向画面内侧，四个角落则给两槽分配不同的双轴内向偏移。主槽始终为`(0, 0)`且不离开权威视觉锚点；同锚点重复lane、投影漂移、非有限值和未来字段均在任何Three节点变更前失败关闭。该方案不做反投影、效果半径/clip测量、权威位置钳制或遮挡推断，只保证次级槽不再沿受压边继续外扩；极端已出界锚点仍可能不可见，不能称为完整视口包围。reduced-motion保留相同静态内向构图；3效果/96粒子/2x overdraw、Geometry/Material/Texture/draw call和生命周期Owner均零增量。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`；边缘/角落、多人物拥挤、遮挡、截图、浏览器、设备、性能和真人辨识全部顺延。
- P5正式音频resolver与Three侧P4.4ab音画制作manifest必须共用同一武器战斗语法身份：20份武器命中媒体只能按正式资产Catalog的`weaponDefinitionId`唯一选择，每把地面/空中动作只能通过同一精确Action lookup形成深冻结`combatGrammarIdentity`；manifest不得保留`weaponId→audio semantic`副表，也不得用`includes()`或token猜语义。武器阶段、模式、供给、移动失足和徒手Cue的语法身份恒为`null`。这项身份收口不改变98份媒体、三档播放率、响度、priority、8 voice、SFX→Master→limiter、ducking或资源Owner；状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，不表示生产批准、实听、浏览器或设备通过。
- P5.3zzzvr收紧正式Web Audio的8 voice拥挤策略：池满时以`priority升序 → 单调ordinal升序 → sourceEventId稳定尾序`选出最低优先级中最旧voice。新Cue优先级低于当前最低值时才丢弃新Cue；同级或更高时先完整停止并断开该最旧voice，确认清理债务消失后才创建新voice。清理失败进入failed并保留未完成Owner债务；被丢弃或成功播放的`sourceEventId`均进入原64项recent水位，不得重播。该策略表达“拥挤时最新同级权威事件优先可听”，不改Cue优先级、增益、节点、总线、资产或并发预算，也不代表拥挤听感已经真人/设备通过。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
- P5.3zzzvs补齐20把武器在低动效下的攻击阶段非颜色线索：普通模式仍消费每把武器既有`phasePose`旋转与尺度；`reducedMotion=true`时不做旋转、插值或脉冲，而按同一权威`action.phase`瞬时选择三种有界静态轴形——前摇`(0.96, 1.06, 1.00)`、生效`(1.08, 0.95, 1.04)`、收招`(0.98, 1.01, 0.96)`。该轴形叠在每把武器原有且持有/地面共用的`identityScaleAxes`之后，因此不取代20把武器的轮廓身份，也不从动画、坐标或声音推断阶段；地面拾取继续只显示既有idle身份。材质明度仍是辅助而非唯一线索。本批不新增Geometry、Material、Texture、节点、draw call、动画、输入或Authority，正式附件批准与默认入口不变；状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`，0/5/12米、多人拥挤、双视口、浏览器、设备和真人辨识证据顺延。
- P5.3zzzvt修正多人命中时的目标受击可读性容量：正式角色受击Owner不再让同一目标的多条hit-confirm/surface-transfer/ring-out记录重复占满3项全局容量，而是为每个明确`anchorParticipantId`按`结果优先级降序 → tick降序 → impactScaleMultiplier降序 → sourceEventId UTF-8升序`保留一个方向/原因赢家，确保同类反馈先使用更新、再使用更强的权威事件；不同目标之间的3项容量排序仍独立保持`结果优先级降序 → 稳定sourceEventId升序`，不把tick或力度扩张为新的全局容量语义。非赢家只作为最多64项的有界包络贡献保留，使同一目标仍取当前最大强度与最长剩余停顿且不相加；赢家remove/过期后可由仍存贡献者确定性接替，其他目标不会被同目标重复记录静默挤掉。方向、明度脉冲和停顿继续只消费稳定命中Presentation command，不从位置、动画或VFX反推原因。该批不增加VFX槽、粒子、overdraw、材质、动画或资源Owner，reduced-motion/static仍消费事件身份但输出零脉冲/零停顿；状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`，多人同tick、双视口、浏览器、设备、性能与真人因果识别证据顺延。
- P5.3w把正式Web触控层纳入同一Visual Tokens V1：`move / primary / jump`精确映射为“移动/攻击/跳跃”，颜色、固定半透明底色、文字、字体、描边和阴影均来自深冻结合同，不使用`color-mix`或第二套宿主色表。角色/tone在DOM挂载前闭合；圆形尺寸、布局、安全区、raw pointer生命周期与三概念Authority边界不变。该切片仍为`production-unreachable / code-written-not-run`。
- P5.3y-A在共享Token中为三角色新增`idle / pressed`精确状态闭集；每态只含`backgroundColor / outlineColor / boxShadow / transform`，视觉值唯一从`states.<state>`读取，不保留role根级颜色或`touchControlChrome`阴影兼容别名。idle逐值保持P5.3w，pressed以固定较强底色、`translate(-50%, -50%) scale(0.92)`和收紧阴影提供颜色＋形状双通道即时反馈，不含渐变、transition、RAF或timer。该状态只描述视觉，不参与pointer接受、命令映射或Authority，Surface接线与运行证据顺延。
- P5.3z-A在共享Token中固定移动外圈的空闲拇指区原点`(0.22, 0.78)`与直径比`0.38`的方向内圈。空闲外圈仍位于固定拇指区；既有输入链接受move后，Surface可把外圈重定位到实际触点原点，并让内圈以圆形＋位移展示经既有`joystickRadius`钳制的方向。Token只提供深冻结视觉值，不读取pointer、不改变命中区、不新增label/intent/Authority；reduced-motion无需动画且不丢失方向信息。该切片仍为`production-unreachable / code-written-not-run`，Surface接线与运行证据顺延。
- P5.3za-A为主攻击增加`unknown / ready / blocked`静态可用性闭集；P5.3zzzwa将新动作事实源收紧为Authority当帧`Scene.localAction.channels.primary / primaryHold`，任一selected即ready；P5.3zzzwc让本地Action仍处于`charging + windup`时保持有效，P5.3zzzwd再按权威`chargeLevel=0 / >0`把同一按钮文字从“攻击”切为“按住/松开”。`committed`、准备、冷却、硬直、普通动作占用和终态不放宽，生命周期清理恢复“攻击”。`unknown`用于开局前与生命期清理；`blocked`以可读透明度＋固定斜杠形状双通道表达。它不是DOM disabled，不改命中区、输入或命令，也不重算蓄力阈值；availability、Label与`idle / pressed`正交，无渐变、transition、RAF、timer或脉冲，状态为`production-unreachable / code-written-not-run`。
- Movement/Jump可用性沿用同一`unknown / ready / blocked`闭集和深冻结视觉字典，但分别通过独立`touchMoveAvailability / touchJumpAvailability`解析。正式事实合同是`ArenaLocalJumpAvailabilityV1`：Duel/Race/Survival从唯一Movement capability生成，经Runtime V6→Session/Product/Learning→Scene开局与逐帧显式传递；P5.3zzzwb要求最终Scene/HUD投影也不可省略或接受`null/undefined`。正式Web一次闭合`tick / eventSequence / localParticipantId`后，用`canMove`投影Movement，用权威`state`投影Jump。`unknown`只用于生命周期清理，不能作为缺失Authority事实的兼容回退；blocked均使用透明度＋斜杠而不是DOM disabled，不改命中/输入/命令，不新增tone、颜色、动画、按键、页面或资产；状态为`production-unreachable / code-written-not-run`。
- P5.3zb-A把移动端安全区限定为Presentation/Input geometry：正式Web宿主缓存CSS `env(safe-area-inset-top/right/bottom/left)`四边独立、有限且非负的只读快照，信息页、HUD、Pointer Surface与InputSampler共享同一viewport和safe rect。safe rect边界为`left / top / viewportWidth-right / viewportHeight-bottom`；横竖屏、左右非对称刘海与底部手势区均不合并推算，四边均为0时逐值保持既有布局。
- P5.3zb-A要求primary/jump完整圆形及标签始终落在safe rect内，沿用既有至少`46 CSS px`半径；视觉中心与`controlAtPoint`命中中心必须来自同一不可分叉的布局事实。不得只移动图形、不移动命中，不得缩小半径、降低分辨率或隐藏标签；safe rect无法同时容纳既有控件尺寸、间距与中心时必须在发布布局前失败关闭。move空闲外圈同样完整位于safe rect内；accepted move后输入与视觉原点仍精确使用真实已接受触点，不钳制、伪造或偏移raw pointer，只有方向内圈继续使用既有`joystickRadius`。本合同不新增颜色、Token、按钮、手势或动画，不写Authority；与P5.3y/z/za正交，reduced-motion和静音不移除信息。状态为`code-written-not-run`，真实CSS env、横竖屏、遮挡、设备与截图证据全部顺延。
- reduced-motion下时间只做原位字形替换，不脉冲、不缩放；静音不移除任何时间事实。读屏不逐tick/逐十分之一秒播报，只暴露当前完整语义；正式HUD Canvas候选已按`consumerEpochId + generation`实现“武器已经就绪”的正数到零单次去重公告，首次已就绪及暂停、清空或切代后的新基线保持静默，但当前仅为代码已写，未宣称读屏或设备运行证明。

### 8.1 三模式视觉语法（A2.0机器合同闭合候选）

本节服务[美术对齐矩阵A2.0](arena-art-development-alignment-matrix.md#a20-权威事件音画职责候选)。机器账本以`92bafbd`为生产源码基线，固定33项当前字节、17项直接fixture与六键step边界；Jump capability测试修正仍待协调复核提交。生产默认Registry/Composition/入口仍不可达，因此本节不表示A2、HUD、音频、VFX、截图、Blockout或资产已获批。

A2 live表现未来只消费`ModeMatchRuntimeV6.step()`的exact-key `events / localJumpAvailability / readFrame / readFrameAudit / supplyCadence / supplyFacts`。其中`localJumpAvailability`是start与每个step均必填的权威能力，缺失即整包失败关闭；`events`驱动one-shot，`readFrame`重建持续状态，`readFrameAudit`只复算身份闭包，供给字段只进入既有供给表现链。Presentation不得读取runtime内部`stateHash`、commands、mode state、checkpoint、Replay、authority或config。

| 实际静态消费源 | 美术只读事实 |
|---|---|
| `packages/arena-match/src/mode-match-runtime-v6.ts` | 公开step只有当前六键；六者整包验证后才能原子提交表现，内部hash/command/checkpoint零消费 |
| `packages/arena-contracts/src/match-event-v6.ts` | `id / sequence / tick / type`事件身份，以及开局、fall、重生、Race锚点/终点、Survival slot/fall与三模式Result事件 |
| `packages/arena-contracts/src/match-read-frame-v3.ts` | `worldSnapshot`的tick/phase/eventSequence、mode projection、result、equipment与active supply projection |
| `packages/arena-contracts/src/arena-public-supply-projection-v3.ts` | snapshot tick/sequence、`resyncReadiness`、pending authority/expiry identities及最多3个active供给的完整身份和remaining ticks |
| `packages/arena-product-contracts/src/product-public-match-info-v2.ts`、`product-match-result-v3.ts` | 产品层身份/结算参考，不在step内，不能驱动A2 live Cue；正式Composition接线待绑定 |
| `packages/arena-match/src/mode-match-runtime-checkpoint-v1.ts`、`packages/arena-match/src/replay-v6.ts`、`packages/arena-match/src/mode-checkpoint-v2.ts` | 只属runtime恢复与治理，不是Presentation消费源；历史事件/输入/checkpoint前缀不得用于补播或重建Cue |
| `packages/arena-regression/src/arena-mode-verification-runtime-factory-v1.ts` | 每局一次恢复链及同seed/同输入continuous/restored逐字段对照源码；仅登记为待运行入口，尚不能证明恢复等价或A2可恢复 |
| `packages/arena-product-presentation/src/arena-v2-mode-hud-consumer-epoch-v1.ts` | 本地epoch、水位、HUD ViewModel顶层exact-key、同tick空批次、下一tick完整V6批次闭合、反馈来源与旧generation拒绝；已由正式候选宿主与效果consumer原子组合，本轮直接规格已运行，默认入口仍断开 |
| `packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts` | 切epoch时`visual.clear / audio.stopAll`并重置视觉/声音去重；已由正式候选宿主原子组合并纳入直接规格，正式媒体、默认入口及浏览器/设备证据仍缺 |

委托中的`supply-projection-v3.ts`、`public-info-v2.ts`、`mode-result-v3.ts`是简称而非当前实际路径；本Bible只绑定上表真实文件。任一文件路径、schema、step六键或exact-key漂移时，A2.0退回`source-drift / hardGate=false`。

缺任一step键、出现额外/未来键、event/supply/frame水位不闭合、供给cadence或Jump能力身份漂移、`readFrameAudit`漂移、SupplyProjection非ready或末项`MatchEnded.modeResult`与同step `readFrame.worldSnapshot.result`不一致时，整包不提交：不播放one-shot，清除时间敏感Marker/倒计时/Result候选并显示中性“表现数据暂不可用”文字/基础glyph。资源缺失仅降级为同语义静态形状/数字/文字，不得降级成第二套规则推断。

checkpoint restore只在runtime内部恢复历史前缀；Presentation不得读取checkpoint或`eventsPrefix`。P5正式候选宿主已原子组合本地consumer-epoch与效果清理，本轮直接规格证明旧epoch拒绝、`clear/stopAll`及同tick去重；runtime仍没有公开epoch字段。真实浏览器宿主替换runtime时仍须以恢复后已验证Frame水位重建持续态，历史one-shot永不补播；浏览器资源迟到与设备端销毁证据继续未运行。

| 模式 | 核心形状句法 | 常驻信息 | 结束语法 | 禁止混淆 |
|---|---|---|---|---|
| Duel | 两个相向括号/楔形，中间保留冲突空隙 | 双方身份、生命/阶段和剩余权威时间 | 单一胜者用闭合章；同时终局用对称断章 | 不引入队伍色、路线rank或Survival fall环 |
| Race | 分叉菱形路线→小型回转锚门→大型终点门框 | 固定宽rank、participant短编号、权威progress/respawn ticks | 有finisher才闭合终点章；同tick共享第一；`no-finisher`保持开放门框 | 锚点不得像终点，终点不得像供给范围；事件序不制造先后 |
| Survival | 外围压力箭头→场上三实体供给→两格断环fall计数 | survived ticks、pressure stage、active enemy count、`0/2–2/2` | 第二次fall后断环闭合为中性成绩章，不使用Duel winner/draw | enemy generation不变成新敌种/稀有度；fall计数不画成永久生命成长 |

- Race 2–4人身份采用“稳定短编号＋不同内部glyph＋纹理方向”，阵营/participant颜色只能辅助。缩至`390×844`游戏镜头和灰度后仍须区分本地玩家、每名竞速对手、终点和安全锚点。
- 同tick并列只允许一个共享finish核心Cue，再把并列参与者放入同一第一名容器；禁止按事件到达顺序播放先后不同的胜利姿势、音高或章形。
- `no-finisher`、Survival time cap和资源加载失败都使用中性结果语言；不得为了“有反馈”伪造winner、完整排名、重生或奖励成功。
- Survival敌人始终属于同一低多边形视觉族。数量/压力变化通过同屏数量、入口方向、疏密和权威stage标记表达，不靠更大碰撞暗示、颜色稀有度或新增技能轮廓。
- Race掉落与Survival掉落都复用向下断线，但上下文结果不同：Race连接180 tick锚点重生；Survival连接两格fall count。命中导致的掉落必须先有接触/来源Cue，移动失足不得补命中红闪。
- 声音模式与视觉同源：Race并列合并单次stinger，`no-finisher`用中性Cue，Survival同tick多enemy slot激活合并压力Cue；静音只关闭播放，不能移除数字、形状、文字或语义公告。
- 正式A2必须在默认、灰度、色觉差异、reduced-motion、静音、低质量级、2/3/4人拥挤和最小/最大enemy count下分别截图/录屏；任何只在彩色或声音开启时可理解的状态都退回Concept。

### 8.2 A2.0 七维静态自检

1. **健壮性**：A2权威入口已固定为step六键且Jump能力在start/step均必填；33项源码身份、17项直接fixture和44项隔离漂移已由机器checker闭合，P5宿主仍只接收已验证step投影；浏览器/设备异常注入仍未运行。
2. **竞态/事件去重**：P5直接规格已闭合旧水位、完整批次数量、逐项sequence、ID、tick、Mode、反馈来源、同tick空批次、旧generation拒绝和切代清理；one-shot仍只以权威`event.id/sequence/tick`消费。浏览器资源迟到、跨页面重入与设备端运行证明仍缺。
3. **静音与低动效兜底**：静音不删除数字、形状、原因与Result；低动效只移除震屏、闪烁和大位移。程序化glyph仅为资产失败fallback，不是正式资产、来源许可或A1.1通过证据。
4. **人数/模式边界**：静态合同覆盖Duel、Race 2–4人、Survival player/enemy slot、并列、`no-finisher`、0/1/2次fall及最多3个active供给；正式glyph/pattern因PublicInfo不在step而继续等待Composition，窄屏拥挤和真人理解仍无证据。
5. **异步资产生命周期**：P5直接规格已覆盖切epoch`visual.clear / audio.stopAll`、旧generation拒绝、原子宿主与失败清理重试；默认入口、真实异步资源、浏览器双destroy、设备资源归零与前后台证据仍未运行。
6. **主流程不反向判定**：终点、fall、排名、重生、供给、淘汰和结算只读step中的events/Frame projection/ModeResult；`ActionStarted`不冒充命中，Frame差分不冒充供给原因，坐标、动画完成、音频时长与资源结果绝不改变权威事实。
7. **治理/回滚**：当前为`preproduction-contract-machine-closed / hardGate=false`；runtime路径、step六键或exact-key漂移即退回`source-drift`。机器包与本节状态可独立回滚，不回退P2/P5生产源码、A0.3/A1证据或资产。

该自检已包含源码checker与直接规格，不是构建、截图、浏览器、设备、真人、性能或正式资产验证；后者继续记红。

### 8.3 P6.9-A 武器主研究里程碑信息层级合同

本合同使用`threejs-game-ui-designer`，强制参考账本为`ui-patterns.md / game-ui-quality.md / hud-readability.md / responsive-ui-fit.md / mobile-input.md`，五项均已读取。它只规定既有`weapon-index / weapon-detail / 结算/奖励`三处如何投影P6只读事实，不新增第12页、卡片、货币、日常任务、战力、奖励、红点、弹窗或主动作；玩家可见文案统一使用“主研究”，禁止把收藏证据写成“局”。

| 既有页面 | 信息层级与唯一增量 | 禁止扩张 |
|---|---|---|
| 武器收藏列表 | 保留既有武器名称、收藏状态、五情境理解和`主研究 X/120`进度行；只在同一进度轨上加入`30 / 60 / 90 / 120`四个固定形状刻度，不增加第二进度卡或“下一目标”文案 | 不显示奖励、战力、货币、任务、剩余局数或可点击里程碑；刻度不是按钮 |
| 武器详情 | 在既有主研究进度之后只增加一条“下一里程碑”事实：显示上游已验证的下一阈值与尚需主研究点数；到达`120/120`时同一槽原位显示“主研究里程碑已完成”，不伪造新目标。既有`map-consequences`继续完整承载武器详情Owner给出的学习问题、三模式地图影响与可选竞技地图建议；既有`weapon-record`完整承载上游已收藏/主研究阶段/下一情境/五情境证据/全武器主研究与全部情境旅程。表现层只在两字段原分号后换行并保留分号，不重排、不选择或解释成长、地图或武器事实 | 不列四档任务清单，不重复列表，不新增领取/前往/研究按钮；不得由UI选择下一阈值或情境。`map-consequences / weapon-record`短文保持58/68px，长文按文字宽度确定性扩展原卡并由既有纵向滚动承接 |
| 结算/奖励 | 只有本次已验证结算事实明确从阈值下方跨到`30 / 60 / 90 / 120`之一时，才在既有学习进度区显示一条`<武器名>主研究达到 N/120`；未跨越时零新增消息 | 不做全屏庆祝、奖励卡、连播或累计历史；同次事实缺失、冲突或声称跨越多个阈值时不由UI挑选消息 |

- 里程碑集合严格闭合为`30 / 60 / 90 / 120`，对应进度轨的`25% / 50% / 75% / 100%`位置。未达到用空心缺口，已达到用实心缺口＋文字状态；颜色只能辅助，继续复用Visual Tokens V1既有八tone，不新增渐变、发光、稀有度色或装饰资产。
- 列表的主阅读顺序为“武器身份 → 收藏状态 → `主研究 X/120`与同轨四刻度 → 五情境理解”；里程碑不挤占名称、收藏状态或唯一目标标记。详情顺序为“武器身份/现有详情 → 当前主研究 → 唯一下一里程碑 → 五情境明细/既有选择动作”。结算顺序仍以权威赛果和实际进度为先，阈值消息低于结果、高于下一目标导航。
- `X/120`、下一阈值和差值使用tabular数字与稳定数字槽；`390×844`允许“主研究 X/120”与刻度轨上下两行，但四个刻度不得拆成四张标签，且不得推动或覆盖48px既有动作区。`1440×900`保持同一语义顺序，只增加留白，不横向扩张为Dashboard。长中文/英文武器名优先省略装饰说明，不能截断数值或阈值。
- Presentation只消费P6/Profile owner已经验证的当前进度、下一里程碑和本次跨阈值事实；不得从前后页面快照、结算动画、消息顺序或本地加法推算跨越，不得计算奖励、写Profile或挑选下一目标。未来P6.9字段未闭合、Profile revision漂移、武器身份不一致、进度越界、阈值不在闭集中或结算前后事实冲突时，在发布任何里程碑UI前失败关闭并保留既有页面状态。
- reduced-motion下刻度与消息原位静态出现，不计数、不脉冲、不缩放；静音不移除任何文本、形状或阈值。读屏只暴露一条合并语义，例如“重锤，主研究42/120，下一里程碑60，还需18”，不逐个朗读四个装饰刻度；结算只在真实跨越时播报一次。
- loading、empty、error、future-profile与装饰资源失败沿用既有A6状态：不显示陈旧里程碑，使用文字＋轨道形状fallback，绝不以默认0或120冒充当前事实。P6只读里程碑投影、A6列表/详情数据、结算单条消息以及A6.15标准RenderPlan刻度/详情单行现均为`code-written-not-run`：列表使用一条`主研究 X/120 · 阶段`和一条合并的`■/□ + 30/60/90/120`四刻度，避免20武器页突破既有256 primitive预算；DOM/Canvas只复用通用text primitive消费者，不新增Surface算法。整体继续`production-unreachable / hardGate=false`，截图、双视口文本适配、读屏、浏览器、设备、真人理解和性能证据均未运行。

### 8.4 P6.13–P6.16 地图里程碑、双进展与唯一下一目标合同

本节继续使用`threejs-game-ui-designer`及8.3节同一五项参考账本，只绑定当前生产不可达源码的最终只读签名，不复制Profile reducer或目标Resolver。页面仍严格是现有11页中的`home / map-index / map-detail / result-reward`；本批不新增页面、按钮、卡片、皮肤、货币、日常任务、战力、训练场、奖励系统或独立模式。

| 当前只读来源 | 本合同允许消费的事实 | UI禁止行为 |
|---|---|---|
| `arena-v2-map-route-research-milestone-projection-v1.ts` | `evidenceCount / evidenceTarget / completedSegmentCount / segmentCount / stage / milestones / nextMilestonePercentage / nextMilestoneEvidenceThreshold / remainingEvidenceCount`；百分比闭集为`25 / 50 / 75 / 100`，阶段闭集为`初识 / 熟悉 / 熟练 / 掌握 / 路线全通` | 不从段落数量、前后快照或百分比自行推算阈值、阶段或跨越 |
| `arena-v2-learning-information-projection-v1.ts` | 结算的`researchedWeaponDefinitionId / mapRouteEvidenceDeltas / progressKinds`及已生成的武器、地图里程碑变化文本；同次结算可同时存在两类进展 | 不把结算动画、消息顺序或本地加法当作进展事实，不制造奖励 |
| `arena-v2-next-learning-goal-v1.ts` | 唯一`nextGoal`的`kind / goalId / question / actionLabel / currentProgress / targetProgress`及对应武器、地图、段落、模式身份；三模式首次完成由`mode-first-completion:<modeDefinitionId>`逐一形成早期覆盖目标，之后武器收藏与地图路线按上游归一化完成度选择 | 不在Presentation比较完成度、不重排模式、不同时展示多个目标、不把早期覆盖目标扩成独立模式或任务列表 |

| 既有页面 | 信息主次与可视增量 | 小屏闭包 |
|---|---|---|
| 地图收藏列表 | 每张地图仍是原有单行条目；阅读顺序为“地图身份/收藏状态 → `路线研究 X/Y`与阶段 → 同轨`25/50/75/100`四个不可点击形状刻度 → 路线理解X/N”。当前唯一目标标记仍由上游目标身份决定 | `390×844`最多使用名称行＋进度/刻度行；长名称可省略装饰说明，不能截断X/Y、阶段或百分比刻度，不得侵占48px既有选择动作 |
| 地图详情 | 在现有地图记录与路线说明中突出当前`路线研究 X/Y · 阶段`，其后只保留一条上游“下一里程碑N%，还需M次有效路线练习”；100%时同槽原位显示“路线研究里程碑已完成”。既有`full-route`继续完整承载地图Owner投影的逐段路线与危险统计，表现层只按原有` → `顺序分行；既有`weapon-consequences`完整保留Owner给出的地标顺序、供给/落点影响和可选竞技练习建议，只按原句号顺序分行；既有`mode-records`完整保留路线研究阶段、下一里程碑、单图路线理解、三模式熟练、全地图路线研究、全部路线理解与下一路段，只按原分号顺序分行并保留分号。三者都不得筛选、重排或解释地图、成长或战斗事实 | 当前进度与下一里程碑可上下两行，但不得形成四档任务卡、领取按钮或覆盖底部导航；既有路线说明和选择动作优先级不变。`full-route / weapon-consequences / mode-records`短文保持58/68px，完整12/8段路线、多句武器影响或完整研究旅程按文字宽度确定性扩展原卡并由既有纵向滚动承接 |
| 结算/奖励 | 权威赛果第一，既有`earned-progress`承载上游发布的全部实际生效回执，既有`collection-change`按上游原顺序承载武器里程碑、地图里程碑和新收藏事实；既有`full-match-record`完整保留Product Result已投影的地图、武器使用、单一主复盘和练习点；既有`reward-breakdown`完整保留Reward Owner给出的规则原因、请求经验、封顶实际入账与重复结算说明。表现层只按中文分号建立换行层级，不重排、不选择、不计算或省略为“另有N项” | `earned-progress`短文保持96px；三个延后字段短文保持58/68px。四个字段都按当前文本宽度确定性扩展原卡，在既有4096码点输入边界内保留全部行并由纵向滚动承接，不设置更小的视觉截断门。主动作仍固定在滚动区外，DOM/Canvas使用同一个rect、maximumLines和完整单条accessibilityText |
| 首页唯一下一目标 | 首屏只显示上游唯一`question`、`currentProgress/targetProgress`和原样`actionLabel`。`collect-map / map-segment`使用路线形状语义，`collect-weapon`使用武器轮廓语义，`mode-first-completion:*`使用三模式既有标识；视觉类别不改变目标选择 | 继续满足“一页一问题、一个主动作、首屏≤3项事实”。模式首通一次只显示一个模式，不能展开三模式清单；武器与地图长期轨道也不能并排竞争 |
| 首页记录总览 | 复用既有`recent-records`延后卡与底栏“记录”，标题仍为“记录总览”；同一文字primitive按`累计结算＋经验 → 三模式个人最佳 → 模式熟练 → 武器/主研究/情境研究 → 地图/路线研究 → 挑战`形成确定性行组，不增加容器或第二事实源 | 短记录仍保持88/96px；完整长期记录按实际文字宽度扩展同一卡并使用既有纵向滚动，底栏仍按当前RenderPlan几何定位。完整accessibilityText始终是一条语义；颜色、低动效或静音都不改变信息 |

- 地图刻度复用P6.9-A的“空心未达/实心已达＋文字”双通道和Visual Tokens V1既有八tone；25/50/75/100使用固定宽tabular数字，不增加渐变、稀有度色、发光、图标资产或动态计数。地图阶段是文本事实，颜色不能成为唯一编码。
- 首页不得解释“为什么Resolver选择了武器或地图”，也不得显示双方完成率排行榜；只展示选择完成后的唯一事实。模式首次完成属于早期覆盖目标，保留上游`question / actionLabel`，不借用武器“主研究”文案；武器收藏证据仍必须称“主研究”，不得写成“局数”。
- 记录总览不得按颜色区分模式优劣，也不得把个人最佳包装成奖励或限时任务；无记录固定显示`--`，1v1/竞速取最快、生存取最长，三者顺序不可由表现层重排。
- `recent-records / earned-progress / collection-change / full-match-record / reward-breakdown / weapon-map-plan / full-route / weapon-consequences / mode-records / map-consequences / weapon-record`可读布局只消费字段Owner已经生成的`valueText / accessibilityText`；换行和高度属于共享Layout/RenderPlan视觉承载，不得解析成长、奖励、地图或战斗规则、重新选择复盘/练习事实或修改字段ID。显式换行由DOM的`pre-line`与Canvas同一换行算法消费，现有字段、primitive、页面、动作和资源数量均为零增量。
- 竞技准备既有`weapon-map-plan`完整保留同一准备投影已经给出的本局武器×地图练法、长期目标、四段路线骨架、武器情境目标与下一路段；Presentation只在原中文分号后换行并保留分号，不解析Profile、研究进度、路线或情境，不选择下一目标。短文保持58/68px，完整合法计划按文字宽度扩展原卡并由既有纵向滚动承接；唯一“开始比赛”主动作和三张既有详情入口不变。
- reduced-motion下所有刻度、阶段、双进展和目标切换均原位静态替换，不计数、不滑入、不脉冲、不缩放；静音不删除文本、形状、进度或目标。读屏按“页面问题 → 当前进度/阶段 → 下一里程碑或唯一动作”合并播报，结算时先读赛果，再各读一次真实武器/地图变化，不逐个朗读四个装饰刻度。
- loading、empty、error、future-profile、Profile revision漂移、地图/武器/模式身份不闭合、百分比不在闭集、证据越界、跨越事实冲突或同一输入出现多个`nextGoal`时，在发布新层级前失败关闭并保留既有安全页面；不得用0%、100%、首页默认目标或旧结算消息填空。
- 状态按当前源码拆分：P6.13–P6.16地图里程碑投影、双进展结算与长期目标Resolver保持`production-unreachable / code-written-not-run`；P6.17-A已让A6首页第一屏和收藏进度组件接受精确`mode-first-completion:<modeId>`，其中完整首页进一步强制`currentProgress=0 / targetProgress=1`并继续路由既有`mode-select`。P6.18又让A6.2/A6.3按同一P6 projector复核路线研究事实，并由A6.15把地图`25/50/75/100`单行刻度和详情唯一下一里程碑接入标准RenderPlan；上述UI实现现均为`code-written-not-run / production-unreachable / hardGate=false`。DOM/Canvas真实绘制、双视口文本适配、滚动、读屏、浏览器、设备、截图、真人理解、压力与性能证据全部顺延。

## 9. VFX 与五类反馈

VFX 按 `Shape → Timing → Color` 制作，先灰度核心层，再加方向、结果和装饰层。五类反馈不得共享完全相同的形状、时序与声音。

| 权威语义 | 核心形状/时序 | 结果层 | reduced-motion / 静音 |
|---|---|---|---|
| 命中确认 | 接触星/短十字，极短瞬态 | 受击姿态、来源方向 | 静态接触标；静音保留形状 |
| 支撑面转移 | 方向箭/扫线，接触后延伸 | 落面与路线变化 | 稳定方向线+落点环 |
| 击落出圈 | 外扩断环，位移后确认 | 出圈方向、结果章 | 图标+文字，不强震屏 |
| 攻击被避开 | 未闭合弧，前摇后消散 | 收势与反制窗口 | 保留结束方向；声音不像命中 |
| 移动失足 | 向下断线，失去支撑后出现 | 恢复/重入方向 | 状态图标+方向，不用受击红闪 |

- 核心、方向、结果、装饰层可独立开关；低质量级不关闭因果必要层。
- 粒子有固定容量、生命周期、对象池和 overdraw 证据；销毁后活跃粒子/监听器/句柄归零。
- hit-stop、镜头位移和震屏只影响表现，不延长或回写权威 tick。

### 9.1 P5.3zc-A 正式命中镜头冲击合同

正式 Arena V2 相机只允许消费已经稳定化的 Presentation camera-impact command；不得直接读取 Rule/Core、武器Definition、坐标后果、旧`arena-world-stage`/V1 runtime或未稳定事件。冲击作为正式全图/跟随相机算出基础姿态后的瞬态只读增量，不写回target、follow状态或任何Authority事实。

| 稳定表现语义 | 强度 | 持续 | 峰值位移（当前相机垂直视野） | 峰值zoom-in | 是否触发 |
|---|---|---:|---:|---:|---|
| `hit-confirm` | `normal` | 5 tick | 0.35% | 0.18% | 是 |
| `surface-transfer` | `strong` | 7 tick | 0.70% | 0.30% | 是 |
| `ring-out` | `warning` | 9 tick | 1.00% | 0.45% | 是 |
| `attack-evaded`、供给/替换/过期、普通UI | 无 | 0 | 0 | 0 | 否 |

- 每项只使用整数`ageTick = currentTick - startTick`；`0 <= ageTick < durationTicks`时包络固定为`((durationTicks-ageTick)/durationTicks)^2`。位移符号按ageTick奇偶交替，zoom只做非负的极轻zoom-in并随同一包络归零；不得读取墙钟、插值墙钟delta、创建RAF/timer或暂停Authority。
- 同时最多保留3项冲击，先按`warning > strong > normal`、再按`sourceEventId` UTF-8字节序稳定取舍；加总后位移绝对值封顶当前相机垂直视野的1.20%，zoom-in封顶0.55%。超过容量的低优先级项只记有界诊断，不延长现有冲击、不形成队列或迟到补播。
- command有合法、有限、非零方向事实时，只将它投影到当前相机`screenRight/screenUp`平面并归一化，用于表现方向，不改变击退、位移、落点或胜负。方向缺失/零向量时，以精确`sourceEventId` UTF-8字节计算`phaseIndex = sum(byte[i] * (i+1)) mod 8`，并使用`cos(phaseIndex*45deg)*screenRight + sin(phaseIndex*45deg)*screenUp`；禁止`Math.random()`、match随机流或墙钟种子。缺`sourceEventId`不得生成冲击。
- recent command身份环固定容量64：同epoch、同`sourceEventId`、同canonical命令是幂等重放；同ID字段漂移、tick倒退、旧epoch、非法方向、未知语义/强度或future字段均在改变相机前拒绝整批，并立即输出零冲击、保留基础相机。多事件同tick按上方稳定顺序原子提交，不允许部分写入。
- `pause / clear / epoch switch / reset`立即将位移和zoom归零、清空active项与去重环；resume只接受之后的新命令，不补播历史。`remove(sourceEventId)`只移除精确匹配项且不制造恢复脉冲；`dispose`先归零并释放有界状态，幂等完成后拒绝继续消费。不得留下旧epoch回调、半清理相机或无界历史。
- `reducedMotion`或`static`模式下，camera impact仍消费身份以保持水位一致，但输出恒为零位移、零zoom；对应VFX、静态形状、HUD命令与音频不被删除或降级。静音同样不改变镜头或视觉因果。
- 本合同不新增按键、页面、规则或资源，不改tick、相机跟随模型、命中、击退、淘汰或胜负。状态严格为`production-unreachable / code-written-not-run`；浏览器、设备、眩晕/舒适度、多人叠加、Replay/epoch与性能证据均未运行。
- `game-art-director`强制引用的`docs/collaboration-protocol.md`与`docs/game-design-theory.md`仍不存在，是source-freeze前治理红门；本阶段不创建占位、不用本合同冒充其签核。

### 9.2 P5.3zd 受击角色明度脉冲合同

受击角色可读性只作用于命令明确给出的`anchorParticipantId`，使用该角色自有克隆材质，不改共享GLB模板、武器材质、Authority位置、动作阶段或动画时间。当前Character Registry只提供全体统一动画推进，因此本批明确禁止全局hit-stop；未来只有建立逐participant表现时间端口后，才允许独立评估目标姿态停顿。

| 稳定表现语义 | Shape | Timing | Value/Color | 峰值 |
|---|---|---|---|---:|
| `hit-confirm` | 角色本体白亮接触脉冲 | 3 tick，命中tick达峰后二次衰减 | 优先抬升emissive；无emissive材质才向白色混合 | 0.55 |
| `surface-transfer` | 更明确的本体方向结果脉冲，方向仍由既有VFX表达 | 4 tick | 同上，不新增透明层 | 0.75 |
| `ring-out` | 最高层级本体结果脉冲，击落环仍由既有VFX表达 | 5 tick | 同上，不覆盖warning结果形状 | 0.95 |

- 这是命中后的action/follow-through层；攻击前的anticipation继续由权威`ActionStarted`、既有动作和windup音频承担，不在结果到达后伪造前摇。
- 每项包络为`peakIntensity * ((durationTicks-ageTick)/durationTicks)^2`，只读取权威整数tick。最多3项，按`ring-out > surface-transfer > hit-confirm`和`sourceEventId` UTF-8稳定取舍；同一目标同tick只应用最大强度，不相加过曝。recent identity固定64项。
- 白亮只改角色实例拥有的材质：有emissive时将基色emissive向白色混合并有界提升强度；无emissive时才将实例color向白色混合。每帧从构造时冻结的baseline重算，归零、失败或销毁恢复精确baseline，不叠乘、不污染共享模板。
- `anchorParticipantId`缺失时不生成角色脉冲；目标已离开当前Frame时忽略该帧材质写入且不阻断主流程。闪避、移动失足、供给、UI与无目标世界锚点不触发。
- `reducedMotion`或`static`输出零角色脉冲，仍保留既有静态命中形状、方向、HUD和音频；本批不增加粒子、透明面、draw call、distortion、光源、shader或纹理，因此不扩大既有2x overdraw预算。
- `remove(sourceEventId)`只移除精确active项并保留其去重身份；`pause / clear / epoch switch / Match释放 / dispose`清空active与64项去重环并恢复材质。VFX借用该状态，Three Stage拥有并在VFX之后销毁。旧epoch、字段漂移、tick倒退、future字段和非法强度在材质提交前失败关闭。
- 状态为`production-unreachable / code-written-not-run`。白/黑背景、六角色材质、多人同屏、色觉差异、reduced-motion、设备亮度、热稳定和构建证据均未运行。

### 9.3 P5.3ze-A 目标角色独立受击停顿合同

hit-stop只允许消费与P5.3zd明度脉冲相同的稳定Presentation命令和唯一`anchorParticipantId`，并且只能暂停该participant自有的角色骨骼动画推进端口。攻击者、其他玩家、武器/VFX独立动画、相机、Authority、位置、速度、击退、碰撞、输入、命中、胜负与整数tick必须继续正常推进；若当前Stage没有逐participant动画端口，必须输出零停顿并保持1x，禁止退化为全局mixer暂停。

| 稳定表现语义 | 目标骨骼停顿 | 精确窗口 | 恢复 |
|---|---:|---|---|
| `hit-confirm` | 2 tick | `[startTick, startTick+2)` | `startTick+2`起直接1x |
| `surface-transfer` | 3 tick | `[startTick, startTick+3)` | `startTick+3`起直接1x |
| `ring-out` | 4 tick | `[startTick, startTick+4)` | `startTick+4`起直接1x |

- `startTick`就是命中命令的权威整数tick。窗口内只跳过目标角色骨骼动画的本tick推进，不改AnimationClip、Action权重、当前时间、循环模式或已提交姿态；窗口结束直接恢复正常1x，不追赶、不补帧、不慢放、不按墙钟补偿。
- snap或新建目标角色时，必须先从当前稳定角色/动作投影建立并提交该tick的合法姿态，确认骨架、clip与participant身份闭合后才进入停顿。未初始化骨架、缺clip、重复participant实例、目标已离场或身份不闭合时不得暂停其他实例，也不得使用bind pose/上一角色姿态冒充当前姿态；该命令只保留去重身份，不迟到补播。
- hit-stop与P5.3zd共用同一个`epoch / sourceEventId / canonical command`身份账、最多3个active项和recent 64项环，不建立第二套事件排序或去重。容量取舍仍为`ring-out > surface-transfer > hit-confirm`后按`sourceEventId` UTF-8字节序；同一目标同时或连续命中只取`max(existingEndTick, incomingEndTick)`的最长剩余窗口，不相加duration、不叠乘timeScale。
- `anchorParticipantId`缺失、未知或不唯一时停顿为0；命令只能冻结anchor目标，绝不根据接触点、材质、距离、事件顺序或当前选中角色猜目标。`attack-evaded`、移动失足、供给、UI和无目标世界锚点不触发。
- `reducedMotion`或`static`仍消费相同身份和水位，但hit-stop恒为0，P5.3zd材质脉冲也按既有合同恒为0；静态命中形状、方向、HUD与音频继续保留。静音不改变骨骼停顿或视觉替代职责。
- `remove(sourceEventId)`移除精确项，并按该目标其余active项重算最长`endTick`；若无剩余项立即恢复1x。`pause / clear / epoch switch / reset / Match释放 / dispose`在释放状态前先将所有目标恢复1x并清空active与recent环；旧epoch结果不得重新停顿新实例。
- 同ID字段漂移、tick倒退、future字段、非法duration、跨epoch或多事件身份冲突必须在任何动画状态变更前整批拒绝；发生内部错误时尽力恢复全部受管目标1x并进入失败关闭，禁止留下半停顿角色。exact replay幂等，不重复延长窗口。
- 本合同不新增动作、按键、资源、RAF/timer、墙钟、随机、透明层、材质、粒子、draw call或Authority状态。状态严格为`production-unreachable / code-written-not-run`；六角色逐实例混战、恢复/Replay、暂停、低动效、设备、30/60FPS与真人舒适度证据均未运行。

### 9.4 P5.3zf-A 目标角色受击方向动作选择合同

方向动作只允许在同一稳定命中Presentation command明确给出唯一目标，且该目标当前Authority角色语义已经是`HITSTUN`或`KNOCKBACK`时，从现有`Hit_A / Hit_B`中选择表现姿态。Presentation不得创建、延长或重启受击状态，不得改变动作时序、hitbox、位置、击退、碰撞、tick或胜负；角色语义不在上述两态时忽略方向选择并保留Controller既有中性/default选择。

| 输入闭包 | 判定 | 既有方向语义 | 既有clip选择 |
|---|---:|---|---|
| 有限、非零的目标当前Authority `facing.xz`与同命令合法`worldDirection.xz`，分别归一化 | `dot <= -0.20` | `front` | `Hit_A` |
| 同上 | `dot >= +0.20` | `back` | `Hit_B` |
| 同上 | `-0.20 < dot < +0.20` | 近侧向/中性 | 保留Controller既有中性/default |
| 任一向量缺失、零长、非有限，或目标/角色语义不闭合 | 不判方向 | 中性 | 保留Controller既有中性/default |

- 阈值边界包含`-0.20`与`+0.20`；点积只使用归一化XZ平面数据。目标朝向必须来自同tick稳定角色只读投影，不能读取Three节点朝向、混合器姿态或镜头；`worldDirection`必须来自同一个稳定directional Presentation command，不能从攻击者/目标坐标、接触点、相机、VFX朝向、动画姿态或事件先后反推，也不得求hash相位或随机补方向。非directional命令永远走中性/default。
- `Hit_A / Hit_B`仅是现有Controller可选clip；本合同不新增clip、Action、骨骼、混合层、cross-fade或重播规则。同一命令exact replay不得重启当前clip；角色已离开`HITSTUN / KNOCKBACK`后，旧方向不得重新选中受击动作。
- 方向选择复用P5.3zd/P5.3ze的同一`epoch / sourceEventId / canonical command`身份账、最多3个active项和recent 64项环，不建立第二套排序或去重。同一目标只采用`ring-out > surface-transfer > hit-confirm`后按`sourceEventId` UTF-8字节序确定的稳定赢家；高tick赢家合法变化时可更新方向，exact replay幂等，同ID字段漂移、tick倒退、跨epoch或future字段必须在任何动画选择变更前整批拒绝。
- `remove(sourceEventId)`精确移除对应项并从剩余active项重算赢家；无合法赢家时立即清除方向覆盖、回到Controller中性/default。`clear / epoch switch / reset / pause / participant leave / Match释放 / dispose`均清空方向状态；resume或新实例只能消费恢复后当前epoch的新命令，不迟到补播、不把旧方向带给新实例。
- `reducedMotion`或`static`仍可保留`front / back`静态姿态语义，因为它不依赖位移、闪烁或时间包络；P5.3ze受击停顿与P5.3zd材质脉冲继续分别按既有合同输出0。静音不改变方向姿态，静态命中形状、HUD与音频各自按既有合同承担冗余信息。
- 本合同不新增动作、按键、资源、材质、透明层、draw call、RAF/timer、墙钟或随机，不修改攻击者、其他角色、Authority或现有动作时序。状态严格为`production-unreachable / code-written-not-run`；clip语义映射、六角色朝向、多人同tick赢家、恢复/Replay、低动效、设备、30/60FPS与真人可读性证据均未运行。

## 10. 反例

- 写实军事、末世脏污、赛博霓虹满屏、高频 PBR 噪声。
- 所有物体描黑边、所有事件发光、所有命中震屏，导致语义无优先级。
- 角色只换色、武器只靠拖尾、路线只靠地箭，黑剪影/色觉差异下不可读。
- 研究截图、AI 原图、下载图、KZ 灰盒或程序化兜底直接进入正式 Bundle。
- 模仿具体在世艺术家，或复刻参考游戏地图、武器、动作、数值、UI 与资产。
- 降分辨率、抗锯齿、18动作或41关节掩盖分配、材质更新、overdraw 或泄漏。
- Renderer/UI/Audio 重判命中、拾取、倒计时、随机、复活或胜负。

## 11. 命名、LOD、纹理、多边形与音频预算

### 命名与目录

- 文件名：`category_subject_variant_lodN_vNN.ext`；Asset ID：`arena.asset.<category>.<subject>.<variant>.vN`；Cue ID：`arena.cue.<event>.<context>.vN`。
- 源文件、DCC 中间文件和交付文件分离；运行时只进入 `public/assets/arena/{characters,equipment,maps,vfx,audio,ui}/`。
- GLB node、骨骼、材质、动画、LOD 和 bus 用稳定英文 ID；文档/评审用中文。

### 当前自动化硬预算

| 项目 | 上限 | d6f9060 实测 / 余量 |
|---|---:|---:|
| 总编码体积 | 2,359,296 B | 1,990,436 B / 余368,860 B |
| 音频总编码 | 64 KiB | 32,593 B / 余32,943 B |
| 解码纹理 | 16 MiB | 12 MiB / 余4 MiB |
| 单纹理解码/尺寸 | 4 MiB / 1024 | 三张均4 MiB / 1024² |
| 单角色 GLB | 1 MiB | 922,332 B；974,548 B |
| 角色节点/关节/动作 | 64 / 48 / 恰好18 | 54/41/18；52/41/18 |
| 角色 primitive/材质 | 16 / 4 | 12/1；10/2 |
| 附件 GLB/节点/primitive/材质 | 64 KiB / 8 / 4 / 2 | 圆盾13,084 B / 1 / 1 / 1 |
| 单纹理/单 OGG | 64 KiB / 16 KiB | 当前全部通过 |
| 三端 delivery | 4 MiB | clean build 重算 |

`arena.stage7.formal-asset-budget.v1` 继续是现行正式预算真值。2026-08-12 的
`arena.stage7.formal-asset-budget.v2-candidate` 另行精确冻结当前 Catalog 130 项的现有
`assetId / path / byteLength / SHA-256`，并从同一规范顺序重算总编码、音频及解码纹理字节；它不提供性能
余量，节点/关节/动作/primitive/material/纹理/设备结构上限仍未批准。V2 覆盖只表示当前字节身份被候选
目录收录，不等于 `productionApproved`、`assetUsePermitted`、Final 或 hard gate；默认 Bundle、Preloader、
Entry 均不消费，V1 对地图、扩展武器、VFX和大部分音频的 `uncovered` 结论不得被静默改写。

逐资产生产批准证据账本候选进一步把上述130项的Catalog/V2身份、来源revision/license/rights/proof、
来源批准记录与七类生产证据槽逐项闭合。当前29项存在的只是第三方intake来源批准；130项生产批准仍
全部为`missing-not-approved`，910个生产证据槽全部缺失，`assetUsePermitted / formalReady / hardGate`
均为false。来源批准、Catalog登记或V2候选覆盖任何一项都不能单独升级生产批准；未来真实批准必须升级
账本版本并通过独立gate。A6.4—A6.18收藏预览许可链已据此收口：当前20武器+2地图全部
`formalReady=false / assetUsePermitted=false`，不签发request/release token；A6.6与A6.11a在底层loader前双重拒绝，
11页由A6.18把既有20武器轮廓/动作语义和2图20段路线节奏/地标投影为22项唯一的文字＋主/辅形状＋
线型/glyph fallback；A6.18b 又以武器collectionOrder与地图12+8节奏身份固定三panel位置/尺寸/圆角组合，
在72/96/168/240px四种标准槽均要求22项非文字geometry signature唯一。每槽仍固定4个标准primitive、1个text，
颜色不参与几何身份放行，不新增页面、动作或第二套DOM/Canvas算法。
该2D回退不签发token、不创建Three/loader/lease/mount，也不冒充正式资产或程序化3D正常路径。
未来真实批准必须绑定reviewer/date/evidence identity，而不是改写本候选。

P5.3zzzuj进一步把该批准真值前移到正式GLB预加载入口：默认预加载器在任何Task或loader I/O前，只允许同一Catalog identity下同时`productionApproved && formalReady`的模型资产。当前集合为0，因此正常路径零加载并失败关闭；只允许生产不可达的隔离Web开发宿主显式开启未批准候选读取。这个开发许可不授予批准、不改变130项字节、预算、Final或hard gate，也不成为默认Bundle/Preloader/Entry消费。

P5.3zzzuk将上述规则统一到全部正式媒体：唯一批准索引逐项核对Catalog与生产批准账本的`assetId / path / byteLength / SHA-256`，并要求`productionApproved + assetUsePermitted + formalReady`三项同时成立；模型还必须闭合全部外部材质纹理依赖。正式GLB、OGG与VFX PNG都必须在首个网络loader前完成该检查。当前0/130批准，因此默认路径三类媒体均为零加载；4份Kenney OGG只是来源intake核验，不是生产批准。隔离开发许可仍须按模型、音频、VFX分别显式开启，不能扩散到默认Bundle/Entry。

当前政策未统计 triangle/vertex。以下是 A0.1 记录的首件候选预算门，须在 A3/A4 首件资产补自动检查并用目标设备校准；超目标资产不得进 Final。

| 类别 | LOD0 triangles | LOD1 | LOD2 | 原则 |
|---|---:|---:|---:|---|
| 蒙皮角色 | ≤18k | ≤9k | ≤4.5k | 屏高>12% / 4–12% / <4%；活跃角色不剔除 |
| 武器/附件 | ≤4k | ≤2k | ≤800 | 保留轮廓、端点和持握点 |
| 宏观地标 | ≤8k | ≤4k | ≤1.5k | 远处保留导航轮廓 |
| 普通环境道具 | ≤2k | ≤800 | ≤300 | 重复物共享 geometry/material |
| VFX 单次几何 | ≤1k | ≤400 | 核心平面/线 | 装饰先降级，核心不消失 |

- LOD 不减少动作/关节、不改碰撞；切换不产生尺度、色彩、持握点和轮廓跳变。
- 当前仅余一张1024² RGBA 解码纹理；新增资产优先复用 atlas/材质/色块，不默认一资产一张图。
- 纹理声明 sRGB/linear；UI 图标优先 SVG，复杂图再用 WebP/PNG。
- 音频总线目标：`Master ← Music / SFX / Ambience / UI / Voice`；一次性声音有并发上限、优先级、ducking和销毁。当前正式Web候选只实现实际已使用的`voice gain → SFX(0dB) → Master(-6dB) → limiter(-3dB/20:1) → destination`最小链，8 voice与逐Cue dB不变；未使用的Music/Ambience/UI/Voice不创建空总线，未来新增实际声音职责时再扩展。
- 当前每 OGG≤16 KiB、总计≤64 KiB；长音乐先交循环点/声部样件，未批准新预算不得进入正式 Bundle。
- [A4武器命中音频生产评审准备候选V1](arena-v2-a4-weapon-impact-audio-production-review-preparation-candidate-v1.md)已闭合20武器+1徒手、40个地面/空中动作身份、4份Kenney intake与17份衍生候选，并登记SFX/dB/Priority、Master Headroom、Limiter、8 Voice和确定性播放率评审目标。21份125,974 B属于当前扩展Catalog候选，不改写上方现行64 KiB正式预算；生产批准仍0/21，盲听、响度、削波、设备和生命周期全部`not-run`。
- [A4武器阶段音频生产评审准备候选V1](arena-v2-a4-weapon-phase-audio-production-review-preparation-candidate-v1.md)已闭合20×3份windup/release/recovery候选；只读ActionStarted与权威动作阶段，active才映射release，且release永远不是命中确认。前摇/收招`-6 dB / priority 1`、释放`-3 dB / priority 2`只是待审阅目标；60份批准0/60，试听、阶段层级、命中遮蔽、恢复、设备和生命周期全部`not-run`。
- [A5核心反馈VFX生产评审准备候选V1](arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.md)已闭合5张128²候选纹理、5类互斥结果、483个专用Cue及480个武器样式；Shape–Timing–Color按形状/时序/灰度先行，颜色不单独承担语义，武器击落与移动坠落保持因果分离。关闭档0粒子、High最多96粒子、平均过度绘制目标`2x`、无扭曲和64个活动身份均未经过运行测量；正式纹理批准0/5，程序化几何不能替代核心纹理。
- P5.3zzzvk把正式Three VFX的22项既有透传Cue收敛为单一冻结目录与逐项精确语义。`participant-fell-credited-hit`保留击落缺口轮廓，`participant-fell-movement / participant-fell-environment`使用移动坠落下落轮廓，`race-finish-claimed`只由精确身份使用跨面完成轮廓；执行器禁止用`fell / finish`子串猜形状。该区分只解释稳定Presentation事实，不判断掉落原因或胜负；3项同屏、每项96粒子、2x overdraw、层数、纹理、低动效、静音和资源Owner不变，状态为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- [A5模式与供给音频生产评审准备候选V1](arena-v2-a5-mode-and-supply-audio-production-review-preparation-candidate-v1.md)已闭合13个模式Cue、4个供给Cue及17份未批准候选；每项只读显式Authority Event或Supply Fact，模式终局/关键掉落优先于普通模式，供给恒为Voice优先级1。确定性播放率、8 Voice、64去重身份、SFX→Master→Limiter和静音/恢复不补播只是待审阅合同；17份批准0/17，盲听、响度、拥塞、设备和生命周期全部`not-run`。
- [A3–A6正式资产生产评审程序候选V1](arena-v2-a3-a6-formal-asset-production-review-program-candidate-v1.md)把九批130项资产、910个证据缺口与95个评审单元统一成只读交接Owner。每批保留独立身份、受阻时可继续的源码输入和解阻后才可执行的评审；程序不运行命令、不授予批准、不改变批次顺序或生产门。
- [A3–A6生产评审证据提交候选V1](arena-v2-a3-a6-production-review-evidence-submission-candidate-v1.md)要求每份证据引用绑定当前Ledger/Queue/Program、批次/Preparation、资产path/SHA及规范Slot/Kind；陈旧、跨批次或额外字段失败关闭。提交不读媒体、不写账本、不独立评估，采集者记录`pass`也不能授予批准。
- [A3–A6生产评审证据独立评估候选V1](arena-v2-a3-a6-production-review-evidence-independent-evaluation-candidate-v1.md)要求reviewer不同于collector，并在接受前闭合Evidence SHA、内容结构、环境和采集`pass`；拒绝原因必须覆盖失败事实。评估接受仍保持账本槽`missing`和批准`missing-not-approved`，只供后续聚合读取。
- [A3–A6生产评审七槽接受证据集候选V1](arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.md)要求同一资产按规范顺序具备七个accepted Evaluation，且Asset/Batch/Preparation与Slot/Identity全闭合。完整集合仍不批准，只把该资产送入后续独立生产批准决策。
- [A3–A6生产批准独立决策记录候选V1](arena-v2-a3-a6-production-approval-decision-record-candidate-v1.md)要求approver不兼任采集或评估，并在approved前闭合来源权利、预算和依赖。approved记录仍不改当前账本，只能成为未来新不可变账本组装输入。
- 静音只改变播放；前台恢复不补播已过期的一次性 Cue。

## 12. 来源与版本治理

每个交付资产记录 Asset ID、用途/状态、作者或来源、locator、固定 revision、许可证文本、权利证明、商业/修改/分发权、批准人/时间、内容及依赖 SHA-256、制作工具/模型、使用技能、预算、低动效/静音/失败回退和弃用关系。

- 原创资产也记录作者、源文件和授权；第三方先固定 revision/许可再下载修改。
- AI 仅用于 Concept/底稿；记录工具、模型/checkpoint、LoRA、提示词版本与训练数据许可结论。禁止 raw AI Final 和艺术家姓名仿作。
- 状态依次为 `planned → research-proven → implemented → automated-verified → device-verified → human-verified → release-ready`，不得越级。
- Rule/Definition/Event、Map surface、Animation semantic、ViewModel 或 Profile schema 改变时按对齐矩阵返工，不由美术兼容旧玩法。

## 13. 四门验收

| 门 | 输出 | 硬门 |
|---|---|---|
| Concept | 注释参考、轮廓/色彩/声音方向、反例、预算预估 | 不明确表达哪个权威状态/事件则拒绝 |
| Blockout | 黑剪影、灰度/路线 blockout、镜头缩略图、声音草样 | 六方向/镜头不可读、路线不可达或事件未冻结则停止 |
| Integration | 引擎接入、预算、浏览器截图/录音、生命周期/回退 | 规则重判、来源/hash缺失、预算失败或销毁不归零则拒绝 |
| Final | 三端设备、真人识别/归因、低动效/静音、批准记录 | 总分<90、单维度<80%、缺设备/真人/许可则不发布 |

## 14. d6f9060 正式资产审计

| 资产组 | 当前事实 | 判定 | Final 仍缺 |
|---|---|---|---|
| KayKit 跑酷学徒 GLB+PNG | CC0、固定 revision/hash；54节点/41关节/18动作 | `verified-intake-only` Integration 输入 | 六方向剪影、镜头盲测、三端真机、人工低动效 |
| KayKit 发条方块 GLB+PNG | CC0、固定 revision/hash；52节点/41关节/18动作 | 同上 | 同上，并验证拥挤身份与动作过冲 |
| KayKit 圆盾 GLB+PNG | CC0、固定 revision/hash；1节点/1 primitive/1材质 | 冲锋盾 Integration 输入 | P4合同、持握六方向、动作/反馈、设备/真人 |
| Kenney 四个 OGG | CC0、固定 revision/hash；总32,593 B | 反馈声音候选 | 五类映射、总线/并发/静音、设备录音、真人归因 |
| `arena-product/*.webp` 与概念图 | 不在正式 Bundle | 产品/设计输入 | 进入运行时须独立 provenance、预算和四门 |
| 程序化角色、锤、链、研究 VFX | 实现/研究或失败兜底 | 非正式 | 等 P1.1/P3/P4 合同后逐件生产 |

Bundle hash `e03ff2b4`，Policy hash `532faaa2`，Report hash `82a8b378`。这些只证明入库与自动预算，不等于设备、真人或发行通过。

## 15. A0 小门、输入闭环与双轨评分

### 15.1 A0 三个小门

| 小门 | 范围 | 当前状态 | 通过含义 | 明确不代表 |
|---|---|---|---|---|
| A0.1 视觉宪法/来源登记/对齐合同 | Art Bible、14技能审计、六类来源文字登记、色彩计算、角色/武器边界、预算、四门、A0–A7矩阵 | `contract-ready`，主协调已签核（2026-07-28） | 后续任务有唯一、可执行且可追溯的制作合同 | 实际Reference Board、剪影、LOD、设备、真人或Final通过 |
| A0.2 六类实际注释参考板 | 六张合法板面、源文件、review PNG、manifest、hash与双签核 | 三个子门已签核；独立聚合总门96/100，A0.2与Reference Board视觉方向`ready` | 六类视觉方向可作为A0.3输入 | 任何运行时资产、Blockout、剪影或设备表现通过 |
| A0.3 剪影工具与盲测基线 | 可重复渲染工具、正式角色/武器输出、manifest、盲测数据与≥90%结论 | 技术/代理候选85/100；真人0/10，仍`incomplete` | 当前正式角色/武器在固定相机下具有实证可读基线 | 新角色、新武器、LOD、三端设备或Final通过 |

A0.1、A0.2、A0.3分别执行总分≥90且单维度≥80%的门槛；未执行的小门只写 `incomplete`，不得借用A0.1分数。A0.2未通过时不得宣称
Reference Board视觉方向完成；A0.3未通过时可以继续冻结Rule/Core和准备合同，但不得开始生产资产Blockout或宣称剪影/生产视觉前置总门通过。

### 15.2 A0.1 必需输入闭环

| 必需输入 | 权威位置 | 当前证据 |
|---|---|---|
| 产品目标、三模式、六角色上限、11页面 | V2产品总纲/玩法框架/生产计划 | 已读取并交叉引用 |
| P1生存供给边界 | ADR-108 | 20秒三实体、自动替换、600 tick回收边界已引用；未改玩法 |
| 美术/音频执行与技能路由 | 美术音频流程、ADR-109、`.agents/skills/`、`skills-lock.json` | 14/14目录与14/14锁记录已审计 |
| 当前正式资产与权利 | formal bundle、third-party manifest、许可/proof | 3个资产身份、10个artifact、来源/revision/hash可追溯 |
| 自动预算 | `arena.stage7.formal-asset-budget.v1`及报告；V2候选仅冻结当前130项字节身份 | V1 Policy `532faaa2`、Report `82a8b378`已复算；V2 `proposed-not-approved / hardGate=false`且未运行 |
| 生产相机与六方向 | `arena-camera.ts`、`six-sector-direction-resolver.ts`、Presentation Definition | 相机常量、六sector与front axis已固定引用 |
| P4完整武器范围 | V2生产计划P4 | 三把基线、直线压制、读招反制、绕后、持续区阻断均已映射 |
| 六类参考来源边界 | 六类注释参考登记 | 每类70/20/10来源、借鉴点、不复制点、许可/嵌入状态已登记 |

A0.1 当前没有缺失的必需输入。实际图片板是A0.2输出，剪影脚本/样本是A0.3输出，triangle/LOD自动门属于首个A3/A4真实资产批次，目标设备/真人/Final属于相应生产阶段与A7；这些证据不计入A0.1合同分。

### 15.3 A0.1 合同分：94/100

| 项目 | 得分 | 依据/扣分 |
|---|---:|---|
| 视觉宪法核心 | 19/20 | 支柱、形状、色彩、材质、灯光、渲染、角色、环境、UI、VFX与反例齐全；扣1分：该分只覆盖合同，不借用实际板、剪影或资产成熟度 |
| 来源与六类参考登记合同 | 14/15 | 六类70/20/10、借鉴/禁用、许可与嵌入边界完成；扣1分：逐图机器manifest归A0.2 |
| 色彩计算证据 | 15/15 | 13组实际ratio、正文/大字/图形PASS/FAIL和非色彩组合已记录 |
| 小门拆分与零歧义执行合同 | 14/15 | A0.1/0.2/0.3输入、输出、阻断、状态和不得宣称项完整；扣1分：机器校验器归对应执行门 |
| 角色与武器范围 | 9/10 | 2/6现状、四空槽、P4完整顺序和阻断条件明确；扣1分：四槽仍按产品约束保持未设计 |
| 来源/预算/四门 | 10/10 | 正式资产事实、许可/hash、预算与四门边界可追溯 |
| 阶段、索引与协作追踪 | 13/15 | A0–A7矩阵、流程与索引已接入；扣2分：跨文档状态仍依赖人工维护，尚无机器一致性校验 |

该94分来自已存在文档、清单、计算与仓库合同；所有维度均≥80%。它不包含计划中的图片、脚本、设备或真人分。主协调已于2026-07-28通过A0.1硬门并将其签核为`contract-ready`；此次签核没有新增或替代任何A0.2、A0.3及成熟度证据。

### 15.4 资产/设备/真人成熟度：35/100

| 证据 | 得分 | 当前状态 |
|---|---:|---|
| 六类合法图片参考板 | 15/15 | A0.2三个子门已有协调签核；独立聚合总门为`machine-and-art-director-ready`且96/100硬门通过，`coordinatorAggregateSignOff=null`按合同保持诚实；视觉方向为`ready`，不代表运行时资产成熟 |
| 实际六方向剪影/镜头渲染与盲测 | 0/20 | `incomplete` |
| 正式资产来源/hash/现有自动预算 | 20/20 | 3个正式资产身份、10个artifact通过；仍非Final |
| triangle/vertex/LOD自动门 | 0/15 | 候选预算存在，自动检查缺失 |
| 目标设备视觉/音频/性能 | 0/15 | A0.1无绑定当前clean build的新证据 |
| 真人识别、归因、低动效与静音 | 0/15 | A0.1无有效样本 |

成熟度35分来自A0.2六类合法参考板，以及现有正式资产的来源/hash/自动预算。A0.2只提高视觉方向证据，不提高任何运行时资产的
`integrated`、设备、真人或Final状态；A0.3剪影真人门、LOD、目标设备、真人归因和Final继续 fail closed。

## 16. 当前依赖边界

- 当前P2/P5公开合同已通过既有候选自动化与本轮A2直接规格复核；生产默认Registry/Composition/入口仍不可达，浏览器/设备/性能/真人与正式媒体门未开放。美术不得创建第二套事件词表，也不得因机器合同闭合就声称生产冻结。
- A2.0升级为`preproduction-contract-machine-closed / baseline=92bafbd / hardGate=false`，并显式保留一项未提交直接规格修正。未来live表现只消费step六键完整包；终点、fall、排名、重生、供给、淘汰和结算只读其中事件、projection、ModeResult与既有供给能力，不读取内部hash/command/checkpoint，也不从坐标、动画或音频反推规则。
- 美术首要硬缺口是A0.3至少10名真实独立参与者与协调签核，当前`0/10`；clean-source机器包已就绪。A1.1已在`16861edc`重新得到92/100来源/测量方案机器候选，但`hardGatePassed=false`，装备/VFX/音频来源批准、捕获批准、代表样件、Blockout、集成、设备、真人和Final门均为false，不制作或接入角色、武器、地图、VFX、HUD或音频资产。
- 本轮新增A2.0机器账本、checker、隔离探针并同步A2合同、Art Bible与[A0–A7 对齐矩阵](arena-art-development-alignment-matrix.md)；不修改P2/P5生产源码、媒体或默认入口。若runtime候选撤回、step六键或source identity漂移，独立回滚上述A2机器包与文档状态，不覆盖共享开发工作树。
- P3 Map、P4 武器、P5 ViewModel、P6 Profile仍分别受自己的冻结、来源、预算、设备和真人门约束；A2静态绑定不会连带开放任何后续生产阶段。
- P5.3zzzwe/P6.408只修复20武器专属Validated Host对既有权威方向事实的最后一跳转发；方向仍来自V2 Authority Fact，VFX、音频和HUD不得从Three坐标、镜头、文案或当前装备重新推断。该修复不批准或新增任何美术/音频资产，运行、设备、真人与Final门继续为false。
- P5.3zzzwf/P6.409禁止20武器新表现代次在基线重播武器反馈；旧命中不能绕过专属读取计划生成通用音画。模式/供给通用基线与逐帧新武器事实路径不变，不批准任何新增资产。
- P5.3zzzwh/P6.413把生存徒手命中的既有V2方向/冲量送到通用Three与SFX末端，只复用当前形状/时序、方向层、镜头/角色冲击、Cue、SFX总线和dB力度档。旧端口保留回退；不新增或批准纹理、模型、粒子层、媒体、Cue、总线、透明叠加或draw call，A0.3真人门、A1.1协调/批准/样件门及生产资产门状态不变。
- P5.3zzzwi/P6.414只修复既有命中力度音频的双下限：voice priority与gain dB分别只升不降，重击击落可从-3 dB到既定-2 dB。媒体、Cue、变体、总线、8 voice、limiter和批准清单不变，实听及设备门仍未开放。
