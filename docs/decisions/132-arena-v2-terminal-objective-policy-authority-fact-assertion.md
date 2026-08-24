# ADR-132：三模式终局按本局Objective Policy与独立权威事实断言

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

ADR-128已经把resolved Objective Policy纳入显式Mode Registry路径的构造期语义与身份闭包，ADR-131又在终局发布前验证Result结构、原因集合、参与者和排名投影。但只验证Result仍不能独立证明“本局为什么在这个tick结束”：

- Duel结果原因可能与当tick参与者淘汰状态或超时分数不一致；
- Race可能在没有有效终点声明、也没有达到本局显式hard limit时生成`no-finisher`；
- Survival可能在不是第二次玩家掉落、也没有达到本局显式hard limit时结束。

这些判断属于Rule/Core权威边界，不能交给Presentation、Replay、结算页或奖励层补判。

## 决策

### 1. 新增独立Objective Policy Resolver

`arena-match`新增`ModeObjectivePolicyResolverV1`。它接收：

- 本局`ArenaMatchConfigV6`；
- 从resolved Objective Policy裁剪、深冻结的bundle；
- Mode System已经计算出的终局Result；
- 与Result原因独立的当前tick权威事实。

Resolver只断言现有结果，不写participant、finish claim、fall count、排名、胜负或Timeline，也不读取Renderer、DOM、Profile、墙钟或随机源。

### 2. 三模式使用不同的独立事实

- Duel：读取终局后MatchCore参与者的`status / lives / eliminations`。一名淘汰对应`last-participant-standing`，两名淘汰对应`simultaneous-elimination`；无人淘汰时按既有`lives → eliminations → participantId`稳定排序复核`timeout-score / timeout-draw`及winner。
- Race：读取当前tick的有效finish claim参与者集合、`activeTick`和本局显式fixture hard limit。有finish claim必须在同tick产生`finish-claimed`，winner集合必须与claim集合一致；无claim只有达到该局既有hard limit才允许`no-finisher`。
- Survival：读取当前tick的`playerFell / fallCount / activeTick`和本局显式fixture hard limit。第二次玩家掉落必须产生`terminal-player-fall`；未达到第二次掉落只有达到该局既有hard limit才允许`survival-time-cap`。

Objective Resolver先验证终局触发事实，Result Resolver随后验证结果结构与投影，两者均在终局事件、ReadFrame、Replay和结算身份提交前失败关闭。

### 3. 不把fixture hard limit提升为产品Timeline批准

Race/Survival当前hard limit仍来自生产不可达的显式`.test.` fixture。Objective Resolver只验证“当前Runtime既然按这份fixture运行，结果原因必须与同一份fixture事实一致”，不会把该数值写回Mode Registry、默认Composition或生产入口。

因此：

- `timelineRuntimePolicyConsumptionWired=false`继续保持；
- Race/Survival正式hard limit仍未冻结；
- 不新增默认时长、平衡值或玩家可见倒计时来源；
- 后续Timeline Policy正式接管时必须另行批准并替换fixture来源。

### 4. Objective Policy进入Mode Driver身份

显式Registry路径把规范化Objective bundle纳入Duel Driver hash，以及Race/Survival fixture Driver hash。旧无Registry路径不提交Objective bundle，继续使用原构造方式和原hash算法。

Objective bundle同时记录：

- 当前Match配置的组合Policy hash，用于拒绝跨局混入；
- resolved Policy投影hash，用于Driver、checkpoint、Admission和终局结算身份区分。

## 影响

- 三模式终局从“Result结构合法”提升为“终局原因有独立权威事实 + Result结构合法”的双层边界。
- Presentation、Replay和Reward继续只能消费终局结果，不重新判定结束原因。
- 旧无Registry候选保持兼容；新断言只在显式Registry路径启用。
- 测试源码与治理登记已写，但测试、类型检查、构建、压力、性能、设备和真人验证均未运行，本ADR不构成阶段通过。

## 未采用的方案

### 用Result reason自己证明Objective

这不是独立断言，无法发现“结果字段内部一致但结束原因与真实世界状态不一致”。

### 让Objective Resolver重新计算并覆盖Result

这会形成第二写者并掩盖原Mode System错误。Resolver只拒绝，不修正。

### 立即让resolved Timeline Policy覆盖Race/Survival hard limit

正式hard limit和平衡尚未批准。当前批次只闭合既有显式fixture的因果一致性。

## 回滚

1. 移除`mode-objective-policy-resolver-v1.ts`及包级导出；
2. 移除三模式显式Registry路径的Objective bundle投影和Mode Driver注入；
3. Duel Authority停止提交独立参与者Objective事实；
4. Race/Survival恢复只使用既有Mode System与ADR-131 Result断言；
5. 保留Timeline、默认Registry、默认Composition和默认Entry关闭状态。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：Mode/Policy Registry边界。
- [ADR-128](128-arena-v2-resolved-frozen-policy-runtime-binding.md)：resolved Policy运行绑定。
- [ADR-130](130-arena-v2-race-finish-semantic-capability.md)：Race跨地图终点语义能力。
- [ADR-131](131-arena-v2-terminal-result-policy-assertion.md)：三模式终局Result Policy断言。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
