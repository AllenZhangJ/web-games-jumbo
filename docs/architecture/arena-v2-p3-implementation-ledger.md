# Arena V2 P3 地图与单一敌人实施台账

## 1. 当前状态

- 日期：2026-08-16。
- 当前状态：`P3.0-route-contract-static-candidate-landed / P3.1-map-content-static-candidate-landed / P3.1a-switchback-second-map-code-written-not-run / P3.2-mode-binding-static-candidate-landed / P3.3-single-enemy-bot-v2-static-candidate-landed / P3.4-no-render-static-candidate-landed / P3.4a-race-combat-ring-out-and-full-world-checkpoint-code-written-not-run / P3.4a-race-respawn-single-source-candidate-code-written-not-run / P3.4b-survival-full-world-checkpoint-core-down-smash-and-product-result-usage-ownership-code-written-not-run / P3.4b-survival-first-respawn-single-source-candidate-code-written-not-run / P3.4c-world-checkpoint-primitives-landed-not-run / P3.4c-mode-driver-checkpoint-v3-code-written-not-run / P3.4d-three-mode-authoritative-quick-match-host-code-written-not-run / P3.4e-three-mode-authority-partial-destroy-retry-ownership-code-written-not-run / P3.4f-three-mode-restore-failure-resource-ownership-code-written-not-run / P3.4g-survival-interactive-verification-timing-separation-code-written-not-run / P3.4h-race-interactive-verification-timing-separation-code-written-not-run / P3.4i-three-mode-timeline-product-proposal-code-written-not-run / P3.5a-readonly-route-cue-projection-and-three-consumer-code-written-not-run / P3.5c-map-route-variety-audit-code-written-not-run / P3.5-authored-map-glb-wired-not-approved / P2.5f-terminal-tick-static-contract-patched-not-run / P3-survival-vertical-component-candidate-landed / production-unreachable / hardGate=false`。
- 授权依据：[ADR-119](../decisions/119-arena-v2-continuous-development-with-deferred-gates.md)。开发持续推进，测试、类型检查、构建、压测、性能、设备与真人证据集中顺延。
- 边界：当前候选不进入默认`MapRegistry`、默认Content Pool、生产Composition、三端入口或发布清单；研究/experiment代码没有被生产候选导入。
- 结论边界：当前只证明合同、候选内容和真实Movement/Physics场景代码已落盘；这些场景尚未执行，不能证明路线真实可达、2–4人公平、生存无安全解、性能达标或P3阶段完成。
- 生命周期增量：`P3.4e-three-mode-authority-partial-destroy-retry-ownership-code-written-not-run`。Race原有“成功资源才清引用”语义保留，并在任一清理失败后显式失败关闭；Duel与Survival同步采用同一合同。Duel分别保留失败的Feedback/Core；Survival按participant逐个释放Controller，并分别保留失败的Feedback、Timeline、Rule、Movement、Physics。只有全部资源完成后才清运行证据并提交destroyed；失败后禁止继续step，但允许再次destroy精确收口。未运行任何验证，不改地图、武器、Bot、输入、数值、Result、Replay或默认入口。
- 恢复切换增量：`P3.4f-three-mode-restore-failure-resource-ownership-code-written-not-run`。Duel、Race、Survival在checkpoint恢复时逐项提交旧资源释放；任一旧资源失败时保留其原字段，候选新资源若清理失败则转入待清理账本。新资源接管后的公开帧重建、跳跃能力投影或证据恢复若失败，Authority立即失败关闭；成功释放项不再重复销毁，失败项由后续`destroy()`精确重试。Survival的Controller按participant迁移所有权，Equipment只在RuleEngine尚未接管时独立回收，避免重复销毁。未运行测试、类型、构建、压测、性能或设备验证，且不改地图、武器、Bot决策、输入、数值、Result、Replay和默认入口。

## 2. 分批实施路线

