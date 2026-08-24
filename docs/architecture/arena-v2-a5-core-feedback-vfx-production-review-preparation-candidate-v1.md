# Arena V2 A5 核心反馈 VFX 生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a5-core-feedback-vfx-textures`第八批可做的生产前准备，把5张核心结果纹理、5类互斥反馈语义、483个专用Cue、20武器支持层、质量分档与生命周期收敛成逐资产评审包。
- 明确不做：不生成、修改、加载、解码或渲染纹理，不运行粒子或设备性能，不改变命中、击落、闪避、移动坠落的权威因果，不扩大既有层数、粒子数、过度绘制或活动身份预算。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a5-core-feedback-vfx-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | `hit-confirm / hit-surface-transfer / hit-ring-out / attack-evaded / movement-fall`五类结果反馈 |
| 权威来源 | Formal VFX Catalog、Readiness、批准账本、工作队列、二十武器反馈Read Plan、VFX Port与正式VFX Style |
| 使用技能 | `vfx-realtime`、`particle-systems`、`game-art-director` |
| 强制参考 | Art Bible、美术/音频流程、对齐矩阵、正式VFX候选研究、VFX patterns/validations及粒子技能说明 |
| 正式或研究 | 正式核心反馈VFX生产评审准备；不是纹理批准、运行渲染、Integration或Final |
| 来源 revision / license / SHA | 5项逐一继承当前Catalog/账本；均为`authored-candidate-not-approved`，来源批准与生产批准仍分离 |
| 目标设备 | 桌面与`390×844`移动端、两张正式地图；截图、GPU、过度绘制和峰值内存均未运行 |
| reduced-motion / 关闭路径 | 关闭或低动效最多1层、0粒子，仍保留静态核心结果形状；颜色从不作为唯一信号 |
| 预算影响 | 零新增资产字节；当前5张PNG编码共21,539 B，RGBA8无mip估算327,680 B，不是GPU或运行峰值测量 |
| 验证 | 测试、类型、构建、治理、解码、灰度、截图、浏览器、设备、性能和生命周期全部顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响资产、VFX Port、Renderer、Authority或入口 |

## 五类因果语义

| 纹理Cue | 反馈语义 | 专用Cue数 | 因果边界 |
|---|---|---:|---|
| `impact-confirm` | `hit-confirm` | 120 | 只表达已确认命中，不等于表面转移或击落 |
| `impact-surface-transfer` | `hit-surface-transfer` | 120 | 只表达权威表面转移结果，不代替命中核心 |
| `ring-out` | `hit-ring-out` | 120 | 只表达由武器反馈确认的击落结果 |
| `evaded-warning` | `attack-evaded` | 120 | 只表达权威闪避结果，不从动画空挥推断 |
| `movement-fall-warning` | `movement-fall` | 3 | 只表达移动导致的坠落，不与武器击落共用因果剪影 |

前四类为20把武器×地面/空中及既有反馈层组合形成480个武器专用样式；`movement-fall`保持3个全局样式，因此总数为483。20种武器接触几何只能作为支持层，不能替代5张正式核心结果纹理，也不能改变结果类别或方向。

## Shape–Timing–Color 合同

- 评审顺序固定为形状、时序、明度，再到颜色；每类反馈必须先在灰度、暗图和亮图上独立成立。
- 核心层、方向层和结果层为必要信息；装饰层是质量下降时第一裁剪项。
- 当前统一使用`bright-core-dark-edge`明度策略，颜色只强化区分，不能独自承担命中、击落、闪避或坠落语义。
- 世界方向只可使用共享权威冲量投影；不得从位置差、角色朝向、动画姿态或纹理方向推断。
- 纹理Alpha边缘、缩放、过滤、色彩空间和最小化读法均保持`not-run`，Catalog登记不等于渲染成立。

## 粒子、质量与生命周期预算

| 质量档 | 最大层数 | 最大粒子数 |
|---|---:|---:|
| 关闭 / reduced-motion | 1 | 0 |
| Low | 1 | 24 |
| Medium | 2 | 48 |
| High | 3 | 96 |

- 平均过度绘制上限目标为`2x`，禁止扭曲；该目标尚无设备证据。
- 必须提供显式关闭开关；关闭效果只关闭装饰运动，不关闭必要的静态因果反馈。
- Effect、Emitter、Geometry和Material必须池化且有界，最大活动`sourceEventId`身份为64。
- 每个效果必须有明确Lifetime，并在`remove / clear / dispose`后释放对象和异步回调；生命周期评审尚未运行。
- 不允许程序化Fallback把缺失正式纹理伪装成生产可用，正式纹理缺失时继续失败关闭。

## 十项后续评审门

以下全部为`not-run`：

1. 5张纹理是否与5类互斥结果语义一一闭合。
2. 每类结果是否先靠形状、时序和灰度成立，再由颜色强化。
3. 武器击落与移动坠落是否始终保持不同因果剪影。
4. PNG解码、Alpha边缘、过滤和缩放是否无色边与语义损失。
5. 核心、方向、结果层是否必要，装饰是否能优先裁剪。
6. 关闭、Low、Medium、High及reduced-motion是否保留因果读法。
7. `0 / 24 / 48 / 96`粒子档是否在移动设备保持不超过`2x`平均过度绘制且无扭曲。
8. 20武器接触几何是否只支持而不替代正式结果纹理。
9. 池、64个活动身份及`remove / clear / dispose`是否无泄漏。
10. 五类结果是否在两张地图、桌面与移动端保持可读并具备真实性能证据。

## 生产边界

当前只开放`source-shape-timing-color-particle-budget-lifecycle-and-review-preparation-only`：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝5纹理/5语义/483 Cue不闭合、path/bytes/SHA漂移、批准漂移、击落/坠落混因果、程序化Fallback、粒子或过度绘制扩容，以及默认入口消费。延期测试已经登记但未运行，不能声明纹理解码、灰度、可读性、GPU、过度绘制、性能、设备或生命周期通过。
