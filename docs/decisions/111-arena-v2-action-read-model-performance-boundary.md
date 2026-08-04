# ADR-111：Arena V2 Action Read Model 性能边界

## 状态

`design-preaudit-approved / coordinator-approved / formalGate=false`。PA3a、PA3b、PA4a、PA4b-1、PA4b-2 与 PA4b-3 均为 `completed / coordinator-approved / formalGate=false`，PA4b-3 评分 `96/100`。PA5a、PA5b 与 PA5c 均为 `completed / coordinator-approved / formalGate=false`（各 `96/100`），PA5d 为 `completed / coordinator-approved / formalGate=false`（`94/100`）；PA5 总门已冻结。PA6-P Presentation async boundary hardening 已为 `completed / coordinator-approved / formalGate=false`（`95/100`）。PA6 runner 为 `implementation-candidate / coordinator-correctness-approved / formalGate=false`，尚缺清洁环境 ABBA×3；PA7 正式性能/formal300、设备、美术与 commit/push 继续关闭。

## 日期

2026-07-30

## 背景与固定证据

Arena V2 的正式生存 Bot pressure 已完成 `300 cases / 120 unique seeds` 的功能性执行，
`executionPassed=true`，事件、边界、确定性、Replay、资源上限和精确
`EquipmentDespawned(reason=supply-lifecycle-expired-held-drop)` 覆盖通过；唯一正式硬门失败是
Runner CPU P95 `0.2550948ms/tick`（最坏 `0.4697884ms/tick`），高于不可下调的
`0.25ms/tick`。P50/P99 没有可靠证据，不能推算。正式运行身份为：

- `formalRequest=true`、`formalGateEligible=true`、`formalGatePassed=false`；
- canonical/executed ticks `743427/1486854`，events `22507/45014`；
- unique final/trace hashes `300/300`；
- heap `8780840/33554432`，world/runtime/active 峰值 `3/5/3`；
- result manifest `065d94bb`、evidence `d50cc8fd`、manifest `6de153b1`。

D0–D7 的只读或临时镜像实验均未落仓库。D1–D6 的单项/结构候选均 no-go；D7
组合 A+B+C 虽然 strict parity 与失败关闭通过，六轮前 20 case 的 combo P95 为
`0.27149/0.25451/0.26801/0.25775/0.26219/0.25824ms/tick`，平均
`0.26203ms/tick`，process 平均回收 `10.23us/tick`，三组回收
`11.05/9.29/10.34us/tick`，未满足稳定门。因此不能靠重跑挑绿、减少审计、降低
tick/case/action、改变统计分母或下调预算通过。

当前每个 authority tick 的 public snapshot 为每个 participant 物化完整
`actionAffordance`；`ActionAffordanceProjector` 对
`primary`、`primaryHold`、`jump`、`slam` 做四个独立 Resolver probe，`canAct=false`
时另做 display primary probe。该字段是派生读取模型，不进入 Replay V5 或 internal
state hash，但 Bot observation、Product Presentation/InputMapper、projection、合同审计
和多类测试都依赖它。规则裁决的唯一来源仍是 `RuleEngine/ActionResolver`。

## 决定

采用一个分离的 public read model：

1. **C：分离 world public snapshot、local presentation sidecar 和 Bot trusted
   observation**。Bot 只读取它当前决策需要的 mobility profile；Presentation 只查询本地
   participant 的 context profile；完整四通道仍由固定 audit schedule 验证。
2. **B：owner-bound、固定 profile、零参数 reader**。Composition 时将 reader 绑定到
   具体 Core/authority generation、participant、profile 和正式 composition content hash；
   `read()` 不接受调用方传来的 tick、eventSequence、participant 或 channel，避免 TOCTOU
   和每 tick 参数规范化。Bot 不导入或持有 `MatchCore`/`Session`。
3. **D：Resolver multi-intent/decision-table**。同一 participant、同一 tick 的四个
   *独立假设 intent* 共享一次经过严格校验的 immutable prepared context，再分别求值；
   authority 多通道输入和只读 preview 使用同一 evaluate 算法，不复制选择规则，不把四个
   probe 合并成一个同时按键输入。

  以下 C+B+D 结论属于本 ADR 作出时的历史设计语境：当时它是待分阶段实现的候选架构，
  不是当时已实现的性能优化；当前实现状态以本文顶部状态及后文 PA3–PA5 阶段记录为准。它不同于：

  - **A revision 增量 read model**：targeting 依赖位置、状态、cooldown、movement
    capability 和 held equipment 等高频变化，revision 大概率每 tick 失效，不能作为首选；
  - **D1**：只复用 prepared context/局部缓存，但仍逐 probe 调用完整 resolve，未形成同一
    decision-table；
  - **D3**：只在外层批量调用，仍逐次 full resolve，没有共享内部求值算法；
  - **D5**：只减少 outcome 物化，没有解决四次独立判定的重复准备。

### 固定 profile reader 合同

reader 是只读、不可伪造的内部 capability。其实现必须以模块私有 owner record/WeakMap
绑定，而不是公开 token、`Object.freeze`、`instanceof` 或任意全局 mark：

| profile | 绑定 participant | 允许读取 | 使用者 |
|---|---|---|---|
| `local-context-primary` | 本地 participant | `primary`、`primaryHold` | Product Presentation/InputMapper |
| `bot-mobility` | 当前 Bot participant | `jump`、`slam` | Bot trusted observation |
| `full-audit` | 一个配置 participant | 四个独立 channel，必要时 display fallback | 固定 audit schedule/验证器 |

`read()` 无参数，只返回与当前 owner、authority tick、eventSequence、phase/generation
匹配的递归冻结 plain-data。reader capability 本身可在整个 match 生命周期内复用；下一
tick 同一个 reader 可以读取新结果，旧 sidecar 不能冒充新 tick。reader 不能跨 Core、跨
composition contract 或跨 generation 读取；step 正在写入时拒绝读取，异常、destroy 或
非法 ended 转换均 fail closed。paused/ended 且 authority identity 未变时，重复 `read()`
返回同一个只读 memo；reader 不是 single-use capability。对外的旧严格入口保留
accessor/Proxy/unknown key/Symbol/稀疏数组/Map/Set/typed array/cycle 等拒绝语义；trusted
reader 不能接受调用方提供的“已验证 actors/candidates”数组。

### ADR 作出时的历史建议 read-model 合同（当前实现状态以顶部及后文阶段记录为准）

本节保留 ADR 作出时的建议合同，不代表当前代码仍未实现，也不单独决定当前阶段状态。

`MatchReadFrameV2` 是独立于现有 `ArenaMatchSnapshot` 与 internal state hash 的新公共
schema。它不会在没有批准的迁移前替换旧接口：

```ts
interface MatchReadFrameV2 {
  schemaVersion: 2;
  worldSnapshot: ArenaWorldSnapshotV2;
  localActionSidecar: LocalActionSidecarV2;
}

interface LocalActionSidecarV2 {
  schemaVersion: 2;
  tick: number;
  eventSequence: number;
  participantId: string;
  profile: "local-context-primary";
  primaryActionDefinitionId: string | null;
  channels: {
    primary: ActionAffordanceView;
    primaryHold: ActionAffordanceView;
  };
}

interface BotTrustedObservationV2 {
  schemaVersion: 2;
  currentTick: number;
  currentEventSequence: number;
  world: DelayedWorldSnapshot;
  botMobility: {
    participantId: string;
    profile: "bot-mobility";
    tick: number;
    eventSequence: number;
    channels: {
      jump: ActionAffordanceView;
      slam: ActionAffordanceView;
    };
  };
}
```

`worldSnapshot` 保留当前 world、tick、activeTick、eventSequence、phase、participants、
equipment、activeSupplyProjection、map、result 等已审计字段，但不再把 generic
`actionAffordance` 作为其中每个 participant 的必算字段。`ActionAffordanceView` 只保留
当前 `ActionAffordanceOutcome` 已有的 kind、actionDefinitionId、lane、source、reason；
`primary`、`primaryHold` 是 `channels` map 的 key，不向 outcome 新增 `channel` 字段，
字段顺序与稳定排序不变。`primaryActionDefinitionId` 沿用现有 frame projector/HUD 所需的
primary action identity：正常可行动时来自 primary outcome，`canAct=false` 时由 Rule/Core
内部独立求值 display-primary fallback，仅用于填充这个聚合 identity；旧 public 合同不向
外部公开第五次 probe 的完整 kind/lane/source/reason。`local-context-primary` 因此可能执行
primary/primaryHold 加条件 display probe，但 sidecar 只发布旧合同已有的
`primaryActionDefinitionId`。不得发明 `match-ended` 等新 reason。sidecar 只读、plain-data、
递归冻结，不持有 authority 引用。

`MatchReadFrameV2` 的 local participant 在正式 `LocalMatchSession`/Product 路径中必然
存在，因此 `localActionSidecar` 非 nullable，缺失即 fail closed。显式无本地 participant
的 headless/world-only 读取若未来需要，必须另定义命名清晰的 world-only contract；不得让
生产路径用 null 静默掩盖 local action 缺失。

Bot 的时间语义是硬合同：当前 Bot self 和 `bot-mobility` sidecar 使用当前 command
state；opponent/world/equipment/map 按现有难度使用历史 delayed snapshot。不能将 Bot
mobility sidecar 随 opponent/world 一起延迟，也不能用未来的 channel 查询拼入历史帧。
同 seed、同输入的 parity 必须逐 tick 比较 InputFrame、events、checkpoint/final hash、
Replay V5 和最终结果；read-model 迁移另做 full recomposition differential，但只比较旧
公开合同已有的 `primaryActionDefinitionId`，不比较不存在的 display-primary outcome。

### Resolver multi-intent 合同

D 的 owner/read envelope 在 reader/Core 边界验证 Core、generation、tick、eventSequence
和 phase；这些身份校验不属于 Resolver 的裁决输入。Resolver prepared context 只复用
当前已有规则输入：tick、participantId、canAct、candidates、occupiedLanes、
activeConflictTags 以及 Definition lookup 结果。四个 probe 仍是四个独立规范 intent：
`primary`、`primaryHold`、`jump`、`slam`；它们必须逐个求值，保持独立按键下的 lane/conflict
语义。`canAct=false` 的 display primary fallback 也要按旧语义单独求值。

authority 的真实多通道 InputFrame 仍走同一个 `evaluateCandidate`/decision-table 算法，
但 preview 不写 authority、不推进 RNG/tick、不产生命令/事件、不缓存裁决结果。重复、乱序、
未知 participant、旧 tick/eventSequence、accessor/Proxy/额外键和跨 Core context 都在
准备阶段拒绝或回退完整严格路径，不能把 prepared context 变成绕过 resolver 的公开捷径。

## 完整消费者迁移矩阵

下表是 PA0 固化的生产、隔离研究、测试和脚本清单。`full` 表示当前使用完整
`actionAffordance`，`selected` 表示只读取少数 channel；“迁移结论”是实现后的唯一去向，
不是当前代码已迁移的事实。

### 生产包

| 消费者 | 现在的读取 | 频率/权威性 | 迁移结论 |
|---|---|---|---|
| `arena-core/src/action-affordance.ts`、`arena-core/src/arena-rule-engine.ts` | 四 probe + display fallback | 每 public snapshot；规则派生，非 hash | PA1 保留唯一 evaluate/preview 来源，PA2 提供 Core read port |
| `arena-match/src/match-core.ts` | 每 participant 组装 full snapshot | 每 tick；Core 只读派生 | PA2 改由 world + sidecar/read frame 组装，保留 full-audit 入口 |
| `arena-contracts/src/match-snapshot.ts` | public schema/audit 要求 participant action 字段 | 架构合同，非 authority | PA2 新增独立 V2 合同；旧 schema 仅迁移期 allowlist |
| `arena-bot/src/bot-observation.ts`、`bot-mobility-policy.ts`、`bot-controller.ts` | self/current 与 delayed world 混合；实际 mobility 读 jump/slam | 每 Bot tick；只输出 InputFrame | PA3a 切换为 V2 trusted observation：current self + current jump/slam；Bot 不依赖 Core/Session |
| `arena-session/src/local-match-session.ts` | pre/post `core.getSnapshot()`，创建 Bot input 与 step | 每 tick；session 编排 | PA3b 让 Bot 生产路径在 pre-step 走绑定 reader bundle；post legacy snapshot/result 留 PA4/PA5，禁止 callback 半 tick 回读 |
| `arena-match/src/replay.ts` | beforeStep full snapshot callback；V5 记录 input/events/checkpoints | 每回放步；authority evidence | PA5 保留 V5，full snapshot 仅 verifier/audit allowlist，不作为生产 Bot 主路径 |
| `arena-product-match/src/product-match-runtime.ts`、`product-match-coordinator.ts` | clone/forward full snapshot | 每产品 step/暂停/结果 | PA4 改 forward `MatchReadFrameV2`，结果/暂停使用稳定 terminal frame |
| `arena-product-session/src/product-session-controller.ts` | begin/step/getActiveMatchSnapshot | 每产品调用 | PA4 迁移到 read frame，旧 full getter 进入过渡 allowlist |
| `arena-product-presentation/src/product-match-presentation-runtime.ts`、`product-presentation-flow.ts` | local action + snapshot start/step | 每产品 step；表现只读 | PA4 仅读 local sidecar；不在 callback 临时读 Core |
| `arena-presentation-runtime/src/arena-input-mapper.ts`、`input-sampler.ts` | primary/primaryHold，连续按压 | 每输入采样；表现输入 | PA4 读取 local sidecar，保留 tick/participant 校验与连续按压语义 |
| `arena-v1-presentation-content/src/arena-frame-projector.ts` | local actionView 读 primary/primaryHold；participantView 不裁决 | render/read；表现只读 | PA4 使用 local sidecar；participant world 仍来自 world frame |
| `arena-input-pilot/src/input-pilot-metric-collector.ts` | primary/primaryHold metrics | 采样；非 authority | PA5 迁移 selected local profile或仅测试 allowlist |

### 研究、隔离包与测试

| 消费者 | 读取/性质 | 迁移结论 |
|---|---|---|
| `arena-v1-greybox-session` | local actionAffordance；研究/灰盒 | 仅保留隔离适配器；不得进入生产交付清单 |
| `arena-v1-experiment` | movement invariant；研究/测试 | 仅测试保留，不能成为新 read-model 依赖 |
| `arena-contracts/test`、`arena-presentation-runtime/test`、`product-presentation/test` | schema、InputMapper、表现边界 | 保留旧合同负向测试；新增 V2 differential，不删除失败关闭矩阵 |
| `tests/arena/arena-rule-engine.test.ts` | Resolver/affordance authority | PA1 增加 authority/preview parity；不改裁决顺序 |
| `tests/arena/bot-mobility.test.ts`、`bot-observation.test.ts` | Bot self/delay/selected channels | PA3 覆盖 current self + delayed opponent/world 与 reader binding |
| `tests/arena/match-core-equipment.test.ts`、`match-core-movement.test.ts` | full snapshot、equipment/动作边界 | PA2/PA4 做 full recomposition differential；普通 1v1 保持 |
| `tests/arena/input/*`、`presentation/*`、`product/*` | InputMapper、产品 Session/Presentation | PA4 迁移字段级断言；不把视觉测试当作 authority 证据 |

### 脚本与证据

| 脚本/库 | 当前职责 | 迁移结论 |
|---|---|---|
| `scripts/arena-formal-survival-bot-pressure.ts` | formal fixed plan、Bot、projection、full evidence/hash | PA5 使用 V2 readStep；full-audit schedule 计入 step，外层 evidence hash 单列 |
| `scripts/arena-match-stress.ts`、`arena-survival-supply-stress.ts` | 前者消费 Experiment `SimulationSnapshot`，后者执行 authority stress/资源边界 | 前者同名 `simulationCase.getSnapshot()` 明确排除/不改；后者迁移到显式 full-audit/research API，不减少资源/边界验证 |
| `scripts/arena-input-fuzz.ts` | 直接 affordance/action 输入 fuzz | PA1 保留 authority fuzz；PA5 增加 reader/preview fuzz，不绕过 Resolver |
| `scripts/arena-survival-golden-replay.ts` | survival Replay 生成 | Replay V5 不变；public evidence 更新必须经 V2 generator/批准 |
| `scripts/lib/arena-human-fairness-evidence-verifier.ts` | Replay artifact/verifier | 仅 verifier allowlist；不成为生产读模型 |
| `scripts/lib/arena-regression-evidence-producer.ts`、`arena-stage9-release-producers.ts` | 证据编排/manifest | PA5 更新 measurement schema 与证据 manifest，不移除 authority parity |
| `scripts/arena-presentation-session-soak.ts`、`arena-product-presentation-session-soak.ts` | 产品表现 soak | PA4/PA5 使用产品 read frame；仍隔离渲染/平台证据 |
| `scripts/arena-product-session-stress.ts` | product session state | PA5 使用 V2 frame，保留暂停/结束/资源证据 |
| `arena-human-match` verifier | 不直接读取 actionAffordance，使用 Replay evidence | 不迁移 action 字段；只接版本化 manifest |

## 时序与状态机

单一 `readStep` 拥有一次可观察读取边界；Bot、Presentation callback 不得在半 tick 中回读
Core。所有 mandatory sidecar query 与该 tick 的 full audit 都在 `readStep` 的计时范围内。

| 状态/时序 | Core authority identity | 允许的读取与拥有者 | 失败/生命周期语义 |
|---|---|---|---|
| 初始 tick 0 | generation、tick=0、eventSequence、phase 由 Core 创建 | Composition 绑定 readers；Session 生成 world/local/bot frame | contract/content/participant/profile 不一致在任何 history/RNG 前拒绝 |
| 正常 `t→t+1` | step 开始锁定旧 identity；提交后生成新 tick identity | 先读取/复用 current player+bot sidecar；玩家 InputMapper 或 formal plan；Bot input；Core step；post world/local/bot sidecar；固定 full audit | reader 在 authority 写入区间拒绝；输入错误在 mutation 前拒绝；中途异常 fail closed、清理 Session 自有资源 |
| paused step | Core tick/eventSequence/phase/generation 不自动改变 | 返回当前稳定 frame；不能假定 pause 改变 cache identity；InputSampler reset 是 Presentation 生命周期 | paused 非法输入不改变 Core；resume 前不推进 tick |
| resume 但尚未推进 | 与 paused 相同的 authority identity | 允许复用同一 frame；不得以“resume”虚构失效 | 只有实际 Core identity/generation 变化才失效 |
| ended | 终局 identity 固定 | terminal world/sidecars 稳定读取；按旧 ParticipantSystem 实际状态逐 participant 重组 | 不能把结束态统一写成 `canAct=false`：winner 仍 active 时沿用旧 Resolver 的 selected 输出，淘汰者才可能是 `participant-unavailable`；`primaryActionDefinitionId` 在不可行动时由内部 display-primary fallback 填充，外部只做该聚合 identity 的 differential；不得发明 `match-ended` reason；进一步 step 明确拒绝 |
| destroy | generation 递增并清空所有私有 owner record | 无 reader 可读；不泄漏跨 match 数据 | destroy 幂等或明确拒绝，重复读/重入/跨 Core 均 fail closed |

当前实现事实要求的 ended fixture 必须在 PA2/PA3 锁定：`preparing/running/sudden-death/ended`
分别从旧 ParticipantSystem/Resolver 取得实际输出；不能用全局 canAct 假设替代逐字段
differential。

## 审计 schedule 与计时合同

`measurementSchemaVersion=2` 只属于 formal measurement/evidence report，不是
`MatchReadFrameV2.schemaVersion`。正式 `readStep` 的计时从读取/复用当前 player+bot sidecar
开始，覆盖：

1. current player+bot sidecar 读取或安全复用；
2. 玩家输入生成（formal 为固定输入计划，产品为 `InputMapper`）；
3. Bot input 生成；
4. `LocalMatchSession.step`/Core authority step；
5. post-step world、local sidecar、Bot sidecar；
6. 该 tick 的 full-audit schedule。

循环外的 evidence hash 可独立计量，但任何 action query 都不能移到 `cpuStart/cpuUsage`
范围外。固定 full audit 点如下，按 identity 去重；每个 audit 点都对全部配置 participant
执行 `full-audit`：

- tick `0`；每 `60` tick；每次 phase transition；
- `599/600/601`、`1199/1200/1201`、`1799/1800/1801`、`2399/2400/2401`；
- `MatchStarted`、`EquipmentSpawned`、`EquipmentPickedUp`、`EquipmentDropped`、
  `EquipmentDropFallback`、`EquipmentReplaced`、`EquipmentRecycled`、`EquipmentExpired`、
  `EquipmentDespawned`、`ActionStarted`、`HitResolved`、`KnockbackApplied`、
  `DownSmashLanded`、`PlayerEliminated`、`PlayerRespawned`、`SuddenDeathStarted`、
  `MatchEnded` 事件发生后的当前稳定 tick。

事件名必须以源码现有常量为准；若常量名称不同，schedule 使用其源码身份而不是创造
同义字符串。事件发生后的“当前稳定 tick”不是下一个 tick，也不是过滤后的历史事件。

