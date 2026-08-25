# Arena 美术 A0–A7 与开发 P0–P7 对齐矩阵

## 文档状态

- 状态：A0.1为`contract-ready`；A0.2三个子门已签核且独立聚合总门为`ready`（96/100），Reference Board视觉方向总门`ready`；A0.3已在`60fbc13` clean source完成两次确定性机器重生成与失败关闭复验，当前为`current-source-machine-regenerated / tooling-review-candidate-human-blocked / incomplete`，机器候选85/100且真人0/10。A1.1已在最终clean source `16861edc`完成六artifact、来源/权利与测量方案机器重建，重新评估92/100且93/93隔离拒绝通过；协调、逐项批准、捕获、样件和hard gate仍关闭。默认Registry/Composition/入口仍未接，正式资产、Blockout、截图、集成、设备与真人门均未开放
- 日期：2026-08-11
- 审计基线：当前共享工作树中的P2.0–P2.5版本化候选字节；未运行P2.6或任何美术验证，不登记未经主协调冻结的commit/hash
- 关联：[Art Bible](arena-art-bible.md)、[美术与音频流程](arena-art-and-audio-development-flow.md)、[V2 生产计划](arena-v2-production-development-plan.md)、[P2实施台账](arena-v2-p2-implementation-ledger.md)、[ADR-112](../decisions/112-arena-v2-formal-mode-definition-and-policy-boundary.md)、[ADR-114](../decisions/114-arena-v2-art-evidence-versioning-and-joint-gate.md)

本矩阵约束美术、3D、VFX、HUD、音乐和音效如何跟随开发阶段，不改变开发阶段本身。上游合同未冻结时只能交合同、研究或代表样件；不允许批量 Final 抢跑。

## 1. 总体映射

| 美术阶段 | 开发阶段 | 目的 | 主技能路由 |
|---|---|---|---|
| A0.1 视觉宪法/来源/对齐合同 | P0 规则/文档真值 | 冻结Art Bible、来源登记、预算、小门和A0–A7边界 | `art-bible`、`game-art-director`、`media-asset-management` |
| A0.2 六类实际注释参考板 | P0 视觉前置证据 | 生成mood/color/composition/character/environment/UI六板、manifest与签核 | `game-art-director`、`media-asset-management` |
| A0.3 剪影工具与盲测基线 | P0 表现可读前置证据 | 固化工具、六方向/距离输出和当前两角色×赤手/圆盾≥90%盲测 | `game-art-director`、`character-design-sheet`、`threejs-animation` |
| A1 供给表现合同/代表样件 | P1 自动替换/600 tick回收 | 把拾取、替换、过期投影为可读 Cue | `game-art-director`、`threejs-game-ui-designer`、`vfx-realtime`、`audio-design` |
| A2 模式/参与者视觉合同 | P2 正式 MatchCore | 统一1v1、竞速、生存的身份、终局、重生和氛围 | `character-design-sheet`、`threejs-game-ui-designer`、`audio-design` |
| A3 KZ环境与敌人生产 | P3 地图/单一敌人 | 原创正式路线、地标、环境和敌人视觉族 | `level-design`、`blender-web-pipeline`、`threejs-materials-lighting`、`game-3d-assets` |
| A4 单武器音画包 | P4 武器逐把迁移 | 三把基线→直线压制→读招反制→绕后；持续区武器受字段阻断 | `character-design-sheet`、`threejs-animation`、`vfx-realtime`、`particle-systems`、`audio-design` |
| A5 11页面/HUD/最终反馈 | P5 页面与反馈 | DOM/Canvas同源、五类反馈归因和无障碍 | `threejs-game-ui-designer`、`vfx-realtime`、`audio-design` |
| A6 收藏与长期内容表现 | P6 Profile/200小时 | 同源展示收藏、熟练、地图和下一目标 | `threejs-game-ui-designer`、`media-asset-management`、`game-art-director` |
| A7 三端收敛/资产冻结 | P7 真人/真机/发布 | 绑定 clean build、设备、人测、预算和来源 | 按产物调用全部路由；压缩用 `glb-compressor-cli` |

## 2. 共用评分与状态

每阶段100分，总分至少90，任一维度不得低于该维度满分的80%。自动化、浏览器、设备和真人证据分别记状态，不能互相替代。

| 维度 | 分值 | 满分标准 |
|---|---:|---|
| 风格一致性与黑色剪影 | 20 | 符合 Art Bible；关键对象六方向和纯黑轮廓可辨 |
| 游戏镜头与语义可读性 | 20 | 目标镜头下识别状态、方向、原因与下一步 |
| 色彩/形状/动作/声音协同 | 15 | 每条关键语义至少两线索，无跨事件混淆 |
| 技术预算与生命周期 | 15 | 模型/纹理/音频/VFX/包体通过，销毁无泄漏 |
| 来源/许可/hash/版本 | 10 | source、revision、rights、proof、SHA、批准、弃用完整 |
| 三端与可访问性 | 10 | Web/微信/抖音、低动效、静音、色觉、窄屏有证据 |
| 阶段依赖与证据 | 10 | 只消费冻结合同，证据绑定同版本且未越级 |

状态只允许：`planned`、`contract-ready`、`concept-approved`、`blockout-approved`、`integrated`、`automated-verified`、`device-verified`、`human-verified`、`release-ready`。研究图、AI 原图和程序化兜底最高只能是 `contract-ready` 或研究记录，不能直升 `integrated`。

每个A0小门和A1–A7都独立执行总分≥90、单维度≥80%。A0.1只评价已完成合同，不计A0.2板面、A0.3剪影、后续LOD、设备或真人；资产/设备/真人成熟度继续单列且不得与A0.1平均。未执行的小门只写`incomplete`，不得用计划分或历史dirty证据代替。

## 3. 分阶段输入、输出、依赖和硬门

### A0.1 ↔ P0：视觉宪法、来源登记与对齐合同

- 输入：V2产品/玩法、生产计划、ADR-108、14技能/lock、正式Bundle/预算/第三方清单、生产相机/六方向、P4完整范围。
- 输出：Art Bible、六类70/20/10文字来源登记、WCAG实测、A0.2板面规格、A0.3剪影协议、对齐矩阵、资产现状/缺口和四门模板。
- 依赖：P0当前规则口径；不依赖P1实现，也不消费A0.2/A0.3未来产物。
- 评分：视觉宪法`19/20`、来源/参考登记`14/15`、色彩证据`15/15`、小门执行合同`14/15`、角色/武器范围`9/10`、来源/预算/四门`10/10`、阶段/索引/协作`13/15`；当前`94/100`，所有维度≥80%。
- 硬门：所有必需输入可追溯；14技能闭环；不误标Final；实际板面/剪影/LOD/设备/真人从本分移出并保持fail closed；协调任务签核后才可标`contract-ready`。
- 返工：产品支柱、平台、资产政策、首批模式/武器、生产相机/方向或上游真值改变；来源/许可/hash不一致。

> A0.1自审94/100且各维度≥80%，主协调已于2026-07-28通过硬门并签核为`contract-ready`。该签核只批准A0.1合同，不会把A0.2/A0.3或任何成熟度证据自动改为通过。

### A0.2 ↔ P0：六类实际注释参考板

- 子门：A0.2.1原包为`source-ready`，补充包为`supplemental-source-ready`，A0.2.2六板为`board-ready`。三个子门签核后，[A0.2独立聚合总门](arena-art-reference-total-gate-a0.2.md)重新复算身份、权利、使用、比例、签核和下游边界，以96/100通过为`ready`。
- 输入：已签核A0.1、六类文字登记、A0.2.1协调通过的权利/proof/hash与link-only台账。
- 输出：A0.2.1见[来源与权利包](arena-art-reference-source-pack-a0.2.1.md)，独立新增项见[武器/反馈补充来源包](arena-art-reference-source-supplement-a0.2.1.md)；A0.2.2见[正式参考板与自审](arena-art-reference-boards-a0.2.2.md)，含六份`2560×1440` SVG+PNG、每板10格7/2/1布局、六份板面manifest、全部输入/输出hash、10%与移动等效证据；六板已双签核。
- 依赖：A0.1必须先`contract-ready`；板面只能嵌入原创、CC0/Public Domain或已获商业/修改/再分发权素材。
- 评分：六板/比例25、注释20、来源许可/hash20、一致性/Anti-reference15、版式10、双签核10。
- 硬门：原A0.2.1与补充来源均95/100、A0.2.2为94/100；A0.2-total独立评分96/100且各维度≥80%，10类失败关闭通过。A0.2与Reference Board仅在视觉方向范围`ready`；没有正式模型、动作或事件驱动VFX样件，不得计入Blockout或资产成熟度。
- 返工：Art Bible支柱/色彩/禁用项改变，来源权利撤销、hash漂移、板面裁切误导或任一签核撤回。

### A0.3 ↔ P0：剪影工具与盲测基线

- 输入：已签核A0.1、当前两名正式角色与正式圆盾、生产相机/六方向、A0.2通过的角色/构图参考板。
- 输出：`scripts/art/render-arena-silhouettes.ts`、两角色×赤手/圆盾×六方向×0/5/12距离×两视口输出、每批manifest、随机盲测题单、≥10人原始答案与汇总报告。
- 依赖：A0.1和A0.2均通过；程序化角色/锤/链不得代替正式资产。尚不存在的重锤/锁链不阻断A0.3工具基线，而是在对应A4 Blockout独立复用本门。
- 评分：工具可重复20、六方向/距离/武器覆盖20、渲染完整15、盲测与统计20、manifest/hash10、生命周期/回归10、状态诚实5。
- 硬门：总分≥90且每维度≥80%；当前两角色的角色/装备态/方向机器代理均≥90%。旧[`SF-A0R.2`](arena-v2-a0.3-current-source-machine-regeneration-sf-a0r.2.md)仍为不可采信失败轮；新[`SF-A0R.2B`](arena-v2-a0.3-current-source-machine-regeneration-sf-a0r.2b.md)已在`60fbc13`完成两次同SHA生成、正向与隔离门。真人仍0/10，因此`hardGatePassed=false`、A0.3仍`incomplete / human-blocked`。
- 返工：相机、方向resolver、角色/武器字节、持握点、缩略规则、盲测题目或样本资格改变。

A0.1通过后只允许将合同交给下一任务；A0.2与A0.3任一未通过时，A1/A3/A4可以准备事件映射或资产清单，但不能开始生产Blockout、标记`concept-approved`或宣称Reference Board/剪影已通过。

### A1 ↔ P1：供给表现合同与代表样件

