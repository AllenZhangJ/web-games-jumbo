# ADR-125：可恢复结算使用既有结果页、原地重试与重启回执

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

ADR-124 已要求在第一次 Profile 写入前持久化开局 Learning 基线与 Reward/Learning 双 Grant，并在重启后以 Reward 是否实际到账决定补写 Learning 或安全丢弃。

但仅有持久恢复协议仍存在三个玩家流程缺口：

1. Reward 或 Learning 遇到可恢复冲突时，旧入口把错误上抛到 Surface/Driver 的致命清理路径，玩家看不到结果页，也无法使用已设计的恢复动作；
2. 两份 Profile 已完成但结算意图删除确认失败时，本地 Host 会阻止全部调用，连只读结果和明确重启提示也无法展示；
3. 重启已经完成补写或安全丢弃后，玩家没有可见回执，不知道上一局是否重复累计、丢失或产生幽灵进度。

## 决策

### 1. 不新增页面，复用既有结果页和首页

结算遇到可恢复错误时，Navigation 进入既有`result-reward`页面，但只显示已确认事实和恢复状态：

- 已确认 Reward/Learning 才能显示为已获得进度；
- 未确认 Profile 使用 Service 的最后已知规范快照，不把不确定写入冒充成功；
- 主按钮只执行当前待恢复结算，不执行“再来一局”或“下一个目标”；
- 恢复状态显式区分 Reward待重试、Learning待重试和仅投影待恢复，避免把奖励失败误写成成长失败；
- 其他导航、选择、偏好写入和开局全部失败关闭。

重启恢复完成或安全丢弃后，使用既有`home`页面的`recovery-status`字段给出一次启动期回执，不增加第十二个页面、弹窗或新按钮。

### 2. 普通可恢复冲突原地重试底层 Session

Information Mode Session Host 在第一次可恢复结算错误后：

- 保留当前 Mode/Learning Session；
- 关闭 HUD、Audio、VFX consumer epoch；
- 把导航从 match surface 切到既有结果页；
- 保持`modeSessionState=reward-pending | learning-pending`；
- 下一次结果页主动作直接重试同一底层`settleMatch()`。

Reward 已经完成时，Learning 重试不得再次提交 Reward。只有底层 Session 已经 settled、但本地 Learning 投影仍缺失时，才使用不写 Profile 的内存投影恢复。

### 3. 不确定写入只允许重启恢复

完整双 Grant 意图持久化后，Reward 或 Learning 写入若进入无法在当前进程安全确认的状态，Bridge 抛出带稳定数据字段的可恢复错误：

- `recoverable=true`；
- `restartRequired=true`；
- `phase=reward-write | post-reward-learning`。

上层只读取该稳定字段，不按错误文案猜测。结果页保持可读，主按钮禁用并说明重启后以实际存档为准；当前进程不再尝试写 Profile、导航或开下一局。

恢复范围只包含可识别的 Reward/Learning Profile Service可重试错误、Repository busy、明确未提交的CAS冲突和indeterminate write。未来schema、save conflict、Result/Replay/Grant身份漂移、非法端口返回、异步thenable和普通代码错误仍立即失败关闭并清理；不得用“重启恢复”掩盖合同缺陷。具体三分类由[ADR-126](126-arena-v2-profile-settlement-persistence-disposition.md)固定。

### 4. 台账确认失败保持只读结果或只读首页

正常结算后若双 Grant 台账删除未被读回确认：

- 当前结果页继续显示已确认的 Reward/Learning；
- 所有写操作失败关闭；
- 玩家看到“结算确认需要重启恢复”；
- 下次启动重新核对 Profile，并在恢复完成后尝试确认删除。

若启动恢复本身已完成，但确认删除再次失败，宿主允许仅打开既有首页展示恢复说明；不执行角色、武器、地图或模式选择写入，不附带任何默认生产接线。

同样地，若启动时已依据新打开的 Reward Profile 安全判定“仅基线”或“Reward未到账”，该丢弃决定与旧意图删除分开：删除确认失败不会把安全丢弃改写成未知结算，而是保留旧记录、锁定只读首页，并要求下次重启继续清理。

若 Reward 已到账但本次启动仍无法完成 Learning 补写或 duplicate 投影恢复，Journal 返回明确的`recovery-restart-required`决定并保留完整意图。宿主只打开既有首页说明“成长恢复仍未完成”，不在构造期丢失玩家可见反馈，也不在后台无限重试。

ADR-127进一步收紧该历史决定：只有indeterminate write要求`recovery-restart-required`；明确暂态存储冲突返回`recovery-retry-required`并复用首页既有主按钮原地重试，合同或存档身份错误直接失败关闭。

### 5. Reward 幂等竞争刷新当前 Profile

PlayerProfile Service 在 CAS 未提交或写调用抛错后读取规范 Profile：

- 若读回正好是本次期望 Profile，按已提交处理；
- 若读回已包含同一 Reward Grant ID，按 duplicate 处理；
- 若是其他并发变更，更新本地 Profile 后抛可恢复冲突，下一次重试基于新 revision；
- 若无法读回，进入失败态并要求重启。

Mode Reward Committer 始终复用第一次写入前准备的不可变 Grant。当前 Profile 已包含同一 Grant 时直接返回 duplicate，不重新解析另一份奖励，也不重复增加经验或解锁。

## 影响

- 玩家不会因普通 CAS/租约冲突被直接踢出结算流程。
- Reward/Learning 不确定写入不会在同进程冒险重试，也不会被界面误报为成功。
- 既有 11 页、操作按键、玩法数值、Replay/Result/Profile schema均不改变。
- 结果页的恢复状态不是“结算已经全部成功”的声明；已确认事实和待恢复状态分开投影。
- 默认 Registry、默认 Composition、正式入口、发布和阶段通过仍关闭；测试、类型检查、构建、压力、性能、设备和真人验证均为`not-run`。

## 未采用的方案

### 可恢复错误仍留在对局画面

对局已结束且输入不再有效，继续保留战斗画面会让玩家误以为还能操作，也无法承载恢复说明。

### 任意结算错误都在当前进程无限重试

写入结果不确定时无限重试可能重复累计；必须由重启后的全新 Service 从持久事实重新判断。

### 新增恢复弹窗或第十二页

会扩大已冻结的信息架构和交互维度。既有结果页、首页和`recovery-status`字段足以表达状态。

## 回滚

1. 移除 Information Mode Session Host 的 pending result navigation 与保留 Session 状态；
2. 移除 Surface 的只读恢复分支和启动恢复回执；
3. 移除 Bridge 的`restartRequired`错误合同；
4. 回退 Reward Profile 的冲突后读回/幂等 duplicate 识别；
5. 保留 ADR-124 的持久双 Grant 台账，不得删除尚未确认的 pending 意图。

回滚不得开放下一局覆盖未清意图，也不得把最后已知快照解释为已确认新进度。

## 关联决策

- [ADR-119](119-arena-v2-continuous-development-with-deferred-gates.md)：连续开发与集中延期验证。
- [ADR-124](124-arena-v2-reward-learning-settlement-intent-recovery.md)：双 Grant 结算意图与跨重启恢复。
- [ADR-126](126-arena-v2-profile-settlement-persistence-disposition.md)：Profile写档三分类与写后读回幂等处置。
- [ADR-127](127-arena-v2-startup-settlement-recovery-shared-disposition.md)：启动恢复共享三分类与首页原地重试。
- [P6实施状态台账](../architecture/arena-v2-p6-implementation-ledger.md)。
