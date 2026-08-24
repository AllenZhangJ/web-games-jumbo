# ADR-123：终局结算绑定开局 Mode Driver 身份

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

ADR-122已经让`ModeMatchRuntimeCheckpointV3`在中局恢复时绑定标准化Mode Driver内容身份，避免同一世界、历史和供给水位在恢复后换入另一份Duel Policy Bundle或Race/Survival fixture。

但终局链仍存在不同缺口：`Replay V6`稳定记录`config.modePolicyContentHash`，`Product Result V3`与原`ProductResultReplaySettlementEvidenceV1`闭合Result和完整Replay，却不能证明实际执行整局的具体Mode Driver内容。尤其Race/Survival Driver还包含地图、人数、安全锚、压力和供给fixture；仅有格式合法的Driver hash，也不能证明它与本局开局真实Runtime相同。

因此，终局证据不能只“带一个Driver hash”，还必须把该值同时绑定到开局准入和终局Runtime，由产品Authority Registry验证二者相等。

## 决策

### 1. Runtime公开开局只读Driver身份

`ModeMatchRuntimeV6`在构造并标准化Driver后保存`modeDriverContentHash`，允许在`created/running/paused/ended`读取，销毁后拒绝。Duel、Race、Survival具体Runtime和`ModeAuthoritativeLocalMatchSessionV3`只透传该只读身份，不重新计算Policy或fixture。

正式Quick Match Bundle只在Session仍处于`created`时读取该值；读取失败必须在Session所有权转移和开局前失败关闭并清理。

### 2. 新增开局Admission V2

产品Authority Registry保留Admission V1兼容合同，并新增exact-key的Admission V2：

- 保留Registry、Mode、Replay/Rule、物理后端、seed、内容和最终assignment身份；
- 新增本局实际`modeDriverContentHash`；
- 生成独立Admission V2 hash；
- 不把每局Driver hash写入静态Registry白名单。

Driver身份可能随合法地图、人数或本局fixture变化，因此它属于每局准入，不属于三模式静态Authority Definition。

### 3. 新增Runtime终局证据V1与Product结算证据V2

`ModeMatchRuntimeTerminalEvidenceV1`绑定完整`Replay V6 + modeDriverContentHash`并生成终局Runtime identity。

`ProductResultRuntimeSettlementEvidenceV2`在原Result/Replay闭包上增加：

- `modeDriverContentHash`；
- `runtimeTerminalEvidenceHash`；
- 由Result、Replay和Driver共同形成的settlement identity。

不升级`Replay V6`、`Product Result V3`、`Learning Grant V1`或`Learning Profile V1` schema。

### 4. 注册结算V2必须闭合开局与终局Driver

`ArenaV2ProductAuthorityRegistryCandidateV1.createRegisteredSettlementEvidenceV2()`只接受Admission V2，并要求：

- 原有Mode、seed、content、assignment、Replay/Rule和物理后端全部闭合；
- 终局`settlementEvidence.modeDriverContentHash`精确等于开局Admission V2中的值。

格式合法但属于另一份Driver内容的终局证据必须失败关闭。

### 5. 正式Learning候选迁移V2，V1保留兼容

正式Learning Bridge在Reward之后、Learning Grant提交之前读取终局Runtime证据并绑定Product结算V2。Terminal Handoff继续核对累计事件链与终局Replay一致，并执行版本匹配：

- Replay结算V1只能配Admission V1；
- Runtime结算V2只能配Admission V2；
- 已绑定V1/V2后不得切换版本；
- 重试只能复用同一证据identity。

无Registry的显式开发兼容路径仍可使用Runtime结算V2，但默认Profile、Registry、Composition和入口继续断开。

## 影响

- 开局准入与终局成长结算现在证明使用的是同一份实际Mode Driver内容，而不只证明Replay结构合法。
- 中局恢复Checkpoint V3和终局结算V2使用同一Runtime单一来源的Driver hash，不在Product或Learning层复制计算算法。
- Driver hash不进入静态Registry白名单，避免把地图/人数相关动态内容错误冻结为全局常量。
- V1 Admission、V1 Result/Replay结算和旧显式方法保留，便于独立回滚与历史测试；正式候选优先V2。
- 所有测试、类型、构建、压力、性能、设备和真人证据仍为`not-run`，不能据此开放默认接线或阶段门。

## 未采用的方案

### 只在终局证据增加Driver hash

只能证明Replay与某个hash绑定，不能证明该hash来自本局开局Runtime；调用方仍可提交另一份格式合法的Driver身份。

### 把Driver hash写入静态Authority Registry

Race/Survival的实际Driver会受地图、参与者和fixture影响。静态白名单会错误地把每局内容压成单一全局值，或迫使Registry保存动态组合爆炸。

### 升级Replay V6或Product Result V3

本缺口属于产品准入和终局证据闭包，不需要扩大稳定回放与赛果schema。独立版本化证据信封更容易兼容和回滚。

### 在Learning层重新计算Driver hash

会复制Rule/Core知识并形成第二权威来源，违反`Rule → Core → Bot → Presentation/Product`依赖方向。

## 回滚

在默认产品路径仍关闭时，可按以下顺序独立回滚：

1. 将正式Learning Bridge/Handoff切回Result/Replay结算V1；
2. 将Quick Match Bundle改回Admission V1；
3. 删除Admission V2、注册结算V2和Product Runtime结算证据V2；
4. 删除Session/具体Runtime的开局Driver只读端口和Runtime终局证据V1；
5. 撤回P2/P6治理登记与未运行测试源码。

回滚不得修改Replay V6、Product Result V3或Profile schema，也不得把未决Mode数值写成默认值。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：正式Mode与Policy Definition边界。
- [ADR-118](118-arena-v2-development-first-deferred-validation-window.md)：开发优先与延期验证窗口。
- [ADR-119](119-arena-v2-continuous-development-with-deferred-gates.md)：连续开发与集中门禁。
- [ADR-122](122-arena-v2-mode-driver-checkpoint-identity-v3.md)：中局恢复绑定Mode Driver内容身份。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
- [P6实施状态台账](../architecture/arena-v2-p6-implementation-ledger.md)。
