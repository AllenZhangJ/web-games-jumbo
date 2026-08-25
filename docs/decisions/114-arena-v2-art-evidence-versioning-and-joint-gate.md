# ADR-114：供给美术证据采用不可变版本与开发—美术联合签核

## 状态

已接受版本化与联合签核机制。PP0/PP1及后续非性能候选保持既有签核；2026-08-03的A1.0-v2外部94分只属于当时source。SF-A1.0V2R已在最终clean source `5e84714`重建28源、25 fixture、51项联合规格与90/90隔离矩阵，并于2026-08-25由主协调独立复验后以`current-final-source-contract / coordinator-approved / 94/100 / hardGate=false`重新签核。机器包继续保持`coordinatorSignOff=false / hardGatePassed=false`，因为机器证据不能自签外部裁决。本 ADR 不代表 A0.3、A1.1批准、代表样件、正式资产、浏览器/GPU、设备、性能或 PA6/PA7 通过。[ADR-115](115-arena-v2-deferred-joint-performance-gate.md)仍要求独立运行证据。本文中“只授权三个 v2 文件”或“PP2/PP3 未开放”的表述是历史快照，当前进度以 [P1 实施台账](../architecture/arena-v2-p1-implementation-ledger.md)顶部状态和[生产计划](../architecture/arena-v2-production-development-plan.md)为准。

## 日期

2026-08-02

## 背景

A1.0 v1 在 `dd786a922625472643b2f6c96f80c7049a57d3e2` 上以 94/100 完成历史合同签核，机器包把 15 个源码、测试和 ADR 的 byteLength/SHA-256 固定为 sourceAudit。当前共享源码已经继续推进 Public Supply Projection、expired-held disposal、PA read model、Replay/Session 和治理：2026-08-02 正向复验发现 15 个来源中 10 个漂移，因此 v1 对当前源码是 `stale-upstream-evidence`，不能继续声称当前 hard gate 通过。A1.1 也因上游源码漂移处于同一红门。

与此同时，ADR-113 要求开发 B 先实现 PP0 presentation contract、PP1 stateful adapter 和 25 项机器矩阵；当前源码绑定包又必须审计这些新文件。如果要求“v2 先通过才能写 adapter”，v2 没有可绑定对象；如果要求“adapter 先最终签核再做 v2”，美术合同尚未对当前源码确认，形成循环门。

还存在三类治理风险：

- 原地更新 v1 hash 会抹去历史签核时的真实来源，使旧证据无法复核；
- 在 adapter 之前创建空 v2、预填 hash 或计划分，会把未来工作冒充交付；
- 让开发线程同时修改美术机器包和生产 adapter，或让美术线程修改运行时测试，会破坏独立反证和文件零重叠。

## 决策

### 1. 历史证据不可变，新事实只追加新版本

A1.0 v1 JSON、v1 checker 和 v1 fail-closed 脚本永久保留其历史身份；不为当前源码原地更新 baseline、sourceAudit、status、score 或 hard gate。当前源码需要新的追加版本，候选路径固定为：

- `docs/quality/art/supply/arena-a1.0-supply-presentation-contract-v2.json`
- `scripts/art/check-arena-supply-presentation-contract-v2.ts`
- `scripts/art/test-arena-supply-presentation-contract-v2-fail-closed.ts`

v2 必须显式记录 supersedes 的 v1 `id/path/hash/baselineCommit`，但不得把 v1 改写为 superseded 后不可验证；“supersedes”只表示当前适用版本，不删除历史事实。线程回执、PP0/PP1 候选和真实 source artifact 出现前，不创建上述文件。

### 2. 机器包避免自引用，只绑定可复算来源集合

v2 sourceAudit 逐项记录 repository-relative canonical path、byteLength 和 SHA-256，不在自身 JSON 中记录全仓 fingerprint 或自身 hash，避免自引用循环。至少绑定：

