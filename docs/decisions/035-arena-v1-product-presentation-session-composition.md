# ADR-035：Arena V1 生产 Product Presentation Session 使用独立应用组合包

- 状态：已接受并实施
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 实施提交：`44c51121ab5f6efe36bc27ed9529d52e3c8b9b51`

## 背景

通用 `ProductPresentationSession` 已在 strict `arena-product-presentation` 中拥有单一 Canvas、Renderer、Flow、输入、帧循环、前后台、WebGL context 和销毁生命周期，但生产应用如何向它注入 Arena V1 Controller、内容、质量、seed、Profile Lease 与平台能力仍位于上层 JavaScript。该组合既不是通用表现实现，也不是具体 Web/微信/抖音 Platform 或 Entry；它是生产 Product 的应用 Session 根。

旧组合直接用 `platform[method]` 验证宿主，会执行访问器，并把原平台对象继续交给 Session/Renderer，调用方可在校验后替换方法。它还和旧 Greybox `ArenaPresentationSession` 并列在同一目录，容易让生产与回滚/研究所有权再次混合。

## 决策

### 独立生产应用 Session 层

生产组合统一由 strict `@number-strategy-jump/arena-v1-application-session` 发布：

```text
V1 Authority/Product Composition + V1 Presentation Content
                         ↓
          arena-v1-application-session
 Platform Port Snapshot / Identity / Quality / Factories
                         ↓
          ProductPresentationSession
                         ↓
                 Platform / Entry
```

该包可依赖通用 Match/Matchmaking、Presentation Runtime、Product Presentation 与具体 V1 应用/表现内容；不得依赖 Three 具体实现、Platform 实现、Entry、研究/发布工具、DOM、宿主全局、网络或未注入随机源。具体 Renderer Factory 与 Platform 必须由更上层 Entry 注入。

### 能力快照

options 必须是普通对象和精确自有数据字段；访问器、Symbol、未知字段在资源取得前拒绝。平台必需方法沿有限原型链取得数据方法并绑定原对象；调用方后续替换方法不影响 Session。平台扩展能力按存在性快照：真实 Renderer 可继续获得离屏 Canvas、WebGL、资产、音频、振动和分享，精简测试宿主不需要实现未使用端口。

平台 `id`、`storageConcurrency`、seed source 与 match config 在组合发布前快照。viewport 只从 `width/height` 自有数据描述符派生 fallback seed，不执行 viewport getter。组合包不直接持有 Canvas、Renderer、Profile Repository 或帧资源，实际取得与逆序清理仍由通用 `ProductPresentationSession` 和 Controller 承担。

### 生产与研究隔离

当前三端 Product Entry 只使用本包的 `createProductPresentationSession`。旧 Greybox `ArenaPresentationSession` 保留独立回滚用途并在后续 G6 归包；Input Pilot/Study 归 G7 证据链。生产组合不得导入或复用这两条所有权图。

## 被否决方案

### 并入通用 Product Presentation 包

通用包不应依赖 Arena V1 具体内容、Match 默认值或 Profile 组合，否则未来内容版本与 Mode 无法复用同一 Session 生命周期。

### 并入 Platform Runtime 或 Entry

Platform 负责适配宿主，Entry 负责选择顶层实现；二者不应拥有 V1 Product、质量、seed 和表现内容装配。并入会让三端重复组合逻辑并扩大宿主差异。

### 继续与 Greybox/Pilot 共用上层目录

生产、回滚和研究链的生命周期目标不同。共用目录无法通过 workspace 依赖门阻止生产导入研究能力，也会使零 JS 迁移责任不清。

## 后果

正面：

- 生产 Product Session 有唯一 strict 应用组合根；
- 平台 getter 和校验后方法替换窗口被关闭；
- Renderer 扩展能力与 Session 必需能力显式区分；
- 生产、Greybox 与 Pilot/Study 的迁移责任清晰分离。

代价：

- 新平台能力必须判断属于 Session 必需端口还是 Renderer 可选扩展，并更新精确架构门；
- 平台快照对象会增加一次性构造和少量 bundle 字节；
- 旧 Greybox Session、Entry 与 G7 研究链仍需后续迁移，本 ADR 不代表 G6 完成。

## 生效证据

- 旧 Product Presentation Session 组合 JavaScript 删除，精确允许清单由 283 降至 282；
- 全仓 679 项 Node、305 项 strict package/治理与 104 项生命周期测试通过；
- 每个 Mapper 120 场输入 fuzz、两个 100 场 Session soak、黄金 Replay 与正式资产预算通过；
- clean build `arena-44c51121ab5f-product` 三端预算通过且 `freezeEligible=true`；
- 完整数值和浏览器证据见 [Arena 企业治理状态台账 G6.37](../governance/arena-enterprise-governance-status.md#g637-生产-product-presentation-session-组合根-strict-迁移证据)。
