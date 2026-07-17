# Arena Stage 8 局外产品循环与本地进度执行计划

## 文档状态

执行中，2026-07-18。S8.1 已落地不可变 PlayerProfile、严格同步 Storage Port、连续迁移 Registry、A/B 双槽 Repository、协作 lease、未来版本保护与故障压力门禁。S8.2 已落地无 UI 显式产品状态机、角色选择保存、单 Match 所有权、QuickMatch 集成、挂起恢复与异步竞态门禁。S8.3 已落地权威结果校验、奖励/解锁 Definition 与 Registry、纯 Resolver、唯一 Profile 写入者、幂等 grant 和 reward/unlock 状态。S8.4 已落地双方共享冻结池、Authority Content 投影、Replay V5、快捷重赛与连续局隔离。S8.5.1～S8.5.3 已落地 Screen/Message/Content ViewModel、串行 UI Intent、非拥有 Match 表现桥、自动奖励/重试 Flow 和统一产品表现 Session；三端正式 Renderer、入口、无障碍与真实宿主验收仍属于后续 S8.5。

## 已接受默认值

- 首版只有一条本地经验/解锁进度，不引入多货币、抽卡或付费系统。
- 角色、外观、衣服、翅膀、挂件和拖尾不提供局内数值优势。
- 解锁装备或地图只扩大当前存档可用内容；同一局由玩家与隐藏对手共享冻结后的装备池和地图规则。
- 不展示机器人身份、随机难度或难度结算；不伪造在线人数、聊天或真实账号。
- 不做账号、云存档、排行榜、服务器对战或防篡改安全系统。

## 产品状态机

产品壳建议显式使用以下状态，不以页面是否可见推测业务阶段：

```text
boot -> loading-profile -> ready
ready -> character-select -> matching -> preparing -> in-match
in-match -> results -> reward -> unlock? -> ready/rematch
任意可恢复状态 -> suspended -> 原状态
任意不可恢复错误 -> recoverable-error / fatal-error
任意状态 -> destroyed
```

S8.4 当前实现支持 `results -> reward -> unlock? -> ready`，也支持 `reward/unlock -> matching -> preparing` 的快捷重赛，不用普通返回 ready 伪装。挂起快照同时发布可见 `state=suspended` 和后台可推进的 `activeState`，异步 matching 完成时只更新恢复目标。

约束：

- 状态转换由一个 `ProductSessionStateMachine` 统一验证；UI 只能发送意图，不能直接创建第二个比赛或重复发奖。
- `LocalMatchSession` 继续独占 MatchCore、Bot 和 Runner 生命周期，产品壳只创建、暂停、销毁和读取结果。
- `onHide`、`onShow`、重复点击、异步加载完成与销毁允许乱序到达；每个转换必须幂等或明确拒绝。
- 从 `results` 返回、再来一局或 App 重启都不能重复提交同一局奖励。

## 数据与模块拆分

```text
src/arena/product/
├── state/                   # 产品状态与合法转换
├── profile/                 # PlayerProfile、默认值和校验
├── persistence/             # SaveRepository、序列化、双槽与迁移
├── progression/             # 经验、奖励、解锁条件和幂等提交
├── content-pool/            # 已解锁内容解析与双方共享冻结池
├── opponent/                # 虚构昵称、头像、外观和准备状态
├── matchmaking/             # 连接现有 QuickMatchService
└── composition/             # 产品壳组合根
```

主要合同：

- `ProgressionDefinition`：版本化经验曲线、奖励和解锁条件，只保存稳定内容 ID。
- `PlayerProfile`：不可变运行时快照，包含 schema 版本、解锁集合、设置与可选统计。
- `SaveEnvelope`：slot generation、schema version、payload 与非安全完整性 hash。
- `SaveMigrationRegistry`：按版本连续执行的纯函数迁移。
- `SaveValidator`：限制类型、长度、枚举、有限数值和已知字段；不信任本地 JSON。
- `SaveRepository`：只依赖注入的 Platform Storage Port，不让 UI 或 Rule/Core 直接访问存储。
- `RewardCommitter`：从权威 `MatchResult` 生成幂等奖励事务。
- `ContentPoolResolver`：从 Profile 与版本化定义生成本局双方共享、深冻结的内容池。

## 本地存档协议

### 双槽提交

