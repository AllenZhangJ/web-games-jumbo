# Arena V2 A3–A6 正式资产生产准备队列候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：把当前正式 Presentation Catalog 的130项候选按依赖与美术职责分成稳定批次，让来源、Brief、预算和评审准备可以继续推进，同时不绕过A0.3、A1.1或逐资产生产批准。
- 明确不做：不创建、修改、加载、批准或发布资产，不签发资产使用权，不接默认Bundle、Preloader或Entry，不参与Gameplay Authority。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a3-a6.formal-asset-production-work-queue.candidate.v1`确定性只读队列 |
| 消费面 | 地图、单一敌人族、角色、武器附件、材质纹理、武器音频、五类反馈VFX、模式/供给音频的制作准备 |
| 权威来源 | 当前Formal Presentation Catalog、A3–A6 Readiness与逐资产生产批准证据账本；不读取比赛运行态 |
| 使用技能 | `game-art-director` |
| 强制参考 | `arena-art-and-audio-development-flow.md`、`arena-art-bible.md`、`arena-art-development-alignment-matrix.md`、`.agents/skills/game-art-director/SKILL.md` |
| 正式或研究 | 正式资产的生产准备候选；不是正式资产、Blockout批准或Final |
| 来源 revision / license / SHA | 全部继承当前Catalog与批准账本逐项身份，不复制或改写来源事实 |
| 目标设备与视口 | 仍为Web、微信、抖音及`390×844`/桌面目标；本批不生成设备证据 |
| reduced-motion / 静音 / 失败回退 | 保留既有静态形状、文本、低动效和静音合同；队列本身不播放媒体 |
| 预算影响 | 零资产字节；只绑定现有V1与V2候选预算身份，不批准结构上限或性能余量 |
| 验证命令与证据路径 | SF-A3A6P.1固定runner已执行15个直接Vitest文件；资产评审、构建、浏览器、设备、性能和真人证据仍顺延 |
| 回滚点 | 删除队列源码、公开导出、延期测试、治理标记和本文件即可；不影响Catalog、资产字节或运行时 |

`game-art-director`泛化技能引用的`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与模板仍未随当前安装提供。本批不创建占位，也不把缺失路径加入机器身份；项目自己的Art Bible、流程和对齐矩阵继续作为更具体真值。

## 九个稳定准备批次

| 优先级 | 批次 | 当前允许范围 |
|---:|---|---|
| 1 | A3 地图模型 | KZ路线可读性Brief、来源、结构预算和评审准备 |
| 2 | A3 生存单一敌人模型 | 单一敌人族轮廓、来源和评审准备 |
| 3 | A4 可玩角色模型 | 角色轮廓、18动作和来源评审准备 |
| 4 | A4 武器附件模型 | 20武器轮廓、持握、动作可读性和来源评审准备 |
| 5 | A4 正式材质纹理 | 共享材质、色彩空间、依赖和预算评审准备 |
| 6 | A4 武器命中音频 | 武器身份、因果和混音评审准备 |
| 7 | A4 武器阶段音频 | windup/release/recovery三阶段评审准备 |
| 8 | A5 五类核心反馈VFX纹理 | Shape–Timing–Color、低动效和来源评审准备 |
| 9 | A5 模式与供给音频 | 模式/供给因果、优先级和混音评审准备 |

队列按`phaseId + role`精确覆盖当前130项Catalog；同一资产只能出现一次。每个批次都绑定批准账本中的七类缺失证据槽，总计仍为910项缺失，不会因为进入队列而变成批准。

## 当前硬边界

当前只开放`contract-source-budget-and-review-preparation-only`：

1. A0.3当前source仍待重生成且真人盲测为`0/10`，所以生产Blockout批次为0。
2. A1.1仍待按当前source identity重建，所以生产Blockout批次为0。
3. 130/130逐资产生产批准均为`missing-not-approved`，所以Integration、Final和资产使用批次均为0。