审计分数必须同时有：全量 schedule 覆盖、sidecar 生产成本、普通 1v1 与 survival、2 人
正式配置和未来 4 人数据结构边界。`evidenceHash` 不得通过把 full audit 放到计时外获益。

## 三类等价证据与兼容迁移

迁移不要求新旧 public snapshot hash 字节相同，因为 action 字段由 full snapshot 拆到
sidecar，public read-model schema 会变化；也不能用更新 golden 掩盖 authority 漂移。必须
分开证明：

1. **Authority parity**：同 seed、同输入逐 tick 的 InputFrame、event/payload、Replay V5、
   checkpoint hash、final state hash、terminal tick/result 字节等价；authority hash 不加入
   派生 sidecar。
2. **Full recomposition differential**：`worldSnapshot + local/full sidecars` 按明确
   profile 重组旧 full snapshot，逐字段比较 actionAffordance、顺序、reason、lane、source、
   remaining/supply boundary 和递归冻结约束。
3. **Public evidence V2**：独立 `measurementSchemaVersion=2` 的 manifest/evidence hash，
   记录 full-audit schedule、read frame/schema 与覆盖。只有 ADR 批准 schema migration 后，
   才能用项目生成器更新 public evidence/golden；不能手填 hash或以新 manifest 隐藏旧行为。

Replay V5、authority input/event/checkpoint/final hash 不变。旧 `ArenaMatchSnapshot`
full-affordance getter 设为有期限迁移入口：PA2 引入 V2 合同；PA3 Bot 切换，PA4b
Product/Presentation 切换；PA5 仅允许 Replay verifier、full-audit validator、差分测试
和明确的历史/隔离脚本使用，并将旧入口重命名为
`getLegacyFullSnapshotForAudit`（或等价的显式名称）。PA5 的 architecture allowlist
禁止生产 Bot/Product/Presentation/Runner 主路径重新依赖旧 full getter；PA5 之后删除旧主
路径，而不是永久保留每 tick 双重重算。

普通 1v1 不注入 survival supply contract；它仍可在迁移期使用旧 full audit，但最终也需
通过同一 V2 profile 结构。Core/read-model 数据结构不得写死两名 participant；每个
composition participant 绑定一个 reader。P1 只验收现有 2 人；4 人生产 authority 与完整
性能矩阵属于 P2，不能把 2 人通过外推为 4 人通过。

## 安全、确定性与失败关闭

- owner record 绑定具体 Core/Equipment/Composition contract hash、participant、profile、
  generation、tick/eventSequence；不能靠调用者传入身份字段证明自己。
- 读期间禁止 Core 写入；相同 authority identity 下 paused/ended 重复读取是合法 memo hit，
  pause/resume 状态切换本身不使 memo 失效。只有 authority 写入中、非法生命周期转换、
  destroy 后、过期 result、跨 Core/owner/generation、旧 prepared context、未知/重复
  participant 或重复 participant/profile 绑定才拒绝或回退完整严格路径；reader 不是
  single-use capability。
- 外部严格 API 继续从 own data descriptor 安全读取，禁止 accessor/Proxy getter 副作用；
  plain object/array 之外的 Map/Set/Date/typed array、Symbol、cycle、稀疏数组、未知字段和
  非有限数均 fail closed。共享冻结子树可以复用，但不把 `Object.isFrozen` 当作递归证明。
- sidecar、world frame、preview result 只能是递归冻结 plain-data；不得暴露 runtime、
  mutable array、RuleEngine、Session、Replay 或 renderer 引用。
- owner/contract 绑定失败必须发生在 Bot history/RNG/InputFrame 提交之前；同 tick 修正输入
  可安全重试，不能留下半 sidecar、半事件或半 Replay。Composition 构造失败按既有 ownership
  合同只销毁自身创建的 runner/资源，不双销毁调用方 Core/Bot。
- 规则/Resolver 的排序、冲突、resource、position、cooldown、equipment、failure reason
  和随机消费不改变。read model 不进入 authority state/hash；Replay 回放重新执行并验证
  sidecar 与 full-audit schedule。

## 性能门与可证伪实验

PA6 的前 20 case 必须做至少三组交错 ABBA，每组包含 warmup 后的独立测量；D/C 分别消融，
组合才是候选。硬门是：每组 P95 `≤0.225ms/tick`、稳定回收至少 `30.1us/tick`（从
`0.2550948` 到 `0.225` 的最低数学差距）、process CPU 同向，且 authority/full
recomposition/失败关闭全绿。不能把 nested inclusive 成本相加，不能把 evidence hash、
Replay verifier 或循环外测量从正式 `readStep` 口径中静默移除。

正式 PA7 仍要求 `≤0.25ms/tick`、300/120、完整 Node/Vitest/architecture/typecheck/lint/
build/coverage/资源/事件/Replay 与三端/真机适用硬门；所有评分维度均至少 80%，总分至少 90
才可候选。CPU 未过时 status 必须保持 formal-failed/formalGate=false。

## 阶段与提交边界

| 阶段 | 允许范围 | 退出证据/禁止项 | 提交边界 |
|---|---|---|---|
| PA0 文档 | ADR-111、P1 台账、索引 | 仅设计固化；不改生产/测试/runner/golden | 本轮文档验收后由主协调决定 |
| PA1 Rule multi-intent | `arena-core` Rule/Resolver 与定向测试、架构规则 | 同算法 authority/preview parity；不改 MatchCore/Presentation | PA1 独立验收后才可提交 |
| PA2 Core contracts/readers/read frame | contracts、arena-match/Core、受限边界测试 | owner-bound zero-arg、原子失效；不接 Bot/Product 主路径、不改 Replay | PA2 独立验收后才可提交 |
| PA3a Bot observation/controller contract | `packages/arena-bot/src/bot-observation.ts`、`bot-controller.ts`、`bot-mobility-policy.ts`、必要 index/type 与 Bot 定向测试/架构 | `BotObservationV5`、current self/current jump+slam、delayed opponent/world；旧严格入口只作 differential；不依赖 Core/Session/Replay | PA3a 独立验收后才可进入 PA3b；仍不接生产 Session |
| PA3b production wiring | `packages/arena-session/src/local-match-session.ts`、专用 `packages/arena-session/src/bot-match-read-bundle.ts`、`packages/arena-quick-match/src/quick-match-service.ts`、`packages/arena-v1-composition/src/quick-match-service.ts`、`packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`、必要 index/测试/架构 | outer composition 通过唯一 bundle factory 建立 PA2 binding/readers；Bot pre-step 不再调用 `core.getSnapshot()`；post legacy snapshot/result 留 PA4/PA5 | PA3b、PA4a、PA4b-1 与 PA4b-2 均已由主协调独立验收；不改 Core/Rule/Replay/hash/golden |
| PA4a Session readonly local-frame adapter | `arena-session` 的只读 post-frame adapter、bundle package-private helper 与 Session 定向测试 | 复用既有 bundle/frame reader，原子返回冻结 `MatchReadFrameV2`；不改 Product/Presentation 主路径、不重开 PA3 Bot 事务 | `completed / coordinator-approved / formalGate=false`；独立证据 12/12、159/159、全门禁全绿 |
| PA4b-1 Product V2 plumbing | `arena-product-match` runtime/coordinator/必要 ports/index、`arena-product-session` controller/必要 ports/index、对应测试/架构 | Product 只消费 Session 冻结 frame/step result；begin/current/step V2 管道不回 legacy snapshot、不创建 reader | `completed / coordinator-approved / formalGate=false`，评分 `96/100` |
| PA4b-2 InputMapper/Sampler/Router migration | `arena-presentation-runtime` mapper/sampler/router 与对应测试/架构 | 严格消费 LocalActionSidecarV2 两通道；不伪造 jump/slam、不改变连续按压语义 | `completed / coordinator-approved / formalGate=false`，评分 `96/100`；PA4b-3 亦已完成签核；PA5、性能、设备、美术与 commit/push 仍锁定 |
| PA4b-3 Product/Presentation main-path migration | `arena-product-presentation` runtime/flow/session/router、`arena-v1-presentation-content` frame projector、`arena-v1-application-session` composition 与对应测试/架构 | 生产主路径切换到 V2 frame/sidecar；不回读 Core/raw reader、不重投影 legacy；PA5 legacy 退出另行验收 | `completed / coordinator-approved / formalGate=false`，评分 `96/100`；PA5 legacy 退出另行验收 |
| PA5 文件级设计预审 | PA5a legacy 边界、PA5b 单一 bundle/readStep、PA5c Product/Session 旧 surface 退出、PA5d manifest/golden/evidence | 四门均已独立签核；PA5 read-model/API/evidence 边界冻结，不改 Replay V5/authority hash | PA5a、PA5b、PA5c 各 `96/100`，PA5d `94/100`；PA5 总门 `completed / coordinator-approved / formalGate=false` |
| PA6-P Presentation async boundary hardening | `packages/arena-product-presentation/src/product-input-router.ts`、`packages/arena-product-presentation/src/product-session-intent-dispatcher.ts`、`packages/arena-presentation-runtime/src/arena-impact-audio.ts`、`packages/arena-presentation-runtime/src/presentation-frame-loop.ts`、`packages/arena-presentation-runtime/src/presentation-asset-load-task.ts`、新增 `tests/arena/presentation/pa6-async-boundary-hardening.test.ts` | brand-first、no-hostile-then、no-unhandled；保持 Product/Session V2 合同与 authority/Replay/hash 不变；第二开发唯一所有 | `completed / coordinator-approved / formalGate=false`，`95/100`；独立于 ABBA，正式 CPU 计时期间仍须暂停测试/构建 |
| PA6 前 20 ABBA×3 | 仅治理/测试/临时 profile | 每组 P95≤.225、回收≥30.1us、process同向；不挑绿 | runner 正确性 `coordinator-correctness-approved`；清洁环境正式 ABBA×3 待完成，仍不可提交 |
| PA7 正式 300/120 + 完整回归 | runner、Node/Vitest、build/coverage/三端/真机 | 仍不降低预算、规模或审计 | PA7 全门验收后才可提交 |
| PA8 commit/push 候选 | 只整理已验收文件 | 需主协调明确授权；不得自行 commit/push | 主协调签核后才可提交/推送 |

每阶段实现前须保存带当前 `d750e4caa767332b5c3caaf247080b5717d56219` 与当前全部
dirty patch 的 `/private/tmp` 基线快照。回滚只允许对本阶段文件做反向 patch/删除新增文件，
不得 `reset`/`checkout`，不得覆盖 B1 或其它现有 dirty。阶段回滚点是“父提交 + 当阶段
精确 patch”，不是粗暴回到 d750e4c 丢失未提交成果。

## PA3 文件级设计预审与实现签核（PA3a+PA3b `completed / coordinator-approved / formalGate=false`）

本节保留 PA3 设计预审及后续实现签核的完整决策链；设计与生产接线均已完成，但不代表 P1 advance。
PA3 拆成最多两个可独立回滚的小门：先闭合 Bot observation/controller 合同，再接入普通
QuickMatch 与正式 survival composition。PA3a 与 PA3b 均已由主协调签核；PA4a、PA4b-1 与
PA4b-2 状态均为 `completed / coordinator-approved / formalGate=false`。PA4b-3 后续亦已由主协调
独立签核为 `completed / coordinator-approved / formalGate=false`；本节较早内容若记录候选实现与
开发证据，均以签核前历史时态保留。PA5、PA6/PA7、formal300、模拟器、美术与 commit/push
仍未授权。

主协调已独立签核本设计预审：评分 `96/100`（架构边界 `20/20`、行为等价 `20/20`、
生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、性能可证伪 `12/15`、迁移/回滚
`9/10`、治理 `5/5`），各维均达到 80% 以上。证据为文档检查 `265 Markdown/839 links/57
commands` 与 `git diff --check` 通过，以及 API 对照确认 bundle factory 是唯一创建入口、
Session 不消费 reader 槽位、PA2 输出不虚构 compositionHash/generation、V5 prospective/commit
顺序一致。PA3a 已完成并由主协调独立签核：评分 `94/100`（架构 `20/20`、行为 `19/20`、
生命周期/失败关闭 `15/15`、确定性/Replay `14/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、
治理 `5/5`）；独立证据为恶意矩阵 `6/6`、PA3a 专测 `7/7`、Bot 链 `44/44`、architecture
`45/45`、build `52/11`、type/lint/docs/diff 全绿。该签核记录 PA3a 完成并授权当时的 PA3b
implementation；随后 PA3b production wiring 已独立验收完成，PA4a Product/Presentation
已完成并由主协调独立签核，PA4b-1 Product V2 plumbing 也已完成并由主协调独立签核；PA4b-2
InputMapper/Sampler/Router 亦已完成并由主协调独立签核；该设计预审段记录当时 PA4b-3 尚未授权，最终签核状态见本节末；PA5、PA6/PA7、formal300、模拟器、美术与
commit/push 均未授权。

### PA3a：Bot observation/controller contract

#### 精确文件面与禁止项

允许文件仅为：

- `packages/arena-bot/src/bot-observation.ts`；
- `packages/arena-bot/src/bot-controller.ts`；
- `packages/arena-bot/src/bot-mobility-policy.ts`；
- 必要的 `packages/arena-bot/src/index.ts` 类型/运行时出口，以及为新观察类型必须调整的
  Bot 包内 type-only hunk；
- Bot 定向测试（包括 `packages/arena-bot/test/bot-foundation.test.ts`、专用
  `tests/arena/bot-observation-v5.test.ts` 等）与 `tests/architecture.test.ts` 的最小架构规则。

除非编译器证明某个 type-only 引用不可避免，否则 `bot-goals.ts`、`bot-map-navigation.ts`
不得修改；不得通过重写策略规则扩大本门。PA3a 禁止修改 `arena-core`、`arena-match`、
`arena-contracts`、`arena-session`、QuickMatch、survival composition、Replay V5、state hash、
formal runner、golden、Product/Presentation、Platform、ADR-110、production plan 和美术文件。
Bot 生产源码必须继续禁止 import/持有 `MatchCore`、`LocalMatchSession`、Replay 或 Renderer。

#### V5 观察合同与旧字段退出

PA3a 新增 `BotObservationV5`（schemaVersion 固定为 `5`）。升级是必要的：当前
`BotObservation` schema `4` 的 participant 含 generic 四通道 `actionAffordance`，而 V5
明确移除该字段，不能用同一个 schema 号静默改变 shape。V5 的最小精确字段为：

```ts
interface BotCommandSourceV5 {
  schemaVersion: 5;
  commandTick: SafeTick;
  commandEventSequence: SafeEventSequence;
  phase: ArenaMatchPhase;
  remainingTicks: SafeTick;
  self: BotParticipantObservationV5;       // current World V2 的 bot participant
  opponent: BotParticipantObservationV5;   // current World V2 的另一 participant
  botMobility: {
    schemaVersion: 2;
    tick: SafeTick;
    eventSequence: SafeEventSequence;
    participantId: string;
    profile: "bot-mobility";
    channels: { jump: ActionAffordanceViewV2; slam: ActionAffordanceViewV2 };
  };
  equipment: readonly BotVisibleEquipment[];
  map: BotRestrictedMapV5;                 // 仅公开字段，严格不含 privatePlan
}

