# Arena V2 A6.11c 收藏正式预览资源执行组合 Owner 候选 V1

## 状态与唯一所有权

- 状态：`production-unreachable / code-written-not-run / hardGate=false / defaultSurfaceWired=false`。
- A6.11c 构造时消费完整 A6.4 binding 和 A6.11b 无副作用 destroyed-proof reader，唯一拥有一个 A6.11a lazy GLTF adapter 与一个 A6.11b lease command executor。
- A6.11b 的 loader/disposer 同时指向该 A6.11a adapter；不存在第二 loader、第二 disposer、事件总线或重试循环。
- 默认构造由 A6.11a 创建真实 `GltfPresentationAssetLoader`；未运行测试可通过 descriptor-safe 数据字段显式注入底层 loader。访问器不执行，future key 失败关闭。
- 构造中任一子 Owner 失败时按 A6.11b→A6.11a 反向清理；A6.11b 自身也先固定 barrier 方法，再创建 A6.6，避免无法返回的半构造子 Owner。
- 当前生产批准账本对130项均为`missing-not-approved`，A6.4使22个收藏预览槽全部只走fallback；因此当前A6.11c计划精确为0 acquire、0 active lease、0底层loader调用。以下资源生命周期只保留为未来新账本版本+独立gate后的候选能力，不是当前许可。

## execute 与快照原子性

- `execute()` 直接返回 A6.11b 的原生提交 Promise，不包装、不等待 `leaseResultPromise`，因此同 plan 重放保留同一 Promise 身份。
- 命令提交微任务期间，组合快照发布 `state=executing`，但不伪造子 executor 快照。成功后刷新 active/pending/ready/fallback 计数；proof 等可恢复预检失败且两个子 Owner 仍 active 时，精确恢复提交前快照对象。
- 普通单资产 I/O reject 沿 A6.11a→A6.6 转为该租约 fallback，组合保持 active。adapter 合同/cleanup 失败、executor settlement 失败或子 Owner failed 在后续 snapshot/execute 被观察并使组合 failed；failed 是粘滞状态，不会因短暂的 active 快照自动复活。
- 组合 snapshot 只保留子 Owner 的无 handle 健康投影、adapter 计数快照和聚合计数；不暴露 `runtimeSourceKey`、底层 loader、Three handle 列表或规则状态。execute 结果仍保留 A6.11b 面向后续 mount 协调器的原合同。

## reset 与跨 epoch pending

- reset 仅在组合、adapter、executor 均 active，executor active lease 为 0，adapter `readyTaskCount=0` 且未取消 `loadingTaskCount=0` 时转发给 A6.11b。
- 每次合法 reset 只调用一次 A6.11b；tick 回退、future key 等合同拒绝发生在新 epoch 发布前，组合保留原 epoch 水位与原快照对象。
- A6.11b/A6.6 保持双 tick 语义：reset 命令 tick 属于旧 epoch 且不得回退，新 binding 拥有自己的 tick，可从 0 开始。A6.11c 不加入等值限制或 `Math.max` 重解释。
- 已被 A6.6 release/reset 同步 cancel、但底层永不 settle 的 `cancelledPendingTaskCount` 允许有界跨 epoch 保留；这些 task 不发布 handle。A6.11a 上限 20、A6.6 上限 22，新 epoch 容量耗尽时沿子合同失败关闭，不启动无界新 task。

## destroy 顺序与重试

- destroy 顺序固定为 A6.11b executor 先、A6.11a adapter 后。A6.11b 内部先收齐无副作用 mount-destroyed proof，再让 A6.6 release/cancel/dispose。
- 若命令提交微任务仍 executing/in-flight，destroy 在任何子资源变更前拒绝；它不会先杀死 adapter，不会让随后的 acquire 命中已销毁 loader。提交 Promise settle 后可立即重试 destroy。
- 只有 A6.11b destroy 明确返回 `destroyed` 或 `destroy-incomplete`（证明 A6.6 cleanup 已执行）后，才继续 adapter.destroy。若 executor 未返回结果，adapter cleanup 标记 deferred，组合保留可重试所有权。
- executor 因缺少 proof 首次返回 `destroy-incomplete` 时，A6.6 和 adapter 仍完成各自清理；补齐 proof 后第二次 destroy 精确重试并可收敛为 destroyed。已 destroyed 的 exact replay 返回同一聚合结果。

## 未运行边界

本批仅是三文件静态候选。定向测试、typecheck、lint、build、diff-check、压测、性能和设备验证均未运行；A6.12、默认 Surface/index/package/manifest 未接入，不构成生产可达或视觉通过证据。
