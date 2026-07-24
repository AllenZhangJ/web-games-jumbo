# ADR-017：Arena 每局冻结双方对称的权威内容选择

- 状态：已接受（S8.4 已实施）
- 日期：2026-07-18
- 治理更新：2026-07-21，内容 Definition/Registry/Catalog/Resolver 与 Profile Provider 已迁入 strict `arena-product-content`；Arena V1 Profile、内容池、替代与成长组合已迁入 strict `arena-product-v1-content`，顶层所有权组合已迁入 strict `arena-product-composition`

## 背景

S8.1～S8.3 已建立版本化 Profile、本地可靠存储、产品状态机和幂等奖励，但 Profile 中的角色、装备与地图解锁尚未进入 MatchCore。若玩家池、机器人池、地图掉落池分别解析，同一份进度可能在局内产生不对称规则；若 MatchCore 直接读取可变 Profile，比赛开始后的解锁、重启或内容更新又会改变正在进行的权威状态。

地图装备波在不可变 `MapDefinition` 中引用装备 ID，RuleEngine 的 `ActionRegistry` 也必须和 `EquipmentRegistry` 同步过滤。仅在掉落时跳过未解锁装备，会让 Registry、规则内容 hash、地图校验和 Replay 对同一局持有不同真相。

## 决策

### 1. 产品侧只负责解析并冻结，不进入权威模拟

组合根用以下链路在比赛创建前解析一次：

```text
PlayerProfile + MatchContentPoolDefinition
              + MatchContentCatalog
              + ContentReplacementRegistry
                         ↓
              MatchContentPoolResolver
                         ↓
              FrozenMatchContentPool
                         ↓
MatchContentSelection -> MatchCore/Replay
```

治理迁移进一步把这条边界变成可执行合同：所有 options/input 只读取精确数据字段，Provider 在构造期快照 Profile/Resolver 方法并拒绝同步重入或 Promise 冒充；非法 seed 在任何外部调用前拒绝，返回池必须再次验证 hash、match seed 与 Profile revision。该加固不改变具名随机标签、选择顺序、内容 hash 或权威配置。

Arena V1 的 Profile Definition、内容池 Definition/Catalog/Replacement 与 Reward/Progression Registry 进一步集中到 `arena-product-v1-content`；装备、退役地图和当前地图 ID 由 `arena-definitions` 提供单一不可变真值。内容组合因此不能再用私有字符串常量形成第二份 Profile、Catalog 或替代规则。

`FrozenMatchContentPool` 保留 match seed、Profile revision 和产品来源 hash；这些 provenance 不进入 Rule/Core，也不出现在玩家公开快照。MatchCore 只接收数据型 `MatchContentSelection`，因此不依赖 ProfileService、Repository、产品状态机或宿主 API。

### 2. MatchContentSelection 是 Replay V5 的权威配置

选择包含内容 Definition ID/version、双方可用角色 ID、装备 ID、地图 ID、已选地图、双方角色分配和可校验 hash。MatchConfig V5 强制它与 `mapDefinitionId`、`participantCharacters` 和初始装备一致。

组合阶段从完整 Catalog 构造本局只读 Registry 快照：

- `CharacterRegistry` 只包含本局角色池；
- `EquipmentRegistry` 只包含本局装备池，对应装备 Action 同步裁剪，基础动作和移动动作保留；
- `MapRegistry` 只包含本局地图池；装备波通过新 `MapDefinition` 投影到本局装备池，不修改原 Definition；
- 装备波与池没有交集时构造失败，不创建半可用 Match。

配置 hash 绑定选择，rule content hash 绑定投影后的实际 Definition。Replay V5 保存完整选择并按相同组合过程重建；Replay V4 被明确拒绝，不猜测缺失内容池。

### 3. 玩家、隐藏对手和随机流共享边界但不形成映射

