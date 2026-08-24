# ADR-127：启动结算恢复复用共享持久化三分类

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

ADR-126 已要求实时 Reward/Learning 结算把 Profile 持久化失败分为“当前进程可重试、必须重启、合同失败关闭”。但 P6.52 的启动 Journal 仍把 Reward 已到账后的所有 Learning 恢复异常统一包装成`recovery-restart-required`。这会造成两个问题：

1. Repository busy、租约暂时占用等明确暂态错误被不必要地升级为重启；
2. future schema、save conflict、非法端口或普通代码错误被包装成“再次重启可能恢复”，形成无法自行修复的重启循环。

同时，重启错误若仍自报`recoverable=true`，任何先读取该字段的上层都可能在同一失败进程中再次写档。

## 决策

### 1. 实时结算与启动恢复使用同一处置器

在 Composition 层提供唯一的只读处置器，最多沿16层自有数据字段`cause/originalError`识别已知 Reward/Learning Profile Service 与 Repository 错误：

- `retry`：Repository busy、明确未提交的 CAS/租约暂态冲突；
- `restart`：indeterminate write、已报告提交但读回无法确认；
- `fail-closed`：future schema、save conflict、非法结构、端口合同错误、普通程序错误、伪造布尔字段、访问器、Proxy、循环或超深错误链。

Mode Session Bridge、启动 Settlement Intent Journal 和本地三模式 Host 必须消费该同一处置器，不再分别读取任意对象上的`recoverable/restartRequired`字段。

### 2. 启动暂态错误复用既有首页主按钮

Reward 已到账但 Learning 启动恢复遇到`retry`时：

- Journal 保持`open`并保留完整基线与 Reward/Learning Grant；
- Recovery Owner 接管同一不可变基线与 Learning Grant；
- 既有首页`recovery-status`说明恢复暂时繁忙；
- 玩家点击首页既有“选择模式”主按钮时，宿主先重试持久恢复，成功后继续原有导航；
- 失败后若仍为`retry`，继续停留首页，不写选择、不开始下一局、不后台轮询。

不新增第12页、按钮、输入按键、计时器、后台重试或第二套恢复入口。

### 3. 不确定写入只能跨重启恢复

启动恢复遇到`restart`时，Journal 转为 failed 只读，完整意图继续留在持久存储；首页主动作禁用并要求重启。实时结算的`ArenaV2SettlementRestartRequiredErrorCandidateV1`固定为`recoverable=false / restartRequired=true`，不能在当前进程继续提交。

通用 11 页 Mode Session Host 只对本包定义的三种结算错误保留既有结果页和 Session 证据：Reward pending、Learning pending、restart required。普通错误即使伪造`recoverable=true`也立即失败关闭。

Surface 的结果通知也必须区分两类状态：当前进程仍可安全重试时使用`learning-settlement-recovery-deferred`，写入结果不确定时使用`settlement-restart-required`；不得把“必须重启”降级显示为普通延迟。

### 4. 合同和存档身份错误不得进入玩家恢复提示

启动 Journal 或本地 Host 遇到`fail-closed`时立即抛出原始合同错误并按固定所有权顺序销毁 Session、Journal 与双 Profile Owner。Surface 只有在失败后仍能读取到明确`retry/restart`状态时才显示恢复提示；Host 已销毁或状态不可读时继续传播失败，不把缺陷降级成“稍后重试”。

### 5. 已完成恢复但意图删除失败仍保留只读重启语义

Learning 已成功提交并完成结果投影后，若 Journal acknowledgement 删除无法确认，不回滚已经持久化的 Reward/Learning，也不销毁可读结果。宿主沿用 ADR-125 的只读重启确认状态，下一次启动再依据真实 Profile 与意图重新闭合。

## 影响

- 暂态存储忙不再强迫玩家重启；不确定写入仍不会在同一进程重复提交。
- schema、存档冲突和程序错误不会形成无限重启提示。
- 实时 Bridge、启动 Journal、11页 Host、本地 Host 和 Surface 使用一致恢复语义。
- 不改变 Reward/Learning Profile、Grant、Replay、Result schema，不改变奖励数值、成长阈值、11页、输入或玩法。
- 默认 Registry、Composition、Surface 与三端入口保持断开；测试、类型、构建、压力、性能、设备与真人均未运行。

## 未采用的方案

### 启动恢复失败一律要求重启

暂态租约或 CAS 竞争可在当前进程安全重试；统一重启增加玩家阻断，也掩盖不可恢复合同错误。

### 继续读取任意错误对象上的 recoverable 字段

普通错误可以伪造该字段，无法证明错误来自 Profile 持久化边界。

### 新增专用恢复页或恢复按钮

现有首页主按钮足以先执行恢复再继续导航；新增页面会扩大11页产品边界和理解成本。

## 回滚

1. 移除共享处置器和 P6.55 启动三分类；
2. 恢复 P6.52 的统一`recovery-restart-required`只读首页；
3. 恢复 Mode Session Host 只保留普通可重试错误的旧行为；
4. 保留 ADR-124 的持久双 Grant 意图，不得删除尚未确认的结算证据。

回滚不得把不确定写入改为当前进程重试，也不得开放默认入口。

## 关联决策

- [ADR-124](124-arena-v2-reward-learning-settlement-intent-recovery.md)：双 Grant 结算意图与跨重启恢复。
- [ADR-125](125-arena-v2-recoverable-settlement-result-and-retry.md)：既有结果页与首页恢复回执。
- [ADR-126](126-arena-v2-profile-settlement-persistence-disposition.md)：Profile 写档三分类与写后读回。
- [P6实施状态台账](../architecture/arena-v2-p6-implementation-ledger.md)。