| 批次 | 当前状态 | 开发输出 | 晋级前仍需补齐 |
|---|---|---|---|
| P3.0 路线Definition/Registry | 静态候选已落盘 | exact-key、冻结、版本2路线；方向+跳跃；六类段落；分叉、回应、重入、供给、生存有向图；显式Registry hash | 单测、严格类型、恶意输入与schema迁移验证 |
| P3.1 首张KZ地图候选 | 静态候选已落盘 | 原创34个surface、12段、4出生位、8条快/稳分叉、12供给点、180 tick重入；Race/Survival共用同一MapDefinition | 真实Movement/Physics全路径、2/3/4人拥挤、攻击与重入 |
| P3.1a 第二张折返KZ地图候选 | 代码已落盘，未执行 | 原创12个surface、8段、4出生位、8供给点、180 tick重入；用折返、连续转向、上/下楼梯、窄路、走钢丝和双长跳建立不同路线记忆；同一选择冻结到1v1/Race/Survival | 真实Movement/Physics全路径、多人拥挤、生存无安全解、地图差异真人辨识 |
| P3.2 Mode地图绑定 | 静态候选已落盘 | Race support/fall/finish→Mode facts只读适配；Survival authority legal transition→Bot route target只读适配；不复制几何 | 接真实world authority，与P2 runtime/replay连续与恢复一致性 |
| P3.3 单一敌人族Bot V2 | 静态候选已落盘，未执行 | exact-key受限Observation、当前held equipment、最多3个当前可见供给、合法跨段route target、空手供给选择和持武返回V1追击；只输出InputFrame | 未接默认Bot Registry；接单一shared tick world authority、V2观察生产投影与运行验证 |
| P3.4 无渲染场景 | 静态候选已落盘，未执行 | 12段主线、8分支、两条全路线和16个重入点；竞速2/3/4人；生存1/4/8/12/16敌人；真实Movement/Physics、地图适配和Bot checkpoint恢复 | 执行首轮；接ActionResolver/命中、Race/Survival Mode lifecycle、golden、100+ seed、长局、资源归零、失败注入 |
| P3.4a Race纵向集成 | 完整世界恢复与重生单一来源代码已落盘，未执行 | 2/3/4人独立起跑格、60 tick准备、两张可选KZ候选路线、二十武器中所选Definition/Rule；标准InputFrame驱动真实命中→冲量→失去支撑→killY→credited-hit→180 tick重生与30 tick保护；最近安全锚失效时使用两图公共Race语义fallback；终点、排名、Bot路径、Result、Replay V6、checkpoint均跟随开局冻结的地图/武器 | 首次执行；29/30/31、179/180/181、多seed、拥挤、失败注入与长局资源门统一顺延；保护平衡与hard-limit未批准 |
| P3 Survival纵向组件编排 | 静态候选已落盘，未执行 | 1/4/8/12/16敌人、Survival lifecycle、供给/武器/Bot候选证据在同一报告中组件级编排；明确不导入arena-v1-experiment | 尚非单一shared tick world authority；V2供给观察、hit/fall、Mode lifecycle未在同一场景原子闭合 |
| P3.4b Survival单一权威纵向集成 | 完整世界恢复、Core down-smash迁移与Product Result武器事实所有权代码已落盘，未执行 | 同一authority两阶段tick闭合P4供给→Observation V2→Controller V2 InputFrame→Rule/Movement/Physics→killY facts→Survival Mode/Runtime V6；覆盖1/4/8/12/16、首落复活/第二落终局、敌人再激活、T事件/T+1帧；两张路线共用同一规则；baseline/tiered/shared-world不再传递依赖arena-v1-composition/content；终局Replay V6经contracts唯一producer生成canonical participantEquipmentUsage并明确归ProductMatchResultV3/Learning重算验证所有，ModeResult保持胜负/排名/生存事实 | 首次执行；多seed/长局/性能/设备 |
| P3.4c 完整世界checkpoint底层能力 | 静态候选已落盘，未执行 | Movement完整participant/Definition/tick状态；Equipment运行时/持有/冷却/过期持有状态；轻量Physics地图/求解/角色完整状态；ActionExecution完整participant×lane与commitmentStartedTick；ArenaRule聚合Action+Equipment；Timeline和Bot沿用版本化快照；Runtime V3在完整V2外绑定标准化Mode Driver内容并在authority capture前拒绝漂移；Race与Survival authority均已聚合 | 统一执行连续/恢复后缀、Mode内容漂移、恶意checkpoint与失败注入（按开发优先窗口顺延） |
| P3.4d 三模式权威QuickMatch/信息宿主 | 代码已落盘，未执行 | Duel 1+1、Race默认1+3且可配2/3/4、Survival默认1+16且可配1/4/8/12/16；QuickMatch V3只接受本地玩家InputFrame，Bot输入与随机/checkpoint留在各模式runtime owner；角色、武器、两图选择均在开局冻结，authoritative Session的真实Replay V6终局身份、finalHash、Mode Reward与Learning Grant已串到11页信息Host | 首次类型/运行验证；默认Composition/入口、正式Surface/资产与设备证据仍断开 |
| P3.5a 只读路线/Cue投影与Three消费 | 代码已落盘，未执行 | 两张冻结KZ路线按当前权威`supportSurfaceId`精确映射段落；腾空不猜最近段；Race/Survival的掉落、重入、安全锚、终点和fall count只消费Mode Projection与稳定V6事件；Three owner只缩放GLB已有TopCap/入口/终点节点，已接正式Stage生命周期 | 定向测试/类型/构建、GLB运行绑定、浏览器/真机/真人 |
| P3.5b 原创地图与同族敌人正式资产 | 地图GLB已接入但未批准；敌人仅verified intake | 两张项目自制GLB已有固定来源、字节、SHA与正式Catalog/预加载/Three Stage接线；运行时不创建程序化地图兜底；同族Skeleton身份已登记 | A0.3/A1.1、地图Concept/Blockout/批准、敌人视觉族批准、浏览器/真机/真人 |
| P3.5c 地图路线多样性只读审计 | 代码已落盘，未执行 | 同时读取两张冻结Route、20段体验节奏与反制目录，投影回应集合、分叉、朝向、升降、学习签名与重复段；输出具名复核项但不改几何、不自动调参、不宣称平衡 | 首次执行、竞速/生存动态路线占比、多人干扰、真人记忆与单一最优解证据 |

## 3. P3.0 路线合同

新增文件：

- `packages/arena-definitions/src/kz-route-definition-v2.ts`
- `packages/arena-definitions/src/kz-route-registry-v2.ts`
- `packages/arena-map/src/kz-route-map-validator-v1.ts`

核心约束：

1. 输入集合精确为`direction → jump`，不允许dash、格挡或模式专属按键。
2. Race顺序路线由segment主路径和choice分叉组成；choice必须同时提供`fast-exposed`与`safe-recovery`。
3. 每段声明surface所有权、入口、出口、重入锚、回应窗口、命中恢复、六维难度和生存职责。
4. 每个段落精确拥有一个首批供给点；供给锚与MapDefinition刷新点必须同surface、同位置。
5. Survival只读取同一组段落和surface，通过强连通有向图形成循环；安全/恢复段必须在两次换线内重新进入压力或选择段。
6. 地图校验使用显式角色移动能力包检查步高、跳跃间隙、上升和安全落差，不把研究控制器或某个角色常量写死进Definition。
7. surface collapse在Race/Survival共用KZ地图中失败关闭；任何未知字段、重复身份、悬空锚、断裂路径或地图身份漂移均拒绝构造。

## 4. P3.1 首图候选