- 当前小门：[A1.0供给表现预生产合同](arena-art-supply-presentation-contract-a1.0.md)已冻结A1.0-v1不可变语义合同；A1.0-v2曾绑定28个非自引用来源、PP0/PP1字节和25个固定fixture并取得主协调外部94/100签核，但其完整source checker相对最终`16861edc`已发生身份漂移，不能冒充最终source机器证据。机器JSON继续保持`joint-gate-candidate / coordinatorSignOff=false / hardGatePassed=false`；A1.1只独立重验自身六artifact范围，这不授权代表样件或设备通过。
- 并行前置：[A1.1代表样件来源与测量就绪包](arena-art-supply-readiness-a1.1.md)现绑定最终clean source `16861edc`，审计圆盾/诊断剪影/研究线框、临时VFX与音频来源候选，并固定桌面1440×900及390×844测量方案。schema v3机器账本逐项固定六个生命周期artifact的path/size/hash与调用链；正向和93/93隔离矩阵通过，当前为`source-and-measurement-readiness-machine-closed / hardGatePassed=false`。A1.1协调与装备/VFX/音频来源批准、捕获批准仍false，VFX无字节、供给专用图标缺失，Kenney OGG只允许未来离线语义试听候选。
- 输入：P1.1冻结后的供给 Definition、稳定事件/字段、600 tick/同 tick顺序、Snapshot/ViewModel。
- 输出：供给/替换/过期形色表、10秒显示样件、Cue候选、音效草样、低动效/静音/失败回退。
- 依赖：开发先完成 P1.1；美术不定义事件、不运行墙钟删除。
- 开发侧必须按[ADR-113](../decisions/113-arena-v2-supply-presentation-adapter-boundary.md)完成P1供给Presentation adapter：只读消费冻结projection/event并通过A1.0的25项机器矩阵；P2正式生存尚未开放时，只能由与默认Product和发布产物隔离的acceptance harness驱动。adapter不持有Mesh/Audio/VFX/DOM资源，美术只消费其深冻结Marker/Cue/View，不直接读取MatchCore、Resolver或Session authority。
- 评分：事件映射25、替换/过期区分20、镜头/HUD20、预算/生命周期15、无障碍10、来源10。
- 硬门：599/600/601及同 tick拾取只投影权威结果；没有三选一弹窗；只读生命周期合同与A1.1最终source/测量方案机器前置已具备，但A1.0-v2完整source机器包、A0.3真人门、A1.1协调签核、主协调批准的代表装备/临时来源/捕获方案与实际测量夹具仍未闭合，故不得启动代表样件。P1 advance前还须取得同一clean source/content身份下的Web `390×844`与`1440×900`、微信/抖音开发者工具及iOS/Android六目标供给专属记录；通用Stage 8记录不能替代。历史候选文档、上游代码签核与预算不能替代当前批准、夹具或实测。
- 返工：事件名/字段、权威顺序、生命周期、拾取半径/替换策略或暂停恢复投影改变。

### A2 ↔ P2：模式与参与者视觉合同

- 当前状态：`preproduction-contract-candidate / static-bound-to-mode-match-runtime-v6 / verification-deferred-by-ADR-118 / hardGate=false`。P2.5e已形成统一Duel/Race/Survival runtime、复合checkpoint与恢复静态候选，P2.6工厂和continuous/restored双链源码已串起恢复对照；P5已落本地consumer-epoch、Audio/VFX切代清理及正式候选原子宿主。A2.0仍只回绑公开step消费面；生产默认Registry/Composition/入口不可达，上述候选尚未运行或签核。A0.3真人仍0/10，A1.1只完成source/measurement机器前置；截图、声音、VFX、HUD、Blockout、集成和资产生成继续关闭。
- 本轮静态绑定使用`game-art-director`、`vfx-realtime`与`audio-design`；已读取技能正文、`vfx-realtime`三份强制参考及项目[美术与音频流程](arena-art-and-audio-development-flow.md)。前者约束形状/明度/语义一致性且禁止表现层成为第二权威；VFX按`Shape → Timing → Color`并保留核心因果层；音频只在既有总线播放有界Cue，静音与音频时长不改变规则。`game-art-director`要求的`docs/collaboration-protocol.md`和`docs/game-design-theory.md`仍不存在，继续作为红缺口，不创建占位文件。
- 静态输入：`ModeMatchRuntimeV6.step()`的exact-key `events / readFrame / readFrameAudit`，其中只读V6事件、MatchReadFrame V3内的ModeResult/Projection/装备/SupplyProjection，以及供给Frame审计身份。Product PublicInfo/Result不在step内，Replay/Checkpoint属于runtime治理，均不得成为live Cue旁路。只有主协调签核、生产可达且经P2.6验证的schema才可成为A2正式输入。
- 输出候选：模式状态表、2–4人身份标记、倒计时/排名/并列/无完赛者、两次掉落/重生、enemy slot/压力阶段Cue、声音优先级与voice上限、低动效/静音/加载失败替代。桌面/竖屏截图、正式声音/VFX/HUD、真人题包和集成均未制作，不得算作当前证据。
- 依赖：P2.5e/P2.6已写的同seed/同输入continuous/restored候选仍须实际证明三模式恢复等价、无渲染结束、step原子闭合及Replay/Checkpoint恢复并取得签核；P5正式候选原子宿主已经负责HUD consumer与Audio/VFX consumer同epoch切换，但仍须运行故障反证且默认入口继续断开。A0.3真人必须通过，A1.1协调/逐项批准/捕获与样件门必须独立闭合。身份、锚点、重生、排名、fall count和终局均只由step事件/投影/ModeResult给出，Renderer/Audio/UI不得从内部stateHash/command/checkpoint、坐标、动画、音频或事件到达顺序推断。
- 评分：模式区分20、多人身份20、终局/重生20、剪影15、音画10、三端/来源15；未产出和未执行项不打计划分。
- 硬门：三模式同一视觉语义体系；颜色非唯一身份线索；并列第一不按事件序拆先后；`no-finisher`不播放胜利；静音/低动效不丢因果；无模式特供规则写入；总分≥90且每维≥80%。
- 返工：Mode/policy/schema、participant role/team/slot generation、事件名/payload/同tick顺序、排名、重生、终局、mode projection或Survival上限改变。

#### A2.0 当前源码静态绑定表

| 实际源码路径 | A2.0只读绑定字段/语义 | 当前边界 |
|---|---|---|
| `packages/arena-match/src/mode-match-runtime-v6.ts` | 公开`step()` exact-key `events / readFrame / readFrameAudit`；三模式候选统一闭合mode/participant/role/sequence/专属事件类型与终局 | A2 live唯一runtime入口；内部`stateHash / appliedModeCommandHash / commands / modeState / checkpoint / Replay`零消费，生产仍不可达 |
| `packages/arena-contracts/src/match-event-v6.ts` | envelope `id / sequence / tick / type`；`MatchStarted`、fall、respawn scheduled/respawned、Race anchor/finish、Survival slot/fall、`MatchEnded`及Duel/Race/Survival result判别联合 | 事件去重、迟到与同tick合批只消费这些身份；不得按到达顺序重判并列、淘汰或结果 |
| `packages/arena-contracts/src/match-read-frame-v3.ts` | `worldSnapshot.tick / activeTick / phase / remainingTicks / eventSequence`；`modeDefinitionId / participants / equipment / activeSupplyProjection / modeProjection / result`；Race与Survival只读状态 | `remainingTicks`是active hard-limit，不冒充Race准备倒计时；frame仅重建持续表现，不合成缺失one-shot |
| `packages/arena-contracts/src/arena-public-supply-projection-v3.ts` | `snapshotTick / snapshotEventSequence / resyncReadiness / pendingAuthorityTick / pendingExpiryEquipmentInstanceIds / supplies`；每项供给identity、spawn/expire/remaining ticks与position | 非ready时隐藏供给表现并等待resync；最多3个active供给是上游合同，不由HUD扩容 |
| `packages/arena-product-contracts/src/product-public-match-info-v2.ts`、`product-match-result-v3.ts` | 产品层公开身份与结算封套 | 不在step输出内，不能驱动A2 live Cue；正式Composition接线待绑定 |
| `packages/arena-match/src/mode-match-runtime-checkpoint-v1.ts`、`replay-v6.ts`、`mode-checkpoint-v2.ts` | 复合checkpoint、内容/配置/assignment身份、事件水位、mode state/result及输入/事件/Replay前缀 | 仅属runtime治理；Presentation不得消费checkpoint或历史前缀，也不得据其补播one-shot |
| `packages/arena-regression/src/arena-mode-verification-runtime-factory-v1.ts` | `VerificationWorldAuthorityV1`、每局一次checkpoint→旧runtime destroy→新runtime restore→终局链，以及同seed/同输入continuous/restored逐字段对照源码 | 仅是待运行验证入口；对照尚未执行，不能证明恢复等价或开放A2 |
| `packages/arena-product-presentation/src/arena-v2-mode-hud-consumer-epoch-v1.ts` | 本地epoch ID/generation、水位、HUD ViewModel顶层exact-key、同tick空批次、下一tick完整V6批次闭合、反馈来源与旧generation拒绝 | 静态候选已落盘并进入正式候选原子宿主；默认入口断开且未运行 |
| `packages/arena-product-presentation/src/arena-v2-mode-hud-feedback-effect-consumer-v1.ts` | epoch切换`visual.clear / audio.stopAll`并重置视觉与声音去重 | 已与HUD consumer由正式候选宿主原子组合；正式资产、默认入口与运行证据仍缺 |

委托中列出的`supply-projection-v3.ts`、`public-info-v2.ts`、`mode-result-v3.ts`并非当前仓库实际路径；本表绑定上述实际存在文件。若runtime路径、step三键、schema版本或exact-key改变，A2.0立即退回`source-drift / hardGate=false`，不得靠文档别名继续消费。

step必须先验证顶层三键、V6数组、Frame与`readFrameAudit`，再原子提交持续状态和one-shot。任一缺/额外/future键、event/frame水位不闭合、supply audit/resync失败或末项`MatchEnded.modeResult`与同step Frame Result不一致时，整包拒绝：不播放Cue，清除时间敏感Marker/倒计时/Result候选，并仅显示中性数据不可用fallback。

checkpoint restore不扩大消费面：Presentation不得读取checkpoint、内部hash或`eventsPrefix`。P5已落本地epoch、`clear/stopAll`和只接收不透明已验证step投影的正式候选原子宿主；`step()`仍不新增权威epoch字段。当前候选已静态闭合HUD ViewModel顶层exact-key和完整V6事件批次的旧水位、数量、新水位、逐项sequence/ID/tick/Mode及反馈来源，同tick只允许空批次和无one-shot持续态；宿主切换信号或稳定Frame任一缺失时保持resync。只有运行故障闭环后，才能声明从Frame重建持续态并拒绝历史one-shot、重复ID和跨epoch旧回调已被证明。

#### A2.0 权威事件→音画职责候选

