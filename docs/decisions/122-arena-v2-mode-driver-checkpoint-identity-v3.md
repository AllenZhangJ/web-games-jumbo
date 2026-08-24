# ADR-122：Runtime Checkpoint V3 绑定标准化 Mode Driver 内容身份

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

`ModeMatchRuntimeCheckpointV1`已经保存完整权威世界、config、Mode状态、输入/事件前缀、Replay checkpoint与Mode checkpoint；V2又补充Survival供给事实stream/sequence水位。但V1/V2都没有保存构造实际Mode Driver所使用的标准化内容：Duel的完整Policy Definition Bundle，以及Race/Survival的完整fixture。

因此，调用方理论上可以保留同一config、世界checkpoint与历史前缀，却在恢复时传入另一份仍能通过基础schema校验的Mode内容。例如改变Race hard limit或重生保护、改变Survival压力阶段或武器tier、改变Duel Policy Bundle中的细节。此时旧checkpoint身份本身无法证明“恢复前后使用同一套Mode规则”。

该缺口属于恢复身份闭包，不是玩法扩展。不能通过把未决hard limit写死、升级Replay/Result schema，或要求表现层记住旧规则来修复。

## 决策

### 1. 新增 Runtime Checkpoint V3

新增exact-key的`ModeMatchRuntimeCheckpointV3`：

- 完整嵌入V2 checkpoint，不复制其字段；
- 增加`modeDriverContentHash`；
- 对完整V3核心字段重算`checkpointIdentityHash`；
- schemaVersion固定为3，future key、访问器字段、非法hash及嵌套V2漂移均失败关闭。

V3不改变`Replay V6`、`ModeResult V3`、`MatchReadFrame V3`或各world-authority checkpoint schema。

### 2. Mode Driver身份只从标准化内容生成

三个Driver分别公开只读内容hash：

- Duel：对`ModePolicyResolver`完成校验和标准化后的完整Definition Bundle计算hash；
- Race：对`RaceModeSystem`完成校验和标准化后的完整fixture计算hash；
- Survival：对`SurvivalModeSystem`完成校验和标准化后的完整fixture计算hash。

禁止直接hash调用方原始对象，避免字段顺序、未标准化集合或未验证内容成为身份来源。

### 3. 恢复必须先核对Mode内容，再接管世界资源

`restoreFromRuntimeCheckpointV3()`先验证V3及嵌套V2/V1，再用checkpoint config与调用方Mode内容创建临时Driver并比较`modeDriverContentHash`。只有身份一致后，才读取和捕获调用方提供的world authority。

身份漂移时，替换authority必须保持未观察、未接管；临时Driver必须同步销毁。构造正常Runtime时同样先创建并验证Mode Driver，再捕获authority，避免非法Mode内容触碰外部资源。

### 4. 正式完整恢复链迁移到V3，V1/V2保留兼容

以下生产不可达完整恢复候选使用V3：

- 三模式通用continuous/restored验证工厂；
- Race完整世界纵向恢复场景与具体runtime分叉；
- Survival完整世界恢复场景与具体runtime分叉；
- Duel具体runtime完整checkpoint导出与分叉。

V1反馈/内容选择等历史窄能力继续使用其原合同；V2供给水位接口继续保留，作为兼容入口。它们不得再被描述为正式完整runtime恢复身份的最高版本。

### 5. 不借V3冻结未决玩法值

V3只证明恢复前后Mode Driver内容相同，不证明内容已经平衡批准。Race/Survival hard limit、重生保护最终平衡、敌人上限及其他未决值继续保持`not-run / not-approved`；默认Registry、Composition与Entry继续断开。

## 未采用的方案

### 只依赖config的Mode Policy content hash

config不能完整覆盖Race/Survival fixture中的安全锚、压力阶段、slot、tier和hard limit，也不能证明Duel调用方提供的完整Bundle未漂移。

### 把Mode内容复制进V1或V2

会改变既有checkpoint合同并扩大兼容风险。V3嵌套V2能保留已有身份和水位语义，同时明确新能力边界。

### 在authority restore之后再检查

这会让非法Mode内容先触碰、捕获甚至改变外部资源，破坏恢复前失败关闭和精确所有权。

### 把Mode内容写进Replay V6

Replay已通过config、规则与终局身份表达比赛结果；本缺口只存在于运行时中途恢复调用，不应扩大终局产品合同。

## 影响

- Runtime完整checkpoint身份从“世界+历史+供给水位”扩展为“世界+历史+供给水位+标准化Mode Driver内容”。
- 三种模式具体runtime都公开V3导出/分叉入口，保持完整恢复端口对称。
- P2/P3治理清单和不可达扫描登记V3文件、导出与符号。
- 新增未运行反证源码：畸形V3在authority capture前拒绝；Race fixture内容漂移时替换authority保持零观察。
- 所有测试、类型、构建、压力、性能、设备和真人证据继续顺延，不能据此把P2/P3门标绿。

## 回滚

在默认产品路径仍关闭时，可按以下顺序独立回滚：

1. 将三模式完整恢复调用方切回V2或原V1窄能力；
2. 删除具体runtime的V3导出/分叉方法；
3. 删除V3 checkpoint、Runtime V3导出/恢复和Driver内容hash getter；
4. 撤回P2/P3治理登记与未运行测试源码。

回滚不得删除V1/V2既有合同，不得修改Replay/Result schema，也不得以回滚为由把未决Mode数值写成默认值。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：正式Mode与Policy Definition边界。
- [ADR-118](118-arena-v2-development-first-deferred-validation-window.md)：开发优先与延期验证窗口。
- [ADR-119](119-arena-v2-continuous-development-with-deferred-gates.md)：连续开发与集中门禁。
- [ADR-120](120-arena-v2-survival-first-respawn-single-source-candidate.md)：Survival首次复活单一候选。
- [ADR-121](121-arena-v2-race-respawn-single-source-candidate.md)：Race重生单一候选。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
- [P3实施状态台账](../architecture/arena-v2-p3-implementation-ledger.md)。
