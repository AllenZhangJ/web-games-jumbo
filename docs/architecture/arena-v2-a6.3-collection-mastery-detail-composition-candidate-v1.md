# Arena V2 A6.3 收藏与熟练详情组合候选 V1

> 状态：`production-unreachable / code-written-not-run`
> 日期：2026-08-11
> 硬门：`false`
> 默认 Surface：`false`
> 新增页面：`0`
> 新增主动作：`0`

## 1. 目标与非目标

A6.3只为既有 `weapon-detail`、`map-detail` 页面组合收藏与熟练详情：

- 武器详情显示已收藏/未收藏、0..5情境总进度及五个具名情境的只读状态；
- 地图详情显示已收藏/未收藏、0..N段总进度及所选P5地图目录每一段的只读状态；
- 页面最多映射一个上游唯一 `nextGoal` 标记；
- 复用既有详情内容、详情页面、选择动作与导航，不新增页面或主动作。

本组件不读取Profile仓储，不选择目标，不写Profile，不计算奖励，不读取或修改规则，也不生成内容ID、地图段落或熟练结果。商店、货币、红点、任务列表和嵌套卡片不在范围内。

## 2. 技能与强制参考

本阶段完整使用 `threejs-game-ui-designer`。技能影响包括：详情页保持游戏化信息层级而非Dashboard；摘要只承载收藏、熟练进度、唯一目标三类事实；数字槽稳定；390×844应用safe area与48 CSS px操作目标；长中英文保留完整辅助文本；颜色必须配合文字、形状和纹理；低动效、静音与装饰缺失不丢失因果。

已读取并登记：

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
- `packages/arena-product-presentation/src/arena-v2-information-content-read-projection-v1.ts`
- `packages/arena-product-presentation/src/arena-v2-information-selection-render-plan-candidate-v1.ts`
- `packages/arena-product-presentation/src/arena-v2-information-screen-registry-v1.ts`
- `packages/arena-product-progression/src/arena-v2-learning-information-projection-v1.ts`
- `packages/arena-product-progression/src/arena-v2-next-learning-goal-v1.ts`
- `packages/arena-product-content/src/arena-v2-learning-profile-definition-candidate-v1.ts`
- `packages/arena-product-presentation-three/src/arena-v2-collection-progress-component-set-candidate-v1.ts`

## 3. 粗颗粒组合与所有权

A6.3不复制A6.2的20武器、2地图、20段解析器，也不建立本地生产ID白名单：

```text
A6.2 collectionProgressInput
        ↓ 由既有A6.2组件完整验证
动态P5 collectionContent + Profile身份/汇总 + 唯一nextGoal
        ↓
当前selection + P5 detail fields/hash + P6 detailProgressFacts
        ↓ 只做所选详情的身份/计数/顺序对账
A6.3 renderer-neutral详情组件快照
```

上游P6 Profile owner可直接投影以下纯数据结构；A6.3只消费结构，不新增对Progression包或Profile仓储的依赖：

- weapon：`schemaVersion/ownerId/kind/profileRevision/weaponDefinitionId/useCount/contexts[5]`；
- map：`schemaVersion/ownerId/kind/profileRevision/mapDefinitionId/segments[]`，segment顺序必须与所选P5 map目录一致。

A6.2的 `completedContextCount` 和 `completedSegmentCount` 只作为汇总对账，绝不用于猜测具体完成了哪些情境或段落。明细完成集合只能来自P6 owner投影。

## 4. P5详情内容与动作保真

P5内容Envelope固定：

- `weapon-detail` 精确保留 `range-coverage / timing-risk / ground-aerial / counter-inputs / map-consequences`；
- `map-detail` 精确保留 `route-goal / hazard-summary / full-route / weapon-consequences`；
- `ownerId=p5-content`，目标必须等于当前selection，并绑定A6.2所用 `sourceContentHash`；
- Envelope自身重新计算确定性 `contentHash`，伪hash或字段顺序漂移失败关闭。

既有选择动作继续使用 `use-selected-weapon-next-match` 或 `use-selected-map-next-match`，原 `labelMessageId`、解析后的 `labelText`、辅助文本和目标原样输出。A6.3只在Profile非ready时临时禁用动作，不改写标签和目标，也不增加第二动作。

## 5. 明细对账与唯一目标

### 5.1 武器

- 五情境顺序固定为P6合同的 ground、aerial、edge、duel-counterplay、survival；
- 每条只读取 `evidenceCount` 与 `completedAtRevision`；
- `completedAtRevision != null` 才显示完成，证据大于0但未完成显示积累中，否则未开始；
- 完成条数必须等于A6.2所选武器 `completedContextCount`；
- 未收藏武器允许携带0..119次主研究与已证明的情境证据；达到120却未收藏仍失败关闭。

### 5.2 地图

- segment ID、顺序、名称全部来自所选动态P5 map目录；
- P6明细必须逐段、逐索引一一对应，不能少段、换段或重排；
- 完成条数必须等于A6.2所选地图 `completedSegmentCount`；
- 未收藏地图允许携带Race未冲线前已由权威锚点、有效落点或命中证明的段落证据；整图收藏与路线理解保持并行。

