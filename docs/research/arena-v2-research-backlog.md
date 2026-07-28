# Arena V2 搜索与验证清单

## 文档状态

- 状态：初稿，持续更新
- 日期：2026-07-27
- 用途：把“参考学习”和“本项目结论”分开管理

## 研究规则

每项研究都必须区分：

1. 原参考对象实际做了什么；
2. 我们认为它为什么有效；
3. 哪个抽象规律适合 Arena；
4. 哪些内容明确不复制；
5. 如何通过最小原型验证。

## 优先级一：热血英豪武器研究

第一轮结果、第二轮动作矩阵和第三轮官方招式证据已记录在[热血英豪武器研究 V1](arena-v2-hot-blooded-weapon-study-v1.md)。12 件参考武器已经沉淀为结构化研究卡，并从魔血镰刃、幻虎巨拳、白金双枪、血刃和血影钩刃中抽取蓄力承诺、取消、方向、上下文、资源、陷阱持续和物理阻碍信号，见 `arena-v2-weapon-official-evidence.ts`。当前结论是建立 9 个可比较的公开数值，并额外完整展示地面/空中上下文；有效攻击窗口和方向容错已经进入独立行为补充区，延迟、预警和持续封路仍只属于研究状态。

### 目标

建立武器功能族和武器研究卡，不追求一次收集完整武器清单；当前第一批已完成 12 件参考武器卡，后续只在新证据改变功能族或最小版本时扩充。

### 第一轮输出

