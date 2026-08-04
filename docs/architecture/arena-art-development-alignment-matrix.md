# Arena 美术 A0–A7 与开发 P0–P7 对齐矩阵

## 文档状态

- 状态：A0.1为`contract-ready`；A0.2三个子门已签核且独立聚合总门为`ready`（96/100），Reference Board视觉方向总门`ready`；A0.3技术/代理候选85/100且真人0/10，仍`incomplete`。A1.0-v2 已绑定当前 PP0/PP1/ADR 来源并由主协调以94/100签核为当前源码合同，正向检查与85/85失败关闭通过；机器包自身继续保持`joint-gate-candidate / hardGatePassed=false`，避免自签。A1.1的92/100仍只是绑定`f80307b`的历史候选，机器复验因三个上游源码artifact漂移而红。PP3b 已以96/100完成三端 build-side 合同签核，但七目标设备、代表样件、A0.3真人、A1.1重建、A2及Blockout仍关闭
- 日期：2026-08-03
- 审计基线：HEAD `d750e4caa767332b5c3caaf247080b5717d56219` + 当前未提交 P1 候选
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
- 硬门：总分≥90且每维度≥80%；当前两角色的角色/武器态/方向分别≥90%，任一角色×赤手或圆盾组合≥80%；重跑结果hash稳定。当前[候选基线](arena-art-silhouette-a0.3.md)为85/100、144/144在画面内，非真人代理整体及距离分层三项均≥90%；但真人0/10使该维度0%，因此`hardGatePassed=false`、A0.3仍`incomplete`。
- 返工：相机、方向resolver、角色/武器字节、持握点、缩略规则、盲测题目或样本资格改变。

A0.1通过后只允许将合同交给下一任务；A0.2与A0.3任一未通过时，A1/A3/A4可以准备事件映射或资产清单，但不能开始生产Blockout、标记`concept-approved`或宣称Reference Board/剪影已通过。

### A1 ↔ P1：供给表现合同与代表样件

- 当前小门：[A1.0供给表现预生产合同](arena-art-supply-presentation-contract-a1.0.md)已新增并冻结 A1.0-v2：绑定28个非自引用来源、PP0/PP1最终字节和25个固定fixture，主协调复跑正向检查与85/85隔离拒绝后以94/100签核为当前源码合同。机器 JSON 仍保持`joint-gate-candidate / coordinatorSignOff=false / hardGatePassed=false`，外部签核只记录在P1台账，避免修改其必绑ADR形成自引用；这不授权代表样件或设备通过。
- 并行前置：[A1.1代表样件来源与测量就绪包](arena-art-supply-readiness-a1.1.md)绑定实际父节点`f80307b`，审计圆盾/诊断剪影/研究线框、临时VFX与音频来源候选，并固定桌面1440×900及390×844测量方案。schema v2只读生命周期合同的六个必需字段在当前源码仍可定位；但`node --import tsx scripts/art/check-arena-supply-preproduction-readiness.ts`于2026-08-02因`match-core.ts`、`bot-observation.ts`、`bot-controller.ts`的byteLength/hash漂移失败，故92/100只保留为历史候选，当前状态为`stale-upstream-evidence`。在最终源码身份冻结并重建artifact前，A1.1协调与来源/捕获硬门仍false，VFX无字节、供给专用图标缺失，Kenney OGG只允许未来离线语义试听候选。
- 输入：P1.1冻结后的供给 Definition、稳定事件/字段、600 tick/同 tick顺序、Snapshot/ViewModel。
- 输出：供给/替换/过期形色表、10秒显示样件、Cue候选、音效草样、低动效/静音/失败回退。
- 依赖：开发先完成 P1.1；美术不定义事件、不运行墙钟删除。
- 开发侧必须按[ADR-113](../decisions/113-arena-v2-supply-presentation-adapter-boundary.md)完成P1供给Presentation adapter：只读消费冻结projection/event并通过A1.0的25项机器矩阵；P2正式生存尚未开放时，只能由与默认Product和发布产物隔离的acceptance harness驱动。adapter不持有Mesh/Audio/VFX/DOM资源，美术只消费其深冻结Marker/Cue/View，不直接读取MatchCore、Resolver或Session authority。
- 评分：事件映射25、替换/过期区分20、镜头/HUD20、预算/生命周期15、无障碍10、来源10。
- 硬门：599/600/601及同 tick拾取只投影权威结果；没有三选一弹窗；只读生命周期合同已具备，但A1.0/A1.1必须先在最终source identity上重建并通过，A0.3真人门、主协调批准的代表装备/临时来源/捕获方案与实际测量夹具也须全部齐全后才可启动代表样件，代表样件过门后才扩量。P1 advance前还须取得同一clean source/content身份下的Web `390×844`与`1440×900`、微信/抖音开发者工具及iOS/Android六目标供给专属记录；通用Stage 8记录不能替代。历史候选文档、上游代码签核与预算不能替代当前批准、夹具或实测。
- 返工：事件名/字段、权威顺序、生命周期、拾取半径/替换策略或暂停恢复投影改变。

