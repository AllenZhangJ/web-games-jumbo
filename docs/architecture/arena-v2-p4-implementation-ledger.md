# Arena V2 P4 武器逐把迁移实施台账

## 1. 当前状态

> 2026-08-24 SF-DG.2c：baseline consequence窄台夹具此前以0.65中心距放置两个半径0.45角色，命中前目标已被
> 共享Physics分离出支撑面，却错误组装为`hit-ring-out`。现改为同一既有`kz-s05-narrow`内、合法射程且不重叠的
> 横向站位；下砸保留既有垂直站位。场景在resolver输入前显式拒绝“记录fall但起始/终局支撑不闭合”，严格
> `hit-ring-out`的当前攻击者归因与失去支撑合同不变。定向规格3/3通过；未改武器数值、地图、窗口、Replay schema、
> 默认入口或美术资产，状态`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。

> 2026-08-25 SF-DG.3d候选自动化证据：P4 runner 已执行通过（52包/11波构建；Vitest 67文件303通过、1项由runner外部化；Node 19/19通过，真实33项failure matrix 401.1秒）。此证据仅覆盖候选自动化；默认Registry/Composition/Entry、正式资产批准、性能、浏览器/设备与真人门仍未通过，不能据此宣布P4正式硬门PASS。

- 日期：2026-08-24。
- 当前状态：`P4.0-P4.4-candidate-automation-executed-passed / production-unreachable / hardGate=false / defaultRegistry=false / defaultComposition=false / defaultEntry=false`；候选对象内的`implementationStatus=code-written-not-run / validationStatus=not-run`仍表示未获生产准入，不能替代本段已记录的自动化命令证据。
- 授权依据：[ADR-119](../decisions/119-arena-v2-continuous-development-with-deferred-gates.md)。开发连续推进；此前`feature/arena-v2-design-docs@787ce27`记录的`typecheck:app`、52包workspace build、P2候选`351/421`和P3边界门仅是历史候选证据，不构成P4定向测试、P4边界、性能、设备、真人或逐武器准入证据；这些门继续顺延并保持`not-run`。
- 最新增量：`P4.4cq-twenty-weapon-feedback-vfx-catalog-identity-closure-code-written-not-run / production-unreachable / hardGate=false / validationStatus=not-run`。
- 2026-08-24 SF-DG.1跨阶段收口：Duel反馈输入与Race/Survival统一按`ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1=20`过滤超窗credited elimination；原始V6/Replay/ParticipantFell仍保留，反馈stream使用独立连续waterline。P2候选自动化门已在该合同下`56/56` Vitest、`59/59` Node通过；P4全量候选、动态武器反馈、性能、设备、真人与正式资产门仍为`not-run`。
- 生产边界：六把首发武器与十四把收藏扩展武器都没有进入默认`ActionRegistry`、默认`EquipmentRegistry`、默认Content Pool、生产Composition、三端入口或发布清单；本批仅增加显式注入的Registry-backed候选路径。
- 结论边界：版本化合同、20把静态Definition候选、20×10生存运行时变体、十四把共享Rule/Physics与MatchCore Replay执行器、60个空间probe、483个读取组合、三模式恢复后缀与33项故障矩阵均已有候选自动化执行证据（见本页SF-DG.3d）。该证据不包含正式默认入口、性能、浏览器/设备、正式VFX/音频资产或真人验收；不得据此宣布P4完成、20把平衡或正式资产制作通过。

- P4.4bm边界：P4.4bk的计划已固定为三模式共享的33场景重放清单和无堆栈、墙钟、设备数据的确定性统一报告；已接真实三模式runtime与固定中性InputFrame工厂，并由P4 runner的Node阶段完整执行。Duel采用97个非终局稳定步，Race/Survival各120步；正式默认入口与设备门仍未运行。
- P4.4bn边界：公共动作规则只新增投影`minimumCommitmentTicks`，Bot观察只读取当前权威`commitment.status/chargeTicks`；共享节奏器据此产生首帧按下、连续按住和到点松开，未暴露武器身份、Definition、Effect、MatchCore或未来状态，也未新增输入键。旧通用Bot、Duel、Race和Survival V2敌人已消费同一节奏；源码与测试源码均未运行。
- P4.4ch边界：逐武器准入不再从旧Readiness快照的`productionApproved`或来源intake命名推导生产批准；附件、命中/阶段音频和核心VFX统一消费P5.3zzzuk的共享逐资产批准索引，模型还必须闭合外部材质纹理依赖。当前仍为0/130批准、20/20武器阻断，默认Registry和入口不变；源码与延期反证均未运行。
- P4.4bo边界：Bot主攻击就绪现在由当前动作是否空闲与当前装备冷却是否归零共同派生，并与“动作正在进行”分离；冷却中的蓄势武器输出中性输入，只有真实进行中的蓄势动作才按权威进度继续持有。Duel/Race对公共字符串状态先严格裁剪为`charging/committed`，未知状态失败关闭；仍不暴露武器身份、未来状态或新增Controller checkpoint。源码与测试源码均未运行。
- P4.4bp边界：共享control availability只读取参与者是否active与当前hitstun tick；通用Bot在不可控制帧取消待发mobility、清空旧攻击计划并输出全中性InputFrame，恢复后按新快照重新规划。Duel、Race与Survival使用同一判断，并排除invulnerable目标；不改变Authority的动作中断、无敌、命中或位移判定。源码与测试源码均未运行。
- P4.4bq边界：普通拾取、生存供给拾取/替换及装备掉落在Equipment事务成功后，由同一个Rule Engine owner中断该参与者当前`combat`通道动作，避免旧武器动作跨到新装备身份；`locomotion/interaction`不受影响。Shared-world Survival时间线改为经Rule Engine供给代理执行，不在Mode或Bot重复判定。已过期但仍被权威持有的供给武器保持现有待回收语义，不提前中断。源码与测试源码均未运行。
- P4.4br边界：三模式Bot在权威主动作处于`charging`时暂停普通重规划、竞速路线/跳跃和生存供给追逐，仅使用当前受限观察中的合法对手位置持续朝向；目标非active、当前无敌或不存在时原地保持，不沿用旧路线。通用Bot蓄力结束后的首个可控制tick强制重新规划，蓄力追踪不叠加旧决策方向误差。未增加锁定系统、未来位置、武器身份、输入键或checkpoint字段；源码与测试源码均未运行。
- P4.4bs边界：Rule/Core的动作开始与蓄势取消事件显式携带`lane`；Weapon Feedback只追踪`combat`，忽略同批跳跃/交互起手，旧无lane证据继续兼容。蓄势取消、装备拾取/替换、Shared-world Survival供给中断及参与者失活会关闭旧动作而不伪造`attack-evaded`；Race/Survival将取消事件与战斗lane传给同一feedback owner。没有改变V6 Replay schema、输入、动作数值、命中或胜负；源码与测试源码均未运行。
- P4.4bt边界：`ActionStart`保留Action Resolver已经裁决的`source`，Duel/Race/Survival生成正式V6 `ActionStarted.sourceKind`时以该来源为准，不再用“当前是否持有武器”猜测。Survival持武器跳跃保持`base-action`且不污染武器usage；`equipment-system`起手若缺当前装备或与Duel武器动作目录冲突会失败关闭。未增加V6字段、动作、输入、装备规则或成长维度；源码与测试源码均未运行。
- P4.4bu边界：`attack-evaded`现在规范化为纯“该权威动作自然结束且零命中”的反馈，只保留攻击者、动作和起手tick，强制清空target、首命中、掉落、支撑面与归因。Core Resolver即使收到旧调用方附带的目标/支撑面上下文，也只输出规范化空上下文事件；V6合同拒绝伪装成闪避的路线或目标事实。未增加反馈种类、V6字段、命中判定、输入或动作数值；源码与测试源码均未运行。
- P4.4bv边界：目标曾被命中但在攻击归因失效后自行掉落时，V1反馈会发布`movement-fall`并清除该目标的pending hit；V2方向Owner现在消费同批无归因`PlayerEliminated`与V1下一checkpoint，只清理对应目标已失效的旧冲量记录。清理必须同时存在无归因掉落、`movement-fall`反馈与V1 pending消失三项证据，否则双Owner继续失败关闭；不会把旧武器冲量带进移动失足，也不重新分类反馈。源码与测试源码均未运行。
- P4.4bw边界：命中类反馈事件ID由V1固定为`feedback:<HitResolved source event id>`；V2方向Owner现在先用该强身份精确取得唯一pending方向，再复核攻击者、目标、Action与首次命中tick。相同攻击者、目标、动作和tick内的连续命中不再因四字段相同而歧义，前一击反馈只绑定前一击冲量，后一击继续保留为独立pending。伪造前缀、source身份或上下文仍失败关闭。源码与测试源码均未运行。
- P4.4bx边界：同一目标在一个权威步内被连续命中且帧尾已经掉落时，新命中接管后续归因之前，V1以目标最后已知权威支撑面结算被取代的前一击；最后一击继续持有pending并在随后`PlayerEliminated`中结算`hit-ring-out`。因此前一击不会因帧尾无支撑令整步失败，也不会抢占后一击的击落归因；V2按各自Hit source精确绑定两次冲量。未新增反馈种类、数值或输入，源码与测试源码均未运行。
- P4.4ci边界：Rule Engine保留“整批记录Hit，再执行已裁决命令”的既有确定性顺序；Race与Survival的反馈适配不再用单个`openFeedbackHit`覆盖同tick前序命中，而是按目标保存FIFO，逐次把真实`KnockbackApplied`绑定回对应攻击者/目标。V2方向Owner同步按目标与攻击者维护FIFO，允许多个Hit先于多个Knockback到达，同时仍以`feedback:<Hit source id>`闭合最终方向。装备替换只终止未完成动作，替换前已提交命中继续保留旧Action/tick身份；Replay Learning仍从完整实际使用集合及同动作同tick反馈计算有效武器，因此封顶或非主研究武器的真实反馈不会因本修复被压成主研究候选。P4.4bv无归因移动掉落清理保持不变；未改武器数值、命中裁决、Replay/Profile schema、默认入口或生产可达性。源码、延期测试与治理标记均为`code-written-not-run / validationStatus=not-run`。
- P4.4cj边界：正式HUD effect consumer不再在队列revision增长时重复调用仍可见反馈的视觉端口。视觉一次性身份使用上游已验证的`sourceEventId + tick + sequence`，同tick不同ID按队列稳定顺序全部提交；已消费身份暂时移出可见区再返回时也不重播。视觉水位复用队列既有64身份窗口，epoch切换与完整销毁清零，失败时在任何投影水位提交前清理外部效果；武器/动作、方向、击落与移动掉落语义继续来自同一权威反馈和方向事实，Presentation不按当前装备重标。未改Three/美术资产、反馈优先级、3视觉槽/12保留项/8声音槽上限、Rule/Core、Replay/Profile schema、默认入口或生产可达性。状态为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
- P4.4ck边界：`movement-fall`权威语义现在强制攻击者、Action与起手tick三项同时为`null`，不能伪装成有效武器动作进入Replay Learning；完整Replay在有效武器计数前另有独立纵深拒绝。二十武器HUD Host的同步Audio/Visual数据方法查找改为最多32层并拒绝原型循环，构造失败不创建inner owner或调用外部效果；吞掉生命周期重入的延期规格同步为粘性失败关闭与效果清理。当前共享字节中徒手ID集合与方向事实提交均各只有一次，不改变同tick多反馈、队列水位、Cue、数值、页面或默认入口。状态为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
- P4.4cl边界：新增Contracts纯事件资格门，只在Survival装备`ActionStarted`发生时核对当前player生命或enemy slot generation已经active。enemy初始未激活、掉落后至重新激活、player第一次掉落至精确同tick安排且readyTick/anchor精确匹配的唯一复活之前，均不能形成装备使用；第二次掉落不可伪造复活。Replay V6、Product Result汇编和结算证据都复用同一门，学习在usage重建和有效动作前再次复用。已经形成的目标pending hit允许在攻击者随后失活后于既有结果窗口闭合，P4.4ci的换装前已提交命中身份不受影响。源码、64项Vitest延期清单、Node静态反证与治理标记均为`code-written-not-run / validationStatus=not-run`。
- P4.4cm边界：Duel与Race新增共享装备起手生命期资格门。Duel参与者掉落后、Race参与者掉落至固定180 tick复活闭合前、以及Race参与者冲线后，都不能再形成新的装备`ActionStarted`；Race复活必须与同tick掉落安排、固定readyTick和原anchor精确闭合。Replay V6、Product Result汇编、结算证据及Replay Learning均在usage或有效动作前复用同一门。active期已提交的命中仍可在攻击者随后掉落、复活或冲线后完成延迟反馈，不重写原动作身份。源码、延期规格、reachability与治理标记均为`code-written-not-run / validationStatus=not-run`。
- P4.4cn边界：新增共享动作反馈结果一致性门。每条带攻击上下文的反馈必须绑定同攻击者、同Action、同起手tick且sequence更早的唯一权威`ActionStarted`；一个动作可保留多目标/多段合法命中结果，但`attack-evaded`不能重复、不能与任一命中结果共存，命中也不能发生在该动作已发布挥空之后。Replay V6、Product Result汇编和Replay Learning均复用，模式生命期由P4.4cl/cm独立核对；攻击者掉落或冲线后的合法延迟命中仍保留。源码、延期规格、reachability与治理标记均为`code-written-not-run / validationStatus=not-run`。
- P4.4co边界：Survival Runtime保留从sequence 0开始的完整`spawned / picked-up / replaced / expired`补给事实，Checkpoint V4与Terminal Evidence V2绑定完整事实前缀、stream、末序号、数量和hash。共享Contracts门按同tick事实先于动作重放世界持有关系，替换即退休旧实例，未拾取、已过期、他人持有或collection/runtime/level身份漂移的装备起手全部失败关闭。Product Settlement V3、Authority Registered Settlement V3与正式Learning Bridge V3消费同一终局证明；旧Checkpoint V1/V2/V3仍可恢复运行，但缺完整前缀时不得升级导出V4/V2证据。Replay V6、数值、输入、页面、资产和默认入口不变；源码、延期规格、reachability与治理标记均为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
- P4.4cp边界：新增20武器只读数值支配审计。只有核心动词、地面/空中目标形状、效果语义、承诺合同和失败风险全部兼容的两把武器才进入比较；射程、纵向容错、朝向覆盖、水平控制、硬直、前摇、收招和再次起手八轴要求地面与空中都不差且至少一轴严格更好，才形成待复核pair。结果不计算综合战力、不排名、不自动改数值，也不宣称整体支配；任何pair仍必须回到三模式×两图动态后果和真人反制验证。源码与延期规格已写未运行。
- P4.4cq边界与首轮红证据：2026-08-24 独立`npm run check:documentation`首次执行在`arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.ts:198`以`charge-shield/ground`缺少同源战斗语法失败。根因不是Action或权威事件缺失，而是唯一语法投影只以正式`weaponDefinitionId`索引，而读取计划/Cue稳定使用`catalogId`。现投影显式携带同源`catalogId`，VFX只按该目录键关联，并在模块加载时闭合20项目录键；既有40个ground/aerial动作Definition逐项校验、483个Cue、五类纹理、权威反馈与默认入口均不改。修复证据：两份直接Vitest规格共8项通过，受影响`arena-product-presentation`包定向TypeScript构建、复跑`npm run check:documentation`及复跑`npm run typecheck:app`均通过。全量P4候选、边界、性能、设备、真人与正式资产门仍不由此推断。

## 2. 批次与状态

| 批次 | 当前状态 | 已落盘开发输出 | 晋级前仍需补齐 |
|---|---|---|---|
| P4.0 战斗语法合同 | 静态候选已落盘 | push/pull/charge/suppress/counter/flank；精确ground/aerial；Duel/Race/Survival后果；仅primary输入；移动/跳跃反制；生存成长不增加输入或动作 | 定向单测、严格类型、恶意输入和迁移策略 |
| P4.1 首发六把与收藏扩展 | 静态候选已落盘 | 六把首发各有独立Action/Equipment/Grammar/hash和Rule/Replay入口；十四把扩展复用六种基础权威语义，形成20个不同学习问题且不增加输入 | 扩展武器逐把Rule/Replay、互撞/多目标与数值验收 |
| P4.2 无渲染规则后果 | 候选自动化已执行通过 | 六把首发24场景与十四把扩展56场景，共80个地面/空中×边缘/窄路共享Rule/Physics场景；20把均有MatchCore/Replay/checkpoint候选，六把首发另有专属语义探针 | 互撞、多seed、长局、正式Mode lifecycle与数值/真人验收 |
| P4.3 Bot与生存等级 | 候选自动化已执行通过 | 10级×20把运行时Definition；20秒首刷/间隔、每波仍只生成3把、10波轮转覆盖20把、10秒消失；真实拾取/替换/过期；基线三把1级/10级真实Rule/Physics；Bot只读取射程、就绪、最小蓄势tick与当前权威蓄势进度并输出普通InputFrame；tier policy解析V3收藏/运行时/等级身份并升级MatchReadFrame；10阶段敌人数`1→16`；P3.4b隔离shared-world候选已在同一tick中消费供给、V2 Bot输入、Rule/Physics和Survival Mode命令 | 默认生产Mode组合、集中性能/设备、数值与真人验收 |
| P4.4 Presentation与正式资产 | 候选自动化已执行通过；正式资产门未通过 | 五类因果语义、V6事件、双checkpoint原子owner、Duel/Race/Survival同批冲量方向、Session/Product/HUD只读方向事实、20武器Cue读取、20把统一手持/地面变换、权威动作阶段材质/局部变换、身体/武器VFX锚点、主次命中反馈卡、三模式首屏目标语言、正式Three方向投影与专用Cue→5张候选纹理映射；20把附件/动作/挂点/480反馈配方与60份前摇/释放/恢复音频候选已进入清单和Stage owner；阶段音频现严格闭合动作事件、装备实例、收藏/运行时武器、生存等级与事件水位；逐把生产准入矩阵分别绑定Definition/反制/动作表现/附件/命中与阶段音频/VFX、证据缺口和独立回滚单元；未批准新增正式资产 | 正式资产批准、低动效、三端、性能、设备和真人理解 |
| P4.4c 防守方反事实执行 | 候选自动化已执行通过 | control/counterfactual只改变defender movement输入；Grammar限制`direction/jump`；真实Movement/Physics离地、物理位移、支撑/掉落、命中与首次命中tick证据绑定14把逐把probes | 具名无可区分结果的数值/真人验收 |
| P4.4d 20把空间与多目标反制 | 候选自动化已执行通过 | 完整收藏目录×高低差/多目标/碰撞边缘共60个probe；真实装备拾取、Action选择、Movement、Physics、冲量、支撑/掉落；只置换候选顺序或defender方向/跳跃输入 | 数值、性能与真人验收 |
| P4.4f/g/h/bj/bk 恢复后缀、失败关闭与选择闭包 | 候选自动化已执行通过 | 三模式真实runtime可从完整capability分叉；V1比较同一下一帧，V2比较2–240个连续非终局tick的完整step/反馈/checkpoint/content/state hash与真实retained resource snapshot；活动分支固定持有authority与mode driver，恢复分支销毁后要求资源和提交记录归零；六类既有故障和连续/恢复资源读取故障可按调用序号组成最多8项计划，支持destroy与销毁后读取双失败聚合；端口只接受数据方法；未知V6事件直接失败；Duel/Race精确一把与Survival完整20把选择绑定最终assignment及runtime checkpoint | 更长压测、默认入口与正式设备门 |
| P4.4i/j/k 二十武器三模式反馈读取与HUD宿主 | 候选自动化已执行通过 | 20个独立反馈签名、40个动作绑定、6个核心动词表现族、5类语义、3个模式焦点；解析容量480个武器动作反馈组合加3个全局移动失足组合；显式适配器和候选epoch宿主把武器专属Cue送入既有HUD反馈队列和效果consumer，保持原有epoch、去重、预算与清理owner，并把读取计划缓存限制在当前epoch/64项seen窗口 | 正式资产、低动效、三端和真人归因 |
| P4.4bl 三模式可重放故障报告 | 候选自动化已执行通过 | 每模式11场景，覆盖fork、连续/恢复步进、capability损坏、未知事件、两侧资源读取、destroy、destroy后读取和双清理失败，共33项；Duel固定97个非终局比较tick，Race/Survival各120；统一报告只保存错误名/消息/有界Aggregate子项、触发证据、清理结果和确定性hash，逐场runtime由装配器独占销毁 | 默认Registry、Composition、入口及正式门继续断开 |
| P4.4bm 真实三模式故障清单装配 | 候选自动化已执行通过 | 复用正式QuickMatch roster/content/final assignment规则，按固定seed建立并启动真实Duel 1+1、Race 1+3、Survival 1+16 runtime；每场输入从实际稳定tick开始，调用方独占销毁；Node完整执行33场并确认计划触发、资源归零和报告hash | 正式入口、性能/设备与生产批准继续关闭 |
| P4.4bn 三模式Bot蓄势输入节奏 | 代码与未运行测试源码已写 | Rule公共投影提供最小蓄势tick；受限观察只携带当前权威蓄势状态/进度；共享纯函数输出普通`primaryPressed/primaryHeld`。通用Bot、Duel、Race与Survival敌人统一按“按下→持有→门槛松开”驱动，不识别武器ID，不新增checkpoint状态 | 集中执行press/6tick/8tick、暂停恢复、换武器、20把×三模式Bot矩阵；确认蓄势动作不会提前取消且普通动作不重复触发；默认Registry/Composition/entry继续断开 |
| P4.4bo Bot冷却与活动动作就绪闭包 | 代码与未运行测试源码已写 | 共享只读投影把`action idle`与装备`cooldownRemainingTicks`合成可开始事实，同时单独保留当前动作是否进行中；通用Bot攻击目标选择、Controller、Duel、Race与Survival敌人均消费同一语义。冷却不再被误认成蓄势首帧，未知commitment状态失败关闭 | 集中执行空手/装备、冷却0/1、普通/蓄势、拾取替换、暂停恢复与20把×三模式矩阵；确认冷却期间零攻击输入且进行中的蓄势不中断；默认Registry/Composition/entry继续断开 |
| P4.4bp Bot控制可用性与中性化 | 代码与未运行测试源码已写 | 共享纯投影以`active && hitstunTicks===0`给出当前可控制事实；通用Bot不可控制时取消mobility、清空计划和attack tick，Duel/Race/Survival返回中性帧；Duel/Race攻击目标与通用/Survival一致排除当前无敌参与者 | 集中执行受击前/中/后、淘汰、重生保护、进行中蓄势被打断、checkpoint恢复与三模式回放；确认硬直零输入且恢复首帧使用新观察；默认Registry/Composition/entry继续断开 |
| P4.4bq 装备身份变化与旧动作中断 | 代码与未运行测试源码已写 | ActionExecution新增具名lane中断；Rule Engine在普通拾取、供给拾取/替换及装备掉落事务成功后只中断`combat`，不取消跳跃/下砸移动。MatchCore既有供给代理与Shared-world Survival均走同一Core owner；事务后中断/合同异常令Engine失败关闭 | 集中执行普通拾取、20秒供给、替换、掉落、蓄势中身份变化、空中拾取、同tick新武器攻击、checkpoint/Replay与事务后故障；确认旧动作归零、移动通道保留且当前装备成为唯一Action来源；默认Registry/Composition/entry继续断开 |
| P4.4br 三模式蓄势目标追踪 | 代码与未运行测试源码已写 | 通用、Duel、Race与Survival Bot在当前权威commitment为`charging`时冻结非战斗路线和跳跃，持续输出普通方向输入追踪当前合法目标；目标无效时中性保持，生存V2不再为可见供给放弃进行中动作，通用Bot结束蓄势后立即重规划 | 集中执行目标移动/消失/无敌、蓄势跨段、供给同时出现、受击中断、恢复与20把×三模式矩阵；确认无未来观察、无旧路线漂移、无锁定状态且松开后恢复正常决策；默认Registry/Composition/entry继续断开 |
| P4.4bs 战斗lane反馈与中断闭包 | 代码与未运行测试源码已写 | Rule事件为ActionStarted/Commitment transition保留权威lane；Feedback仅追踪combat，并将取消、拾取、替换、显式供给中断和失活解释为无闪避结果的关闭。Survival同tick多拾取按participant稳定去重，Race/Survival手工source与Duel MatchCore source保持同口径 | 集中执行快速同tick攻击、战斗+跳跃并发、蓄势取消、普通/供给替换、淘汰、恢复与三模式Replay；确认无伪闪避、无丢失真实反馈且feedback checkpoint水位一致；默认Registry/Composition/entry继续断开 |
| P4.4bt 动作来源到V6使用事实闭包 | 代码与未运行测试源码已写 | Action Execution把已选Candidate source带入瞬时ActionStart；三模式只将`equipment-system`投影为正式V6 equipment起手并要求装备身份闭合，其他动作统一为base-action。持武器跳跃/移动不再进入武器使用摘要或成长绑定 | 集中执行持武器跳跃、同tick攻击+跳跃、地面/空中装备动作、拾取后首击、Replay usage重建与三模式Result；确认来源不漂移且旧武器学习链只消费真实装备动作；默认Registry/Composition/entry继续断开 |
| P4.4bu 闪避反馈无路线上下文规范化 | 代码与未运行测试源码已写 | Semantic V1合同要求`attack-evaded`的target、命中、掉落、支撑面和归因全部为空；Core Resolver统一清洗旧输入上下文，Feedback Adapter继续只在真实combat动作自然结束且零命中时发出该事件 | 集中执行旧输入规范化、伪造target/surface拒绝、三模式挥空、取消/中断无事件、Replay恢复与Presentation读取；默认Registry/Composition/entry继续断开 |
| P4.4bv 无归因掉落方向清理闭包 | 代码与未运行测试源码已写 | V2方向Owner以同批无归因掉落、V1 `movement-fall`输出和下一checkpoint pending消失三方闭合，精确删除该目标过期命中的方向记录；Bundle仍原子提交双checkpoint | 集中执行超过归因窗后掉落、同tick新旧命中覆盖、恢复分支及三模式真实掉落；默认Registry/Composition/entry继续断开 |
| P4.4bw 连续命中方向强身份绑定 | 代码与未运行测试源码已写 | V2方向Owner以V1规范反馈ID精确绑定原始Hit source，再复核攻击者/目标/动作/tick；同tick连续命中各自保留独立冲量和pending生命周期 | 集中执行多段攻击、同tick同目标连续命中、多目标交错、恢复与三模式Replay；默认Registry/Composition/entry继续断开 |
| P4.4bx 连续命中后即时击落闭包 | 代码与未运行测试源码已写 | 后一击接管目标归因时，前一击以最后已知权威支撑面结算；最后一击继续独占ring-out归因，双方向事实分别绑定各自冲量 | 集中执行同tick两击/多击后掉落、跨surface、恢复与三模式范围武器；默认Registry/Composition/entry继续断开 |
| P4.4ci 分组多目标命中反馈因果闭包 | 代码与未运行测试源码已写 | Race/Survival以按目标FIFO保留同tick全部Hit；V2方向Owner以目标+攻击者FIFO配对分组到达的Knockback，再以精确Hit source发布方向。旧动作已提交命中不被换装后的新动作身份覆盖，Replay/Learning继续读取完整实际使用武器集合 | 集中执行多目标范围命中、同目标多段命中、多攻击者交错、拾取替换、checkpoint恢复及非主研究/封顶武器反馈；默认Registry/Composition/entry继续断开 |
| P4.4cj 表现反馈一次性身份闭包 | 代码与未运行测试源码已写 | Effect Consumer按`sourceEventId + tick + sequence`保留有界视觉消费水位；同tick不同ID依次进入视觉/声音端口，后续revision、暂时隐藏后重现、暂停恢复和同epoch重绘不重播；epoch切换清零且不跨session泄漏 | 集中执行同tick三反馈、同目标多击、移动掉落/击落混合、换装后旧Action、checkpoint恢复、页面重进、64身份窗口及外部端口故障；默认Registry/Composition/entry继续断开 |
| P4.4ck 移动掉落因果与HUD同步端口闭包 | 代码与未运行测试源码已写 | movement-fall必须为零攻击上下文，Replay Learning在有效武器计数前独立拒绝伪攻击事实；HUD端口方法原型链限定32层并拒绝循环/访问器 | 执行合同、伪Replay、循环/超深原型、吞重入清理与三模式真实移动掉落；默认Registry/Composition/entry继续断开 |
| P4.4cl Survival装备起手代次资格闭包 | 代码与未运行测试源码已写 | Contracts按事件顺序只接受active player或active enemy slot generation的装备起手；Replay/Product/Learning复用，player首次复活精确绑定fall tick/readyTick/anchor，第二次掉落不得伪复活 | 执行未激活/退役slot、掉落-复活窗口、伪readyTick/anchor、结算usage和延迟pending-hit矩阵；默认Registry/Composition/entry继续断开 |
| P4.4cm Duel/Race装备起手生命期资格闭包 | 代码与未运行测试源码已写 | Contracts按事件顺序只接受active competitor的装备起手；Duel掉落后禁用，Race掉落至180 tick精确复活前及冲线后禁用；Replay/Product/Learning复用 | 执行Duel掉落、Race掉落/安排/复活/冲线、伪readyTick/anchor、结算usage和合法延迟反馈矩阵；默认Registry/Composition/entry继续断开 |
| P4.4cn 动作反馈结果一致性闭包 | 代码与未运行测试源码已写 | Contracts要求攻击反馈引用唯一先行权威起手；同一动作允许多目标命中，但挥空不可重复且不可与命中共存；Replay/Product/Learning复用 | 执行孤儿反馈、反馈先于起手、命中后挥空、挥空后命中、多目标/多段合法命中及掉落后延迟反馈矩阵；默认Registry/Composition/entry继续断开 |
| P4.4cp 20武器数值支配审计 | 代码与未运行测试源码已写 | 固定目录投影40个地面/空中动作；仅在核心动词与非比较语义hash一致时比较八个明确方向数值轴；双上下文都不差且至少一项严格占优才输出复核pair；禁止综合分和自动调参 | 首次执行并读取具名pair；把每个pair送入三模式×两图后果、Bot反制、拾取率/命中率/击落率和真人理解验证后再决定数值，不得用静态pair直接判定上位替代 |
| P4.4ce 单把生产注册前配置封套 | 代码与未运行测试源码已写 | 只接受stored assessment、同一active Registry reference、Host/Publication owner ID与持久端口选项；内部重算12步plan，双读read/readHead，验证20武器连续前缀与下一目标，再建立runtime registration assembly。输出绑定assessment/readiness/plan、正反12步、source revision/hash/prefix、目标和Host配置身份；不创建Host、不发布/激活/交换引用 | 集中执行getter/prototype pollution、active read漂移、跳号/重复/已存在目标、assessment/plan/assembly身份漂移与Host后续构造；默认Registry/Composition/entry继续断开 |
| P4.5 单把生产注册 | 未开放；逐把准入、空revision 0基线、首把/后续同门晋级、持久CAS、durable active、原子引用、协调器、orphan恢复、启动加载及显式三模式候选消费已写，未运行 | 持久端口禁止非空初始快照；首把provisioning只接受已存评估并内部重算12步计划，固定`评估→计划→发布→回执→激活→引用交换→封存→非空bootstrap→Owner移交`，失败回滚后可从新空active revision重建；运行时拒绝空基线。后续武器沿同一顺序晋级 | 补首把故障/并发/跨进程与三模式执行、全部硬门和独立审计；默认实例、默认Composition与入口仍需最终批准批次 |

## 3. P4.0 武器战斗语法

新增`packages/arena-definitions/src/weapon-combat-grammar-definition-v1.ts`，约束如下：

1. 每把武器只能选择一个首要动词：`push`、`pull`、`charge`、`suppress`、`counter`或`flank`。
2. 操作精确复用`primary`，上下文精确为`ground → aerial`；不增加格挡、冲刺、技能或模式专属按键。
3. 每个上下文必须声明动作身份、预期结果、地图情境、失败成本和仅由方向/跳跃构成的反制输入。
4. 每把武器必须按`duel → race → survival`覆盖三模式，每个模式至少两类地图情境和两项可观察后果。
5. 生存成长必须锁定动作语义，禁止增加输入或动作，只能改变明确许可的距离、冲量、冷却和硬直数值轴。
6. 合同采用exact-key、恶意输入克隆和深冻结；未知字段、顺序漂移、重复集合或不完整覆盖均失败关闭。

## 4. P4.1 三把基线武器

| 武器 | 首要动词 | 地面职责 | 空中职责 | 主要失败成本 | 生存成长许可 |
|---|---|---|---|---|---|
| 重锤 | push | 高水平击退、边缘威慑 | 下压范围击退 | 长恢复、落地承诺 | 距离、水平冲量、冷却 |
| 引力锁链 | pull | 从安全位拉出目标 | 空中宽幅位移 | 瞄准承诺、落地承诺 | 距离、水平冲量、冷却 |
| 冲锋盾 | charge | 自身前冲并推开目标 | 向下抢占路线入口 | 自身冲出边缘、落地承诺 | 目标水平冲量、冷却、硬直 |

冲锋盾边界已按产品约定收敛：它是`charge`武器，不是防御系统；候选显式`guardEnabled=false`，不包含`front-guard`、格挡、减伤或无敌效果，也不新增格挡按键。其生存成长不得放大自身前冲位移，避免等级改变基础操控语义。

三把候选共同满足：

- 从`ARENA_GAMEPLAY_V2_TUNING`读取当前权威数值，不复制历史v1内容；
- 每把各有地面/空中两个Action Definition和一个Equipment Definition；
- 构造时验证Action/Equipment/Grammar身份闭合并生成确定性content hash；
- `status=production-unreachable`、`hardGate=false`、`defaultRegistryWired=false`；
- 不依赖experiment、Three.js、DOM、墙钟或未注入随机。

### 4.1 三把研究语言的独立静态候选

| 武器候选 | 首要动词 | 地面职责 | 空中职责 | 主要失败成本 | 仅用基础操作的反制 |
|---|---|---|---|---|---|
| 直线压制 | suppress | 长而窄的直线路线压力 | 空中保持路线射线，不强制下砸 | 覆盖窄、横移后价值快速下降 | 横移或跳跃 |
| 读招反制 | counter | 按住同一primary形成承诺后高回报出手 | 空中短承诺拦截，不增加按键 | 提前松开取消、锁朝向、长恢复 | 改变进入节奏或跳离 |
| 绕后 | flank | 只在目标背向锥内成立 | 从高低差切入背向区域 | 位置依赖、正面无效 | 转向、移动或跳跃 |

后三把均为从研究功能语言重新编译出的正式包内Definition，不导入或复制`arena-v1-experiment`实现。`rear-cone`按目标朝向的归一化向量判定，避免角色朝向向量长度意外改变绕后容错。`arena-v2-launch-weapon-catalog-candidate-v1.ts`只建立六把唯一身份、六种首要动词和固定迁移顺序的生产不可达目录，不等于一次性开放六把生产注册。

后三把已按固定顺序各自增加独立执行报告：

- `arena-line-suppressor-verification-v1.ts`覆盖长窄目标的地面/空中、边缘/窄路后果；空中动作明确不生成下砸Movement Command。
- `arena-read-counter-verification-v1.ts`让primary hold穿过真实ActionExecution；场景记录承诺成功事件，地面/空中另有tick 1提前释放取消探针，MatchCore Replay报告承诺事件数量。
- `arena-flank-blade-verification-v1.ts`使用正式TargetingRegistry证明归一化目标朝向下背后成立、正面拒绝，并复用真实Rule/Physics和MatchCore Replay链。

三份执行报告均复用正式MatchCore、Headless Replay、checkpoint和权威反馈hash链，但全部未运行，不能据此宣称场景或Replay已通过。

### 4.2 十四把收藏扩展的最小功能版本

`arena-v2-expanded-weapon-candidates-v1.ts`以六把首发武器的正式Action/Equipment/Grammar为模板，只在允许的射程、覆盖、朝向、前摇、有效期、恢复、冷却、冲量与硬直轴上生成十四组新Definition。扩展目录包含钩矛、爆发拳套、跃迁枪、散射炮、天锚、边镰、回弹钩、脉冲棍、攻城斧、双扇、俯冲爪、路线弓、转身刃与蓄势拳；每把有独立地面/空中动作、收藏身份、学习问题和content hash。

这些候选只复用`direction + jump + primary`，不增加技能栏、格挡、冲刺或模式专属操作；它们是面向200小时收藏目录的最小功能差异，不冒充十四套已完成的独立系统或正式美术。`arena-v2-collection-weapon-catalog-candidate-v1.ts`将六把首发与十四把扩展闭合为20把唯一身份，并保持默认Registry断开。

`arena-expanded-weapon-verification-v1.ts`把十四把扩展接到与基线相同的真实Rule/Physics执行器和MatchCore/Replay/checkpoint执行器，预定义56个地图后果场景和14个Replay运行；该入口尚未执行，不能把“复用执行器”写成“逐把验证通过”。

P4.4c在`arena-baseline-weapon-consequence-verification-v1.ts`内增加了共享防守方反事实执行能力，并由`arena-expanded-weapon-counterplay-verification-v1.ts`为14把武器的ground/aerial各构造一组edge control/counterfactual证据。两条链使用同一武器、场景、seed与tick顺序，只允许defender的`direction/jump`发生差异；输入进入真实`MovementSystem.prepareTick/execute`和`PhysicsWorld`，Rule仍只读真实actor状态。每组证据保留完整输入帧、命中数、首命中tick、Movement command数、位移、支撑与掉落及确定性hash；只有实际形成攻击或物理观察差异时，probe才会进入`executed-counterfactual-candidate-unverified`，否则保留具名dynamic closure gap。该代码与测试已写，本批严格未运行，不能以字段名冒充动态通过。

P4.4d新增隔离的`arena-expanded-weapon-spatial-counterplay-verification-v1.ts`，不从`arena-regression`主index导出，也不接默认Registry或生产Composition。它精确覆盖20把收藏武器，每把固定三类probe：ground/aerial高低差及defender反事实、多目标候选插入顺序置换、碰撞/边缘位置下的方向/跳跃反事实。场景均通过真实Equipment拾取、Rule ActionExecution、Movement command、Physics冲量与逐tick支撑/killY观察；计划使用exact-key、20把目录hash、60个唯一probe ID和固定seed失败关闭。结果只允许`observed / indistinguishable / deferred`，代码中的状态分类不是执行通过；当前整批仍为`not-run`。

## 5. 已写入但未执行的验收入口

- 武器语法合同单测：冻结、精确上下文/模式顺序、未知字段、新输入、新动作和未知成长轴失败关闭。
- 六把首发独立单测与20把收藏目录测试：Registry身份闭合、权威调优映射、三模式后果、承诺/后向判定、冲锋盾无格挡、20个学习问题和全部唯一身份。
- P4 reachability测试：默认生产根在门禁批准前不可引用候选符号或文件。
- P4治理脚本：导出面、权威依赖、平台隔离、确定性禁令和候选状态标记；Core `begin-down-smash` handler已纳入authority/export检查，authority永久拒绝`arena-v1-composition/content`。
- 聚合入口：`arena:p4:candidate:test`与`arena:p4:candidate:gate`；当前延后清单精确登记63个Vitest文件与1个Node reachability文件，均未执行。本批补入HUD反馈视觉一次性消费、同tick多ID顺序与重绘不重播反证；此前已登记单把注册配置封套、Registry-backed Local assessment-only、角色武器首屏可读性、武器阶段音频owner、单武器生产评估/登记/发布链和三模式反馈真实故障Replay候选测试；`action-primitives.test.ts`与P3、`arena-v2-weapon-feedback-presentation.test.ts`与P5、`arena-v2-mode-hud-effects-and-markers-v1.test.ts`与P2/P5/P6分别作为Core动作、反馈投影和HUD效果生命周期的有意跨阶段共享边界保留，P4阶段内无重复项。
- Core down-smash handler单测：空参数、extra/accessor/Symbol/hostile输入、source own-data身份、`ACTION_STARTED`触发及冻结的最小Rule Command；源码已写入聚合清单但未运行。
- MatchCore回放候选单测：三把武器逐把比较原局、Headless Replay与内部checkpoint恢复后的最终状态hash，并要求正式命中/击退事件进入Replay。
- 十四把扩展统一执行测试：56个地面/空中×边缘/窄路场景，以及14个MatchCore原局/Replay/checkpoint恢复和反馈事件hash闭包。
- 十四把防守方反事实测试：真实Rule/Movement/Physics确定性重跑，防守方唯一输入差异，direction/jump逐通道执行，缺失/重复/非连续tick、future字段、非有限数和accessor失败关闭。
- 20把空间反制矩阵测试：高低差、多目标候选顺序置换、碰撞/边缘方向与跳跃反事实共60个probe，目录/输入/生命周期hash和恶意计划失败关闭。
- 生存等级与供给单测：10级×20把闭包、每波只出现3把、10波覆盖全部20把、Grammar白名单、冲锋盾无格挡/自身位移不成长、开局无武器、20秒三刷、10秒消失、靠近拾取替换和第10波十级映射。
- 压力与长局单测：10阶段敌人数量单调`1→16`、16个稳定slot、Bot 10801 tick普通InputFrame、checkpoint后下一帧hash，以及MatchCore 3 seed×10波Replay终局hash。
- 命中反馈单测：五类语义合同、归因时序、支撑面转移、击落归属、挥空、移动失足、V6公共事件和Presentation只读映射。

以上均为`not-run`。依据当前开发优先指令，本批不等待执行结果，发现问题时顺延到集中验证窗口修复。

## 6. P4.2a 真实Rule/Physics后果候选

新增`packages/arena-regression/src/arena-baseline-weapon-consequence-verification-v1.ts`：

1. 三把武器均通过真实`EquipmentSystem`完成生成和拾取，由真实`ArenaRuleEngine`完成动作选择、动作状态、目标筛选、Effect解析和Command提交。
2. 每把覆盖地面/空中两个上下文，以及同一KZ地图上的边缘/窄路两个场景，共12个后果场景。
3. 命中产生的硬直和冲量通过正式Mutation Port写入共享轻量Physics；随后推进240 tick，记录失去支撑、掉落、最大水平位移、最终表面和最终状态。
4. 空中动作生成的`begin-down-smash`由`arena-core`正式V1 effect handler转换为最小Rule Command，再由ArenaRuleEngine补齐actionDefinitionId并交给正式Movement Command；执行器按MatchCore相同的`advance timers → movement prepare → action resolve → movement execute → rule commit → active resolve → physics step → movement complete`顺序逐tick推进windup、active与后续下砸状态。该迁移代码已写、未运行，P4 authority治理禁止重新引入`arena-v1-composition/content`。
5. 每个武器/上下文另有真实挥空探针和装备冷却拒绝探针；每把地面动作另有错开一tick启动的打断探针，要求目标在active阶段被`interrupt-action`提交后退出动作。
6. 当前明确不覆盖正式Mode lifecycle、Replay/checkpoint、互撞矩阵、多seed、长局和任何平衡结论。

该执行器和对应测试均未运行。代码存在不等于场景通过，12个场景的命中数、位移和掉落结果必须等集中验证后才能成为证据。

## 7. P4.2b MatchCore、Replay与checkpoint恢复候选

新增`packages/arena-regression/src/arena-baseline-weapon-matchcore-replay-verification-v1.ts`：

1. 为三把基线武器逐把创建独立的正式`MatchCore`，复用P3 KZ地图表面与验证角色，但使用P4专属、生产不可达的双人对局地图身份。
2. 供给拾取、primary动作、命中、击退、状态推进和超时终局都由`MatchCore`真实权威链执行；验证器不直接写入命中或位移结果。
3. 每局由`HeadlessMatchRunner`记录完整输入、权威事件、周期checkpoint和最终hash；随后通过`createReplayMatch`从tick 0完整重放。
4. 同局在tick 40导出内部checkpoint，再通过`restoreMatchCoreFromCheckpoint`重建权威前缀并继续消费原Replay后缀。
5. 候选报告同时保留原局、完整Replay、checkpoint初始状态和恢复后终局hash，并记录动作开始、命中和击退事件数量。
6. 当前明确`exercisesP2ModeLifecycle=false`：该批没有伪造尚未冻结的正式Race/Survival Policy身份，也没有接入默认生产Composition。

该执行器和对应测试均为`not-run`。在集中验证前，不能宣称三把武器已经通过MatchCore、Replay或checkpoint门禁。

## 8. P4.3a 生存10级武器与供给候选

新增`packages/arena-product-content/src/arena-v2-survival-baseline-weapon-tiers-candidate-v1.ts`：

1. 20把收藏武器分别生成level 1–10的运行时Action、Equipment和Grammar，共200个运行时装备、400个运行时动作；收藏身份继续使用20把稳定的collection Equipment ID。
2. 所有等级继续只使用`primary`，地面/空中动作数量、effect种类和核心动词不变；不得增加新按键、新动作、格挡、减伤或无敌。
3. 每把只按自身Grammar白名单成长；冲锋盾仍只成长目标水平冲量、冷却和硬直，其`apply-self-impulse`在1–10级保持不变。承诺时序、后向判定语义、动作数量和输入均不随等级变化。
4. 当前候选曲线从level 1到10分别达到：射程`1.00→1.27`、目标水平冲量`1.00→1.36`、冷却`1.00→0.82`、许可武器硬直`1.00→1.18`。这是待验收初值，不是平衡结论。
5. 供给Definition固定60 tick/s：开局无初始武器，tick 1200首次生成，之后每1200 tick生成3把，世界内未拾取武器600 tick后消失；tick顺序保持`spawn → expire → pickup → action`。
6. 三个供给槽位绑定12段KZ地图的起点、中段与终段刷新点，场上复杂度不因收藏扩充而增加；每波按固定目录步进3把，前7波已覆盖全部20把，10波内允许重复但每轮使用对应level。刷新高度使用角色碰撞中心高度，确保自动拾取半径可达。
7. `EquipmentSupplyTimelineSystem`通过显式、数据化、默认关闭的`waveEquipmentOverrides`同时解析武器轮换和等级：wave 0–9解析level 1–10，后续波次保持level 10；未传该字段时旧行为不变。

新增两个无渲染候选：

- `arena-survival-baseline-weapon-supply-verification-v1.ts`使用真实`EquipmentSystem`与`EquipmentSupplyTimelineSystem`推进到第10波，记录无初始装备、三件生成、世界过期、首次拾取、二次替换和第10波runtime身份。
- `arena-survival-weapon-tier-consequence-verification-v1.ts`将三把武器的level 1/10共6组运行时Definition送入P4真实Rule/Movement/Physics后果链，复用同一场景验证语义没有因成长分叉。

以上实现和测试均为`not-run`；正式Survival Mode lifecycle、压力曲线、多seed和长局仍未闭合。

## 9. P4.3b Bot武器使用边界

新增`packages/arena-bot/src/survival-enemy-weapon-affordance-v1.ts`及无渲染候选：

1. 装备/规则只向Bot暴露`primaryRange`、`actionReady`、`minimumCommitmentTicks`和当前权威`commitment.status/chargeTicks`；不暴露collection/runtime ID、等级、Effect、朝向结果或命中接口。
2. Bot继续读取受限Survival Observation，并且只能输出与玩家同构的`ArenaInputFrame`；不能直接命中、位移、拾取或改写冷却。
3. 重锤和引力锁链的level 1/10使用同一Controller决策链，射程成长只改变“是否进入可攻击距离”；冲锋盾射程不成长，等级不改变操作语义。
4. 冷却和动作阻塞统一关闭primary，不为Bot增加专属技能或模式按键。

该边界及3把×level 1/10候选均为`not-run`，不能据此宣称Bot已通过公平性或压力曲线验收。

## 10. P4.3c V3供给身份与MatchReadFrame适配

新增`EquipmentSupplyTimelineSystem.getPublicSupplyProjectionV3()`与`composeSurvivalMatchReadFrameV3()`：

1. V3供给身份只通过`SurvivalEquipmentTierPolicyDefinition`解析collection ID、runtime ID与survival level，禁止解析Definition ID字符串猜测等级。
2. 投影保持`Mode → tier policy → wave → slot → supply lifecycle → world equipment`双向闭包，并继承`+599可见 / +600 pre-expiry不可重同步 / +601已清理`边界。
3. MatchRead适配将已有V2权威帧中的held/world runtime统一提升为V3双身份，供给只引用同一world equipment实例；局部操作侧车仍只读并升级schema，不增加控制能力。
4. `arena-survival-tiered-supply-matchcore-verification-v1.ts`已把开局空手、tick 1200三件生成、同tick拾取优先于攻击、真实命中/击退、V3剩余两件世界供给、玩家level 1持有身份和Headless Replay串成一个生产不可达候选。
5. 该候选继续明确`exercisesP2ModeLifecycle=false`；使用的是P4候选Mode身份，未注册正式Survival Definition/Policy/Composition。

以上代码和测试均为`not-run`。

## 11. P4.3d 压力曲线、Bot长局与十波MatchCore候选

新增生存压力与长局静态候选：

1. `arena-v2-survival-pressure-candidate-v1.ts`只定义一个敌人权威/视觉族和16个稳定slot，不因压力增加敌人类型或操作维度；10个阶段与20秒供给波次对齐，目标数量为`1/2/3/4/5/6/8/10/12/16`。
2. `SurvivalPressureResolverV1`只按整数tick和已注册Policy解析当前阶段、active slot、重生锚与下一阶段tick；不读取墙钟、Renderer、DOM或未注入随机。
3. `arena-survival-pressure-bot-long-run-verification-v1.ts`让16个同族Controller运行tick 0–10800，共10801 tick；未激活slot输出中性InputFrame，激活slot也只能通过受限Observation和武器affordance输出普通InputFrame，并保留checkpoint后下一帧hash闭包。
4. `runArenaSurvivalTenWaveMatchCoreVerificationCandidateV1()`使用3个固定seed推进真实MatchCore十波供给，记录30次生成、逐波拾取替换、最终level 10运行时身份和Replay最终hash。
5. 以上仍不表示正式Survival Mode lifecycle已接线；压力、Bot和MatchCore候选均保持`production-unreachable / hardGate=false / not-run`。

## 12. P4.4a 权威反馈语义与只读Presentation适配

新增`weapon-feedback-semantic-v1.ts`、`weapon-feedback-resolver-v1.ts`并扩展V6事件边界：

1. 五类结果固定为`hit-confirm / hit-surface-transfer / hit-ring-out / attack-evaded / movement-fall`；事件保留动作起始、首次命中、掉落tick、初末支撑面、掉落原因和归因攻击者。
2. Rule/Core归因器只消费完成后的权威结果快照：同支撑面命中、支撑面改变、被命中归因的掉落、无命中挥空、无命中归因的移动失足分别产生唯一语义；时序或归因矛盾直接失败关闭。
3. `ArenaMatchEventV6`新增`WeaponFeedbackResolved`，`ModeMatchRuntimeV6`校验攻击者、目标和归因者均属于当前对局；事件可以随现有只读V6流进入Presentation。
4. `projectArenaWeaponFeedbackEventV6PresentationEvent()`只选择现有视觉Cue、音频Cue、强调级和文案，不读坐标、不重算支撑面、不猜击落原因；旧研究入口暂时保留，避免本批扩大迁移面。
5. 真实Rule/Movement/Physics后果候选已静态接入归因器：12个命中场景产出命中类语义，完整挥空窗口产出`attack-evaded`，独立真实移动掉落产出`movement-fall`。
6. `MatchCoreWeaponFeedbackAdapterV1`已作为P4专属、生产不可达桥接器落盘：它逐tick校验旧MatchCore权威事件水位和最小只读participant observation，跟踪动作、首次命中、最后支撑面与淘汰归因，再产生V6反馈；默认MatchCore和生产Composition没有接线。
7. P4.4b为该适配器增加exact-key、身份hash绑定的Checkpoint V1：保存参与者/窗口/tick/事件水位、未结束动作、待归因命中和最后支撑面；恢复前完整校验引用与时间闭包，step改为工作副本原子提交，失败不会留下半写状态。连续与恢复链的命中确认、闪避和篡改/失败原子性测试代码已写入但未运行。
8. 三把MatchCore Replay候选已同时记录原局与tick 0重放产生的反馈事件hash；挥空在动作窗口闭合时发布，命中结果在有界权威tick窗口后按最终支撑面发布，击落/移动失足按`PlayerEliminated`归因发布。所有执行仍为`not-run`。
9. P4.4e把同一个`MatchCoreWeaponFeedbackAdapterV1`真实owner接入Race与Survival候选：构造绑定正式participant顺序和只读world observation；每个authority step只消费本批真实Rule命中、动作与掉落事件；checkpoint纳入world state hash，恢复先重建并逐值核验feedback checkpoint，再与Physics/Movement/Rule等资源一起原子替换；销毁纳入逆序owner清理。Duel保留既有同等级实现。反馈结果窗口统一为具名20 tick：无归因movement fall始终提交；credited fall只有在`tick - lastHitTick <= 20`时才交给feedback owner闭合ring-out，超过窗口仍保留模式V6的真实`credited-hit`掉落，但不伪装movement fall，也不向已闭合pending hit重复提交`PlayerEliminated`。
10. 新增`ArenaModeWeaponFeedbackCheckpointCapabilityV1`值级证明：它嵌入并重验完整`ModeMatchRuntimeCheckpointV1`，从真实`worldAuthorityCheckpoint.feedbackCheckpoint`派生能力身份，闭合mode、participant顺序、tick与checkpoint hash。三模式QuickMatch composition不接受布尔能力标识，而是在构造每个真实runtime后要求存在明确的`exportWeaponFeedbackCheckpointCapabilityV1()`数据方法。
11. Race/Survival场景代码在真实中局恢复前后重算并比较完整capability及feedback checkpoint身份；Race结构断言同时要求已归因ring-out发生在20 tick feedback窗口内。超过20 tick但仍处于模式归因窗口的credited fall跳过feedback source event这一边界已在本段冻结；该边界的动态反证、恢复后缀执行器的实际运行证据、hostile method替换和更细清理失败矩阵仍顺延到集中验证批次，不得由静态字段冒充。
12. P4.4f为Duel/Race/Survival三个真实runtime补齐同名数据方法：直接导出完整runtime checkpoint，并可从`ArenaModeWeaponFeedbackCheckpointCapabilityV1`创建独立恢复分支。统一恢复后缀执行器只接受目录内三种Mode，在稳定非终局tick向连续分支和恢复分支提交同一local `InputFrame`，比较完整step outcome、`WeaponFeedbackResolved`事件、runtime checkpoint identity、feedback checkpoint identity与state hash；恢复分支无论成功或失败均进入清理。三模式composition构造时同时要求这三个方法真实存在，不能用布尔标记冒充。对应代码和测试清单已写，仍未运行。
13. P4.4g增加纯Regression故障注入runtime，不进入默认Composition：`fork-after-construction`在恢复分支创建后立即清理并失败；连续/恢复step可分别在委托前中止；恢复capability可注入feedback tick损坏；连续step可注入未知V6事件并由后缀执行器的正式事件构造器拒绝；恢复destroy可在完成底层清理后报告失败。执行器捕获runtime原型链上的真实数据方法，拒绝getter/setter伪装，端口捕获失败时尝试回收已创建分支并聚合清理错误。所有计数只存在于Regression evidence，不写入权威状态。
14. P4.4h新增`ArenaThreeModeContentSelectionCheckpointCapabilityV1`：它同时嵌入并重验`MatchContentSelectionV2`、`FinalizedMatchAssignmentV2`和完整`ModeMatchRuntimeCheckpointV1`，要求Mode、content hash、participant assignment、participant character逐值闭合。Duel/Race只能冻结目录内精确一把武器，且当前只读世界中每名参与者与全部装备实例都必须持有该选择；Survival必须冻结按稳定顺序排列的完整20把收藏武器池，当前参与者/世界出现的任意装备也不得越出该池。三个真实runtime均从构造时已验证并保存的selection/assignment导出该能力，三模式composition构造时要求真实数据方法存在，恢复后缀执行器也比较连续/恢复分支的selection capability与runtime checkpoint identity。未知字段、accessor、目录外武器、缺项和派生hash漂移均失败关闭。
15. P4.4i新增`arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.ts`，位于产品Presentation层且默认surface断开。它先调用现有V6反馈投影验证权威事件，再以ActionDefinition精确绑定20把武器、ground/aerial上下文和三模式Grammar后果；Duel/Race只接受40个collection动作身份，Survival只接受`20×10×2=400`个等级运行时动作别名，模式域交叉输入失败关闭。6类基础动词共享Shape/方向/动作重量语言，20把武器各自保留接触强调、收尾手势、声音身份和轮廓提醒，避免为了收藏规模制造20套新规则。四类攻击反馈仍只形成`20×2×3×4=480`个稳定制作Cue身份，Survival等级只改变权威强度而不制造新动作/VFX类别；考虑400个Survival别名后的可接受运行时攻击投影为1920种，另加三模式各一个全局`movement-fall`，合计1923种运行时读取组合与483个稳定Cue身份。`movement-fall`即使掉落时存在活动Action也不归入武器。读取计划固定核心/方向/结果三类因果层、装饰可裁剪、reduced-motion静态替代、静音不删视觉文字、SFX总线、8 voice并发、无合成音兜底、最多96粒子/2x overdraw/禁失真等既有预算；这些只是资产制作与宿主接入合同，不是正式VFX、音频或设备通过证据。
16. P4.4j新增`arena-v2-twenty-weapon-feedback-hud-adapter-candidate-v1.ts`。它接受已验证的HUD RenderModel与同批V6事件，逐项闭合source event、tick、sequence、ActionDefinition、文案、强调级和基础Cue，只替换武器反馈的视觉/音频Cue身份；静音继续保留`audioCue=null`，reduced-motion继续沿用既有`motionPolicy=static`。适配后的RenderModel可直接进入现有反馈队列和效果consumer，原有epoch、水位、one-shot去重、8 voice上限、粒子预算与清理owner不变；输入模型不被修改，默认surface仍断开。对应适配、队列和consumer串接测试已写入聚合清单但未运行。
17. P4.4k新增`ArenaV2TwentyWeaponFeedbackHudHostCandidateV1`，它不复制队列或效果生命周期，而是包裹现有`ArenaV2ModeHudPresentationHostV1`的Audio/Visual端口。在inner host消费前，候选宿主用同批V6事件和RenderModel建立读取计划；inner host仍负责完整事件水位、同tick规则、反馈队列、one-shot去重、epoch切换、端口失败关闭和逆序清理。端口只在真实side effect调用前把五类基础武器Cue替换为武器/动作/模式专属Cue；两种已注册徒手动作经逐字段验证后沿用通用反馈，movement fall继续使用全局专用读取，其他非武器Cue原样通过。读取计划与徒手透传身份按现有queue seen identity窗口回收，最多64项；视觉移除、epoch切换、失败或销毁都会清空，旧epoch不得补播。该宿主、保留计划复用、徒手透传、epoch清理和目录外动作失败关闭测试均已写入但未运行。
18. P4.4l在既有opaque `ArenaV2ModeHudValidatedStepProjectionV1`边界上新增`ArenaV2TwentyWeaponFeedbackValidatedPresentationHostCandidateV1`：调用方仍不能提交自行拼装的HUD模型，只能提交经过Frame V3、PublicMatchInfo V2和完整V6事件批投影形成的能力对象。三模式`ArenaThreeModeAuthoritativePlayableHostCandidateV1`已改为创建该专用宿主，因此Duel/Race的collection动作和Survival的等级运行时动作会进入同一个epoch、队列、去重、清理owner；composition仍是Regression候选，默认产品Surface和生产入口保持断开。
19. P4.4m新增`arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.ts`，把483个稳定专用VFX Cue闭合到现有5张项目自产候选纹理，不为20把武器复制480张纹理。解析结果保留武器/地空/模式/反馈语义以及Shape→Timing→Color语言，并把核心、方向、结果固定为不可裁剪因果层；装饰只允许在high、standard、三层预算下出现，static强制一层/零粒子，low/medium/high分别闭合为`1/24、2/48、3/96`层/粒子上限，overdraw固定2、失真关闭、生命周期与池化必需。现行`WeaponFeedbackResolved`没有权威世界方向，因此本批只允许不伪造朝向的`symbolic-billboard`，显式固定`worldDirection=null / worldOrientedArrowAllowed=false`；后续只有`weapon-feedback-result-direction-v2`从Rule/Core带来权威方向后才能画世界朝向箭头。5张纹理当前均为`authored-candidate-not-approved`，解析器显式返回`productionApproved=false / mayEnterProduction=false / programmaticAssetFallbackUsed=false`，因此该代码只闭合资产读取与渲染配方，不构成正式VFX批准或生产接线。
20. P4.4n新增`ArenaV2TwentyWeaponFeedbackVfxPortCandidateV1`，可直接作为P4.4k HUD宿主的Visual端口：483个专用Cue进入P4.4m解析并向下游提交只读正式候选配方；已验证徒手、模式与供给Cue通过22项白名单走既有表现通道，未知通用Cue失败关闭。端口把`candidate-audition`与`production-approved-only`分离；后者在当前5张纹理均未批准时于任何下游展示前拒绝，前者只允许隔离候选面试听。端口最多保留64个活动source identity，同一source的route或Cue漂移失败关闭，所有下游调用必须同步，失败时清空，remove/clear/dispose和下游生命周期由单一owner闭合；不推断权威结果，也不使用程序化素材兜底。
21. P4.4o新增独立、未接旧路径的`ArenaWeaponFeedbackResultDirectionV2`与纯Core `resolveArenaWeaponFeedbackResultDirectionV2()`。三类命中只接受已提交`KnockbackApplied`的有限非零水平冲量，Core归一化后同时保留单位世界方向与水平冲量幅值；`attack-evaded`和`movement-fall`必须显式返回`no-world-direction`，不得携带或伪造向量。该合同不读取位置、Renderer、墙钟或随机；当前尚未迁移V1反馈适配器、checkpoint与V6事件，因此P4.4m仍保持symbolic billboard，不能把新合同“存在”描述成三模式已经拥有世界方向。
22. P4.4p新增`ArenaWeaponFeedbackDirectionFactV2`与`MatchCoreWeaponFeedbackDirectionCheckpointV2`。Direction Fact用`feedbackEventId/tick/sequence/kind`把一个V6反馈结果与一个V2方向逐值绑定：三类命中必须是`authority-horizontal-impulse`，闪避和移动掉落必须是对应的`no-world-direction`。方向checkpoint不修改V1 checkpoint，而是保存其identity/tick/source sequence，并要求每个V1 `pendingHit`与唯一的`hitSourceEventId/KnockbackApplied source/impulse`一一闭合；参与者、目标、动作、首次命中tick、有限非零水平冲量、稳定排序和自身hash全部失败关闭。这样恢复方向有独立可回滚边界，但负责实时消费同批`HitResolved/KnockbackApplied`并产出Direction Fact的owner尚未落下。
23. P4.4q新增`MatchCoreWeaponFeedbackDirectionOwnerV2`，与V1 feedback owner消费同一个MatchCore权威批次。每个`HitResolved`必须由同tick、同攻击者、同目标且紧邻的唯一`KnockbackApplied`闭合；Owner只绑定冲量，不重新分类命中结果。V1输出命中反馈时，以攻击者/目标/Action/firstHitTick唯一匹配pending方向并生成Direction Fact；闪避和移动掉落生成无世界方向Fact。每步先在工作副本完成source sequence/tick、V1下一checkpoint、反馈事件、pending双射和方向checkpoint校验，再原子替换内部状态；构造可从V1空checkpoint开始，也可从P4.4p配对checkpoint恢复，失败step不推进已保存checkpoint。
24. P4.4r新增`projectArenaV2TwentyWeaponFeedbackDirectionReadPlanCandidateV2()`。它复用完整V1二十武器Cue/语义读取，不修改旧V6事件；只有Direction Fact的feedback ID、tick、sequence、kind与V1读取计划逐值一致时，命中类反馈才得到`authority-world`单位方向、冲量幅值和`worldOrientedArrowAllowed=true`。闪避/移动掉落继续是无向量symbolic billboard；Presentation不得从角色坐标或动画补猜。
25. P4.4s新增`resolveArenaV2TwentyWeaponFeedbackVfxCandidateV2()`，在不复制P4.4m纹理、Shape/Timing/Color和质量预算的前提下，把V2方向读取并入正式候选VFX配方。Visual Command的source ID、专用Cue、武器、地空、模式、反馈kind、tick、sequence、标题、解释和强调必须与Direction Read Plan逐值一致；命中输出`authority-world`方向与幅值，闪避/移动掉落要求billboard族形状。该解析仍返回`mayEnterProduction=false`，不接默认Surface、不批准素材，也不生成程序化替代资产。
26. P4.4t新增`MatchCoreWeaponFeedbackBundleOwnerV2`。它不让V1 feedback先提交后再“尽力”补方向，而是从当前V1/V2双checkpoint建立临时fork，在同一个source batch上依次完成反馈分类、方向绑定和双checkpoint创建；两者都成功后才替换live owner，任一失败则销毁fork并保留旧状态。构造、恢复、pending action/hit读取、双checkpoint导出与幂等销毁统一由该owner持有。
27. P4.4u将Bundle Owner接入Duel、Race、Survival三个真实候选runtime。Race/Survival的Rule Mutation Port在`recordHit`后记录同tick、同攻击者、同目标的真实`KnockbackApplied`冲量事件；Duel直接复用MatchCore事件。三个authority checkpoint均升级为同时保存`feedbackCheckpoint + feedbackDirectionCheckpoint`，state hash包含双checkpoint与本tick Direction Facts，恢复时逐值配对校验；外层runtime、Session V3和Product Session把`weaponFeedbackDirectionFactsV2`作为只读同批结果继续向上游传递。新增V2三模式capability，可整体导出、校验和分叉，同时保留V1 capability兼容入口。
28. P4.4v把方向事实纳入opaque HUD投影。`ArenaV2ModeHudValidatedStepProjectionV1`要求本批每个`WeaponFeedbackResolved`与Direction Fact按ID/tick/sequence/kind一一闭合；专用20武器HUD宿主缓存同一source的读取计划、反馈事件与方向事实，并在视觉端口支持时提交V2方向envelope。Session、Learning Bridge、HUD-ready Session和顶层Playable Host均只传只读事实，不暴露MatchCore或可写authority；闪避、移动掉落仍是无世界方向的symbolic billboard。
29. P4.4w升级正式Web Three VFX端口：专用483 Cue先经V1/V2解析映射回现有5张自产候选纹理，不再因专用Cue ID而绕过纹理读取；命中类V2配方以权威水平冲量向量生成静态可辨的方向形状，并只做相机空间投影，不读取角色位置差值或动画猜方向。冲量幅值只影响有限箭头长度，tick驱动寿命、3项同屏、96粒子、2x overdraw、禁失真、reduced-motion静态结果和统一dispose边界保持不变。5张纹理仍未获生产批准，正式资产门继续关闭。
30. P4.4x把原先只开放6把的首屏武器可读性装饰器扩到完整20把，并由正式GLTF角色和地面武器宿主直接复用同一份`heldEuler/heldScale/groundEuler/groundScale/heightOffset`档案。角色视图新增身体命中锚点和随手持武器变换的尖端锚点；Factory只读解析participant锚点并跟随角色视图生命周期清除，正式Stage把锚点Resolver传给VFX。VFX按已验证反馈kind选择身体或武器尖端，挂点缺失才退回旧角色中心；它仍不据位置、动画或模型几何重判命中与方向。
31. P4.4y重排正式HUD第一屏反馈：最多3项仍沿用既有tick队列、epoch和one-shot owner，但显示改为1张主反馈卡加最多2张次卡；主卡按强调级、武器反馈优先级和新近程度选择，明确显示`命中反馈/地图武器/模式事件`、标题与空间允许时的解释。20把武器和地图刷新不再直接显示内部Definition ID，而使用固定中文显示名；窄屏保留紧凑主卡，静音、低动效和无障碍文本不删事实。
32. P4.4z把20把首屏可读性装饰器接入正式GLTF角色视图：手持附件局部transform和克隆材质由单一装饰器持有，只消费post-step `participant.action.phase`、同批`ActionStarted`和由`WeaponFeedbackResolved`投影的`WeaponFeedbackPresented`。Survival的400个等级动作通过既有绑定表正规化回40个collection action，不增加视觉语法或操作；动作为空时回到idle。表现层不读取位置差、动画完成或声音时长猜命中。
33. P4.4aa为三模式增加不同的首屏语言，但不分叉HUD系统：Duel固定显示`对战·击落对手`，Race显示`竞速·抵达终点`，Survival显示`生存·活得更久`；各自有回合/竞速/生存计时标签和对局/路线/压力信息标题。布局按实际事实行数增长，不再把Survival四行压进原72px面板；操作、事件队列和权威状态不变。
34. P4.4ab新增可执行的20武器音画制作清单：逐把绑定collection顺序、Equipment、ground/aerial Action、手持/地面可读档案、六类基础动词家族、独立接触/收尾/声音签名、正式附件、专属命中音频与`2动作×3模式×4攻击反馈=24`个配方，全目录精确480个稳定VFX Cue和480个稳定Audio Cue。配方同时固定身体/武器尖端锚点、权威冲量方向、低动效及静音回退；每把仍缺的前摇/释放/恢复不再只是文字缺口，而是形成3个稳定原创Audio Asset槽和3个稳定Cue槽，全目录60+60个唯一身份。现有命中音频的`verified-intake-only`不再被误写成生产批准，20把均固定`productionApproved=false`。清单提供按weapon ID与Equipment Definition ID的严格查询入口，后续制作批可逐把替换缺失槽而不修改规则或输入。
35. P4.4ac把P5.3m已登记的60份武器阶段音频候选收敛到严格的本地只读Stage owner：只有当前参与者的`ActionStarted`与post-step `participant.action.phase`同时存在，且动作绑定、装备实例、运行时Equipment、collection Equipment和Survival等级逐值一致时，才依次产生windup/release/recovery单次SFX命令。Owner新增tick/eventSequence双水位、同tick漂移拒绝、ActionStarted ID语义漂移记忆、陈旧/乱序开始拒绝、同帧多开始拒绝和活动动作期间换装拒绝；所有检查先在工作副本完成，失败不推进活动动作、去重水位或统计。静音消费当前阶段但不在恢复声音后补播旧音频，恢复到无开始事件的半途动作继续静默；跨对局reset清空活动动作、64项有界事件记忆、命令与统计。对应源码和回归测试已写但未执行，60份素材仍未获生产批准。
36. P4.4ad把正式Web Audio从“每个voice直接连接系统输出”改为单一`voice gain → SFX → Master → limiter → destination`图。每个Cue继续只持有自身dB与确定性播放速率；共享SFX总线固定0dB，Master预留-6dB余量，末端限制器固定-3dB阈值、20:1、3ms attack与180ms release，8 voice优先级/淘汰规则不变。总线在构造期一次建立，部分构造失败反向断开并关闭Context；销毁先停全部voice，再逐节点幂等断开并关闭Context。该批不增加音乐、环境、语音、设置页、动态ducking或玩法状态，只建立后续调音可依赖的最小混音图；源码和静态回归测试已写但未执行，设备响度与削波证据顺延。
37. P4.4ae新增逐把生产准入矩阵，而不提前开放P4.5默认注册。每把分别绑定collection顺序、Equipment/Grammar/ground+aerial Action及内容哈希、唯一反制档案、仅`direction + jump + primary`操作合同、两份动作表现、附件、命中音频、3份阶段音频和5类共享核心VFX。矩阵把“候选已登记/可解析”和“生产已批准”分开记录，现有`verified-intake-only`不会自动变成生产批准；Definition、反制、runtime、Replay、平衡、设备、真人和资产批准缺口分别形成稳定blocker。当前20把均`scoreEligible=false / computedScore=null / productionRegistrationPermitted=false`，每把只允许回滚自身Equipment和两份Action，明确禁止整组注册旁路和调用方自报批准。源码与候选测试已写但未执行，默认Registry、Composition和入口保持断开。
38. P4.4af新增逐把证据评分与独立审计评估器。不可变策略精确固定7个维度及`15/20/15/15/15/15/5`权重，总分至少90且每维至少80；每条证据必须绑定该把武器当前readiness、武器Definition bundle、反制档案和SHA-256，缺失证据不计分，重复/未知维度或身份漂移失败关闭。独立审计必须绑定同一readiness和策略hash，审计者不得兼任任何维度证据生产者。放行还直接读取当前正式目录中的附件、命中音频、3份阶段音频和5类VFX生产批准状态，不接受调用方传入approval布尔值；因此即使伪造满分输入，当前未批准资产仍使`productionRegistrationPermitted=false`。评估只返回单把结果和同一单把回滚单元，不修改Registry、Composition或入口；源码与候选测试已写但未执行。
39. P4.4ag在评估器之后新增数据化的单把原子注册计划生成器。存储评估必须先逐字段重算并同时通过自身hash、readiness、7维证据、资产和独立审计，篡改派生的PASS/许可字段不能进入计划。单把计划固定4步Definition/Registry、7步Presentation和1步Composition，共12个唯一正向操作；共享5类核心VFX只作为已批准依赖，不归单把回滚所有。发布要求从新不可变Registry快照构造，12步全部成功后才允许交换默认引用；失败丢弃新快照并保留当前默认，回滚严格使用正向操作的逆序，且不得影响其他19把。当前只生成计划数据，`registryApplyImplemented=false`，没有实际修改默认Registry、Composition、入口或发布清单；现有20把因资产门未开仍无法生成计划。源码与候选测试已写但未执行。
40. P4.4ah新增隔离的单把不可变Registry快照构造器。它只接受Arena V2 20把收藏目录中的既有子集，基础Action、Equipment和Grammar必须与目录Definition逐内容hash一致，未知武器、重复身份、目标已存在、乱序集合或同ID内容漂移全部失败关闭；不会把历史v3或其他产品Definition带回生产。通过精确评估与注册计划后，构造器先建立并闭合旧Action/Equipment/Grammar快照，再在局部内存中加入目标武器并建立新快照；任一步失败都没有可见写入。输出同时保留previous/next数据、各自hash、Presentation晋级依赖和只允许恢复previous的rollback token；快照自身仍`publishesDefaultRegistry=false`，但原“发布未实现”占位已按后续P4.4ai–P4.4az真实CAS、持久激活、同引用交换与封存链修正为`external-cas-owner-code-written-not-run`。发布生命周期继续由外置Owner唯一持有，不接默认Composition或入口；快照与CAS Owner两份测试已登记进P4延后测试清单但未执行。为使用上游不可变Registry实现，Composition新增对`arena-definitions`的显式依赖和项目引用。源码与候选测试已写但未执行。
41. P4.4ai新增显式单把Registry CAS发布与精确回滚Owner，但不提供默认端口。构造时先完成评估→计划→previous/next快照全链重算，再要求端口当前revision、snapshot hash与收藏武器顺序精确等于previous；发布前二次读取，任何陈旧基础都在CAS前拒绝。CAS使用单调安全整数revision、expected hash和完整不可变next快照，返回后必须readback证明next已成为当前头；CAS抛错但readback证明提交时按已发布收敛，CAS或readback均无法证明时进入不可重试`failed/indeterminate`，防止重复发布。回滚只允许当前revision仍是本Owner发布且hash/武器序列精确等于next时CAS恢复previous；如果后续武器已经发布则`rollback-head-drift`并拒绝删除其他武器。Owner拒绝重入，发布后直接destroy被拒绝，必须显式rollback或seal；没有自动回滚、默认端口、默认Registry或Composition接线。源码与候选测试已写但未执行。
42. P4.4aj新增Arena V2专用的非持久内存CAS端口，使P4.4ai拥有可执行但仍生产不可达的承载。端口初始头和每次next快照都会把ActionRegistry、EquipmentRegistry与Grammar Definitions逐内容hash对齐20武器目录，拒绝历史v3、目录外Definition、同ID漂移、重复身份或乱序武器集合；snapshot hash必须由完整规范化数据重算。CAS要求安全整数revision严格`+1`，expected revision/hash不匹配只返回冲突且不写入；匹配后，publish必须精确增加目标一把，rollback必须精确删除目标一把，不能借单把命令替换整组内容。状态提交前先完成全部解析和历史记录构造，提交后保存owner、weapon、方向、from/to revision/hash和计划hash；历史有界64条。该端口`persistent=false / defaultPort=false`，不接默认Registry、Composition或入口，真实持久默认端口仍需后续独立设计与审核。源码与候选测试已写但未执行。
43. P4.4ak新增纯数据持久封装。Registry实例不会直接写入宿主存储；封装只保存`arena-v2`产品身份、revision、收藏武器序列、Action/Equipment/Grammar Definitions、快照hash、单把CAS过渡审计和封装hash。恢复时先克隆普通数据，再重建正式ActionRegistry/EquipmentRegistry/Grammar并复用P4.4aj逐内容目录校验；历史v3、目录外武器、同ID漂移、乱序集合、未来schema、过渡方向或hash篡改均在返回快照前失败关闭。封装本身不打开存储、不发布默认Registry。
44. P4.4al新增非默认的双槽持久CAS端口。端口以项目同步Storage合同和单写入租约持有独立key前缀，打开时扫描A/B两槽并选择最高合法revision，head仅作为同generation提示；同revision不同封装、未来schema和持租约期间存储漂移都会关闭写入。每次CAS先用P4.4aj临时端口完成完整Arena V2单把过渡校验，再写非活动槽并readback，只有精确封装得到确认才切换内存头；宿主抛错但readback成功按已提交收敛，无法证明时进入`failed/indeterminate`。租约可显式续期和销毁，存储保留前后两个generation供重启恢复。该端口`persistent=true / defaultPort=false`，没有接默认Registry、Composition、入口或未批准资产。源码已写但未运行。
45. P4.4am把持久端口与单把发布Owner组合为唯一生命周期宿主。构造严格先打开端口/取得租约，再创建绑定同一previous快照的发布Owner；任一步失败都反向清理端口。宿主只提供显式publish、精确rollback、seal、renew与只读Registry，不自动批准、发布或回滚；销毁固定Owner→Port，发布态必须先回滚或封存。若发布后租约续期进入不确定态，只额外允许无Registry写入的封存收口，避免端口租约永久滞留。该宿主仍`production-unreachable`且未进入默认Composition。
46. P4.4an新增已发布generation的晋级回执。普通JSON或调用方拼装的“published”对象不能授权交换；只有P4.4am真实宿主处于精确published状态时，才能生成登记在模块私有WeakSet中的短生命周期能力。回执创建时重新解码当前持久envelope，并逐值闭合host、publication owner、weapon、plan、from/to revision/hash、envelope hash和收藏武器序列；只接受最后过渡为单把publish的generation。回执本身可做hash审计，但序列化副本不具备交换权限。
47. P4.4ao新增未来默认Registry的原子引用候选，但不创建默认实例。它只接受P4.4an本进程真实回执能力及同一持久envelope，先复算回执与envelope，再用P4.4aj临时CAS完整复核“当前头精确增加目标一把”；全部通过后才同步替换Action/Equipment/Grammar整份只读引用。已消费回执保留64项有界身份；回滚必须形成新的审核generation，不能直接恢复旧指针。该候选不接默认Composition或入口，当前0/20阻断不变。
48. P4.4ap新增持久发布与引用交换的外层协调器，修正“先seal再交换导致失败不可回滚”的生命周期风险。构造要求持久Registry头与原子引用头的revision/hash/武器序列完全一致；执行顺序固定为publish→published capability/receipt→atomic reference promote→seal。引用交换前任何失败都会调用同一Owner精确rollback；引用交换成功后若seal异常，状态保留为`reference-promoted-unsealed`，只允许重试seal，不允许回滚已经可见的引用。构造失败反向清理两侧，未收口published状态禁止destroy。该协调器仍无默认实例和入口接线。
49. P4.4aq把持久最高槽与durable active generation拆开。新增独立active marker，逐值绑定slot、revision、snapshot/envelope hash和晋级回执hash；初始generation写后readback成为active，普通publish只形成pending staged头，不能被未来默认入口直接加载，也不能在未激活时继续叠加第二把。rollback回到既有active内容时同步推进active revision，避免内容相同但generation永久分叉。打开端口必须证明active marker指向合法槽；旧候选数据只在当前publish与相邻previous槽精确闭合时恢复previous为active。
50. P4.4ar据durable active线性化点修订外层协调顺序为publish→receipt→durable activate→reference swap→seal。激活前失败仍精确rollback；active marker已成功后，持久generation成为重启唯一权威，引用交换失败进入`activated-reference-stale`并保留同一真实回执，只允许重试引用交换；引用已交换后seal失败继续只允许重试seal。构造同时要求staged=current=active=reference，发现孤儿pending即拒绝继续。此处“孤儿pending显式恢复Owner未实现”是4.4ar落盘时的历史状态，已由下一批P4.4as闭合；默认启动加载器仍因默认Registry/Composition/入口未获开放而保持不实现，不作为当前开发遗漏。
51. P4.4as新增未激活pending的精确恢复入口。只有当前staged头是紧邻durable active的单把publish，且owner/weapon/plan/from revision/hash全部来自已校验envelope时才可恢复；恢复写入新的单调rollback generation，目标快照直接使用active槽，不接受调用方提供Definition。rollback写后readback并推进active marker；已激活generation、非相邻头、未知过渡或revision耗尽全部拒绝。
52. P4.4at新增生产不可达的active bootstrap。它取得同一Storage租约后只读取durable active；若检测到P4.4as允许的孤儿pending，先精确恢复并再次要求staged=current=active。随后读取active Registry快照、释放存储租约，再构造进程内原子引用；存储打开、恢复、读取或租约清理任一步失败都不返回半可用引用。该候选可继续接收真实晋级回执，但不创建默认实例、不接Composition或入口。
53. P4.4au新增由已注册收藏武器集合派生的Survival运行池。投影只接受20把正式候选目录中的非空、无重复Equipment Definition集合；以同一集合筛选10级runtime变体、Action/Equipment Registry与tier policy，并继续固定每20秒3个掉落槽。已注册武器不足3把时只在3个槽内确定性重复，不增加武器、动作或输入；静态20把旧候选仍走原基线目录，只有带Registry身份的内容选择才使用动态池。
54. P4.4av把显式active Registry reference接入三模式QuickMatch、Information、Playable与Local Playable候选。每场创建先冻结revision/hash/武器序列，Duel/Race所选武器必须在该快照内，Survival内容和权威运行时只加载该快照对应武器；content identity写入revision/hash，创建结束后二次读取，期间重入切换直接拒绝。Local Playable选择未激活武器也会拒绝。该路径要求调用方显式提供reference，默认工厂、默认Composition与入口仍断开；源码未运行。
55. P4.4aw新增Registry-backed本地Playable最外层Owner。构造固定先从durable active完成bootstrap与孤儿pending恢复，再把同一进程内引用注入完整Local Playable；运行中显式晋级只影响下一场比赛创建时冻结的新快照，不改写已经开始的比赛。销毁固定Local Playable→Registry bootstrap，前者未成功清理时不会提前释放后者，后者失败可在不重建Playable的情况下重试。该Owner不创建默认实例、不接入口，源码未运行。
56. P4.4ax新增首把及后续单把共用的runtime registration assembly。它从正在被三模式宿主持有的同一个active reference读取`read + readHead`，重算完整快照hash并在装配结束后二次读取防漂移；基础武器序列、Action、Equipment与Grammar只能由该head派生，调用方不能自行复制或替换。只有既有assessment与12步plan重新验证通过时才输出持久Registration Host参数，目标已经注册或active变化都会拒绝。当前0/20阻断仍使真实装配不可达，不生成假批准。
57. P4.4ay消除“发布协调器自建引用、游戏宿主持有另一引用”的双引用分叉。协调器现在可显式借用active bootstrap且不取得其销毁权；Registry-backed Local Owner据同一引用完成assembly、持久publish、真实回执、durable activate、引用交换与seal，并保留激活后交换失败、交换后封存失败两条原状态重试入口。未收口晋级会先阻止最外层Owner销毁；完成后新Registry只供下一场创建冻结，当前比赛不热换Definition。
58. P4.4az把上述外层Owner接入隔离的正式Web可玩Composition，但仍要求显式`registryBootstrapOptions`或显式Registry-backed factory，默认开发入口保持静态路径。Surface Binding可把Local Host生命周期委托给外层Owner，销毁顺序因此继续闭合promotion→local playable→active bootstrap；Composition只允许在信息页且没有活动对局时开始、发布、重试、续租或关闭单把晋级。只读快照直接公开active revision、snapshot hash和collection weapon IDs，下一场创建继续冻结新generation，当前局不热换。代码未执行，默认入口、默认Registry和0/20门状态不变。
59. P4.4ba闭合partial Registry下的局外武器选择。20把收藏目录仍完整展示，active子集由Local Host同步读取并只读投影为逐项可用性；未激活武器保留收藏/情境进度与学习问题，但按钮禁用并显示“尚未进入当前可玩武器池”。初始及当前装备只允许落在active集合，结算后的唯一下一目标若指向未激活武器，只导航到武器目录展示等待开放，不把该武器写入下一局loadout。Survival仍空手开局并从active池掉落，不受局外装备选择影响；默认静态路径保持20把全可用。代码未执行。
60. P4.4bb把active集合继续传给既有P6唯一目标resolver，消除“页面禁用但成长目标仍要求使用”的死目标。Resolver保持完整Profile Definition和历史进度，只在当前eligible集合内依原目录顺序选择武器收藏、情境和含武器挑战；Local Host的页面、结算路由、目标曝光及研究焦点观察使用同一结果。Registry晋级新增武器后，该武器无需Profile迁移即可进入下一轮目标；默认无Registry路径仍覆盖完整20把。
61. P4.4bc关闭首代Registry准入旁路。持久端口的调用方初始快照现在只能是revision 0空Action/Equipment/Grammar/武器集合；非空初始快照即使Definition属于Arena V2也会被拒绝。统一空基线端口工厂只接受存储、Owner、租约和可选key/时长配置，自动注入规范空快照，调用方不能混入initial revision/snapshot。新增首把初始化Owner先打开并恢复空active，支持失败回滚导致空基线revision大于0，再据当前真实revision/hash建立临时原子引用；首把随后仍须通过assessment、独立审计和12步plan，并执行publish→receipt→durable activate→reference swap→seal。激活后引用失败与引用后封存失败保留Owner供原状态重试；完成后释放临时引用和存储租约，再由普通active bootstrap加载首把。运行时bootstrap明确拒绝空基线，避免0把武器进入Duel/Race/Survival。
62. P4.4bd把首把从“已有底层Owner但仍需调用方拼配”提升为显式provisioning生命周期。Provisioning Owner只接受已存assessment，先重算所有派生字段，再内部生成12步plan，不接受调用方计划；存储配置只能由空基线工厂生成。它保留激活后引用重试、交换后封存重试、精确回滚后据新空revision重建和runtime bootstrap重试；晋级完成后先释放初始化租约，再要求新bootstrap精确读到同revision/hash且唯一武器为目标武器，间隔内generation漂移直接失败关闭。Bootstrap只允许移交一次；Local Playable Owner获得后承担唯一销毁责任，正式Web也新增显式first-provisioned工厂消费该Owner。默认开发入口、默认Registry和0/20准入状态不变。
63. P4.4be为单把晋级建立只读操作投影，上层不再根据错误文字猜测恢复动作。投影对每个协调状态只给出一个`begin / publish-and-promote / retry-reference / retry-seal / close / wait`下一操作，并分开列出可续租、可关闭和是否阻断新对局。Local Owner快照直接携带该投影。Formal Web的信息页启动意图新增非破坏性guard：存在未关闭晋级Owner时不进入Match、不启动Driver、不销毁Composition，只返回`match-start-blocked`及当前唯一恢复说明。无Registry的默认候选路径不注入guard，行为不变。
64. P4.4bf把晋级结果投影为精确单把“可玩目录变化”事实。Local Owner在同引用晋级前保留source revision/hash/武器序列，只有之后reference精确新增一把且与当前plan目标一致才产生change fact。事实同时携带collection weapon ID、Equipment Definition ID、collection order及前后revision/hash，并显式固定`newlyPlayable=true / newlyCollected=false`，禁止把“内容已进入生产Registry”冒充为“玩家已收藏”。Formal Web Registry快照直接暴露该事实，不要求表现层比较两份Registry或重新判定晋级。2026-08-13，P5.3zzzq已把该只读事实接入既有武器目录`next-unowned`，但只在下一次正常信息页渲染可见；Registry维护成功不主动触发表现刷新，测试与治理源码已写未运行。
65. P4.4bg收紧后续武器的配置入口。Local Owner与Formal Web新增assessment-only方法，对已存评估内部重算12步计划后才进入同active head装配；调用方无需、也不能在该新入口中提供自制plan。同时移除Local Owner原公开的“只交换运行时引用”方法；该方法虽无调用方，但理论上可使真实回执在未durable activate时被游戏引用消费。现在Local/Web后续晋级只能通过persistent publish→receipt→durable activate→same-reference swap→seal协调链，不再存在reference-only入口。
66. P4.4bh把20把正式目录变成Registry的不可跳号序列。新增纯投影只接受当前active武器ID，并要求它们精确等于收藏目录的连续前缀；同时给出已发布数量、剩余武器、下一把collection/Equipment身份和完成状态。首把provisioning只能选择目录第1把，后续snapshot/assembly只能注册紧邻下一把，active bootstrap和三模式Registry绑定也会拒绝跳号、换序、重复、目录外或超过20把的历史状态。晋级变化事实进一步要求revision精确`+1`，不再只接受任意增长。
67. P4.4bi提供不降低安全门槛的粗颗粒维护入口。首把Owner可有界推进`initialize→reference retry→seal retry→runtime bootstrap`，后续Local/Web Owner可从assessment开始并有界推进`publish→durable activate→same-reference swap→seal→close`；正常路径无需外层逐步拼装。任一步抛错时立即停止，保留原协调器的`rolled-back / activated-reference-stale / reference-promoted-unsealed / runtime-bootstrap-failed`恢复状态，不自动伪造成功、不跳过评估、不开放默认入口。
68. P4.4bj新增V2长恢复后缀比较器，输入固定为2–240个连续非终局`InputFrame`。连续分支与从同一feedback capability恢复出的真实分支在每个tick都比较完整step outcome、V6反馈事件、runtime/feedback/content checkpoint身份、state hash与retained resource snapshot；三个真实Duel/Race/Survival wrapper直接透出底层`ModeMatchRuntimeV6`资源快照，QuickMatch端口构造也把该方法列为必需数据方法。活动期必须同时持有authority与mode driver且计数为2；恢复分支无论比较成功或失败都进入destroy，并在destroy后读取同一真实快照，要求owner计数和committed record均为0。旧V1的step形状同步纳入当前已有的权威供给节奏与反馈方向事实，避免静态合同滞后于真实runtime输出。本批没有执行测试、类型、构建或性能验证。
69. P4.4bk新增V2有界故障计划。每项由精确`point + callOrdinal`组成，最多8项且拒绝重复；连续/恢复step与未知事件可定位1–240，恢复capability损坏与连续资源读取可定位1–241，恢复资源读取可定位1–242，从而覆盖初始、逐tick和destroy后读取，fork/destroy只允许第1次。连续与恢复分支共享计划状态和证据计数，但注入器不直接写Authority；原六类构造/step/checkpoint/未知事件/清理故障全部保留，新增两类真实retained resource读取故障。调用方可同时安排`restored-destroy-after-delegate@1`与末次恢复资源读取故障，让长后缀清理器聚合比较主失败、destroy失败和销毁后读取失败；触发与未触发计划均可从只读Evidence V2区分。候选只由显式Regression调用方创建，不进入默认Composition或入口，本批没有运行验证。

70. P4.4bl新增三模式可重放故障清单与统一报告装配。固定每模式120 tick、11场景，覆盖fork、连续首步/中段、恢复中段、末次capability损坏、末次未知事件、连续/恢复末次资源读取、destroy、destroy后读取及双清理失败，三模式共33项。调用方显式提供逐场runtime与InputFrame工厂，装配器逐场独占并销毁runtime；报告按模式统计预期故障观察数，只保存有界错误指纹、计划Evidence、清理错误与确定性hash，不保存stack、墙钟或设备信息。工厂或注入器装配失败不发布部分统一报告；默认Registry、Composition和入口保持断开，本批没有运行清单。

71. P4.4bm把P4.4bl接到真实三模式工厂而不执行。Regression专用工厂复用现有QuickMatch的roster、content selection与final assignment规则，创建后立即启动真实Duel、Race、Survival authority runtime，并把独占销毁责任交给清单装配器；固定配置为Duel 1+1、Race 1+3、Survival 1+16及三模式各自固定uint32 seed。输入工厂按真实local participant身份生成0–119连续中性InputFrame，模块导入本身不创建runtime或运行清单。新增测试源码登记活动期authority/mode-driver双所有权、destroy后资源归零和33场景全部观察预期故障，但所有测试、类型、构建、压力和性能均未运行；默认Registry、Composition与entry继续断开。

72. P4.4bn修复Bot对蓄势武器只按一帧、下一帧即取消的输入缺口。`PublicActionRule`从Action Definition只读投影`minimumCommitmentTicks`；Bot命令源进一步把当前权威Action Snapshot裁剪为`primaryCommitment.status/chargeTicks`，不携带朝向、等级、Effect或未来结果。共享节奏器在动作就绪且策略决定攻击时按下并持有；动作刚启动、权威尚未初始化起手朝向而暂未投影progress的首帧继续持有；之后按当前进度继续持有，在下一权威step达到门槛时松开；已commit或普通动作立即回到非持有。旧通用Bot、Duel、Race和Survival V2 Controller均使用同一实现，Controller不保存新增状态，因此既有Authority/Controller checkpoint仍是唯一恢复事实。未运行任何测试、类型、构建、压力、性能或设备验证。

73. P4.4bo修复“动作空闲”与“武器可开始攻击”混为一谈的三模式Bot缺口。共享readiness纯函数只读取当前动作是否idle和当前装备冷却；空手以null冷却表达，不识别武器ID。共享节奏器进一步要求调用方显式提供`actionInProgress`，因此`actionReady=false`不再自动被解释成蓄势首帧：装备冷却中的蓄势武器保持中性，只有权威动作已启动时才进入bootstrap/charging持有。通用Bot的ATTACK utility与InputFrame、Duel、Race和Survival shared-world全部接入；Duel/Race公共commitment字符串通过严格裁剪器限制为`charging/committed`，未知值失败关闭。未新增输入、命中/位移写权、武器特判或checkpoint字段，且未运行任何测试、类型、构建、压力、性能或设备验证。

74. P4.4bp修复受击硬直或非active参与者仍可能沿用旧移动/攻击计划的Bot缺口。共享control availability纯函数只读取当前参与者active事实与非负hitstun tick。通用Bot在不可控制帧不执行utility重规划，取消既有MobilityScheduler动作、清空current plan/next action tick并提交完整中性InputFrame；下一可控制tick因计划为空而使用当前快照重新规划。Duel、Race与Survival敌人统一使用同一判断；Duel与Race还与通用/Survival攻击规则对齐，不把当前invulnerable参与者当作攻击目标。该批不改Authority动作中断、无敌、命中、位移、随机或胜负，也不新增输入或checkpoint字段，且未运行任何验证。

75. P4.4bq修复自动拾取/替换/掉落后的装备身份与旧战斗动作可能跨tick错配的问题。`ActionExecutionSystem.interruptLane()`按稳定participant顺序只重置指定lane；Rule Engine在普通世界拾取、生存供给拾取/替换及装备掉落事务成功后统一中断变化参与者的`combat` lane，保留`locomotion/interaction`，因此空中靠近拾取不会取消移动操作。MatchCore生存供给原本已通过Rule Engine代理；Shared-world Survival也改为把时间线authority绑定到同一Engine代理，Mode与Bot不识别旧/新Action Definition。若装备已成功变化后返回合同或中断异常，Engine标记失败并拒绝后续推进；事务前输入错误仍保持可恢复拒绝。供给生命周期到期但装备仍被持有时只标记待权威回收，身份未变化，因此不提前中断。未运行任何测试、类型、构建、压力、性能或设备验证。

76. P4.4br修复长蓄势动作仍可能沿用旧utility路线、竞速路径或生存供给目标而背离当前对手的问题。通用Bot在当前权威commitment为`charging`时停止重规划并清除旧attack tick，直接用受限观察里的当前合法对手位置生成方向输入；追踪不叠加旧规划方向偏移，目标无效则保持原地，并把`nextPlanTick`推到下一tick以保证蓄势结束立即按新快照重规划。Race在蓄势中暂停路线与跳跃，目标不存在时中性保持；Duel继续朝当前合法对手移动但禁止跳跃；Survival V1/V2暂停跳跃和供给追逐，玩家无敌时原地保持。该批没有新增锁定系统、目标记忆、未来位置、武器分支、输入键或checkpoint字段，且未运行任何验证。
80. P4.4by修复首把武器Registry runtime bootstrap校验失败且局部销毁也失败时的所有权丢失。Provisioning Owner现在保留未清理实例；显式重试必须先成功销毁旧实例，才允许创建新bootstrap，避免同一Owner叠加两份运行时引用。Owner总销毁也分别清理Initialization Owner与Runtime Bootstrap，只释放已成功销毁的引用、聚合失败并保留失败子资源供下一次重试。Registry内容、晋级顺序、active revision/hash、默认Registry/Composition/Entry均不改变；治理与延期测试源码已写，未运行任何验证。
81. P4.4bz修复自适应反制Bot Owner清理失败后伪装成destroyed的问题。Owner不再预先提交destroyed；子端口销毁成功后才释放引用并提交终态，失败时保留唯一端口供后续显式重试，销毁重入被拒绝。切换威胁或退回路线前通过同一释放器先提交旧端口清理，新端口构造失败不会重复销毁旧端口；宿主step返回非本generation或非running状态时明确失败关闭，不再销毁后仍返回结果。业务失败触发清理且清理也失败时，以AggregateError同时保留首因与清理因，不再覆盖首因。Registry发布、晋级、持久Host和首把Provisioning的`lastFailure`也停止对任意抛出值执行`String(error)`，非字符串失败使用固定诊断摘要，原始错误仍沿异常链传播。该批不改Bot策略、输入、Registry数据、玩法数值或默认入口，治理与延期测试源码已写未运行。
82. P4.4ca把同一清理合同下沉到单对手Counterplay Bot Port。Port不再在Controller销毁前提交destroyed；Controller清理成功后才进入终态，抛错时保留可重试状态并拒绝销毁重入。宿主身份读取、generation/状态漂移、当前权威事实投影、Controller权威输入生成、Host step失败、step结果身份漂移和权威事实参与者漂移都走同一失败关闭路径；仅外部step请求的结构字段校验保持权威状态变更前的可恢复拒绝。业务首因与清理失败同时保留。该批不改Controller算法、目标选择、InputFrame、权威step或默认Bot接线，治理与延期测试源码已写未运行。
83. P4.4cb闭合Registry晋级链的已交付Owner销毁所有权。Promotion Coordinator仍在任一未封存发布存在时于任何清理前拒绝销毁；发布已收口后，内部原子引用与Persistent Registration Host作为独立子资源分别尝试释放，成功项立即清引用，失败项保留并聚合，后续`destroy()`只重试剩余项。Persistent Host内部保持Publication Owner→Persistent Port依赖顺序：Owner失败时绝不提前关闭Port；Owner成功后才尝试Port，任一步成功即销账，失败则进入可重试`failed`状态。外部active reference仍由调用方持有，Registry内容、revision/hash、发布/激活/交换/封存顺序和默认入口均不改变；治理与延期反证源码已写，未运行测试、类型、构建、压测、性能或设备验证。
84. P4.4cc把可重试清理合同提升到Registry-backed Local Playable Owner。若Promotion仍处于已发布、激活后引用待更新或引用更新后待封存状态，外层在任何资源清理前拒绝销毁，保留现有Host供显式重试；只有晋级已收口或已进入纯资源清理失败状态后，Promotion Coordinator与Local Playable Host才作为同一active bootstrap上的独立依赖分别尝试释放并只清成功引用。共享Bootstrap仅在两者都释放后才关闭，避免某一依赖仍存活时提前拆掉Registry读取能力。失败时保留精确剩余子资源并聚合，后续`destroy()`从剩余项继续；只有三个字段都为空才提交destroyed。晋级状态、当前对局冻结、武器可用性变化、Registry revision/hash和默认入口均不改变，治理与延期反证源码已写，未运行任何验证。
85. P4.4cd新增二十武器统一命中力度读取合同。Presentation只读取V2方向事实中由`KnockbackApplied`产生的`horizontalImpulseMagnitude`，固定`<8 / 8–<12 / ≥12`为轻击、实击、重击；不读取武器等级、距离、动画或生存波次，不重新判定命中、击退或胜负。方向读取计划与VFX V2分辨率共享同一投影，生存武器等级只会通过权威冲量自然影响表现，不产生第二成长源。源码、治理与延期边界测试已写，未运行测试、类型、构建、性能或设备验证；默认Registry、默认Composition和入口保持断开。

86. P4.4ce新增单把武器生产注册前配置封套。新候选只接受已存assessment、同一个active Registry reference、Host/Publication owner身份与持久端口选项；调用方不能提供plan或基础Definition。封套先重算assessment与精确12步正向/反向plan，再复用runtime registration assembly完成`read + readHead + read`一致性、20把正式连续前缀和下一把目标验证，最后把assessment/readiness/plan hash、source revision/hash/prefix、目标Equipment/collection order及Host配置身份写入自身确定性hash。全部端口字段先从自有数据描述符填充私有Map快照，后续只用`has/get`；缺失可选项使用既有端口默认值，Object prototype污染与访问器不会被执行。assessment-only Local Owner只消费该封套；旧显式assessment+plan方法仅作为兼容入口保留。封套不创建Host、不发布、不激活、不交换引用，默认Registry/Composition/Entry继续断开；源码、治理与62项延期Vitest清单均为`code-written-not-run`。

87. P4.4cf把“精确单把可用变化”的连续目录校验前移到事实发布源。Local Owner生成`lastAvailabilityChange`前同时重验晋级前、后的正式Registry序列，要求旧集合与新集合分别是20把目录的连续前缀、旧序列尚有唯一下一把、目标正是该下一把、新序列数量精确`+1`、旧顺序逐项保持且目标只追加在末尾；前后revision继续要求精确`+1`，两个snapshot hash必须是不同的8位小写十六进制值。任何乱序、跳号、替换、移除、非目录目标或hash形状漂移都在事实发布前失败关闭，不把无效事实交给Presentation二次兜底。该批不改变Registry内容、晋级操作、武器数值、收藏状态、页面或默认入口；源码、静态反证与P4治理标记已写，所有运行验证统一顺延。

88. P4.4cg关闭Registry-backed Local Playable Owner构造参数的访问器执行面。最外层options在创建bootstrap前通过自有属性描述符形成固定快照，拒绝Symbol、未知字段、非枚举字段和访问器；嵌套`localPlayableOptions`同样先复制为只含数据字段的冻结对象，再由外层唯一注入`registryReference`，因此后续对象展开不会执行调用方getter，也不能夹带第二个Registry引用。首把Provisioning移交入口也先从描述符Map读取Owner与Local options，校验后不再直接访问原始对象字段。合法参数、构造顺序、所有权转移、玩法、数值和默认入口均不改变；源码、静态反证与治理标记已写，测试、类型、构建和运行证据顺延。

89. P5.3zzzr继续把P4.4cf发布的同一单把availability fact作为唯一卡片标记事实源。纯投影复用同一exact availability解析，并要求武器selection仍按正式20把目录精确顺序闭合、目标卡明确`available=true`且当前Profile未收藏，才在既有description前加“新开放 · 已可用未收藏 ·”。该消费不重读Registry、不比较快照、不修改Profile，不把可玩冒充收藏；源码、反证与治理标记为`code-written-not-run / not-run`，日期2026-08-13。

90. P4.4ch把P4.4ae逐武器生产准入的资产门收敛到P5.3zzzuk共享批准索引。附件使用模型加载许可函数，除资产本身的生产批准、使用许可与正式就绪外，还要求其外部材质纹理全部获批；命中音频、60份阶段音频和5类核心VFX使用同一逐资产批准函数。音频resolver的`approved`明确记为`productionResolutionApproved`，不再写成intake批准。当前计算结果仍是20把全部不可注册，未修改评分、证据、平衡、输入、资产字节或默认可达性；延期单测、静态反证与治理标记已写但未运行。

91. P4.4cj关闭稳定反馈事实到玩家效果端口之间的重复播放窗口。队列仍以tick、sequence、source ID稳定排序并显式保留/淘汰；Effect Consumer额外记录最多64项已提交视觉身份，只对未激活且未消费的新ID调用`visual.present`。仍可见的活动反馈只保留所有权，暂时移除后再次出现的旧ID也不重播；同ID的tick/sequence漂移在任何外部调用前拒绝。声音继续使用独立one-shot水位。所有present/play/remove成功且无同步重入后才一起提交新水位，部分失败清除已拥有外部效果且不伪造已消费。epoch切换和完整销毁清除两类水位，旧武器Action/Cue由同一已验证读取计划保留，不从当前装备重建。源码、64项Vitest延期清单、Node静态反证和治理标记均为`code-written-not-run / validationStatus=not-run`。
92. P4.4cl将Survival装备起手资格从详细Learning生命周期前移到共享Contracts事件门。此门不推导命中、奖励、终局或slot外业务：只跟踪enemy当前active generation，以及player最多两次掉落、仅首次可在同fall tick安排且按原readyTick/anchor执行复活。Replay V6、Product Result和Replay Learning都在usage/有效动作前调用，故伪造非active起手不会污染赛果实际使用或武器研究；攻击者失活后的既有目标pending hit继续由既有反馈结果窗口闭合。延期反证、P4/P6治理和64项P4 Vitest清单均已写，未运行。

93. P4.4cm把同一“起手时必须可行动”原则补齐到Duel与Race。共享Contracts门只跟踪competitor的active/fell/respawn/finished状态，不参与命中、位移或胜负裁决：Duel掉落后不可再起手；Race掉落必须在同tick安排固定180 tick后的原anchor复活，闭合前不可起手，冲线后永久不可起手。Replay V6、Product Result、结算证据和Replay Learning均在使用摘要或有效反馈计数前调用；active期已形成的pending hit允许在攻击者后续掉落或冲线后完成。延期规格、P4/P6治理与P4定向清单均已写，未运行。

94. P4.4cn把动作起手与反馈结果族收敛为共享Contracts因果门。带攻击上下文的反馈只能引用已经出现的同攻击者、同Action和同起手tick事件；一个动作的多个命中结果仍合法，以保留多目标与多段武器，但一旦发布`attack-evaded`就不能再发布命中，已有命中的动作也不能补发挥空，重复挥空同样失败关闭。Replay V6、Product Result汇编和Replay Learning在各自消费前调用；模式active资格仍由P4.4cl/cm负责，所以延迟命中不会因攻击者后续掉落或冲线被误删。延期规格、P4/P6治理与P4定向清单均已写，未运行。

95. P4.4cp把“不要存在明显上位替代”落实为可执行但不越权的静态审计。审计从正式20武器目录读取40个Action，只允许核心动词相同且目标形状、非比较参数、效果族、垂直冲量、额外效果、承诺合同和失败风险形成同一语义hash的武器互比。明确收益轴为射程、纵向容错、朝向覆盖、水平控制与硬直，明确成本轴为前摇、收招和再次起手间隔；候选必须在地面和空中全部不差并至少一轴严格更好，才被记录为`requiresBalanceReview`。报告明确`provesOverallWeaponDominance=false`，不相加综合分、不排名、不修改Definition；地图用途、操作反制、Bot与真人证据仍是后续决定依据。源码、导出、延期Vitest和reachability规格已写未运行。

96. 2026-08-25 P4.4cr为`MatchCoreWeaponFeedbackAdapterV1`增加独立的Checkpoint V2，不原地改变V1。V2以参与者顺序稳定保存有界（每目标最多一条、每个source event最多一条）的已结算非击落归因；当同目标的新`HitResolved`到来时旧归因立即失效。仅在没有pending hit、攻击者/目标精确匹配、此前结果为非击落、且`PlayerEliminated.tick - firstHitTick`严格大于既有20 tick窗口时，适配器消费迟到的权威淘汰水位而不重复发布反馈；窗口内、错攻击者、未知或重复淘汰继续失败关闭。V1导出只在状态可无损表示时允许；一旦存在V2-only closed attribution即稳定拒绝且不改变live state，V1 restore继续兼容既有旧形状。Bundle Owner与Duel/Race/Survival runtime checkpoint capability已消费V2，Bundle Owner V2只接受完整V2状态。直接Adapter/Bundle、Race、restore suffix与既有Survival Node五档矩阵已在本批运行通过；默认入口、V6/Replay事件、20 tick和120/300模式归因窗口、数值与资产均未改变。状态仍为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`；这仅是候选自动化证据，不代表P4正式硬门或资产门通过。

