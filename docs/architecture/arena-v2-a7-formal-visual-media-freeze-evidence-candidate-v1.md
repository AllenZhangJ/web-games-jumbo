# Arena V2 A7 正式视觉/媒体资产冻结证据候选 V1

> 2026-08-12：V1 保留为旧 10 项正式预算证据历史层。当前 130 项目录的最终冻结前置已升级为
> [A7 V2](arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.md)；P7 不再接受 V1 作为冻结输入。
> V2 仍因预算未批准、结构上限未闭合及真实证据缺失而固定 `hardGate=false`。

## 状态与边界

- 日期：2026-08-11
- 状态：`production-unreachable / code-written-not-run / hardGate=INCOMPLETE`
- 当前 PASS 实例：不存在；本批没有设备、真人、正式资产批准、截图或录像输入
- 默认 Release Bundle / 入口：未接线
- 验证：按用户要求全部顺延；未运行 test、typecheck、lint、build、diff-check、浏览器、模拟器或设备
- 写域：独立 A7 源码、未运行测试、本说明和[对齐矩阵](arena-art-development-alignment-matrix.md)的 A7 静态状态

本候选只把外部已经形成的 A0–A6 正式视觉/媒体证据归一、复算并给出
`INCOMPLETE / FAIL / PASS`。它不读取或修改资产字节，不创建批准、设备、人测、截图或录像证据，也不发布、
tag、upload、sign、merge 或修改分支。它不消费玩法内部状态，不参与命中、拾取、淘汰、随机、计时或胜负。

## 技能与强制参考

使用顺序：

1. `game-art-director`：约束视觉一致、剪影、镜头距离、色彩非唯一编码和 Final 不得跳过四门；
2. `media-asset-management`：约束 source → process → deliver → manage、来源 revision、license、SHA-256、
   交付身份、截图/录像元数据与回滚。

已读取项目真值：

- [Arena Art Bible](arena-art-bible.md)
- [A0–A7 对齐矩阵](arena-art-development-alignment-matrix.md)
- [美术与音频开发流程](arena-art-and-audio-development-flow.md)
- [V2 生产计划](arena-v2-production-development-plan.md)的 A6/P7 当前状态
- `packages/arena-release/src/arena-v2-p7-*` 的预注册、证据评估、自动化报告和 release-freeze manifest 合同
- `media-asset-management/references/responsive-image-patterns.md`

`game-art-director` 泛化技能要求的 `docs/collaboration-protocol.md` 与
`docs/game-design-theory.md` 在仓库中仍不存在。本阶段把它们登记为待治理红缺口，使用上述项目专用真值代替；
禁止创建占位文件或虚构内容。该缺口不由 A7 代码自动改写，也不能被 A7 PASS 掩盖。

## 合同输入与重算规则

输入没有可自报的 A7 状态。评估器从以下原始记录重算：

- 唯一 clean source commit、content identity、catalog revision/content hash、完整 asset-set SHA-256；
- A0–A6 七段证据，严格固定顺序；
- 最多 256 个、按 assetId 唯一升序的资产记录：artifact path、source locator/revision、byteLength、
  SHA-256、license/right holder/proof、商业/修改/再分发边界、批准人与批准证据；
- `arena.stage7.formal-asset-budget.v1`：总编码、音频、解码纹理、单纹理、角色、附件、纹理、音频和
  三端 4 MiB 交付预算。已覆盖预算只认现行 policy 的精确 `assetId + artifactPath`：两名角色、正式圆盾、
  三张既有纹理和四个 Kenney OGG 共10项；地图、20件新增武器附件、候选VFX/音频及任何未来资产不得
  自报 `character-glb`、`attachment-glb`、`texture` 或 `audio`，统一归为 `uncovered → INCOMPLETE`；
- 现行正式预算报告的 policy content hash、10项 observation 覆盖和报告证据 SHA-256。角色节点/关节、
  18动作、primitive/material及附件节点/primitive/material仍由该既有正式预算报告验证；A7只复算字节
  不能单独得到PASS，也不在本候选中为新地图或武器扩张技术预算；
