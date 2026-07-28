# Arena V2 P1 实施状态台账

## 状态

- 阶段：P1 自动替换与 10 秒权威回收。
- 当前小门：P1.2a「单槽原子替换事务」。
- 当前结论：P1.2a `core-transaction-ready` 已由主协调于 2026-07-28 签核；P1.1 `contract-ready` 已于 2026-07-28 签核。
- P1 总体结论：**未完成、不得 advance**。P1.2a 只完成可独立验收的 EquipmentSystem Core 事务，不代表供给时间轴、600 tick 过期、MatchCore/Replay/hash、Bot、Presentation 或 Platform 已接入。
- P1.1 实现审计起始基线：`d6f906008d0af1ed0133a199a8dc9e15cb1d23d0`。
- P1.1 提交父节点：`fb0bc404508bf9d7f34df53fedfaf20d31239591`。`d6f9060..fb0bc40` 之间仅包含已经独立验收的 A0.1 美术生产合同与阶段门禁文档，不包含 P1.1 代码，不改变 P1.1 行为审计结论。
- P1.2a 实现审计起始基线：`8e3e6eff6724612e83b124aa2ae6574a3967af9e`；实际提交父节点与当前安全回滚点为 `4420d4b585025cd6999e5becf6a6f4d10b895063`。`8e3e6ef..4420d4b` 仅包含已经独立验收的 A0.2.1 来源权利包，不包含 P1.2a 代码，不改变 P1.2a 行为审计结论；P1.2a 尚未提交。
- 证据日期：2026-07-28。

## 前置条件与依据

- [Arena V2 生产化分阶段开发与治理计划](arena-v2-production-development-plan.md) P1：要求按 `Rule → Core → Bot → Presentation → Platform` 推进，并冻结供给间隔、拾取半径、生命周期、替换策略和同 tick 顺序。
- [ADR-108](../decisions/108-arena-v2-survival-auto-replace-and-expiry.md)：生存供给采用靠近自动替换、旧武器直接回收和 600 tick 权威过期。
- 仓库 `AGENTS.md`：Definition 与 Registry 分离；Registry 只读并在组合阶段校验；相同 Definition、seed、输入必须保持事件、Replay 与 hash 确定。
- P1.1 开始时上述规则已冻结；未冻结的 Bot、HUD 和最终资产语义不进入本批。

## 本批范围

- 新增严格且不可变的 Equipment Supply Definition，冻结 `firstSpawnTick`、供给间隔、数量、拾取半径、生命周期、替换/过期策略和同 tick 顺序。
- 新增独立只读 Registry，提供确定性排序、重复拒绝、`has/get/require/list` 和组合阶段严格校验。
- 新增可序列化的 `spawnTick/expireTick` 生命周期身份；`expireTick` 必须严格等于 `spawnTick + lifetimeTicks`。
- 冻结 `EquipmentReplaced`、`EquipmentRecycled`、`EquipmentExpired` 事件身份及 schema v1 payload。
- 在内容包中提供版本化的生存 Supply Definition 集合和 Registry 工厂。
- 增加 Definition、Registry、生命周期、事件 payload、内容和架构边界测试。

## 非范围

- 不调度实际生成，不创建或删除世界装备实例。
- 不实现持有者原子替换事务、竞争裁决、旧武器实际回收或事件发射。
- 不改变 MatchCore、RuleEngine、Replay、快照或状态 hash。
- 不接入普通 1v1、生存正式 Composition、Bot、HUD、Renderer、音频或平台生命周期。
- 不使用研究原型作为生产实现，不生成或修改最终美术资产。

## ADR-108 行为映射

