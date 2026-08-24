# Arena V2 A6.17 正式 Web 候选收藏预览接入 Candidate V1

## 状态

- `production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 本批把 A6.16 接到既有、仍不可达的 Formal Web Playable Composition；不改变默认入口、默认 Surface、页面目录、动作目录或玩法 authority。
- 当前修改不是正式资产、浏览器、截图、设备、性能或真人通过证据。

## 接入真值

### Base Pipeline 与 selection 身份

A6.15 的两个输入职责固定为：

- `pipelineResult.renderPlan`：来自 `getInformationCurrentScreenBasePipeline(viewport)`，尚未添加 selection；
- `sourceRenderPlan`：既有 11 页 Binding 已调用 selection helper 后实际交给 Surface 的 RenderPlan；
- `selectionProjection`：由同一 Host 只读提供。

A6.17 不得调用 `getInformationCurrentScreenPipeline()` 填充 `pipelineResult`，否则 weapon/map index 会被二次增强并由 A6.15 失败关闭。

### 双固定视口

- 只有容器 CSS 尺寸精确为 `390×844` 或 `1440×900` 时提供收藏 preview context。
- 其他尺寸继续显示原信息页，不创建收藏 Renderer，不以近似缩放绕过 A6.15。
- pixel ratio 独立限制在 `0.5..2`；CSS slot rect 与 WebGL backing buffer 比例由 A6.13 处理。
- 视口切换时 source RenderPlan identity/revision 保持上游真值；A6.16 将桥接 offset 归零，A6.15 输出 identity 追加固定 viewportId，使 DOM Surface 与 A6.12 projected slot 同一次切换归零。

### Canvas 与 Surface

- Canvas 保持透明、无语义、无 pointer event，并置于信息 DOM 之上；A6.13 scissor 只绘制透明 inner preview rect，已有 DOM 名称、边框、选中态和 action 不被替代。
- 信息页以外、对局 Surface、失败态和新 frame 提交期间都隐藏 Canvas。根 Composition 保存 A6.16 最近一次可见性请求 latch；Surface 切换只能把该 latch 与当前 information/match 状态相与，不能从 `collectionPageVisible` 猜测并闪回旧帧。
- 地图与 missing/unapproved 武器只显示 A6.15 注入的 A6.18 DOM/Canvas语义fallback；其 binding 没有 request token，不会到达惰性 loader。
- 当前 `formalVisualAssetsReady=false`，且逐资产生产批准证据账本对20武器+2地图均为`missing-not-approved`。read-input固定`decorativeAssetState='missing'`，四页全部只走既有文字/形状/纹理回退；不得把来源intake批准误写为生产批准。

## 启动与销毁成本

- Composition 构造只创建 Canvas 元素，不创建第二个 `THREE.WebGLRenderer`。
- 当前纯fallback收藏frame由A6.18标准panel/text完整表达，不会创建A6.14 Host或调用`rendererFactory`，因此0 loader、0 lease、0 mount、0第二GPU context。未来新账本版本与独立gate开放可请求槽后，一次性factory才可惰性创建透明WebGLRenderer。
- 工厂自身及 A6.16 均拒绝第二次调用。Renderer dispose 与 Canvas backing buffer 复位使用独立完成水位；dispose 抛错时不会伪记完成，重试只执行缺失步骤。工厂构造失败与 A6.14 构造失败都聚合原始/清理错误并保留可重试所有权。
- 正常销毁经 `driver → binding → A6.16 → A6.14 → A6.13/A6.12c` 释放；A6.16 保留不完整 Host 供重试，不丢失 Renderer/mount/lease 清理所有权。

## settlement 与调度

- GLB 原生 Promise（含跨 realm/遮蔽 then）按内部槽识别，resolve/reject 只登记一个可取消的一次性补绘；恶意 thenable 不执行，没有 interval、资源轮询或收藏专用 RAF。
- Formal Composition 原有 fixed-tick 对局 driver RAF 不属于收藏预览新增能力。
- 资源完成时若页面提交仍在进行，则由最终 submission 的 `renderCurrent` 绘制最新页面；旧页/旧滚动 frame 不再显示。

## 文件边界

- `arena-v2-collection-preview-read-input-candidate-v1.ts`：只读组合 P5/P6/A6.8 输入，不写 Profile，不加载资产。
- `arena-v2-formal-web-playable-composition-candidate-v1.ts`：提供 base Pipeline、selection、双视口、一次性 Renderer factory 与可见性回调。
- `arena-v2-information-dom-surface-candidate-v1.ts`：滚动先更新 DOM，再同步发布 offset；本轮静态复核后无需修改。
- `arena-v2-information-collection-preview-surface-composition-candidate-v1.ts`：拥有 A6.16 编排、旧像素隔离、settlement 补绘与销毁重试。

## 未运行测试与治理接线

- 根级 A6.16/A6.17 测试按正式 11 页目录逐项证明只有四个收藏页生成 read input，并保留详情 selection 与既有 action 文案。
- 源码治理断言要求 context provider 只能读取 `getInformationCurrentScreenBasePipeline()`；selection 增强后的 `sourceRenderPlan` 由 Binding 交给 A6.16，再作为独立字段送入 A6.15，禁止调用增强后的 `getInformationCurrentScreenPipeline()` 造成二次 selection。
- 同一治理测试固定 `390×844 / 1440×900`、其他视口 `null` 降级、一次性 `rendererFactory`、信息/对局可见性以及 Web/微信/抖音默认入口不可达。
- 测试、治理脚本和 reachability 清单均只写未运行；当前仍是 `code-written-not-run`。

## 七维静态自检与未运行门

| 维度 | 静态结果 |
|---|---|
| 数据身份 | base Pipeline 与 source selection RenderPlan 分离，A6.15 可重算；输出 identity 绑定 viewport |
| 主流程 | 四收藏页可候选接入；非收藏/对局隐藏；无新页面/动作 |
| 响应式 | 390×844、1440×900 精确匹配，其他视口降级为无预览 |
| 资产安全 | 当前账本下22项均不可请求；全部fallback；未批准装饰态固定missing；未来需新ledger版本+独立gate |
| 无障碍 | 交互和语义仍归 DOM；Canvas aria-hidden/pointer-none；静音不影响 |
| 生命周期 | Renderer 惰性一次创建，旧像素先隐藏，settlement 一次补绘，销毁不完整可重试 |
| 治理 | production-unreachable、default entry 未开放、所有验证 not-run |

未运行：test、typecheck、lint、build、diff-check、浏览器、截图、WebGL context 计数、GPU/内存、移动设备、真人。A0.3 真人仍为 `0/10`，A1.1 仍须按当前 source 重建。

最小回滚：撤销 Formal Web Composition 内 A6.16 构造/Canvas 层，并删除 A6.17 文档；A6.4–A6.16 仍保持独立生产不可达候选。