候选文件：`packages/arena-product-content/src/arena-v2-kz-base-map-candidate-v1.ts`。

| 项目 | 静态候选值 | 状态边界 |
|---|---:|---|
| 段落 | 12 | 两轮“基础/喘息→节奏建立→选择→跳跃测试→窄路→走钢丝”锯齿教学 |
| surface | 34 | 原创轴对齐灰盒几何，尚非正式资产 |
| Race人数 | 2–4 | 4个独立出生锚，未做多人运行验证 |
| 分叉 | 8 | 两组迷宫与走钢丝各一条快线、一条恢复线 |
| 供给点 | 12 | 每段一个，仅定义位置，不直接生成武器 |
| 重入等待 | 180 tick | 对齐已冻结Race语义；真机可读性未验证 |
| Survival复用 | 同一map/route ID | 不复制第二套几何；无终点判定由Mode负责 |
| 正式状态 | `production-unreachable` | `hardGate=false`，默认Registry为空 |

起跑公平性静态修正：四个Race出生锚已从沿前进轴错位改为同一`x=-1.8`起跑线、四条`z`车道，避免静态产生最多3.6世界单位的先发优势。该结论尚未经过多人运行和真人验证。

第二轮段落按`level-design`流程补齐：第7段先释放前一轮峰值压力，第8–12段依次重新引入楼梯节奏、路线选择、长跳、窄路与终局走钢丝；只复用方向与跳跃，不新增冲刺、攀爬或模式按键。该节奏是静态设计意图，尚未形成可达性或真人流动证据。

本批技能记录：使用项目本地`.agents/skills/level-design/SKILL.md`及其`references/pacing-and-flow.md`，落实“移动指标先行、Blockout先于美术、Introduce→Develop→Twist→Test、高潮前设置喘息段”的路线结构；本批没有进入美术装饰。

## 4.1 P3.1a 第二图候选

候选文件：`packages/arena-product-content/src/arena-v2-kz-switchback-map-candidate-v1.ts`。

第二图采用原创折返路线，不复制CS 1.6 KZ地图几何，只学习其“同按键、靠路线节奏和空间记忆拉开熟练差”的结构原则。路线精确包含8段：起步定向、向东长跳、上升楼梯、窄路北转、向西走钢丝、下降楼梯、向北长跳、接触下冲线；输入仍只有方向、跳跃和原有主攻击。

它与首图形成明确差异：首图强调两轮教学锯齿和快/稳分支，第二图强调连续90度转向、方向反转和高低变化后的再起跳。每段仍拥有唯一供给点与安全重入锚，Survival链接保持双向连通；信息目录、学习Profile、Learning Evidence和20组交叉挑战均已覆盖两图。静态校验在模块构造时复用统一KZ地图校验器，但本批没有运行测试、构建、物理、性能或设备验证。

## 5. P3.4 无渲染候选

新增候选：

- `packages/arena-product-content/src/arena-v2-kz-verification-character-candidate-v1.ts`
- `packages/arena-regression/src/arena-kz-route-physics-verification-v1.ts`
- `packages/arena-regression/src/arena-race-crowding-physics-verification-v1.ts`
- `packages/arena-regression/src/arena-survival-enemy-physics-verification-v1.ts`

当前开发覆盖：

1. 路线场景直接使用正式候选Map、独立候选Character、`MovementSystem`和轻量Physics；覆盖12段主路径、8条分支、全主线、全恢复线、4个Race起点和12个段落重入锚。
2. 竞速场景覆盖2/3/4人、60 tick准备、共享碰撞、180 tick重入、safe-anchor和finish事实投影；当前明确`exercisesCombatResolution=false / exercisesRaceModeLifecycle=false`。
3. 生存场景覆盖1/4/8/12/16名同族敌人；每名敌人只从受限Observation生成普通InputFrame，进入共享Movement/Physics，并在240 tick执行Controller checkpoint恢复；当前明确`exercisesCombatResolution=false / exercisesSurvivalModeLifecycle=false`。
4. 生存路线适配补齐“玩家与敌人已在同段”语义：仍只发布权威允许的换线目标，但目标意图标记为pursuit，使Controller在同段时追逐当前玩家位置，不读取未来路径。
5. 所有报告都具有确定性result hash，测试与聚合入口已写入但按ADR-119未执行。
6. `arena:p3:candidate:test`延后清单静态登记16个Vitest文件与2个Node文件；reachability与Runtime V2供给事实水位checkpoint合同各一份。`action-primitives.test.ts`同时登记P3/P4是有意共享边界：P3验证路线/模式动作接线，P4验证武器动作后果；没有重复登记在同一阶段清单内。

Survival并行候选已落盘，本次Race小门不修改其字节：

- `packages/arena-bot/src/survival-enemy-observation-v2.ts`
- `packages/arena-bot/src/survival-enemy-controller-v2.ts`
- `packages/arena-bot/test/survival-enemy-controller-v2.test.ts`
- `packages/arena-regression/src/arena-survival-mode-vertical-integration-candidate-v1.ts`
- `packages/arena-regression/test/arena-survival-mode-vertical-integration-candidate-v1.test.ts`

V2 Observation只暴露当前held equipment、最多3个当前可见供给与权威允许的跨段
route target；空手Controller按“同段→即将过期→距离→稳定ID”选供给，持武后回到
V1追击，对外仍只产生`InputFrame`。该Controller未接默认Bot Registry。Survival纵向报告
原文件只组合现有component candidate；其“尚非单一shared tick”的边界仍保留。P3.4b另新增独立
shared-world authority候选来闭合同场景原子链，不回写或伪装组件报告。上述测试全部`not-run`。

### P3.4a Race正式纵向集成候选（2026-08-11，代码已写、未运行）

