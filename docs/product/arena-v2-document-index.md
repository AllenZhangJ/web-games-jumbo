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
| [V2 界面地图](arena-v2-screen-map.md) | 明确需要哪些局外页面和对局页面 | 初稿 |
| [V2 架构影响与迁移边界](../architecture/arena-v2-migration-boundary.md) | 说明哪些可以复用、哪些需要重构 | 初稿 |
| [V2 搜索与验证清单](../research/arena-v2-research-backlog.md) | 管理后续搜索、原型和实测问题 | 第二轮收敛 |
| [热血英豪武器研究 V1](../research/arena-v2-hot-blooded-weapon-study-v1.md) | 记录官方案例、蓄力/取消/方向/持续威胁证据、上下文动作矩阵、风险语义和完整数值展示要求 | 第三轮研究 |
| `arena-v2-weapon-research-catalog.ts` | 12 件参考武器的结构化研究卡，仅供开发/测试工具链使用 | 研究证据 |
| `arena-v2-weapon-official-evidence.ts` | 5 组官方招式证据的蓄力、取消、方向、上下文、资源、持续威胁和物理阻碍信号，仅供开发/测试工具链使用 | 第三轮研究证据 |
| `arena-v2-weapon-commitment-prototype.ts` | 用整数 tick 验证读招反制与延迟重击的提前取消、承诺释放、到期取消和蓄力转向，仅供开发/测试工具链使用 | 第四轮武器状态原型证据 |
| `arena-v2-weapon-function-language.ts` | 将 12 件参考武器归并为 7 种参考战斗语言，并补齐生产基线“推离”语言，绑定数值轴、反制、地图空间和模式候选 | 研究证据 |
| [武器最小功能版本合同 V1](../research/arena-v2-weapon-minimum-version-contract-v1.md) | 将 8 种战斗语言结构化为单一基础输入、地面/空中上下文、命中结果、地图关系、失败成本和反制，并投影回研究卡与生产武器 | 第四轮研究合同 |
| [ADR-064：武器必须先通过最小功能版本合同](../decisions/064-arena-v2-weapon-minimum-version-contract.md) | 固化研究卡到后续武器 Definition 之间的中间评审边界 | 研究合同已接入 |
| [ADR-065：生产武器必须显式映射到最小战斗语言](../decisions/065-arena-v2-production-weapon-language-mapping.md) | 固化重锤、锁链、冲锋盾与最小战斗语言及地面/空中动作的显式映射 | 生产基线审计已接入 |
| [V2 首发武器候选合同 V1](../research/arena-v2-weapon-launch-candidate-contract-v1.md) | 将 8 种语言收敛为 6 个首发功能位置，区分生产基线、研究候选和延后语言 | 候选集合已收敛 |
| [ADR-066：首发武器候选按六种战斗语言收敛](../decisions/066-arena-v2-weapon-launch-candidate-selection.md) | 固化三把生产基线、三把研究候选、六种公开可比较语言和两种延后语言 | 候选筛选已接入 |
| [V2 武器 Definition 迁移审计 V1](../research/arena-v2-weapon-definition-migration-audit-v1.md) | 对照当前权威调优审计 11 个公开数值轴，并列出三个研究候选的 Definition 结构缺口 | 审计完成，迁移未开始 |
| [ADR-067：武器概览数值必须从权威 Definition 投影](../decisions/067-arena-v2-weapon-definition-migration-boundary.md) | 固化权威字段、派生数值、地面/空中上下文与表现层的单向投影边界 | 迁移边界已接入 |
| [直线压制 Definition 原型结果 V1](../research/arena-v2-line-pressure-definition-prototype-results-v1.md) | 将直线压制编译为地面/空中临时 Definition，并绑定 11 个数值轴与等待/离线回应证据 | 研究原型通过 |
| [ADR-068：直线压制先以单一攻击线 Definition 验证](../decisions/068-arena-v2-line-pressure-definition-boundary.md) | 固化直线压制的单一攻击线、固定间隔、公开数值和 research-only 边界 | 原型边界已接入 |
| [ADR-069：命中反馈必须保留失败原因的因果区分](../decisions/069-arena-v2-hit-feedback-causal-contract.md) | 固化命中确认、支撑面转移、击落、避开攻击线和路线失误五种反馈语义 | KZ 无渲染反馈合同已接入 |
| [武器战斗语言最小原型结果 V1](../research/arena-v2-weapon-language-prototype-results-v1.md) | 记录直线压制、封路、延迟重击、读招反制和绕后的 Rule/Targeting/Effect 最小验证与回应时间 | 扩展武器原型证据 |
| [武器战斗语言 × KZ 地图后果原型结果 V1](../research/arena-v2-weapon-language-kz-consequence-results-v1.md) | 记录五种战斗语言在六段 KZ 表面上的击落、路线转移、前摇、有效窗口和固定回应后果 | 扩展武器×地图原型证据 |
| `arena-v2-warning-zone-prototype.ts` | 验证封路候选的公开标记位置、整数 tick 生命周期和到期，不实现持续伤害或新操作 | 第四轮武器状态原型证据 |
| [武器上下文无渲染原型结果 V1](../research/arena-v2-weapon-prototype-results-v1.md) | 记录三把武器地面/空中命中节奏、击飞差异和挥空边界 | 第一轮原型证据 |
| [武器地图边缘原型结果 V1](../research/arena-v2-weapon-map-prototype-results-v1.md) | 记录规则命中进入轻量物理后在宽平台、窄路和边缘的实际后果 | 第一轮地图交互证据 |
| [武器移动目标原型结果 V1](../research/arena-v2-weapon-moving-target-prototype-results-v1.md) | 记录固定侧移目标下前摇差异如何转化为命中/挥空 | 第一轮移动反制证据 |
| [武器攻击者失位与双人争夺原型结果 V1](../research/arena-v2-weapon-contest-prototype-results-v1.md) | 记录自身位移、空中命中和双人同时出招的规则后果 | 第一轮对战拥挤证据 |
| [CS1.6 KZ 跳跃地图研究 V1](../research/arena-v2-cs16-kz-map-study-v1.md) | 记录地图段落、六维难度轴、段落合同、灰盒可达性和竞速/生存复用边界 | 第二轮研究 + 灰盒原型 |
| [ADR-063：KZ 地图段落必须声明回应窗口与恢复关系](../decisions/063-arena-v2-kz-route-response-contract.md) | 固化段落可用回应、固定探针窗口和命中后恢复关系，避免地图只用宽度与难度描述 | KZ 灰盒合同已接入 |
| `arena-v2-kz-map-research-catalog.ts` | 四类代表 KZ 地图样本的学习点、来源和不复制边界，仅供开发/测试工具链使用 | 研究证据 |
| `arena-v2-kz-route-combat-prototype.ts` | 将六段 KZ 灰盒与同一套武器命中/冲量/移动回应规则组合，验证段落宽度、相邻恢复表面、侧移和跳跃对武器击飞后果的影响，仅供开发/测试工具链使用 | 第三轮地图×武器原型证据 |
| [生存 1vE 最小循环原型结果 V1](../research/arena-v2-survival-loop-prototype-results-v1.md) | 记录无武器开局、20 秒三选一、轮次成长、两次掉落和低维奖励证据 | 第一轮原型证据 |
| `arena-v2-survival-entity-prototype.ts` | 验证单一敌人复用玩家规则/物理、敌我双方击飞和第一次复活/第二次终局，仅供开发/测试工具链使用 | 第二轮规则原型证据 |
| `arena-v2-survival-pressure-prototype.ts` | 验证 1/2/4 同类敌人的有界自主追击、分阶段刷新、多人击飞压力、20 秒三武器供给争夺、等级专属武器 Definition 和 15/20/30 秒×两种路线分流矩阵，仅供开发/测试工具链使用 | 第六轮规则/武器原型证据 |
| `arena-v2-collection-budget-prototype.ts` | 将 200 小时拆为武器上下文、地图段落、模式记录和交叉挑战，并输出武器数量敏感性，仅供开发/测试工具链使用 | 第三轮成长原型证据 |
| `arena-v2-survival-weapon-definition.ts` | 将地面/空中公开数值、按武器核心语法选择的成长字段和等级专属 Action/Equipment ID 收敛为研究定义，仅供开发/测试工具链使用 | 第五轮武器 Definition 原型证据 |
| `arena-v2-survival-tier-combat-prototype.ts` | 通过等级专属 Definition 验证生存等级 1/5/10 在不增加按键的情况下实际改变三把武器的横向控制结果，仅供开发/测试工具链使用 | 第五轮武器数值原型证据 |
| [弹壳特攻队界面研究 V1](../research/arena-v2-survivor-io-ui-study-v1.md) | 记录局外信息层、页面职责、点击预算和收敛规则 | 第二轮研究 |
| [V2 武器可读性与长期留存验证计划 V1](../research/arena-v2-weapon-readability-retention-study-v1.md) | 定义 3 分钟操作、10 秒数值解释、KZ 归因和 30/60/120/200 小时真人验证任务 | 真人研究合同，尚无样本 |
| [战斗外界面原型验证结果 V1](../research/arena-v2-ui-prototype-results-v1.md) | 记录当前主页、武器概览、角色选择和进入对局链路验证 | 第一轮原型证据 |
| [局外信息原型结果 V1](../research/arena-v2-ui-information-prototype-results-v1.md) | 记录 11 个信息入口、四条关键流程和点击预算 | 第二轮信息架构原型 |
| `arena-v2-ui-information-prototype.ts` | 为 11 个局外页面声明必要信息、首屏最多三项、延后信息和点击预算，验证单一下一决策 | 第三轮信息层原型证据 |
| `arena-v2-ui-next-goal-prototype.ts` | 将收集、武器熟悉、地图熟悉和生存记录收敛为单一局外下一目标，仅供开发/测试工具链使用 | 第二轮信息架构证据 |
| [ADR-044：武器不做格挡与公开数值概览](../decisions/044-arena-v2-weapon-no-guard-and-public-overview.md) | 固化武器边界与数值展示来源 | V2 提案 |
| [ADR-045：武器上下文概览契约](../decisions/045-arena-v2-weapon-context-overview.md) | 固化主动作数值、地面/空中上下文与风险语义 | 表现原型已接入 |
| [ADR-046：武器概览先显示数值比较](../decisions/046-arena-weapon-overview-comparison-first.md) | 固化主页“先比较数值、再读武器语义”的信息顺序 | 当前主页已接入 |
| [ADR-053：武器概览明确数值方向语义](../decisions/053-arena-weapon-overview-direction-semantics.md) | 固化“越高/越低/风险”文字、条形图和比较尺度一致性，避免只靠箭头猜含义 | 当前主页展示收敛 |
| [ADR-055：武器上下文必须完整显示关键数值](../decisions/055-arena-v2-weapon-context-readout-completeness.md) | 固化地面/空中上下文的八项数值、标签和可访问解释 | 表现原型已接入 |
| [ADR-056：武器先按可学习的战斗语言扩展](../decisions/056-arena-v2-weapon-function-language-boundary.md) | 固化参考武器到 Arena 战斗语言的研究映射与新增武器评审边界 | 研究原型已接入 |
| [ADR-057：武器战斗语言必须通过地图后果验证](../decisions/057-arena-v2-weapon-language-map-consequence-boundary.md) | 固化六段 KZ 表面、三种回应和击退/支撑面证据作为武器候选评审门槛 | 研究原型已接入 |
| [ADR-058：V2 可读性与留存使用独立真人任务合同](../decisions/058-arena-v2-readability-retention-study-boundary.md) | 固化 3 分钟操作、数值解释、地图归因和 200 小时里程碑的独立验证边界 | 合同已建立，尚无真人样本 |
| `arena-v2-weapon-public-axis-contract.ts` | 检查参考战斗语言与生产基线语言依赖的数值是否已经在主概览、地面/空中上下文或研究字段中明确出现，阻止未公开轴进入正式武器卡 | 研究评审证据 |
| [ADR-059：战斗语言必须通过公开数值轴就绪检查](../decisions/059-arena-v2-weapon-public-axis-readiness-boundary.md) | 固化 9 个主数值、8 个上下文数值、2 个行为补充轴和 2 个研究专用未闭合轴的进入边界 | 研究评审已接入 |
| [ADR-060：绕后使用目标朝向判定，五种语言共用同一规则原型](../decisions/060-arena-v2-rear-cone-and-language-prototype-boundary.md) | 固化 `rear-cone`、五种语言统一 Rule/Effect/Targeting 原型和 90 个 KZ 探针边界 | 研究原型已接入 |
| [ADR-061：武器概览补充有效窗口与方向容错](../decisions/061-arena-v2-weapon-overview-behavior-readout.md) | 固化由权威调优推导的两项补充行为数值及其不进入主比较表的边界 | Product UI 已接入 |
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