| ADR-108 条目 | P1.1 落点 | 当前证据与边界 |
|---|---|---|
| 1. 每 20 秒生成 3 把实体武器 | `firstSpawnTick=1200`、`spawnIntervalTicks=1200`、`spawnCount=3` | 第 N 轮（N 从 0 开始）为 `1200 + 1200 × N`，测试锁定 1200/2400/3600；实际时间轴生成留给 P1.2 |
| 2. 普通移动靠近自动拾取 | `pickupRadius=0.8` | 只冻结生存 Supply 的生产合同；自动拾取运行时与 Bot 争夺尚未接入 |
| 3. 持有者同事务释放旧武器并占有新武器 | `replacementPolicy=atomic-recycle-held`，并定义 Replaced payload | 策略和事件 schema 已冻结；原子事务是 P1.2 硬门 |
| 4. 被替换旧武器直接回收 | Recycled payload 的 reason 固定为 `replaced` | 不允许随意解释为重新掉落；实际回收命令留给 P1.2 |
| 5. `expireTick=spawnTick+600` | 生命周期 schema v1 严格验证，正式 `lifetimeTicks=600` | 错误 tick、溢出、未知字段和 Definition 身份不一致均失败关闭 |
| 6. 仅世界中的供给到期消失 | `expiryPolicy=world-only-at-expire-tick` | 状态资格与实际删除由 P1.2 唯一 Authority 实现 |
| 7. 同 tick 生成→过期→拾取 | Definition 固定 `spawn → expire → pickup → action` | 增补动作解析阶段，防止拾取后在同 tick 的动作顺序漂移；调度实现留给 P1.2 |
| 8. 多人竞争与调用顺序无关 | 未修改既有竞争裁决 | P1.2 必须覆盖 1/2/4 人、输入置换和稳定 tie-break；P1.1 不冒充完成 |
| 9. 稳定事件进入 Replay/hash/表现/遥测 | 三个事件常量与严格 payload schema v1 | 本批只冻结事件合同，不发射、不接 Replay/hash/表现/遥测 |
| 10. 进入范围后不可弹窗撤销 | 替换策略不包含确认或取消状态 | HUD 与输入语义不在本批，后续不得新增旁路确认状态 |

## 代码落点

| 能力 | 生产落点 |
|---|---|
| Definition、生成 tick 公式与严格校验 | `packages/arena-definitions/src/equipment-supply-definition.ts` |
| 只读 Registry/Contract | `packages/arena-definitions/src/equipment-supply-registry.ts` |
| 生命周期和稳定事件身份 | `packages/arena-equipment/src/equipment-supply-lifecycle.ts` |
| 事件常量与 payload schema | `packages/arena-contracts/src/match-event-types.ts`、`packages/arena-contracts/src/equipment-supply-event-payload.ts` |
| 生存正式内容集合/Registry | `packages/arena-v1-content/src/arena-v2-survival-supply.ts` |
| 架构依赖门 | `tests/architecture.test.ts` |

所有新增 schema 当前仅接受版本 1，并拒绝未知版本与未知字段。它们是新增合同，没有历史版本需要兼容读取；未来升级必须新增明确读取/迁移策略，不能让 v1 ID 或 schema 静默改变语义。

## 普通 1v1、确定性与 Replay/hash

- 普通 1v1 **尚未复用**该 Supply Definition/Registry；既有 `EquipmentDefinition.pickupRadius` 和 Stage 4 拾取链保持原样。P1.1 的 `pickupRadius=0.8` 只命名并冻结生存内容值，不宣称所有模式已接入。
- 本批没有修改 `packages/arena-match/src`、`packages/arena-core/src`、既有 `equipment-system.ts`、`equipment-runtime.ts` 或 Replay fixture。
- 旧 EquipmentSystem、RuleEngine、MatchCore 与 Replay 链 47/47 回归通过，说明当前 1v1 和旧 Replay 行为未被合同批次改变。
- Registry 按稳定 ID 排序；生成 tick 使用安全整数公式；生命周期与事件身份均为冻结数据。P1.1 本身不引入随机源、墙钟或遍历顺序依赖。
- “零变更”不是 P1 Replay 完成证据。600 tick 回收与原子替换的黄金 Replay、checkpoint 和最终 hash 仍是 P1 总体硬门。

## 失败模式与 fail-closed 行为