新增文件：

- `packages/arena-regression/src/arena-race-vertical-integration-verification-v1.ts`
- `packages/arena-regression/test/arena-race-vertical-integration-verification-v1.test.ts`

静态候选把同一组正式候选内容串入一个owner：KZ Map/Route、验证Character、统一重锤
Definition与ArenaRuleEngine、MovementSystem、轻量Physics、KzRaceModeMapAdapter、
RaceModeSystem和ModeMatchRuntime V6。Race不创建第二套武器、命中、位移、随机或计时系统；
表现层没有参与任何事实与结果判定。2/3/4人保持同一`x=-1.8`起跑线，输入只经标准
InputFrame进入Rule/Movement/Physics；脚本化路线失误必须由Physics实际跌破killY，随后由
RaceModeSystem基于latest-safe-anchor调度且精确在`fallTick + 180`发布重生命令。终点、排名、
ModeResult、V6事件、Replay V6/checkpoint和销毁资源计数都由同一Runtime链闭合。

P3.4a的combat ring-out现已从“仅登记缺口”推进为`code-written-not-run`：2/3/4人场景都在起点平台
通过普通方向、跳跃与primary输入完成战斗布位和重锤攻击；命中只能由ArenaRuleEngine产生，冲量只经
Rule Mutation Port进入Physics，掉落事实只在真实穿越killY后交给RaceModeSystem。报告保留动作开始、
首次命中、真实冲量、支撑面脱离、`credited-hit`事件、180 tick重生以及V6/Replay/Result身份；另以命中
后等待超过300 tick再自行走出边缘，以及完全无命中的路线失误，证明归因控制路径不会把普通失足算作
击落。脚本没有直接写战斗掉落、速度或额外冲量；构造布位和正式重生仍由各自明确生命周期边界负责。

治理边界保持不变：Race fixture仍使用显式`.test.`身份承载未决hard-limit；既有30 tick保护已按
ADR-121收敛为生产不可达单一候选，并与180 tick等待、两图公共fallback及Runtime身份共同绑定，
保护平衡批准仍为`not-run`。候选没有加入arena-regression公共index、默认Registry、Content Pool、Composition、
三端入口或发布清单。测试代码只描述未来定向门，本轮依ADR-119未执行。

P2.5f已在静态源码中修正既有终局tick合同：authority在pre-step tick `T`解析终局并发布
`MatchEnded(tick=T)`，`ModeResult.endedAtTick=T`；同一step返回的MatchReadFrame V3为
`world.tick=T+1 / phase=ended`并携带同一result。V3 schemaVersion保持3，Runtime在提交前继续要求
world每step只推进1 tick、事件不得晚于pre-step tick，并核对resolution/event/post-frame三方身份。
Race候选元数据因此由`deferred-blocking`改为`static-contract-patched-not-run`；测试、类型、构建和
任何真实场景运行均未执行，不能把这次静态修正写成Race终局已通过。

其余顺延而非删除：100+ seed、长局input/event历史上限、30 tick保护的正式平衡批准、hard-limit数值、
浏览器/设备与真人可读性。

Race完整世界恢复现已与Survival采用同一原则闭合：authority只在已提交安全tick导出participant状态、
战斗/掉落/重生证据、轻量Physics、Movement与ArenaRule（含Action/Equipment）checkpoint；恢复只允许新owner，
先构造并逐项核对全部子系统，再替换旧资源并从完整世界重建MatchReadFrame V3。场景代码在首次真实命中
后的下一帧执行一次Runtime级恢复，随后继续验证credited fall、180 tick重生和终局；这仍是未运行代码，
不是恢复后缀已通过的动态证据。

2026-08-12静态终局补充：Authority先只收集同tick物理掉落与终点候选，再由Mode一次裁决；有效终点claim
对同一participant的掉落拥有已冻结优先级，因此该participant不累计fall、不发布`ParticipantFell`、不生成反馈或重生。
其他participant在终局tick发生的真实掉落仍提交`ParticipantFell`与fall evidence，但有效终点或hard limit成立后
Race Mode不会生成`schedule-respawn`。pending respawn只在实际应用`schedule-respawn`命令时创建，不再在Mode裁决前暂存；
`end-race`显式校验并清空历史等待中的pending记录，场景终局要求pending数量精确归零。
共享WorldSnapshot不再直接使用Race专用`racing / respawning / finished`状态：未完赛和已完赛角色都保持可见`active`，
只有运行中复位等待为`respawning`，终局时仍在复位的角色为`eliminated`并将公开respawnTicks归零；完整Race状态仍保留在ModeProjection。
此外Authority在应用命令前先要求ModeProjection/ModeState/revision/current tick一致，真实终点集合与finish命令集合双向相等，
并要求顶层Result与唯一末尾`end-race`完全同一。命令按`安全锚/终点 → 已裁决掉落 → 重生调度/重生/终局`两阶段应用，
并拒绝阶段回退或同类participantId乱序，防止漂移的Driver留下半应用状态、改变Replay字节顺序或让冲线者同时进入掉落生命周期。
Race完整世界checkpoint恢复前还会逐participant闭合私有状态、公开Frame、ModeProjection与pending respawn，
逐项归一化fall/respawn evidence并要求每条运行中fall唯一处于“等待复活”或“已完成复活”之一；伪造计数、重复事件身份、
未知锚点、归因漂移或同一fall同时出现在两种生命周期都会在任何资源采用前失败关闭。
源码与P3治理反证已写，未运行任何验证。

### P3.4b Survival单一shared tick world authority（2026-08-11，代码已写、未运行）

新增文件：

- `packages/arena-regression/src/arena-survival-shared-world-authority-verification-v1.ts`
- `packages/arena-regression/test/arena-survival-shared-world-authority-verification-v1.test.ts`

