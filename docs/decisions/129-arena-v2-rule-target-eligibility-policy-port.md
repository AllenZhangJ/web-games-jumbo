# ADR-129：Rule目标资格在构造时冻结为关系矩阵

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

`ArenaRuleEngine`此前只依据actor的`targetable`状态和几何Targeting Registry选择命中对象。这个边界足以表达双人对战，但不能表达Survival的角色关系：player与enemy互相敌对，enemy与enemy中立。若只在命中后检查关系，中立目标仍可能先生成Hit与Effect，再让整局失败；若由Renderer、Bot或World Authority预先隐藏actor，又会把表现、观察或生命周期状态混入命中裁决。

Mode Policy Resolver已经能根据本局Final Assignment解析participant之间的`hostile / ally / neutral`关系，但Rule层不能在每个tick持有或查询可变Registry。

## 决策

### 1. Rule层只接收最小只读目标资格端口

`ArenaRuleEngineOptions`新增可选`RuleTargetEligibilityContract`：

- `contentHash`标识资格规则内容；
- `allowsTarget(sourceParticipantId, targetParticipantId)`只在Rule Engine构造期间调用；
- 未提供端口时保持旧行为，所有非自身且`targetable`的actor继续进入几何筛选。

端口不暴露Mode Registry、Resolver、team、role、DOM、Renderer或Bot状态。

### 2. 构造时展开并冻结有向关系矩阵

Rule Engine按稳定participant顺序枚举全部非self有向pair，要求端口同步返回布尔值，并把允许pair收敛为内部只读集合。运行tick只查询该集合，不再次调用外部对象。

这保证：

- 关系不能在比赛中途漂移；
- 外部Resolver没有tick期重入机会；
- 几何Targeting仍只负责距离、方向和形状；
- Relationship只负责“这个source是否有资格命中这个target”。

### 3. 关系矩阵进入Rule内容与checkpoint身份

端口content hash和稳定排序后的允许pair共同进入`ArenaRuleEngine` content hash。Checkpoint恢复必须重新提交相同资格端口；缺失或关系漂移会在恢复子系统前因content hash不一致失败关闭。

不升级Checkpoint schema：既有checkpoint已保存Rule content hash，足以拒绝不同关系矩阵。

### 4. Race与Survival只从resolved Policy建立矩阵

- Race显式Registry路径中，competitor→competitor必须解析为hostile；
- Survival显式Registry路径中，player↔enemy为hostile，player→player与enemy→enemy为neutral；
- 旧无Registry隔离路径不注入端口，保持原候选行为和身份；
- 命中mutation仍重复核对resolved Relationship，作为Rule候选与World mutation之间的失败关闭防线。

### 5. 不扩大默认生产可达性

该API是Rule层能力，不构造默认Mode Registry、Composition或Entry。完整Timeline、Race/Survival hard-limit、最终平衡、设备和性能门均不在本ADR中批准。

## 影响

- Survival敌人不再能因几何重叠互相命中；玩家与敌人仍共享同一套武器、Targeting和Effect规则。
- Race继续允许参赛者互相攻击，但关系成为本局Policy身份的一部分。
- Rule、Checkpoint与Replay身份能检测关系漂移。
- 测试、类型检查、构建、压力、性能、设备和真人验证全部未运行，本ADR不构成阶段通过。

## 未采用的方案

### 命中后再拒绝neutral目标

命中事件和Effect候选已经产生，事后拒绝会把合法的neutral重叠变成整局失败，并可能留下部分副作用。

### 每tick调用Mode Policy Resolver

这会扩大Rule的运行期依赖和重入面，也使关系可被外部可变状态影响。

### 由actor.targetable表达阵营

`targetable`是参与者当前可受击状态，不是source相关的有向关系；同一个enemy对player可受击、对另一个enemy不可受击，单一布尔值无法表达。

## 回滚

1. 移除`RuleTargetEligibilityContract`和Rule Engine内部关系矩阵；
2. 移除Race/Survival构造与恢复时的目标资格注入；
3. 移除两种Authority的resolved Relationship二次断言；
4. 保留ADR-128的Participant、Elimination、Respawn、Pressure与Tier绑定，不得因此开放默认入口。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：Mode/Policy Registry边界。
- [ADR-122](122-arena-v2-mode-driver-checkpoint-identity-v3.md)：Mode Driver checkpoint身份。
- [ADR-128](128-arena-v2-resolved-frozen-policy-runtime-binding.md)：resolved Policy运行绑定。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
