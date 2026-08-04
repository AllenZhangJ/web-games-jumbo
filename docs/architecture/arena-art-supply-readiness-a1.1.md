# Arena A1.1 代表样件来源与测量就绪包

## 状态与边界

- 当前状态：`stale-upstream-evidence / hardGatePassed=false`。历史机器包曾是绑定`f80307b375eb9f8f5380372e5b002d1eb86a4df7`的
  `upstream-contract-ready-candidate`，但2026-08-02独立复验已因三个上游源码artifact漂移而失败；不得继续提请A1.1整体签核。
- 机器台账：[arena-a1.1-preproduction-readiness-v1.json](../quality/art/supply/arena-a1.1-preproduction-readiness-v1.json)。
- 本门只审计A1.0第9节可前置的来源/权利与捕获/测量方案，不制作或接入Blockout、模型、图标、VFX、音频、捕获夹具或运行时adapter。
- A0.3仍为真人`0/10`。公共只读active supply lifecycle projection合同曾由开发小门签核并绑定`f80307b`；当前六个必需字段仍可定位，但机器包不再与工作区同源，故该上游缺口重新打开为证据身份红门。A1.1协调、来源、捕获方案和所有执行/样件硬门仍为false，代表样件不得启动，A1/Blockout/Presentation/设备/真人/Final全部fail closed。

## 技能约束与缺失引用

| 技能 | 对本阶段的实际约束 |
|---|---|
| `game-art-director` | 区分研究、诊断、verified-intake与生产成熟度；候选合同不冒充资产或视觉质量通过。其强制引用`docs/collaboration-protocol.md`、`docs/game-design-theory.md`在本基线缺失，已登记但未当证据。 |
| `media-asset-management` | 每个已有字节固定source/revision/license/proof/hash/用途/撤回点；无字节候选禁止hash和批准。 |
| `vfx-realtime` | 预设粒子、additive、distortion、桌面/移动overdraw上限与销毁检查；无样件时不得写GPU/过绘实测。 |
| `audio-design` | 临时声音只可进入后续离线语义试听；固定voice上限、静音等效和双destroy，现有HitResolved音频不得改用途冒充供给音频。 |
| `threejs-game-ui-designer` | 捕获固定桌面1440×900和390×844，窄屏模拟不等于真机；UI不复制规则，供给仍是三实体而非三选一弹窗。 |

强制项目依据为[Art Bible](arena-art-bible.md)、[美术音频流程](arena-art-and-audio-development-flow.md)、[A0–A7对齐矩阵](arena-art-development-alignment-matrix.md)和[A1.0合同](arena-art-supply-presentation-contract-a1.0.md)。

## 已具备的只读生命周期合同

开发侧签核提交`f80307b375eb9f8f5380372e5b002d1eb86a4df7`提供schema v2只读投影，并由A1.1机器账本固定合同、Timeline producer、MatchCore过滤和正式Bot消费边界的文件hash。该合同将projection绑定同一public snapshot的`snapshotTick`与`snapshotEventSequence`，每个active实体公开`remainingTicks`；`+600` pre-step以`pendingExpiryEquipmentInstanceIds`、`resyncReadiness=not-ready-pre-expiry`和`pendingAuthorityTick=snapshotTick`保留非交互terminal identity，恢复消费者必须等待下一份`ready`投影。该事实只证明表现层未来已有可消费的只读上游合同，不代表A1 adapter、捕获夹具或视觉/音频样件存在。

## 资产与权利审计结论

1. 仓库现有唯一正式装备是KayKit圆盾GLB及纹理，来源revision、CC0许可、证明、SHA-256与Allen入库批准齐全；其正式Bundle成熟度仍是`verified-intake-only`。圆盾GLB可作为A1代表装备输入的候选，但仍需A1.1主协调批准；纹理只是依赖，不是剪影或图标。
2. A0.3圆盾黑剪影是固定相机下的诊断证据，可用于审阅移动镜头可读性，但不得发布为供给图标、不得计代表资产，也不能弥补真人`0/10`。
3. A0.2项目UI线框只证明布局职责，是程序化研究资产。仓库当前没有获批的供给专用装备图标集；这一缺口保持`missing-not-approved`。
4. VFX三类候选（生成、替换、过期）当前没有字节、作者或完整权利，因此只登记为`research-candidate`，没有hash，也没有批准。
5. 四个Kenney CC0 OGG已有真实字节、固定上游版本与许可链，但现用途是`HitResolved`命中音效。A1.1只把它们列为待签核的离线语义试听候选；禁止改名为供给音效、接入运行时、出包或替换原用途。

许可撤回时，先关闭对应候选并停止后续试听/样件输入；已有正式HitResolved资产与A1.1候选引用分离。项目原创VFX未来只有在作者、权利声明、源文件、交付字节与hash全部落地后才能升级，不能用“计划原创”假审批。

## 捕获与测量执行计划

启动前方案候选固定两个浏览器视口：桌面`1440×900@1x`与窄屏`390×844@1x`；后者只作确定性窄屏证据，不替代真实iOS/Android。夹具形成时还必须记录浏览器版本、GPU、OS、DPR与构建commit。