- 当前 authority、projection、equipment timeline/system、MatchCore、Replay、Session 与相关 599/600/601 测试；
- ADR-108、ADR-110、ADR-113 与本 ADR；
- PP0 `arena-supply-presentation-contract.ts`；
- PP1 `arena-supply-presentation-adapter.ts`；
- PP0/PP1 共用的 25 项 adapter 测试文件。

v2 checker 自身和 v2 JSON 的内容身份由最终 candidate attestation、文档索引与 clean repository fingerprint 绑定；机器包不伪造不可实现的自校验。任何 audited artifact 后续改变都会使 v2 正向检查失败，并要求追加新版本或在同一未签核候选中重建，不能沿用旧绿轮。

### 3. 写域严格分离

| 所有者 | 唯一允许写域 | 禁止项 |
|---|---|---|
| 开发 B | PP0 contract、PP1 adapter、共用25项Node测试；按ADR-113提交六维自检与变更治理 | 不修改v1/v2美术JSON/checker、A1文档、共享index、architecture、commit/push |
| 美术线程 | PP1候选出现后创建v2 JSON、v2 checker/fail-closed脚本；提交Cue、静音/低动效、失败回退与来源反证 | 不修改adapter、authority、测试断言、tick/sequence/拾取/替换/终局语义，不预填未来通过状态 |
| 主协调 | ADR、A1文档/矩阵/索引、共享index、architecture与最终命令/评分/提交 | 不代替开发或美术自检；未完成联合门前不接公开出口、不commit/push |

任一文件跨写域、同一路径并行修改或线程未申报的新增文件都直接使联合门失败。

### 4. 采用候选—重建—联合签核顺序关闭循环

顺序固定为：

```text
ADR-113/114 设计输入
        ↓
开发 B：PP0/PP1 候选 + 25项 Node 红绿 + 六维自检
        ↓
美术线程：A1.0-v2 当前源码绑定包 + Cue/回退反证
        ↓
主协调：逐文件独立复验 + 联合评分
        ↓
PP1 completed；随后才允许 PP2/PP3
```

开发 B 可以在 ADR-115 的条件实现窗口内、经主协调确认线程回执和精确写域后，使用 v1 固定的 25 个 fixture ID 和 ADR-113 形成 PP0/PP1 **候选**；PA6 此时仍为 deferred/formalGate=false，历史 v1 不能签当前 PP1。美术线程只能在候选文件与测试真实存在后创建 v2。v2 正向和 fail-closed 通过也不自动签 PP1：必须与当前 adapter 测试、双方自检和主协调复验共同组成联合门。

### 5. v2 最低机器门

具体 exact-key schema 由美术线程逐字段反证后交主协调冻结，但不得弱于以下最低门：

- identity：schema/id/status/reviewedAt/supersedes/scope；未知、缺失、额外或 future schema 失败关闭；
- sourceAudit：路径防逃逸与 symlink、唯一 path、byteLength/SHA-256、真实文件、稳定顺序和 coherent substitution 负向探针；
- adapter contract：Marker/Cue/View/options/start/update/debug/destroy exact-key，half-open sequence 闭包，committed/snapshot-resync/terminal-failed 三类结果；
- event routing：六类 A1.0 equipment shape、已登记普通事件旁路、未知类型拒绝、完整 canonical duplicate hash；
- fixture coverage：25 个固定 ID 精确一一出现，不允许改名、合并、缺项或用 PP3/A1 视觉测试替代 Node 语义测试；
- downstream gates：A0.3、A1.1、representative specimen、Blockout、正式 VFX/音频、设备、真人和 Final 在各自证据完成前保持 false；
- score：总分≥90且每维≥80%只是必要条件；source/test/self-check 任一红时 hard gate 必须 false。

fail-closed 脚本必须先证明正向 fixture 在隔离临时根通过，再逐项篡改；正向基线失败时不得把后续未执行探针记为通过。它至少覆盖 extra/missing/future、baseline/supersedes substitution、source hash/size/path/symlink/coherent swap、25项缺失/重复/改名、状态/分数/下游门抬高和回滚边界弱化。

### 6. 最终 clean source 仍由候选提交协议证明

