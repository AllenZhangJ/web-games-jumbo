# Arena V2 A6.15 11 页 RenderPlan → 收藏正式预览布局桥接 Candidate V1

## 1. 状态与边界

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- `defaultSurfaceWired=false`；本批没有修改默认 DOM/Canvas Surface、manifest 或二进制资产。
- 本批只为既有 11 页信息 Pipeline 中的 `weapon-index / map-index / weapon-detail / map-detail` 四页增加纯数据组合；页面数、主动作数、selection action 数均不增加。
- 不读 DOM、不测量元素、不创建 Three、renderer、loader、RAF 或资源租约；不读取 Profile 仓储，也不参与收藏、目标、地图、命中或规则判定。
- 2026-08-13 增量兼容武器池在选择卡上成对提供的 `available / unavailableReason`：桥接层保留未开放卡片的禁用动作与原因，拒绝缺一字段、状态/原因矛盾或 selectedId 指向未开放项，不再把合法武器池状态误判为旧字段漂移；不因此开放武器、改变当前装备或新增交互。
- 所有测试、typecheck、lint、build、diff-check、截图、浏览器、性能与设备门按用户要求顺延，本文不得被解释为视觉或运行门通过。

## 2. 技能与强制参考

本批按固定顺序完整读取并使用：

1. `game-art-director`
   - 未来正式武器 GLB 预览中心保留为透明区域，只允许既有 A6.13 绘制；当前22项均由A6.18文字、形状、纹理语义 fallback 占满，不保留空白Three中心。
   - 泛化技能要求的 `docs/collaboration-protocol.md` 与 `docs/game-design-theory.md` 在仓库中不存在，继续登记为治理红缺口；本批没有创建占位文件。
   - 项目替代真值：`arena-art-bible.md`、`arena-art-development-alignment-matrix.md`、`arena-v2-production-development-plan.md`。
2. `threejs-game-ui-designer`
   - 已重读 `ui-patterns.md`、`game-ui-quality.md`、`hud-readability.md`、`responsive-ui-fit.md`、`mobile-input.md`。
   - 约束为：单一矩形真值、390×844/1440×900 双视口、48px 既有动作、长文本语义保留、无颜色单编码、无新增交互。
3. `media-asset-management`
   - 已重读技能正文与 `responsive-image-patterns.md`。
   - 本桥不加载字节；它只透传 A6.8/A6.4 已验证的 assetId/SHA/批准与 fallback 结论给下游布局链，未批准地图不能因出现 panel 而获得加载资格。

当前生产批准账本对130项均为`missing-not-approved`；因此四个收藏页的22项panel全部显示文字/形状/纹理fallback，武器透明Three中心当前也不得产生资源请求。只有未来新账本版本+独立gate可改变该结论。

直接接口参考还包括：

- `arena-v2-information-screen-pipeline-v1.ts`
- `arena-v2-ui-render-plan-v1.ts`
- `arena-v2-information-screen-layout-v1.ts`
- `arena-v2-information-selection-render-plan-candidate-v1.ts`
- A6.4、A6.8、A6.12a、A6.12c、A6.13、A6.14 当前源码与边界文档。

## 3. 输入身份与失败关闭

桥接 Owner 固定一个 presentation epoch，每次 `compose` 只接受 exact-key 纯数据：

- 整数 tick；
- 固定 `390x844` 或 `1440x900` viewport；
- 整数 `scrollOffsetCssPixels`，并同时携带其 source RenderPlan identity/revision；
- `ArenaV2InformationScreenPipelineResultV1`；
- index 页的既有 selection projection（detail 页必须为 null）；
- selection helper 已实际生成的 source RenderPlan；
- 同 epoch/tick/screen 的 A6.8 四页 read snapshot。

组合前独立重算 `addArenaV2InformationSelectionToRenderPlanCandidateV1(basePlan, projection)`，再与输入 source RenderPlan 逐值比较。因此以下事实不能靠调用方自报：

- selection panel/label/description/action 是否完整；
- raw definitionId 与 `encodeURIComponent(definitionId)` 的 action intent 是否匹配；
- selectedId、label、20 武器/2 地图目录顺序是否与 A6.8 slot/A6.2 page 对齐；
- Pipeline view model、render model、layout、base RenderPlan 的 screen/revision/scroll viewport 是否同源。

每个 RenderPlan identity 在 Owner 内仅保留两个固定 viewport 各自最新的 `{revision, canonical}`，identity 总数仍固定为四页上限。这样同一上游 identity 可在移动/桌面布局间合法切换，但同一 viewport 内的 revision 回退或同 identity/revision 内容漂移仍会拒绝。tick 回退和同 tick 冲突同样在输出发布前拒绝；exact 同 tick 重放返回同一结果引用，不保存滚动历史。

