# ADR-115：P1 当前性能执行延期并合并为最终同源联合门

## 状态

已接受：一次性 P1 内部阶段顺序调整。PA6 正确性批准保持有效，但 `formalGate=false`；本决策只延期性能命令执行，不把失败、未测或污染轮改写为通过。2026-08-10 起，[ADR-118](118-arena-v2-development-first-deferred-validation-window.md)部分取代本决策“不开放 P2”的顺序限制，但不取代 PA6/PA7 正式门。

## 日期

2026-08-03

## 背景

PA1–PA5 与 PA6-P 已完成各自正确性签核，PA6 ABBA runner 也已通过主协调正确性复验；正式 PA6 ABBA×3 尚未在清洁 CPU 环境完成。现有机器持续受到不归属本项目的 GPU、窗口系统、浏览器、模拟器和共享虚拟机负载影响，历史污染轮不能拼接为正式证据。

原顺序要求先取得一次 PA6 绿门，再开放 PA7 runner/evidence 和 P1 供给 Presentation/Platform 实现，最后在终态源码上再次运行 PA6 与 PA7。该顺序风险最低，但会在当前外部环境下让已经完成文件边界、合同预审和 175 路径归属的非性能开发长期空转，并必然产生至少两次 PA6 执行。

用户明确要求本轮跳过 PA6 性能执行，先完成下一个需要性能验证前的开发任务，再统一性能测试。该授权可以改变 P1 内部实施顺序，但不能降低产品目标、阈值、样本、设备、美术、真人、提交或独立审计硬门。

## 决策

### 1. 延期不等于豁免或通过

PA6 状态固定为：

`implementation-candidate / coordinator-correctness-approved / performance-deferred-by-ADR-115 / formalGate=false`。

- 既有正式 `300/120` CPU 红门继续保留；历史前三轮、污染红轮、中断轮和诊断轮均不得拼接。
- 本次不产生 P95、稳定回收或 process CPU 结论，不修改 `0.225ms/tick` PA6 余量门和 `0.25ms/tick` 正式门。
- “跳过本轮”只表示不在当前源码中启动性能命令，不允许文档、UI 或提交写成 PA6/PA7/P1 已通过。

### 2. 开放范围只覆盖最终性能前必须冻结的非性能实现

主协调可按已预注册的零重叠写域依次授权：

1. PA7-0 exact-key 证据合同，由开发 A 串行完成并先独立签核；
2. PA7 lane A 的 case/trace/完整 Snapshot/Replay/逐 case 语义，与 lane B 的 source/build/failure/publication 证据并行实现；
3. P1-PP0/PP1 供给表现合同、无宿主 adapter 和固定 25 项 Node 矩阵；
4. 美术线程基于真实 PP0/PP1 候选追加 A1.0-v2 当前源码绑定包并参与联合反证；
5. P1-PP2 设备证据合同和 P1-PP3 acceptance harness，在完整文件清单冻结后实现；
6. 主协调完成共享 index、architecture、build/reachability 接线及完整非性能正确性门。

以上只是 P1 内部实现窗口。P2 正式 Mode、P2 生产代码、A2 正式资产接入、设备通过、真人通过、发布、commit/push 均不因本 ADR 自动开放。A0.3 真人可并行招募和记录，但不足样本不能伪造通过。

### 3. 每个小门仍先自检再验收

开发 A、开发 B 和美术线程在每个小门提交主协调前，必须分别给出：

- 健壮性；
- 竞态与确定性；
- 兜底与失败关闭；
- 边界与恶意输入；
- 生命周期与清理；
- 生产主流程阻断性 bug；
- 变更治理：精确文件、失败轮、测试、已知缺口、回滚 hunk 和下游证据失效范围。

缺一项、文件交叉、扩大 authority、修改冻结 Replay/hash/readStep、使用历史绿轮或只给结论不指向证据，主协调立即拒绝并要求修订。小门正确性完成不代表性能或 P1 总门通过。

### 4. 实现窗口禁止性能采样并冻结中央文件

- 开发线程不得运行 PA6、formal pressure、300/120、消融或任何可被误读为正式性能的数据采样。
- PA6 runner/readStep、PA6-P 六文件、现有 Rule/Core/Bot/Replay/hash 和 175 路径归属默认冻结；只有 PA7 lane A 已登记的正式 runner hunk 可以在 PA7-0 签核后修改。
- `package.json`、共享 index、`tests/architecture.test.ts`、治理文档、build/reachability 和提交由主协调单写。
- A/B/美术只能写各自明确登记的新文件或已列出的唯一文件；新增路径必须先登记，不得先写后补。