该候选不再把供给、Bot和Mode分别跑完后拼报告，而由同一个world authority拥有完整顺序：每个权威
tick先以P4 Timeline原子执行spawn/expire/pickup/replacement，再从同一Equipment与Physics状态投影
Observation V2并生成实际Bot InputFrame；Runtime随后只接受这批绑定输入，执行统一Rule、Movement、
Physics、killY fall facts和SurvivalMode命令。Replay记录的就是实际玩家/Bot输入；终局事件和
ModeResult发生在`T`，post-frame固定为`T+1`。首次玩家掉落安排60 tick复活与30 tick保护，第二次掉落
终局；这两个数值已按ADR-120从本文件私有常量收敛为`arena-product-content`唯一生产不可达Respawn Policy候选，两张地图共享同一语义safe anchor并各自绑定地图位置，平衡批准仍为`not-run`。敌人掉落交给同一压力策略再激活。1/4/8/12/16场景使用具名派生seed，供给仍固定
`1200首刷 / 1200间隔 / 每波3把 / 600 tick未拾取消失`。

主协调静态复读补了三个不改变目标的健壮性修正：场景显式调用Runtime `start()`后才进入tick循环；
Controller pause/resume任一中途失败会让world authority失败关闭；尚未激活的enemy body停放在地图外且
低于killY的分离位置，直到Mode命令激活时才重置到权威anchor，避免16个未激活slot提前参与角色碰撞。
这些只是源码修正，没有运行证据。

完整世界恢复代码现已补齐：Movement、轻量Physics、Equipment、ActionExecution和ArenaRule均导出版本化
checkpoint；ActionExecution额外保存公开Action快照未包含的`commitmentStartedTick`和全部lane私有状态。
Survival authority在安全tick原子导出participant状态、证据计数、物理、移动、Rule/Equipment、供给Timeline
及每个Controller V2随机流；恢复只允许全新owner，先独立构造全部新资源，再替换旧资源，并用重建的
MatchReadFrame V3与原帧闭合。场景代码在首波供给后执行一次Runtime级恢复再继续终局。

当前`begin-down-smash` effect handler已下沉`arena-core`：只校验空参数与权威source身份，并只生成
`kind/participantId`，`actionDefinitionId`继续由`ArenaRuleEngine`补齐。baseline consequence只注册当前武器
bundle actions，movement candidate provider为空；正式空中候选仍由`EquipmentSystem`在
`canBeginDownSmash`时加入。治理脚本同时禁止P4 authority重新引入`arena-v1-composition/content`。

shared-world终局现在直接把真实`Replay V6.events`、稳定participant顺序和冻结collection equipment目录交给
`createParticipantEquipmentUsageV3FromEvents`，报告保存canonical结果、内容绑定hash及明确所有权：
`ProductMatchResultV3`是武器使用事实owner，`ModeProductResultAssemblerV3`负责装配，Learning从Replay重算校验；
`ModeResult V3`继续只拥有胜负、排名或生存结果，不新增武器字段。旧component纵向报告仍只把
`weaponUsageFacts`作为未运行组件证据，不冒充Product Result。

shared-world报告当前只显式保留一项gap：全部测试、类型、构建、压力、性能与设备验证未运行。上述候选仅通过
arena-regression显式Regression API导出，默认Registry、Composition与entry仍断开。

2026-08-12静态终局收口补充：若第一次玩家掉落与显式fixture hard limit发生在同一tick，Survival Mode仍记录
本次fall，但不再生成随后必然失效的复活调度；`end-survival`现在由shared-world Authority显式校验并消费，
关闭玩家运行时active写状态、清除待复活/无敌/硬直与归因临时状态。公开MatchReadFrame仍严格使用共享三态：
`survival-time-cap`代表玩家存活并保持`active`以支持终局展示，`terminal-player-fall`才投影为`eliminated`，未激活enemy slot也为`eliminated`；slot是否激活仍以ModeProjection为唯一来源。
Authority同时在返回命令应用、事件/公开帧发布与新hash提交前，闭合ModeProjection/ModeState/revision/current tick与唯一末尾`end-survival`的完整Result身份；任一漂移均使World Authority/Runtime失败关闭，不发布半提交帧。ModeSystem在Resolver内部的状态提交仍由Driver持有。`MATCH_ENDED`仍由原唯一出口发布，不新增第二套终局事件或规则。对应源码、延期测试与P2/P3治理反证
已写，未运行任何测试、类型、构建、压力、性能或设备验证。

Survival完整世界checkpoint在创建任何替换资源前，还会逐participant闭合私有权威状态、公开Frame、
ModeProjection与敌人slot generation：玩家的首落次数、复活等待、公开倒计时、无敌/硬直和最近命中必须一致；
敌人active状态、私有再激活tick与Mode隐藏水位必须一致，active敌人不得携带待激活tick。每次敌人掉落都由
对应私有fall count持有，聚合`enemyFallCount`必须同时等于所有敌人fall count之和，以及已完成再激活次数与
当前待再激活slot数量之和。恢复输入仅接受同配置、同seed、同backend且Result为空的运行中Survival Frame；
任何终局伪装、跨层计数漂移或slot身份漂移都会在资源采用前失败关闭。该闭环仍只属于已写未运行源码。

### P3.4c Runtime供给事实恢复水位（2026-08-12，代码已写、未运行）