source RenderPlan 的 identity/revision 保持上游原值，不因预览桥接被改写；输出的 preview-aware RenderPlan identity 固定为
`{sourceIdentity}:a6.15-preview-aware:{viewportId}`。因此同一 source identity 在 `390×844 ↔ 1440×900` 切换时会形成新的输出身份，既有 DOM Surface 会原子清零自身 `scrollOffset`，A6.12 projected offset 也从 0 重建，不能把移动端滚动水位带入桌面端或反向带回。

## 4. Index 页：复用 selection 卡片，不复制网格

`weapon-index` 与 `map-index` 必须从 source RenderPlan 中找到 helper 已生成的四件套：

```text
selection:{kind}:{rawDefinitionId}:panel
selection:{kind}:{rawDefinitionId}:label
selection:{kind}:{rawDefinitionId}:description
selection:{kind}:{rawDefinitionId}:action
```

桥接不会重算列数、卡片 x 或卡片宽度。它读取真实 panel 的行 y，并仅按原行序增加卡片高度：

- 390×844：A6.4 index 最小预览边为 72px、安全内边距 8px；
- 1440×900：最小预览边为 96px、安全内边距 12px；
- label/description 被移到预览区域之后；
- 原 action 仍覆盖完整最终卡片，intent/label/enabled/48px 合同保持；
- source scroll content 的末端按实际增量扩展，不生成第二套 grid。

未来正式可用武器的 `formal-preview:*:panel` 中心可为 transparent 并交给 A6.13；当前账本下没有此类槽。20武器与2地图在相同 panel 内统一消费A6.18的唯一语义profile：三个有界shape/pattern panel加一个glyph/text，分别绑定既有武器动作语义或地图路线节奏/地标，同时保持没有资源请求能力。

## 5. Detail 页：唯一不可点击 preview panel

`weapon-detail` 与 `map-detail` 没有 selection grid。桥接在 `page-question` 之后、第一项受 content viewport 裁剪的字段之前插入一个唯一 panel：

- 390×844 的实际 Three/fallback 内槽为 200×200；
- 1440×900 为 260×260；
- 两者均大于 A6.4 的 168/240 detail 最小值，并继续采用 8/12 safe inset；
- panel 内标题只显示既有 displayName 与上游唯一目标标记；panel 不可点击；
- 所有位于插入点之后且受 content viewport 裁剪的 primitive 同量下移；
- `primary-action` 与底部 navigation 均不移动，避免覆盖或新增主流程；
- scroll contentHeight 只增加 panel 高度与固定间距。

当前武器与地图内槽均固定 A6.18 fallback。只有未来新批准账本版本和独立gate可让武器内槽变为透明Three中心；未批准地图不会进入 A6.13，也不会生成 GLB 请求。

A5/A6武器战斗语法候选在组合完成后复用同一重排核心：`weapon-index`原位重排每卡A6.18既有3个panel，`weapon-detail`只原位重排当前选中武器的同构3个panel。语法事实来自正式20武器内容目录与`arena-definitions`值域，primitive ID/role/text/action/48px和总数均不变；index/detail同武器同标准rect的相对签名一致，详情实际200/260px槽另做整数边界闭包。索引20卡重排60项、详情重排3项，primitive增量均为0并继续硬拒绝`>256`；完整重放幂等，source/selection/详情武器、partial fallback、几何或文字/action漂移失败关闭。未来获批GLB透明中心原引用旁路，故该接点不创建资源，也不改变本节当前0批准、0 token和fallback-only真值。

地图路线身份也在组合完成后复用唯一route geometry核心：`map-index`保留既有每卡3个路线panel（总增量6），`map-detail`只原位重排当前地图A6.18既有3个fallback panel（增量0）。详情输出必须绑定基础或`browse-map` source identity及固定viewport后缀，390×844/1440×900分别只接受200×200/260×260；同地图同rect的相对签名由同一核心生成。源详情panel的ID/clip/tone/radius/zIndex、标题、主动作和文字语义均保留；partial、身份/尺寸/clip漂移在输出前失败关闭。当前两图仍全部是未批准fallback，不产生Three、request、lease或mount。

## 6. 滚动与 A6.12c 接口

preview-aware RenderPlan 始终保存未滚动的内容坐标，供 DOM/Canvas 使用同一最终 panel/文字/action 布局。宿主提供的 `scrollOffsetCssPixels` 只用于把 preview 内槽投影为当前 CSS 坐标：

