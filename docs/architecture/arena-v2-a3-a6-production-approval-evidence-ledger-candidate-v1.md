# Arena V2 A3–A6 逐资产生产批准证据账本候选 V1

> 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`
> 作用：把当前正式 Catalog 130 项的“来源已登记、候选预算已覆盖、生产批准仍缺失”逐项投影为可重算证据账本。
> 禁止：本账本不授予批准、不加载或修改资产、不接默认 Bundle/Preloader/Entry、不参与 Authority 或 P7 advance。

## 1. 技能与证据边界

本切片依次使用 `game-art-director` 与 `media-asset-management`：前者要求 Catalog、来源批准、生产成熟度
和 Final 分门；后者按 `source → process → deliver → manage` 保存 revision、license、rights、proof、字节
身份与批准缺口。项目真值为正式 Presentation Asset Catalog、
`arena.stage7.formal-asset-budget.v2-candidate` 和 A3–A6 Readiness。

泛化技能要求的 `docs/collaboration-protocol.md`、`docs/game-design-theory.md` 当前仍不存在；这两项只作为
流程治理红缺口记录，不创建占位，也不进入账本字段、content hash 或产品运行包数据。

## 2. 逐项身份与批准分离

账本只接受当前 Catalog 与 V2 预算候选的同一组 130 项，按 `assetId` 规范升序，并逐项固定：

- Catalog content hash 与完整 V2 policy identity；
- `assetId / artifactPath / kind / byteLength / SHA-256 / maturity`；
- `sourceLocator / sourceRevision / licenseId / rightsHolder / proofDocument`；
- 来源批准人和日期；未登记时使用 `null`，不以空字符串伪造；
- 七个生产批准证据槽及对应缺口原因。

当前静态投影为：29 项存在第三方 intake 来源批准记录，130 项均有 V2 当前字节候选覆盖；但 130/130 的
`productionApprovalStatus` 均为 `missing-not-approved`，`productionApproved=0`、`assetUsePermitted=0`、
`formalReady=0`。来源批准不得推导生产批准，候选预算覆盖也不得推导加载许可。

每项七个生产证据槽均为 `missing`：美术方向评审、生产权利复审、获批结构预算、浏览器集成捕获、设备
视觉/性能、人类可读性、生命周期释放。当前合计 910 个缺失槽；`reviewerId / reviewedAt /
evidenceIdentity` 全部为 `null`，没有伪造 reviewer、日期、设备、真人或性能结果。

## 3. 失败关闭与治理

- 根、policy identity、entry、source evidence、evidence slot 均为 exact-key plain enumerable data；拒绝
  accessor、Symbol、future field、稀疏数组和不安全整数。
- 130 项数量、assetId/path 唯一、规范排序与 Catalog/V2 的逐字段身份必须同时闭合；未知、漏项、重复、
  重排及 coherent substitution 均拒绝。
- 相同 Catalog/V2 身份下，从完整规范数据重算稳定 ledger content hash；批准证据未来发生真实变化时必须
  升级账本版本，不能篡改本“全缺生产批准”候选。
- Readiness 只新增 evidence-gap projection；V1 的 10 covered / 120 uncovered 与 V2 的 130/130 candidate
  coverage 均保持原真值，整体 `formalReady=false`。
- P7 只把本测试列入延期运行清单并检查默认不可达；A7、P7 freeze、Preloader、Bundle 与 Entry 均不消费
  本账本，也不能据此计算 advance。

## 4. 六维静态自检

| 维度 | 静态结论 | 顺延硬证据 |
|---|---|---|
| 视觉/内容范围 | 只投影当前130项，不新增角色、武器、地图、VFX或音频 | 逐资产视觉评审、截图与Final |
| 来源权利 | revision/license/rights/proof和来源批准记录逐项保留；生产权利槽独立缺失 | 生产用途复审与签核原件 |
| 预算确定性 | 精确绑定V2当前字节身份；不改V1真值、不把候选覆盖当批准 | 获批结构上限、设备预算与余量 |
| 恶意边界 | exact-key、规范排序、唯一身份、未知/漏项/替换/伪证据失败关闭源码已写 | 测试、类型与治理命令均未运行 |
| 生命周期/加载 | 纯数据，无Three、loader、asset bytes或默认消费者副作用 | 浏览器、设备、迟到结果和释放实证 |
| 治理/回滚 | grantsApproval、hardGate、assetUse、formalReady、P7 advance均false；删除独立账本及投影hunk即可回滚 | 主协调验收及未来版本化批准账本 |

A0.3 仍为85/100、真人0/10、source identity待授权重生成；A1.1仍须按当前source重建。Blockout、正式资产、
浏览器/设备/真人/性能和Final均未开放。