### A2 ↔ P2：模式与参与者视觉合同

- 当前状态：`planned / contract-preaudit-only / hardGate=false`。ADR-112与P2.0字段合同均为提议，开发线程与美术线程尚未回执，A0.3真人仍0/10；本节只固定未来消费边界，不授权截图、声音、VFX、HUD、Blockout或资产生成。
- 本轮合同预审使用`game-art-director`与`audio-design`；已读取两个技能正文及项目[美术与音频流程](arena-art-and-audio-development-flow.md)。`game-art-director`要求的通用`docs/collaboration-protocol.md`和`docs/game-design-theory.md`在本仓库不存在，因此不伪造引用，项目协作边界以本矩阵、P2台账、ADR-112和根`AGENTS.md`替代。当前不涉及自适应音乐，未读取也未套用`adaptive-music.md`。
- 输入候选：ADR-112的Mode/Participant Assignment V2/Product Result V3/V6事件与只读mode projection、Race最大4人、Survival enemy slot安全上限、三模式终局和P1供给事件。只有主协调签核后的exact-key schema可成为A2正式输入。
- 输出候选：模式状态表、2–4人身份标记、倒计时/排名/并列/无完赛者、两次掉落/重生、enemy slot/压力阶段Cue、声音优先级与voice上限、低动效/静音/加载失败替代、桌面/竖屏代表截图和真人题包。
- 依赖：P2三模式可无渲染结束并严格Replay；A0.3真人通过；身份、锚点、重生、排名、fall count和终局均由权威事件/投影给出，Renderer/Audio/UI不得从坐标、动画、播放完成或事件到达顺序推断。
- 评分：模式区分20、多人身份20、终局/重生20、剪影15、音画10、三端/来源15；未产出和未执行项不打计划分。
- 硬门：三模式同一视觉语义体系；颜色非唯一身份线索；并列第一不按事件序拆先后；`no-finisher`不播放胜利；静音/低动效不丢因果；无模式特供规则写入；总分≥90且每维≥80%。
- 返工：Mode/policy/schema、participant role/team/slot generation、事件名/payload/同tick顺序、排名、重生、终局、mode projection或Survival上限改变。

#### A2.0 权威事件→音画职责候选