```text
projectedY = storedPreviewY - scrollOffsetCssPixels
```

输出 `a6_12cLayoutInput` 精确含：

- `contentClipRectCssPixels = previewAwareRenderPlan.scrollRegion.viewport`；
- 当前页完整、有序、整数坐标的 `slotLayouts`。

offset 必须绑定当前 source RenderPlan identity/revision，是安全整数且位于 `0..contentHeight-viewport.height`。桥接不判断 fully-visible/clipped/outside；A6.12a 继续是唯一可见性分类与租约资格 Owner。滚动改变可见布局时必须使用更高 tick A6.8 页面步骤，不能同 tick 偷改矩形。

视口切换不修改 source RenderPlan identity；A6.16 传入 offset=0，同时 A6.15 通过 viewport-qualified 输出 identity 触发 DOM Surface 清零。两条链必须同时成立，禁止只清 Three 投影而保留 DOM 旧滚动位置。

## 7. 与 A6.12a / A6.13 / A6.14 的接点

```text
11页 Pipeline + selection RenderPlan + A6.8 read snapshot
                         ↓ A6.15
preview-aware 标准 RenderPlan ─────────────→ DOM / Canvas 后续绘制
content clip + current CSS slotLayouts ───→ A6.12c.step
                                              ↓ A6.12a
                                      fully-visible weapon layouts
                                              ↓ A6.12b / A6.9
                                      mount snapshot
                                              ↓ A6.14 → A6.13
                                      单 renderer 多槽绘制
```

A6.15 不调用 A6.12c，不创建 mount，也不触发 A6.13。A6.14 仍未接默认 11 页 Surface；后续宿主必须让 DOM/Canvas 使用 `previewAwareRenderPlan`，并把同一 compose 结果的 clip/slotLayouts 提交给 A6.12c，禁止两条矩形链分叉。

## 8. 七维静态自检（仅源码阅读）

| 维度 | 静态结论 | 仍未证明 |
|---|---|---|
| 视觉一致性 | 当前22项使用A6.18唯一形状/图案/glyph；未来获批武器才使用透明Three中心；名称/选中态沿用 A6.4/A6.8 | 双视口DOM/Canvas与未来Three合成截图 |
| 首屏与滚动可读性 | 双视口最小槽、safe inset、详情唯一 panel、内容坐标与投影坐标分离 | 长中英文、top/middle/bottom 浏览器实测 |
| 主流程与交互 | 原 action 数量、intent、48px 与底导航不变；detail panel 不可点 | 键盘焦点与真实 DOM/Canvas 行为 |
| 来源与许可 | 只消费 A6.8 已验证 slot；地图未批准始终 fallback | 当前 source 下 A1.1 来源包重建、设备资产 reachability |
| reduced-motion / muted / fallback | 不创建动画或音频；A6.8 reduced-motion 真值继续下传；missing/unapproved 不伪装 | 真实静音、低动效和资产加载失败运行证据 |
| 生命周期与资源 | 纯数据 Owner；每页最多 20/2/1 槽；无 DOM/Three/loader；history 固定四 identity | A6.12c→A6.14 的运行清理与 GPU/内存证据 |
| 治理与回滚 | exact-key、同 tick 幂等、revision/identity/scroll fail closed；默认入口断开 | typecheck/test/build/diff-check 与协调签核 |

## 9. 测试代码与顺延门

未运行测试代码已写出以下覆盖：

- 390×844/1440×900 × 四页；
- 20 武器、2 地图、detail 单槽；
- 真实 selection panel x/width 复用与卡片扩高；
- detail 插入、后续字段平移、主动作不动；
- top/middle/bottom scroll 投影；
- 伪 action encoded id、selected drift、缺失/重复 primitive、revision 回退、offset overflow 的零输出拒绝；
- 当前20武器/2地图A6.18唯一语义fallback、未来获批武器透明中心的门禁分支；
- exact replay、同 tick 冲突与 destroy。
- preview-aware 输出 identity 显式含固定 viewportId，source identity 保持不变，双视口切换可触发 DOM/A6.12 同步归零。

这些只是测试源码，当前不得写成通过。A0.3 真人、A1.1 当前 source 重建、正式截图、浏览器、三端设备、性能与 Final 均继续 fail closed。

## 10. 回滚

A6.18接入的最小回滚是恢复本文件中两处通用fallback projector调用，并删除A6.18源码、测试、包导出和
状态文档；无需恢复资产、批准账本、默认入口或资源Owner，因为本批没有改动这些真值与写域。
