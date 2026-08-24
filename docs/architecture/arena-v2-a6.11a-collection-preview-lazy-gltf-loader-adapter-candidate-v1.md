# Arena V2 A6.11a 收藏预览惰性 GLB 加载适配器候选 V1

## 状态与边界

- 状态：`production-unreachable / code-written-not-run / hardGate=false`。
- 写入范围：独立适配器源码、未运行测试代码、本文件；未修改默认 Surface、index、package、manifest 或资产字节。
- 适配器直接实现 A6.6 的 `ArenaV2A6FormalPreviewLoaderPortV1` 与 `ArenaV2A6FormalPreviewDisposerPortV1`，但未接默认入口。
- `loadsBytesHere=true` 只描述适配器能力；当前账本下 `currentLoadsBytesHere=false / currentLoaderReachableAssetCount=0`，不会创建单资产任务。`lazy=true / preloadsCatalog=false`。它不创建场景、相机、灯光、renderer 或 DOM，不读取 Profile，也不判断收藏、路线、规则或奖励。
- GLTF loader 会创建 Three 资源，`PresentationAssetLoadTask` 持有并释放其 lease；因此登记为 `createsThreeResourcesThroughInjectedGltfLoader=true / ownsThreeResourcesThroughTaskLease=true / directlyDisposesSharedResources=false`，不再错误宣称本层不创建 Three 资源。

## 技能与强制参考

本阶段按 `game-art-director → media-asset-management` 使用技能：前者要求候选不冒充 Final、正式目录与视觉用途一致；后者要求来源、版本、许可、SHA、惰性获取、释放与撤回边界可审计。直接参考：

- `docs/architecture/arena-art-bible.md`：武器轮廓、正式资产四门、来源与预算、程序化 fallback 禁止冒充正常路径；
- `docs/architecture/arena-art-development-alignment-matrix.md` 与 `docs/architecture/arena-v2-production-development-plan.md`：A6/P6 只读依赖、生产不可达状态与顺延验证；
- `docs/research/arena-kaykit-adventurers-intake.md`：固定 KayKit revision、CC0、20 件武器附件候选的字节与 SHA-256；
- A6.4/A6.6/A6.9 源码和交付文档：正式预览目录、可见槽租约、Object3D 静态挂载边界；
- `arena-v2-formal-presentation-asset-catalog-candidate-v1.ts`、`presentation-asset-load-task.ts`、`gltf-presentation-asset-loader.ts` 与正式 Three preloader：当前 visual registry、task lease 与 GLTF 返回合同。

`game-art-director` 泛化要求的 `docs/collaboration-protocol.md`、`docs/game-design-theory.md` 及技能模板在仓库中不存在；本阶段沿用项目专属 Art Bible、对齐矩阵和生产计划，不创建占位文件，该缺口仍是治理登记项。

## 目录与请求闭包

构造期值导入当前 A6.4 catalog 与逐资产生产批准证据账本，闭合20武器+2地图身份。当前账本130项全部为
`missing-not-approved`，因此适配器允许集合精确为0，任意A6.6请求均在创建task和调用底层loader前拒绝。

来源intake批准、Catalog存在和候选预算覆盖均不能推导生产批准。未来只有新ledger version与独立gate才能重新开放；届时每项仍必须同时满足：

1. A6.4 与正式 catalog 的 definitionId、assetId、artifact/sourceKey、SHA-256、字节、maturity、许可和批准身份一致；
2. Registry Definition 为 `attachment + GLTF_ATTACHMENT_V1`，sourceKey 与正式 record 一致；
3. `verified-intake-only`、批准人/日期存在、单件不超过 64 KiB；
4. 两张 `authored-candidate-not-approved` 地图只作为拒绝反证，永不进入允许集合。

A6.6 请求不携带 `runtimeSourceKey`。适配器只用 `assetId + sha256` 查内部固定映射，复算：

- A6.4 request token：`epochId + catalogContentHash + kind=weapon + definitionId + assetId`；
- A6.6 request identity：`epochId + catalogContentHash + assetId + sha256 + requestToken`。

路径只随可信 Registry Definition 进入底层 loader，不进入 A6.6 handle、快照、错误文本或日志。

## 惰性代次与资源所有权