97. 2026-08-25 SF-DG.3d收口非美术P4候选门红项。空间与十四把扩展反制计划先统一为`cloneFrozenData`的字典序exact-key投影，输入顺序、目录顺序、20把/14把静态身份和hash不再因复制边界重排而误拒。ground反制先让defender完成真实起跳的Movement/Physics离地，再开始攻击；aerial保持原即时起手，跳跃通过`jumpPressed/jumpHeld + targetFirstUnsupportedTick`而非不存在的Rule command计数证明。Survival十波真实Replay事实修正为30生成、首轮1次`EquipmentPickedUp`、后续9次`EquipmentReplaced`、已结算18次`EquipmentExpired`，并保持1→10运行时等级和replay hash。反馈read-plan/HUD延期夹具改为符合已验收语义：`movement-fall`无攻击上下文，`attack-evaded`无目标/支撑/命中/掉落，徒手surface-transfer保留其原通用Cue；epoch只清已有保留项。33项真实三模式失败矩阵在Duel第98步自然终局的事实下改为Duel 97个非终局稳定比较步、Race/Survival各120步，所有末尾注入ordinal随每模式冻结；Vitest仅在runner环境跳过这一个重型用例，新增同源Node测试完整执行33项。首轮P4 candidate为67文件、274通过/10失败；修复后Vitest为67文件、303通过/1外部化，Node为19/19通过（33项矩阵401.1秒）。P4 boundary、构建、应用类型和diff复验另见本批命令证据；默认入口、P4数值、V6/Replay语义、正式资产与Three源码均未修改。

