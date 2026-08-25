# Arena V2 A3 地图生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a3-map-models`首批可做的生产前准备，把现有两张KZ地图的权威路线、移动包络、节奏、引导、恢复和竞速/生存双读法冻结为逐图评审包。
- 明确不做：不创建、修改或加载GLB，不改变Surface、碰撞、路线、移动参数、输入或玩法，不把注册顺序宣称成已经验证的Critical Path，不签发Blockout、Integration、Final或资产使用许可。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a3-map-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | A3两张地图的后续Brief、Blockout评审、环境照明和正式资产制作 |
| 权威来源 | P3两张Map/Route Definition、P5信息内容目录、正式地图Catalog/环境候选、A3–A6 Readiness/批准账本/工作队列 |
| 使用技能 | `level-design`、`game-art-director` |
| 强制参考 | `.agents/skills/level-design/SKILL.md`、`.agents/skills/level-design/references/pacing-and-flow.md`、项目Art Bible、正式美术流程和开发对齐矩阵 |
| 正式或研究 | 正式地图的生产评审准备；不是Blockout、正式资产或批准证据 |
| 来源 revision / license / SHA | 逐图继承当前Catalog和批准账本的asset ID、path、bytes、SHA、maturity和来源批准事实；不重写来源 |
| 目标设备与视口 | Web、微信、抖音及`390×844`/桌面目标继续有效；本批未生成浏览器或设备证据 |
| reduced-motion / 静音 / 失败回退 | 地图可读性必须依靠结构、地标和引导线，不依赖动画或声音；具体运行验收顺延 |
| 预算影响 | 零新增资产字节；只记录现有两项V2候选预算覆盖，未批准结构上限或产品余量 |
| 验证 | 直接规格已纳入SF-A3A6P.1固定runner；真实路线/Blockout评审、构建、浏览器、设备、真人与性能仍顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响地图Definition、Catalog、资产字节或入口 |

`game-art-director`泛化技能提到的`docs/collaboration-protocol.md`和`docs/game-design-theory.md`仍未随当前安装提供。本批不创建占位，也不把缺失路径写入机器身份；项目Art Bible、流程、对齐矩阵以及`level-design`节奏参考继续作为更具体真值。

## 已冻结的两张地图事实

| 地图 | 段落 | 节奏身份 | 环境身份 | 输入/人数 | 当前资产状态 |
|---|---:|---|---|---|---|
| `arena-v2-kz-base-map.candidate.v1` | 12 | `two-cycle-branch-escalation` | `cool-linear-depth` | 方向+跳跃；2–4人 | `authored-candidate-not-approved / missing-not-approved` |
| `arena-v2-kz-switchback-map.candidate.v1` | 8 | `cardinal-switchback-sawtooth` | `warm-cardinal-turns` | 方向+跳跃；2–4人 | `authored-candidate-not-approved / missing-not-approved` |

两图沿用相同的注册移动包络：最大台阶`0.4`、最大跳跃间隙`2.25`、最大跳升`0.65`、最大安全下落`1.5`、锚点贴地容差`0.001`。这些数值来自玩法/地图Definition，美术只能服从，禁止从模型外观反推或改写。

准备合同按地图注册顺序输出20个段落的以下事实：

- 段落、名称、教学文案、类型、顺序与供给点；
- `introduce / develop / twist / test / climax / release / resolution`节拍和1–5强度；
- 生存职责、受击恢复、响应窗口、响应选项、难度和分支数量；
- 地标、引导线、记忆钩子、竞速读法和生存读法；
- 分支段、安全/恢复段、高潮段、释放段和收束段的可评审集合。

这只证明评审输入完整，不证明路线已经好玩、可解、不会迷路，或当前GLB可以使用。

## 八项后续评审门

每张地图都必须独立完成以下八项，目前全部为`not-run`：

1. 注册路线顺序能否只用方向和跳跃完成，且不存在软锁。
2. 所有必经移动是否仍在注册移动包络内。
3. 强度是否形成总体上升、局部回落的锯齿，并在后续高压前留出释放。
4. 每个必需技巧是否先安全引入，再发展、变化和测试。
5. 地标、引导线和记忆钩子是否无需新增墙体就能持续定向。
6. 可选分支是否可读、值得选择并顺畅回归主路线。
7. 安全区、恢复点、重生后果和高承诺跳跃是否提前可读。
8. 同一支撑几何是否同时支持竞速路线判断和生存站位/击落判断。

`registeredSequentialRouteSegmentIds`刻意不命名为已验证Critical Path。只有未来Blockout、自动路线检查、浏览器/设备和真人评审均形成同source证据后，才能作Critical Path、节奏和可读性结论。

## 生产边界

本批当前只开放`source-brief-structure-budget-and-review-preparation-only`。A0.3当前source与真人、A1.1当前source重建、两项地图逐资产生产批准及对应七类证据槽未闭合前：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝地图/路线/段落身份漂移、输入/人数/重生漂移、工作批次漂移、资产path/bytes/SHA漂移、伪批准以及2图/20段/2资产覆盖不闭合；直接规格已由固定runner执行。八项逐图真实评审仍全部`not-run`，不得写成Blockout或地图通过。