`ModeMatchRuntimeCheckpointV2`保留完整V1 runtime/authority检查点，只追加Runtime唯一写入的
`supplyFactStreamId / lastSupplyFactSequence`水位，不改Replay V6、ModeResult、Profile或world-authority
checkpoint schema。Survival允许在首条事实前保持`null/null`，但一旦发布必须从sequence 0开始；
恢复后继续要求同stream且严格`+1`。Duel/Race同时拒绝供给事实批与非空水位，
避免用伪造Race checkpoint绕过模式边界。Race/Survival真实runtime继续保留V2供给水位兼容口，
并在同一嵌入V1 checkpoint上重算feedback与direction/dedup capability；供给水位、feedback checkpoint、
config/content/seed/backend与Replay前缀因此属于同一恢复generation。相关测试源码已写，所有运行门仍为`not-run`。

ADR-122在该V2水位之上新增V3 Mode Driver内容身份。Duel完整Policy Bundle、Race fixture和Survival fixture都先经各自Resolver/System标准化再hash；恢复调用先验证V3/V2/V1与Mode内容hash，只有一致时才读取替换world authority。三模式通用工厂、Race完整世界场景、Survival完整世界场景以及三个具体runtime的完整导出/分叉端口均已迁移V3；V1反馈/内容能力和V2水位方法继续保留兼容。该批不改变Replay/Result schema、不冻结hard-limit，也未执行测试、类型、构建、压力、性能或设备验证。

### P3.4d 三模式权威QuickMatch与信息宿主（2026-08-11，代码已写、未运行）

新增候选：

- `packages/arena-session/src/mode-authoritative-local-match-session-v3.ts`
- `packages/arena-quick-match/src/mode-authoritative-quick-match-service-v3.ts`
- `packages/arena-regression/src/arena-duel-authoritative-runtime-candidate-v1.ts`
- `packages/arena-regression/src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.ts`

该批把三个此前分离的authority接入同一个显式QuickMatch入口。Duel使用真实MatchCore、ArenaRule、
Physics、Replay V6和Weapon Feedback Adapter；Race与Survival分别复用P3.4a/P3.4b的完整世界owner。
Session V3只从宿主接收唯一human的本地InputFrame，各runtime在同一权威step内生成Bot输入并返回完整
canonical input集合，避免Survival的供给提交、Bot观察、Controller随机流和checkpoint被拆到Session兄弟资源。
Duel与Race的Bot决策由当前frame与tick派生；Survival Controller随机状态继续进入完整世界checkpoint。

终局身份不再由组合层预填占位hash。Runtime只在终局后开放Replay schema、Rule schema、Physics backend、
config hash、rule content hash和真实Replay finalHash；Product Result Assembler在接收唯一末尾
`MatchEnded`后才读取该身份，再将同一结果交给Mode Reward与Learning Grant。三模式具体阵容、地图、
角色和武器集合均由QuickMatch选择与最终Assignment闭合；默认是Duel 1名玩家+1名Bot、Race 1名玩家+
3名Bot、Survival 1名玩家+16名同族敌人，后两者只允许约定的有界人数集合。

Duel与Race runtime原先各自使用验证性质Mode ID，而Learning Definition使用稳定产品Mode ID；该漂移会在
真实赛果进入Learning Grant时失败。当前三模式runtime、QuickMatch、奖励Registry和Learning Definition已统一
为`arena-v2.mode.duel/race/survival.candidate.v1`三组稳定身份，fixture ID继续保留验证用途，不再泄漏到产品赛果。

为允许后续隔离宿主使用，三模式组合候选从`arena-regression`包级index导出，P5的Host/Factory/Bundle
候选从`arena-product-composition`包级index导出；这只是版本化候选API，不代表生产接线。元数据仍固定
`production-unreachable / defaultRegistryWired=false / defaultCompositionWired=false /
defaultEntryWired=false / validationStatus=not-run`，默认Registry、默认Composition、三端入口和发布清单
均未引用这些导出。直接Race/Survival verification authority仍不单独作为默认runtime API暴露。

P4后续批次已静态落下供给20秒刷新、每波3把、10秒消失、逐波运行时等级、真实拾取/替换/过期、Bot武器affordance及V3供给/MatchReadFrame候选；P3.4b已把这些候选接入隔离的Survival Mode lifecycle shared-world场景，但仍全部为`not-run`且未接默认生产Composition，因此不能回填为P3通过证据。

### P3.4g Survival交互式Runtime与验证脚本时间隔离（2026-08-15，代码已写、未运行）

同一shared-world Authority此前把验证场景用于等待压力目标、供给观察和两次自动掉落的起始tick写入玩家初始`invulnerableTicks`，使真实QuickMatch候选早期无法被敌人命中。当前构造器强制接收规范execution timing：交互式路径固定初始保护0，验证路径才携带自动掉落起点和场景最大tick；首次复活保护仍由既有60 tick等待/30 tick保护Respawn Policy唯一拥有。

purpose、人数、初始保护、未批准本地hard limit、验证预算及pressure identity组成深冻结content hash，并进入config、Driver fixture与Authority checkpoint V3；恢复purpose或任一字段漂移会在资源接管前失败关闭。验证runner继续使用原fall-drive与预算，交互式Runtime不再能读取这两个验证字段。

现有1/4/8/12/16 hard limit数值仅作为“保留当前行为、未批准”的本地候选表继续供隔离Runtime使用，不再由验证预算函数实时生成，也没有接入resolved Timeline Policy。运行测试、类型、构建、压力、性能、浏览器、设备和真人证据全部顺延，默认Registry/Composition/Entry保持关闭。

### P3.4h Race交互式Runtime与验证脚本时间隔离（2026-08-15，代码已写、未运行）

Race此前以验证runner的6000 tick总预算减去60 tick准备期，生成产品fixture的5940 active tick hard limit；同一`.test.fixture`身份同时供真实QuickMatch候选和场景runner使用。当前5940被独立冻结为未批准本地产品候选，验证6000仅保留为scenario watchdog，两者不再存在源码推导关系。