- 12 件代表性武器案例；
- 6 个基础功能族；
- 每件武器的核心动作、风险、地图用途和反制；
- 3 把现有武器的 Arena 最小版本；
- 3 把后续候选武器的最小原型方案。
- 地面/空中动作上下文矩阵；
- “越高越好”和“越高风险”分开的显示语义。
- 战斗语言公开轴就绪检查：冲入、换位、读招反制、直线压制和绕后已具备当前公开轴，封路和延迟重击仍需补齐延迟/预警字段；见[ADR-059](../decisions/059-arena-v2-weapon-public-axis-readiness-boundary.md)。五种扩展语言已经通过统一规则原型，绕后使用目标朝向判定；见[ADR-060](../decisions/060-arena-v2-rear-cone-and-language-prototype-boundary.md)。
- 武器卡已增加两项不扩张主比较表的补充行为数值：有效窗口和方向容错角；它们由权威调优投影，延迟、预警和持续区域效果仍保持研究状态，见[ADR-061](../decisions/061-arena-v2-weapon-overview-behavior-readout.md)。
- [x] 将 7 种参考战斗语言和 1 种生产基线“推离”收敛为结构化最小功能版本合同，并投影回 12 件研究卡及当前三把生产武器；合同只属于开发/测试工具链，不自动创建生产武器，见[武器最小功能版本合同 V1](arena-v2-weapon-minimum-version-contract-v1.md)、[ADR-064](../decisions/064-arena-v2-weapon-minimum-version-contract.md)和[ADR-065](../decisions/065-arena-v2-production-weapon-language-mapping.md)。
- [x] 将 8 种战斗语言收敛为 6 个首发候选位置：生产基线为冲入、推离、换位，研究候选为直线压制、读招反制、绕后；封路和延迟重击因延迟/预警公开轴未闭合暂缓，见[首发武器候选合同 V1](arena-v2-weapon-launch-candidate-contract-v1.md)和[ADR-066](../decisions/066-arena-v2-weapon-launch-candidate-selection.md)。
- [x] 将直线压制、读招反制、绕后三个研究候选编译为统一候选 Definition，补齐地面/空中数值、主概览 9 轴、行为 2 轴和等待/离开回应证据；见[首发研究候选 Definition 原型结果](arena-v2-launch-research-definition-prototype-results-v1.md)和[ADR-070](../decisions/070-arena-v2-research-launch-definition-projection.md)。
- [x] 将 10 组官方武器证据扩展为逐动作学习链，记录输入、地面/跑动/空中/蓄力/延迟/命中后上下文、可观察结果、地图意义和失败成本；见 `arena-v2-weapon-official-evidence.ts` 与[热血英豪武器研究 V1](arena-v2-hot-blooded-weapon-study-v1.md)。
- [x] 将五种候选武器的 Action/Equipment Definition 抽到 `arena-v1-content`，建立显式候选 Registry，并保持默认生产目录只有三把已验收武器；见[武器候选 Content Registry 结果](arena-v2-weapon-candidate-content-registry-results-v1.md)。
- [ ] 将三个候选 Definition 接入正式生产 Presentation 反馈事件、声音/特效和生产迁移证据，再评估是否进入默认生产目录；候选内容层已完成，但最终资产、设备与真人验收仍未完成。
- [x] 建立六个首发候选的五项生产迁移门禁，明确默认生产 Definition/注册、正式动作状态、候选专属 Replay、地图后果和反馈表现的独立证据；当前生产就绪为 0/6，不自动晋级，见[生产迁移门禁结果 V1](arena-v2-weapon-production-migration-gate-results-v1.md)和[ADR-074](../decisions/074-arena-v2-weapon-production-migration-gate.md)。
- [x] 将直线压制接入研究边界内的正式 `MatchCore + ActionExecutionSystem + MatchReplay` 链路，验证 `idle → windup → active → recovery`、tick 1 开始、tick 9 命中和二次最终 hash 一致；见 `arena-v2-weapon-launch-replay-prototype.ts` 与迁移门禁结果文档。
- [x] 将读招反制接入研究边界内的正式 `MatchCore + ActionExecutionSystem + MatchReplay` 链路，验证提前释放、达到承诺、到期取消、蓄力等级、可转向结果和三组最终 hash；见[读招反制承诺状态与 Replay 原型结果](arena-v2-weapon-read-punish-replay-results-v1.md)、[ADR-075](../decisions/075-arena-v2-action-commitment-state.md)与迁移门禁结果文档。
- [x] 将绕后接入研究边界内的正式 `MatchCore + ActionExecutionSystem + MatchReplay` 链路，验证目标保持背向命中、目标主动转身避开、active 前多次转身恢复命中、普通移动输入和三组最终 hash；见[绕后目标主动转身 Replay 原型结果](arena-v2-weapon-flank-replay-results-v1.md)与迁移门禁结果文档。
- [x] 将绕后补充侧向进入 Replay：攻击者从 rear-cone 外沿普通 `moveZ` 输入进入 active 前背后区域并命中，固定 hash 为 `ef8764cd`；见[绕后目标主动转身 Replay 原型结果](arena-v2-weapon-flank-replay-results-v1.md)。
- [x] 用内容层 5 个候选地面 Definition 的真实 targeting 参数建立多目标视线遮挡研究探针，覆盖单目标、同线近目标遮挡远目标和侧向进入三种场景；见[武器多目标视线遮挡研究原型结果](arena-v2-weapon-occlusion-research-prototype-results-v1.md)。
- [x] 将三个研究候选接入双人同时出招与窄平台边缘 Replay，验证直线压制击落、读招反制命中但未击落、绕后按目标朝向命中，并把真实 `HitResolved` 来源映射到 `WeaponFeedbackPresented`；见[研究武器双人拥挤与地图边缘 Replay 结果](arena-v2-weapon-multiplayer-edge-replay-results-v1.md)。
- [x] 将三个研究候选接入攻击/跳跃穿插 Replay：同 tick 保持武器与跳跃独立动作通道，空中攻击选择候选专属 aerial Definition 并进入 `down-smash`；见[武器攻击/跳跃穿插 Replay 原型结果](arena-v2-weapon-attack-jump-interleave-replay-results-v1.md)。
- [x] 将三个候选 Registry 候选投影为带标签、单位、方向语义和玩家含义的地面/空中双上下文 9 轴主概览 + 2 轴行为比较矩阵，保留核心动词、命中结果、地图空间和反制信息；见[研究武器概览比较矩阵原型结果](arena-v2-weapon-research-overview-prototype-results-v1.md)和[ADR-077](../decisions/077-arena-v2-research-overview-context-separation.md)。真人解释率仍未采集。
- [x] 审计三把生产基线的权威字段能否覆盖 11 个公开数值轴，并记录三个研究候选的结构缺口和迁移顺序；见[武器 Definition 迁移审计 V1](arena-v2-weapon-definition-migration-audit-v1.md)和[ADR-067](../decisions/067-arena-v2-weapon-definition-migration-boundary.md)。
- [x] 将直线压制编译为候选内容层的地面/空中 Definition 原型，并绑定 11 个数值轴与等待/离线回应证据；见[直线压制 Definition 原型结果 V1](arena-v2-line-pressure-definition-prototype-results-v1.md)和[ADR-068](../decisions/068-arena-v2-line-pressure-definition-boundary.md)。
- [x] 在 KZ 武器后果探针上增加命中确认、支撑面转移、击落、避开攻击线和路线失误五种因果反馈语义；见[武器战斗语言 × KZ 地图后果原型结果 V1](arena-v2-weapon-language-kz-consequence-results-v1.md)和[ADR-069](../decisions/069-arena-v2-hit-feedback-causal-contract.md)。
- [x] 将五种反馈语义接入正式 `WeaponFeedbackPresented` Presentation 事件，并复用事件窗口去重；见[ADR-071](../decisions/071-arena-v2-feedback-presentation-event-mapping.md)。
- [x] 将正式反馈事件接入 Three 灰盒冲击/警告效果、冲击镜头、震动和现有音频触发链；见[ADR-072](../decisions/072-arena-v2-feedback-presentation-three-consumption.md)。
- [x] 将六件逐动作深研案例接入研究概览适配层，区分必须实测的公共轴、仍属研究字段的轴和禁止伪造的玩家数值；六件现在均有独立研究 Definition、数值投影与专属 Replay，白金双枪不再复用直线压制通用动作身份；猛犸石斧的延迟/预警继续保持 `research-only`，没有伪造生产数值；见[深研武器概览适配层原型结果 V1](arena-v2-weapon-case-study-overview-prototype-results-v1.md)、[白金双枪 Definition 与 Replay 原型结果 V1](arena-v2-weapon-white-platinum-dual-guns-definition-and-replay-results-v1.md)与[ADR-080](../decisions/080-arena-v2-weapon-case-study-by-move.md)。
- [x] 将六件逐动作深研案例收敛为三步学习路径：先学核心动作、再学上下文转换、最后放进地图；每一步保留来源动作、失败代价和对应数值重点，仍保持研究提示而不新增生产奖励；见[深研武器概览适配层原型 V1](arena-v2-weapon-case-study-overview-prototype-results-v1.md)与[ADR-097](../decisions/097-arena-v2-weapon-learning-path-research-contract.md)。
- [x] 将六件逐动作深研案例各绑定一个主战斗语言：封路、换位、直线压制、绕后、读招反制、延迟重击；语言关键轴必须存在于案例数值审计，概览首屏同步显示语言与关键数值，仍保持 research-only；见[深研武器概览适配层原型 V1](arena-v2-weapon-case-study-overview-prototype-results-v1.md)、[ADR-099](../decisions/099-arena-v2-case-study-primary-combat-language.md)和 `arena-v2-weapon-case-study-language.ts`。
- [x] KZ 六段路线已补真实 Canvas 研究页：可切换竞速/生存、快线/恢复线、段落和入口/转折/出口攻击点；已完成 1280×720 与 390×844 本地浏览器验证，仍不代表多人/真人/生产地图；见 [ADR-100](../decisions/100-arena-v2-kz-route-canvas-study-boundary.md) 与 [KZ 路线真实画布研究页结果 V1](arena-v2-kz-map-study-page-results-v1.md)。
- [x] 将武器概览首屏增加四项同源快速数值（地面/空中距离、地面前摇、地面恢复），并在桌面/窄屏验证 6 张卡、24 个数值和无页面横向溢出；完整矩阵和研究信号保持不变；见[武器数值可读性任务原型结果 V1](arena-v2-weapon-readability-task-prototype-results-v1.md)与[研究页浏览器布局证据 V1](arena-v2-browser-layout-evidence-v1.md)。
- [x] 将幻虎巨拳建立为首个逐件 Definition 数值投影原型，补齐 9 项主轴、6 项地面/空中上下文轴和 2 项行为轴；数值标记为 `definition-projected-hypothesis`，未进入生产 UI。见[幻虎巨拳 Definition 数值投影原型结果 V1](arena-v2-weapon-phantom-tiger-fist-definition-prototype-results-v1.md)、[ADR-077](../decisions/077-arena-v2-research-overview-context-separation.md)和[ADR-080](../decisions/080-arena-v2-weapon-case-study-by-move.md)。
- [x] 将幻虎巨拳接入真实 `MatchCore + ActionExecutionSystem + MatchReplay`，验证提前释放、成功提交、到期取消和可观察蓄力等级；再用双人边缘平台 Replay 验证命中、位移、失去支撑面和淘汰反馈。见[幻虎巨拳 Replay 与地图边缘原型结果 V1](arena-v2-weapon-phantom-tiger-fist-replay-and-edge-results-v1.md)与[ADR-081](../decisions/081-arena-v2-phantom-tiger-fist-replay-and-map-consequence.md)。
- [x] 深研猛犸石斧：按延迟落斧、蓄力地面重击、滚动物体、跑动撞墙、猛犸公共危险和恢复物拆成六个动作单元，并接入官方证据集；见[猛犸石斧逐动作研究结果 V1](arena-v2-weapon-mammoth-stone-axe-case-study-results-v1.md)。
- [x] 验证猛犸石斧延迟落点的预警、有效窗口、路线躲避和高度躲避，并为命中/路线/高度建立不同反馈因果；研究 tick 不进入生产 Definition；见[猛犸石斧延迟落点原型结果 V1](arena-v2-weapon-mammoth-stone-axe-delay-prototype-results-v1.md)与[ADR-082](../decisions/082-arena-v2-mammoth-stone-axe-delay-boundary.md)。
- [x] 将预警区从瞬时 `active` 扩展为可选 `lingering` 阶段，使用同一研究运行时对照魔血镰刃持续封路与猛犸石斧瞬时延迟重击；6 个固定探针通过，叠加、刷新、多人和真人仍未验证；见[武器持续封路原型结果 V1](arena-v2-weapon-persistent-zone-prototype-results-v1.md)与[ADR-092](../decisions/092-arena-v2-persistent-zone-lifecycle.md)。
- [ ] 绑定最终声音/特效资产并完成目标设备可读性、低动效和真人反馈测试；当前没有真机证据。
- [x] 新增命中反馈因果研究工作台：用 90 个真实 KZ 探针选出命中确认、支撑面转移、击落、攻击被避开和路线失误五类代表样本，投影为 `WeaponFeedbackPresented` 的视觉/音频 Cue，并提供可交互判断和 JSON 导出；仅研究工具链，真机、真人、多人和最终资产仍待验证，见[命中反馈因果研究工作台结果 V1](arena-v2-weapon-feedback-study-results-v1.md)和[ADR-102](../decisions/102-arena-v2-weapon-feedback-study-boundary.md)。
- [x] 将 `WeaponFeedbackPresented` 的权威标题/解释接入 Three HUD 短时提示；提示只消费事件、不重判命中原因，过期隐藏，仍不替代最终声音/特效与真人验证。
- [x] 为五类反馈固定候选视觉、音频和低动效资产 ID，并把最终资产、设备和真人验收保持为显式阻塞；见[命中反馈候选资产合同结果 V1](arena-v2-weapon-feedback-asset-candidate-contract-results-v1.md)和[ADR-105](../decisions/105-arena-v2-weapon-feedback-asset-candidate-contract.md)。
- [x] 将六件热血英豪逐动作案例收敛为动作身份、承诺时间、空间条件、命中后果、失败成本、反制与反馈六项武器独立性门槛，并明确公共数值轴与研究字段边界；见[热血英豪武器研究综合与设计收敛 V1](../gameplay/arena-v2-hot-blooded-weapon-design-synthesis.md)和[ADR-106](../decisions/106-arena-v2-weapon-value-chain-synthesis.md)。

