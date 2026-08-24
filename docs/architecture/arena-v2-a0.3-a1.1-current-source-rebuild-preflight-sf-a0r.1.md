# Arena SF-A0R.1 A0.3 重生成与 A1.1 重建静态预检

## 状态与范围

- 阶段 ID：`SF-A0R.1`
- 审计输入：`feature/arena-v2-design-docs`，`787ce27a4bc100a41e1b7330b327c8554bd03459`
- 开始审计时工作树：clean；本文件及关联文档落盘后工作树不再满足重生成的 clean-source 前置，故本阶段不运行生成器或检查器
- 状态：`documentation-contract / code-written-not-run / validationStatus=not-run / hardGate=false`
- 使用技能：`game-art-director`、`media-asset-management`
- 强制项目参考：[美术与音频开发流程](arena-art-and-audio-development-flow.md)、[Art Bible](arena-art-bible.md)、[A0–A7 对齐矩阵](arena-art-development-alignment-matrix.md)、[A0.3 候选基线](arena-art-silhouette-a0.3.md)、[A1.1 就绪包](arena-art-supply-readiness-a1.1.md)
- 泛化技能缺口：`docs/collaboration-protocol.md`、`docs/game-design-theory.md`、`templates/art-bible.md`均不存在；只登记治理红缺口，不创建占位，不进入机器合同或内容 hash

本阶段只关闭“下一次获授权重生成/重建时究竟绑定哪些当前源码、哪些历史证据必须作废”的静态歧义。它不生成或修改 PNG/GLB/OGG，不更新既有证据 SHA，不执行真人、浏览器、设备、性能或批准，不开放 Blockout、Bundle、Preloader、Composition 或 Entry。

## A0.3 当前源码重生成条件

### 历史证据与当前源码的实际关系

| 项目 | 既有机器证据身份 | `787ce27`只读实测 | 判定 |
|---|---|---|---|
| `scripts/art/render-arena-silhouettes.ts` | `18,539 B / ff49abd4b1ae5d2043aabf4e7d29310a8e9c338e4d6189f06bbf10681ddb616b` | `18,539 B / ff49abd4b1ae5d2043aabf4e7d29310a8e9c338e4d6189f06bbf10681ddb616b` | 渲染源字节未漂移 |
| `packages/arena-presentation-three/src/arena-camera.ts` | `ce1e574f55731d9bbe669d5b6351c9fe6dc3399bfdb65b9fceb8b854954e7d91` | `ce1e574f55731d9bbe669d5b6351c9fe6dc3399bfdb65b9fceb8b854954e7d91` | 相机来源未漂移 |
| `packages/arena-presentation-runtime/src/six-sector-direction-resolver.ts` | `06a1336db0b2e671e9eac1800d0e99eb641d040d4fb323d8e9c96954438df630` | `06a1336db0b2e671e9eac1800d0e99eb641d040d4fb323d8e9c96954438df630` | 六方向来源未漂移 |
| 历史 Presentation 审计源 | `packages/arena-v1-presentation-content/src/arena-gameplay-v2-character-content.ts / e07e0109a62a5c988848c489e91f32d94dfbd5f54615a0536297938db1909f34` | 字节仍一致，但它不是当前 Arena V2 正式目录 Owner | 后续重生成不得继续把它作为唯一产品来源 |
| 当前正式目录 Owner | 历史 manifest 未登记 | `packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.ts`，`69,706 B / b41dbedba5a3d1d95c94f967846a4d9a1d945bb56b8e13bb92bdd2c281da60ad` | 重生成前必须由协调者确认并绑定 |
| `scripts/art/generate-arena-silhouette-gate.ts` | `4,679 B / d6ffd8561f13452792684e5ea91fec44d32461539032fb7b9f9d0449b624d0b4` | `4,925 B / 6a7a9ca5579769fd62698a955c31139abcfb9f7cec6fb817595f5761a507e68c` | coverage fail-closed 修正后已漂移，旧 gate 不能代表当前生成源 |
| render / blind / proxy 输入 | `257,391 B / 1b85c5442fbb08c3ff7e8d82538d0f6fdc2cb17dad06c3a279d4b7e1350805c7`；`40,562 B / 69610c9bd27c5b0ff10ab6c0a8c47fd136892fe5d2e606cbdbbdad12736e90d2`；`21,709 B / d4088e62f38e33fbbdfe14c1d354dcf0ac950eb70512335300ba72b5fa97a540` | 三项仍逐字节一致 | 只保留为历史候选，不能因未漂移跳过重生成 |

