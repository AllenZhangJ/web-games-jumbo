# Arena V2 A6.4 收藏页正式资产复用绑定候选 V1

> 状态：`production-unreachable / code-written-not-run`
> 硬门：`false`
> 默认 Surface：未接线
> 新增二进制资产：`0 B`
> 测试、类型、构建、截图、浏览器、设备、性能：`not-run`

## 1. 范围与不做项

A6.4 只为既有 `weapon-index / weapon-detail / map-index / map-detail` 四页生成
renderer-neutral 的只读 preview slot/binding。它组合：

1. A6.2 已验证的动态 `collectionContent`，作为20武器、2地图与显示顺序的唯一内容目录；
2. 现有 `ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1` 的 visual records、
   equipment/map bindings、runtime source key、来源、许可、批准、大小和 SHA-256；
3. 由正式资产宿主提供的只读 `catalog-bound / missing` availability；`catalog-bound` 只证明身份存在，
   不等于获准使用；
4. 项目既有预算上限与当前未运行状态；
5. 当前逐资产生产批准证据账本 V1；其130项均为
   `productionApprovalStatus=missing-not-approved / assetUsePermitted=false / formalReady=false`。

本阶段不复制20/2生产 Definition ID，不新增页面、动作、皮肤、特效、展示台、商店、货币、红点或任务列表；
不读取 Profile 仓储，不决定收藏、熟练、奖励、目标或规则；不加载 GLB，不创建 Three 对象，不修改默认 Surface。

## 2. 技能路由与直接参考

使用顺序与影响：

1. `game-art-director`：要求预览仍服从 Art Bible 的轮廓、材质、正式/候选成熟度与“程序化内容不能成为正常路径”。
2. `media-asset-management`：要求 source → process → deliver → manage 身份可追溯，固定来源 revision、许可、批准、
   byteLength、SHA-256、失败回退和释放责任。
3. `threejs-game-ui-designer`：要求复用四个既有页面，不制造通用仪表盘或嵌套卡片；固定安全区、48px既有动作、
   长文本空间、低动效与无音频等价。

已读取：

- `.agents/skills/game-art-director/SKILL.md`
- `.agents/skills/media-asset-management/SKILL.md`
- `.agents/skills/media-asset-management/references/responsive-image-patterns.md`
- `.agents/skills/threejs-game-ui-designer/SKILL.md`
- `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/game-ui-quality.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/hud-readability.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/responsive-ui-fit.md`
- `.agents/skills/threejs-game-ui-designer/references/checklists/mobile-input.md`

`game-art-director` 泛化技能引用的 `.agents/skills/game-art-director/templates/art-bible.md`、
`docs/collaboration-protocol.md`、`docs/game-design-theory.md` 在本仓库不存在。本阶段不创建占位文件，改用更具体的：

- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-development-alignment-matrix.md`
- `docs/architecture/arena-v2-production-development-plan.md`
- `docs/architecture/arena-art-and-audio-development-flow.md`
- `docs/decisions/027-arena-formal-asset-intake-provenance.md`
- `docs/acceptance/stage7-formal-assets/README.md`
- `packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.ts`

缺失的三份泛化附件继续作为预登记缺口，不影响采用项目更具体真值，也不被伪造为已读。

## 3. 动态目录与正式 catalog 闭合

源码先用 A6.2 组件验证完整 `collectionProgressInput`，再按其中动态内容逐项连接正式 catalog：

| 内容 | 动态目录要求 | catalog要求 | 当前输出 |
|---|---|---|---|
| 武器 | 精确20项、稳定 `collectionOrder`、非空且唯一ID | 20个唯一equipment binding、20个唯一attachment record | index/detail各一套静态预览策略 |
| 地图 | 精确2项、两图合计20段、非空且唯一ID | 2个唯一map binding、2个唯一map record | index/detail各一套静态路线预览策略 |

本地不保存生产 ID 白名单。catalog record 与 binding 必须一一对应；重复、未知、漏项、角色/成熟度不符、路径不一致、
伪 SHA、许可扩张、批准漂移、预算自报漂移或 coherent substitution 均在发布快照前失败关闭。

同一 presentation epoch 固定：

- P5 `sourceContentHash + collectionContentHash`；
- formal source catalog `contentHash + A6.4 projection contentHash`；
- assetId ↔ Definition ID ↔ runtimeSourceKey ↔ provenance ↔ SHA 的一一关系。

高 tick 可以把某个资产 availability 从 `catalog-bound` 改为 `missing`；同 tick 不同事实拒绝。只有显式新 epoch 才清空水位、
内容身份、catalog身份与已存快照。

## 4. 资产成熟度与预算真值

当前 catalog 的20个武器附件记录是 `verified-intake-only`，来源是已固定 revision 的 KayKit CC0，且来源 intake
批准人/日期存在；这只证明来源登记，不是生产批准。当前逐资产生产批准证据账本 V1 对这些武器及两张地图均记录
`missing-not-approved`，因此22项全部固定为 `formalReady=false / assetUsePermitted=false`。候选预算覆盖也不能提升该状态。

两张地图 GLB 是 `authored-candidate-not-approved`，`approvedBy/approvedAt=null`，且当前
`arena.stage7.formal-asset-budget.v1` 没有地图GLB逐项预算类型。因此：

- GLB 只保留为 catalog 中的候选元数据，不允许成为 A6.4 正常预览源；
- 每张地图 `formalReady=false`；
- 每张地图 `assetUsePermitted=false`、`previewSourceUse=text-shape-pattern-fallback-only`；
- 每张地图没有request/release token，宿主不能请求未批准GLB；
- `coverage=map-glb-not-covered-by-current-policy`；
- 不发明地图预算，不把文件存在冒充来源批准或最终门通过。

A6.4 对22项记录重算 catalog 预览编码体积，并与项目总编码上限 `2,359,296 B` 比较；20个武器逐项记录候选附件
上限，2个地图逐项预算明确为未覆盖。由于地图、截图、设备和运行复算仍缺，`formalBudgetReady=false` 与
`formalAssetGatePassed=false` 固定不变。

## 5. Preview 策略与失败回退

| 页面 | 预览策略 | 交互边界 |
|---|---|---|
| `weapon-index` | 静态黑形/轮廓缩略，透明底，保留名称与熟练事实 | 不新增点击，复用既有item intent |
| `weapon-detail` | 静态三分之四附件构图 | 不新增旋转、装备或选择intent |
| `map-index` | 静态等距路线缩略 | 不新增展示台或地图操作 |
| `map-detail` | 静态路线总览 | 不从模型几何重判路线、段落或规则 |

所有 `!formalReady` 情况（至少包括GLB缺失、成熟度未批准、批准记录缺失或单项预算不闭合）只显示既有名称、
收藏/熟练文字、形状和纹理语义，保留 Definition 身份，并强制
`assetUsePermitted=false / previewSourceUse=text-shape-pattern-fallback-only`。此时request/release token均为`null`，
宿主没有请求该GLB的能力。程序化几何、灰盒、诊断图和临时占位不能冒充正式资产，也不能成为正常路径。

A6.18现已把这条fallback语义具体化：20武器逐项复用既有轮廓、拾取图形与core verb，2地图逐项复用
既有20段路线节奏、地标与引导线，为22项生成唯一且确定的主形状、辅助形状、线型/glyph与完整读屏文本。
该投影只消费A6.4已经拒绝资源使用的slot，不反向改变`formalReady / assetUsePermitted / token`，也不把2D
primitive登记为正式资产。

## 6. 响应式、低动效与静音

- `390×844`：preview安全内边距8px；index槽至少72px；detail槽至少168px；使用safe area。
- `1440×900`：preview安全内边距12px；index槽至少96px；detail槽至少240px；使用safe area。
- 既有item/选择动作继续保持48px，不新增触控动作，preview不抢滚动或点击语义。
- 自动旋转永远关闭；普通模式最多登记“一次入场转向后静止”，reduced-motion强制纯静态。
- muted 不改变任何预览、身份、回退或操作含义；无音频也能完整理解。
- 本阶段只写布局合同，截图、文字适配、重叠和目标设备证据全部为 `not-run`。

## 7. 惰性请求与释放合同

只有未来新版本生产批准账本经独立硬门批准、且 `formalReady=true` 的 slot 才根据
`epochId + catalogContentHash + kind + definitionId + assetId` 生成唯一、确定性的request/release token：

- 只登记 `slot-enters-visible-layout` 时可请求；
- slot卸载或epoch reset时释放；
- `!formalReady` 时 `requestPermitted=false`、request/release token均为`null`；
- 本组件不读取字节、不持有loader lease、不创建geometry/material/texture/Object3D；
- 宿主未来接入时必须把token绑定到唯一资源owner，迟到完成仍应释放；
- `destroy()` 清除快照和身份水位，之后所有读取/消费失败关闭。

## 8. 未运行测试代码范围

测试文件已经编写但未执行，覆盖：

- 动态20武器/2地图与22个catalog record/binding一一闭合；
- runtimeSourceKey、maturity、provenance、byteLength、SHA与预算摘要；
- 地图未批准/未覆盖预算保持非ready；
- 当前20武器与2地图全部走文字/形状/纹理回退，request/release token精确为`null`，禁止请求且禁止程序化几何；
- `390×844 / 1440×900`、safe area、48px、低动效和静音等价；
- 唯一请求/释放token、同tick幂等/冲突、高tickavailability变化；
- 重复/未知/漏项、伪hash、许可/批准/SHA/大小漂移、future字段、getter、thenable；
- 同epoch内容/catalog漂移、reset、destroy和快照完整性。

由于用户要求开发优先，未运行 test、typecheck、lint、build、diff、截图、浏览器、设备或性能命令。

## 9. 七维静态自检

| 维度 | 静态结论 | 未关闭证据 |
|---|---|---|
| 视觉一致性 | 四页只复用Art Bible既有轮廓/路线预览语义，无新皮肤/特效/展示台 | 无实际模型画面或截图 |
| 来源与许可 | 每项输出固定revision、license、rightsHolder、批准、proof、byteLength、SHA；地图未批准如实保留 | 未重读资产字节，地图批准缺失 |
| 目录与身份 | A6.2动态目录为唯一内容真值；catalog record/binding一一闭合，不复制20/2生产ID | 运行时接线未做 |
| 预算 | 22项总编码体积可复算；20附件有候选64KiB上限；地图逐项预算不虚构 | 当前policy缺地图GLB逐项覆盖，预算工具未运行 |
| 响应与无障碍 | 两视口safe area、48px既有动作、无自动旋转、静音等价、文字/形状/纹理回退 | 截图、长文本和设备未验证 |
| 生命周期与失败关闭 | 当前22项均不生成request/release token；A6.6/A6.11a双重保证底层零调用；同tick/epoch/catalog/批准账本hash严格；不持有Three资源 | 未来新账本版本、独立批准硬门与真实loader迟到/释放证据 |
| 主流程与治理 | page/action/binary均+0；defaultSurface false；程序化normal path false；整切片三文件可回滚 | A0.3真人、A1.1重建、正式资产/设备/Final继续关闭 |

## 10. 回滚

本切片没有修改既有文件。最小回滚是整文件删除：

- `packages/arena-product-presentation-three/src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.ts`
- `packages/arena-product-presentation-three/test/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.test.ts`
- `docs/architecture/arena-v2-a6.4-collection-formal-asset-reuse-binding-candidate-v1.md`

没有 index/default Surface/manifest/二进制/规则/Profile 写入需要反向迁移。
