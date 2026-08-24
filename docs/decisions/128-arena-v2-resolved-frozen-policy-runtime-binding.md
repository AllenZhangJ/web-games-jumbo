# ADR-128：显式 Mode Registry 将已冻结 Policy 绑定到权威 Runtime

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

ADR-112 建立了三模式 Mode/Policy Registry，P2.0e–P2.0g 又建立了显式预检、内容身份后缀和顶层消费边界。但此前 Registry 的 resolved bundle 主要用于预检和身份闭包，三种真实 Runtime 仍主要读取本地候选或 fixture：

- Duel 使用本地构造的 Participant/Elimination/Respawn/Relationship bundle；
- Race 的重生等待、保护与锚点已和 ADR-121 候选保持一致，但未直接消费本局 resolved Respawn Policy；
- Survival 的首次复活已和 ADR-120 候选保持一致，压力和装备等级也来自相同产品目录，但未直接消费本局 resolved Pressure/Tier；
- Race/Survival hard-limit 与最终保护平衡仍未批准，不能为了“完整接线”猜值覆盖现有测试 fixture。

这使显式 Registry 能证明“本局选择了哪组 Policy”，却不能完全证明 Runtime 确实使用了其中已经冻结的字段。

## 决策

### 1. 新增不可变 Runtime Policy Binding

Regression Composition 新增版本化绑定封套，包含：

- 已验证的 Mode Registry content hash；
- 单个 Mode 的完整 normalized resolved bundle；
- 独立 content hash；
- 明确的部分消费边界：Timeline按ADR-133具备默认关闭的运行镜像能力，但真实Registry接线仍关闭；Objective由ADR-132推进为独立权威事实终局断言；Result由ADR-131推进为真实终局结构断言。

封套继续是`production-unreachable / hardGate=false`，不持有 Registry 实例、Presentation、平台端口或默认入口。

### 2. 只有显式 Mode Registry 工厂注入绑定

`ArenaThreeModeModeRegistryPreflightQuickMatchFactoryCandidateV1`在完成原候选、Registry、人数和内容身份预检后，为Duel/Race/Survival分别构造绑定并注入Runtime。

旧公开隔离工厂、Replay工具和未提交Mode Registry的Host继续不注入绑定，保持原行为和原Driver身份算法。普通调用方没有公开参数可伪造Registry hash或resolved bundle。

### 3. 已冻结字段直接参与权威运行

- 三模式：resolved Participant Policy在资源构造前校验最终Assignment的总人数、角色人数、controller、team和slot；未声明角色失败关闭。
- Duel：resolved Participant/Elimination/Respawn/Relationship投影到既有`ModePolicyResolver`，实际裁决与Driver hash都消费该投影。
- Race：resolved competitor Elimination/Respawn Policy在每次权威掉落时裁决`schedule-respawn`、等待、保护、无限复活、latest-valid-safe-anchor和公共fallback；Relationship Policy生成的冻结目标矩阵进入Rule内容身份并限制命中。
- Survival：resolved Elimination Policy在权威掉落时区分player的`count-for-objective`与enemy的`deactivate-slot`；resolved player Respawn Policy提供首次复活等待与保护，最大一次复活、固定锚能力和两次掉落终局必须闭合。Relationship Policy冻结player↔enemy为hostile、同角色为neutral，敌人不能互相命中。resolved Pressure提供slot激活顺序与阶段；具体重入点继续由所选KZ路线段适配，不能把首图物理锚ID硬编码到第二张图。
- Survival Tier：完整resolved Tier只约束本局active武器Registry子集。Runtime不得借完整Mode Registry激活尚未进入active武器Registry的武器；每个active tier/variant必须是resolved Tier的精确子集。

Rule层新增的目标资格端口按[ADR-129](129-arena-v2-rule-target-eligibility-policy-port.md)在构造时一次性展开为participant有向关系矩阵；tick内不回调外部Resolver，checkpoint通过Rule content hash拒绝关系漂移。

### 4. 未批准字段不得被本批接管

通用`runtimePolicyConsumptionWired`继续为`false`。本批只新增`resolvedFrozenRuntimePolicyConsumptionWired=true`：