v2 sourceAudit 证明列出的输入字节一致，不等于全仓 clean。PP0/PP1/A1.0-v2 与其它已验收批次进入主协调本地 evidence-candidate 后，最终 attestation 必须重新绑定 HEAD、tree、repository fingerprint、package lock、production/test module hash 和 sourceDirty=false；任何字节变化都会使 PA6、PA7、v2 或设备证据按其依赖重新执行。

## 未采用方案

### 原地刷新 A1.0 v1 hash

会抹去 2026-07-28 签核时的来源身份，让历史报告无法复核；拒绝。

### adapter 实现前先创建空 v2

没有 PP0/PP1 真实文件和测试，只能预填路径、hash、状态或分数，违反证据必须来自实际产物；拒绝。

### 等 v2 最终通过后才允许写 adapter

v2 又要求绑定 adapter 与测试，形成不可执行循环；改用候选—重建—联合签核。

### 在 v2 中记录全仓 fingerprint 或自身 hash

修改 v2 本身会改变被记录身份，形成自引用；全仓 clean 由后续 candidate attestation 单独承担。

### 由同一开发线程同时维护 adapter 与美术证据

缺少独立反证且更容易同步放宽实现和验收；拒绝。

## 影响与代价

- 增加一个版本化机器包和两份检查脚本，但保留历史可追溯性并消除循环门。
- PP1 需要开发、美术、主协调三方联合门，不能只凭 Node 绿或美术合同分数完成。
- 历史 v1继续作为不可变设计输入；A1.0-v2最终source合同已取得外部协调签核，A1.1拥有最终source机器候选，但A0.3真人、A1.1协调/逐项批准、样件与运行门仍关闭，不能开放代表样件。
- 每次 audited source 改变都可能要求重建 v2；这是严格 source identity 的预期成本，不得通过放宽 hash 规避。

## 验收条件

以下联合验收条件已于 2026-08-03 关闭；它们不替代 PA6/PA7、设备、A0.3、A1.1 或代表样件外部门：

1. 开发 B 和美术线程分别回执角色、门禁、写域与对方 threadId，且无文件重叠。
2. PP0/PP1 候选与25项 Node 证据真实存在，开发 B 提交六维自检加变更治理。
3. 美术线程提交 v2 exact-key 逐字段反证、Cue/回退确认、正向与 fail-closed 结果，不改写 v1。
4. 主协调独立复验 sourceAudit、25项映射、dependency/host-free/production reachability、type/lint/test/architecture/docs/diff。
5. 联合评分总分≥90且各维≥80%，PA6、A0.3、A1.1、设备等外部门仍按各自状态诚实保留。
6. 未经主协调批准不得 commit/push；签核 PP1 也只开放下一登记小门，不开放正式生存或发布。

## 回滚

当前已有 A1.0-v2 和 PP0–PP3b 非性能实现。安全回滚必须保留 v1 历史机器包，按开发、美术、协调三份写域逆序撤回 v2 JSON/checker/fail-closed probe、PP0/PP1 联合实现与对应治理引用，并显式使依赖该 sourceAudit 的后续 PP2/PP3 证据失效；禁止 reset/checkout 覆盖共享工作树。

## 关联决策

- [ADR-108](108-arena-v2-survival-auto-replace-and-expiry.md)：权威供给生命周期。
- [ADR-110](110-arena-v2-expired-held-release-disposition.md)：过期 held 释放边界。
- [ADR-113](113-arena-v2-supply-presentation-adapter-boundary.md)：PP0/PP1 adapter、Cue、sequence 与失败语义。
- [ADR-115](115-arena-v2-deferred-joint-performance-gate.md)：延期本轮 PA6，并在最终同源候选上联合执行 PA6/PA7 性能门。
- [A1.0供给表现合同](../architecture/arena-art-supply-presentation-contract-a1.0.md)：历史 v1 和当前重建门。
- [P1实施台账](../architecture/arena-v2-p1-implementation-ledger.md)：阶段、文件域、评分与提交协议。
