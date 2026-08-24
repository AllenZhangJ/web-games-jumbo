# Arena V2 A6.14 收藏预览页面 Surface Host Candidate V1

状态：`production-unreachable / code-written-not-run / validation-not-run`。本批未接默认入口，未运行测试、构建、压测、浏览器或设备验证。

当前生产批准账本下22个收藏预览槽全部为fallback，A6.16不会构造A6.14或Renderer；本Host当前请求、租约、mount、绘制均为0。下述宿主生命周期是未来新账本版本+独立gate后的候选能力。

## 职责

A6.14 是收藏预览候选链的最外层宿主，唯一拥有：

- A6.12c 页面事务 Owner：布局、租约计划、mount 销毁证明、资源命令提交和异步 ready 挂载；
- A6.13 单 Renderer 多槽 Surface：按宿主注入的表现整数 tick 绘制当前已提交 mount。

宿主不创建 DOM、RAF、规则状态、随机源或新的 Three 资源。页面提交 Promise 只等待资源命令批完成，不等待单件 GLB settle。

## 两个显式入口

`submitPage()` 接收 A6.12c 页面输入并原样返回其原生 Promise。exact 同 tick 重放返回同一 Promise，不重复附加宿主提交状态；冲突输入沿用子 Owner 的失败关闭规则。

宿主在 `submitPage` / `renderCurrent` / `getSnapshot` 入口同步页面与渲染子 Owner 状态；异步资源或 mount 迟到失败不会被宿主继续标记为 `active`。

`renderCurrent()` 只在页面事务 active 且至少有一份已提交布局时工作。它读取 A6.12c 的布局和 A6.12b 当前 mount 快照，再把独立的 `presentationTick`、0.5..2 DPR 和四页 screen 交给 A6.13：

- 武器收藏/详情页绘制当前 ready mount；pending/fallback 没有 Three mount；
- 地图收藏/详情页必须提交空 mount 帧，但仍清理画布，防止保留上一页武器像素；
- 资源 Promise 迟到 ready 后，宿主在下一个更高表现 tick 调用 `renderCurrent()` 即可显示，不需要等待页面布局 tick 改变。

页面 tick 与表现 tick 明确分离：前者约束布局、租约与资源事务，后者只约束确定性的绘制序列，均不是墙钟。

## 生命周期

构造顺序是 A6.12c 后 A6.13；A6.13 构造失败时反向销毁空页面事务 Owner，主错与任一回滚错同时保留。销毁顺序固定为 A6.13 Renderer 先停止/释放，再由 A6.12c 销毁 mount 和资源。任一子 Owner 清理不完整都会形成 `destroy-incomplete`，再次调用仅重试该宿主尚未完成的子 Owner，不再调用已返回 `destroyed` 的子 Owner。销毁结果保留两个子结果与固定顺序，并刷新纯数据宿主快照。

## 延后项

A6.14 仍未与现有 11 页 DOM/Canvas 默认 Surface 绑定，也没有页面矩形采集适配器。定向测试代码已写入，但其执行、严格类型、全仓回归、构建、滚动可见性、20 槽并发加载、地图切页清屏、context loss、GPU/内存与真机证据全部顺延到下一统一验证和性能阶段。