### 获授权后唯一允许的执行顺序

1. 主协调提供最终 clean source commit；不得在包含本预检改动的 dirty 工作树直接运行。
2. 先把 A0.3 渲染源身份从历史 V1 Presentation 审计源重绑到当前正式 Catalog Owner，并确认本门究竟保持“两种正式模型×赤手/圆盾”的历史工具基线，还是另开后续六角色材质身份的独立可读性门；不得自行把共享模型的六套材质身份写成六种黑色剪影通过。
3. 重生成顺序固定为 render manifest/PNG → blind package/questions/answer key → proxy baseline → gate → human kit；所有下游 hash 必须来自同一次 source identity。
4. 旧真人答卷不得跨新 blind package 复用；新包仍需至少10名未参与制作的真人，且角色/装备/方向总指标与距离/视口分层均按原阈值重算。
5. 正向检查、隔离 fail-closed 矩阵和人工门均完成前，保持`85/100`、真人`0/10`、`pending-regeneration`、`hardGate=false`、Blockout禁止。

本预检没有修改生成器、manifest、PNG、blind package、proxy、gate或human kit，因而也没有改变任何既有产物 hash。

## A1.1 当前源码重建准备

历史机器包绑定`f80307b375eb9f8f5380372e5b002d1eb86a4df7`。在`787ce27`只读重算后，六个生命周期来源中只有第一项仍与历史包一致，其余五项均漂移：

| artifact | 历史机器包 | `787ce27`只读实测 | 判定 |
|---|---|---|---|
| `packages/arena-contracts/src/arena-public-supply-projection.ts` | `29,094 B / b1ad32bc9e3d023af0cfbcbac41c31efee69d291de856e1914e5622dfa5ec7ec` | `29,094 B / b1ad32bc9e3d023af0cfbcbac41c31efee69d291de856e1914e5622dfa5ec7ec` | identity unchanged |
| `packages/arena-contracts/src/match-snapshot.ts` | `19,417 B / 89ca74403445cbe8333e68e0e907a914500dce51b3bcf3cbce8ebb928e51fe38` | `19,672 B / c03ff02ab484b8c6c558fbc550e9360a3817f6f9931094ba577823d6b0d30691` | identity stale |
| `packages/arena-equipment/src/equipment-supply-timeline-system.ts` | `26,241 B / 57bf117fb918724e77bd3ec0bb2f3dc0727803747b335f6039d13aab29937d0e` | `42,946 B / 7015c471b7c1fe0c9b6298eaf46eb6f0c8be0f816f3181071b5e8b8be1163bb7` | identity stale |
| `packages/arena-match/src/match-core.ts` | `58,363 B / 208a736b7d95c654bc99592bb0b82a14fa760c117d9afd4d30dbf744b10f7347` | `93,188 B / 51df8d148890df2f6984d0fddb1ed42da15b86bd4c42d0f4d243c346e2ede51c` | identity stale |
| `packages/arena-bot/src/bot-observation.ts` | `36,050 B / ceaaaf020a2a2168e52aa4356dd32feb88736fbfd894c751fc404b863bc2dac3` | `58,501 B / e8accb85da7942b9587cdedc8b111dcc728d17d0af7be53a9d08c10e2a5944e6` | identity stale |
| `packages/arena-bot/src/bot-controller.ts` | `16,293 B / 75ce2cd9d69822ffe38ffb67f14467b63df7cde49ea0b33b34653a7f7d0fb99d` | `27,905 B / 745384dae97a38501bea70d649e680405c0b914b3a5b70b9ab73c5179ebb7c0e` | identity stale |

六个必需表现字段`snapshotTick / snapshotEventSequence / remainingTicks / pendingExpiryEquipmentInstanceIds / resyncReadiness / pendingAuthorityTick`仍可在当前合同、Timeline和Bot消费链中定位；这只证明重建输入仍存在，不证明调用链、恢复语义或A1.1通过。获授权重建时必须重新生成整个A1.1机器包并重跑全部正向/反证，不能只替换五项size/hash，也不能沿用历史`92/100`。

