# ADR-016：Arena 使用单未结算结果与本地幂等奖励事务

- 状态：已接受（S8.3 已实施）
- 日期：2026-07-18

## 背景

S8.2 已能从本地 1v1 得到不可变 `ProductMatchResult`，但仍直接从 results 返回 ready。S8.3 需要发放经验并支持后续角色、外观、装备和地图解锁，同时处理重复点击、存储拒写、App hide/show、Match 清理失败和相同 seed 再次出现。

若奖励页面直接修改 Profile，角色选择服务与奖励系统会同时成为 Repository 写入者；若只用 seed 或 authority hash 作为永久去重键，合法的重复 seed/结果可能碰撞；若把全部历史 grant 无限追加到存档，长期运行又会造成无界增长。

首版没有账号、云同步、跨设备奖励、离线奖励队列或半场 Match 恢复。产品状态机最多持有一个未结算结果，奖励成功后才释放该 Match，并且下一局只能从 ready 重新进入。

## 决策

### 1. ProfileService 是 Profile 的唯一写入者

原 `PlayerProfileSelectionService` 升级为 `PlayerProfileService`。角色选择与进度 grant 共用同一不可重入写入门、完整聚合构建、Repository CAS 和提交后读回校验。

`RewardCommitter` 不持有 Repository，不管理 Profile 生命周期，只把候选 grant 交给 ProfileService。Repository 写入被明确拒绝且当前快照仍可读时留在 results 重试；写入结果不确定、Repository 失败关闭或读回不一致时产品失败关闭。

G4.5b2 strict 迁移后，`RewardCommitter` 在构造期按数据描述符快照 Profile 端口方法，并校验提交 outcome 的 grant、revision、experience 和 unlock。只有异常自身以数据字段明确声明 `recoverable=true` 才允许重试；无法确认写入结果、访问器端口、重入或畸形 outcome 均失败关闭。它仍是 ProfileService 的非拥有型调用方，不增加第二个 Profile 写入者。

### 2. 奖励由不可变 Definition、Registry 与纯 Resolver 决定

Arena V1 当前规则为：

- 完成一局获得 100 经验；
- 玩家胜利额外获得 25 经验；
- 平局额外获得 10 经验；
- 经验受 Profile 上限约束；
- 不引入货币、每日奖励、付费或局内数值成长。

`MatchRewardDefinition` 与 `UnlockDefinition` 只包含版本化数据。`ProgressionRegistry` 拒绝重复 ID、重复解锁目标、缺失依赖和依赖环。Resolver 先重新校验 `ProductMatchResult` 的权威 hash，再按经验和前置条件求解同一 grant 内的解锁固定点。

当前已实现的两个角色、三件装备和唯一地图继续全部解锁，因此 Arena V1 Registry 暂无正式 UnlockDefinition；不为尚不存在的资产编造 ID。新增内容再按“外观 → 角色 → 装备/地图”加入定义。

### 3. grantId 绑定当前本地事务作用域

grantId 格式为：

```text
arena-result:r<profile-revision>:<match-seed-hex>:<authority-hash>
```

Profile revision 在当前 results 重试期间保持不变，成功提交后恰好递增，因此：

- 同一未结算结果的失败重试得到同一 grantId；
- 重复提交同一 grantId 不再次写入或增加经验；
- 下一局即使 seed 与结果内容重复，也因 revision 不同而获得新事务身份。

同一 RewardCommitter 持有的未结算事务按已经校验的 authority hash 缓存结果，因此调用方即使重建一个值相同但引用不同的不可变 ProductMatchResult，也不会绕过当前事务去重。进程重启不恢复半局或未结算结果；新 ProductSession 通过新的 Profile revision 建立后续事务，不能把 authority hash 单独当作永久幂等键。

Profile V1 只保留最近一次已提交 grantId，不建立无界历史账本。这一做法依赖“单 ProductSession、单未结算结果、不持久化半局 Match”的明确产品生命周期，不是通用分布式幂等或反作弊协议。

若未来加入并行奖励、跨进程待结算恢复、云存档、离线队列或服务端补发，必须升级 Profile schema，增加服务端/持久化 operation ID 与有界事务账本，不能复用当前单事务假设。

### 4. 产品状态必须经过奖励边界

产品状态扩展为：

```text
in-match -> results -> reward -> unlock? -> ready
```

`commitReward()` 先持久化 grant，再释放 Match，最后发布 reward。可恢复存储失败保留权威结果和 Runtime；奖励已经持久化但 Match 清理失败时进入 fatal-error，不允许再次发奖。reward/unlock 可正常 suspend/resume，Presentation 只读取公开 reward 快照。

## GitHub 借鉴边界

参考 [`stripe/stripe-node`](https://github.com/stripe/stripe-node/tree/1bb09ad9866e3dcb516948eacc89373824a02523)，固定 commit `1bb09ad9866e3dcb516948eacc89373824a02523`，MIT。只借鉴“同一逻辑操作的重试复用稳定 idempotency key”这一协议思想。

当前实现没有复制 Stripe 代码、没有访问 Stripe API、没有新增依赖，也不声称本地 grantId 具有服务端幂等或安全签名能力。

## 被否决方案

### RewardCommitter 直接写 Repository

会产生角色选择与奖励两个写入者，使 CAS、重入、读回失败和销毁顺序分裂。

### 只用 match seed 或 authority hash 作为 grantId

相同 seed 与相同确定性结果在长期或错误 seed source 下可能合法重复，导致后一局被误判为旧奖励。

### 在 Profile V1 永久追加全部 grantId

会让本地存档随比赛数持续增长；任意固定上限又需要超出上限后的淘汰与旧事务重放策略。当前单未结算生命周期不需要承担这一分布式账本复杂度。

### 存储失败后先释放 Match 再提示重试

会丢失生成同一事务所需的权威结果，页面只能伪造成功或重新计算不可靠奖励。

## 后果

正面：

- 奖励、Profile 存储、Match 所有权和 UI 保持解耦。
- 重复点击、可恢复拒写和前后台切换不会重复发奖。
- 相同 seed 的后续合法比赛不会与上一局 grant 碰撞。
- 解锁定义可以新增内容而不修改 Resolver 或 Repository。

代价：

- 当前协议只适用于本地单会话、单未结算结果。
- 奖励成功后的 Match 清理失败必须失败关闭，不能继续产品流程。
- Profile snapshot 与 Product state snapshot 因公开合同扩展分别保持 Profile schema v1、升级 Product snapshot schema v2。

## 生效证据

- 奖励 Definition/Registry 边界、依赖环、固定点解锁和经验封顶有单测。
- 相同结果对象提交 1000 次只产生一次 CAS；相同 grantId 再提交不增加经验。
- 值相同但引用不同的结果对象仍只提交一次；可恢复拒写可精确重试，歧义写异常和畸形提交结果使 RewardCommitter 失败关闭。
- 存储拒写保留 results/Runtime 并可重试；奖励成功后的清理失败不产生第二次 grant。
- reward/unlock 在 suspended/resume 后保持公开数据与恢复目标。
- 200 局无渲染压力跨 7 次重启校验累计经验、最近 grant、单 Match 所有权和隐藏难度不泄漏。

完整结果见 [S8.3 奖励与解锁结果](../research/arena-stage8-reward-progression-results.md)。
