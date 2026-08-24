# Arena V2 A6.11b 收藏可见预览租约命令执行 Owner 候选 V1

当前生产批准证据账本对130项均为`missing-not-approved`，因此A6.10在四收藏页只产生fallback，A6.11b当前精确为0 acquire、0 active record、0 loader/disposer/proof调用。下述租约执行能力仅为未来新账本版本+独立gate后的候选合同，不是当前许可。

## 状态与边界

- 状态：`code-written-not-run` / `production-unreachable` / `defaultSurfaceWired=false`。
- A6.11b 只消费 A6.10 的已规划命令和 A6.8 携带的完整 A6.4 binding，不重新选择预览、不改写 token，不实现 loader。
- Owner 组合并唯一拥有 A6.6 formal preview lease owner；Loader/Disposer 通过端口注入。A6.11b 不依赖 Three.js/DOM，不创建或改写表现资源。
- 构造时先以 descriptor-safe 方式固定 `beforeReleaseBarrier.readDestroyedProof`，成功后才创建 A6.6 子 Owner；访问器、缺失方法或 hostile 原型在子 Owner 创建前拒绝。
- 命令提交顺序固定为：全量 release proof 预检→release→retain→并发发起全部 acquire→发布 fallback/active records。

## beforeRelease 无副作用屏障

`beforeReleaseBarrier.readDestroyedProof()` 是同步、只读的 proof reader。它只能读取上层已发布的 mount-destroyed tombstone，并返回与 `visibleSlotLeaseId`/A6.6 `requestIdentity` 精确闭合的 `destroyed=true` proof。它不得销毁 mount、调用 loader/disposer 或产生其他可观察副作用。

A6.12 协调器负责先调用 A6.9 `destroyMount`，再让 A6.11b 读取已销毁 proof。A6.11b 在调用任何 A6.6 release/acquire 之前收齐本批全部 proof；任一 proof 失败时保留旧 active records 和旧发布快照。

## 非阻塞提交与迟到结果

- `execute()` 返回的唯一 Promise 只表示命令批已校验、提交并发布，不等待 GLB/loader 结束。
- 所有 acquire 在本批中按 A6.10 顺序立即发起，每条 active record 保留预先按 A6.6 公式重算的 `requestIdentity`、原生 `leaseResultPromise`、有界 settlement 状态和已结算结果。
- pending lease 可被后续 plan release 或 destroy 立即取消；迟到 ready/fallback 只进入最多 22 条的诊断窗口，不得重新加入 active records 或恢复 mount。
- exact 同 plan 重放返回同一提交 Promise、同一结果和同一批 lease result Promise，不重复调用 loader。

## 失败关闭、销毁与 reset

- exact-key、tick 回退/同 tick 冲突、binding/ledger/token/request identity 漂移和 hostile accessor/thenable 在状态变更前拒绝，保留旧发布。
- proof 预检之后的 A6.6 release/acquire 非预期失败使 Owner 进入 `failed`，并把销毁水位提升到本次尝试的 plan tick；这样 A6.12b 已按该 tick 发布的 mount proof 仍能被统一销毁读取。Owner 保留可销毁所有权，不宣称半批仍可运行。
- `destroy()` 对当前 active records 逐项读取 proof，proof 失败不中断其他 A6.6 清理；返回 `destroy-incomplete` 并保留缺失 proof 的精确重试身份。
- reset 仅在 active ledger 为空时允许。`reset.tick` 是旧 epoch 命令水位，必须不低于旧 `lastTick`，并原样传入 A6.6；`nextBindingSnapshot.tick` 是新 epoch 自身水位，可从 0 开始。reset 成功后 A6.11b `lastTick` 切换到新 binding tick，不用等值限制或 `Math.max` 掩盖双 tick 语义。

## 候选门状态

本文档仅记录已写入的 production-unreachable 候选边界。定向测试、类型检查、lint、构建、压测、性能和设备验证均未运行；A6.12 协调器、默认 Surface/index/manifest 也未接入。