| 失败模式 | P1.1 行为 | 后续责任 |
|---|---|---|
| 非法/未来 schema、未知字段、访问器、非有限值 | 构造前拒绝，不产生半有效对象 | schema 升级必须显式设计 |
| 负数、非整数、不安全或溢出 tick | 拒绝 Definition、生成公式、生命周期或事件 payload | P1.2 不得捕获后继续半可用运行 |
| 重复 Definition ID | Registry 构造失败 | Composition 必须在比赛开始前完成校验 |
| 未知 Definition ID | `require` 失败关闭，`get` 明确返回空 | P1.2 不得回退到默认供给 |
| 供给、装备、旧新装备身份不一致 | 事件 payload 创建失败 | 事务必须在权威状态变化前建立一致身份 |
| `expireTick` 不等于 Definition 生命周期 | 生命周期创建失败 | 序列化恢复必须使用同一验证路径 |
| 同 tick 过期与拾取冲突 | 合同固定先过期后拾取 | P1.2 需用事务测试证明，不得由调用顺序决定 |
| Core 事务中途异常 | P1.1 未实现，无完成声明 | P1.2 必须 fail closed、清理且不留下空槽/双持/重复 owner |

## P1.1 独立评分（100 分）

P1.1 评分只判断“合同小门”，签核条件为总分至少 90，且每一维至少达到该维满分的 80%。它不替代 P1 总评分或硬门。

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| 规则合同 | 25 | 24 | 96% | 首轮、间隔、数量、半径、600 tick、替换/过期策略和同 tick 顺序已冻结；扣 1 分因为尚无运行时行为证据 |
| 严格校验 / fail-closed | 20 | 19 | 95% | 覆盖 accessor、未知字段/schema、非法数值、溢出和身份错配；事务中途失败待 P1.2 |
| Registry / 依赖治理 | 15 | 14 | 93% | Definition/Registry 分离、排序、冻结、重复/未知 ID 拒绝与架构门已具备；正式 Composition 尚未消费 |
| 事件 schema | 15 | 14 | 93% | 三类事件拥有版本化、冻结且严格的最小 payload；真实事件序列尚未发射 |
| 兼容 / 确定性 | 15 | 13 | 87% | 旧链 47/47 且 MatchCore/Replay/hash 零修改；新行为黄金 Replay 仍为 P1 硬门 |
| 测试治理 | 10 | 10 | 100% | 定向、完整 Node、单 worker 治理、架构、类型、边界、三端构建和 diff-check 均有有效结果 |
| **合计** | **100** | **94** | **94%** | **达到 P1.1 contract-ready 签核线；主协调已签核（2026-07-28），不代表 P1 完成** |

## 实际门禁证据

| 门禁 | 有效结果 |
|---|---|
| P1.1 定向 Vitest | 4 文件，38/38 通过 |
| 旧 Equipment/RuleEngine/MatchCore/Replay 链 | 47/47 通过 |
| 完整 Node | 94 文件，713/713 通过 |
| 完整治理 Vitest（单 worker） | 134 文件，598/598 通过 |
| 架构边界 | 39/39 通过 |
| 工作区包构建 | 52 packages、11 waves 通过 |
| `npm run typecheck:app` | 通过 |
| Product / Presentation-Three 边界 | 通过 |
| Web / 抖音 / 微信构建 | 通过；仅有非阻断的大 chunk 提示 |
| `git diff --check` | 通过 |

首次完整治理尝试使用默认并行执行，但在执行窗口内没有形成完整、可采信的终局结果，因此不计为通过证据。随后使用 `npx vitest run --maxWorkers=1 --fileParallelism=false` 完整复跑并取得 134 文件、598/598 的有效结果。A0.1 美术文档已由主协调独立验收并提交为 `fb0bc40`，不属于上述 P1.1 开发门禁证据，也不计入 P1.1 行为变更范围。

## P1.2a 单槽原子替换事务

### 范围与写入者审计

