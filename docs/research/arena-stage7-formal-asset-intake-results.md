# Arena Stage 7 正式资产 Intake 合同门禁结果

## 结论

2026-07-18，来源中立的正式资产入库治理合同、文件复验器和负向门禁已落地。它证明项目可以在不依赖 Three.js、DOM 或平台 API 的情况下，把未来正式资产 Definition 精确绑定到内容字节、来源 revision、许可文本、权利证明和批准记录。

当前没有真实资产 Bundle，因此结论仅为 `verified-intake-only` 合同可执行，不表示 S7.2～S7.5、`stage7.formal-assets` 或发行冻结完成。

## 已落地边界

- `FormalAssetIntakePolicy`：版本化来源类型、正式/灰盒 tag、禁止 Provider 和最低权利要求。
- `FormalAssetProvenanceRecord`：一个 asset ID、Definition hash、内容 artifact、许可、证明和批准身份。
- `FormalAssetIntakeBundle`：资产与记录精确一一覆盖；共享许可/证明保持同一摘要，内容路径不得复用。
- 文件复验器：复用共享的无跟随打开、真实路径约束、读取前后 inode/时间状态和 SHA-256 校验。
- CLI：`arena:assets:intake:verify` 只输出 `contract-only` 或 `verified-intake-only`，不会生成 release-ready 声明。

## 负向覆盖

- 灰盒 tag 和程序化角色 Provider 不能进入 Formal Bundle。
- 商业使用、修改或随构建分发权缺一即拒绝。
- 需要署名但没有署名文本、Definition hash 漂移、记录缺失或重复均拒绝。
- 内容路径不能被两个 asset ID 共享，也不能同时充当授权文档。
- 同路径许可/证明的大小或摘要发生冲突时拒绝。
- 文件在 Bundle 生成后发生替换，即使大小不变也会因 SHA-256 不一致而拒绝。
- 已构造 Bundle 不能绕过另一版本 Policy 的身份校验。
- Stage 7 架构门继续拒绝 Node、Three.js、DOM、平台、墙钟和随机依赖。

## 验证记录

- Formal Asset Intake 定向测试：4/4。
- Stage 7 + 架构定向测试：36/36；首次全量发现普通变量名 `document` 触发宿主隔离规则，已改为 `rights-material` 后通过。
- 全量 `npm test`：649/649。
- Replay V5 严格复验：4/4，manifest hash 仍为 `5f9df22c`。
- 三端构建：276 modules，Web/微信/抖音构建成功；提交前构建按预期标记 `sourceDirty=true`，提交后仍需生成 clean manifest。

## 未完成项

- 没有替项目方选择原创、委托、购买或开源来源，也没有批准成本。
- 没有真实许可文本、合同/订单/发票或资产内容进入仓库。
- 没有 GLB Provider、glTF Validator、AnimationMixer、SkeletonUtils 或外观附件运行时。
- 没有基于真实纵切冻结三角面、骨骼、纹理、加载、内存或包体预算。
- 没有 reduced-motion、小屏可读性、三端生命周期和目标真机证据。

决策与操作分别见 [ADR-027](../decisions/027-arena-formal-asset-intake-provenance.md) 和 [Stage 7 正式资产入库手册](../acceptance/stage7-formal-assets/README.md)。