| 权威事实 | 视觉/HUD只读职责 | 音频只读职责 | 低动效/静音/失败回退 |
|---|---|---|---|
| `MatchStarted`＋mode identity | 以固定mode图形与简短目标文案区分Duel/Race/Survival；不增加操作键 | UI总线单次开局提示；不改变倒计时 | 静态mode标；声音失败不阻塞开局 |
| `ActionStarted` | 只显示action/sourceKind与装备身份对应的anticipation；不显示命中、fall、拾取或替换结果 | 只允许动作起始层，不能播放命中/淘汰确认 | 静态方向/武器glyph；缺字段则整包拒绝，不从动画补造 |
| Race权威倒计时 | 固定宽数字＋收拢门框；只消费`modeProjection.preparationRemainingTicks`，不得误用active hard-limit `WorldSnapshot.remainingTicks` | UI总线最多每秒一拍，最后一拍与开局分离 | reduced-motion只换数字/边框；静音保留语义公告 |
| `RaceSafeAnchorCommitted` | 世界空间圆角门框＋回转锚图标短暂确认；不得画成真实碰撞体或检查点按钮 | 默认不逐锚点播放；仅首次/关键锚点允许低优先级SFX，防止高频噪声 | 静态锚图标；加载失败用同位置基础glyph |
| `ParticipantFell` | 直接按`fallCause / creditedAttackerId`区分受击、移动失足与环境fall；不把fall本身标为winner/终局 | 三类原因使用可区分的有界短Cue；同tick批次限voice | 无震屏；静音仍显示participant、来源与原因 |
| `ParticipantRespawnScheduled/Respawned` | 180 tick环形刻度只投影readyTick；重生用安全门框、锚ID与短无敌边缘 | scheduled不循环蜂鸣；respawn单次中优先级SFX | 数字/静态环；前台恢复不补播已过期Cue |
| `RaceFinishClaimed` | 终点门框闭合、claim participant标记；同tickclaim共享第一名 | 同tick并列只播放一次共享finish stinger，避免按participant叠声 | 低动效改稳定门框＋“并列第一”；静音保留文字/图形 |
| Race step末项`MatchEnded`＋同step Frame Result | 两者相等且phase=`ended`后显示winner IDs、真实并列和progress ranking；`no-finisher`明确未完赛 | 有winner才允许胜利stinger；`no-finisher`使用中性结束Cue | 三者缺一/不一致则整包拒绝；不从事件序或动画挑胜者 |
| `SurvivalEnemySlotChanged` | 所有敌人保持同一视觉族；激活/失活只显示入口方向、slot generation不向玩家暴露为类型 | 同tick多slot合并为一次压力Cue，禁止voice storm | 静态入口箭头/敌人数；音频失败不改变刷新 |
| `SurvivalPlayerFallCounted` | 两格断环显示`0/2→1/2→2/2`；第一格明确可重生，第二格只由终局事件关闭 | 第一次fall与最终结束使用不同优先级/音型 | 不使用健康条伪装；静音保留数字、断环和文字 |
| MatchReadFrame/SupplyProjection V3装备身份 | HUD和场上供给只读`collectionEquipmentDefinitionId / runtimeEquipmentDefinitionId / survivalLevel`显示当前持有态、供给Marker与等级；禁止从前后Frame差分命名拾取/替换/过期原因 | tier/Marker变化不触发A2 one-shot；供给原因Cue继续由A1.0-v2独立事件合同所有 | 资产失败显示collection基础glyph＋`Lv.N`；身份/audit不闭合则整包拒绝并进入resync |
| Survival step末项`MatchEnded`＋同step Frame Result | 两者相等且phase=`ended`后显示survived ticks、pressure stage、fall count与reason；不显示虚构winner/draw | 单次结算Cue，不能因音乐层完成才结算 | 三者缺一/不一致则整包拒绝；声音/资产失败不阻塞已验证Result |

音频继续使用`Master → Music/SFX/Ambience/UI/Voice`总线；A2 mode Cue走SFX/UI，不为规则事件创建新权威时钟。每类一次性Cue必须预注册并发上限、优先级和对象池，Master保留实测headroom；pitch/sample变化只能是表现层有界选择，不进入Replay。静音只改变播放，pause/resume不补播过期one-shot，destroy后voice、listener和异步回调归零。现有`ArenaImpactAudio`每action 1–4 voice只是当前命中实现事实，不能自动视为A2 mode Cue预算。

#### A2.0 Cue Definition与音频预算预注册候选v0.1

`ModePresentationCueDefinition`是只读表现Definition，exact-key候选为`schemaVersion / id / authoritySource / bus / priority / maxVoicesPerMatch / maxConcurrentVoices / minRepeatTicks / latePolicy / reducedMotionPolicy / mutedVisualFallbackId / assetFailureFallbackId`。`authoritySource`是exact-key判别联合：事件源精确为`kind / eventType`，projection源精确为`kind / fieldPath`；首版projection白名单只有`modeProjection.preparationRemainingTicks`。Definition不含规则回调、坐标判定、墙钟、随机函数、Result转换或音频完成回调。字段语义固定为：

- `priority`为`0..100`整数，只决定表现voice争用；不得改变事件、排名、重生或结算。相同priority按权威事件`sequence`升序消费，再按Cue ID升序稳定裁决；被限流的音频仍必须保留视觉/文字结果。
- `maxVoicesPerMatch`是该Cue在单局期间可持有的voice/pool handle上限，不是累计播放次数；`maxConcurrentVoices`必须不大于它。值为0表示有意静音的visual-only Cue，不允许临时绕过总池创建播放器。
- `minRepeatTicks`只限制同一Cue ID重复播放；多人同tick事实先按事件规则形成视觉条目，再由下表决定共享或截断的音频，不能因为合声而合并权威participant或slot事实。
- `latePolicy`只允许`drop-one-shot-after-60 / drop-one-shot-after-180 / terminal-visual-only`。前两者按当前权威tick与事件tick之差丢弃过期音频；`terminal-visual-only`允许从Result/projection重建静态结算，但前后台恢复时不补播stinger。
- `reducedMotionPolicy`只允许`static-glyph / numeric-only / static-frame`；所有策略关闭震屏、闪烁和位移动画，但保留身份、原因和结果。`mutedVisualFallbackId`用于主动静音，`assetFailureFallbackId`用于资源缺失/解码失败；两者都只能引用下方登记的基础glyph/文字组合。

| Cue ID | 权威来源 | Bus | Priority | Voice上限（单局持有/同时） | 重复间隔 | 迟到/低动效 | 静音与资产失败fallback |
|---|---|---|---:|---:|---:|---|---|
| `arena.mode.started.v1` | `MatchStarted` | UI | 55 | 1/1 | 120 | `drop-one-shot-after-60` / `static-glyph` | `fallback.mode-objective.v1` / `fallback.mode-objective.v1` |
| `arena.race.countdown.v1` | `modeProjection.preparationRemainingTicks`变更 | UI | 50 | 1/1 | 60 | `drop-one-shot-after-60` / `numeric-only` | `fallback.race-countdown.v1` / `fallback.race-countdown.v1` |
| `arena.race.anchor-committed.v1` | `RaceSafeAnchorCommitted` | SFX | 15 | 0/0 | 180 | `drop-one-shot-after-60` / `static-glyph` | `fallback.race-anchor.v1` / `fallback.race-anchor.v1` |
| `arena.participant.fell.v1` | `ParticipantFell` | SFX | 75 | 2/2 | 1 | `drop-one-shot-after-60` / `static-frame` | `fallback.participant-fell.v1` / `fallback.participant-fell.v1` |
| `arena.participant.respawn-scheduled.v1` | `ParticipantRespawnScheduled` | SFX | 20 | 0/0 | 180 | `drop-one-shot-after-60` / `numeric-only` | `fallback.respawn-ready.v1` / `fallback.respawn-ready.v1` |
| `arena.participant.respawned.v1` | `ParticipantRespawned` | SFX | 65 | 2/2 | 30 | `drop-one-shot-after-60` / `static-frame` | `fallback.respawned.v1` / `fallback.respawned.v1` |
| `arena.race.finish-claimed.v1` | 同tick `RaceFinishClaimed`批次 | UI | 85 | 1/1 | 600 | `drop-one-shot-after-60` / `static-frame` | `fallback.race-finish.v1` / `fallback.race-finish.v1` |
| `arena.race.ended.v1` | 同step Race `MatchEnded.modeResult`＋Frame Result | UI | 100 | 1/1 | 600 | `terminal-visual-only` / `static-frame` | `fallback.race-result.v1` / `fallback.race-result.v1` |
| `arena.survival.pressure.v1` | 同tick `SurvivalEnemySlotChanged`批次 | SFX | 35 | 1/1 | 60 | `drop-one-shot-after-60` / `numeric-only` | `fallback.survival-pressure.v1` / `fallback.survival-pressure.v1` |
| `arena.survival.fall-counted.v1` | `SurvivalPlayerFallCounted` | SFX | 80 | 1/1 | 30 | `drop-one-shot-after-60` / `numeric-only` | `fallback.survival-falls.v1` / `fallback.survival-falls.v1` |
| `arena.survival.ended.v1` | 同step Survival `MatchEnded.modeResult`＋Frame Result | UI | 100 | 1/1 | 600 | `terminal-visual-only` / `static-frame` | `fallback.survival-result.v1` / `fallback.survival-result.v1` |

所有A2 Cue共享一个最多4个voice handle的mode pool，其中UI同时最多2、SFX同时最多3；高优先级可拒绝或停止最低优先级mode voice，但不得停止既有命中反馈后把fall伪装为无来源。`no-finisher`与有winner共用`arena.race.ended.v1`的池和并发预算，但只按同step已闭合ModeResult选择中性/胜利表现资产，不读事件先后。候选混音门为最大合法A2并发场景下Master true peak不高于`-3 dBFS`且无削波；这是待设备录音验证的目标，不得在未实测前写成通过。

Cue消费identity固定为`event.id`去重、`event.sequence`稳定仲裁、`event.tick`判断迟到；projection只用于重建持续状态，不能反向合成已经缺失的一次性事件。pause保留持续静态状态并停止新voice，resume从最新projection重建静态状态但不补播one-shot；destroy先使generation失效，再取消加载、停止/释放voice、移除listener/DOM/粒子，重复destroy只重试未释放资源。任何迟到resolve/reject都不得重新注册Cue或播放器。

基础fallback登记如下，均是运行时故障兜底而非正式资产：mode目标=`模式缩写＋目标文字`；倒计时=`等宽数字＋边框`；安全锚=`回转箭头＋锚ID`；掉落=`participant诊断码＋向下断线＋来源/失足文字`；重生=`诊断码＋权威剩余秒数/安全锚文字`；终点/结果=`participant诊断码列表＋并列/未完赛/生存时间`；压力=`敌人数＋入口方向箭头`；生存掉落=`0/2、1/2、2/2两格断环`。所有live fallback必须取自已验证step payload/projection/ModeResult；PublicInfo不在step内，正式glyph/pattern身份等待Composition绑定，不允许从内部config、屏幕坐标或动画补字段。

#### A2.0 多人身份与语义防混淆

- `ModeMatchRuntimeV6.step()`不含ProductPublicMatchInfo V2；A2 live Cue当前只能引用events/readFrame已验证participant身份作诊断，不得从runtime内部config/assignment旁路读取displayName、ordinal、glyph或pattern。正式2–4人身份接线因此保持`pending-composition-binding`。
- 视觉目标仍是`identityGlyphKey＋identityPatternKey＋identityOrdinal`三线索和本地双外环/“我”，但只有未来Composition把已验证PublicInfo与同一step identity闭包显式交给Presentation后才能启用。此前fallback仅显示中性participant诊断码，不将数组顺序、ID字典序、颜色或屏幕位置包装为ordinal/rank。
- Race的2/3/4人名单、头顶标记、终点与Result使用同一当局identity映射；Survival敌人即使拥有不同slot/participant identity也保持同一视觉族，只在需要定位来源时显示入口方向与短编号，不以glyph、纹理或generation伪装成不同敌人类型。
- Race终点继续使用`环/门框`，安全锚点使用较小圆角门框＋回转锚，供给使用圆/软弧；三者在纯黑剪影和灰度下必须由尺寸、缺口、图标和位置层级区分。
- Survival敌人只是一种视觉族，不因slot generation伪装成新敌人种类；压力上升优先通过同屏数量、入口方向和权威stage标记表达，不通过改变碰撞暗示、发光等级或隐藏数值。
- 命中击落固定为“命中接触标→来源方向→向下断环”；移动失足只有“失去支撑→向下断线”；两者不得共用红闪、音型和结束章。
- 第一/第二次Survival掉落使用同一两格断环的不同填充状态，不新增复活按钮、额外输入或三选一页面。

