# ADR-113：供给表现使用只读投影与有界事件适配器

## 状态

已接受：`P1-PP0–PP3b non-performance completed / coordinator-approved / A1.0-v2 current-source-contract / hardGate=false`。PP0、PP1、PP2、PP3a、PP3b 已分别以 `95/100`、`96/100`、`95/100`、`97/100`、`96/100` 完成主协调签核；A1.0-v2 当前源码合同为 `94/100`。本 ADR 的 exact-key、只读投影、有界事件适配器、唯一宿主 owner、三端隔离构建和联合签核边界均已落地；[ADR-115](115-arena-v2-deferred-joint-performance-gate.md)仍要求在 clean source freeze 后执行 PA6/PA7，因此设备、正式性能、A0.3、A1.1、代表样件、P1 advance、commit 与 push 均未由本 ADR 放行。本文中描述“PP1 等待联合签核”或“PP2/PP3 未开放”的段落只记录 2026-08-02 至 2026-08-03 的签核前历史快照，当前进度以 [P1 实施台账](../architecture/arena-v2-p1-implementation-ledger.md)顶部状态和[生产计划](../architecture/arena-v2-production-development-plan.md)为准。

## 日期

2026-08-02

## 背景

ADR-108/110 已冻结三实体供给、靠近自动拾取、持有者原子替换和 600 tick 权威回收。当前生产链已经提供：

- `ArenaPublicSupplyProjection` schema v2，包含 snapshot tick/eventSequence、resync readiness、pending expiry identity、最多 3 个供给及权威 `remainingTicks`；
- `EquipmentSpawned/Recycled/Replaced/Expired` 的严格 schema v1 payload，以及普通 `EquipmentPickedUp` 权威事件；
- `MatchReadFrameV2` 和 Product Presentation 的 post-step world/event 输入；
- 通用 `PresentationEventWindow` 的有界事件 ID/sequence 去重。

这些能力仍不等于供给表现完成：

- 当前 `arena-presentation-runtime`、Product projector 和正式 Renderer 没有供给 adapter、marker、倒计时、替换/过期 Cue；
- `PresentationEventWindow` 不核对供给 payload，不保存 canonical payload hash，不检测从上一帧到当前 post-frame 的 sequence 缺口，也不能把 `EquipmentRecycled → EquipmentReplaced` 合成一条替换语义；
- 纯函数 projector 无法跨帧保存 recent hash、pending replacement pair 或 resync 状态；
- Renderer/DOM/音频若自行运行 10 秒墙钟或从坐标猜拾取，会形成第二 authority；
- P2 正式 Survival 尚未开放，直接把测试入口接进默认 Product 会形成 P1→P2 循环和发布面泄漏。

因此 P1 必须先建立可由 acceptance harness 驱动、以后由 P2 复用的生产级表现语义适配器，同时保持正式 Mode、HUD 导航和最终资产仍受后续阶段门约束。

## 决策

### 1. 合同、状态机、宿主资源分层

新增三个单向层次：

```text
ArenaPublicSupplyProjection V2 + authority events
                     ↓
arena-presentation-contracts：Supply View/Cue exact-key 合同
                     ↓
arena-presentation-runtime：有界、同步、无宿主的 adapter
                     ↓
P1 acceptance harness；P2 后续 Product projector/Renderer/Audio
```

- `arena-presentation-contracts` 只定义冻结数据、枚举和 validator；不得依赖 MatchCore、Session、Three.js、DOM、平台或资产加载器。
- `arena-presentation-runtime` 只持有 marker、recent event hash、pending replacement pair、sequence 和 resync 状态；不得持有 Mesh、Material、Audio、Timer、RAF、Platform handle 或 Renderer对象。
- Renderer/VFX/Audio 以后只消费稳定 View/Cue；资源池和宿主清理由各自表现 owner 管理，失败不能回写 adapter 或 authority。

### 2. 公开合同固定为版本化 exact-key 数据

`ArenaSupplyPresentationMarkerV1` exact-key：

`schemaVersion / supplyDefinitionId / supplyId / equipmentInstanceId / equipmentDefinitionId / position / spawnTick / expireTick / remainingTicks / labelSeconds`。

- marker 最多 3 个并按 `supplyId` 排序；ID 唯一，位置有限数。
- `remainingTicks=expireTick-snapshotTick` 且大于 0；`labelSeconds=ceil(remainingTicks/ticksPerSecond)`。
- 不公开“可选中”“确认”“卡片焦点”或任何拾取按钮字段。

