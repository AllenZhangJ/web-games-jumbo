# ADR-126：结算写档按可重试、重启恢复与合同失败三类处置

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

ADR-124、ADR-125 已建立 Reward/Learning 双 Grant 意图、跨重启恢复、既有结果页原地重试和只读重启提示。但若上层只读取任意错误对象上的`recoverable`字段，或者把所有非可恢复 Profile Service 错误都解释为“重启即可”，会产生两类错误：

1. 普通代码错误、非法仓储返回、异步端口、未来版本或双槽身份冲突可能被伪装成玩家可恢复问题；
2. 写调用抛错但实际已落盘时，当前进程可能重复提交同一 Reward/Learning Grant。

## 决策

### 1. Profile Service 提供稳定三分类

Reward 与 Learning Profile Service 的持久化错误使用稳定只读字段表达处置：

- `recoverable=true / restartRequired=false`：租约暂时占用、明确未提交的 CAS 冲突、或读回确认是其他并发 revision；允许保留同一结算意图并原地重试；
- `recoverable=false / restartRequired=true`：明确的 indeterminate write、提交已报告成功但持久快照无法读回；当前进程停止写入，只能由下次启动依据持久事实恢复；
- `recoverable=false / restartRequired=false`：未来 schema、同 generation 不同 payload、非法 commit 返回、异步 thenable、无效 Profile 结构、同一 Result 绑定不同 Replay Grant，以及普通程序错误；立即失败关闭并清理。

`recoverable`与`restartRequired`不得同时为`true`。

### 2. 写后读回决定幂等结果

Reward/Learning 写调用抛错后，仅在仓储仍能返回规范快照时判断结果：

- 快照等于本次预期 Profile：本次提交已完成；
- 快照包含同一 Grant：按 duplicate 完成，不重复增加经验、解锁、收藏或熟练；
- 快照是其他合法 revision：更新本地最后已知快照并返回可重试冲突；
- 快照不可读或仓储明确抛出 indeterminate write：要求重启；
- 快照结构或身份非法：失败关闭。

仓储明确返回`committed=false`代表本次调用没有完成写入。此时后续快照暂不可读可原地重试；仓储明确返回`committed=true`后快照不可读则必须重启。

### 3. Bridge 只识别受控错误链

Mode Session Bridge 最多沿16层自有数据字段`cause/originalError`查找已知 Profile Service/Repository 错误。分类过程遇到 Proxy、访问器、循环链或异常描述符时返回“无法识别”，随后立即失败关闭。

Bridge 不接受普通错误对象自行添加的`recoverable`或`restartRequired`字段。Repository busy可重试；indeterminate write要求重启；未来版本与 save conflict不进入玩家恢复流程。

ADR-127 将该处置器提升为实时 Bridge、启动 Journal 与本地 Host 的共享单一来源，并修正启动恢复曾经“所有错误都要求重启”的过宽行为。

### 4. 最后已知快照只用于只读说明

Service失败后可以读取最后一个已经规范化的内存快照，用于结果页或首页说明，但该快照不能证明不确定写入成功，也不能重新开放选择、导航、偏好、结算或下一局写操作。

## 影响

- 普通合同缺陷不会被“请重试/请重启”提示掩盖。
- 写后抛错和同 Grant 并发提交不会重复发放 Reward 或 Learning。
- Reward 与 Learning 使用相同处置语义，但仍是两个独立 Profile，不宣称跨 Profile 原子事务。
- 不改变奖励数值、成长阈值、Profile/Replay/Result schema、11个页面、操作按键或默认入口。
- 测试源码和延后清单已登记；测试、类型检查、构建、压力、性能、设备与真人验证均未运行。

## 未采用的方案

### 所有 Profile Service 非可恢复错误都要求重启

未来版本、存档身份冲突或非法返回不会因重启自动变正确，这会掩盖必须修复的缺陷。

### 只按错误文案分类

文案不是稳定合同，且会把本地化或包装错误误判为持久化状态。

### 写调用抛错后立即重试同一 Grant

宿主可能在完成写入后才抛错；未读回持久事实就重试存在重复累计风险。

## 回滚

1. 移除 Profile Service 的`restartRequired`字段和写后读回幂等判断；
2. 移除 Bridge 的受限错误分类器；
3. 恢复 ADR-125 之前的统一失败关闭行为；
4. 保留 ADR-124 双 Grant 意图，不得删除尚未确认的结算证据。

回滚不得把不确定写入冒充成功，也不得开放默认 Composition 或生产入口。

## 关联决策

- [ADR-124](124-arena-v2-reward-learning-settlement-intent-recovery.md)：双 Grant 结算意图与跨重启恢复。
- [ADR-125](125-arena-v2-recoverable-settlement-result-and-retry.md)：既有结果页原地重试与重启回执。
- [ADR-127](127-arena-v2-startup-settlement-recovery-shared-disposition.md)：启动恢复复用同一三分类。
- [P6实施状态台账](../architecture/arena-v2-p6-implementation-ledger.md)。
