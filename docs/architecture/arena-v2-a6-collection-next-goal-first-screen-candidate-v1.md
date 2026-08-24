# Arena V2 A6 收藏与唯一下一目标首屏候选 V1

## 1. 状态与边界

- 状态：`code-written-not-run`
- 生产可达：`false`
- 默认 Surface 接线：`false`
- hardGate：`false`
- 验证：测试、类型检查、构建、截图、浏览器、设备、性能、真人均为 `not-run`
- 日期：2026-08-14

本切片只交付 renderer-neutral 的首屏投影合同、纯数据布局合同和未执行的测试代码。它不读取或写入 Profile 仓储，不计算奖励，不选择下一目标，不修改玩法，也不承诺 216 小时真实留存。没有新增、生成、下载或批准任何图片、模型、VFX、音频或字体资产。

固定写集：

1. `packages/arena-product-presentation-three/src/arena-v2-collection-next-goal-first-screen-candidate-v1.ts`
2. `packages/arena-product-presentation-three/test/arena-v2-collection-next-goal-first-screen-candidate-v1.test.ts`
3. `docs/architecture/arena-v2-a6-collection-next-goal-first-screen-candidate-v1.md`
4. `docs/architecture/arena-v2-p6-implementation-ledger.md`

## 2. 技能与强制参考台账

本阶段完整使用项目本地 `threejs-game-ui-designer`。技能将首屏约束为“一页一问题、一个主动作、最多三个首屏事实”，把 390×844 安全区、48px 触控目标、长文本、稳定数字槽、无嵌套卡片、低动效和静音等价写入纯数据合同。技能要求的截图、浏览器和设备证据因本轮明确禁止执行，继续为 `not-run`，不得用源码审阅替代。

| 类别 | 已读文件 | 对本候选的约束 |
|---|---|---|
| 技能入口 | `.agents/skills/threejs-game-ui-designer/SKILL.md` | UI 只读状态，只发意图；先层级和可读性，后装饰 |
| UI 模式 | `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md` | 单层首屏、清楚状态、避免仪表盘化和卡片嵌套 |
| 总质量 | `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md` | 视觉层级、状态、无障碍、生命周期和失败回退 |
| HUD 可读性 | `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md` | 数字槽稳定、文字不依赖颜色、镜头尺度后续实测 |
| 响应式 | `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md` | 390×844 与 1440×900、safe area、长中英文 |
| 移动输入 | `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md` | 唯一主动作、最小 48px、无悬停依赖 |
| 视觉宪法 | `docs/architecture/arena-art-bible.md` | `ink/paper/player/route/safe`语义、颜色须配形状/纹理/文字 |
| 阶段门 | `docs/architecture/arena-art-development-alignment-matrix.md` | A6 只投影 P6 事实；Profile、奖励与下一目标仍属上游 |
| 页面合同 | `docs/decisions/073-arena-v2-ui-eleven-page-contract.md` | 复用既有11入口；不增加页面；`loading`是合法入口 |
| P6 状态 | `docs/architecture/arena-v2-p6-implementation-ledger.md` | 20武器、每把120点主研究、2图、20段、3模式、16挑战和200h并行容量均为静态候选事实 |
| 下一目标 | `packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts` | 目标种类、身份、问题、`actionLabel`、进度和有效学习标记 |
| 页面事实 | `packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts` | 收藏/熟练/地图/模式/挑战的只读投影语义 |
| 容量事实 | `packages/arena-product-progression/src/arena-v2-learning-capacity-report-v1.ts` | 200h仅静态容量假设，不是留存证明 |
| 挑战定义 | `packages/arena-profile-contracts/src/arena-v2-learning-profile-definition-v1.ts` | 四个目标维度至少两项；segment 必须属于明确 map |

## 3. 上游事实与本地所有权

| 输入事实 | 本地用途 | 本地禁止事项 |
|---|---|---|
| Profile Definition ID/contentVersion | 拒绝未来或漂移身份 | 不迁移、不补版本、不写仓储 |
| profileId/revision | epoch 内身份与同 revision 冲突门 | 不自增、不合并冲突 |
| 收藏/熟练/地图段/模式/挑战计数与挑战累计目标 | 最多三个首屏事实中的类别进度；挑战总数/总目标由Definition驱动 | 不计算奖励、不写Profile、不自行重算挑战算法 |
| 唯一 `nextGoal` exact-key | 显示问题、进度、实际目标身份 | 不排序、不选择、不替换目标 |
| 上游 `nextGoal.actionLabel` | 原样进入 `labelText` 和无障碍文本 | 不用通用文案覆盖目标动作 |
| `sourceState/diagnosticCode` | loading/empty/error/future-profile 失败关闭 | 不显示缓存假进度 |
| viewport/safe area | 生成纯数据布局矩形 | 不声称截图或设备通过 |
| reducedMotion/muted/asset state | 静态替代与装饰失败回退 | 不把音频或装饰作为理解前提 |