`ArenaSupplyPresentationCueV1` exact-key：

`schemaVersion / id / kind / sourceEventIds / tick / sequenceStart / sequenceEnd / supplyId / equipmentInstanceId / participantId / previousEquipmentInstanceId / nextEquipmentInstanceId`。

- `kind` 只允许 `spawned / picked-up / replaced / expired`。
- 非适用身份一律显式 `null`，不使用缺失可选字段制造多种 schema。
- `replaced` 必须绑定同 tick、同 participant、同 supply/next identity 的 Recycled+Replaced 两个 source event；只产生一条 Cue。其后的同一 `EquipmentPickedUp` 仅作权威确认，不再产生第二条 Cue。
- `sourceEventIds` 对单事件 Cue 精确为 1 项，对 `replaced` 精确为按 sequence 排列的 2 项；单事件 `sequenceStart=sequenceEnd`，替换对要求 `sequenceEnd=sequenceStart+1`。`id` 固定为
  `<streamId>:supply-cue-v1:<sequenceStart>-<sequenceEnd>:<kind>`；`streamId` 只允许 `[A-Za-z0-9._-]+`，因此同一 stream 内不会因 supplyId 中的冒号产生歧义。
- `spawned/expired` 的 `participantId/previousEquipmentInstanceId/nextEquipmentInstanceId` 全为 `null`；`picked-up` 只有 `participantId` 非空；`replaced` 的
  `equipmentInstanceId=nextEquipmentInstanceId=供给目标实例`，`previousEquipmentInstanceId=被回收的旧持有实例`，三项必须互不矛盾。四类 Cue 的 `supplyId/equipmentInstanceId` 均不可为空。

`ArenaSupplyPresentationViewV1` exact-key：

`schemaVersion / streamId / status / snapshotTick / snapshotEventSequence / nextExpectedEventSequence / resyncedFromSnapshot / markers / cues`。

- `status` 只允许 `ready / resync-required`；resync 时 markers/cues 必须为空。
- cues 只属于本次成功提交，不作为永久状态；同一事件重复输入不能再次输出 Cue。
- 调试资源计数使用独立 `getDebugSnapshot()`，不混入玩家 ViewModel 或 Replay/hash。

`ArenaSupplyPresentationAdapterOptionsV1` exact-key 为
`schemaVersion / streamId / ticksPerSecond / lifecycleContract / recentEventCapacity`；schema v1 的正式 P1 值为 60 tick/s、recent ring 精确 64、lifecycle contract 来自冻结供给 Definition。
`ArenaSupplyPresentationStartInputV1` exact-key 为
`schemaVersion / snapshotTick / snapshotEventSequence / equipment / activeSupplyProjection`；
`ArenaSupplyPresentationUpdateInputV1` 在同一集合上只增加 `events`。两者均先复制冻结调用方数据，再做 schema、own data descriptor、安全整数、有限数、数组密度、唯一 ID、生命周期和投影连接校验。
adapter 只为正式供给流创建；普通 Duel 不创建实例，也不把 `activeSupplyProjection=null` 猜成 Survival 缺失。

`ArenaSupplyPresentationDebugSnapshotV1` exact-key 为
`schemaVersion / streamId / lifecycleState / snapshotTick / nextExpectedEventSequence / markerCount /
pendingReplacementPairCount / recentEventHashCount / acceptedEventCount / duplicateEventCount /
resyncCount / terminalFailureKind`。它只公开标量和稳定枚举，不公开内部 Map、hash 内容、事件或可变引用；在 `failed/destroyed` 后仍可读取以证明零泄漏，其他 start/update 操作均拒绝。

### 3. 初始化、增量更新和重同步使用 post-frame 身份

adapter 生命周期固定为 `created → active ↔ resync-required → destroyed`；另有 terminal `failed` 状态，进入后只允许 `getDebugSnapshot()` 与幂等 `destroy()`。

- `start()` 只允许调用一次。初始 post-frame projection 为 `ready` 时按 snapshot 重建 marker且不补发历史 Cue；为合法的 `not-ready-pre-expiry` 时直接进入
  `resync-required`、返回空 markers/cues并等待下一 ready snapshot，而不是抛出后让宿主猜状态。两种情况都把 `nextExpectedEventSequence` 设为该 projection 的
  `snapshotEventSequence`；该字段是 **下一条尚未产生的 authority sequence**，不是最后一条事件编号。
