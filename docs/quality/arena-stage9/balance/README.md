# Arena S9.3 平衡候选证据

本目录只接收由干净源码生成、文件名唯一且通过 `arena:experiment:report:verify` 的完整 Report Bundle。失败候选同样保留；禁止覆盖或删除旧报告来隐藏回归。

命名建议：

```text
<candidate-id>--<source-commit-short>--<definition-hash>.json
```

报告中的 `freezeEligible` 只说明该实验是否通过自身预注册门。真人公平性、真机性能和最终发布仍由 Stage 9 后续证据决定。

## 证据索引

| 候选 | Source commit | Definition / Result / Bundle | 执行 | 结果 |
| --- | --- | --- | --- | --- |
| `arena-v1.balance-baseline.v1` | `cb1b3744c06e` | `edbd9f89` / `728ef53a` / `79ce76c5` | 300 paired case、900 局、15 replay check、0 case 失败 | `failed`：时长目标/中位数/超短局、装备归因上限、环境淘汰下限 |

机器可读证据：[首份 baseline Report Bundle](arena-v1-balance-baseline-v1--cb1b3744c06e--edbd9f89.json)。失败报告是保留资产，不得用后续候选覆盖。

S9.3b exploration 使用外层 `ArenaBalanceExplorationBundle`，其中保留三份完整子 Report、固定 Selection Policy、机器排序和外层 hash。命名建议：

```text
arena-v1-balance-lives-exploration-v1--<source-commit-short>.json
```

使用 `npm run arena:experiment:balance:explore -- --verify=<file>` 独立重建；探索胜者只进入隔离 validation，不等于正式平衡候选已通过。

| Exploration | Source commit | Definition / Result / Bundle | 完整性 | 机器结论 |
| --- | --- | --- | --- | --- |
| `arena.stage9.s9.3b.lives-exploration.v1` | `ac140e2d1a99` | 9：`2ccb6d80` / `9f520d7f` / `b93c242d`；11：`d03696a6` / `65e8756e` / `43f8ea29`；13：`15fbd7b7` / `8853bd72` / `b152ad47`；outer：`6322f4fa` | 180 局/候选、6 replay check/候选、0 case 失败 | 11 条命：资格通过、罚分 0、全部平衡门通过；进入 validation |

机器可读证据：[9/11/13 条命探索 Bundle](arena-v1-balance-lives-exploration-v1--ac140e2d1a99.json)。13 条命因 Bot easy→normal score-rate 排序失败而不具备选择资格；这不改变 11 条命的机器选择。

下一份证据必须来自预注册的 `arena-v1.balance-lives-11.validation.v1`，使用 index `[20,000, 20,300)` 的 300 paired seed；结果产生前不预留“通过”结论。

| Candidate | Source commit | Definition / Result / Bundle | 完整性 | 结论 |
| --- | --- | --- | --- | --- |
| `arena-v1.balance-lives-11.validation.v1` | `594d49ec8eba` | `81040fb7` / `2ed504b0` / `7581b210` | 300 paired case、900 局、15 replay check、0 case/Metric Gate 失败 | `passed`，`freezeEligible=true`；可提升为 Product 默认 |

机器可读证据：[11 条命 validation Report Bundle](arena-v1-balance-lives-11-validation-v1--594d49ec8eba--81040fb7.json)。该报告验证候选配置，不自动修改 Product 默认；提升必须另有代码与回归门。
