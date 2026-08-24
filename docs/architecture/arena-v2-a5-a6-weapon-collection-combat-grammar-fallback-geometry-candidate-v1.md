# Arena V2 A5/A6 武器收藏战斗语法回退几何 Candidate V1

## 1. 状态与范围

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 本批增强既有 `weapon-index` 的20张武器收藏卡，并把同一语法几何延伸到当前选中武器的既有 `weapon-detail` A6.18回退预览；不新增页面、卡片、字段、按钮、action、点击、导航、输入、Profile写入、Authority逻辑或资产字节。
- 当前生产批准账本仍是130项全部`missing-not-approved`；20武器收藏预览继续`formalReady=false / assetUsePermitted=false / requestToken=null`，资源调用、lease、mount和Three Renderer均为0。
- A0.3仍为85/100、真人0/10、`pending-regeneration / hardGate=false`，Blockout及正式资产门保持关闭。

## 2. 技能与强制参考

本批按 `game-art-director → threejs-game-ui-designer` 使用技能：

- `game-art-director`：形状、负空间和明暗先于颜色；表现层只消费现有Definition/内容目录事实，不创造属性、数值或第二真值。
- `threejs-game-ui-designer`：已读取`ui-patterns`、`game-ui-quality`、`hud-readability`、`responsive-ui-fit`与`mobile-input`；沿用11页、标准RenderPlan、双固定视口、48px动作区和既有滚动/clip合同。

项目直接参考：Art Bible、美术与音频流程、A4/A5首屏可读性目录、A6.18/A6.18b回退几何、A6.15布局桥以及正式20武器信息内容目录。`docs/collaboration-protocol.md`与`docs/game-design-theory.md`仍不存在，仅作为治理红缺口登记；未创建占位，也未进入机器合同或hash。

## 3. 单一语法来源

`ARENA_V2_WEAPON_COLLECTION_COMBAT_GRAMMAR_VISUAL_SOURCE_CANDIDATE_V1`从
`ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons`逐项投影：

- `weaponDefinitionId / collectionOrder / coreVerb`；
- 固定顺序的`ground / aerial`两个既有context；
- 每个context的`actionDefinitionId / failureRisk / counterInputs`。

值域与视觉顺序元素都不在本批手写：`coreVerb / context / failureRisk / counterInput`分别直接从
`WEAPON_CORE_VERB_V1 / WEAPON_ACTION_CONTEXT_V1 / WEAPON_FAILURE_RISK_V1 /
WEAPON_COUNTER_INPUT_V1`的`Object.values`派生；模块还固定检查6/2/7/2的当前数量和唯一性，未来Definition新增值不会静默落入unknown。A5/A6只锁定当前20武器、由正式GROUND/AERIAL常量组成的两个context及每项1..2个反制输入。目录当前没有获批且稳定的“距离档位”分类，所以本批明确`projectsDistanceBand=false`；不读取或复制range、覆盖、伤害、tick、稀有度、成长、奖励或运行时规则。

## 4. 零增量几何重排

采用A方案：`addArenaV2WeaponCollectionCombatGrammarFallbackGeometryToRenderPlanCandidateV1`
只重排A6.18既有三个`fallback-pattern:1/2/3` panel，不增加primitive，也不修改其ID、kind、tone、clip、z-index或A6.18 fallback text。

| 既有panel | 只读语法 | 非颜色表达 |
|---|---|---|
| 主形状 | `coreVerb` | 在安全形状区内形成六种有界方向/重心偏置 |
| 辅助形状 | ground/aerial `failureRisk` | 横纵位置分别绑定地面/空中风险类别 |
| pattern | ground/aerial `counterInputs` | 横纵位置与圆角绑定方向/跳跃反制组合 |

重排保留A6.18b三块panel的全部整数width/height，只作30%的有界位置目标插值并使用整数圆角，因此仍以既有轮廓身份为主、语法为第二阅读层。尤其pattern panel沿用A6.18已有、玩家可见且至少相差1 CSS px的整数宽度；构造期在`72 / 96 / 168 / 240px`分别要求这组宽度20/20唯一，并在详情实际`200 / 260px`槽分别要求20/20整数几何身份。语法映射本身可以被多把武器共享，本批不谎称语法维度有20种；最终身份是“A6.18既有整数几何＋语法有界重排”的组合。武器与地图统一使用A6.18b的`primary:…|secondary:…|pattern:…`签名格式后再合并判重，四种标准槽下20武器加2地图必须继续22/22唯一。任何碰撞、越界、非有限值或不满足既有槽位合同均拒绝。

## 5. A6.15组合与失败关闭