- `update()` 接收 post-frame 的 `snapshotTick / snapshotEventSequence / equipment / activeSupplyProjection / events`。所有 descriptor、数组、schema、有限数、安全整数、ID、projection/equipment 连接、payload 和资源上限先在临时状态验证；成功后一次性交换，不允许半提交。
- 对 active 增量帧，去除已验证的 retained duplicate 后，新事件 sequence 必须严格覆盖半开区间
  `[previousNextExpectedEventSequence, postSnapshotEventSequence)`，最后把 `nextExpectedEventSequence` 精确设为 post 值。输入数组必须 sequence 单调不减；同 snapshot tick/sequence 的无事件重读只有在 projection/equipment 投影相同的情况下合法且不生成 Cue。
- sequence 缺口、事件窗口外旧数据或显式 catch-up 不逐条补播；post projection ready 时直接无 Cue 重建并标 `resyncedFromSnapshot=true`，not-ready 时隐藏 marker、输出 `resync-required`，等待下一份 ready post-frame。
- 每个事件在任何语义处理前复制为 plain frozen data，并对完整副本计算 deterministic canonical hash。recent ring 每项绑定 `id/sequence/hash`；ring 内相同 identity/hash 为幂等重复，
  相同 id 或 sequence 但 hash/另一身份冲突进入 terminal `failed`，ring 外旧 sequence 不当作新事件而走无 Cue snapshot resync。

失败结果分成三类，禁止实现时混用：

1. `committed`：完整输入、连续事件和 post projection 全部一致，临时状态一次性交换并返回新 View。
2. `snapshot-resync`：输入结构合法但历史不可用或语义无法从事件唯一恢复，例如 gap、乱序、ring 外旧事件、单批 65–256 条、合法 strict terminal 未唯一命中 active identity、replacement 缺对/反序或 projection 暂时 not-ready。只有完整 ready post projection 验证通过时才能无 Cue 重建，否则原子清空玩家可见 markers/cues并保持 `resync-required`；不得保留可能过期的旧 View。单批超过 256 条属于结构资源上限破坏，按 `input-invalid` 失败关闭。
3. `terminal-failed`：future/missing/extra/mixed event shape、未知 event type、冲突 duplicate、恶意 descriptor/Proxy、非有限数、重入或内部不变量错误。失败前不交换 marker/pending/cue 领域状态，随后把生命周期置为 `failed`；调用不返回 View，宿主不能继续渲染旧 View，只有 debug 与 destroy 合法。

snapshot 是持续状态真值，事件只产生一次性 Cue。事件处理后的模拟 marker 集合必须与 post projection 逐字段一致；只比较数量或最终 hash 不够。

Presentation hot path 不得调用 `createArenaPublicSupplyProjectionAudit`、full-audit composer、legacy snapshot 或重新构造完整 WorldSnapshot。构造阶段只校验一次 lifecycle contract；每帧使用 PP0 自身有界 validator，
只扫描已投影 equipment 并交叉连接最多 3 个供给 item。这样既保持 exact-key/身份验证，也不把 PA2 已移出的昂贵 audit 重新塞回表现层。

### 4. 事件映射与普通事件旁路

- nested strict `EquipmentSpawned.payload` 新建 marker 和 `spawned` Cue；普通 Duel 的 flat Spawn 不进入 adapter。事件同时出现 nested payload 与 flat supply identity 时拒绝。
- active marker 的普通 `EquipmentPickedUp` 移除唯一 marker并产生 `picked-up` Cue；未命中 active marker 的普通拾取安全旁路，但同 instance definition 冲突拒绝。
- `EquipmentRecycled` 只建立有界 pending pair，不单独输出 Cue；紧随其后的匹配 `EquipmentReplaced` 原子移除 marker并输出一条 `replaced` Cue。每批结束 pending 必须为空，最多 3 对。
- `EquipmentExpired` 只在 `tick=expireTick` 唯一命中 active marker时移除并产生 `expired` Cue；`+601`重复或冲突事件不得重播。
- 其它 **已登记的** `ARENA_MATCH_EVENT` 类型只参加连续 sequence 与完整 canonical duplicate 证明，不进入供给状态；其类型专属 payload 由 authority 合同拥有，adapter 不复制第二套业务解释器。
  未登记 event type 必须 terminal fail。六种供给相关/普通 equipment shape 仍按 A1.0 精确 outer keys 校验；adapter 只读取自有 data descriptor，不执行未知 getter、Proxy coercion、thenable 或 Symbol 字段。

### 5. 有界资源与生命周期

