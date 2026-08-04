# ADR-116：正式生存 Composition 身份使用 provenance reader

## 状态

Accepted

## 日期

2026-08-03

## 背景

PA7 正式证据必须证明实际运行的是生产 `arena-v2-survival-supply.v1` Composition，并绑定其 `compositionContractHash`。该 hash 已由生产 Composition 根据正式 Supply Definition、三个 spawn spec、Bot Profile、难度和 player/Bot 角色生成，再交给 Core 的 MatchRead binding。

现有边界刻意不从 package index 导出 `buildArenaV2SurvivalBotCompositionContract` 或 `createArenaV2SurvivalBotCompositionContractHash`。如果正式 runner 自行复制 builder、深导入内部函数或重新散列同名字段，它只能证明“计算出一个值”，不能证明运行中的 Session 确实消费了同一合同；同时会破坏 Composition 对 descriptor 的所有权。

PA7-0.1 还确认，扩大 Session/Core API 来公开 binding、reader 或逐 tick authority hash 既无必要，也会扩大生产热路径和 capability 面。

## 决策

由生产 survival Composition 在 Session 完成原生类型、owner transfer 和 surface 校验后，将一个最小冻结身份登记到模块私有 `WeakMap<LocalMatchSession, Identity>`。身份只包含：

- schema version；
- composition ID；
- participant IDs；
- map definition ID；
- content selection hash；
- composition contract hash。

package index 只导出 `readArenaV2SurvivalSupplyBotCompositionIdentity(session)` 和只读身份类型。reader 必须：

- 只接受原生 `LocalMatchSession` prototype；
- 只接受已在同一生产 Composition 成功登记的实例；
- 使用模块初始化时捕获的原生 Session 方法验证实例仍可用；
- 对 fake、clone、普通 QuickMatch Session、destroy 后 Session 和 prototype 漂移失败关闭；
- 返回同一个深冻结身份，不返回 Core、binding、reader、hash builder 或可写引用。

PA7 runner 必须把该身份与 Replay/World 的 participant、map、config/content 信息交叉验证，再写入 manifest identity。reader 本身不代表 PA7、性能或发布通过。

## 被否决方案

### 从 package index 导出纯 hash builder

否决。调用方仍可用自报输入生成看似合法的 hash，无法证明运行 Session 的真实 provenance，也违反既有 deep-only 边界。

### 由 runner 复制合同结构并手工散列

否决。复制逻辑会与生产 Composition 漂移，并把证据生产者变成身份权威。

### 在 `LocalMatchSession` 或 `MatchCore` 增加通用 binding/authority introspection

否决。PA7 只需要最小 Composition 身份；通用 introspection 会扩大所有模式的公开 capability、生命周期和重入面。

### 把身份字段塞入 `WorldSnapshotV2` 或 Replay V5

否决。Composition 身份不是每 tick 世界状态，也不是当前 Replay schema 的 authority state；为单一证据用途修改两份稳定合同会产生不必要迁移。

## 后果

- 正式 runner 可以取得与真实生产 Session 绑定的 `compositionContractHash`，不再手工重算。
- `WeakMap` 不持有强 Session 引用；destroy 后 reader 失败，GC 后记录自然消失。
- 新身份 reader 是公开但极窄的治理 API，必须维持 exact-key、freeze、provenance 和 prototype-drift 测试。
- 任何未来 Composition identity 字段变更都需要 schema 升级和 PA7 合同同步，不得静默追加字段。
- 本 ADR 不授权性能运行、P2/A2、commit 或 push。

## 验证

- 正式 Session 的身份字段与 Composition 内部 descriptor 一致且重复读取保持对象 identity。
- fake/clone、普通 Session、destroy 后 Session、own shadow 和 prototype drift 反证。
- 既有 PA3b outer wiring、architecture、typecheck、lint 与 `git diff --check`。
