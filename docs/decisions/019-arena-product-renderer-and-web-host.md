# ADR-019：Arena 产品渲染使用组合 Renderer，Web 菜单使用语义 DOM 宿主

- 状态：已接受并实施（S8.5.4）
- 日期：2026-07-18

## 背景

S8.5.1～S8.5.3 已建立只读产品 ViewModel、严格 UI Intent、非拥有 Match 表现桥和统一 `ProductPresentationSession`，但 Session 仍只接受测试 Renderer。旧 `ArenaGreyboxRenderer` 只能渲染比赛帧；若直接让它读取产品状态或让 Web 页面调用 Controller，会把 Three、DOM、角色保存和奖励写入混在同一层。

Web 还需要键盘焦点、读屏标题、单一主次动作和角色单选语义；小游戏后续则需要 Canvas UI。两者必须共享产品状态和意图，但不应共享具体宿主实现。

## 决策

### 1. 正式 Product Renderer 是组合器

`ProductRenderer` 只接收 Session 发布的：

```text
{ viewModel, matchFrame }
       │          │
       │          └── ArenaGreyboxRenderer
       └───────────── ProductUiSurface
```

- `ArenaGreyboxRenderer` 仍只消费既有比赛表现帧，不读取产品状态。
- `ProductUiSurface` 只消费公开 ViewModel，不读取 MatchCore、Controller、Profile Repository 或 Bot 数据。
- Canvas 尺寸、WebGL context loss/restore 和销毁由组合 Renderer 向下转发。
- 两个子资源独立记录清理结果；部分失败时只保留失败句柄，后续 `dispose()` 精确重试。

### 2. DOM 动作回到 Session 的同一意图串行器

Renderer 新增窄端口 `bindUiIntent({ onIntent, onRejected })`。Session 在 Flow 创建后绑定并拥有 cleanup；Web DOM 不直接调用 ProductController。触控 Canvas 命中和 DOM button 点击最终都进入同一个 `ProductSessionIntentDispatcher`。

DOM 宿主在一次 intent pending 期间立即锁住所有动作；公开 revision/状态签名未变化时不重建节点。这样避免每帧 ViewModel 重新投影造成可见按钮持续替换、点击节点失效或读屏焦点丢失。

### 3. Web 菜单使用语义 DOM，比赛继续使用单 Canvas

Web 产品页提供：

- `h1`、说明文本和 `aria-live` 状态公告；
- 真实 `button` 主次动作；
- `radiogroup/radio` 角色选择；
- 非比赛状态隐藏 Canvas 的可访问性暴露，比赛状态隐藏产品 DOM；
- `prefers-reduced-motion`、安全区、键盘焦点和窄屏布局。

视觉沿用已接受概念图的暖白纸张、低多边形玩具、手稿边线、珊瑚红与青色。生成图只作为无文字角色场景/预览资产，标题、状态和按钮全部由真实 ViewModel 与 DOM 渲染。

### 4. S8.5.4 不切换三端默认入口

Web 通过独立 `product.html` 可访问宿主验收。现有 `index.html`、微信和抖音仍保持旧灰盒入口；默认入口切换和小游戏 Canvas ProductUiSurface 属于 S8.5.5。

### 5. 真实导航释放租约，bfcache 只暂停

Web 产品入口在 `pagehide` 且 `persisted !== true` 时销毁已启动 Session，释放 Profile lease、输入和 WebGL 资源；进入 back-forward cache 时不销毁，由既有 hide/show 恢复。HMR 重绑前先移除旧监听，避免重复清理。

## 被否决方案

### 在旧 ArenaGreyboxRenderer 内直接画产品按钮

会让比赛 HUD、产品状态、命中和本地化耦合，Web 无障碍也只能另做第二套状态。

### DOM 页面直接调用 ProductController

会绕过 Flow 的自动奖励、结果缓存、重复点击串行和失败关闭。

### 每个 RAF 全量重建角色卡片

视觉截图可能正常，但真实点击和焦点会与被替换节点竞态。DOM 更新必须以产品 revision/状态签名幂等执行。

### 本批同时切换微信、抖音入口

小游戏没有 DOM，需要先实现并验证共享 Canvas UI Surface；不能用 Web 适配器污染平台入口。

## 后果

正面：

- Match、产品 UI 和宿主技术保持显式单向依赖。
- Web 可用真实语义控件完成角色选择、匹配、比赛、奖励和重赛。
- 后续小游戏只替换 UI Surface，不复制产品状态机和文案。
- 页面 reload、HMR、context loss 和部分清理失败均有明确所有权。

代价：

- `ProductPresentationSession` 的 Renderer 合同新增 UI intent 绑定端口，所有测试/小游戏 Surface 必须显式实现。
- 当前产品页是独立验收入口；S8.5.5 前默认 Web 地址仍是旧灰盒。
- 正式角色 GLB、动画和最终比赛美术仍属于 Stage 7 后续生产，不由产品 DOM 资产替代。

## 证据

- ProductRenderer 单测覆盖 UI/比赛帧隔离、context restore、部分清理失败重试和无效子合同回滚。
- Web Surface 单测覆盖语义控件、DOM intent 并发锁、幂等销毁和缺失宿主节点失败。
- Web teardown 单测覆盖真实 pagehide、bfcache 和 HMR 重绑。
- 浏览器真实流程覆盖大厅、角色切换、比赛 Canvas、奖励/重赛、重载恢复、桌面与移动视口及控制台错误。
- 完整证据见 [S8.5.4 结果记录](../research/arena-stage8-product-renderer-web-results.md)。
