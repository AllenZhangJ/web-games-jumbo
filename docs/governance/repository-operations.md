# Arena 仓库运营与安全策略

## 权威口径

机器可读策略位于 `governance/repository-policy.json`。当前唯一负责人是 Allen，GitHub 账号是 `@AllenZhangJ`；默认分支是 `main`。策略修改必须与 CODEOWNERS、CI 和治理测试同时评审，不在文档中维护第二份值。

## main 分支保护

2026-07-24 已用 owner `@AllenZhangJ` 通过 GitHub API 写入并回读 classic `main` protection，分支端点返回 `protected: true`：

- 禁止 force push 和分支删除。
- 只允许 Pull Request 合并，要求 `quality` CI 成功且对话已解决。
- 唯一负责人模式不要求 CODEOWNERS 自批，`required_approving_review_count=0`；管理员保留紧急修复通道并必须在 PR/事故记录中说明原因，避免单人仓库审批死锁。
- 要求分支在合并前与 `main` 最新状态一致，不允许绕过检查直接推送。

远端规则属于服务端状态，不能只依赖本文件；最终合并审计仍须回读 API，确认没有被仓库外操作改写。

## 依赖更新与漏洞

- 所有 manifest 使用精确 semver，`package-lock.json` 使用 lockfile V3。项目 `.npmrc` 禁用安装阶段的隐式 audit，CI 使用 `npm ci --ignore-scripts --no-audit`，GitHub Actions 固定到 40 位 commit SHA。
- Dependabot 每月分别检查 npm 和 GitHub Actions。更新 PR 必须通过统一治理、回放、压力、构建和预算门，不直接合并浮动版本。
- `npm audit --omit=dev --audit-level=high` 是统一 `npm run check` 中唯一的联网生产闭包审计步骤；安装始终使用 `--no-audit`，不以安装副作用代替显式结果。Allen 已于 2026-07-24 授权本项目 npm 审计元数据外发；范围或服务发生变化时需重新确认。
- 全依赖审计用于单独核对开发工具链。当前开发链 3 个 high 已通过精确 `sharp@0.35.3` override 闭环，`npm audit --audit-level=high` 与生产闭包审计均为 0 vulnerabilities；供应链门禁阻止 override 漂移。
- 发现 high/critical 时先固定 advisory、可达路径和影响范围，再做最小兼容升级。不使用 `audit fix --force`，不以删测试、降画质或跳过门禁关闭风险。

## 敏感信息、遥测与诊断

- 仓库禁止 `.env`、私钥/证书容器和高置信度 token；自动门禁扫描受维护文本。如发生泄露，先在外部服务撤销/轮换，再清理历史，不只删当前文件。
- Arena 运行时默认不启用网络遥测。新增遥测必须单独 ADR、用户同意、数据最小化、保留/删除策略和脱敏测试，不得以“诊断”名义偷渡。
- 原始 `.log` 不提交。本地诊断默认保留 7 天；结构化、去标识且被正式 Evidence Bundle 哈希绑定的材料按对应验收合同保留，不适用原始日志的 7 天期限。
