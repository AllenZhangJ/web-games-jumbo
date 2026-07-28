# Arena V2 P1 实施状态台账

## 状态

- 阶段：P1 自动替换与 10 秒权威回收。
- 当前小门：P1.2c-2「原子全系统 checkpoint、生存黄金 Replay 与 100+ seed 长局」。
- 当前结论：P1.2c-2 `atomic-checkpoint-golden-ready` 已由主协调于 2026-07-28 签核；P1.1、P1.2a、P1.2b 与 P1.2c-1 已于 2026-07-28 签核。
- P1 总体结论：**未完成、不得 advance**。P1.2c-2 不包含 4 人参与者模型、Bot、Presentation、Platform 或真机；新旧两条 stress 的 0.25ms/tick CPU 门仍为红色硬门。
- P1.1 实现审计起始基线：`d6f906008d0af1ed0133a199a8dc9e15cb1d23d0`。
- P1.1 提交父节点：`fb0bc404508bf9d7f34df53fedfaf20d31239591`。`d6f9060..fb0bc40` 之间仅包含已经独立验收的 A0.1 美术生产合同与阶段门禁文档，不包含 P1.1 代码，不改变 P1.1 行为审计结论。
- P1.2a 实现审计起始基线：`8e3e6eff6724612e83b124aa2ae6574a3967af9e`；提交父节点为 `4420d4b585025cd6999e5becf6a6f4d10b895063`，实际提交为 `22b9fd0e39b83de0b6a3ed766a2a66f3d2f67b1d`。`8e3e6ef..4420d4b` 仅包含已经独立验收的 A0.2.1 来源权利包，不改变 P1.2a 行为审计结论。
- P1.2b 实现审计起始基线为 `22b9fd0e39b83de0b6a3ed766a2a66f3d2f67b1d`，实际签核提交为 `7f9f09b6dfeb8b68a0d9ea64aa013bd348b14099`。
- P1.2c-1 实现审计起始基线为 `7f9f09b6dfeb8b68a0d9ea64aa013bd348b14099`，已签核、提交并推送为 `8de2997a76601afce18b26d8126fb5cb24ca6feb`。
- P1.2c-2 实现审计起始基线为 `8de2997a76601afce18b26d8126fb5cb24ca6feb`；当前实际父节点与安全回滚点为 `484d012934b6097043a6041f73b580699287ca39`。`8de2997..484d012` 仅为已独立签核的 A0.2.2 美术来源/参考板提交，不改变 c-2 行为审计，不计入开发证据。
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

旧 MatchCore 压力脚本尚未接入 `resolveSupplyPickups`，所以两次 CPU 超预算既不是新事务性能回归的直接证据，也不能被忽略或改写为通过。P1.2a 的直接资源结论只来自隔离的 1000 次连续替换测试；其签核时尚未实现的供给时间线、过期与事件窗口现由 P1.2b 隔离 Core 候选覆盖，但完整 100+ seed 正式长局仍是 P1 总体硬门。并行 A0.2.1 美术文件不计入 P1.2a 代码、评分或门禁成果；其类型错误只作为共享工作树中间态记录，不属于 P1.2a 行为证据。

### 风险、回滚与未完成项

- 风险：后续 MatchCore 接入时错误地把普通拾取切到 Supply 路径；在事件发射前后再做可失败操作；恢复/Replay 时缺失 Supply 生命周期；调用者错误映射淘汰或比赛结束资格。
- P1.2a 实现审计基线仍为 `8e3e6ef`，实际提交父节点与安全回滚点为 `4420d4b`。只撤回 EquipmentSystem/Resolver/export、生命周期波次校验、对应测试和本节台账，不触碰已验收 P1.1 或 `8e3e6ef..4420d4b` 间已经验收的 A0.2.1 文件。
- P1.2b 当前候选已补齐隔离权威时间线、世界实例生成/过期、固定阶段顺序、599/600/601、同 tick 冲突与时间线快照恢复；MatchCore 事件收集、Replay/hash 和黄金 Replay仍属于 P1.2c。
- 更后阶段仍需完整前摇/受击/淘汰/比赛结束 MatchCore 临界矩阵、100+ seed 长局压力、Bot、Presentation、HUD、音频和 Platform；不得用 P1.2a 的隔离事务测试冒充完成。

## P1.2b 权威供给时间线与 600 tick 过期

### 范围、依赖与写入者