interface BotObservationV5 {
  schemaVersion: 5;
  commandTick: SafeTick;
  commandEventSequence: SafeEventSequence;
  observedTick: SafeTick;                  // delayed source 的世界 tick；保留 schema 4 语义
  observedEventSequence: SafeEventSequence; // delayed source 的事件水位
  phase: ArenaMatchPhase;
  remainingTicks: SafeTick;
  self: BotParticipantObservationV5;       // current World V2 的 bot participant
  opponent: BotParticipantObservationV5;   // observationDelay 选择的 delayed history
  botMobility: BotCommandSourceV5["botMobility"]; // 始终 current
  equipment: readonly BotVisibleEquipment[]; // delayed world history
  map: BotRestrictedMapV5;                 // delayed world history
  arena: BotArenaView;
  actionRule: BotActionRule;               // current self rule
  opponentActionRule: BotActionRule;      // delayed opponent rule
  objectives: readonly DeepReadonly<unknown>[];
}
```

`BotCommandSourceV5` 是 Session 私有 adapter 的唯一产物：它只把同一 tick 的
`WorldSnapshotV2` 与 bot-mobility sidecar 投影为冻结 restricted source，不把 `matchSeed`、
`configHash`、`ruleContentHash`、`privatePlan`、Core owner 或 generic `actionAffordance`
带入 Bot 包。`BotRestrictedMapV5` 递归只含 ArenaMapSnapshot 的公开字段；出现 `privatePlan`、
未知字段或内部 occurrence 形状必须在 source 边界拒绝。正式 survival source 投影时，必须
先按 active-supply projection 合同验证 world 投影，再把 `remainingTicks` 从权威
`activeSupplyProjection` 派生到 `BotVisibleEquipment`；普通 1v1 的 projection 为 `null`，
对应 equipment 的 `remainingTicks` 只能为 `null`，不能从 generic equipment 字段猜测生命周期。

`BotParticipantObservationV5` 保留现有 participant 的状态、movement、position、velocity、
facing、equipment、action、hitstun/invulnerability/respawn 等字段，但不含
`actionAffordance`、`primaryActionDefinitionId`、`primary` 或 `primaryHold`。`self` 必须来自
当前 World V2；PA3a 只接收 package-neutral 的 trusted source 与同一 opaque handle identity，
并核对 PA2 实际输出中的 `tick`、`eventSequence`、`phase`、`participantId`、`profile`。PA3a
不创建、读取或证明 Core、原始 binding、composition provenance 或 lifecycle generation；这些
只能由 PA3b bundle factory 在生产接线时证明。当前 sidecar/frame 输出不含 `compositionHash`
或 `generation`，不得声称在每次 read 直接读取它们。
只允许策略读取 `jump` 与 `slam`。Bot 不得凭 V5 observation 伪造 primary、primaryHold 或
primaryActionDefinitionId，也不得把这些字段塞回旧 `BotActionAffordance`。V5 observation、
Bot adapter 和 Bot history 均不得携带 `matchSeed`、`configHash`、Core owner 或 Replay 引用；
这些只留在 Core/Session 的 opaque provenance 验证边界。

Session adapter 每 tick 只构造并冻结当前 `BotCommandSourceV5`；BotController 在验证 source
provenance 后用 prospective bounded history 选择 delayed source，最终构造 `BotObservationV5`。
因此 `self`、`botMobility` 始终取 current source；`actionRule` 从 current self participant
派生，`opponent`、`opponentActionRule`、`equipment`、`map` 取 delayed source；`arena` 与
`objectives` 来自 BotController 既有静态配置，不进入 source。不能把
mobility sidecar 跟随 opponent/world 一起延迟，也不能将未来 current self 或 future sidecar
拼进历史帧。`observedTick` 与 `observedEventSequence` 记录被选择的 delayed source 身份，
`commandTick` 与 `commandEventSequence` 继续记录当前 command 身份；这保留 schema 4 的
`observedTick` 合同并补足事件水位，便于 observationDelay/debug differential。历史
`BotObservation` schema 4、旧严格
`createInput(fullSnapshot)` 与旧 participant affordance 只保留为 migration differential 和
外部 strict fail-closed 入口，PA3a 生产 trusted 路径必须只消费 V5。schema 4 不得被 V5
调用方结构化 cast 绕过。

BotController history 只保留重建 delayed opponent/world/equipment/map 所需的冻结
`BotCommandSourceV5`，上界为 `observationDelayTicks + 2`（沿用当前有界策略）；不保存 Core、
Session、Replay、reader owner 或可变 authority 引用。提交顺序固定为：先验证 current source
与 bundle provenance，构造 prospective bounded history 并选择 delayed source；在不写 history、
不耗 RNG 的前提下完整构造并冻结 `BotObservationV5`，再允许 replan/RNG 与 InputFrame 提交；
只有这些步骤全部成功后，才 commit current source history 与 last identity。若已进入策略执行
后发生异常，Controller 必须销毁并 fail closed，不允许同实例继续；只有前置 source/provenance
验证失败才允许同 tick 修正重试。任何失败都不得发布半个 source 或半个 observation。

#### PA3a 失败关闭与测试矩阵

必须覆盖：

- V5 exact keys/schema、递归冻结、source mutation 不共享、unknown/future/accessor/Proxy/
  container/cycle/sparse/Symbol/non-finite 失败；合法 data-descriptor Proxy 仍保持 PA1/PA2
  的 getter=0 语义；
- package-neutral trusted source reader 使用同一 opaque handle identity；每次 read 精确核对实际
  输出的 tick/eventSequence/phase、participant/profile。fake/clone handle、不同 handle、wrong
  participant/profile、stale tick/eventSequence、phase mismatch 均在 history/RNG/InputFrame 前
  拒绝；PA3a 不测试或宣称 Core、原始 binding、compositionHash/generation、cross-Core 或
  wrong contract provenance，这些属于 PA3b 生产接线门；
- current self 不延迟、opponent/world/equipment/map 按 easy/normal/hard 的既有 delay；
  `primary`/`primaryHold`/`primaryActionDefinitionId` 缺失且不被 fallback 伪造；
- mobility policy 只读取 V5 `botMobility.channels.jump/slam`，实际四通道 legacy
  `actionAffordance` 不再进入策略；无装备、拾取、替换、普通掉落、expired-held 退役及
  599/600/601、1199/1200/1201、1799/1800/1801、2399/2400/2401；
- preparing/running/sudden-death/ended、winner active、淘汰者、paused/resume、重复 destroy；
  稳定 identity 可重复读，destroy 后拒绝；
- 同 seed/InputFrame 下 V5 trusted controller 与旧严格 controller 的 InputFrame、events/
  payload、checkpoint/state hash、Replay V5、terminal result differential；不同 observation
  delay 只比较定义的不变量，不错误要求 hash 相同；
- 注入错误 profile、异常 reader、history/RNG 提交前失败以及同 tick 合法修正重试，证明
  失败轮不增加 history、不消费 RNG、不发布 InputFrame，下一次合法调用可恢复。

PA3a 不运行 formal 300、PA6/PA7 CPU 或模拟器；性能可证伪维度只记录调用边界和未来 PA6
readStep 归属，不以 Bot 定向测试冒充性能通过。

### PA3b：普通 QuickMatch 与正式 survival production wiring

#### 精确文件面与真实路径

允许文件为：

- `packages/arena-session/src/local-match-session.ts` 及其必要 `packages/arena-session/src/index.ts`
  类型/option hunk；
- 新增 `packages/arena-session/src/bot-match-read-bundle.ts`，仅承载 provenance-protected
  bundle factory 与其 package-private 类型；
- `packages/arena-quick-match/src/quick-match-service.ts` 及其必要 index/定向测试；
- `packages/arena-v1-composition/src/quick-match-service.ts` 仅在 V1 adapter 的默认转发需要
  显式传递 PA2 descriptor/bundle 时修改；如果它只转发 `QuickMatchService` 且不需要字段转换，
  则保持不改，并用测试/架构证据记录“不改”的理由；
- `packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`、其必要
  index/定向测试；
- `tests/arena/session*`、`tests/arena/quick-match*`、`packages/arena-session/test`、
  `packages/arena-quick-match/test`、`packages/arena-v1-composition/test` 与
  `tests/architecture.test.ts` 的最小接线/治理断言，以及 PA3 ledger hunk。

PA3b 禁止修改 `packages/arena-match/src/match-core.ts`、`match-read-*`、Rule/Resolver、
contracts、equipment/timeline、Replay V5、state-hash、golden、formal pressure runner、
Product/Presentation/InputMapper、Platform 与美术文件。若现有 PA2 API 不能完成安全接线，
必须停在设计阻断并另开 PA2 修订，不得在 Session 复制 Resolver 或偷偷调用旧 full snapshot。

#### 创建顺序、所有权与 opaque provenance

两条生产路径都采用相同顺序，只有 composition descriptor 内容不同：

1. `arena-quick-match` 在 Core factory 成功后，由 QuickMatch composition/service 读取已验证
   Core config，构造并冻结 descriptor：`schemaVersion=1`、稳定 `compositionId`、精确
   `participantIds`、`mapDefinitionId`、`contentSelectionHash`，ordinary 的
   `compositionContractHash` 显式 `null` 或省略。建议锁定的普通标识为
   `arena-quick-match.v2`；`arena-v1-composition/src/quick-match-service.ts` 若只是适配器，
   不重复计算、不改写 descriptor。
2. 正式 survival composition 以官方 `ARENA_V2_SURVIVAL_SUPPLY_DEFINITION`、冻结且已审计的
   spawn specs、Bot profile/participant role 合同构造非空的正式
   `compositionContractHash`，不得使用 deadbeef、调用方自报或普通 1v1 null 语义。建议锁定
   `compositionId=arena-v2-survival-supply.v1`；Core 只校验格式并把 hash 纳入 composition
   identity，survival composition 自身负责证明其 Definition/registry/spec 语义一致。
3. outer root 不直接调用任何 binding/reader API；它只把自有的新 Core、冻结 descriptor、本地
   participant ID、Bot participant ID，以及 survival 时已验证的 projection contract 交给
   `arena-session` 的 `createMatchReadBotBundleV2({ ownedNewCore, descriptor, localId, botId,
   projectionContract? })` 一次。ordinary 的 contract 为显式 null/省略，formal survival
   必须是正式非空 contract。这样 bundle factory 成为唯一生产入口，Session 从头到尾不调用
   `createMatchReadBinding` 或任何 reader API。
4. `createMatchReadBotBundleV2` 是唯一调用 `core.createMatchReadBinding`、local frame reader
   与 bot sidecar reader 的位置；它依次构造并校验全部候选，只有全部冻结成功后才发布 opaque
   `MatchReadBotBundleV2`。现有三个 Core API 没有跨调用的回滚原子性：中途失败可能已经消耗
   binding/reader slot，因此 factory 必须将该 Core 标记为不可复用并立即交还 outer owner
   销毁，不能尝试重建或继续使用。成功 bundle 不能被 clone、Proxy 或跨 Core 复用。
   `LocalMatchSession` 只验证并 attach 该 bundle，不创建 reader、不消费 slot；BotController 与
   Session 收到同一 bundle identity，但 Bot 包只看到 package-neutral 的 restricted source/
   opaque trusted handle，不持有 Core、Session、Replay 或 raw PA2 binding。PA2 当前没有独立
   world-only reader，因此 bundle adapter 使用 local frame 的 current World V2 作为 world source，
   但永远丢弃 local primary/primaryHold，不将其传给 Bot；后续若需要 world-only reader 必须
   另立小门。
5. Session 私有 adapter 在同一 read transaction 内读取 world/frame 与 bot sidecar；bundle
   创建时已证明同 Core、原始 opaque binding、compositionHash 与 lifecycle generation。每次
   read 只核对 PA2 实际输出中的 world/local/bot `tick`、`eventSequence`、world `phase`、
   participant/profile；当前输出没有 compositionHash/generation，不能虚构逐 read 字段。它
   先构造当前冻结 `BotCommandSourceV5`，再交给 BotController 的 trusted observation
   attach/input 入口；任何 identity 不一致、reader stale 或 world/mobility 混帧均 fail closed。
6. 每个 tick 的 pre-step 顺序是：读取/复用同一 identity 的 world + current mobility，Session
   构造当前 `BotCommandSourceV5`；BotController 用 prospective history 选择 delayed source，
   在不写 history/不耗 RNG 下构造并冻结完整 V5；V5 成功后才允许 replan/RNG，并生成、严格
   归一化 Bot InputFrame。只有策略与 InputFrame 阶段全部成功后，才 commit source history、
   `lastCommandTick`/`lastEventSequence` 并返回。玩家输入与 Bot 输入随后在 Core trusted batch
   入口完成既有严格验证，最后才提交 authority step。PA3b 禁止 pre-step `core.getSnapshot()`；
   策略或 InputFrame 阶段异常必须销毁 Controller，不支持同实例继续或同 tick 重试。
   post-step legacy snapshot/result 仍可保留在当前 LocalMatchStepResult，明确留给 PA4/PA5
   迁移，不得把 post legacy 保留误写成 Bot trusted 路径完成。

所有权边界固定为：Core 创建并失效 binding/readers；outer composition 在自己新建且拥有的 Core
上调用 bundle factory，并在 bundle/Session/Bot 成功发布后移交同一 opaque bundle；Session 只
attach/持有 bundle，不创建或替换 reader slot；Bot 只持有 restricted source、trusted handle
与 bounded history，不持有 Core/Session。bundle factory 失败时不发布 binding/bundle/Session，
outer composition 负责销毁这次新建的 Core；若 Core 是 caller-owned，不能把失败清理责任转移给
Session。Session 构造失败不会新增 reader slot，且不接管或销毁调用方 Core/Bot；外层 composition
按 ownership 各清理一次。Core destroy 使所有 reader 失效，重复 destroy 幂等，不允许 reader
replacement 或重复 participant/profile 槽位。

普通与 survival 的 handshake 失败规则也固定：失败发生在任何 Bot history/RNG/InputFrame
提交前；bundle factory 必须先在完整候选 binding/readers 构造冻结且互相核对成功后才发布 opaque
bundle，任一步失败不消耗 Session 额外 slot、不发布半 bundle。因为两条生产路径的 Core 都由
outer composition 新建并拥有，factory 失败后由 outer composition 销毁该 Core；不得向
caller-owned Core 伪装转移所有权。bundle 成功后 Session attach 失败仍不新增 slot，outer
composition 清理新 Core/bundle 一次。成功 Session 内的单 tick read/provenance 失败不改变
reader 槽位，修正输入可在同 tick 重试；Bot history/RNG/InputFrame 未提交前失败不产生半状态。

#### PA3b 生产 parity 与边界矩阵

ordinary QuickMatch 与 `createArenaV2SurvivalSupplyBotSession` 必须分别证明：旧严格
controller 与 V2 trusted controller 在同 seed/同 InputFrame 下逐 tick InputFrame、authority
events/payload、state hash、checkpoint、Replay V5、terminal tick/result 等价；full public
snapshot 的 post-step 结果仍只作为 PA4/PA5 migration differential。矩阵必须覆盖
599/600/601、1199/1200/1201、1799/1800/1801、2399/2400/2401、首波/后续波、pickup、
replacement、expiry、expired-held disposal、同 tick 竞争、paused/resume、ended winner-active、
淘汰、重复 destroy、非法/陈旧/cross-Core/fake binding 与同 tick 修正重试。两条路径都必须
证明 ordinary `compositionContractHash=null` 与 survival 正式非空 contract hash 的差异，不得
让普通缺失 contract 静默进入 survival trusted mode。

PA3b architecture 必须阻止 Bot 深导入 `arena-match`/Session/Replay，阻止 Session/QuickMatch
在 Bot pre-step 回读 `core.getSnapshot()`，阻止普通与 survival 任一路径绕过 binding/reader；
V1 quick-match adapter 若没有字段转换则保持无改动并锁定原因。PA3b 不修改 Replay V5、state
hash、golden、formal runner、性能阈值或事件语义。

### PA3a/PA3b 评分、门禁与精确回滚

每个小门独立使用 100 分表：架构边界 20、行为等价 20、生命周期/失败关闭 15、确定性/
Replay 15、性能可证伪 15、迁移/回滚 10、治理 5。候选条件为总分 `≥90` 且每维至少满分
`80%`；任一负向矩阵、ownership、parity 或架构门失败都保持 `candidate/formalGate=false`。
PA3a 的 performance 维只证明 read/observation 计时归属与不绕过验证，PA6 才测正式 CPU；
PA3b 也不得以 post snapshot 移出计时或降低动作/tick/审计换取性能通过。

PA3a 开始前保存 `/private/tmp/arena-pa3a-before.*`，PA3b 开始前另存
`/private/tmp/arena-pa3b-before.*`，均包含当时 HEAD、status、全部 dirty patch、untracked
清单和允许文件 SHA-256。PA3a 回滚只反向 Bot 合同/测试/architecture/ledger patch，保留
PA2 与其它 dirty；PA3b 回滚只反向 Session/QuickMatch/survival wiring/测试/architecture/
ledger patch，保留已签核 PA3a 与 PA2。两门均禁止 `reset`/`checkout`；提交/推送需主协调另行
授权。本节当前状态为 `PA3a completed / coordinator-approved / formalGate=false`，并授权
`PA3a+PA3b completed / coordinator-approved / formalGate=false`；PA4 设计预审为
`design-preaudit-approved / coordinator-approved / formalGate=false`；PA4a 与 PA4b-1 均为
`completed / coordinator-approved / formalGate=false`（PA4b-1 `96/100`）；PA4b-2 亦为
`completed / coordinator-approved / formalGate=false`（`96/100`）；该签核段记录当时 PA4b-3 尚未授权，最终签核状态见本节末；PA5、性能、formal300、模拟器、美术或 commit/push 均未授权；PA3 仍不构成 P1 advance。

### PA4 Product/Presentation（PA4a、PA4b-1、PA4b-2 与 PA4b-3 `completed / coordinator-approved / formalGate=false`）

#### 状态、真实缺口与分门理由

PA4 设计门状态为 `design-preaudit-approved / coordinator-approved / formalGate=false`；PA4a、PA4b-1、
PA4b-2 与 PA4b-3 均已 `completed / coordinator-approved / formalGate=false`。PA4b-3 已在授权文件
面内切换 Product/Presentation 主路径；不代表 PA5 legacy 退出、正式性能或 P1 advance。下面标注为历史
快照的旧调用链记录 PA4a 预审时的 API 缺口，不能继续当作当前实现事实：

- **历史快照（PA4a 预审时）**：`LocalMatchSession.step()` 在 paused 时返回 `core.getSnapshot()`；正常 step 后再次构造并返回
  legacy `{events, snapshot, input}`；`getSnapshot()` 与 `runUntilEnded(inputProvider)` 也只
  暴露 legacy full snapshot。PA3b 的 V5 Bot pre-step 已禁止回读 full snapshot，但 post-step
  legacy snapshot/result 明确留在 PA4/PA5。
- **历史快照（PA4a 预审时）**：`ProductMatchRuntime` 的 `LocalMatchSessionPort` 只捕获 `step/getSnapshot` 等旧方法，
  `ProductMatchStepOutcome` 仍是 `{events, snapshot, result}`；`ProductMatchCoordinator`、
  `ProductSessionController.beginMatch/stepMatch/getActiveMatchSnapshot` 继续转发这一合同。
- **PA4b-3 候选覆盖的路径**：`ProductMatchPresentationRuntime.start/step` 现在只捕获并调用
  `beginMatchWithReadFrame`、`getActiveMatchReadFrame`、`stepMatchWithReadFrame`；pre-step 从
  当前 `LocalActionSidecarV2` 采样，post-step 原子消费 V2 frame/events/result。旧
  `getActiveMatchSnapshot()`、`getSnapshot()` 与 `local.actionAffordance` 仍只存在于明确
  legacy/differential allowlist，留给 PA5 退出，不能回流新的生产主路径。
- `ArenaInputMapper` 的旧 `MapperActionAffordance` exact shape 仍要求
  `tick/participantId/primaryActionDefinitionId/channels.primary/primaryHold/jump/slam`。
  但 PA2 的 `LocalActionSidecarV2` 只有 `schemaVersion/tick/eventSequence/participantId/profile/`
  `primaryActionDefinitionId/primary/primaryHold`。因此不能把缺少的 `jump/slam` 伪造成 fallback，
  也不能放宽旧四通道校验来掩盖 schema 差异。

PA4 拆成两个可独立验收、可独立回滚的小门，原因是先在 Session 建立唯一的只读 post-frame
边界，再迁移 Product/Presentation/InputMapper，避免把 UI 迁移失败误判为 Core/PA3 Bot
事务失败。PA4a 不接 Product/Presentation 主路径；PA4b 只有在 PA4a 签核后才可实施。美术
保持暂停，只有 PA4b 稳定消费合同经主协调签核后，才可开放只读接口适配/代表样件；不得以
PA4a 签核恢复正式资产替换、设备/Final 或共享 authority 文件。

#### PA4a：Session readonly local-frame adapter

**允许与禁止文件。** PA4a 允许新增/修改
`packages/arena-session/src/local-match-session.ts` 的只读 adapter、必要的 Session 类型
与 index 类型出口，以及 `packages/arena-session/src/bot-match-read-bundle.ts` 中仅供
Session 使用的 package-private frame helper；允许对应 Session/architecture 测试和本台账。
helper 不从 package index 暴露。不得修改 MatchCore、`match-read-*`、contracts、Rule/Resolver、
Bot PA3a 文件、Replay V5/state hash、QuickMatch/survival outer、Product/Presentation、
InputMapper、runner、golden、Platform 或美术；不得重新创建 binding/reader，不得重新打开
PA3 Bot transaction。

**最小接口与所有权。** PA3b 已创建并持有同一 bundle 的 `frameReader`。PA4a 在 bundle 模块
内增加 package-private `readPresentationFrameForSession(bundle, expectedCore, localId,
botId)`（名称可按实现调整），以既有 bundle WeakMap/lifecycle 与 Core/参与者 identity
同时核对后读取现有 frame reader。它只返回冻结 `MatchReadFrameV2`，不返回 Core、binding、
raw reader、handle 或 bundle；Session 不调用任何 Core reader factory。Session 成功 attach
后持有 bundle/Core 的既有所有权，Product 尚不接触它们。

Session 增加只读 adapter 合同（名称可按实现固定）：

```ts
type LocalMatchPresentationStepResultV2 = Readonly<{
  events: readonly MatchEvent[];
  readFrame: MatchReadFrameV2;
  input: InputFrame | null;
}>;

getPresentationReadFrame(): MatchReadFrameV2;
stepWithPresentationReadFrame(input: InputFrame | null): LocalMatchPresentationStepResultV2;
```

`localActionSidecar` 非 nullable；ordinary active supply 为 `null`，formal survival 必须为完整
projection，pending-expiry world item 不进入 Bot/Presentation visible equipment。adapter 只在
返回前完成一次同 identity 的 world/local frame 读取与冻结，不把旧 full snapshot 删字段伪装成
V2。`stepWithPresentationReadFrame` 在 authority step 完成后、向调用方发布结果前读取 post
frame；失败时不发布半个 frame/result。旧 `step/getSnapshot/runUntilEnded` 在 PA4a 不删除，仍
标记为 PA4/PA5 迁移 allowlist。

PA4a 对未携带 PA3b V2 bundle 的 legacy/test Session 必须显式拒绝；不得回退到
`getSnapshot()` 后删除字段或裁剪成假 V2。world-only/无本地 participant 也不是本门隐式兼容场景，
若未来需要必须另立合同。

**PA4a implementation candidate（2026-07-30，历史候选，已由下方签核覆盖）。** 已在授权文件面内形成
Session readonly local-frame adapter 候选：专测 `12/12`，受影响 Node + architecture 合跑
`148/148`（architecture `48/48`），并覆盖 ordinary/formal 同 seed projection/world/local
differential、terminal Replay/events/state hash、V2 分支 `getSnapshot calls=0`、paused/resume、
全 phase、formal `599/600/601`、`1199/1200/1201`、`1799/1800/1801`、`2399/2400/2401`、
reentry、native getter/own-shadow、post-read cleanup 与 exact-once。正式边界以 legacy authority
projection 的实际可见 supplies 为准，不硬编码每波数量；pending-expiry 不进入 visible equipment。
该段明确是 PA4a 候选当时的历史状态；后续 PA4a、PA4b-1 与 PA4b-2 均已签核。当前 PA4b-2
已完成主协调签核；该 PA4a 候选历史段当时下一步仅可提请 PA4b-3 implementation candidate，最终签核状态见本节末；PA5、正式 readStep/CPU、模拟器、美术与 commit/push 仍锁定；
该段末尾关于“提议：设计门通过；实现与性能未验收”的句子只是 PA4a 候选当时的历史文档口径；
当前总状态以 ADR 顶部及后文 PA4/PA5 签核与候选记录为准。

**PA4b-1 主协调独立签核（2026-07-30）。** 状态为 `completed / coordinator-approved / formalGate=false`，
评分 `96/100`：架构边界 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay
`15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，各维均≥80%。独立证据为定向
formal `8/8`、Bot `28/28`、Presentation `25/25`、PA3b `13/13`；完整 Node `911/911`，
governance `136/136` 文件、`618/618` tests；prebuild `52 packages / 11 waves`；完整 `npm run build`
的 web/douyin/wechat 三端通过；typecheck:app、lint、documentation `265/839/57`、`git diff --check`
全绿。扣分仅因正式 CPU/readStep 计时及 PA5 legacy 删除尚未实施，不是本门功能红门；PA4b-1 签核不解锁
PA4b-3、PA5、formal300、性能、设备/真机、模拟器、美术、commit/push 或 P1 advance，美术继续暂停。
签核时 branch 为 `feature/arena-v2-design-docs`，HEAD/upstream 均为
`d750e4caa767332b5c3caaf247080b5717d56219`；工作区仍 dirty，未提交、未推送。

**PA4b-2 implementation candidate（2026-07-30；历史快照，已由下方主协调签核覆盖，`formalGate=false`）。** 当时本轮仅在
`packages/arena-presentation-runtime/src/arena-input-mapper.ts`、`input-sampler.ts`、
`input-snapshot-trust.ts` 增加 context-primary 的独立 `LocalActionSidecarV2` 输入路径，测试为
`tests/arena/input/local-action-sidecar-v2.test.ts` 与 `tests/architecture.test.ts`；没有修改
`arena-input-router.ts`，其既有实现只把严格 sample options 原样转发。`ARENA_INPUT_SOURCE_MODE` 明确区分
`legacy` 与 `local-sidecar-v2`：V2 只读取 `primary`/`primaryHold`，不把 sidecar 转成四通道
`MapperActionAffordance`，不制造 `jump`/`slam`；legacy 四通道仍是显式迁移/differential allowlist。
V2 在 raw/gesture 消费和 mapper 状态提交前校验 schema=2、tick/eventSequence/participant/profile、
精确两通道、官方 outcome identity 形状与 `primaryActionDefinitionId` 映射；legacy 携带
`eventSequence` 或 V2 sidecar、V2 携带 legacy affordance（包括 `null`）均 fail closed。严格 copy
建立独立 WeakSet trust identity；可信对象只做 sample identity 对照，普通输入先复制冻结。