首个可继续准备的批次是`a3-map-models`，这只表示文档、来源、结构预算和评审材料可以推进，不表示两张地图可进入Blockout或正常生产加载。

2026-08-14已为首批新增[A3地图生产评审准备候选V1](arena-v2-a3-map-production-review-preparation-candidate-v1.md)：它把现有2图20段的注册顺序、方向+跳跃输入、移动包络、节奏强度、分支/恢复、地标/引导线和竞速/生存读法组织为逐图八项评审包。该产物仍只属于准备范围，所有评审均为`not-run`，不会把注册顺序伪装成已验证Critical Path，也不修改地图资产、支撑几何或生产门。

第二批也已新增[A3生存敌人生产评审准备候选V1](arena-v2-a3-survival-enemy-production-review-preparation-candidate-v1.md)：它保持1个权威敌人族、1个视觉族和16个同族Slot，冻结十阶段`1→…→16`数量曲线、模型/纹理依赖、六扇区方向、19个动作语义及九项未运行评审。压力只能由数量、入口方向、疏密和权威stage标记表达；不会生成图片或资产，也不会新增敌种、碰撞体、技能轮廓或生产许可。

第三批已新增[A4六角色生产评审准备候选V1](arena-v2-a4-playable-character-production-review-preparation-candidate-v1.md)：它精确区分6个Gameplay Definition、6个Presentation身份和1个共享Rogue模型，冻结同一三概念输入、有限手感差异、六套选择姿态/七部件明暗Pattern、19动作语义与十项未运行评审。共享模型复用是降低制作复杂度的明确方案，但不会被写成六套独立模型或六个已批准角色资产；颜色也不能单独承担识别。

第四批已新增[A4二十武器附件生产评审准备候选V1](arena-v2-a4-weapon-attachment-production-review-preparation-candidate-v1.md)：它按收藏顺序一一绑定20武器、20附件、20轮廓族、地面/空中动作、右手持握、地面拾取和三阶段读法，并逐把保留Bounding Box/朝向/尺度/落地/截图的未运行状态。没有下载、转换或加载模型，也不从姿态推断命中、位移或时序。

第五批已新增[A4正式材质贴图生产评审准备候选V1](arena-v2-a4-formal-material-texture-production-review-preparation-candidate-v1.md)：它一一绑定3张1024² Albedo贴图、3个外部GLTF Image URI和圆盾/Rogue/Skeleton三个模型消费者，冻结sRGB、PBR兼容、六角色七部件明暗身份、单敌人材质身份、Neutral Key、两地图环境与16 MiB RGBA8候选包络。Catalog绑定和12,582,912 B估算都不等于运行材质或峰值内存证据；全部十项评审仍为`not-run`，生产与加载门继续关闭。

第六批已新增[A4武器命中音频生产评审准备候选V1](arena-v2-a4-weapon-impact-audio-production-review-preparation-candidate-v1.md)：它闭合20份武器命中音、1份徒手基础推击、40个地面/空中Action身份、4份来源intake与17份衍生候选，并冻结确定性三档播放率、SFX/Master/Limiter目标、8 Voice、优先级与静音回退。21份共125,974 B只表示Catalog编码事实；盲听、响度、削波、手机扬声器、拥塞与生命周期全部`not-run`，音频不会反推命中或击落。

第七批已新增[A4武器阶段音频生产评审准备候选V1](arena-v2-a4-weapon-phase-audio-production-review-preparation-candidate-v1.md)：它闭合20武器×`windup/release/recovery`共60份Asset/Cue，固定`ActionStarted + authority phase`因果、三阶段意图、Gain/Priority、确定性变化、8 Voice及恢复/静音水位。release只表示动作进入active，不等于命中；全部试听、波形、响度、遮蔽、恢复、设备和生命周期评审仍为`not-run`。

