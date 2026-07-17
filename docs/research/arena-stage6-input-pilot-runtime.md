# Arena Stage 6 S6.6.2 盲测运行时门禁记录

## 结论

2026-07-17 的 S6.6.2 已建立单写入入组账本、只观察真实已消费 InputFrame 的 MatchSession 装饰器，以及按 authority active tick 计算的自动指标收集器，并通过本机 E1/E2 门禁。盲测能力仍是可注入的 Presentation 旁路，不进入 MatchCore、Bot、正式 Session 组合根或平台入口。

本批次没有实现受测者 UI、观察者表单、平台存储适配器、原始记录导出或真人测试，因此不能视为 S6.6 完成。

## 模块所有权

```text
InputPilotDefinition
        ↓
InputPilotEnrollmentLedger ── persist(next, expectedRevision)
        ↓ assignment
InputPilotMetricCollector
        └── InputPilotActionMetrics
        ↑ observe committed step only
InputPilotObservedSession
        ↑ injected decorator
InputPilotObservedMatchService
        ↑
QuickMatchService / LocalMatchSession
```

- `effectiveMovementDistance` 成为 Definition 必填字段后，Definition schema 显式升至 V2；S6.6.1 的 schema V1 快照会被拒绝，不做隐式补齐。当前尚无真人数据需要迁移。
- `InputPilotEnrollmentLedger` 是 assignment 的进程内唯一写入者。调用方必须显式提供匿名 participant 与 enrollmentIndex；账本不会根据数组长度猜下一个索引。
- `persist(next, expectedRevision)` 必须同步、原子并返回严格 `true` 后，账本才提交内存快照。失败、抛错、异步返回或重入都不修改当前 revision。
- 同一 participant + enrollmentIndex 的恢复调用幂等返回原 assignment；参与者换索引、索引换参与者、损坏 revision 或 Definition hash 不一致均拒绝。
- `LocalMatchSession.step()` 现在同时返回本次真正校验并提交的玩家 `input`；暂停未推进时返回 `input: null`。采集器不读取调用方原始对象。
- `InputPilotObservedSession` 只在 delegate 成功推进一个 tick 后观察；delegate、时序或采集器任一失败都会关闭被装饰会话。暂停 no-op 不产生记录。
- 已完成 step 的 before/after snapshot、事件和规范输入在交给观察器前深冻结；观察器不能篡改随后返回给 Renderer 的同一份表现数据，也不需要每 tick 再做一次深拷贝。
- `InputPilotObservedMatchService` 限制一个 assignment 只创建一局，拒绝用“再来一局”覆盖同一 trial。
- Match 事件常量被抽到独立 `match-event-types.js`，采集器无需导入 `MatchCore` 实现。

## 自动指标语义

- 试验时间从比赛进入 `running` 的 authority active tick 开始；匹配动画、三秒准备、App hide、暂停和 Renderer 帧率不计时。
- 首次有效移动要求先出现规范移动意图，随后角色实际水平位移达到 Definition 中冻结的 `0.05` 世界单位；只收到触点但没有形成移动不算成功。
- 首次正确上下文动作要求当前 Rule `ActionAffordance` 选中的 primary/primaryHold 动作与同 tick 的本地 `ActionStarted` 事件一致。采集器不自己重算命中、装备或跳跃优先级。
- 地面跳/蹲跳、空中二段跳按对应权威 `ActionStarted` 判成功；下砸只有收到 `DownSmashLanded` 才判成功。
- 动作尝试/成功分类由独立 `InputPilotActionMetrics` 持有；时间线与位移收集器不硬编码未来 UI 或存储流程。
- 有规范意图但没有权威成功事件记为 `failed`；从未尝试记为 `not-attempted`。
- 180 秒上限以 active tick 换算并封顶；超时后指标冻结，后续 step 不再污染记录。

## 生命周期与失败策略

- 账本先持久化 assignment，再允许上层创建 Match；持久化失败不能进入 trial。
- 观察发生在 authority step 成功之后；此时若采集失败，比赛已推进但整个 pilot session fail closed，不能继续生成半份有效数据。
- 主错误即使是冻结对象也不被原地改写；delegate 回滚同时失败时使用组合错误保留主错误和全部清理错误。
- 被装饰会话不拥有 Collector；Pilot 组合根必须先销毁 Presentation Session/Observed Service，再 finalize 和销毁 Collector。
- destroy 后账本、Collector、Observed Session 与 Observed Service 都释放 assignment、快照、持久化函数和协作者引用，避免跨重赛保留匿名受测数据。
- `start/setPaused/step/destroy` 的重入和终态均有显式拒绝或幂等语义；delegate 在合法 start/pause 请求中失败时同样关闭整条被装饰会话。
- 当前持久化仍是抽象端口。S6.6.3 的平台 adapter 必须实现 revision compare-and-set、刷新恢复和单页面租约；本批次不宣称解决多个浏览器页面同时写同一个本地存储键。

## 当前自动化证据

定向测试覆盖：

- assignment 持久化先于提交、幂等恢复、Definition/revision 损坏与全部身份冲突。
- 持久化返回 false、抛错、Promise、回调重入和写入中 destroy。
- preparation 不计时、active tick 时长、17ms 精确超时边界和伪造 tick 拒绝。
- 移动意图 + 实际位移、正确 primary affordance/action 对齐、跳跃/二段跳/下砸成功与失败。
- 真实 QuickMatch/LocalMatch 链路只上报已规范化并实际消费的 InputFrame。
- 暂停 no-op、start/pause/观察器失败清理、冻结主错误 + 清理错误组合、创建中元数据失败回滚、一次 assignment 禁止第二局和 destroy 幂等。
- Pilot 目录不绑定 Three.js、Renderer、正式 Session、QuickMatch 实现、平台、墙钟或宿主全局。
- 压测性能硬门使用 `process.cpuUsage()` 统计本进程计算成本，`performance.now()` 墙钟只保留为宿主暂停/调度诊断；电脑休眠不会再伪造成 Core 性能回归，真实端到端帧时间仍必须由 Stage 9 真机证明。

当前定向命令：

```bash
node --test tests/arena/presentation/input-pilot-runtime.test.js tests/arena/presentation/input-pilot.test.js tests/arena/local-match-session.test.js tests/architecture.test.js
```

本批次最终本机证据：

- `npm test`：348/348 通过。
- `npm run arena:stress`：1,000/1,000 完赛，0 非有限状态，5 份回放一致，1,000 个唯一 hash；平均 CPU tick `0.24629ms < 0.25ms`，GC 后堆增长 `4,337,072B < 33,554,432B`。
- `npm run build`：Web、微信、抖音产物构建成功；Web 主 chunk `838.53kB`、gzip `219.12kB` 的既有警告保留到 Stage 9 以实测拆包。
- `git diff --check`：通过。

## 尚未证明

- 尚无平台存储 CAS、跨刷新恢复、单页面租约和 record repository。
- 尚无独立 pilot 页面、观察者字段、受测者复述、导出和报告入口。
- 尚未自动在超时/比赛结束时形成 `completed/abandoned/invalidated` 原始记录。
- 尚无微信/抖音 E3 或真实新手样本。
- 尚未冻结 Mapper 与手势阈值。
