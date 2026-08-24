# Arena V2 A6.12b 收藏预览挂载生命周期与销毁证明 Owner 候选 V1

## 1. 状态与边界

- 阶段：`A6.12b`。
- 状态：`production-unreachable / code-written-not-run`。
- `hardGate=false`，`defaultSurfaceWired=false`，测试、类型、构建、截图、浏览器、设备与性能证据全部 `not-run`。
- 本候选只拥有一个 A6.9 静态武器预览挂载 Owner，并向 A6.11b 实现无副作用的 `BeforeReleaseDestroyedProofReaderPort`。
- 不拥有、不释放 A6.6 资源租约，不加载 GLB，不创建 renderer / DOM / RAF，不读取 Profile 仓储或游戏规则。
- 地图、`missing/unapproved` 武器和其他静态 fallback 仅记录 `no-mount`，永不进入 A6.9。
- 当前账本下20武器+2地图全部属于该fallback集合，故当前active/pending/ready/mounted记录均为0；A6.12b只保留零资源生命周期与未来版本合同，不得伪造proof或mount。

## 2. 技能与强制参考登记

本切片按以下顺序使用项目技能：

1. `game-art-director`：限定美术不重判规则，候选不得冒充 Final。
2. `threejs-game-ui-designer`：使用 `ui-patterns.md`、`game-ui-quality.md`、`hud-readability.md`、`responsive-ui-fit.md`、`mobile-input.md`，保持既有四页预览、390×844 / 1440×900 和无新交互边界。
3. `threejs-materials-lighting`：读取 `materials-lights-table.md`，仅继承 A6.9 已固定的 HemisphereLight + DirectionalLight，本切片不新增灯光、材质或后处理。
4. `media-asset-management`：将 A6.6 handle 视为借入资源，挂载先销毁、租约后释放，不 dispose 共享 geometry / material / texture。

项目强制参考：

- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-development-alignment-matrix.md`
- `docs/architecture/arena-v2-production-development-plan.md`
- `docs/architecture/arena-v2-a6.4-collection-formal-asset-reuse-binding-candidate-v1.md`
- `docs/architecture/arena-v2-a6.6-collection-formal-preview-lease-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6.8-collection-four-screen-read-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6.9-weapon-collection-preview-three-mount-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6-10-collection-visible-preview-lease-command-planning-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6-11b-collection-visible-preview-lease-command-execution-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6.11c-collection-formal-preview-resource-execution-composition-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6.12a-collection-visible-layout-observation-owner-candidate-v1.md`

`game-art-director` 泛化参考 `docs/collaboration-protocol.md` 与 `docs/game-design-theory.md` 仍不存在。本切片不创建占位文档，以上 Arena 专用 Art Bible、对齐矩阵、生产计划和 A6 合同作为替代约束；该缺失仍是治理红缺口。

## 3. 所有权和非阻塞主流程

```text
A6.12a 当前可见布局 snapshot
              +
A6.11b 非阻塞 execution result / native leaseResultPromise
              |
              v
A6.12b active record ledger
  pending ---------------------------> 不等待、当帧发布
  fallback --------------------------> no-mount
  ready + 仍active + 布局匹配 ------> A6.9 mount
              |
              v