输入先经过普通数据、exact-key、有限数字、身份和状态闭包检查，再生成并一次提交快照。失败发生在 `#snapshot`、tick 水位、Profile 身份和 revision 变更之前。

最小事实闭包同时要求：每把“完整理解”的武器对应五个已完成情境，因此 `completedWeaponContextCount >= masteredWeaponCount * 5`，且总情境数不得超过完整20武器目录的100项容量。`masteredWeaponCount`不受`collectedWeaponCount`限制：五情境各需3次有效证据，而永久收藏需120次主研究，未收藏武器先完成部分或全部情境是合法的并行成长状态。挑战事实要求 `0 <= completedChallengeCount <= challengeCount`、`0 <= challengeProgress <= challengeProgressTarget`，且挑战数量与累计目标必须同时为0或同时大于0。`catalog-complete`只有在20把已收藏且完整理解的武器、100项武器情境、2张地图、20段路线、3种模式，以及输入Definition对应的挑战总数和累计目标全部闭合时才可显示；表现层只拒绝矛盾输入，不自行推导或选择完成态。

## 4. 一页一问题与状态矩阵

| 状态 | 问题/事实 | 唯一主动作 | 门禁 |
|---|---|---|---|
| `ready` | 上游问题 + 目标进度 + 对应类别进度，最多3项 | 展示上游 `actionLabel`；只映射既有导航意图 | 可用，但不直接开始比赛或写Profile |
| `complete` | 上游完成问题与静态目录完成事实 | 显示上游“等待新增独立玩法内容”；禁用 | `arena.v2.a6.catalog-complete`，不伪造新目标 |
| `error` | 读取失败且不显示假进度 | `retry-loading`，入口为11页合同中的`loading` | 可用，且只重试读取 |
| `loading` | 读取中 | 禁用 | 不使用陈旧进度 |
| `empty` | 无档案 | 禁用 | 不擅自创建Profile |
| `future-profile` | 明确未来版本 | 禁用 | 不覆盖、不降级写入 |

首屏不出现商店、货币、红点、签到、任务列表或嵌套卡片。有挑战时既有模式/终态事实显示“挑战完成x/y · 挑战进度p/t”；空挑战Definition不显示`0/0`。初始16挑战与200h仍只是静态容量披露，不再作为运行时进度上限或终态判定；容量披露在快照中明确标记为非首屏、非留存保证。

武器类别仍只使用既有第三个`category-progress`事实槽；可见值从“收藏x/20 · 五情境完整y/20”原位增强为“收藏x/20 · 五情境完整y/20 · 情境z/100”，完成态的同一事实也显示“情境100/100”。情境容量由本模块既有静态目录`20武器 × 每把5情境`单一派生，同时供输入上限、终态门和可见文案使用；不增加事实数、布局、动作或新事实来源。

## 5. 下一目标兼容合同

| 目标种类 | 合法进度 | 目标身份 | 导航映射 |
|---|---|---|---|
| `collect-weapon` | target≥1 | 仅 weapon | 武器收藏/详情 |
| `weapon-context` | target≥1 | weapon + context | 武器收藏/详情 |
| `collect-map` | target≥1 | 仅 map | 地图收藏/详情 |
| `map-segment` | target≥1 | map + segment | 地图收藏/详情 |
| `mode-mastery` | target≥1 | 仅 mode | 模式选择；不直接开局 |
| `record-improvement` | 唯一允许 `0/0` | 仅 mode | 模式选择；不伪造最佳记录 |
| `cross-challenge` | target≥1 | challenge 必填；weapon/map/segment/mode 至少2项；segment 必须同时有 map | 只按实际非空维度路由：mode优先，其次weapon，否则map；不补目标 |
| `catalog-complete` | 1/1，且目录计数全闭合 | 无目标Definition | 主动作禁用；不伪造“选择模式”目标 |

所有种类都要求 `currentProgress <= targetProgress`。目标 ID 必须与种类和非空 Definition ID 精确闭合；`effectiveLearningRequired`只由上游种类验证，表现层不重算学习价值。

## 6. 响应式与可读性合同

### 390×844

- 使用显式 safe area；内容区左右16px内边距。
- 问题最多3行，事实最多3行，主动作最多2行。
- 主动作固定56px高，合同下限48px；无悬停依赖。
- 数字事实使用21字符稳定槽，避免进度变化引发布局跳动。
- 只有延期内容可纵向滚动；首屏问题、三事实和主动作自身不得水平溢出。

### 1440×900

- 内容区左右32px内边距，三个事实可平铺但不嵌套卡片。
- 问题、事实最多2行，主动作最多1行；主动作最大宽度480px。
- 长中文/英文采用先换行、再省略，完整文本始终保留给无障碍层。

两种视口都只是布局计算合同。没有截图、字体加载、DOM/Canvas、浏览器、真机或真人证据，因此不能宣称响应式视觉通过。

