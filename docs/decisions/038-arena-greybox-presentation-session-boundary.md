# ADR-038：Greybox 表现会话是独立回退应用根，禁止复用生产 Product 生命周期

- 状态：已接受并实施
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 实施提交：`224076133ee8622b442dda5d1e39e9405f406706`

## 背景

G6.40 已把 Greybox/Input Pilot 共用的 options、平台能力和工厂组合迁入 strict 包，但 `ArenaPresentationSession` 与 `createArenaGame` 仍位于旧 JavaScript 路径。该会话同时持有 Canvas、Renderer、Match Session、Input Router、Input Adapter、FrameLoop 和宿主生命周期监听器，是 Greybox 回退链的实际应用根。继续让它停留在动态 JavaScript 会留下访问器执行、异步端口混入、部分绑定回滚和清理重试不可审计等风险；把它并入生产 Product Session 又会重新制造两套产品生命周期互相复用的错误边界。

Greybox 是开发回退和 Input Pilot 的可视化载体，不是默认生产产品。正式三端交付已经由 `arena-v1-application-launch` 和 Product Presentation Session 独立闭环。

## 决策

### Greybox Session 是独立应用边界

`@number-strategy-jump/arena-v1-greybox-session` 同时承接：

- strict Greybox 组合和窄平台能力快照；
- `ArenaPresentationSession` 的启动、暂停、恢复、失败和销毁状态机；
- Canvas/Renderer/Input/FrameLoop/Match/EventWindow 的唯一所有权图；
- `createArenaGame` Greybox 应用根。

它可以被 Greybox Entry 和 Input Pilot 引用，但不得被 Product Entry、Product Launch 或生产 Session 引用，也不得进入默认生产 bundle。

### 同步生命周期 fail closed

除 Renderer `load()` 是明确允许的异步启动阶段外，平台、输入、比赛、渲染、帧循环和清理端口必须同步完成。返回 Promise、访问器 thenable 或异步清理均在发布成功状态前拒绝；原生拒绝 Promise 会被收容，避免形成未处理 rejection。

工厂和运行时方法在取得所有权时快照并绑定；访问器方法不执行。Canvas 监听注册若在宿主已经变更后抛错，会用对应 remove 操作回滚；回滚也失败时同时保留两个原因。构造、启动、帧处理或宿主回调失败后会先发布终止状态，再清理完整所有权图。

### 清理失败可重试

销毁按 FrameLoop、Input Adapter、宿主/Canvas 绑定、Input Router、EventWindow、Match Session、Renderer 的逆向所有权顺序执行。某项清理失败时保留该资源或 cleanup 函数，后续 `destroy()` 重试同一所有权；成功清理的资源不会重复取得所有权。帧内销毁或失败延迟到当前帧退出后完成，防止重入破坏状态。

### 权威数据仍来自既有边界

Greybox Session 只消费 `createArenaMatchResources` 返回的已校验会话和公开快照，不参与命中、移动、随机、奖励或胜负判定。每 tick 输入仍由 Input Router 产生并交给 Match Session；表现帧只由公开快照、权威事件和 V1 Presentation Content 投影。

## 被否决方案

### 复用 Product Presentation Session

Greybox 没有 Profile、奖励事务、Product ViewModel 和正式 UI 所有权，强行复用会增加分支和可选状态，并可能让测试入口进入生产组合。两条应用根共享底层合同即可，不共享顶层生命周期。

### 保留 JavaScript 兼容转发

转发层会保留第二个名义真值，允许旧消费者绕过 strict 包边界。迁移直接删除旧 `arena-presentation-session.js` 和 `create-arena-game.js`，所有消费者改用包公开 API。

### 遇到清理错误立即丢弃引用

这会把仍注册在宿主上的监听器或仍持有 GPU/输入资源的对象变成不可恢复泄漏。只有清理成功后才能释放本地所有权引用。

## 后果

正面：

- Greybox 完整应用 Session 进入 strict TypeScript 和包依赖门禁；
- 异步端口、访问器执行、帧内重入和部分绑定失败统一 fail closed；
- 销毁失败保持可重试，不用静默泄漏换取表面幂等；
- Product 与 Greybox 顶层所有权彻底分离，产物门禁可证明 Greybox 未进入默认生产 bundle。

代价：

- Greybox Session 需要维护一套明确但独立的应用生命周期；
- 端口适配器必须遵守同步合同，只有 Renderer 资源加载允许异步；
- Greybox Entry 与研究入口仍需后续迁移，本 ADR 不代表 G6 或整体治理完成。

## 生效证据

- 旧 Greybox Session 和 `createArenaGame` 两个 JavaScript 真值删除，精确允许清单由 270 降至 268；
- 686 项 Node、312 项 strict package/治理与 104 项生命周期测试通过；
- 120 场输入 fuzz、Greybox/Product 各 100 场 Session soak、黄金 Replay 和正式资产预算通过；
- clean build `arena-224076133ee8-product` 三端预算通过且 `freezeEligible=true`，三端生产交付体积与 G6.40 完全一致；
- 完整数值见 [Arena 企业治理状态台账 G6.41](../governance/arena-enterprise-governance-status.md#g641-greybox-表现会话与应用根-strict-迁移证据)。
