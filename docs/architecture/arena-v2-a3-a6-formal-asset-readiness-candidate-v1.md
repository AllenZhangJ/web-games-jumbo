# Arena V2 A3–A6 正式资产就绪候选 V1

> 状态：`production-unreachable / code-written-not-run / formalReady=false / hardGate=false`
> 范围：只读重算现有正式 Presentation Asset Catalog 与
> `arena.stage7.formal-asset-budget.v1` 的真实覆盖关系，并增加独立V2候选覆盖投影；不生成、修改、加载、
> 批准或发布资产。

## 1. 技能与项目真值

本切片依次使用 `game-art-director` 与 `media-asset-management`。前者要求把目录登记、来源批准、
生产成熟度和 Final 门分开；后者要求每项保留 source revision、license、proof、SHA-256、字节预算与
撤回边界。项目真值为：

- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-development-alignment-matrix.md`
- `docs/architecture/arena-art-and-audio-development-flow.md`
- `packages/arena-product-presentation/src/arena-v2-formal-presentation-asset-catalog-candidate-v1.ts`
- `packages/arena-presentation-contracts/src/arena-stage7-formal-asset-budget-v1.ts`
- `packages/arena-presentation-contracts/src/arena-stage7-formal-asset-budget-v2-candidate.ts`
- `src/arena/presentation/assets/formal-asset-budget-policy.ts`

泛化技能强制参考 `docs/collaboration-protocol.md` 与 `docs/game-design-theory.md` 仍不存在；本切片仅将其
登记为治理红门，不创建占位，也不把项目具体文档伪装成同名文件。该agent环境事实不进入V2预算
Definition、V2 content hash或Readiness identity，只保留在本说明与Art流程文档。

## 2. 单一预算目录

`arena-stage7-formal-asset-budget-v1.ts` 精确保存现行 Policy 的 10 个 artifact、稳定 ID 排序、全局字节
预算、纹理解码预算、角色节点/关节/18动作/primitive/material 预算和附件结构预算，并从同一冻结对象
重算并锁定既有 content hash `532faaa2`；V1内容漂移必须失败关闭并升级版本。现有 `FormalAssetBudgetPolicy`、A7 冻结证据与本候选都消费该对象，不再分别复制
白名单。

白名单覆盖仍严格以 `assetId + artifactPath` 双身份判定。仅路径、仅 ID 或调用方自报 budget class 都
不能取得覆盖；目录外资产统一为 `uncovered`。节点、关节、动作、primitive、material 与纹理解码指标
仍须由现有正式预算报告实测，单纯字节小于上限不能形成 PASS。

V2是独立的`arena.stage7.formal-asset-budget.v2-candidate`，不改V1。它只接受当前Catalog精确130项，按
assetId规范升序并同时固定path、当前编码字节、SHA-256与媒体类别；候选最大编码字节必须等于当前字节，
禁止未来通配符、类别兜底或自行增加余量。它重算130项总编码、98项音频编码和8项纹理解码字节，但将
节点、关节、动作、primitive、material、纹理与设备上限明确留为`unresolved-not-approved`，所以
`hardGateUsable=false`。V1仍保持10项正式覆盖和其余120项`uncovered`。

管线元数据边界为：`source`的revision/license/rights/proof/批准继续归Catalog与证据账本；`process`只由
V2做规范排序、exact-key与汇总；`deliver`只冻结当前字节身份；`manage`的批准、撤回、加载、Bundle与发布
均不归本候选。V2无资产字节、loader、Three或默认入口副作用。

## 3. 当前 A3–A6 实际覆盖

| 阶段 | 当前登记 | 预算/批准事实 | 结论 |
|---|---|---|---|
| A3 | 1 个生存敌人身份、2 张 KZ 地图 | V1覆盖敌人GLB；2图在V1未覆盖、仅被V2按当前字节候选收录，且为`authored-candidate-not-approved` | 地图、设备、真人与 Final 仍红 |
| A4 | 6 个共享骨骼/不同材质角色身份、3 张 KayKit 材质纹理、20 个武器附件绑定、20 个武器命中与 1 个赤手动作音频身份 | V1覆盖角色/敌人/圆盾、3纹理和4个Kenney音频；其余项只有V2当前字节候选覆盖，逐项生产批准仍缺 | 登记和候选覆盖不等于逐武器音画批准或材质 Final |
| A5 | 5 个核心 VFX 纹理、13 个模式与 4 个供给音频身份 | V1仍未覆盖；V2仅冻结当前字节，项目自产VFX与模式/供给音频仍未批准 | 静音/低动效合同存在，媒体 Final 仍红 |
| A6 | 复用 20 武器与 2 地图预览身份 | 不新增资产；沿用对应资产的覆盖和批准状态 | 未批准地图/缺失资产必须保持文字、形状、纹理 fallback |

现行预算的 10 个 artifact 现在均有独立的正式 Presentation Catalog record；其中三张 KayKit PNG
以 `assetId + artifactPath + runtimeSourceKey + byteLength + SHA-256 + 1024×1024` 登记，
并以3条 `consumerVisualAssetId + textureAssetId + GLB image URI` 绑定分别闭合Rogue、Skeleton和圆盾
的外部纹理依赖，`policyOnlyArtifacts=[]`。这只关闭了预算目录、Presentation Catalog与模型依赖的
静态登记缺口，不代表材质视觉、
设备、真人、峰值内存或 Final 已通过，也没有把纹理接入新的 loader/Composition/入口。

## 4. 输出与失败关闭

`ARENA_V2_A3_A6_FORMAL_ASSET_READINESS_CANDIDATE_V1` 固定输出：

- catalog content hash 与共享 policy identity/content hash；
- V1现行覆盖和独立V2候选覆盖：V2的130项候选覆盖不得改写V1的120项uncovered；
- 6 角色、1 生存敌人、3 张正式材质纹理及3条模型依赖、20 武器、2 地图、VFX、音频的登记与 maturity；
- 来源、许可证明、source revision、SHA-256、byteLength 和来源批准记录；
- 每项精确 policy 覆盖、单项字节结果、policy-only 与 uncovered 清单；
- A6 只读复用绑定；`addsAssets=false`、`choosesGameplayFacts=false`；
- `formalReady=false`、`hardGate=false`、`validationStatus=not-run`，且绝不计算 P7 advance。
- V2固定`productionApproved=false / assetUsePermitted=false / hardGateUsable=false`，默认三类消费者关闭。
- 独立逐资产批准证据账本identity与evidence-gap projection：当前29项只有来源intake批准记录，130项
  `productionApprovalStatus=missing-not-approved`，七类910个证据槽均缺失；账本不授予批准。

目录身份重复、角色/武器/地图/VFX固定容量不闭合、binding 找不到资产时，候选在导出前失败关闭。
没有任何路径能把 `verified-intake-only` 或来源批准记录提升为生产批准。

## 5. 七维静态自检与顺延

| 维度 | 静态结论 | 顺延证据 |
|---|---|---|
| 来源许可 | 每项保留 revision/license/rights holder/proof；来源批准与生产批准分离 | 新增或变更资产须重审许可与 hash |
| 预算 | V1 10项正式覆盖不变；V2对130项当前字节身份候选覆盖并重算汇总 | V2结构上限/产品余量未批准；未重跑正式结构/纹理报告或三端包体实测 |
| 有界与重复身份 | 6/1/20/2/5 固定闭包，asset ID 唯一 | 未来扩容须新 policy/候选版本，不在本 V1 偷渡 |
| 跨平台同源 | 候选只绑定 catalog/policy hash | Web/微信/抖音交付身份和 reachability 尚未由本切片证明 |
| 视觉一致性 | 保留 Art Bible 与 maturity 门，不将 intake 当 Final | 剪影、镜头、截图、A0.3 真人仍未通过 |
| 无障碍与 fallback | A6 复用不改变 reduced-motion、静音和 asset-failure fallback 合同 | 设备、静音、低动效、装饰缺失实证未运行 |
| 生命周期与回滚 | 本候选纯数据、不加载字节、不接默认入口；删除本候选/恢复三处消费 hunk 即可回滚 | loader/disposer、destroy、内存与真机生命周期仍顺延 |

逐资产账本本身的六维边界与完整字段见
[`arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.md`](arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.md)。

后续必须先重建 A1.1 当前 source 证据、完成 A0.3 真人盲测，并逐项取得地图/VFX/音频/扩展武器的
正式预算扩展与批准，之后才可进入代表样件、Blockout、设备或 Final；本候选不开放这些门。
