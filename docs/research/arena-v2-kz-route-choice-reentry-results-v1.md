# Arena V2 KZ 分叉路线与复活重入观察原型结果 V1

## 状态

- 状态：研究路线合同与 MapDefinition 适配层已接入，分叉观察/重入标签原型通过；分叉物理几何、摄像机、多人争抢、真机和真人路线理解仍未验证
- 日期：2026-07-28
- 范围：`segment-04-maze` 迷宫段、`segment-06-wire` 走钢丝段，以及两段共用的 3 秒复活重入观察合同
- 生产影响：只存在于 `arena-v1-experiment` 研究工具链，不进入默认 MapRegistry，不改变竞速/生存生产入口

## 1. 关闭的结构缺口

此前 `survivalLoopRole: choice` 只说明某段“应该有选择”，但没有声明：

- 玩家在什么时候看到分叉；
- 不同分叉的速度与战斗暴露差异；
- 掉落后回到哪一个段落和锚点；
- 复活后是否还能看到同一组路线词汇。

本轮把这些字段收敛到 `ArenaV2JumpRouteSegment.branchOptions`，并由 `runArenaV2KzRouteChoiceReentryPrototype()` 生成确定性观察结果。分叉的 `waypoints` 目前只是研究路线点，不等于已经批准的静态 surface。

## 2. 分叉合同

| 段落 | 分叉 | 角色 | 预计路线 | 暴露窗口 | 重入锚点 |
| --- | --- | --- | ---: | ---: | --- |
| 迷宫 | 低位直行 | 快但暴露 | 48 tick | 12 tick | `anchor-stairs-end` |
| 迷宫 | 高位恢复线 | 慢但安全 | 68 tick | 5 tick | `anchor-stairs-end` |
| 走钢丝 | 中线稳定 | 慢但安全 | 56 tick | 4 tick | `anchor-narrow-end` |
| 走钢丝 | 边线抢时 | 快但暴露 | 44 tick | 8 tick | `anchor-narrow-end` |

这里的“快/安全”不是综合评分：路线长度和战斗暴露分别公开，玩家可以理解为“更快但更容易被武器打断”或“慢一些但更适合恢复”。两段都仍只使用 `direction + jump`，没有新增分叉按键。

## 3. 复活重入观察结果

固定观察 tick 为 120，选择在 tick 121 发生；失败后严格等待 `3 × 60 = 180 tick`，再经过 2 tick 的落地稳定窗口。四组分叉场景均满足：

| 场景 | 失败 tick | 复活 tick | 重入 tick | 重入段落 | 结果 |
| --- | ---: | ---: | ---: | --- | --- |
| 迷宫 / 低位直行 | 169 | 349 | 351 | 迷宫 | 可读重入 |
| 迷宫 / 高位恢复线 | 189 | 369 | 371 | 迷宫 | 可读重入 |
| 走钢丝 / 中线稳定 | 177 | 357 | 359 | 走钢丝 | 可读重入 |
| 走钢丝 / 边线抢时 | 165 | 345 | 347 | 走钢丝 | 可读重入 |

重入标签同时包含段落类型、上次分叉名称和恢复锚点，例如：`maze · 低位直行 · 重入 anchor-stairs-end`。复活后再次展示同一组分叉选项，避免玩家只知道“回来了”，却不知道应该重新选择哪条路线。

## 4. 边界与下一步

本原型只关闭了“路线合同能否表达分叉代价和复活后的观察语言”，没有关闭以下问题：

1. `waypoints` 是否能被实际 surface、跳跃距离和碰撞规则完整实现；
2. 分叉入口是否能在手机镜头中同时看清；
3. 攻击者移动、多人抢线和武器击落是否会让安全线变成无意义标签；
4. 真人是否能在 5 秒内说出“为什么选这条线”；
5. 生存模式增加敌人后，分叉是否产生真实绕行而不是把玩家逼到同一安全点。

因此当前不能把四条分叉宣布为生产地图设计，也不能用 `routeTicks` 替代真实物理测量。下一步应把迷宫两条路线做成最小独立灰盒 surface，再接入同一套武器地图后果和摄像机观察测试。

## 5. 验证入口

- `packages/arena-v1-experiment/src/arena-v2-jump-route-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-kz-map-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-kz-route-choice-return-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-kz-route-choice-reentry-prototype.test.ts`
- 针对性验证：4 个测试文件、10 个测试通过；结果保持确定性和深冻结
