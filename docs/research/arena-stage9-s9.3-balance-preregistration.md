# Arena Stage 9 S9.3a 平衡候选预注册

## 结论

S9.3a 已建立并执行可复现的预注册合同。首份 clean baseline 完成全部 300 个 paired case、900 局和 15 条严格回放，基础设施无 case 失败，候选因五个预注册指标门失败而不可冻结。后续只能创建新候选，不能回改本 Policy。

## 首份 clean baseline

- Source commit：`cb1b3744c06e98412296f885a1fbaa57a069a5d0`
- Definition hash：`edbd9f89`
- Result hash：`728ef53a`
- Bundle hash：`79ce76c5`
- 执行：300/300 paired case、900/900 局完成，0 case 失败；三档各 5 条 replay check 通过
- 结果：`failed`，`freezeEligible=false`

| 预注册维度 | 实测 | 结论 |
| --- | --- | --- |
| 主要时长占比 | 1/900，0.11% | 未达到至少 60% |
| 时长中位数 | 2,385 tick，39.75 秒 | 未进入 7,200～10,800 tick |
| 超短局占比 | 62.33% | 超过 10% 上限 |
| 装备归因淘汰 | 2,979/3,345，89.06% | 超过 80% 上限 |
| 无归属环境/自身淘汰 | 33/3,345，0.99% | 低于 5% 下限 |

三档 Bot 工程排序、回放、装备参与数量与占比、有攻击归属淘汰均通过。easy/normal/hard 的脚本胜率分别为 38.67%/49.33%/60.00%，能力指数为 5.96/8.11/11.26；这只证明相对工程排序，不等于真人胜率。

三件装备均有充分样本，但淘汰作用不对称：锁链 18 次、大锤 1,735 次、盾牌 1,226 次归因淘汰。该数字不是当前独立阻断门，却表明下一候选不应只延长生命或硬改时长，应同时检查装备击飞致死结构、锁链战术价值和地图淘汰机会。

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
- 首份 baseline 只冻结“当前候选不合格”这一事实；它不授权直接修改原阈值，也不自动决定下一候选的具体数值。