- Race/Survival hard-limit继续使用现有显式`.test.` fixture；
- Timeline Policy按[ADR-133](133-arena-v2-explicit-timeline-policy-runtime-mirror-capability.md)可裁剪为显式bundle，并在注入前要求本地权威镜像逐字段一致；当前真实QuickMatch不注入，不能覆盖本地未批准数值；
- Race保护、Survival首次复活的最终平衡批准仍是`not-run`；
- 当前16-slot Pressure不是首发敌人数批准；
- Objective按[ADR-132](132-arena-v2-terminal-objective-policy-authority-fact-assertion.md)用Duel参与者状态/分数、Race同tickfinish claim和Survival玩家掉落事实复核结束原因；Result按[ADR-131](131-arena-v2-terminal-result-policy-assertion.md)在三模式真实终局tick逐局断言kind、原因、participant身份与既有投影。Race终点按[ADR-130](130-arena-v2-race-finish-semantic-capability.md)只消费跨地图语义能力并映射到所选地图真实finish anchor；两类Resolver都只拒绝，不新增第二写者。

任何这些值要成为完整Policy接管，必须另行批准并更新本ADR状态或新建后续ADR。

### 5. Driver、恢复与结算身份同步变化

显式Registry路径把绑定content hash或投影后的Policy内容纳入Mode配置/fixture，因此同一地图、武器、seed和Assignment下，resolved Policy内容变化会得到不同Mode Driver hash。

现有Checkpoint V3、Admission V2和终局Runtime/Product结算证据继续复用该Driver hash，无需升级Replay、Profile或Result schema。恢复或结算不能把不同Policy绑定误认为同一局规则。

## 影响

- Registry不再只是开局预检和内容标签；已冻结字段成为真实Runtime输入。
- Race/Survival的命中候选不再仅由几何决定，必须同时通过resolved Relationship矩阵。
- 生存压力顺序由`slotActivationOrder`而非偶然数组顺序决定。
- 武器Registry仍是可玩子集唯一来源，不因Mode Registry扩大。
- 默认Registry、默认Composition、默认Entry、Presentation和平台入口均保持关闭。
- 测试、类型检查、构建、压力、性能、设备和真人验证全部未运行，本ADR不构成阶段通过。

## 未采用的方案

### 一次性让Runtime完整接管Timeline、Objective触发与Result计算

Race/Survival hard-limit和最终平衡尚未批准。一次性接管会把fixture或任意候选值伪装成产品决定。

### 直接把Mode Registry实例交给Runtime

这会扩大依赖和生命周期所有权，并允许Runtime在局中查询可变外部状态。绑定只传深冻结、按Mode裁剪的普通数据。

### 用完整Tier Policy替代active武器Registry

这会让未完成逐把准入的武器进入可玩池，绕过P4发布顺序。完整Tier只能校验active子集。

## 回滚

1. 移除`arena-three-mode-runtime-policy-binding-candidate-v1.ts`及包级导出；
2. 移除Duel/Race/Survival request的可选`runtimePolicyBinding`和对应消费；
3. 恢复内部QuickMatch工厂只接收Registry content hash，不构造三模式绑定；
4. 恢复显式Registry路径仅绑定`MatchContentSelectionV2.contentDefinitionId`的P2.0e行为；
5. 保留ADR-120/121单一Respawn候选、Checkpoint V3和Admission V2，不得回退为重复私有数值或开放默认入口。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：Mode/Policy Registry边界。
- [ADR-120](120-arena-v2-survival-first-respawn-single-source-candidate.md)：Survival首次复活单一候选。
- [ADR-121](121-arena-v2-race-respawn-single-source-candidate.md)：Race重生单一候选。
- [ADR-122](122-arena-v2-mode-driver-checkpoint-identity-v3.md)：Checkpoint V3的Mode Driver身份。
- [ADR-123](123-arena-v2-mode-driver-terminal-settlement-identity-v2.md)：开局与终局Driver身份闭包。
- [ADR-129](129-arena-v2-rule-target-eligibility-policy-port.md)：Rule目标资格冻结矩阵与checkpoint身份。
- [ADR-130](130-arena-v2-race-finish-semantic-capability.md)：Race跨地图终点语义能力。
- [ADR-131](131-arena-v2-terminal-result-policy-assertion.md)：三模式终局Result Policy逐局断言。
- [ADR-132](132-arena-v2-terminal-objective-policy-authority-fact-assertion.md)：三模式终局Objective Policy权威事实断言。
- [ADR-133](133-arena-v2-explicit-timeline-policy-runtime-mirror-capability.md)：显式Timeline Policy运行镜像能力与默认关闭边界。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
