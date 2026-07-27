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

第一轮结果、第二轮动作矩阵和第三轮官方招式证据已记录在[热血英豪武器研究 V1](arena-v2-hot-blooded-weapon-study-v1.md)。12 件参考武器已经沉淀为结构化研究卡，并从魔血镰刃、幻虎巨拳、白金双枪、血刃和血影钩刃中抽取蓄力承诺、取消、方向、上下文、资源、陷阱持续和物理阻碍信号，见 `arena-v2-weapon-official-evidence.ts`。当前结论是建立 9 个可比较的公开数值，并额外完整展示地面/空中上下文；有效攻击窗口和方向容错已经进入独立行为补充区，延迟和预警仍保持研究状态。

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
- 武器卡已增加两项不扩张主比较表的补充行为数值：有效窗口和方向容错角；它们由权威调优投影，延迟、预警和连续区域效果仍保持研究状态，见[ADR-061](../decisions/061-arena-v2-weapon-overview-behavior-readout.md)。
- [x] 将 7 种参考战斗语言和 1 种生产基线“推离”收敛为结构化最小功能版本合同，并投影回 12 件研究卡及当前三把生产武器；合同只属于开发/测试工具链，不自动创建生产武器，见[武器最小功能版本合同 V1](arena-v2-weapon-minimum-version-contract-v1.md)、[ADR-064](../decisions/064-arena-v2-weapon-minimum-version-contract.md)和[ADR-065](../decisions/065-arena-v2-production-weapon-language-mapping.md)。
- [x] 将 8 种战斗语言收敛为 6 个首发候选位置：生产基线为冲入、推离、换位，研究候选为直线压制、读招反制、绕后；封路和延迟重击因延迟/预警公开轴未闭合暂缓，见[首发武器候选合同 V1](arena-v2-weapon-launch-candidate-contract-v1.md)和[ADR-066](../decisions/066-arena-v2-weapon-launch-candidate-selection.md)。
- [x] 将直线压制、读招反制、绕后三个研究候选编译为统一候选 Definition，补齐地面/空中数值、主概览 9 轴、行为 2 轴和等待/离开回应证据；见[首发研究候选 Definition 原型结果](arena-v2-launch-research-definition-prototype-results-v1.md)和[ADR-070](../decisions/070-arena-v2-research-launch-definition-projection.md)。
- [x] 将 9 组官方武器证据扩展为逐动作学习链，记录输入、地面/跑动/空中/蓄力/延迟/命中后上下文、可观察结果、地图意义和失败成本；见 `arena-v2-weapon-official-evidence.ts` 与[热血英豪武器研究 V1](arena-v2-hot-blooded-weapon-study-v1.md)。
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
- [x] 将五件逐动作深研案例接入研究概览适配层，区分必须实测的公共轴、仍属研究字段的轴和禁止伪造的玩家数值；见[深研武器概览适配层原型结果 V1](arena-v2-weapon-case-study-overview-prototype-results-v1.md)与[ADR-080](../decisions/080-arena-v2-weapon-case-study-by-move.md)。
- [x] 将幻虎巨拳建立为首个逐件 Definition 数值投影原型，补齐 9 项主轴、6 项地面/空中上下文轴和 2 项行为轴；数值标记为 `definition-projected-hypothesis`，未进入生产 UI。见[幻虎巨拳 Definition 数值投影原型结果 V1](arena-v2-weapon-phantom-tiger-fist-definition-prototype-results-v1.md)、[ADR-077](../decisions/077-arena-v2-research-overview-context-separation.md)和[ADR-080](../decisions/080-arena-v2-weapon-case-study-by-move.md)。
- [x] 将幻虎巨拳接入真实 `MatchCore + ActionExecutionSystem + MatchReplay`，验证提前释放、成功提交、到期取消和可观察蓄力等级；再用双人边缘平台 Replay 验证命中、位移、失去支撑面和淘汰反馈。见[幻虎巨拳 Replay 与地图边缘原型结果 V1](arena-v2-weapon-phantom-tiger-fist-replay-and-edge-results-v1.md)与[ADR-081](../decisions/081-arena-v2-phantom-tiger-fist-replay-and-map-consequence.md)。
- [ ] 绑定最终声音/特效资产并完成目标设备可读性、低动效和真人反馈测试；当前没有真机证据。

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
当前新增证据：前述 54 个矩阵已扩展为五种语言共 90 个“语言×表面×固定回应”探针，并额外验证读招反制的有效窗口和绕后的目标朝向条件；固定结果见[武器战斗语言 × KZ 地图后果原型结果 V1](arena-v2-weapon-language-kz-consequence-results-v1.md)。