77. P4.4bs修复反馈owner把非战斗lane覆盖战斗动作，以及取消/装备中断被误报为`attack-evaded`的问题。Action Execution把既有lane随开始与蓄势transition送到Rule事件；新事件只让`combat`进入Weapon Feedback，旧无lane证据维持兼容。明确取消、普通拾取、供给替换、显式`ActionInterrupted`与失活都只终止追踪，不生成闪避；真实战斗动作自然结束且零命中时才保留闪避反馈。Race与Survival手工权威链携带同一lane/取消事实，Survival把供给事务前的combat身份按参与者稳定去重后送入feedback。该批不改变正式V6事件字段、反馈结果枚举、输入、武器数值、命中或胜负，且未运行任何验证。

78. P4.4bt修复三模式V6 `ActionStarted.sourceKind`以当前持装状态反推动作来源的问题。Action Resolver已裁决的Candidate source现在随瞬时ActionStart保留；Duel旧事件同时携带source并与当前武器动作目录交叉核对，Race/Survival只把`equipment-system`映射为equipment起手，且必须有当前装备身份。由移动候选产生的跳跃/交互即使参与者正持有武器也保持base-action，不能进入`ParticipantEquipmentUsageV3`或P6武器绑定。该批不扩展正式V6 schema、输入和动作集合，且未运行任何验证。