## 7. 语义、低动效、静音与资产失败

- 武器=`蓝色 + 重方形前缺口 + 竖单条纹 + “武器”文字`。
- 地图=`紫色 + 分叉菱形 + 虚线路径 + “地图”文字`。
- 模式=`绿色 + 分段环 + 点阵 + “模式”文字`。
- 完成=`浅黄 + 闭合印章环 + 交叉纹 + “完成”文字`。
- 非ready=`中性表面色 + 开口状态括号 + 横虚线 + “状态”文字`。

颜色永远不是唯一编码。`reducedMotion=true`时只保留静态状态变化，不用位移、闪烁或自动滚动解释因果；`muted=true`与无音频时，问题、文字、形状、纹理和禁用原因仍完整。装饰资产缺失时使用文字+形状+纹理回退，且 `programmaticAssetClaimsApproval=false`，不冒充批准资产。

## 8. 确定性与生命周期

- 同 epoch 只接受单一 Profile 身份；identity/contentVersion/profileId 漂移失败关闭。
- tick 只能前进；同 tick 完全相同输入返回同一快照，冲突输入拒绝。
- 同 Profile revision 的进度或下一目标漂移拒绝；revision回退拒绝。
- `resetPresentationEpoch`必须使用新 epoch，清空水位、身份和快照；不跨 epoch 复用旧状态。
- `consume`重入拒绝；`destroy`清空全部本地引用且幂等；销毁后读取、消费和重置拒绝。
- 输入拒绝 getter/setter、thenable、非普通对象、Symbol键、循环引用、未知字段、未来schema和无限数字。

本候选只产生 renderer-neutral 快照，不持有 Three Object3D、材质、纹理、DOM、音频句柄或计时器，因此本切片没有新增 GPU/音频资源。未来Renderer接入仍需独立证明构造失败回滚、异步generation隔离和destroy释放。

## 9. 未执行测试代码目录

测试代码已覆盖但未执行：

- 武器、地图、模式与只读导航映射；
- 上游 `actionLabel` 到可见/无障碍文本的保真；
- `record-improvement=0/0`，以及非记录目标 `targetProgress=0` 拒绝；
- 只含两维的合法 cross-challenge；segment 无 map 拒绝；
- mastered武器与五情境最小闭包；未完成目录伪报complete拒绝；
- Definition驱动的动态挑战总数/累计目标、空挑战不显示`0/0`，以及完成数/进度越界和总数/目标空值不对称拒绝；
- 部分武器情境在既有武器类别事实中可见，完成态同步显示`100/100`，且事实数、field ID、owner和动作不变；
- complete禁用与原因；error重试可用且入口为`loading`；
- loading/empty/future-profile失败关闭；
- 390×844、1440×900、长中文、长英文、稳定数字槽；
- getter、thenable、未来字段、未来schema、身份漂移、同tick冲突和revision冲突；
- epoch reset、destroy与销毁后调用。

上述均为“代码已写”，不是“验证已过”。

## 10. 七维静态自检

| 维度 | 静态结论 | 证据与仍缺项 |
|---|---|---|
| 信息层级 | 通过源码候选审阅 | 一页一问题、1主动作、≤3事实；缺截图/真人扫读 |
| 上游兼容 | 通过源码候选审阅 | record 0/0、挑战至少两维、segment→map、五情境/complete计数闭包、actionLabel保真；缺运行测试 |
| 响应式与触控 | 合同已写 | 双视口、safe area、48px、长文；缺浏览器/设备证据 |
| 语义与无障碍 | 合同已写 | 颜色+形状+纹理+文字、低动效、静音等价；缺辅助技术/真人证据 |
| 健壮性与竞态 | 合同已写 | exact-key、先验后提交、tick/revision/epoch冲突门；缺类型和运行证明 |
| 异步资产与生命周期 | 本切片无资源，边界已写 | 资产失败回退且不冒充批准；未来Renderer资源释放仍未证明 |
| 主流程与治理回滚 | 边界闭合 | 不写Profile/奖励/目标，不接默认Surface；回退源码/测试改动并删除两处本批台账增量即可回滚 |

## 11. 红门、回滚与下一步

仍保持关闭：A0.3真人0/10、A1.1按当前source重建、正式UI资产、截图、浏览器、三端设备、真人可读性、性能、默认Surface、Profile写入、奖励、正式Blockout、Presentation集成与Final。

最小下一步只能是对本三文件进行独立静态验收；若获准执行验证，再依次做定向类型/单测、renderer接线样件、390×844与1440×900截图、长文/字体/辅助技术检查、三端设备和真人首屏理解测试。任何后续证据不得反写成当前阶段已通过。

回滚点：恢复本节第1章列出的源码与测试文件，并删除A6文档/P6台账中的本批增量即可回滚；不需要修改主索引、默认Surface、P6 Profile/奖励/下一目标或任何资产字节。