- `EquipmentSupplyTimelineSystem` 只拥有整数 tick、稳定波次身份和活跃 Supply 生命周期账本；`EquipmentSystem` 继续是 equipment runtime、owner 和 primary slot 的唯一权威写入者。
- Timeline 只消费组合层注入的 Supply Definition ID、三个固定 `slotId/equipmentDefinitionId/spawnId/position` 规格以及已验证 Registry。它不选择地图、武器、位置或随机内容，本批不引入 RNG。
- EquipmentSystem 新增原子时间线阶段：在任何写入前验证全部 Registry、生命周期、重复实例、owner/slot 不变量、world/held 状态与 Expired payload；提交区只执行私有 Map 新增/删除，不调用外部回调。提交区异常会终止并清空 EquipmentSystem，fail closed。
- 固定单 tick 调度为 `spawn → expire → pickup → action`。Timeline 的一次 `step` 只在前三阶段成功后返回 `nextPhase=action`；动作解析仍由后续 MatchCore 接线负责，不能提前或旁路调用。
- Timeline 借用而不拥有 EquipmentSystem：`destroy()` 幂等清空自身生命周期账本并终止 Timeline，但不越权销毁 EquipmentSystem；Composition 必须按所有权分别销毁二者。

### 行为映射

| 冻结规则 | P1.2b 行为 | 证据与边界 |
|---|---|---|
| 首波 1200，后续每 1200 tick | 只在 Definition 合法波次计算 waveIndex | 1200/2400 生成，1199/2399 不生成 |
| 单波三件 | 构造时要求 spawn specs 数量严格等于 `spawnCount=3` | 按稳定 `slotId` 排序为 center/left/right |
| 生命周期 600 tick | lifecycle 固定 `expireTick=spawnTick+600` | 1799 存在、1800 删除、1801 不重复 |
| 同 tick 先过期后拾取 | expireTick 先从 runtime 与活跃账本移除，再把剩余生命周期交给 P1.2a 拾取 | 1800 进入范围仍无 pickup decision |
| 已持有不受地面过期影响 | 到期时 held runtime 保留，只结束 Supply 生命周期跟踪 | 同波另外两个 world runtime 产生 Expired，held 保持单槽占有 |
| 同波连续替换 | P1.2a 回收旧 held 实例后，Timeline 依据严格 Recycled 事件同步结束其 Supply 生命周期 | A→B 替换后 A 不会在 expireTick 形成悬空恢复/过期冲突 |
| 稳定身份 | `Definition:wave-N:slot-X` 与其 `:equipment` 实例 ID 由 wave/slot 纯函数生成 | 相同配置、tick、seed、输入得到相同生命周期、事件和快照 |
| 失败关闭 | 非法/跳跃 tick、非有限规格、重复 runtime、未知 schema/字段、恢复冲突在对应提交前拒绝 | 三件批量生成不会只提交一部分；拾取输入失败保留同 tick 可修正重试且不重复生成 |

### 快照、恢复与确定性

- `EquipmentSupplyTimelineSnapshot` schema v1 只在完整 tick 之间导出，包含 Definition 身份、`nextTick` 和稳定排序的活跃 lifecycle；未完成 pickup 阶段拒绝快照，避免持久化半阶段。
- 恢复重新执行 P1.1 lifecycle/合法波次校验，并校验每个 supply/instance 必须来自组合层注册的 wave/slot、当前 EquipmentSystem 必须存在同 Definition 且非 despawned 的 runtime。未知版本、未知字段、非安全 tick、重复身份和 authority 冲突均失败关闭且不改 EquipmentSystem。
- 恢复后继续到 expireTick 与不中断对照组得到完全相同的结果、时间线快照和 EquipmentSystem 快照。
- 本批没有修改 `packages/arena-match`、Replay V5、state hash 或黄金 Replay。上述确定性是隔离 Core 证据；MatchCore 事件收集、Replay/checkpoint/hash 接线属于 P1.2c 硬门。

### 生命周期、性能与失败策略

- world 状态在 expireTick 产生严格 `EquipmentExpired` payload 并直接从权威 runtime 集合删除；despawned 墓碑只清理不重复发事件；held runtime 保留。同波内被 P1.2a 替换回收的供给会依据严格 Recycled identity 同步移出活跃账本。
- 生成/过期批次全量预检后一次同步提交。拾取阶段复用 P1.2a 原子事务；若可恢复拾取输入失败，已合法完成的 spawn/expire 阶段不回滚也不重复，Timeline 保持同 tick pending 并允许修正后重试。
- 20 个连续波次的无渲染模拟中，world runtime 最大 3、活跃 lifecycle 最大 3；P1.2a 连续 1000 次替换后 runtime 始终为 1 的证据继续通过。
- 本批没有墙钟、DOM、Three.js、平台 API、地图选择或表现层定时器。

