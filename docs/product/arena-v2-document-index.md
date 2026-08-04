# Arena V2 新版本文档索引

## 文档状态

- 状态：执行中；以阶段门禁区分“研究、实现、自动化、性能、真机、发布”
- 日期：2026-08-02
- 适用范围：Arena 后续产品方向
- 重要说明：本文档组同时包含目标合同、研究证据和已实现批次；任何“完成”都必须以对应状态台账、当前代码和可复核证据为准，研究原型不得冒充生产实现。

## V2 方向摘要

Arena V2 的核心目标是：

> 3 分钟掌握基础操作，主要通过武器和地图形成持续学习，重度玩家用约 200 小时完成武器收藏和玩法研究。

已讨论确认的方向：

- 角色控制在 6 个左右，角色只提供有限的操作差异，不通过角色技能树制造主要复杂度。
- 武器是主要的对战深度来源；每件武器应该改变对战方式，而不是只改变伤害或数值。
- 地图是第二个主要深度来源；不同地图、地形和模式会改变武器价值。
- 首批模式为常规 1v1、竞速和单人生存 1vE；三者共用角色、武器和地图基础能力。
- 竞速使用 CS1.6 KZ 风格跳跃地图基座，2–4 名玩家比先到终点；地图板块不掉落，被攻击击落后 3 秒原处重生。
- 生存模式借用跳跃/竞速地图的地形基座，但本身不是竞速，不设置终点。
- 不做格挡系统、训练场、复杂外观收藏和复杂社交功能。
- CS 1.6 著名跳跃/KZ 地图用于学习地形结构和路线设计，不直接复制地图资产。
- 热血英豪用于深入学习武器的对战语法、位置关系、风险和反制，不直接复制武器名称、动作、数值或资产。
- 弹壳特攻队只作为局外信息架构和页面组织参考，不照搬其成长系统。

## P0–P7 当前总门快照

截至 2026-08-02，本表是阶段级导航，不替代各批次台账。`hardGate=false` 表示允许继续不依赖该门的审计或准备工作，但禁止把后续阶段声明为生产完成。

| 阶段 | 当前可证明状态 | 当前硬门 |
|---|---|---|
| P0 规则与文档唯一真值 | 核心产品、玩法、界面、迁移和治理合同已形成 | 当前共享工作树尚未形成最终干净 source identity，且全局冲突审计需随本批文档重跑；`hardGate=false` |
| P1 自动替换与10秒权威回收 | Rule/Core/Bot/Presentation read model 已实现；PA5 总批次冻结，PA6-P 以95/100独立签核，PA6 runner 正确性已签核 | PA6 正式 CPU ABBA 复验尚未在隔离环境通过，P1 不得 advance；`formalGate=false` |
| P2 竞速与生存正式 MatchCore | 竞速、生存、敌人压力和供给已有研究原型；P1 生存供给组合不是完整 Mode 实现 | 正式 Race/Survival Mode Definition、参与者/复活/结束语义与生产组合未实现；`hardGate=false` |
| P3 KZ 地图与单一敌人生产接入 | 路线、可达性、重入、多人拥挤与同类敌人已有研究证据 | 正式地图资产、生产地图注册和敌人生产接入未开始；`hardGate=false` |
| P4 首批武器逐把生产迁移 | 六件深研案例、数值矩阵、Replay 与迁移门禁已建立 | 当前生产晋级仍为0/6，逐把 Definition、动作、地图后果和反馈验收未开始；`hardGate=false` |
| P5 11页面、HUD与最终反馈 | 页面合同及部分 Product/Web 只读展示已接入并有浏览器证据 | 完整11页面、对局HUD、正式反馈、真机与真人验收未完成；`hardGate=false` |
| P6 收藏、熟练与200小时容量 | 收藏容量和下一目标已有研究模型/原型 | 正式 Profile schema、CAS/版本保护、结算写入、200小时经济与留存验证未实现；`hardGate=false` |
| P7 真人、真机、平衡与发布冻结 | 发布门禁与证据要求已规划 | A0.3真人剪影仍0/10，设备、平衡、soak、资产预算和发布证据未完成；`hardGate=false` |

## 初稿文档清单

