# Arena Stage 8 S8.1 Profile 与本地持久化结果

## 结论

2026-07-18，S8.1 的无 UI 基础已落地并通过本机自动门禁。它只建立局外 Profile 与可靠存储，不保存半场 MatchCore 状态。后续 S8.2～S8.5 已在独立批次补齐产品页面、奖励、解锁与比赛内容池；本文件保留 S8.1 的持久化证据，并在末尾登记 2026-07-21 的 strict 治理进展。

## 已落地边界

- `PlayerProfileDefinition`：版本化、不可变、严格字段与容量上限；默认值经过引用一致性校验。
- `PlayerProfile`：不可变快照、单调 revision、排序去重集合、选择项必须已解锁。
- `SaveMigrationRegistry`：只允许连续 `N → N+1`，输入冻结，并以双次执行/hash 检查确定性。
- `SaveEnvelope`：稳定 Definition ID、generation、payload schema 与损坏检测 hash；内容 Definition hash 不参与兼容性判定。
- `PlayerProfileRepository`：A/B 双槽、最高有效 generation、非权威 head、CAS、写后读回、协作 lease 和显式生命周期。
- 共享 `SynchronousStoragePort/Lease`：Pilot 与 Product 只复用宿主边界，不复用各自数据模型。

## 故障与竞态结果

- 槽写返回失败、写后抛异常、读回失败、head 返回失败或抛异常均有明确结果。
- 写调用即使抛异常，只要新槽读回完整验证成功，仍按已提交处理，避免“磁盘已更新、内存仍旧”的分叉。
- 读回无法确认时先回滚非当前槽；回滚也无法确认则仓储 fail-closed，不继续接受写入。
- 写入确认阶段观察到未来 schema 时原地保留数据并关闭当前 writer，不把它当损坏数据删除。
- 同 generation 不同 hash 的双槽拒绝自动选边；陈旧内存、外部存储变化、过期 lease 和并发 writer 均拒绝提交。
- lease 获取阶段的未确认候选会尝试清理；同步合同拒绝并收容异步宿主回调。释放或 Repository 销毁清理失败时保留可重试所有权，不发布半打开/半销毁状态。
- lease 续租返回未确认但旧租约仍有效时允许上层短间隔重试；确认过期、被取代或无法验证时 Repository 立即进入失败关闭。角色选择和奖励提交在写槽前先续租，避免在租约边界写入。
- 两槽都损坏时发布默认不可变 Profile，但首次验证提交前不覆盖原始槽；诊断只包含计数/布尔状态，不暴露原始值。

## 验证

- Profile/迁移/仓储专项测试覆盖 Definition、边界、迁移、损坏、未来版本、CAS、租约、生命周期和故障注入。
- Pilot 持久化回归通过，证明共享 Storage Port/Lease 抽取没有改变既有 Workspace 行为。
- 架构测试禁止 Product/Storage 引入 MatchCore、Session、Presentation、Three.js、平台/DOM、墙钟或非注入随机。
- `arena:profile:stress` 完成 500 次提交、17 次写后读失败回滚、29 次 head 失败、16 次非当前槽损坏和多次销毁/重开；最终 revision/经验/grant 数量均为 500，数据 key 保持 A/B/head 三个有界 key。
- S8.5.3 Product Session soak 连续 100 局跨越默认 60 秒 lease，并覆盖 20 秒心跳、瞬时失败重试和后台过期恢复前失败关闭。

## S8.1 当时明确未完成

- 当前 `v1` 是第一个真实 Profile schema，因此没有历史生产 fixture；第一次 schema 升级时必须新增并永久保留 `v1` fixture。
- RewardCommitter、grant 业务语义、ProgressionDefinition、ContentPoolResolver 与 ProductSessionStateMachine 在 S8.1 当时尚未落地；这些能力后来已由 S8.2～S8.4 完成，不能继续视为当前缺口。
- Web、微信、抖音真实宿主容量、异常退出和 App 生命周期证据属于 S8.5，Node 压测不能替代。

## 2026-07-21 strict 治理跟进

- Profile Definition、不可变快照、存档信封、迁移 Registry 与持久化错误合同已经位于 strict `arena-profile-contracts`；角色选择和奖励的唯一写入者已经位于 strict `arena-profile-service`。
- Service 构造期快照 Repository 同步方法，并以单一不可重入临界区执行写前续租、CAS、精确结果校验和提交后读回；歧义写、读回漂移与租约丢失失败关闭，销毁失败保留可重试所有权。
- `PlayerProfileRepository`、共享 `SynchronousStorageLease` 与具体 A/B/CAS 编排仍在受治理 JavaScript 清单中，是 G4 下一迁移批次；本次没有把它们错误宣称为 strict 完成。
- clean 提交 `36fbf26569e79783b7a3a734bfff3e023cc79e2b` 的统一门禁通过，build ID `arena-36fbf26569e7-product`，三端 `sourceDirty=false`；完整证据见 [企业治理状态台账](../governance/arena-enterprise-governance-status.md)。