第八批已新增[A5核心反馈VFX生产评审准备候选V1](arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.md)：它闭合5张128²正式候选纹理、5类互斥结果语义、483个专用Cue与480个武器样式，固定Shape–Timing–Color、灰度优先、击落/移动坠落分离、`0/24/48/96`粒子档、`2x`平均过度绘制目标和64个活动身份。21,539 B编码与327,680 B RGBA8估算都不是GPU证据；不生成、加载或渲染纹理，不扩大运行预算，全部评审仍为`not-run`。

第九批已新增[A5模式与供给音频生产评审准备候选V1](arena-v2-a5-mode-and-supply-audio-production-review-preparation-candidate-v1.md)：它闭合13个模式Cue、4个供给Cue及17份未批准衍生候选，固定显式Authority Event/Supply Fact因果、模式终局优先、供给Voice优先级1、确定性播放率、8 Voice、64去重身份、SFX/Master/Limiter和静音恢复水位。17份共92,077 B只表示Catalog编码事实；不加载或播放音频，不改变Queue/混音/规则，全部评审仍为`not-run`。至此九批均有源码评审准备包，但不等于任何资产、Blockout、Integration或Final通过。

[A3–A6正式资产生产评审程序候选V1](arena-v2-a3-a6-formal-asset-production-review-program-candidate-v1.md)进一步将九批唯一映射为统一交接Owner：130项资产、910个证据缺口和95个评审单元逐批保留独立Preparation ID/Hash，并分别列出受阻期间可继续细化的源码输入与前置条件闭合后才能运行的真实评审。该程序`executesReviews=false`，不会批量授予批准或打开任何生产门。

[A3–A6生产评审证据提交候选V1](arena-v2-a3-a6-production-review-evidence-submission-candidate-v1.md)为后续集中验证补上逐资产纯数据入口：每份引用必须同时闭合Ledger/Queue/Program、Batch/Preparation、Asset path/SHA及七类Evidence Slot/Kind，陈旧或跨批次输入失败关闭。提交只形成确定性Evidence Identity并等待独立评估；即使观察结果为`pass`，账本槽仍为`missing`且生产批准仍为`missing-not-approved`。

[A3–A6生产评审证据独立评估候选V1](arena-v2-a3-a6-production-review-evidence-independent-evaluation-candidate-v1.md)补上第二段纯数据链：评估者必须不同于采集者，接受必须闭合Evidence SHA、内容结构、环境身份和采集`pass`，拒绝原因必须覆盖实际失败项。接受或拒绝都只产生Evaluation Identity，不读取字节、不写账本、不授予批准。

[A3–A6生产评审七槽接受证据集候选V1](arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.md)补上第三段：同一当前资产必须按规范顺序提供七个accepted Evaluation，且Asset/Batch/Preparation、Slot、Evidence与Evaluation身份全部闭合唯一。完整集合只得到`pending-not-decided`的独立生产批准决策资格，当前账本和批准仍不改变。

[A3–A6生产批准独立决策记录候选V1](arena-v2-a3-a6-production-approval-decision-record-candidate-v1.md)补上第四段：批准人不得兼任任何collector/reviewer，approved必须闭合来源权利、预算与依赖并绑定独立记录SHA。approved只允许进入未来新不可变账本组装，当前V1账本仍保持`missing-not-approved`和零资产使用许可。

## 静态自检与延期验证

源码在构造队列时会静态拒绝：空批次、重复assetId、Catalog/账本路径、字节或SHA漂移、伪造批准、伪造证据槽，以及未被九批精确覆盖的资产。公开对象包含Catalog、Readiness和批准账本身份hash，输出再生成独立队列hash。

SF-A3A6P.1固定runner已执行15个直接Vitest文件并闭合130项唯一覆盖、九批顺序、95评审单元、910缺失槽及全部生产门关闭。该自动化通过不改变候选`validationStatus=not-run`：95个真实评审、构建、资产脚本、浏览器、设备、性能和真人仍未执行。

复验入口固定为`npm run arena:a3-a6:production-preparation:test`；runner只枚举本队列、九批Preparation、Program和截至独立Decision的四段证据链，不包含不可变账本装配或P7 advance。