Platform Contract 的 `storageWrite` 只确认单次同步调用，不提供跨 key 原子事务，因此使用 `A/B` 两个数据槽和一个 head 提示。Stage 8 复用 S6.6.3a 已落地的 `storageRead/storageWrite/storageDelete` 结果语义，不再把“缺失”和“读取失败”折叠处理：

1. 启动时分别读取 A、B，不盲信 head。
2. 对每个槽完成 envelope、hash、schema 与 payload 校验。
3. 选择最高有效 generation；head 只用于平局提示。
4. 新存档写入非当前槽，立即读回并完整校验。
5. 验证成功后更新 head；head 更新失败时，下次仍能按 generation 找到新槽。
6. 任一步失败都保留上一个有效槽，不覆盖最后可用存档。

hash 只用于发现截断、损坏或部分写入，不声称能够阻止玩家修改本地数据。

### 加载与迁移

```text
读取原始值
  -> 结构与描述符安全复制
  -> envelope/hash 校验
  -> 按版本逐步迁移副本
  -> 最终 schema 校验
  -> 与当前 Definition 协调
  -> 发布不可变 PlayerProfile
```

- 每个迁移函数必须纯、确定、可重复测试，且只从 `N` 到 `N+1`。
- 迁移全部成功后才允许写回新版本；中途失败保留旧槽。
- 遇到未来版本只进入安全提示/诊断，不降级覆盖用户数据。
- 两槽都损坏时使用默认 Profile 启动，并记录不含原始敏感值的诊断；不得让启动永远卡住。
- 存档只保存局外进度与设置，不保存或恢复一半 MatchCore 权威状态。

该迁移模型参考 `redux-persist` 的版本迁移思想，但不引入 Redux 或其运行时依赖。项目已有覆盖 Web/微信/抖音的 Platform Storage Contract，且 `localForage` 对小游戏平台没有直接收益，因此首版不增加第二套浏览器存储抽象。

## 奖励幂等与生命周期

- 只有权威比赛进入最终 `MatchResult` 后才能生成奖励。
- 奖励事务使用当前 Profile revision、match seed 与已校验 authority hash 组成 `grantId`；Profile V1 在单未结算结果假设下只保存最近一次 grant。
- `results` 页面重建、重复点击、切后台、存储失败重试都提交同一 `grantId`，不会重复增加经验或重复解锁。
- 存储失败时 UI 可以显示“进度尚未保存”并允许安全重试；不能声称奖励已永久保存。
- V1 不依赖墙上时间实现每日奖励，避免时钟篡改、跨时区和离线补偿成为首版阻断项。

## 对称内容池

比赛创建前执行一次：

```text
PlayerProfile + Content Definitions
  -> ContentPoolResolver
  -> FrozenMatchContentPool
  -> Rule/Core + BotObservation
```

- 同一个冻结池同时传给地图/装备随机和机器人决策。
- 解锁装备不能只给玩家掉落或只让玩家识别；隐藏对手使用同样规则。
- 角色外观选择与机器人难度使用独立 RNG 流，不能形成固定映射。
- 已开始比赛不受中途解锁、设置写入或 Definition 热更新影响。
- 新 Definition 删除旧内容时必须通过显式替代/弃用策略协调，不以数组下标碰巧迁移。

## 实施批次

### S8.1 Profile、存储与迁移

- 建立 schema、双槽 Repository、校验、迁移和损坏恢复。
- 使用固定 fixture 覆盖每个历史版本与未来版本拒绝。

状态：代码与本机自动门禁已落地。当前首个正式 schema 为 `v1`，不存在可伪造的历史生产 schema，因此本批以独立合成迁移链验证 `N → N+1` 的连续性、纯度和确定性；从下一次 schema 升级开始，每个真实历史版本必须保留固定 fixture。实现与故障矩阵见 [S8.1 结果记录](../research/arena-stage8-profile-persistence-results.md)。

当前 Definition 为保持已实现玩法不被存档层意外裁剪，默认解锁现有两个角色、三件装备和唯一地图；这只是兼容性 bootstrap，不是 S8.3 的正式解锁节奏。外观默认为空，Profile 不引用 Stage 7 灰盒资产 ID。

### S8.2 产品状态机

- 接入启动、选择、匹配、准备、比赛、结算和返回。
- 验证重复事件、快速点击、前后台、启动失败和销毁。