- `EquipmentSystem` 继续是装备 runtime、owner 和 primary slot 的唯一权威写入者；没有新增事件总线、Manager 互持或旁路拾取。
- `EquipmentPickupResolver` 只产生确定性竞争结果；新增 Supply 入口复用同一距离、seed、装备 ID、参与者 ID 排序规则，但拾取半径来自 Supply Definition。
- `ActionResolver` 和 `ActionExecutionSystem` 不写装备；MatchCore 仍只通过 ArenaRuleEngine 使用原有普通拾取入口。本批不把新事务接入 MatchCore。
- 新事务只有在 EquipmentSystem 显式注入只读 EquipmentSupplyRegistry，并提供合法 Supply 生命周期身份时可用；未配置 Registry 的普通 1v1 系统在任何写入前拒绝该入口。
- P1.1 的 Recycled/Replaced schema 足够：供给身份绑定新装备，Recycled payload 标识被移除旧装备，Replaced payload 标识旧新槽位转换；本批未修改公共 payload schema。

### 旧行为与预期新行为

| 场景 | `8e3e6ef` 旧行为 | P1.2a 行为 | 兼容边界 |
|---|---|---|---|
| 普通 1v1 `resolvePickups`、空槽 | 靠近自动拾取；已有主武器者不参与 | 完全不变 | 旧 MatchCore、Replay 和 hash 路径不调用新入口 |
| 带 Supply 身份、空槽 | 无独立事务入口 | 新装备直接占有，不产生 Recycled/Replaced | 后续 MatchCore 接入时仍应投影既有 EquipmentPickedUp |
| 带 Supply 身份、已有主武器 | 持有者被排除 | 赢得竞争后旧实例直接从权威集合删除，新实例占有单槽 | 仅 Supply Registry/生命周期显式路径生效，不是全局配置 |
| 重复执行同一 Supply | 无合同 | 已被持有的目标不再是世界候选，返回冻结空结果且不产生重复事件 | 不保存额外去重集合，不形成无界历史 |

### 合法波次合同回补

协调审查发现 P1.1 生命周期曾只验证 `expireTick = spawnTick + lifetimeTicks`，会允许正式 Definition 构造 `spawnTick=0` 这类不可能身份。本批回补合同：

- `spawnTick` 必须大于等于 `firstSpawnTick`；
- `(spawnTick - firstSpawnTick) % spawnIntervalTicks` 必须为 0，且所有参与运算的 tick 已先验证为非负安全整数；
- 正式 `arena-v2.survival-supply.v1` 因而只接受 1200、2400、3600……；
- 测试覆盖首次 1200、后续 2400、1199、1201 和非安全整数；P1.2a 事务样本使用 1200/1800 生命周期与区间内 tick 1300。

这是 P1.1 身份合同缺口的回补，不表示权威时间轴、生成命令或 600 tick 过期已经实现。

### 提交点、事件顺序与失败策略

事务在提交点之前完成以下全部工作：严格复制输入；校验 Supply/Equipment Definition；校验全部 participant 与资格；校验 owner/primary slot 全局不变量；校验目标是无 owner 且有 position 的 world instance；校验生命周期、合法波次和事件 tick；计算确定性竞争结果；创建并冻结全部严格事件 payload；验证 revision 不溢出。

提交点之后不调用外部函数或用户回调，只执行私有同步变更：

1. 旧装备从唯一 `#runtimes` 权威集合删除；
2. 新装备改为 `held`、绑定 winner、清除世界 position；
3. primary slot 映射一次切换到新实例。

外部不能在同步提交区观察中间状态。每笔替换的稳定事件顺序固定为 `EquipmentRecycled → EquipmentReplaced`，且事件在提交前已完成 schema 校验。提交前任何异常保持状态不变；提交区不可预期异常会终止 EquipmentSystem 并清空私有权威集合，禁止继续使用半完成状态。

回收不新增 `recycled` Runtime 状态：协调审查指出在 `EQUIPMENT_RUNTIME_SCHEMA_VERSION=1` 下新增可序列化枚举属于静默改义。回收事实只由严格 EquipmentRecycled 事件表达，旧实例从集合删除，因此 Runtime schema、历史读取与现有 Replay/hash 均不变。

### 边界、确定性与资源证据

