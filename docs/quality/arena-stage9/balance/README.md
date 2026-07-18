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