该适配器的反射边界必须写实：普通外部 Proxy 的 `ownKeys`/descriptor/prototype 反射可能执行其
结构性 trap，这是 JavaScript 的验证边界，不能宣称任意 Proxy 零 trap；验证不会读取数据属性值，
不会执行 accessor getter 或 Proxy `get`，结构性 trap 异常直接 fail closed。通过严格 copy 建立的
trusted sidecar 走身份快路径，不再次扫描整棵对象。ordinary 与 formal 真实 MatchRead frame 的
pre-step local sidecar 已分别喂入 V2 sampler，ordinary projection 为 `null`、formal projection
为非空；PA4b-2 专测 `12/12`、输入受影响 Node `40/40`、presentation-runtime Vitest `28/28`、
architecture `49/49`，`build:packages` `52/11`，typecheck、lint、documentation `265/839/57` 与
diff check 均通过。该证据是签核前候选快照；随后完整回归与主协调独立验收已覆盖 PA4b-2，不能把本段早期
局部证据与最终签核证据拼接。PA4b-2 不调用 PA2a full audit、不修改 ProductPresentation；下一步仅可提请
该 PA4b-2 候选历史段当时 PA4b-3 implementation candidate 尚待主协调授权；最终签核状态见本节末；PA5、性能、formal300、设备、美术与 commit/push 继续锁定。

**PA4b-2 独立红门与修复（2026-07-30，历史红门，已由下方主协调签核覆盖）。** 仓库外
`/private/tmp/arena-pa4b-2-reentry-repro.ts` 首次证明 sidecar Proxy 反射期间 nested sample
可以在外层失败前推进 `lastTick`；`/private/tmp/arena-pa4b-2-enumerable-repro.ts` 首次证明
non-enumerable required field 会被错误接受，且 V2 空白字符串没有遵循 contracts 的 trim 规则。
修订为同一前置验证事务：在任何 options、V2 sidecar 或 legacy `actionAffordance` 结构反射前置位，
nested sample 与 pointer/lifecycle 操作被拒绝，trap 捕获/未捕获路径均不提交 nested 状态并在 finally
释放 guard；普通验证错误可同 tick 修正重试，raw/gesture 开始后的 mapper/async/reentry 仍 terminal
fail-closed。V2 root/channels/outcome 所有字段要求可枚举 data descriptor，participant、nullable identity、
lane/source/reason 使用 trim 后非空规则，legacy 字符串语义保持不变。两个复现已转绿，并以
  sidecar/options/legacy trap、missing/undefined、连续 hold 与 identity retry 测试固化。第二轮独立复现
  `/private/tmp/arena-pa4b-2-error-normalization-repro.ts` 发现验证错误离开 guard 后的 hostile
  coercion 能 nested commit，`/private/tmp/arena-pa4b-2-terminal-normalization-repro.ts` 发现
  `#fail` 在登记 terminal 状态前格式化 hostile thrown value 会使 sampler 继续可用；现已改为 opaque
  保存原始 unknown、不做字符串化，且先登记静态 terminal Error 再执行 suspend/reset，cleanup 异常
  也安全聚合。两条第二轮复现与新增专测均已转绿。随后同源 constructor rollback 复现
  `/private/tmp/arena-pa4b-2-constructor-rollback-repro.ts` 证明 hostile constructor error 的
  coercion 会跳过已创建 `RawControlState` 的 destroy；现已让 constructor original/rollback 与
  raw/gesture destroy cleanup 统一使用不触碰 caller value 的静态包装，并保证第二个 cleanup 仍会尝试。
  第五条外部复现与双 cleanup 专测均已转绿；专测当前 `12/12`、输入 Node `40/40`。本段保留
  两轮独立红门及修复事实，不将其写为主协调签核或性能通过。

**PA4b-2 主协调独立签核（2026-07-30）。** 状态为 `completed / coordinator-approved / formalGate=false`，评分
`96/100`：架构边界 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay
`15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，各维均≥80%。独立证据为五个仓库外
恶意复现 `5/5`、PA4b-2 专测 `12/12`、输入全套 `40/40`、Presentation Vitest `28/28`、
architecture `49/49`；typecheck:app、lint、documentation `265/839/57` 与 `git diff --check`
全绿。完整回归另为 pretest `52 packages / 11 waves`、Node `924/924`、governance `136` files /
`618/618` tests；完整 `npm run build` 的 `52 packages / 11 waves` 及 web/douyin/wechat 三端通过，
仅保留既有 chunk-size warning，buildId 为 `arena-d750e4caa767-product-dirty`。五个红门及其修复路径
均保留在上方历史段，不与早期候选绿证据拼接。相对 `/private/tmp/arena-pa4b-2-before` 的基线审计仅涉及
mapper、sampler、trust、architecture、ADR-111、ledger，并新增 `local-action-sidecar-v2.test.ts`；
无其它 PA4b-2 越界。签核时 branch 为 `feature/arena-v2-design-docs`，HEAD/upstream 均为
`d750e4caa767332b5c3caaf247080b5717d56219`，工作区仍 dirty，未 commit/push。签核时 PA4b-3 尚未
授权；最终签核状态见本节末。PA5+、PA6/PA7、正式性能、formal300、设备/真机、
模拟器、美术、commit/push 与 P1 advance 继续锁定。

`stepWithPresentationReadFrame` 不得复制 authority step 逻辑或形成第二 tick 状态机；它必须
委托共享的唯一 authority-step 内核，并参数化只读返回投影：legacy 分支继续构造 full snapshot
（仅迁移 allowlist），V2 production 分支在同一次 authority step 后只读 post
`MatchReadFrameV2`，不得构造 legacy full snapshot。两分支共享玩家/Bot 输入、trusted batch、
runner step、状态转换和 cleanup，只差只读返回投影。PA4a 测试必须证明一次调用只发生一次
authority step、V2 分支 `core.getSnapshot` 调用数为 0，且 event/input 与 legacy `step`
differential 一致；PA4b 生产路径只使用 V2 方法，PA5 再删除或显式重命名 legacy allowlist。

**PA4b-3 Product/Presentation 主路径实现候选（2026-07-30，签核前历史快照，已由下方最终签核覆盖）。** 当时状态为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`；当时只
触碰授权的 Product/Presentation、frame projector、application composition、定向测试与
architecture 文件面，不代表 PA4b-3 已签核，不解锁 PA5、性能、formal300、设备/模拟器、美术、
commit/push 或 P1 advance。

- **实现边界与调用顺序**：`ProductMatchPresentationRuntime` 与 `ProductPresentationFlow` 的
  controller port 只捕获 V2 三件套 `beginMatchWithReadFrame`、`stepMatchWithReadFrame`、
  `getActiveMatchReadFrame`，并固定调用已捕获方法；不从 Product/Presentation 创建 reader、
  读取 Core/raw reader/bundle 或从 legacy snapshot 重投影。start/begin 返回 current frame；
  running step 先读取同 tick/eventSequence 的 current world/local sidecar，再经显式
  `local-sidecar-v2` sampler 生成 InputFrame，随后只调用一次 V2 authority step，并消费同一
  返回中的 post frame/events/result。paused/ended 由既有 Product 生命周期返回稳定 frame/空 input
  语义，不能把 post frame 当作下一次 pre-step sidecar。
- **Projector 与 schema 边界**：`projectArenaPresentationFrameV2` 只接受冻结
  `worldSnapshot`、`LocalActionSidecarV2`、events、public info 与 presentation content；
  local sidecar 只验证/读取 primary、primaryHold 和公开
  `primaryActionDefinitionId`，不读取 `participant.actionAffordance`、不重判 selected/rejected/
  canAct/display，也不制造 jump/slam。旧 `projectArenaPresentationFrame` 继续保留为显式
  legacy/differential allowlist，PA5 再处理退出；V2 轻量边界依赖 PA4a 的 trusted recursive
  freeze，仅对当前消费字段执行 exact key/frozen/identity 校验，不调用 PA2a full audit。
- **允许文件**：
  `packages/arena-product-presentation/src/product-match-presentation-runtime.ts`、
  `product-presentation-flow.ts`、`product-presentation-session.ts`；
  `packages/arena-v1-presentation-content/src/arena-frame-projector.ts`；
  `packages/arena-v1-application-session/src/product-presentation-session-composition.ts`；
  对应 `tests/arena/pa4b-3-product-presentation.test.ts`、既有 Product Presentation/边界测试与
  `tests/architecture.test.ts`。未修改 Core/Rule/Resolver/MatchRead/contracts/Bot/Replay/hash/
  runner/golden/Platform/正式资产或 PA4b-2 mapper/sampler/router production files。
- **行为与测试证据**：新增候选专测 `9/9`，覆盖 V2 current-sidecar sampling、mixed/foreign identity
  fail-closed、synthetic 4 participant 顺序稳定性（纯数据消费者，不宣称真实 4 人 authority）和
  ordinary/formal production frame contract；Product Presentation 既有 Node `19/19`、边界
  Vitest `25/25`、PA4b-2 输入全套 `12/12`、architecture `50/50`。受影响回归另有 PA4a
  `12/12`、PA3b `13/13`、PA4b-1 real `3/3`、Product V2 `24/24`、MatchRead `25/25`。ordinary
  与 formal 的真实 terminal/Replay/hash 全量独立验收仍由主协调复核，不把本轮局部证据扩写成最终
  parity 或 formal CPU 证据。
- **自审与失败关闭**：构造期固定捕获三件套并拒绝 partial/foreign controller；frame root/local/
  channel/outcome 的消费字段缺失、额外、未冻结、wrong participant、tick/eventSequence 混帧均在
  input/authority 前拒绝。runtime reentry、thenable/async、Presentation callback 异常、step 后
  read 失败不回写 authority，并沿既有 Session fatal cleanup；合法同身份 paused/resume memo
  仍可读。V2 与 legacy API 不共用可能陈旧的 frame memo，legacy 入口仍只在 PA5 allowlist。
- **回滚与未决项**：回滚只反向本候选 Product/Presentation/projector/composition hunk、测试与
  architecture，保留 PA1–PA4b-2 及其它 dirty，不使用 `reset`/`checkout`。未决项为主协调独立
  复核真实 ordinary/formal 端到端 completion/replay/checkpoint/finalHash/authorityHash、完整
  回归与 PA5 legacy 退出；正式 readStep/CPU 与 measurement schedule 不在本轮运行。

**精确时序与缓存。**

```text
start/begin  -> 当前 world + local sidecar -> 冻结 current frame -> 返回给上层
pre-step     -> 读取同 identity current frame -> InputMapper 采样 primary/hold
step         -> Bot 已完成 trusted input -> authority step -> post world/local frame -> 原子返回
paused       -> authority identity 未变，重复读同一 memo（strictEqual）
resume       -> 若未推进 authority identity，继续复用；InputSampler reset 只属于表现生命周期
ended        -> 逐 participant 沿旧 Resolver 输出，winner 仍可 selected，淘汰者才可能 unavailable
destroy      -> 先按现有 Session 顺序失效 bundle，再清理 Session 资源；重复 destroy 幂等
```

read/build 期间 `step/trusted-step/destroy`、caller validation、reader 创建、public snapshot、
checkpoint/hash 与跨 reader 重入均 fail closed；外部 callback 不得在半 tick Core 上回读。candidate
完整冻结后才提交 current frame memo，失败不覆盖旧 memo；同一 Core 当前 world 与 local reader
共享一份有界 memo，不能保留无界历史。PA4a 只验证 PA2 已有 composition/generation provenance
在 bundle 创建时成立，并在每次 read 检查 frame 的 tick/eventSequence/phase/participant/profile；
PA2 输出没有 compositionHash/generation 字段，PA4 不虚构逐字段读取它们。

**PA4b-3 独立红门与修复（2026-07-30，历史红门，已由最终签核覆盖）。** 首轮独立复现
`/private/tmp/arena-pa4b-3-hostile-projector-repro.ts` 以 hostile projector thrown value 触发
post-authority 错误时，`authoritySteps=1` 但 runtime 仍为 `running`；
`/private/tmp/arena-pa4b-3-input-identity-repro.ts` 则证明错误 tick 的官方 normalized
`InputFrame` 已进入 `stepMatchWithReadFrame`。两项初始复现均为 exit 1，不能拼接早期绿证据。

修订将 caller thrown value 只作为 opaque cause 保存：静态 `Error` 与 `FAILED` 先登记，
constructor/event-window/destroy cleanup 的错误归一化也不执行 caller coercion，避免 hostile
`String`/`Symbol.toPrimitive` 绕过 terminal 或跳过回滚；同时在 sample 返回后、调用
`stepMatchWithReadFrame` 前验证 normalized provenance、当前 tick 与 local participant，错误身份
不会进入 Controller。只有 sample 尚未返回且 authority 尚未进入的前置采样错误保持同 tick 可恢复；
sample 已成功但 identity/shape 错误、authority 已进入或 post-frame/projector/event-window/result
验证抛错均 terminal fail-closed。两份首轮外部复现现均 exit 0（`2/2`），仓库专测为 `10/10`；本轮
修复后当时仍为 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`，
未运行完整 npm test/build、正式 CPU/formal300、模拟器，也未提交或推送。

**PA4b-3 第二轮独立红门与修复（2026-07-30，历史红门，已由最终签核覆盖）。**
`/private/tmp/arena-pa4b-3-post-input-identity-repro.ts` 首次证明 Controller 返回的 post frame
虽为 tick `1`，但 `matchStep.input` 仍可携带另一个合法 trusted normalized `InputFrame`（tick
`99`），并被 Presentation Runtime 接受；该复现初始为 exit 1，保留为独立红门历史。修订后
严格先读取 post frame，再核对返回 input 与本次提交 input 的 participant、tick 及完整 V4 语义字段，
并强制 `input.tick === postTick - 1`；结果另外核对当前 public match 的 matchSeed、content hash
与 opponent identity。交叉 mismatch 在 projector 前 terminal FAILED，authority 只允许已进入一次；
仓库专测新增 wrong post tick/participant、trusted semantic drift、foreign result seed 矩阵，现为
`10/10`。三份仓库外复现（首轮两项与本轮一项）现为 `3/3`，候选状态仍为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`（签核前历史状态）。

**PA4b-3 第三轮独立红门与修复（2026-07-30，历史红门，已由最终签核覆盖）。**
`/private/tmp/arena-pa4b-3-result-world-identity-repro.ts` 首次复现 post world 的
`result` 判定 `player-1`，Controller 却返回另一位 participant 的合法 `ProductMatchResult`；
初始结果为 exit 1，错误结果还继续触发第二次 projector 并进入 `RESULT`。
`/private/tmp/arena-pa4b-3-flow-hostile-error-repro.ts` 首次复现 `synchronize` 的 hostile
`Symbol.toPrimitive` 在失败登记前被 coercion，Flow 仍保持 active；初始结果为 exit 1。两项红门
均保留为独立历史，不与早期绿证据拼接。

修订后，ProductMatchPresentationRuntime 在 projector 前轻量核对 public opponent/content
participant identity，并将 terminal result 的 `winnerId/reason/isDraw/endedAtTick` 与 post
world result 逐字段绑定；winner 仅允许 `null/local/opponent`，world/phase/result 不一致、
unknown winner 和 foreign result 均在 authority 只进入一次后 terminal `FAILED`，第二次 step
被拒绝。ProductPresentationFlow 及 constructor/runtime/synchronize/recover/dispatch/destroy
cleanup 路径统一先登记静态 Error/`FAILED`，caller thrown value 只作 opaque cause，不做
`String`/隐式 coercion；cleanup 失败继续聚合且不跳过后续 owned cleanup。

两份新增外部复现现为 `2/2`；PA4b-3 专测为 `12/12`；受影响 Node 选择集为 `160/160`
（含 architecture），Presentation/Product Vitest 为 `42/42`，`build:packages` 为
`52 packages / 11 waves`，`typecheck:app` 与 lint 已通过。该轮 ordinary 终局证据使用测试
adapter 将 public opponent profile id 改写为 authority participant id；后续独立运行真实
Product Presentation Node 仅 `12/19`，7 项因该错误约束失败，因此这段 adapter 证据已明确
判为无效历史快照，不得与当前 ordinary 证据拼接。formal 使用正式 survival composition 的
证据仍保留为历史记录。此前 `10/10` 与本段 `12/12` 均为历史计数，当前计数见第四轮修复段；
签核前状态仍为 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`，
未运行完整 npm test/build、正式 CPU/formal300、模拟器，未提交/推送。

**PA4b-3 第四轮独立红门与修复（2026-07-30，历史红门，已由最终签核覆盖）。**
独立真实 ordinary 运行 `tests/arena/presentation/product-presentation.test.ts` 为 `12/19`，
暴露上一轮 `publicMatchInfo.opponent.id === opponentParticipantId` 约束错误：QuickMatch 的
profile id（如 `opponent-comet`）不是 authority participant id；上一轮测试 adapter 改写
该字段，故证据无效。现已删除错误等同约束，只保留 `result.opponent` 与 public opponent
profile identity 一致，并以 content participant assignment 与 world/result participant 证明
authority local/opponent 身份。无 adapter 的真实 ordinary path 现为 `19/19`，PA4b-3 专测为
`14/14`，ordinary/formal 真实 Product→Presentation 终局测试不再改写 public metadata。
`/private/tmp/arena-pa4b-3-pre-frame-terminal-repro.ts` 另复现 foreign pre-frame 被过宽归类为
输入采样可恢复错误；现仅允许 inputSource 原函数在返回前的普通抛错 retry，controller
pre-frame/readV2Frame/identity 失败、sample 返回后的 shape/identity 失败均 terminal，且
malformed/foreign/hostile getter 在 sample 与 authority 前被拒绝。补充的
`/private/tmp/arena-pa4b-3-sample-thenable-terminal-repro.ts` 证明返回 thenable 也是已返回后
的合同违规，不再被当作 retryable；显式 `sampleStarted/sampleReturned` 区分三类语义。
第三轮两个复现、pre-frame、post-input 及 thenable 历史脚本共 `7/7` exit 0；PA4b-3 专测
`14/14`；真实 Product Presentation Node `19/19`；受影响 Node/architecture 选择集
`181/181`（architecture `50/50`）；Product/Presentation Vitest `42/42`；
`build:packages` `52 packages / 11 waves`；typecheck:app、lint 已通过。状态仍为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`（签核前历史状态），
未运行完整 npm test/build、正式 CPU/formal300、模拟器，未提交/推送。

**PA4b-3 第五轮完整门禁红门与修复（2026-07-30，历史红门，已由最终签核覆盖）。** 主协调独立执行的修复前
完整 `npm test` 为 `939 tests / 927 pass / 12 fail`，第二次失败块复跑稳定；该结果是修复前
历史红证据，不能与当前局部门禁拼接成完整回归通过。共同首因是
`ProductPresentationSession` 固定使用 `actionSourceMode=local-sidecar-v2`，但
`createProductPresentationSessionComposition` 默认 `mapperId` 仍为 `explicit-combat-jump`，
使严格 InputSampler 在初始化处拒绝，连带击穿 `product-presentation-session` 11 项与
`entry-canvas-product-composition` 1 项。

修订将正式组合默认 mapper 固定为 `context-primary`；显式 legacy/gesture mapper 在组合构造
边界立即拒绝，且不调用 renderer/factory/host 副作用。自定义 `mapperFactory` 仍必须返回
context-primary 合同；错误 mapper id、thenable、accessor 与 hostile thrown value 均安全失败，
已创建 Presentation 资源仍按既有顺序回收。InputSampler 的严格 local-sidecar-v2 校验未放宽，
也没有退回 legacy。listener cleanup、输入失败、Renderer 重入与 destroy 语义已在局部门禁中复验。
当前局部门禁证据为：application-session composition Vitest `6/6`；
ProductPresentationSession 与 entry-canvas Node 首轮 `15/15`；PA4b-3 专测 `14/14`；真实 Product
Presentation Node `19/19`；Product Presentation boundary Vitest `25/25`；architecture `50/50`；
`build:packages` `52 packages / 11 waves`；`typecheck:app` 与 lint 通过。完整 `npm test` 与完整
build 尚未在本轮修复后重跑，因此仍不得宣称完整回归/正式性能通过。状态保持
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`（签核前历史状态）；
PA5+、正式 CPU/formal300、模拟器/设备、美术与 commit/push 继续锁定。

**第五轮 follow-up 红门与修复（2026-07-30，历史红门，已由最终签核覆盖）。** 静态安全复核发现
`safelyWrapMapperFactoryError` 的 `error instanceof Error` 会触发 hostile Proxy 的
`[[GetPrototypeOf]]`；此前的 `15/15` 未覆盖该边界。现已移除 caller-thrown value 的
`instanceof`、字符串化和属性观察，任意 unknown 均包装为静态 Error，仅以不可枚举 opaque
`cause` 附着。新增 Proxy `getPrototypeOf`、`get`、descriptor 与 `Symbol.toPrimitive` trap
计数测试，mapperFactory failure 时 trap 为 `0`，controller destroy 精确一次，renderer/
lifecycle/canvas 均回收，重复 destroy 幂等。重建 packages 后 ProductPresentationSession 与
entry-canvas Node 为 `16/16`；`build:packages` 为 `52 packages / 11 waves`；typecheck、lint、
git diff --check 通过。该 follow-up 尚未运行完整 npm test/build，状态保持
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`。

