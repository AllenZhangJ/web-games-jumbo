# ADR-121：Race 重生采用双地图公共兜底锚与单一保护候选

## 状态

提议：`production-unreachable / code-written-not-run / protection-balance-approval-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

Race 已冻结 60 tick 准备期、180 tick 重生等待和最近合法安全锚语义。真实竞速纵向 Runtime 已使用 30 tick 重生保护，但三模式 Registry 的显式构造链仍提交 1 tick 测试值；两张 KZ 路线又使用各自的首段锚 ID，使单个 Respawn Policy 无法稳定表达跨地图 fallback。另一个合同耦合是：`initialSafeAnchors`既代表2–4名玩家互不重叠的起跑格，也被当作最新安全锚失效后的规则兜底。

继续保留这些差异会导致 Registry、config hash、Replay 与真实 Runtime 对“同一场Race”的重生规则认知不同。该缺口可以复用已经存在的真实 Runtime 行为收敛，不需要新猜平衡值；但当前仍没有拥挤、真机和真人证据，因此不能把30 tick标记为最终平衡批准。

## 决策

### 1. 建立唯一 Race 重生候选

`arena-product-content`提供版本化 Race Respawn Policy候选：

- 准备结束后掉落等待 `180 tick`；
- 重生后保护 `30 tick`；
- 重生次数不设局内上限；
- 锚策略固定为 `latest-valid-safe-anchor`；
- 最新安全锚失效时使用双地图共享的Race专属语义fallback能力；
- 状态固定为 `production-unreachable / protection-balance-approval-not-run / hardGate=false`。

三模式 Registry按完整 Respawn Policy内容hash拒绝ID、等待、保护、次数或fallback锚漂移。竞速Runtime的mode policy content identity同时绑定该候选content hash。

### 2. 起跑格与规则fallback分离

KZ Race Map Adapter保留`createInitialSafeAnchors()`，继续按participant稳定顺序映射2–4个独立起跑格；新增只读`fallbackSafeAnchorId`，只表达Respawn Policy的规则兜底。

RaceMode fixture因此分别持有：

- `initialSafeAnchors`：开局出生位置和初始participant状态；
- `fallbackSafeAnchorId`：最新安全锚无效时的统一兜底。

禁止为了统一fallback而让所有参与者重叠出生，也禁止继续把某个participant的起跑格当成全局规则身份。

### 3. 两张地图注册同一Race语义能力

基础长图与折返图都注册：

`arena-v2.map-capability.race-respawn-fallback-safe-anchor.candidate.v1`

该能力在每张地图中绑定自身首段安全surface和位置。候选必须证明锚存在并位于`survivalRole=safe`的路线段；正常比赛仍优先使用玩家最近提交的合法安全锚，只有该锚失效时才回退公共能力锚。

Survival首次复活继续使用ADR-120的独立语义ID。即使两类锚当前坐标相同，也不能复用身份，以避免以后调整一种模式时隐式改变另一种模式。

### 4. 硬时限继续未决

本决策不冻结Race hard limit，不改变`no-finisher`语义，不接默认Registry、Composition或入口，不修改输入、武器、排名、奖励、Profile、Result V3或Replay V6 schema。后续若调整30 tick，必须形成新版本化候选并重做Registry、config/Replay、恢复、表现、平衡和治理证据。

## 未采用的方案

### 保留Registry 1 tick、Runtime 30 tick

同一Mode会有两套规则身份，无法证明回放和结算对应真实运行值。

### 复用基础长图的`kz-a-route-start`

会让折返图的产品Policy引用另一张地图的私有锚ID，不具备跨地图闭包。

### 复用Survival首次复活锚

两种模式当前可能落在相同位置，但Race是“最近安全锚失效后的路线兜底”，Survival是“第一次掉落后的固定恢复点”，语义不同。

### 用公共fallback替代全部起跑格

会让2–4名玩家重叠出生并改变竞速体验，违反本批只收敛规则身份的边界。

## 影响

- Race Registry、真实Runtime和mode policy content identity使用同一180/30重生候选。
- 两张地图拥有共同语义、地图自有位置的fallback能力。
- Race fixture增加必填`fallbackSafeAnchorId`，与`initialSafeAnchors`职责分离。
- KZ Route内容身份会因首段respawn anchor与新增能力锚变化；下游必须消费重算hash，不能硬编码旧值。
- 集中验证仍需覆盖29/30/31保护边界、179/180/181等待边界、起跑首帧掉落、latest anchor失效、双地图、2/3/4人拥挤、checkpoint/Replay、设备和真人可读性。

## 回滚

默认产品路径仍关闭时，可删除Race候选与语义能力ID、移除双地图能力锚，并撤回fixture的`fallbackSafeAnchorId`字段；回滚后必须把保护值恢复为显式未决，不能静默退回1 tick或把基础长图锚当作跨地图默认。

## 关联决策

- [ADR-104](104-arena-v2-kz-race-multiplayer-contract.md)：Race准备、终点和180 tick重生研究边界。
- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：Mode/Policy Definition边界。
- [ADR-120](120-arena-v2-survival-first-respawn-single-source-candidate.md)：Survival首次复活独立语义候选。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
- [P3实施状态台账](../architecture/arena-v2-p3-implementation-ledger.md)。
