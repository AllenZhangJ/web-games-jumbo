# Arena V2 核心反馈VFX纹理候选生成记录

- 日期：2026-08-11。
- 状态：`authored-candidate-not-approved / production-unreachable / validationStatus=not-run`。
- 生成器：`scripts/arena-build-authored-vfx-texture-candidates.ts`。
- 生成器revision：`arena-v2-authored-vfx-texture-builder.candidate.v1`。
- 权利：项目自制，`Project-Owned`。
- 输出：`public/assets/arena/vfx/authored-candidates/`下5份128×128透明PNG。

## 1. 目标与边界

五份纹理分别对应命中确认、落点转移、击落、被避开和移动失误五类核心武器反馈。它们由固定SVG图形栅格化生成，不复制外部游戏素材；设计只借鉴“强轮廓、快速可读、结果可区分”的通用反馈原则。

纹理只由Presentation层按权威`visualCue`选取。它们不读取碰撞、不判断是否命中、不推算掉落原因，也不以播放完成回写规则。隔离Web宿主在Loading阶段显式预载未批准候选；正式严格路径会在未全部批准时失败关闭。

## 2. 视觉语义

- `impact-confirm`：紧凑高亮星形，表达“动作确实命中”。
- `impact-surface-transfer`：横向扫线，表达“落点/站位被改变”。
- `ring-out`：破碎外扩圆环，表达“本次攻击导致击落”。
- `evaded-warning`：开放月牙与虚线，表达“攻击被对方避开”。
- `movement-fall-warning`：双层向下箭头，表达“自身移动失误”，避免与武器击落混淆。

标准动效可叠加现有有界圆环和粒子；低动效继续只显示静态结果纹理。每项最多3层、最多96粒子、平均overdraw上限2和无distortion合同不变。

## 3. 产物清单

| Cue | 设计意图 | bytes | SHA-256 |
| --- | --- | ---: | --- |
| `impact-confirm` | compact-readable-hit-star | 7,563 | `8f6913f33d44ba83ca87c6e11e88b96f511afb453c7741d563bba20a5673c299` |
| `impact-surface-transfer` | directional-ground-sweep | 3,378 | `5ed885373d4e29eae6f22721e79cd503331bb449310e5a86753d1031fc82a41f` |
| `ring-out` | outward-broken-ring | 4,332 | `ec94e8106da26a62a75dcd371629538a5bba1aef1013faf6328900e0df7d08df` |
| `evaded-warning` | open-crescent-near-miss | 4,152 | `64eb5d1afbe6063e7e49faad6a4ae1bfd61d148e838f2caac4937faa51f0efbb` |
| `movement-fall-warning` | downward-route-loss | 2,114 | `9537122259a17d5d235ba2afbf37c41a615b2a4390ae3dde3ff25a3d36840e94` |

## 4. 后续批准要求

1. 五类反馈在0.5秒内可区分，尤其“武器击落”与“移动失误”不能混淆。
2. 手机、浏览器和实际地图明暗背景下，核心轮廓不被角色、HUD和供给Marker吞没。
3. 三项同屏、低/中/高质量档以及reduced-motion静态路径均不超出既定层数、粒子和overdraw预算。
4. 完成浏览器截图、真机视觉、色弱/亮度和性能审批后，才能将maturity改为正式可用。

当前只完成可复现纹理生成与隔离Loading接入；未执行浏览器、真机、截图、性能或正式美术批准。
