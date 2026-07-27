# ADR-061：武器概览补充有效窗口与方向容错

- 状态：已接受，已接入当前 Product UI，适用于 V2 武器研究展示
- 日期：2026-07-27
- 范围：武器概览卡片的补充行为数值，不改变权威战斗规则

## 背景

主比较矩阵已经展示距离、覆盖、时间、击飞、控制、自身风险和冷却等九项可横向比较的数值。但热血英豪式武器的差异还包括“命中判定持续多久”和“玩家需要多准的朝向”。如果只展示范围和前摇，玩家仍然无法从概览理解读招、绕后或短有效窗口的门槛。

同时，封路预警、蓄力延迟和更复杂的主动状态仍属于研究字段，不能为了让卡片看起来完整而伪装成正式属性。因此需要一个小而明确的补充区，不扩张主比较表，也不引入新的操作或配置来源。

## 决策

1. 每张武器卡在主数值条和地面/空中上下文之间增加可选的补充行为数值区；当前只显示两项：
   - `有效窗口`：由权威 `activeTicks / tickRateHz` 推导，单位为秒，越高越容易在命中窗口内完成判断；
   - `方向容错角`：由当前 Targeting 的 `minimumFacingDot` 或 `radius/range` 推导，单位为度，表示几何方向容许范围，不等于命中率。
2. 两项数值必须从 `ARENA_GAMEPLAY_V2_TUNING` 投影生成，禁止 UI 手写第二套平衡值。
3. 两项数值不进入九项主比较矩阵，但在武器卡和 Canvas 公开数值面板中使用独立的紧凑行为比较行；有效窗口是时间窗口，方向容错角是几何解释，两者与主比较轴的语义和尺度不同。
4. 卡片同时显示方向箭头、单位、文字解释和无障碍标签；旧的自定义 Product ViewModel 没有补充字段时显示空区，不影响兼容性。
5. `delay`、`warning`、`active-frames` 等尚未形成正式玩家语义的研究字段继续留在研究合同中，不因本次展示接入而进入产品配置或收藏存档。

## 被考虑的替代方案

### 把两项行为数值加入九项比较矩阵

- 放弃原因：会把几何解释字段和收益/风险字段混在一张主表里，增加首次阅读成本，也会迫使所有模式和武器先拥有同一套尺度。

### 只显示文案，不显示数值

- 放弃原因：玩家无法比较“窗口更长”和“方向更宽”的实际差异，研究结果也不能回溯到权威调优。

### 直接显示 `minimumFacingDot`

- 放弃原因：点积不是玩家熟悉的单位，数值越高反而代表角度越窄，容易产生方向误读；概览显示角度，研究字段仍保留原始规则值。

## 后果

正面影响：

- 玩家可以在武器概览直接看到出手之外的命中门槛；
- 读招反制和绕后研究具备初步的玩家可读字段；
- 规则、内容定义、ViewModel、场景模型和 DOM 继续沿同一条只读投影链路，未新增 UI 权威状态。

限制：

- 方向容错角是几何容许范围，不代表真实命中率；实际命中仍受距离、高度、目标移动和地图支撑影响；
- 封路预警、蓄力延迟和连续区域效果还不能由这两项字段替代；
- 当前接入证明了字段能被展示和解释，尚未证明真人在十秒内能正确利用它们。

## 验证证据

- 权威投影与内容定义：`packages/arena-v1-presentation-content/src/arena-v1-product-presentation-content.ts`、`packages/arena-product-presentation/src/product-content-presentation-definition.ts`
- ViewModel 与场景模型：`packages/arena-product-presentation/src/product-session-view-model.ts`、`packages/arena-product-presentation/src/product-ui-scene-model.ts`
- Web 展示与测试：`src/entry/web-product-ui-surface.ts`、`tests/entry-web-product-ui-surface.test.ts`
- 具体内容验证：`packages/arena-v1-presentation-content/test/concrete-presentation-content.test.ts`
- 真人可读性边界：[ADR-058：V2 可读性与留存使用独立真人任务合同](058-arena-v2-readability-retention-study-boundary.md)
