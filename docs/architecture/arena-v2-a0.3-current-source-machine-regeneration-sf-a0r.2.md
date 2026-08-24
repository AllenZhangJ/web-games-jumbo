# Arena SF-A0R.2 A0.3 当前源码机器重生成闭环

> **退回 / 不可采信**：协调者复核确认，本报告所列机器产物是在`de1ef89` clean起点之后先修改生成器/检查器、再执行整链得到；产物记录的generator字节并不存在于其声称的commit。以下SHA与运行结果只保留为失败轮审计记录，状态统一为`non-admissible-dirty-toolchain-source`，不得用于A0.3、A1.1、Blockout或任何下游门。替代方案见[`SF-A0R.2A toolchain-preparation`](arena-v2-a0.3-clean-source-toolchain-preparation-sf-a0r.2a.md)。

## 状态与边界

- 阶段ID：`SF-A0R.2`
- 源基线：`feature/arena-v2-design-docs@de1ef89f36c2152c978c82f5976f04737e43cb4f`
- 开始状态：clean、远端一致；生成后仅A0.3专属脚本、机器证据和美术文档产生预期差异
- 状态：`rejected / non-admissible-dirty-toolchain-source / hardGate=false`
- 评分：`85/100`，最低维度`0%`；真人`0/10`
- 使用技能：`game-art-director`、`media-asset-management`
- 项目强制参考：[美术与音频开发流程](arena-art-and-audio-development-flow.md)、[Art Bible](arena-art-bible.md)、[A0–A7对齐矩阵](arena-art-development-alignment-matrix.md)、[A0.3基线](arena-art-silhouette-a0.3.md)、[真人盲测包](arena-art-silhouette-human-test-a0.3.md)
- 泛化技能缺口：`docs/collaboration-protocol.md`、`docs/game-design-theory.md`、`templates/art-bible.md`仍不存在；只登记治理红缺口，不创建占位，也不进入机器内容身份

本失败轮没有关闭A0.3机器证据与当前源码不同源的问题。它没有获得真人答案、没有授予生产批准、没有开放A1.1、Blockout、Bundle、Preloader、Composition、Entry，也没有让程序化素材成为生产正常路径。

## 当前Source身份闭包

历史`packages/arena-v1-presentation-content/src/arena-gameplay-v2-character-content.ts`已从A0.3 authority集合移除。当前manifest固定以下五项来源：

| 来源 | byteLength | SHA-256 |
|---|---:|---|
| `packages/arena-presentation-three/src/arena-camera.ts` | 10,423 | `ce1e574f55731d9bbe669d5b6351c9fe6dc3399bfdb65b9fceb8b854954e7d91` |
| `packages/arena-presentation-runtime/src/six-sector-direction-resolver.ts` | 6,709 | `06a1336db0b2e671e9eac1800d0e99eb641d040d4fb323d8e9c96954438df630` |
| `packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.ts` | 69,706 | `b41dbedba5a3d1d95c94f967846a4d9a1d945bb56b8e13bb92bdd2c281da60ad` |
| `packages/arena-product-presentation/src/arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.ts` | 23,867 | `8c741c69c28a2bc37ea04f72a43372c765e0d6a0fbd1516a1387be8b2f5e18d9` |
| `governance/formal-assets/arena-stage7-formal-assets-v1.json` | 6,893 | `68a79e95e8920e2b98df8bad3a4b44d22f3dc7f17b53acd5ed8398e426c5b0bf` |

当前Catalog身份为`arena-v2-formal-presentation-assets.candidate.v1 / candidate-v1 / 02e87764 / 130项`；逐资产批准账本身份为`arena-v2.a3-a6.production-approval-evidence-ledger.candidate.v1 / c86524c7 / 130项`。A0.3只从中精确选择：

1. `arena.asset.character.parkour-apprentice.kaykit-rogue.v1`
2. `arena.asset.character.wind-up-cube.kaykit-skeleton-warrior.v1`
3. `arena.asset.attachment.shield.kaykit-round.v1`

三项均逐值闭合`assetId / role / maturity / path / byteLength / SHA / runtimeDefinition / source revision / CC0许可 / rights holder / proof`。来源intake批准记录为true，但生产批准仍统一为`missing-not-approved`，`assetUsePermitted=false / formalReady=false`。它们只用于A0.3诊断证据，不成为默认产品加载许可。

## 生成顺序与产物

执行顺序固定为：

1. `render-arena-silhouettes.ts`：重写144张原图、144张10%缩略图和render manifest；PNG结果与历史确定性字节一致，因此没有二进制diff。
2. `generate-arena-silhouette-blind-test.ts`：从同一render manifest重建144题映射、10份问题表、restricted answer key、代理基线和blind package；问题、答案与题图保持确定性字节，package/proxy新增当前baseline闭包。
3. `generate-arena-silhouette-gate.ts`：只消费当前render/blind/proxy身份，重建85分门账本。
4. `generate-arena-silhouette-human-test-kit.ts`：拒绝任何非零旧intake后重建10份离线包；participant count保持0。

四个生成器均由对应机器产物固定SHA：render=`87c4aabc409bdc3a6bcc3d2d9b97e949c446d99d5c023821ba235ed156777002`、blind/proxy=`2d507a2a79f6c59e0f528ab0b0a59291484aaadbdd7cf88a1ec38761e1a2d088`、gate=`2b45c849c970e4ced452696e3d8d98a1b7327496e3e4b44868abd1cb973cb4b6`、human kit=`fa7103d35f658abbc384bef76f62bd5bb3895bda9f696279ae37b5ff74c325f2`。

关键产物身份：

