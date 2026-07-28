# Arena V2 KZ 2–4 人竞速流程研究结果 V1

## 1. 状态与范围

- 状态：本地竞速流程合同已通过确定性运行；仍属研究工具链
- 日期：2026-07-28
- 原型：`packages/arena-v1-experiment/src/arena-v2-kz-race-multiplayer-prototype.ts`
- 共享路线输入：`createArenaV2JumpRouteInputForTick()`
- 测试：`packages/arena-v1-experiment/test/arena-v2-kz-race-multiplayer-prototype.test.ts`
- 决策：[ADR-104：KZ 竞速先以本地 2–4 人流程合同验证](../decisions/104-arena-v2-kz-race-multiplayer-contract.md)

本轮把“竞速”从静态地图规则推进到一个可运行的本地流程：60 tick 倒计时 → running → 终点判定 → winner 记录；另设攻击观察场景，检查击落后的 180 tick 原处安全快照重生。终点产生后的延长运行只用于观察已经发生的重生，不代表生产比赛会在 winner 后继续。

## 2. 研究链路

```text
KZ 六段路线 + 共享路线输入
        ↓
2 / 3 / 4 名参与者倒计时
        ↓
MovementSystem + RuleEngine + PhysicsWorld
        ↓
终点 / winner / 攻击命中 / 掉落
        ↓
180 tick 原处安全快照重生
```

探针矩阵为 2 个场景（`finish`、`hit-reentry`）× 3 种参与者数量，共 6 个确定性探针。

## 3. 结果

| 场景 | 人数 | winner | 终点 tick | 攻击结果 | 重生结果 |
|---|---:|---|---:|---|---|
| `finish` | 2 | `kz-race-player-1` | 370 | 无攻击 | 2/2 到达终点 |
| `finish` | 3 | `kz-race-player-3` | 372 | 无攻击 | 3/3 到达终点 |
| `finish` | 4 | `kz-race-player-3` | 370 | 无攻击 | 4/4 到达终点 |
| `hit-reentry` | 2 | `kz-race-player-1` | 357 | tick 320 尝试，未命中 | 无掉落 |
| `hit-reentry` | 3 | `kz-race-player-1` | 378 | tick 336 命中 `player-3` | tick 401 掉落，581 重生 |
| `hit-reentry` | 4 | `kz-race-player-3` | 359 | tick 334 命中 2 个目标 | 本轮未形成掉落 |

3 人场景的重生证据：`respawnTick - fallTick = 180`，重生支撑面为 `surface-05-narrow`，水平位置误差为 `0`。这表示原型确实回到了该玩家最近一次安全支撑位置，而不是随机起点或预设全局起点。

## 4. 关键发现

### 4.1 2–4 人终点与顺序能够由同一流程记录

无攻击场景的 2、3、4 人均完成路线并产生唯一 winner。3 人和 4 人的 winner 不固定为玩家 1，说明起始站位、角色碰撞和路线推进会改变到达顺序，而不是简单按 participant ID 排名。

### 4.2 武器后果必须允许“命中但不掉落”

攻击场景没有被强制改写为统一击落：

- 2 人：攻击窗口成立但没有命中；
- 3 人：命中、掉落、180 tick 重生完整出现；
- 4 人：同一动作命中两个目标，但本轮没有形成掉落。

这说明竞速中的武器差异不能只显示“命中/淘汰”，还需要区分多目标命中、支撑面保留和真正失去支撑面。

### 4.3 “原处重生”需要保存最近安全状态

原型没有把角色简单放回全局起点，而是每 tick 记录该角色最近一次有支撑面的坐标和 surface ID；掉落后等待 180 tick，再恢复到这个安全快照。这样可以把用户确认的“原处重生”转成可测试的 `respawnPositionError=0` 合同。

## 5. 已验证与未验证

已验证：

- 2–4 人倒计时、路线推进、终点和 winner 的本地流程；
- 真实 MovementSystem、RuleEngine、Targeting、PhysicsWorld 的同链路运行；
- 真实攻击差异：未命中、多目标命中、掉落和重生；
- 180 tick 重生等待和最近安全位置恢复。

仍未验证：

- 网络权威、延迟、断线重连和客户端预测；
- 真人玩家在 2–4 人拥挤、窄线攻击和重入时的理解与公平感；
- 摄像机、目标身份 Cue、终点 UI 和手机触控体验；
- 生产竞速 MatchMode、正式地图资产和最终地图碰撞调优。

## 6. 下一步

1. 把 winner、掉落和重入事件投影为竞速 HUD/目标身份研究 Cue；
2. 在真实浏览器/设备上验证倒计时、终点顺序、掉落提示和重入定位；
3. 用真人任务测试“谁领先、谁被击中、自己回到哪里”三项判断；
4. 网络实现必须以本地合同为基准，不在同步层重新定义命中、终点或重生。
