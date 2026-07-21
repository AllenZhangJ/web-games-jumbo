# ADR-015：Arena 使用无 UI 显式产品状态机与单 Match 所有权

- 状态：已接受（S8.2 已实施）
- 日期：2026-07-18
- 治理更新：2026-07-21，匹配 Runtime/Factory/Coordinator 已迁入 strict `arena-product-match`，Controller 已迁入 strict `arena-product-session`；Composition 仍待治理

## 背景

Stage 8 需要把 S8.1 的本地 Profile、现有 `QuickMatchService` 和 `LocalMatchSession` 连接成启动、角色选择、匹配、准备、比赛、结算与返回闭环。这个闭环会同时收到重复点击、App hide/show、异步资源完成、比赛结束与销毁；若由页面、Renderer 或多个 Manager 分别维护状态，就可能重叠创建比赛、后台继续推进 tick、迟到资源泄漏或在销毁后重新发布状态。

当前 `ArenaPresentationSession` 是灰盒表现与输入 POC 的生命周期所有者，已经包含 Canvas、Renderer、FrameLoop 和重赛表现。它不应反向成为产品业务真相，也不能让产品状态机依赖 DOM、Three.js 或平台生命周期全局。

## 决策

### 1. 产品状态由 Definition、Registry 与 StateMachine 唯一维护

S8.2 当前状态为：

```text
boot -> loading-profile -> ready -> character-select
character-select -> matching -> preparing -> in-match -> results -> ready
任意可恢复状态 -> suspended -> 恢复目标
操作失败 -> recoverable-error -> 显式 retry target
生命周期/清理不确定 -> fatal-error
任意状态 -> destroyed
```

普通转换由不可变 `ProductSessionTransitionDefinition` 与独立 Registry 描述；`ProductSessionStateMachine` 是状态、revision、恢复目标和最后转换的唯一写入者。UI 后续只能调用 Controller 意图，不得直接修改状态或创建比赛。

`suspended` 同时保留可见 `state` 和后台业务 `activeState`。例如 `matching` 时切后台，异步资源完成只把恢复目标推进到 `preparing`，对外仍保持 `suspended`；show 后才发布前台状态。这样不丢完成结果，也不把后台完成误认为前台已经开始比赛。

### 2. 产品匹配分为适配器、单局 Runtime 与所有权 Coordinator

- `QuickMatchProductFactory` 只把现有本地快速匹配包装成产品窄合同，不暴露难度覆盖入口。
- `ProductMatchRuntime` 只代理一局的 start/pause/step/result/destroy，并把完整 Replay 缩减为不可变权威结果身份和公开对手资料。
- `ProductMatchCoordinator` 最多持有一个 Runtime；它负责异步创建去重、暂停请求记忆、结果保留、释放和销毁重试。
- `LocalMatchSession` 继续独占 MatchCore、BotController 和 HeadlessMatchRunner；产品层不直接写入任何权威比赛状态。

异步创建使用单调 generation。destroy 或取消后迟到的 Runtime 必须立即销毁；若清理失败，Coordinator 保留引用和 `cleanupIncomplete`，后续 `destroy()` 必须重试，不能把未知资源状态报告为成功。

治理迁移进一步固定了三层的所有权边界：构造数据不执行访问器，端口方法在接管时快照，同步回调不能重入半次生命周期，Promise/thenable 不能冒充同步能力；无效或迟到候选清理失败时，Coordinator 保留精确重试所有权并阻断下一次创建。上述加固未改变公开状态、结果投影、权威 tick 或任意距离挥空行为。

### 3. Controller 只编排明确意图

`ProductSessionController` 连接 StateMachine、Profile 选择服务和 Match Coordinator，但不吸收它们的内部职责。它提供 boot、打开/关闭角色选择、保存角色、请求比赛、开始比赛、step、结算返回、retry、hide/show 和 destroy。

- 同一个 boot 或 matching 操作的重复调用返回同一个 Promise，不创建第二份资源。
- `requestMatch()` 只进入 `preparing`；表现资源准备好后必须再显式 `beginMatch()`，为 Stage 7/8 后续接入保留边界。
- 角色选择先构建完整下一 Profile，再通过 Repository CAS 提交；未解锁 ID 在存储变更前拒绝。
- 可恢复的 Profile/匹配资源失败进入带稳定公开错误码的 `recoverable-error`。
- pause、状态合同或清理失败会失败关闭并清理比赛；玩家可见快照不暴露内部异常文本、机器人身份或隐藏难度。
- aggregate destroy 先发布 `destroyed`，再分别清理 Match 与 Profile；任一失败保留可重试所有权并向调用方抛出聚合错误。