**PA4b-3 主协调独立签核（2026-07-30）。** 状态为 `completed / coordinator-approved / formalGate=false`，
评分 `96/100`：架构边界 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay
`15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，各维均≥80%。性能扣分仅因正式
`readStep`/CPU 属 PA5+ 尚未运行，迁移扣分仅因 PA5 legacy 退出尚未完成，不是本门功能红门。
独立证据分为两层：历史红门保留第五轮修复前完整 `npm test` 的 `939 / 927 pass / 12 fail`
稳定复现，以及 follow-up hostile Proxy 中旧 `instanceof` 执行 `getPrototypeOf` trap；修复后局部门
为 application-session `6/6`、ProductPresentationSession + entry canvas `16/16`、PA4b-3 +
Product Presentation + architecture 合跑 `83/83`（architecture `50/50`、PA4b-3 `14/14`、
Product Presentation `19/19`）、Product Presentation boundary `25/25`，既有 7 个 PA4b-3
仓库外 repro 均 exit 0。完整门为 `npm test` exit 0，Node 全链通过，Vitest `136 files / 620 tests`
全绿；`npm run build` exit 0，`52 packages / 11 waves`，Web/抖音/微信三端产物成功，仅保留已知
chunk-size warning；typecheck、lint、documentation `265/839/57`、product-boundaries、
presentation-three-boundaries 与 `git diff --check` 全绿。branch 为
`feature/arena-v2-design-docs`，HEAD/upstream 均为
`d750e4caa767332b5c3caaf247080b5717d56219`，dirty 工作区保持，未 reset/checkout，未 commit/push。
PA5 是唯一下一实现授权申请；PA6/PA7、正式性能/formal300、设备/真机、模拟器、美术与提交推送仍关闭。

#### PA4b：Product/Presentation + InputMapper migration

**允许文件面。** PA4b 在 PA4a 签核后才可触碰：
`packages/arena-product-match/src/product-match-runtime.ts`、`product-match-coordinator.ts`、
必要 ports/index；`packages/arena-product-session/src/product-session-controller.ts`、必要
ports/index；`packages/arena-product-presentation/src/product-match-presentation-runtime.ts`、
`product-presentation-flow.ts`、`product-presentation-session.ts`、`product-input-router.ts`、
必要 index；`packages/arena-presentation-runtime/src/arena-input-mapper.ts`、`input-sampler.ts`、
`arena-input-router.ts`、必要 index；`arena-v1-presentation-content/src/arena-frame-projector.ts`
必要类型；`arena-v1-application-session/src/product-presentation-session-composition.ts` 必要
接线；对应定向测试与 architecture。PA4b 禁止 Rule/Core/Bot/Replay/hash/Platform/runner/
golden/正式资产和设备文件；不得让 Presentation callback 读取 Session/Core。

Product 只获得 Session 的冻结 `readFrame`/step result：

```text
LocalMatchSession -> ProductMatchRuntime -> ProductMatchCoordinator
                   -> ProductSessionController -> ProductPresentationRuntime/Flow
```

任何 Product port 都不得暴露 Core/raw reader/opaque bundle；outer 不重新建 reader，Product
不从 legacy snapshot 重投影 V2。`beginMatch` 获得 current frame，`stepMatch` 接收玩家 InputFrame
并原子转发 post frame/events/result，`getActiveMatchReadFrame` 只返回稳定 memo。`result/export`
仍由 Session/Runtime 的既有权威路径负责，PA4 不改 Replay V5 或 state hash。

**InputMapper 合同迁移。** context-primary mapper 直接消费严格 `LocalActionSidecarV2`，或
一个显式且最小的两通道 adapter：只读取 `primary`、`primaryHold`，并精确核对
`tick/eventSequence/participantId/profile`。`primaryActionDefinitionId` 仅用于既有显示/映射
兼容；`canAct=false` 的 display fallback 仍由 Rule/Core 产出，Presentation 不重判。连续 press/
hold 必须从当前 pre-step sidecar 采样，不能拼上一 tick 或 post-step frame。旧四通道
`MapperActionAffordance` 不得接收缺失的 jump/slam；它保留为迁移 differential/legacy allowlist，
PA4b production context 不 fallback 到它，PA5 再决定显式重命名/删除。gesture-mobility 与
explicit-combat-jump 本来不依赖 affordance，继续使用其显式输入，不补造 jump/slam。

**PA4b architecture allowlist。** Product/Presentation 生产源码不得再调用
`getActiveMatchSnapshot()`/`getSnapshot()`，不得读取 `participant.actionAffordance`，也不得从
legacy snapshot 重投影 V2；这些名称只能出现在明确标注的 legacy/differential allowlist，留给
PA5 删除。Session 之外不得出现 bundle/raw reader；PA4a 的 frame helper 只允许由
`local-match-session.ts` 相对导入，且不从 Session package index 导出。Product 只能消费 Session
返回的冻结 frame/step result。

**旧→新行为映射。** ordinary 1v1 与 formal survival 都由同一 Session read-frame adapter
提供 world/local；preparing/running/sudden-death/ended 逐字段保留旧 ParticipantSystem/
Resolver 结果；ended winner active 仍可 selected，淘汰者才可能 `participant-unavailable`，
不新造 `match-ended` reason。pause/resume 未推进时 frame/sidecar identity 与旧 memo 相同；
start/step/result/export/destroy 的返回顺序和 exact-once 资源语义不变。full world participant
移除 generic actionAffordance 后，frame projector 只从 world + local sidecar 重组 HUD/participant
视图；display-primary 只比较公开 `primaryActionDefinitionId`，不泄露第五次 display outcome。

**真实消费者迁移矩阵。**

| 调用者 | 当前读取 | PA4 目标 | 门禁/结论 |
|---|---|---|---|
| `arena-product-match/product-match-runtime.ts` | `step().snapshot/getSnapshot()` | 只转发 `readFrame/stepResult` | 必须保留 legacy allowlist，禁止 Product 重投影 |
| `arena-product-match/product-match-coordinator.ts` | lifecycle + snapshot forward | 转发冻结 frame | 不持有 Core/reader |
| `arena-product-session/product-session-controller.ts` | `begin/step/getActiveMatchSnapshot` | `begin/step/getActiveMatchReadFrame` | 只持有 Product port |
| `arena-product-presentation/product-match-presentation-runtime.ts` | full snapshot + `local.actionAffordance` | pre-step local sidecar；post-step frame/events | callback 不回读 |
| `product-presentation-flow/session` | flow step/result | 仅消费 Product V2 result | UI 重入/清理保持原语义 |
| `arena-presentation-runtime/arena-input-mapper.ts` | 旧四通道 shape | local 两通道 strict adapter | 不伪造 jump/slam |
| `arena-presentation-runtime/input-sampler.ts` | tick/participant + press continuity | sidecar identity + continuity | 不将 post frame 当 pre input |
| `arena-v1-presentation-content/arena-frame-projector.ts` | participant actionAffordance | world + local sidecar | 不参与 authority |
| `arena-v1-application-session/...composition.ts` | 组装旧 runtime/mapper | 组装 V2 ports | 不碰 Core/Bundle |
| `arena-input-pilot`、`arena-v1-experiment`、`greybox`、fuzz/soak scripts | primary/hold 或 full snapshot | PA4 只保留开发/测试隔离；PA5 决定迁移/删除 | 非生产不阻断 Product 门，但不得回流生产 |

**完整审计边界。** PA4 不把 scheduled full audit 移到计时外，也不由 UI 请求 audit。固定
schedule 仍为 tick 0、每 60 tick、phase transition、599/600/601、1199/1200/1201、
1799/1800/1801、2399/2400/2401，以及 `MatchStarted`、`EquipmentSpawned`、
`EquipmentPickedUp`、`EquipmentDropped`、`EquipmentDropFallback`、`EquipmentReplaced`、
`EquipmentRecycled`、`EquipmentDespawned`、`ActionStarted`、`HitResolved`、
`KnockbackApplied`、`DownSmashLanded`、`PlayerEliminated`、`PlayerRespawned`、
`SuddenDeathStarted`、`MatchEnded` 之后的当前稳定 tick；同 tick 去重后对所有 participant
执行 full-audit。PA5 才把它正式接入版本化 `measurementSchemaVersion=2` 的 readStep evidence；
未来计时必须包括玩家 InputMapper（formal 为固定输入计划）、Bot input、Session authority step、
post world/local frame 与该 schedule，不能靠降低分辨率、动作、tick 或审计过门。

#### PA4 失败关闭、测试、回滚与自审

两小门共同拒绝 stale/foreign owner、fake/clone reader、缺 sidecar、tick/eventSequence/phase
混帧、wrong participant/profile、unknown/future key、accessor/Proxy/container/cycle/sparse/
non-finite、formal projection 缺失、callback/reentry、重复 step、destroy 后读取和错误的四通道
fallback。Presentation 消费异常不回写 authority；构造半失败只清理本阶段自己创建的 adapter/port，
不销毁 caller-owned Core/Bot；成功后由既有 Session/outer ownership exact-once 清理。异常前未推进
authority 的输入可按既有可恢复边界重试；读取成功或 authority step 后异常按 Session fatal cleanup，
不得把它改成任意重试。

PA4a 测试需覆盖真实 bundle/frame reader、start/current、post-step、paused/ended stable memo、
frame identity/provenance、reentry/step/destroy、ordinary null supply/formal non-null supply、
构造失败与旧 memo 不替换。PA4b 测试需覆盖 ordinary/survival、2 人及仅用于纯数据消费者顺序稳定性的 synthetic 4 人形状
（不宣称 PA4a 或当前 P1 authority 支持真实 4 人）、所有
phase、winner/淘汰、连续 press/hold、context-primary 两通道、gesture/explicit jump 不读 affordance、
旧四通道 exact shape 被拒而不补字段、full recomposition、Replay/events/checkpoint/state hash
不变、恶意 callback 与 destroy 幂等。建议命令由实现门执行：定向 Node/Vitest、architecture、
`npm run build:packages`、`npm run typecheck:app`、`npm run lint`、`npm run check:documentation`
及 `git diff --check`；本轮不运行。

PA4a 回滚只反向 `arena-session` adapter/bundle package-private helper、测试与 architecture
hunk；PA4b 回滚只反向 Product/Presentation/InputMapper ports/adapter、测试与 architecture
hunk；均保留 PA1–PA3/B1/expired-held dirty，不使用 `reset`/`checkout`。PA4a 与 PA4b-1 均已完成签核；
PA4b-2 已完成主协调签核；该设计预审段记录当时 PA4b-3 尚未授权，最终签核状态见本节末；PA5+、性能、设备、美术与 commit/push 仍未授权。
当前预审自评：架构边界 `20/20`、
行为等价 `19/20`、生命周期/失败关闭 `14/15`、确定性/Replay `14/15`、性能可证伪 `14/15`、
迁移/回滚 `9/10`、治理 `5/5`，合计 `95/100`，每维≥80%。该设计签核已允许 PA4a，当前实现授权已由
PA4b-1 签核收口并随后完成 PA4b-2 签核；该设计预审段记录当时 PA4b-3 尚未授权，最终签核状态见本节末；PA5+、性能、设备、美术与
commit/push 仍未授权。扣分来自当时 Product/Presentation 尚未实现、PA5 full-audit/readStep 与
PA6/PA7 正式 CPU 尚无证据；该分数不代表 PA4b-2/3、PA5、formalGate 或美术恢复已通过。

## 设计替代方案与后果

### A：revision 增量 read model

不选。position、targeting、phase、cooldown、movement capability、held equipment 和
供给 lifecycle 会在每 tick 改变，revision 失效频繁；仍需严格维护失效边界、owner 和
异常回退，预期不足以稳定提供 `30.1us/tick` 余量。

### 仅 B：public snapshot cache/静态 rule cache

不选作独立方案。历史 B2 public cache/deep-freeze 构造复杂且实测约 `0.233ms/tick`，
三轮 `0.5989584/0.5555628/0.5462892ms/tick`；D7 的静态 Rule cache 组合也只有约
`10.23us/tick` 平均回收，未达到稳定门。它可以作为 C+B+D 实现中的局部构造技术，但不能
恢复为整棵 snapshot cache 或跨 runtime 缓存裁决结果。

### 宽参数 QueryPort

不选。每 tick 接受任意 `{participantId, channels, tick, eventSequence}` 会把身份解析、
TOCTOU 和错误字段校验推入热路径；固定 profile 零参数 reader 在 composition 时绑定，
既降低输入面也让 architecture allowlist 可验证。

## 未决风险

本节首句和原始风险清单属于 ADR 作出时的历史设计语境：当时不以本 ADR 单独证明实现收益、
不批准 golden 迁移，也不开放 Presentation/Platform。旧清单中的调用者退出、InputSampler 映射、
Bot delay/current-self 组合、ended winner-active、reader 失效与重入等事项，已在后续 PA3–PA5
对应阶段记录中分别实现、验证或保留为当前候选审查项，不再作为“尚未开始实现”的当前总状态。
当前仍未关闭的是 PA5c 独立代码审查、PA5d、正式 CPU/formal 性能、PA6/PA7、设备/模拟器与
美术边界；这些事项在对应差分、fuzz、failure injection、Replay 和资源测试完成前，必须保持
`formalGate=false`。

## PA5 文件级设计预审最终修订（2026-07-30，签核前历史快照；已被后文 PA5c implementation candidate 覆盖）

本节覆盖前文较早的 PA5 计划性表述，记录的是签核前的历史文档状态，不是当前实现状态。
当时 PA5 设计预审状态为 `design-preaudit-approved / coordinator-approved / formalGate=false`；
PA5a 与 PA5b 均为 `completed / coordinator-approved / formalGate=false`，评分均为 `96/100`；
当时 PA5c 为 `design-preaudit-correction-approved / coordinator-approved / formalGate=false`，
caller/call-graph 文档修订已签核但 implementation 尚未开始；PA5d 尚未授权。当前 PA5c 状态以
本节之后的 implementation candidate 段为准。
固定顺序为
`PA5a → PA5b → PA5c → PA5d`。本轮只完成文档预审，不改代码、测试或其它文档。

预审基线为 branch `feature/arena-v2-design-docs`、HEAD/upstream
`d750e4caa767332b5c3caaf247080b5717d56219`，87 dirty entries（65 tracked、22 untracked）；
完整基线保存在 `/private/tmp/arena-pa5a-before.*`（另有早期 `/private/tmp/arena-pa5-before.*` 历史快照）。每门实现前仍需重新保存该门精确 patch/hash，
不得 reset/checkout 或覆盖其它 dirty。

#### PA5a implementation candidate 自检证据（2026-07-30，历史快照，已由第三轮签核覆盖）

该段只记录当时候选，不代表当时主协调签核；当前状态由下方第三轮最终签核覆盖。PA5a 已完成 MatchCore/Headless/InputPilot observed 的显式
audit/research 改名、旧 trusted public reader 默认删除及列明 caller 的测试迁移；formal pressure、
Product/Session/QuickMatch/survival 模糊 surface 与 Experiment `SimulationSnapshot` 仍按 residual/排除项保留。
定向 Node 三批分别为 `78/78`、`116/116`、`92/92`；受影响 package Vitest 为 `6 files / 48 tests`；
architecture 与 PA5a allowlist 合跑 `52/52`（allowlist `2/2`）；`build:packages` 为 `52 packages / 11 waves`；
typecheck、lint、documentation `265/839/57` 与 `git diff --check` 通过。未运行完整 `npm test`、完整
`npm run build`、PA5b/c/d、正式性能/formal300、模拟器或设备。相对 `/private/tmp/arena-pa5a-impl-before.*`
的 source/test 变更均在本节允许面内；旧 reader 无生产 reachability；当时仍为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`，等待独立代码审查。

该首轮开发自检段不覆盖 BotController 旧 full-snapshot trusted 面；独立代码验收随后发现
`trustedBinding`、`TrustedSnapshotReader`、旧 attach/create 方法和 V1 experiment 包装仍存在，
因此不能把首轮的 `旧 reader 无生产 reachability` 表述当作当前完成证据。本轮仅授权修复上述
精确红项，状态继续保持 candidate。

#### PA5a 第二轮独立红门与修订（2026-07-30）

主协调独立验收拒绝本候选：BotController 仍保留旧 full-snapshot trusted reader/binding 面，
`arena-v1-bot-capability-workload.ts` 仍包装旧方法，`createTrustedBotSourceSnapshot` 的唯一
剩余用途是该旧 reader 测试路径，且 LocalMatchSession 的 fallback 需要明确限定在无 bundle 的
legacy/audit 分支。修订删除 Bot 旧面及该 source helper，移除 experiment 旧包装；普通
`createInput(snapshot)` 只保留为精确 legacy/audit residual，QuickMatch/formal survival 的
bundle V5 分支显式拒绝回退到 Core full snapshot。PA5a allowlist test 同时锁定旧符号消失、
V5 handshake 保留、两条 outer production reachability 与 legacy fallback 分离。

#### PA5a 第二轮独立审查：V5/legacy 静态门禁假绿与修订（2026-07-30）

主协调第二轮独立验收再次拒绝本候选：`tests/architecture.test.ts` 与
`tests/arena/pa5a-legacy-snapshot-allowlist.test.ts` 原先从 `const botFrame` 到
`const normalizedBot` 截取单一 span；该 span 同时包含 V5 command-source 分支和 legacy
fallback，且只禁止模糊 `getSnapshot()`，没有禁止显式
`getLegacyFullSnapshotForAudit()`。因此此前 `52/52` 不能证明“V5 pre-step 不构造
legacy full snapshot”，该计数保留为假绿历史，不拼接为当前证据。

修订将 LocalMatchSession 的 Bot 输入选择拆为可独立切片的
`#createV5BotFrame()` 与 `#createLegacyBotFrame()` 两条私有分支：V5 分支只调用
`createInputFromTrustedCommandSource()`；legacy 分支才执行显式 audit getter 后的普通
`createInput(snapshot)`。架构门和 PA5a allowlist 分别抽取两条分支及 selector，V5 分支
同时拒绝模糊/显式 full-snapshot getter 与普通 `createInput`，legacy 分支只允许显式 audit
getter→普通 `createInput`。运行时证据以 V2 `stepWithPresentationReadFrame()` 的 getter
区间计数证明 V5 pre-step 为零；legacy `step()` 则分别证明 Bot pre-step 与 post-step 返回
快照各产生一次读取，避免把 post-step 读取误算为 V5 fallback。当时 PA5a 状态仍为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`；该历史红门
现由下方第三轮签核覆盖。PA5b/c/d、全量 test/build、正式性能与提交推送继续关闭。

#### PA5a 第三轮主协调独立签核（2026-07-30）

PA5a 状态升级为 `completed / coordinator-approved / formalGate=false`，评分 `96/100`：架构
`20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、性能可证伪
`12/15`、迁移/回滚 `9/10`、治理 `5/5`，各维均≥80%。性能扣分仅因正式 readStep/CPU 属 PA5b+
尚未运行，迁移扣分仅因 PA5c legacy 退出尚未完成，不代表本门功能缺陷。

独立证据为：全仓旧 `createTrustedPublicSnapshotReader`、`attachTrustedSnapshotReader`、
`createInputFromTrustedSnapshot`、`trustedBinding`、`TrustedSnapshotReader`、
`createTrustedBotSourceSnapshot` 已无生产定义或调用，仅剩专测否定断言/历史文本；MatchCore、
Headless、Session、InputPilot 已显式 audit/research 改名，旧 trusted reader/Bot helper 与 V1
workload 包装已删除，Product/QuickMatch/survival source 相对 PA5a 基线无改动。V5/legacy 私有
分支可独立切片，V5 只调用 command-source，legacy 才执行显式 audit getter→普通 `createInput`；
V5 presentation step getter 增量为 `0`，legacy pre/post 各一次。关键门为 architecture + allowlist +
LocalSession `63/63`、更广 MatchCore/Replay/Session/Bot/survival `92/92`、typecheck、
documentation `265/839/57` 与 `git diff --check` 全绿；基线 `missing=0 / changed=62 / extra=1`，
extra 为授权 allowlist test。HEAD/upstream 均为 `d750e4c...`，未 commit/push。

首轮假绿 `52/52` 与第二轮 V5/legacy span 假绿均保留为历史证据，不与第三轮计数拼接；两轮
红门及其修复路径已记录在上文。PA5b/PA5c/PA5d、PA6/PA7、全量 test/build、formal performance、
设备、美术与 commit/push 仍关闭。

### 四门文件面

**PA5a legacy 边界与真实改名**允许修改：

