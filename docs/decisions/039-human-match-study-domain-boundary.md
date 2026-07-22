# ADR-039：真人研究是独立证据域，基础合同与生产运行时宿主分离

- 状态：已接受并实施
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 实施提交：`00686d5e20523d597221c9ab57804eb2d1879ce4`

## 背景

Human Match Study 的 Definition、Assignment 和 Capture Session 原先位于 `src/arena/study` JavaScript 路径，Web Product Runtime 又直接消费这些动态模块。只迁移 Web 入口会留下隐式 `any` 或临时声明，并违反项目要求的 `Rule → Core → Bot → Presentation` 实施顺序；把研究逻辑并入生产 Product 包则会让实验分组、预注册 seed、研究记录和导出能力进入默认游戏依赖图。

真人研究用于验证 Bot 难度、公平性和自然度，不参与正常玩家匹配、权威命中、移动、奖励或胜负。它需要读取生产合同并重建生产结果，但生产权威层不应反向依赖研究域。

## 决策

### 建立独立 strict 研究证据包

`@number-strategy-jump/arena-human-match-study` 是真人研究的唯一领域边界。首批承接：

- Human Match Study Definition 及预注册环境、候选、arm 与阈值；
- 基于生产 Matchmaking 的 block-balanced Assignment 和天然难度 seed；
- 只接受完整 Product Result + Replay 的内存 Capture Session。

后续 Record、Capture Package、Workspace、Report 和离线 Replay Verifier 应按依赖顺序迁入该研究域或其明确子包，不再建立新的 `src/arena/study` JavaScript 真值。

### 依赖只能从研究域指向生产公开合同

研究包可以依赖稳定的 Arena Contracts、Bot 公开难度 ID、Matchmaking 公开分配和 Product Result 合同，用于验证采集结果确实来自未修改的生产路径。Arena Core、Match、Bot、Product Session、Product Presentation 和正式 Entry 禁止反向依赖研究包。

研究包不得依赖 DOM、Three.js、平台 API或默认生产入口，也不得成为命中、随机、比赛或奖励的写入者。

### Web Product Runtime 保持宿主适配器

`HumanMatchStudyProductRuntime` 留在 strict Web Entry 层，只负责：

- 为研究局创建内存存储 Platform 包装；
- 组合正式 Product Game 与 Web Product UI；
- 把 Capture Session 端口注入生产完成链；
- 管理启动、进度通知、失败关闭、停止和销毁所有权。

它不拥有 Workspace、表单、下载或终态收据。无效 Game 候选在取得可用 `destroy()` 后先纳入 Runtime 所有权；启动或首次清理失败时保留引用，后续 `destroy()` 精确重试。启动与销毁竞态只能释放一次，不发布半运行状态。

### Node 工具只消费编译后的包公开 API

普通 Node `.mjs` 证据和 ingest 工具不得直接导入 TypeScript 源文件。Workspace `prepare/build:packages` 先构建研究包，CLI、测试和 Web 研究入口统一从包名导入，以保持 Node 20、浏览器和 TypeScript 的单一模块真值。

## 被否决方案

### 给 JavaScript Study 模块补临时 `.d.ts`

临时声明会把未校验动态实现伪装成 strict，并保留两个生命周期不同的真值，不能解决访问器、边界验证和资源所有权问题。

### 把 Study 逻辑并入生产 Product 包

这会造成生产层反向持有研究流程，并增加研究页面、采集和导出进入默认 bundle 的风险。研究域只能读取生产公开合同，不能成为生产运行时依赖。

### 启动失败时无条件丢弃候选 Game

若候选的首次 `destroy()` 失败，丢引用会形成不可重试的 Canvas、监听器或 GPU 资源泄漏。Runtime 必须保留未成功释放的所有权。

## 后果

正面：

- Study Definition、Assignment、Capture 获得 strict 类型、不可变值和明确包边界；
- 普通 Node CLI 与 Web 研究端共享同一个编译实现；
- 研究 Runtime 的候选取得、失败回滚、并发启动和销毁重试可以独立测试；
- 生产权威和默认 Product bundle 不依赖研究域。

代价：

- 构建序列新增一个内部 workspace 包；
- 其余 Study Record/Workspace/Report 和 Web Workbench 仍须继续迁移；
- 本 ADR 不代表 G6、G7 或真机验收完成。

## 生效证据

- 4 个 JavaScript 真值删除，精确允许清单由 258 降至 254；
- 完整 Node 689/689、strict package/治理 314/314、Study Web Runtime 8/8 和 Human Study/CLI 11/11 通过；
- `npm ls --omit=dev --all` 证明新增 workspace 的生产依赖树完整；
- clean build `arena-00686d5e2052-product` 三端预算通过且 `freezeEligible=true`，生产交付字节与 G6.44 完全一致；
- 完整数值见 [Arena 企业治理状态台账 G7.1](../governance/arena-enterprise-governance-status.md#g71-真人研究-definitionassignmentcapture-strict-基础证据) 与 [G6.45](../governance/arena-enterprise-governance-status.md#g645-human-match-study-product-runtime-strict-迁移证据)。