- `arena.stage7.formal-asset-budget.v2-candidate`只在A3–A6 readiness中提供当前130项字节身份候选覆盖。
  A7 V1不消费它、不把它作为PASS预算证据；V2的结构上限/余量/批准/hard gate均为false，任何后续采用
  必须升级A7证据schema与正式报告，而不能用候选覆盖替代现行10项observation；
- A3–A6逐资产生产批准证据账本同样只在Readiness投影130项`missing-not-approved`事实；A7 V1不消费该
  候选账本、不把来源intake批准或缺口投影当PASS，也不由它计算P7 advance；
- 六目标环境 build identity，以及 Web / 微信 / 抖音三份 delivery identity、asset manifest SHA-256 和包体；
- 六环境各 6 项固定截图/录像要求，共 36 项：标准、低动效、资产失败、无障碍、标准录像和静音等价录像；
- 七项人工评审：视觉一致、剪影可读、非颜色冗余、低动效等价、静音等价、资产失败回退和资源生命周期。

有界集合、稳定顺序、exact-key、稀疏数组、重复 asset/capture/hash、路径越界、source/build/content/asset-set
漂移和 stored result 篡改均失败关闭并拒绝产出。预算总数由资产字节和 delivery 字节重新求和，不接受输入方
自报 totals。内部 evidence identity 由规范化后的完整证据重算。

## 状态语义

- `INCOMPLETE`：任一阶段、许可、批准、逐项预算、环境、三端交付、截图/录像或人工评审为 `missing`，
  或 source 仍 dirty。缺项优先，不允许借其他失败记录写成已验证。
- `FAIL`：所有必需证据均存在，但任一许可/批准/环境/交付/截图/评审明确失败，或项目预算复算失败。
- `PASS`：只能由外部真实、完整、同源且全部通过的输入重算得到；仓库内不创建 PASS 常量或假设备 fixture。

即使 A7 视觉/媒体证据未来得到 `PASS`，`p7AdvanceComputedHere=false` 与
`p7ReleaseFreezeManifestOwnedHere=false` 仍固定。现有
`arena-v2-p7-release-freeze-manifest-candidate-v1.ts` 继续是唯一发布冻结资格候选；它还要求 P7 的 29 项评价、
24 项自动化、六环境、人测、独立审计和缺陷门全部闭合。A7 不复制、替代或放宽该算法。

## 七维静态自检

| 维度 | 静态结论 | 仍顺延 |
|---|---|---|
| 来源与许可 | source revision、rights holder、license proof、使用布尔和归因闭合；缺批准为 incomplete | 正式权利与批准原始证据 |
| 预算 | 从资产与三端包体字节重算；A7仍精确绑定现行V1 10项policy白名单；V2 130项只是未批准候选且不参与PASS | 真实最终字节、10项observation、当前source预算报告，以及未来获批的结构/余量升级证据 |
| 有界/重复 | 资产≤256、阶段7、环境6、交付3、capture36、review7；唯一身份、稳定排序、重复SHA拒绝 | 真实目录完整性复核 |
| 跨平台同源 | source/content/asset-set/build逐层绑定；三端manifest分别可审计 | clean Web/微信/抖音及真机build |
| 视觉一致性 | 独立维度绑定证据SHA，不由Node代码宣称轮廓或成片通过 | 三端截图/录像和人工视觉签核 |
| 无障碍 | 低动效、静音、非颜色编码、asset fallback均有固定证据槽 | 390×844、桌面、开发者工具与真机实测 |
| 失败关闭/回滚 | future field、身份漂移、stored status篡改拒绝；无文件/资产副作用 | 验证运行；整批回滚为删除两份A7代码文件、本说明、包显式导出与P7延后runner/不可达治理接线，并撤回矩阵A7状态段 |

## 当前阻断与交接

当前必须继续保持：A0.3 真人 `0/10`、A1.1 按最终 source 重建、正式地图/VFX/多数音频未批准、正式资产总门
false、截图/录像/设备/真人/性能/独立审计未运行。A7 只是静态证据合同，不把 A6 的
`code-written-not-run` 候选提升为正式资产，也不开放 Blockout、Presentation 默认接线或发布。