`packages/arena-match/src/match-core.ts`、`packages/arena-match/src/index.ts`、
`packages/arena-match/src/replay.ts`、`packages/arena-match/src/fixed-step-match-runtime.ts`、
`packages/arena-session/src/local-match-session.ts`、`packages/arena-session/src/index.ts`、
`packages/arena-bot/src/bot-controller.ts`、`packages/arena-bot/src/bot-observation.ts`、
`packages/arena-bot/src/index.ts`（仅旧 trusted snapshot 面退出所需的类型/出口核对）、
`packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts`、
`packages/arena-regression/src/arena-v2-survival-golden-replay-scenario.ts`、
`scripts/arena-input-fuzz.ts`、`scripts/arena-survival-supply-stress.ts`、
`src/arena/entry/match-core-poc.ts`，以及现有
以下逐文件 authority full-snapshot research callers：
`packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts`、
`packages/arena-v1-experiment/src/arena-v1-map-timeline-workload.ts`、
`packages/arena-v1-experiment/src/arena-v1-matchcore-invariant-workload.ts`、
`packages/arena-v1-experiment/src/arena-v1-movement-stress-workload.ts`、
`packages/arena-v1-experiment/src/arena-v1-scripted-pressure-workload.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-attack-jump-interleave-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-blood-shadow-hook-blade-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-flank-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-launch-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-magic-blood-scythe-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-mammoth-stone-axe-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-multiplayer-edge-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-phantom-tiger-fist-edge-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-phantom-tiger-fist-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-read-punish-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-true-hades-hook-scythe-replay-prototype.ts`、
`packages/arena-v1-experiment/src/arena-v2-weapon-white-platinum-dual-guns-replay-prototype.ts`。

`packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts` 同步移除旧
`attachTrustedSnapshotReader/createInputFromTrustedSnapshot` 装饰器，只保留普通 legacy
`createInput(snapshot)` 与 PA3b V5 command-source handshake；不得为旧 reader 创造新的 wrapper。

`packages/arena-match/src/fixed-step-match-runtime.ts` 仅是 test/dev legacy allowlist：不是真实生产入口，
不接入 PA5b Session capability；只有为了显式标记其 audit 名称或 architecture reachability 才可有
最小 hunk，否则保持零 diff。

InputPilot 仅作为 research-only 显式 Legacy/Audit adapter 的可选接线面：
`packages/arena-input-pilot/src/input-pilot-observed-session.ts`、
`packages/arena-input-pilot/src/input-pilot-observed-match-service.ts`（只有实际 adapter wiring/type
需要时才可修改）、`packages/arena-input-pilot/src/index.ts`（只有显式 adapter contract 需要出口时才可修改）、
`packages/arena-input-pilot-presentation/src/input-pilot-presentation-runtime.ts`（只用于锁定
research-only reachability；合同不变时不得改）。`arena-product-session-stress.ts`、
`arena-profile-persistence-stress.ts` 与 input-pilot web 的 UI/Pilot state snapshot 不属于本面。

以下不是 PA5a source：`packages/arena-product-match/src/product-match-runtime.ts`、
`packages/arena-product-match/src/product-match-coordinator.ts`、`packages/arena-product-session/src/ports.ts`、
`packages/arena-product-session/src/product-session-controller.ts`、
`packages/arena-quick-match/src/quick-match-service.ts`、
`packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`；它们只在 PA5c
同步退出旧 surface。`packages/arena-experiment/src/index.ts`、
`packages/arena-experiment/src/simulation-workload-registry.ts`、
`packages/arena-experiment/src/simulation-runner.ts` 的 `ArenaSimulationCase.getSnapshot()` 是
Experiment domain 的标准化 `SimulationSnapshot`，不改名、不加入 authority legacy 改名面。

PA5a **允许修改/新增的测试文件**逐文件固定为：
`tests/architecture.test.ts`、`tests/arena/pa5a-legacy-snapshot-allowlist.test.ts`（新增）、
`tests/arena/match-core.test.ts`、`tests/arena/match-core-equipment.test.ts`、
`tests/arena/match-core-movement.test.ts`、`tests/arena/match-core-survival-supply.test.ts`、
`tests/arena/replay.test.ts`、`tests/arena/character-foundation.test.ts`、
`tests/arena/stage5-map-integration.test.ts`、`tests/arena/local-match-session.test.ts`、
`tests/arena/local-match-session-bot-read.test.ts`、`tests/arena/bot-match-read-bundle.test.ts`、
`tests/arena/bot-survival-composition.test.ts`、`tests/arena/match-read-frame.test.ts`、
`tests/arena/match-read-port.test.ts`、`tests/arena/presentation/input-pilot-runtime.test.ts`、
`tests/arena/study/human-match-study.test.ts`、`tests/arena/product/stage8-content-pool.test.ts`、
`tests/arena/regression/golden-replay.test.ts`、`packages/arena-match/test/match-foundation.test.ts`、
`packages/arena-input-pilot/test/input-pilot-vocabulary.test.ts`、
`packages/arena-input-pilot-presentation/test/input-pilot-presentation-runtime.test.ts`。

以下直接或间接依赖本门 authority/Session 改名，也属于允许修改面：
`tests/arena/bot-controller.test.ts`、`tests/arena/bot-goals.test.ts`、
`tests/arena/bot-mobility.test.ts`、`tests/arena/bot-observation.test.ts`、
`tests/arena/bot-observation-v5.test.ts`、`tests/arena/input/input-frame-rate.test.ts`、
`tests/arena/input/input-match-integration.test.ts`、`tests/arena/trusted-input-batch.test.ts`、
`tests/arena/pa3b-outer-wiring.test.ts`、`tests/arena/pa4a-session-read-frame.test.ts`、
`tests/arena/presentation/greybox-renderer.test.ts`、
`tests/arena/presentation/presentation-foundation.test.ts`。

本轮旧 Bot 面退出还允许修改 `packages/arena-bot/test/bot-foundation.test.ts`、
`tests/arena/bot-controller.test.ts`、`tests/arena/bot-observation.test.ts`、
`tests/arena/bot-observation-v5.test.ts`、`tests/arena/bot-survival-composition.test.ts`；
这些文件只验证 V5 command-source、普通 legacy 投影和供给边界，不得重新引入
`trustedBinding`/`TrustedSnapshotReader`/旧 attach/create 方法。

PA5a **只运行、不得默认产生 diff 的受影响回归文件**（仅保留真正不依赖本门
authority API 改名的文件）：
`packages/arena-quick-match/test/quick-match-foundation.test.ts`、
`packages/arena-v1-composition/test/arena-v1-composition.test.ts`、
`packages/arena-experiment/test/experiment-primitives.test.ts`、
`tests/arena/experiment/arena-experiment.test.ts`。

`packages/arena-experiment/test/experiment-primitives.test.ts`、
`tests/arena/experiment/arena-experiment.test.ts` 与 `scripts/arena-match-stress.ts` 中的
`simulationCase.getSnapshot()` 是 Experiment `SimulationSnapshot` 消费，不是 authority full
snapshot，明确只运行/不改名。Product/Profile/UI/Map/Equipment 自身 `getSnapshot()` 测试、
`scripts/arena-product-session-stress.ts`、`scripts/arena-profile-persistence-stress.ts` 与
input-pilot web state snapshot 也明确排除。

PA5a 必须是真实迁移，不是只新增 alias：`MatchCore.getSnapshot()` 改为
`getLegacyFullSnapshotForAudit()`；`createTrustedPublicSnapshotReader()` 的旧 Bot 语义在本门默认删除，
不因测试而新建 reader。只有实施中发现现有且已列入允许面的 verifier/differential source 确实需要
reader，并提交 necessity evidence，才允许引入显式 `createLegacyFullSnapshotAuditReader()`；测试本身不是保留
API 的理由。PA5a 专测应证明旧 reader symbol/生产 reachability 消失，并验证现有 MatchRead sidecar/bundle
边界，不把边界测试列为 reader caller。Headless
`runUntilEnded()` 改为 `runLegacyUntilEndedForAudit()`，`step(frames)` 永久不改。LocalSession
新增/固定显式 `getLegacyFullSnapshotForAudit()`、`runLegacyUntilEndedForAudit()`、必要时
`stepWithLegacySnapshotForAudit()`；模糊 Session surface 留到 PA5c 删除，PA5a 不新增 caller。
regression、列出的 experiment workload、fuzz/stress/POC、human study 与 InputPilot observed
wrapper/test 全部转到显式 audit/research adapter。`scripts/arena-formal-survival-bot-pressure.ts`
在 PA5a 是精确 residual，PA5b 一次性迁移到 readStep 后移除其 LocalSession 模糊 snapshot 调用。
LocalMatchSession 内仍保留的 full-snapshot fallback 只位于无 `botMatchReadBundle` 的显式
legacy 分支；其允许 caller 精确为 `tests/arena/local-match-session.test.ts`、
`tests/arena/local-match-session-bot-read.test.ts`、`tests/arena/pa3b-outer-wiring.test.ts`、
`tests/arena/pa4a-session-read-frame.test.ts` 的 legacy differential/control 用例，及
`scripts/arena-formal-survival-bot-pressure.ts` 的 PA5b residual。QuickMatch 与正式 survival
production source 均必须先有 bundle，再进入 V5 分支；PA5a architecture/allowlist test 必须
同时证明该 fallback 不在两条 outer production reachability 内，且 V5 分支绝不调用 Core full snapshot。
BotController 的 `createInput(snapshot)` 是上述 legacy/audit 分支的普通投影入口，不是 trusted
reader；其旧 `trustedBinding`/`TrustedSnapshotReader`/旧 attach/create 面在 PA5a 删除。
`packages/arena-experiment/src/index.ts`、`simulation-workload-registry.ts`、`simulation-runner.ts`
及其 generic tests 不改名；`scripts/arena-match-stress.ts` 对 `simulationCase.getSnapshot()` 同样
不改名。内部 `MatchTimelineSystem.getSnapshot()`、`MatchParticipantSystem.getSnapshot()` 等非
Arena authority full snapshot 也排除。

**PA5b bundle/readStep**只允许修改：

`packages/arena-session/src/bot-match-read-bundle.ts`、`packages/arena-session/src/local-match-session.ts`、
`packages/arena-session/src/index.ts`、新增
`packages/arena-performance-evidence/src/arena-read-step-measurement-v2.ts`、其
`src/index.ts`、新增 `scripts/lib/arena-read-step-runner-v2.ts`、
`scripts/arena-formal-survival-bot-pressure.ts`，以及新增
`packages/arena-performance-evidence/test/arena-read-step-measurement-v2.test.ts`、
`tests/arena/pa5b-full-audit-bundle.test.ts`、`tests/arena/pa5b-read-step-runner.test.ts`、
`tests/arena/bot-survival-stress.test.ts` 和
`tests/architecture.test.ts`。

full-audit readers 必须在现有 `createMatchReadBotBundleV2` 的唯一 binding 事务内，按
`config.participantIds` 稳定顺序调用现有 Core sidecar reader API；存入同一 BundleRecord，和
frame/mobility reader 共用生命周期。禁止第二个 binding、bundle factory、WeakMap manager 或
Core reader owner；失败由 outer 新 Core owner quarantine/destroy，factory 不自行 destroy。

schedule 唯一属于 formal runner/evidence 层。readStep 顺序严格为：pre frame/local sidecar →
player mapper → Bot input → authority step/Replay record → post frame/events/result → scheduler
判定 → 触发时 Session full-audit → differential/recomposition → 停止计时；序列化/evidence hash
才在计时外执行。Headless runner 只保留 authority `step(frames)` 与 Replay 记录，不持有
Session/bundle。

唯一 measurement contract 位于 `arena-performance-evidence` 新文件，导出
`ARENA_READ_STEP_MEASUREMENT_SCHEMA_VERSION=2` 和严格 `ReadStepMeasurementV2`；不进入
arena-session/authority contracts，不与 `MatchReadFrameV2.schemaVersion=2` 混用。

#### PA5b 首轮实现候选开发自检（2026-07-30，历史；随后被独立拒绝）

PA5b 当时状态为 `implementation-candidate / coordinator-independent-review-pending /
formalGate=false`；本段只记录首轮开发自检，随后被主协调独立验收拒绝，不能与下方修订证据拼接。
实施前保存了新的
`/private/tmp/arena-pa5b-before.*`，未覆盖 PA5/PA5a 基线；branch 为
`feature/arena-v2-design-docs`，HEAD/upstream 均为 `d750e4caa767332b5c3caaf247080b5717d56219`，
基线为 125 dirty entries（102 tracked、23 untracked）。PA5c/d、PA6/PA7、完整
`npm test`/完整 build、正式 CPU/formal300、设备/模拟器、美术和 commit/push 仍关闭。

实现只触及本节 PA5b allowlist：现有 bundle 在同一 binding 事务中按 Core participant 顺序
创建 full-audit readers，Session 仅提供按需冻结 evidence result；新增 runner/evidence 层
独占 schedule 与 `measurementSchemaVersion=2`，formal pressure 不再调用模糊 LocalSession
snapshot。未新增 binding、bundle factory、WeakMap manager、raw reader export 或 authority
schema；PA5c source 保持零 diff。

首轮开发自检证据：PA5b 专测 `4/4` Node、measurement `2/2` Vitest、architecture 与新增测试
合跑 `55/55`、既有 bundle/Session/MatchRead/Replay/ordinary/survival 受影响链 `105/105`、
`bot-survival-stress` `8/8`、`build:packages` `52 packages / 11 waves`、`typecheck:app`、
lint、git diff check 均通过；本轮未运行完整 npm test/build、正式 CPU/formal300、模拟器或设备。
既有正式 pressure 仍仅作为允许的测试夹具验证，不宣称性能门通过。测试覆盖稳定 participant
顺序、duplicate schedule、full-audit 身份/失效、active transaction、ordinary/formal projection、
pause/resume/ended、tampered/future schema、accessor/Proxy/thenable fail-closed 与重入边界。

首轮开发自评（100 分，已被独立红门覆盖）：架构 `20/20`、行为等价 `19/20`、生命周期/失败关闭 `15/15`、确定性/Replay
`15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，合计 `95/100`，各维≥80%。
性能扣分仅因本门禁止正式 CPU/readStep 门；首轮候选随后被独立红门拒绝，不解锁 PA5c。

#### PA5b 第一轮主协调独立验收拒绝与修订范围（2026-07-30，历史）

主协调独立验收维持 `rejected-after-independent-review / formalGate=false`，红门事实不得
被首轮 `4/4`、`55/55` 或其它早期计数覆盖：R1 为 bundle publish 前无条件 eager full-audit，绕过
runner-only schedule；R2 为 tick0 frame/full-audit/校验/重组成本未进入 formal 聚合计时；R3 为
`events.length > 0` 触发未知事件且没有固定 17 类集合；R4 为 differential/recomposition 可选且
formal pressure 未实际调用，未逐 participant、逐字段重组 legacy audit oracle；R5 为 partial
reader construction、paused/resume/ended、duplicate schedule、全边界、tick0 与 accessor/Proxy/
thenable 证据不足；R6 为台账/ADR 把未验证 schedule/differential 覆写成已实现。该段保留为
独立拒绝历史，修复后才重新形成下方候选。

#### PA5b 第二轮修订候选开发自检（2026-07-30）

该段记录第二轮修订候选的当时状态 `implementation-candidate / coordinator-independent-review-pending /
formalGate=false`，不代表最终主协调签核；PA5c/PA5d、PA6/PA7、全量 test/build、正式 CPU/formal300、
设备/模拟器、美术与 commit/push 仍关闭。保留既有 `/private/tmp/arena-pa5b-before.*`：实施前
branch 为 `feature/arena-v2-design-docs`，HEAD/upstream 均为
`d750e4caa767332b5c3caaf247080b5717d56219`，基线 125 dirty（102 tracked、23 untracked）；
相对该基线，新增路径均为 PA5b allowlist，existing-path hash 变化无越界且 `missing=0`。

R1 修复为不再 eager full-audit；full-audit reader 仍按稳定 participant 顺序在同一既有 binding
事务中创建并保存到同一 BundleRecord。普通 bundle 构造、Session start 和未命中 schedule 的
V5 step 读取计数均为 0，只有命中 schedule 才读取全部 participant sidecars。R2 修复为 runner
tick0 的 frame、full-audit、验证与 mandatory recomposition 都由同一个 measurement 包围，formal
pressure 将 tick0 measurement 与每个 readStep measurement 一并聚合；serialization/hash 不计入
该边界。R3 固定 `ARENA_MATCH_EVENT` 的 17 类集合，未知事件不触发，重复事件与 interval/phase/
boundary/ended 在同一稳定 tick 去重。R4 由 runner 强制执行 world + 全 participant sidecar 的
冻结、身份、顺序和逐字段 legacy full-snapshot recomposition；custom differential 只能附加，
缺失或任一字段/顺序/reason/lane/source/primary/remaining/supply/freeze 不一致即失败。

修订证据：PA5b bundle/runner `9/9` Node；measurement `2/2` Vitest；architecture 与 PA5b 新增
测试合跑 `60/60`；既有 MatchRead/Session/Replay/ordinary/survival 受影响链 `162/162`；
`bot-survival-stress` `8/8`；`build:packages` `52 packages / 11 waves`；`typecheck:app`、lint、
`git diff --check` 通过。专测包含真实 ordinary 与 formal survival production Session、tick0
fake-clock 聚合、17 类/未知/重复事件及 599/600/601、1199/1200/1201、1799/1800/1801、
2399/2400/2401 边界，partial reader 失败隔离、paused/resume/ended 稳定 identity、future/
tamper/accessor/Proxy/thenable fail-closed 与 mandatory recomposition。未运行完整 npm test/build、
正式 CPU/formal300、设备/模拟器或性能宣称；下一步仅等待主协调第二轮独立验收。

修订候选自评（100 分）：架构 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay
`15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，合计 `96/100`，各维≥80%；性能扣分
仍仅因正式 CPU/readStep 门未在本门宣称通过。

#### PA5b 第二轮主协调独立验收拒绝：R7–R9（2026-07-30，历史）

第二轮独立状态为 `rejected-after-independent-review / formalGate=false`，不得与首轮 R1–R6
修订证据拼接。R7 的仓库外审计发现 `bot-match-read-bundle.ts` 把测试 factory、full-audit
计数字段和热路径自增放进生产 BundleRecord；R8 的
`/private/tmp/arena-pa5b-world-tamper-repro.ts` 证明只核对 tick/eventSequence/phase 且从 post
frame 取 world 时，可接受合法冻结但嵌套字段被篡改的 full-audit world；R9 证明 tick0 仍以裸
`measurementMicros:number` 绕过唯一 `ReadStepMeasurementV2` evidence。三项均为阻断性合同红门，
首轮 9/9、60/60 等计数保留为被拒候选的历史快照，不作为本轮通过证据。

#### PA5b 第三轮主协调独立签核（2026-07-30）

状态为 `completed / coordinator-approved / formalGate=false`，评分 `96/100`；
PA5c/PA5d、PA6/PA7、全量 test/build、正式 CPU/formal300、设备/模拟器、美术与 commit/push
继续关闭。R7 已移除生产 bundle 的 test factory、read counter、test-only export 与热路径计数；
partial-reader 失败改由测试进程在加载 bundle 前隔离 monkeypatch 原生 Core reader factory，
证明失败不发布 bundle、同 Core 不能重试且 outer destroy 恰一次。普通构造/start/未命中 schedule
不进行 full-audit 的证据改由测试 port wrapper 计数，不再改变生产状态或正式计时。

R8 的 `requireFullAudit` 现在先验证 full-audit 自带 world 的递归冻结、可枚举 data 字段、字段顺序
和完整 ordered parity，再允许 legacy oracle；mandatory recomposition 改为消费该已验证的
`fullAudit.worldSnapshot`。当前与 post-step 的 `remainingTicks`、participant、equipment、map、
formal supply 嵌套篡改均在 oracle 前拒绝。R9 的 tick0 与普通 readStep 共用唯一
`ReadStepMeasurementV2`：pre-frame/schedule/full-audit/differential/total 均有实际计时，mapper 与
authority-step 段明确为 0；identity 与 `fullAuditPerformed=true` 同步，formal pressure 聚合
`initialAudit.measurement.totalMicros`，不存在裸 scalar 旁路，measurement 构造在 total timer 停止后。

主协调独立证据为：仓库外 `/private/tmp/arena-pa5b-world-tamper-repro.ts` 已由
`TAMPER_ACCEPTED` 转为 exit 1；生产 bundle 中不存在 `FULL_AUDIT_READER_FACTORY_FOR_TEST`、
`withFullAuditReaderFactoryForTest`、`fullAuditReadCount`、`getFullAuditReadCountForTest` 或
`initialFullAudit`；tick0 返回 `ReadStepMeasurementV2`，formal 聚合
`initialAudit.measurement.totalMicros`，不存在裸 `measurementMicros` 旁路；主协调独立 Node
`61/61`、measurement Vitest `2/2`、`bot-survival-stress` `8/8`，`build:packages` `52 packages / 11 waves`，
typecheck、lint、documentation `265/839/57` 与 `git diff --check` 均通过。基线 `missing=0`，为
8 个既有 allowlist path 与 5 个新增 allowlist path 的变化；工作树 `131 dirty（103 tracked、28 untracked）`，
branch/HEAD/upstream 保持不变。