正式上限固定为 3 markers、3 pending pairs、64 recent canonical hashes、1 个 current stream。每次 update 的逐事件语义处理上限固定为 64；PP0 结构救援窗口固定为 256，使 65–256 条批次能在计算 canonical hash 或运行任何事件语义前直接无 Cue snapshot-resync。超过 256 条失败关闭。该救援窗口不是更大的 recent ring，也不得被消费者当作可提高吞吐的事件批量。

adapter 不创建宿主资源，因此 `destroy()` 只失效 stream generation并清空 marker、pending pair、recent hash和标量 waterline，幂等；销毁后只有返回全零计数的 debug snapshot 与再次 destroy 合法。
未来 VFX/Audio/Renderer owner 必须在 adapter 之外证明 voice、particle、listener、GPU 和异步回调清零；A1.0 的整体 destroy 合同由 adapter debug 与宿主资源账本联合证明，不能把宿主资源塞回本 adapter 以绕过分层。

### 6. P1 acceptance harness 与发布隔离

P2 正式 Mode 未开放前，adapter 仅由 P1 acceptance harness 驱动。harness 使用正式 P1 Composition 的 read frame/events和生产 adapter，但：

- 使用独立 `p1-supply-acceptance` build attestation，不冒充当前只接受 `defaultEntry=product` 的生产 Build Manifest；
- 不创建 P2 Mode/Result/Reward/Profile，不增加用户导航、弹窗或操作键；
- 不进入 `scripts/build.ts` 默认 Product reachability、三端发布产物、正式资产清单或 release evidence；
- Web 双视口和微信/抖音六目标设备证据绑定同一 clean commit、adapter hash、A1 content hash 和平台 acceptance build。

P2 后续必须复用本 adapter，而不是在 Product projector、Renderer或HUD中复制第二套供给状态机；Product frame schema与正式 Survival接线由P2/P5另行版本化和验收。

#### P1-PP3a：post-frame bridge 与唯一宿主 owner

PP3 不得直接从三端 entry 各自拼装 Session、adapter 或资源。先在已冻结的 `src/entry/arena-p1-supply-acceptance-runtime.ts` 和对应 Node 测试中完成 PP3a，唯一依赖方向为：

```text
formal survival composition
        ↓
LocalMatchSession V2 current/post frame + events
        ↓
P1 acceptance runtime owner
        ↓
PP1 adapter
        ↓
injected host resource port
```

runtime 只拥有一个正式 `LocalMatchSession`、一个 PP1 adapter、一个 current pre-step frame、一个 last committed View、一个输入/帧循环和一个宿主资源端口。lifecycle contract 必须与 Session 来自同一份正式 composition options，由组合根一次派生；禁止调用方分别传入两份可漂移配置。每步先用 current pre-step frame 的 local sidecar 采样输入，再调用 `stepWithPresentationReadFrame`，只消费其原子返回的 post frame/events，并在 PP1 `update` 成功且宿主提交成功后才替换 last committed View。

终止 Cue 故意不含 position。PP3a 只能按 `supplyId + equipmentInstanceId` 从上一份 committed View 找到表现原点；找不到时只能发出通用非空间、可访问 fallback 或安全隐藏，禁止解析 instance ID、读取当前 post marker、按参与者距离猜坐标或回读 authority。输入源在 authority 尚未进入且 adapter 未变更前失败可窄范围重试；authority 已推进、adapter 已提交或宿主提交失败后必须永久 fail closed、停止调度并进入统一清理。重入保护须在读取外部 options/callback 前生效。destroy 尝试释放 Session、adapter、监听器、particle、voice、GPU/DOM handle 与异步回调；未清理项保留精确 ownership 供 retry，全部完成后重复 destroy 幂等。

#### P1-PP3b：三端宿主与隔离构建

PP3a 独立签核后，PP3b 才能实现 Web/微信/抖音 entry、CSS/HTML、独立 build 和 build test。三端 entry 只能创建各自 host port 并调用同一个 PP3a runtime，不得直接持有 Session 或复制 adapter/Cue 语义。输出只允许位于 `dist/arena-p1-supply-acceptance/{web,wechat,douyin}`，默认 Product、`scripts/build.ts`、release manifest、正式资产清单和用户导航均不可达。若实现确需新增独立 host-resource-owner 文件，必须先登记路径、依赖、测试和精确回滚 hunk，不能边写边扩大文件面。

## 未采用方案

### 只在纯函数 frame projector 中拼字段

