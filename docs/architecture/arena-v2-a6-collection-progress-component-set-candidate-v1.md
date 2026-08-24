# Arena V2 A6.2 武器/地图收藏进度组件候选 V1

> 状态：`production-unreachable / code-written-not-run`
> 日期：2026-08-11
> 硬门：`false`
> 默认 Surface：`false`
> 新增页面：`0`
> 新增主动作：`0`

## 1. 小阶段边界

本候选为 `weapon-index` 与 `map-index` 两个既有信息页提供 renderer-neutral 收藏进度组件模型。它只读取上游已验证的 Profile 身份/revision、版本化 `collectionContent`、收藏/熟练事实与唯一 `nextGoal` 身份；不读取 Profile 仓储，不写 Profile，不计算奖励，不选择下一目标，也不拥有规则、计时或内容目录。

本阶段不接默认 Surface，不新增商店、货币、红点、任务列表、嵌套卡片或第二主动作。没有新增二进制资产、截图、浏览器、设备、真人或性能证据。

## 2. 技能与强制参考登记

本阶段完整使用 `threejs-game-ui-designer`。技能约束落实为：一页一类信息、稳定数字槽、390×844 safe area、48 CSS px 操作目标、长中英文回退、颜色配文字/形状/纹理、低动效与静音等价，以及不把通用 Dashboard 或多层卡片带入游戏收藏页。

已完整读取：

