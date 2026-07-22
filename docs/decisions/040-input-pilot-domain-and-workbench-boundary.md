# ADR-040：Input Pilot 线上词汇归入独立域，Workbench 保持 Web 宿主边界

- 状态：已接受并实施
- 日期：2026-07-23
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 实施提交：`dc531c9b983bfc1a063957886f35499a9962ea48`

## 背景

Input Pilot 的动作结果、理解度、Trial 状态、终止原因、排除原因和 Controller 生命周期原先分散在多个 JavaScript Record/Controller 文件中。Web Workbench 直接消费这些动态常量，同时拥有 Canvas 换位、表单事件、动态 HTML 和异步 action 回写。

只把 Workbench 文件改名为 TypeScript 会保留多个词汇真值和动态 `any` 边界；把 DOM 视图并入 Pilot 领域包则会让研究记录语义依赖浏览器和 Canvas。Input Pilot 用于测量输入方案，不参与权威命中、移动、胜负、奖励或默认 Product 入口。

## 决策

### 建立独立 strict Input Pilot 域

`@number-strategy-jump/arena-input-pilot` 是 Input Pilot 领域值的长期入口。首批只承接六类共享线上词汇，使 Record、Report、Controller、View 和后续证据工具使用同一个不可变真值。旧模块可从原公开路径重导出同一对象以维持消费合同，但不得再定义副本。

后续 Definition、Assignment、Record、Workspace、Repository、Report 和 Evidence/Release 应按依赖顺序迁入该域或明确子包。包内不得依赖 DOM、Three.js、Web 平台、下载实现或默认生产 Entry，也不得成为比赛状态写入者。

### Workbench View 留在 strict Web Entry 层

`InputPilotWorkbenchView` 是浏览器宿主适配器，只负责：

- 把已校验的 Pilot snapshot 投影为页面状态；
- 读取观察与复核表单，转发显式 actions；
- 在 Workbench shell 与比赛 Canvas 之间转移宿主所有权；
- 管理监听器、忙碌状态、销毁阻断和失败后精确重试。

View 不持有 Workspace Repository、Trial 分组、证据汇总、下载数据生成、MatchCore 或 Product Session 所有权。

### 数据和生命周期边界必须失败关闭

options、actions、snapshot、environment、form snapshot 和 review draft 在执行业务方法或写 DOM 前校验。研究人员可控文本进入 `innerHTML` 前必须转义；可直接使用 `textContent` 的位置不改用 HTML。渲染仅读取页面当前需要的有界字段，不为每次表单操作深拷贝整个 Workspace。

绑定中途失败必须逆序回滚。构造失败必须尝试归还原 Canvas。销毁失败不得删除未释放所有权；已成功清理的项从待办列表移除，失败项保留供下次 `destroy()` 重试。销毁开始后，迟到的异步 action 不得重新渲染或复活 View。

## 被否决方案

### 保留分散常量，只给 Workbench 补类型

这会继续允许 Record、Controller 和 View 的状态线上值漂移，并让后续 Workspace/Report 迁移依赖 JavaScript 真值。

### 把 Workbench DOM 实现放入领域包

这会破坏领域包的无宿主边界，使离线 Node 报告、未来非 Web 采集端和默认 Product 依赖图受 DOM 影响。

### 销毁时先清空所有 cleanup 和引用

若宿主 `removeEventListener()` 或 Canvas 归还失败，先丢弃引用会把真实泄漏伪装为已销毁，也无法精确重试。

## 后果

正面：

- Pilot 共享状态值有了唯一 strict 真值和稳定公开边界；
- Workbench 的访问器、HTML 注入、部分绑定、Canvas 回滚和销毁竞态可独立回归；
- 渲染不深拷贝完整 Workspace，避免在手机表单高频操作中增加无意义分配；
- 默认 Product bundle 不依赖 Pilot 页面或研究域。

代价：

- 构建序列增加一个内部 workspace；
- Pilot 领域的其余 JavaScript 和 Web App/薄入口仍须按顺序迁移；
- 本决策不代表真实浏览器、手机验收、G6 或 G7 已完成。

## 生效证据

- Workbench 一个 JavaScript 真值删除，精确允许清单由 253 降至 252；
- Input Pilot 定向 42/42、完整 Node 691/691、strict package/治理 316/316 通过；
- clean build `arena-dc531c9b983b-product` 三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`，交付字节与上一批完全一致；
- 完整数值见 [Arena 企业治理状态台账 G7.2](../governance/arena-enterprise-governance-status.md#g72-input-pilot-共享词汇-strict-基础证据) 与 [G6.47](../governance/arena-enterprise-governance-status.md#g647-input-pilot-workbench-view-strict-迁移证据)。