### 需要回答

- 武器的独立性来自动作、命中结果还是地图关系？
- 哪些复杂效果可以删掉而不损失核心乐趣？
- 哪些武器依赖角色/职业组合，不能直接迁移？
- 哪些武器适合 1v1，哪些适合生存？

当前新增证据：规则层横向冲量已经接入轻量物理，在宽平台、KZ 灰盒窄路和边缘平台形成不同的“命中但安全 / 命中后出界”结果；固定侧移目标又验证了重锤挥空、锁链和冲锋盾命中的前摇差异；攻击者失位、空中动作和双人同时出招也已经通过当前规则/物理链路形成可重复结果；本轮又把八项上下文数值完整投影到 DOM 与 Canvas，并显示覆盖宽度、方向容错和垂直命中边界；12 件参考武器已由结构化映射归并为 7 种参考战斗语言，生产基线另补齐“推离”；直线压制、封路、延迟重击、读招反制和绕后又通过研究 ActionDefinition 完成 8/24/30/24/10 tick 回应时间、有效窗口和目标朝向对照，并在六段 KZ 灰盒上完成 90 个“语言×表面×固定回应”探针，其中直线压制、读招反制和绕后已进一步收敛为内容层显式候选 Registry；读招反制又通过统一动作状态和三组 MatchReplay 验证承诺/取消/提交语义；三个研究候选又通过真实双人同时出招与窄平台 Replay 验证命中/击落差异，并将真实 `HitResolved` 来源映射到 `WeaponFeedbackPresented`；随后又验证同 tick 攻击/跳跃独立通道和空中专属下砸动作，补齐侧向进入 Replay 与多目标遮挡研究探针。详见[武器战斗语言最小原型结果](arena-v2-weapon-language-prototype-results-v1.md)、[武器战斗语言 × KZ 地图后果原型结果](arena-v2-weapon-language-kz-consequence-results-v1.md)、[读招反制承诺状态与 Replay 原型结果](arena-v2-weapon-read-punish-replay-results-v1.md)、[研究武器双人拥挤与地图边缘 Replay 结果](arena-v2-weapon-multiplayer-edge-replay-results-v1.md)、[武器攻击/跳跃穿插 Replay 原型结果](arena-v2-weapon-attack-jump-interleave-replay-results-v1.md)、[绕后目标主动转身 Replay 原型结果](arena-v2-weapon-flank-replay-results-v1.md)和[武器多目标视线遮挡研究原型结果](arena-v2-weapon-occlusion-research-prototype-results-v1.md)。详见[ADR-056](../decisions/056-arena-v2-weapon-function-language-boundary.md)、[ADR-057](../decisions/057-arena-v2-weapon-language-map-consequence-boundary.md)、[ADR-060](../decisions/060-arena-v2-rear-cone-and-language-prototype-boundary.md)、[ADR-065](../decisions/065-arena-v2-production-weapon-language-mapping.md)、[ADR-075](../decisions/075-arena-v2-action-commitment-state.md)、[ADR-076](../decisions/076-arena-v2-multi-target-visibility-feedback-boundary.md)、[武器地图边缘原型结果](arena-v2-weapon-map-prototype-results-v1.md)、[武器移动目标原型结果](arena-v2-weapon-moving-target-prototype-results-v1.md)和[武器攻击者失位与双人争夺原型结果](arena-v2-weapon-contest-prototype-results-v1.md)。下一步转向分叉路线/重入观察负担、持续封路状态、最终表现资产和真人可读性验证；不把研究探针当成三人或网络多人已完成。

