# ADR-120：Survival 首次复活采用双地图同语义锚与单一数值候选

## 状态

提议：`production-unreachable / code-written-not-run / balance-approval-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

Survival 单一 shared-world authority 已经以私有常量运行“首次掉落等待 60 tick 后复活、复活后保护 30 tick，第二次掉落终局”，但三模式 Mode Registry 与产品文档仍把这些值记录为未决。继续保留两套状态会产生三个问题：

1. Runtime、Registry、Replay 和成长证据可能绑定不同的 Respawn Policy 身份；
2. 两张 KZ 地图使用不同起始锚 ID，固定引用其中一张地图的锚会让另一张地图无法合法复活；
3. 私有常量可以被后续实现复制，却没有内容 hash、回滚点或平衡批准边界。

本决策只收敛源码身份，不把已有实现值外推为最终平衡结论。测试、长局、拥挤、真人可读性和发布批准仍统一顺延。

## 决策

### 1. 建立唯一首次复活调优候选

`arena-product-content`提供版本化 Survival 首次复活候选，并固定：

- 玩家首次复活等待 `60 tick`；
- 复活保护 `30 tick`；
- 每局最多复活 `1` 次；
- 玩家第 `2` 次掉落终局；
- enemy 的 Respawn Policy 保持 disabled；
- 状态固定为 `production-unreachable / balance-approval-not-run / hardGate=false`。

候选同时持有完整 `RespawnPolicyDefinition`、Policy 内容 hash、双地图绑定和候选内容 hash。三模式 Registry 拒绝任何 ID、数值、角色策略、锚点或内容 hash 漂移，不再接受调用方自行复制的同值 fixture。

### 2. 两张地图注册同一语义能力锚

基础长图与折返图都注册同一个语义能力 ID：

`arena-v2.map-capability.survival-player-respawn-safe-anchor.candidate.v1`

该 ID 在每张地图中分别绑定地图自身的起始安全 surface 和位置。候选构造时必须证明锚存在、属于该地图路线，并位于 `survivalRole=safe` 的路线段；Runtime只按已冻结的 `mapDefinitionId`解析对应地图锚，不使用世界原点、空间最近点或另一张地图的固定 ID 兜底。

### 3. Runtime只消费候选与当前地图上下文

Survival shared-world authority删除本地 60/30 常量，统一消费产品内容候选。敌人激活和玩家复活的 segment 身份只从当前选择地图的 `mapContext.segmentBySurfaceId`读取，禁止继续引用基础长图的模块级 surface 映射。

### 4. 不开放默认产品路径

本决策不创建默认 Registry，不接默认 Composition、三端入口或发布资产，不修改操作按键、供给节奏、第二次掉落终局、奖励数量、Profile schema、Result V3或Replay V6 schema。后续若调整 60/30，必须产生新的版本化候选与内容 hash，并重做受影响的 Registry、Replay、恢复、成长、表现和治理证据。

## 未采用的方案

### 继续把 60/30 留在 Regression 私有常量

会让真实 Runtime 与产品 Registry 长期存在双重来源，无法证明终局 Replay 使用的是哪套规则。

### 直接复用 Race 的 180 tick

Race 的重入目标是返回路线进度，Survival 的目标是第一次掉落后的短暂恢复窗口；两者语义不同，不能为了复用数值而绑定。

### 为两张地图分别写两个 Respawn Policy

会把地图坐标差异上升为玩法规则差异。应共享语义能力 ID，由地图内容各自提供位置。

### 立即把 60/30 标记为发布平衡值

当前没有拥挤、长局、设备和真人证据，不能把源码收敛冒充平衡批准。

## 影响

- Survival 首次复活从“Runtime私有事实、Registry未决”收敛为一个可审计候选身份。
- 两张地图可以在不复制 Policy 的情况下提供各自合法安全落点。
- KZ Route Definition内容身份会因新增能力锚发生变化；所有下游只应读取重算后的内容 hash，不能硬编码旧 hash。
- 集中验证阶段仍必须覆盖 59/60/61、29/30/31、第二次掉落终局、保护期受击、双地图恢复、Replay/Checkpoint、失败注入、长局、性能、设备和真人可读性。

## 回滚

在默认产品路径仍关闭时，可通过删除首次复活候选与公共能力 ID、移除双地图语义锚，并让 shared-world authority恢复为显式未决而不是补默认值来回滚。不得用回滚恢复基础长图专属 segment 映射，也不得改写已存在的Replay或Profile数据。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：Mode/Policy Definition与未决数值边界。
- [ADR-119](119-arena-v2-continuous-development-with-deferred-gates.md)：允许继续开发并集中顺延验证。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
- [P3实施状态台账](../architecture/arena-v2-p3-implementation-ledger.md)。
