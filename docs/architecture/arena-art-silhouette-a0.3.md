# Arena A0.3 剪影工具与盲测候选基线

## 状态

- 日期：2026-08-24（clean-source工具链准备；原协议始于2026-07-28）
- 状态：`toolchain-preparation / current-output-non-admissible / pending-clean-regeneration`；A0.3仍为`incomplete`
- 评分：85/100；最低维度0%，未达到总分≥90且各维度≥80%的硬门
- 前置：A0.2视觉方向总门已`ready`（96/100）
- 2026-08-12静态一致性收口：门台账与生成源已把陈旧的“12m共48项离屏”修为现有事实“144/144在镜头内、离屏0、12m样本全部保留”；状态仅为`code-written-not-run / pending-regeneration`。本轮未运行生成器或检查器，未更新生成器SHA、产物hash、评分、真人计数或签核；当前source identity必须在后续获准重生成后重新绑定。
- 2026-08-24 [`SF-A0R.1`静态预检](arena-v2-a0.3-a1.1-current-source-rebuild-preflight-sf-a0r.1.md)确认：render/blind/proxy历史输入仍逐字节一致，但gate生成器已漂移，且渲染manifest仍把历史V1 Presentation文件作为产品审计源；后续必须在主协调提供的最终clean source上重绑当前Arena V2正式Catalog并整链重生成。该预检不修改机器证据，评分仍85/100、真人仍0/10、Blockout仍禁止。
- 2026-08-24 [`SF-A0R.2`机器生成尝试](arena-v2-a0.3-current-source-machine-regeneration-sf-a0r.2.md)因“先改工具、后运行，却把起点commit写作产物baseline”被协调者退回；现有机器结果与SHA虽内部自洽，但统一为`non-admissible-dirty-toolchain-source`。[`SF-A0R.2A`](arena-v2-a0.3-clean-source-toolchain-preparation-sf-a0r.2a.md)只准备动态Git sourceCommit/clean检查与继承协议，尚未运行。评分仍85/100、真人仍0/10、`hardGatePassed=false`、Blockout仍禁止。

当前可采信范围只证明clean-source工具链候选已写；现有机器包不能证明当前正式输入身份或失败关闭已在clean source上通过。它也不证明剪影可读性、真人盲测、设备、Blockout、LOD或Final通过。

## 输入与技能约束

- `game-art-director`：只用纯黑轮廓和固定灰背景判断体块、方向与负空间；禁止颜色、文字、发光补辨识。
- `character-design-sheet`：仅测试当前两名正式角色 C01 跑酷学徒、C02 发条方块，以及赤手/正式圆盾两态；不编造其余角色、锤、链或玩法数值。
- `threejs-animation`：使用正式 `Idle` clip 的确定性采样、正式骨架hash和 `SkeletonUtils.clone()`；圆盾按运行时 `handslot.l` 零变换挂接，禁止程序化附件或错误骨架克隆。

权威输入、GLB、clip、骨架、相机、方向resolver和输出hash见[渲染manifest](../quality/art/silhouette/arena-a0.3-silhouette-render-manifest-v1.json)。

## 实际产物与结果

- 组合：2角色×2装备态×6方向×3距离×2视口，共144张原图和144张10%缩略图。
- 尺寸：`780×1688`（`390×844 @2x`）与`1280×720`；RGB三通道，无alpha，仅允许`#000000/#808080`。
- 姿态：赤手使用正式`Idle`，圆盾使用正式`Blocking`，统一采样规则`min(0.35s, duration×0.25)`；两角色骨架身份一致。
- 镜头：生产 `createLocalFollowArenaCamera`，固定target原点、原始正交跨度和统一角色尺度；固定把0–12m走廊中点映射到frustum布局中心，对所有角色/装备/距离使用同一偏移，不做逐资产自适应。
- 画面结果：144/144有有效黑像素，离屏0；12m样本保留且尺度未修改。
- 匿名题包：144个`qNNNN.png`，10份固定seed表单，每份24题；参与者包不含答案、角色名、资产名或源文件名。答案键单独保存。
- 真人：0/10，状态`missing-blocking`，没有伪造真人、设备或可用性结论。
- 真人执行流程与工具源码已建立，但当前human kit属于被退回的dirty-toolchain包，不得分发或接收答卷。协调者提交SF-A0R.2A并从新clean commit完成B段后，重生成的10份表单才可重新评价`ready-for-external-human-input`；restricted evaluator、原子落盘和raw答卷禁止Git跟踪边界保持不变。
- 内部非真人代理：角色约99.3%、装备态约96.8%、方向约94.1%；0/5/12m三个距离层的三项指标也均≥90%。混淆矩阵显示主要剩余混淆是正/背与相邻后侧方向。该结果只关闭机器预检，不得替代真人。

机器总门见[治理台账](../quality/art/silhouette/arena-a0.3-gate-v1.json)，匿名包见[盲测manifest](../quality/art/silhouette/blind-test/arena-a0.3-blind-test-package-v1.json)。

## 评分与硬门

| 维度 | 得分 | 事实 |
|---|---:|---|
| 正式资产/动画身份 | 20/20 | 两正式角色、Idle、同骨架hash与正式圆盾；无兜底 |
| 确定性渲染覆盖 | 20/20 | 144组合齐全且离屏0，固定frustum布局可复算 |
| 剪影可读性 | 20/20 | 非真人代理整体及距离分层三指标均≥90%，只关闭机器预检 |
| 盲测协议/隐私 | 15/15 | 匿名、答案分离、10表单、混淆矩阵与距离分层齐备 |
| 真人证据/阈值 | 0/15 | 0/10，无法计算真人混淆矩阵和分层结论 |
| 治理/失败关闭 | 10/10 | A0.3及全部下游保持关闭 |
| **合计** | **85/100** | **仅保留历史候选分；hardGatePassed=false，当前阻断为clean-source整链未重生成与真人0/10** |

## 失败关闭、返工与回滚

SF-A0R.2A检查器候选将验证动态`sourceCommit/sourceFreeze`、根依赖清单/锁文件、实际Node/平台/架构/Three/Sharp运行时、当前Catalog/批准账本、正式资产路径/hash、clip、骨架、方向/距离/视口全组合、RGB/alpha/二值像素、尺寸、匿名题包、答案泄露、真人样本、90%阈值和下游状态。延期反证已扩充sourceCommit、fingerprint、关键文件、runtimeToolchain与下游继承漂移，但本A段没有运行；未来计数为25项gate manifest＋2项clean-start、18项human kit。现有21/16等结果属于被退回的dirty-toolchain失败轮，不得沿用。

下一步按[真人盲测最小执行包](arena-art-silhouette-human-test-a0.3.md)由至少10名未参与制作的真人独立完成10份表单，并复算角色/装备/方向混淆矩阵及距离/视口分层；任一总指标或距离/视口层指标<90%，或任一角色×装备组合<80%，仍需退回姿态/体块/持握返工。不得加颜色、文字、描边、发光，不得修改权威hitbox或玩法。

回滚点是本文件、`scripts/art/*arena-silhouette*`以及`docs/quality/art/silhouette/`；A0.2已签核事实不在回滚范围。生产Blockout继续禁止。
