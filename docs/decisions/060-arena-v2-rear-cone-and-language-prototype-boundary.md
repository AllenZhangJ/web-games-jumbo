# ADR-060：绕后使用目标朝向判定，五种语言共用同一规则原型

- 状态：已接受，适用于 V2 战斗语言研究和 Targeting 扩展
- 日期：2026-07-27
- 范围：`rear-cone` Targeting、读招反制/绕后/封路/直线压制/延迟重击研究候选

## 背景

热血英豪式武器的差异不只是攻击范围。背后攻击、读招窗口和蓄力高回报都依赖目标朝向、前摇、有效窗口和地图位置。此前的三种语言原型可以验证直线、封路和延迟击飞，但绕后若只降低正面角度阈值，实际仍然是“宽正面攻击”，没有验证背后关系。

## 决策

1. 在默认 Targeting Registry 中增加通用 `rear-cone`：以目标自身朝向为参照，只有攻击者位于目标背后扇区内才可命中；
2. `rear-cone` 使用整数 tick、目标位置快照和目标朝向，不读取渲染层、墙钟或未来状态；
3. 读招反制用短有效窗口表达“成功读到承诺后的高回报”，绕后用 `rear-cone` 表达方向性位置关系；
4. 五种研究语言统一编译为临时 `ActionDefinition + EquipmentDefinition`，通过现有 Rule/Effect/Targeting/Physics 链路验证，不进入生产武器 ID、存档或玩家收藏；
5. KZ 验证矩阵扩展为 6 段 × 5 种语言 × 3 种固定回应，共 90 个探针；固定回应仍只能证明规则后果，不替代真人输入和设备验证。

## 被考虑的替代方案

### 用低 `minimumFacingDot` 模拟绕后

- 优点：不增加 Targeting 类型；
- 放弃原因：它只扩大攻击者正面扇区，无法区分目标朝向，也无法证明背后位置是武器价值的一部分。

### 为绕后武器在研究脚本里直接改命中结果

- 优点：可以快速展示预期效果；
- 放弃原因：绕过 Rule/Core，无法验证未来正式接入时的确定性和目标快照边界。

### 为五种语言制作五套独立物理

- 优点：每种语言可以快速调出不同手感；
- 放弃原因：会让研究结果无法比较，也会重新复制参考游戏的复杂度。

## 后果

正面影响：

- 绕后从文案概念变成可测试的目标朝向规则；
- 读招反制的前摇与有效窗口、绕后的方向关系都能进入 KZ 后果矩阵；
- 不增加玩家操作按键，武器差异来自时机、方向、位置和地图。

限制：

- 五种语言仍是研究候选，不是正式产品武器；
- `activeTicks` 和 `minimumFacingDot` 已通过“有效窗口”和“方向容错角”进入玩家武器卡的补充展示；封路预警、蓄力延迟等字段仍未进入正式玩家属性，见 [ADR-061：武器概览补充有效窗口与方向容错](061-arena-v2-weapon-overview-behavior-readout.md)；
- 90 个探针使用固定目标朝向和固定回应，不能证明真人已经理解反制。

## 验证证据

- `rear-cone` 实现：`packages/arena-core/src/default-targeting-handlers.ts`
- `rear-cone` 测试：`packages/arena-core/test/action-primitives.test.ts`
- 五种语言原型：`packages/arena-v1-experiment/src/arena-v2-weapon-language-prototype.ts`
- KZ 组合原型：`packages/arena-v1-experiment/src/arena-v2-kz-language-consequence-prototype.ts`
- 公开轴边界：[ADR-059：战斗语言必须通过公开数值轴就绪检查](059-arena-v2-weapon-public-axis-readiness-boundary.md)