### P1.2b 独立评分（100 分）

P1.2b 只评分隔离 Equipment Core 时间线小门；候选条件为总分至少 90，且每维至少达到该维满分的 80%。

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| 权威 tick 与规则顺序 | 25 | 24 | 96% | 1200/2400、三件、600 tick 与 spawn→expire→pickup→action 已锁定；实际 MatchCore action 接线未开始 |
| 原子性与 fail-closed | 20 | 19 | 95% | 批量生成/过期全量预检后提交，拾取失败同 tick 可重试；完整 MatchCore tick 中途异常仍属 P1.2c |
| 快照恢复与确定性 | 20 | 18 | 90% | schema v1、恢复冲突、连续/恢复对照一致；黄金 Replay/checkpoint/hash 尚未接线 |
| 生命周期与资源 | 15 | 14 | 93% | 599/600/601、held 保留、20 波次上限与1000替换均有证据；100+ seed 正式长局仍未完成 |
| 依赖与兼容边界 | 10 | 9 | 90% | Rule→Core、单一写入者、普通1v1和既有Replay路径不变；正式生存Composition未接入 |
| 测试与治理 | 10 | 9 | 90% | 定向、完整Node、单worker、类型、架构、构建和直接压力已覆盖；旧MatchCore stress CPU门仍未绿 |
| **合计** | **100** | **93** | **93%** | **达到 P1.2b timeline-ready 小门并由主协调签核；不代表 P1、P1.2c 或真机完成** |

### P1.2b 实际门禁证据

| 门禁 | 2026-07-28 有效结果 |
|---|---|
| P1 合同定向 | 4 文件，38/38 通过 |
| P1.2a/P1.2b + RuleEngine/MatchCore/Replay 相关 Node | 61/61 通过；其中 Timeline 8 项、EquipmentSystem 14 项，保留1000次替换用例 |
| 完整 Node | 95 文件，727/727 通过 |
| 完整治理 Vitest（单 worker） | 首次与完整 Node 并行时，研究原型两例超过5秒，133/134文件、596/598；失败文件随后独立6/6通过；无并行重负载全量复跑134文件、598/598通过；同波次替换生命周期修正后再次无并行重负载复跑134文件、598/598通过（82.59秒） |
| 严格类型 / 包构建 | `npm run typecheck` 通过；52 packages、11 waves |
| 架构与边界 | 架构39/39、Product边界、Presentation-Three边界通过 |
| 三端构建 | Web / 抖音 / 微信通过；仅有既有的大 chunk 非阻断提示 |
| P1.2b直接长期压力 | 20个波次，world runtime与active lifecycle最大值均为3 |
| P1.2a直接替换压力 | 连续1000次替换通过，权威runtime始终为1 |
| 旧 MatchCore `arena:stress` | 本轮1000/1000完成、0 invariant failure、0 non-finite、5 Replay验证，堆增长3.41 MB/32 MB；CPU tick 0.281954 ms超过0.25 ms并退出1。该旧链不执行新Timeline，继续作为P1总体风险，不记为P1.2b通过证据 |
| 文档 / diff | 文档检查通过：256个 Markdown、800个本地链接、51条文档命令；`git diff --check` 通过 |

### 风险、回滚与未完成项

- 风险：P1.2c 接线时绕过 Timeline 直接生成/删除；动作在 pickup 前解析；MatchCore 快照只恢复 equipment 而漏恢复 timeline；Composition 销毁顺序遗漏 EquipmentSystem；把隔离事件数组误报为 Replay/hash 已接入。
- 安全回滚点为已验收并推送的 `22b9fd0`。撤回新增 Timeline 文件、EquipmentSystem 时间线阶段、export、直接测试和本节台账即可，不触碰 P1.2a 或美术并行文件。
- P1.2b签核时仍需的正式生存Composition/MatchCore、真实事件、内部hash与Replay V5初始重演现由下述P1.2c-1候选覆盖；checkpoint原子恢复与黄金Replay仍属于P1.2c-2。
- 更后阶段仍需100+ seed正式长局、暂停/恢复、前后台、低表现帧率、Bot只读观察、Presentation/HUD/音频投影和Platform证据。P1、真机和发布均不得 advance。

