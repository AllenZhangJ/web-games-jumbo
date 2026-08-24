# ADR-131：三模式终局结果按本局冻结Result Policy断言

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

ADR-128已经把三模式resolved Policy绑定进显式Registry路径，并让Objective/Result的kind、原因集合与投影类型参与构造期语义核对和Mode Driver身份。但构造期核对只能证明“本局选择了兼容的Result Policy”，不能证明真实终局产生的`ModeResultV3Payload`仍符合该Policy。

如果终局原因、ended tick、Race排名或Survival player身份在运行中漂移，错误结果仍可能进入`MatchEnded`、ReadFrame、Replay和结算证据。Presentation或Reward层不得承担这类补判职责。

## 决策

### 1. 新增独立Result Policy Resolver

`arena-match`新增`ModeResultPolicyResolverV1`。它只接收：

- 本局`ArenaMatchConfigV6`；
- 按Mode裁剪、深冻结的Result Policy bundle；
- 权威Runtime已经生成的`ModeResultV3Payload`与当前终局tick。

它不读取地图、武器、Renderer、DOM、墙钟、随机源或Profile，也不生成胜负结果。

### 2. 在权威终局事件前失败关闭

三种模式先按[ADR-132](132-arena-v2-terminal-objective-policy-authority-fact-assertion.md)用独立权威事实断言“为什么结束”，再在结果进入`MatchEnded`和终局ReadFrame前执行本决策的结构断言：

- 通用：result kind、allowed reason和`endedAtTick`必须与本局Policy及当前权威tick一致；
- Duel：winner只能来自本局participant，既有winner/draw/reason合同继续由V5→V6适配器保持；
- Race：rankings必须精确覆盖本局2–4名participant；本tick finishers共享rank 1，未完赛者按progress降序且同progress并列；
- Survival：`playerParticipantId`必须是本局唯一player；`survival-time-cap`不能覆盖已经达到第二次掉落的终局，既有两次掉落与time-cap结果结构继续由Result V3校验保持。

Resolver只验证结果，不成为Objective、finish claim、fall count或胜负的第二写者。

### 3. Result Policy进入Mode Driver身份

Race/Survival的显式Registry配置已经通过Runtime Policy Binding content hash包含Result Policy。Duel在显式Registry路径额外把规范化Result Policy bundle纳入Mode Driver hash；旧独立夹具不提交该bundle，继续保持原行为和原hash算法。

因此Checkpoint V3、Admission V2和终局结算证据不能把“有终局Policy断言”和“无终局Policy断言”误认为同一局规则。

### 4. 不接管Timeline与平衡

本决策不改变准备时长、sudden death、Race/Survival hard-limit、重生保护、敌人上限、地图长度、武器数值或奖励。完整Timeline Policy仍未进入运行时数值接管。

默认Registry、默认Composition与生产Entry继续关闭。

## 影响

- Result Policy不再只是构造期标签，而成为三模式逐局终局边界。
- 错误终局不能先进入事件、ReadFrame、Replay或结算后再由下游修正。
- 旧无Registry候选保持兼容；只有显式Registry路径启用新断言。
- 延期测试源码已登记，但测试、类型检查、构建、压力、性能、设备和真人验证均未运行，本ADR不构成阶段通过。

## 未采用的方案

### 在Presentation或结果页校验

这些层只能消费权威结果，不能修正胜负或决定结算。

### 让Result Resolver重新计算排名和生存分数

这会产生第二写者。Resolver只验证既有Mode System输出。

### 等Timeline全部批准后再接Result

终局结构和原因集合已经冻结，可以先闭合安全边界；未批准时长仍保持原fixture，不需要阻塞开发。

## 回滚

1. 移除`mode-result-policy-resolver-v1.ts`及包级导出；
2. 移除三模式显式Registry路径的Result Policy投影和终局断言；
3. Duel恢复只使用既有Definition bundle计算Driver hash；
4. 保留ADR-128/129/130的Participant、Elimination、Respawn、Relationship和Race终点绑定，不得开放默认入口。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：Mode/Policy Registry边界。
- [ADR-123](123-arena-v2-mode-driver-terminal-settlement-identity-v2.md)：开局与终局Driver身份闭包。
- [ADR-128](128-arena-v2-resolved-frozen-policy-runtime-binding.md)：resolved Policy运行绑定。
- [ADR-130](130-arena-v2-race-finish-semantic-capability.md)：Race跨地图终点语义能力。
- [ADR-132](132-arena-v2-terminal-objective-policy-authority-fact-assertion.md)：三模式终局Objective Policy权威事实断言。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
