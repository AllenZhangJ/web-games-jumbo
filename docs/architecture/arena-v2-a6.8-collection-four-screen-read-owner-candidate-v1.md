# Arena V2 A6.8 收藏四页面统一只读 Owner 候选 V1

状态：`production-unreachable / code-written-not-run`
硬门：`false`
默认 Surface：`false`
验证：统一顺延；本切片未运行测试、类型检查、构建、截图、浏览器、设备或性能任务。

## 1. 目标与边界

A6.8 把既有四个收藏页面收敛为一个 renderer-neutral 只读入口：

- `weapon-index`
- `map-index`
- `weapon-detail`
- `map-detail`

它不新增页面、按钮或成长算法，也不加载资产、不创建 DOM/Canvas/Three 对象。Owner 只编排既有候选：

```text
index：A6.5 → A6.2 ┐
                    ├→ A6.4 → 当前页面只读快照
detail：A6.7 → A6.3┘
```

P6 继续拥有收藏、五情境、地图逐段和唯一下一目标事实；P5 继续拥有动态目录与详情文案；A6.4 继续拥有正式资产资格和回退治理。A6.8 不复制或重算这些决定。

## 2. 输入与输出

输入精确包含：

- 四选一 `screenId`；
- A6.5 使用的原始 Profile/目录输入；
- 详情页面专用的 `selection + P5 detail content + existing selection action`，索引页必须为 `null`；
- 当前 A6.4 formal catalog 与 availability。

输出固定包含：

- 当前 epoch、tick、screen 与 source state；
- 索引页的 A6.2 快照或详情页的 A6.3 快照，二者严格互斥；
- 仅属于当前页面的预览槽：武器索引 20、地图索引 2、详情精确 1；
- 本次已经验证的完整 A6.4 22 槽 `formalAssetLeaseBinding`，可直接交给 A6.6，下一层不必重复执行 A6.5/A6.7 与 A6.4；
- A6.4 的 content identity、预算、双视口布局、无障碍与治理摘要。

当前逐资产生产批准账本下，20武器和2地图全部保持 A6.4 回退：`requestPermitted=false`，请求/释放token均为`null`。
A6.8把生产批准账本ID/hash纳入同epoch租约水位，不把任何当前槽交给loader；A6.6只作为拒绝型边界存在。

## 3. 生命周期与身份门

- 同 tick 完全相同输入返回同一快照；同 tick 冲突拒绝。
- screen 与 selection 可在更高 tick 执行 A→B→A，不冻结整个导航 epoch。
- 同 epoch 固定 P5 collection content 与 formal catalog 身份。
- 同 epoch 还固定 A6.6 实际消费的22槽租约合同（slots、预算、布局、reduced-motion与治理）；availability/token变化必须切换新presentation epoch，tick、source state与静音变化本身不会伪造租约漂移。
- ready 状态固定 Profile Definition、Profile identity，并要求 revision 单调；同 revision 的 Profile 事实不得漂移。
- 每个详情 selection 单独固定 P5 detail content hash。
- 继承正式 resolver 的闭合终态：全部学习项完成后，先按 Definition 规范顺序为缺少个人记录的已注册模式发布一次 0→1 建档目标；全部注册模式均已有记录后，`catalog-complete` 可达并表示自由挑战或刷新个人记录。本 Owner 只透传该身份，不伪造完成态。
- `TypeError`/`RangeError` 合同拒绝保留上一合法快照；非预期内部错误清空并进入 `failed`。
- 每次调用创建的 A6.5/A6.7、A6.2/A6.3 与 A6.4 组件均在 `finally` 中销毁。
- reset 必须使用新 epoch，并清空旧身份水位；destroy 幂等且不保留页面快照。

## 4. 未运行测试代码范围

- 四页面分别输出 20/2/1/1 个当前页槽位。
- ready 与 loading/empty/error/future-profile 不夹带过期 Profile 事实。
- 当前20武器+2地图均无token回退，来源intake批准不能生成生产请求。
- 完整 22 槽 binding 可直接构造 A6.6，且构造过程不触发 loader。
- 高 tick A→B→A 浏览切换。
- screen/detail 错配、tick 回退、future field、getter、thenable 与身份漂移拒绝。
- reset/destroy 与 metadata 保持 `code-written-not-run / defaultSurfaceWired=false`。

## 5. 回滚

删除以下三个独立文件即可回滚，不影响 P5、P6、A6.2–A6.7、默认 Surface 或正式资产目录：

- `packages/arena-product-presentation-three/src/arena-v2-collection-four-screen-read-owner-candidate-v1.ts`
- `packages/arena-product-presentation-three/test/arena-v2-collection-four-screen-read-owner-candidate-v1.test.ts`
- `docs/architecture/arena-v2-a6.8-collection-four-screen-read-owner-candidate-v1.md`

本候选不得表述为收藏页面已接生产入口、资产已加载、浏览器/设备已通过或 A6 阶段完成。