### 5. 正确性冻结后建立本地候选，再执行联合性能门

所有 PA7 与 P1-PP 非性能实现、A1.0-v2 当前源码绑定和主协调接线完成后，执行完整 Node/Vitest/architecture/type/lint/docs/packages/build/coverage/Replay/golden/stress 正确性门。通过后主协调可按既有两阶段协议创建本地 `evidence-candidate` 中文提交，标记：

`formalGate=false / performance-pending / not-release-ready / do-not-push`。

在该 clean candidate 的同一 HEAD、tree、repository fingerprint、package lock、production module hash 和 content identity 上，性能顺序固定为：

```text
source freeze
  → PA6 ABBA×3（前20 case，三组消融，全部阈值）
    → PA7 正式 300 cases / 120 unique seeds / 2500 ticks / doubleRunsPerCase=2
      → 三端/设备/美术/真人与 P1 独立 advance
```

PA6 任一组失败即停止 PA7 正式运行，回到修复和新的 source freeze；不得为了“统一测试”在已知 PA6 红门上继续烧完整 300/120。任何性能后源码变化都会同时使 PA6 与 PA7 证据过期，必须在新 source 上从零重跑。

### 6. 提交和发布权限不变

- 开发和美术线程始终不得 commit/push。
- 本地 evidence-candidate 只能由主协调在完整非性能正确性门后创建，不表示 P1 或发布通过。
- 只有 PA6、PA7、Coverage、P1-PP、A0.3/A1、三端/七目标设备和 P1 独立审计全部通过，才可创建最终 attestation 并 push。
- 不 force push，不 amend 掩盖失败，不在本任务合并 `main`。

## 未采用方案

### 把当前 PA6 直接写成通过

没有清洁 ABBA×3，且已有正式 CPU 红证据；会伪造性能结论，拒绝。

### 沿用历史三轮再补两轮

来源和环境不一致，无法证明连续同源，拒绝。

### 先进入 P2 正式 Mode

P1 的 Presentation、Platform、性能、真人和美术硬门仍未关闭；会越过产品阶段，不属于用户授权，拒绝。

### 所有开发结束后只运行 PA7、不再运行 PA6

PA6 的消融归因和余量门不能由 300/120 总值替代；联合门必须保留两者，拒绝。

### 现在创建提交以获得 clean 环境

PA7/PP 尚未实现且工作树包含多个历史签核批次；提前提交会把未验收状态固化为候选，拒绝。只有最终非性能正确性门通过后才允许主协调创建本地 evidence-candidate。

## 影响与代价

- 节省一次中间 PA6 执行，避免后续源码变化让其必然过期。
- PA7/PP 实现可能在最终性能前积累更多改动；若 PA6 失败，修复和回归成本高于原顺序。
- 通过零重叠写域、串行 PA7-0、六维自检、中央文件单写、完整正确性门和单一 source freeze 限制该风险。
- 性能结论更接近最终产品源码，但不能提前得到早期性能风险反馈；开发期间必须避免无证据的热路径扩张。

## 验收条件

本 ADR 的顺序调整只有在以下事实均保持时有效：

1. 三线程回执自身角色、对方 threadId、新 gate 和精确写域；
2. PA7-0 先于 A/B 并行代码完成并由主协调签核；
3. PA7、PP 和美术每个小门均有六维自检、变更治理和主协调独立验收；
4. P2/A2、commit/push 和正式性能采样没有越权；
5. 最终同一 clean source 上 PA6 先通过，再执行并通过 PA7；
6. 任一源码或证据身份漂移都会失败关闭并从 source freeze 重来。

## 回滚

若延期导致文件交叉、热路径不可控或正确性门无法收敛，停止新实现并按各 lane 的精确反向 patch 回滚，恢复“PA6 首次通过后再开放 PA7/PP”的原顺序。不得使用 reset/checkout 覆盖共享工作树；已经产生的失败轮和被拒绝候选保留在台账。

## 关联决策

- [ADR-111](111-arena-v2-action-read-model-performance-boundary.md)：read model 与性能可证伪边界。
- [ADR-113](113-arena-v2-supply-presentation-adapter-boundary.md)：P1-PP0/PP1 adapter 合同。
- [ADR-114](114-arena-v2-art-evidence-versioning-and-joint-gate.md)：A1.0 版本化和开发—美术联合门。
- [生产化分阶段开发与治理计划](../architecture/arena-v2-production-development-plan.md)：产品阶段和共同硬门。
- [P1 实施状态台账](../architecture/arena-v2-p1-implementation-ledger.md)：PA7/PP 文件域、评分和运行证据。