## P1.2c-1 正式 Composition、事件、state hash 与 Replay V5

### 拆分依据与范围

- 审计确认当前生产 `ArenaMatchConfig` 严格限定 2 名参与者，4 人权威参与者模型属于计划 P2；当前 Replay V5 checkpoint 只持有 `tick/hash`，MatchCore 也没有跨 Physics、Participant、Movement、Rule、Map、Equipment 的恢复构造入口。主协调据此同意把 P1.2c 拆为 c-1/c-2，禁止为了单批完成而提前扩 P2 或新增旁路恢复 authority。
- P1.2c-1 只完成：显式生存供给 Composition、生产 MatchCore 唯一 tick 接线、四类供给事件收集、影响未来行为的 Timeline 内部快照进入 state hash，以及 Replay V5 从同一初始 Composition、config、seed 和输入完整二次执行。
- P1.2c-2 保留：原子全系统 checkpoint 快照/恢复、恢复冲突与篡改矩阵、正式黄金生存 Replay、100+ seed 长局及事件窗口/内存上限。**4 人未覆盖不是通过项，而是 P2 计划阶段边界。**

### 行为映射与唯一权威

| 要求 | P1.2c-1 生产行为 | 失败关闭与兼容边界 |
|---|---|---|
| 显式启用 | 只有 `createArenaV2SurvivalSupplyMatchCore` 注入 Timeline factory 与只读 Supply Registry | 普通 `createArenaV1MatchCore` 不构造 Timeline；禁止生存 Composition 同时配置 `initialSpawns` |
| 单一 equipment writer | Timeline 经 RuleEngine 的显式委托调用同一个 EquipmentSystem | MatchCore 不保存第二份 runtime/owner/slot；factory 缺方法时构造失败并清理 |
| 唯一 tick 顺序 | 每个 MatchCore tick 调用 Timeline，严格验证 `spawn→expire→pickup→action` 后才进入 ActionResolver | 阶段身份、tick 或事件类型不符使整个 MatchCore fail closed；半 tick 不可返回快照或事件 |
| 真实事件 | 新增严格 schema v1 `EquipmentSpawned` 供给 payload；MatchCore按生成、过期、回收、替换顺序收集严格 payload | 旧 1v1 通用 `EquipmentSpawned` 载荷不改义；供给事件使用独立 `payload` 字段，拒绝未知字段/accessor/非法 tick/非有限位置 |
| 拾取后动作 | Timeline 提交拾取后才解析同 tick 输入，装备候选立即可被统一 ActionResolver 看见 | 1200 tick 测试锁定 `EquipmentPickedUp` 先于 `ActionStarted`；表现层不参与裁决 |
| 通用世界拾取共存 | 普通拾取在同一 pickup 阶段运行，但排除 Timeline 当前活跃实例 | 避免使用普通装备拾取半径二次拾取供给；普通1v1未传排除集合时路径不变 |
| state hash | 内部 hash 快照在启用时增加 Timeline schema、Definition、nextTick 与稳定 lifecycle 身份 | 普通1v1省略该可选段，旧 Replay V5 黄金语料仍保持原 hash |
| Replay V5 | Replay继续记录初始config、seed、输入、事件、checkpoint hash和final hash；生存 replay factory重建相同显式Composition | 错误 Composition 由 ruleContentHash/初始hash拒绝；本小门不声称checkpoint可恢复 |

### 确定性、生命周期与失败策略

- 生存 Timeline content hash覆盖 Supply Definition及组合层传入的三个 `slotId/equipmentDefinitionId/spawnId/position`，并进入 MatchCore `ruleContentHash`；Core不选择地图、武器、位置或随机内容。
- 同物2人竞争使用 seed派生的固定 contest identity；输入数组反转得到逐 tick 相同事件与 state hash。P1.2a 隔离4人竞争测试继续存在，但生产4人MatchCore明确留到P2。
- 构造阶段先验证 Registry、三个位置位于当前启用地图表面以及无并行 initial authority；Timeline由MatchCore拥有并先于RuleEngine销毁。step重入仍由MatchCore拒绝，任一内部异常清空事件并销毁所有authority资源。
- P1.2b 的 world runtime/active lifecycle有界语义、1000次替换runtime为1和同tick重试继续保留；P1.2c-1没有新增事件历史窗口，Replay runner仍只在外部显式收集完整事件。