## 优先级二：CS 1.6 跳跃/KZ 地图研究

第一轮结果和第二轮段落合同已记录在 [CS1.6 KZ 跳跃地图研究 V1](arena-v2-cs16-kz-map-study-v1.md)。当前结论是：使用段落化路线、六维难度轴和段落验收合同，竞速与生存共用地图基座，但生存不设置终点。

### 目标

学习路线结构和空间难度，不复制地图布局。

### 研究维度

- 跳跃节奏；
- 断层与落点；
- 迷宫和路线分叉；
- 窄路、楼梯和走钢丝；
- 玩家失败后的重新进入；
- 如何让路线难但不改变基础按键。

### 已完成的原型证据

- 六段路线已经映射到自有矩形 surface，并通过轻量物理完成固定输入可达性验证；
- 结果为 6/6 段完成、310 tick、最大滞空 36 tick；
- 该结果只证明几何可行，不替代真人可读性、带攻击场景和真机验证。
- 武器地图边缘探针已经复用 KZ 灰盒窄路，证明不同横向冲量会产生不同出界结果；见[武器地图边缘原型结果](arena-v2-weapon-map-prototype-results-v1.md)。

### 输出

- 路线模块库；
- 地图难度分层；
- 生存地图的安全区、危险区和敌人压力点；
- 竞速地图基座与生存规则的分离说明。

