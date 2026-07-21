# Arena Stage 8 S8.2 产品状态机与生命周期结果

## 结论

S8.2 已完成无 UI 产品闭环基础：Profile 启动与角色选择、本地快速匹配、显式 preparing、比赛推进、权威结算、返回 ready、App hide/show、可恢复错误、失败关闭和聚合销毁均由可独立测试的产品层编排。

本批不接页面、Renderer、奖励、解锁节奏、双方共享内容池或再来一局快捷意图；这些仍分别属于 S8.3～S8.5。

后续状态：S8.3 已实现奖励、解锁解析和 reward/unlock 状态；见 [S8.3 结果记录](arena-stage8-reward-progression-results.md)。本文件保留 S8.2 当时的范围与证据。

治理后续状态：2026-07-21，`ProductMatchRuntime`、`QuickMatchProductFactory` 与 `ProductMatchCoordinator` 已迁入 strict TypeScript workspace `@number-strategy-jump/arena-product-match`，`ProductSessionController` 与其窄端口已迁入 strict `@number-strategy-jump/arena-product-session`。迁移保持本节产品行为、公开结果与 200 局压力口径不变，并补齐 options 数据边界、接口方法快照、统一不可重入、同步/异步合同、终态先发布、迟到资源与清理失败重试；Composition 仍是后续治理范围。

## 落地边界

```text
Transition Definition / Registry
              ↓
ProductSessionStateMachine
              ↓
ProductSessionController
       ↙                    ↘
ProfileSelectionService   ProductMatchCoordinator
       ↓                    ↓
ProfileRepository         ProductMatchRuntime
                              ↓
                    QuickMatchService / LocalMatchSession
```

- 状态机只写产品状态，不持有 Profile、Runtime 或 MatchCore。
- Profile 选择服务只处理已解锁选择和 CAS 提交，不知道匹配与 UI。
- QuickMatch 产品 Factory 不暴露难度覆盖，Runtime 不创建第二份 MatchCore。
- Coordinator 是 ProductMatchRuntime 的单一所有者；Controller 只通过窄合同编排。
- Product Match 三层现在由独立 strict workspace 承接，只依赖底层确定性合同与公开 ProductMatchResult 合同。
- Controller 现在由独立 strict workspace 承接，只通过快照后的 State/Profile/Match/Reward 窄端口编排，并保留各资源的独立清理责任。
- 组合根注入 Storage、lease 墙钟和 seed source，无平台、DOM 或渲染依赖。

## 竞态与生命周期矩阵

| 场景 | 处理结果 |
| --- | --- |
| boot 快速重复点击 | 返回同一个 pending Promise，只打开一次 Profile |
| matching 快速重复点击 | 返回同一个 pending Promise，只调用一次 Factory |
| loading/matching 时 hide | 外层保持 `suspended`，完成结果只推进 `activeState` |
| preparing/in-match 时 hide | 暂停请求下沉到 LocalMatchSession；暂停期间不推进 tick |
| show 重复或 hide 重复 | 幂等返回当前快照 |
| destroy 与异步 Factory 乱序 | generation 失效；迟到 Runtime 立即销毁 |
| 迟到 Runtime 销毁失败 | 保留 Runtime 引用和 `cleanupIncomplete`，下次 destroy 重试 |
| Profile/匹配创建失败 | 释放已有资源后进入带 retry target 的 `recoverable-error` |
| pause/清理失败 | 失败关闭比赛并进入 `fatal-error` 或 `destroyed + cleanup-failed` |
| results 重复 step | Coordinator 保留单一结果，不再次推进权威状态 |

## 权威结果投影

产品结果不保存整份 Replay 输入与事件，只冻结：

- match seed 与公开对手资料；
- Replay schema、Rule schema、物理版本、config/rule/final hash；
- 权威 winner/reason/draw/ended tick；
- 上述字段的确定性 `authorityHash`。

这让 S8.3 可以从稳定权威结果继续设计奖励事务，同时避免 Results UI 获得 Bot 难度、内部 Controller 或完整可写回放对象。`authorityHash` 当前只是确定性结果身份，不等同于防篡改签名，也尚未直接作为奖励 `grantId`。

## 自动化证据

定向测试覆盖：

- 转换表不可变、重复键拒绝、非法事件不改 revision。
- suspended 中完成、恢复目标、recoverable retry、fatal 和 destroy。
- 已解锁角色选择、同值不写、CAS 拒绝和清理重试。
- prepare Promise 去重、预启动暂停、结果释放、pending destroy 与迟到清理重试。
- Product Controller 的完整 fake 流、真实 QuickMatch 流、启动/匹配失败、生命周期失败和聚合 destroy 重试。
- 重启后从 A/B Profile 恢复角色选择。
- 产品子层依赖方向与宿主/Renderer 隔离。

压力命令：

```text
npm run arena:product:stress
```

本机结果：

```json
{"ok":true,"matches":200,"authorityHashCount":200,"lifecycleTransitions":334,"maximumTicks":59,"restarts":7}
```

压力过程每 25 局销毁并重建产品壳，交替在 matching 和 in-match 阶段切换前后台，并检查每局结束后回到无 Runtime 的 ready、Profile 选择可恢复、公开快照不含机器人/难度信息。

## GitHub 借鉴与依赖

参考 XState 固定 commit `9d9b9f1439b773979c5120a793215f5aa4568d8f` 的显式状态/事件/转换表和模型验证思想。实现为项目内最小合同，没有复制代码、没有新增依赖，也没有引入 Actor、墙钟 delay 或框架持久化。决策边界见 [ADR-015](../decisions/015-arena-headless-product-session-lifecycle.md)。

## 尚未证明

- 尚未接 Web、微信、抖音产品 UI 和真实 App 生命周期回调；S8.2 只证明注入后的无宿主语义。
- 尚未实现 RewardCommitter、正式经验曲线、解锁条件或幂等 grant。
- 角色选择尚未传入双方冻结内容池，当前比赛仍使用现有 Authority Content；该连接属于 S8.4。
- `preparing` 已有显式边界，但 Stage 7 正式资产加载和失败降级尚未接入。
- 尚未完成 Stage 8 首装/旧存档/容量失败三端设备证据；属于 S8.5。

> 后续状态：S8.3 已补齐奖励事务，S8.4 已补齐双方冻结内容池、Replay V5 与快捷重赛；本文件保留 S8.2 提交时的历史证据。最新结果见 [S8.4 结果记录](arena-stage8-content-pool-results.md)。
