# Arena Stage 8 S8.3 奖励与解锁结果

## 结论

S8.3 已完成无 UI 奖励闭环：权威 MatchResult 校验、版本化奖励/解锁定义、纯进度解析、唯一 Profile 写入者、CAS 持久化、grant 幂等、`results → reward → unlock? → ready` 状态和生命周期故障处理已经落地。

本批仍不接产品页面、双方共享冻结内容池、快捷再来一局或三端真机 UI；这些属于 S8.4～S8.5。

## 落地边界

```text
MatchReward / Unlock Definition
              ↓
      ProgressionRegistry
              ↓
     pure RewardResolver
              ↓
       RewardCommitter
              ↓
     PlayerProfileService
              ↓
   PlayerProfileRepository
```

- Resolver 不访问存储、UI、MatchCore、DOM、墙钟或随机源。
- RewardCommitter 不拥有 ProfileService，也不直接访问 Repository。
- PlayerProfileService 是角色选择和进度提交的唯一 Repository 写入者。
- ProductSessionController 只编排 result、reward、Match 释放和状态转换。
- 表现层只能消费 Product snapshot 中的 Profile 与 reward，不参与奖励裁决。

## Arena V1 当前奖励

| 结果 | 经验 |
| --- | ---: |
| 完成比赛 | 100 |
| 玩家胜利加成 | +25 |
| 平局加成 | +10 |
| 失败加成 | +0 |

当前所有已实现角色、装备和地图保持解锁，正式 UnlockDefinition 列表为空。Registry 和 Resolver 已用合成的外观 → 角色前置链验证同一 grant 的固定点解锁，但没有把测试内容 ID 放进生产 Profile。

## 幂等与故障矩阵

| 场景 | 结果 |
| --- | --- |
| results 重复意图 | 状态机只允许一次成功转换；同一 result 对象由 Committer 返回同一结果 |
| Repository 明确拒写 | Profile 不变，保留 MatchResult/Runtime，进入可恢复 results |
| 同一 grantId 再提交 | `duplicate=true`，不执行 CAS、不增加经验 |
| 写入结果不确定/读回不一致 | ProfileService 与产品失败关闭 |
| 奖励成功、Match 释放成功 | Match 先释放，再发布 reward |
| 奖励成功、Match 释放失败 | 产品进入 fatal-error，清理重试，但不再次提交奖励 |
| reward/unlock 时 hide/show | 外层 suspended，activeState 与公开 reward 保留 |
| 下一局 seed/结果重复 | Profile revision 已递增，grantId 不碰撞 |

grantId 是本地事务身份，不是安全签名。Profile V1 只保留最近一次 grant，适用范围严格限制为单 ProductSession、单未结算结果；云同步、离线队列和并发补发需要新 schema 与新 ADR。

## 自动化证据

定向测试覆盖：

- Reward/Unlock Definition 的不可变输入、重复目标、缺失依赖和依赖环拒绝。
- 胜/负/平经验、上限裁剪、确定性 grantId 与同 grant 固定点解锁。
- ProductMatchResult authorityHash 重算校验，损坏结果不能发奖。
- ProfileService 单写入者、CAS 拒绝、读回校验、grant 去重与清理重试。
- Product Controller 的奖励拒写重试、reward/unlock 生命周期和奖励后清理失败关闭。
- 真实 QuickMatch 结算、奖励持久化、公开快照隐藏信息检查和产品重启恢复。

压力命令：

```text
npm run arena:product:stress
```

压力过程运行 200 局，每 25 局销毁并重建产品壳，校验累计经验、最近 grantId、角色选择、单 Match 所有权、结果 hash 和隐藏难度不泄漏。本机结果：

```json
{"ok":true,"matches":200,"authorityHashCount":200,"lifecycleTransitions":334,"maximumTicks":59,"restarts":7,"experience":22000,"latestGrantId":"arena-result:r200:000027d8:fe283ae6"}
```

全仓 `npm test` 同时通过 452/452。

## GitHub 借鉴与依赖

参考 Stripe Node 固定 commit `1bb09ad9866e3dcb516948eacc89373824a02523` 的稳定 idempotency key 重试思想。实现为项目内本地事务合同，没有复制代码、没有新增依赖，也没有引入支付、网络或服务端语义。决策见 [ADR-016](../decisions/016-arena-local-match-reward-transaction.md)。

## 尚未证明

- S8.4 尚未把 Profile 解锁解析为玩家与隐藏对手共享的冻结内容池。
- S8.4 尚未增加 product-level rematch 快捷意图与连续局内容池隔离测试。
- S8.5 尚未接 Web、微信、抖音产品 UI 和真实 App 生命周期回调。
- 当前没有正式新内容和正式经验曲线样本，100/25/10 仍是已接受的首版基础值。
- 本地 Profile 不具备防篡改能力，不能用于有价值排行或安全结算。

> 后续状态：S8.4 已补齐双方冻结内容池、Replay V5、ProductMatchResult V2、快捷重赛和连续局隔离；本文件保留 S8.3 提交时的历史证据。最新结果见 [S8.4 结果记录](arena-stage8-content-pool-results.md)。