当前新增证据：六类代表 KZ 地图样本已经形成结构化研究卡，新增记录来源明确公布的难度、路线长度和检查点事实，分别覆盖长跳练习、长路线检查点、垂直攀爬恢复、混合移动标签、连续 Bhop 节奏和短路线垂直入门；六段灰盒又通过同一套 Rule/Physics 武器攻击探针完成 18 个段落×武器组合，并以 10 tick 侧移和一次正式起跳扩展为 54 个响应组合，证明同一把武器在宽平台、迷宫、窄路和走钢丝上的后果不同；五种候选战斗语言进一步完成 90 个“语言×表面×固定回应”探针，证明前摇、有效窗口、目标朝向、横向冲量和支撑面会共同改变击落与路线转移结果；封路候选又补上公开标记位置和 24–26 tick 有效、27 tick 到期的最小状态；详见[CS1.6 KZ 跳跃地图研究 V1](arena-v2-cs16-kz-map-study-v1.md)、[武器战斗语言 × KZ 地图后果原型结果 V1](arena-v2-weapon-language-kz-consequence-results-v1.md)、`arena-v2-kz-map-research-catalog.ts`、`arena-v2-kz-route-combat-prototype.ts` 和 `arena-v2-kz-language-consequence-prototype.ts`。下一步仍需加入真人视野、移动方向选择、目标主动转身、区域内实际影响和复活重新进入路线验证，不引入第三方地图资产。
当前新增证据：六类代表 KZ 地图样本已经形成结构化研究卡，新增记录来源明确公布的难度、路线长度和检查点事实，分别覆盖长跳练习、长路线检查点、垂直攀爬恢复、混合移动标签、连续 Bhop 节奏和短路线垂直入门；六段灰盒又通过同一套 Rule/Physics 武器攻击探针完成 18 个段落×武器组合，并以 10 tick 侧移和一次正式起跳扩展为 54 个响应组合，证明同一把武器在宽平台、迷宫、窄路和走钢丝上的后果不同；五种候选战斗语言进一步完成 90 个“语言×表面×固定回应”探针，证明前摇、有效窗口、目标朝向、横向冲量和支撑面会共同改变击落与路线转移结果；封路候选又补上公开标记位置和 24–26 tick 有效、27 tick 到期的最小状态；本轮又把迷宫/走钢丝的 choice 段收敛为 4 个可观察分叉，公开路线 tick、战斗暴露窗口和 3 秒复活后的段落/锚点重入标签；详见[CS1.6 KZ 跳跃地图研究 V1](arena-v2-cs16-kz-map-study-v1.md)、[KZ 分叉路线与复活重入观察原型结果 V1](arena-v2-kz-route-choice-reentry-results-v1.md)、[武器战斗语言 × KZ 地图后果原型结果 V1](arena-v2-weapon-language-kz-consequence-results-v1.md)、`arena-v2-kz-map-research-catalog.ts`、`arena-v2-kz-route-combat-prototype.ts` 和 `arena-v2-kz-route-choice-return-prototype.ts`。下一步仍需加入真人视野、移动方向选择、目标主动转身、区域内实际影响和多人复活路线验证，不引入第三方地图资产。
当前新增证据：前述 54 个矩阵已扩展为五种语言共 90 个“语言×表面×固定回应”探针，并额外验证读招反制的有效窗口和绕后的目标朝向条件；固定结果见[武器战斗语言 × KZ 地图后果原型结果 V1](arena-v2-weapon-language-kz-consequence-results-v1.md)。