| 权威事实 | 视觉/HUD只读职责 | 音频只读职责 | 低动效/静音/失败回退 |
|---|---|---|---|
| `MatchStarted`＋mode identity | 以固定mode图形与简短目标文案区分Duel/Race/Survival；不增加操作键 | UI总线单次开局提示；不改变倒计时 | 静态mode标；声音失败不阻塞开局 |
| Race权威倒计时 | 固定宽数字＋收拢门框；只消费`modeProjection.preparationRemainingTicks`，不得误用active hard-limit `WorldSnapshot.remainingTicks` | UI总线最多每秒一拍，最后一拍与开局分离 | reduced-motion只换数字/边框；静音保留语义公告 |
| `RaceSafeAnchorCommitted` | 世界空间圆角门框＋回转锚图标短暂确认；不得画成真实碰撞体或检查点按钮 | 默认不逐锚点播放；仅首次/关键锚点允许低优先级SFX，防止高频噪声 | 静态锚图标；加载失败用同位置基础glyph |
| `ParticipantFell` | 命中来源Cue之后再显示向下断线；没有命中事实时明确为移动失足 | SFX低频短落空，不复用命中音；同tick批次限voice | 无震屏；静音仍显示来源/失足差异 |
| `ParticipantRespawnScheduled/Respawned` | 180 tick环形刻度只投影readyTick；重生用安全门框、锚ID与短无敌边缘 | scheduled不循环蜂鸣；respawn单次中优先级SFX | 数字/静态环；前台恢复不补播已过期Cue |
| `RaceFinishClaimed` | 终点门框闭合、claim participant标记；同tickclaim共享第一名 | 同tick并列只播放一次共享finish stinger，避免按participant叠声 | 低动效改稳定门框＋“并列第一”；静音保留文字/图形 |
| Race `MatchEnded` | Result V3直接显示winner IDs、真实并列和progress ranking；`no-finisher`明确未完赛 | 有winner才允许胜利stinger；`no-finisher`使用中性结束Cue | 不从事件序挑胜者，不让排名动画反写结果 |
| `SurvivalEnemySlotChanged` | 所有敌人保持同一视觉族；激活/失活只显示入口方向、slot generation不向玩家暴露为类型 | 同tick多slot合并为一次压力Cue，禁止voice storm | 静态入口箭头/敌人数；音频失败不改变刷新 |
| `SurvivalPlayerFallCounted` | 两格断环显示`0/2→1/2→2/2`；第一格明确可重生，第二格只由终局事件关闭 | 第一次fall与最终结束使用不同优先级/音型 | 不使用健康条伪装；静音保留数字、断环和文字 |
| MatchReadFrame/SupplyProjection V3装备身份 | HUD和场上供给只读`collectionEquipmentDefinitionId / runtimeEquipmentDefinitionId / survivalLevel`显示当前武器、供给等级与替换结果；禁止解析ID字符串或按波次猜level | tier变化本身不额外叠加高优先级voice；拾取/替换继续消费P1稳定事件 | 资产失败显示collection基础glyph＋`Lv.N`文字；静音/低动效不隐藏level，身份不匹配则隐藏整项并进入resync |
| Survival `MatchEnded` | 直接显示survived ticks、pressure stage、fall count与reason；不显示虚构winner/draw | 单次结算Cue，不能因音乐层完成才结算 | 静态结果页；声音/资产加载失败不阻塞Result |

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
| `arena.race.ended.v1` | Race `MatchEnded`＋Result V3 | UI | 100 | 1/1 | 600 | `terminal-visual-only` / `static-frame` | `fallback.race-result.v1` / `fallback.race-result.v1` |
| `arena.survival.pressure.v1` | 同tick `SurvivalEnemySlotChanged`批次 | SFX | 35 | 1/1 | 60 | `drop-one-shot-after-60` / `numeric-only` | `fallback.survival-pressure.v1` / `fallback.survival-pressure.v1` |
| `arena.survival.fall-counted.v1` | `SurvivalPlayerFallCounted` | SFX | 80 | 1/1 | 30 | `drop-one-shot-after-60` / `numeric-only` | `fallback.survival-falls.v1` / `fallback.survival-falls.v1` |
| `arena.survival.ended.v1` | Survival `MatchEnded`＋Result V3 | UI | 100 | 1/1 | 600 | `terminal-visual-only` / `static-frame` | `fallback.survival-result.v1` / `fallback.survival-result.v1` |

所有A2 Cue共享一个最多4个voice handle的mode pool，其中UI同时最多2、SFX同时最多3；高优先级可拒绝或停止最低优先级mode voice，但不得停止既有命中反馈后把fall伪装为无来源。`no-finisher`与有winner共用`arena.race.ended.v1`的池和并发预算，但按Result V3选择中性/胜利表现资产；选择只读Result判别字段，不读事件先后。候选混音门为最大合法A2并发场景下Master true peak不高于`-3 dBFS`且无削波；这是待设备录音验证的目标，不得在未实测前写成通过。

Cue消费identity固定为`event.id`去重、`event.sequence`稳定仲裁、`event.tick`判断迟到；projection只用于重建持续状态，不能反向合成已经缺失的一次性事件。pause保留持续静态状态并停止新voice，resume从最新projection重建静态状态但不补播one-shot；destroy先使generation失效，再取消加载、停止/释放voice、移除listener/DOM/粒子，重复destroy只重试未释放资源。任何迟到resolve/reject都不得重新注册Cue或播放器。