无法保存 pending replacement、recent canonical hash、next sequence 或 resync 状态，重复渲染还可能重播一次性 Cue。

### 只复用 PresentationEventWindow

它提供通用 ID/sequence 去重，但不验证供给 payload、canonical 冲突、事件到 post-frame 的连续闭包或 Recycled/Replaced 语义配对，不能独立满足 A1.0。

### Renderer/DOM/音频自己跑 10 秒定时器

会受帧率、前后台和墙钟影响并形成第二 authority，直接拒绝。

### 等 P2 Mode 完成后再补 P1 表现

会让 P1 advance 依赖 P2、P2 又依赖 P1 advance，形成循环门；因此用隔离 harness 先证明 adapter。

### 复用通用 Stage 8 设备记录

Stage 8 不检查供给波次、599/600/601、替换、catch-up或一次性 Cue，只能提供重叠旁证，不能替代 P1 专属记录。

## 影响与代价

- 新增 presentation contract 和 runtime adapter 两个生产文件；共享 `index.ts` 由主协调在独立验收后接线。
- adapter 每帧需要验证最多 3 个 projection item 和有界事件批次；它不进入 authority CPU 指标，但仍须做资源/分配审计，不能依靠降低表现质量通过。
- P1 需要额外的 acceptance harness、build attestation、Web/设备证据和 A1 代表样件；这些工作不等于 P2 正式生存已上线。
- Product projector/Renderer 尚不因本 ADR 改 schema；P2/P5接入时必须显式版本化最终 Presentation Frame并重跑设备/可访问性。

## 验收条件

以下非性能验收条件已于 2026-08-03 由开发、美术和主协调联合关闭；它们不替代 PA6/PA7、设备、真人或正式资产外部门：

1. 开发 B 逐字段反证 Marker/Cue/View、options、start/update/debug/destroy合同、half-open sequence闭包与三类失败结果，并提交健壮性、竞态与确定性、兜底与失败关闭、边界与恶意输入、生命周期与清理、生产主流程六维自检及变更治理。
2. 美术线程确认四类 Cue、marker倒计时、resync隐藏、静音/低动效和资产失败 fallback 足以实现 A1.0，且不要求新增权威字段或墙钟。
3. A1.0 25项机器矩阵全部映射到可执行测试；至少包含 future/extra/missing、Proxy/accessor/Symbol/sparse/cycle、非有限数/安全整数、sequence gap/乱序/冲突重复、replacement配对、599/600/601、暂停/catch-up、新stream、构造/重入/destroy。
4. architecture证明 contracts/runtime 不依赖 Three.js、DOM、Platform、Session、Profile、Replay或 authority writer；production reachability证明 harness 不进入默认 Product/release。
5. 总分≥90且架构、行为、健壮/失败关闭、确定性、生命周期、迁移/治理各维均≥80%；任一硬门失败保持 candidate。
6. `npm run check:documentation`、受影响type/lint/test/architecture、完整非性能回归和`git diff --check`通过；性能、设备、真人、commit/push仍走P1总门，不能由合同签核替代。

## 回滚

当前已存在 PP0–PP3b 非性能实现和 A1.0-v2 绑定证据，不能再把“删除本 ADR”视为完整回滚。安全回滚必须按 PP0 contract、PP1 adapter、PP2 verifier、PP3a runtime、PP3b 三端隔离宿主与对应测试/治理记录的精确 manifest 逆序撤回，并同步使 A1.0-v2、P1 台账、生产计划、美术矩阵和文档索引失效；禁止 reset/checkout 覆盖共享工作树。

## 关联决策

- [ADR-108](108-arena-v2-survival-auto-replace-and-expiry.md)：供给生成、自动拾取、原子替换与600 tick回收。
- [ADR-110](110-arena-v2-expired-held-release-disposition.md)：过期 held 生命周期和释放时不可回到世界。
- [ADR-111](111-arena-v2-action-read-model-performance-boundary.md)：MatchReadFrame V2、post-step Presentation读路径与性能证据边界。
- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：P2正式Survival必须复用本adapter并版本化V3身份。
- [ADR-115](115-arena-v2-deferred-joint-performance-gate.md)：本轮延期 PA6，先完成 PP 与 PA7 非性能实现，再在最终同源候选上执行联合性能门。
- [A1.0供给表现合同](../architecture/arena-art-supply-presentation-contract-a1.0.md)：四类Cue、10秒、599/600/601、低动效/静音和25项机器矩阵。