当前新增证据：四条 KZ 分叉已经从研究 `waypoints` 转为独立灰盒 surface，并通过真实 `PhysicsWorld + MovementSystem` 完成单人路线；迷宫低位/高位分别实测 76/151 tick，走钢丝中线/边线分别实测 154/81 tick，证明“更安全但更慢”的路线交换已经出现在物理结果中，而不是只存在于 `routeTicks` 设计假设；随后又用 390×844 与 844×390 的正交视锥检查选择/重入时两条路线的首屏可见性，8 个场景通过，但走钢丝纵向最小余量只有 0.066；本轮再将五种战斗语言、三种固定回应接入四条分叉的入口/转折/出口，共 180 个 Rule/Action/Physics 探针，低位直行、高位恢复线、中线稳定和边线抢时在不同阶段分别出现不同的击落、支撑面转移和路线失误比例，证明武器价值会随路线阶段变化；见[KZ 分叉路线独立灰盒结果 V1](arena-v2-kz-branch-greybox-results-v1.md)、[KZ 分叉路线镜头观察结果 V1](arena-v2-kz-branch-camera-observation-results-v1.md)、[KZ 分叉路线 × 武器后果原型结果 V1](arena-v2-kz-branch-weapon-consequence-results-v1.md)、[ADR-098](../decisions/098-arena-v2-kz-weapon-attack-points.md)、`arena-v2-kz-branch-greybox-prototype.ts`、`arena-v2-kz-branch-camera-observation-prototype.ts` 和 `arena-v2-kz-branch-weapon-consequence-prototype.ts`。下一步是接入真实画布与多人拥挤，再做真人路线选择任务。

- [x] 将四条分叉的中段 surface 接入 2/3/4 人拥挤探针，覆盖五种武器语言，记录估算并排容量、多目标命中、逐目标击落/支撑面转移/闪避和 180 tick 重入合同；60 个 Rule/Targeting/Physics 探针通过，其中 37 个出现多目标命中，仍不代表竞速胜负、网络多人或真人可读性，见[KZ 多人拥挤研究原型结果 V1](arena-v2-kz-multiplayer-crowding-results-v1.md)和[ADR-103](../decisions/103-arena-v2-kz-multiplayer-crowding-boundary.md)。下一步仍需接入真实竞速状态机、目标身份 Cue 和真人路线选择任务。

- [x] 将共享六段路线输入接入 2/3/4 人本地竞速流程，覆盖 60 tick 倒计时、终点 winner、冲锋盾攻击尝试、真实掉落和 180 tick 最近安全位置重生；6 个 Rule/Movement/Physics 探针通过，攻击结果保留未命中、多目标命中和命中后掉落差异，仍不代表网络竞速、真人公平性或生产 MatchMode，见[KZ 2–4 人竞速流程研究结果 V1](arena-v2-kz-race-multiplayer-results-v1.md)和[ADR-104](../decisions/104-arena-v2-kz-race-multiplayer-contract.md)。下一步是竞速 HUD/目标身份 Cue、真机和真人验证。

当前新增证据：已开始逐件武器研究，魔血镰刃按中距离魔轮、脚下陷阱、急停背后、空中短按/长按、跑动三档蓄力和地面突起拆成 7 个动作单元；真·哈迪斯钩镰又按基础浮空、跑动横切、触地反弹、非致死蓄力、多阶段浮空和原作反击证据拆成 7 个动作单元；白金双枪再按地面点射、跑动前后射击、空中斜线、空中横向弹幕、跑动扇形和有限资源回补拆成 7 个动作单元；血影钩刃按地面拉近、跑动投掷、空中拘束/投掷、远端回收、目标朝向分支和正面击退拆成 9 个动作单元；幻虎巨拳再按地面连段、跑动重拳、架招证据、可转向蓄力冲入、跑动闪避、空中高度分支和低/高承诺反击拆成 8 个动作单元；猛犸石斧再按延迟落斧、蓄力地面重击、滚动物体、跑动撞墙、公共危险和恢复物拆成 6 个动作单元，并用独立预警区探针验证延迟落点的路线/高度躲避。六件武器共用逐件研究合同，魔血镰刃与猛犸石斧均已补地面/空中 Definition、公共数值投影和路线 Replay，六件案例全部接入研究概览适配层。见 `arena-v2-weapon-case-study-contract.ts`、`arena-v2-weapon-magic-blood-scythe-case-study.ts`、`arena-v2-weapon-magic-blood-scythe-definition-prototype.ts`、`arena-v2-weapon-magic-blood-scythe-replay-prototype.ts`、`arena-v2-weapon-true-hades-hook-scythe-case-study.ts`、`arena-v2-weapon-white-platinum-dual-guns-case-study.ts`、`arena-v2-weapon-blood-shadow-hook-blade-case-study.ts`、`arena-v2-weapon-phantom-tiger-fist-case-study.ts`、`arena-v2-weapon-mammoth-stone-axe-case-study.ts`、`arena-v2-weapon-mammoth-stone-axe-definition-prototype.ts`、`arena-v2-weapon-mammoth-stone-axe-replay-prototype.ts`、`arena-v2-weapon-mammoth-stone-axe-delay-prototype.ts`、[魔血镰刃 Definition 与路线 Replay 原型结果 V1](arena-v2-weapon-magic-blood-scythe-definition-and-replay-results-v1.md)、[猛犸石斧 Definition 与预判落点 Replay 原型结果 V1](arena-v2-weapon-mammoth-stone-axe-definition-and-replay-results-v1.md)、[猛犸石斧延迟落点原型结果 V1](arena-v2-weapon-mammoth-stone-axe-delay-prototype-results-v1.md)、[热血英豪武器研究 V1](arena-v2-hot-blooded-weapon-study-v1.md)和[ADR-080](../decisions/080-arena-v2-weapon-case-study-by-move.md)。六件案例仍不等于全武器研究完成。

