# Arena V2 A6.12c 收藏预览页面事务 Owner Candidate V1

当前生产批准证据账本下20武器+2地图全部为fallback；页面事务当前提交0 acquire、0 active lease、0 mount，且底层loader/disposer为0调用。资源与挂载事务只保留为未来新账本版本+独立gate后的候选能力。

状态：`production-unreachable / code-written-not-run / validation-not-run`。本批只完成源码与测试设计，不接默认页面，不运行测试、构建、压测、浏览器或真机验收。

## 目标

A6.12c 把已经拆开的四段能力收敛为页面每个整数 tick 的唯一提交入口：

```text
A6.12a 布局观察
  → A6.10 租约计划
  → A6.12b 先销毁旧 mount 并发布 proof
  → A6.11c 提交 release/retain/acquire
  → A6.12b 确认 release 并接管当前 active resource Promise
```

页面宿主只提交当前 screen、固定视口、A6.8 读取快照、内容裁剪矩形和当前页全部槽位矩形。上一轮 active ledger 由 A6.12c 私有持有，调用方不能伪造或漏传。

## 所有权与依赖

- A6.12c 唯一拥有一个 A6.12a、A6.10、A6.12b 和 A6.11c；A6.11c 构造时直接使用 A6.12b 的只读销毁证明端口。
- 构造顺序是布局观察、计划、挂载生命周期、资源执行；失败时按资源、挂载、计划、布局的逆序回收，不得把未完成的资源清理伪报为 `destroyed`；主错与清理错用 `AggregateError` 同时保留。
- 一个 Owner 只服务一个 presentation epoch。切换 epoch 必须完整销毁并新建 Owner，避免 A6.12a 没有 reset 时出现半新半旧组合。
- 本层不创建 Renderer、DOM、RAF、规则状态或随机源；不读取 runtime source，也不等待单件 GLB settle。

## 页面 step 事务

1. 完整布局观察和租约计划先完成输入预检。
2. A6.12b 对全部 release 做全量预检，随后销毁对应 A6.9 mount 并发布 proof。
3. A6.11c 在同一提交微任务中释放旧租约并并发启动全部 acquire。
4. A6.11c 的 Promise 只代表命令批提交，不代表 GLB 已加载。提交成功后 A6.12b 先 `commitRelease`，再 `commitExecution`；每条原始 `leaseResultPromise` 由 A6.12b 旁路观察，ready 时才创建 mount，fallback 或迟到结果不会挂载。
5. 同 tick、同完整输入返回同一个页面 Promise；同 tick 冲突、tick 回退和执行中冲突均拒绝。

A6.10 在生成计划时已经推进内部 activation sequence，因此计划生成后的任何失败都会让 A6.12c 粘滞失败，不能假装页面仍可继续提交。若资源仍处于 `active` 且明确是资源变更前拒绝，A6.12b 会先回滚旧 ready mount；随后仍需销毁并重建整套页面 Owner，确保计划 ledger 与真实资源不会分叉。

A6.11c adapter 或 A6.12b settlement 在提交 Promise 完成后迟到进入 `failed` 时，A6.12c 会在下一次 `getSnapshot` / `getCurrentRenderFacts` / `step` 同步子 Owner 状态并粘滞失败；不会继续对外暴露可渲染的半可用页面。

## 失败与销毁

- 资源变更前拒绝：只在 A6.11b 明确保持 `active` 时回滚 prepared release；页面 Owner 随后 fail closed。
- 部分或未知资源变更：不回挂旧 mount，保留 prepared proof，进入统一销毁路径。
- 销毁顺序固定为：A6.12b 准备全部 mount proof → A6.11c 销毁资源 → A6.12b finalize → A6.10/A6.12a 销毁。
- 首次销毁固定唯一 destroy tick；`destroy-incomplete` 重试只执行尚未完成的资源、mount finalize、planner 或 layout 步骤，不重复销毁已完成的子 Owner。
- A6.11b 在资源事务已经开始后发生异常时，将 `lastTick` 提升到本次计划 tick，保证 destroy 使用与 A6.12b proof 相同的 tick。
- 命令提交微任务仍在运行时拒绝同步 destroy；宿主在该微任务结束后重试，不等待任何 GLB settle。

## 保留边界

- `getSnapshot()` 只给出纯数据计数和状态；`getCurrentRenderFacts()` 仅在页面命令提交完成且 Owner 为 active 时，组合最后一份已提交布局与 A6.12b 当前 mount 快照供 A6.13 使用。它不在提交中的半批状态暴露新旧混合布局，也不写入 Three handle 历史。
- 页面结果保留布局、计划、命令提交结果和当前 mount 快照，供下一层候选宿主消费；仍为生产不可达。
- 不保留 Object3D 历史、不复制资源 Promise、不把 pending 资源变成页面等待条件。

## 延后验证

两份定向测试代码已写入，但以下全部顺延到下一个统一验证/性能阶段：执行定向单测、严格 TypeScript、全仓测试、构建、diff check、20 槽并发资源时序、失败注入、浏览器滚动/切页、真机 GPU/内存及长时 soak。本文件不得据此声称阶段门禁通过。
