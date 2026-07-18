# Arena Stage 9 S9.3b 生命数探索预注册

## 目标

验证“让比赛进入完整地图时间轴”是否可以仅通过生命数调整实现。此探索不修改装备、地图、Bot 或原平衡门，也不把探索胜者直接称为可发布候选。

## 固定候选

| Candidate ID | `livesPerParticipant` | 其他权威内容 |
| --- | ---: | --- |
| `arena-v1.balance-lives-09.explore.v1` | 9 | 与 baseline 完全相同 |
| `arena-v1.balance-lives-11.explore.v1` | 11 | 与 baseline 完全相同 |
| `arena-v1.balance-lives-13.explore.v1` | 13 | 与 baseline 完全相同 |

9/11/13 用于覆盖按 baseline 中位时长线性外推后的约 2 分钟附近、目标区间中部和硬时限附近。实际地图塌陷会造成非线性，因此不能用外推替代实验。

## 样本隔离

- 历史 baseline：Bot seed 序列 index `[0, 300)`。
- 本次 exploration：index `[10,000, 10,060)`，60 paired seed，三个候选共享。
- 后续 validation：index `[20,000, 20,300)`，探索结束前不得运行或查看结果。
- seed 由 uint32 全周期奇数步长序列派生，代码测试要求三组无交集。

每个探索 Definition 运行 easy/normal/hard 共 180 局，固定前 2 个 seed 做三档严格回放。三个候选总计 540 局和 18 条 replay check。

## 资格门与选优

候选先满足：clean source、全部 case 完成、Bot Gate 通过、三档样本完整、无未知装备事件。未满足者不具备被选择资格。

装备拾取/动作/命中最小计数按 60/300 缩放为 20/20/2；占比、2～3 分钟、超短/超时、Bot 差值和淘汰来源门保持 S9.3a 数值。

对具备资格的候选计算以下归一化违规项并求和：

1. 目标时长占比缺口。
2. 中位数距目标区间的距离。
3. 超短局超额。
4. 超时局超额。
5. 有攻击归属占比缺口。
6. 装备归因占比距允许区间的距离。
7. 无归属环境/自身占比缺口。
8. 装备数量或占比失败门数量。

最低罚分胜出；同分再看更高目标时长占比、更小的 9,000 tick 中点距离、candidate ID 升序。Selection 由完整子报告重建，不接受人工覆盖。

## 命令

```bash
# 只审查预注册矩阵、Definition hash、seed 和选优 Policy
npm run arena:experiment:balance:explore -- --describe

# 必须在 clean commit 上运行，文件必须不存在
npm run arena:experiment:balance:explore -- \
  --output=docs/quality/arena-stage9/balance/<exploration>.json

# 独立重建三份 Report 和 Selection
npm run arena:experiment:balance:explore -- \
  --verify=docs/quality/arena-stage9/balance/<exploration>.json
```

探索结果落盘前不得修改候选矩阵、seed、阈值或选优规则。若三者都不理想，仍保留机器胜者作为本轮结论，但正式 validation 失败后必须创建新的预注册候选，不能把本次探索扩写成无限调参入口。
