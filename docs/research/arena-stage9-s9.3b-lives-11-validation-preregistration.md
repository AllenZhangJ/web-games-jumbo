# Arena Stage 9 S9.3b 11 条命隔离验证预注册

## 来源与目标

exploration Bundle `6322f4fa` 在 9/11/13 条命的固定矩阵中机器选择 11 条命。本验证只回答：该候选能否在完全未运行的 300 paired cohort 上复现 Bot 排序、2～3 分钟时长、装备参与和淘汰来源结果。

探索通过不等于验证通过；本文件与代码先于 validation 结果提交，运行后不得回写 seed、阈值或候选参数。

## 固定 Definition

- Experiment ID：`arena.stage9.s9.3b.balance-lives-11-validation.v1`
- Candidate ID：`arena-v1.balance-lives-11.validation.v1`
- 唯一玩法变化：`livesPerParticipant = 11`
- Seed cohort：Bot seed 序列 index `[20,000, 20,300)`
- 样本：300 paired case，easy/normal/hard 共 900 局
- Replay：前 5 个 paired seed，三档共 15 条严格回放
- 单 case 事件上限：100,000
- 失败容忍：0 case

Policy 使用 300 paired case 的原 S9.3a 阈值：装备最小拾取/动作/命中计数恢复为 100/100/10；时长、占比、Bot 差值和淘汰来源门不变。Definition 不接受 lives、case count、first seed、replay count 或 Policy 的 CLI 覆盖。

## 通过条件

1. 300/300 paired case 完成，0 case 失败，15 条严格回放一致。
2. easy/normal/hard 的 capability、life pressure 与 score-rate 排序通过原 Bot Gate。
3. 目标时长占比至少 60%，中位数在 7,200～10,800 tick，超短局不高于 10%，超时不高于 65%。
4. 三件装备的拾取、动作、命中数量与占比通过；不得出现未知装备事件。
5. 有攻击归属淘汰至少 40%，装备归因位于 5%～80%，无归属环境/自身淘汰至少 5%。
6. Report Bundle 可由独立 Reader 重建，source commit 在运行前后保持一致且 clean。

任一门失败都保留完整失败报告，进入新的 S9.3c 预注册候选；不得从 validation 结果反向修改本 Definition。

## 首次验证结果

- Source commit：`594d49ec8ebaa1bd6ba588ad9be70d6546fa04b0`
- Definition / Result / Bundle：`81040fb7` / `2ed504b0` / `7581b210`
- 完整性：300/300 paired case、900 局、15 条严格回放、0 case 失败、0 Metric Gate 失败，`freezeEligible=true`

| 指标 | Exploration | Validation | 门限 |
| --- | ---: | ---: | ---: |
| 目标时长占比 | 87.22% | 87.44% | ≥ 60% |
| 中位数 | 7,439 tick | 7,448 tick | 7,200～10,800 tick |
| 超短局 | 0 | 0 | ≤ 10% |
| 超时局 | 1.11% | 0.89% | ≤ 65% |
| 有归属淘汰 | 94.07% | 93.61% | ≥ 40% |
| 装备归因淘汰 | 65.45% | 67.19% | 5%～80% |
| 环境/自身淘汰 | 5.93% | 6.39% | ≥ 5% |

Validation 三档工程胜率为 48.00%/53.00%/60.67%；三档各有 300 个 unique final hash、5 条严格回放和有界无归属死亡。该结果通过预注册合同，可进入 Product 默认提升，但不替代后续真人难度、公平性与三端性能证据。

提升实现使用共享不可变 Definition `arena-v1.balance-lives-11.v1`。Product 组合将其中的 `livesPerParticipant: 11` 作为默认并在其上合并显式覆盖；MatchCore 通用默认仍为 3，避免核心框架与单一产品策略耦合。无显式 lives 覆盖的 Product 权威快照测试确认双方均为 11 条命。

## 命令

```bash
# 只审查固定 Definition
npm run arena:experiment:balance:validate:describe

# 只允许在 clean commit 上写入新文件
npm run arena:experiment:balance:validate -- \
  --output=docs/quality/arena-stage9/balance/<validation>.json

# 独立重建完整 Report Bundle
npm run arena:experiment:report:verify -- \
  docs/quality/arena-stage9/balance/<validation>.json
```
