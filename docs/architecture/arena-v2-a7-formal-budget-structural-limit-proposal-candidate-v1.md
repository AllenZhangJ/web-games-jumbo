# Arena V2 A7 正式资产结构预算上限提案候选 V1

## 状态

- 日期：2026-08-15
- production reachability：`production-unreachable`
- implementation：`code-written-not-run`
- validation：`not-run`
- proposal：`proposed-not-independently-approved`
- `hardGate=false / hardGateUsable=false`
- 当前预算V2：`proposed-not-approved / structuralLimits=unresolved-not-approved`

本候选只把已独立接受的结构观察转换为可审阅的上限提案，不批准预算、不修改当前V2 Policy、不加载或生成资产，也不接入默认Bundle、Preloader或三端Entry。测试、类型、治理、构建、设备和性能验证按开发优先指令顺延。

## 输入链

```text
130项资产 + P7六环境真实观察
  → Structural Evidence Submission
  → 独立 Evidence Evaluation（Reviewer != Collector）
  → Structural Limit Proposal（Proposer != Collector/Reviewer）
  → Independent Approval（Approver继续独立）
  → Approved Policy Assembly（Assembler为第五角色）
  → A7 V3只读复核
```

提案必须重新构造并核对已接受Evaluation identity，继续绑定同一Catalog、预算Policy、clean source commit、lock、toolchain和六环境build identities。提案时间不得早于独立证据评估时间。

除Evaluation identity与结构报告身份外，Proposal还直接保留原始Submission identity、Observation Batch ID和Captured At UTC。它们只读继承Accepted Evaluation，Proposer不能改写，使后续审阅无需反查嵌套提交输入即可定位具体采集批次。

Proposal同时保留Evidence Reviewed At UTC；它与Captured At及本层Proposed At形成前三段规范时间线，并继续进入Decision identity。

## 130项资产上限

每项必须按当前Catalog规范顺序提交，且任何maximum不得低于已接受观察值：

- 编码字节；
- node、joint、animation clip、primitive、material、texture数量；
- 纹理宽高和解码字节；
- 音频解码字节；
- 最大实测常驻内存和GPU内存。

Proposal输出还会从Budget V2逐项派生`encodedMediaFormat`和`decodedTextureFormat`，这些字段不是Proposer输入，不能借提出结构上限改写容器或纹理解码格式。当前纹理宽高和解码字节来自已接受观察并与Budget V2闭合；它们随Proposal identity进入Independent Decision和Approved Policy Assembly，最终由A7 V3重新对照当前V2基座。

不适用维度必须为0：音频不能伪造模型、纹理或GPU上限；纹理不能伪造模型或音频上限；模型的外部纹理预算继续由独立纹理资产承担，不能把纹理解码量内嵌回模型上限。

纹理maximum还必须满足`maximumWidth × maximumHeight × 4 <= maximumDecodedTextureBytes <= maximumGpuBytes`，乘法必须保持安全整数。这样宽、高、RGBA8解码和GPU上限可在同一最坏情况同时成立，不能单独扩大尺寸却沿用较小字节上限。

## 六环境上限

每个P7目标环境必须按预注册顺序提交：

- 峰值常驻内存；
- 峰值GPU内存；
- 峰值音频解码内存；
- 峰值资产上传耗时；
- Context恢复必须完成；
- 清理后必须回到基线。

数值maximum不得低于已接受观察。Context恢复与清理要求只能显式为`true`，不能通过放宽提案取消生命周期门。

每项环境观察同时保留原始Evidence Locator与SHA，并与规范环境ID一起进入Proposal identity；不能只保存SHA后丢失可定位记录，也不能把另一个环境证据的Locator拼接到本项观察。

## 余量与独立治理

候选只统计130项资产和六环境中“至少一个maximum高于观察值”的严格余量数量，以及全部maximum等于观察值的零余量数量，不猜统一百分比。每项都必须绑定`headroomReasonId`；零余量不会在本层自动失败或自动通过，但后续独立批准必须逐项明确处置。

提案身份覆盖完整上限、余量理由、来源身份和提案记录SHA。它只形成稳定、不可变、可复算的评审输入；后续独立批准与Policy装配候选已分层实现，并且不得由Proposer、Collector或Evidence Reviewer越权自批。

提案记录的Locator和SHA必须同时不同于六环境原始证据、结构观察总报告与独立评估记录，禁止把同一个证据文件换名字后跨域重复背书。提案身份继续保留六环境证据记录清单，供批准与装配层重新核对，而不是只保留环境build摘要后丢失来源身份。

## 失败关闭边界

- 非130项资产、非六环境、重复/乱序/未知字段失败关闭；
- Evaluation非accepted、identity漂移或已携带hard gate权限时拒绝；
- maximum低于观察值时拒绝；
- 不适用指标非0时拒绝；
- 角色重叠、时间倒序、非规范UTC instant（包括不存在的日历日期）、无效SHA或空理由时拒绝；
- Proposer/Proposal/Reason等标识最多256字符且不允许首尾空白或控制字符，Locator最多2048字符，说明与备注最多4096字符；
- 本候选永远返回`grantsBudgetApproval=false / hardGate=false / hardGateUsable=false`。

## 延后验证

已写入但未运行：定向Vitest规格、P7 runner清单、治理边界和版本化可达性检查。真实上限值、真实余量是否足够、真实独立批准、Policy激活和A7最终冻结运行证据全部顺延；当前V2不会被替换。
