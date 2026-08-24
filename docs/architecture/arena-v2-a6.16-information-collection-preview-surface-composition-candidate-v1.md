# Arena V2 A6.16 收藏预览信息 Surface 组合 Candidate V1

## 状态与边界

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- A6.16 组合既有 A6.8、A6.15、A6.14 与 11 页信息 Surface；不新增页面、动作、规则、Profile 写入、RAF 或资源轮询。
- 只处理 `weapon-index / map-index / weapon-detail / map-detail`。非收藏信息页与对局 Surface 都隐藏预览 Canvas。
- 地图和 missing/unapproved 武器仍由 A6.4/A6.8 给出许可结论，并由 A6.18 把既有20武器动作语义与2图20段节奏/地标投影为唯一文字、形状、纹理回退；没有可请求 token 的槽不会进入 A6.6/A6.11a。
- 默认入口、正式资产、浏览器、截图、性能、设备和真人门均未开放。

## 技能与参考

本批按 `game-art-director → threejs-game-ui-designer → media-asset-management` 使用项目技能：

- 美术方向：正式武器只占透明预览中心，不覆盖名称、选中态和既有动作；地图不以未批准 GLB 冒充正式预览。
- UI：A6.15 只接受 `390×844` 与 `1440×900`，DOM 与 Three 共用同一 preview-aware RenderPlan、content clip 和 slot rect。
- 资产：GLB 只按完整可见槽惰性请求；settlement 只触发有界的一次性补绘，不轮询。

直接参考为 Art Bible、A0–A7 对齐矩阵、生产计划、A6.4/A6.8/A6.12c/A6.13/A6.14/A6.15 源码与边界文档。泛化 `game-art-director` 要求的 `docs/collaboration-protocol.md` 和 `docs/game-design-theory.md` 在仓库不存在，继续作为治理缺口登记，本批未创建占位文件。

## 数据与布局同源

每次信息 Surface `render(sourceRenderPlan)`：

1. 由调用方提供当前页 A6.8 输入、未增强的 base Pipeline、既有 selection projection、固定 viewport 和 pixel ratio。
2. A6.15 重算 `base Pipeline + selection`，确认 `sourceRenderPlan` 是既有 selection helper 的唯一真实结果。
3. DOM 使用 A6.15 的 `previewAwareRenderPlan`；A6.14 同次只接收 A6.15 输出的 content clip 与 projected slot layouts。
4. DOM 的滚动偏移先更新自身 RenderPlan 投影，再以更高 A6.16 tick 重算同一组 slot CSS 坐标；不测量 DOM，也不维护第二套网格。滚动源身份由 source identity + revision + 固定 viewportId 共同限定；视口切换时 A6.16 向桥传 0，A6.15 的 viewport-qualified 输出 identity 同时促使 DOM Surface 清零自己的 offset。

非固定视口或非收藏页返回 `null` context，保留原 11 页 RenderPlan，同时隐藏预览 Canvas，不创建 Renderer/A6.14。

## 透明层与旧像素隔离

- 收藏 Canvas 为全屏透明、`pointer-events:none` 的 Three 层；A6.13 只在正式武器 inner preview rect 内使用 scissor 绘制。
- UI 的边框、名称、选择动作和地图/缺失回退仍由 DOM RenderPlan 绘制；Canvas 不新增交互。
- 每个新页面/滚动 frame 在提交或 coalesce 排队前先隐藏 Canvas。只有最新排队 frame 的 A6.14 `submitPage` 完成，且 `renderCurrent` 成功后才重新显示。
- 因此旧武器 A 的像素不会在 map 页、武器 B 页或新滚动位置提交完成前暴露。

## 惰性 Renderer 与资源 settlement

- 构造 A6.16 与 Web Composition 时不创建第二个 WebGL context。
- 当前账本的合法收藏frame只有fallback槽，A6.16在DOM提交后保持Canvas隐藏，不构造A6.14且不调用`rendererFactory`。未来新ledger版本与独立gate提供可请求槽后，factory才在首个合法Three frame调用一次。
- 工厂结果由 dispose-once port 包装。A6.14 构造失败、Renderer 合同失败和最终销毁都会释放同一 Renderer；失败后工厂不可重试。
- GLB settlement 经 notifier 合并为一次性补绘任务；页面 submission/queued frame 仍有优先级，settlement 不会显示旧 frame，也不会创建 RAF、interval 或轮询。Promise 身份以保存的原生 `Promise.prototype.then` 内部槽探测，不依赖 `instanceof`；跨 realm/遮蔽 then 的原生 Promise 在真实 settle 后通知，普通 thenable/accessor 不会被执行。
- A6.16未收到注入loader时，notifier拥有自己创建的`GltfPresentationAssetLoader`；页面销毁后迟到settlement不再调度补绘，且默认loader必须在A6.14预览资源完全释放后销毁。显式注入loader只结束notifier包装生命周期，不越权销毁调用方loader。
- notifier构造失败会按默认loader→layout bridge→read owner反向回滚；每项失败均聚合保留，不把未完整构造对象留下为无主资源。
- scheduler 若在安装期间同步调用 callback 会被拒绝并反向取消；取消必须同步返回 void，异常或 thenable 都不会被误记为已清理。
- 当前没有获生产批准的武器可进入加载；全部由A6.15调用A6.18形成四primitive语义fallback。历史单资源失败生命周期保留为未来版本能力，不是当前正常路径。

