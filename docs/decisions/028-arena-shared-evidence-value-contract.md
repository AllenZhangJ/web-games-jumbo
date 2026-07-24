# ADR-028：跨 Gate 只共享证据标量合同，不共享领域状态机

- 状态：已接受并实施（G5.28a 已迁入 strict workspace）
- 日期：2026-07-18
- 实施更新：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 当前代码提交：`c523d7a00e78a0342e1f2bbe1ef65e12fbb8888d`

## 背景

Stage 6～9 已形成构建、设备、输入盲测、性能、真人研究、缺陷和 RC 交接等多条证据链。它们的业务 Definition、Record、Bundle 与 Report 各不相同，但都需要校验同一批基础值：40 位 Git commit、64 位 SHA-256、带毫秒的 UTC instant、规范相对路径和有限长度字符串。

这些规则最初由各模块局部实现。随着 Gate 增加，重复实现已出现实际漂移：部分路径拒绝盘符和 URL，部分只拒绝 `..`；部分字符串拒绝控制字符，部分只限制长度。继续复制会让同一 Evidence Material 在不同 Gate 得到不同结论，也增加安全修复遗漏的概率。

另一方面，把 Artifact、Record、Bundle、Report 或状态派生都放进一个通用 Evidence Manager，会抹平设备、真人、资产和发布证据的不同不变量，形成新的 God Utility。

## 决策

新增低层证据标量合同；其当前实现位于 strict `@number-strategy-jump/arena-evidence-contracts`，只提供稳定标量能力：

- `assertEvidenceBoundedString`
- `assertEvidenceGitCommit`
- `assertEvidenceSha256`
- `assertEvidenceUtcInstant`
- `isEvidenceUtcInstant`
- `assertEvidenceRelativePath`

构建 Manifest、设备证据、Formal Asset Intake、输入盲测 Evidence Bundle、性能 Record、真人研究、实验 Report、回归 Report、缺陷账本与 RC 交接统一使用这些函数。

架构门禁会扫描上述 Evidence 消费目录，禁止重新声明 40 位 commit 正则、UTC instant 正则或直接调用 `Date.parse()`。实验 Definition 的 candidate commit 也属于证据身份，必须使用同一合同。领域若需要 8/64 位联合 result hash、禁止 Manifest 自引用、单文件名或其他更强规则，仍在共享标量断言之后由领域模块追加。

Artifact 字段集合、最大数量、是否允许零字节、共享规则、隐私字段、样本分母、状态派生、build/commit 绑定和 producer 语义仍由原领域模块拥有。共享层不得导入 Presentation、Study、Experiment、Regression、Product、Release、Three.js、Node 或宿主 API；权威 Rule/Core/Bot/Session 也不得反向依赖 Evidence。

相对路径的统一口径是：非空、有限长度、使用 `/`、非绝对路径、无盘符、无 URL scheme、无反斜杠、控制字符、空段、`.` 或 `..`。这比部分旧合同更严格，但不会改变任何已生成的规范证据材料。

## 被否决方案

### 保留每个 Gate 的正则和时间解析

局部代码看似独立，但相同安全规则已经漂移。修复路径逃逸或摘要格式时必须修改多处，长期会产生不一致证据结论。

### 创建通用 Evidence Artifact/Bundle/Manager

设备 Artifact 有 id/kind/check 引用，构建 Artifact 允许零字节，真人 Replay 有隐私和比赛身份，Release Material 又有总大小限制。强行统一会产生大量可选字段和跨领域分支，违反单一职责。

### 让 Authority 使用 Evidence 类型

Evidence 是对已发生运行和外部材料的验收描述，不是玩法真相。让 Rule/Core/Bot 读取它会反转依赖，并把发布流程带入确定性模拟。

## 后果

正面：

- 所有 Gate 对 commit、SHA、UTC 和路径使用同一规范。
- 新证据合同无需复制安全正则和时间规范化逻辑。
- 领域 Record/Bundle 仍保持独立、可替换和可测试。
- 架构测试同时约束共享层依赖和 Authority 反向依赖。

代价：

- 标量错误信息采用统一口径，不能再由每个模块自定义同义措辞。
- 收紧后的路径合同会拒绝过去未明确拒绝的 URL、Windows 盘符和控制字符；非规范历史材料需要在进入当前 schema 前迁移。
- 共享模块必须保持小而稳定；新增领域字段不能因为“多个地方都用”就自动下沉。

## 实施更新

G5.28a 将原 JavaScript 实现等价迁入 strict TypeScript workspace，并让所有消费者只从包公开 API 导入。包依赖被架构门锁定为仅 `arena-contracts`；文件系统、网络、墙钟获取、Presentation、Study、Experiment、Release 与 Authority 仍不进入共享层。该迁移不扩展共享职责，也不改变已有规范证据值。