PA5b 专测证据为 bundle/runner `10/10` Node，measurement `2/2` Vitest，architecture 与
PA5b 合跑 `61/61`（architecture `51/51`）；受影响 MatchRead/Session/Replay/ordinary/survival
链 `197/197`、`bot-survival-stress` `8/8`，`build:packages` `52 packages / 11 waves`、
`typecheck:app`、lint、documentation 与 `git diff --check` 均通过。R7–R9 对应的隔离失败、tick0
schema/聚合与 current/post nested tamper 均已落库，architecture 静态门禁止生产 test seam 与
`measurementMicros` 旁路。未运行完整 npm test/build、正式 CPU/formal300、设备/模拟器，不得写成
性能或 formal 通过；扣分仅因这些正式门与 PA5c/d 尚未执行，不是 PA5b 功能红门。
独立评分为架构 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、
性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，合计 `96/100`，各维≥80%。PA5c/d、正式
CPU/formal300、设备/模拟器、美术与 commit/push 仍关闭。

**PA5c Product/Session/outer 旧 surface 退出**当前为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`；本轮已完成实现与开发自检，尚未主协调签核。
本门不是只删三个 getter，而是原子退出整条 legacy Product flow：

- 删除 `ProductMatchRuntime.start()/step()/getSnapshot()` 与 `ProductMatchStepOutcome`；只保留
  `startWithReadFrame()/getReadFrame()/stepWithReadFrame()` 及合法 lifecycle/public/result/export/destroy。
- 删除 `ProductMatchCoordinator.start()/step()/getMatchSnapshot()`；保留
  `prepare()/setPaused()/startWithReadFrame()/getMatchReadFrame()/stepWithReadFrame()/getResult()`、
  release/reset/destroy，以及属于自身 Product state 的 `getSnapshot()`。
- 删除 `ProductSessionController.beginMatch()/stepMatch()/getActiveMatchSnapshot()` 与
  `ProductSessionStepOutcome`；保留 `beginMatchWithReadFrame()/getActiveMatchReadFrame()/
  stepMatchWithReadFrame()`、自身 state `getSnapshot()`、生命周期、result/release/destroy。
- `ProductPresentationFlow.stepMatch()` 是表现层 V2 wrapper，明确保留；不得与已删除的
  `ProductSessionController.stepMatch()` 混淆。
- LocalSession 的 `step()/getSnapshot()/runUntilEnded()` 全部退出；固定显式
  `stepWithLegacySnapshotForAudit()/getLegacyFullSnapshotForAudit()/runLegacyUntilEndedForAudit()`。
  研究、灰盒与 InputPilot 只能调用这些显式 adapter。

**PA5c 精确 source allowlist（允许修改）**：

1. `packages/arena-session/src/local-match-session.ts`：LocalSession legacy 方法改名/退出，保留 V2
   frame path 与显式 audit adapter。
2. `packages/arena-session/src/index.ts`：仅在 LocalSession result/Legacy-Audit 类型或出口实际变化时同步。
3. `packages/arena-product-match/src/product-match-runtime.ts`：删除 runtime legacy flow、port capture
   与 `ProductMatchStepOutcome`。
4. `packages/arena-product-match/src/product-match-coordinator.ts`：删除 coordinator legacy flow 与
   `getMatchSnapshot`，保留自身 state `getSnapshot`。
5. `packages/arena-product-match/src/index.ts`：移除旧 outcome 类型公开出口。
6. `packages/arena-product-session/src/ports.ts`：删除旧 coordinator method capture/port 字段。
7. `packages/arena-product-session/src/product-session-controller.ts`：删除 controller legacy flow。
8. `packages/arena-product-session/src/index.ts`：移除 `ProductSessionStepOutcome` 公开出口。
9. `packages/arena-quick-match/src/quick-match-service.ts`：`SESSION_METHODS` 不再捕获模糊
   `step/runUntilEnded/getSnapshot`，只保留 V2-safe Session contract。
10. `packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`：同上，正式
    survival 不捕获模糊旧方法。
11. `packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts`：三处 LocalSession step
    改为显式 audit step。
12. `packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts`：旧 Session step 改为
    显式 audit step；不改变 Experiment 其它 API。
13. `packages/arena-v1-greybox-session/src/greybox-presentation-session.ts`：研究 wrapper 改用
    Legacy/Audit Session port。
14. `packages/arena-presentation-runtime/src/arena-match-resources.ts`：灰盒/研究 resource port
    改为显式 Legacy/Audit contract，禁止 Product/Application reachability。
15. `packages/arena-input-pilot/src/input-pilot-observed-session.ts`：observed wrapper 的 full-snapshot
    `step/getSnapshot/runUntilEnded` 改为显式 Legacy/Audit 名称。
16. `scripts/arena-product-session-stress.ts`：`beginMatch/stepMatch` 迁移至真实 V2 read-frame flow；
    该脚本自身 ProductSession state 的 `getSnapshot()` 不改。

`packages/arena-input-pilot/src/input-pilot-observed-match-service.ts` 与
`packages/arena-input-pilot/src/index.ts` 仅在真实 adapter 类型/wiring 必需时允许修改，否则必须
保持 zero diff。PA5c 不允许修改 `packages/arena-match/src/match-core.ts`，该文件已由 PA5a 完成。
`packages/arena-product-composition/src/product-session-composition.ts`、ProductPresentation、Core、Rule、
Bot、Replay、hash、golden、Platform 与资产均不在本门 source 面。

**PA5c 测试修改 allowlist**：

`tests/architecture.test.ts`、`tests/arena/pa5c-legacy-surface-exit.test.ts`、
`tests/arena/local-match-session.test.ts`、`tests/arena/local-match-session-bot-read.test.ts`、
`tests/arena/pa3b-outer-wiring.test.ts`、`tests/arena/pa4a-session-read-frame.test.ts`、
`tests/arena/bot-survival-composition.test.ts`、`tests/arena/match-read-frame.test.ts`、
`tests/arena/match-read-port.test.ts`、`tests/arena/presentation/input-pilot-runtime.test.ts`、
`tests/arena/study/human-match-study.test.ts`、`tests/arena/product/stage8-product-session.test.ts`、
`tests/arena/product/stage8-product-state.test.ts`、`tests/arena/pa4b-1-product-real-session.test.ts`、
`packages/arena-product-match/test/product-match-lifecycle.test.ts`、
`packages/arena-product-match/test/pa4b-1-product-v2.test.ts`、
`packages/arena-product-session/test/product-session-lifecycle.test.ts`、
`packages/arena-product-session/test/pa4b-1-product-v2.test.ts`、
`packages/arena-v1-composition/test/arena-v1-composition.test.ts`、
`packages/arena-presentation-runtime/test/arena-match-resources.test.ts`、
`packages/arena-input-pilot/test/input-pilot-vocabulary.test.ts`、
`tests/arena/pa5a-legacy-snapshot-allowlist.test.ts`。

`packages/arena-v1-composition/test/arena-v1-composition.test.ts`、LocalSession/Bot-read、PA3b、PA4a、
InputPilot runtime、human study、stage8 Product Session、两个 Product PA4b-1、两个 Product lifecycle、
`pa4b-1-product-real-session.test.ts` 和 architecture 均属于实际迁移测试，不是只运行项。
ProductPresentation、quick-match、greybox、regression、experiment 其余测试可列为 run-only；若实现
发现它们直接依赖旧符号，必须停下重新授权，不得自动扩围。

**PA5c 历史拒绝与本轮修订**：此前 caller/call-graph 第一轮仅列旧 getter 与有限 Session residual，遗漏了
LocalSession wrapper 和 Product `start/step/begin/step` 完整链；第二轮独立补审据此拒绝签核。本轮将
`arena-product-session-stress.ts`、Product ports/index、LocalSession index、greybox/resource/InputPilot
wrapper 与上述直接测试 caller 纳入精确面；不覆盖历史假绿，也不把 PA5c 写成 implementation started。

#### PA5c caller/call-graph correction 主协调独立签核（2026-07-30）

两轮 caller/call-graph 拒绝后，完整 Product legacy flow、LocalSession 显式 Legacy/Audit adapter、
regression/experiment/greybox/InputPilot wrapper、Product stress script、ports/index 与直接测试面已
逐文件修订；ADR-018 的 D1/D2 状态与三接口生效证据也已修正。相对
`/private/tmp/arena-pa5c-doc-correction-before.*` 仅三份文档 changed，`missing=0/extra=0`；主协调
独立 `check:documentation=265/839/57` 与 `git diff --check` 通过。评分 `96/100`（架构20、行为20、
生命周期15、确定性15、性能12、迁移9、治理5），`formalGate=false`。该签核只批准 correction design，
不代表 PA5c implementation started；PA5d、正式性能、设备、美术与 commit/push 继续关闭。

#### PA5c implementation candidate 开发自检（2026-07-30）

本轮仅在批准的 PA5c source/test allowlist 内实施：LocalMatchSession 的模糊
`step/getSnapshot/runUntilEnded` 已退出并固定为显式 Legacy/Audit adapter；三层 Product
legacy start/step/read-frame outcome 与 port capture 已退出，V2 read-frame trio 成为正式入口；
QuickMatch/survival 只捕获 V2 Session surface。regression、experiment workload、greybox、
InputPilot observed wrapper、presentation resources 与 Product stress script 已完成显式迁移；
Experiment `SimulationSnapshot.getSnapshot()`、Product 自身 state `getSnapshot()`、
ProductPresentationFlow.stepMatch() 与 Headless `step(frames)` 保持各自域语义。

开发自检证据：此前 D1–D7 修复前的 LocalSession、Bot/MatchRead、PA3b、PA4a、PA4b-1、Product
lifecycle、Product state、human study、InputPilot 受影响 Node 链 `206/206` 与 package Vitest
`66/66` 作为历史证据保留；其中旧方法名断言造成的 `205/206` 红门及其修复也不与本轮计数拼接。
D1–D7 修复后、D9–D14 之前的历史源码上重跑了完整 `tests/arena` 108 文件集合，曾为 `855/855`；相对首轮约定
的 Node 文件集合差集为 `∅`，没有因 runner 纠正而漏项。原定 6 个 package Vitest 文件集合也
保持不变：`packages/arena-product-session/test/{product-session-lifecycle,pa4b-1-product-v2}.test.ts`、
`packages/arena-product-match/test/{product-match-lifecycle,pa4b-1-product-v2}.test.ts`、
`packages/arena-input-pilot/test/{input-pilot-vocabulary,input-pilot-trial-controller}.test.ts`，
文件差集为 `∅`，当时实际为 `64/64`；历史 `66/66` 仅保留为旧轮计数，不并入当前 D9–D14 结论。四个
仓库外 D1/D5/D6/D7 hostile Promise/rejected-thenable 复现均 exit 0。ordinary Product stress
`200/200`、ordinary golden replay `4/4` 与 survival golden replay `1/1` 通过；`typecheck:app`、
`build:packages`（`52 packages / 11 waves`）与 lint 已通过。
当前未运行完整 npm test/build、PA5d、正式 CPU/formal300、设备/模拟器、美术或 commit/push；因此本段
只记录 implementation candidate，不构成完成签核。

本轮状态保持 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`。
主流程、V2/Legacy 分支隔离、端口必需三件套、research-only 显式 adapter、pause/resume/ended、
reentry/thenable、构造失败、cleanup retry/exact-once 与 Replay/hash 语义均须由主协调独立复审；
任一新 caller 或 allowlist 外路径均为停止条件。PA5d、PA6/PA7、正式性能、设备/模拟器、美术与
commit/push 继续关闭。

#### PA5c 独立复核 D1–D7 红门与修订历史（2026-07-30）

本段保留本轮 implementation candidate 的独立红门，不把修复前的局部绿计数拼接成签核：D1 发现
Product Session port 的 `getResult()` 未先拒绝 rejected Promise，导致同步失败之外仍有
`unhandledRejection`；D2 发现 LocalSession 在 legacy/presentation step、paused/destroy/read-frame/
full-audit 重入时复用错误的方法诊断名；D3 发现 ADR/ledger 顶部当前状态互相矛盾；D4 发现 Product
ports、生产 reachability 与 research adapter 的静态门用混合或过宽 span，不能证明旧 capture/动态
字符串已退出；D5 发现 InputPilot 显式 Legacy/Audit delegate 的 start/step/collector/destroy
同步边界缺少 rejected thenable 收容，且 cleanup 失败可能留下未清理资源。

随后 D6 复现 hostile thenable 在调用自身 `then()` 后返回 rejected Promise 的泄漏；修订为不执行普通
hostile thenable，只尝试收容 native/foreign Promise。D7 又复现 native/foreign Promise 被 own
accessor/non-function `then` shadow 后的 rejection 泄漏；修订为先以原生 Promise internal-slot 品牌调用
挂收容处理器，再扫描普通对象描述符且不执行 getter/hostile `then`。仓库内与仓库外证据均必须记录
getter=0、普通 hostile thenable 不调用 `then`、无 unhandled rejection；修订后状态仍为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`，不是完成签核。

#### PA5c D9–D14 coordinator-authorized remediation（2026-07-30，D15–D18 最终签核前历史快照；已被后文最终签核覆盖）

本段保留后续独立红门及其最小修复事实，不拼接 D1–D7 的历史局部绿证据：D9 修复 ProductMatch
port 的 brand-first 同步拒绝与 ordinary non-function `then` 语义；D10 统一 ProductPresentation 与
arena-presentation-runtime capability utility，并在 runtime/flow/resources 实际调用覆盖 hostile、
shadowed native/foreign Promise、getter=0 与无 unhandled；D11 修复 Coordinator raw candidate
cleanup 的异步返回收容与 retry ownership；D12 修复 QuickMatchProductFactory 构造 rollback 的固定
cleanup owner，并让 Coordinator 在 pending cleanup 时保持真实状态；D13 修复 ProductMatchRuntime 终局
`session.getState()`/`session.exportReplay()` 的同步端口收口；D14 修复 InputPilot audit
`inputProvider` 与 `state` 的同步边界。普通非函数 `then` 按同步值继续处理，只有 Promise brand、accessor
或函数 thenable 被拒绝；普通 hostile `then` 不执行，shadow getter 不执行。

这些 D9–D14 修复均为 coordinator-authorized PA5c source/test scope extension，仅涉及 ProductMatch
的已批准 ports/factory/coordinator/runtime/lifecycle tests、ProductPresentation 与
presentation-runtime 的已批准 capability utility/tests，以及 InputPilot observed source/test。
该段记录当时 PA5c 仍为 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`；
PA5d、正式性能、设备、模拟器、美术、commit/push 继续关闭。

**D9–D14 修复后当前源码复验（2026-07-30）**：直接受影响的四个 package Vitest 文件为 `72/72`；原定六文件
集合为 `71/71`（当前 product-match lifecycle 已扩展为 12 tests、InputPilot vocabulary 为 29 tests）。完整
`tests/arena` Node 集合为 `108 files / 855/855`，文件差集为 `∅`；`tests/architecture.test.ts` 为 `53/53`。
`npm run build:packages` 为 `52 packages / 11 waves`，`typecheck:app`、lint、`npm run check:documentation`
的 `265/839/57` 与 `git diff --check` 均通过。ordinary Product stress 为 `200/200`，ordinary golden replay
为 `4/4`，survival golden replay 为 `1/1`；四个已约定外部 D1/D5/D6/D7 Promise 探针均 exit 0。该计数只代表
当前 D9–D14 修复后源码，不与前述历史 `64/64` 或早期局部绿证据拼接；PA5c 仍待主协调独立复核。

#### PA5c D15–D18 独立红门与修复记录（2026-07-30）

本段记录 D15–D18 的后续独立阻断，不把修复前计数或旧源码证据拼接到当前结论。D15 发现
`ProductMatchCoordinator.prepare()` 将工厂原始返回值再次交给 Promise 链，普通 hostile thenable 被
assimilation 且 rejected Promise 泄漏；D16 发现 `ProductSessionController.#boot()` 对
`ProfileService.open()` 有同样的原始 `Promise.resolve` 边界；D17 发现 `#prepareMatch()` 对
`MatchCoordinator.prepare()` 的 Promise 回调再次解析原始值；D18 发现 `#report()` 用
`Promise.resolve(result).catch(...)` 观察 diagnostic sink，仍会执行 hostile thenable。四项均属于 PA5c
唯一 V2 产品链的同步返回/失败关闭边界。

修订在已授权的 ProductMatch/ProductSession ports、Coordinator、Controller 与既有 lifecycle test
文件内完成：各包使用模块初始化时捕获的原生 `Promise.prototype.then` 先做 internal-slot brand probe；
真实 native/foreign Promise 通过冻结 envelope 进入后续同步校验并先挂 rejection handler，普通对象的
`then` 只读取 descriptor，不执行 getter 或函数；data `then:null`/非函数保持同步对象语义。diagnostic
sink 采用只观察的 brand-first containment，hostile thenable 不影响产品状态。D15–D18 的调用级测试覆盖
hostile、native、foreign、shadowed rejection、ordinary non-function `then`、无 unhandled rejection、
成功 boot/prepare、recoverable error、现有 late cleanup ownership 与 retry 语义。

**PA5c 主协调独立签核与 D15–D18 修复后最终证据（2026-07-30）**：PA5c 状态为
`completed / coordinator-approved / formalGate=false`，评分 `96/100`（架构20/20、行为等价20/20、
生命周期/失败关闭15/15、确定性/Replay/hash15/15、性能可证伪12/15、迁移/回滚9/10、治理5/5）。
性能扣分仅因本门未运行正式 CPU/PA5d；迁移扣分仅因治理期 dirty 尚未形成最终 clean commit，不是当前功能红门。

主协调独立证据为：D15–D18 独立红探针修复后 `thenCalls=0`、getter 未执行、`unhandled=[]`；D1/D5/D6/D7
外部探针 `4/4 exit 0`；8 个实际变更 package 文件 `105/105`；`tests/arena` 为 `108 files / 855/855`；
`tests/architecture.test.ts` 为 `53/53`；`npm run build:packages` 为 `52 packages / 11 waves`；
typecheck、lint、documentation `265/839/57` 与 `git diff --check` 均通过；ordinary Product stress
`200/200`、ordinary golden replay `4/4`、survival golden replay `1/1` 均通过。相对
`/private/tmp/arena-pa5c-impl-before.hashes` 的 `changed/missing/extra=46/0/1` 精确成立；branch 为
`feature/arena-v2-design-docs`，HEAD/upstream 同为 `d750e4caa767332b5c3caaf247080b5717d56219`，未
commit/push。PA5d、PA6/PA7、正式 CPU、formal300、设备/真机、模拟器、美术与 commit/push 继续关闭。

PA6/PA7 的具名强制未来门（不阻断 PA5c 签核，但阻断最终发布）是 Presentation 异步边界审计：
`product-input-router`、`product-session-intent-dispatcher`、`arena-impact-audio`、
`presentation-frame-loop`、`presentation-asset-load-task` 等仍使用 `Promise.resolve`/thenable
containment 的观察者或异步端口，必须完成 brand-first、no-hostile-then、no-unhandled 的真实调用级测试。
当前正式组合只返回受控 native Promise，因此该残余不是 PA5c legacy-surface/read-model 合同缺陷；它是
发布前 mandatory future gate，不能写成已接受、已完成或发布通过。

**PA5d manifest/golden/evidence**只允许修改以下逐文件源码：
`packages/arena-regression/src/golden-replay-manifest.ts`、
`packages/arena-regression/src/golden-replay-verifier.ts`、
`packages/arena-regression/src/arena-regression-evidence.ts`、
`packages/arena-regression/src/arena-regression-evidence-validation.ts`、
`packages/arena-regression/src/arena-regression-evidence-components.ts`、
`packages/arena-regression/src/index.ts`、`scripts/arena-golden-replay.ts`、
`scripts/arena-survival-golden-replay.ts`、`scripts/arena-regression-evidence.ts`、
`scripts/lib/arena-regression-evidence-producer.ts`、`scripts/lib/arena-stage9-release-producers.ts`，以及新增
`packages/arena-regression/test/pa5d-golden-evidence.test.ts`、
`tests/arena/pa5d-manifest-tamper.test.ts`、
`packages/arena-regression/test/regression-evidence-boundary.test.ts`、
`tests/arena/regression/golden-replay.test.ts`、
`tests/arena/regression/arena-regression-evidence.test.ts`、
`tests/arena/regression/arena-regression-process.test.ts`、`tests/architecture.test.ts`。不允许手工改 golden、
Replay、state hash 或 final hash。

### 每门结束时的 legacy residual 与下一门删除点

