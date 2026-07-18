# ADR-026：Arena S9.6 使用不可变候选、具名证据门与 fail-closed 交接报告

- 状态：已接受；S9.6a 交接合同与 S9.6b1-b4 九个 producer 已实施，其余语义适配和真实证据待完成
- 日期：2026-07-18

## 背景

Stage 4～9 已分别建立实验 Bundle、黄金回放、三端构建 Manifest、设备 Record、性能 Report、输入盲测和真人公平性研究。各证据自身可以复验，但此前没有一个机器合同能回答它们是否属于同一 commit/build、哪些门仍缺失，以及一个失败是否被其他“通过”结果掩盖。

仅靠人工清单会产生三个风险：路线图状态落后于代码；旧 commit 的报告与新构建被误拼成同一候选；手写 `ready` 或缺少附件的摘要被误认为发布批准。S9.5 计划要求把配置 hash、报告、回放、缺陷、三端证据和风险汇总为 Stage 10 输入，因此需要独立的交接裁决层。

该结构借鉴 [SLSA Provenance](https://slsa.dev/spec/v1.2/provenance) 对产物来源和材料的绑定，以及 [in-toto Statement v1](https://in-toto.io/Statement/v1) 将不可变 subject 与 predicate 分离的思路；项目不复制其 schema，也不引入签名、远程证明或新依赖。

## 决策

### 固定 S9.6 V1 门集

`arena.stage9.rc-handoff.v1` 固定 12 个必须门：

1. S6.6 真人新手输入盲测与 Mapper 冻结。
2. S7.5 正式双角色、动作、音画、资产预算和许可。
3. S9.2 黄金回放严格复验。
4. S9.2 fuzz、生命周期、两条 Session soak 和 Product 压力回归。
5. S9.3 11 条命平衡候选独立验证。
6. S9.4 三端 clean product 构建完整性。
7. S9.4 三端包体预算。
8. Stage 6 目标设备输入与生命周期证据。
9. Stage 8 三端产品闭环证据。
10. Stage 9 六目标设备性能证据。
11. S9.5 预注册真人公平性证据。
12. 阻断级和高优先级缺陷清零及剩余风险账本。

每个 Gate 固定阶段、标题、唯一 Gate ID、具名 producer、`source` 或 `build` subject scope，以及由完整要求计算的 `requirementHash`。改变门、样本、预算、角色、动作集合或冻结配置必须创建新 Definition 版本，不能覆盖 V1。

### 候选与证据身份

`ArenaReleaseCandidateBundle` 只代表一个 40 位 commit、一个 build ID 和一个源码 dirty 状态。所有 source evidence 必须绑定同一 commit；所有 build evidence 还必须绑定同一 build ID。重复 Gate、未知 Gate、冲突材料描述、非规范相对路径、大小越界或身份漂移均在生成 Report 前拒绝。

`ArenaReleaseEvidenceStatement` 保存 producer、需求 hash、声明状态、结果 hash，以及材料的相对路径、字节数和 SHA-256。交接 CLI 会在受限根目录内重新打开普通文件，拒绝符号链接逃逸、读取中替换、大小或 SHA-256 不一致；相同路径跨 Gate 复用时描述必须完全一致。

8 位项目 content hash 用于确定性漂移检测，不作为密码学签名。材料完整性使用 SHA-256；正式信任仍来自受版本控制的 producer 验证代码和代码评审。

### 材料完整性不等于语义通过

候选 JSON 中的 `status=ready` 只是声明。`ArenaReleaseReadinessReport` 默认把所有未经过对应 producer 语义适配的声明视为 `incomplete`，即使材料 SHA-256 正确。只有适配器复算原始报告、确认 Definition/Policy、commit/build、状态和 result hash 后，才能把 `{gateId, evidenceHash}` 标记为 verified。

S9.6b1 的 `arena:stage9:readiness` 输出 `producerSemanticVerification=partial`。`arena:build:verify` 和 `arena:build:budget` 必须复用同一组三端 Manifest；适配器重新校验 Manifest 文件身份、遍历并哈希实际产物、核对 commit/build/dirty 和 product 默认入口，再分别复算完整性摘要或固定预算 Report。只有声明的状态与 result hash 和复算结果完全一致时才返回 verified evidence。

S9.6b2 增加 `arena:replay:verify` 和 `arena:experiment:report:verify`。黄金回放只接受一个 Manifest 与其精确登记的 Replay 集，在当前代码上执行严格重放、场景断言、再生成和历史 schema 拒绝；平衡验证只接受固定 `balance-validation` Bundle，重建全部派生字段并核对当前冻结 Definition、commit、outcome、freeze eligibility 和 result hash。两类 source producer 都要求当前 Git checkout clean、commit 与候选相同，并在复验前后保持身份稳定。

S9.6b3 增加 `arena:regression:evidence`。它不包装旧 `arena:regression` shell 退出码，而是由 `arena.stage9.regression-evidence.v1` 固定两套 Mapper 各 40 局 fuzz/2 条回放、六个 lifecycle 测试文件、两条 100 局 soak、8 MiB 回收后堆增长预算和 200 局 Product stress。Node 编排器不使用 shell，对子进程超时、输出上限、非零退出、stderr、部分 TAP、非 JSON、资源残留或超预算全部 fail closed；仅在 clean commit 前后身份稳定时向仓库外独占原子发布单一 Report。Readiness 适配器重新解析全部派生字段、Definition/result hash 和 candidate commit；黄金回放仍由独立 Gate 处理，不重复执行。

S9.6b4 增加 Stage 6 设备、Stage 8 产品设备、Stage 9 性能设备和真人公平性四个 build producer。原设备与真人 CLI 改为薄入口，发布层和 CLI 共同调用同一 verifier，避免复制一套逐渐分叉的语义。三类设备门各只声明一个 `device-evidence.json` 顶层索引，verifier 按 Bundle 重新打开全部附件、构建 Manifest 与 Performance Trace，再由窄适配器重算固定 Definition/Policy 的 Report、状态和结果 hash。真人门只声明 `human-fairness-evidence.json`、`capture-package-manifest.json` 和 clean Web `arena-build-manifest.json` 三个顶层索引；verifier 继续递归校验 Workspace audit、原始采集包、全部 Replay、逐 Tick Bot 输入和实际 Web 构建。这避免 90 人 × 3 局材料超过 Statement 的 128 项上限，同时不把未声明的传递材料变成“无需校验”。同一平台、同一 build ID 只允许一个 Manifest；候选存在最终构建门时，Stage 8、性能和真人证据中的 Manifest SHA-256 必须与其完全一致，三类设备门之间也禁止复用非构建附件内容。合法空 Bundle 仍只能产生 `incomplete`，声明 `ready` 不能提升真实状态。

其余 Gate 继续保持未验证；尚无 producer 的输入盲测、正式资产和缺陷账本先保持缺失，不使用通用“人工通过”入口。

### 裁决优先级

- clean source 且全部 Gate 已 verified 并为 `ready`，Report 才能 `freezeEligible=true`。
- 任一已验证 Gate 为 `failed`，或候选来自 dirty source，整体为 `failed`。
- 没有已知失败但存在缺失、声明为 incomplete 或未验证的 Gate，整体为 `incomplete`。
- 不提供 `--force`、`--ignore-missing`、`--allow-dirty` 或自定义必选门参数。

S9.6 ready 只表示可交给 Stage 10 做 RC、回滚、平台配置、隐私和发行清单评审，不等于已经发布。

## 后果

- Stage 4～9 的完成状态可以由一个版本化门集统一查看，旧报告和新构建不能静默混用。
- 外部设备、真人样本和正式资产会显式保持 incomplete；Node、桌面浏览器或手写 JSON 不能替代。
- 新增一个证据类型需要具名 producer 和窄适配器，增加少量代码，但避免通用事件总线或万能报告解析器。
- 候选材料必须保存机器输出文件并记录 SHA-256/大小；只保留终端截图不足以形成可验证交接。
- 当前九个 Gate 具备 release producer 语义适配，仍不能形成 ready 候选。只有剩余三个 producer 和全部真实门完成后才能关闭本 ADR 的实施状态。

## 拒绝的替代方案

### 用 Markdown 勾选表作为唯一冻结依据

文档适合解释上下文，不足以验证 commit/build、材料替换和 Definition 漂移，拒绝。

### 直接相信候选 JSON 中的 ready

这相当于提供无审计的人工 override，会制造假阳性，拒绝。

### 把所有原始验证逻辑复制进一个发布脚本

会形成不断膨胀的 Manager，并让设备、实验、真人研究各自的边界失效。S9.6 只做组合；语义仍由对应 producer 负责，拒绝复制。

### 现在引入完整 SLSA/in-toto 签名链

首版本地单机项目没有远程构建身份、签名密钥和供应链服务的当前需求。先复用其 subject/material/predicate 思路；需要 CI 签名或外部分发证明时再单独决策。