来源、许可与批准边界保持不变：现有字节的revision/license/SHA只证明来源与交付身份；当前130项逐资产`productionApprovalStatus=missing-not-approved`，`assetUsePermitted=false / formalReady=false`。供给专用图标、三类正式VFX字节、供给专用音频批准、浏览器/GPU、设备、真人和样件测量仍缺失。

## 与最新 Race / Survival 稳定表现合同的差异结论

只读核对以下当前源码：

| 文件 | `787ce27`身份 | 表现结论 |
|---|---|---|
| `packages/arena-contracts/src/match-event-v6.ts` | `34,957 B / a9a1e8c170c94cff533d9b1457ba9b5a776ac94cc46cddff5721159a6126a799` | V6仍以显式fall、respawn、Race anchor/finish、Survival slot/fall和ModeResult事件提供事实 |
| `packages/arena-contracts/src/match-read-frame-v3.ts` | `30,958 B / 27ed94c735a4cec1552261f9d4124f987dce7c0325f05874f48f31d34feef5e2` | Frame仍只提供world snapshot、mode/supply/result投影与local action sidecar |
| `packages/arena-match/src/mode-match-runtime-v6.ts` | `86,085 B / 8f8185f7d71aff8082fce3d7f02805c6d6405f0402c6c3d4e5465b793e134a2e` | Presentation公开消费仍为已验证step结果，不开放内部Policy/checkpoint/command |

Survival“交互式产品时序与验证脚本调度分离”以及Race“5940 active tick产品候选与6000 tick watchdog分离”只改变内部配置purpose/content identity和验证边界，没有新增或改变上述稳定表现事件字段。HUD、VFX、音频、地图和武器继续只读`readyTick / invulnerableTicks / fallCause / creditedAttackerId / finishTick / progressOrdinal / modeProjection / ModeResult / SupplyProjection`等显式事实，不得读取purpose、Policy bundle、watchdog、内部stateHash或坐标来重判计时、命中、坠落、排名或胜负。本阶段不需要向开发任务申请权威合同变化。

## Source → Process → Deliver → Manage 与回滚

- **Source**：仅记录当前源码、正式Catalog和历史机器包的字节身份；不改变资产来源、许可、SHA或批准。
- **Process**：冻结未来重生成/重建顺序与失败关闭条件；本阶段未运行任何生成器、检查器或渲染。
- **Deliver**：没有新媒体、截图、录屏、三端包或设备证据。
- **Manage**：A0.3、A1.1、130项批准、A2运行、A6正式预览和A7 PASS均保持关闭；本文件不能被任何运行时或发布门消费。
- **回滚**：整文件删除本预检；同时回滚[A0.3文档](arena-art-silhouette-a0.3.md)、[A1.1文档](arena-art-supply-readiness-a1.1.md)、[对齐矩阵](arena-art-development-alignment-matrix.md)和[流程](arena-art-and-audio-development-flow.md)中指向`SF-A0R.1`或“2图20段”的本批文字。不得回滚或删除历史机器证据、资产字节、开发源码或已签核A0.2/A1.0-v2。

## 静态自检结论

1. 来源/许可/SHA/批准：只读重算源码身份；未修改130项来源、许可、SHA或批准，来源批准未被提升为生产批准。
2. 加载失败兜底：未开放加载；程序化/灰盒仍仅允许失败回退，不是正常生产路径。
3. 异步竞态/卸载/重复进入：未创建Owner或资源；未来A1.1仍需验证pause/resume、旧one-shot不补播、双destroy和资源归零。
4. 低性能/reduced-motion/静音：合同保持静态形状/数字/文字等价；GPU、overdraw、音频和设备数据均未声称通过。
5. 边界尺寸/主流程：A0.3仍固定双视口；A1.1仍固定`390×844 / 1440×900`候选。A0.3/A1.1失败继续阻断Blockout与样件主流程。
6. 预算/三模式：未改变任何预算；Duel/Race/Survival继续消费同一V6/Frame边界，Race/Survival内部时序purpose不进入Presentation。
7. 治理/回滚：文档批次可独立回滚；不修改机器证据、生成器、资产、默认入口或开发写域。