基础fallback登记如下，均是运行时故障兜底而非正式资产：mode目标=`模式缩写＋目标文字`；倒计时=`等宽数字＋边框`；安全锚=`回转箭头＋锚ID`；掉落=`participant短编号＋向下断线＋来源/失足文字`；重生=`短编号＋ready tick/安全锚文字`；终点/结果=`participant短编号列表＋并列/未完赛/生存数字`；压力=`敌人数＋入口方向箭头`；生存掉落=`0/2、1/2、2/2两格断环`。所有fallback必须取自已验证的权威payload/projection/PublicInfo，不允许用屏幕坐标或动画阶段补字段。

#### A2.0 多人身份与语义防混淆

- 身份只消费ProductPublicMatchInfo V2的`localParticipantId`及每项`participantId / displayName / portraitKey / appearanceKey / identityOrdinal / identityGlyphKey / identityPatternKey`。Presentation先验证participant集合与assignment相等、ordinal在当局为连续唯一`1..N`，再按`identityOrdinal`升序展示；Result排名和并列仍只读Result V3/mode projection，绝不使用该展示顺序。
- 正式身份标记使用`identityGlyphKey＋identityPatternKey＋identityOrdinal`三线索；本地身份在其外叠加双外环和“我”文字，不改变原ordinal。正式glyph/pattern加载失败时，1–4号分别回退为`圆＋竖纹`、`三角＋横纹`、`方形＋右斜纹`、`菱形＋交叉纹`，并始终显示数字；公开portrait或appearance失败只回退模型/头像，不得删除participant或替换identityOrdinal。颜色、事件数组顺序、participant ID字典序或临时屏幕位置均不能单独承担身份。
- Race的2/3/4人名单、头顶标记、终点与Result使用同一当局identity映射；Survival敌人即使拥有不同slot/participant identity也保持同一视觉族，只在需要定位来源时显示入口方向与短编号，不以glyph、纹理或generation伪装成不同敌人类型。
- Race终点继续使用`环/门框`，安全锚点使用较小圆角门框＋回转锚，供给使用圆/软弧；三者在纯黑剪影和灰度下必须由尺寸、缺口、图标和位置层级区分。
- Survival敌人只是一种视觉族，不因slot generation伪装成新敌人种类；压力上升优先通过同屏数量、入口方向和权威stage标记表达，不通过改变碰撞暗示、发光等级或隐藏数值。
- 命中击落固定为“命中接触标→来源方向→向下断环”；移动失足只有“失去支撑→向下断线”；两者不得共用红闪、音型和结束章。
- 第一/第二次Survival掉落使用同一两格断环的不同填充状态，不新增复活按钮、额外输入或三选一页面。

#### A2.0 预注册验证与美术自检

正式A2提请验收前，美术线程必须先提交六维自检：

1. 健壮：缺事件、未知schema、资源加载失败、非权威participant/anchor引用均fail closed到基础glyph/文字，不伪造状态。
2. 竞态：重复/迟到/乱序/同tick多finish、多fall、多slot事件按authority identity去重；并列语义不受消费顺序影响。
3. 兜底：程序化glyph只作运行时加载失败兜底，不计正式资产；静音、低动效、低质量级保留全部必要因果。
4. 边界：2/3/4人、多人遮挡、共享第一、`no-finisher`、0/1/2次fall、enemy slot最小/最大及窄屏安全区均有截图/自动检查。
5. 生命周期：pause/resume、重建、重复destroy、异步播放拒绝、voice池/粒子/DOM/监听器清零有测试。
6. 主流程：三模式从开局→关键事件→重生/终点→Result在`390×844`和`1280×720`均可理解；任何需猜规则或无法完成结算的表现问题直接判红。

真人任务至少回答“当前模式、本地玩家、领先/并列、掉落原因、重生位置、Survival第几次掉落、为何结束”；整体正确率目标≥90%，任一核心题/视口/2–4人分组不得低于80%。自动化、代理或美术人员自答不能替代独立真人。