### 5.3 目标标记

- `weapon-context` 只标对应情境；`map-segment` 只标对应段落；
- collect或非细分收藏目标只在详情摘要标一次；
- mode优先的交叉目标及其他非当前详情目标不在收藏详情抢标；
- 摘要与行项目合计最多一个目标标记，组件不重新排序或挑选目标。

## 6. 正常浏览与失败关闭

- 同tick只接受完全相同事实；切换目标、动作状态或任何字段均拒绝。
- higher tick允许同一11页导航epoch内从详情A切到详情B，再返回A；切换在完整验证和投影后原子提交。
- `collectionContent source/hash` 在整个epoch固定。
- P5详情hash按 `kind|targetDefinitionId` 存入最多22项的有界Map；新selection可登记新hash，返回旧selection必须命中原hash，同目标hash漂移拒绝。
- 动作enabled/disabledReason是可变UI状态，不属于内容身份；higher tick可变化，但intent、label和target每次重新验证。
- 相同Profile revision下，完整A6.2汇总事实不得改变；detail明细只在相同selection下比较，跨selection明细不同合法。
- 相同revision、相同selection即使完成总数不变，只要明细身份或完成集合漂移也拒绝。
- tick回退、Profile身份/revision回退、future field、getter/setter、thenable、伪hash、内容/进度错配均在内部状态提交前失败关闭。
- reset使用新epoch并清空水位与两张有界表；destroy幂等清零，销毁后拒绝读取和消费。

## 7. 状态、布局与无障碍

loading、empty、error、future-profile状态继续显示合法P5只读内容，但不显示陈旧收藏摘要、明细或目标，且临时禁用既有选择动作。

| 项目 | 390×844 | 1440×900 |
|---|---:|---:|
| safe-area内边距 | 16px | 32px |
| 摘要最小高度 | 88px | 96px |
| 明细列数 | 1 | 2 |
| 明细最小高度 | 56px | 60px |
| 既有动作目标 | ≥48px | ≥48px |
| 名称 | 最多2行后省略，保留辅助全文 | 最多1行后省略，保留辅助全文 |

- 数字槽固定5字符，进度变化不移动布局；
- 状态使用文字＋圆环形状＋点阵/斜纹/实条纹，目标另有缺口框与目标文字；
- reduced-motion关闭过渡，仅保留静态状态改变；
- muted不影响任何状态、目标或动作理解；
- 装饰缺失回退到文字/形状/纹理，不声称程序化素材已批准；
- 横向溢出禁止，内容可纵向滚动。

上述均为静态合同；截图、文本适配、浏览器与设备结果为 `not-run`。

## 8. 已编写但未运行的测试代码

测试代码覆盖：

- weapon-detail五情境、map-detail逐段闭合与P5字段保真；
- summary/detail计数不一致、同总数明细身份或完成集合漂移；
- 同epoch A→B→A、同目标hash漂移、higher tick动作状态改变、same tick切换；
- 唯一目标细分/摘要标记与全页最多1项；
- loading/empty/error/future-profile；
- future field、getter、thenable、伪hash、字段顺序、source revision、tick、Profile revision、epoch；
- 双布局、长中英文、静音、低动效、装饰失败；
- 快照冻结、reset、destroy。

按用户要求没有运行test、typecheck、lint、build、diff、截图、浏览器、设备、性能或真人验证，不得把测试代码写成通过证据。

## 9. 七维静态自检

| 维度 | 静态结论 | 顺延证据 |
|---|---|---|
| 信息层级 | 摘要最多3事实，明细为单层列表，无Dashboard/嵌套卡片 | 截图与真人扫读 |
| 上游所有权 | 复用A6.2验证输出；P6明细独立输入；无生产ID副本 | P6 projector正式接线 |
| 明细正确性 | 不从总数猜集合；身份、顺序、完成数逐项闭合 | 测试执行 |
| 主流程导航 | higher tick支持A→B→A；动作标签/目标保真 | 11页Host交互 |
| 确定性/恶意边界 | 同tick、hash、revision、selection级明细和快照完整性失败关闭 | 类型检查与运行反证 |
| 响应式/无障碍 | 双viewport、safe area、48px、长文、非颜色编码、静音/低动效合同 | Web/真机/辅助技术 |
| 生命周期/治理 | 两张最多22项Map、reset/destroy清零、默认Surface断开 | 长稳、资源与设备证据 |

## 10. 红门与回滚

仍关闭：默认Surface、正式Host接线、类型检查、测试、截图、浏览器、真机、真人、性能、A6总门、正式资产与Final。

最小回滚为整文件删除以下三个未接线候选，不影响既有11页、Profile、P5/A6.2或默认入口：

- `packages/arena-product-presentation-three/src/arena-v2-collection-mastery-detail-composition-candidate-v1.ts`
- `packages/arena-product-presentation-three/test/arena-v2-collection-mastery-detail-composition-candidate-v1.test.ts`
- `docs/architecture/arena-v2-a6.3-collection-mastery-detail-composition-candidate-v1.md`
