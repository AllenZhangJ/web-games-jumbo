# ADR-053：武器概览明确数值方向语义

- 状态：已接受，适用于当前主页武器概览与 V2 研究展示边界
- 日期：2026-07-27
- 范围：`ProductContentPresentationDefinition.overview` 的表现投影、Web DOM 和 Canvas 展示

## 背景

Arena 的武器差异来自距离、时间窗口、击飞、位置风险和再次使用成本。当前概览已经显示真实数值，但原来的方向提示主要是 `↑`、`↓` 和 `⚠`。这对“前摇/收招越低越有利”和“自身位移越高风险”不够明确，尤其在窄屏、只看到单张武器卡或使用辅助技术时，玩家可能把原始数值大小误读成收益大小。

另一个风险是比较表允许每张武器卡自行声明字段方向和最大尺度。如果同一个字段在不同武器间方向或尺度不一致，横向比较就会失去意义，即使类型检查和渲染仍然通过。

## 决策

保留权威内容中的原始 `value`、`maxValue` 和 `direction`，在展示投影层统一派生方向解释：

- `higher-is-better` 显示“越高越有利”；
- `lower-is-better` 显示“越低越有利”；
- `higher-is-risk` 显示“越高风险越大”；
- 比较矩阵显示完整文字图例，单元格和卡片数值提供相同的可访问解释；
- 卡片条形图对 `lower-is-better` 显示归一化后的“有利度”，数值文本仍显示原始值；
- `higher-is-risk` 使用风险色，不把风险视觉上伪装成攻击收益；
- 同一比较字段必须在所有武器间使用相同 `direction` 和 `maxValue`，否则 `ProductUiSceneModel` 拒绝生成比较结果；
- 不在 UI 手写武器数值，方向解释仍由权威内容投影而来；不增加新按键、页面或局外系统。

## 被考虑的替代方案

### 只保留箭头

- 优点：占用空间小；
- 放弃原因：无法让新玩家立即知道箭头代表收益、成本还是风险，且辅助技术无法可靠表达视觉含义。

### 只把所有条形图画成原始值长度

- 优点：实现简单；
- 放弃原因：收招时间等“越低越好”的字段会出现视觉方向反转，玩家看到更长的条却可能得到更差的结果。

### 让每把武器拥有自己的比较尺度

- 优点：可以为不同武器单独调整视觉占比；
- 放弃原因：横向表格无法再说明“谁更远、谁更快”，会把比较退化成三组互不相干的评分。

## 后果

正面影响：

- 玩家可以同时看到原始值和其正确的收益/风险方向；
- Web DOM 与 Canvas 共享同一比较模型，不会出现一端把风险画成优势、另一端显示相反含义；
- 新增武器时，方向和尺度漂移会在表现模型生成阶段暴露，而不是上线后才发现。

限制：

- 方向语义只解决“数值怎么读”，不证明玩家已经理解命中后果；仍需真人解释率和真机字号/横向布局验证；
- 条形图是归一化提示，不替代真实距离、时间和冲量文本；
- 当前只覆盖主页已接入的 3 把武器，V2 全量武器池仍需继续扩展同一数据合同。

## 验证证据

- 内容来源：[Arena V2 热血英豪武器研究 V1](../research/arena-v2-hot-blooded-weapon-study-v1.md#24-公开数值契约-v2)
- 实现：`packages/arena-product-presentation/src/product-ui-scene-model.ts`、`src/entry/web-product-ui-surface.ts`、`packages/arena-product-presentation/src/product-canvas-painter.ts`
- 测试：`tests/entry-web-product-ui-surface.test.ts`、`packages/arena-product-presentation/test/product-presentation-boundaries.test.ts`