79. P4.4bu关闭`attack-evaded`携带目标和支撑面后被下游误当作路线事实的语义漏洞。Semantic V1仍保持同一schema与事件种类，但把闪避严格定义为“具名攻击自然结束且没有任何命中结果”：target、firstHit、fall、initial/final surface、fallCause和credited attacker必须全部为空。Core Resolver对旧调用参数执行规范化清洗，MatchCore Feedback Adapter本来就输出该最小形态；Presentation仍可按武器/动作播放挥空提示，但不能取得虚构目标或路线锚点。该批不改变命中、闪避裁决、V6字段、输入或数值，且未运行任何验证。

### 12.1 本批技能与强制参考记录

- 使用技能：`.agents/skills/game-art-director/SKILL.md`、`.agents/skills/vfx-realtime/SKILL.md`、`.agents/skills/audio-design/SKILL.md`。
- 强制创建参考：`.agents/skills/vfx-realtime/references/patterns.md`，采用Shape→Timing→Color、value-first和核心层不可裁剪边界。
- 强制诊断参考：`.agents/skills/vfx-realtime/references/sharp_edges.md`，本批不新增粒子、失真、屏幕空间效果或无上限循环，避免提前产生overdraw、移动端fill-rate和time-scale风险。
- 强制审查参考：`.agents/skills/vfx-realtime/references/validations.md`，本批没有新增粒子率、贴图、shader、重力或质量档位参数；正式资产批次仍须另行执行项目资产预算和设备门。
- 音频参考：`.agents/skills/audio-design/SKILL.md`与`references/adaptive-music.md`；本批只定义SFX语义、one-shot去重、8 voice并发、确定性变体来源、静音兜底与禁止合成音，不修改或批准任何音频资产。
- `vfx-realtime`要求的通用`docs/collaboration-protocol.md`与`docs/game-design-theory.md`当前不存在，保留为治理缺口；未创建空白占位文件，也未借此阻塞本批开发。

