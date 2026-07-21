# ADR-029：小游戏宿主时钟与存储所有权由平台合同显式归一

- 状态：已接受并实施
- 日期：2026-07-18

## 背景

Stage 6 抖音开发者工具预验收暴露了两个只在真实宿主适配层出现的问题：

- 开发者工具强制停止模拟器后，旧 Product Session 来不及释放 60 秒 Profile lease；立即重启会被旧租约判定为并发写入而阻断。
- 抖音小游戏 `tt.getPerformance().now()` 的实测增量是微秒，而 `PresentationFrameLoop` 的合同是毫秒。适配层直接透传会让每一帧都触发最大补帧，对局倒计时显著加速。

Web 可以同时打开多个标签页，必须保留不同运行时之间的严格写入互斥；微信和抖音当前 Product 入口则是单活动运行时宿主。把二者当成同一种并发模型，会在“误接管当前页面”和“重启被已死亡页面阻断”之间二选一。

## 决策

`PlatformContract` 新增显式 `storageConcurrency`：

- `multi-runtime` 是默认值，Web 使用该值；每个 Product 运行时生成独立 owner ID，租约保持严格互斥。
- `single-active-runtime` 由微信/抖音适配层声明；默认 Product owner ID 在同一平台保持稳定，每次运行另有唯一 holder ID，并显式启用 same-owner takeover。

same-owner takeover 只在 `SynchronousStorageLease.acquire()` 且调用方显式选择时生效。该模式强制 holder ID 不同于稳定 owner ID；接管必须写入并读回唯一 holder ID 和更高 revision，即使两个运行时在同一毫秒竞争，也不会生成不可区分的 lease。旧实例随后执行 `assertHeld()`、`renew()` 或写入时会被 fencing 拒绝。默认租约语义不变，不允许同 owner 的第二写入者接管。

加入 holder 后，lease 写入 schema 从 v1 升到 v2。新实现只读兼容无 holder 的 v1，并在首次成功接管时写成 v2；旧实现遇到 v2 会按未来 schema 失败关闭，不能把带 holder 的有效租约误判为可修复损坏后覆盖。

2026-07-21 的 G4.5c2a 治理把该协议迁入 strict `arena-storage` workspace。迁移保持 schema 与平台并发语义不变，同时补齐构造/存储 getter 零执行、宿主方法快照、`assertHeld` 外部回调防重入和销毁释放重试；Product、Study、Pilot 继续只共享租约，不共享各自 Repository 或存档 schema。

运行时 ID 生成被抽到独立 Entry helper，优先使用宿主 crypto，并为无 crypto 环境保留带进程序号的失败关闭式 fallback。Product Session、Repository 和 Lease 不读取宿主全局对象。

平台 `now()` 继续向 Presentation 提供毫秒单调时间。抖音适配层将 `tt.getPerformance().now()` 除以 1000；微信和 Web 不改变单位。权威 MatchCore 仍只使用整数 tick，这个换算不进入 Replay、state hash 或玩法判定。

## 被否决方案

### 所有平台都使用随机 owner ID

可以避免误接管，但模拟器或 App 被强制终止时无法执行 release，下一次启动会被旧租约阻断到过期，属于启动主流程故障。

### 小游戏不使用租约

强制重启会恢复，但重复初始化、迟到异步启动或宿主异常重入会产生两个 Profile 写入者，破坏 A/B 存档的 CAS 和读回确认边界。

### 所有同 owner 租约都允许接管

会削弱 Web 多标签页和测试环境的并发保护。接管必须同时由平台并发能力和组合根默认身份显式选择。

### Session 内判断 `tt`/`wx` 或修正时钟

会把宿主知识带入 Presentation 生命周期所有者，违反 Platform 注入边界，也让相同 Session 在不同宿主中产生隐式分支。

### 全部改用 `Date.now()` 驱动表现帧

墙钟可被系统校时并发生跳变。小游戏仍优先使用宿主 performance clock，只在适配边界归一单位；不可用时才沿用现有墙钟兜底和最大 delta 限幅。

## 后果

正面：

- 微信/抖音被强制终止后可以立即重启，不必等待租约过期。
- 旧运行时即使仍有迟到回调，也无法继续提交 Profile 或奖励。
- Web 多标签页继续使用独立 owner 和严格租约，不因小游戏恢复策略降低一致性。
- Presentation 的毫秒合同和 MatchCore 的整数 tick 边界保持稳定。

代价与限制：

- `storageConcurrency` 是新的平台能力字段；未来若某个小游戏宿主允许多个同时写入的可见运行时，必须重新声明为 `multi-runtime` 并提供独立 owner。
- same-owner takeover 解决存储所有权，不负责销毁旧实例的 Renderer；生命周期清理仍由 Product Session 和宿主回调负责。
- 抖音时钟单位结论来自当前小游戏运行时与开发者工具实测，目标 iOS/Android 真机仍需 Stage 6 E3 复验。

预验收测量、修复后的运行结果和未完成边界见 [抖音开发者工具预验收记录](../research/arena-stage6-douyin-developer-tool-preflight.md)。
