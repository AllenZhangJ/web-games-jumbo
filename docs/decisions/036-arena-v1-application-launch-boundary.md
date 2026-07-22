# ADR-036：Arena V1 顶层 Product Launch 使用独立 strict 组合包

- 状态：已接受并实施
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 实施提交：`a5a7dfbc18900490ada1ebe8989dfaf15bc8e872`

## 背景

G6.37 已把生产 Product Presentation Session 的通用生命周期装配迁入 strict 应用包，但三端 Product Entry 之前仍有五个 JavaScript 模块负责运行实例身份、Profile Lease 默认值、质量/内存观察、Product Renderer 和小游戏 Canvas 组合。这些逻辑高于通用 Session，又低于 Web 页面和微信/抖音实际入口；继续留在 Entry 会使三端重复宿主判断，也无法用 workspace 依赖门约束访问器、Three 具体实现与研究链污染。

旧实现还存在两类长期风险：组合 options 和平台字段可通过普通属性访问触发 getter；应用包声明的 `types` 文件依赖上游声明产物，但相关组合包没有强制 declaration/composite 输出，下游可能静默退化为无类型模块。

## 决策

### 独立顶层 Launch 层

顶层生产组合统一由 strict `@number-strategy-jump/arena-v1-application-launch` 发布：

```text
Platform Runtime + Three/Product Renderer + V1 Content
                         ↓
          arena-v1-application-launch
 Identity / Quality / Memory / Renderer / Canvas Game
                         ↓
          arena-v1-application-session
                         ↓
        Web / WeChat / Douyin thin Entry
```

该包可依赖已治理的 Platform Runtime、Presentation Runtime/Three、Product Presentation/Three、V1 Application Session 与 V1 Presentation Content。它不得反向依赖 Authority 实现，不得拥有实际页面 DOM、微信/抖音入口选择、启动错误 UI、研究/实验/回归/发布工具、网络、宿主计时器或未注入随机源。

### 数据能力与观察能力分离

组合 options、Renderer factory 参数、平台 ID 和存储并发模式只从数据描述符读取；普通对象边界拒绝访问器、Symbol 和未知字段，有限原型链边界拒绝访问器方法。运行实例 ID 仍由 Platform Runtime 生成，单 Runtime 宿主的默认 owner、lease holder 与 takeover 规则只在未显式指定身份时应用。

质量调试字段、小游戏启动 API 和外部内存 provider 是可选能力：访问器不执行并按不可用处理。Chromium 非标准 `performance.memory` 属于 Entry 观察接口，可在 catch 边界内读取真实宿主 getter，但不能进入 Session、Renderer 或权威层。显式传入 `root:null` 表示隔离宿主全局；只有 `root` 缺省时使用 `globalThis`。外部 provider 每次采样重新发现，以支持验收工具在启动后注入。

### 类型发布契约

新包与被其引用的应用 Session 包必须启用 composite、declaration、declaration map 和 source map；`package.json#types` 指向的文件必须在 `build:packages` 后真实存在。Product Game、Canvas Game、质量选择和 Renderer Factory 发布具体返回类型，不允许公共 API 静默退化为 `unknown` 或无声明 JavaScript。

### 所有权边界

Launch 只创建顶层组合参数，不接管 Canvas、FrameLoop、Renderer、Profile Repository 或 Match。资源取得、逆序清理、前后台、WebGL context 和失败关闭仍由 Product Presentation Session 及其子资源负责。实际 Entry 只负责选择平台、宿主 UI Surface、启动和 teardown。

## 被否决方案

### 继续保留五个 Entry JavaScript 模块

这会留下无法归零的动态宿主组合，并让 Web、微信、抖音和研究入口继续从文件相对路径共享未声明实现，无法建立精确包依赖和类型发布门。

### 并入 Application Session

Application Session 必须保持 host-neutral，不依赖 Three 具体 Renderer、Platform Runtime 或 Canvas Product Surface。并入会破坏 G6.37 已确立的 Session/Launch 分层。

### 分别复制到三端 Entry

复制会产生三份身份、质量、内存与 Renderer 默认值，扩大平台漂移和生命周期竞态，且无法证明研究入口与生产入口使用同一组合真值。

## 后果

正面：

- 三端 Product 在实际宿主 Entry 前拥有唯一 strict Launch 真值；
- options、平台字段和工厂参数不再执行访问器；
- 质量、内存和身份默认值集中且可测试；
- `.d.ts` 发布契约由构建真实保证；
- Product、Greybox 与 Pilot/Study 的剩余迁移责任进一步分离。

代价：

- 顶层包可见 Three 与 Platform Runtime，必须用精确依赖集合和源文件门防止继续膨胀；
- 新增宿主观察能力时必须明确是数据能力还是允许 getter 的观察能力；
- 旧 Greybox Session 与实际三端 Entry 仍需后续迁移，本 ADR 不代表 G6 完成。

## 生效证据

- 5 个旧 Launch JavaScript 删除，精确允许清单由 282 降至 277；
- 全仓 680 项 Node、309 项 strict package/治理与 104 项生命周期测试通过；
- 120 场输入 fuzz、两个 100 场 Session soak、黄金 Replay 与正式资产预算通过；
- clean build `arena-a5a7dfbc1890-product` 三端预算通过且 `freezeEligible=true`；
- 完整数值和浏览器证据见 [Arena 企业治理状态台账 G6.38](../governance/arena-enterprise-governance-status.md#g638-顶层-product-launch-组合-strict-迁移与发布契约加固证据)。