## 13. 下一开发批次

P4.2按`Rule → Core`继续：

1. 十四把扩展共享Rule/Physics、MatchCore Replay、P4.4c防守方反事实和P4.4d完整20把空间反制矩阵均已写入但未运行；当前继续开发，不等待定向证据，集中验证窗口再具名列出无可区分或deferred的武器。
2. 2–240 tick长恢复后缀、真实retained resource snapshot、最多8项调用序号故障计划，以及三模式33项可重放清单/统一报告装配均已写入；真实Duel/Race/Survival runtime和固定InputFrame工厂也已接入。下一步只在集中验证窗口执行并记录，不阻塞后续开发。
3. 双checkpoint、三模式runtime、Session/Product/HUD方向事实、正式Three方向表现、20把挂点、权威动作阶段材质/局部变换、HUD主次反馈层级、三模式首屏语言和60份阶段音频严格owner均已接线；下一开发面转向三模式结算/收藏增长回路及单把武器生产注册前的配置闭包。未批准素材仍不得进入生产路径。
4. `weapon-feedback-result-direction-v2`已从Rule/Core贯通到正式Three端口；操作仍保持方向＋跳跃＋primary不变。集中验证窗口需补三模式长后缀恢复、双checkpoint篡改、同批事实闭包、V2视觉端口失败清理、reduced-motion和真机方向可读性，本轮不等待这些证据。
5. 单把Registry的内存、持久、active bootstrap、同引用晋级、首把配置装配与Local/Web Owner移交链已写通；逐把生产顺序、下一把投影和有界粗颗粒推进也已补齐，但默认Registry迁移仍不开放。下一开发面转向三模式结算/收藏增长回路和逐把生产维护UI；正式人物、武器、VFX与音频资产按单把分批进入Concept与Blockout，批准和生产入口接线最后单独执行。