#### A2.0 预注册验证与美术自检

本轮只提交静态七维自检；凡依赖运行、截图、设备、正式资产或真人的结论均保持未证明：

1. **健壮性**：A2权威入口仍只接受step exact-key `events / readFrame / readFrameAudit`；P5.3a已静态拒绝HUD ViewModel顶层extra/future字段并逐项验证V6事件，正式候选宿主源码也只接收已验证step投影，但宿主和实际异常注入均未运行证明。
2. **竞态/事件去重**：P5.3a已静态闭合完整批次水位、逐项sequence/ID/tick/Mode、反馈来源、同tick空批次、旧generation拒绝、Audio/VFX清理与去重重置。consumer双端原子宿主与continuous/restored对照源码已写；它们和Replay seek、同tick/跳空/乱序/跨epoch旧回调的运行证明仍顺延。
3. **静音与低动效兜底**：静音只关播放，低动效只移除震屏、闪烁和大位移；身份、原因、倒计时和Result保留静态形状/数字/文字。程序化glyph仅是加载失败fallback，不计正式资产或A1.1来源通过。
4. **人数/模式边界**：静态schema支持Duel、Race 2–4名competitor与Survival player/enemy slot语义，覆盖并列、`no-finisher`、0/1/2次fall和最多3个active supply；PublicInfo不在step，正式glyph/pattern接线、拥挤和窄屏真人证据仍缺。
5. **异步资产生命周期**：P5.3a效果消费者已写切epoch同步`clear/stopAll`和去重重置，HUD consumer拒绝旧generation；pause/resume/restore仍只允许从最新已验证Frame重建持续态且不补播。两个consumer已由正式候选宿主原子组合，但默认入口断开且未运行；P2.5e/P2.6仍无实际continuous等价、失败注入、双destroy或资源归零证据。
6. **主流程不反向判定**：终点、fall、排名、重生、供给、淘汰、结算只消费step events/Frame projection/ModeResult；`ActionStarted`不冒充命中，Frame差分不冒充供给原因，内部hash/command/checkpoint、坐标、动画和音频均不得改变事实。
7. **治理/回滚**：A2.0保持`static-bound-to-mode-match-runtime-v6 / hardGate=false`，runtime路径、step三键或exact-key漂移即退回`source-drift`；回滚仅撤销本轮三份文档的runtime回绑段落，不回退P2源码或历史签核。

真人任务至少回答“当前模式、本地玩家、领先/并列、掉落原因、重生位置、Survival第几次掉落、为何结束”；整体正确率目标≥90%，任一核心题/视口/2–4人分组不得低于80%。自动化、代理或美术人员自答不能替代独立真人。

本轮美术线程已完成上述七维静态自检，并在A2.0合同记录P5.3a consumer-epoch静态复核结论；没有运行checker、测试、构建、生成器、浏览器、模拟器或性能任务。`modeProjection.preparationRemainingTicks`与active hard-limit `worldSnapshot.remainingTicks`继续分离；P5.3a静态exact-key/批次连续性已闭合，但正式宿主、运行反证、P2.5e签核、continuous对照、P2.6运行、生产可达性、资产、截图、设备和真人验证均保持红门。

#### 2026-08-02 历史主协调A2.0合同预验收（非当前状态）

本次只评价上游事件到未来音画职责的合同完整性，不评价尚不存在的截图、音频、VFX、HUD、设备或真人产物，也不能把A0.2分数并入A2。状态为`contract-preaudit / rejected-for-small-gate / hardGate=false`。

| 合同维度 | 分值 | 当时得分 | 2026-08-02证据与扣分原因 |
|---|---:|---:|---|
| 权威事件/projection映射 | 25 | 24 | P2台账已有V6 exact-key、mode projection、event identity及MatchRead/Supply V3的collection/runtime/tier候选，A2固定`id/sequence/tick`消费且不解析ID；上游仍未签核，开发/美术尚未反证 |
| 多人非颜色身份 | 20 | 19 | 已逐字段绑定PublicInfo V2，冻结ordinal排序、glyph/pattern/数字和本地叠层及1–4号失败回退；仍缺2/3/4人截图与真人证据 |
| 终局、并列、无完赛与重生 | 20 | 18 | 并列、`no-finisher`、180 tick、两次掉落、迟到和静态终局重建已明确；结束原因枚举、上游schema签核及实际主流程仍缺 |
| 静音、低动效与加载失败 | 15 | 14 | 11类Cue已逐项登记fallback ID、低动效和静音职责；仍无正式资产失败注入与视口/设备证据 |
| 音频优先级与生命周期 | 10 | 9 | 11类Cue已冻结候选bus、优先级、单项/全局voice上限、重复间隔、迟到、暂停恢复和销毁；`-3 dBFS`仅是待实测目标 |
| 上游身份、回执与治理 | 10 | 3 | 当时A2未越权生成资产；但ADR-112尚未签核、美术回执/当时要求的六维自检未取得、A0.3真人0/10、当时A1.1证据过期 |

该`87/100`仅保留为2026-08-02的历史预审快照，不是当前评分，也不得与当前静态绑定相加。此后P2.5d `ModeMatchRuntimeV6`静态候选已经形成，本轮已完成runtime回绑；A1.1最终source/measurement机器前置现已闭合，但P2.5e、P2.6运行验证、生产可达性、A0.3真人及A1.1协调/批准/样件仍未完成，因此当前A2.0仍是`preproduction-contract-candidate / static-bound-to-mode-match-runtime-v6 / verification-deferred-by-ADR-118 / hardGate=false`。任何A2截图、音频、VFX、HUD、Blockout或集成继续禁止。

### A3 ↔ P3：KZ环境与敌人生产

