# ADR-023：Arena S9.3b 使用隔离 seed 的单变量候选探索

- 状态：已接受并实施；11 条命已通过隔离 validation 并提升为 Product 默认
- 日期：2026-07-18

## 背景

S9.3a 首份 baseline 完成 900 局且没有基础设施失败，但中位时长只有 2,385 tick；62.33% 对局在 2,700 tick 内结束。地图首轮塌陷从 3,600 tick 才开始，因此大部分样本尚未进入完整地图时间轴。Bot 排序、三件装备参与和回放均已通过，说明此时同时修改 Bot、装备、地图和生命数会混淆因果。

直接在原 300 seed 上反复调参会把验证集变成训练集；人工看结果后挑候选也无法复现选择依据。S9.3b 需要先回答“增加生命是否足以让完整地图机制参与”，再决定是否进入装备或地图 Definition 调整。

## 决策

1. 保持已经接受的 2～3 分钟产品目标，不修改 S9.3a 失败报告或原 Policy。
2. 第一轮只改变 `livesPerParticipant`，预注册 9、11、13 三个候选。装备、地图、Bot、benchmark player、时间上限和全部其他 Match config 必须完全相同。
3. 探索使用 Bot seed 序列 index 10,000 开始的 60 个 paired seed；三档共 180 局/候选，三个候选共 540 局。每个候选固定 2 个 replay seed，合计 18 条严格回放。
4. 装备最小计数按 60/300 线性缩放且向上取整；所有时长、占比、Bot 差值和淘汰来源阈值保持不变。
5. 选优只能使用 schema V1 固定罚分：目标时长占比缺口、中位数越界、超短/超时超额、有归属缺口、装备归因越界、环境/自身缺口及装备失败门数量。候选还必须来自 clean source、完成全部 case、通过 Bot/sample/untracked 资格门。
6. 同罚分时依次使用更高目标时长占比、更小目标中点距离和 candidate ID 排序；脚本不得接受 CLI 数值或 seed 覆盖。
7. 三份完整 `ArenaExperimentReportBundle` 与重建得到的 Selection 一起进入 `ArenaBalanceExplorationBundle`。Reader 还必须证明候选矩阵、seed、workload、Collector 参数、除 lives 外的 Match config 和 Authority 内容完全一致。
8. 探索只负责选出下一正式候选。正式候选必须在代码中固定，并使用 index 20,000 开始的另一组 300 paired seed 验证；不得在运行时动态读取探索文件改变规则。

## 被否决方案

### 直接把 2～3 分钟门改成 40～60 秒

这会让标准迁就失败结果，并违背已确认的产品循环。若未来改变产品方向，必须新建 Policy 和 ADR，而不是覆盖本次证据。

### 同时调整生命、击退、地图时间轴与 Bot

参数空间更大，但首轮无法判断改善来自哪个系统，且会把一次探索变成不可解释的网格搜索。单变量无法通过时，再由新候选单独引入 Definition 变化。

### 继续复用 baseline seed

相同 seed 便于比较，但被反复观察后不再是独立验证证据。探索与正式验证必须使用不同 cohort；baseline 继续只承担历史失败证据。

### 人工查看三份报告后选择

人工可以解释结果，但不能改变机器选择。预注册罚分保证未来代码或人员变化后仍能从完整报告重建相同结论。

## 后果

正面：变量归因清晰；探索、选择和正式验证分离；候选矩阵与选择不能被 CLI 或手工改写；失败候选仍保留完整证据。

代价：需要运行 540 局探索和后续 900 局验证；单变量可能无法解决装备/地图结构问题。若正式候选仍失败，后续必须新建 S9.3c Definition，而不是扩大本探索的自由度。

## 首次执行结论

clean source `ac140e2d1a99e22d35f3109ae31089803728b9f3` 上的 60 paired exploration 已完成，共 540 局、18 条严格回放、0 case 失败，外层 Bundle hash 为 `6322f4fa`。

- 9 条命具备资格，但目标时长占比 52.78% 未达到 60% 下限，罚分 `0.12037037037037032`。
- 11 条命具备资格并通过全部平衡门，目标时长占比 87.22%，中位数 7,439 tick，罚分 0，机器选择为 validation 候选。
- 13 条命通过全部平衡门，但 easy/normal 脚本胜率 45.00%/31.67%，超过 score-rate 容差，因 Bot 排序资格门失败而不可选。

探索只证明 11 条命是本轮预注册矩阵中的机器胜者。它必须在 index `[20,000, 20,300)` 的未运行 cohort 上再次通过，才能成为可冻结平衡候选。

## 首次 validation 结论

clean source `594d49ec8ebaa1bd6ba588ad9be70d6546fa04b0` 上的 300 paired validation 已完成，共 900 局、15 条严格回放、0 case 失败，Definition/Result/Bundle hash 为 `81040fb7` / `2ed504b0` / `7581b210`，`freezeEligible=true`。

- 目标时长占比 87.44%，中位数 7,448 tick，超短局 0，超时局 0.89%。
- 有攻击归属淘汰 93.61%，装备归因淘汰 67.19%，无归属环境/自身淘汰 6.39%。
- easy/normal/hard 工程胜率为 48.00%/53.00%/60.67%，三档 capability、life pressure 与 score-rate 排序全部通过。
- 三件装备数量/占比、未知装备事件、300 个 unique final hash、15 条严格回放与 Bot 隐藏分配分布全部通过。

验证结果与 exploration 的目标时长占比（87.22%）和中位数（7,439 tick）接近，11 条命不再只是探索样本上的胜者。共享不可变 Definition `arena-v1.balance-lives-11.v1` 现由 validation 与 Product 组合共同消费；Product 默认提升不修改 MatchCore 通用默认，显式覆盖仍保留给测试与未来 Mode。

## 剩余条件

- 后续为长时实验设计确定性进度证据与可安全续跑边界；本次已完成证据不因运行耗时重写。

固定 validation Definition 与门禁见 [11 条命隔离验证预注册](../research/arena-stage9-s9.3b-lives-11-validation-preregistration.md)。