PA5a 的 `MatchCore.getLegacyFullSnapshotForAudit()` direct source caller 精确为
`packages/arena-match/src/replay.ts`、`packages/arena-match/src/fixed-step-match-runtime.ts`、
`packages/arena-session/src/local-match-session.ts`、`packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts`、
`packages/arena-regression/src/arena-v2-survival-golden-replay-scenario.ts`、
`scripts/arena-input-fuzz.ts`、`scripts/arena-survival-supply-stress.ts`、`src/arena/entry/match-core-poc.ts`、
PA5a source 表中的 5 个 `arena-v1-*workload.ts` 与 12 个 `arena-v2-weapon-*-replay-prototype.ts`；
direct authority test caller 精确为 `tests/arena/match-core.test.ts`、`tests/arena/match-core-equipment.test.ts`、
`tests/arena/match-core-movement.test.ts`、`tests/arena/match-core-survival-supply.test.ts`、
`tests/arena/character-foundation.test.ts`、`tests/arena/replay.test.ts`、`tests/arena/stage5-map-integration.test.ts`、
`tests/arena/local-match-session.test.ts`、`tests/arena/local-match-session-bot-read.test.ts`、
`tests/arena/regression/golden-replay.test.ts`、`packages/arena-match/test/match-foundation.test.ts`、
`tests/arena/product/stage8-content-pool.test.ts`、`tests/arena/presentation/input-pilot-runtime.test.ts`、
`tests/arena/study/human-match-study.test.ts`。
另外，直接调用 Core/authority alias、必须随本门改名迁移的测试精确为：
`tests/arena/bot-controller.test.ts`、`tests/arena/bot-goals.test.ts`、`tests/arena/bot-mobility.test.ts`、
`tests/arena/bot-observation.test.ts`、`tests/arena/bot-observation-v5.test.ts`、
`tests/arena/input/input-frame-rate.test.ts`、`tests/arena/input/input-match-integration.test.ts`、
`tests/arena/trusted-input-batch.test.ts`、`tests/arena/pa3b-outer-wiring.test.ts`、
`tests/arena/pa4a-session-read-frame.test.ts`、`tests/arena/presentation/greybox-renderer.test.ts`、
`tests/arena/presentation/presentation-foundation.test.ts`。
`packages/arena-v1-composition/test/arena-v1-composition.test.ts` 直接调用
`session.getSnapshot()`；旧 PA5a 表曾把它列为只运行，但本轮 PA5c correction 已重新分类为实际迁移文件；
`packages/arena-quick-match/test/quick-match-foundation.test.ts` 不直接调用本门 authority alias，
保留为 PA5c 旧 Session 兼容回归只运行项。PA5a 默认不存在
`createLegacyFullSnapshotAuditReader()`，不产生 reader caller；`tests/arena/pa5a-legacy-snapshot-allowlist.test.ts`
只证明旧 reader symbol/生产 reachability 消失，`tests/arena/bot-match-read-bundle.test.ts`、
`tests/arena/match-read-frame.test.ts`、`tests/arena/match-read-port.test.ts` 仍只证明现有 sidecar/bundle
边界，不产生新的 legacy reader caller；但因其中包含真实 LocalSession legacy step 直接 caller，已纳入 PA5c
迁移测试面。若实施中出现已列入允许面的 verifier/differential necessity evidence，才按该证据
增加显式 reader caller。Experiment generic
API 与 `scripts/arena-match-stress.ts` 的 `simulationCase.getSnapshot()` 不在此清单。

| 门结束 | 仍允许存在的 legacy 符号与精确 caller | 下一门动作 |
|---|---|---|
| PA5a | `MatchCore.getLegacyFullSnapshotForAudit()`：`packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts`、`packages/arena-regression/src/arena-v2-survival-golden-replay-scenario.ts`、`scripts/arena-input-fuzz.ts`、`scripts/arena-survival-supply-stress.ts`、`src/arena/entry/match-core-poc.ts`、PA5a source 表列出的 5 个 `arena-v1-*workload.ts` 与 12 个 `arena-v2-weapon-*-replay-prototype.ts`；其余 authority/test caller 已改显式 audit 名称。PA5a 默认删除 `createTrustedPublicSnapshotReader()`，不新建 `createLegacyFullSnapshotAuditReader()`；`tests/arena/pa5a-legacy-snapshot-allowlist.test.ts` 只证明旧 symbol/生产 reachability 消失，sidecar/bundle 测试只证明既有边界。模糊 LocalSession residual 为 `scripts/arena-formal-survival-bot-pressure.ts`，以及旧 Session 兼容回归 `packages/arena-quick-match/test/quick-match-foundation.test.ts`、`packages/arena-v1-composition/test/arena-v1-composition.test.ts`；Product/QuickMatch/survival 模糊 surface 仍由 `packages/arena-product-match/src/product-match-runtime.ts`、`packages/arena-product-match/src/product-match-coordinator.ts`、`packages/arena-product-session/src/product-session-controller.ts`、`packages/arena-quick-match/src/quick-match-service.ts`、`packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts` 保持到 PA5c。Experiment `ArenaSimulationCase.getSnapshot()` 与 `scripts/arena-match-stress.ts` 对它的消费不属于 residual。 | PA5b 只移除 formal pressure 的 LocalSession 模糊 snapshot；不删除显式 Core 审计 oracle。 |
| PA5b | 上述显式 Core audit oracle 保留；`scripts/arena-formal-survival-bot-pressure.ts` 已不再调用 LocalSession 模糊 snapshot，改由 runner/readStep 编排现有 bundle full-audit readers。唯一 schedule 在 `scripts/lib/arena-read-step-runner-v2.ts` 与 `arena-performance-evidence`；LocalSession 只提供按需冻结 evidence result，不保存 schedule。 | PA5c 删除 ProductMatch/ProductSession 模糊 surface、QuickMatch/survival `SESSION_METHODS` 捕获与 LocalSession 模糊 `getSnapshot/runUntilEnded/step().snapshot`。 |
| PA5c | 删除完整 Product legacy flow 及旧 outcome/ports；LocalSession 改为显式 Legacy/Audit adapter；迁移 `arena-product-session-stress.ts`、regression/experiment/greybox/InputPilot wrapper 与精确测试表；QuickMatch/survival 不再捕获模糊旧 Session methods。保留 Product coordinator/session 自身 state `getSnapshot` 与 ProductPresentationFlow.stepMatch。 | PA5d 只验证 explicit audit oracle、regression/golden/evidence 与 research allowlist，不恢复任何模糊 API。 |
| PA5d / PA5 总门 | 唯一必保留的是 `MatchCore.getLegacyFullSnapshotForAudit()`；`createLegacyFullSnapshotAuditReader()` 默认不存在，只有实施中出现既有且已列入允许面的 verifier/differential necessity evidence 时才可显式引入并列出 caller，测试本身不构成理由。`HeadlessMatchRunner.step(frames)` 永久保留，`runLegacyUntilEndedForAudit()` 只供明确 audit caller。Experiment `SimulationSnapshot`、Product/Profile/UI/Pilot state snapshot 与内部 timeline/participant snapshot 保持各自域语义，绝不被 authority rename 误伤。 | PA6/PA7 只消费已签核 readStep/evidence；不得再扩大 legacy allowlist。 |

### 所有权、时序与最终 API

full-audit reader 必须在现有 `createMatchReadBotBundleV2` 的单一 binding 创建事务内，按
`config.participantIds` 稳定顺序创建，和 frame/mobility reader 共用 BundleRecord、WeakMap、
generation、invalidate 和 cleanup。PA5 不新增 binding、bundle factory、WeakMap manager 或 raw
reader export；Session 只提供冻结的按需 full-audit result，不持有 schedule。

唯一 schedule owner 是 formal runner/evidence 层。readStep 计时顺序固定为：pre V2 frame/local
sidecar → player mapper → Bot input → authority step/Replay record → post frame/events/result →
schedule 判定 → 触发时 full-audit → differential/recomposition → 停止计时；serialization 和
evidence hash 可在计时外，但 reader/action query/validation/differential 不得外移。

`measurementSchemaVersion=2` 唯一落在
`packages/arena-performance-evidence/src/arena-read-step-measurement-v2.ts`，由该包 index
导出纯数据合同和严格 tamper/future-schema validator；它不进入 arena-session 或 authority
contracts，也不等同 `MatchReadFrameV2.schemaVersion=2`。

PA5 结束后的唯一 API 终态为：MatchCore 保留显式
`getLegacyFullSnapshotForAudit()` 作为 verifier/full-audit/differential oracle；模糊
`getSnapshot()` 退出。旧 `createTrustedPublicSnapshotReader()` 的 Bot 语义退出，默认不创建
`createLegacyFullSnapshotAuditReader()`；只有实施中确认既有且已列入允许面的 verifier/differential
source 必须使用 reader，并提交 necessity evidence 时才允许显式 reader。LocalSession 的模糊
`getSnapshot()`、`runUntilEnded()`、`step().snapshot` 删除或改为显式
`getLegacyFullSnapshotForAudit()`、`runLegacyUntilEndedForAudit()`、
`stepWithLegacySnapshotForAudit()`；删除 Product Runtime/Coordinator/Controller 的完整 legacy
`start/step/beginMatch/stepMatch` flow 及其旧 outcome type。保留
`ProductMatchCoordinator.getSnapshot()` 作为自身 Product state、
`ProductSessionController.getSnapshot()` 作为自身 ProductSession state，以及
`ProductPresentationFlow.stepMatch()` 作为 V2 表现 wrapper。
QuickMatch/survival 不再捕获已删除的 match snapshot surface。
`HeadlessMatchRunner.step(frames)` 永久保留，full-snapshot `runUntilEnded` 改为显式 audit 名称
或删除；FixedStep 仅 test/dev allowlist；regression、experiment、fuzz、stress、POC 只能使用
显式 audit/research API。

每门独立验收必须覆盖 architecture allowlist、普通/生存 parity、生命周期与失败关闭、
Replay/checkpoint/final hash、schedule 去重、tampered/future schema、构造/重入/destroy；
任意第二套 owner、legacy 回流、计时外移、手工 hash、跳 case、authority/Replay/hash 漂移或
越界文件均立即停止。PA6/PA7、正式性能、formal300、设备/真机、美术与 commit/push 仍关闭。

### PA5d implementation candidate 开发自检（2026-07-30）

本段记录 D20–D23 独立拒绝前的候选历史快照：当时状态为 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`，
已被后文 D20–D23 修复候选覆盖，不构成主协调签核。
本轮严格限于本节批准的 11 个源码文件、7 个测试文件与本 ADR/P1 台账治理记录；PA5c 接口和行为零回改，PA5d 之外的
PA6/PA7、正式 CPU/formal300、设备/模拟器、美术与 commit/push 仍关闭。

实现事实：Replay V5 当前 schema 由 `validateArenaReplay()` 完整复算，历史 schema 只进入显式 unsupported 分支并在
Core 构造前拒绝；Manifest、fixture、scenario metadata、证据组件均经过 exact-key、递归数据、确定性排序和深冻结边界。
黄金候选写入外部 staging，生成与验证全部成功后才 rename 发布；按目标路径建立独占发布锁，遗留 staging、同进程/跨进程并发生成、
目标目录在发布前出现均 fail closed，清理错误与主错误组合保留。没有新增 binding、reader、Core owner，也没有手工修改 Replay、fixture、checkpoint、
state/final hash。证据 producer 仍按固定五个 regression process 顺序执行，任一失败停止并不跳过 case。

本轮最终源码证据：PA5d package 专测 `5/5`；PA5d 新增 Node 专测 `4/4`；既有 regression/golden/evidence/process
Node 集合 `19/19`；`tests/arena` 完整集合 `859/859`；`tests/architecture.test.ts` `54/54`；普通 golden `4/4`、
survival golden `1/1`；`build:packages` `52 packages / 11 waves`；`typecheck:app` 与 lint 通过。旧 PA5c 计数不与本轮拼接。

开发自检暂评 `95/100`：架构 20/20（单一 generator/verifier 边界与无 legacy reader 回流）；行为等价 19/20（普通/生存
Replay、事件、checkpoint、result/final hash 由现有 corpus 重放）；生命周期/失败关闭 15/15（staging、并发、目标冲突、清理
组合）；确定性/Replay 15/15；性能可证伪 12/15（未宣称正式 CPU）；迁移/回滚 9/10（PA5 总门及治理 dirty 尚未最终收口）；
治理 5/5。任一手工 hash、旧 API 回流、第二 owner、跳 case、tamper 绕过、越界文件或 authority/Replay/hash 漂移均为停止条件，
该历史候选待主协调独立验收后方可更新为 completed；D20–D23 拒绝及修复见下文。

### PA5d D20–D23 修复候选与 D24 边界自检（D25 前历史快照，2026-07-30）

本段是 D25 独立拒绝前的历史候选，已由下节修复候选覆盖。状态当时仍为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`；PA5d 未签核，PA6/PA7、正式
CPU/formal300、设备/模拟器、美术与 commit/push 继续关闭。前一节的 `859/859` 是 D20–D23 修复前的拒绝历史，不能与本节证据拼接。

D20 通过 `captureExactDataFields()` 对 verifier options 一次性捕获可枚举 data descriptor；后续只使用已捕获的
`manifest/fixtures/scenarioRegistry/coreFactory` identity，不再重读 caller Proxy。D21 的 Manifest entry helper 只接受并一次性冻结
`id/version/category/file` 四个数据字段；generator 传入数据投影，不读取 scenario runtime methods。D22 在 evidence normalize 前先一次性
深复制冻结顶层 report，create/read 均不重读 caller Proxy。D23 在创建父目录后 `realpath` repository root 与 parent，canonical parent 落入 repository
时拒绝，并从 canonical parent 派生 candidate/staging/lock，避免 lexical symlink 路径逃逸；真实 symlink 调用级测试确认 repository 无残留。

D24 的保证边界明确为：独占 publication lock 串行化本 generator 的合作并发，发布前使用 `lstat` 再检查目标；目标在 staging 期间出现时
fail closed，非空目标 sentinel 保持不变。Node/FS 标准 `rename` 最后一个不可协作外部进程窗口没有被夸大为原子 no-replace 证明；若最终发布要求
绝对禁止替换空目录，必须另行引入可验证的 OS-level no-replace 机制并单独过门，本候选不宣称该能力。

修复后候选证据：D20–D23 定向 Node `7/7`；PA5d package/regression `5/5`；完整 `tests/arena` `862/862`；architecture `54/54`；
既有 regression/golden/evidence/process `19/19`；ordinary golden `4/4`、survival golden `1/1`；stress `200/200`；
`build:packages` `52 packages / 11 waves`；typecheck、lint、documentation `265/839/57`、`git diff --check` 全部通过。旧 `859/859` 仅作历史拒绝证据。

修复后自评 `94/100`：架构20/20、行为等价19/20、生命周期/失败关闭14/15（D24 最后 OS-level no-replace 窗口未宣称关闭）、确定性/Replay15/15、
性能可证伪12/15（未运行正式 CPU）、迁移/回滚9/10、治理5/5。任一新 TOCTOU、canonical path 逃逸、手工 hash、第二 owner、跳 case、越界文件或
authority/Replay/hash 漂移均为停止条件，等待主协调独立复验。

### PA5d D25 canonical parent 零写入修复候选（最终签核前历史快照，2026-07-30）

本段记录最终签核前的历史候选，已由下节主协调签核覆盖；当时状态保持
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`。D25 独立探针证明旧实现会在 canonical
校验前沿 lexical symlink 执行递归 `mkdir`，虽最终拒绝，却已在 repository 内留下空嵌套目录。修复后 candidate parent 必须预先存在：先对
`lexicalParent` 执行 `realpath`，验证 canonical parent 位于 repository 外，再从 canonical parent 派生 candidate/staging/lock；canonical
校验前不再执行任何目录创建。真实 symlink + 不存在嵌套 parent 测试确认调用被拒绝，repository 内嵌套目录从未出现，finally 无残留。

D20–D25 当前定向 Node `8/8`；三份仓库外探针分别得到：D20–D22 探针 exit `0` 且所有 `get` 计数为 `0`；旧 D23“漏洞应成功”探针
在 canonical repository parent 检查处按预期 exit `1`；D25 residue 探针 exit `0`，`rejected=true` 且
`nestedParentExistsAfterRejection=false`。最终源码完整 `tests/arena` `863/863`、PA5d package/regression `5/5`、architecture `54/54`、
ordinary/survival golden `4/4`、`1/1`、stress `200/200`，`build:packages` `52 packages / 11 waves`、typecheck 与 lint 通过。
前节 `862/862` 仅为 D25 前历史，不与本节拼接。

D24 保证边界不变：合作生成器由 publication lock 串行化，发布前 `lstat` 冲突检查且非空目标不覆盖；标准 Node/FS `rename` 对任意不协作
外部进程的最后窗口仍未宣称具备绝对 atomic no-replace。当前自评维持 `94/100`：架构20/20、行为等价19/20、生命周期/失败关闭14/15、
确定性/Replay15/15、性能可证伪12/15、迁移/回滚9/10、治理5/5。PA6/PA7、正式 CPU/formal300、设备/模拟器、美术、commit/push 继续关闭。

### PA5d 与 PA5 总门主协调独立签核（2026-07-30）

PA5d 状态升级为 `completed / coordinator-approved / formalGate=false`，评分 `94/100`；PA5a、PA5b、PA5c、PA5d 四门全部完成，
PA5 总门冻结为 `completed / coordinator-approved / formalGate=false`。评分为架构边界20/20、行为等价19/20、生命周期/失败关闭14/15、
确定性/Replay15/15、性能可证伪12/15、迁移/回滚9/10、治理5/5。D24 的保守边界被接受：只证明合作生成器锁、发布前冲突检查与
非空目标不覆盖，不宣称任意不协作外部进程的 OS-level atomic no-replace。

主协调独立证据为：D20–D22 getter/get trap=`0`、factory substitution=`0`；修正版 D23 probe 为
`rejected=true / candidateExists=false`；D25 为 `rejected=true / nestedParentExistsAfterRejection=false`；独立 Node 定向 `27/27`、
Vitest `3/3`、architecture `54/54`、`git diff --check` 通过。开发自验证保留最终源码 `tests/arena` `863/863`、PA5d package `5/5`、
ordinary/survival golden `4/4 + 1/1`、stress `200/200`、`build:packages` `52 packages / 11 waves`、typecheck、lint 与 documentation
`265/839/57`。历史拒绝轮与修复后证据不拼接。PA5 冻结后 PA6/PA7 不得回改其 Product/Session V2、readStep、audit schedule、
measurement schema、manifest/golden/evidence 或 explicit Legacy/Audit 边界。

### PA6-P：Presentation async boundary hardening（PA6 前独立并行子门）

PA6-P 由第二开发独占实施，现为 `completed / coordinator-approved / formalGate=false`，是已关闭的发布前 mandatory boundary gate，
不属于 PA6 ABBA CPU 结果，也不能用其测试冒充性能证据。第二开发是以下六个文件的唯一所有者；
当前 PA6/Core/性能开发不得触碰这些文件：

- `packages/arena-product-presentation/src/product-input-router.ts`
- `packages/arena-product-presentation/src/product-session-intent-dispatcher.ts`
- `packages/arena-presentation-runtime/src/arena-impact-audio.ts`
- `packages/arena-presentation-runtime/src/presentation-frame-loop.ts`
- `packages/arena-presentation-runtime/src/presentation-asset-load-task.ts`
- 新增 `tests/arena/presentation/pa6-async-boundary-hardening.test.ts`

PA6-P 必须保持 Product/Session V2 合同、authority、Replay V5、InputFrame、events 与 checkpoint/state/final/authority hash 不变；同步/异步端口统一
brand-first，普通 hostile thenable 的 getter/then 不执行，native/foreign/shadowed rejected Promise 被收容且 `unhandled=[]`。真实调用级测试必须覆盖
Proxy/identity、sync reentry、构造半失败、destroy/cleanup retry、迟到回调与 no-half-publish。不得修改现有测试、共享 capability 或 PA5d 源码。

PA6-P 可与 PA6 的只读审计、命令准备和非计时定向验证并行；任何 ABBA 或正式 CPU 计时开始前，必须暂停第二开发的测试、构建及其它 CPU 密集进程，
并由运行方只读确认环境清洁。PA6-P 的完成不自动通过 PA6 CPU 门；PA7、设备/真机发布与最终发布仍由 PA6 正式性能及各自证据阻断。

### PA6-P 主协调独立签核与 PA6 runner 当前边界（2026-08-02）

PA6-P 评分 `95/100`：架构20、行为20、生命周期/失败关闭15、确定性/Replay14、性能可证伪12、迁移/回滚9、治理5。
独立证据为受影响 Node `47/47`、Vitest `50/50`、PA6-P 专测 `11/11`、architecture `55/55`、`typecheck:app` 与 diff-check 全绿。
一次 `47 pass / 2 runner red` 是把 Vitest 文件误交 Node runner 的无效调用，保留但不计入通过证据。签核确认 brand-first/no-hostile-then/
no-unhandled、重入失败关闭、迟到结果隔离、构造回滚、cleanup retry 和重复 destroy 均通过真实生产入口；没有改变 PA5 的权威合同或 hash 语义。

PA6 runner 当前只通过正确性门：全文件 `27/27`、architecture `55/55`、typecheck 与 diff-check 通过。报告绑定 HEAD/dirty/fingerprint、
四个互斥 loader variant 与固定 case/schedule；runToken 和严格前进 progress 驱动 inactivity watchdog，无效 heartbeat 不续命；结构化失败原子发布，
超时清理精确进程组。旧固定 30 分钟总寿命 timeout 已被定向诊断证明会终止仍在推进的 group，修订后不得沿用旧轮作为性能证据。
清洁环境 ABBA×3 尚未完成，因此 PA6 不得标记 completed，PA7 不得开始；`.225/30.1us/process CPU 同向` 门限保持不变。