- 空槽与持有者路径分别覆盖；同一目标重复执行为确定性空结果。
- 未知 Supply Definition、未知 world instance、缺失参与者、重复目标、未知字段和未配置 Registry 均在提交点前拒绝，并断言快照不变。
- 1/2/4 人持有主武器时，同 seed 的参与者输入正序/逆序得到相同 winner、事件和最终快照。
- 已进入动作/冷却的持有者仍可替换；动作、冷却、受击不会成为 EquipmentSystem 的隐藏旁路资格。掉落后为空槽拾取；淘汰和比赛结束由调用者传入 `eligible=false`，事务不写入。
- 连续 1000 次替换每次都产生固定 Recycled→Replaced 事件，且 `listSnapshots()` 始终只有 1 个权威 runtime，证明不保留无界回收墓碑或去重历史。
- 本批是无渲染 EquipmentSystem 模拟；不依赖 DOM、Three.js、平台 API、墙钟或随机调用顺序。

### P1.2a 独立评分（100 分）

P1.2a 只评分 Core 事务小门；签核条件为总分至少 90，且每维至少达到该维满分的 80%。

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| 原子事务与状态安全 | 25 | 24 | 96% | 全量预检后一次同步提交，无空槽/双持/重复 owner；MatchCore 集成仍未开始 |
| 严格校验与 fail-closed | 20 | 19 | 95% | Definition、生命周期、participant、owner、slot、目标和 payload 均提交前验证；提交区仅保留终止清理兜底 |
| 竞争确定性与重复执行 | 15 | 14 | 93% | 1/2/4 人输入置换、稳定事件顺序和重复空结果通过；跨 Replay 重放留给后续 |
| 事件合同 | 15 | 14 | 93% | 严格复用 P1.1 payload，固定 Recycled→Replaced；尚未进入 MatchCore 事件序列 |
| 兼容、schema 与资源 | 15 | 14 | 93% | 普通 1v1 路径、Runtime schema、Replay/hash 不变，1000 次实例有界；完整长局压力仍属 P1 总门 |
| 测试与治理 | 10 | 9 | 90% | 定向、旧链、完整 Node、单 worker、架构、构建与有界替换压力已有证据；旧 MatchCore 压力 CPU 门未绿且已明确披露 |
| **合计** | **100** | **94** | **94%** | **达到 P1.2a core-transaction-ready 签核线；主协调已签核（2026-07-28），不代表 P1 或 P1.2b 完成** |

### P1.2a 实际门禁证据

| 门禁 | 2026-07-28 有效结果 |
|---|---|
| P1 合同定向 Vitest | 开发收尾复跑 4 文件，38/38 通过；包含合法波次 1200/2400、1199/1201、非安全输入，以及输入 tick 各自安全但 `spawnTick + lifetimeTicks` 超出安全整数范围的拒绝 |
| Equipment/RuleEngine/MatchCore/Replay 相关 Node | 开发自检 53/53 通过；主协调独立扩大复跑 89/89 通过，普通 1v1 与旧 Replay 链保持通过 |
| 完整 Node | 94 文件，719/719 通过 |
| 完整治理 Vitest（单 worker） | 134 文件，598/598 通过 |
| 架构边界 | 39/39 通过 |
| Product / Presentation-Three 边界 | 分别通过；没有新增反向表现层依赖 |
| 工作区包构建 | 52 packages、11 waves 通过 |
| Web / 抖音 / 微信构建 | 通过；只有既有的大 chunk 非阻断提示 |
| P1.2a 直接资源压力 | 连续 1000 次原子替换通过；每次事件顺序为 Recycled→Replaced，权威 runtime 数始终为 1 |
| 旧 MatchCore `arena:stress` | 两次均为 1000/1000 完成、0 invariant failure、0 non-finite、5 Replay 验证，堆增长约 3.44/3.47 MB（预算 32 MB）；平均 CPU tick 0.277517/0.283199 ms 超过 0.25 ms，命令退出 1，**不得记为压力门通过** |
| 严格类型 | 开发自检期间 `build:packages` 52/52 通过，`typecheck:app` 曾被并行 A0.2.1 美术中间态的 9 个 TypeScript 错误阻断；该并行问题最终已关闭，主协调独立复跑及本轮开发收尾复跑 `typecheck:app` 均 exit 0，本项最终通过 |
| 文档检查 | 255 个 Markdown、788 个本地链接、50 个命令通过（执行时工作树包含并行 A0.2.1 文档） |
| `git diff --check` | 通过 |