## 优先级三：弹壳特攻队局外信息架构研究

第一轮至第四轮结果已记录在[弹壳特攻队界面研究 V1](arena-v2-survivor-io-ui-study-v1.md)与[弹壳特攻队局外界面研究结果 V2](arena-v2-survivor-io-ui-research-results-v2.md)。当前结论是：先把武器索引放入主页验证阅读行为，再决定是否拆独立武器库页面；11 个入口只作为信息职责，不引入 11 套复杂系统；1v1 与竞速共用竞技准备模板。

### 目标

学习页面如何让玩家快速知道“现在能做什么、我收集了什么、下一步是什么”。

### 不研究的内容

- 不复制宠物、科技、部件、复杂装备和多货币系统；
- 不因为页面上存在某个入口，就把对应系统加入 Arena。

### 输出

- 首页信息层级；
- 模式入口组织；
- 收藏卡片结构；
- 结算到再次开始的路径；
- Arena 页面最小信息集。

### 已完成的原型证据

- 生存最小循环已完成无渲染原型：开局无武器、每 20 秒 3 把候选、10 轮临时等级成长、敌人压力增加、第一次复活/第二次结束；
- 结果和未完成边界见[生存 1vE 最小循环原型结果](arena-v2-survival-loop-prototype-results-v1.md)。
- 11 个局外信息入口和关键点击预算已形成无渲染合同；见[局外信息原型结果](arena-v2-ui-information-prototype-results-v1.md)。
- 11 个入口合同已与界面地图对齐：包含加载页、移除独立 `race-prep`，并用 `match-prep.supportedModes` 表达 1v1/竞速模板复用；见[弹壳特攻队局外界面研究结果 V2](arena-v2-survivor-io-ui-research-results-v2.md)和[ADR-073](../decisions/073-arena-v2-ui-eleven-page-contract.md)。
- [x] 11 个页面合同已增加统一布局草图：当前目标、最多三项首屏信息、一个主动作和四类长期入口；390×844 浏览器验证无横向溢出，仍不代表真机/真人结论；见[弹壳特攻队参考的局外布局预览结果 V1](arena-v2-survivor-io-ui-surface-results-v1.md)和[ADR-101](../decisions/101-arena-v2-survivor-ui-common-layout-boundary.md)。
- [x] 将官方商店页、Google Play 页、官方生存指南和版本记录拆成四张结构化界面证据卡，分离来源事实、信息组织推导、Arena 最小翻译和不复制范围；见 `arena-v2-survivor-io-ui-evidence.ts`、[弹壳特攻队界面研究 V1](arena-v2-survivor-io-ui-study-v1.md)和[ADR-079](../decisions/079-arena-v2-survivor-io-ui-evidence-boundary.md)。
- 局外下一目标已形成无渲染合同：只显示一个目标，并按武器收集 → 武器上下文 → 地图段落 → 生存记录的顺序给出立即行动；实现见 `arena-v2-ui-next-goal-prototype.ts`，真人点击和留存效果仍未验证。
- 武器概览已将公开数值比较矩阵提升到武器语义卡之前，并用三把武器的 DOM 同屏证据验证距离差异和自身位移风险；本轮又把“越高/越低/风险”从箭头约定收敛为文字图例、可访问标签、反向有利度条和同尺度校验，详见[ADR-046](../decisions/046-arena-weapon-overview-comparison-first.md)与[ADR-053](../decisions/053-arena-weapon-overview-direction-semantics.md)。真机阅读率和数值解释正确率仍待验证。
- 生存实体原型已验证单一 `enemy-1` 与玩家共享 Rule/Physics、敌人可被击落、玩家第一次掉落复活且第二次终局；多敌压力原型进一步验证了 1/2/4 个同类敌人的有界追击、出招、供给争夺、等级专属 Definition 和同屏压力峰值。详见[生存实体与掉落原型结果](arena-v2-survival-loop-prototype-results-v1.md#5-单敌人实体与掉落闭环验证)和[多敌压力原型结果](arena-v2-survival-loop-prototype-results-v1.md#6-多敌自主压力与武器争夺原型验证)。当前反例是 50 秒内所有敌人都被击落、玩家只掉落一次，说明敌人数和等级接通都不能直接当作难度曲线；下一步要验证刷新节奏、分流/拥挤、AI 行为阶段和后期压力可读性。

本轮新增 Product 数值差异事实：从同源主数值比较中派生唯一极值的优势/代价，每张卡最多两条，保留原始值和单位且不计算综合评分；Web 卡片已通过定向模型和语义 DOM 验证。结果见[Product 武器数值差异事实原型结果 V1](arena-v2-product-weapon-comparison-facts-v1.md)与[ADR-093](../decisions/093-arena-v2-weapon-comparison-facts.md)，真人理解率和实体设备仍待验证。

本轮新增 Product 场景差异事实：从同源地面/空中比较行派生唯一极值，每张卡最多两条并保留上下文 ID、原始值和单位；Web 卡片已接入场景事实，完整矩阵和 Canvas 比较表继续保留。结果见[Product 武器数值差异事实原型结果 V1](arena-v2-product-weapon-comparison-facts-v1.md)与[ADR-095](../decisions/095-arena-v2-weapon-context-comparison-facts.md)，真人理解率、真机密度和多语言仍待验证。

### 新增：生存压力与 200 小时目标的硬缺口

- [x] 在研究冲量端口验证 Offer 等级会实际改变横向控制结果，且不增加操作按键；结果见[生存临时武器等级原型](arena-v2-survival-loop-prototype-results-v1.md#7-生存临时武器等级实际战斗原型)。这是第一阶段证据。
- [x] 把研究端等级作用收敛为可回放、可比较的正式战斗 Definition 版本，不直接修改局外收藏属性；已分别声明重锤目标横向控制、锁链目标换位控制和冲锋盾目标接触控制，并保留冲锋盾自身位移风险。详见[ADR-051](../decisions/051-arena-v2-survival-tier-formal-definition.md)。
- [x] 用正式 Definition 版本复测 15/20/30 秒三组敌人供给节奏和 split/compressed 两组路线分流布局；结果显示交互数量会变，但六组都没有第二次掉落，说明压力曲线仍未成立。详见[生存压力矩阵结果](arena-v2-survival-loop-prototype-results-v1.md#61-刷新节奏与路线分流矩阵)。
- [x] 用同一敌人族和同一套战斗规则加入 `all-at-start` / `staged` 刷新对照；分阶段版本在 4 敌人场景于 27.08 秒触发第二次掉落，证明刷新阶段会改变压力曲线，但还不能直接作为最终平衡。详见[生存分阶段刷新结果](arena-v2-survival-loop-prototype-results-v1.md#62-同类敌人分阶段刷新对照)。
- [x] 建立 200 小时收集候选验证表：20 个候选武器研究位、6 类武器证据、12 个地图段落、3 个模式记录和 16 组交叉挑战；结果见[200 小时收集容量原型](arena-v2-collection-budget-prototype-results-v1.md)。这只是预算基线，真人首见时间、完成率和最终武器数仍未验证。
- [ ] 用真人数据复核 200 小时预算：记录武器首见时间、上下文完成率、重复进入率、地图/模式交叉使用率和 30/60/120/200 小时的主动目标，不以简单重复掉落充数。
- [ ] 在真人测试中记录 3 分钟基础操作掌握、20 秒供给选择、第一次掉落后的再次开始和 30/60/120 分钟后的主动目标。
- [x] 将上述真人问题写成独立 V2 任务合同，区分工程原型、数值解释率、地图失败归因和长期里程碑；见[V2 武器可读性与长期留存验证计划](arena-v2-weapon-readability-retention-study-v1.md)和[ADR-058](../decisions/058-arena-v2-readability-retention-study-boundary.md)。合同已建立，但真人样本仍为空。

## 优先级四：命中反馈与留存验证

### 需要验证

- 新玩家是否能解释一次命中结果；
- 玩家是否能分辨不同武器的核心用途；
- 被击飞后是否知道失败原因；
- 生存模式结束后是否知道下一次要尝试什么；
- 收藏进度是否能让玩家主动选择下一局目标。

### 建议指标

- 基础操作理解时间；
- 命中结果解释正确率；
- 武器识别正确率；
- 首局完成率；
- 首次失败后的再次开始率；
- 武器尝试数量；
- 不同地图的重复进入率；
- 1v1 与生存模式之间的交叉游玩率。

## 研究完成标准

研究不能只形成文字总结。每个重要结论至少要有以下一种证据：

- 原始视频/官方资料观察；
- 可复现的最小规则原型；
- 无渲染模拟结果；
- 真人试玩记录；
- 明确的反例和不采用理由。

## 第一批资料入口

- [热血英豪官方武器指南](https://bfo.web.sdo.com/web4/guide/wuqi.asp)
- [热血英豪公开介绍](https://zh.wikipedia.org/wiki/热血英豪)
- [KZ 地图难度标准](https://kz-rush.com/en/article/map-difficulty-criterias)
- [CS 1.6 KZ 地图与计时/检查点说明](https://steamcommunity.com/sharedfiles/filedetails/?id=3272385460)
- [弹壳特攻队 App Store 页面](https://apps.apple.com/cn/app/%E5%BC%B9%E5%A3%B3%E7%89%B9%E6%94%BB%E9%98%9F/id1628270358)