### P1.2c-1 独立评分（100分）

本表只评分 c-1 已批准范围；候选线为总分至少90且每维至少80%。c-2与P2项目不以扣分方式伪装成已完成，而是继续作为独立硬门。

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| Composition与唯一tick/authority | 20 | 19 | 95% | 显式启用、单一EquipmentSystem、固定四阶段；正式多模式Definition留P2 |
| 严格事件合同与顺序 | 20 | 19 | 95% | 四类事件真实收集，Spawn payload严格版本化；完整Presentation投影未开始 |
| state hash与Replay V5 | 20 | 18 | 90% | Timeline未来状态进入hash，完整初始重演事件/checkpoint/final一致；恢复与黄金留c-2 |
| 健壮性与生命周期 | 15 | 14 | 93% | 构造/阶段/位置/双authority失败关闭，销毁顺序明确；跨系统恢复原子性留c-2 |
| 兼容与确定性 | 15 | 14 | 93% | 旧黄金Replay全绿，2人竞争输入置换一致；4人明确是P2边界 |
| 测试与治理 | 10 | 9 | 90% | 全Node、单worker、类型、架构与构建通过；旧stress CPU仍失败 |
| **合计** | **100** | **93** | **93%** | **达到P1.2c-1 integration-replay-ready小门并由主协调签核；不代表c-2或P1完成** |

### P1.2c-1 实际门禁证据

| 门禁 | 2026-07-28 有效结果 |
|---|---|
| Rule合同 | Contracts/Match Foundation 17/17通过；严格Spawn payload与hash段有正负测试 |
| 生产MatchCore/Replay定向 | 49/49通过；其中新增生产生存Composition 4项 |
| 旧1v1黄金与相关链 | 59/59通过；已提交Replay V5语料全部严格重演且未改hash |
| 完整Node | 96文件、731/731通过 |
| 完整治理Vitest单worker | 134文件、599/599通过，最终复跑83.30秒；无并行重负载 |
| 包构建与开发文件lint | 52 packages/11 waves通过；本批15个代码/测试文件ESLint通过 |
| 全应用严格类型 | 首次及中途复跑仅被并行A0.2.2返工脚本 `generate-arena-weapon-feedback-supplement.ts` 的颜色字面量推断错误阻断，开发任务未触碰该文件；美术任务在自身范围修复后，最终52 packages/11 waves与`typecheck:app`均通过 |
| 架构与边界 | 首次因新增Composition固定文件数仍为10而38/39；第一次机械改计数误中Content断言，复跑37/39；按包路径精确修正Content=10、Composition=11后39/39，Product与Presentation-Three边界通过，未放宽依赖规则 |
| 三端构建 | Web/抖音/微信通过；仅既有大chunk提示，dirty build不作为发布证据 |
| 旧MatchCore `arena:stress` | 1000/1000、0 invariant failure、0 non-finite、5 Replay、堆增长3.47MB/32MB；CPU 0.278991ms/tick超过0.25ms并退出1。该链使用普通1v1且不启用新Timeline，继续作为P1总体风险 |
| 文档与diff | 最终共享树文档检查258个Markdown、807个本地链接、51条命令通过；其中并行A0.2.2文档及其带来的计数变化不计入开发成果。`git diff --check`通过 |

### 风险、回滚与P1.2c-2

- 安全回滚点为已验收并推送的 `7f9f09b`。撤回本节对应的Spawn合同、RuleEngine供给委托、MatchCore factory/hash接线、显式Composition、测试和架构计数即可；不得回滚P1.2b或并行A0.2.2文件。
- P1.2c-2必须提供可验证的组合恢复设计：先在隔离候选资源中恢复并校验全部系统，全部成功后才发布MatchCore，任何未知版本/future field/identity冲突均不得改动现有authority。
- P1.2c-2还需黄金生存Replay、checkpoint恢复继续、Replay篡改、比赛结束/淘汰/暂停恢复临界矩阵、100+ seed无渲染长局、runtime/lifecycle/event窗口/内存上限。
- 当前没有Bot、HUD、音频、Presentation或Platform接入；P1总体仍未完成、不得advance。

## P1.2c-2 原子全系统 checkpoint、生存黄金 Replay 与长局

### 恢复能力审计与方案裁决

