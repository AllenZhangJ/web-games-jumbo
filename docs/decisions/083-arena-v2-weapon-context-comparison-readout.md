# ADR-083：武器概览必须横向展示地面与空中场景数值

- 状态：已接受，已接入 Product UI 与 Canvas 紧凑展示
- 日期：2026-07-28
- 范围：武器概览中的主数值、行为数值、地面/空中上下文比较，不改变 MatchCore 权威规则

## 背景

本项目把武器作为主要长期学习内容。只展示武器名称、核心动词和一组主数值，玩家仍然无法直接回答“这把武器在地面和空中分别有什么不同”“同一个动作在不同武器之间谁更远、谁更宽”。这会让地面/空中动作差异停留在研究文档或单卡描述里，不能支持玩家做第一轮选择。

此前已经有三层信息：九项主数值、两项行为数值，以及每张卡片内的地面/空中上下文数值。本次把第三层也投影为横向比较行，同时保持首屏先读主数值的顺序。

## 决策

1. `ProductUiSceneModel` 增加只读的 `weaponContextComparison`，以第一把武器的上下文顺序为基准，为每个 `ground/aerial` 上下文生成横向比较行。
2. 上下文比较复用主比较的字段一致性校验：武器必须拥有相同的上下文 ID、标签、统计项 ID、单位、方向语义和比较尺度；不一致时在场景模型构建阶段失败，不让 UI 静默比较错误数据。
3. 网页概览按以下顺序展示：主数值、行为数值、场景数值。场景行使用“场景·地面·”或“场景·空中·”前缀，并保留精确值、单位、方向箭头和无障碍解释。
4. Canvas 受小屏空间限制，只在横向比较区显示场景的有效距离和覆盖宽度；武器卡继续显示完整的地面/空中上下文数值。Canvas 不生成第二套数值，也不参与规则判定。
5. 所有比较值仍来自权威 Definition → 内容投影 → ViewModel → 场景模型链路。场景比较不新增平衡字段、不写入存档、不改变匹配或 Replay 合同。

## 被考虑的替代方案

### 只在武器卡中显示地面/空中数值

- 放弃原因：玩家需要逐卡记忆，不能在同一张表内判断武器之间的场景差异；这与“先比较、再理解”的概览顺序冲突。

### 把地面/空中数值合并成一组平均值

- 放弃原因：平均值会隐藏武器在空中或地面上的真正优势，无法支持地图和高度选择，也会误导平衡讨论。

### 为 UI 另写一套场景平衡值

- 放弃原因：会产生 Definition 与展示层分叉，玩家看到的数值可能无法回溯到权威规则，违反 Rule → Core → Presentation 边界。

## 后果

正面影响：

- 玩家可以在一个概览中横向比较主动作、行为门槛和地面/空中差异；
- 研究武器的上下文结论获得真实产品读出，不再只存在于研究工具链；
- Context ID、标签和统计轴不一致会尽早暴露，降低新增武器漏字段的风险；
- 网页保留完整可读数据，Canvas 以小屏可承受的高信号字段收敛信息密度。

限制：

- 场景数值仍然只是比较轴，不等于胜率；距离、高度、移动目标和地图支撑面共同决定真实命中结果；
- 当前页面验证证明字段可见、可比较、可操作，但还不证明真人能在十秒内正确解释所有场景差异；
- 新增武器若要进入默认生产目录，仍须通过 Definition、Replay、地图后果、反馈表现和真人/设备门禁，不能因为概览可显示就直接生产化。

## 验证证据

- 场景模型：`packages/arena-product-presentation/src/product-ui-scene-model.ts`
- 网页展示：`src/entry/web-product-ui-surface.ts`、`src/product-styles.css`
- Canvas 展示：`packages/arena-product-presentation/src/product-canvas-painter.ts`
- 自动化：`tests/entry-web-product-ui-surface.test.ts`、`packages/arena-product-presentation/test/product-presentation-boundaries.test.ts`
- 真人页面：本地 Product UI 页面可读到主数值、场景数值和武器卡的完整上下文；点击“开始匹配”后进入对局画布；控制台无 error/warn。
- 相关边界：[ADR-045：武器上下文概览契约](045-arena-v2-weapon-context-overview.md)、[ADR-055：武器上下文必须完整显示关键数值](055-arena-v2-weapon-context-readout-completeness.md)、[ADR-061：武器概览补充有效窗口与方向容错](061-arena-v2-weapon-overview-behavior-readout.md)。