## 14. 当前回滚与未完成项

- 本节中历史“未运行”措辞只适用于未被SF-DG.3d候选runner覆盖的专项或正式硬门；P4候选自动化、P4 boundary、类型、文档和diff证据已见顶部记录，不能再概括为“没有任何运行证据”。

- 回滚单位：语法合同、六把独立首发候选、十四把扩展目录、20把收藏目录、生存轮换、测试/治理入口均可分别删除；默认生产行为不变。
- 未完成：任何运行测试、严格类型、构建、P4.4c/P4.4d逐把动态结果清单、十四把扩展的Bot/表现链、失败注入、20把选择/表现矩阵、三模式恢复、正式Three生命周期、阶段音频批准、Web Audio设备证据、逐把准入到bootstrap/activate/swap/seal/三模式消费全链运行、首把空基线与回滚/引用/封存/bootstrap/移交重试、可玩目录变化事实与玩家收藏状态的界面验收、跨进程故障恢复、真实证据及独立审计、默认Registry实例与默认Composition交换、默认生产Mode lifecycle、正式资产批准、平衡、设备、真人和生产注册。P4.4t至P4.4bk已完成代码接线但仍无运行证据；问题若在后续集中验证中出现，按开发优先约定顺延修复。
- P4.4bm已把P4.4bl的33场景清单接到真实三模式工厂和固定输入；Node阶段已完整执行33项，计划触发、资源归零和报告hash均通过候选自动化复验；默认入口、性能/设备和正式资产门仍未通过。
- P4.4bn已将按住后松开的武器输入语义接入四类Bot路径，但所有断言仍为`not-run`，不能宣称蓄势武器Bot可玩性、20把三模式覆盖或恢复一致性已经通过。
- P4.4bo已补齐动作阶段与装备冷却的可开始区分，但所有断言仍为`not-run`，不能宣称冷却门、换武器、三模式攻击频率或20把Bot矩阵已经通过。
- P4.4bp已补齐硬直/非active中性输入与无敌目标过滤，但所有断言仍为`not-run`，不能宣称受击恢复、动作中断、重生保护或回放一致性已经通过。
- P4.4bq已补齐拾取/替换后的旧战斗动作中断，但所有断言仍为`not-run`，不能宣称蓄势中替换、空中拾取、同tick新武器攻击或事务失败恢复已经通过。
- P4.4br已补齐蓄势期间的当前目标追踪与非战斗路线冻结，但所有断言仍为`not-run`，不能宣称移动目标命中率、目标失效保持、蓄势后重规划或20把三模式可玩性已经通过。
- P4.4bs已补齐战斗lane过滤与取消/装备中断的无伪闪避关闭，但所有断言仍为`not-run`，不能宣称三模式快速动作、并发lane、反馈checkpoint或Replay成长证据已经通过。
- P4.4bt已补齐Action Resolver来源到三模式正式V6使用事实的传递，但所有断言仍为`not-run`，不能宣称持武器跳跃、同tick多动作、usage重建或三模式Result已经通过。
- P4.4bu已收紧闪避反馈的规范形态并清除路线上下文，但所有断言仍为`not-run`，不能宣称旧事件兼容、三模式挥空、恢复或Presentation消费已经通过。
- P4.4bv已补齐无归因移动掉落对旧命中方向记录的同步清理，但所有断言仍为`not-run`，不能宣称超过归因窗掉落、同tick覆盖、三模式恢复或双checkpoint运行闭包已经通过。
- P4.4bw已把命中方向从四字段模糊查找改为反馈ID强绑定，但所有断言仍为`not-run`，不能宣称多段攻击、同tick连续命中、多目标交错或三模式恢复已经通过。
- P4.4bx已补齐同tick连续命中后即时掉落的前后击反馈归属，但所有断言仍为`not-run`，不能宣称多击范围武器、跨surface、恢复或三模式Replay已经通过。
- P4.4ci已补齐Core分组Hit→Knockback顺序在Race/Survival反馈适配与V2方向Owner中的因果配对，但所有断言仍为`not-run`，不能宣称20把武器的多目标、多段、替换后归因、checkpoint或成长证据已经动态通过。
- P4.4cj已补齐HUD视觉端口按稳定反馈身份一次性消费，并保留同tick不同ID顺序，但所有断言仍为`not-run`，不能宣称浏览器/设备中的VFX、音频、暂停恢复、页面重进、64身份窗口或外部端口故障已经动态通过。
- 阶段判断：`remain`；候选自动化已通过，但正式默认入口、资产批准、性能、设备、真人和独立发布证据仍未满足评分或晋级条件。
