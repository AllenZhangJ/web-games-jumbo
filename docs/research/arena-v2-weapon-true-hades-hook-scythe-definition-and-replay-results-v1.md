# Arena V2 真·哈迪斯钩镰 Definition 与承诺/支撑面 Replay 原型结果 V1

## 状态与边界

- 状态：研究工具链 Definition、数值投影和 Replay 原型通过
- 日期：2026-07-28
- 生产影响：不注册默认生产装备，不改变正式玩家界面、存档或生产平衡
- 数值性质：`definition-projected-hypothesis`，是本项目可测试的调优假设，不是热血英豪原作数值

本轮的目标不是复制真·哈迪斯钩镰的完整招式表，而是提取三个对 Arena 有价值、且能被规则验证的关系：

1. 地面强招存在看得见的承诺、提前释放会取消；
2. 地面与空中是不同的攻击上下文，距离、覆盖、高度关系和收招不能共用一套数字；
3. 命中结果必须经过真实支撑面判定，命中保留支撑面和命中后击落要有不同反馈。

## 最小研究 Definition

| 上下文 | Targeting | 动作阶段 | 主要差异 | 状态 |
| --- | --- | --- | --- | --- |
| 地面 | `facing-cone`，有效距离 2.80 格，最大高度差 1.30 格 | 出手 16 / 有效 3 / 收招 28 tick | 横向击飞 2.20 格、垂直冲量 5.20、自身位移冲量 1.10；8 tick 提交、14 tick 到期取消、不可转向 | 研究 Definition 已接入 |
| 空中 | `downward-cylinder`，有效距离 2.60 格，半径 1.10 格，最大高度差 2.50 格 | 出手 10 / 有效 4 / 收招 30 tick | 横向击飞 1.70 格、垂直冲量 6.10、自身位移冲量 0.50；开始下砸，不复用地面承诺状态 | 研究 Definition 已接入 |

### 玩家概览必须显示的数值

下表是从权威 Action Definition 投影的当前假设，单位为本项目研究单位。方向语义沿用公共数值合同：出手/收招/再次使用时间越低越快，横向击飞/垂直控制越高越强，自身位移风险越高风险越大。

| 公共轴 | 地面 | 空中 |
| --- | ---: | ---: |
| 有效距离 | 2.80 格 | 2.60 格 |
| 覆盖宽度 | 4.56 格 | 2.20 格 |
| 出手时间 | 16 tick | 10 tick |
| 收招时间 | 28 tick | 30 tick |
| 横向击飞 | 2.20 格 | 1.70 格 |
| 垂直控制 | 5.20 冲量 | 6.10 冲量 |
| 控制时间 | 20 tick | 18 tick |
| 自身位移风险 | 1.10 冲量 | 0.50 冲量 |
| 再次使用时间 | 84 tick | 84 tick |
| 命中高度差 | 1.30 格 | 2.50 格 |
| 有效攻击窗口 | 3 tick | 4 tick |
| 方向容错 | 109.10° | 45.86° |

这些数值的作用是让玩家知道“地面强招更宽、更有横向换位风险，空中动作更快、更强调高度和垂直结果”，不是把武器压缩成“近战/高伤害”标签。它们仍需多地图和真人测试后才能进入生产数值。

## Replay 固定结果

Replay 使用同一 seed `1414026051`、真实 `MatchCore + ActionExecutionSystem + MatchReplay`，Replay schema V5。普通场景使用宽平台，边缘场景使用半宽 2.5 格的平台；目标不是保证每次都击落，而是验证命中、位移、支撑面和正式淘汰的因果顺序。

| 场景 | 承诺结算 | 首次命中 | 支撑面结果 | 反馈 | 最终 hash |
| --- | ---: | ---: | --- | --- | --- |
| 提前释放 | tick 5 取消 | 无 | 保留 | 承诺取消 | `447d79db` |
| 提交释放 | tick 9 提交 | tick 17 | 保留 | 命中·仍保留支撑面 | `8fd50d33` |
| 到期持续按住 | tick 15 取消 | 无 | 保留 | 承诺取消 | `e2ae342a` |
| 平台边缘提交 | tick 9 提交 | tick 17 | tick 74 击落 | 命中·支撑面丢失 | `81f584db` |

所有场景均完成 Replay 重放后的最终 hash 校验，并保留动作阶段、承诺状态、蓄力 tick、蓄力等级和目标位置采样。边缘场景的目标水平位移为 1.95 格；该数字只描述本次固定场景，不代表武器的通用击落率。

## 研究结论

1. “提前松手没有自动补偿”可以作为武器学习点：玩家必须读懂承诺节点，而不是只按住按钮等待自动派生。
2. 地面和空中动作需要分开做卡片比较；地面覆盖/横向结果更突出，空中出手/垂直结果更突出。
3. 命中确认和击落反馈必须拆开：同一动作在宽平台上是 `hit-safe`，在边缘平台上才是 `hit-ring-out`。
4. 支撑面后果已经由 MatchCore/Replay 验证，但原作触地反弹、多阶段追击、无敌、反击和固定伤害没有迁移。

## 未完成边界

- 当前没有把真实 KZ 路线表面接入该武器的正式候选地图，只使用固定研究平台验证因果链。
- 空中 `downward-cylinder` 已定义并投影，但本轮 Replay 尚未覆盖真实空中命中与高度分支。
- 反馈 Cue、设备触控表现、真人首次理解时间和多地图公平性尚未验证。
- 因此该候选仍不能进入默认生产 Registry，也不能宣称已经满足 200 小时留存目标。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-true-hades-hook-scythe-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-true-hades-hook-scythe-replay-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-true-hades-hook-scythe-definition-prototype.test.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-true-hades-hook-scythe-replay-prototype.test.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-case-study-overview-prototype.test.ts`
