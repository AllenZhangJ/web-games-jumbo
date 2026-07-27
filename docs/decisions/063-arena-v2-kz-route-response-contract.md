# ADR-063：KZ 地图段落必须声明回应窗口与恢复关系

- 状态：已接受，已接入开发/测试工具链灰盒路线
- 日期：2026-07-27
- 范围：六段 KZ 风格路线的地图研究合同，不进入生产地图资产

## 背景

KZ 地图的学习难度来自距离、节奏、转向和路线识别的组合；Arena 还必须回答一个额外问题：玩家受到武器压力时，已有的方向和跳跃操作能否产生可理解的回应。仅记录表面宽度和难度档位，会把“可回应的困难”和“不可归因的随机掉落”混在一起。

## 决策

1. 每个路线段落必须声明 `responseOptions`、`responseWindowTicks` 和 `hitRecovery`。
2. `responseOptions` 只能复用 `hold`、`strafe`、`jump`，不因为地图难度增加新的操作按键。
3. `responseWindowTicks` 只用于固定探针和后续真人任务的比较，不能直接等同于最终反应时间、网络延迟或发布平衡。
4. `hitRecovery` 必须说明命中后是留在本段、转移到相邻段还是回到复活锚点；竞速和生存共用段落必须至少拥有一种可理解的回应或恢复路径。
5. 武器交叉验证继续复用同一段落合同、Rule、Movement 和 Physics；不单独创建“战斗地图”副本。

## 后果

正面影响：

- 地图设计可以在做几何之前明确玩家的反答案和失败归因；
- 同一段落的宽度、武器击退和恢复关系可以放进同一个探针结果；
- 生存模式能够利用恢复段和选择段做躲避，不必引入额外机关。

限制：

- 当前窗口仍是固定 tick 对照，不代表真人能看懂或及时输入；
- 当前只有单次静态攻击和固定回应，没有多人拥挤、主动转身或追击；
- 六段路线仍是研究灰盒，不是已经批准的正式地图。

## 验证证据

- 路线合同：`packages/arena-v1-experiment/src/arena-v2-jump-route-prototype.ts`
- 路线测试：`packages/arena-v1-experiment/test/arena-v2-jump-route-prototype.test.ts`
- 武器交叉验证：`packages/arena-v1-experiment/src/arena-v2-kz-route-combat-prototype.ts`
- 研究结果：[CS1.6 KZ 跳跃地图研究 V1](../research/arena-v2-cs16-kz-map-study-v1.md)