- 固定60Hz权威tick、30 FPS表现终态；预热300 tick、采样1800 tick、三次重复，逐帧核对`599/600/601`，同时记录`snapshotTick/snapshotEventSequence`、`remainingTicks`、`pendingExpiryEquipmentInstanceIds`、`resyncReadiness`和`pendingAuthorityTick`，不得由表现层重算生命周期。
- 预算候选：3 marker；桌面/移动粒子72/36；1 additive、0 distortion；供给voice最多4且无倒计时loop；桌面overdraw平均/峰值≤4×/8×，移动≤2×/4×；p95帧≤33.33ms，供给GPU增量≤2ms；20周期settle后heap增长≤1 MiB；destroy后自有资源为0。
- 捕获七项：30 FPS终态、GPU/帧、overdraw、内存、voice、暂停恢复、双destroy。暂停五秒墙钟期间tick/Cue/粒子不得推进；恢复不得补播one-shot；两次destroy都安全且资源、监听器、voice归零。

这些数字是待批准的启动前上限，不是测量结果。active lifecycle projection合同已具备；浏览器/GPU身份、capture harness、供给专用图标、真实iOS/Android、A0.3十人和A1.1整体签核仍缺。任何截图、trace或实测值只能在代表样件形成后进入独立样件通过门。

## 机器门与失败关闭

检查器验证根对象与嵌套对象exact keys、基线、仓库路径不越界且不经symlink逃逸、byteLength/SHA-256、许可证明、无字节不得hash/批准、固定视口/预算/窗口、设备缺口及所有下游false。身份不能只靠台账自报：代码固定四个repository audit的路径和顺序，按ID固定四个equipment与四个audio的artifact、revision、许可身份/布尔、用途和撤回边界，并固定三个VFX的pending-rights/source/use全文。A1.0固定路径/hash后还会解析实际JSON，核对`id/status`、A1.0自身硬门true及全部下游false；schema v2 lifecycle projection另固定`f80307b`、六个源文件path/size/hash、六个消费字段及pre-step不可恢复边界。

篡改探针除未来字段、hash/尺寸漂移、路径逃逸、许可撤回缺失、无字节假批准、诊断图升级、预算时序倒置、设备缺口删除和下游门误开外，还会把`path+byteLength+sha256`整体一致替换成仓库中另一个真实文件，分别覆盖repository audit、equipment、audio、A1.0 upstream和active lifecycle projection源文件；投影可用性回退、commit/schema/字段/resync边界漂移也必须失败关闭。

本门不运行A1 adapter测试、不做浏览器/Simulator捕获，也不运行全量构建。回滚只删除A1.1文档、台账、检查器与索引引用；不得删除正式资产、许可、A0.3/A1.0证据或并行P1文件。

## 2026-08-02 独立复验红门与重建条件

主协调运行`node --import tsx scripts/art/check-arena-supply-preproduction-readiness.ts`，检查器在
`activeLifecycleProjectionContract.sourceArtifacts[3].byteLength`处按预期失败关闭。继续只读复核证明后续两个artifact也已漂移：

| artifact | `f80307b`记录 | 当前工作区 | 判定 |
|---|---|---|---|
| `packages/arena-match/src/match-core.ts` | `58,363 B` / `208a736b…7347` | `85,977 B` / `6d024b18…af04` | identity stale |
| `packages/arena-bot/src/bot-observation.ts` | `36,050 B` / `ceaaaf02…dac3` | `57,297 B` / `c20a3302…ed5f` | identity stale |
| `packages/arena-bot/src/bot-controller.ts` | `16,293 B` / `75ce2cd9…fb99d` | `25,015 B` / `12554cb9…2447` | identity stale |

`arena-public-supply-projection.ts`、`match-snapshot.ts`和`equipment-supply-timeline-system.ts`仍与机器包一致；
`snapshotTick`、`snapshotEventSequence`、`remainingTicks`、`pendingExpiryEquipmentInstanceIds`、`resyncReadiness`和
`pendingAuthorityTick`六个必需字段也仍可在当前源码定位。这只证明没有发现字段消失，不证明当前全调用链语义、同源或A1.1硬门通过。

最小返工固定为：等待开发最终source identity形成clean commit；由美术线程重新读取本流程规定的技能和参考，重新生成A1.1机器包，逐项复核六个artifact、
调用链、来源、捕获、失败回退和下游false；运行正向检查与fail-closed探针；提交来源/竞态/兜底/边界/生命周期/主流程自检；最后由主协调独立复验。
禁止在dirty工作区直接替换size/hash、沿用历史92分或把字段静态存在当成合同签核。

## 历史候选自评

历史合同/治理完整度为`92/100`：仓库资产事实19/20、权利与撤回18/20、VFX/音频候选诚实性17/20、测量可重复性19/20、失败关闭治理19/20。`f80307b`当时只关闭只读生命周期合同缺口，没有新增或批准资产、夹具、浏览器/GPU、设备、真人、运行时adapter或样件实测；A1.1自身`hardGatePassed=false`。该分数现仅作历史，不得作为当前评分或授权。成熟度仍为资产10/100、设备0/100、真人0/100、运行时0/100。