| 产物 | byteLength | SHA-256 |
|---|---:|---|
| render manifest | 264,423 | `9bc9978df5a141fd742ae6a6ad007d069125feed2396e2b9c8a0fd9957d17b9c` |
| blind questions | 36,314 | `03de99450211ee6dbb0e74c63e72a7b5cbf20f85a6d317065abd4fba06bb814e` |
| restricted answer key | 44,874 | `10baa24ad462fc4c742c060cdcb7bd844d2350e098fc0e965dbd4770315ee801` |
| proxy baseline | 21,773 | `ce69954036790bc584e65ff4b38c91cd518d58dc51e5330dfe41d9ffaad9cc82` |
| blind package | 40,821 | `18e726f3fdfd4486fc8ed6fe0ddc80a07d016fa0232df8948eecb81a0f68de65` |
| gate | 5,372 | `b93287241298a14da6f731dacaa8ba9eb03855464e0510e18946629554e3bb2e` |
| human kit manifest | 83,037 | `a8f35b5232bd51e6314ac47ba6f678e5c2ad67a7d1d0da6b08485e76437379c9` |

整个`docs/quality/art/silhouette`输出树在连续两次完整生成前后的聚合SHA均为`37dd5ebcd1eb23a39f7b87c1c65f63732c5957f380f5f11f6c11777eaf11747b`，证明同一输入下输出确定。

## 检查结果与失败轮

- render：`144/144`输出、`144/144` in-frame、offscreen `0`
- proxy：角色`0.993055...`、装备`0.968055...`、方向`0.940972...`；0/5/12m各维度均不低于0.9
- gate正向：`85/100`、minimum dimension `0`、`hardGatePassed=false`
- human kit正向：10表单×24题、144唯一tuple、72细分层、双视口、真人`0/10`
- gate隔离矩阵：`21/21`，包括当前baseline、拒绝V1 authority、Catalog hash、selected asset、伪造生产批准和blind generator漂移
- human kit隔离矩阵：`16/16`，包括当前baseline、human generator漂移和0/10 evaluator拒绝
- intake：`12/12`恶意答卷拒绝，另有1项排他写入与1项提交后故障耐久探针
- evaluator：`15/15`恶意输入拒绝，另有1项完美10人**工具候选**仍保持`hardGatePassed=false`

首轮gate正向曾因旧宽泛正则把合法字段`programmaticNormalPathAllowed=false`误判为兜底使用而失败。检查器已收紧为仅拒绝实际出现的`fallbackUsedPath / programmaticUsedPath`，同时继续值级要求正常路径为false；修复后正向、21项反证与二次确定性生成均通过。

补齐human generator identity后，intake/evaluator的两个合法隔离fixture首轮因临时根未复制被绑定generator而失败；产品验证未放宽，测试夹具改为把同一generator artifact复制进每个隔离根。修复后12项intake反证与两项耐久探针、15项evaluator反证及完美工具候选全部按原边界通过。

## Source → Process → Deliver → Manage

- **Source**：固定当前Catalog、批准账本、正式intake bundle、相机、方向resolver及三项GLB的revision/license/SHA；不引用历史V1 Presentation Owner。
- **Process**：二值剪影、固定pose、六方向、0/5/12m、双视口、固定seed匿名题与代理均可重算；输入漂移在写下游证据前失败关闭。
- **Deliver**：只交付A0.3诊断PNG、匿名离线题包与机器账本；没有生产可加载媒体、设备截图或真人结论。
- **Manage**：旧真人答卷不得复用；generator遇到非零intake直接拒绝。raw答卷仍禁止Git跟踪，主协调签核前所有下游关闭。

## 自检与红项

以下条目仅记录失败轮当时观察到的内部结果，因clean-source身份不成立而全部不可采信；不得沿用为SF-A0R.2A/B证据。

1. 来源/许可证/SHA/批准：三项资产均从当前Catalog和账本双向闭合；来源批准未被提升为生产批准。
2. 生成确定性：完整输出树连续两次聚合SHA相同；固定seed、日期和baseline，无墙钟或随机漂移进入机器身份。
3. 输入漂移失败关闭：V1 authority、baseline、Catalog、ledger、asset、clip、骨架、方向、距离、像素、答案、阈值和下游越级均有隔离反证。
4. 双视口/边界：`390×844@2x`与`1280×720@1x`共144组合全部in-frame；这不是物理设备证据。
5. reduced-motion/静音：A0.3禁用动态镜头、VFX、HUD、灯光、阴影、后期和音频；纯静态黑色轮廓不依赖声音或动效。
6. 异步/生命周期：GLTF解析、clone、mixer与sharp写入均在单次离线进程内结束；没有运行时Owner、网络请求或长期资源。构造/输入失败不会开放下游。
7. 预算：输出数、像素尺寸、题量和表单数量均未扩大；没有修改项目正式资产预算或媒体字节。
8. 三模式合同：该门只测试共用角色/圆盾可读性，不读取Duel/Race/Survival内部Policy、计时、命中、坠落或胜负；开发稳定事件无变化。
9. 主流程/回滚：A0.3仍因真人0/10阻断Blockout；A1.1仍须独立重建。回滚只撤销本批A0.3脚本、机器证据和美术文档，不回退A0.2、Catalog、批准账本、资产字节或开发源码。

## 仍缺的真实证据

- 10名独立、未参与制作的真人分别完成唯一表单；不得使用工具、代理或旧答卷。
- 真人混淆矩阵、距离/视口分层、角色×装备和72细分层阈值结果。
- 主协调对参与者资格、原始SHA和阈值报告的最终签核。
- 后续A1.1当前源码整包重建、正式资产逐项批准、浏览器/设备/性能证据。

协调者提交SF-A0R.2A并从该clean commit完成B段整链重生成、且上述真人证据到齐前，A0.3保持`85/100 / human 0/10 / hardGate=false`，Blockout及所有默认生产消费继续关闭。