状态：已完成无 UI 基础。已建立不可变转换 Definition、Registry、StateMachine、Profile 选择服务、QuickMatch Product Runtime、单 Runtime Coordinator、Controller 与组合根；真实本地 1v1、异步迟到资源、清理重试和 200 局压力已通过。详见 [ADR-015](../decisions/015-arena-headless-product-session-lifecycle.md) 与 [S8.2 结果记录](../research/arena-stage8-product-session-results.md)。本批未接产品 UI、奖励、共享内容池或快捷再来一局。

### S8.3 奖励与解锁

- 从 MatchResult 幂等提交单一进度。
- 完成角色、外观、装备图鉴和地图内容解锁定义。

状态：已完成无 UI 基础。当前完成奖励 100、胜利加成 25、平局加成 10；所有已实现内容保持解锁，生产 Registry 不编造尚不存在的 UnlockDefinition。Definition/Registry、纯 Resolver、RewardCommitter、唯一 `PlayerProfileService` 写入者、grant 去重和 reward/unlock 生命周期已经落地。详见 [ADR-016](../decisions/016-arena-local-match-reward-transaction.md) 与 [S8.3 结果记录](../research/arena-stage8-reward-progression-results.md)。

### S8.4 对称内容与再来一局

- 每局生成双方共享冻结池，并连接现有 Authority Content。
- 连续多局验证状态、资源、随机流和奖励不串局。

状态：已完成无 UI 基础。已建立 MatchContentPool Definition/Catalog/Replacement Registry、纯 Resolver、产品 provenance 与权威选择分界、Registry/地图投影、Match/Replay V5、ProductMatchResult V2 和 reward/unlock 快捷重赛；200 局压力覆盖 96 次快捷重赛。详见 [ADR-017](../decisions/017-arena-frozen-symmetric-match-content.md) 与 [S8.4 结果记录](../research/arena-stage8-content-pool-results.md)。

### S8.5 产品与三端验收

- 首装、旧存档升级、损坏恢复、容量/写失败、前后台、重启和再来一局留证。
- 检查 UI、无障碍文本、本地化和诊断均不泄漏机器人难度。

状态：S8.5.1～S8.5.3 产品表现合同、Flow 与统一 Session 已完成。V1 Screen Registry 覆盖所有产品状态，中文 Message Catalog 与内容表现 Registry 可校验，ViewModel 只发布脱敏公开数据，Intent Dispatcher 串行化快速点击；`ProductMatchPresentationRuntime` 通过 ProductController 的只读快照和普通 `InputFrame` 复用既有 Arena frame projector，不创建第二局 Match；`ProductPresentationFlow` 统一自动奖励、保存失败重试和展示缓存；`ProductPresentationSession` 统一 Controller、Flow、Input、FrameLoop、Renderer 与宿主生命周期所有权，并以 20 秒心跳和前台恢复强制检查维持 Profile lease，确认租约丢失后在继续权威 step 或结算前失败关闭。单局、重赛、迟到完成、上下文丢失、租约过期、失败关闭与精确清理重试均有门禁。设计边界见 [ADR-018](../decisions/018-arena-product-presentation-contracts.md) 与 [S8.5.1～S8.5.3 结果记录](../research/arena-stage8-product-presentation-foundation.md)。三端正式 Renderer、页面/无障碍绑定和真实设备留证仍未完成。

剩余顺序：S8.5.4 实现共享正式 Product Renderer 与可访问 UI 宿主；S8.5.5 分别组合 Web、微信、抖音入口并保留旧入口回退开关；S8.5.6 用最终构建完成首装、损坏存档、写失败、前后台、重赛与资源长稳的三端证据，关闭 Stage 8。

## 阻断门禁

- 两槽写入、读回或 head 更新任一点失败时仍有一个可加载的最后有效 Profile。
- 每个历史 schema fixture 迁移到当前版本后通过校验；未来版本不会被覆盖。
- 相同 `grantId` 重试任意次数只发放一次奖励。
- 玩家与隐藏对手使用完全相同的本局装备池和地图规则。
- 角色、外观和局外进度不改变生命、移动、跳跃、冷却、击退或掉落概率。
- 快速连点、切后台、重开和连续多局不会创建重叠 MatchSession、重复发奖或串局。
- 生产可见内容不出现机器人、难度选择、虚假真人或虚假社交信息。
