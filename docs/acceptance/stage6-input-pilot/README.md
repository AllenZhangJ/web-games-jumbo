# Arena Stage 6 S6.6 Input Pilot 正式证据手册

## 当前状态

S9.6b5b 已建立版本化 `InputPilotEvidenceBundle`、可重算 Audit validator、clean Web build 绑定、同候选 Stage 6 E3 绑定和 `arena:input-pilot:evidence` release producer。工程合同已完成，但真实目标设备 E3、真人新手 E4、`candidate-winner` 和最终 Mapper 冻结尚未完成。

查看固定合同：

```bash
npm run arena:input-pilot:evidence -- --describe
```

## 正式采集前提

- 只从最终候选的 clean Web 构建打开 `/pilot.html`，不能使用开发服务器、dirty build 或手工复制页面。
- 工作台必须显示具体 build ID 和“clean build，可形成正式证据”；Manifest 缺失、未覆盖 `pilot.html` 或源码脏时，入组与发布证据导出会被禁用。
- 每个构建的 Workspace key 由 Input Definition、commit、buildId 和 Manifest hash 共同隔离；不要把浏览器存储复制到另一构建。
- 受测者只获得固定任务目标，不解释按钮或手势；匿名编号不得替换为姓名、邮箱、手机号或平台账号。
- E4 每个方案至少需要 5 个合格样本；同一参与者不得重复入组或接触另一方案后继续计入主要指标。

## 采集与导出

完成全部受测者且不存在 active trial 后，依次保留：

1. “导出原始审计”用于独立人工复核。
2. “导出发布证据”生成带 commit/build/Manifest 身份的 Evidence Bundle。
3. 将发布证据文件规范化命名为 `input-pilot-evidence.json`；不要编辑其中的 `report`、hash、Definition 或 Record。
4. 按 Stage 6 设备证据手册完成目标设备 E3，并保留其 `device-evidence.json` 与全部附件。

`candidate-winner` 只由固定主指标、最低成功率、胜者差值和次指标一致性派生。样本不足得到 `incomplete`；阈值未达、无明确胜者或次指标冲突不会被人工勾选提升为 ready。

## 独立复验

```bash
npm run arena:input-pilot:evidence -- \
  --bundle /secure/release/<build-id>/input-pilot-evidence.json \
  --build-root /secure/release/<build-id>/web \
  --device-evidence /secure/release/<build-id>/stage6/device-evidence.json \
  --device-artifacts-root /secure/release/<build-id>/stage6
```

- 退出码 `0`：Audit 得出 `candidate-winner`，Web 构建 clean 且包含 `pilot.html`，Stage 6 E3 为 ready，三者身份一致。
- 退出码 `2`：样本或目标设备材料不足，或固定结论尚不能形成 winner。
- 退出码 `1`：schema、派生报告、hash、commit/build、Manifest、附件或路径无效。

## S9.6 交接

`stage6.input-pilot` Evidence Statement 必须且只能登记两个顶层材料：

- `input-pilot-evidence.json`
- Web 构建目录中的 `arena-build-manifest.json`

同一 Candidate 还必须包含 `stage9.stage6-device` Gate 及其 `device-evidence.json`。Readiness producer 会重新打开全部材料，遍历 Web 构建和设备附件，重算 Audit/Report/E3 结果，并要求 Web Manifest 与最终构建门完全一致。CLI stdout、汇总截图、手写 winner 或另一候选的 E3 都不能替代这些材料。