治理迁移将该规则扩展为可执行端口门禁：StateMachine、ProfileService、MatchCoordinator 与 RewardCommitter 方法在构造期快照，全部同步意图不可重入且不得返回 Promise；fatal/destroy 状态未成功发布时不调用外部资源清理，异步 Profile 在 destroy 后迟到成功会重新承担清理责任。Profile 与奖励只在低频事务边界复制冻结，逐帧 Match 快照不增加深拷贝。

### 4. 产品层保持无宿主、无渲染

组合根只依赖注入的同步 Storage、墙钟 lease 来源和 match seed source。产品状态、Profile、匹配协调和测试均不读取 DOM、Three.js、平台 API、`Date.now()`、`Math.random()` 或定时器。App/Renderer 后续通过适配层调用意图并消费只读快照，不参与转换裁决。

## GitHub 借鉴边界

参考 [`statelyai/xstate`](https://github.com/statelyai/xstate/tree/9d9b9f1439b773979c5120a793215f5aa4568d8f)，固定 commit `9d9b9f1439b773979c5120a793215f5aa4568d8f`，MIT。只借鉴显式状态、事件、转换表和模型化验证思想；当前状态数量和异步语义有限，因此不引入 XState、Actor 运行时、延迟/计时器或框架持久化。

本批没有复制第三方代码，也没有新增运行时依赖。

## 被否决方案

### 复用 ArenaPresentationSession 作为产品状态机

会把 Canvas、Renderer、输入与重赛表现带入产品业务，使无渲染启动、存档恢复和生命周期竞态无法独立验证。

### 页面可见性等同业务状态

hide/show 与异步资源完成可以乱序；仅凭页面是否显示无法判断 matching 已完成、Match 是否已经开始或结果是否仍持有资源。

### Controller 直接持有 MatchCore 或 Bot

会形成第二个权威所有者，破坏 LocalMatchSession 的失败关闭和回放边界。

### 当前直接引入 XState

现有转换表和单异步所有权可以用小型项目内合同完整覆盖。引入 Actor、解释器和框架异步语义会扩大包体、测试面和升级治理，却没有已测量收益。

### destroy 后丢弃迟到资源引用

异步 Factory 可能在销毁后才返回已分配资源。直接忽略会造成隐性泄漏；吞掉清理失败也让生命周期状态失真。

## 后果

正面：

- 产品 UI、Profile、匹配资源与 MatchCore 权威层可以分别替换和测试。
- 快速连点、前后台和异步完成不会创建重叠比赛。
- 迟到资源、失败关闭和销毁重试具有明确证据。
- S8.3 奖励与 S8.4 对称内容池可以在结果/准备边界扩展，不必改写页面或 MatchCore。

代价：

- 状态机和资源协调器各有独立状态，Controller 必须维护二者的一致性门禁。
- `suspended + activeState` 比单一页面枚举多一层语义，需要 UI 严格消费快照。
- 当前 Result 只保留权威身份与结果，不包含 S8.3 奖励事务或 S8.4 冻结内容池。

## 生效证据

- 转换 Definition/Registry、非法转换、挂起中完成、retry/fatal/destroy 有自动化测试。
- boot/matching 重复 Promise、后台 prepare、快速 hide/show、启动失败和 pending destroy 有竞态测试。
- 真实 QuickMatch + LocalMatchSession 完成无渲染 1v1，并验证公开快照不含隐藏难度。
- 200 局压力覆盖 334 次生命周期转换、7 次产品重启、角色选择恢复和每局独立 authority hash。
- 架构门禁阻止 Product 的 state/profile/persistence 反向依赖匹配/组合层，并阻止产品层依赖宿主与表现层。

完整结果见 [S8.2 产品状态机与生命周期结果](../research/arena-stage8-product-session-results.md)。

后续 S8.3 已把 `results -> ready` 扩展为 `results -> reward -> unlock? -> ready`，并将 Profile 选择服务升级为唯一 Profile 写入者；奖励事务边界见 [ADR-016](016-arena-local-match-reward-transaction.md)。本 ADR 保留 S8.2 当时的基础状态与证据。

后续 S8.4 又增加 `reward/unlock -> matching` 的快捷重赛、双方冻结内容池和 ProductMatchResult V2；准备失败恢复原展示、成功后清除旧奖励。内容与重赛边界见 [ADR-017](017-arena-frozen-symmetric-match-content.md)。