本轮主协调只对新增合同做了六维自检，不替代美术线程回执：健壮性上，未知source/schema/participant/asset只允许隐藏one-shot或回退文字，不发布伪状态；竞态与确定性上，事件以`id`去重、`sequence`稳定争用、`tick`判断迟到，同tick并列和多slot不按消费顺序改语义；兜底与失败关闭上，静音、加载失败和voice限流均保留权威视觉结果；边界上，Cue只读event/projection/Result/PublicInfo，不读取坐标、动画、墙钟或Profile；生命周期上，pause/resume不补播、destroy先失效generation并可重试清理；主流程上，审查发现并修复了“Race倒计时无权威公开字段”的阻塞候选，现以`modeProjection.preparationRemainingTicks`与active hard-limit `remainingTicks`分离。尚未执行的代码、资产、截图、音频、设备和真人验证全部继续记红。

#### 2026-08-02 主协调A2.0合同预验收

本次只评价上游事件到未来音画职责的合同完整性，不评价尚不存在的截图、音频、VFX、HUD、设备或真人产物，也不能把A0.2分数并入A2。状态为`contract-preaudit / rejected-for-small-gate / hardGate=false`。

| 合同维度 | 分值 | 当前 | 当前证据与扣分原因 |
|---|---:|---:|---|
| 权威事件/projection映射 | 25 | 24 | P2台账已有V6 exact-key、mode projection、event identity及MatchRead/Supply V3的collection/runtime/tier候选，A2固定`id/sequence/tick`消费且不解析ID；上游仍未签核，开发/美术尚未反证 |
| 多人非颜色身份 | 20 | 19 | 已逐字段绑定PublicInfo V2，冻结ordinal排序、glyph/pattern/数字和本地叠层及1–4号失败回退；仍缺2/3/4人截图与真人证据 |
| 终局、并列、无完赛与重生 | 20 | 18 | 并列、`no-finisher`、180 tick、两次掉落、迟到和静态终局重建已明确；结束原因枚举、上游schema签核及实际主流程仍缺 |
| 静音、低动效与加载失败 | 15 | 14 | 11类Cue已逐项登记fallback ID、低动效和静音职责；仍无正式资产失败注入与视口/设备证据 |
| 音频优先级与生命周期 | 10 | 9 | 11类Cue已冻结候选bus、优先级、单项/全局voice上限、重复间隔、迟到、暂停恢复和销毁；`-3 dBFS`仅是待实测目标 |
| 上游身份、回执与治理 | 10 | 3 | A2未越权生成资产；但ADR-112未签核、美术回执/六维自检未取得、A0.3真人0/10、A1.1证据过期 |

当前合计`87/100`；总分不足90且治理维度低于80%，硬门明确为红。返工顺序固定为：开发A/开发B逐字段反证或修订P2 exact-key事件、projection、装备公开身份与PublicInfo，随后美术线程对本节提交回执和六维自检；A0.3真人和A1.1 source identity各自通过后，才允许进入任何A2截图、音频、VFX、HUD或Blockout。Cue/装备身份预注册候选提高了合同完整度，但不能替代任何代码、素材、设备或真人证据。

### A3 ↔ P3：KZ环境与敌人生产

- 输入：正式Map Definition、六段surface/分叉/重入/供给/终点、可达/拥挤证据、Bot Observation。
- 输出：原创环境Concept、路线Blockout、地标/材质/灯光套件、敌人视觉族、LOD/纹理/多边形报告和设备截图。
- 依赖：路线几何、重入和敌人身份冻结；研究地图不直接转生产。
- 评分：路线/落点25、原创/来源15、拥挤/敌人剪影15、材质灯光15、预算/LOD15、三端/真人15。
- 硬门：自动可达+真人路线理解；黑剪影/灰度可辨路线、边缘、威胁；装饰不改surface。
- 返工：Map hash、surface/起终点/重入、镜头、容量、Observation或预算改变。

### A4 ↔ P4：单武器视觉、动作与声音包

- 输入：单把Equipment/Action Definition、动作阶段、反馈事件、三模式地图后果、反制窗口和Replay。
- 输出：单把Concept/Blockout、GLB/附件、18动画语义映射、持握六方向、五类Cue、音频、低动效及设备/真人证据。
- 依赖：先逐把补三把生产基线，再推进直线压制、读招反制、绕后；封路/延迟重击等待权威持续区生命周期和预警字段。一把未过Final不复制到下一把。
- 评分：独立轮廓20、动作/反制20、反馈归因20、预算/生命周期15、三端/真人15、来源10。
- 硬门：每把独立四门、独立100分、独立提交、独立回滚；总分≥90且各维度≥80%；视觉缩放不改hitbox；程序化表现不算Final。
- 返工：动作阶段/取消/命中/挥空/冷却、反馈、持握点、骨架、地图后果或默认Registry改变。

