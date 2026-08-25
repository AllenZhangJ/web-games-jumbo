# Arena V2 A3 生存敌人生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a3-survival-enemy-model`第二批可做的生产前准备，把“始终只有一个敌人族”的权威规则、当前模型/纹理身份、轮廓一致性、方向、动作语义和高密度评审项冻结为单一敌人评审包。
- 明确不做：不生成参考图，不创建或修改模型/纹理，不加载资产，不新增敌人类型、技能、碰撞尺寸或压力规则，不以颜色、体型或稀有度伪装压力成长。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a3-survival-enemy-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | A3单一生存敌人族的后续Turnaround、轮廓、动作、拥挤度、材质和生命周期评审 |
| 权威来源 | P3 Survival Pressure/Character Definition、正式Character Presentation、Catalog、外部纹理依赖、A3–A6 Readiness/批准账本/工作队列 |
| 使用技能 | `character-design-sheet`、`game-art-director` |
| 强制参考 | `.agents/skills/character-design-sheet/SKILL.md`、项目Art Bible、正式美术流程、开发对齐矩阵、KayKit Skeletons intake记录 |
| 正式或研究 | 正式敌人模型的生产评审准备；不是概念通过、Blockout、正式资产或批准证据 |
| 来源 revision / license / SHA | 模型与外部纹理逐项继承当前Catalog/批准账本；来源intake批准与生产批准严格分离 |
| 目标设备与视口 | 预登记`390×844@2x`与`1280×720@1x`，以及`d00/d05/d12`游戏距离；截图与设备证据均未生成 |
| reduced-motion / 静音 / 失败回退 | 身份必须由轮廓、方向、数量、入口和静态stage标记保留；不能依赖颜色、声音或持续动画 |
| 预算影响 | 零新增资产字节；绑定现有模型974,548 B和纹理17,037 B身份，不批准结构上限、运行内存或并发余量 |
| 验证 | 直接规格已纳入SF-A3A6P.1固定runner；模型检查、构建、浏览器、设备、真人和性能仍顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响敌人Definition、压力Policy、Catalog或入口 |

`character-design-sheet`中的AI生成、LoRA和外部CLI只作为泛化方法参考。本批没有安装或调用这些工具，也没有生成图片；当前目标是冻结现有正式候选的评审输入，而不是创造第二套敌人概念。`game-art-director`泛化技能缺失的两个通用文档继续保持已登记缺口，不创建占位。

## 单一敌人族不可变合同

当前权威事实固定为：

- `enemyAuthorityFamilyCount=1`；
- `enemyVisualArchetypeCount=1`；
- 16个敌人Slot全部引用同一个Character Definition和同一个Presentation；
- 十个压力阶段的目标同屏数量为`1,2,3,4,5,6,8,10,12,16`；
- 压力只允许通过同屏数量、入口方向、拥挤密度和权威stage静态标记表达；
- 所有压力阶段禁止新增敌人类型、放大碰撞轮廓、稀有度颜色和新技能轮廓。

因此“活得越久敌人越多”仍是玩法真值；美术不能把后期Slot包装成精英怪、Boss、不同属性敌人或更大碰撞体。

## 当前模型、材质与动作身份

| 身份 | 当前事实 |
|---|---|
| Character | `arena-v2.character.survival-enemy-family.candidate.v1` |
| Presentation | `arena-v2.character-presentation.survival-enemy.kaykit-skeleton.candidate.v1` |
| Model | `arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1`；974,548 B；SHA `1a424e…e39` |
| Material | `arena.material.kaykit-skeleton-clockwork.v1`；颜色不得成为唯一信号；明暗证据仍`specified-not-captured` |
| Texture | `arena.texture.character.skeleton.v1`；17,037 B；SHA `15741a…657`；属A4材质纹理批次 |
| Direction | 六扇区相机相对；默认前方`negative-z`；滞回6° |
| Animation | 19个正式语义全部有Clip绑定；来源intake记录声明优化产物保留18条运行时动作，但尚未运行检查 |

模型和纹理的来源intake已有记录不等于生产批准。两项当前仍分别为`missing-not-approved / assetUsePermitted=false / formalReady=false`，而且纹理位于后续A4材质批次；模型不能绕过纹理依赖提前集成。

## 九项后续评审门

以下全部为`not-run`：

1. Front、3/4、Side、Back四视图是否保持同一轮廓和比例系统。
2. 在`d00/d05/d12`与两个目标视口下，是否不靠颜色就能与六名可玩角色区分。
3. 六扇区朝向是否在相机和拥挤场景中可读。
4. 19个动作语义是否可读且不改变权威动作时间。
5. 1/2/4/8/16个同族敌人是否仍可辨认而无需造变体。
6. 压力是否只由数量、入口方向、疏密和stage标记表达。
7. Hitstun、Knockback、Fall和Reentry是否可区分，同时不由动画重新判定结果。
8. 材质、轮廓、低动效和资产失败回退是否都保留敌人身份。
9. 模型+纹理来源、预算、加载、克隆、销毁和真机证据是否一起闭合。

四视图和缩略图检查必须复用同一个描述锚与同一Presentation身份；不得通过每次重新设计头部、披风、四肢或配色来制造“看起来更丰富”的假一致性。

## 生产边界

当前只开放`source-brief-silhouette-animation-budget-and-review-preparation-only`：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝敌人族/视觉族数量漂移、十阶段数量曲线漂移、16 Slot漂移、Character/Presentation漂移、19动作语义缺失、模型或纹理path/bytes/SHA漂移、纹理依赖漂移和伪造批准；直接规格已由固定runner执行。九项真实评审仍`not-run`，不能声明轮廓、动作、高密度或生命周期通过。