- 审计确认 Equipment Supply Timeline 与 Map Runtime 存在局部内部快照，但 Participant、Physics、Movement、Action Execution、Match Timeline 和 RNG 没有统一、原子的恢复构造口。为这些系统新增 setter 或“先构造再逐个 patch”会暴露半权威状态，故明确拒绝。
- 内部 `ArenaInternalMatchCheckpoint` schema v1 保存初始 match/config/content/physics/seed 身份、完整输入前缀、完整权威事件前缀、tick/phase/eventSequence 游标和内部 state hash。它是内部 schema，不增加 Replay V5 字段，不改写旧 V5 读取语义。
- 恢复在全新隔离 MatchCore 中从 tick 0 重演输入前缀。候选的 schema、physics backend、config hash、rule content hash、seed、tick、phase、eventSequence、事件前缀与 state hash 全部相等后才返回 Core；任一失败均销毁候选及其所有子资源。
- 该方案使 Participant、Physics、Movement、Action、Equipment、Supply Timeline、Map、RNG 和 Match Timeline 都通过各自生产转移恢复，而不是相互写入；代价是 checkpoint 体积与恢复时间均为 O(tick)。在没有可原子发布的完整直接快照 schema 前，不新增第二恢复路径。
- `MatchCore.getInternalCheckpointIdentity()` 在 step 重入/半 tick 期间明确拒绝；`HeadlessMatchRunner.exportInternalCheckpoint()` 只在完整 tick 边界导出。

### 严格校验、身份与失败关闭

| 冲突/失败 | 处理 | 证据边界 |
|---|---|---|
| 未知 checkpoint schema / future field | 在 coreFactory 调用前拒绝 | schema 2 和顶层未知字段负向测试 |
| 非安全 tick、非有限输入/事件 | 数据克隆与确定性 hash 阶段拒绝 | 候选 Core 不发布 |
| config / physics / content / seed 冲突 | 重演前比较初始元数据 | 错误 Supply spawn identity 导致 rule hash 失配并销毁候选 |
| participant / Definition / map 身份冲突 | 由严格 config/Registry/Composition 构造和 config/rule hash 双重拒绝 | 不允许 Core 在恢复时选择替代内容 |
| 输入缺失/多余/重复 | 每 tick 依当前 2 人 config 严格 normalize | 不引入 4 人兼容分支 |
| event cursor / ID / payload 篡改 | 要求 sequence 从 0 连续、`seed:tick:sequence` 稳定 ID，并与重演完整事件前缀比较 | 额外载荷、游标与 ID 冲突均拒绝 |
| state/checkpoint hash 篡改 | 重演后以内部 state hash 校验所有影响未来的状态 | 不发布分叉候选 |
| 恢复或清理失败 | 合并原失败和 cleanup causes，候选不可用 | 无全局 Manager/事件总线或外部权威更改 |

动态地图表面撤销的业务策略仍属 P3；checkpoint 不吞掉它的身份，当前 map definition、内部 surface/occurrence/revision 和状态 hash 都参与恢复校验。本小门不提前定义 P3 撤销语义。

### 连续/恢复对照与黄金 Replay

- 生存生产 Composition 在 tick 0、1199/1200/1201/1202、1800/1801/1802 和 2401 导出 checkpoint；每个恢复候选的 snapshot/hash/eventSequence 均与连续组一致。从 2401 继续到结束时，逐 tick 事件、公开快照、state hash 和最终结果一致。
- 独立强推场景在动作前摇后导出，恢复继续产生相同的 PlayerEliminated、MatchEnded 和结算结果，覆盖淘汰/比赛结束边界。
- 固定生存黄金 Replay 为独立语料 `tests/arena/fixtures/replays/survival-v5/regression-survival-supply-lifecycle.json`，场景 ID `regression.survival-supply-lifecycle` v1，使用显式生存 Core factory、固定地图/Supply/config/seed 和 Replay V5。独立 Manifest ID 为 `arena.v2.survival.golden-replays.v1`、hash `dd30e771`，replay hash `2448457c`，final hash `d460b945`。
- 现有 Stage9 普通 1v1 黄金语料保持 4 项，Manifest hash 仍为 `a53b401d`，4 项 replay/final hash 全部不变。协调自审中曾把生存条目直接加入旧 Stage9 Manifest，完整 Node 因 readiness 期望从 `a53b401d` 漂移为 `a9f0d883` 而 734/735；没有修改 readiness 期望掩盖失败，而是拆出独立生存 Registry/Manifest/校验命令，修正后完整 Node 735/735。
- 生存语料的输入、供给事件 payload、中间 checkpoint hash 和 final hash 篡改均在严格重放中拒绝。旧语料校验命令为 `npm run arena:replay:verify`，生存语料校验命令为 `npm run arena:survival:replay:verify`；两者都做 Manifest 双向覆盖、fixture 完整性、严格重放与固定场景再生成。
- Session pause 不是 MatchCore 权威 tick 状态；暂停期间不形成伪 checkpoint 或伪输入。已有 lifecycle 黄金语料仍锁定 pause 不推进 Core，本小门不将 Session 墙钟态写入权威 checkpoint。

