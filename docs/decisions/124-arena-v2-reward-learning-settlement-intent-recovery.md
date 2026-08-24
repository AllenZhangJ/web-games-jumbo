# ADR-124：Reward/Learning 结算意图与跨重启恢复

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

Arena 当前把普通奖励写入 Reward Profile，把武器、地图、模式与挑战成长写入 Learning Profile。两份 Profile 使用独立 CAS 槽位和独立租约，因此它们没有、也不应伪装成一个跨 Profile 原子事务。

既有正式候选按 Reward 后 Learning 的顺序结算。若 Reward 已持久化，而 Learning 写入返回不确定或进程退出，下一次启动必须能判断是否应该补写 Learning；反之，如果只完成终局预计算但 Reward 从未到账，重启后不得凭持久化的 Learning Grant 单独增加成长。

仅保留内存中的开局 Learning 基线不能覆盖进程退出、页面刷新或宿主销毁，因此需要一个在第一次 Profile 写入前完成的持久结算意图。

## 决策

### 1. 两份 Grant 都必须在第一次写档前准备完成

`ModeRewardCommitterV2.prepare()`只读取规范 Reward Profile并解析不可变 Reward Grant；`ModeProductSessionV2.prepareReward()`校验其Result Authority身份。Learning Terminal Handoff在同一终局Runtime证据上先解析不可变Learning Grant。

Learning Bridge在任何Profile写入前发布唯一结算意图：

- Reward Grant；
- Learning Grant；
- 两者相同的`resultAuthorityHash`。

任一准备、身份或持久化失败，都必须发生在Reward写入之前。

### 2. 开局前持久化Learning基线

本地三模式宿主在把开局意图交给内层Session之前，读取并持久化当前Learning Profile基线，同时交给内存Recovery Owner。未确认开局、畸形开局输出或构造失败均保留证据并失败关闭，不允许下一局覆盖。

只存在基线、没有双Grant的台账记录代表没有进入可付款终局；重启时可安全删除，不写任何Profile。

### 3. 持久台账同时保存基线与双Grant

`ArenaV2LearningSettlementIntentJournalCandidateV1`只保存一个pending意图：

- Learning Profile Definition身份；
- 开局前Learning Profile基线；
- Reward Grant；
- Learning Grant；
- 全量payload hash。

台账使用独立同步存储租约、写后读回和删除后读回，不覆盖上一局未清意图。Reward/Learning双Grant必须同时存在并共享同一Result Authority hash。

### 4. 重启恢复先以Reward Profile为事实门

重启打开两份Profile和台账后：

1. 仅有基线：删除意图，不写Learning；
2. 双Grant存在但Reward Profile没有对应Reward Grant：删除意图，不写Learning；
3. Reward Profile已经包含对应Reward Grant：检查Learning Profile；
4. Learning尚未包含Grant时执行一次幂等提交，已包含时从基线、当前Profile和同一Grant恢复准确结算投影；
5. 后处理完成后按Reward/Learning两个Grant ID确认并删除台账。

因此，持久Learning Grant本身不是写入授权；Reward实际到账才是恢复Learning的必要条件。

### 5. 确认失败必须阻止下一局

若两份Profile已完成，但台账删除未被读回确认，当前宿主进入粘性失败关闭。证据继续保留，只有销毁并由下次启动重新核对Profile后才能恢复。不得在未确认清理时开始下一局或覆盖pending意图。

### 6. 不宣称跨Profile原子事务

本方案是有顺序、可恢复、幂等的双Profile协议，不是数据库事务。Reward可能短暂早于Learning可见；台账负责把该中间态恢复到闭合状态。实现、文档和治理标记必须保留`crossProfileTransactionClaimed=false`。

## 影响

- Reward已到账而Learning未完成的进程退出可以跨重启恢复。
- 终局只完成预计算但Reward未到账时，不会产生幽灵Learning成长。
- Reward/Learning Profile与结算台账均使用独立holder身份，显式same-owner takeover不再因holder等于owner而构造失败。
- Replay V6、Product Result V3、Reward/Learning Profile schema和玩法数值均不改变。
- 默认Composition、默认入口与生产Surface保持断开；所有测试、类型、构建、压力、性能、设备和真人验证仍为`not-run`。

## 未采用的方案

### Reward成功后才生成Learning Grant

这样会把Learning Authority解析失败放到第一次持久写入之后，无法保证结算意图完整，也无法在进程退出后证明应补写哪一个Grant。

### 只持久化Learning Grant

无法区分“Reward已提交后崩溃”和“Reward写入前崩溃”，可能在未付款局中凭空增加Learning进度。

### 把两份Profile合成一个大Profile

会扩大现有schema、迁移、所有权和写放大范围，并破坏Reward与Learning已经明确的职责边界。

### 失败时直接清除台账

如果写入实际成功但返回不确定，清除证据会永久丢失恢复能力。所有删除必须以当前Profile事实和读回确认为前提。

## 回滚

默认产品路径仍关闭时，可按以下顺序回滚：

1. 移除本地宿主对持久结算意图台账的构造、开局基线和启动恢复接线；
2. 将Bridge回退为仅发布Learning Grant，并移除Reward预准备；
3. 删除`ModeProductSessionV2.prepareReward()`与`ModeRewardCommitterV2.prepare()`；
4. 删除结算意图台账和P6治理登记；
5. 保留原内存Recovery Owner与Reward后Learning的显式候选顺序。

回滚不得把未完成结算解释为成功，不得清除已存在的持久pending证据，也不得开放默认入口。

## 关联决策

- [ADR-118](118-arena-v2-development-first-deferred-validation-window.md)：开发优先与延期验证窗口。
- [ADR-119](119-arena-v2-continuous-development-with-deferred-gates.md)：连续开发与集中门禁。
- [ADR-123](123-arena-v2-mode-driver-terminal-settlement-identity-v2.md)：终局结算绑定开局Mode Driver身份。
- [ADR-125](125-arena-v2-recoverable-settlement-result-and-retry.md)：既有结果页上的原地重试、只读失败态与重启回执。
- [P6实施状态台账](../architecture/arena-v2-p6-implementation-ledger.md)。