> 2026-08-11 静态状态：A3–A6 正式资产就绪候选 V1 已把当前 Catalog 与共享
> `arena.stage7.formal-asset-budget.v1` 逐项重算。A3 当前登记 1 个生存敌人表现身份和 2 张 KZ 地图；
> 预算 V1 的 10 个 artifact 现均有独立 Catalog record；敌人模型及其材质纹理受现行预算覆盖，
> Skeleton GLB到外部材质纹理的Catalog绑定也已静态闭合；
> 地图仍是 `authored-candidate-not-approved / uncovered`。
> 2026-08-12 另有 `arena.stage7.formal-asset-budget.v2-candidate` 对当前 Catalog 130 项作精确字节身份
> 候选覆盖：2角色模型、20附件、2地图、8纹理、98音频均锁定既有ID/path/bytes/SHA并重算汇总。
> 这不改写V1的120项`uncovered`，也不批准结构上限、产品余量、加载或Final；V2保持
> `production-unreachable / proposed-not-approved / hardGate=false`，默认Bundle/Preloader/Entry断开。
> 同期逐资产生产批准证据账本V1按同一Catalog/V2身份规范登记130项：29项仅有来源intake批准记录，
> 130项生产批准全部`missing-not-approved`，七类共910个生产证据槽均为`missing`。账本和Readiness只
> 投影缺口，`grantsApproval / assetUsePermitted / formalReady / hardGate`全部false，不被default consumer
> 消费，也不改变V1的120项`uncovered`或V2的130/130候选覆盖；A7 V2只读取该账本的逐项身份与缺口，
> 不把它转换成批准。
> 2026-08-14 静态收口：P5.3zzzuk已把上述0/130真值提取为GLB、OGG、VFX PNG和内容闭合共用的唯一批准索引。来源intake、Catalog登记和V2候选预算覆盖均不能授予加载权；模型还必须闭合外部纹理依赖。默认路径在首个loader前零加载失败关闭，只有生产不可达的隔离开发宿主分别显式放行候选。源码与延期反证已写，运行验证仍为`not-run`。
> 同日新增A3–A6正式资产生产准备队列候选V1：130项按九个职责批次唯一覆盖，首批只允许A3地图的来源、Brief、结构预算和评审准备。A0.3真人、A1.1协调/逐项批准/样件和130项生产批准未闭合前，生产Blockout、Integration、Final和资产使用批次均为0；队列不改媒体、不授予批准、不接默认Bundle/Preloader/Entry，运行验证顺延。
> 首批准备现已落到A3地图生产评审准备候选V1：2图20段按现有Definition冻结注册顺序、方向+跳跃、移动包络、节奏强度、分支/恢复、地标/引导线及Race/Survival双读法，并逐图生成八项未运行评审清单。它不把注册顺序宣称为已验证Critical Path，不修改GLB或支撑几何，Blockout及全部资产使用门继续关闭。
> 第二批A3生存敌人生产评审准备候选V1也已落盘：1个权威族/1个视觉族覆盖16 Slot和十阶段数量曲线，压力仅由数量、入口、疏密及stage标记表达。当前Skeleton模型、外部纹理、六扇区方向、19动作语义与九项评审已绑定，但图片/模型未生成或修改，模型与纹理生产批准、运行、设备和真人证据仍缺。
> 第三批A4六角色生产评审准备候选V1明确当前为6个有限操作Definition、6个Presentation身份、1个共享Rogue模型，而非6套正式模型。六套选择姿态和七部件明暗Pattern、同一三概念输入、19动作语义与十项评审已冻结；共享几何局限、灰度识别、六角色×武器、模型/纹理批准和生命周期仍是红门。
> 第四批A4二十武器附件生产评审准备候选V1已把20武器/附件/轮廓族、右手持握、地面拾取、ground/aerial和三阶段读法逐项绑定。候选Transform不等于渲染证据；Bounding Box、朝向、尺度、落地、六角色组合、双视口/设备和生命周期仍未运行，模型批准继续0/20。
> 第五批A4正式材质贴图生产评审准备候选V1已把3张1024² Albedo、3个外部GLTF绑定与圆盾/Rogue/Skeleton三个Consumer一一闭合，并冻结sRGB、PBR兼容、六角色明暗Pattern、单敌人材质、Neutral Key、两地图环境和16 MiB候选解码包络。12,582,912 B只是RGBA8无mip估算；实际材质、UV、mipmap、灯光、设备、运行峰值和生命周期均未验证，贴图批准继续0/3。
> 第六批A4武器命中音频生产评审准备候选V1已闭合20份武器命中、1份徒手基础推击、40个精确动作身份以及4份来源intake/17份衍生候选。SFX/Master/Limiter、三档确定性播放率、8 Voice和静音回退仅是评审目标；盲听、响度、削波、耳机/扬声器/手机、拥塞和生命周期仍未运行，音频生产批准继续0/21。
> 第七批A4武器阶段音频生产评审准备候选V1已闭合20×3份windup/release/recovery资产与Cue，并固定ActionStarted+权威阶段、Gain/Priority、确定性变化、8 Voice及静音/恢复水位。release明确不是命中确认；60份均未试听或批准，阶段区分、命中遮蔽、多人拥塞、恢复、设备和生命周期仍未运行。
> 第八批A5核心反馈VFX生产评审准备候选V1已闭合5张128²候选纹理、5类结果语义、483个专用Cue和480个武器样式。Shape–Timing–Color与灰度先行、击落/移动坠落分离、关闭/Low/Medium/High粒子档、`2x`平均过度绘制目标、无扭曲、池化和64个活动身份都只是待评审合同；纹理批准仍0/5，截图、设备、GPU、性能与生命周期均未运行。
> 第九批A5模式与供给音频生产评审准备候选V1已闭合13个模式、4个供给Cue及17份资产，并冻结显式事件/Supply Fact因果、模式终局优先、供给Voice优先级1、8 Voice、64去重身份、混音与静音恢复。92,077 B仅是编码事实；批准仍0/17，盲听、响度、拥塞、浏览器、设备和生命周期均未运行。九批评审准备包至此源码齐备，但生产门仍全部关闭。
> A3–A6正式资产生产评审程序候选V1现将九批、130资产、910证据缺口和95评审单元统一为交接Owner，并为每批分开记录“当前可继续细化但不执行”的输入与“前置条件闭合后才可运行”的评审。程序本身不运行、不批准、不改队列顺序，九批仍各自独立验收。
> A3–A6生产评审证据提交候选V1现为七类证据提供逐资产exact-key输入：绑定当前Ledger/Queue/Program、批次/Preparation、资产path/SHA、Evidence Slot/Kind与证据引用SHA。它只返回`captured-reference-awaiting-independent-evaluation`，不读字节、不写账本；观察`pass`也不改变`missing-not-approved`。
> A3–A6生产评审证据独立评估候选V1现要求reviewer与collector分离，并在接受前确认Evidence SHA、内容结构、环境和采集`pass`；拒绝原因必须覆盖SHA/结构/环境/观察失败。accepted/rejected都不写账本或授予批准，只产生独立Evaluation Identity。
> A3–A6生产评审七槽接受证据集候选V1现要求同一资产七个accepted Evaluation按规范Slot顺序闭合，且Evidence/Evaluation Identity唯一。完整集合只标记可进入独立生产批准决策，状态仍为`pending-not-decided / missing-not-approved`。
> A3–A6生产批准独立决策记录候选V1现要求approver与全部collector/reviewer分离，并在approved前确认来源权利、预算及依赖闭合。approved Decision仅能输入未来新不可变账本组装，当前V1账本、Formal Ready和资产使用仍不改变。
> 状态仅为 `production-unreachable / code-written-not-run / formalReady=false`，不开放 Blockout、截图或设备门。
> A6.4—A6.18收藏预览许可链已同步当前账本真值：20武器+2地图全部fallback，request/release token为null，
> A6.6/A6.11a当前允许集合为0，隔离Web组合不创建预览Host/Renderer，不发生load/lease/mount。未来只能由新账本版本和独立gate开放。
> A6.18已把既有20武器可读性目录与2图20段体验目录投影为22项唯一语义回退profile，并由A6.15使用
> 固定3个shape/pattern panel＋1个glyph/text接入标准RenderPlan；A6.18b以collectionOrder和地图12+8节奏身份
> 让实际三panel位置/尺寸/圆角在72/96/168/240px标准槽均形成22项唯一非文字geometry signature，
> 颜色不参与几何身份放行，低动效/静音不丢信息，
> 但状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，
> 浏览器、双视口截图、读屏、设备与真人识别证据继续顺延。
> A6.19进一步把既有六条角色手感/姿态/value-pattern候选身份接入`character-select:selection-character`六张
> 现有卡片：每卡固定2个静态panel＋1个辅助glyph，六项必须由panel相对位置/尺寸/圆角形成的纯几何
> signature唯一，换颜色或glyph不能放行重复几何。原action矩形、48px命中、selected/available、文字、
> accessibility及正式3D预览context均不变；六卡primitive增量精确为18，增强后完整计划总量必须≤128，
> 预算不足、非精确增量或越界在发布前拒绝。Surface只把增强计划交给DOM/Canvas，contextProvider仍消费
> 原始稳定计划。状态为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，
> 不新增角色、页面、输入、资源请求或默认入口，双视口截图、读屏、设备与真人学习证据仍顺延。
> A6.20只收紧收藏预览的表现资源生命周期，不改变A6.18的22项视觉词汇或任何资产批准状态：A6.13的
> scissor关闭与Renderer dispose成为有序可重试债务，A6.14/A6.12c/A6.11c依次保留Host、mount proof、
> 资源执行和adapter债务；A6.9按自有Three对象记录清理水位并保留构造债务，A6.12b的mount清理失败只保留当轮诊断，同tick会续清A6.9并在真实销毁后补proof，
> A6.16在这些资源全部释放后才销毁底层信息Surface。状态仍为
> `production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`；故障注入、
> GPU内存、双视口、浏览器、设备与性能证据统一顺延。
> P3.5a已把两张冻结路线的当前权威support surface、Mode Projection与本地稳定V6事件投影为renderer-neutral段落/重入/安全锚/终点/掉落Cue，并绑定路线hash、冷/暖环境身份与地图资产ID；形状与文字双线索、32条单帧上限和未知身份失败关闭已编码。对应Three owner已接正式Stage，只变换自制GLB已有且标记`presentationOnly`的TopCap/入口/终点节点；Cue按权威tick维持、活动32/去重64有界，暂停/离场/失败恢复原始scale与rotation，不创建几何/材质/碰撞。P5.3zzzvl新增单一6种引导×4种风险的静态形状Resolver，并由冻结Route/Experience Definition投影12+8全部路段，在同一既有入口路标上以平面比例/朝向与高度/倾斜形成非颜色双通道；当前权威support surface只负责当段额外强调。`respawn-scheduled / respawned / safe-anchor-committed`先按目标节点聚合，再相对已应用形状后的最大轴恰好增加一次统一强调（普通`+0.28`、低动效`+0.12`），24种组合均不因最大轴已放大而吞掉Cue，也不因多Cue乘法叠爆。未知形状、目录/当前段地标身份漂移或未知Surface在任何视觉变换前失败关闭；相邻段共用边界Surface仍按冻结Experience目录合法表达，不读取Route Registry、坐标、摄像机、动画完成或颜色来重判路线/危险。全部运行、资产批准、浏览器、设备和真人证据继续`not-run`。
> P5.3zzzvo已在同一Three Owner内增加跨段章节地标层：基座图12段为`3+3+3+3`，折返图8段为`2+2+2+2`，共8个章节。章节只由冻结Map/Route Definition、segment ordinal和Experience节奏目录闭合，用开放跑道框/分流冠/抬升节奏栈/折返横梁/终章门五种非颜色语法组合已有`ArenaV2SegmentEntryCue`，章首以`1.04`统一强调与普通段分层。组合次序锁定为`原始基准 → 路段shape → 章节landmark → 当前段 → safe-anchor/respawn`；每帧从基准重算、同节点多Cue去重，clear/destroy恢复原transform。reduced-motion保留静态章节轮廓，Race/Survival沿用同一地图空间语言。不增Geometry/Material/Texture/draw call，不改世界父节点位置、Route/Surface/碰撞/Authority或默认入口。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`；`0/5/12m`、双视口、浏览器/真机/性能/截图与真人章节识别仍顺延。

- 输入：两张正式候选Map/Route Definition、共20段surface/分叉/重入/供给/终点、可达/拥挤证据、Bot Observation。
- 输出：原创环境Concept、路线Blockout、地标/材质/灯光套件、敌人视觉族、LOD/纹理/多边形报告和设备截图。
- 依赖：路线几何、重入和敌人身份冻结；研究地图不直接转生产。
- 评分：路线/落点25、原创/来源15、拥挤/敌人剪影15、材质灯光15、预算/LOD15、三端/真人15。
- 硬门：自动可达+真人路线理解；黑剪影/灰度可辨路线、边缘、威胁；装饰不改surface。
- 返工：Map hash、surface/起终点/重入、镜头、容量、Observation或预算改变。

### A4 ↔ P4：单武器视觉、动作与声音包

> 2026-08-11 静态状态：6 个共享骨骼/不同材质角色身份、3 张 KayKit 材质纹理、20 个武器附件绑定、20 个武器命中、60个windup/release/recovery阶段音频和1个赤手动作音频身份已进入只读就绪重算；
> 三张纹理均已独立登记并受预算覆盖，Rogue角色GLB、圆盾和既有Kenney intake也在现行来源目录内；19个新增武器附件及80份武器音频候选仍未获逐项生产批准。来源登记、
> Rogue、Skeleton与圆盾的外部GLB纹理依赖已进入Catalog hash和就绪重算，但不触发加载；阶段音频Stage owner现额外闭合ActionStarted、装备实例、运行时/收藏Equipment、生存等级和事件水位，并在跨局reset清空旧状态；
> `verified-intake-only`、候选生成与字节达标均不等于逐武器生产批准，A4硬门保持false，代码与测试仍为`not-run`。
> P5.3zzztq已把A4首屏持握/剪影档案交给选角预览消费：1v1/竞速只读展示已选武器，生存严格空手；clone共享预加载几何/材质/纹理且不由预览销毁。这是源码接线而非A4批准，剪影、穿插、手持方向、双视口和真人识别均为`not-run`。
> P5.3zzztr把该预览的滚动位置从资源身份中剥离：完整位于内容裁剪区时逐帧定位并绘制，裁剪时隐藏但保留mount，真正离开角色页才释放。该生命周期仍只属隔离Presentation候选，浏览器、GPU、双视口、设备和性能均为`not-run`。
> P5.3zzzts让该预览的Mount Owner、Render Surface与接管前Renderer在构造/销毁失败时保留唯一重试引用；共享角色模型clone与自有材质从产生时即进入可重试债务，正式角色Factory和选角Owner分别承接各自调用链。所有子资源只有释放成功才清引用，避免把失败清理误报为已释放。它不批准任何资产，故障注入、浏览器/GPU和内存证据仍为`not-run`。

- 输入：单把Equipment/Action Definition、动作阶段、反馈事件、三模式地图后果、反制窗口和Replay。
- 输出：单把Concept/Blockout、GLB/附件、18动画语义映射、持握六方向、五类Cue、音频、低动效及设备/真人证据。
- 依赖：先逐把补三把生产基线，再推进直线压制、读招反制、绕后；封路/延迟重击等待权威持续区生命周期和预警字段。一把未过Final不复制到下一把。
- 评分：独立轮廓20、动作/反制20、反馈归因20、预算/生命周期15、三端/真人15、来源10。
- 硬门：每把独立四门、独立100分、独立提交、独立回滚；总分≥90且各维度≥80%；视觉缩放不改hitbox；程序化表现不算Final。
- 返工：动作阶段/取消/命中/挥空/冷却、反馈、持握点、骨架、地图后果或默认Registry改变。

### A5 ↔ P5：11页面、HUD与最终反馈

> 2026-08-11 静态状态：5 个 VFX、13 个模式与 4 个供给音频身份已由同一候选登记；这些项目自产媒体
> 均仍有批准/预算红门。21 个动作语义音频按职责归入 A4 单武器音画包，不在 A5 重复计数。
> HUD时间已静态收敛为主时钟`MM:SS`、短倒计时`N秒/0.x秒`及零冷却“就绪”；候选固定窄/宽最小宽度、等宽数字、供给两行拥塞降级、低动效原位替换与读屏非逐tick播报。
> `arena-v2.ui-visual-tokens.v1`已把11页DOM、共享HUD Canvas Painter与正式HUD世界标记的八种tone、中文/数字字体栈、固定数字策略、圆角和描边收敛为同一深冻结合同；Visual Token位于RenderPlan下方，DOM与Canvas均在任何节点提交或绘制前拒绝未来tone。状态仍为`production-unreachable / code-written-not-run / hardGate=false`，未新增正式UI资产。
> P5模式选择卡非颜色身份候选已在既有`mode-select:selection-mode`三卡上形成纯RenderPlan增强：duel为对峙双块＋中线、race为三段前进路线、survival为中心核心＋包围柱。每卡精确增加3个panel、总增量9、完整计划总量≤128；三种signature只含panel相对位置/尺寸/圆角，颜色、glyph和文字不能放行重复几何。112px窄屏/96px桌面卡、原panel/action对象、48px、selected/available、intent、文字与完整accessibilityText保持不变；模式页零Three/Renderer/asset/RAF/timer/input。状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，截图、浏览器、设备和玩家识别仍顺延。
> P5地图非颜色路线身份候选已在既有`map-index:selection-map`两卡和当前`map-detail`回退形成同源纯RenderPlan增强：首图用前进支撑＋断层跨越＋落点，第二图用三段左右折返阶梯。唯一语义源是动态地图目录的`collectionOrder / pacingArc / 12+8段`闭包；不从ID、坐标、路线研究或运行态猜规则。索引每卡精确3个panel、总增量6、完整增强计划≤128；详情复用同一route核心原位重排当前3 panel、增量0，并严格绑定browse/source identity及390×844→200、1440×900→260槽。两种signature只含panel相对位置/尺寸/圆角，同地图同rect的index/detail签名一致。原panel/action、clip、48px、availability、intent、文字、读屏与A6.15原source复算保持；不创建Three/DOM/asset/lease/mount/RAF/timer/input。状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，双视口截图、浏览器、设备和真人地图辨识仍顺延。
> A5/A6武器收藏战斗语法几何候选已在A6.15当前全fallback的20张`weapon-index`卡与当前`weapon-detail`预览中复用同一重排核心：`coreVerb / ground+aerial failureRisk / counterInputs`全部从正式内容目录与`arena-definitions`常量单源投影，不复制枚举、战斗数值或规则；项目无稳定批准距离档位，故明确不投影。重排保留全部整数width/height及A6.18四标准槽20/20唯一的pattern整数宽度，只以位置/整数圆角表达共享语法；不以collectionOrder小数微差冒充可读身份，也不声称语法本身20种唯一。索引20卡重排60 panel、详情每次重排当前3 panel，但ID/role/text/action/48px/accessibility和primitive总数不变并硬拒绝>256；index/detail同武器同标准rect的相对签名一致，72/96/168/240px保持A6.18b同格式签名下20武器+2地图纯几何22/22唯一，详情实际200/260px保持20/20整数几何身份。重复增强同引用，source/selection/详情武器、partial fallback、未知/重复ID、几何/文字/action漂移在输出前拒绝；未来获批GLB透明中心原引用返回；零Three/loader/lease/mount或默认入口。状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，双视口截图、浏览器、设备、读屏与真人学习证据继续顺延。
> P5.3zzzvm将同一武器身份从收藏视觉继续闭合到局内持有/拾取：20项首屏可读性档案各自新增唯一、有界的`identityScaleAxes`，正式角色手持Owner与Three Stage地面拾取Owner通过同一装饰器消费同一宽/长/厚轮廓比例，再叠加各自既有确定姿态。每次sync均从宿主原非均匀scale重算，阶段倍率仅应用一次；替换/clear/destroy依旧恢复基准。本批不生成几何或资产、不增draw call、不改碰撞/命中/拾取/平衡或默认入口；仍为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`，实际0/5/12m、穿插、双视口、浏览器/设备/性能和真人辨识全部未运行。
> P5局内正式VFX样式现与该A5/A6唯一语法源同源：20把武器×地面/空中精确携带深冻结`combatGrammarIdentity`，包含source content hash、武器、情境、动作Definition、核心动词、失败风险与反制输入；六类`coreVerb ↔ familyShape`双向闭合，20个接触轮廓只作独立轮廓层且不得矛盾。`movement-fall`保持全局语义、语法身份恒为null；字段或family漂移在Three样式形成前失败关闭。现有3项同屏、每项96粒子、2x overdraw、层数、纹理、低动效、静音与销毁Owner均未扩大。状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`；5份VFX纹理批准、截图、浏览器、设备和性能仍顺延。
> P5.3zzzvn进一步把命中结果rank落实到正式Three已消费字段：20把武器×2情境的`hit-confirm / surface-transfer / ring-out`分别以`0.82/1.00/1.16`形状范围、`0.80/1.00/1.15`粒子范围和`0.86/1.15/1.30`方向范围形成严格递增；既有执行Owner的`18/28/42` tick包络与目标材质`0.55/0.75/0.95`峰值保持单源，颜色不作为唯一放行。`attack-evaded`为rank 0且粒子范围为0，只保留非命中形状/正式Cue；`movement-fall`仍返回null武器样式，不会把whiff/移动坠落画成武器命中。未新增Three对象、层、draw call、纹理、粒子上限、Owner或Stage端口，同tick最多3项、sourceEventId幂等、epoch/pause/clear/dispose与reduced-motion静态形状均沿用既有链。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`；视觉、浏览器、设备、性能和真人证据仍未运行。
> P5.3zzzvp进一步让这3项同屏预算在共享锚点时仍可读：正式VFX先按既有tick包络排除已隐藏项，再无副作用解析当前可见效果锚点，并按既有结果rank→权威tick→sequence→sourceEventId稳定排序；最高项居中，其余两项只把现有效果根节点确定性偏移到镜头平面左右上方。同锚点body/weapon-tip、不同参与者和精确世界位置各自分组，不借坐标推断命中或结果；透传Cue直接沿既有精确shape语义定rank，reduced-motion继续保留静态分槽。该批没有新增Geometry、Material、Texture、draw call、粒子、效果、Owner、RAF或历史，原3效果/96粒子/2x overdraw和clear/dispose债务链不变；重复ID、未来字段、超量或布局缺失在Three节点变更前失败关闭。状态严格为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`；同锚点重叠截图、浏览器、设备、性能和真人辨识证据仍未运行。
> P5.3zzzvq继续解决固定分槽在相机边缘向外展开的问题：只使用相机Owner已经提交的矩阵把当前表现锚点正向投影到NDC，并把第二/第三槽的固定扇形转向画面内侧；四个角落使用不同的双轴内向偏移，主槽始终保持零偏移。相同锚点的lane必须唯一且投影逐值相同，非法输入在Three提交前失败关闭。该候选不反投影、不测量效果半径/clip、不钳制锚点也不判断遮挡，因此只提供内向偏置而不保证极端锚点完整留在视口；边缘、角落、多人遮挡与真人可读性证据仍需截图/浏览器/设备验证。reduced-motion保留静态构图，资源、draw call、3效果/96粒子/2x overdraw和生命周期预算不变；状态为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
> P5.3zzzvk进一步闭合正式Three VFX执行Owner的22项透传Cue：唯一目录逐项给出精确Shape/Timing/Impact语义，执行器在创建Three效果前拒绝未知或未来Cue，并移除`fell / finish`子串推断。武器归因击落使用ring-out轮廓，移动/环境坠落使用movement-fall轮廓，竞速完成只由`race-finish-claimed`精确身份使用surface-transfer轮廓；后两类不触发武器相机/目标角色冲击。没有新增纹理、几何层、粒子、draw call、页面、输入或Authority，现有资源创建/迟到清理/销毁Owner原样保留；状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`，运行、浏览器、设备、性能和真人因果识别证据仍顺延。
> P5正式音频解析也直接消费该唯一语法源的同对象别名，不复制20武器目录：命中Audio resolution用精确Action Definition闭合20把×地面/空中40项深冻结`combatGrammarIdentity`，并按武器Definition唯一选择既有命中媒体；禁止字符串token与`includes()`猜测。阶段音频继续只表达`weaponId + windup/release/recovery`，不得冒充地面/空中命中语法；模式、供给、移动失足和徒手语法身份恒为null。98份媒体、三档确定性播放率、响度、priority、8 voice、SFX→Master→limiter、ducking与加载/销毁Owner零变化，且当前生产批准仍为0。本批使用项目`audio-design`及其`adaptive-music`直接参考，但未新增自适应音乐或媒体。状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`；实听、浏览器、设备、静音等价和生产批准仍顺延。
> Three侧P4.4ab音画制作manifest现同步删除最后一份本地`AUDIO_SEMANTIC_BY_WEAPON_ID`：20份武器命中媒体只以正式Catalog的`weaponDefinitionId`精确选择，480个武器反馈配方逐项复用同一个40项`combatGrammarIdentity`/Action lookup；阶段、模式、供给、移动失足和徒手保持`null`，不得用字符串token或`includes()`补语义。该收口不改变98份媒体、60个阶段槽、13+4模式/供给Cue、响度、priority、8 voice、总线、ducking、Owner或默认不可达状态；仍为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
> P5.3zzzvr只修正正式Web Audio池满时的同级拥挤取舍：新Cue低于最低priority才被消费并丢弃；同级或更高则按`priority → ordinal → sourceEventId`稳定选出最旧最低voice，完整stop/disconnect并确认债务清零后才创建新voice。清理失败时不创建新节点，Owner进入failed并保留未完成债务；丢弃与成功播放均进入原64项recent水位。不改8 voice、Cue priority/gain、SFX→Master→limiter、资产、静音或Authority；同级“最新事件优先”只是拥挤策略，浏览器/设备/真人听感与长局销毁仍`not-run`。状态为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
> P5.3zzzvs在A/B窄审计中确认：双地图已有24种路段形状、两图章节地标、当前段和safe-anchor/respawn的完整重算层级；可静态证明的剩余断点位于武器侧——低动效曾把20把持有武器的全部阶段rotation/scale归零，只剩材质变化。现按权威`MatchReadFrameV3.participant.action.phase`为windup/active/recovery增加三种无插值、无脉冲的静态非均匀轴形，并继续叠加原20项持有/地面共用轮廓比例。普通模式、地面拾取、材质、动作Definition、资产字节、资源Owner与生命周期不变；不新增Geometry/Material/Texture/draw call或Authority。延期测试源码已覆盖三态闭集、20把实际变换、静音独立、幂等与精确恢复，但测试、类型、双视口、浏览器、设备、性能和真人可读性均`not-run`。状态为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
> P5.3zzzvt在下一轮A/B窄审计中确认地图/武器身份链没有新的零复杂度静态断点，但正式角色受击Owner仍以事件而非目标占用3项容量；同一目标的多个高优先级结果可挤掉其他目标，尽管最终该目标只显示最大强度。现先按明确目标聚合，并以`impact kind priority降序 → tick降序 → impactScaleMultiplier降序 → sourceEventId UTF-8升序`确定方向/原因赢家；同类事件先使用更新事件，只有同tick才以力度分级。不同目标的3项全局容量仍按既有结果优先级与稳定ID排序，不引入tick/力度容量偏置。同目标其余事件只在原64项硬边界内贡献最大强度与最长剩余停顿，remove/过期后重新确定赢家。稳定Cue、方向、力度、tick、epoch、64项去重、clear/dispose与Stage消费接口不变；不增加3视觉槽、96粒子、2x overdraw、Geometry/Material/Texture/draw call或Authority。延期反证源码已覆盖同目标不重复占槽、同kind轻/重与新/旧tick稳定裁决、同tick输入顺序无关、三目标可见、最长剩余停顿、winner移除接替、64项失败关闭和既有生命周期，全部运行证据仍`not-run`。状态为`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
> P5.3zzztq又让角色选择页的正式Three预览消费当前模式装备语义：1v1/竞速展示已选武器剪影，生存用空手形状防止误解；角色和武器共同进入同一取景bounds。它不增加页面、按钮、动画循环、输入或权威猜测，且仍为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。本批依项目`threejs-game-ui-designer`的UI质量、HUD可读性和双视口适配清单约束源码；截图与动态验证按开发优先要求顺延。
> P5.3zzztr进一步闭合角色预览的滚动与生命周期：不再因任意非零滚动永久隐藏，也不把屏幕位置写入mount identity；完整可见时绘制、裁剪时保留、离页时释放。未增加RAF、输入、页面、按钮或Authority，状态仍为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
> P5.3zzzts进一步闭合构造回滚和销毁重试：Mount/Renderer产生即有稳定Owner，共享模型clone/自有材质的最内层失败也有Preview Owner或正式角色Factory承接；隐藏、解绑、Render Surface/Renderer、Mount和底层Surface按借用依赖顺序逐项成功后才提交释放。失败状态仍允许同一实例重试且禁止dispose重入。UI与玩法语义不变，状态仍为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
> P5.3zzztz把既有三个HUD反馈槽的拥挤取舍改为稳定语义优先，并只在同级按本地参与→全局→纯远端排序：比赛结束、竞速完成/生存终结、击飞/坠落、强武器命中先于普通模式/武器和供给提示；视角来自已验证参与者ID，不读取中文文案，武器专门化不可修改。队列语义同时压缩为既有三级Audio voice抢占，响度仍只按原emphasis，8 voice与SFX总线不变。它不扩大保留/可见上限、一次性声音、VFX、总线或资产。本批使用`threejs-game-ui-designer`与`audio-design`；不涉及自适应音乐，双视口拥挤截图、静音、实听、设备和真人归因验证顺延。状态仍为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
> P5.3w进一步把正式Web三概念触控层的`move / primary / jump`角色、移动/攻击/跳跃标签、固定RGBA底色、字体、文字、描边与阴影纳入该合同；移除宿主`color-mix`与手写色表，构造失败回滚挂载节点。输入尺寸、位置、安全区、pointer→driver语义和Authority零变化；代码与测试仅写入未运行。
> P5.3y-A仅在共享Token新增`idle / pressed`状态闭集和role+state解析器；视觉值唯一经`states.<state>`消费，不保留role根级颜色或`touchControlChrome`阴影兼容别名。idle保持P5.3w，pressed用较强固定RGBA、`scale(0.92)`与紧阴影表达即时按下，且保留既有居中translate。无transition/RAF/timer，未知状态失败关闭；这不是输入接受、命令映射或Authority接线，Surface消费和所有运行证据仍顺延。
> P5.3z-A仅为move在共享Token增加空闲原点`(0.22, 0.78)`与方向内圈视觉合同：外圈空闲时留在固定拇指区，accepted move可由Surface重定位到真实触点原点，内圈以形状＋经既有`joystickRadius`钳制的位移表达方向。Token不读取pointer、不改变命中区、三概念、label、intent或Authority；无渐变/transition/RAF/timer，代码与测试仅写入未运行，Surface接线由并行P5.3z-B负责。
> P5.3za-A为primary建立`unknown / ready / blocked`静态视觉闭集；P5.3zzzwa让新动作消费Authority当帧`Scene.localAction.channels.primary / primaryHold`，任一selected即ready；P5.3zzzwc补充本地权威Action仍为`charging + windup`时“继续按住有效”，P5.3zzzwd按权威chargeLevel把同一Label切为“按住/松开”。committed、冷却、硬直、普通动作占用和终态仍blocked，清理恢复“攻击”。unknown用于未建立或已清理的投影；blocked用透明度＋斜杠形状表达，但不是DOM disabled，不改命中、输入、命令或蓄力阈值。availability、Label与`idle / pressed`正交，无渐变/transition/RAF/timer/脉冲，状态为`production-unreachable / code-written-not-run`。
> P5.3zzzwe关闭20武器专属反馈最后一跳的方向事实漏传：Validated Host只转发已经与权威反馈事件闭合的V2事实，不从Three坐标、镜头、中文文案或当前装备重算方向。该修复不新增纹理、粒子、音频、HUD槽位或资产批准，状态为`production-unreachable / code-written-not-run / validationStatus=not-run`。
> P5.3zzzwf要求20武器新表现代次的基线不含武器反馈；旧命中不得在beginEpoch绕过专属读取计划重放通用效果。模式与供给通用基线反馈保留，后续新武器事实仍按逐帧权威链进入，不新增资产或视觉语汇，状态为`production-unreachable / code-written-not-run / validationStatus=not-run`。
> P5.3zzzwh让生存徒手通用命中音画消费已经存在的Authority V2方向/冲量。Three只缩放既有通用形状、方向层、镜头与目标角色冲击，Audio只在原SFX总线内复用既有dB力度档；旧视觉端口仍可回退。该批未创建或批准纹理、模型、粒子层、媒体、Cue、总线或新视觉语汇，3效果/96粒子/2x overdraw及无distortion预算不变，状态为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
> P5.3zzzwi把Authority力度对应的voice priority和gain dB改为两个独立最低档，修复重击击落priority已为3时-3 dB未升到-2 dB。它只在既有离散dB与priority档内工作，不新增媒体、Cue、变体、总线、voice或ducking；实听、响度、设备与真人力度辨识继续顺延，状态为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
> Movement/Jump可用性复用同一深冻结`unknown / ready / blocked`语汇，但各有`touchMoveAvailability / touchJumpAvailability`。正式`ArenaLocalJumpAvailabilityV1`由三模式唯一Movement capability生成，经Runtime→Session/Product/Learning→Scene开局/逐帧显式传递；P5.3zzzwb进一步禁止最终Scene/HUD投影把它降级为省略、`null`或`undefined`。正式Web一次闭合`tick / eventSequence / localParticipantId`后，用`canMove`投影Movement、用权威`state`投影Jump。unknown只用于生命期清理，不用于掩盖缺失Authority事实；blocked不禁用DOM、不改命中/输入/命令，不新增tone、按钮、页面或资产；状态为`production-unreachable / code-written-not-run`。
> P5.3zb-A把CSS四边safe-area缓存快照定义为信息页、HUD、Pointer Surface与InputSampler共享的Presentation/Input geometry。primary/jump沿用至少`46 CSS px`半径，完整圆形、标签、视觉中心与`controlAtPoint`命中中心同源并位于safe rect；空间不足失败关闭，禁止缩小、降分辨率、藏标签或只移图不移命中。move空闲外圈在safe rect内，accepted原点仍是未经伪造/偏移的真实已接受触点，只有方向内圈按既有`joystickRadius`钳制；四边独立支持横竖屏、非对称刘海和底部手势区，零inset保持现布局。合同不新增Token/操作/动画、不写Authority，与P5.3y/z/za兼容；状态`code-written-not-run`，实际env、遮挡、设备和截图证据顺延。
> P5.3zc-A冻结正式Three相机冲击：稳定Presentation command仅允许`hit-confirm→normal(5 tick, 0.35%视野位移, 0.18% zoom)`、`surface-transfer→strong(7, 0.70%, 0.30%)`、`ring-out→warning(9, 1.00%, 0.45%)`；`attack-evaded`、供给和普通UI不触发。最多3项，按强度/sourceEventId稳定取舍，总位移/zoom封顶1.20%/0.55%；方向缺失或零向量时用sourceEventId UTF-8具名八相位，不用随机。reducedMotion/static恒为零位移/零zoom但不删除VFX/音频；pause/clear/remove/切epoch/reset/dispose、64项去重环、同ID漂移/tick倒退/多事件原子失败关闭均已定义。正式相机只在既有follow/full-map结果后叠加瞬态，不引用旧V1 runtime、不写Authority。代码候选现已按该合同接入正式VFX、相机与隔离Web宿主，状态仍为`production-unreachable / code-written-not-run`；运行与设备证据继续顺延。
> P5.3zd按`vfx-realtime`的Shape–Timing–Color与时间尺度约束增加目标角色明度脉冲：hit/transfer/ring-out分别为3/4/5 tick与0.55/0.75/0.95峰值，只修改命令明确目标的实例自有材质，有emissive优先提升白亮、否则有界向白混合；每帧从baseline重算，同目标只取最大值，不叠加过曝。最多3项、recent 64项、reducedMotion/static输出零；不新增粒子、透明层、draw call、光源、shader、纹理或distortion。由于当前角色Registry只有全局动画推进，本批明确不做会冻结无关玩家的hit-stop。代码已接VFX→共享状态→Three Stage→目标角色材质，仍为`production-unreachable / code-written-not-run`。
> P5.3ze-A冻结逐目标hit-stop：只消费与P5.3zd相同的稳定命令、epoch、`sourceEventId`、最多3项和recent64，并只暂停`anchorParticipantId`自有骨骼动画端口；hit/transfer/ring-out窗口分别为命中tick起2/3/4 tick，结束直接恢复1x，不追赶、不补帧、不慢放。同目标只取最长剩余`endTick`而不相加；新建/snap先提交当前合法姿态再停顿。攻击者、其他玩家、Authority、位置/击退/碰撞/tick继续推进；无逐participant端口则停顿为0，禁止全局mixer暂停。reducedMotion/static同时关闭hit-stop与既有材质脉冲，但静态形状/HUD/音频保留；pause/clear/remove/切epoch/reset/dispose恢复1x，漂移/倒退/future字段在动画变更前整批失败关闭。无新动作、资源、RAF/timer、墙钟、随机、透明层或draw call；状态`production-unreachable / code-written-not-run`，运行证据顺延。
> P5.3zf-A冻结目标受击方向动作选择：只有同一稳定directional命令明确唯一目标、目标当前Authority角色语义已是`HITSTUN / KNOCKBACK`，且权威`facing.xz`与命令`worldDirection.xz`均有限非零时才判定；归一化点积`<= -0.20`选择`front → Hit_A`，`>= +0.20`选择`back → Hit_B`，近侧向、缺失、零长、非有限或non-directional一律保留Controller既有中性/default。不得从坐标、Three朝向、镜头、VFX、动画或事件顺序反推。方向复用P5.3zd/ze同一epoch、canonical命令、最多3项、`ring-out > surface-transfer > hit-confirm`与`sourceEventId`稳定赢家、recent64；remove/clear/切epoch/pause/离场/dispose清空且不迟到补播。reducedMotion/static可保留前/后静态姿态，但停顿与材质脉冲仍为0；不新增clip、骨骼、资源、动作、按键、RAF/timer、随机或Authority状态。状态`production-unreachable / code-written-not-run`，运行与设备证据顺延。
> `game-art-director`要求的`docs/collaboration-protocol.md`与`docs/game-design-theory.md`继续缺失并保持治理红门，不创建占位、不把P5.3zc-A视为其替代签核。
> 静音、低动效和失败 fallback 合同不替代浏览器、设备、录音或 Final 证据。

