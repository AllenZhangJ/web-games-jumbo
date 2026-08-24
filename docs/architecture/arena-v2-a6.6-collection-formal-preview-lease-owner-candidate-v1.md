# Arena V2 A6.6 收藏正式预览资源租约 Owner 候选 V1

状态：`production-unreachable / code-written-not-run`
硬门：`false`
默认 Surface：`false`
验证：全部顺延；本阶段未运行测试、类型检查、构建、截图、浏览器、设备或性能任务。

## 1. 范围与技能

本切片只增加 renderer-neutral 的资源租约 Owner，不增加页面、动作、二进制资产、Three 对象或加载器实现。使用顺序与影响如下：

1. `game-art-director`：未批准地图、missing 资产和程序化几何不得成为正常收藏预览；正式资产门不能被“能加载”替代。
2. `media-asset-management`：请求绑定 epoch、catalog hash、assetId、SHA-256 与 A6.4 token；同资源去重、租约计数、迟到回收、失败有界。
3. `threejs-game-ui-designer`：加载失败仍保留名称、形状与纹理语义；reduced-motion 不自动旋转，静音不改变预览含义或选择动作。

已读直接参考：

- `.agents/skills/media-asset-management/references/responsive-image-patterns.md`
- `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md`
- `.agents/skills/threejs-game-ui-designer/checklists/game-ui-quality.md`
- `.agents/skills/threejs-game-ui-designer/checklists/hud-readability.md`
- `.agents/skills/threejs-game-ui-designer/checklists/responsive-ui-fit.md`
- `.agents/skills/threejs-game-ui-designer/checklists/mobile-input.md`
- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-development-alignment-matrix.md`
- `docs/architecture/arena-v2-production-development-plan.md`
- `docs/architecture/arena-v2-a6.4-collection-formal-asset-reuse-binding-candidate-v1.md`
- `packages/arena-product-presentation-three/src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.ts`
- `packages/arena-presentation-runtime/src/presentation-asset-load-task.ts`

泛化技能要求的 `docs/collaboration-protocol.md`、`docs/game-design-theory.md` 与 game-art-director 模板在本仓库不存在；本阶段未创建占位文件，继续登记为治理缺口，项目专用 Art Bible、对齐矩阵、生产计划和正式资产目录优先。

## 2. 输入与信任边界

唯一资源目录输入是 A6.4 已验证快照。Owner 不只信任快照自报：它值导入 `ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1`，固定当前 catalog hash/revision，并逐项核对 kind、definitionId、assetId、runtimeSourceKey、SHA-256、maturity、provenance 批准事实和预算。coherent substitution 即使同步重算 token 也会在构造期失败。快照顶层 budget、双 viewport layout、无障碍和治理对象同样 exact-key 且关键值闭合。

构造通过后，Owner 只保存后续请求所需的最小身份：

- `epochId`
- `catalogContentHash`
- `kind / definitionId / assetId`
- `sha256`
- `requestToken / releaseToken`
- `requestPermitted`

A6.6额外绑定当前逐资产生产批准证据账本 identity 与逐项事实。来源 provenance 的批准人/日期不能充当生产批准。
当前账本下没有任何槽位可抵达 loader；下列`true`条件不是当前事实，只是未来新 ledger version + 独立 gate 均通过后才允许由新版本重新定义的能力：

- `formalReady=true`
- `assetUsePermitted=true`
- `previewSourceUse=formal-glb-permitted`
- `availability=catalog-bound`
- `maturity=verified-intake-only`
- provenance 有批准人和日期
- 单项预算已闭合
- A6.4 request/release token 可复算且非空

当前允许身份集合精确为空：20把 `catalog-bound` 武器、2张地图以及任何missing项都必须是
`formalReady=false / assetUsePermitted=false / requestPermitted=false`，token均为`null`，并在 loader 调用前拒绝。
`runtimeSourceKey` 只用于A6.4目录身份核对，不会传给loader。当前路径因此为0 load、0 lease、0 dispose；页面只保留文字、形状和纹理语义。

## 3. 生命周期真值

| 情况 | Owner 行为 | 可见结果 | 资源处理 |
|---|---|---|---|
| 同资产多个可见槽位并发 | 合并为一个 request identity 和一次 load | 各租约共享同一 handle | 最后一个租约 release 才 dispose |
| loader 拒绝或返回无效 handle | 记录有限 failure code，不自动重试 | A6.4 `text-shape-pattern-only` | 无 handle 可释放 |
| 完全相同重放 | active acquire 在全局 tick 门前返回原 Promise；release 返回幂等 | 不改变可见态 | 已release的leaseId禁止重新acquire，避免返回已dispose handle；冲突重放拒绝 |
| 部分租约在 loading 时释放 | 只移除该租约 | 该租约不发布 handle | 仍有租约则继续共享加载 |
| 全部租约在 loading 时释放 | 调用 cancel 一次并标记 stale | 不发布 handle | 迟到成功立即 dispose 一次 |
| epoch reset | 原子失效旧租约、token 与失败缓存；tick 水位采用新 A6.4 snapshot tick | 新 epoch 可从 0/1 独立开始且只接受新 token | ready 立即释放；loading 只标记取消，未 settle 前仍计 pending |
| destroy | 失效全部可见租约 | 后续 acquire/release 拒绝 | ready 释放；loading 取消且迟到释放 |
| disposer 异常 | 保留原handle与resource账本，Owner转`failed` | 后续业务消费fail closed；destroy只重试该未完成disposer | 未完成时记`destroy-incomplete`，成功后才清handle与cleanup债务 |
| loader/disposer/cancel 回调重入 | `getSnapshot` 与所有写操作均拒绝并留下 reentry 标记 | 不暴露资源已入表但租约未安装的半状态 | loader 已返回的 operation 仍被保留、取消并负责迟到 dispose |

请求身份精确绑定 `epochId / catalogContentHash / assetId / sha256 / requestToken`。当前 epoch 资源最多 22、跨 epoch 未决原生 Promise 最多 22、活跃可见租约最多 64、租约/释放历史各最多 128、失败身份最多 64。第65个可见租约会在水位、资源表与 loader 发生任何变化前拒绝。历史淘汰会扫描最旧的非活跃租约，不会因最老项仍 active 而无界增长。cancel 不能证明第三方 Promise 已 settle；reset/destroy 后 `pendingResourceCount` 与 `cancelledPendingResourceCount` 继续如实保留，达到 22 时在下一次 loader 调用前失败关闭。失败身份达到上限时按最旧记录淘汰，仅影响诊断与显式后续可见请求，不形成自动重试循环。

Owner 不 fetch、不读取 `runtimeSourceKey`、不创建 DOM 或 Three 资源、不从模型反推路线、收藏、奖励、规则或下一目标。loader 与 disposer 均由未来宿主注入；本切片没有接默认入口。

## 4. 静态测试代码范围（未运行）

- 当前20武器与2地图全部在loader前拒绝，loader/disposer调用均为0，且请求不暴露`runtimeSourceKey`。
- 伪造来源批准、formalReady、token或账本identity均在构造/请求前失败关闭。
- 同资产并发去重、可见槽位 refcount、最后释放一次 dispose。
- loader 失败只输出受限 fallback，后续不自动重试。
- loading 释放、epoch reset、destroy 后迟到成功不发布且最终一次 dispose。
- 首个 disposer 失败后 Owner 转 `failed`，新 acquire/release/reset 拒绝；原handle、resource和失败计数保留。destroy先重试未完成disposer并继续尝试其余资源，全部成功且pending settlement闭合后才进入`destroyed`，否则保持`destroy-incomplete`供同一Owner后续重试。
- loader 闭包重入 `getSnapshot` 被拒，当前 load 转受限 fallback，已返回 handle 迟到时仍只 dispose 一次。
- 其他slot推进tick后，active acquire与已完成release各自幂等；已release leaseId重新acquire明确拒绝且不返回旧handle；冲突重放拒绝；历史只淘汰非活跃项。
- 第65个可见租约纯拒绝，不新增loader调用、不改变tick水位。
- 旧 epoch token、新 epoch 0/1 tick 独立水位、重复 token、同 tick 租约冲突、future field、getter 失败关闭。
- 伪造22槽并同步替换 assetId/SHA/token 的 coherent substitution 在构造期拒绝，loader 调用数保持0。
- 22个跨epoch永不settle Promise 达上限后拒绝新增 loader，并公开 pending/cancelled 事实。
- metadata 保持 `code-written-not-run / defaultSurfaceWired=false / loadsBytesHere=false / createsThreeResourcesHere=false`。

## 5. 七维静态自检

| 维度 | 静态结论 | 未运行门 |
|---|---|---|
| 正式来源/批准 | A6.4快照与当前catalog、生产批准账本逐项闭合；当前22项均不可请求 | 新账本版本、独立gate、SHA/许可/生产批准运行审计 |
| 主流程 | loader/disposer 注入；无默认 Surface、无规则/Profile 写入 | 未证明生产宿主接线 |
| 并发与确定性 | request identity 固定；同资源去重；同 tick 冲突拒绝；新epoch独立tick水位 | 未运行异步竞态测试 |
| 生命周期 | refcount、幂等release、cancel、late dispose、pending上限、cleanup-failed、reset、destroy与清理失败均有显式状态 | 未运行泄漏/双释放测试；cancel后不settle只能阻断，不能伪称回收 |
| 回退/无障碍 | 失败保持文字+形状+纹理；无自动旋转；静音无语义损失 | 390x844/1440x900截图与设备均未运行 |
| 恶意边界 | exact-key、getter/thenable、未知/重复 token、tick 回退失败关闭 | fuzz/全量类型未运行 |
| 治理/回滚 | 仅三个独立新文件，未改 index/package/manifest/资产 | A6.6、A6、正式资产与 Final 门均为 false |

## 6. 回滚

整文件删除以下三项即可回滚，不影响 A6.4、默认 Surface、正式资产目录或二进制字节：

- `packages/arena-product-presentation-three/src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.ts`
- `packages/arena-product-presentation-three/test/arena-v2-collection-formal-preview-lease-owner-candidate-v1.test.ts`
- `docs/architecture/arena-v2-a6.6-collection-formal-preview-lease-owner-candidate-v1.md`

本候选不得被表述为模型加载、视觉截图、设备、真人、性能、正式资产或 A6 阶段通过。
