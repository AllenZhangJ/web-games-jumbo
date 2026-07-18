# Arena Stage 9 S9.6 缺陷与风险账本手册

## 当前状态

S9.6b5a 已建立 `ArenaDefectLedger`、派生 Report、`arena:defects:verify` CLI 和 release producer。工程合同通过不代表当前候选已完成缺陷复核；只有最终 clean commit 的真实账本和 Evidence Statement 才能关闭 `stage9.defects`。

查看固定合同：

```bash
npm run arena:defects:verify -- --describe
```

## 账本原则

- Ledger 绑定一个 40 位 commit，不跨候选复用。
- 不保存 `ready`、开放数量或结论字段；这些均由 producer 重算。
- `knownIssuesComplete` 只有在负责人完整检查测试失败、设备记录、真人研究、构建门和现有 issue 后才能设为 `true`。
- 每个 defect 必须有 owner 和至少一个 issue/test/report 引用。
- 已解决 defect 必须有解决摘要和至少一个验证引用；开放 defect 不得伪装成已有解决证据。
- 每个开放 defect 必须被 residual risk 明确承接，包含 owner、缓解措施和再次复核触发条件。
- 开放 `blocking` 或 `high` 必然使 Report 为 `failed`；开放 `medium`/`low` 只有在风险承接完整时才允许进入 ready 账本。

空 defects 数组不是自动批准。它只在 reviewer 对最终候选完成全量复核并明确记录 `knownIssuesComplete=true` 时表示“当前没有已知缺陷”；伪造复核身份或跳过外部门仍不能让其他 Gate ready。

## 最小结构

```json
{
  "schemaVersion": 1,
  "commit": "<40位clean commit>",
  "reviewedAt": "2026-07-18T12:00:00.000Z",
  "reviewerId": "release-reviewer-01",
  "knownIssuesComplete": true,
  "defects": [],
  "residualRisks": []
}
```

正式账本建议保存为仓库外候选材料目录中的 `defect-ledger.json`。不要写姓名、邮箱或账号；`reviewerId`、`ownerId` 使用项目内稳定匿名标识。

## 校验与交接

```bash
npm run arena:defects:verify -- \
  --ledger /secure/release/<build-id>/defect-ledger.json
```

- 退出码 `0`：复核声明完整、没有开放 blocking/high，所有解决与残余风险关系可追踪。
- 退出码 `2`：已知问题复核未完成，或仍有开放 blocking/high。
- 退出码 `1`：schema、commit、owner、引用、风险关系、路径或 I/O 无效。

`stage9.defects` Evidence Statement 必须且只能登记一个名为 `defect-ledger.json` 的内容寻址材料。Readiness producer 会重新解析 Ledger、重算 Report/result hash，并核对当前 clean checkout；CLI stdout、Markdown 勾选或 issue 数量截图都不能替代 Ledger。
