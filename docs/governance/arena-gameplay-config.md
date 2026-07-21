# Arena Gameplay V2 数值配置真值

Arena 移动、跳跃、拾取和全部地面/空中攻击数值的唯一可执行真值是 strict TypeScript 导出 `ARENA_GAMEPLAY_V2_TUNING`：

- 定义：`packages/arena-definitions/src/arena-gameplay-v2-tuning.ts`
- 公共入口：`@number-strategy-jump/arena-definitions`
- 原样查看：`npm run arena:config:print`

输出包含稳定 `hash` 和完整 `config`。文档不手工复制第二套数值表，避免“文档值、展示值、权威值”发生漂移；任何平衡修改必须直接修改该 Definition，并同时通过 Definition 校验、配置消费测试和黄金 Replay 门禁。

## 直接对应关系

| 需求概念 | 唯一代码路径 |
| --- | --- |
| 角色步行/跑动速度 | `character.movement.walkSpeed` / `runSpeed` |
| 角色加速度/最高水平速度 | `character.movement.groundAcceleration` / `airAcceleration` / `maximumHorizontalSpeed` |
| 起跳高度 | `character.jump.targetGroundHeight` |
| 蓄力跳高度 | `character.jump.targetChargedHeight` |
| 二段跳高度/水平冲量 | `character.jump.targetAirHeight` / `airHorizontalImpulse` |
| 空中下攻初速/每 tick 加速度/最高速度 | `character.jump.downAttackStartSpeed` / `downAttackAccelerationPerTick` / `maximumDownAttackSpeed` |
| 自动拾取范围 | `equipment.automaticPickupRadius` |
| 每种武器攻击范围 | `attacks[动作 ID].targeting.range`，圆柱/胶囊另有 `radius` |
| 起手/生效/收手/冷却 | `attacks[动作 ID].timing.windupTicks` / `activeTicks` / `recoveryTicks` / `cooldownTicks` |
| 目标击退距离 | `attacks[动作 ID].knockback.targetGroundDistance` |
| 权威击退冲量 | `attacks[动作 ID].knockback.horizontalImpulse` / `verticalImpulse` |
| 受击僵直 | `attacks[动作 ID].hitstunTicks` |

高度和目标地面击退距离是策划可读输入；`compileJumpImpulseFromHeight` 与 `compileHorizontalImpulseFromDistance` 在组合阶段将其确定性编译为权威冲量。运行时不得另写同义常量。