- 输入：稳定ViewModel、导航、供给剩余tick、公开事实、五类反馈和声音设置。
- 输出：页面视觉系统、HUD token/组件、DOM/Canvas对照、390×844/桌面截图、三端录屏/录音和首次归因任务。
- 依赖：页面职责、字段、事件冻结；美术不改页面数、规则或公开数值。
- 评分：信息20、归因20、同源15、触控/语义15、最终资产10、三端10、证据10。
- 硬门：一页一问题/一主动作/首屏≤3；触控≥48px；所有秒数只来自权威tick；主时钟/准备/冷却/供给层级在`390×844`与桌面均不得换行、推动或覆盖操作区；真人归因失败即退回。
- 返工：ViewModel、页面职责、事件优先级、公开数值、安全区、无障碍或声音设置改变。

### A6 ↔ P6：收藏与长期内容表现

> 2026-08-11 静态状态：收藏预览只复用 A4 的 20 武器与 A3 的 2 地图身份，不新增媒体、不选择玩法事实；
> 其预算与批准状态逐项继承，未批准地图和缺失/未覆盖项仍必须走文字、形状、纹理 fallback。
> A6仍为 `production-unreachable / code-written-not-run / formalReady=false`，默认入口与设备门关闭。
> P6.9-A冻结武器`30 / 60 / 90 / 120`主研究里程碑合同：列表在既有`主研究 X/120`进度行上加入四个不可点击的形状刻度；详情只增加一个上游派生的“下一里程碑”；结算仅在已提交Profile事实证明正式单局`+1`抵达单一阈值时于既有进度区显示一条消息。P6纯投影与A6列表/详情/结算数据已为`projection-code-written-not-run`；P6.10/A6.15已把列表数值、合并`■/□ + 30/60/90/120`四刻度和详情唯一下一阈值接入标准RenderPlan，DOM/Canvas沿用既有text primitive消费者，20武器输出受256 primitive硬上限约束，状态`code-written-not-run`。不新增页面、卡片、货币、日常任务、战力、奖励、红点、动作或第二Surface算法，也不把“主研究”写成“局”；浏览器、双视口绘制、读屏、设备和性能仍`not-run / hardGate=false`。
> P6.13–P6.16进一步提供地图路线`25 / 50 / 75 / 100`、同次结算武器＋地图进展、长期武器/地图完成度选择及三模式首次完成目标。状态按当前源码拆分：P6.17-A已让A6首页第一屏与收藏进度组件接受精确`mode-first-completion:<modeId>`，完整首页强制`0→1`并仍路由既有`mode-select`；P6.18又让A6.2/A6.3复核P6正式路线研究投影，并由A6.15在地图列表既有进度区发布单行四刻度、在地图详情既有汇总区发布唯一下一里程碑。上述UI代码均为`code-written-not-run / production-unreachable / hardGate=false`；Presentation不比较完成度、不选择模式、不推算跨越。
> P6.90/P5.3zzztp进一步把三模式个人最佳与模式熟练、武器主研究、情境研究、地图路线研究及挑战进度合入首页既有`recent-records`延后卡，并让底栏“记录”按当前RenderPlan真实几何定位。P5.3zzzv又让同一文字primitive按事实组显式分行并按文字宽度确定性扩展原卡；结算`earned-progress`同步从固定96px/3行改为短文保持96px，并在既有4096码点输入边界内为全部回执保留行数、由纵向滚动承接。P5.3zzzva进一步让既有`collection-change`以相同布局机制完整承载武器里程碑、地图里程碑与新收藏回执；P5.3zzzvb让既有`full-match-record`完整承载Product Result已选定的地图、最多20把武器使用事实、单一主复盘和练习点；P5.3zzzvd让既有`reward-breakdown`完整承载Reward Owner的规则原因、请求经验、封顶实际入账与重复结算说明；P5.3zzzvj让竞技准备既有`weapon-map-plan`完整展示本局练法、长期目标、四段路线骨架、武器情境目标与下一路段；P5.3zzzve让地图详情既有`full-route`按地图Owner给出的` → `顺序完整展示12/8段路线与危险统计；P5.3zzzvf让既有`weapon-consequences`完整展示地标顺序、供给/落点影响和可选竞技练习建议；P5.3zzzvi让同页既有`mode-records`完整展示路线研究阶段、下一里程碑、单图路线理解、三模式熟练、全地图路线研究、全部路线理解与下一路段；P5.3zzzvg再让武器详情既有`map-consequences`完整展示学习问题、三模式地图影响与可选竞技地图建议；P5.3zzzvh让同页既有`weapon-record`完整展示已收藏/主研究阶段/下一情境/五情境证据/全武器主研究与全部情境旅程。九个延后字段的短文仍保持58/68px。十一者都不增加字段、容器、页面、按钮或事实算法，DOM/Canvas共用rect与完整单条accessibilityText。状态仅为`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`；双视口截图、长中文/英文、读屏、浏览器与设备证据仍为`not-run`。

