# Arena Stage 9 S9.3a 平衡候选预注册

## 结论

S9.3a 已建立可执行的预注册合同，尚未运行正式 clean baseline。阈值和样本现在先于结果固定；后续即使 baseline 失败，也只能创建新候选，不能回改本 Policy。

## 固定样本

- 300 个显式、严格递增的 match seed。
- 每个 seed 依次运行 easy、normal、hard，共 900 局。
- 三档共享完整 Match config、Authority hash、地图/装备 RNG 和 benchmark player。
- 5 个 seed 三档全部严格回放，共 15 条 replay check。
- 任一 case 失败立即停止；正式 suite 不接受样本覆盖参数。

## 预注册工程门

| 维度 | 默认门 |
| --- | --- |
| 主要时长 | 7,200～10,800 tick（2～3 分钟）占比至少 60%，中位数必须在区间内 |
| 超短局 | ≤2,700 tick 的占比不超过 10% |
| 超时局 | `timeout-*` 占比不超过 65% |
| Bot 相对能力 | easy→normal→hard 的能力指数最小差 0.25，生命压力最小差 0.05 |
| 装备参与 | 每件至少 100 次拾取、100 次动作、10 次命中 |
| 装备差异 | 拾取占比 15%～50%，动作占比 5%～75%，命中占比 1%～85% |
| 淘汰来源 | 有攻击归属至少 40%；装备归因 5%～80%；无归属环境/自身至少 5% |

装备区间有意较宽：大锤、锁链、盾牌承担不同战术职责，不强迫三者命中率相等。当前门只排除“内容未参与”和“单一内容垄断”，不宣称数值最终公平。

## 报告资产

实验输出使用 `ArenaExperimentReportBundle` schema V1，包含完整 Definition V2、Report 和 bundle hash。Verifier 会重建全部派生字段；文件采用 exclusive create，禁止覆盖。

```bash
# 运行前审查 Definition 与 hash
npm run arena:experiment -- --suite=balance-candidate --describe

# 干净源码上运行正式 baseline；文件必须不存在
npm run arena:experiment -- --suite=balance-candidate --summary \
  --output=docs/quality/arena-stage9/balance/<candidate>.json

# 独立验证已保存报告
npm run arena:experiment:report:verify -- \
  docs/quality/arena-stage9/balance/<candidate>.json
```

## 解释边界

- `freezeEligible` 是实验资产状态，不是发布状态。
- benchmark player 不是新手、高手或总体玩家分布。
- 无归属淘汰只能证明没有有效攻击归属；当前事件合同不能区分主动跳崖与具体地图机关。
- 中心控制、危险区停留和真人输入意图仍需后续 Collector/用户证据，不能从本报告推断。