prepareRelease -> destroy mount -> read proof -> A6.11b release -> commitRelease
```

- `commitExecution` 要求 A6.12a 与 A6.11b 在 `epoch/tick/screen/catalog`、完整 binding 水位、active 租约身份、token、挂载布局和 static fallback 上精确对账。
- 最多 20 个 active 武器租约。原生 Promise 只被旁路观察，不替换、不包装、不等待后才提交页面步骤。
- Promise 结果必须闭合 `leaseId/requestIdentity/assetId`。同租约的 settlement 事实或 handle 漂移使 Owner fail closed。
- 租约已移除、Owner 已进入 `failed/destroy-prepared/destroy-incomplete`后的迟到结果只进入 22 条有界诊断，不挂载、不保留新 handle。

## 4. 挂载、变布局与资源边界

- mount ID 是 `a6.12b:<leaseId>:<mountSequence>`，总长不超过 256；sequence 按 `screen+asset` 存储，键数不超过 20 武器×2武器页。
- 同租约、同布局重放幂等。higher tick 中 rect / viewport / screen 改变时，先销毁旧 mount，再用同一 ready handle 和新 sequence 挂载。
- A6.9 继续 clone 静态 Object3D 层级，保留 GLB PBR geometry/material/texture 引用，不修改或 dispose 共享渲染资源。
- 本 Owner 不触发 A6.6 release。上层必须先完成 mount 销毁证明，再调用 A6.11b/A6.11c 释放资源租约。

## 5. 释放事务与销毁证明

### 5.1 普通 release

1. `prepareRelease(planIdentity, commands, tick)` 先预检整批命令，再销毁已挂载节点；pending/fallback/no-mount 也明确产生 `destroyed:true` proof。
2. `readDestroyedProof()` 只读取 proof tombstone，不调用 A6.9，不更改任何状态。
3. A6.11b 释放成功后，`commitRelease()` 删除已释放 active record，不保留 Object3D 历史强引用。
4. 若 A6.11b 在任何资源变更前拒绝，且 executor 仍为 `active`，`rollbackPreparedRelease()` 才能用新 mountSequence 重挂已 ready 租约。
5. `partial-or-unknown` 永不可回滚；Owner 进入 `failed`，防止已 dispose handle 被重新挂载。

### 5.2 页面 Owner destroy 吸收 prepared release

- `prepareAllForOwnerDestroy(tick)` 可从 `active + prepared release` 进入。为避免 A6.11b partial mutation 后卡死，已 prepared 的 lease 必须与 owner-destroy 复用同 tick。
- 已有 proof 若与 `leaseId/requestIdentity/assetId/tick` 全部相同，即使 `planIdentity` 不同也安全复用，不再销毁 mount。proof tombstone 不保留 Object3D。
- 其余 active lease 继续销毁 mount 并补 proof，所有 record 转入 owner-destroy plan，旧 prepared transaction 被吸收并清空，不 remount。
- 任一 mount cleanup 失败时继续尽力清理其余 A6.9 节点，但状态为 `destroy-incomplete`，不伪造未被确认的完整 proof。该结果只是当前轮诊断而非终态；同 tick 再次调用时只续清未完成的 A6.9 债务，待 A6.9 确认 `destroyed` 后为尚无 proof 的 record 补齐 proof，再进入 `destroy-prepared`。已经完整 prepared 后的同 tick 重放才返回同一结果对象。
- `prepareAllForOwnerDestroy()` 不立即销毁本 Owner，以便 A6.11b/A6.11c 继续只读 proof。资源 Owner 完整销毁后，`finalizeDestroy()` 才清空 A6.9、active records、proof 和诊断。

## 6. 有界性、失败关闭与重置

- active 武器租约最多 20；proof 历史最多 64；settlement 迟到诊断最多 22；mount sequence 键最多 40。
- 仅 active record 可持有 ready handle。已释放历史只保留纯数据 tombstone/canonical，已完成 execution replay 用 `WeakSet` 识别。
- 同 tick 完全重放幂等；同 tick 布局、Promise、settlement 或 handle 冲突在可见状态变更前拒绝。
- 内部挂载/销毁失败进入 `failed` 或 `destroy-incomplete`，保留清理所有权；不允许后续新挂载，但 Owner destroy 允许同 tick 仅重试尚未完成的挂载清理。
- 新 epoch 只能在无 active、无 prepared、无 destroy 事务时 reset。旧 epoch 命令 tick 先验证，切换后采用新 binding 的独立 tick 时间域。

## 7. 七维纯源码自审

| 维度 | 静态结论 | 未运行/剩余风险 |
| --- | --- | --- |
| 主流程与身份 | layout、execution、binding、lease、request、asset、token 精确对账；Presentation 不重判收藏/规则 | 类型检查和真实组合未运行 |
| 竞态、去重与原子性 | pending 非阻塞；同 tick 精确重放；冲突先拒绝；prepared 事务明确 | Promise 实际调度与宿主调用顺序未运行 |
| 销毁与资源所有权 | mount 先销毁、proof 后释放；不 dispose 共享资源；partial 不回滚 | 故障注入只写测试代码，未运行 |
| 有界性与长时稳定 | 20/64/22/40 显式上限，无 Object3D 强引用历史 | 长时滚动与内存证据未运行 |
| 视觉一致性与灯光 | 仅继承 A6.9 固定双灯、PBR 引用、无自动旋转 | 无截图、模型加载、近/中/远可读证据 |
| fallback、低动效与静音 | fallback 永不挂载；reduced-motion 透传到 A6.9；本层无音频依赖 | 低动效/静音仅合同等价，设备未验证 |
| 治理、回滚与可达性 | 独立三文件，不修改 index/default Surface/manifest/二进制；整切片可删除回滚 | 泛化技能两份参考仍缺；生产接线、设备、真人、性能全关闭 |

## 8. 回滚点

本切片未修改任何既有入口、包导出、manifest 或资产。最小回滚为整体删除以下三个新文件：

- `packages/arena-product-presentation-three/src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.ts`
- `packages/arena-product-presentation-three/test/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.test.ts`
- `docs/architecture/arena-v2-a6.12b-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.md`