### 120 seed 正式生存长局

- `npm run arena:survival:stress` 使用正式 `createArenaV2SurvivalSupplyMatchCore`，120 个固定 seed、每场 2500 tick，总计 300000 tick；覆盖 3 种输入数组顺序/移动模式和 60 场同物竞争。
- 三次完整执行均为 0 invariant failure、0 non-finite，runtime 最大 3/3、active lifecycle 最大 3/5、单 tick 事件最大 9/10；最终候选执行为 120/120、300000 tick、60 场同物竞争、120 个唯一终局 hash，回收后堆增长 3.83MB（预算 32MB）。资源与生命周期门通过。
- 首次审计将“每 tick 完整 state hash 重算”也算入 CPU，得到 P50 0.313238、P95 0.373785、P99 0.438466、最坏 0.639841ms/tick。对齐旧正式 stress 后，改为每 tick 仍检查快照有限性/游标，并在 1200、1801、2401 与最终态验证 hash；复跑 P50 0.284410、P95 0.317642、P99 0.387504、最坏 0.666382ms/tick。
- 最终候选复跑 P50 0.284702、P95 0.311562、P99 0.384700、最坏 0.576706ms/tick。**CPU P95 仍超过 0.25ms/tick，新链不得记为性能通过。**同一共享树上旧普通 1v1 `arena:stress` 完成 1000/1000、0 invariant/non-finite、1000 个唯一终局 hash、堆增长 3.48MB，但平均 CPU 0.281072ms/tick 超过 0.25ms 并 exit 1。两者共同保留为 P1 总体 CPU 红色硬门，不归因为 checkpoint 泄漏，也不通过缩小 seed/tick/检查范围变绿。

### P1.2c-2 独立评分（100分）

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| 全系统恢复合同 | 25 | 24 | 96% | 隔离重演恢复所有未来状态，无子系统 patch 入口；O(tick) 成本已披露 |
| 严格校验与fail-closed | 20 | 19 | 95% | schema/身份/游标/hash/输入/事件冲突拒绝并清理候选；直接快照迁移不在本 schema |
| 恢复确定性与边界 | 20 | 19 | 95% | 生成/过期/拾取/替换/动作/淘汰/终局逐 tick 对照一致；4人为P2 |
| 黄金Replay与防漂移 | 15 | 15 | 100% | 固定语料、Manifest、内容签名、再生成和四类篡改矩阵通过；V5未改义 |
| 资源与性能 | 10 | 8 | 80% | 120 seed 资源/内存/事件窗口有界且无非有限态；CPU 0.25ms 红门未关闭 |
| 测试与治理 | 10 | 9 | 90% | 定向、黄金、类型、架构与压力已有直接证据；CPU 风险保留 |
| **合计** | **100** | **94** | **94%** | **达到 c-2 合同/语料/长局小门并由主协调签核；不代表 P1 或性能 advance** |

### P1.2c-2 门禁证据

| 门禁 | 2026-07-28 有效结果 |
|---|---|
| checkpoint / 生存 MatchCore / 篡改定向 | 2 文件、14/14 通过；其中 checkpoint 边界、原子失败与淘汰终局 3 项，黄金防篡改 1 项 |
| 黄金 Replay | 旧 Stage9 `arena:replay:verify` 4/4、Manifest `a53b401d`；独立生存 `arena:survival:replay:verify` 1/1、Manifest `dd30e771`；均严格重放与再生成通过 |
| 120 seed 生存 stress | 最终执行完成 120/120、300000 tick、120 个唯一终局 hash，资源门通过；CPU P95 0.311562ms，超 0.25ms并exit 1；此前两次P95 0.373785/0.317642ms的超限事实保留 |
| 旧普通1v1 stress | 1000/1000、0 invariant/non-finite、1000唯一hash、堆增长3.48MB；平均CPU 0.281072ms/tick超预算并exit 1 |
| 严格类型 / 包构建 / lint | 52 packages/11 waves、`typecheck:app` 和本批开发文件 lint 通过 |
| 架构与边界 | 39/39，Product 与 Presentation-Three 边界通过 |
| 完整 Node | 黄金语料拆分后的最终共享树为96文件、735/735；拆分前首次734/735及原因见上，不记绿 |
| 单 worker 治理 | `npx vitest run --maxWorkers=1 --fileParallelism=false`：134文件、599/599，82.46秒 |
| 三端构建 | Web/抖音/微信通过；仅既有大chunk提示；dirty build不作为发布候选证据 |
| 文档 / diff | `check:documentation` 与 `git diff --check` 最终通过；并行A0文件不计入开发成果 |