## 生命周期与失败关闭

- A6.16 唯一拥有 A6.8 read owner、A6.15 bridge，并在首个合法收藏 frame 后惰性拥有 A6.14。
- `surface.load()` 允许合法同步返回 `this`，但拒绝任何 thenable。若 load 后 bind 失败或解绑端口无效，会反向 dispose Surface、聚合原始与清理错误、进入 failed，且不会调用 rendererFactory。
- `dispose` 先隐藏 Canvas、取消补绘、解绑滚动，再销毁A6.14预览Host/Renderer与构造债务；预览资源完全释放后依次结束notifier及自有默认loader、bridge、read owner，最后销毁底层DOM Surface。各步骤有独立完成水位，只重试缺失步骤。任一同步清理失败都保持 failed，异步 submission 结束不能覆盖为 disposed。
- A6.14 若返回 `destroy-incomplete`，A6.16 保留 Host 引用和 Renderer 所有权供下一次 `dispose` 重试，不伪报 `disposed`。
- `bindIntent` 只在 ready/active 接受；failed/dispose-pending/disposed 均拒绝。`bindScrollOffset` 必须同步返回解绑函数；不合法端口失败关闭。
- Snapshot 明确记录工厂是否调用、Renderer 是否创建、所有权是否已转移、orphan cleanup 以及 hide/unbind/surface/bridge/read/notifying-loader 各清理水位和排队/settlement。

## 未运行测试与治理接线

- 轻量合同测试固定非收藏页/未支持视口不调用 `rendererFactory`，以及 base Pipeline、同步 `surface.load()` 返回、bind 失败回滚、逐步骤 dispose 重试、跨 realm Promise 品牌、双视口身份与一次性工厂的源码边界。
- 独立纵向测试使用真实 A6.4→A6.8→A6.10→A6.11→A6.12→A6.13→A6.14 链和 fake loader/renderer，覆盖命令提交不等待 GLB、提交 coalesce、pending→ready/fallback 单次补绘、滚动重投影、weapon→map 空帧清屏、pending dispose 与 Renderer 反向清理。
- `run-arena-p6-candidate-tests.ts` 已登记 A6.12c、A6.14、A6.15、A6.16 轻量/纵向测试；`check-p6-candidate-boundaries.ts` 与 P6 reachability 测试固定 `production-unreachable`、无新增 action/RAF/poll、惰性 Renderer 及默认三端入口不可达。
- 上述代码仅完成登记，均未运行；不得据此写成自动化通过、浏览器通过或默认 Surface 已接线。

## 七维静态自检

| 维度 | 静态结论 | 顺延证据 |
|---|---|---|
| 视觉/层级 | 武器透明 inner rect，地图/缺失回退留在 DOM | 双视口截图、遮挡与清晰度 |
| 响应式/滚动 | 只接受 A6.15 两个固定视口，clip/slot/offset 同源 | top/middle/bottom 浏览器实测 |
| 主流程 | 四收藏页启用；其他信息页和对局页隐藏；无新页面/动作 | 11 页真实导航回归 |
| 来源/许可 | 继续消费A6.4目录、逐资产生产批准账本、SHA和候选预算；当前22项均不可请求 | 新ledger版本、独立gate、A1.1当前source重建 |
| fallback/无障碍 | 颜色非唯一；地图/missing 不请求；低动效无自动旋转；静音无影响 | 真机、读屏、静音/低动效实测 |
| 生命周期 | Renderer 首次合法 frame 才创建；settlement 一次补绘；迟到settlement不复活补绘；默认loader等待预览资源后释放；销毁不完整可重试 | WebGL context、GPU/内存与迟到任务实测 |
| 治理/回滚 | 状态固定 code-written-not-run；默认入口与硬门关闭 | test/typecheck/build/diff/device 均未运行 |

最小回滚：删除 A6.16 源码与未运行测试，并撤销 A6.17 对该组合的构造引用；不回退 A6.4–A6.15。
