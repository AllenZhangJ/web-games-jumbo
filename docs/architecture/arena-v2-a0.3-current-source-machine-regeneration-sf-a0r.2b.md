# Arena SF-A0R.2B A0.3 clean-source机器重生成

## 状态与边界

- 日期：2026-08-25
- source commit：`feature/arena-v2-design-docs@60fbc13430f8ba31eb58d8bef775c7a75b5abec7`
- 状态：`current-source-machine-regenerated / tooling-review-candidate-human-blocked / hardGate=false`
- 使用技能：`game-art-director`、`media-asset-management`
- 机器环境：Node `v20.19.5`、darwin/arm64、Three `0.185.1`、Sharp `0.35.3`

本阶段只关闭A0.3机器证据与当前clean source不同源的问题。它没有真人答卷，没有授予生产批准，也没有开放A1.1、Blockout、Bundle、Preloader、Composition、Entry、设备或Final。

## Source → Process → Deliver → Manage

### Source

render在首个输出前取得`.git/arena-a0.3-source-freeze.lock`，要求协调者显式传入完整目标commit，并双重验证HEAD、全工作树clean、`package.json/package-lock.json`、14项工具文件、Catalog、批准账本、相机、方向resolver、三项GLB、校准图、许可证与来源证明均逐字节等于`git show 60fbc13:<path>`。sourceFreeze fingerprint为`ce1781b4af35e0241958043e4c59d0973e9e4ce91a8d686c30e5165726ad2e41`。

当前Catalog为`arena-v2-formal-presentation-assets.candidate.v1 / 02e87764 / 130项`，批准账本为`c86524c7 / 130项`。A0.3只选择两名角色与圆盾三项诊断输入；三项均保持`productionApprovalStatus=missing-not-approved / assetUsePermitted=false / formalReady=false`。

### Process

固定顺序为：render/PNG → blind questions/answer/proxy/package → gate → human kit → 正向检查 → 隔离失败关闭。协调者连续执行两次完整生成；首轮完整归档于临时目录`/private/tmp/arena-a0r2b-first.rQslRk`，两轮生成树聚合SHA均为：

`f2ecd9ff7f21fc07742b75d12207f104c93cd8f5854e69055392496b2d3cffa4`

### Deliver

- 2角色×2装备态×6方向×3距离×2视口，共144张原图、144张缩略图；`144/144 in-frame`。
- 10份匿名表单×24题，144个唯一tuple，72细分层，每图出现1–2次。
- 非真人代理：角色`0.9930556`、装备`0.9680556`、方向`0.9409722`；0/5/12m各分层均不低于90%。
- 真人：`0/10`，状态`missing-blocking`；human kit仅为`ready-for-external-human-input`。

### Manage

- Gate正向：通过，`85/100 / minimumDimensionRatio=0 / hardGatePassed=false`。
- Human kit正向：通过，10表单×24题、144唯一tuple、真人0。
- Gate隔离：`25/25` manifest反证＋`2`项clean-start通过。
- Human kit隔离：`18/18`通过。
- Intake：`12/12`恶意输入拒绝，合法排他写入与提交后耐久探针通过。
- Evaluator：`15/15`反证通过；完美10人候选仍保持`hardGatePassed=false / coordinatorSignOff=null`。

## 自检与红门

1. 来源、许可证、SHA与运行时身份全部进入sourceFreeze；旧`de1ef89`dirty-toolchain结果仍不可采信。
2. 程序化素材未进入正常路径；本阶段只生成诊断PNG和匿名离线题包。
3. 生成、检查、intake与evaluator均失败关闭；旧raw答卷、非零intake、HEAD/依赖/工具漂移会在发布前拒绝。
4. A0.3纯静态黑色轮廓，不依赖音频、VFX、动态镜头或reduced-motion动画。
5. 130项正式资产仍全部缺生产批准；浏览器、设备、性能和真人证据均未取得。
6. A0.3仍为`incomplete`；下一步只能招募至少10名真实独立参与者并按受控流程收集答卷。任何代理、制作人员自测或模拟答卷均不得替代。

## 回滚

回滚范围是本报告、A0.3状态文档与`docs/quality/art/silhouette/`本轮机器清单；不得回退`60fbc13`中的P2/P3源码、A0.2签核、Catalog、批准账本或资产字节。回滚后A0.3必须恢复`pending-clean-regeneration`，不能沿用本轮机器证据。
