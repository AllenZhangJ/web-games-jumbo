# Arena 仓库运营与安全策略

## 权威口径

机器可读策略位于 `governance/repository-policy.json`。当前唯一负责人是 Allen，GitHub 账号是 `@AllenZhangJ`；默认分支是 `main`。策略修改必须与 CODEOWNERS、CI 和治理测试同时评审，不在文档中维护第二份值。

## 分支保护建议

仓库内只能验证 CI 与 CODEOWNERS，不能证明 GitHub 服务端规则已启用。对 `main` 建议在远端启用：

- 禁止 force push 和分支删除。
- 只允许 Pull Request 合并，要求 `quality` CI 成功且对话已解决。
- 要求 CODEOWNERS 审批；项目只有一名负责人时，应保留管理员紧急修复通道，并在 PR 中留下原因，避免把单人审批配置成无法合并的死锁。
- 要求分支在合并前与 `main` 最新状态一致，不允许绕过检查直接推送。

上述只是建议；本治理分支没有修改远端分支保护，G10 审计时需单独核对实际配置。

## 依赖更新与漏洞

- 所有 manifest 使用精确 semver，`package-lock.json` 使用 lockfile V3。项目 `.npmrc` 禁用安装阶段的隐式 audit，CI 使用 `npm ci --ignore-scripts --no-audit`，GitHub Actions 固定到 40 位 commit SHA。
- Dependabot 每月分别检查 npm 和 GitHub Actions。更新 PR 必须通过统一治理、回放、压力、构建和预算门，不直接合并浮动版本。
- `npm audit --omit=dev --audit-level=high` 是完整门禁中唯一的联网漏洞审计步骤。它会向 npm 服务发送依赖元数据，必须由 Allen 明确授权；未授权时不执行、不绕过、不宣称“0 漏洞”。不使用 npm 安装命令自动产生的审计副作用代替该显式步骤。
- 发现 high/critical 时先固定 advisory、可达路径和影响范围，再做最小兼容升级。不使用 `audit fix --force`，不以删测试、降画质或跳过门禁关闭风险。

## 敏感信息、遥测与诊断

- 仓库禁止 `.env`、私钥/证书容器和高置信度 token；自动门禁扫描受维护文本。如发生泄露，先在外部服务撤销/轮换，再清理历史，不只删当前文件。
- Arena 运行时默认不启用网络遥测。新增遥测必须单独 ADR、用户同意、数据最小化、保留/删除策略和脱敏测试，不得以“诊断”名义偷渡。
- 原始 `.log` 不提交。本地诊断默认保留 7 天；结构化、去标识且被正式 Evidence Bundle 哈希绑定的材料按对应验收合同保留，不适用原始日志的 7 天期限。