两种execution timing以purpose/content hash区分；hash同时进入私有config身份和Mode fixture identity。fixture继续满足现有`.test.fixture`治理门，有Registry binding时仍携带registry content hash。Mode Driver V3恢复按既有fixture/config identity拒绝跨purpose接管，无需重复升级Race Authority checkpoint schema。

Race Authority的准备门、active tick、remaining tick和Mode facts统一读取同一timing；产品wrapper与验证runner各自只能创建对应purpose。Timeline未接线、hard limit未批准、默认Registry/Composition/Entry保持关闭，所有测试与运行证据均为`not-run`。

### P2.0w / P3.4i 三模式Timeline产品提案单一来源（2026-08-15，代码已写、未运行）

P2.0u/P3.4g与P2.0v/P3.4h拆出的当前Runtime时间值现由`arena-product-content`唯一Timeline V2产品提案拥有：Duel、Race使用default变体，Survival按1/4/8/12/16敌人数选择五个严格变体。Duel/Race/Survival Regression runtime镜像只读该提案，验证scenario watchdog不再拥有或反向推导产品hard limit；运行数值没有改变。

三模式Registry只接受与该提案逐模式hash一致的Timeline Policy；资格报告现逐变体静态对齐，但仍为`awaiting-balance-approval / mayWire=false`。Runtime没有注入`timelinePolicyBundle`，fixture、checkpoint、Replay和默认入口行为不变。旧Timeline字段形状继续接受任意正安全整数`contentVersion`，只有自有`variants`字段才判定为V2。

延期规格、P2/P3 reachability、边界治理与ADR-135已写但未运行。状态：`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

未覆盖且不得冒充完成：Race与Survival的多seed、长局、恶意checkpoint、失败注入和动态运行资源归零。两种模式的完整世界连续/恢复后缀均已写入代码但仍未执行；Race combat ring-out与Survival shared-world中的Action/impulse/fall归因同样只属于未执行代码路径，不能作为动态通过证据。

## 5.5 P3.5a 只读路线/Cue表现投影（2026-08-11，代码已写、未运行）

新增文件：

- `packages/arena-product-presentation/src/arena-v2-kz-route-presentation-projection-candidate-v1.ts`
- `packages/arena-product-presentation/test/arena-v2-kz-route-presentation-projection-candidate-v1.test.ts`
- `packages/arena-product-presentation-three/src/arena-v2-kz-route-three-readability-candidate-v1.ts`
- `packages/arena-product-presentation-three/test/arena-v2-kz-route-three-readability-candidate-v1.test.ts`

该投影以`ArenaV2MatchSceneReadFrameCandidateV1`为唯一比赛输入，按冻结的两张
`KzRouteDefinitionV2`解析地图。当前段落只允许由本地玩家权威`supportSurfaceId`精确映射；
`supportSurfaceId=null`时保持无当前段，不从位置、速度、Three节点、镜头或动画猜测最近路线。
Race的status/safe anchor/progress/respawn/finish/rank与Survival的fall count/survived ticks/
pressure stage只透传Mode Projection并做身份闭合；一次性路线Cue只接受当前玩家的
`ParticipantFell / ParticipantRespawnScheduled / ParticipantRespawned /
RaceSafeAnchorCommitted / RaceFinishClaimed / SurvivalPlayerFallCounted`稳定V6事件。

输出同时绑定路线Definition hash、冷纵深/暖折返环境身份、路线强调色、正式地图资产ID及
`authored-candidate-not-approved`成熟度。安全锚使用小回转锚、终点使用大门框、失足使用断线、
重入使用开/闭门框、Survival两次掉落使用单开环/双闭环；每条语义同时有形状和文字，颜色不是
唯一线索。单帧最多32条本地路线Cue，未知Map/Surface/Anchor、关闭Surface、身份漂移、状态字段
不闭合、future event、重复/倒序event均在输出前失败关闭。该层不持有Three/DOM/音频资源，
不写Rule/Profile，不使用墙钟、随机或异步生命周期。

正式Three消费端已接入`ArenaV2FormalThreeStageCandidateV1`。它在开局时用同一投影核对GLB中
全部`ArenaV2TopCap`、`ArenaV2SegmentEntryCue`与三件式`ArenaV2FinishGate`节点，兼容Three
对冒号节点名的下划线清洗；缺失、重复、未来身份或Route hash漂移会在提交视觉变化前关闭Stage。
逐帧只对这些`presentationOnly=true`的既有节点做有界scale提示：当前段入口、掉落Surface、
安全锚/重入入口和终点门。Cue按权威tick到期，活动上限32、去重身份上限64；低动效使用更小的
静态形状变化。owner不创建geometry/material/light/texture，不处理collision，不写Route/Mode，
`pause/resume/clear/destroy`幂等或显式拒绝，离场/失败先恢复原始scale再解绑。正式Scene解析器
同步补回了实际Scene Read Frame中的`localAction`允许字段，避免Stage前错误拒绝同源Frame。

既有两张地图GLB并非本批新生成：来源、字节与SHA继续以
`docs/research/arena-authored-kz-map-assets.md`为真值；Catalog、预加载和正式Three Stage已经加载
对应GLB并应用两套环境身份，运行时没有程序化地图正常路径。本批没有获得新的资产批准，也没有
把地图、敌人、投影或Stage接入默认Composition/入口。

本批技能与强制参考：使用`game-art-director`、`level-design`、`game-3d-assets`；读取
`.agents/skills/level-design/references/pacing-and-flow.md`、
`docs/architecture/arena-art-and-audio-development-flow.md`、本台账、Art Bible、A0–A7对齐矩阵、
`packages/arena-definitions/src/kz-route-definition-v2.ts`、两张KZ候选Definition及自制地图资产记录。
`game-art-director`要求的`docs/collaboration-protocol.md`和`docs/game-design-theory.md`仍不存在，
保持治理红缺口且不创建占位；本机未配置Meshy key，因此本批不生成、下载或伪造资产。用户要求
开发优先，全部测试、类型检查、构建、浏览器、设备、真人和性能证据继续标记`not-run`。

静态自审：权威边界20/20、失败关闭19/20、路线/模式闭合19/20、形状与无障碍18/20、
生命周期与治理19/20，合计95/100。Three消费端未复制材质或创建几何，构造/切帧/暂停/离场/
失败清理均由单owner闭合；该分数只评价已写代码的静态设计，不是阶段评分或运行通过。

## 5.6 P3.5c 地图路线多样性只读审计（2026-08-16，代码已写、未运行）

新增文件：

- `packages/arena-product-content/src/arena-v2-map-route-variety-audit-candidate-v1.ts`

该候选不再只靠地图名称和文字说明判断两图是否不同，而是从两张冻结
`KzRouteDefinitionV2`、20段体验目录与20段反制目录建立同源审计。每段输出排序后的回应集合、
是否有正式快/稳分叉、八方向朝向、上升/平层/下降、学习语义hash和上下文hash；每图输出段落类型、
回应集合、朝向、升降、体验节拍数量，单回应连续长度、相同回应连续长度、分叉段数量和整图多样性指纹。

审计只把以下情况变成具名复核项：整图没有正式分叉、超过四分之三段落集中在同一朝向、超过一半
段落只有单一回应、连续三段以上使用同一回应集合、相同学习语义在难度/朝向/升降/体验节奏上仍未
形成上下文差异、高潮前一段仍高于2级且不是release，或连续三段以上都处于4–5级高压。当前折返图
没有正式分叉会被保留为设计复核事实；纵向图的朝向集中与后段持续高压也会被保留为身份、喘息和
单调风险复核，而不是自动判为缺陷。该补充来自项目`level-design`技能的“先教后考、锯齿节奏、
高潮前喘息”检查表；有意复现教学动作只要上下文发生变化，不会被当成无差异重复。

该批不新增操作，仍精确使用`direction + jump`；不修改Route、Surface、Anchor、碰撞、复活、供给、
武器或模式，不生成综合分，不自动改数值，也不把静态签名写成“玩家不存在最优路线”。竞速路线占比、
Survival安全解、武器干扰后的分叉价值和真人记忆仍必须由后续动态证据回答。状态固定为
`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

