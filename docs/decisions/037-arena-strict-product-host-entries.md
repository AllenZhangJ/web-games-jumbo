# ADR-037：三端 Product Entry 保持薄宿主根，Web Product UI 只消费公开 ViewModel

- 状态：已接受并实施
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 实施提交：`0e2ad413cd9663c907e3f16ab826f9b027efb5e9`

## 背景

G6.38 已把 Product 启动前的身份、质量、内存、Renderer 与 Canvas Game 组合集中到 strict Launch 包，但实际 Web、微信、抖音 Entry 和 Web Product DOM Surface 仍是 JavaScript。Entry 是唯一允许选择真实宿主平台和错误展示的位置；Web Surface 是唯一允许持有页面 DOM 的产品表现适配。若把它们并入 Launch/Session 包，会把 DOM 或 `wx`/`tt` 宿主能力向下扩散；若继续保留动态 JavaScript，则类型、访问器与事件所有权边界无法进入治理门。

旧 Web Surface 还通过构造参数解构、`bindIntent` 参数解构和 viewport 普通属性读取宿主值，访问器可在校验前执行。旧 `web-product.js` 只是无人引用的兼容转发，继续保留会制造第二个名义产品入口。

## 决策

### 三端 Entry 是最薄宿主根

`web.ts`、`wechat.ts` 与 `douyin.ts` 只允许：

- 创建对应 strict Platform；
- 选择 `arena-v1-application-launch` 的 Product Game；
- 注入 Web DOM Surface 或小游戏 Canvas Surface；
- 绑定启动成功、错误展示和 teardown；
- 记录本地控制台错误。

Entry 不得实现动作、命中、移动、随机、Profile、奖励、胜负或 Renderer 生命周期。微信/抖音入口不得导入 Web Platform、DOM 或 Web UI；Web 入口不得直接访问小游戏 API。

### Web Product UI 是单向表现适配

Web Scene Model 只从 `ProductSessionViewModel` 创建公开 `ProductUiSceneModel`，再附加已接受的图片映射。它不得读取 MatchCore、Bot 难度、隐藏分配或 Profile Repository。

Web Product UI Surface 只执行：

```text
ProductSessionViewModel → semantic DOM
DOM click → Product Intent callback
```

它不得直接调用 Product Controller、Match Session 或权威命令。Canvas/root 与 callback options 只接受普通对象自有数据字段；访问器、Symbol 和未知字段在监听器注册前拒绝。Viewport 只读取数据描述符，不能通过 getter 把宿主重入带进 resize。

### 单一入口与迁移期测试

Web HTML 直接引用 `web.ts`，微信/抖音构建直接引用各自 `.ts`；删除无人引用的 `web-product.js`，不保留 JavaScript 代理。迁移期间 Node 测试用既有 tsx 开发依赖直接加载 strict 源码；G7 最终归包后可重新评估统一测试运行器，但不得恢复双份实现。

## 被否决方案

### 把 Web UI 放进 Launch 或 Product Presentation 包

Launch 需要跨 Web/小游戏复用，Product Presentation 需要 host-neutral。引入 DOM 会破坏包边界，并让微信/抖音产物存在误带 Web 代码的风险。

### 在 JavaScript Entry 外再加 TypeScript 包装

包装不会减少真值，只会保留两层入口并掩盖运行时仍由 JavaScript 控制。迁移必须删除旧路径并让构建直接消费 strict 源码。

### 保留兼容 `web-product.js`

仓库没有消费者，生产 HTML 已有唯一 `web` 入口。保留无收益且与唯一生产入口治理冲突。

## 后果

正面：

- 三端实际 Product 启动链端到端进入 strict TypeScript；
- Web DOM 和小游戏宿主边界不会污染 Launch/Session；
- UI getter 重入和监听器提前取得窗口关闭；
- 生产入口唯一，构建与架构测试直接锁定真实 `.ts` 路径。

代价：

- Web UI 类型需要与公开 Product ViewModel 合同同步；
- 迁移期 JavaScript Node 测试需通过 tsx 加载 strict 源码；
- Greybox 与研究入口仍有独立迁移责任，本 ADR 不代表 G6 完成。

## 生效证据

- 5 个生产 JavaScript 迁为 strict TypeScript、1 个兼容入口删除，清单由 277 降至 271；
- 全仓 681 项 Node、309 项 strict package/治理与 104 项生命周期测试通过；
- 120 场输入 fuzz、两个 100 场 Session soak、黄金 Replay 与正式资产预算通过；
- clean build `arena-0e2ad413cd96-product` 三端预算通过且 `freezeEligible=true`；
- 完整数值见 [Arena 企业治理状态台账 G6.39](../governance/arena-enterprise-governance-status.md#g639-三端-product-entry-与-web-product-ui-strict-迁移证据)。