### A5 ↔ P5：11页面、HUD与最终反馈

- 输入：稳定ViewModel、导航、供给剩余tick、公开事实、五类反馈和声音设置。
- 输出：页面视觉系统、HUD token/组件、DOM/Canvas对照、390×844/桌面截图、三端录屏/录音和首次归因任务。
- 依赖：页面职责、字段、事件冻结；美术不改页面数、规则或公开数值。
- 评分：信息20、归因20、同源15、触控/语义15、最终资产10、三端10、证据10。
- 硬门：一页一问题/一主动作/首屏≤3；触控≥48px；10秒只来自tick；真人归因失败即退回。
- 返工：ViewModel、页面职责、事件优先级、公开数值、安全区、无障碍或声音设置改变。

### A6 ↔ P6：收藏与长期内容表现

- 输入：版本化Profile、收藏/熟练/地图/模式/挑战事实、幂等奖励和下一目标。
- 输出：收藏/详情/进度组件、空/失败/未来版本保护页面、内容素材计划与容量预算。
- 依赖：Profile schema、CAS/租约/未来版本保护和奖励事务稳定；局外视觉不产生数值优势。
- 评分：数据同源20、下一目标20、长期一致15、失败可读15、资产扩展15、三端/来源15。
- 硬门：纯装饰/等待不计200小时；存储失败不显示假成功；每项仍走四门/provenance。
- 返工：Profile schema、奖励幂等、容量、内容身份、下一目标或未来版本策略改变。

### A7 ↔ P7：三端收敛与发布资产冻结

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

- 开发 A `019fa7c7-d26e-7111-9054-782634e5c54c` 与开发 B
  `019fb364-d211-7513-b040-640045598ad6` 进入[ADR-115](../decisions/115-arena-v2-deferred-joint-performance-gate.md)的非性能条件窗口：开发A先在回执后只实现PA7-0，主协调签核后才开放A/B零重叠lane；开发B随后承担PP0/PP1。PA6仍`formalGate=false`，P2实现、正式性能和提交推送均未授权。P2未来写域以[P2实施台账](arena-v2-p2-implementation-ledger.md)为准。
- 美术线程 `019fa7c3-a20b-7130-b99a-cba1e6cbd4b2` 已按ADR-114完成A1.0-v2三文件、Cue/静音/低动效/失败回退反证；主协调独立复验正向与85/85隔离拒绝后，以94/100签核当前源码合同。该结果只开放PP2/PP3a非性能实现；代表样件、正式资产接入、A2和设备结论仍未授权。A0.2已`ready`，但不能借其分数绕过A0.3真人`0/10`、A1.1硬门false或ADR-112未签核。
- 2026-08-03 PP2、PP3a、PP3b 已分别以95/100、97/100、96/100完成主协调签核。PP3b严格消费A1.0-v2已确认的Marker/Cue/View，并把A1.0-v2原字节作为三端clean attestation共同`assetManifestHash`；公共证据只在`web/shared`保留一份，formal index明确`deviceEvidenceStatus=not-run / formalGate=false`。该结果只开放主协调中央接线和完整非性能门，不把A1.0-v2升级为代表样件、正式资产、设备或真人通过；美术继续等待最终source identity与A1.1重建窗口。
- 2026-08-03 三线程的 ADR-115 通知均已确认送达；开发B和美术已回执角色、peer threadId、新gate与零写入边界，开发A正在唯一获批的PA7-0小门工作。后续仍按
  [P1实施台账的多线程协调检查点](arena-v2-p1-implementation-ledger.md)逐门回执write set、自检、运行任务与阻塞项；一次回执不构成后续小门或美术资产授权。
- A1 继续只消费已经冻结的供给 Rule/Definition/稳定事件和600 tick同 tick顺序，不创建第二套事件词表。ADR-115只调整开发顺序，不会自动开放 A1 代表样件、Blockout、Integration 或 Final；美术各门仍由本矩阵独立评分和主协调签核。
