# Arena V2 新版本文档索引

## 文档状态

- 状态：初稿，讨论中
- 日期：2026-07-27
- 适用范围：Arena 后续产品方向
- 重要说明：本文档组描述目标版本，不代表当前代码已经实现。当前实现和工程验收仍以 V1 文档、治理台账和代码为准。

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

## 初稿文档清单

| 文档 | 作用 | 当前状态 |
|---|---|---|
| [V2 产品总纲](arena-v2-product-brief.md) | 统一定位、目标用户、核心循环和非目标 | 初稿 |
| [V2 玩法框架](../gameplay/arena-v2-gameplay-framework.md) | 角色、操作、1v1、生存、地图和反馈的总规则 | 初稿 |
| [V2 武器设计与研究框架](../gameplay/arena-v2-weapon-design-framework.md) | 热血英豪研究方法、上下文动作、基础武器原型和武器卡模板 | 第二轮收敛 |
| [V2 生存 1vE 规则](../gameplay/arena-v2-survival-mode.md) | 生存流程、敌人、武器供给、掉落和结束条件 | 初稿 + 最小循环原型 |
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
| `arena-v2-weapon-case-study-overview-prototype.ts` | 将六件逐动作深研案例投影为核心动词、上下文、公共轴状态、地图信号和反制读出；六件均已连接研究 Definition 地面/空中数值投影，复杂行为仍保持独立研究边界 | 深研概览适配层，仅研究工具链 |
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
| [深研武器概览适配层原型结果 V1](../research/arena-v2-weapon-case-study-overview-prototype-results-v1.md) | 将六件逐动作深研案例的研究结论与公共数值轴审计接到同一份读出，六件均有独立研究投影与专属 Replay，复杂行为仍独立管理 | 研究读出通过，未进入生产 UI |
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
| [ADR-082：延迟落点先以预警区和整数 tick 验证](../decisions/082-arena-v2-mammoth-stone-axe-delay-boundary.md) | 固化延迟/预警的研究边界，避免将官方时间和复杂公共危险直接迁移到生产规则 | 研究边界已接入 |
| [ADR-070：六个首发位置统一使用 Definition 数值投影](../decisions/070-arena-v2-research-launch-definition-projection.md) | 固化生产基线与候选 Registry 共用可比较数值结构，同时保留候选 Registry 与默认生产目录边界 | 研究投影边界已接入 |
| [ADR-069：命中反馈必须保留失败原因的因果区分](../decisions/069-arena-v2-hit-feedback-causal-contract.md) | 固化命中确认、支撑面转移、击落、避开攻击线和路线失误五种反馈语义 | KZ 无渲染反馈合同已接入 |
| [ADR-071：武器反馈先映射为表现事件，再绑定声音与特效](../decisions/071-arena-v2-feedback-presentation-event-mapping.md) | 将五种因果反馈映射为可去重的 `WeaponFeedbackPresented` 事件，表现层只选择 Cue 不重新判定 | Presentation 事件映射已接入，真机表现待验证 |
| [ADR-073：Arena V2 以 11 个信息入口和一个共享竞技准备模板收敛界面](../decisions/073-arena-v2-ui-eleven-page-contract.md) | 固定 11 个局外入口，明确加载页、竞技准备模板复用和生存准备独立边界 | 页面合同已接入无渲染原型 |
| [ADR-072：正式武器反馈事件接入 Three 灰盒表现](../decisions/072-arena-v2-feedback-presentation-three-consumption.md) | 将五种反馈 Cue 接入灰盒冲击/警告效果、镜头、震动和现有音频入口，不在表现层重新判定 | 灰盒表现链已接入，最终资产与真机待验证 |
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
| [武器攻击/跳跃穿插 Replay 原型结果 V1](../research/arena-v2-weapon-attack-jump-interleave-replay-results-v1.md) | 使用真实 MatchCore 验证同 tick 攻击与跳跃独立通道，以及空中切换武器专属下砸动作 | 三个研究候选穿插证据已通过，仍未生产化 |
| `arena-v2-weapon-attack-jump-interleave-replay-prototype.ts` | 为三个研究候选生成同 tick 独立通道与空中武器动作 Replay，并验证 `begin-down-smash` 状态效果 | 攻击/跳跃穿插研究证据 |
| [武器战斗语言最小原型结果 V1](../research/arena-v2-weapon-language-prototype-results-v1.md) | 记录直线压制、封路、延迟重击、读招反制和绕后的 Rule/Targeting/Effect 最小验证与回应时间 | 扩展武器原型证据 |
| [武器战斗语言 × KZ 地图后果原型结果 V1](../research/arena-v2-weapon-language-kz-consequence-results-v1.md) | 记录五种战斗语言在六段 KZ 表面上的击落、路线转移、前摇、有效窗口和固定回应后果 | 扩展武器×地图原型证据 |
| `arena-v2-warning-zone-prototype.ts` | 验证封路候选的公开标记位置、整数 tick 生命周期和到期，不实现持续伤害或新操作 | 第四轮武器状态原型证据 |
| [武器上下文无渲染原型结果 V1](../research/arena-v2-weapon-prototype-results-v1.md) | 记录三把武器地面/空中命中节奏、击飞差异和挥空边界 | 第一轮原型证据 |
| [武器地图边缘原型结果 V1](../research/arena-v2-weapon-map-prototype-results-v1.md) | 记录规则命中进入轻量物理后在宽平台、窄路和边缘的实际后果 | 第一轮地图交互证据 |
| [武器移动目标原型结果 V1](../research/arena-v2-weapon-moving-target-prototype-results-v1.md) | 记录固定侧移目标下前摇差异如何转化为命中/挥空 | 第一轮移动反制证据 |
| [武器攻击者失位与双人争夺原型结果 V1](../research/arena-v2-weapon-contest-prototype-results-v1.md) | 记录自身位移、空中命中和双人同时出招的规则后果 | 第一轮对战拥挤证据 |
| [CS1.6 KZ 跳跃地图研究 V1](../research/arena-v2-cs16-kz-map-study-v1.md) | 记录地图段落、六维难度轴、段落合同、研究 MapDefinition、灰盒可达性和竞速/生存复用边界 | 第二轮研究 + MapDefinition 灰盒原型 |
| [ADR-063：KZ 地图段落必须声明回应窗口与恢复关系](../decisions/063-arena-v2-kz-route-response-contract.md) | 固化段落可用回应、固定探针窗口和命中后恢复关系，避免地图只用宽度与难度描述 | KZ 灰盒合同已接入 |
| [ADR-087：CS1.6 KZ 路线先接入研究 MapDefinition，再进入生产地图](../decisions/087-arena-v2-kz-map-definition-research-boundary.md) | 固化六段路线、4 个起点、竞速/生存共用几何和研究/生产地图边界 | 研究 MapDefinition 已接入，真人/真机仍待验证 |
| `arena-v2-kz-map-research-catalog.ts` | 六类代表 KZ 地图样本的来源事实、学习点、设计信号和不复制边界，仅供开发/测试工具链使用 | 研究证据 |
| `arena-v2-kz-route-combat-prototype.ts` | 将六段 KZ 灰盒与同一套武器命中/冲量/移动回应/复活重入规则组合，验证段落宽度、相邻恢复表面、侧移、跳跃和 3 秒复活锚点对武器击飞后果的影响，仅供开发/测试工具链使用 | 第三轮地图×武器原型证据，单人复活重入已验证 |
| [生存 1vE 最小循环原型结果 V1](../research/arena-v2-survival-loop-prototype-results-v1.md) | 记录无武器开局、20 秒三选一、轮次成长、两次掉落和低维奖励证据 | 第一轮原型证据 |
| `arena-v2-survival-entity-prototype.ts` | 验证单一敌人复用玩家规则/物理、敌我双方击飞和第一次复活/第二次终局，仅供开发/测试工具链使用 | 第二轮规则原型证据 |
| `arena-v2-survival-pressure-prototype.ts` | 验证 1/2/4 同类敌人的有界自主追击、分阶段刷新、多人击飞压力、20 秒三武器供给争夺、等级专属武器 Definition 和 15/20/30 秒×两种路线分流矩阵，仅供开发/测试工具链使用 | 第六轮规则/武器原型证据 |
| `arena-v2-collection-budget-prototype.ts` | 将 200 小时拆为武器上下文、地图段落、模式记录和交叉挑战，并输出武器数量敏感性，仅供开发/测试工具链使用 | 第三轮成长原型证据 |
| `arena-v2-survival-weapon-definition.ts` | 将地面/空中公开数值、按武器核心语法选择的成长字段和等级专属 Action/Equipment ID 收敛为研究定义，仅供开发/测试工具链使用 | 第五轮武器 Definition 原型证据 |
| `arena-v2-survival-tier-combat-prototype.ts` | 通过等级专属 Definition 验证生存等级 1/5/10 在不增加按键的情况下实际改变三把武器的横向控制结果，仅供开发/测试工具链使用 | 第五轮武器数值原型证据 |
| [弹壳特攻队界面研究 V1](../research/arena-v2-survivor-io-ui-study-v1.md) | 记录官方证据、局外信息层、页面职责、点击预算和不复制边界 | 第三轮研究 |
| [弹壳特攻队局外界面研究结果 V2](../research/arena-v2-survivor-io-ui-research-results-v2.md) | 将官方单手/行为化武器/场景化选择证据收敛为 11 个页面入口和竞技准备模板 | 研究结论与原型对齐 |
| `arena-v2-survivor-io-ui-evidence.ts` | 将官方商店页、生存指南和版本记录拆成来源事实、信息模式、Arena 翻译和不复制边界 | 第四轮研究证据，仅研究工具链 |
| [V2 武器可读性与长期留存验证计划 V1](../research/arena-v2-weapon-readability-retention-study-v1.md) | 定义 3 分钟操作、10 秒数值解释、KZ 归因和 30/60/120/200 小时真人验证任务 | 真人研究合同，尚无样本 |
| [武器数值可读性任务原型结果 V1](../research/arena-v2-weapon-readability-task-prototype-results-v1.md) | 在题目前展示六件逐件研究武器的同源地面/空中矩阵和独立延迟/预警研究信号，再生成五项比较/方向/地图/上下文任务，隔离参与者题目与研究员答案并绑定矩阵哈希 | 六件矩阵与研究信号已接入，自动化验证通过，真人/设备样本尚无 |
| [研究页浏览器布局证据 V1](../research/arena-v2-browser-layout-evidence-v1.md) | 记录 1280×720 与 390×844 下的六件武器矩阵、11 页面入口、触控尺寸和 Product 数值比较检查 | 本地浏览器布局通过，实体设备/真人仍待验证 |
| [战斗外界面原型验证结果 V1](../research/arena-v2-ui-prototype-results-v1.md) | 记录当前主页、武器概览、角色选择和进入对局链路验证 | 第一轮原型证据 |
| [局外信息原型结果 V1](../research/arena-v2-ui-information-prototype-results-v1.md) | 记录 11 个信息入口、四条关键流程、48px 触控门槛、760px 窄屏断点和点击预算 | 第二轮信息架构原型 |
| `arena-v2-ui-information-prototype.ts` | 为 11 个局外页面声明必要信息、首屏最多三项、延后信息和点击预算，验证单一下一决策 | 第三轮信息层原型证据 |
| `ui-information.html` / `src/entry/ui-information-study.ts` | 独立展示 11 个页面合同、首屏/延后信息、主次动作和四条关键流程，不进入生产构建 | 局外信息研究页，仅研究工具链 |
| `arena-v2-ui-next-goal-prototype.ts` | 将收集、武器熟悉、地图熟悉和生存记录收敛为单一局外下一目标，仅供开发/测试工具链使用 | 第二轮信息架构证据 |
| [ADR-044：武器不做格挡与公开数值概览](../decisions/044-arena-v2-weapon-no-guard-and-public-overview.md) | 固化武器边界与数值展示来源 | V2 提案 |
| [ADR-045：武器上下文概览契约](../decisions/045-arena-v2-weapon-context-overview.md) | 固化主动作数值、地面/空中上下文与风险语义 | 表现原型已接入 |
| [ADR-046：武器概览先显示数值比较](../decisions/046-arena-weapon-overview-comparison-first.md) | 固化主页“先比较数值、再读武器语义”的信息顺序 | 当前主页已接入 |
| [ADR-053：武器概览明确数值方向语义](../decisions/053-arena-weapon-overview-direction-semantics.md) | 固化“越高/越低/风险”文字、条形图和比较尺度一致性，避免只靠箭头猜含义 | 当前主页展示收敛 |
| [ADR-055：武器上下文必须完整显示关键数值](../decisions/055-arena-v2-weapon-context-readout-completeness.md) | 固化地面/空中上下文的八项数值、标签和可访问解释 | 表现原型已接入 |
| [ADR-077：研究武器概览必须分离地面与空中上下文](../decisions/077-arena-v2-research-overview-context-separation.md) | 固化研究矩阵的 `ground/aerial` 双上下文、公共数值轴和权威 Definition 投影边界 | 双上下文矩阵已接入，真人可读性待验证 |
| [ADR-078：KZ 地图研究卡必须区分来源事实与 Arena 迁移结论](../decisions/078-arena-v2-kz-research-source-profile.md) | 固化外部难度/长度/检查点事实、可迁移地图语言和生产地图边界 | 六类研究样本已接入，真实地图仍待设计 |
| [ADR-079：局外界面研究必须区分官方承诺、信息模式与 Arena 翻译](../decisions/079-arena-v2-survivor-io-ui-evidence-boundary.md) | 固化官方资料、设计推导和不复制边界的字段分离，以及 11 个页面合同不扩张的评审门槛 | 四张官方证据卡已接入，真人可读性仍待验证 |
| [ADR-088：11 个局外页面先用独立研究页验证信息合同](../decisions/088-arena-v2-ui-information-study-page-boundary.md) | 固化研究页复用唯一页面合同、48px 触控门槛、窄屏布局验证和生产入口隔离边界 | 研究页已接入，真机/真人仍待验证 |
| [ADR-080：热血英豪武器逐件研究必须以动作链和数值审计为单位](../decisions/080-arena-v2-weapon-case-study-by-move.md) | 固化逐动作事实、反制、失败成本和公共数值轴审计边界 | 六件逐动作案例已接入，真人可读性与生产迁移待验证 |
| [ADR-085：血影钩刃动作规则与障碍后果分层验证](../decisions/085-arena-v2-blood-shadow-hook-blade-definition-boundary.md) | 固化目标朝向/拉近由真实 Rule/Replay 验证，实体障碍由独立地图探针验证，禁止把未接入规则的障碍属性写成武器数值 | 研究 Definition/Replay 已接入，障碍仍待真实地图表面验证 |
| [ADR-086：真·哈迪斯钩镰先以承诺、上下文和支撑面后果收敛](../decisions/086-arena-v2-true-hades-hook-scythe-definition-boundary.md) | 固化地面承诺、空中独立上下文、取消/提交、命中与支撑面后果的研究边界 | 研究 Definition/Replay 已接入，未进入生产 |
| [ADR-089：魔血镰刃先以封路、上下文和路线后果收敛](../decisions/089-arena-v2-magic-blood-scythe-definition-boundary.md) | 固化地面宽覆盖、空中高度分支、路线躲避和边缘后果；延迟危险区先保持独立研究信号 | 研究 Definition/Replay 已接入，未进入生产 |
| [ADR-090：猛犸石斧先以预判、上下文和支撑面后果收敛](../decisions/090-arena-v2-mammoth-stone-axe-definition-boundary.md) | 固化地面长前摇、空中高度分支、预判失败和边缘后果；滚动/墙反弹/公共危险先保持独立研究边界 | 研究 Definition/Replay 已接入，未进入生产 |
| [ADR-056：武器先按可学习的战斗语言扩展](../decisions/056-arena-v2-weapon-function-language-boundary.md) | 固化参考武器到 Arena 战斗语言的研究映射与新增武器评审边界 | 研究原型已接入 |
| [ADR-057：武器战斗语言必须通过地图后果验证](../decisions/057-arena-v2-weapon-language-map-consequence-boundary.md) | 固化六段 KZ 表面、三种回应和击退/支撑面证据作为武器候选评审门槛 | 研究原型已接入 |
| [ADR-058：V2 可读性与留存使用独立真人任务合同](../decisions/058-arena-v2-readability-retention-study-boundary.md) | 固化 3 分钟操作、数值解释、地图归因和 200 小时里程碑的独立验证边界 | 合同已建立，尚无真人样本 |
| `arena-v2-weapon-public-axis-contract.ts` | 检查参考战斗语言与生产基线语言依赖的数值是否已经在主概览、地面/空中上下文或研究字段中明确出现，阻止未公开轴进入正式武器卡 | 研究评审证据 |
| [ADR-059：战斗语言必须通过公开数值轴就绪检查](../decisions/059-arena-v2-weapon-public-axis-readiness-boundary.md) | 固化 9 个主数值、8 个上下文数值、2 个行为补充轴和 2 个研究专用未闭合轴的进入边界 | 研究评审已接入 |
| [ADR-060：绕后使用目标朝向判定，五种语言共用同一规则原型](../decisions/060-arena-v2-rear-cone-and-language-prototype-boundary.md) | 固化 `rear-cone`、五种语言统一 Rule/Effect/Targeting 原型和 90 个 KZ 探针边界 | 研究原型已接入 |
| [ADR-061：武器概览补充有效窗口与方向容错](../decisions/061-arena-v2-weapon-overview-behavior-readout.md) | 固化由权威调优推导的两项补充行为数值及其不进入主比较表的边界 | Product UI 已接入 |
| [ADR-083：武器概览必须横向展示地面与空中场景数值](../decisions/083-arena-v2-weapon-context-comparison-readout.md) | 固化主数值、行为数值和地面/空中场景数值的比较顺序、字段一致性校验与 Web/Canvas 展示差异 | Product UI 与 Canvas 已接入，真人页面已验证 |
| [ADR-084：武器数值可读性任务必须从研究矩阵生成并隔离答案](../decisions/084-arena-v2-weapon-readability-task-boundary.md) | 固化可读性题目从真实矩阵生成、参与者投影不泄露答案、并列数值阻塞和单次评估不冒充真人结论 | 研究页已接入并完成桌面验证，真人样本尚无 |
| [ADR-062：蓄力承诺先以可取消的整数 tick 原型验证](../decisions/062-arena-v2-weapon-commitment-prototype-boundary.md) | 固化蓄力承诺、提前取消、到期处理和方向记录的研究边界，不直接进入生产武器 | 研究原型已接入 |
| [ADR-047：生存实体复用玩家规则/物理边界](../decisions/047-arena-v2-survival-entity-boundary.md) | 固化单敌人原型不得绕过命中、冲量和掉落规则 | V2 研究原型 |
| [ADR-048：生存多敌压力先复用规则引擎](../decisions/048-arena-v2-survival-multi-enemy-pressure-boundary.md) | 固化多敌研究原型的输入决策、供给争夺和正式接入前的边界 | V2 研究原型 |
| [200 小时收集容量原型结果 V1](../research/arena-v2-collection-budget-prototype-results-v1.md) | 记录候选武器数量、上下文证据、地图/模式/挑战预算和敏感性分析 | 第三轮成长原型证据 |
| [ADR-050：生存武器等级先走研究冲量端口](../decisions/050-arena-v2-survival-tier-scaling-research-port.md) | 固化等级实际战斗影响、统一倍率反例和正式 Definition 接入前的边界 | V2 研究原型 |
| [ADR-051：生存武器等级采用按核心语法的正式 Definition 变体](../decisions/051-arena-v2-survival-tier-formal-definition.md) | 固化地面/空中数值、按武器语法成长、等级专属动作身份和回放 hash 边界 | V2 研究原型 |
| [ADR-052：生存同类敌人采用分阶段刷新研究边界](../decisions/052-arena-v2-survival-staged-enemy-refresh-boundary.md) | 固化不增加敌人类型和操作按键、仅以分阶段刷新验证后期压力的研究边界 | V2 研究原型 |
| [ADR-054：KZ 段落攻击探针复用地图与武器规则](../decisions/054-arena-v2-kz-route-combat-probe-boundary.md) | 固化六段地图与武器冲量的交叉验证边界，不把几何可达性误判为战斗公平 | V2 研究原型 |

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
