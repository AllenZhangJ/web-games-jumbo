# Arena V2 P5 地图选择卡非颜色路线身份 Candidate V1

## 1. 状态与边界

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 增强既有 `map-index:selection-map` 两张地图选择卡，并把同一核心延伸到当前 `map-detail` 的 A6.18 回退预览；不新增页面、按钮、动作、点击、输入、规则、资产或正式批准。
- 空港断层采用“前进支撑 → 断层跨越 → 落点”三块静态几何；折返天梯采用左右交替的三段阶梯/折返几何。
- 几何只解释既有路线身份，不能判定支撑面、进度、终点、掉落、胜负或路线研究事实。

## 2. 技能与强制参考账本

本批按 `game-art-director → threejs-game-ui-designer` 使用项目技能。

| 参考 | 已读 | 采用边界 |
|---|---|---|
| `docs/architecture/arena-art-bible.md` | 是 | 路线以形状、方向和文字双通道表达，颜色不能独占身份 |
| `docs/architecture/arena-art-and-audio-development-flow.md` | 是 | Presentation只消费只读目录，不反向判定地图规则 |
| `arena-v2-collection-fallback-semantic-source-candidate-v1.ts` | 是 | 地图身份来自collectionOrder、pacingArc和真实12+8段闭包，不解析ID字符串 |
| A6.15 Layout Bridge | 是 | 原selection计划先独立复算，随后才附加路线几何；原卡片与预览桥保持同源 |
| `threejs-game-ui-designer/references/ui-patterns.md` | 是 | 保持游戏选择页，不增加Dashboard容器或新操作 |
| `game-ui-quality.md` | 是 | 保持选择状态、稳定卡片与既有视觉语言 |
| `hud-readability.md` | 是 | 纯几何可独立辨认，文字继续保留完整解释 |
| `responsive-ui-fit.md` | 是 | 原卡片、48px action和双视口布局合同不变 |

`game-art-director`要求的`docs/collaboration-protocol.md`、`docs/game-design-theory.md`与模板附件仍未随仓库提供；本批继续把它们登记为治理依赖缺口，不创建占位文件，也不把缺失信息写入运行合同。

## 3. 数据与几何真值

唯一语义源是现有收藏语义目录：第一项必须为`collectionOrder=1 / segmentCount=12 / pacingArc=two-cycle-branch-escalation`，第二项必须为`collectionOrder=2 / segmentCount=8 / pacingArc=cardinal-switchback-sawtooth`，并继续闭合总计20段及逐图route rhythm、landmark、leading-line数量。

增强器不硬编码或解析地图Definition ID，不读取玩家当前坐标、Route runtime、路线研究进度或胜负事实。若目录次序、12+8段数、pacingArc或逐段语义长度漂移，整批在发布RenderPlan前失败关闭。

## 4. RenderPlan 与 A6.15 接点

`addArenaV2MapSelectionCardNonColorRouteIdentityToRenderPlanCandidateV1`：

- 默认只对精确`map-index:selection-map`生效，其他页面返回原引用。
- A6.15先用既有selection helper复算原始source plan并完成身份检查；本增强器只作用于其已验证的preview-aware输出，并保留A6.15输出identity、scroll source与slot矩形语义。
- 每张地图卡精确新增3个`panel`，总增量精确`+6`；完整增强RenderPlan总量必须`<=128`。
- 两种signature只由panel相对位置、尺寸和圆角构成。tone、颜色、glyph、地图名称和description都不能让重复几何通过。
- 原panel与action对象保持原引用；action rect、48px、intent、enabled/disabled、availability、label与完整accessibilityText不变。
- 原label/description文字、tone、role、行数、clip和读屏不变，只收窄可视文字矩形以让右侧路线轨不遮挡文本。
- 已完整增强的计划必须复核六个panel、文字避让矩形与primitive预算后按同一几何事实幂等返回；部分增强、几何/tone/clip漂移、允许ID重复、未知地图、重复/缺失卡或预算越界均拒绝。

`map-detail` 继续复用上述唯一 `routePanelGeometry`，不建立第二份地图spec：

- 只接受基础 `map-detail`，或精确 `map-detail:browse-map:${encodeURIComponent(selectedDefinitionId)}`；后者必须与当前 `mapDefinitionId` 一致。
- 输出身份必须逐字等于 source identity 加 `:a6.15-preview-aware:390x844` 或 `:a6.15-preview-aware:1440x900`；对应 preview rect 必须精确为 `200×200` 或 `260×260`。
- 基础详情继续用既有 `当前目标 · displayName` 标题规则和 `use-selected-map-next-match` 主动作闭合当前地图，不从名称或ID选择地图。
- 只原位重排 A6.18 已有3个fallback panel，primitive增量为0；panel ID、clip、tone、zIndex保持，圆角只取同一route spec，文字与action语义保持。
- 同地图在相同标准rect下，index/detail使用同一角色顺序与相对几何signature；浏览身份错配、非200/260尺寸、partial fallback、源panel clip漂移或文字/action漂移均在输出前拒绝。

输出不创建Three、DOM节点、GLTF、asset request、lease、mount、RAF、timer或input，不新增点击区域；A6.15既有地图fallback、路线研究刻度与资源零许可事实保持不变。

## 5. 未运行测试设计

已写但未运行的测试源码覆盖：

- 两图精确12+8语义来源和精确`+6`；
- 空港断层的前进/断层/落点位置关系；
- 折返天梯的三段交替阶梯关系；
- 两种仅panel几何signature唯一，颜色/glyph/文字不参与；
- 原panel/action身份、48px、文字、availability与读屏事实不变；
- A6.15 preview-aware identity保持及桥接metadata；
- map-detail 200/260双槽、browse identity、同核心相对签名和零primitive增量；
- 源panel的ID/clip/tone/radius/zIndex保真，以及clip漂移反证；
- 非地图页原引用、同输入幂等；
- 缺失、重复、未知地图与primitive预算越界失败关闭。

测试、typecheck、lint、format、diff-check、build、浏览器、截图、设备、压力和性能全部为`not-run`。

## 6. 静态六维自检与回滚

| 维度 | 静态结论 | 顺延证据 |
|---|---|---|
| 视觉/内容 | 两图以断层跨越和折返阶梯形成2/2纯几何身份；index/detail同一route核心，无规则增量 | 双视口实际截图与玩家辨识 |
| 非颜色编码 | 几何signature排除tone、glyph、名称和文字 | 灰度、色觉与真人学习证据 |
| 响应式/触控 | 原卡片、action rect和48px保持；右侧身份轨不遮文字；详情严格200/260 | 390×844、1440×900浏览器证据 |
| 恶意边界 | 动态地图目录、12+8、pacingArc、卡结构和预算失败关闭 | 未运行测试与严格类型 |
| 生命周期/副作用 | 纯RenderPlan；零资源、Three、DOM直建、RAF、timer与input | 正式宿主运行与销毁证据 |
| 治理/回滚 | code-written-not-run；不开放资产、A0.3、Blockout或默认入口 | 主协调验收和全部运行门 |

最小回滚：删除新增增强器、测试和本文，移除包导出，并撤销A6.15桥中增强器的单一调用与metadata两项；无需回滚地图Definition、路线研究投影、A6.18 fallback、资源许可、Host或默认入口。