- 仅可见槽触发 `load()`；每个 requestIdentity 同时最多一个活跃代次，并发相同完整 canonical 返回同一原生 operation。
- 全适配器最多 20 个活跃 task；不会构造 20 项目录预加载。
- pending cancel 同步幂等；task 尚未 settle 时，同身份重入只能取得当前已取消 operation，不能启动第二代。迟到 lease 由已销毁 task 回收，handle 不发布；该内部迟到释放若失败仍计入 cleanup failure 并关闭 Owner。
- ready handle 只返回当前 `three` 依赖的 `Object3D`；GLTF value 必须 exact-key、asset/sourceKey 一致且 `animations=[]`。A6.9 自行 clone hierarchy，本适配器不 reparent、不修改或直接 dispose geometry/material/texture。
- A6.6 最后一个可见租约释放后调用 disposer；适配器调用对应 task 的 `destroy()`，若底层lease释放失败则保留task、handle和失败债务，只在task已settle后重试未完成清理。完成后同一 requestIdentity 可在武器再次进入视口时启动新代并得到新 handle。
- dispose 幂等以 `WeakMap<Object3D, canonical>` 记录 handle 级事实：旧 handle 的完全相同重放幂等，冲突重放拒绝；新代新 handle 合法，不以 requestIdentity 单键永久封死，也不强引用无界历史。
- adapter `destroy()` 在 failed 或 `destroy-incomplete` 状态仍遍历其余task；清理失败保留task record，后续destroy只重试尚未完成的settled清理。pending task在底层settle前保持债务，迟到lease仍由同一task释放；成功后才移除record和cleanup计数。上层顺序仍为先销毁 A6.9 mount，再释放 A6.6 lease，最后销毁本适配器。
- 底层若返回无效lease且其自带release同步失败，原始lease owner与已捕获release方法同样进入task record；后续destroy重试该无效lease清理，成功前不删除record，不把局部AggregateError误当成资源已释放。
- loader、lease release或task destroy即使抛出`null/undefined`等非Error值也使用独立失败布尔记录；`null`不会再与“没有失败”的内部哨兵混淆，清理债务和failed/destroy-incomplete状态必须保留。
- 未注入loader时，适配器显式拥有自己创建的`GltfPresentationAssetLoader`；只有全部task（含取消后的迟到settlement与清理债务）退出台账后才销毁。销毁不完整会保留底层loader债务并反映在`cleanupFailureCount / destroy-incomplete`，不能先释放共享LoadingManager handler。显式注入的loader继续由调用方持有，适配器不得越权销毁。
- 默认GLTF loader若通过宿主`createImage`桥加载外部纹理，会先取消仍等待`onload/onerror`的图片请求并让其失败settle，再等待GLTF task退出和移除LoadingManager handler；图片解码永不回调不能成为永久清理阻塞。
- 纹理失败只有在GLTF的`onError`同步确认后才算settled；错误回调自身失败或返回thenable会保留纹理请求Owner与`destroy-incomplete`，不会提前移除handler后让上层Promise失去唯一结算路径。

## 失败分类

| 分类 | 结果 | 后续新武器 |
| --- | --- | --- |
| 单资产 I/O 或底层普通 reject | 仅该 operation reject；A6.6 显示文字/形状/纹理 fallback | 允许继续 load |
| A6.4 token、SHA、catalog、未知/地图身份不符 | 调用底层 loader 前拒绝该输入 | 适配器仍可服务合法输入 |
| lease/value exact-key、静态 Object3D、sourceKey、动画合同破坏 | task 回收，适配器进入 `failed` | 禁止新 load |
| loader/release 反向重入、lease release/task cleanup 失败 | 进入 `failed`；destroy 继续清理 | 禁止新 load |
| destroy 时仍有清理失败或未settle task | `destroy-incomplete`并保留原task/handle债务 | 禁止新load；允许同一Owner继续清理 |

普通单资产失败不增加 `cleanupFailureCount`，也不让适配器全局失败；A6.6 已有 failureIdentity 防止同 epoch 自动重试风暴。正常 `PresentationAssetLoadTask.destroy() → wrapped lease.release()` 是可信内部控制流：task 外层只登记一次销毁所有权，不设置外部回调门；只有真正进入底层 release 回调时才启用反向重入门。同步 release 成功不会增加 reentry/cleanup 计数；同步抛错、异步返回、thenable 或取消后的迟到释放失败才进入 cleanup failure。

## 未运行测试代码与静态自检

测试代码登记但未执行：当前20武器+2地图全部底层零调用、未知/future/accessor输入拒绝、快照活跃task/ready均为0，以及生产不可达、未运行、新ledger版本+独立gate边界。历史可加载生命周期测试不再作为当前真值。

七维静态结论：

1. **目录/来源**：双目录、Registry、许可、批准、SHA 与预算逐值闭合，不复制 20 个生产 ID；来源仍为现有 CC0 intake。
2. **惰性/容量**：每个可见身份单 task、同时最多 20；无目录 preload，完成诊断有界，dispose handle 历史为弱引用。
3. **身份/竞态**：完整 canonical 防 8 位 hash 碰撞放行；同代去重、取消未 settle 阻止并发新代、释放后允许合法再入屏。
4. **失败关闭**：输入身份在状态和 I/O 前验证；普通 I/O 局部 fallback，合同/重入/cleanup 才全局 failed。
5. **资源生命周期**：task lease 是单资产 Three 资源 owner；adapter只拥有未注入时自己创建的底层loader，destroy先收敛全部task与迟到lease，再释放默认loader，显式注入loader仍由调用方持有。
6. **主流程**：只把 Object3D 交给 A6.6/A6.9，不暴露路径，不加载地图，不从模型重判收藏、规则或路线。
7. **治理/回滚**：`defaultSurfaceWired=false`，浏览器、截图、设备、性能和所有自动验证均为 `not-run`；整批回滚只删除本阶段三个新增文件。

本文件是静态候选说明，不是运行、视觉、设备、真人、性能、正式资产或 Final 通过证据。