玩家当前选择和隐藏对手角色都必须来自同一冻结角色池；地图与装备规则只存在一份。地图选择、对手角色、机器人难度、对手资料、Bot 行为和个性使用独立具名 seed 流。改变玩家外观或选择不会重新抽取机器人难度，也不会让某角色固定对应某档 Bot。

### 4. 删除内容需要替代记录和 Profile 迁移

稳定 ID 不以数组下标迁移。Catalog 中删除已发布 ID 时必须同时：

1. 增加无环、无歧义的 `ContentReplacementDefinition`，最终目标必须存在；
2. 增加对应历史 Profile fixture 与 schema 迁移，将持久化引用写回当前 ID。

运行时替代是旧存档安全打开的兜底，不代替持久化迁移。仍在 Catalog 的 ID 不允许声明为 retired，未知且无替代的 ID fail closed。

### 5. 快捷重赛是独立产品意图

`reward/unlock -> matching -> preparing` 使用 `REMATCH_REQUESTED`，不绕回 ready/character-select。重复点击共享同一 prepare Promise；准备失败释放候选 Match 并恢复原 reward/unlock 快照；只有新 Match 准备成功才清除上一局奖励展示。每局重新解析当前 Profile、取得新 seed 并创建新的冻结池、Runtime 和奖励事务。

## GitHub 借鉴边界

- Motumbo commit `141cb972982e08b3ca5552ae75a7e58388314e4b`：继续借鉴世界、Bot 行为和个性的 RNG 分流思想；本批扩展为内容池地图与对手角色的独立具名流，没有复制其 C/Box3D 代码。
- [statelyai/xstate](https://github.com/statelyai/xstate/tree/9d9b9f1439b773979c5120a793215f5aa4568d8f)，commit `9d9b9f1439b773979c5120a793215f5aa4568d8f`，MIT：继续借鉴显式事件和可验证转换表，为 reward/unlock 增加重赛边；不引入 XState 运行时。

本批没有复制第三方代码、没有新增依赖。

## 被否决方案

### MatchCore 直接读取 PlayerProfile

会让局外存储、迁移和生命周期反向进入权威层，使同 seed、同输入不再足以重建比赛。

### 玩家和 Bot 分别生成内容池

会产生只对一方可用的装备、地图知识或角色规则，破坏隐藏本地对手的同权边界。

### 在掉落或 Bot 决策末端临时过滤 ID

Registry、地图校验、规则 hash 和实际掉落会持有不同 Catalog，错误只能在比赛中途暴露。

### 删除未知 ID 时静默丢弃

可能让角色池或地图池变空，并把内容损失伪装成正常迁移；无法审计发布兼容性。

### 重赛先回 ready 再自动打开角色选择

会丢失重赛来源和失败恢复目标，也扩大重复点击创建重叠 Match 的竞态窗口。

## 后果

正面：

- Profile、内容解析、MatchCore、Bot 和表现层保持单向依赖。
- 玩家与隐藏对手自动共享同一装备/地图规则。
- 每局内容可冻结、公开、回放和独立验证，连续局不会串池。
- 新角色、装备和地图可通过 Catalog/Definition/Registry 扩展。

代价：

- Match/Replay 协议升级为 V5，ProductMatchResult 升级为 V2。
- 带装备波的地图投影后会产生一个本局不可变 Definition 快照。
- 发布后删除内容需要同时维护替代记录和历史 Profile 迁移 fixture。

## 生效证据

- 内容 Definition、Catalog、替代链/环、未知 ID、hash 篡改和不安全数组有边界测试。
- 单装备池只注册对应 Action/Equipment，地图波只生成该装备；Replay V5 最终 hash 一致。
- `ProductMatchResult` 强制公开内容与 replay.config 的权威选择一致。
- reward/unlock 重赛覆盖重复点击、后台完成、准备失败恢复和旧奖励清理时点。
- 200 局压力交替普通进入与 96 次快捷重赛，得到 200 个独立 authority hash、无重复奖励或串局。

完整结果见 [S8.4 对称内容池与快捷重赛结果](../research/arena-stage8-content-pool-results.md)。