旧 MatchCore 压力脚本尚未接入 `resolveSupplyPickups`，所以两次 CPU 超预算既不是新事务性能回归的直接证据，也不能被忽略或改写为通过。本批直接资源结论只来自隔离的 1000 次连续替换测试；完整 100+ seed 生存长局、供给时间轴、过期和事件窗口有界仍是 P1 总体硬门。并行 A0.2.1 美术文件不计入 P1.2a 代码、评分或门禁成果；其类型错误只作为共享工作树中间态记录，不属于 P1.2a 行为证据。

### 风险、回滚与未完成项

- 风险：后续 MatchCore 接入时错误地把普通拾取切到 Supply 路径；在事件发射前后再做可失败操作；恢复/Replay 时缺失 Supply 生命周期；调用者错误映射淘汰或比赛结束资格。
- P1.2a 实现审计基线仍为 `8e3e6ef`，实际提交父节点与安全回滚点为 `4420d4b`。只撤回 EquipmentSystem/Resolver/export、生命周期波次校验、对应测试和本节台账，不触碰已验收 P1.1 或 `8e3e6ef..4420d4b` 间已经验收的 A0.2.1 文件。
- P1.2b 仍需：权威供给时间轴、世界实例生成、600 tick 过期、生成→过期→拾取→动作同 tick 调度、599/600/601、过期与拾取同 tick、序列化恢复、MatchCore 事件收集、Replay/hash 和黄金 Replay。
- 更后阶段仍需完整前摇/受击/淘汰/比赛结束 MatchCore 临界矩阵、100+ seed 长局压力、Bot、Presentation、HUD、音频和 Platform；不得用 P1.2a 的隔离事务测试冒充完成。

## P1 总体未完成硬门

- P1.2：P1.2a 已提供隔离的单槽原子替换/直接回收事务；Composition 消费、权威时间轴生成、世界实例接入、过期和 MatchCore 真实事件发射仍未完成。
- Replay/hash：600 tick 回收与持有者原子替换的黄金 Replay；二次执行、checkpoint、序列化恢复和最终 hash 一致。
- 事务矩阵：空槽/持有者、拒绝双持、599/600/601、过期与拾取同 tick、1/2/4 人竞争及输入顺序置换。
- 生命周期矩阵：前摇、冷却、受击、掉落、淘汰、比赛结束、暂停恢复、前后台和低表现帧率。
- 压力与资源：100+ seed、长局实例上限、内存和事件窗口有界。
- Bot / Presentation / Platform：只读观察与普通移动、权威剩余 tick 和事件投影、无墙钟删除；这些必须在 Core 硬门通过后推进。
- 正式生存 Mode/HUD 不得在上述 P1 硬门关闭前 advance。

## 风险、回滚与签核

- 主要风险：后续 Composition 绕过 Registry；Core 只实现“先清空再赋值”的非原子替换；事件载荷和实际状态身份分叉；将生存 `pickupRadius` 静默推广为普通 1v1 全局策略；把合同测试误报为 Replay/hash 完成。
- 回滚点：P1.1 的安全父提交为 `fb0bc40`。只删除 5 个 P1.1 新增合同文件，并撤回相应 package export、测试、架构边界、当前台账及索引入口，即可回到 `fb0bc40`；不得回滚到 `d6f9060`，以免误删已经验收的 A0.1 美术提交。本批没有存档、运行时状态或最终资产迁移。
- 当前签核：开发自检、主协调代码审查、生命周期波次/加法溢出、1000 次有界替换、独立定向复跑和治理台账均通过；P1.1 `contract-ready` 与 P1.2a `core-transaction-ready` 均已由主协调签核（2026-07-28）。P1.2b 与 P1 总体仍未完成、不得 advance。
- 提交状态：未 commit、未 push；本任务按主协调要求只完成状态收尾，提交由主协调后续处理。