## 6. 多维度状态与治理要求

下表只记录开发覆盖，不是阶段评分；没有运行证据的维度不得给分。

| 维度 | 当前开发覆盖 | 当前证据状态 | 下一开发动作 |
|---|---|---|---|
| 几何可达与路线差异 | Definition、能力包校验器、快/稳路径及真实Movement/Physics执行器已编码 | `not-run` | 执行全路径并按首轮红项修正几何/控制器 |
| 多人竞速 | 同一起跑线、2/3/4人共享Rule/Movement/Physics、统一重锤真实攻击击落、credited-hit/300 tick过期控制、180 tick重入、终点/排名、RaceMode/ModeRuntime生命周期、完整authority恢复及三模式QuickMatch路由已编码；P2.5f终局tick合同已静态修正 | `not-run` | 继续默认Composition之前的宿主数据绑定；失败注入与动态证据集中顺延 |
| 生存地图价值 | 强连通循环、路线换线和1/4/8/12/16同族敌人shared-world Rule/Movement/Physics/killY/Mode场景已编码 | `not-run` | 执行真实击落、刷新压力和无永久安全解探针 |
| Bot合规与压力曲线 | 受限Observation V2→InputFrame、同族Profile、P4供给前置、最大16敌人Mode生命周期及Controller随机流完整恢复已在同一authority编码 | `not-run` | 执行压力单调性、长期资源和恢复后缀一致性 |
| 武器×地图后果 | Duel MatchCore反馈、Race重锤边缘击落、Survival逐波武器与P4完整20把高低差/多目标/碰撞边缘矩阵已编码；三模式runtime bundle已组合 | `not-run` | 扩展正式HUD/资产前的只读反馈绑定；动态矩阵集中顺延 |
| 摄像机/可读性 | 两图只读路线/Cue投影、环境身份、自制地图GLB加载、形状/文字语义与既有GLB节点Three消费已接正式Stage | `code-written-not-run / not-achieved` | 执行真实GLB节点绑定、遮挡/拥挤、低动效和设备证据（集中顺延） |
| 治理 | 独立P3不可达检查与测试代码已落盘 | `not-run` | 聚合点统一执行并记录退出码 |

治理硬约束：

- P3源码不得依赖`arena-v1-experiment`、Three.js、DOM、平台API、墙钟、未注入随机或异步计时器。
- Presentation只能消费只读路线快照和稳定事件；不能判定锚点、终点、击落、供给或胜负。
- 候选数值不得进入默认注册表；测试值、研究值和首发值继续分层。
- 当前不运行任何门禁。未来聚合验证必须保留首次红证据，不能把延期写成通过。

## 7. 当前统一顺延清单

- P2.5e连续运行与恢复后缀/终局/hash一致性。
- P2.6全部定向测试、strict typecheck、lint、build、golden、100+ seed、长局和资源上限。
- P3新增路线/竞速/生存shared-world场景的首次执行、真实物理可达结论、武器交互、生存压力、Bot确定性与完整世界恢复结论。
- P3.5a路线/Cue投影与Three消费端定向测试、类型、构建及真实GLB动态证据。
- 浏览器、微信、抖音、真机、性能、地图/敌人正式批准、reduced-motion/静音和真人3分钟理解。

这些项目只顺延，不删除，不允许作为默认入口或发布晋级依据。
