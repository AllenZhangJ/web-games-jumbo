# Arena V2 A4 六角色生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a4-playable-character-models`第三批可做的生产前准备，把六个有限操作模板、六个Presentation身份、一个共享Rogue模型、六套姿态/明暗分区和模型/纹理批准缺口收敛成统一评审包。
- 明确不做：不增加第7个角色，不增加按键、主动技能或技能树，不创建六套模型，不把六个Gameplay Definition写成六个已批准独立角色资产，不修改碰撞、移动、跳跃或动作时序。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a4-playable-character-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | A4六角色共享模型、操作差异、选择姿态、明暗分区、动作、武器组合和生命周期评审 |
| 权威来源 | 六角色Catalog/Definition、正式Character Presentation与材质Profile、首屏角色×武器身份、Catalog、纹理依赖、Readiness/批准账本/工作队列 |
| 使用技能 | `character-design-sheet`、`game-art-director` |
| 强制参考 | 产品总纲、玩法框架、项目Art Bible、正式美术流程、对齐矩阵、KayKit Adventurers intake和两个技能说明 |
| 正式或研究 | 正式角色表现的生产评审准备；不是六套正式模型、Blockout或批准证据 |
| 来源 revision / license / SHA | 共享模型与外部纹理逐项继承当前Catalog/账本，六个材质/Presentation身份来自现有严格TypeScript Catalog |
| 目标设备与视口 | `390×844@2x`、`1280×720@1x`，`d00/d05/d12`和六方向；截图、设备与真人证据均未生成 |
| reduced-motion / 静音 / 失败回退 | 角色身份依赖姿态、七部件明暗、participant glyph/pattern和文字；颜色与声音不能单独放行 |
| 预算影响 | 零新增字节；绑定共享模型922,332 B和纹理16,670 B，不批准结构/运行内存或六实例余量 |
| 验证 | 测试、类型、构建、治理、模型检查、浏览器、设备、真人和性能全部顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响六角色Definition、现有Presentation或入口 |

## 六角色的真实边界

当前项目同时存在三种不同数量概念，必须分开：

1. **Gameplay Definition：6个。** `balanced / sprint / air-control / high-jump / quick-start / forgiving`均已登记，只提供有限移动/跳跃手感差异。
2. **Presentation identity：6个。** 每个Definition都有独立材质Profile、选择姿态、操作形状轴和七部件明暗Pattern。
3. **共享模型资产：1个。** 六个Presentation全部复用`parkour-apprentice-rogue.glb`；当前生产批准为0。

因此本方案保持用户要求的“角色不用太多，6个操作差异角色足够”，也保持制作复杂度可控；但共享几何在同一中性姿态下不能凭自身证明六种不同黑色剪影。角色识别必须由以下多通道共同承担：

- 角色选择页中的handling专属静态姿态；
- 共享模型七个部件的六套不同明暗分区；
- 对局中的participant glyph + pattern；
- 简短本地化操作说明；
- 持有武器的独立轮廓，但武器不能反向成为角色身份。

颜色只能辅助。若灰度、色觉差异或低质量级下六身份不能稳定识别，不能用“已有六个Definition”绕过评审。

## 六个有限操作模板

| 顺序 | Handling | 允许的核心差异 | 选择姿态语义 | 明暗Pattern |
|---:|---|---|---|---|
| 1 | balanced | 无偏科基准 | idle | center-core |
| 2 | sprint | 直线跑速与地面推进 | run | fast-legs |
| 3 | air-control | 空中横向修正 | jump | air-wings |
| 4 | high-jump | 起跳高度与竖直发力 | jump | jump-springs |
| 5 | quick-start | 起步加速度与较早进入跑动 | run | start-diagonal |
| 6 | forgiving | coyote/buffer输入容错 | land | stable-bracket |

六者输入合同严格相同：`direction + jump + primary-attack`；共享碰撞和最大空中跳跃次数。没有角色专属攻击按钮、职业武器、主动技能、被动树或数值成长。武器在六角色上保持同一基础功能语义。

## 十项后续评审门

以下全部为`not-run`：

1. 六角色是否继续只使用方向、跳跃和主攻击。
2. 六种有限手感差异是否能被感知和简洁说明，而不是职业系统。
3. 是否诚实表达共享中性几何不能形成六个独立模型剪影。
4. 六个选择姿态是否表达对应手感且不写回Authority状态。
5. 六套七部件明暗Pattern是否在灰度和色觉差异下仍可区分。
6. 六角色×持有武器在六方向、三距离和双视口是否可读。
7. 19个动作语义与来源声明的18条运行时Clip是否闭合且不改变时序。
8. 角色身份是否跨1v1、竞速、生存保持一致。
9. 共享模型与外部纹理的来源、预算和生产批准是否一起闭合。
10. 六实例的Clone、动画、pause/resume和destroy是否没有资源泄漏。

## 生产边界

当前只开放`source-brief-handling-pose-value-pattern-animation-budget-and-review-preparation-only`：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝角色数量/顺序漂移、输入合同漂移、共享碰撞漂移、Presentation/材质/姿态/七部件Pattern不唯一、19动作语义缺失、共享模型或纹理path/bytes/SHA漂移及伪造批准。延期测试已经登记但未运行，不能声明六角色识别、动作、武器组合、设备或生命周期通过。
