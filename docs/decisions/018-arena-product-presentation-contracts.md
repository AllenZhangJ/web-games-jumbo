# ADR-018：Arena 产品表现使用版本化 ViewModel、意图端口与非拥有 Match 桥

- 状态：已接受（S8.5.1～S8.5.2 已实施）
- 日期：2026-07-18

## 背景

S8.1～S8.4 已建立无 UI 产品状态机、唯一 Match 所有者、可靠本地进度、幂等奖励和双方共享内容池。现有 `ArenaPresentationSession` 则仍是 Stage 6 灰盒 POC 的独立生命周期所有者，会自行创建 `QuickMatchService`、`LocalMatchSession`、输入、Renderer 和重赛资源。

若把两者同时用于产品入口，会出现两套 Match 所有权；若让页面直接调用 Match 或奖励服务，产品状态、重复点击、前后台和错误恢复又会分散到不同页面。三端还需要同一份中文文本、公开对手信息和无障碍语义，但 Web DOM、小游戏 Canvas 与 Three.js 不能反向进入产品合同。

## 决策

### 1. 产品页面只消费版本化只读 ViewModel

`presentation/product` 建立三类数据合同：

- `ProductScreenDefinition/Registry`：按产品 `activeState` 唯一映射页面种类、场景、文案 ID 和主次意图。
- `ProductMessageCatalog`：版本化、本地化、严格占位符格式化，不在页面散落中文分支。
- `ProductContentPresentationDefinition/Registry`：把稳定角色/外观/装备/地图 ID 映射到名称和预览资产；不把资产 ID写入 Profile。

`createProductSessionViewModel()` 只从 Product 快照、上述 Registry 和可选上一局结果生成深冻结公开模型。它不发布对手内部 ID、机器人身份、随机难度或原始异常；未知状态、内容、胜者、消息参数和错误码全部失败关闭。

### 2. UI 只能发送严格意图

`ProductSessionIntentDispatcher` 校验并序列化 `ProductUiIntent`。同一快速连点共享一个 Promise，不同并发意图明确拒绝；适配器不拥有也不销毁 `ProductSessionController`。页面不得直接创建 Match、提交奖励或写 Profile。

首页“开始匹配”使用当前已保存角色，角色选择是独立入口。概念图中的匹配取消按钮暂不进入 Definition：当前 Product/Match 尚无可验证的异步取消协议，不能用无效按钮伪装能力。

### 3. ProductController 继续是唯一 Match 所有者

`ProductSessionController.getActiveMatchSnapshot()` 只读转发当前 `ProductMatchCoordinator` 的权威快照，不暴露 Runtime、MatchCore 或写入口。

`ProductMatchPresentationRuntime` 是非拥有桥：

```text
ProductSessionController（唯一 Match 所有者）
        ↓ 只读快照 / beginMatch / stepMatch(InputFrame)
ProductMatchPresentationRuntime
        ↓ 去重事件 + ArenaPresentationFrame
Renderer / UI / Audio（后续宿主组合）
```

- 输入源只能按当前 tick 和 `ActionAffordance` 生成玩家 `InputFrame`。
- 权威 step、结果和产品状态必须一致后才发布新表现帧。
- `PresentationEventWindow` 是桥唯一拥有的资源；Controller 和输入源均为借用端口。
- 比赛结束结果可作为有界只读表现缓存，供奖励提交释放 Runtime 后继续显示；缓存不是第二份权威状态。
- 输入、投影或权威 step 任一失败后桥立即失败关闭，不重放已推进 tick。

### 4. 宿主与 Renderer 留在下一层组合

本批合同不依赖 Three.js、DOM、平台 API、墙钟、定时器或产品组合根。Web、微信和抖音将分别提供 UI/Canvas 宿主适配，但共享同一 ViewModel、Intent 和 Match frame。

S8.5.2 新增的 `ProductPresentationFlow` 负责无宿主业务编排：发现 preparing 后创建唯一 Match 表现桥，推进完成后先冻结公开结果再自动提交奖励；保存失败保留结果与 Runtime，`retry` 回到 results 后提交同一事务；成功进入 reward 后释放 Match 表现资源。Flow 拥有 Dispatcher 和 Match 表现桥，但仍不拥有 Controller 或输入源，对外只发布 ViewModel、Arena frame 与自身生命周期状态。

FrameLoop、前后台宿主回调、Renderer、UI 资源和最终 Controller 销毁仍由后续 Product Presentation Session 统一管理。

## 被否决方案

### 同时运行 ProductSessionController 与旧 ArenaPresentationSession

两者都会拥有一局 Match，造成输入、结果、奖励和销毁对象不一致。

### 页面直接持有 ProductMatchCoordinator 或 RewardCommitter

会绕过状态机并扩大重复比赛、重复发奖和销毁竞态窗口。

### 为 Web 和两个小游戏分别维护页面状态与中文文案

状态、错误恢复、机器人脱敏和可访问文本容易分叉，无法用同一自动门禁验证。

### 先画出“取消匹配”按钮再补逻辑

异步创建尚无取消确认与迟到资源归属协议；展示无效按钮会制造错误产品承诺。

## 后果

正面：

- Product、Match、表现投影和平台宿主保持单向依赖。
- 三端可以共享状态、文案、意图和公开数据脱敏规则。
- 新页面、语言和内容预览通过 Definition/Registry 扩展。
- 真实 Renderer 接入前即可验证竞态、生命周期和单 Match 所有权。

代价：

- 仍需要 Product Presentation Session 组合 FrameLoop、Renderer、UI 和 App 生命周期。
- 奖励页需要显式保存上一局公开结果，不能在 Match 释放后重新读取 Runtime。
- 匹配取消必须先补齐 Product/Coordinator 协议才能进入 UI。

## GitHub 与依赖边界

继续借鉴 [statelyai/xstate](https://github.com/statelyai/xstate/tree/9d9b9f1439b773979c5120a793215f5aa4568d8f) 固定 commit `9d9b9f1439b773979c5120a793215f5aa4568d8f` 的显式状态/事件思想；没有复制代码或引入运行时。表现帧和事件窗口复用项目已有 Stage 6/7 合同。本批没有新增第三方依赖。

## 生效证据

- V1 Screen Registry 覆盖所有非 suspended 产品状态，消息和内容引用可校验。
- ViewModel 覆盖 home、角色、matching、suspended、result、reward、unlock 和公开错误，并验证机器人/难度不泄漏。
- Intent 覆盖重复点击、不同意图并发和销毁后迟到完成。
- 真实 Arena V1 Product Match 通过非拥有桥生成既有 Arena frame，直到权威结果。
- 事件重复、权威 step 失败、构造失败和清理重试均有门禁。
- Flow 覆盖自动奖励、保存失败精确重试、前后台暂停、候选清理和非拥有销毁。

阶段记录见 [S8.5.1 产品表现合同基础](../research/arena-stage8-product-presentation-foundation.md)。
