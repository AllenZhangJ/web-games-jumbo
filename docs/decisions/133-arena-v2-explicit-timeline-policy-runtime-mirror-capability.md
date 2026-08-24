# ADR-133：显式 Timeline Policy 运行镜像接管能力保持默认关闭

## 状态

提议：`production-unreachable / capability-code-written-not-run / runtime-mirror-unwired / hardGate=false`。

## 日期

2026-08-12

## 背景

Mode Registry 已经包含三模式 Timeline Policy，但真实候选运行时仍存在本地时间来源：

- Duel 由既有 MatchCore Timeline 推进准备、运行、突然死亡和硬时限；
- Race 由显式 `.test.` fixture 提供 60 tick 准备期与 active hard limit；
- Survival 由显式 `.test.` fixture 提供 active hard limit。

当前 Registry 候选值与部分纵向研究场景的本地值并不完全相同。这些差异尚未完成平衡批准，不能为了宣称“Timeline 已接管”而修改研究场景、填默认值或静默覆盖现有手感。

但如果完全等到最终平衡后才开始开发，后续仍需重构三模式 Driver、Checkpoint 身份和终局边界。因此本批先建设一个默认关闭的显式接管能力。

## 决策

### 1. 新增独立 Timeline Policy Resolver

`arena-match` 新增 `ModeTimelinePolicyResolverV1`。它只接受：

- 当前 `ArenaMatchConfigV6`；
- 从 resolved Timeline Policy 裁剪的深冻结 bundle；
- 当前 Runtime 已经使用的准备时长、active hard limit、突然死亡 tick 镜像；
- Duel 已有 MatchCore 输出的总 tick、active tick、phase 与准备剩余时间事实。

Resolver 不推进 tick、不改变 phase、不生成终局、不读取墙钟、Renderer、DOM、Profile 或随机源。它只在显式注入时验证现有唯一时间写入者与 resolved Policy 完全一致。

### 2. 三模式采用可选显式端口

- Duel Driver 可选接收 `timelinePolicyBundle`。启用后，开局、每 tick 与恢复时都复核 MatchCore 时间事实；没有 bundle 时保持原 Driver hash 和行为。
- Duel 若在动作/淘汰结算中先产生终局，MatchCore 会完成总 tick、但不会再推进该拍 active tick；Resolver只在首个active step已经开始、active tick仍严格小于hard limit且终局结果存在时接受这一拍的精确差值，并按终局前 active tick复核 running/sudden-death phase。只有硬时限终局允许active tick先推进到hard limit再结束；非终局、倒计时刚结束但尚未执行active step、越过hard limit、早期终局却已推进active tick或更大差值均拒绝。
- Race/Survival Mode System 可选接收同一 bundle。构造期先要求 fixture 的准备时长、active hard limit 和突然死亡语义与 Policy 逐字段一致，然后才把 Timeline bundle 纳入 Driver 身份。
- Timeline bundle 一旦存在，Mode Driver hash 必须与无 bundle 或不同 bundle 的局区分；Checkpoint V3、Admission V2 与终局证据沿用现有 Driver 身份闭包。

### 3. resolved Registry 投影能力存在，但真实接线保持关闭

Runtime Policy Binding 提供 `projectArenaRuntimeTimelinePolicyResolverBundleCandidateV1()`，用于在未来批准后生成唯一规范 bundle。

P2.0t进一步新增只读接线资格报告。报告不接受调用方提交runtime mirror，而是直接读取Duel配置、Race fixture和Survival全部1/4/8/12/16敌人数变体所消费的同源镜像，逐字段输出`preparingTicks / hardLimitActiveTicks / suddenDeathStartActiveTick`差异。每次真实Mode Registry预检都会携带该报告，但报告不是授权令牌：值完全一致时也只进入`awaiting-balance-approval`，在平衡批准仍为`not-run`时固定`mayWireRuntimeTimelinePolicy=false`。

本批明确保持：

- `timelineRuntimePolicyConsumptionWired=false`；
- `explicitTimelinePolicyRuntimeMirrorCapabilityWritten=true`；
- `explicitTimelinePolicyRuntimeMirrorWired=false`；
- 当前三模式 Registry-backed QuickMatch 不注入 Timeline bundle；
- Registry预检只暴露差异和资格状态，不把“值相同”提升为平衡批准；
- 默认 Registry、默认 Composition、默认 Entry 继续关闭。

### 4. 不改变当前数值和手感

本决策不修改 Duel 的 30/1800/3600 研究 Runtime，不修改 Race 纵向场景的 60 tick 准备和本地 hard limit，不修改 Survival 场景时限，也不把 Registry 测试候选值提升为正式产品值。

后续只有在三模式目标时长与平衡数值明确批准，并完成“Registry Policy = 当前权威镜像”的逐模式对齐后，调用方才可以显式注入 bundle。任一字段不一致必须在资源运行前失败关闭。

## 影响

- 最终 Timeline 批准后不再需要重构 Mode Runtime，只需对齐数值并开放显式接线。
- 当前候选行为、Replay 语义、旧 Driver hash 与默认可达性不变。
- Timeline 不会形成第二写者；Duel 继续由 MatchCore 推进，Race/Survival 继续由 Mode System 消费唯一 hard limit。
- 测试源码和治理登记已写，但测试、类型检查、构建、压力、性能、设备和真人验证均未运行。

## 未采用的方案

### 直接把 Registry 测试候选覆盖到三模式 Runtime

这会把尚未批准、且与当前研究场景不同的数值伪装为正式平衡决定。

### 同时保留 Policy 和 fixture 两个可写时间源

这会制造竞态和恢复歧义。启用 bundle 时只能接受逐字段相同的镜像，不允许二选一或运行中切换。

### 等全部验证完成后再开发能力

用户已明确要求开发优先、验证顺延。默认关闭的能力可以先完成，同时不改变门状态。

## 回滚

1. 删除 `mode-timeline-policy-resolver-v1.ts` 及包级导出；
2. 移除三模式 `timelinePolicyBundle` 可选字段和 Driver 身份分支；
3. 移除 Runtime Policy Binding 的 Timeline bundle 投影函数与能力元数据；
4. 删除接线资格报告、Preflight摘要字段、延期测试源码和 P2.0r/P2.0t 治理登记；
5. 保留所有现有 fixture、MatchCore Timeline、Objective/Result 断言和默认关闭状态。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：Mode/Policy Registry 边界。
- [ADR-119](119-arena-v2-continuous-development-with-deferred-gates.md)：开发优先与验证顺延。
- [ADR-128](128-arena-v2-resolved-frozen-policy-runtime-binding.md)：resolved Policy 运行绑定。
- [ADR-131](131-arena-v2-terminal-result-policy-assertion.md)：终局 Result Policy 断言。
- [ADR-132](132-arena-v2-terminal-objective-policy-authority-fact-assertion.md)：终局 Objective 权威事实断言。
- [P2 实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
