# Arena S9.3 平衡候选证据

本目录只接收由干净源码生成、文件名唯一且通过 `arena:experiment:report:verify` 的完整 Report Bundle。失败候选同样保留；禁止覆盖或删除旧报告来隐藏回归。

命名建议：

```text
<candidate-id>--<source-commit-short>--<definition-hash>.json
```

报告中的 `freezeEligible` 只说明该实验是否通过自身预注册门。真人公平性、真机性能和最终发布仍由 Stage 9 后续证据决定。