- 输入：版本化Profile、收藏/熟练、地图路线里程碑、模式首次完成、挑战事实、幂等结算变化和上游唯一下一目标。
- 输出：收藏/详情/进度组件、空/失败/未来版本保护页面、武器与地图里程碑的列表刻度/详情下一阈值/结算同区消息、首页唯一目标层级、内容素材计划与容量预算。
- 依赖：Profile schema、CAS/租约/未来版本保护和奖励事务稳定；局外视觉不产生数值优势。
- 评分：数据同源20、下一目标20、长期一致15、失败可读15、资产扩展15、三端/来源15。
- 硬门：纯装饰/等待不计200小时；存储失败不显示假成功；武器`30 / 60 / 90 / 120`与地图`25 / 50 / 75 / 100`只消费P6验证事实，UI不从快照差分推算跨越、不复制长期目标选择；每项仍走四门/provenance。
- 返工：Profile schema、结算幂等、容量、武器/地图阈值或跨越事实、模式首次完成语义、长期目标选择、内容身份或未来版本策略改变。

### A7 ↔ P7：三端收敛与发布资产冻结

> 2026-08-12 静态状态：A7 V1保留旧10项预算证据历史语义；A7 V2已形成独立
> `production-unreachable / code-written-not-run / hardGate=false` 候选，复用A0–A6资产、来源/许可/批准、
> 六环境、Web/微信/抖音交付、低动效/无障碍与截图/录像证据。当前没有真实设备/批准媒体输入，
> `currentPassInstanceExists=false / formalVisualMediaReady=false`；它不复制 P7 advance/release-freeze 算法，
> 不开放默认入口、正式资产、设备、真人、发布、commit 或 push。技能泛化强制参考
> `docs/collaboration-protocol.md`、`docs/game-design-theory.md` 仍缺失并登记为治理红门，不创建占位。
> A7 V2以单一断言同时闭合当前130项Catalog、逐资产来源账本和预算V2候选，P7 Freeze/Assembly只接受
> schema V2；但预算仍`proposed-not-approved`、结构上限仍`unresolved-not-approved`，因此即使130项字节
> observation齐全也不能PASS、不能计算P7 advance，也不能把未批准资产改成可加载资产。

