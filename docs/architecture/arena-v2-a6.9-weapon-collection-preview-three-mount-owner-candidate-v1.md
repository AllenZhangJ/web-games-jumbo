# Arena V2 A6.9 武器收藏预览 Three 场景挂载 Owner 候选 V1

状态：`production-unreachable / code-written-not-run`
硬门：`false`
默认 Surface：`false`
验证：依用户要求全部顺延；未运行测试、类型检查、lint、构建、截图、浏览器、设备或性能任务。

## 1. 范围与技能

A6.9 只为既有 `weapon-index / weapon-detail` 创建生产不可达的 Three 场景挂载对象，不新增页面、动作、二进制资产、renderer、DOM、RAF、HDR、阴影或程序化正式模型。技能使用顺序与约束为：

1. `game-art-director`：当前生产批准证据账本对130项均为`missing-not-approved`，因此20件静态武器附件、地图、missing与程序化几何都不得进入正常路径；当前仅保留文字/形状/纹理回退。
2. `media-asset-management`：完整绑定 A6.4 snapshot、A6.6 request identity、SHA-256、租约释放顺序与共享资源所有权；挂载 Owner 不加载或释放 A6.6 资源。
3. `threejs-game-ui-designer`：构图只服务既有两页；390×844与1440×900使用实际预览槽，不增加触控；低动效关闭入场转向，静音不影响含义。
4. `threejs-materials-lighting`：保留GLB既有PBR material/texture；只创建`Group + PerspectiveCamera + HemisphereLight + DirectionalLight`，不改geometry/material/texture，不开阴影。

已读直接参考：

