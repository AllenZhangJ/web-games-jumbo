# Arena V2 A4 二十武器附件生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a4-weapon-attachment-models`第四批可做的生产前准备，把20把权威武器、20个附件GLB、20个轮廓族、持握/落地姿态、地面/空中动作读法和来源/预算/生命周期收敛成逐武器评审包。
- 明确不做：不下载、转换、创建、修改或加载模型，不改变20把武器的数量、输入、命中、位移或动作时序，不把候选Transform当作截图证据。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a4-weapon-attachment-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | 20武器附件的轮廓、右手挂点、地面拾取、三动作阶段、六角色组合、来源预算和生命周期评审 |
| 权威来源 | 20武器Catalog/Combat Grammar/信息目录、正式附件绑定、首屏可读性Catalog、Readiness/批准账本/工作队列 |
| 使用技能 | `game-3d-assets`、`game-art-director` |
| 强制参考 | 热血英豪武器设计综合、项目Art Bible、美术流程、对齐矩阵、KayKit Adventurers intake和两个技能说明 |
| 正式或研究 | 正式武器附件的生产评审准备；不是附件批准、Integration或Final |
| 来源 revision / license / SHA | 20项逐一继承当前Catalog/账本；所有模型来源intake与生产批准严格分离 |
| 目标设备与视口 | 六角色、六方向、`d00/d05/d12`、`390×844@2x`和`1280×720@1x`；未生成截图 |
| reduced-motion / 静音 / 失败回退 | 保留轮廓、Pattern、静态阶段和文字；移除旋转/缩放脉冲或声音后仍须可读 |
| 预算影响 | 零新增字节；20模型当前各自小于65,536 B候选上限，但几何/材质/纹理与真机预算均未运行 |
| 验证 | 直接规格已纳入SF-A3A6P.1固定runner；GLB检查、构建、浏览器、设备、真人与性能仍顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响武器Definition、Catalog、资产或入口 |

`game-3d-assets`技能要求模型加载后检查Bounding Box、朝向、自动尺度、落地对齐和截图。本批没有加载模型，所以这五项在每把武器上都明确为`not-run`，不会因为已有Euler/Scale候选值而跳过。当前附件均为静态模型，后续克隆使用静态Scene Clone与显式资源Owner；`SkeletonUtils.clone()`只属于蒙皮角色，不应用于这些附件。

## 二十武器一一对应合同

本候选按收藏顺序精确闭合：

- 20个Gameplay Weapon；
- 20个Equipment Definition；
- 20个附件Asset ID；
- 20个互不重复的轮廓族；
- 每把2个权威动作读法（ground / aerial）；
- 每把3个Mode consequence（1v1 / 竞速 / 生存）；
- 统一三概念输入`direction + jump + primary`，武器动作只使用`primary`。

逐武器生产包保留现有研究形成的最基础功能语义：唯一学习问题、core verb、地面/空中时序、地图情境、windup/active/recovery读法、轮廓质量感、形状/Pattern、右手持握、地面拾取标记和0/5/12米信号。借鉴只提炼“为什么这样设计”和“最小功能怎样可读”，不复制热血英豪的名称、角色、动作、美术或数值。

## 持握、拾取与动作边界

- 全部附件挂到`handslot.r`，右手持握，局部Forward Axis固定`-Z`。
- 当前Euler/Scale只是`candidate-local-transform-not-render-verified`；必须逐把完成模型边界、朝向、遮挡、角色适配和截图。
- 地面拾取不依赖运动，必须由静态模型姿态、Marker Shape、Pattern和文字共同识别。
- windup/active/recovery只读取权威Action phase；模型姿态不能延长动作、制造命中、生成位移或从动画完成推断结果。
- 20把武器必须与6个角色身份组合检查；角色明暗和武器轮廓都不能互相遮没。
- 当前只有圆盾声明一项外部纹理依赖，该纹理属于A4材质批次并保持未批准；其余附件没有在当前Catalog声明外部纹理依赖，不能自行补造。

## 十一项后续评审门

以下全部为`not-run`：

1. 20武器与20附件是否一一闭合。
2. 20个轮廓族是否无需颜色即可互相区分。
3. 右手挂点、朝向和尺度是否正确且不遮挡角色。
4. 地面姿态、Marker和Pattern是否无需动画即可识别。
5. windup/active/recovery是否清晰且不反推命中或改时序。
6. 每把武器是否适配全部6个角色身份。
7. 六方向和0/5/12米下的手持/地面身份是否保留。
8. 已声明的外部纹理依赖是否在加载前闭合。
9. 来源/SHA/预算、Bounding Box、朝向、尺度、落地与截图是否齐全。
10. 静态克隆、共享资源Owner和重复destroy是否无泄漏/双释放。
11. reduced-motion、静音和资产失败时，Shape/Pattern/文字是否保留语义。

## 生产边界

当前只开放`source-brief-silhouette-grip-ground-action-budget-and-review-preparation-only`：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝20武器/附件/轮廓族不闭合、收藏顺序漂移、动作或模式读法缺失、挂点/Forward Axis漂移、模型/纹理path/bytes/SHA漂移、伪造批准以及把候选Transform写成已验证；直接规格已由固定runner执行。十项真实评审仍`not-run`，不能声明武器手持、落地、动作、六角色组合或设备通过。
