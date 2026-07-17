# Arena Stage 8 局外产品循环与本地进度执行计划

## 文档状态

提议，2026-07-17。本文把快速匹配、角色选择、结算、奖励、解锁和再来一局收口为可恢复的产品状态机，同时保持本地隐藏机器人、公平共享内容池和无数值成长边界。

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

Platform Contract 的 `storageSet` 不提供跨 key 原子事务，因此使用 `A/B` 两个数据槽和一个 head 提示：

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
- 奖励事务使用稳定的 match/result signature 作为 `grantId`；Profile 保存有界已提交集合或等价摘要。
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

### S8.2 产品状态机

- 接入启动、选择、匹配、准备、比赛、结算和返回。
- 验证重复事件、快速点击、前后台、启动失败和销毁。

### S8.3 奖励与解锁

- 从 MatchResult 幂等提交单一进度。
- 完成角色、外观、装备图鉴和地图内容解锁定义。

### S8.4 对称内容与再来一局

- 每局生成双方共享冻结池，并连接现有 Authority Content。
- 连续多局验证状态、资源、随机流和奖励不串局。

### S8.5 产品与三端验收

- 首装、旧存档升级、损坏恢复、容量/写失败、前后台、重启和再来一局留证。
- 检查 UI、无障碍文本、本地化和诊断均不泄漏机器人难度。

## 阻断门禁

- 两槽写入、读回或 head 更新任一点失败时仍有一个可加载的最后有效 Profile。
- 每个历史 schema fixture 迁移到当前版本后通过校验；未来版本不会被覆盖。
- 相同 `grantId` 重试任意次数只发放一次奖励。
- 玩家与隐藏对手使用完全相同的本局装备池和地图规则。
- 角色、外观和局外进度不改变生命、移动、跳跃、冷却、击退或掉落概率。
- 快速连点、切后台、重开和连续多局不会创建重叠 MatchSession、重复发奖或串局。
- 生产可见内容不出现机器人、难度选择、虚假真人或虚假社交信息。