当前新增证据：已开始逐件武器研究，魔血镰刃按中距离魔轮、脚下陷阱、急停背后、空中短按/长按、跑动三档蓄力和地面突起拆成 7 个动作单元；真·哈迪斯钩镰又按基础浮空、跑动横切、触地反弹、非致死蓄力、多阶段浮空和原作反击证据拆成 7 个动作单元；白金双枪再按地面点射、跑动前后射击、空中斜线、空中横向弹幕、跑动扇形和有限资源回补拆成 7 个动作单元；血影钩刃按地面拉近、跑动投掷、空中拘束/投掷、远端回收、目标朝向分支和正面击退拆成 9 个动作单元；幻虎巨拳再按地面连段、跑动重拳、架招证据、可转向蓄力冲入、跑动闪避、空中高度分支和低/高承诺反击拆成 8 个动作单元。五件武器共用逐件研究合同，分别记录官方事实、设计推导、玩家决策、反制、失败成本和必须公开的数值轴。见 `arena-v2-weapon-case-study-contract.ts`、`arena-v2-weapon-magic-blood-scythe-case-study.ts`、`arena-v2-weapon-true-hades-hook-scythe-case-study.ts`、`arena-v2-weapon-white-platinum-dual-guns-case-study.ts`、`arena-v2-weapon-blood-shadow-hook-blade-case-study.ts`、`arena-v2-weapon-phantom-tiger-fist-case-study.ts`、[热血英豪武器研究 V1](arena-v2-hot-blooded-weapon-study-v1.md)和[ADR-080](../decisions/080-arena-v2-weapon-case-study-by-move.md)。下一件继续选择具有不同空间语言的武器，不把五件案例视为全武器研究完成。
当前新增证据：已开始逐件武器研究，魔血镰刃按中距离魔轮、脚下陷阱、急停背后、空中短按/长按、跑动三档蓄力和地面突起拆成 7 个动作单元；真·哈迪斯钩镰又按基础浮空、跑动横切、触地反弹、非致死蓄力、多阶段浮空和原作反击证据拆成 7 个动作单元；白金双枪再按地面点射、跑动前后射击、空中斜线、空中横向弹幕、跑动扇形和有限资源回补拆成 7 个动作单元；血影钩刃按地面拉近、跑动投掷、空中拘束/投掷、远端回收、目标朝向分支和正面击退拆成 9 个动作单元，并新增无遮挡、柱体阻挡、侧向错开和边角路线 4 个确定性障碍探针；幻虎巨拳按地面连段、跑动重拳、可转向蓄力冲入、跑动闪避、空中高度分支和低/高承诺反击拆成 8 个动作单元。五件武器共用逐件研究合同，分别记录官方事实、设计推导、玩家决策、反制、失败成本和必须公开的数值轴；障碍依赖和格挡/破防仍是研究字段，未进入生产概览。见 `arena-v2-weapon-case-study-contract.ts`、`arena-v2-weapon-magic-blood-scythe-case-study.ts`、`arena-v2-weapon-true-hades-hook-scythe-case-study.ts`、`arena-v2-weapon-white-platinum-dual-guns-case-study.ts`、`arena-v2-weapon-blood-shadow-hook-blade-case-study.ts`、`arena-v2-weapon-phantom-tiger-fist-case-study.ts`、`arena-v2-weapon-hook-obstruction-prototype.ts`、[血影钩刃障碍阻挡原型结果 V1](arena-v2-weapon-hook-obstruction-prototype-results-v1.md)、[热血英豪武器研究 V1](arena-v2-hot-blooded-weapon-study-v1.md)和[ADR-080](../decisions/080-arena-v2-weapon-case-study-by-move.md)。下一件继续选择具有不同空间语言的武器，不把五件案例视为全武器研究完成。

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
- [x] 将官方商店页、Google Play 页、官方生存指南和版本记录拆成四张结构化界面证据卡，分离来源事实、信息组织推导、Arena 最小翻译和不复制范围；见 `arena-v2-survivor-io-ui-evidence.ts`、[弹壳特攻队界面研究 V1](arena-v2-survivor-io-ui-study-v1.md)和[ADR-079](../decisions/079-arena-v2-survivor-io-ui-evidence-boundary.md)。
- 局外下一目标已形成无渲染合同：只显示一个目标，并按武器收集 → 武器上下文 → 地图段落 → 生存记录的顺序给出立即行动；实现见 `arena-v2-ui-next-goal-prototype.ts`，真人点击和留存效果仍未验证。
- 武器概览已将公开数值比较矩阵提升到武器语义卡之前，并用三把武器的 DOM 同屏证据验证距离差异和自身位移风险；本轮又把“越高/越低/风险”从箭头约定收敛为文字图例、可访问标签、反向有利度条和同尺度校验，详见[ADR-046](../decisions/046-arena-weapon-overview-comparison-first.md)与[ADR-053](../decisions/053-arena-weapon-overview-direction-semantics.md)。真机阅读率和数值解释正确率仍待验证。
- 生存实体原型已验证单一 `enemy-1` 与玩家共享 Rule/Physics、敌人可被击落、玩家第一次掉落复活且第二次终局；多敌压力原型进一步验证了 1/2/4 个同类敌人的有界追击、出招、供给争夺、等级专属 Definition 和同屏压力峰值。详见[生存实体与掉落原型结果](arena-v2-survival-loop-prototype-results-v1.md#5-单敌人实体与掉落闭环验证)和[多敌压力原型结果](arena-v2-survival-loop-prototype-results-v1.md#6-多敌自主压力与武器争夺原型验证)。当前反例是 50 秒内所有敌人都被击落、玩家只掉落一次，说明敌人数和等级接通都不能直接当作难度曲线；下一步要验证刷新节奏、分流/拥挤、AI 行为阶段和后期压力可读性。

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