| 文档 | 作用 | 当前状态 |
|---|---|---|
| [V2 产品总纲](arena-v2-product-brief.md) | 统一定位、目标用户、核心循环和非目标 | 初稿 |
| [V2 玩法框架](../gameplay/arena-v2-gameplay-framework.md) | 角色、操作、1v1、生存、地图和反馈的总规则 | 初稿 |
| [V2 武器设计与研究框架](../gameplay/arena-v2-weapon-design-framework.md) | 热血英豪研究方法、上下文动作、基础武器原型和武器卡模板 | 第二轮收敛 |
| [热血英豪武器研究综合与设计收敛 V1](../gameplay/arena-v2-hot-blooded-weapon-design-synthesis.md) | 将六件逐动作案例收敛为动作身份、承诺时间、空间条件、命中后果、失败成本、反制与反馈六项武器独立性门槛 | 研究综合已完成，生产迁移仍需独立门禁 |
| [武器价值链结构审计结果 V1](../research/arena-v2-weapon-value-chain-audit-results-v1.md) | 将六项武器独立性门槛变成可执行研究合同，并验证六件深研案例的完整性 | 六件结构审计通过，仍不等于生产就绪 |
| [武器概览与可读性浏览器任务验证结果 V2](../research/arena-v2-weapon-browser-task-validation-results-v2.md) | 在 390×844 浏览器视口复核 Product 数值方向、六件研究武器卡和 5 道可读性任务提交闭环 | 浏览器任务 5/5，通过但不代表真人或真机 |
| [V2 生存 1vE 规则](../gameplay/arena-v2-survival-mode.md) | 生存流程、敌人、20秒三实体供给、自动替换、10秒回收、掉落和结束条件 | P1供给Rule/Core/Bot/Presentation read model已实现并签核至PA6正确性；完整P2生存Mode仍未实现，正式性能门未通过 |
| [V2 生产化分阶段开发与治理计划](../architecture/arena-v2-production-development-plan.md) | 固定从规则收敛到发布冻结的阶段、执行标准、百分制评分、治理证据和禁止越级条件 | 执行基线 |
| [V2 P1 实施状态台账](../architecture/arena-v2-p1-implementation-ledger.md) | 记录 P1.1–P1.2c、正式 Bot pressure 与 PA/PP 架构批次的行为映射、评分、门禁证据、风险、回滚与未完成硬门 | PA6按ADR-115延期；PA7/PP非性能实现与三端包体开发门已关闭，等待最终治理、clean source freeze、性能/设备/真人外门；P1不得advance |
| [V2 P2 正式模式实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md) | 审计当前二人MatchCore缺口，冻结Mode/参与者/终局/重生/Replay迁移顺序、双开发零重叠写域和小/大门自检 | 只读设计预审候选；P1正式CPU门、clean source identity和线程回执未满足，P2实现未授权 |
| [Arena 美术与音频开发流程](../architecture/arena-art-and-audio-development-flow.md) | 将14个美术、3D、VFX、UI、地图、音乐和音频技能按产物分流，固定资产来源、表现事件、预算、真机和真人门禁 | Presentation / Platform 执行基线 |
| [Arena Art Bible](../architecture/arena-art-bible.md) | 固定低多边形玩具 × 手稿反馈的视觉宪法、语义色、材质灯光、角色/武器/KZ/HUD/VFX、资产与音频预算、来源治理和四门验收 | A0.1合同94/100且各维度≥80%，主协调已签核为`contract-ready`（2026-07-28）；不代表后续门通过 |
| [Arena 六类注释参考登记](../architecture/arena-art-reference-register.md) | 按mood/color/composition/character/environment/UI建立70/20/10登记，并固定A0.2实际板面、manifest、hash和签核规格 | 原A0.2.1、补充来源与A0.2.2板面小门均已签核；A0.2视觉方向总门ready |
| [A0.2.1 六类参考板来源与权利包](../architecture/arena-art-reference-source-pack-a0.2.1.md) | 为六板固定60条7/2/1输入、36个唯一合法嵌入视觉、24条link-only卡、角色模型渲染、六类UI职责样图、构图缩略预检、六张来源抽检页和离线复核 | 95/100且各维度≥80%，主协调已签核`source-ready`（2026-07-28）；抽检页不计A0.2.2，本小门不单独代表总门，当前A0.2 ready来自后续独立聚合 |
| [A0.2.1 武器与战斗反馈补充来源包](../architecture/arena-art-reference-source-supplement-a0.2.1.md) | 独立交付16个项目原创clean-room直接视觉、权利声明、hash/尺寸/构图与感知差异、事件映射及6类失败关闭证据 | 95/100且各维度≥80%，主协调于2026-07-28签核为`supplemental-source-ready`；不改写原A0.2.1签核事实，不代表生产样件通过 |
| [A0.2.2 六张正式参考板与自审](../architecture/arena-art-reference-boards-a0.2.2.md) | 交付六张2560×1440 SVG+PNG，60条7/2/1注释、40嵌入/20 link-only、武器/反馈各8个直接视觉、裁切/hash、10%与移动证据及失败关闭检查 | 94/100且各维度≥80%，主协调于2026-07-28签核为`board-ready`；两核心板仍为方向合同而非模型/VFX样件，当前A0.2 ready来自后续独立聚合，Blockout/A0.3/设备/真人/Final不随之通过 |
| [A0.2 视觉方向聚合总门](../architecture/arena-art-reference-total-gate-a0.2.md) | 独立复算三个子门的来源身份、权利、hash、板面使用、7/2/1、签核和下游false边界，并提供10类失败关闭 | 96/100且各维度≥80%，A0.2与Reference Board视觉方向`ready`；A0.3、Blockout和所有资产成熟度仍incomplete/fail closed |
| [A0.3 剪影工具与盲测候选基线](../architecture/arena-art-silhouette-a0.3.md) | 固定两正式角色×赤手/圆盾×六方向×0/5/12m×双视口渲染、匿名题包、代理混淆矩阵/距离分层、评分与15类失败关闭 | 技术/代理候选85/100；离屏0且代理分层≥90%，但真人0/10，A0.3仍incomplete且Blockout禁止 |
| [A0.3 真人剪影盲测最小执行包](../architecture/arena-art-silhouette-human-test-a0.3.md) | 10份离线参与者页面、144题全覆盖、匿名原始JSON、intake hash台账、混淆矩阵/距离/视口评分，以及包级14项、intake 12项、评分器15项失败关闭与正向候选探针 | `ready-for-external-human-input`；真人仍0/10，自动评分和主协调签核前A0.3/Blockout/Final保持关闭 |
| [A1.0 供给表现预生产合同](../architecture/arena-art-supply-presentation-contract-a1.0.md) | 审计P1.1/P1.2供给事件与599/600/601，精确区分strict/普通shape，以最多3项active身份、64项hash ring、3个pending pair和Replay epoch约束旁路、去重、恢复与销毁，并固定25项运行时夹具计划 | 2026-07-28历史`dd786a9`合同以94/100签核；2026-08-02当前源码复验因15个绑定来源中10个漂移而红，当前`stale-upstream-evidence / hardGatePassed=false`。必须在最终source重建；runtime adapter、代表样件、A0.3真人、A1/Blockout/正式VFX音频/设备/Final全部关闭 |
| [A1.1 代表样件来源与测量就绪包](../architecture/arena-art-supply-readiness-a1.1.md) | 历史包绑定`f80307b`的schema v2只读active lifecycle projection合同，并审计正式圆盾、诊断剪影、研究线框与Kenney音频权利边界；无字节VFX保持research-candidate，固定桌面1440×900、390×844、30 FPS、GPU/overdraw/内存/voice/暂停恢复/双destroy测量方案 | 当前`stale-upstream-evidence / hardGatePassed=false`：2026-08-02机器复验因MatchCore与两个Bot artifact漂移而红；92/100只作历史。A0.3仍0/10，最终source identity重建、供给图标、capture harness、批准浏览器/GPU、真iOS/Android、正式VFX/音频和实测仍缺，代表样件与全部下游禁止 |
| [美术 A0–A7 与开发 P0–P7 对齐矩阵](../architecture/arena-art-development-alignment-matrix.md) | 将A0拆为合同、实际参考板、剪影盲测三门，并固定A1–A7输入、依赖、评分、硬门和返工范围 | A0.1 `contract-ready`，A0.2视觉方向总门`ready`；A0.3技术/代理候选85/100但真人缺失；A2.0已补ADR-112事件/Cue只读预审，仍`planned / hardGate=false` |
| [ADR-109：Arena 美术与音频工作统一走14技能路由和资产门禁](../decisions/109-arena-art-and-audio-skill-routing.md) | 固化技能安装、使用范围、项目规则优先级、AI/下载素材边界和回滚处理 | 已接受 |
| [V2 成长与 200 小时目标](../gameplay/arena-v2-progression-200-hours.md) | 收藏、熟悉、重复游玩和奖励边界 | 初稿 |
| [V2 界面地图](arena-v2-screen-map.md) | 明确 11 个局外页面入口、对局 HUD 和竞技准备模板复用 | 页面合同已收敛，真机待验证 |
| [V2 架构影响与迁移边界](../architecture/arena-v2-migration-boundary.md) | 说明哪些可以复用、哪些需要重构 | 初稿 |
| [V2 搜索与验证清单](../research/arena-v2-research-backlog.md) | 管理后续搜索、原型和实测问题 | 第二轮收敛 |
| [热血英豪武器研究 V1](../research/arena-v2-hot-blooded-weapon-study-v1.md) | 记录官方案例、蓄力/取消/方向/持续威胁证据、上下文动作矩阵、风险语义和完整数值展示要求；魔血镰刃、白金双枪、血影钩刃、幻虎巨拳与真·哈迪斯钩镰已连接研究投影 | 逐件研究持续收敛 |
| `arena-v2-weapon-magic-blood-scythe-case-study.ts` | 魔血镰刃逐动作官方事实、设计推导、玩家反制、失败成本和数值审计 | 第四轮逐件研究证据，仅研究工具链 |
| `arena-v2-weapon-magic-blood-scythe-definition-prototype.ts` | 魔血镰刃地面/空中 Definition、9 项主轴、6 项上下文轴、2 项行为轴和独立延迟危险区研究假设 | 数值投影假设，仅研究工具链 |
| `arena-v2-weapon-magic-blood-scythe-replay-prototype.ts` | 魔血镰刃安全命中、active 前离开攻击线和平台边缘三组真实 MatchCore/MatchReplay，并输出命中/未命中/击落反馈 | 路线 Replay 通过，仅研究工具链 |
| `arena-v2-weapon-case-study-contract.ts` | 逐件武器研究共享合同：动作事实、推导、反制、失败成本和公共数值轴审计 | 逐件研究基础设施，仅研究工具链 |
| `arena-v2-weapon-true-hades-hook-scythe-case-study.ts` | 真·哈迪斯钩镰逐动作官方事实、支撑面/阶段命中推导、反制和数值审计 | 第五轮逐件研究证据，仅研究工具链 |
| `arena-v2-weapon-white-platinum-dual-guns-case-study.ts` | 白金双枪逐动作官方事实、距离/覆盖/高度差推导、反制和数值审计 | 第六轮逐件研究证据，仅研究工具链 |
| `arena-v2-weapon-white-platinum-dual-guns-definition-prototype.ts` | 白金双枪独立地面点射/空中斜线 Definition、公开数值轴和攻击线/落点研究信号 | 独立研究 Definition，仅研究工具链 |
| `arena-v2-weapon-white-platinum-dual-guns-replay-prototype.ts` | 白金双枪地面点射留在线内命中、离开攻击线挥空的真实 MatchCore/MatchReplay | 专属 Replay 通过，仅研究工具链 |
| `arena-v2-weapon-blood-shadow-hook-blade-case-study.ts` | 血影钩刃逐动作官方事实、拉位/障碍/目标朝向推导、反制和数值审计 | 第七轮逐件研究证据，仅研究工具链 |
| `arena-v2-weapon-phantom-tiger-fist-case-study.ts` | 幻虎巨拳逐动作官方事实、蓄力承诺/取消/方向、反制和数值审计 | 第八轮逐件研究证据，仅研究工具链 |
| `arena-v2-weapon-mammoth-stone-axe-case-study.ts` | 猛犸石斧逐动作官方事实、延迟落点、蓄力覆盖、滚动物体、墙面反弹和公共危险研究 | 第九轮逐件研究证据，仅研究工具链 |
| `arena-v2-weapon-phantom-tiger-fist-definition-prototype.ts` | 幻虎巨拳地面/空中 Definition、9 项主轴、6 项上下文轴、2 项行为轴及权威数值投影 | 数值投影假设，仅研究工具链 |
| `arena-v2-weapon-phantom-tiger-fist-replay-prototype.ts` | 幻虎巨拳提前释放、成功提交、到期取消三组固定 Replay，并暴露承诺状态和位置采样 | 承诺 Replay 通过，仅研究工具链 |
| `arena-v2-weapon-phantom-tiger-fist-edge-replay-prototype.ts` | 幻虎巨拳双人平台边缘 Replay，验证命中、位移、支撑面丢失和淘汰反馈 | 地图后果通过，仅研究工具链 |
| `arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.ts` | 血影钩刃地面/空中 Definition、目标背向/高度参数、9 项主轴、6 项上下文轴和 2 项行为轴的权威投影 | 数值投影假设，仅研究工具链 |
| `arena-v2-weapon-blood-shadow-hook-blade-replay-prototype.ts` | 血影钩刃目标保持背向、主动转身、active 前转回三组真实 MatchCore/MatchReplay，并输出拉近/躲避反馈 | 目标朝向 Replay 通过，仅研究工具链 |
| `arena-v2-weapon-true-hades-hook-scythe-definition-prototype.ts` | 真·哈迪斯钩镰地面承诺/空中下砸 Definition、9 项主轴、6 项上下文轴和 2 项行为轴的权威投影 | 数值投影假设，仅研究工具链 |
| `arena-v2-weapon-true-hades-hook-scythe-replay-prototype.ts` | 真·哈迪斯钩镰提前释放、提交释放、到期取消和平台边缘四组真实 MatchCore/MatchReplay，并输出承诺与支撑面反馈 | 承诺/地图后果 Replay 通过，仅研究工具链 |
| `arena-v2-weapon-case-study-overview-prototype.ts` | 将六件逐动作深研案例投影为核心动词、主战斗语言、关键数值轴、上下文、公共轴状态、三步学习路径、地图信号和反制读出；六件均已连接研究 Definition 地面/空中数值投影，复杂行为仍保持独立研究边界 | 深研概览适配层，仅研究工具链 |
| `arena-v2-weapon-case-study-language.ts` | 为六件深研案例绑定封路、换位、直线压制、绕后、读招反制或延迟重击，并复用统一关键数值轴、地图空间和反制合同 | 主战斗语言研究合同，仅研究工具链 |
| `arena-v2-weapon-mammoth-stone-axe-delay-prototype.ts` | 以整数 tick 验证猛犸石斧延迟落点的预警、路线躲避、高度躲避和命中反馈因果 | 第九轮延迟落点研究原型，仅研究工具链 |
| `arena-v2-weapon-hook-obstruction-prototype.ts` | 以固定二维几何验证无遮挡、柱体阻挡、侧向错开和边角路线的拉位差异 | 血影钩刃障碍研究原型，仅研究工具链 |
| [血影钩刃障碍阻挡原型结果 V1](../research/arena-v2-weapon-hook-obstruction-prototype-results-v1.md) | 记录拉位阻挡探针的固定场景、结果和未完成边界 | 障碍研究证据 |
| `arena-v2-kz-map-definition-prototype.ts` | 将六段 KZ 路线、10 个静态 surface、4 个起点和 6 个段落装备锚点编译为研究 MapDefinition，竞速/生存共享几何 | MapDefinition 研究原型，仅研究工具链 |
| `arena-v2-weapon-research-catalog.ts` | 12 件参考武器的结构化研究卡，仅供开发/测试工具链使用 | 研究证据 |
| `arena-v2-weapon-official-evidence.ts` | 10 组官方招式证据的信号与逐动作上下文、命中结果、地图意义和失败成本，仅供开发/测试工具链使用 | 第四轮至第九轮研究证据 |
| `arena-v2-weapon-commitment-prototype.ts` | 用整数 tick 验证读招反制与延迟重击的提前取消、承诺释放、到期取消和蓄力转向，仅供开发/测试工具链使用 | 第四轮武器状态原型证据 |
| `arena-v2-weapon-function-language.ts` | 将 12 件参考武器归并为 7 种参考战斗语言，并补齐生产基线“推离”语言，绑定数值轴、反制、地图空间和模式候选 | 研究证据 |
| [武器最小功能版本合同 V1](../research/arena-v2-weapon-minimum-version-contract-v1.md) | 将 8 种战斗语言结构化为单一基础输入、地面/空中上下文、命中结果、地图关系、失败成本和反制，并投影回研究卡与生产武器 | 第四轮研究合同 |
| [ADR-064：武器必须先通过最小功能版本合同](../decisions/064-arena-v2-weapon-minimum-version-contract.md) | 固化研究卡到后续武器 Definition 之间的中间评审边界 | 研究合同已接入 |
| [ADR-065：生产武器必须显式映射到最小战斗语言](../decisions/065-arena-v2-production-weapon-language-mapping.md) | 固化重锤、锁链、冲锋盾与最小战斗语言及地面/空中动作的显式映射 | 生产基线审计已接入 |
| [V2 首发武器候选合同 V1](../research/arena-v2-weapon-launch-candidate-contract-v1.md) | 将 8 种语言收敛为 6 个首发功能位置，区分生产基线、研究候选和延后语言 | 候选集合已收敛 |
| [ADR-066：首发武器候选按六种战斗语言收敛](../decisions/066-arena-v2-weapon-launch-candidate-selection.md) | 固化三把生产基线、三把研究候选、六种公开可比较语言和两种延后语言 | 候选筛选已接入 |
| [V2 武器 Definition 迁移审计 V1](../research/arena-v2-weapon-definition-migration-audit-v1.md) | 对照当前权威调优审计 11 个公开数值轴，并列出三个研究候选的 Definition 结构缺口 | 审计完成，迁移未开始 |
| [V2 武器候选 Content Registry 结果 V1](../research/arena-v2-weapon-candidate-content-registry-results-v1.md) | 将五种候选武器的 Action/Equipment Definition 抽到内容层，提供显式候选 Registry，同时保持默认生产目录不变 | 候选内容层已接入，生产未晋级 |
| [ADR-067：武器概览数值必须从权威 Definition 投影](../decisions/067-arena-v2-weapon-definition-migration-boundary.md) | 固化权威字段、派生数值、地面/空中上下文与表现层的单向投影边界 | 迁移边界已接入 |
| [直线压制 Definition 原型结果 V1](../research/arena-v2-line-pressure-definition-prototype-results-v1.md) | 将直线压制编译为内容层候选地面/空中 Definition，并绑定 11 个数值轴与等待/离线回应证据 | 候选内容层已接入 |
| [ADR-068：直线压制先以单一攻击线 Definition 验证](../decisions/068-arena-v2-line-pressure-definition-boundary.md) | 固化直线压制的单一攻击线、固定间隔、公开数值和候选 Registry/默认生产边界 | 原型边界已接入 |
| [首发研究候选 Definition 原型结果 V1](../research/arena-v2-launch-research-definition-prototype-results-v1.md) | 将直线压制、读招反制、绕后三个首发候选统一为地面/空中 Definition，并绑定 9 项主概览数值、2 项行为数值和命中/空放证据 | 候选 Definition 已通过，默认生产未晋级 |
| [研究武器概览比较矩阵原型结果 V1](../research/arena-v2-weapon-research-overview-prototype-results-v1.md) | 将三个候选 Registry 候选投影为带标签、单位、方向语义、玩家含义、地面/空中双上下文、地图用途和反制的可比较武器卡数据 | 双上下文矩阵通过，真人可读性待验证 |
| [深研武器概览适配层原型结果 V1](../research/arena-v2-weapon-case-study-overview-prototype-results-v1.md) | 将六件逐动作深研案例的研究结论、主战斗语言、关键数值轴、三步学习路径与公共数值轴审计接到同一份读出，六件均有独立研究投影与专属 Replay，复杂行为仍独立管理 | 研究读出、语言绑定与学习路径通过，未进入生产 UI |
| [白金双枪 Definition 与攻击线 Replay 原型结果 V1](../research/arena-v2-weapon-white-platinum-dual-guns-definition-and-replay-results-v1.md) | 记录白金双枪从独立 Definition 到攻击线命中/挥空 Replay 的证据和未完成边界 | 独立逐件研究通过，未进入生产 UI |
| [血影钩刃 Definition 与目标朝向 Replay 原型结果 V1](../research/arena-v2-weapon-blood-shadow-hook-blade-definition-and-replay-results-v1.md) | 将血影钩刃最小地面/空中动作接入 Definition → 数值投影 → Replay，验证目标朝向、拉近结果和命中/躲避反馈；障碍仍由独立探针负责 | 研究 Definition/Replay 通过，未进入生产 UI |
| [真·哈迪斯钩镰 Definition 与承诺/支撑面 Replay 原型结果 V1](../research/arena-v2-weapon-true-hades-hook-scythe-definition-and-replay-results-v1.md) | 将真·哈迪斯钩镰地面/空中动作接入 Definition → 数值投影 → Replay，验证承诺取消、提交命中、支撑面保留和边缘击落 | 研究 Definition/Replay 通过，未进入生产 UI |
| [魔血镰刃 Definition 与路线 Replay 原型结果 V1](../research/arena-v2-weapon-magic-blood-scythe-definition-and-replay-results-v1.md) | 将魔血镰刃地面/空中动作接入 Definition → 数值投影 → Replay，验证宽覆盖、路线躲避、命中位移和平台边缘击落；延迟危险区保持独立研究信号 | 研究 Definition/Replay 通过，未进入生产 UI |
| [猛犸石斧 Definition 与预判落点 Replay 原型结果 V1](../research/arena-v2-weapon-mammoth-stone-axe-definition-and-replay-results-v1.md) | 将猛犸石斧地面/空中动作接入 Definition → 数值投影 → Replay，验证长前摇、路线躲避、重击位移和平台边缘击落；滚动/墙反弹/公共危险保持独立研究边界 | 研究 Definition/Replay 通过，未进入生产 UI |
| [幻虎巨拳 Definition 数值投影原型结果 V1](../research/arena-v2-weapon-phantom-tiger-fist-definition-prototype-results-v1.md) | 将幻虎巨拳最小地面/空中动作接入 Definition → 数值投影 → 概览链路，显示主轴、上下文轴和行为轴 | 投影假设通过，未进入生产 UI |
| [幻虎巨拳 Replay 与地图边缘原型结果 V1](../research/arena-v2-weapon-phantom-tiger-fist-replay-and-edge-results-v1.md) | 使用真实 MatchCore/MatchReplay 验证承诺取消、提交、命中，以及边缘平台的位移、失去支撑面和淘汰反馈 | 研究 Replay 与地图后果通过，未进入生产化 |
| [猛犸石斧逐动作研究结果 V1](../research/arena-v2-weapon-mammoth-stone-axe-case-study-results-v1.md) | 将官方延迟落斧、蓄力分支、滚动物体、墙面反弹、公共危险和恢复物拆为六个研究动作单元 | 第九轮逐件研究，延迟/预警仍待原型 |
| [猛犸石斧延迟落点原型结果 V1](../research/arena-v2-weapon-mammoth-stone-axe-delay-prototype-results-v1.md) | 验证预警、有效窗口、路线躲避、高度躲避和三类反馈因果；研究假设不进入生产 Definition | 延迟落点研究证据 |
| [武器延迟/预警信号原型结果 V1](../research/arena-v2-weapon-warning-signal-prototype-results-v1.md) | 直接读取魔血镰刃与猛犸石斧 `warningHypothesis`，统一验证停留、提前离开、到点离开和改变高度四类回应 | 8 个研究探针通过，仍未进入生产运行时 |
| [武器持续封路原型结果 V1](../research/arena-v2-weapon-persistent-zone-prototype-results-v1.md) | 将预警区扩展为 `telegraph → active → lingering → expired`，对照魔血镰刃持续占位与猛犸石斧瞬时延迟重击 | 6 个研究探针通过，持续区叠加/多人/真人仍待验证 |
| [ADR-082：延迟落点先以预警区和整数 tick 验证](../decisions/082-arena-v2-mammoth-stone-axe-delay-boundary.md) | 固化延迟/预警的研究边界，避免将官方时间和复杂公共危险直接迁移到生产规则 | 研究边界已接入 |
| [ADR-070：六个首发位置统一使用 Definition 数值投影](../decisions/070-arena-v2-research-launch-definition-projection.md) | 固化生产基线与候选 Registry 共用可比较数值结构，同时保留候选 Registry 与默认生产目录边界 | 研究投影边界已接入 |
| [ADR-069：命中反馈必须保留失败原因的因果区分](../decisions/069-arena-v2-hit-feedback-causal-contract.md) | 固化命中确认、支撑面转移、击落、避开攻击线和路线失误五种反馈语义 | KZ 无渲染反馈合同已接入 |
| [ADR-071：武器反馈先映射为表现事件，再绑定声音与特效](../decisions/071-arena-v2-feedback-presentation-event-mapping.md) | 将五种因果反馈映射为可去重的 `WeaponFeedbackPresented` 事件，表现层只选择 Cue 不重新判定 | Presentation 事件映射已接入，真机表现待验证 |
| [ADR-073：Arena V2 以 11 个信息入口和一个共享竞技准备模板收敛界面](../decisions/073-arena-v2-ui-eleven-page-contract.md) | 固定 11 个局外入口，明确加载页、竞技准备模板复用和生存准备独立边界 | 页面合同已接入无渲染原型 |
| [ADR-072：正式武器反馈事件接入 Three 灰盒表现](../decisions/072-arena-v2-feedback-presentation-three-consumption.md) | 将五种反馈 Cue 接入灰盒冲击/警告效果、镜头、震动、HUD 因果提示和现有音频入口，不在表现层重新判定 | 灰盒表现链已接入，最终资产与真机待验证 |
| [命中反馈因果研究工作台结果 V1](../research/arena-v2-weapon-feedback-study-results-v1.md) | 使用 90 个真实 KZ 探针选取五类代表反馈，投影为视觉/音频 Cue，并提供因果判断、JSON 导出和短时 HUD 消费 | 研究页与 HUD 已接入，真人/真机/多人/最终资产仍待验证 |
| [命中反馈候选资产合同结果 V1](../research/arena-v2-weapon-feedback-asset-candidate-contract-results-v1.md) | 为五类反馈固定候选视觉、音频和低动效资产 ID，并将最终资产、设备与真人验收保留为阻塞 | 候选合同已接入，未绑定正式资产 |
| `weapon-feedback-study.ts` / `feedback.html` | 独立展示命中确认、支撑面转移、击落、攻击被避开和路线失误五类反馈阅读任务，不进入生产构建 | 命中反馈研究页，仅研究工具链 |
| [首发武器生产迁移门禁结果 V1](../research/arena-v2-weapon-production-migration-gate-results-v1.md) | 将六个候选拆为默认生产 Definition/注册、动作状态、Replay、地图后果和反馈表现五项独立证据 | 门禁已接入，当前 0/6 晋级 |
| [ADR-074：首发武器必须通过五项生产迁移门禁](../decisions/074-arena-v2-weapon-production-migration-gate.md) | 固化研究原型与生产迁移的分层边界，不以综合评分替代缺失证据 | 门禁已接入 |
| `arena-v2-weapon-launch-replay-prototype.ts` | 使用真实 MatchCore、ActionExecutionSystem 和 MatchReplay 验证直线压制候选的正式动作状态与固定回放 | 直线压制研究证据已接入，仍未生产化 |
| [读招反制承诺状态与 Replay 原型结果 V1](../research/arena-v2-weapon-read-punish-replay-results-v1.md) | 使用真实 MatchCore、ActionExecutionSystem 和 MatchReplay 验证提前取消、成功提交、到期取消、蓄力等级和可转向结果 | 读招反制研究证据已接入，仍未生产化 |
| [ADR-075：承诺动作由统一 ActionExecutionSystem 裁决](../decisions/075-arena-v2-action-commitment-state.md) | 固化承诺字段、active 前结算、取消/提交语义和快照/事件边界 | 研究动作状态已接入 |
| [ADR-081：幻虎巨拳必须同时通过承诺 Replay 与地图后果验证](../decisions/081-arena-v2-phantom-tiger-fist-replay-and-map-consequence.md) | 固化幻虎巨拳从承诺、命中到失去支撑面和淘汰的独立证据链 | 研究候选门禁已补齐，仍未生产化 |
| `arena-v2-weapon-read-punish-replay-prototype.ts` | 为读招反制生成提前释放、成功提交、到期持续按住三组固定 Replay | 三组研究 Replay 通过，仍未生产化 |
| [绕后目标主动转身 Replay 原型结果 V1](../research/arena-v2-weapon-flank-replay-results-v1.md) | 使用真实 MatchCore、普通移动输入和 MatchReplay 验证保持背向命中、主动转身避开、侧向进入后命中 | 绕后研究证据已接入，仍未生产化 |
| `arena-v2-weapon-flank-replay-prototype.ts` | 为绕后生成保持背向、目标主动转身、多次转身和侧向进入四组固定 Replay | 四组研究 Replay 通过，仍未生产化 |
| [研究武器双人拥挤与地图边缘 Replay 结果 V1](../research/arena-v2-weapon-multiplayer-edge-replay-results-v1.md) | 使用真实双人 MatchCore 验证三类研究候选同时出招、窄平台击退、击落和真实反馈来源映射 | 三个研究候选反馈来源已通过，仍未生产化 |
| `arena-v2-weapon-multiplayer-edge-replay-prototype.ts` | 为直线压制、读招反制、绕后生成双方同时出招的边缘平台 Replay，并输出命中/击落/反馈语义 | 双人边缘研究证据 |
| [ADR-076：多目标遮挡先固化观察证据，不扩张双人权威边界](../decisions/076-arena-v2-multi-target-visibility-feedback-boundary.md) | 固化多目标遮挡研究探针、目标/深度反馈语义与当前双人 MatchCore 边界 | 15 个研究结果通过，三人/网络多人仍未完成 |
| [武器多目标视线遮挡研究原型结果 V1](../research/arena-v2-weapon-occlusion-research-prototype-results-v1.md) | 使用 5 个候选地面 Definition 的真实 targeting 参数验证近目标遮挡远目标和侧向进入的观察负担 | 15 个研究结果通过，三人/网络多人仍未完成 |
| [ADR-102：命中反馈先用真实因果探针做独立阅读研究](../decisions/102-arena-v2-weapon-feedback-study-boundary.md) | 固化五类反馈的真实探针、Presentation Cue 和玩家判断任务边界，禁止研究页答案直接成为生产结论 | 研究工作台已接入，真人/真机/多人仍待验证 |
| [ADR-105：命中反馈先固定候选资产合同，再绑定最终资产](../decisions/105-arena-v2-weapon-feedback-asset-candidate-contract.md) | 固定五类反馈的视觉、音频和低动效候选身份，并保留正式资产、设备与真人门禁 | 候选合同已接入，审计仍为 blocked |
| [武器攻击/跳跃穿插 Replay 原型结果 V1](../research/arena-v2-weapon-attack-jump-interleave-replay-results-v1.md) | 使用真实 MatchCore 验证同 tick 攻击与跳跃独立通道，以及空中切换武器专属下砸动作 | 三个研究候选穿插证据已通过，仍未生产化 |
| `arena-v2-weapon-attack-jump-interleave-replay-prototype.ts` | 为三个研究候选生成同 tick 独立通道与空中武器动作 Replay，并验证 `begin-down-smash` 状态效果 | 攻击/跳跃穿插研究证据 |
| [武器战斗语言最小原型结果 V1](../research/arena-v2-weapon-language-prototype-results-v1.md) | 记录直线压制、封路、延迟重击、读招反制和绕后的 Rule/Targeting/Effect 最小验证与回应时间 | 扩展武器原型证据 |
| [武器战斗语言 × KZ 地图后果原型结果 V1](../research/arena-v2-weapon-language-kz-consequence-results-v1.md) | 记录五种战斗语言在六段 KZ 表面上的击落、路线转移、前摇、有效窗口和固定回应后果 | 扩展武器×地图原型证据 |
| `arena-v2-warning-zone-prototype.ts` | 验证封路候选的公开标记位置、整数 tick 生命周期、可选持续阶段和到期，不实现持续伤害或新操作 | 第四轮武器状态原型证据 |
| `arena-v2-weapon-persistent-zone-prototype.ts` | 对照持续封路与瞬时延迟重击，验证有效窗口后的区域占位和重新进入反馈 | 研究工具链，6 个固定探针通过 |
| [武器上下文无渲染原型结果 V1](../research/arena-v2-weapon-prototype-results-v1.md) | 记录三把武器地面/空中命中节奏、击飞差异和挥空边界 | 第一轮原型证据 |
| [武器地图边缘原型结果 V1](../research/arena-v2-weapon-map-prototype-results-v1.md) | 记录规则命中进入轻量物理后在宽平台、窄路和边缘的实际后果 | 第一轮地图交互证据 |
| [武器移动目标原型结果 V1](../research/arena-v2-weapon-moving-target-prototype-results-v1.md) | 记录固定侧移目标下前摇差异如何转化为命中/挥空 | 第一轮移动反制证据 |
| [武器攻击者失位与双人争夺原型结果 V1](../research/arena-v2-weapon-contest-prototype-results-v1.md) | 记录自身位移、空中命中和双人同时出招的规则后果 | 第一轮对战拥挤证据 |
| [CS1.6 KZ 跳跃地图研究 V1](../research/arena-v2-cs16-kz-map-study-v1.md) | 记录地图段落、六维难度轴、段落合同、研究 MapDefinition、灰盒可达性和竞速/生存复用边界 | 第二轮研究 + MapDefinition 灰盒原型 |
| [ADR-063：KZ 地图段落必须声明回应窗口与恢复关系](../decisions/063-arena-v2-kz-route-response-contract.md) | 固化段落可用回应、固定探针窗口和命中后恢复关系，避免地图只用宽度与难度描述 | KZ 灰盒合同已接入 |
| [ADR-087：CS1.6 KZ 路线先接入研究 MapDefinition，再进入生产地图](../decisions/087-arena-v2-kz-map-definition-research-boundary.md) | 固化六段路线、4 个起点、竞速/生存共用几何和研究/生产地图边界 | 研究 MapDefinition 已接入，真人/真机仍待验证 |
| `arena-v2-kz-map-research-catalog.ts` | 六类代表 KZ 地图样本的来源事实、学习点、设计信号和不复制边界，仅供开发/测试工具链使用 | 研究证据 |
| `arena-v2-kz-route-combat-prototype.ts` | 将六段 KZ 灰盒与同一套武器命中/冲量/移动回应/复活重入规则组合，验证段落宽度、相邻恢复表面、侧移、跳跃和 3 秒复活锚点对武器击飞后果的影响，仅供开发/测试工具链使用 | 第三轮地图×武器原型证据，单人复活重入已验证 |
| `arena-v2-kz-route-choice-return-prototype.ts` | 为迷宫/走钢丝选择段声明快/安全分叉、路线 tick、战斗暴露窗口和复活后的段落/锚点重入标签，仅供开发/测试工具链使用 | 4 个分叉场景通过，独立灰盒已验证，生产几何仍待验证 |
| [KZ 分叉路线与复活重入观察原型结果 V1](../research/arena-v2-kz-route-choice-reentry-results-v1.md) | 记录四个分叉场景的速度/暴露交换、180 tick 复活等待和重入后路线词汇保持 | 研究观察合同通过，真机/真人仍待验证 |
| `arena-v2-kz-branch-greybox-prototype.ts` | 将四条研究分叉 waypoints 转为独立 surface，使用真实 PhysicsWorld + MovementSystem 测量完成 tick、空中持续和最终支撑面，并提供分叉灰盒 surface 集合，仅供开发/测试工具链使用 | 四条分叉均完成，快/安全时间交换已出现，摄像机已完成几何观察，武器/多人仍待扩展 |
| [KZ 分叉路线独立灰盒结果 V1](../research/arena-v2-kz-branch-greybox-results-v1.md) | 记录 5/7/8/5 个独立 surface 与 76/151/154/81 个实测完成 tick，并区分计划值与物理实测值 | 研究灰盒物理通过，生产地图仍未接入 |
| `arena-v2-kz-branch-camera-observation-prototype.ts` | 用正交视锥数学检查选择/重入时两条分叉的前两个路线点是否同时进入移动端纵向/横向观察窗口，仅供开发/测试工具链使用 | 8 个观察场景通过，走钢丝纵向余量仅 0.066，真实画布仍待验证 |
| [KZ 分叉路线镜头观察结果 V1](../research/arena-v2-kz-branch-camera-observation-results-v1.md) | 记录 390×844 与 844×390 视口的世界范围、最小余量和选择/重入可见性边界 | 几何观察合同通过，Renderer/真人理解仍待验证 |
| `arena-v2-kz-branch-weapon-consequence-prototype.ts` | 将五种武器战斗语言和三种固定回应接入四条独立分叉 surface，输出命中、击落、支撑面转移、路线失误和反馈因果 | 60 个 Rule/Action/Physics 探针通过，分叉已产生不同武器后果，攻击点/多人/真人仍待扩展 |
| `kz-map-study.html` / `src/entry/kz-map-study.ts` | 独立 KZ 路线 Canvas 研究页，切换竞速/生存、快线/恢复线、段落和入口/转折/出口攻击点，并分栏显示来源事实与 Arena 迁移结论 | 真实 Canvas 已通过 1280×720 与 390×844 本地浏览器验证，2–4 人/真人/生产地图仍待验证 |
| [KZ 分叉路线 × 武器后果原型结果 V1](../research/arena-v2-kz-branch-weapon-consequence-results-v1.md) | 记录四条分叉入口/转折/出口的表面宽深、命中、击落、转移、路线失误和空放差异 | 180 个研究探针已接入，未进入生产平衡 |
| `arena-v2-kz-multiplayer-crowding-prototype.ts` | 使用同一 Rule/Targeting/Physics 链路在四条分叉中段运行 2/3/4 人拥挤与五种武器语言，输出容量压力、多目标命中、逐目标反馈和 180 tick 重入合同 | 60 个研究探针通过，竞速胜负、网络多人、目标身份 Cue 和真人仍待验证 |
| [KZ 多人拥挤研究原型结果 V1](../research/arena-v2-kz-multiplayer-crowding-results-v1.md) | 记录四条分叉的估算并排容量、3–4 人溢出、多目标命中和重入可读字段 | 37/60 探针出现多目标命中，未进入生产多人平衡 |
| `arena-v2-kz-race-multiplayer-prototype.ts` | 使用共享路线输入、MovementSystem、RuleEngine 和 PhysicsWorld 运行 2/3/4 人倒计时、终点、winner、攻击和 180 tick 最近安全位置重生 | 6 个本地竞速研究探针通过，网络/真人/生产 MatchMode 仍待验证 |
| [KZ 2–4 人竞速流程研究结果 V1](../research/arena-v2-kz-race-multiplayer-results-v1.md) | 记录无攻击终点顺序、攻击未命中/多目标命中/掉落差异和原处安全快照重生 | 2–4 人本地流程通过，未进入生产竞速 |
| [生存 1vE 最小循环原型结果 V1](../research/arena-v2-survival-loop-prototype-results-v1.md) | 记录无武器开局、20 秒三实体供给、轮次成长、两次掉落和低维奖励证据；自动替换与10秒回收仍待实现 | 第一轮原型证据 |
| `arena-v2-survival-entity-prototype.ts` | 验证单一敌人复用玩家规则/物理、敌我双方击飞和第一次复活/第二次终局，仅供开发/测试工具链使用 | 第二轮规则原型证据 |
| `arena-v2-survival-pressure-prototype.ts` | 验证 1/2/4 同类敌人的有界自主追击、分阶段刷新、多人击飞压力、20 秒三武器供给争夺、等级专属武器 Definition 和 15/20/30 秒×两种路线分流矩阵，仅供开发/测试工具链使用 | 第六轮规则/武器原型证据 |
| `arena-v2-collection-budget-prototype.ts` | 将 200 小时拆为武器上下文、地图段落、模式记录和交叉挑战，并输出武器数量敏感性，仅供开发/测试工具链使用 | 第三轮成长原型证据 |
| `arena-v2-survival-weapon-definition.ts` | 将地面/空中公开数值、按武器核心语法选择的成长字段和等级专属 Action/Equipment ID 收敛为研究定义，仅供开发/测试工具链使用 | 第五轮武器 Definition 原型证据 |
| `arena-v2-survival-tier-combat-prototype.ts` | 通过等级专属 Definition 验证生存等级 1/5/10 在不增加按键的情况下实际改变三把武器的横向控制结果，仅供开发/测试工具链使用 | 第五轮武器数值原型证据 |
| [弹壳特攻队界面研究 V1](../research/arena-v2-survivor-io-ui-study-v1.md) | 记录官方证据、局外信息层、页面职责、点击预算和不复制边界 | 第三轮研究 |
| [弹壳特攻队局外界面研究结果 V2](../research/arena-v2-survivor-io-ui-research-results-v2.md) | 将官方单手/行为化武器/场景化选择证据收敛为 11 个页面入口和竞技准备模板 | 研究结论与原型对齐 |
| `arena-v2-survivor-io-ui-evidence.ts` | 将官方商店页、生存指南和版本记录拆成来源事实、信息模式、Arena 翻译和不复制边界 | 第四轮研究证据，仅研究工具链 |
| [V2 武器可读性与长期留存验证计划 V1](../research/arena-v2-weapon-readability-retention-study-v1.md) | 定义 3 分钟操作、10 秒数值解释、KZ 归因和 30/60/120/200 小时真人验证任务 | 真人研究合同，尚无样本 |
| [武器数值可读性任务原型结果 V1](../research/arena-v2-weapon-readability-task-prototype-results-v1.md) | 在题目前展示六件逐件研究武器的四项首屏快速数值、唯一极值场景差异速览、同源地面/空中矩阵和独立延迟/预警研究信号，再生成五项比较/方向/地图/上下文任务，隔离参与者题目与研究员答案并绑定矩阵哈希 | 六件矩阵、快速数值、场景速览与研究信号已接入，自动化验证通过，真人/设备样本尚无 |
| [研究页浏览器布局证据 V1](../research/arena-v2-browser-layout-evidence-v1.md) | 记录 1280×720 与 390×844 下的六件武器快速数值卡、完整矩阵、11 页面入口、触控尺寸和 Product 数值比较检查 | 本地浏览器布局通过，实体设备/真人仍待验证 |
| [Product 武器概览首屏收敛结果 V1](../research/arena-v2-product-weapon-overview-convergence-v1.md) | 记录正式 Product 入口从完整 27 行矩阵收敛为 4 行首屏关键差异、方向图例、3 张语义卡和可展开完整矩阵的桌面/窄屏证据 | 首屏收敛已接入，本地浏览器通过，实体设备/真人仍待验证 |
| [Product 武器数值差异事实原型结果 V1](../research/arena-v2-product-weapon-comparison-facts-v1.md) | 从同源主数值比较中派生唯一极值的优势/代价事实，帮助玩家快速理解锁链、重锤和冲锋盾的数字差异，不计算综合评分 | Web Product 卡片已接入，真人/多语言仍待验证 |
| [战斗外界面原型验证结果 V1](../research/arena-v2-ui-prototype-results-v1.md) | 记录当前主页、武器概览、角色选择和进入对局链路验证 | 第一轮原型证据 |
| [局外信息原型结果 V1](../research/arena-v2-ui-information-prototype-results-v1.md) | 记录 11 个信息入口、四条关键流程、48px 触控门槛、760px 窄屏断点和点击预算 | 第二轮信息架构原型 |
| `arena-v2-ui-information-prototype.ts` | 为 11 个局外页面声明必要信息、首屏最多三项、延后信息和点击预算，验证单一下一决策 | 第三轮信息层原型证据 |
| `ui-information.html` / `src/entry/ui-information-study.ts` | 独立展示 11 个页面合同、首屏/延后信息、主次动作和四条关键流程，不进入生产构建 | 局外信息研究页，仅研究工具链 |
| [弹壳特攻队参考的局外布局预览结果 V1](../research/arena-v2-survivor-io-ui-surface-results-v1.md) | 记录 11 个页面统一的目标—三张信息卡—一个主动作—四类入口布局，以及 390×844 窄屏证据 | 布局草图已接入，真机/真人仍待验证 |
| `arena-v2-ui-next-goal-prototype.ts` | 将收集、武器熟悉、地图熟悉和生存记录收敛为单一局外下一目标，仅供开发/测试工具链使用 | 第二轮信息架构证据 |
| [ADR-094：局外研究页必须把单一下一目标做成可切换验证面](../decisions/094-arena-v2-ui-single-next-goal-study-surface.md) | 固化研究页直接消费下一目标合同、四阶段研究夹具和单目标渲染边界 | 研究页已接入，生产结算页和真人留存仍待验证 |
| [ADR-044：武器不做格挡与公开数值概览](../decisions/044-arena-v2-weapon-no-guard-and-public-overview.md) | 固化武器边界与数值展示来源 | V2 提案 |
| [ADR-045：武器上下文概览契约](../decisions/045-arena-v2-weapon-context-overview.md) | 固化主动作数值、地面/空中上下文与风险语义 | 表现原型已接入 |
| [ADR-046：武器概览先显示数值比较](../decisions/046-arena-weapon-overview-comparison-first.md) | 固化主页“先比较数值、再读武器语义”的信息顺序 | 当前主页已接入 |
| [ADR-053：武器概览明确数值方向语义](../decisions/053-arena-weapon-overview-direction-semantics.md) | 固化“越高/越低/风险”文字、条形图和比较尺度一致性，避免只靠箭头猜含义 | 当前主页展示收敛 |
| [ADR-055：武器上下文必须完整显示关键数值](../decisions/055-arena-v2-weapon-context-readout-completeness.md) | 固化地面/空中上下文的八项数值、标签和可访问解释 | 表现原型已接入 |
| [ADR-077：研究武器概览必须分离地面与空中上下文](../decisions/077-arena-v2-research-overview-context-separation.md) | 固化研究矩阵的 `ground/aerial` 双上下文、公共数值轴和权威 Definition 投影边界 | 双上下文矩阵已接入，真人可读性待验证 |
| [ADR-078：KZ 地图研究卡必须区分来源事实与 Arena 迁移结论](../decisions/078-arena-v2-kz-research-source-profile.md) | 固化外部难度/长度/检查点事实、可迁移地图语言和生产地图边界 | 六类研究样本已接入，真实地图仍待设计 |
| [ADR-079：局外界面研究必须区分官方承诺、信息模式与 Arena 翻译](../decisions/079-arena-v2-survivor-io-ui-evidence-boundary.md) | 固化官方资料、设计推导和不复制边界的字段分离，以及 11 个页面合同不扩张的评审门槛 | 四张官方证据卡已接入，真人可读性仍待验证 |
| [ADR-088：11 个局外页面先用独立研究页验证信息合同](../decisions/088-arena-v2-ui-information-study-page-boundary.md) | 固化研究页复用唯一页面合同、48px 触控门槛、窄屏布局验证和生产入口隔离边界 | 研究页已接入，真机/真人仍待验证 |
| [ADR-101：弹壳特攻队参考只转译为统一局外布局节奏](../decisions/101-arena-v2-survivor-ui-common-layout-boundary.md) | 固化 11 页面草图的目标、三项首屏信息、一个主动作和四类入口边界 | 窄屏浏览器通过，真机/真人仍待验证 |
| [ADR-080：热血英豪武器逐件研究必须以动作链和数值审计为单位](../decisions/080-arena-v2-weapon-case-study-by-move.md) | 固化逐动作事实、反制、失败成本和公共数值轴审计边界 | 六件逐动作案例已接入，真人可读性与生产迁移待验证 |
| [ADR-106：武器必须以动作链和地图后果形成独立价值](../decisions/106-arena-v2-weapon-value-chain-synthesis.md) | 固化六项武器价值链和 Product 数值概览门槛，不用外观、类型或综合评分替代行为差异 | 六件研究案例已收敛，生产迁移待验证 |
| [ADR-107：研究武器必须通过六项价值链结构审计](../decisions/107-arena-v2-weapon-value-chain-audit.md) | 将动作身份、承诺、空间、命中后果、失败成本、反制与反馈变成可执行结构检查 | 六件深研案例已通过，生产门禁仍独立 |
| [ADR-097：逐件武器研究先按三步学习路径收敛](../decisions/097-arena-v2-weapon-learning-path-research-contract.md) | 固化从动作链派生核心动作、上下文转换、地图/失败代价三步学习顺序，并绑定每步数值重点 | 六件学习路径已接入研究页，真人学习顺序与生产成长仍待验证 |
| [ADR-099：六件逐件武器研究先绑定主战斗语言](../decisions/099-arena-v2-case-study-primary-combat-language.md) | 固化六件深研案例的一对一主战斗语言、关键数值轴存在性检查和概览读出边界 | 六件语言绑定与关键轴验证通过，仍属研究推导 |
| [ADR-100：KZ 路线先用真实画布验证路线职责](../decisions/100-arena-v2-kz-route-canvas-study-boundary.md) | 固化 KZ 研究页的真实 Canvas、竞速/生存切换、分叉路线、攻击点和来源迁移边界 | 桌面/窄屏本地浏览器通过，2–4 人/真人/生产地图仍待验证 |
| [ADR-103：KZ 多人拥挤先以 2–4 人真实规则/物理合同验证](../decisions/103-arena-v2-kz-multiplayer-crowding-boundary.md) | 固化四条分叉中段、2/3/4 人、五种武器语言、容量压力、多目标命中和 180 tick 重入的研究边界 | 60 个研究探针通过，真实竞速/网络/真人仍待验证 |
| [ADR-104：KZ 竞速先以本地 2–4 人流程合同验证](../decisions/104-arena-v2-kz-race-multiplayer-contract.md) | 固化 60 tick 倒计时、终点 winner、真实攻击后果和 180 tick 最近安全位置重生的研究边界 | 6 个本地竞速探针通过，网络/真人/生产仍待验证 |
| [ADR-085：血影钩刃动作规则与障碍后果分层验证](../decisions/085-arena-v2-blood-shadow-hook-blade-definition-boundary.md) | 固化目标朝向/拉近由真实 Rule/Replay 验证，实体障碍由独立地图探针验证，禁止把未接入规则的障碍属性写成武器数值 | 研究 Definition/Replay 已接入，障碍仍待真实地图表面验证 |
| [ADR-086：真·哈迪斯钩镰先以承诺、上下文和支撑面后果收敛](../decisions/086-arena-v2-true-hades-hook-scythe-definition-boundary.md) | 固化地面承诺、空中独立上下文、取消/提交、命中与支撑面后果的研究边界 | 研究 Definition/Replay 已接入，未进入生产 |
| [ADR-089：魔血镰刃先以封路、上下文和路线后果收敛](../decisions/089-arena-v2-magic-blood-scythe-definition-boundary.md) | 固化地面宽覆盖、空中高度分支、路线躲避和边缘后果；延迟危险区先保持独立研究信号 | 研究 Definition/Replay 已接入，未进入生产 |
| [ADR-092：延迟区域必须区分瞬时命中和持续封路](../decisions/092-arena-v2-persistent-zone-lifecycle.md) | 固化 `telegraph → active → lingering → expired` 研究生命周期、0 tick 兼容和持续区反馈边界 | 研究工具链已接入，生产/真人仍待验证 |
| [ADR-090：猛犸石斧先以预判、上下文和支撑面后果收敛](../decisions/090-arena-v2-mammoth-stone-axe-definition-boundary.md) | 固化地面长前摇、空中高度分支、预判失败和边缘后果；滚动/墙反弹/公共危险先保持独立研究边界 | 研究 Definition/Replay 已接入，未进入生产 |
| [ADR-056：武器先按可学习的战斗语言扩展](../decisions/056-arena-v2-weapon-function-language-boundary.md) | 固化参考武器到 Arena 战斗语言的研究映射与新增武器评审边界 | 研究原型已接入 |
| [ADR-057：武器战斗语言必须通过地图后果验证](../decisions/057-arena-v2-weapon-language-map-consequence-boundary.md) | 固化六段 KZ 表面、三种回应和击退/支撑面证据作为武器候选评审门槛 | 研究原型已接入 |
| [ADR-058：V2 可读性与留存使用独立真人任务合同](../decisions/058-arena-v2-readability-retention-study-boundary.md) | 固化 3 分钟操作、数值解释、地图归因和 200 小时里程碑的独立验证边界 | 合同已建立，尚无真人样本 |
| `arena-v2-weapon-public-axis-contract.ts` | 检查参考战斗语言与生产基线语言依赖的数值是否已经在主概览、地面/空中上下文或研究字段中明确出现，阻止未公开轴进入正式武器卡 | 研究评审证据 |
| [ADR-059：战斗语言必须通过公开数值轴就绪检查](../decisions/059-arena-v2-weapon-public-axis-readiness-boundary.md) | 固化 9 个主数值、8 个上下文数值、2 个行为补充轴和 2 个研究专用未闭合轴的进入边界 | 研究评审已接入 |
| [ADR-060：绕后使用目标朝向判定，五种语言共用同一规则原型](../decisions/060-arena-v2-rear-cone-and-language-prototype-boundary.md) | 固化 `rear-cone`、五种语言统一 Rule/Effect/Targeting 原型和 90 个 KZ 探针边界 | 研究原型已接入 |
| [ADR-061：武器概览补充有效窗口与方向容错](../decisions/061-arena-v2-weapon-overview-behavior-readout.md) | 固化由权威调优推导的两项补充行为数值及其不进入主比较表的边界 | Product UI 已接入 |
| [ADR-083：武器概览必须横向展示地面与空中场景数值](../decisions/083-arena-v2-weapon-context-comparison-readout.md) | 固化主数值、行为数值和地面/空中场景数值的比较顺序、字段一致性校验与 Web/Canvas 展示差异 | Product UI 与 Canvas 已接入，真人页面已验证 |
| [ADR-091：Product 武器概览采用两层数值读出](../decisions/091-arena-v2-product-weapon-overview-two-level-readout.md) | 固化首屏四项关键差异、武器语义卡和可展开完整 27 行矩阵的同源展示边界 | Product UI 已接入，本地浏览器通过，真人/设备仍待验证 |
| [ADR-093：武器概览用数值差异事实连接武器语法](../decisions/093-arena-v2-weapon-comparison-facts.md) | 固化由唯一数值极值派生优势/代价事实、并列阻塞和不计算综合评分的展示边界 | Web Product 已接入，Canvas 保持同源比较表 |
| [ADR-095：武器概览补充地面/空中场景差异事实](../decisions/095-arena-v2-weapon-context-comparison-facts.md) | 固化由同源地面/空中比较行派生场景优势/代价事实、上下文保真和不合成评分的展示边界 | Web Product 卡片已接入，Canvas 保持同源比较表 |
| [ADR-084：武器数值可读性任务必须从研究矩阵生成并隔离答案](../decisions/084-arena-v2-weapon-readability-task-boundary.md) | 固化可读性题目从真实矩阵生成、参与者投影不泄露答案、并列数值阻塞和单次评估不冒充真人结论 | 研究页已接入并完成桌面验证，真人样本尚无 |
| [ADR-096：可读性研究页增加场景差异速览](../decisions/096-arena-v2-readability-context-fact-summary.md) | 固化从六件研究矩阵派生唯一极值、每件最多一条优势/代价、保留原始单位且不计算综合评分的研究页边界 | 研究页已接入，自动化验证通过，真人/设备样本尚无 |
| [ADR-062：蓄力承诺先以可取消的整数 tick 原型验证](../decisions/062-arena-v2-weapon-commitment-prototype-boundary.md) | 固化蓄力承诺、提前取消、到期处理和方向记录的研究边界，不直接进入生产武器 | 研究原型已接入 |
| [ADR-047：生存实体复用玩家规则/物理边界](../decisions/047-arena-v2-survival-entity-boundary.md) | 固化单敌人原型不得绕过命中、冲量和掉落规则 | V2 研究原型 |
| [ADR-048：生存多敌压力先复用规则引擎](../decisions/048-arena-v2-survival-multi-enemy-pressure-boundary.md) | 固化多敌研究原型的输入决策、供给争夺和正式接入前的边界 | V2 研究原型 |
| [ADR-108：生存供给采用靠近自动替换与10秒权威回收](../decisions/108-arena-v2-survival-auto-replace-and-expiry.md) | 冻结20秒三实体供给、持有者原子替换、旧武器回收和600 tick过期语义 | 已接受并完成Rule/Core/Bot与Presentation只读输入模型验收；供给表现adapter尚未实现，正式CPU门仍false，P1不得advance |
| [ADR-110：过期持有供给释放时不可回到世界](../decisions/110-arena-v2-expired-held-release-disposition.md) | 补充过期 held 跨 tick 使用、owner release 原子回收、EquipmentDespawned reason、disposition hash 与 golden checkpoint 影响 | 已接受并完成对应Rule/Core、Replay/golden与下游只读投影验收；正式CPU门仍false |
| [ADR-111：Action Read Model 性能边界](../decisions/111-arena-v2-action-read-model-performance-boundary.md) | 固化 world/local/Bot read model 分离、固定 profile owner-bound reader 与 Resolver multi-intent；定义 PA3–PA5 迁移、审计、证据和性能边界 | PA5总批次completed / coordinator-approved；PA6-P completed / 95分；PA6 runner正确性已签核，正式ABBA按ADR-115延期且formalGate=false |
| [ADR-112：正式三模式采用数据 Definition 与注册 Policy 组合](../decisions/112-arena-v2-formal-mode-definition-and-policy-boundary.md) | 冻结单一MatchCore下的Mode/Policy Registry、参与者角色、Race终点/重生、Survival有界敌人slot及V5→V6显式schema边界 | P2.0提议；线程回执、六维自检、enemy slot安全上限与主协调评分未完成，生产实现未授权 |
| [ADR-113：供给表现使用只读投影与有界事件适配器](../decisions/113-arena-v2-supply-presentation-adapter-boundary.md) | 冻结Marker/Cue/View exact-key合同、snapshot+event事务、replacement配对、sequence gap重同步、有界生命周期及P1 acceptance隔离 | PP0/PP1/PP2/PP3与A1.0-v2非性能门已签核；正式设备/性能/真人未完成 |
| [ADR-114：供给美术证据采用不可变版本与开发—美术联合签核](../decisions/114-arena-v2-art-evidence-versioning-and-joint-gate.md) | 保留A1.0-v1历史身份，在PP0/PP1真实候选后追加当前源码v2；分离开发B、美术和主协调写域并关闭循环门 | v2已创建并以94分完成主协调外部联合签核；A0.3/A1.1/代表样件与全部外部门仍未完成 |
| [ADR-115：P1当前性能执行延期并合并为最终同源联合门](../decisions/115-arena-v2-deferred-joint-performance-gate.md) | 本轮不运行PA6，先完成PA7与P1-PP非性能实现；最终clean source上依次执行PA6 ABBA×3与PA7 300/120 | 已接受的一次性P1内部顺序调整；PA7/PP非性能实现与包体开发门已关闭，等待最终治理与clean source freeze；PA6/PA7/P1仍formalGate=false，P2/A2/commit/push未开放 |
| [ADR-116：正式生存 Composition 身份使用 provenance reader](../decisions/116-arena-v2-formal-composition-identity-provenance.md) | 由生产 Composition 私有 WeakMap 绑定原生 Session 与最小冻结身份，PA7 只读取得真实 compositionContractHash | Accepted；身份 reader 已接入正式 worker 并通过PA7非性能复核；正式性能仍延期，不开放P2/A2/commit/push |
| [ADR-117：三端生产技术错误使用稳定诊断目录](../decisions/117-arena-v2-production-error-catalog.md) | 三端共享稳定七字符诊断码，Web交付完整canonical gzip目录，小游戏只携带同源reference；保持构造器、动态求值、cause、公开文案与TypeScript source map | Accepted；2,495-entry目录、3,005处变换、三端预算和构建治理已通过dirty candidate复核；clean source、性能、设备和发布门未通过 |
| [200 小时收集容量原型结果 V1](../research/arena-v2-collection-budget-prototype-results-v1.md) | 记录候选武器数量、上下文证据、地图/模式/挑战预算和敏感性分析 | 第三轮成长原型证据 |
| [ADR-050：生存武器等级先走研究冲量端口](../decisions/050-arena-v2-survival-tier-scaling-research-port.md) | 固化等级实际战斗影响、统一倍率反例和正式 Definition 接入前的边界 | V2 研究原型 |
| [ADR-051：生存武器等级采用按核心语法的正式 Definition 变体](../decisions/051-arena-v2-survival-tier-formal-definition.md) | 固化地面/空中数值、按武器语法成长、等级专属动作身份和回放 hash 边界 | V2 研究原型 |
| [ADR-052：生存同类敌人采用分阶段刷新研究边界](../decisions/052-arena-v2-survival-staged-enemy-refresh-boundary.md) | 固化不增加敌人类型和操作按键、仅以分阶段刷新验证后期压力的研究边界 | V2 研究原型 |
| [ADR-054：KZ 段落攻击探针复用地图与武器规则](../decisions/054-arena-v2-kz-route-combat-probe-boundary.md) | 固化六段地图与武器冲量的交叉验证边界，不把几何可达性误判为战斗公平 | V2 研究原型 |
| [ADR-098：KZ 分叉武器研究必须覆盖入口、转折和出口](../decisions/098-arena-v2-kz-weapon-attack-points.md) | 固化四条分叉三个攻击点、五种战斗语言和三种回应的交叉验证边界 | 180 个研究探针已通过，真实画布/多人/真人仍待验证 |

## 文档收敛顺序

```text
产品总纲
  ↓
玩法框架 / 模式规则 / 武器框架 / 成长框架
  ↓
界面地图 / 架构迁移边界
  ↓
外部研究与原型验证
  ↓
数值、武器名单、地图名单和最终 UI 规格
```

## 状态标签

- 已确认：用户已经明确表达，后续只允许细化，不应随意反向改变。
- 候选：当前最合理的设计方案，需要原型或研究验证。
- 待研究：必须通过外部资料、对比分析或玩家测试才能收敛。
- 暂不引入：当前明确不增加的系统。
- 已实现：只有代码、自动化、设备或正式证据能够证明时才能使用。
