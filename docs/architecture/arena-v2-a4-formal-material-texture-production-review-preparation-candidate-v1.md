# Arena V2 A4 正式材质贴图生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a4-formal-material-textures`第五批可做的生产前准备，把3张已登记贴图、3个外部GLTF绑定、3个模型消费者、sRGB/PBR合同、六角色/单敌人材质身份、灯光与纹理内存收敛成逐贴图评审包。
- 明确不做：不下载、转换、创建、修改或加载纹理/模型，不修改Three运行灯光或材质，不从颜色或材质反推玩法，不把Catalog登记、编码字节或RGBA8估算写成运行证据。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a4-formal-material-texture-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | 圆盾附件、共享Rogue角色、Skeleton敌人的外部Albedo纹理与材质/灯光审阅 |
| 权威来源 | Formal Material Texture Catalog/Bindings、Readiness、逐资产批准账本、工作队列、角色Material Profiles和首屏Lighting合同 |
| 使用技能 | `threejs-materials-lighting`、`game-art-director` |
| 强制参考 | 项目Art Bible、美术流程、对齐矩阵、两个技能说明和`materials-lights-table.md` |
| 正式或研究 | 正式材质贴图生产评审准备；不是材质批准、运行接入、Integration或Final |
| 来源 revision / license / SHA | 3项逐一继承当前Catalog/账本；来源intake与生产批准严格分离 |
| 目标设备与视口 | 两张地图环境、`390×844@2x`与`1280×720@1x`；未生成截图或设备证据 |
| reduced-motion / 静音 / 失败回退 | 材质身份必须同时保留明暗Pattern、轮廓、glyph/pattern和文字；颜色不是唯一信号 |
| 预算影响 | 零新增字节；每张1024² RGBA8无mip解码估算4,194,304 B，三张合计12,582,912 B，低于16 MiB候选包络；不是运行峰值测量 |
| 验证 | 直接规格已纳入SF-A3A6P.1固定runner；纹理解码、GLTF材质、构建、浏览器、设备、真人和性能仍顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响资产、Material Profile、灯光、加载器或入口 |

## 三张贴图与三个消费者

| Texture Asset | 当前文件 | Consumer | 关系 |
|---|---|---|---|
| `arena.texture.attachment.shield.v1` | `shield_texture.png`，14,172 B | 圆盾附件GLB | `external-gltf-image-uri` |
| `arena.texture.character.rogue.v1` | `rogue_texture.png`，16,670 B | 共享Rogue角色GLB | `external-gltf-image-uri` |
| `arena.texture.character.skeleton.v1` | `skeleton_texture.png`，17,037 B | Skeleton敌人GLB | `external-gltf-image-uri` |

三项均为1024×1024、`verified-intake-only`，逐项绑定固定path、runtime source key、bytes、SHA-256、revision、license、rights holder和proof document。三张贴图与三个消费者的生产批准都仍为`missing-not-approved`，`assetUsePermitted=false / formalReady=false`。

Rogue贴图由六个Playable Material Profile共享，但六角色仍必须保留六套不同的七部件明暗Pattern；共享贴图不能把6个角色身份降成只换颜色。Skeleton保持一个统一敌人材质身份，不得借材质制造stage、稀有度或技能变体。圆盾身份首先来自武器轮廓和Pattern，贴图颜色不能成为唯一武器信号。

## 材质与灯光合同

- 三张纹理语义统一为`albedo-color-map`，要求以`sRGB`采样；本批没有线性空间的Normal/Roughness/Metalness数据纹理。
- 目标兼容合同为`gltf-pbr-mesh-standard-compatible`；这是导入审阅要求，不是已检查到实际MeshStandardMaterial的声明。
- 外部Image URI解析、UV绑定、透明度、解码、mipmap、缩小过滤和颜色偏差全部为`not-run`。
- 灯光保留低成本Hemisphere Fill与Directional Key方向，要求Neutral Key存在；不允许点光源阴影成为默认方案。
- 暂不选择IBL/HDR环境，也不宣称tone mapping或shadow policy已经通过。
- 材质身份必须在两张正式地图环境和桌面/390×844视口都可读；Neutral Key不能替代地图环境检查。

## 解码内存口径

本批只给出确定性估算：`1024 × 1024 × 4 B = 4,194,304 B/张`，三张合计`12,582,912 B`。该值是无mip RGBA8解码包络，用于提前发现明显越界；它不是GPU分配、mipmap、上传峰值、缓存复用或销毁后的运行测量。后续仍要对Owner、Cache、重复加载、上下文丢失和Destroy做真实证据。

## 十项后续评审门

以下全部为`not-run`：

1. 3张贴图、3个Binding和3个模型Consumer是否一一闭合。
2. 所有Albedo是否按sRGB而不是线性Data Texture处理。
3. 外部URI、目标PBR材质和UV Set是否正确。
4. Decode、mipmap、过滤和远距离缩小质量是否稳定。
5. Rogue共享贴图是否保留六套七部件明暗身份，Skeleton是否保持统一敌人族。
6. 圆盾贴图是否不替代武器轮廓和Pattern。
7. Neutral Key与两张地图环境下材质身份是否都可读。
8. Hemisphere/Directional灯光和Shadow Policy是否满足设备成本。
9. 解码峰值、缓存复用、资源Owner与销毁是否有运行证据。
10. 桌面、390×844、颜色差异和缺纹理回退是否保留非颜色身份。

## 生产边界

当前只开放`source-binding-color-space-memory-lighting-and-review-preparation-only`：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝贴图/Binding/Consumer不闭合、1024²身份漂移、path/bytes/SHA漂移、外部URI关系漂移、六角色明暗Pattern缺失、单敌人材质身份漂移、伪造批准以及超出16 MiB候选估算；直接规格已由固定runner执行。十项真实评审仍`not-run`，不能声明纹理解码、PBR材质、灯光、颜色、设备、内存或生命周期通过。