- 输入：A0–A6已批资产、clean RC commit/build/content hash、六设备矩阵、预注册真人任务、缺陷账本。
- 输出：最终Bundle/manifest、三端截图/录像/录音、帧时间/内存/overdraw/加载/恢复、真人识别/归因和许可批准包。
- 依赖：P7 clean candidate；所有上游Definition/Replay/ViewModel/Profile hash冻结。
- 评分：三端稳定20、真人20、音画一致15、预算/生命周期15、无障碍10、来源10、独立审计10。
- 硬门：设备或样本缺失只能`incomplete`；blocking/high关闭；同一clean身份；独立审计前不写`release-ready`。
- 返工：任何上游hash、构建内容、资产字节、许可、设备覆盖或blocking/high缺陷变化。

## 4. 上游变更影响

| 上游变化 | 最小返工范围 |
|---|---|
| Rule/Definition/Event字段或顺序 | A1及消费该事件的A4/A5/A7样件、自动测试、真人归因 |
| Mode/Participant/Result/Respawn | A2、A3多人截图、A5 HUD、A7 |
| Map surface/route/reentry/供给点 | A3全门、受影响A4地图后果、A5路线HUD、A7 |
| 武器Action/反馈/持握点 | 对应A4全门、A5反馈、A7；不连带无关武器 |
| ViewModel/页面/公开数值 | A5、相关A6、A7；UI不保留旧真值 |
| Profile schema/奖励 | A6、A7；战斗资产不重做，除非身份改变 |
| 资产政策/平台预算/许可 | 受影响资产退回Integration，重算hash/预算/设备 |

## 5. 小阶段报告模板

```text
阶段与对齐开发commit/hash：
变更文件：
产物截图/预览/录音：
四门状态：Concept / Blockout / Integration / Final
评分：总分；七项分数；低于80%的维度
测试/检查与三端/无障碍：
来源/license/revision/SHA：
生命周期与预算：
风险与开发依赖：
未完成项：
建议提交信息：
提交/推送：未执行，等待协调授权
```

## 6. 当前协作边界

- 主开发任务`019fa7c7-d26e-7111-9054-782634e5c54c`已形成生产不可达的P2.5e复合checkpoint/三模式恢复、P2.6 continuous/restored双链与P5本地consumer-epoch/效果清理/正式候选原子宿主；默认入口和全部运行反证仍顺延。美术不修改其代码写域，也不把候选描述为默认生产路径。
- `ModeMatchRuntimeV6.step()`继续只提供`events / readFrame / readFrameAudit`静态消费面；checkpoint/历史前缀不属于Presentation。P5正式候选原子宿主已落盘但默认Registry/Composition/入口仍不可达，P2.5e/P2.6与宿主运行验证按[ADR-118](../decisions/118-arena-v2-development-first-deferred-validation-window.md)顺延。A2.0因此仍是`preproduction-contract-candidate / static-bound-to-mode-match-runtime-v6 / verification-deferred-by-ADR-118 / hardGate=false`。
- A0.3当前机器链已闭合，但仍受真人`0/10`与协调签核缺失阻断；A1.1最终source/measurement机器前置已闭合，但协调、逐项批准、捕获、样件和hard gate仍关闭。正式角色、武器、地图、VFX、HUD、音频、Blockout、截图、集成、设备、真人与Final全部关闭。当前A0.3诊断PNG、匿名题包和机器账本只可用于外部真人盲测，不得进入默认产品消费。
- 本轮写域仅为A2.0合同、本矩阵与Art Bible。若runtime候选被撤回、step三键/路径/exact-key改变，按段落回滚“状态＋runtime绑定表＋Cue/失败策略＋静态自检＋协作边界”；整文件回滚点是本轮开始前版本。禁止用`reset`/`checkout`覆盖开发工作树，且不改ADR、台账、索引、流程、脚本、源码或资产。