### 风险、回滚与阶段边界

- 安全回滚点为 `484d012934b6097043a6041f73b580699287ca39`。撤回 checkpoint 模块、MatchCore/Runner 内部出口、黄金场景/fixture/Manifest、长局脚本、测试和本节即可；不得回滚 `8de2997..484d012` 的已签核 A0.2.2。
- 保留风险：checkpoint O(tick) 体积/恢复延迟；0.25ms/tick CPU 超预算；Session/前后台/真机生命周期尚未验收；动态表面撤销策略属 P3。
- 生产参与者仍严格为 2 人。4 人没有通过，而是 P2 计划阶段边界；不得用 EquipmentSystem 隔离 4 人竞争测试冒充生产支持。
- Bot、HUD、音频、Presentation、Platform 和真机仍未接入。P1.2c-2 签核也不能使 P1 总体 advance。

## P1 总体未完成硬门

- P1.2 Core：c-2 已补齐并由主协调签核隔离重演式原子全系统 checkpoint、生存黄金 Replay/篡改矩阵和 120 seed 资源长局；CPU 硬门仍未关闭。
- Replay/hash：Replay V5 保持兼容，内部 checkpoint schema v1 和黄金生存 Replay 已有候选证据；未来如引入直接快照，必须新 schema 且不得静默替换当前重演恢复语义。
- 事务矩阵：生产2人MatchCore已覆盖1200/1800、同tick拾取后动作、同波替换及竞争输入置换；4人生产权威参与者模型属于P2，不能把隔离EquipmentSystem 4人测试误报为P1通过。
- 生命周期矩阵：Core 候选已覆盖前摇继续、淘汰与比赛结束恢复；Session 暂停、前后台、低表现帧率和真机仍未验收。
- 压力与资源：120 seed 实例/lifecycle/事件窗口/内存有界已有候选证据；新旧 stress CPU 均超 0.25ms/tick，仍是 P1 总体阻断门。
- Bot / Presentation / Platform：只读观察与普通移动、权威剩余 tick 和事件投影、无墙钟删除；这些必须在 Core 硬门通过后推进。
- 正式生存 Mode/HUD 不得在上述 P1 硬门关闭前 advance。

## 风险、回滚与签核

- 主要风险：后续 Composition 绕过 Registry；Core 只实现“先清空再赋值”的非原子替换；事件载荷和实际状态身份分叉；将生存 `pickupRadius` 静默推广为普通 1v1 全局策略；把合同测试误报为 Replay/hash 完成。
- 回滚点：P1.1 的安全父提交为 `fb0bc40`。只删除 5 个 P1.1 新增合同文件，并撤回相应 package export、测试、架构边界、当前台账及索引入口，即可回到 `fb0bc40`；不得回滚到 `d6f9060`，以免误删已经验收的 A0.1 美术提交。本批没有存档、运行时状态或最终资产迁移。
- 当前签核：P1.1 `contract-ready`、P1.2a `core-transaction-ready`、P1.2b `timeline-ready`、P1.2c-1 `integration-replay-ready` 与 P1.2c-2 `atomic-checkpoint-golden-ready` 已由主协调签核（2026-07-28）；P1.2c-1 已提交并推送为 `8de2997`。P1.2c-2 主协调独立审读了隔离候选重演、身份/事件/hash 校验、失败清理、黄金语料隔离和 O(tick) 风险，并独立复跑 checkpoint、篡改、生存/旧黄金共 14 项通过。P1 总体受 CPU、Bot、Presentation、Platform 与真机硬门阻断，不得 advance。
- 提交状态：P1.2c-2 未 commit、未 push；当前 HEAD `484d012` 仅比审计基线多已签核 A0.2.2。
