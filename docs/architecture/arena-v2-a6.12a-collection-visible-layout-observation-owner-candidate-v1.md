# A6.12a 收藏预览可见布局观察 Owner 候选 V1

## 状态

- `production-unreachable`
- `code-written-not-run`
- `validationStatus=not-run`
- `hardGate=false`
- `defaultSurfaceWired=false`
- `readsDom=false`
- `createsThree=false`
- `loadsResources=false`
- `executesA6_10=false`
- `triggersA6_9=false`

本候选只把宿主已经测得的 CSS 整数矩形转换为可复算的可见性事实。它不读取 DOM、不测量元素、不执行 A6.10 命令规划、不触发 A6.9 挂载，也不创建或加载任何资源。视觉、截图、设备与性能证据全部顺延。

## 技能与强制参考

本批依次使用：

1. `game-art-director`：保证表现层只消费 A6.8/A6.4 已验证事实，不从布局、模型或动画反向判定收藏、规则与目标。
2. `threejs-game-ui-designer`：约束 `390×844`、`1440×900`、内容裁切、最小预览槽、安全区、长列表滚动与 reduced-motion。
3. `media-asset-management`：以 A6.6 拒绝型短生命周期 Owner 复核完整 22 槽 binding，并证明观察阶段 loader/disposer 调用均为 0。

项目直接参考：

- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-development-alignment-matrix.md`
- `docs/architecture/arena-v2-production-development-plan.md`
- `docs/architecture/arena-v2-a6.4-collection-formal-asset-reuse-binding-candidate-v1.md`
- `docs/architecture/arena-v2-a6.8-collection-four-screen-read-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6.9-weapon-collection-preview-three-mount-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6-10-collection-visible-preview-lease-command-planning-owner-candidate-v1.md`
- `docs/architecture/arena-v2-a6.11a-collection-preview-lazy-gltf-loader-adapter-candidate-v1.md`
- `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md`

泛化技能列出的 `docs/collaboration-protocol.md` 与 `docs/game-design-theory.md` 在仓库中仍不存在；本批不创建占位文件，以项目 Art Bible、对齐矩阵、生产计划及 A6 合同替代，并继续把缺失项保留为治理缺口。

## 输入边界

一次观察必须完整提供：

- 固定 `epochId`、整数 `tick` 与四页之一的 `screenId`；
- 完整 A6.8 read snapshot；
- `390×844` 或 `1440×900` 的 A6.9 完整 viewport 对象；
- 上轮 A6.10 active ledger；
- 完整位于 viewport 内的内容 clip rect；
- 当前页所有 preview slot 的实际 CSS 整数矩形，按 A6.8 ordinal 一一对应。

slot rect 可位于 viewport 外，以表达滚动列表；其坐标、边界、宽高均受 `±32768 CSS px` 硬界约束，宽高必须为正。输入只接受纯数据，拒绝 getter、thenable、future field、`NaN`、`Infinity`、重复、缺失、未知或错序槽。

当前页闭包为：

- `weapon-index`：精确 20 项；
- `map-index`：精确 2 项；
- `weapon-detail` / `map-detail`：精确 1 项。

完整正式资产 binding 仍须精确包含 20 武器与 2 地图。观察输出只保留当前页，禁止产生 22 项历史诊断。

## 可见性与输出

矩形分类只有三种：

- `fully-visible`：整个 preview rect 都在 clip rect 内；
- `clipped`：两者相交但 preview rect 未完整包含；
- `outside`：无交集。

只有 `fully-visible` 才进入 `visibleDefinitionIds`。`clipped` 不得预加载、规划租约或创建 mount。detail 页的唯一槽必须 `fully-visible`，否则整次观察拒绝。

每个 fully-visible 槽还必须同时满足：

- 当前 screen 的 A6.4 preview strategy；
- 当前 viewport 的 A6.4 layout；
- `minimumSlot=max(strategy minimum, layout minimum)`；
- `safeInset=max(strategy safe inset, layout safe inset)`。

因此移动端 index/detail 分别至少 `72/168 px`，桌面端分别至少 `96/240 px`；安全内缩分别至少 `8/12 px`。

成功输出按 ordinal 排序并包含：

1. 可直接传给真实 A6.10 `plan()` 的完整 `plannerInput`，viewport 使用 A6.10 字符串形式；
2. `visibleWeaponMountLayouts`：只含 fully-visible 且 `formalReady/requestPermitted` 的武器；当前账本下恒为空；
3. `visibleStaticFallbackLayouts`：fully-visible 的地图或 missing/unapproved 武器，只保留文字、形状、纹理回退身份，`requestPermitted=false`；
4. 当前页 `allSlotVisibility`，不积累历史。

## 零资源复核

每次解析完整 binding 时，构造一个 A6.6 拒绝型短生命周期 Owner：loader 与 disposer 若被调用就立即报错。成功快照固定记录：

- `validatedSlotCount=22`
- `loaderCallCount=0`
- `disposerCallCount=0`
- `activeLeaseCount=0`

这只证明 binding 在代码路径上可被 A6.6 的静态 validator 接受，并不证明 GLB 能加载、A6.9 能挂载或设备能显示。

## 水位、并发与生命周期

同 epoch 租约/视觉水位包含：catalog revision/hash、生产批准账本ID/hash、完整slots、budget、layouts、reduced-motion与governance；不包含tick、sourceState、muted或Profile collection source hash。availability、token、批准账本、layout、motion或治理变化必须新建Owner/epoch。

快照中的 `bindingWaterlineCanonicalByteLength` 按 Unicode code point 计算 UTF-8 实际字节数，不以 JavaScript code-unit 字符长度冒充字节长度。

- tick 回退拒绝；
- 同 tick 完全相同输入返回同一快照；
- 同 tick 改 rect、screen 或事实拒绝；
- 高 tick 允许滚动、切 screen、切 selection 与切固定 viewport；
- 因 A6.10 以 snapshot tick 作为布局步骤，宿主必须先生成高 tick A6.8 snapshot，再提交新的可见矩形；不得在同 tick 偷改布局；
- `TypeError` / `RangeError` 合同错误保留上一合法快照；
- 非预期内部错误清空已提交状态并进入 failed；
- destroy 幂等，清空唯一保留的上一结果；无增长历史。

## 七维静态自检

| 维度 | 静态结论 | 未运行门 |
| --- | --- | --- |
| 权威边界 | 仅消费 A6.8/A6.4/A6.10 只读事实，不重判收藏、目标、规则或命中 | 正式宿主未接 |
| 响应式/可读性 | 双固定 viewport、clip、minimum 与 safeInset 均值级闭合 | 无截图、长文与设备证据 |
| 资产治理 | 完整 22 槽经 A6.6 validator；地图与 missing 武器只回退 | 未加载 GLB，许可证/SHA 沿用上游候选 |
| 低动效/静音 | reduced-motion 纳入水位并传给 mount；muted 不影响视觉租约 | 无真人静音/低动效验证 |
| 失败关闭 | exact-key、身份、ordinal、矩形、tick、epoch、binding 漂移均提交前拒绝 | 未运行恶意输入测试 |
| 生命周期/资源 | 观察层零 loader/disposer/Three/DOM；只保留上一快照 | 未执行 A6.10/A6.9/A6.6 真实生命周期 |
| 治理/回滚 | 独立三文件、生产不可达、默认 Surface 断开 | typecheck/test/build/perf/device 全部 not-run |

## 未运行测试代码范围

测试代码登记了移动/桌面矩形、index 滚动行切换、clipped 排除、detail 唯一全显、地图和 missing 武器回退、最小尺寸与 safe inset、重复/缺失/未知槽、同 tick 重放/冲突、高 tick screen/viewport 切换、binding 漂移、恶意纯数据边界、A6.6 零资源复核与 destroy。另将成功输出的 `plannerInput` 直接传入真实 A6.10 planner，代码层登记可组合路径；以上均未运行。

## 回滚

本批无二进制资产、无 index/package/manifest 或默认入口变更。最小回滚为整文件删除本候选源码、未运行测试代码与本文；不影响 A6.4、A6.6、A6.8、A6.9、A6.10、A6.11a 或生产入口。