- A6.15先生成preview-aware计划：索引页原位替换20×3个panel，详情页只原位替换当前选中武器的3个panel；输入和输出primitive数量必须完全相同，最终继续硬拒绝`>256`。
- 20张源卡必须精确闭合`panel / label / description / action`；输出卡的文字、accessibility、intent、enabled、action label与48px均逐值保持。
- A6.18的1个fallback text逐字段保持；research与milestone文字不改。
- 完整增强重放返回同一引用；20卡中增强前/增强后混用、单panel漂移、重复ID、未知武器、部分提交、文字/action漂移均在发布新计划前失败关闭。
- `weapon-detail`必须由A6.15提供同一次只读快照中已闭合的当前`weaponDefinitionId / displayName / previewRect / fallbackExpected / currentUniqueGoal`。基础`weapon-detail`按A6.15既有规则核对标题：唯一目标为`当前目标 · ${displayName}`，否则为`${displayName}`；同时核对既有`primary-action` intent。相邻浏览identity若为`weapon-detail:browse-weapon:<encodedId>`，规范解码后的ID必须精确等于target。source identity、唯一preview身份、现有详情文字/action和当前选择任一漂移即在输出前拒绝。地图详情与其他非目标页原引用返回。
- 未来获批路径还会逐值复算透明中心rect及四条A6.15边框的位置、厚度、圆角、tone、clip和z-index；仅数量/kind相同不能放行。
- 当前未批准/missing武器详情只重排既有A6.18 `3 panel + 1 text`中的3个panel；`formalReady && assetUsePermitted`的未来获批GLB透明中心原引用返回，程序化fallback不得覆盖正常GLB路径。
- 不创建DOM节点、Three对象、loader、lease、mount、RAF、timer、音频或新资源Owner；A6.15滚动、scissor和可重试销毁链没有新增所有权。

## 6. 未运行测试与证据边界

已写、未运行的测试源码覆盖：

- 20/20目录顺序与ground/aerial语法逐项同源；正式Definition常量为唯一值域；
- 不复制战斗数值、距离档位、稀有度、成长或奖励；
- 72/96/168/240标准槽、详情实际200/260槽、390×844与1440×900的现有布局输入；
- 索引原位重排60 panel、详情每次原位重排3 panel、零primitive增量与256硬上限；
- index/detail同一武器在同一标准preview rect下得到同一相对几何签名；详情200/260槽保持整数尺寸身份和边界；
- 20武器与2地图最终22项非文字几何唯一；
- 同输入同输出、重复增强同引用；部分卡、重复ID、未知武器、几何/文字/action漂移失败关闭；
- 未选/未知武器、browse identity错绑、标题/主动作错绑、partial fallback、重复增强、详情文字/action漂移失败关闭；地图详情和合法未来获批GLB路径零改，透明中心/边框几何漂移拒绝；选择文字/action/48px/accessibility和fallback text零改、零资源副作用。

测试、typecheck、lint、format、diff-check、build、浏览器、截图、设备、性能与真人理解证据全部`not-run`。源码不能替代双视口可读性、真实长文适配、色觉/读屏或玩家学习证据。

## 7. 七维静态自检与回滚

| 维度 | 静态结论 | 顺延项 |
|---|---|---|
| 形状/姿态可读性 | 保留20武器A6.18轮廓，并叠加既有core verb、地/空风险、反制方向 | 双视口截图、真人学习与识别率 |
| 非颜色单通道 | 唯一闭包只看三个panel的位置/尺寸/圆角；文字并行但不参与放行 | 灰度/色觉设备证据 |
| 双视口/触控 | 复用A6.15索引槽与详情200/260槽、既有滚动/clip、原action和48px；同标准rect共用同一重排核心 | 浏览器真实长文与触控避让 |
| 低动效/静音 | 纯静态panel，无动画/音频依赖；muted信息一致 | reduced-motion/读屏实测 |
| 生命周期 | 零资源、零Owner、零异步；不改变lease/迟到结果/销毁链 | 浏览器销毁与内存证据 |
| 来源/批准隔离 | 只读Definition/内容目录；不改变0批准、token或正式资产状态 | A1.1重建、许可与生产审批 |
| 治理/回滚 | 候选独立、默认入口关闭；错误在新计划发布前拒绝 | 主协调小阶段验收与运行门 |

精确回滚：删除本批两个新源码、两个未运行测试和本文；移除两个包导出；从A6.15删除一次增强调用（含详情target参数）及对应metadata；回退Art Bible、A6.15/A6.18说明与对齐矩阵对应段落。无需回滚Profile、Progression、Authority、资产、批准账本、A6.18或默认入口。
