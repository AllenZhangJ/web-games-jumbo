# Arena 美术 A0–A7 与开发 P0–P7 对齐矩阵

## 文档状态

- 状态：A0.1为`contract-ready`；A0.2三个子门已签核且独立聚合总门为`ready`（96/100），Reference Board视觉方向总门`ready`；A0.3技术/代理候选85/100且真人0/10，仍`incomplete`；A1.0供给表现合同94/100已签核，A1.1来源与测量就绪包为`preproduction-readiness-candidate`（92/100、硬门false），代表样件、A1及Blockout仍关闭
- 日期：2026-07-28
- 审计基线：`d6f906008d0af1ed0133a199a8dc9e15cb1d23d0`
- 关联：[Art Bible](arena-art-bible.md)、[美术与音频流程](arena-art-and-audio-development-flow.md)、[V2 生产计划](arena-v2-production-development-plan.md)

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

- 当前小门：[A1.0供给表现预生产合同](arena-art-supply-presentation-contract-a1.0.md)与机器台账绑定`dd786a9`的P1.1/P1.2事件、Definition、599/600/601、Replay及暂停/销毁证据；主协调于2026-07-28以94/100签核，A1.0合同自身`hardGatePassed=true`、状态`contract-ready`。该签核不启动代表样件，A1、A0.3和Blockout仍关闭。
- 并行前置：[A1.1代表样件来源与测量就绪包](arena-art-supply-readiness-a1.1.md)绑定实际父节点`21948d4`，审计圆盾/诊断剪影/研究线框、临时VFX与音频来源候选，并固定桌面1440×900及390×844测量方案。当前仅`preproduction-readiness-candidate`、92/100，A1.1协调与来源/捕获硬门全部false；VFX无字节，供给专用图标缺失，Kenney OGG只允许未来离线语义试听候选。
- 输入：P1.1冻结后的供给 Definition、稳定事件/字段、600 tick/同 tick顺序、Snapshot/ViewModel。
- 输出：供给/替换/过期形色表、10秒显示样件、Cue候选、音效草样、低动效/静音/失败回退。
- 依赖：开发先完成 P1.1；美术不定义事件、不运行墙钟删除。
- 评分：事件映射25、替换/过期区分20、镜头/HUD20、预算/生命周期15、无障碍10、来源10。
- 硬门：599/600/601及同 tick拾取只投影权威结果；没有三选一弹窗；A0.3真人门、可恢复只读生命周期投影、A1.1主协调批准的代表装备/临时来源/捕获方案与实际测量夹具齐全后才可启动代表样件，代表样件过门后才扩量。A1.1候选文档与预算不能替代批准、夹具或实测。
- 返工：事件名/字段、权威顺序、生命周期、拾取半径/替换策略或暂停恢复投影改变。

### A2 ↔ P2：模式与参与者视觉合同

- 输入：Mode/Participant/Result/Respawn Snapshot和事件、最大参与者/敌人数、三模式终局。
- 输出：模式状态表、身份标记、倒计时/排名/两次掉落/重生Cue、声音层、代表截图。
- 依赖：P2可无渲染结束并Replay；身份、重生、终局不由Renderer推断。
- 评分：模式区分20、多人身份20、终局/重生20、剪影15、音画10、三端/来源15。
- 硬门：三模式同一语义体系；颜色非唯一身份线索；无模式特供规则写入。
- 返工：Mode schema、参与者/队伍、排名、复活、终局或Snapshot字段改变。

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

开发任务 `019fa7c7-d26e-7111-9054-782634e5c54c` 将先完成 P1.1 Rule/Definition/稳定事件合同。A0.1 只建立视觉/声音生产基线与验收合同，不写 P1 规则、不创建第二套事件词表、不决定600 tick同 tick顺序。合同冻结后，A1 才能据其字段制作供给代表样件。
