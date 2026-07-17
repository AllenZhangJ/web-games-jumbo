# Arena Stage 6 S6.2 Movement 门禁记录

> 本文是 S6.2 提交时的历史证据。S6.3 Bot 移动的当前证据见 [S6.3 门禁记录](arena-stage6-bot-movement-results.md)。

## 范围与结论

- 日期：2026-07-17。
- 对象：S6.2 提交候选；最终证据以包含本文的提交为准。
- 结论：Movement Rule/Core 的 E1/E2 退出门通过；S6.3 Bot 新动作、S6.4 输入、S6.5 灰盒/设备生命周期和 S6.6 盲测均未完成。
- 物理兼容版本：`lightweight-v3`。Match/Input/Replay 继续使用 V4；旧内容 hash 或旧物理版本显式拒绝。

## 已验证能力

- CharacterDefinition 驱动连续的走/跑摇杆投影，斜向输入归一；硬直、淘汰和重生抑制普通移动。
- MovementRuntime 独占 coyote、jump buffer、空中跳预算、蹲跳蓄力和下砸模式；Physics 独占位置、速度、接地与支撑面。
- Replay 只保存真实语义输入；未能立即执行的跳跃按下沿由 Movement 保留，并在落地后的首个合法 tick 重新交给同一 Resolver，消费后立即清零。
- 普通跳、coyote 最后合法 tick、buffer 落地消费/过期、二段跳一次预算、蹲跳上下限/取消、空中下砸与一次落地 transition 均有测试。
- ActionDefinition V2 使用 `primary/jump/slam` 通道、`combat/locomotion/interaction` lane 与 conflict tags；同一 primary 至多选择一个动作，显式 primary+jump 可在不同 lane 并行。
- 基础攻击可用性复用真实 Targeting 查询；无合法目标时 primary 才回退为上下文跳。
- ActionAffordance 使用同一 Resolver 与 next-tick ActionExecution constraints；冷却或占用时保留动作身份与稳定原因，但不进入权威 hash。
- Movement 命令批次与 Physics mutation batch 均先全量验证、后单次提交；port 抛错、异步返回或重入后 fail closed。
- Movement 内部热路径复用已验证 Definition，但外部 Serializer 仍执行完整敌意数据校验；1,000 局门禁没有缓存串局或非有限状态。

## E1 与构建门禁

最终提交前执行：

```bash
npm test
npm run arena:poc:build
npm run build
git diff --check
```

全量测试覆盖架构依赖、Action/Movement/Physics 合同、MatchCore 编排、App/Session 生命周期、回放与旧数值跳台回归。三端构建只证明可打包，不替代开发者工具或真机证据。

## Movement 专项压力

命令：

```bash
npm run arena:movement:stress
```

结果：

- 100/100 局结束，99,732 tick，100 个唯一最终 hash。
- 3 份完整回放复验一致；3 个长局推进到地图塌陷。
- 走输入 79,360 帧，跑输入 118,517 帧。
- 显式地面跳 824、显式二段跳 1,420、蹲跳开始 820、蹲跳释放 818、上下文地面跳 786、上下文空中跳 264、下砸开始 892、权威下砸落地 887。
- 12 次 surface 塌陷，没有 NaN、预算越界、失效支撑面、卡死或回放分叉。

## MatchCore 与地图回归

`npm run arena:stress`：

- 1,000/1,000 局结束，921,560 tick，5 份回放一致，1,000 个唯一最终 hash。
- 0 非有限状态；平均 0.236146ms/tick，预算 0.25ms。
- GC 后堆增长 4,161,232B，预算 33,554,432B。

`npm run arena:map:stress`：

- 100 局，720,100 tick，3 份完整地图回放一致，100 个唯一最终 hash。
- 1,300 次预警、1,300 次启动、600 次结束、800 次 surface 塌陷和 400 次装备波，数量与时间轴精确一致。

## Bot 回归边界（历史）

本节保留 S6.2 候选时的历史回归边界。S6.3 已让 Bot 使用 jump/slam，新证据见 [S6.3 Bot 移动与公平性门禁记录](arena-stage6-bot-movement-results.md)。

900 局原始确定性样本全部完成，每档 300 个唯一 hash、3 份回放一致。接入移动后，hard 以更少命中更快完成淘汰；旧“命中 + 2×淘汰”指标错误奖励 hit farming，虽 hard 得分率、淘汰和生命压力均更高仍会判倒序。门禁因此改为只组合发行目标：`4×淘汰 + 4×得分率 + 2×净生命压力`；命中率保留为诊断数据，不再增加能力分。

最终公式用相同 900 局原始数据重算约为 `8.56 < 14.02 < 15.57`；另用每档 30 局、共 90 局和 9 份回放执行完整脚本，得到 `8.47 < 15.00 < 16.33`，生命压力与得分率也保持递增。此处不冻结 Stage 9 发行胜率。

## 未证明事项

- Bot 尚不会主动跳跃、二段跳或下砸，也尚未读取新的公开 MovementSnapshot/ActionAffordance。
- 没有 RawControlState、Gesture、InputSampler、Mapper A/B、多点触控或前后台 fuzz 证据。
- 没有 Arena Renderer/HUD/Session、多局 GPU 资源、开发者工具、真机或截图证据。
- 没有新手 10 秒上手与 A/B 盲测结论；不得据此批量生产正式动作资产。
