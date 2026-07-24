# Arena Stage 7 S7.1 表现合同与占位实例门禁结果

## 结论

2026-07-18，S7.1 的本机自动门禁与 Web 真实浏览器验收通过。该结论只覆盖版本化表现合同、程序化占位 Provider、六方向映射与生命周期，不代表 Stage 7 正式角色资产完成，也不解除 Stage 6 E3/E4 与 Mapper 冻结门禁。

## 本批落地

- `PresentationAssetDefinition/Registry`：稳定 asset ID、Provider、source key、内容版本与 hash。
- `CharacterPresentationDefinition/Registry`：玩法角色引用、模型资产、骨架/材质/轮廓 profile、完整动画语义、有序回退、六类白名单插槽、六方向策略与内容 hash。
- `AnimationSemanticResolver`：基础动作与覆盖动作分离；支持待机、走、跑、跳跃、蹲跳、二段跳、下砸、落地、受击、击飞、淘汰、装备、防御和胜负/平局。
- `SixSectorDirectionResolver`：相机相对六扇区、边界迟滞、零朝向保持与角色正面轴修正，只改变表现。
- `CharacterViewRuntime/Factory`：每个参与者独占语义、方向和 View 状态，具体程序化/GLB Provider 可替换。
- `PresentationAssetLoadTask`：并发加载去重、销毁后迟到结果释放、lease 身份验证、失败关闭与释放重试。
- 原灰盒角色不再由投影帧携带 `geometry`，也不再由 `CharacterViewRegistry` 直接构造具体 View。

## 审计中修复的阻断风险

1. 角色从帧中移除或替换时，旧 Object3D 曾只释放资源但未显式脱离场景。现在 Registry 同时 `remove(root)` 与 `dispose()`。
2. 任一角色 View 同步失败后，Registry 曾可能保留失败实例。现在会释放并脱离全部受管角色，进入终态失败关闭。
3. asset lease 的 `release()` 首次抛错后曾失去重试机会。现在保留 lease，后续 `destroy()` 可再次清理，成功后才清空所有权。
4. 销毁期间异步加载完成时，迟到 lease 先释放再拒绝，不会挂入已销毁场景。

## 自动门禁

| 门禁 | 结果 |
|---|---|
| `npm test` | 399/399 通过 |
| `npm run arena:stress`（独占复验） | 1000/1000 结束；5 份回放一致；0 非有限状态；平均 CPU tick 0.226971 ms，小于 0.25 ms |
| `npm run arena:map:stress` | 100 局；3 份回放一致；100 个唯一 final hash |
| `npm run arena:movement:stress` | 100 局；3 份回放一致；100 个唯一 final hash；887 次下砸落地 |
| `npm run arena:bot:stress` | 三档各 300 局，共 900 局；9 份回放一致；移动意图失败率 0 |
| `npm run arena:input:fuzz` | 两个 Mapper 各 40 局；4 份回放一致；80 个唯一 final hash |
| `npm run arena:session:soak` | 100 局；0 残留帧/监听器/输入绑定；heap 增长 2,385,872 B，小于 8 MiB |
| `npm run build` | Web、微信、抖音构建通过 |

首次把 MatchCore 与其他五个压力进程并行运行时，平均 CPU tick 为 0.252219 ms，超过 0.25 ms 约 0.89%。没有放宽预算；在其他压力进程结束后独占复验得到 0.226971 ms 并通过，因此判定为门禁进程互相争抢造成的测量干扰，不是本批表现合同导致的权威性能回归。

机器人压力结果继续保持隐藏三档的能力顺序：easy 7.50、normal 18.72、hard 19.51。机器人仍通过普通 `InputFrame` 行动，没有新增表现层或未来状态依赖。

## Web 真实浏览器验收

环境：Codex 应用内 Browser，`http://127.0.0.1:5173/`，页面标题“深渊竞技场”。

| 检查 | 结果 |
|---|---|
| 页面身份与非空内容 | 通过；主区域、Arena Canvas 和操作说明存在 |
| 框架错误覆盖层 | 未出现 |
| Console error/warn | 桌面、交互后、手机尺寸均为 0 |
| 桌面 1280×720 | 两种程序化角色、平台、装备、HUD、摇杆与动作键可见 |
| 手机 390×844 | HUD、地图与底部双控制区无裁切或重叠 |
| 交互 | 左摇杆向右拖动后角色发生可见位移；点击动作键后按钮从“跳跃”切为“二段跳” |

截图在本次验收会话中生成并随交付展示，不作为正式角色美术或真机证据入库。

## 仍未完成

- Stage 6 五类 E3 目标设备 Record、真实新手 E4 样本与 Mapper 胜者冻结。
- S7.2 的正式 GLB、骨骼、AnimationMixer、最小正式动作集及离线 GLB 校验。
- S7.3 的衣服、翅膀、挂件、拖尾实例和第二骨架正式资产。
- S7.4 的战斗、地图、镜头和音频反馈策略。
- S7.5 的微信/抖音/目标真机资产加载、上下文恢复、包体、内存和帧时间预算。

## 第三方边界

本批没有新增依赖，也没有复制第三方代码。程序化 Provider 继续使用项目现有 Three.js；Three.js `GLTFLoader/AnimationMixer/SkeletonUtils`、glTF-Validator 与 glTF-Transform 仍只是 S7.2 之后的固定 commit 研究候选，见 [ADR-010](../decisions/010-arena-semantic-presentation-and-assets.md)。