- `.agents/skills/threejs-game-ui-designer/SKILL.md`
- `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md`
- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-development-alignment-matrix.md`
- `docs/decisions/073-arena-v2-ui-eleven-page-contract.md`
- `docs/architecture/arena-v2-p6-implementation-ledger.md`
- `packages/arena-product-presentation/src/arena-v2-information-selection-render-plan-candidate-v1.ts`
- `packages/arena-product-presentation/src/arena-v2-information-content-read-projection-v1.ts`
- `packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts`
- `packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts`
- `packages/arena-product-content/src/arena-v2-information-content-read-catalog-candidate-v1.ts`
- `packages/arena-product-content/src/arena-v2-learning-profile-definition-candidate-v1.ts`
- `packages/arena-product-presentation-three/src/arena-v2-collection-next-goal-first-screen-candidate-v1.ts`

## 3. 目录所有权与同源约束

Presentation 不保存 20 个武器 ID、2 张地图/20 个段落 ID、3 个模式 ID或16个挑战 ID的本地白名单。`collectionContent` 是本组件唯一内容目录输入：

- 对输入逐层执行 exact-key、纯数据、无 getter/setter/thenable 与有限深度检查；
- 重新计算 P5 `contentHash`，拒绝伪哈希；
- 要求恰好20把武器、2张地图、地图段落合计20；
- 要求所有武器、地图、段落 ID 非空且跨类型全局唯一；
- 要求武器 `collectionOrder` 与数组索引连续为1..20，地图内 segment `ordinal` 连续为1..N；
- `progressFacts` 按索引与已验证内容目录的 ID、地图段落总数精确闭合；
- `nextGoal` 的武器、地图、段落只在已解析目录的动态 Set/归属关系中校验；模式与挑战不属于本组件目录，只验证非空与目标 kind 的结构闭包。

因此，一个整体替换 ID/文案并拥有合法新 `contentHash` 的版本化上游目录可以作为新 epoch 的首次输入；组件不会拿硬编码旧目录拒绝它。同一 epoch 一旦提交目录身份，则 `sourceContentHash/contentHash` 切换失败关闭，避免一帧内目录与 Profile 事实错配。

## 4. 组件信息密度

每个武器或地图条目只展示：

1. 上游名称；
2. 已收藏/未收藏；
3. 武器0..5情境或地图0..N段的熟练进度；
4. 是否命中上游唯一下一目标。

颜色不是唯一编码：收藏状态使用文字＋档案页签形状＋实/虚线纹理，目标状态使用文字＋前向缺口形状＋斜纹。固定宽度 `completed/total` 数字槽避免进度变化造成布局跳动。条目动作沿用 `arena.v2.selection.{weapon|map}.{encoded-definition-id}`，只导航到既有信息页，不改变规则或 Profile。

## 5. 唯一目标与完成态

`currentGoalItem` 只做表现映射，不重新选择目标：

- `collect-weapon`、`weapon-context` 映射到已验证武器；
- `collect-map`、`map-segment` 映射到已验证地图；
- `cross-challenge` 若已有 mode 维度则不在收藏条目抢占标记，否则按现有非空目标先映射 weapon、再映射 map；
- mode mastery、record improvement 与 catalog complete 不映射收藏条目。

`ready + catalog-complete` 只有在20把武器全部已收藏且5/5 mastered、2张地图全部已收藏且每张地图全部段落完成时才可显示。任何未收藏、未熟练或段落未完成事实都会拒绝假完成态。

## 6. 响应式、无障碍与回退合同

| 项目 | 390×844 | 1440×900 |
|---|---:|---:|
| safe-area 内边距 | 16px | 32px |
| 武器列数 | 2 | 4 |
| 地图列数 | 1 | 2 |
| 条目最小高度 | 96px | 104px |
| 操作目标 | ≥48px | ≥48px |
| 名称 | 最多2行后省略，保留完整辅助文本 | 最多1行后省略，保留完整辅助文本 |

- 横向溢出禁止，纵向滚动允许；长中文/英文不改变目录顺序或数字槽。
- `reducedMotion` 关闭过渡，只保留静态状态变化；非低动效也仅允许短边框/透明度变化。
- `muted` 不影响任何信息、状态或操作理解，视觉不依赖音频播放。
- 装饰资源缺失时使用文字＋形状＋纹理，不把程序化回退标为已批准资产。
- loading/empty/error/future-profile 不显示陈旧条目；未来 Profile 只读拒绝，不覆盖数据。

上述布局、截图、设备与辅助技术结果均为合同，证据状态仍是 `not-run`。

## 7. 确定性、失败关闭与生命周期

- 输入、构造和 epoch reset 均为 exact-key；先完整克隆、解析、重算与投影，再提交内部状态。
- 同 epoch 拒绝 tick 回退、Profile 身份漂移、revision 回退、同 revision 事实冲突及内容哈希切换。
- 同 tick 同事实返回同一已冻结快照；同 tick 冲突拒绝且不覆盖已提交快照。
- 已存快照每次读取/消费前用 canonical JSON 复核，外部篡改导致失败关闭。
- 新 epoch 显式清空目录/Profile/快照水位；`destroy` 幂等清零，销毁后所有读取与消费拒绝。

## 8. 已编写但未运行的反证

测试代码覆盖：20武器/2地图/20段、动态合法目录首次输入、重复 ID、武器 order 空洞、segment ordinal 空洞、目录数量漂移、进度逐索引 ID 错配、伪 contentHash、同 epoch 合法目录切换、唯一目标三类映射、catalog-complete 真/假、长文与双布局、静音/低动效/装饰缺失、loading/empty/error/future-profile、计数矛盾、getter/thenable/future field、tick/revision/epoch/身份冲突、快照篡改、reset/destroy。

按用户要求，本轮没有运行 test、typecheck、lint、build、截图、浏览器、设备或性能命令；测试结果不得写为通过。

## 9. 七维静态自检

| 维度 | 静态结论 | 仍缺证据 |
|---|---|---|
| 信息层级 | 一条目四类必要事实，无商店/货币/红点/任务列表 | 截图与真人扫读 |
| 内容所有权 | 动态 `collectionContent` 为唯一目录，无生产 ID 白名单 | 上游正式接线 |
| 目标与完成态 | 不选择目标；完成态要求20武器5/5与2图全段完成 | 运行回归 |
| 响应式/无障碍 | 双 viewport、48px、长文、形状/纹理/文字冗余合同已写 | Web/真机/辅助技术 |
| 确定性/恶意边界 | exact-key、重算hash、同tick幂等/冲突、epoch/revision失败关闭 | typecheck与测试执行 |
| 异步资源/生命周期 | 无资源字节；装饰失败可降级；reset/destroy清零 | 宿主异步装卸与双destroy实证 |
| 主流程/治理 | 不写Profile/规则、不新增页面/主动作、不接默认Surface | 协调签核与正式入口证明 |

## 10. 红门与回滚

未完成硬门：源码类型检查、测试执行、既有页面宿主接线、截图、390×844与1440×900实测、浏览器/真机、真人、性能、正式资产、默认 Surface、A6 总门、Final。

最小回滚为整文件删除以下三个未接线候选，不触碰任何既有产品入口或 Profile 数据：

- `packages/arena-product-presentation-three/src/arena-v2-collection-progress-component-set-candidate-v1.ts`
- `packages/arena-product-presentation-three/test/arena-v2-collection-progress-component-set-candidate-v1.test.ts`
- `docs/architecture/arena-v2-a6-collection-progress-component-set-candidate-v1.md`