- `.agents/skills/media-asset-management/references/responsive-image-patterns.md`
- `.agents/skills/threejs-game-ui-designer/references/ui-patterns.md`
- `.agents/skills/threejs-game-ui-designer/checklists/game-ui-quality.md`
- `.agents/skills/threejs-game-ui-designer/checklists/hud-readability.md`
- `.agents/skills/threejs-game-ui-designer/checklists/responsive-ui-fit.md`
- `.agents/skills/threejs-game-ui-designer/checklists/mobile-input.md`
- `.agents/skills/threejs-materials-lighting/references/materials-lights-table.md`
- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-development-alignment-matrix.md`
- `docs/architecture/arena-v2-production-development-plan.md`
- A6.4与A6.6源码/交付文档及当前正式资产catalog/provenance。

`game-art-director`泛化要求的`docs/collaboration-protocol.md`、`docs/game-design-theory.md`和技能模板仍不存在；本切片不创建占位文件，以项目专用Art Bible、对齐矩阵、生产计划和正式资产目录为更具体真值，并继续登记该治理缺口。

## 2. 输入与身份闭合

Owner构造与每次mount都接收完整A6.4 `bindingSnapshot`。源码复用A6.6已经接受的全快照值级校验，固定当前catalog、生产批准账本identity并验证22槽、预算、双viewport layout、无障碍和治理。当前账本下22项全部`formalReady=false / assetUsePermitted=false`且token为空，因此构造只允许得到零mount Owner；任一mount在clone或Three对象创建前失败关闭。

未来新生产批准账本版本与独立gate通过后，如产生A6.6 ready租约，其身份仍必须按以下完整字段重新计算，不信任单独`assetId`或截断hash：

`epochId + catalogContentHash + assetId + sha256 + A6.4 requestToken`

Owner固定的是字段排序稳定的完整租约/视觉合同canonical字符串：catalog revision/hash、slots、budget、layouts、`reducedMotion`和governance。每次mount逐字比较完整canonical；8位deterministic hash只作公开诊断，绝不单独授权。`binding.tick`、`sourceState`、`muted`、Profile/collection source hash不进入该identity，因此同epoch正常帧或Profile revision推进可继续挂载；availability、token、motion、layout或catalog变化必须新epoch。

当前20武器、2地图、missing、fallback、null token、未批准成熟度、伪SHA、伪request identity、跨three `Object3D`均在创建Three对象前拒绝；来源intake批准不能解除该门。

## 3. 未来许可版本的场景与构图合同（当前不可达）

- handle只接受同一`three@0.185.1`依赖的静态`Object3D`层级；`SkinnedMesh / Bone / AnimationClip / morph / 内嵌Camera或Light`拒绝。
- 每个mount执行独立`clone(true)`；借入source及其parent永不reparent。clone节点独占，但geometry、material、material数组和texture继续共享原引用。
- clone必须保留`MeshStandardMaterial / MeshPhysicalMaterial` PBR路径；只把clone自身的`castShadow/receiveShadow`关闭，不修改共享材质、贴图或几何。
- bounds不调用会写入共享geometry缓存的`computeBoundingBox`，而是从有限position顶点和clone矩阵计算。空模型、NaN/Infinity、零/过大bounds、节点或顶点超预算均失败关闭。
- 统一尺度和居中施加于Owner创建的preview Group。相机宽高比来自`previewRectCssPixels`，不是整屏比例。
- 最小槽位与安全边距取`max(A6.4 strategy, 当前viewport layout)`：移动端index/detail为72/168px，桌面端为96/240px；desktop safe inset为12px。
- 普通模式只输出一次、12 tick、`-0.18→0`的非循环入场转向计划；Owner不执行动画。`reducedMotion`输出纯静态计划；自动旋转永远false。
- 固定灯光为柔和半球环境光加单个方向主光；无HDR、无阴影、无renderer、无RAF。

## 4. 同帧、所有权与销毁

不同`mountId`允许同tick批量mount和批量destroy，适配weapon-index同帧多个可见槽。相同`mountId`只有完全相同输入与同一source handle可幂等返回；冲突拒绝。真正tick回退拒绝，水位取`max`；已销毁ID不可重用。

单个Owner不会隐式替换已有mount。Owner只拥有preview Group、camera、两盏light和clone节点；从不dispose共享geometry/material/texture。`destroyMount/destroy`按对象保留完成水位，先detach并clear自有节点，只有该对象真实完成才清引用和删除mount账本，幂等销毁事实有界保留。构造异常后的清理若再次失败，Owner接管原始Three对象债务；后续`destroy()`只重试未完成对象。mount、单mount销毁与Owner销毁共享同步mutation重入门，恶意或异常Three方法不能在半清理状态重入改账或读取半完成快照。清理异常使Owner进入`failed`，此时所有mount（含旧幂等重放）先行拒绝；mutation结束后`getSnapshot`仍可读，`destroy`继续尝试其余清理，全部成功后才进入`destroyed`。

A6.6租约必须由上层在A6.9 mount销毁完成后release；A6.9绝不调用A6.6 disposer，也不把模型内容反推为收藏、路线、规则或目标事实。

## 5. 未运行测试代码与七维静态自检

未运行测试代码已按当前真值收敛为：完整22槽账本绑定、当前武器mount在clone前拒绝、账本identity漂移在构造期拒绝、零mount销毁与未来新账本独立门元数据。历史模型构图与多mount用例不再作为当前许可事实。

| 维度 | 静态结论 | 顺延门 |
|---|---|---|
| 视觉与构图 | index轮廓、detail三分之四构图、双viewport实际slot门已编码 | 无模型加载、截图、真人可读性证据 |
| 来源与身份 | 完整A6.4/A6.6/current catalog/SHA/批准事实闭合 | 未重跑来源与资产机器审计 |
| 材质与灯光 | 共享PBR引用不变；固定双灯、无HDR/阴影 | 未做曝光、色偏、设备显示评审 |
| 低动效与静音 | 无自动旋转；低动效纯静态；无音频依赖 | 未运行系统设置与真机检查 |
| 生命周期 | 多槽、幂等、失败关闭、逐对象detach/clear水位、构造债务保留、上层lease顺序明确 | 未运行泄漏、竞态、迟到资源测试 |
| 恶意边界 | exact-key、完整binding、NaN/Infinity、跨three、动画层级拒绝 | fuzz、类型与运行验证未执行 |
| 治理与回滚 | 仅三个新文件；default Surface、index、manifest、资产字节均未改 | A6、正式资产、设备、真人、性能、Final仍false |

## 6. 回滚

整文件删除以下三项即可回滚，不影响A6.4/A6.6、正式资产目录、默认Surface或二进制资源：

- `packages/arena-product-presentation-three/src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.ts`
- `packages/arena-product-presentation-three/test/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.test.ts`
- `docs/architecture/arena-v2-a6.9-weapon-collection-preview-three-mount-owner-candidate-v1.md`

本候选不得表述为模型视觉、截图、设备、真人、性能、正式资产、A6或Final通过。
