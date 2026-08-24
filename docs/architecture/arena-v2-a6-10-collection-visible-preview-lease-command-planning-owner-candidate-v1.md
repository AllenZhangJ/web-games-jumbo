# A6.10 收藏可见预览租约命令规划 Owner 候选 V1

## 状态

- `code-written-not-run`
- `production-unreachable`
- `defaultSurfaceWired=false`
- `loadsResources=false`
- `createsThree=false`
- `executesLeaseCommands=false`

本候选只把 A6.8 已验证的四页只读快照与可见 Definition 集合转换为 A6.6 可消费的命令计划；它不执行命令、不调用 loader、不创建 Three 资源，也不接默认 Surface。

## 合同边界

- 输入固定为 A6.8 `ArenaV2CollectionFourScreenReadSnapshotV1`、viewport、按当前页 ordinal 排列的唯一可见 ID 子集，以及本 Owner 上轮发布的完整 active ledger。
- index 页最多为 20 武器或 2 地图；detail 页必须精确选中唯一 slot。
- 输出顺序固定为 `releaseCommands → retainLeases → acquireCommands → fallbackSlots`。
- 只有 `formalReady && requestPermitted` 的武器进入 ledger；地图、缺失或未批准武器只进入 fallback，不暴露 acquire/release token。
- 当前生产批准账本下22项均不满足该条件，因此任意页面计划均为`acquireCommands=[] / retainLeases=[] / nextActiveLeaseLedger=[]`；完全可见项只进入fallback，不执行资源命令。
- `visibleSlotLeaseId` 使用无短 hash 的结构化身份 `a6.10:${screenId}:${assetId}:${activationSequence}`，总长显式限制为 200。A6.6 已值级证明同一完整 binding 内 `assetId` 全局唯一，definition 再由当前 binding 的一对一映射闭合；同 epoch 由 Owner 作用域保证。连续可见 retain 不递增，离开后再进入则递增，避免复用 A6.6 已释放 lease ID。
- activation key 使用规范 JSON 数组 `[screenId, definitionId, assetId]`；计数键空间由四个页面与固定 22 槽有界，reset 清空。Owner 不永久保存已发行 lease ID，只在本轮计划内检查唯一性，因此长期滚动不会积累无界墓碑集合。ledger 只声明 `planned-active`，不声明 ready、loaded 或 mounted。

## A6.6 一致性

A6.6 在 constructor 中固定完整 22 槽 binding，同 epoch 没有更新 API。A6.10 因此从首个 A6.8 快照固定同一租约水位：

- catalog revision/hash
- production approval ledger id/hash
- 完整 slots（含 availability 与 token）
- budget、layouts、reducedMotion 和 governance

tick、sourceState 与不影响预览租约的 muted 不纳入该水位。availability/token 变化必须通过新 presentation epoch/reset 引入，不得在原 A6.6 Owner 上规划新命令。

规划前还会以 rejecting loader/disposer 短生命周期构造 A6.6 Owner，复用其正式 binding validator 检查当前 catalog、provenance、budget、preview strategy、availability、fallback 与 token 算法。该过程不 acquire/release，loader/disposer 调用数必须为 0。

## 失败与生命周期

- exact-key、getter/thenable、tick 回退、伪造 ledger、隐藏/重复/乱序 ID 和同 epoch binding 漂移均在提交前拒绝。
- `TypeError`/`RangeError` 合同拒绝保留上一计划；非预期内部错误清空并进入 failed。
- 同 tick 同输入返回同一计划且不推进activation序号；高 tick 允许 screen 切换；reset 清空ledger与activation计数并要求新 epoch；destroy 幂等。

## 顺延验证

本批未运行 test、typecheck、lint、build、性能或设备验证；不得将本文解读为 A6.6 租约执行、正式资产加载或 `catalog-complete` 目标已通过。
