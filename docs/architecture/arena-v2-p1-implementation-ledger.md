# Arena V2 P1 实施状态台账

## 状态

- 当前小门：PA1–PA4 各既定子门均已由主协调独立签核；PA5a、PA5b、PA5c 均为 `completed / coordinator-approved / formalGate=false`（各 `96/100`），PA5d 为 `completed / coordinator-approved / formalGate=false`（`94/100`），PA5 总门已冻结为 `completed / coordinator-approved / formalGate=false`。PA6-P Presentation async boundary hardening 已于 2026-08-02 完成主协调独立签核，状态为 `completed / coordinator-approved / formalGate=false`（`95/100`）。PA6 ABBA runner 当前为 `implementation-candidate / coordinator-correctness-approved / performance-deferred-by-ADR-115 / formalGate=false`：正确性门已通过，本轮按 [ADR-115](../decisions/115-arena-v2-deferred-joint-performance-gate.md)不运行 ABBA。PA7-0.2–0.5 及 lane A/B 非性能实现已完成主协调独立签核：lane A `96/100`、lane B `97/100`。P1-PP0、PP1、PP2、PP3a、PP3b 已分别以 `95/100`、`96/100`、`95/100`、`97/100`、`96/100` 完成主协调签核，A1.0-v2 当前源码合同为 `94/100`。主协调中央接线、架构不可达门、非性能 Node 集、覆盖率治理和三端包体开发门均已完成；当前进入 clean source freeze 前的最终治理收口，不再有已知包体红门。正式 PA6/PA7、设备/真机、P2/A2、commit/push 与 P1 advance 均未通过。既有正式 `300/120` CPU 红门仍为 `status=formal-failed`、`formalRequest=true`、`formalGateEligible=true`、`formalGatePassed=false`、`executionPassed=true`。
- 2026-08-25 SF-A1.0V2R最终source联合签核：美术线程在clean `5e84714015422378d1dadbcdd8785797fa14a7c7`上完整重建28源、25 fixture和Cue/回退反证并完成七维自检；主协调独立复跑PP0/PP1 `51/51`、A1.0-v2正向检查、`90/90`隔离矩阵、`typecheck:app`、文档与diff检查，逐项复核Definition→Timeline/Equipment→Match/Snapshot/Replay/Session→Bot→PP0/PP1依赖、599/600/601、同tick拾取、Recycled→Replaced、Replay/resync/destroy、只读host-free、无三选一弹窗、fallback/低动效/静音及默认入口关闭。联合评分`94/100`且各维≥80%，外部状态为`current-final-source-contract / coordinator-approved / hardGate=false`；机器JSON仍保持不能自签的`coordinatorSignOff=false / hardGatePassed=false`。该签核不开放A0.3真人、A1.1协调/逐项批准、代表样件、Blockout、正式资产、浏览器/GPU、设备、性能、PA6/PA7或P1 advance。
- SF-0/SF-A0/SF-G1 源码冻结候选已于 2026-08-04 完成开发、美术自检和主协调独立复验：父节点与上游均为 `d750e4caa767332b5c3caaf247080b5717d56219`；待提交集合为 `152 tracked + 77 untracked = 229` 路径、零删除，排序路径集合 SHA-256=`81305c317a9e3228bd34977044e5a928349d29c283e7af5daeceea0103812e15`，`package-lock.json` SHA-256=`c30f3c5e2a4509485049dd50ced04431d8b8f529ca1b36870db5f120e9c46058`。A1.0-v2 已重绑 ADR-113 `21125 B / 0ccce7df…3653` 与 ADR-114 `10908 B / 580efe43…cd5`，正向 `28 sources / 25 fixtures / 94` 和隔离 `87/87` 失败关闭通过；三端正式资产与高画质合同未降级。该状态只授权主协调创建本地 source-freeze commit，并要求提交后工作树 clean；不授权 push、PA6/PA7 通过、设备、A0.3、A1.1、代表样件、P1 advance、P2 或 A2。
- 主协调据此创建本地 source-freeze commit `4de811c280912582b65cc572011864007db2e57e`，随后完整 `npm run check` 在最后的 Product Presentation 100 场 soak 暴露测量红门，未进入 PA6。旧脚本在 Session 首次启动前取 heap 基线，把首局懒初始化/编译常驻量误计为跨局增长；隔离诊断为 10/50/100/200 场分别增长 `5,789,400 / 8,157,920 / 8,574,736 / 9,459,408 B`，呈平台化而非线性泄漏，且每轮 frame、生命周期/Canvas listener、input ownership 均清零。治理修订保持 `8 MiB` 预算和 100 个正式测量样本不变：先以独立首局 warmup 建立相同 reward 生命周期基线，随后测量 100 局，并取末局保留态与 destroy 后 heap 的较大值；诊断仅保留最近 3 项但继续统计总数。三个新进程复验为 `5,050,840 / 5,114,304 / 5,109,192 B`，均通过且 100 seed、100 authority hash 唯一、资源归零。开发自检又发现可选 GC 调用会让错误启动命令失去失败关闭；修订现于启动时捕获并强制验证 GC，缺少 `--expose-gc` 的定向命令同步 exit 1，正确命令 100 场复验为 `5,118,816 B`。该修订已由主协调提交为 `a173da0ef667c76be382a945f668e395ac0a1723`；预算未放宽、红轮不删除、formalGate 仍为 false。
- `a173da0` 后的 clean-source 全门复跑两次在 Node 集得到 `1149/1150`，中间一次独立全量 Node 复跑为 `1150/1150`；第二个可定位红轮均落在 `PA7 child close performs a required final progress reread after the last atomic replace`，错误为“同 inode metadata 在打开时漂移”。根因是 300 代原子 rename 发布期间，同 inode 的合法 ctime-only 变化被误当成内容漂移立即拒绝。当前窄修订只把 `dev/ino/size/mtime` 均稳定而仅 ctime 改变的样本改为最多 3 次重读；inode、size 或 mtime 漂移继续失败关闭，持续 ctime 抖动也在第 3 次后拒绝。新增一次 ctime 抖动可恢复和三次持续抖动失败关闭用例；两个竞态用例连续 5 轮均为 `2/2`，PA7 evidence 文件全量为 `21/21`。该项仍是 remediation candidate，须经开发七维自检、主协调全量 clean-source 复验和独立提交后才能进入延期合并的 PA6/PA7 性能门。
- 上述 PA7 ctime 修订经开发七维只读自检与主协调签核后提交为 `b673ba8`。该 clean-source 的完整 `npm run check` 已先通过治理、141 文件覆盖率与 `726/726`，但 Node 集在 `PA7 inactivity timeout TERM→KILL cleans the child and descendant process group` 的 `killSignalsSent === 1` 断言处得到 `1149/1150`，因此后续回放、构建和包体门没有被执行。根因是测试以 150ms 启动超时直接假定子进程和后代均已安装忽略 TERM 的处理器；完整套件负载下 timeout 可能先发生，无法确定性证明 KILL 分支。测试候选现要求后代先写 readiness，父 worker 再写 PID 和合法 progress 心跳，之后以 2s inactivity、10ms TERM grace、1s KILL wait 验证真实 TERM→KILL；不放宽 `termSignalsSent=1`、`killSignalsSent=1`、父子退出和后代 PID 消失断言，并精确要求失败证据已接受 `sequence=1 / case=0 / pass=1 / tick=1 / commit=null`，排除心跳尚未读到就提前超时的假绿。握手初版定向连续 5 轮均为 `1/1`、PA7 evidence 全文件为 `21/21`；新增心跳身份断言后仍须复验、开发确认、主协调 clean-source 全门和独立提交，不能把此前 1149 红轮改写为通过。
- PA7 进程组握手修订补充心跳身份断言后，定向连续 5 轮仍为 `1/1`、PA7 evidence 全文件为 `21/21`，经开发复核关闭阻断并由主协调提交为 `fd14c3d`。该 clean-source 全门已再次通过供应链、安全、正式资产、文档、lint 与 typecheck，但覆盖率阶段在 4 个 Arena V2 研究原型文件得到 `137/141 files / 722/726 tests`，后续门未执行。红轮期间只读进程证据显示另一项目的 cardease Android release Gradle daemon 一度约 `237% CPU`，同时 neotbay iOS Runner 约 `13–20% CPU` 并带有 Simulator 渲染负载，启动时间与成组超时重叠；归属任务确认后 Android wrapper 自然结束、daemon 回落至 `0–0.1%`，Arena 未终止归属不明进程。负载下降后将四个红文件以单 worker、禁止文件并行方式定向复跑，得到 `4/4 files / 14/14 tests`，总耗时 `38.66s`。该轮保留为外部污染红证据，不计为产品失败或 clean-source 通过；仍必须在外部 Runner/Simulator 安全退出后从零完成完整 `npm run check`。
- 污染证据提交为 `2c51fd6` 后，外部构建、Runner 和 Booted Simulator 均清空，clean-source 全门从零复跑并通过覆盖率 `141/141 files / 726/726 tests`；Node 集仍在 `PA7 progress fd capture retries one ordinary supersede but bounds churn and rejects symlinks` 得到 `1149/1150`，因此确认另有测试自身的调度竞态，不能继续归因于外部负载。审计发现该组合用例的两个“普通替换/ctime-only 重读后接受”场景把 worker 启动、原子发布、轮询重读和接受后的停滞全部压入 150ms。当前候选把测试启动失败窗口固定为 5s（不改变生产默认 30 分钟 inactivity 合同），并在 `afterProgressAccepted` 已取得 `sequence=1 / tick=1` 后由测试钩子立即受控结束；据此直接证明接受，不再以 150ms 停滞等待间接证明。符号链接、持续 ctime、持续 inode 代际替换仍须失败关闭，生产实现和正式预算均未放宽。修订后该组合用例连续串行 `20/20`，另以 8 个并发独立进程复验 `8/8`，PA7 evidence 全文件 `21/21`，lint、文档和 `git diff --check` 均通过；仍须开发七维自检、主协调全门和独立提交。
- 上述测试调度修订经开发七维复核与主协调签核后提交为 `1fee1e3`。其 clean-source 全门再次通过前置治理与覆盖率 `141/141 files / 726/726 tests`，Node 1150 项运行期间未出现新的 `not ok`，但桌面执行上下文切换使终端会话在取得 Node 汇总前丢失；随后只读进程审计未发现残留 `npm run check`、Node test、Vitest 或 soak。该轮是无可采信终局的中断轮，既不记为红也不记为通过；必须从 `1fee1e3` clean source 重新执行完整 `npm run check`。
- 当前结论：PA5 四门及总门已完成并冻结，普通 1v1、Replay V5 schema、事件顺序、checkpoint/state/final/authority hash 与 final result 语义保持。PA5d 接受 D24 的保守边界，不宣称任意外部进程的 OS-level atomic no-replace；PA7/PP 只能在 ADR-115 的非性能窗口消费冻结的 PA5 readStep/evidence 和 authority 合同，不得回改 PA5 接口。PA6-P 不计入 ABBA CPU 结果；实现窗口禁止性能采样，最终 source freeze 后 PA6 必须先于 PA7 正式运行。
- P1 总体结论：**未完成、不得 advance**。覆盖率和三端包体预算已通过；正式 PA6 ABBA、PA7 300/120、clean source/build 身份、七目标设备、真机/前后台、A0.3 真人与 A1 代表样件仍未完成并保持红门。P1的1/2/4竞争矩阵由EquipmentSystem/Resolver隔离事务证据承担；完整4人权威参与者属于P2且不是P1 advance前置。PA6-P完成不等于PA6/PA7、formalGate或发布通过。
- PA0 当前状态：`completed`，主协调已通过设计签核（2026-07-29）。PA1、PA1.1、PA2、PA3、PA4 与 PA5 的当前签核状态分别见各阶段章节；PA5 总门当前为 `completed / coordinator-approved / formalGate=false`，PA5d 评分 `94/100`。PA6-P 已签核；ADR-115 只授权 PA7/PP 非性能实现窗口，PA6/PA7 正式性能、P1 advance、P2/A2 或 commit/push 仍未通过。
- P1.1 实现审计起始基线：`d6f906008d0af1ed0133a199a8dc9e15cb1d23d0`。
- P1.1 提交父节点：`fb0bc404508bf9d7f34df53fedfaf20d31239591`。`d6f9060..fb0bc40` 之间仅包含已经独立验收的 A0.1 美术生产合同与阶段门禁文档，不包含 P1.1 代码，不改变 P1.1 行为审计结论。
- P1.2a 实现审计起始基线：`8e3e6eff6724612e83b124aa2ae6574a3967af9e`；提交父节点为 `4420d4b585025cd6999e5becf6a6f4d10b895063`，实际提交为 `22b9fd0e39b83de0b6a3ed766a2a66f3d2f67b1d`。`8e3e6ef..4420d4b` 仅包含已经独立验收的 A0.2.1 来源权利包，不改变 P1.2a 行为审计结论。
- P1.2b 实现审计起始基线为 `22b9fd0e39b83de0b6a3ed766a2a66f3d2f67b1d`，实际签核提交为 `7f9f09b6dfeb8b68a0d9ea64aa013bd348b14099`。
- P1.2c-1 实现审计起始基线为 `7f9f09b6dfeb8b68a0d9ea64aa013bd348b14099`，已签核、提交并推送为 `8de2997a76601afce18b26d8126fb5cb24ca6feb`。
- P1.2c-2 实现审计起始基线为 `8de2997a76601afce18b26d8126fb5cb24ca6feb`，实际签核提交为 `5d26a4f`；其提交父节点为 `484d012934b6097043a6041f73b580699287ca39`。`8de2997..484d012` 仅为已独立签核的 A0.2.2 美术来源/参考板提交，不改变 c-2 行为审计，不计入开发证据。
- 性能整改历史实现审计起始基线为 `5d26a4f`；已由主协调签核并提交推送为 `21948d4`。Profile Definition/Registry foundation 已由主协调提交推送为 `7e9e3c4`；public projection/Bot 接线小门已由主协调提交推送为 `f80307b`，A1.1 同步已提交为 `2abd7f7`。
- B1/B2 实现审计起始基线、实际父节点与安全回滚点为 `d750e4caa767332b5c3caaf247080b5717d56219`；该节点是本批唯一父提交。B1/B2 实施当时工作树没有美术 dirty，该历史批次不包含美术文件。
- 证据日期：2026-07-29。

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
| 依赖与兼容边界 | 10 | 9 | 90% | Rule→Core、单一写入者、普通1v1和既有Replay路径不变；正式生存 Composition 不属于该 P1.2b 时间线小门，后续已由本台账下一节小门接入并签核 |
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
- P1.2c-2 时点尚未纳入 Bot、HUD、音频、Presentation 或 Platform；当前 public projection + formal survival Composition Bot 接线已由本小门签核，但 P1 总体仍未完成、不得 advance。

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

## P1 Core 性能整改（候选）

### 范围、前置条件与行为映射

- 本小门只移除 Rule/Core 正式路径中的重复数据扫描、重复描述符读取与候选深克隆；没有降低 match/seed/tick、动作或验证规模，没有修改 0.25ms/tick 门槛，也没有增加仅供 stress 使用的旁路。
- `ArenaRuleEngine` 仍是既有 Rule 组合入口，`ActionResolver` 仍执行候选完整校验与稳定裁决。优化只把 `additionalCandidates` 外层/内层数组改为一次严格数据描述符快照；候选对象仍由原 Resolver 验证，不增加状态写入者、缓存或第二 tick 路径。
- 公共 Definition 数据克隆仍拒绝 Symbol、访问器、不可枚举字段、不安全键、循环和非有限值，并按键排序深冻结；实现复用第一次描述符检查得到的数据值，移除了随后再次批量读取描述符的重复工作。
- 没有改动 Supply、Equipment、MatchCore、事件、Replay、state hash、RNG、浮点、tick 或 destroy 合同。普通 1v1 与生存使用同一生产 Rule/Core 路径；生存 Timeline 增量没有单独特判。

### 证据化热点与优化裁决

- P1.2c-2 已签核基线：旧普通 1v1 平均 CPU 0.281072ms/tick，正式生存 P95 0.311562ms/tick，均超过 0.25ms。
- 在不缩小工作量的 CPU profile 中，旧链带 profiler 为 0.322727ms/tick；主要采样为 `cloneData` 17260ms、`ownDataKeys` 11152ms、GC 3569ms、`assertKnownKeys` 2873ms、`cloneSnapshotData` 2371ms 和 Resolver 2369ms。调用归因集中在 `getActionAffordance` 对 additional candidate/actor 的重复克隆，而非 Timeline。
- 生存 profile 带 profiler为 P50 0.295139、P95 0.344202ms/tick；`cloneData` 26675ms、`ownDataKeys` 16681ms、GC 4784ms、`assertKnownKeys` 3889ms、Resolver 3190ms，Timeline 自身仅约 200ms 采样。
- 第一项优化后 `cloneAdditionalCandidates` 采样降至约 281ms，但正式生存探索轮 P95 仍为 0.258325ms，故未停止整改。第二项复用严格描述符扫描后才进入正式稳定性矩阵。
- 没有引入缓存，因而没有缓存失效、跨 match 污染或 destroy 时残留引用；快照只在同步调用栈内存在并冻结。

### 端产物基线对照（不把已有红门改写为本批通过）

- clean `9d87e7e` 基线的 `mini game.js` 为 1,575,530 bytes，相对 1,572,864 bytes 上限已超 2,666 bytes；该事实说明 Platform 预算在本批之前已是红门。
- 当前性能候选产物为 1,576,835 bytes，相对同一上限超 3,971 bytes；相对 clean 基线新增 1,305 bytes。该回归属于本批必须暴露的治理结果，不能因基线本来已超限而豁免，也不能把 CPU 通过写成 Platform 通过。
- 因此本批结论严格限定为“P1 Core CPU 性能小门候选”：CPU 与 Core 资源证据可候选验收，Platform 产物预算保持红色，P1 总体不得 advance。

### 首轮候选的空闲环境五轮矩阵（已被代码修订取代）

执行环境为 macOS 26.5.1（25F80）、Apple M4 10 核、24GiB、arm64、Node v20.19.5。每轮均由新的 npm/Node 进程串行执行。协调发现并行美术自审可能与早期测量重叠后，美术任务明确暂停全部构建、类型、测试和生成命令；重叠期间即使为绿色的旧链 0.207195/0.211991ms 与生存 P95 0.231866ms 均标记为可能污染，**不计入正式五轮**。

| 正式轮次 | 普通 1v1 平均 CPU ms/tick | 生存 P50 | 生存 P95 | 生存 P99 | 生存最坏单场 |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.204078 | 0.206273 | 0.232407 | 0.316271 | 0.490639 |
| 2 | 0.202974 | 0.204638 | 0.226558 | 0.294717 | 0.476954 |
| 3 | 0.204444 | 0.206035 | 0.222456 | 0.301864 | 0.514678 |
| 4 | 0.204864 | 0.203730 | 0.228392 | 0.302951 | 0.473085 |
| 5 | 0.205857 | 0.206184 | 0.231598 | 0.309191 | 0.478410 |

- 普通 1v1 五轮平均值的 P50 为 0.204444ms、P95/最坏为 0.205857ms；相对签核基线下降约 27.3%，五轮均低于 0.25ms。
- 生存五轮 P95 的 P50 为 0.228392ms、P95/最坏为 0.232407ms；相对签核基线下降约 26.7%，五轮均低于 0.25ms。表中 P99/最坏是诊断数据，不替代冻结的 P95 硬门。
- 每轮普通链均 1000/1000 完赛、1026775 tick、1000 个唯一终局 hash、5 个 Replay、0 invariant/non-finite，固定 75501 个事件及各类型计数不变，堆增长 3.39–3.52MB/32MB。
- 每轮生存链均 120/120、300000 tick、120 个唯一终局 hash、60 场同物竞争、0 invariant/non-finite；runtime/lifecycle/event 最大值固定为 3/3/9（上限 3/5/10），堆增长 3.65–4.05MB/32MB。

上述矩阵证明首轮优化方向有性能余量，但主协调随后发现首轮 `cloneAdditionalCandidates` 在 `assertKnownKeys(entry)` 后直接读取原始 `entry.participantId` / `entry.candidates`。unknown Proxy 可令 `get` trap 返回与已验证 descriptor 不同的值或产生副作用，构成 TOCTOU 和“访问器零执行”语义退化。因此首轮候选被拒绝；表中五轮不再作为当前代码的正式 CPU 通过证据，也不得用于签核。

### 协调审查修订与当前静态结论

- `snapshotDataArray` 现在从一次 `length` own data descriptor 固定长度，不再读取原数组 `length`；随后按固定长度逐个读取 own data descriptor，并要求 `Reflect.ownKeys` 精确等于 `length + 0..n-1`，拒绝隐藏索引、重复键、稀疏、访问器、Symbol 与额外字段。
- additional candidate entry 现在经一次严格浅层 record snapshot：验证普通对象原型、known keys、enumerable own data descriptors，从 descriptor 取值写入冻结副本；participant/candidates 后续只读副本，不再直接读取 unknown entry。
- Proxy 正向测试令外层数组和 entry 的 `get` trap 直接抛错，生产调用仍成功且计数均为 0；分叉测试令 descriptor participant 为 `unknown`、普通 `get` 伪装为 `player-1`，系统按 descriptor 拒绝且 `get` 计数为 0；新增 ownKeys 隐藏索引和 ownKeys/descriptor 不一致负向覆盖，所有 `get` 仍为 0。稀疏、访问器、额外字段、unknown entry 字段继续负向覆盖。
- additional candidate 快照校验已前移到 `applyCommitmentInputs` 之前；任何 Proxy/shape/identity 失败发生在 ActionExecution 写入前，同一 tick 可用合法输入重试，不产生半 commitment 状态。
- 修改后第一次定向 Node 为 21/22，原因是未先重建 workspace package，测试加载了仍含旧 `value.length` 的构建产物；52-package 重建后当前定向 Proxy/commitment 测试为 12/12。该次构建顺序错误保留为过程事实，不计绿。
- 修复后 200-match 微基准为 0.212429ms/tick、200 个唯一 hash、5 Replay、0 invariant/non-finite。随后正式旧链前三轮为 0.215083/0.204463/0.206760ms，第四轮为 0.288566ms 并触发预算失败、使第五轮未执行。
- 主协调只读确认第四轮期间新启动了 iOS Simulator Runner、Xcode `ibtoold` 和大量模拟器服务，另有 Virtualization VM 高负载；这些进程与红轮时间重叠。红轮及原因必须保留，不能作为普通噪声删除，也不能用前三轮或修复前五轮补齐。按协调指令，当前暂停所有性能采样且不终止外部进程，等待真正空闲后从零重跑连续 5+5 轮。

### 修复后正式隔离 5+5 轮矩阵（当前候选证据）

状态更新：上一条关于“等待真正空闲后重跑”的记录为过程状态；正式隔离矩阵现已完成。执行环境为 macOS 26.5.1（25F80）、Apple M4 10 核、24GiB、arm64、Node v20.19.5。预检连续三次确认没有 Runner、booted simulator、`xcodebuild`、`ibtooll` 或活跃构建/测试；Colima VM 与容器未达到协调规定的阻断条件。每轮均从新进程启动、串行执行，修复前五轮和并行重负载污染前三轮不计入本表。每轮前后记录关键负载；最后一轮命令结束后的独立采样曾见 VM 12.5%、WebKit 7.4%，发生在产品计时结束后，不作为任何 CPU 轮次数据，也不补跑或拼接矩阵。

普通 1v1 正式 `npm run arena:stress`：

| 轮次 | 完赛/总场 | 总 tick | 平均 CPU ms/tick | 堆增长 | 结果 |
|---:|---:|---:|---:|---:|---|
| 1 | 1000/1000 | 1026775 | 0.200071 | 3.47 MB | 通过 |
| 2 | 1000/1000 | 1026775 | 0.199807 | 3.42 MB | 通过 |
| 3 | 1000/1000 | 1026775 | 0.200820 | 3.46 MB | 通过 |
| 4 | 1000/1000 | 1026775 | 0.200614 | 3.48 MB | 通过 |
| 5 | 1000/1000 | 1026775 | 0.199767 | 3.47 MB | 通过 |

五轮普通链均为 0 invariant failure、0 non-finite、1000 个唯一终局 hash、5 个 Replay 验证、75501 个事件；事件类型计数与修复前基线一致，平均 CPU 最大 0.200820ms/tick，低于 0.25ms 硬门。

正式生存 `npm run arena:survival:stress`：

| 轮次 | 完赛/总场 | 总 tick | P50 | P95 | P99 | 最坏单 tick | 堆增长 | 结果 |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 120/120 | 300000 | 0.202408 | 0.214875 | 0.296396 | 0.466465 | 4.09 MB | 通过 |
| 2 | 120/120 | 300000 | 0.200701 | 0.213946 | 0.295238 | 0.464600 | 4.02 MB | 通过 |
| 3 | 120/120 | 300000 | 0.201676 | 0.213469 | 0.296042 | 0.468264 | 3.66 MB | 通过 |
| 4 | 120/120 | 300000 | 0.203005 | 0.227698 | 0.290674 | 0.468424 | 3.86 MB | 通过 |
| 5 | 120/120 | 300000 | 0.202596 | 0.214166 | 0.292837 | 0.467355 | 3.83 MB | 通过 |

五轮生存链均为 60 场同物竞争、120 个唯一终局 hash、0 invariant failure、0 non-finite；最大 runtime/lifecycle/event 窗口固定为 3/3/9（上限 3/5/10），P95 最大 0.227698ms/tick，低于 0.25ms 硬门。P99/最坏仅作诊断，不替代冻结的 P95 门。

该矩阵只证明当前 P1 Core 性能候选和资源边界，不证明 P1 总体完成；旧 `arena:stress` 红轮及其外部重负载原因继续保留为历史证据。

### 失败关闭、确定性与生命周期自审

- 竞态/重入：优化不新增异步点、共享缓存、可变静态变量或 authority 写入；原 commit 重入保护与同 tick 顺序不变。
- 错误兜底：稀疏候选数组、访问器和额外字段在读取候选或进入 Resolver 前拒绝；访问器读取次数锁定为 0。Definition 对象仍先完成全部描述符/键校验再递归克隆。
- 边界与主流程：空数组、多个 participant 候选和稳定顺序设计上沿用既有语义；修复后 Proxy/commitment 定向 12/12、完整 Node 738/738、架构 39/39 均通过。
- 生命周期/资源：没有常驻缓存、临时 Manager 或跨 match 所有权；destroy 无新增清理分支。修复后普通五轮堆增长 3.42–3.48MB、生存五轮 3.66–4.09MB，runtime/lifecycle/event 窗口仍在 3/3/9 上限内。
- 确定性/Replay/hash：静态 diff 未改事件/hash/Replay/RNG字段；修复后普通黄金 Replay 4/4（manifest `a53b401d`）、生存黄金 Replay 1/1（manifest `dd30e771`）均复跑通过，未发现漂移。
- 普通 1v1：未启用生存 Timeline，也没有内容或 hash 合同字段变化；修复后五轮平均 CPU 0.199767–0.200820ms/tick，1000 个唯一终局 hash 与事件计数稳定，旧 1v1 兼容性候选通过。
- 回退：若严格快照出现未覆盖输入，可整体撤回本小门的两个生产实现和一项负向测试，不需要 schema、存档或 Replay 迁移。

### 性能整改候选评分（100分）

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| Profiling 与根因证据 | 20 | 19 | 95% | 两链 profile、调用归因、分步结果和未达标中间轮均保留；未将历史污染轮抹除 |
| 等价优化与 fail-closed | 20 | 18 | 90% | 严格描述符/数组边界保持；未引入缓存或旁路，Proxy/commitment 12/12；但产物相对 clean 基线新增 1,305 bytes |
| 确定性与兼容性 | 20 | 19 | 95% | 事件、黄金 Replay、hash、RNG/tick 语义复跑无漂移；P1 总体仍有未完成边界 |
| CPU、资源与生命周期 | 20 | 20 | 100% | 普通与生存各独立五轮通过，资源窗口有界，未降低负载或 0.25ms 门槛 |
| 测试与治理 | 20 | 16 | 80% | Node/治理/类型/架构/黄金语料通过；clean 基线与当前候选均违反产物预算，且曾有一次 Node runner 混用，虽已纠正但不满分 |
| **合计** | **100** | **92** | **92%** | **达到 P1 Core CPU 性能候选评分门；Platform 红门未关闭，不代表 P1 advance** |

### 性能整改门禁证据状态

| 门禁 | 2026-07-28 候选结果 |
|---|---|
| Proxy/TOCTOU 定向 | workspace 52-package 重建后 Node 12/12；覆盖 get trap 0、descriptor/value 分叉、隐藏索引、ownKeys/descriptor 不一致和真实 commitment 同 tick retry |
| 完整 Node | 96 文件、738/738 通过 |
| 单 worker 治理 | 134 文件、599/599 通过；按 `--maxWorkers=1 --minWorkers=1` 复跑 |
| 严格类型 / 包构建 / lint | `typecheck:app` 通过；`build:packages` 52/52、11 waves；lint 通过 |
| 架构与边界 | 架构 39/39 通过；错误的 Node runner 混跑记录为过程事实，随后按正确 runner 单独通过 |
| 黄金 Replay | 普通 4/4，manifest `a53b401d`；生存 1/1，manifest `dd30e771` |
| 三端构建 | `build` 与 `arena:build:verify` 通过；`arena:build:budget` 的 Douyin/WeChat 最大交付产物均 1,576,835 bytes，超过 1,572,864 上限 3,971 bytes；clean `9d87e7e` 同一 `mini game.js` 为 1,575,530 bytes、已超 2,666 bytes，本批相对回归 +1,305 bytes，Platform 预算门保持红色 |
| 文档 / diff | 文档检查 263 markdown/834 local links/53 commands 通过；`git diff --check` 通过，并行A1.1文件不计入开发成果 |

### 本轮台账严格自审

- 范围核对：本轮只更新本台账；未修改生产代码、测试、美术文档或美术来源包。当前工作树没有美术 dirty，本小门提交不包含美术文件。
- 证据核对：clean `9d87e7e` 与当前候选的 `mini game.js` 均按同一 1,572,864-byte 上限对照；已明确记录基础红门与本批 +1,305-byte 回归，没有把 `build:budget` 红结果写成通过。
- 命令核对：一次将架构 Node 测试与治理 Vitest 文件混跑的命令被记录为 runner 误用并排除；随后架构 39/39 与单 worker 治理 599/599 均使用各自正确入口复跑通过。
- 污染核对：修复前五轮、并行重负载污染前三轮和污染期间第四轮红结果均保留，未拼接为当前 5+5；最后一轮产品计时结束后的 VM/WebKit 峰值只作环境事实，不进入 CPU 统计。
- 结论核对：评分由 94 下调为 92（各维度不低于 80%）；结论仅为 P1 Core CPU 性能小门候选，Platform、P1 总体和 `advance` 均保持 fail closed。

### 风险、回滚与阶段边界

- 安全回滚点为 `9d87e7e`；只撤回 `arena-rule-engine.ts`、`definition-utils.ts`、对应负向测试和本节台账，不得回滚 `dd786a9..9d87e7e` 间已签核的 A1.0 合同。
- 保留风险：CPU 数据依赖当前机器与进程隔离，需主协调独立复跑签核；未来候选数据结构扩展必须继续保持严格 descriptor 边界，不能绕过 Resolver 校验。
- 性能 CPU 小门已由主协调签核并提交推送为 `21948d4`；Douyin/WeChat 交付预算在当前工作树仍为红色，且 Bot、Presentation、Platform、前后台/真机生命周期和发布证据仍未完成，4 人生产权威参与者仍为 P2 边界。

## P1 Bot：Profile Definition/Registry foundation（已签核）

### 阶段定位、前置与范围

- 本小门遵循 `Rule → Core → Bot → Presentation → Platform`，实现审计基线为 `e49f159`，已由主协调提交推送为 `7e9e3c4`；并行 A1.1 美术文件不纳入开发证据。
- 前置是 P1.1/P1.2 Core 合同与主协调已签核的 P1 CPU 小门；本批只把已有 Bot 逻辑治理为严格 Definition/Profile/Registry，并在 QuickMatch 组合根显式校验、注入只读 Registry。
- `BotProfileDefinition` schema v1 是对象内真实字段 `schemaVersion=1`，缺失、0、未来版本均拒绝；Registry Definition 保留版本字段，而 legacy `BOT_DIFFICULTY_PROFILES`/`getBotDifficultyProfile` 通过显式 projection 去掉该字段，保持旧字段顺序、值和研究 hash 形状。不新增 Replay/hash 字段，不改变默认 1v1 的难度、seed、tick 或输入语义。
- `BotProfileRegistry` 构造时完成严格复制、字段/数值校验、重复 ID 拒绝和稳定 ID 排序；Registry、列表和 Definition 均冻结，`get/require/has/list` 只读，组合阶段拒绝伪造或未校验 Registry。
- 本批只验证既有 BotController 的受限输入边界兼容性：它消费既有 `BotObservation`/arena view，按注入的 uint32 seed、整数 tick、延迟观察和普通移动策略输出归一化 `ArenaInputFrame`；它不直接拾取、替换、命中或写入 Core 状态，ActionResolver 仍是唯一裁决者。
- 在 foundation 小门签核时，`BotVisibleEquipment` 只有 `instanceId`、`definitionId`、`locationState` 和 `position`，没有单物 `remainingTicks` 字段；该历史范围由下一节 public projection + formal survival Composition 小门覆盖并已签核，不能把 foundation 签核倒写成公开生命周期已完成。
- 本批没有新增对 MatchCore、Session、Replay、Renderer 或 Platform 的生产依赖；现有 `arena-match` 仅提供公开 participant status/observation 合同，生产 Bot 未导入 `MatchCore`、Session、Replay 或 Renderer。QuickMatch 只负责组合时注入 Registry，不把组合根下沉为 Bot authority。

### 计划行为映射与兼容边界

| 计划要求 | 本批落点 | 明确边界 |
|---|---|---|
| Profile Definition/Registry 可扩展 | `BotProfileDefinition` 使用通用 string ID；Controller 只通过注入 Registry `require(profileId)`，默认 `easy/normal/hard` 仍由旧投影提供 | 新增 Profile 不需修改 Controller；组合层仍必须校验生产默认难度完整存在 |
| 组合阶段前置校验 | QuickMatch 在保存组合选项前要求 `easy/normal/hard` 全部可 `require`，缺任一项立即失败 | `coreFactory`、`botControllerFactory`、`sessionFactory` 均未调用，不创建半资源 |
| 普通移动兼容性 | 既有 `BotController` 继续通过 mobility policy/scheduler 输出有界 `ArenaInputFrame` | 不绕过 ActionResolver，不直接写 position、weapon、命中或胜负 |
| 确定性 | behavior/personality seed 严格 uint32；同 snapshot/tick/input 通过同一 Profile 得到相同帧和调试快照 | 不引入墙钟、`Math.random()`、宿主 API 或新的 RNG 流 |
| 普通 1v1 兼容 | 默认 Profile 数值、字段顺序、旧投影和 Matchmaking 字面量类型保持；QuickMatch 仅增加等价 Registry 注入 | 正式生存 Composition/公开剩余 tick 不属于 foundation 小门，现由下一节已签核小门单独审计；4 人生产仍未接入 |

### 失败关闭、竞态与生命周期

- Definition 在任何使用前拒绝未知字段、缺失字段、访问器、缺失/0/未来 `schemaVersion`、非有限值、非安全整数、越界概率/暂停/移动参数；Registry 拒绝非数组、重复 ID 和未校验对象，未知 profile 由 `require` 失败关闭，不回退默认值。legacy projection 不作为 Registry Definition 重新输入，避免丢失版本合同后旁路进入 Controller。
- BotController 在创建前完成 participant、difficulty、profile、seed、arena 与边界验证；输入快照身份/连续 tick/可见状态失败时不消费历史或 RNG，同 tick 可重试。既有重入保护、内部规划失败销毁控制器并禁止继续运行的行为保持不变。
- `destroy()` 保持幂等；无新增常驻缓存、事件总线、Manager 或跨 match 所有权。Registry 是不可变共享值，注入的自定义 Registry 只在该 Controller/QuickMatch 组合中使用，不回写全局默认值。
- Registry Profile Definition 显式带版本字段；legacy projection 显式保留旧对象字段顺序和值，防止研究数据 hash/序列化形状漂移。本批没有修改 Replay V5、state hash、事件 schema、RNG/tick 合同或 MatchCore 写入者。

### 实际门禁与测试证据

| 门禁 | 本批结果 | 解释 |
|---|---|---|
| Bot/QuickMatch 定向 | Bot foundation 9/9；QuickMatch foundation 3/3；合并定向 12/12；Node Bot/观察/移动/目标/Controller 21/21 | 覆盖 Registry `schemaVersion` 存在、缺失/0/未来版本拒绝、legacy projection 无版本且字段顺序/值保持、通用新 ID `rush` 注入、未知 ID 失败；缺少任一生产难度时 QuickMatch 在组合阶段失败且 core/bot/session 工厂均 0 调用 |
| 完整 Node | 96 文件、739/739 通过 | 包构建后执行，包含旧 1v1 与 Bot 链；不把研究原型 coverage 超时误写成 Node 失败 |
| 单 worker 治理 | 134 文件、601/601 通过，`--maxWorkers=1 --minWorkers=1` | 证明本批在单 worker 下无测试并发依赖 |
| Architecture / boundary | 架构 39/39；Product 与 Presentation-Three 边界通过 | Bot package 依赖方向和禁止宿主/表现/Session 反向依赖检查通过 |
| 严格类型 / 包构建 / lint | `typecheck:app` 通过；`build:packages` 52 packages、11 waves 通过；lint 通过 | QuickMatch 注入后的最终树复跑通过 |
| 黄金 Replay | 普通 4/4，manifest `a53b401d`；生存 1/1，manifest `dd30e771` | 本批无 Replay/hash schema 变更；证据用于防漂移，不宣称 checkpoint/新 Bot Replay 已完成 |
| 无渲染 Bot stress | 直接 `node --import tsx scripts/arena-bot-stress.ts --matches=30 --replay-samples=3` 通过：3 difficulty×30、90 唯一终局 hash、9 replay checks、10,000 分布样本、capability/distribution gates 通过、0 mobility failure | `sourceDirty=true`、`freezeEligible=false`；这是候选证据，不是发布冻结证据 |
| 完整覆盖率治理 | 默认 `npm run check:governance` 的 134 文件中 599/601，2 个既有研究原型测试默认 5 秒超时；`--testTimeout=15000` 后 601/601，但 arena-equipment 语句/行覆盖 67.84% 低于 78% 阈值 | 该红门不是 Bot 定向失败，仍必须在 P1 总体治理中保留，不能改阈值或伪装成全治理通过 |
| 三端构建 / 预算 | `npm run build`、`arena:build:verify` 通过，三端默认入口为 product；`arena:build:budget` fail-closed：当前 douyin/wechat `game.js` 1,579,699 bytes，超 1,572,864 上限 6,835 bytes | 继续保留 Platform 红门；本批不通过压缩、降负载或改阈值规避 |
| 文档 / diff | `check:documentation` 263 Markdown、837 本地链接、53 命令通过；`git diff --check` 通过 | 当前工作区只含本批代码/测试/台账，不纳入 A1.1 美术文件 |

### Bot 小门独立评分（100 分）

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| Profile Definition / Registry 合同 | 20 | 20 | 100% | 对象内 schema v1、缺失/0/未来版本拒绝、稳定排序、冻结、重复/未知/坏 Definition 和 legacy projection 均有测试 |
| Profile ID extensibility / Controller 边界 | 20 | 18 | 90% | Controller 只依赖注入 Registry，默认与自定义 ID 均可解析；正式生存公开生命周期投影不属于该 foundation 小门，已由下一节小门接入并签核 |
| seed/tick 确定性与 Replay/hash 兼容 | 20 | 19 | 95% | 90 场 stress、9 replay checks、黄金 Replay 无漂移；无新增 Replay/hash schema |
| fail-closed、重入与生命周期 | 15 | 14 | 93% | accessor/非法输入/同 tick retry/重入/destroy 覆盖；更广压力仍受既有治理红门约束 |
| 无渲染行为覆盖 | 15 | 12 | 80% | 21 个 Node 定向与 90 场 stress 通过；默认 300-match stress 超时并被停止，不能记为通过 |
| 架构与治理 | 10 | 8 | 80% | 架构、类型、包构建、lint、单 worker 与文档通过；coverage threshold 与 Platform 预算仍红 |
| **合计** | **100** | **91** | **91%** | **达到评分线；主协调已签核为 `profile-registry-foundation-ready`（2026-07-29），不代表 P1/P1 Bot 完成** |

### 未完成项、风险与回滚

- foundation 小门未实现正式生存 Composition 的 Bot 注入、`BotVisibleEquipment` 单物剩余 tick 公开投影、4 人权威参与者模型、HUD/音频/Presentation、Platform、前后台/真机生命周期；上述公开 projection 与正式生存 Bot 接线现由下一节小门覆盖并已签核，4 人仍属于 P2 阶段边界。
- foundation 小门未改变 Replay V5、state hash 或事件 schema，也没有将 Bot 变成第二 tick authority；当前正式生存接线仍由 Composition 注入已注册内容和只读观察，Bot 不选择地图/武器或直接修改供给。
- 默认 300-match Bot stress 曾运行约 12 分钟后因无输出被停止；随后 30×3 difficulty 的直接脚本通过。曾错误使用 `npm run arena:bot:stress -- --matches=30 --replay-samples=3`，因重复 `--matches` 被拒绝；已改用脚本直接调用并保留该命令误用事实，两者均不冒充 300-match 通过。
- `npm run check:governance` 默认 coverage 有 2 个既有研究测试超时；提高测试超时后 601/601 但 `arena-equipment` coverage threshold 仍为 67.84%/78% 红门。该事实与当前 Platform 产物超限共同保持 fail-closed。
- 当前 dirty 产物相对 `e49f159` 的包体增量仍是未关闭的 Platform 风险；本批没有把它归因或拆分为 Bot 单独增量，也没有因此修改预算门槛。当前 douyin/wechat `game.js` 超限数据必须继续保留。
- 安全回滚点为 `e49f159`：只撤回本批 Bot Profile Definition/Registry、难度投影调整、Controller/QuickMatch Registry 注入、对应测试和本节台账；不得回滚已验收的 A1.1 美术提交，也不触碰此前 P1 Core 签核提交。
- 当前状态是 **profile-registry-foundation-ready，主协调已签核并提交推送（2026-07-29，`7e9e3c4`）**；下一节 public projection + formal survival Composition Bot 小门已另行签核，P1 总体仍 **未完成、不得 advance**。

## P1 Bot：public active-supply projection + formal survival Composition（已签核，已提交 `f80307b`）

### 阶段定位、审计基线与范围

- 本小门严格位于 `Rule → Core → Bot`：实现审计起始基线为 `7e9e3c4`，实际提交为 `f80307b`；A1.1 同步已提交为 `2abd7f7`。本小门不触碰 A0/A1 文档或美术文件。
- 本小门只覆盖两件事：
  1. Timeline 从权威整数 tick、冻结 Definition/spawn spec 和稳定 instance identity 生成版本化 public active-supply projection；
  2. 正式 survival Composition 在组合阶段注入已注册 Profile Registry 和已严格校验的 projection lifecycle contract，Bot 只通过只读观察输出普通 `InputFrame`。
- 不在本小门实现 Presentation adapter、HUD/音频、Platform/真机、4 人生产权威参与者、地图或武器选择、第二 tick authority、供给旁路拾取、Replay V5 新字段或 state-hash 新字段。4 人仍是 P2 计划边界，不是本批遗漏后的通过。
- 普通 1v1 不启用生存 Timeline 和严格 projection contract；既有 equipment snapshot 字段、内部 checkpoint、Replay V5、state hash、动作与输入语义保持不变。
- Bot 明确分离两类输入：`cloneBotSourceSnapshot(raw ArenaMatchSnapshot)` 使用严格 raw equipment key 集，不包含 `originPosition` 或通用 `remainingTicks`；`createBotObservation(BotSourceSnapshot)` 使用独立 normalized `BotVisibleEquipment` key 集，允许其合法的派生 `remainingTicks`。后者只接受 `null` 或能与同一 `activeSupplyProjection` 映射一致的值；普通 1v1 的该字段保持 `null`，不能把 normalized Bot 数据当作 raw authority 快照。

### 生产落点与行为映射

| 计划/审查要求 | 本小门落点 | 明确边界 |
|---|---|---|
| 单物生命周期公开剩余 tick | `arena-public-supply-projection.ts` 定义版本化 projection；Timeline 是唯一 producer | 不把内部 active ledger 直接暴露给 Bot 或表现层 |
| 稳定供给身份 | 每项同时绑定 `supplyDefinitionId/supplyId/equipmentInstanceId/equipmentDefinitionId/equipmentSpawnId/spawnTick/expireTick/position/spawnPosition` | `spawnPosition` 只存在于 projection item，不扩散进普通 `ArenaEquipmentSnapshot`、internal snapshot、hash 或旧 Replay |
| pre-expiry authority identity | projection schema 已升级为 v2，增加有界、稳定排序的 `pendingExpiryEquipmentInstanceIds` | v1 projection 不静默读取；未知/旧 schema fail closed；pending identity 自身按 formal namespace 解析并证明 `expireTick===snapshotTick` |
| 剩余 tick 算法 | `remainingTicks = max(0, expireTick - snapshotTick)`；到期前公开正值 | `remainingTicks=0` 不发布为可交互供给；+600 先 expire 后 pickup |
| 世界可争夺过滤 | projection 只保留世界中仍可表现/争夺的 supply；HELD/DESPAWNED、已拾取/替换完成项过滤 | 空槽拾取后内部 timeline ledger 可暂存至 expireTick，但同一 public snapshot 立即移除 |
| 双向完整性 | producer 与消费侧都校验 projection 集合 ↔ 当前 world-supply equipment 集合 | 删除 projection 而保留 world item、重复 supply/instance 或身份连接冲突均拒绝；合法 held/despawned replacement 作为 nonWorld，不要求继续出现在 projection |
| formal identity-first | consumer 先从 `equipmentInstanceId` 的正式 supply namespace 解析 wave/slot，再校验 Definition/spawn spec/lifecycle | 普通1v1无 lifecycle contract 时不误伤；正式 survival 下任何 spawned/dropped 普通 namespace 都 fail closed |
| 正式生存身份 | `ArenaPublicSupplyProjectionLifecycleContract` 以纯数据携带正式 Definition、合法波次、spawn spec、Registry equipment IDs | 通用 contracts 不依赖 Definition package；Composition/Core/Bot 边界强制注入和审计 |
| Bot 接线 | survival Composition 使用已验证 Profile Registry；`BotController` 在 strict 模式要求 projection 并只返回 InputFrame；raw/normalized snapshot 双入口分别 fail closed | Bot 不调用拾取/替换、不写 Core、不读取 Timeline 私有状态、Session/Replay/Renderer 或未来状态；normalized 路径只做结构、tick/sequence、可见 equipment 映射与 pending/world 互斥校验，完整 Definition/spawn/lifecycle authority 审计仍由 raw clone 路径完成 |

`arena-v2-survival-supply-bot-composition.ts` 先对 `supply` 做 `cloneFrozenData`、严格键校验、正式 Definition ID 校验和 `spawnSpecs` 数组校验，再提取冻结副本为局部 `spawnSpecs`，供 Core 构造和 `supplyProjectionContract` 使用；不存在未定义变量，也不把原始输入对象直接注入 projection contract。Core 构造继续对每一项做完整 spec/地图表面/Definition/波次校验，构造失败时清理 Core/Controller 资源。

### 同 tick、pre-step 与恢复语义

- Timeline/MatchCore 唯一顺序仍为 `spawn → expire → pickup → action`。在 `expireTick` 恰到达时，内部 expire 先移除可交互 world item，随后 pickup 不得命中；已持有武器不受地面物品过期影响。
- post-step public snapshot 是 `resyncReadiness='ready'`、`pendingAuthorityTick=null` 且 `pendingExpiryEquipmentInstanceIds=[]`，可供未来只读消费者验证和恢复。
- `+600` 的 pre-step snapshot 是合法的当前 tick command view：projection 为空、`resyncReadiness='not-ready-pre-expiry'`、`pendingAuthorityTick=snapshotTick`，并携带每个仍待过期 world instance 的 pending identity。MatchCore 对外 equipment 可已过滤为空；formal consumer 不能从该空集合推导 pending，而是独立解析 pending identity 并验证其 contract-derived `expireTick===snapshotTick`。它**不是**可恢复到上一 tick 的 active 状态，也不声称能从空 projection 重建 `+599`。
- `assertArenaPublicSupplyProjectionResyncReady()` 对该 pre-step view fail closed；冷启动、seek、断流或未来 Presentation adapter 必须等待下一份 post-step ready snapshot，内部 checkpoint 恢复则使用权威内部状态，不把 command view 当作恢复输入。没有增加 Presentation adapter 或第二份生命周期 authority。
- projection audit 拒绝 tick/sequence 错配、非安全整数、未来/旧 schema、未知字段、缺字段、重复 identity、Definition/Registry/slot/spawn/expire/position 不一致、formal namespace world equipment 未映射、过期后仍在 world、pending identity 超界或边界不符和不完整 event 水位。通用 `createArenaMatchSnapshotAudit` 不注入 lifecycle contract，只做严格 v2 结构与 ready/pending 互斥审计；合法 expiry 边界由 formal `require...(... lifecycleContract)` 路径验证。

### 旧行为、兼容性与确定性

- 普通 1v1：不创建 survival Timeline，不要求 `activeSupplyProjection`，原有 `ArenaEquipmentSnapshot` 的字段顺序和数据形状保持；不把 `spawnPosition` 或 projection 字段写入 internal checkpoint、Replay 或 hash。
- 生存：地图和装备仍由 Composition 传入且经过 Registry/Definition 校验；Core 不随机选择内容，Bot 不选择供给内容。相同 Definition、seed、整数 tick 和输入顺序得到相同 projection identity、remainingTicks、eventSequence 和 Bot InputFrame。
- 已有普通黄金 Replay 与生存黄金 Replay 的 manifest/hash 未更新：普通 `a53b401d`，生存 `dd30e771`；普通四条与生存一条黄金均复验通过，证明本小门没有改变既有 Replay V5/hash 字节合同。

### 实际验证证据

| 门禁 | 当前有效结果 | 说明 |
|---|---|---|
| projection/Timeline/MatchCore/Bot 定向 Node | 主协调独立 33/33 通过 | 覆盖 1200/2400、599/600/601（MatchCore 直接断言 public equipment 与 3 个稳定 pending ID）、+600 pre-step pending metadata、future/expired/ordinary namespace/slot-definition-spawn 篡改、双向完整性、合法同波 recycle、空槽拾取后内部暂存/public 移除、恢复后无重复 expiry、Bot 缺 projection 与同 tick 修正重试 fail closed；另覆盖 raw public equipment 的 `originPosition`/通用 `remainingTicks` 额外字段拒绝、合法 structured normalized BotSourceSnapshot、缺 projection 保留非空派生 remainingTicks 拒绝、pending/world overlap 拒绝与普通 1v1 正常快照通过 |
| contracts/Match/Bot foundation Vitest | 主协调独立 26/26 通过 | 覆盖严格 projection contract、未来字段/身份篡改、resync readiness 和旧基础链；最后双 normalizer 只改 Bot 内部与测试，依赖边界未变 |
| 完整 Node | `npm run test:node` exit 0 | 当前命令的终局计数未从截断输出复核，故不把历史计数冒充本小门精确计数；定向结果单列且可采信 |
| 架构 | 主协调独立 39/39 通过 | 本小门代码完成后运行；最后双 normalizer 只改 Bot 内部与测试，依赖边界未变 |
| 严格类型 | `npm run typecheck:app` exit 0（本轮复跑） | 包含 raw/normalized Bot 双入口、`spawnSpecs` 局部冻结副本和 formal contract 类型检查 |
| 包构建 / lint | `build:packages` 52 packages、11 waves 通过；`npm run lint` exit 0 | 无新增生产旁路 |
| 三端构建 | `npm run build` 与 `npm run arena:build:verify` 通过 | 当前 dirty buildId；三端入口均为 Arena product |
| 边界 / 文档 / diff | `typecheck:app`、lint、文档检查与 `git diff --check` 通过 | 当前工作树没有美术 dirty；本小门提交不包含美术文件 |
| 黄金 Replay 防漂移 | 主协调独立普通 4/4，manifest `a53b401d`；生存 1/1，manifest `dd30e771` | 不代表 Presentation adapter、checkpoint 新入口或真机验收 |
| 单 worker 治理 | 134 files、601 tests 全部通过，但 coverage threshold 仍红 | Statements/Lines 62.33%、Branches 70.25%、Functions 68.87%；`arena-contracts` branches 73.9%<75%，`arena-equipment` lines/statements 70.5%<78% |
| 产物预算 | `arena:build:budget` fail closed | Web 1,559,079 通过；Douyin/WeChat `game.js` 1,594,413，较 1,572,864 上限超 21,549；Platform 红门保持 |

一次将 Node runner 与 Vitest 文件混在同一命令中执行，触发 Vitest internal-state 错误；该命令结果不计入证据。随后已用独立 Node/Vitest 入口复跑并取得上表 33/33 与 26/26。coverage 的既有并发临时文件错误同样不计入产品结果；单 worker 结果仍保持“测试通过但 coverage threshold 红”。

曾有一次 coverage 并发启动导致 `coverage/.tmp/coverage-40.json` `ENOENT`，该命令被排除为治理工具使用错误；随后使用 `--maxWorkers=1 --minWorkers=1 --fileParallelism=false` 的单 worker 复跑，得到上述 134/601 全通过但覆盖率阈值红的有效结果。不得把并发污染或历史研究原型超时抹平成绿门。

### 本小门评分（100 分）

评分只判断本小门的合同和接线质量，不替代 P1 总体硬门；本小门已达到 90 分且各维度达到 80%，并已完成主协调独立验收签核。

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| 公开生命周期规则合同 | 20 | 19 | 95% | identity、remaining、过滤、+600 readiness 和同 tick 语义已落地；表现 adapter 尚未实现 |
| 消费侧严格审计/双向完整性 | 20 | 18 | 90% | 纯数据 contract 能拒绝自洽篡改、缺 projection 和 world/projection 不一致 |
| 生存 Composition/Bot 边界 | 15 | 14 | 93% | Registry 注入、冻结 supply 副本、strict projection、InputFrame-only 边界通过 |
| pre-step/resync/生命周期 | 20 | 18 | 90% | pre-step 明确不可恢复且 post-step ready；跨 Presentation/冷启动 adapter 仍未验收 |
| 1v1 兼容/确定性/Replay/hash | 15 | 14 | 93% | 旧字段与黄金 manifest/hash 无漂移；未覆盖 4 人 P2 |
| 测试与治理 | 10 | 8 | 80% | 定向、架构、类型、构建、Replay 与 diff 通过；coverage 与 Platform 预算继续红 |
| **合计** | **100** | **91** | **91%** | **达到评分线；本小门已签核为 `public-supply-projection-survival-bot-ready`（2026-07-29），已提交 `f80307b`** |

### 本轮自审、风险与回滚

- Rule→Core：Timeline 是唯一 supply projection producer；MatchCore 只按同一 tick 顺序发布 snapshot；Bot 不拥有生命周期、拾取、替换或动作裁决 authority。
- 竞态/重入：projection 在公共发布前完成 tick、sequence、双向集合和身份校验；Bot 严格模式缺 projection 时在消费 RNG/历史前失败，同 tick 可用完整 ready snapshot 重试；pre-step pending identity 不作为可交互对象。
- 失败兜底：未知/旧 schema、未知字段、accessor、非安全 tick、重复 ID、Definition/Registry/spec/position/expire 冲突、formal namespace world equipment 未映射、过期后仍在 world、pending identity 边界冲突、resync not-ready 误用和缺 projection 均 fail closed；合法 held/despawned replacement 被归为 nonWorld，不误报；Composition 构造失败清理已创建 Core/Controller。
- 边界：首波 1200、后续 2400；+599 remaining=1；+600 expire-before-pickup 且不发布 0 tick；+601 无重复 expiry；空槽拾取后 public 立即移除而内部 ledger 可保留到生命周期终点；held item 不随地面 expiry 消失。
- 生命周期/资源：内部 timeline ledger 与 public projection 分离；旧实例回收从权威 runtime 删除；Composition 所有权转移后清空本地 cleanup 引用；不新增无界 runtime、事件总线或跨 match 缓存。
- 主流程阻断：正式生存缺 projection 不会产生 Bot 供给决策；普通 1v1 不被 survival contract 强制；Presentation adapter 尚未开放，A0.3、A1.1 执行/代表样件与 Blockout 也尚未开放，不能把本小门签核解释为表现层完成。
- Replay/hash：projection 不进入既有 internal snapshot/hash；黄金 Replay manifest 和 hash 精确复验通过。完整 checkpoint/Replay 状态闭环仍属于 P1.2c-2 已签核基础，不在本小门重新宣称完成。
- 未完成风险：单 worker coverage threshold 红；Douyin/WeChat 预算红；当时尚未完成的 300-case Bot stress 已在后续正式运行中完成执行但 CPU formal gate 失败；Presentation adapter、Platform、真机、前后台、4 人 P2 和 P1 总体 advance 仍未完成；A0.3、A1.1 执行/代表样件与 Blockout 尚未开放。active lifecycle projection 合同已具备且本小门已签核，但不扩大这些未完成范围。
- 回滚：回滚到 `7e9e3c4`，只撤回本小门的 projection contract、Timeline public producer、survival Composition/Bot 接线及对应测试/台账段落，不回滚已签核 Profile foundation 或任何已验收美术提交。

### 签核状态

**本小门已签核为 `public-supply-projection-survival-bot-ready`（2026-07-29），已提交 `f80307b`。** 本节不得将 P1 标记为 advance；Presentation adapter、A0.3、A1.1 执行/代表样件与 Blockout 均未开放。

## P1 Bot：formal survival pressure / determinism（前置候选，已转入 Performance-A；压力门仍阻断）

### 阶段定位、基线、前置与范围

- 小门名：`P1 formal-survival-bot-pressure-ready`；实现审计起始基线、实际父节点和安全回滚点均为 `2abd7f7`。本节保留 pressure runner 的独立候选证据；Performance-A 的生产改动与当前状态见下节，不代表主协调签核、提交或 P1 advance。
- 前置：`public-supply-projection-survival-bot-ready` 已提交于 `f80307b`，A1.1 同步父提交为 `2abd7f7`；正式 survival Composition、Profile Registry、active lifecycle projection、普通 InputFrame 路径和 Replay V5/hash 兼容合同已存在。
- 允许改动：`scripts/arena-formal-survival-bot-pressure.ts`、正式定向 Bot 测试、package 脚本、本节台账。未修改 Timeline、EquipmentSystem、MatchCore、Replay、Presentation、Platform、正式资产或 A0/A1 文件。
- 正式门：默认 300 个完整 case、至少 120 个唯一 seed、每个 case 双跑；固定 manifest/case/seed/config/Definition/input-plan identity；不降低 2500 tick、参与者、动作、验证或 `0.25ms/tick` 门槛。
- 明确边界：现有生产权威为 2 人；4 人仍是 P2。正式 Bot stress 不是 Presentation、Platform、真机或 P1 总体完成。

### 实现与行为映射

| 要求 | 本批落点 | 证据/边界 |
|---|---|---|
| 正式 survival Composition | 新 runner 每个 case 均调用 `createArenaV2SurvivalSupplyBotSession`，注入 `BOT_PROFILE_REGISTRY`、正式 Definition 和固定 spawn specs | 禁止导入 `arena-v1-experiment`；旧 `scripts/arena-bot-stress.ts` 仍明确不是本门证据 |
| 固定 case/seed/config/input identity | manifest 携带完整 `ARENA_V2_SURVIVAL_SUPPLY_DEFINITION`、ARENA、config template、Profile Definition 集合、6 个完整 input plan、pause boundary 集合；300/120 默认；caseIdentity 不含 caseId | smoke manifest hash `9b350afb`、definition hash `26a9eb8c`、config hash `b55acfab`；正式默认 hash 必须由完整门输出并锁定，不提前伪造 |
| 状态与正式请求分类 | `formalRequest` 只表示 300/≥120/2500 请求形状；纯分类器输出 `formal-passed`、`formal-failed`、`smoke-passed` 或 `smoke-failed`，不以 `formalGateEligible` 代替请求形状 | 正式形状即使 CPU/heap 红也只能是 `formal-failed`；1-case 为 `smoke-passed` |
| 双跑确定性 | 每 case 比较完整 Replay InputFrame、authority events、公开 snapshot projection hash、checkpoint state hash、final hash、result | 不把不同 input plan 误断言为 hash 相等；相同 case 才要求完全相等 |
| 事件/终局覆盖 | 每 case 保存 eventTypeCounts、按 tick 的 `spawnCountsByTick`、boundary snapshots；聚合硬门要求完整事件链、每 case `1200=3` 与 `2400=3` spawn、MatchEnded 和所有生命周期边界出现；active/world 仅要求不超过 3，全局另要求代表性 active=3 | smoke canonical 56、双跑 executed 112；扩展事件链与 terminal projection 五项全部为 true；**当时正式 300-case 尚未启动，后续正式结果见本台账最新覆盖节** |
| hash/计数口径 | `resultManifestHash` 只哈希有序 stable case results；`evidenceHash` 另哈希 manifest/definition/config/result manifest 与确定性 coverage 聚合；报告拆分 canonical/executed ticks/events | smoke evidence `7e52e9f9` ≠ result manifest `d0f3632d`；canonical `2500/56`，executed `5000/112` |
| terminal projection 硬门 | 新增 `terminalProjectionCoverage`，必须由规范 case 证明 1201=599、1799=1、1800 pending+not-ready+authorityTick=1800、1801 ready+pending empty、2401=599 | smoke 五项均 true；不再仅以 boundary tick 被记录替代语义断言 |
| 生命周期与边界 | 每场完整至 2500 tick；输入覆盖 1200/2400、599/600/601、抢夺、连续波次；pause 集合旋转覆盖 1199/1200/1201、1799/1800/1801、2399/2400/2401 与 null，并逐 case 记录暂停保留 tick/恢复 tick；结算后重复 destroy | 1-case smoke 完成全部边界采样、结算和重复 destroy，但其 caseIdentity 的 `pauseAtTick=null`、`maximumPauseSteps=0`，未执行暂停；pause case 仅由默认 manifest 构造与纯测试证明会覆盖，运行证据待正式矩阵或后续单独 pause smoke |
| 失败关闭 | 现有定向覆盖缺失/未来/篡改 projection、pending/world 冲突、未知 Definition、同 tick 修正重试；本批新增 future projection 与未知 Definition 测试 | 错误不得提交 Bot history/RNG/InputFrame；正式负向矩阵仍需在干净门禁复跑 |
| 资源/有限性 | 每 tick 检查有限数、runtime≤3、active supply≤3、event window≤10；记录 heap、CPU、trace/event 数 | smoke：runtime 3、active 3、event 6、heap +5,560,176 bytes/32MB；CPU 0.8172684ms/tick，仍超过 0.25 门 |

### 当前验证证据与阻断

| 门禁 | 结果 | 解释 |
|---|---|---|
| 修订后 typecheck / lint / docs / architecture / diff | `typecheck:app`、`npm run lint`、`check:documentation`、架构 39/39 与 `git diff --check` 均通过 | 本轮只运行指定定向门禁；仅包含本批允许文件 |
| Bot 定向 Node | 11/11 通过 | 覆盖既有投影/Composition/同 tick retry/确定性、输入顺序置换、future projection 与未知 Definition |
| runner 开发 smoke | 1/1 case 双跑；canonical 2500 tick/56 events，executed 5000 tick/112 events；InputFrame/event/public projection/checkpoint/final/result 一致；evidence `7e52e9f9` 与 result manifest `d0f3632d` 分层且不同；扩展 event coverage、terminal projection coverage 与全部 boundary ticks 通过；`status=smoke-passed`、`formalRequest=false`、`formalGatePassed=false` | 参数化 `caseCount=1/uniqueSeedCount=1/hardLimitTicks=2500`，不是正式 300-case 证据；独立 runner+Bot 定向测试 16/16 通过 |
| smoke CPU | 当前小规模 smoke 0.8172684ms/tick，超过 0.25ms | 作为红证据保留；未降低门槛。主协调独立的 0.7417632ms/tick 与此前污染窗口 2.2888232ms/tick 也继续保留，不能以清洁后自然下降推断正式门通过 |
| 正式 300/120 stress | **历史状态：当时未启动** | 只读预检发现 Runner PID 34548、booted CoreSimulator、Simulator PID 59698、Android/Gradle active build（PID 91476 约131.3% CPU，PID 32219 为 Flutter Android assemble），另有 Virtualization PID 69235 和 WebKit；按当时污染协议停止，不停止外部进程；后续已按本台账最新覆盖节完成正式运行 |
| 架构依赖 | 39/39 通过 | 本批只新增 scripts/test/package/ledger，依赖方向未变 |
| 完整 Node/Vitest/build/黄金 | 本轮按要求未运行，待干净窗口 | 不把此前小门结果冒充本批最终证据；普通 `a53b401d`、生存 `dd30e771` 不得改写 |

### 本小门评分（历史候选，已由正式 300/120 最新覆盖节取代）

| 维度 | 满分 | 当前得分 | 达成率 | 说明 |
|---|---:|---:|---:|---|
| 正式 300-case/seed 压力覆盖 | 25 | 0 | 0% | **当时**仅 1-case smoke，正式门因污染未启动；后续正式规模结果另行评分 |
| 双跑确定性、Replay/hash/trace | 25 | 22 | 88% | smoke 全 trace 比较通过，既有正式黄金未漂移；完整 300-case 缺失 |
| Bot/Core 边界与规则兼容 | 15 | 15 | 100% | runner 只调用 Composition；无权威生产文件改动 |
| 负向、原子失败、竞态与生命周期 | 15 | 14 | 93% | 11/11 定向覆盖；正式 300-case 仍未完成 |
| 性能与资源 | 10 | 4 | 40% | 资源通过，CPU smoke 超 0.25；无干净正式矩阵 |
| 治理、复现与证据 | 10 | 7 | 70% | 固定 manifest、runner 16/16、typecheck/lint/docs/architecture/diff 通过；完整门禁按要求未运行 |
| **合计** | **100** | **61** | **61%** | **低于总分≥90及各维≥80，保持 fail closed，不得签核** |

### 代码自检

- 健壮性：runner 固定 formal Definition、Profile Registry、arena、spawn specs 和 case manifest；未知 Profile/Definition、非法 projection 由正式 Composition/Bot validator 拒绝。所有 case 失败通过异常终止，不跳过或拼接结果。
- 竞态/重入：Bot 仍由 `LocalMatchSession.step()` 单入口驱动；同 tick 输入顺序置换由定向测试直接对正式 Core + BotController 验证；暂停时 step 不推进 tick，恢复后继续同一 tick。BotController 既有 `#creatingInput` 和连续 tick/eventSequence 防护未改变。
- 原子失败：future projection 和 namespace/缺 projection 失败后，定向测试比较 debug state，确认 history/RNG/lastCommand 未提交；同 tick 使用原快照重试成功。Composition 构造失败由既有资源清理路径处理。
- 兜底/fail-closed：异常、非有限数、runtime/active supply/event window 越界、Replay schema 非 V5、case 未结束或 trace 不一致均使 runner 失败；没有默认 fallback、静默跳过或失败 case 过滤。
- 文件内聚性：runner 仍是本小门唯一的正式执行入口；新增的状态分类、coverage 聚合和 hash 分层均为小型纯函数，直接消费本 runner 的报告类型，不引入第二套执行入口。若后续纯治理逻辑继续增长，将优先提取独立小模块，而不是继续扩张 CLI 文件。
- 边界：代码固定检查完整结算 tick、投影数量、event window，并通过正式 Composition 覆盖 1200/2400 与 599/600/601；+600 pending 不被作为交互物。未知 Definition 新测试确保 Composition 在 Core 创建前拒绝。
- 生命周期/资源：每 case 使用独立 Session，`finally` 中双次 destroy；smoke runtime/active/event/heap 均在上限内。Bot history 上限仍由 Profile 的 `observationDelayTicks + 2` 控制，未新增跨 match 缓存或 authority。
- 主流程阻断：正式 runner 不创建第二 Tick/事件/拾取写入者；Bot 只经 Session 产生 InputFrame。任何一个 case、双跑或 manifest 校验失败都会退出非零，因此不会生成部分通过报告。
- 确定性/Replay/hash：比较 InputFrame、事件、公开 snapshot projection、Replay checkpoint state hash、final hash 和 result；不改 Replay V5、既有 golden manifest 或 state hash 字段。不同 input plan 只用于行为矩阵，不要求错误的 hash 相等。
- 旧 1v1：本批未触碰普通 1v1 Core/Replay；普通黄金 `a53b401d` 作为后续干净门禁的零漂移控制。4 人和 Presentation 不在本门范围。

### 未完成、风险与回滚

- 未完成硬门：正式 300/120 双跑、干净 CPU/资源矩阵、完整 Node/Vitest/build、普通/生存黄金复验；coverage、Douyin/WeChat、Presentation、Platform、真机、前后台和 4 人 P2 继续红/未完成。runner 专项 16/16、Bot 定向 11/11、typecheck/lint/docs/architecture/diff 仅为修订后开发证据，不替代正式压力门。
- 性能风险：当前 smoke 的正式 `session.step()` CPU 为 0.8172684ms/tick，明显超过 0.25；主协调独立 0.7417632ms/tick 与此前污染窗口 2.2888232ms/tick 也保留。不能解释为通过，也不能以清洁后自然下降覆盖；正式矩阵须在污染解除后从零运行，任一红即停止。
- 环境风险：预检捕获到 Flutter Runner/booted Simulator/Android active build/Virtualization/WebKit，未停止外部进程；污染轮不会进入签核表。
- Replay/hash 风险：当前 runner 只比较已有 Replay V5 checkpoint/final hash，不新增 schema；manifest/trace identity 变化必须重新审计，不能更新黄金绕过漂移。
- 回滚：本批安全回滚点为 `2abd7f7`；仅撤回 `scripts/arena-formal-survival-bot-pressure.ts`、Bot 定向测试、package script 和本节台账，不触碰父提交中的 A1.1 或既有 P1 代码。

### 签核状态

**本节结论是正式压力尚未启动阶段的历史状态；当时因 CPU smoke 红而未签核。后续正式 300/120 已完成但 CPU formal gate 仍失败，详见“正式 300/120 最新覆盖与 D0–D7 性能结论”；P1 总体和 Presentation 均不得 advance。**

## P1 Bot pressure：正式 300/120 最新覆盖与 D0–D7 性能结论（2026-07-29，formal-failed）

本节覆盖上文正式压力候选中的“未启动/污染/smoke”过程状态；那些记录保留为历史，不再代表当前状态。当前正式运行已经完成，且没有因 CPU 红门补跑或拼接旧轮。

### 正式 300/120 运行

- 运行形状为 `300 cases / 120 unique seeds / 2500 hard-limit ticks`，每 case 双跑；`status=formal-failed`、`formalRequest=true`、`formalGateEligible=true`、`formalGatePassed=false`、`executionPassed=true`。
- `canonical/executed ticks=743427/1486854`，`canonical/executed events=22507/45014`；`unique final hashes=300/300`、`unique trace hashes=300/300`。
- CPU P95=`0.2550948ms/tick`、worst=`0.4697884ms/tick`，超过 `0.25ms/tick`；正式顶层没有可靠取得 P50/P99，禁止由 P95、worst 或其他样本推算 P50/P99。
- heap growth=`8780840/33554432 bytes`；峰值 `world/runtime/active/events=3/5/3/8`，对应上限 `3/5/3/10`；`pauseSteps=1`。
- 事件覆盖完整且计数已固定：`ActionStarted=7552`、`DownSmashLanded=324`、`EquipmentDespawned=112`、`EquipmentDropped=294`、`EquipmentExpired=240`、`EquipmentPickedUp=702`、`EquipmentRecycled=622`、`EquipmentReplaced=622`、`EquipmentSpawned=1800`、`HitResolved=1570`、`KnockbackApplied=1570`、`MatchEnded=300`、`MatchStarted=300`、`PlayerEliminated=3163`、`PlayerRespawned=3036`、`SuddenDeathStarted=300`。
- `EquipmentDespawned` 精确原因 `supply-lifecycle-expired-held-drop` 覆盖通过（112 次）；1200/2400 spawn、terminal coverage、active supply=3 代表性覆盖均通过。599/600/601 与 1200/1201、1799/1800/1801、2399/2400/2401 边界均覆盖；terminal projection 五项（1201 remaining=599、1799 remaining=1、1800 pending/not-ready、1801 ready、2401 remaining=599）均为 true。
- 当前正式身份：`manifest=6de153b1`、`definition=26a9eb8c`、`config=d1667e6f`、`evidence=d50cc8fd`、`resultManifest=065d94bb`。3 次独立 1-case warmup 不进入正式证据。

### 环境与历史状态覆盖

- 正式运行前按历史 5+5 同口径完成三次只读预检：无 Runner、booted simulator、`xcodebuild`、`ibtooll` 或 active build；Virtualization VM 三次为 `3.7%/2.6%/1.7%`，未触发阻断阈值；稳定 Codex/WindowServer 仅记录为 UI 基线，不降低产品 `0.25ms/tick` 门。
- 运行期间没有新污染；3 次 warmup 不入证据。此前 `0.8172684/0.7417632ms/tick` smoke、2.2888232ms/tick 污染窗口、早期 Runner/Simulator/构建污染和“正式 300 未启动”均保留为历史，不覆盖本次正式结果。

### D0–D7 只读/临时镜像最终结论

- D0–D6 的诊断、单项或结构候选均未写入仓库，结论均为 no-go；未恢复 B2、PublicActionRule cache、Bot direct projection 或 ActionResolver authority 优化。
- D7 仅在 `/private/tmp` 组合真实 `Core → MatchCore → Session` 的 A+B+C：同 snapshot 批量 affordance、public snapshot clone/freeze 单遍切口、immutable ActionDefinition→frozen PublicActionRule WeakMap。baseline/combo 前 20 做 ABBA×3，严格 evidence/trace/hash parity 与失败关闭矩阵通过，普通 1v1 snapshot/state/event hash parity 通过；临时负向矩阵 15/15 通过，accessor/Proxy getter 均为 0 次。
- D7 combo 前 20 六轮 Runner P95 为 `0.27149/0.25451/0.26801/0.25775/0.26219/0.25824ms/tick`，平均 `0.26203ms/tick`；process CPU 平均回收 `10.23μs/tick`，三组交错回收为 `11.05/9.29/10.34μs/tick`。未满足“每组三组稳定回收≥10μs且前20 P95≤0.24ms”的门槛，因此 D7 不落地、不建议无代码重跑，临时实现不计入当前生产 dirty。

### Formal pressure 评分（100 分，当前不可签核）

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| 正式规模与执行完整性 | 20 | 20 | 100% | 300/300 case、120/120 unique seed、双跑与 tick 规模真实完成 |
| 确定性、Replay/hash 与多样性 | 20 | 20 | 100% | canonical/executed 口径、300/300 final/trace hash 与双跑一致 |
| 事件、spawn、terminal 与 599/600/601 覆盖 | 20 | 20 | 100% | 完整事件链、精确 despawn reason、波次和 terminal projection 均通过 |
| 资源、边界与 fail-closed | 15 | 15 | 100% | world/runtime/active/events 与 heap 均在上限内，executionPassed=true |
| CPU 硬门 | 15 | 4 | 26.7% | P95 `0.2550948` 超 `0.25`；该维度低于 80% 硬门 |
| 治理、兼容与证据完整性 | 10 | 8 | 80% | 正式身份和历史覆盖完整；正式顶层 P50/P99 未可靠取得，不作推算 |
| **合计** | **100** | **87** | **87%** | **CPU 维度未达到各维≥80%硬门，formalGate=false；不得因总分接近评分线而签核** |

### 当前硬边界、回滚与提交状态

- P1 总体仍未完成、不得 advance；Presentation adapter、Platform、真机、4 人 P2 权威参与者、coverage、Douyin/WeChat 预算、前后台与发布证据继续红/未完成。
- 当前 HEAD/安全回滚点为 `d750e4caa767332b5c3caaf247080b5717d56219`。当前 dirty 候选不建议 commit/push；D0–D7 临时镜像没有进入当前工作树，也没有修改 Replay V5、state hash、事件 payload、正式资产或美术门。

## P1 性能整改：formal-survival-bot-session-performance-A0（已被独立审查驳回；正式门 fail closed）

### 阶段定位、基线、前置与范围

- 小门名：`formal-survival-bot-session-performance-A`；实现审计起始基线、当前实际父节点与安全回滚点均为 `2abd7f7`。本节是 pressure runner 之后的独立性能实现候选，不是正式 300-case 压力签核。
- 前置：`public-supply-projection-survival-bot-ready` 已提交为 `f80307b`，A1.1 同步已提交为 `2abd7f7`；Profile Registry、active lifecycle projection、正式 survival Composition、Replay V5/hash 合同与既有 Bot 压力 runner 已存在。
- 允许范围：MatchCore public snapshot 的同状态复用与递归深冻结；绑定具体 MatchCore 的不透明 trusted snapshot reader；LocalMatchSession 到本地 BotController 的同 Core 能力握手；Bot 内部 trusted observation 适配；formal survival Composition 注入 trusted Core；对应定向/回归测试与本节台账。
- 明确不做：不改 ActionResolver、InputFrame 字节/顺序、Replay V5、state-hash 字段/算法、Rule/Timeline/EquipmentSystem 语义、Presentation、Platform、正式资产；不降低 tick、动作、验证范围或 `0.25ms/tick` 门槛；不跑正式 300-case、完整回归、完整 build 或全量 golden。
- 2 人生产权威模型保持不变；4 人仍为 P2。Performance-A 只优化同一 Core/Session 的数据读取，不增加第二 tick、事件总线、拾取写入者或 authority。

### 实现与行为映射

| 要求 | 本批落点 | 证据/边界 |
|---|---|---|
| public snapshot 复用 | `MatchCore` 按具体实例缓存 `tick/eventSequence/phase` 对应的 public snapshot；同状态重复读取返回同一 identity，成功权威 step 后失效，destroy 清除 | 只缓存 public view，不缓存 internal snapshot/state hash；step 期间拒绝读取，暂停/ended 读取不返回陈旧状态 |
| 运行时不可变 | `freezeSnapshotData` 从严格 own data descriptor 递归冻结 public snapshot，拒绝 accessor、循环与不可验证结构；数组和嵌套 participant/equipment/projection 均冻结 | `Reflect.set`、数组/嵌套修改在测试中失败且不影响后续 tick/hash；缓存按 Core 实例隔离，无跨 match 共享 |
| 输入失败可恢复 | `step()` 在 `normalizeInputFrames` 成功后才使 public cache 失效；规范化失败不改变 authority 或缓存 | MatchCore invalid-input regression 证明同一缓存仍可读且下一次合法 step 可继续；内部异常仍按既有 fail-closed 清理 |
| trusted 能力来源 | `MatchCoreTrustedPublicSnapshotReader` 带 owner Core、WeakSet 能力身份和只读 `read()`；LocalMatchSession 只有 attach 返回 true 才启用 | cross-Core reader、普通 clone、伪造/拷贝 reader、destroy 后 reader 全部拒绝；不把任意全局 mark 函数暴露给调用者 |
| Bot fast path | `BotController` 仅在 formal composition 注入同一 Core 后走 trusted adapter；该 adapter 仍检查 tick/eventSequence、2 名参与者、survival projection、position 与 599/600/601 readiness | 外部 `createInput(snapshot)` 仍走原严格 raw/normalized audit；trusted 与 strict 同 seed/config 输入逐 tick 比较 InputFrame、事件、stateHash、debug snapshot |
| 普通 1v1 兼容 | 普通 `BotController` 无 trustedCore 时 attach 返回 false，`LocalMatchSession` 保留原 `getSnapshot → createInput` 严格路径 | 既有 quick-match/session/match-core 定向链通过；不注入 survival contract、不改变普通 1v1 内容或 hash |
| 生命周期/边界 | trusted 路径只消费 Core 已构造的 public projection，不重新计算 authority；覆盖 pickup/replacement/expiry 及 1201=599、1799=1、1800 pending/not-ready、1801 ready/empty | 不增加 remainingTicks 第二权威；同 Core trusted/strict 对照通过，+600 不生成 0-tick 可交互项 |

### 代码落点与文件边界

- 生产：`packages/arena-match/src/match-core.ts`、`packages/arena-match/src/index.ts`、`packages/arena-bot/src/bot-controller.ts`、`packages/arena-bot/src/bot-observation.ts`、`packages/arena-session/src/local-match-session.ts`、`packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`。
- 测试：`tests/arena/match-core.test.ts`、`tests/arena/bot-survival-composition.test.ts`；既有 `tests/arena/bot-survival-stress.test.ts` 继续验证 pressure runner 身份/分类/hash 分层。
- 本批未触碰美术文档、A0/A1 文件、Timeline、EquipmentSystem、ActionResolver、Replay 实现或 Platform。

### 当前验证证据与性能候选

| 门禁 | 结果 | 解释 |
|---|---|---|
| 受影响 Core/Session/Bot/Composition Node | 63/63 通过 | 覆盖 snapshot cache/deep-freeze、invalid-input recovery、destroy、trusted reader、cross-Core 拒绝、普通 1v1 生命周期与 survival 同 Core 对照 |
| runner + Bot + Core/Session 定向 Node | 68/68 通过 | 含 runner 专项 6 项新增治理断言、压力 runner smoke 双跑与完整受影响链 |
| `npm run typecheck:app` / `npm run lint` | 通过 | 修订后严格类型与 lint 均无错误 |
| 架构边界 | 39/39 通过 | 仍保持 Rule → Core → Bot → Session/Replay → Presentation 依赖方向；无第二 authority |
| 文档 / diff | 263 markdown、837 local links、55 documented commands；`git diff --check` 通过 | 本轮 ledger 更新前后均保持无格式错误；无美术文件计入 |
| `npm run build:packages` | 52 packages、11 waves 通过 | 作为候选实现的包级构建证据；未跑本批禁止的完整三端/全量 build |
| Replay / golden | 未在本批重跑全量 golden | 未修改 Replay V5/state-hash 合同；既有普通 `a53b401d`、生存 `dd30e771` 作为零漂移基线保留，正式签核前仍需独立复验 |
| 只读环境预检 | Runner 66475 约 18.8% CPU；SimRenderServer 59700 约 18.9%；SimMetalHost 59703 约 10.5%；Simulator 59698 约 2.6% | 未停止外部进程；该环境明确不是清洁性能签核环境 |
| Performance-A 1-case round 1 | `smoke-passed`，formal=false，formalGate=false；CPU `0.6683812ms/tick`，heap `5,853,928` bytes | 2500 canonical ticks、56 canonical events；仅功能 smoke |
| Performance-A 1-case round 2 | `smoke-passed`，formal=false，formalGate=false；CPU `0.6547600ms/tick`，heap `5,877,176` bytes | 每轮新 Node 进程，未拼接旧轮 |
| Performance-A 1-case round 3 | `smoke-passed`，formal=false，formalGate=false；CPU `0.6456924ms/tick`，heap `5,860,848` bytes | 三轮均明显超过 0.25，按要求停止扩展性能采样；不能解释为正式通过 |

三轮均报告 `canonicalTotalTicks=2500`、`canonicalTotalEvents=56`、`uniqueTraceHashes=1`、`uniqueFinalHashes=1`；由于每轮只有 1 case，这些是 smoke 完整性结果，不是 300-case 多样性证据。CPU 使用 runner 的 process CPU 口径，不以 wall time 替代；Runner/CoreSimulator 活跃使本轮只可作为污染环境候选红证据。此前 0.8172684、0.7417632 与污染窗口 2.2888232ms/tick 继续保留。

### 本小门评分（当前实现候选，不满足提交线）

| 维度 | 满分 | 得分 | 达成率 | 判断 |
|---|---:|---:|---:|---|
| public snapshot 正确性与深不可变 | 25 | 24 | 96% | cache key、递归冻结、destroy/step 失效和 invalid-input 恢复均有直接测试 |
| Core 绑定与 Bot fail-closed | 25 | 23 | 92% | WeakSet + owner handshake、cross-Core/clone/Proxy 边界通过；未覆盖正式 300-case |
| 确定性与兼容性 | 15 | 14 | 93% | trusted/strict InputFrame、事件、stateHash 对照通过；全量 golden 尚未重跑 |
| 原子性、竞态与生命周期 | 15 | 13 | 87% | 重入、destroy、暂停/恢复、expiry 边界与失败恢复通过；生产全长局资源证据未完成 |
| CPU 与资源证据 | 10 | 4 | 40% | 三轮 CPU 均超过 0.25，且环境污染；不建议签核/提交 |
| 测试与治理 | 10 | 8 | 80% | 68/68、39/39、typecheck/lint/docs/diff 通过；正式 stress/full golden/build 尚缺 |
| **合计** | **100** | **86** | **86%** | **低于总分 90；Performance-A 保持候选，formalGate=false，不得提交/不得 P1 advance** |

### 代码自审

- 健壮性：缓存只属于具体 `MatchCore`，key 包含 tick/eventSequence/phase；递归冻结拒绝 accessor/cycle，trusted reader 仅由同一 Core 产生，不能由结构相同对象或调用者伪造。
- 竞态/重入：`getSnapshot()` 在 `#stepping` 期间拒绝，LocalMatchSession 仍是单一 step 入口；BotController 原有 `#creatingInput`、连续 tick/eventSequence 和 destroy 防护未旁路。trusted attach 只能发生在构造阶段并验证 owner。
- 失败兜底/fail-closed：输入规范化失败发生在 cache invalidation 前；cross-Core、future/回退 sequence、缺 projection、错误 participant/position 等仍由 trusted adapter 或严格路径拒绝。内部 step 失败沿用 Session/Core 清理，不发布半快照。
- 边界：暂停/恢复/ended 重复读、destroy 后 reader、同状态 identity、成功 step 后 identity 变化、599/600/601、pickup/replacement/expiry、普通 1v1 均有定向证据；不把 +600 pending 当交互供给。
- 生命周期/资源：未引入跨 match 全局缓存；cache 与 reader 在 Core destroy 时失效；Bot history/RNG 提交逻辑未改变。1-case heap 约 5.85MB，仍须正式矩阵验证长期窗口。
- 主流程阻断：trusted path 不写 Core、不调用拾取/替换、不新增事件/输入；它只把已由同一 Core 生成的 public view 交给 Bot，Session 仍统一提交 InputFrame。
- 确定性/Replay/hash：同 Core trusted 与 strict 逐 tick 的 InputFrame、事件、stateHash、debug snapshot 一致；未改 Replay V5 字节/算法或 hash 字段。full golden 未重跑，所以不把本批写成 Replay 签核。
- 普通 1v1：普通 Controller attach 返回 false，继续严格外部 snapshot 路径；既有 quick-match/session/match-core 相关测试通过，未注入 survival Definition/Projection。
- 回滚：可整体撤回本批 MatchCore/Bot/Session/Composition 生产改动及其测试；不需 schema/replay migration，回到 `2abd7f7` 不会删除父提交 A1.1。

### 未完成、风险与签核状态

- 本小门未完成的硬门：清洁环境 CPU 复验、正式 300-case/至少 120 seed 双跑、完整 Node/Vitest、三端 build/产物预算、普通/生存 golden 复验、coverage、Douyin/WeChat、Presentation adapter、Platform、前后台/真机和 P1 总体 advance。
- 当前 CPU 三轮是在 Runner/CoreSimulator 活跃环境中取得，且仍为 1-case smoke；不得把 0.6456924 的最低值当作接近通过的依据，不得调阈值、缩负载或把 wall time 替代 CPU。
- 现有 pressure runner 的正式状态仍由请求形状与 hard gates 区分；`formalGate=false`。本 Performance-A 只改善 step 内重复 public snapshot/严格审计成本，不完成 Bot pressure 门。
- **A0 历史结论：`formal-survival-bot-session-performance-A` 实现候选评分 86/100，已被独立审查驳回；本行不代表当前状态。**

## P1 性能整改：formal-survival-bot-session-performance-A1（修订候选；正式门 fail closed）

### 阶段定位、基线与范围

- 本节是对上一节 A0 候选的独立审查修订，不是新的正式压力门，也不代表 P1 或 Presentation advance。实现审计起始基线、实际父节点与安全回滚点均为 `2abd7f7`；本工作区仍不提交、不推送。
- A0 记录保持为被驳回证据：评分 `86/100`，CPU 三轮为 `0.6683812 / 0.6547600 / 0.6456924ms/tick`，另有既往 `0.8172684`、`0.7417632` 与污染窗口 `2.2888232ms/tick`；拒绝原因是 Bot→MatchCore 具体依赖、trusted 结果未进入内部快路径、设备顺序不一致、合同绑定不足及生命周期握手清理证据不足。A0 不得被改写为通过。
- A1 只修正 Performance-A：Bot 不再 import/instanceof/持有 `MatchCore`；由 Composition/Session 建立同 Core、同正式 survival contract 的不透明 reader/binding；trusted source 进入 Bot 内部 WeakSet 快路径；trusted/strict 使用同一 `instanceId` 稳定排序；Session 构造失败按所有权顺序清理 Core/Bot/runner；public snapshot 只接受 plain object/array 的递归冻结数据。
- 明确不做：不进入 ActionResolver、Replay V5、InputFrame 语义、Rule/Timeline/EquipmentSystem、Presentation、Platform、资产或 300-case/full pressure；不降低 tick、动作、校验强度或 `0.25ms/tick` 门槛。普通 1v1 仍走严格 snapshot 路径，生存快路径只由正式 Composition 注入。

### 行为映射与实现落点

| 要求 | A1 落点 | 失败/兼容边界 |
|---|---|---|
| Bot 依赖方向 | `packages/arena-bot/src/bot-controller.ts` 只接收受限 `read()` port 与 opaque `trustedBinding`，不依赖 MatchCore/Session/Replay | `tests/architecture.test.ts` 直接扫描 `packages/arena-bot/src`；具体 Core 所有权只保留在 Match/Session 侧 WeakMap，不暴露 `owner` 字段 |
| trusted 快路径 | `createTrustedBotSourceSnapshot` 在完成同 Core public projection 校验后登记内部 WeakSet；`createBotObservation` 对可信对象不再进入完整 `normalizeSourceSnapshot` | 外部 `createInput`、普通 clone、Proxy/accessor、跨 Core reader 仍走严格路径或 fail closed；profile 未发现 command/delayed 路径的 normalizer 节点 |
| 稳定确定性 | `bot-observation.ts` 的 strict 与 trusted 共用 `compareVisibleEquipment(instanceId)`；trusted equipment 先排序再冻结 | 反序输入、多装备、同 seed/config 的 InputFrame/debug/RNG 对照通过；不改变事件、Replay 或 state hash |
| 合同绑定 | Composition 冻结正式 Definition/spawnSpecs，计算 `contractHash`；Core reader 绑定 `authorityContentHash`；Bot/Session 同时验证 opaque binding | 相似配置但跨 Core、错误 Definition/spawnSpecs、错误 contract、reader 替换均在 Bot history/RNG 提交前拒绝 |
| snapshot 生命周期 | MatchCore public cache 绑定实例、tick/eventSequence/phase；成功 step 后失效，invalid input 在失效前拒绝，destroy 后 reader/cache 不可读 | `freezeSnapshotData` 只接受 plain object/array，拒绝 Map/Set/Date/typed array、accessor、Symbol、真实循环；共享引用不误报循环 |
| Session 原子构造 | `LocalMatchSession` attach handshake 失败时按 runner→Bot→Core 清理，构造不发布半拥有实例 | attach 重入/替换、pause/resume/ended、destroy、无效输入身份继续由既有测试覆盖；普通 1v1 不注入 trusted binding |

### A1 文件边界

- 生产：`packages/arena-match/src/match-core.ts`、`packages/arena-match/src/index.ts`、`packages/arena-bot/src/bot-controller.ts`、`packages/arena-bot/src/bot-observation.ts`、`packages/arena-session/src/local-match-session.ts`、`packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`。
- 测试/治理：`tests/arena/match-core.test.ts`、`tests/arena/local-match-session.test.ts`、`tests/arena/bot-survival-composition.test.ts`、`tests/architecture.test.ts`、既有 `tests/arena/bot-survival-stress.test.ts` 与本台账；压力 runner/package script 仍是前置 pressure 候选的一部分。
- 未修改美术文档、A0/A1 美术文件、Timeline、EquipmentSystem、ActionResolver、Replay 实现、Presentation、Platform 或正式资产；当前工作区没有美术 dirty，本批不包含美术文件。

### A1 验证证据

| 门禁 | 结果 | 证据口径 |
|---|---|---|
| 受影响 Core/Session/Bot/Composition Node | `72/72` 通过 | 覆盖 public cache/deep-freeze、invalid-input 恢复、destroy、opaque reader/binding、跨 Core/clone/Proxy 拒绝、Session 构造清理、普通 1v1 与 survival trusted/strict 对照、反序多装备排序 |
| 架构边界 | `40/40` 通过 | 新增源文件扫描明确禁止 arena-bot 依赖 `MatchCore`、`arena-session`、`arena-replay` 或 Replay V5；仍保持 Rule→Core→Bot→Session/Replay→Presentation |
| workspace 包级刷新 | `52 packages / 11 waves` 通过 | 仅为当前工作区测试刷新包产物；不是完整应用/三端 build，正式候选仍需另行门禁 |
| `typecheck:app` / lint | 通过 | A1 代码及测试严格类型、lint 无错误；最终台账更新后再次复跑 |
| trusted path profile | `/private/tmp/arena-p1-performance-a1-profile` | 新 Node CPU profile 中 `normalizeSourceSnapshot` 未出现采样节点；`createTrustedBotSourceSnapshot` 命中 9、`createBotObservation` 命中 4。profile 不入 Git，只证明慢路径绕过证据，不等同 CPU 通过 |
| A1 CPU round 1 | `smoke-passed`，formalRequest=false/formalGate=false；`0.5350848ms/tick` | 新 Node 进程；1 case、1 seed、2500 canonical ticks、56 events、heap `5,543,080` bytes |
| A1 CPU round 2 | `smoke-passed`，formalRequest=false/formalGate=false；`0.6369048ms/tick` | 新 Node 进程；功能/资源摘要与首轮一致 |
| A1 CPU round 3 | `smoke-passed`，formalRequest=false/formalGate=false；`0.573974ms/tick` | 新 Node 进程；仍明显超过 `0.25ms/tick`，按要求停止，不拼接旧轮 |
| 只读环境证据 | 污染 | 复验时 Runner PID `82872` 约 `20.2%`、SimRenderServer `59700` 约 `13.6%`、SimMetalHost `59703` 约 `5.2%`、Simulator `59698` 约 `5.0%`；未停止外部进程 |

三轮均为 2500 canonical ticks / 56 canonical events / `uniqueTraceHashes=1` / `uniqueFinalHashes=1` 的 1-case 功能 smoke，不是 300-case、120-seed 或正式 CPU 证据。A1 不把污染环境下的数值解释为接近通过，也不以 wall time 替代 process CPU。

### A1 三轮代码自审

1. **架构与合同轮：通过。** 源扫描 `40/40` 证明 Bot 无具体 MatchCore/Session/Replay 依赖；reader owner 只在 Match 包内 WeakMap 保存，Composition/Session 验证同 Core 与 `authorityContentHash`，Bot 验证 `contractHash`。跨 Core、错误 binding、reader replacement 与外部 clone 均拒绝。
2. **确定性、原子性与生命周期轮：通过。** `72/72` 覆盖同状态 snapshot identity、成功 step 后失效、invalid input 不破坏恢复、递归冻结/真实循环、反序设备、599/600/601、destroy 与 Session handshake 清理；trusted/strict InputFrame、事件、stateHash/debug 对照一致。A1 未改 Replay V5、InputFrame 或权威写入。
3. **性能与治理轮：不通过正式门。** trusted profile 证明不再进入完整 normalizer，但三轮 1-case 仍为 `0.5350848/0.6369048/0.573974ms/tick`，全部高于 `0.25`，且 Runner/CoreSimulator 活跃；因此停止性能扩展，不进入 B/ActionResolver，不建议提交。

### A1 评分与状态

| 维度 | 满分 | 得分 | 判断 |
|---|---:|---:|---|
| 架构边界与依赖治理 | 25 | 24 | Bot 具体 Core 依赖已移除，源扫描通过 |
| trusted 合同、失败关闭与正确性 | 25 | 23 | binding/authority/contract 交叉验证与负向测试通过，正式长矩阵未完成 |
| 确定性与兼容性 | 15 | 14 | trusted/strict 对照通过，完整 golden 未重跑 |
| 原子性、竞态与生命周期 | 15 | 14 | attach 失败清理、cache 失效、destroy/边界通过；正式长局资源证据未完成 |
| CPU 与资源硬门 | 10 | 4 | 三轮均超过 `0.25ms/tick`，并处于污染环境 |
| 测试与治理证据 | 10 | 9 | `72/72`、`40/40`、profile、类型/lint 已有；完整门禁尚缺 |
| **合计** | **100** | **88** | **低于提交线 90；formalGate=false，不得提交、不建议 P1 advance** |

### A1 未完成项、风险与回滚

- 未完成硬门：清洁环境 CPU 三轮稳定复验、默认 300/300 且至少 120 unique seed、完整 Node/Vitest、普通/生存 golden、防漂移、coverage、三端 build/包体、Douyin/WeChat、Presentation、Platform、前后台/真机与 P1 总体 advance。
- 仍保留旧压力事实：旧 1v1/生存压力红证据及旧 A0 三轮不能从当前台账删除或拼入 A1；当前 1-case 也不能冒充正式门。
- 性能风险：trusted path 已移除已确认的重复 normalizer，但 `0.25ms/tick` 仍未达成；下一批应继续按分段 profile 处理，不得放宽预算、缩短 tick、减少动作或降低校验。
- 安全回滚：回到 `2abd7f7`，仅撤回 A1 的 MatchCore/Bot/Session/Composition 改动及对应测试；不触碰父提交中的 A1.1，也不回滚已签核的 `f80307b`。
- **当前结论：`formal-survival-bot-session-performance-A1` 为 88/100 修订候选，CPU 硬门红，formalGate=false；等待主协调独立审查。P1 总体、Presentation、Platform 均不得 advance。**

## P1 性能整改：formal-survival-bot-session-performance-A1.1（生命周期/合同修订候选；正式门 fail closed）

### 阶段定位、基线、范围与不做项

- A1.1 是 A1 的生命周期/合同修订小门，实际父节点与安全回滚点为 `2abd7f7`；不重新评估 A1 的 CPU，也不把 A1.1 标成 Performance-A 或 P1 签核。A0 的 86/100 与 A1 的 88/100 均作为历史审查结果保留。
- 本批修正：`LocalMatchSession` 构造成功前不接管调用方提供的 Core/Bot；trusted handshake 失败只销毁 Session 自己创建的 `HeadlessMatchRunner`（只断开其 Core 引用）；错误 `contractHash` 在 Bot 构造时拒绝，错误 `authorityContentHash` 在 Core reader 创建时拒绝；同一 binding 首次绑定后，其他 Core 不能取得其 trusted reader。
- 本批不做：不重跑 CPU、不实现 Performance-B、不改 ActionResolver、Replay V5、InputFrame、Rule/Timeline/EquipmentSystem、Presentation、Platform、压力规模或 `0.25ms/tick` 门槛；不跑 300-case/full/golden/全量 build。

### 行为映射与代码落点

| 要求 | A1.1 落点 | 证据与边界 |
|---|---|---|
| 构造 ownership | `packages/arena-session/src/local-match-session.ts` 的 handshake catch 只清理本 Session 创建的 runner；调用方 Core/Bot 留给外层 cleanup | 失败后 Core 仍可读、Bot destroy 次数为 0；调用方随后各 destroy 一次；成功构造后的 step 失败清理语义未改变 |
| binding 原子性 | `packages/arena-match/src/match-core.ts` 以 WeakMap 绑定 binding→具体 Core；`BotController` 校验 contract hash；Core 校验 authority content hash | 错误合同发生在 Bot 创建、Core state/hash、Bot history/RNG 之前；同 binding 跨 Core、reader 替换继续拒绝 |
| composition 边界 | `arena-v2-survival-supply-bot-composition.ts` 仍使用外层 `controller/core` nullable ownership；Session 失败后由 composition 清理各资源一次 | formal composition 的 factory 输入先经过严格可序列化校验，无法注入可计数函数来直接观察 handshake exact-once；因此本小门只把 Session port 的计数证据作为直接证据，composition exact-once 不宣称已有独立可观察证明 |
| 依赖/确定性 | reader 仍是 opaque `read()` port，Bot 不持有 MatchCore；A1 的 trusted WeakSet/稳定 equipment comparator 保持 | 不新增 authority、事件总线、第二 tick 或 Replay/hash 字段；普通 1v1 路径不变 |

### A1.1 验证证据

| 门禁 | 结果 | 实际证据 |
|---|---|---|
| 包级产物刷新 | `52 packages / 11 waves` 通过 | 仅用于让定向 Node 使用当前源代码包产物；不是完整应用/三端构建 |
| A1.1 受影响 Node + 架构 | `97/97` 通过，其中架构 `40/40` | 包含 MatchCore、LocalMatchSession、survival Composition trusted binding、普通 1v1 回归；新增调用方 ownership、错误 hash、跨 Core binding 与反序 trusted 对照 |
| `npm run typecheck:app` | exit 0 | 严格类型通过 |
| `npm run lint` | exit 0 | 无 lint 错误 |
| `npm run check:documentation` | passed | `263` Markdown、`837` 本地链接、`56` documented commands |
| `git diff --check` | exit 0 | 无空白错误 |
| CPU / Performance-B | 未运行 | 按本小门要求不重测；A1 的三轮 `0.5350848/0.6369048/0.573974ms/tick` 红证据保持不变，B 仍待只读诊断 |

### A1.1 代码自审

- 健壮性/失败关闭：构造 handshake 抛错时 runner 已断开引用，Core/Bot 仍由调用方持有；错误 contract/authority/hash 不会创建可用 trusted path，也不会写 Bot history/RNG 或 Core 状态。
- 竞态/重入：A1 原有 `attach` 不可替换、Session step 不可重入、Core stepping 期间禁止 snapshot 读取保持；binding WeakMap 只建立对象身份归属，不引入全局可伪造 mark。
- 原子性：Session 只有构造成功返回后才拥有 Core/Bot；失败构造没有可供调用方使用的 Session 实例。成功后的 step/整体 cleanup 继续由 Session 所有权路径处理。
- 生命周期：runner destroy 只清空其记录与 Core 引用；外层 composition 的 `controller/core` nullable cleanup 仍有效；Session 层计数测试证明 caller-owned Bot/Core 不被握手失败提前销毁。Composition factory 不允许注入可计数函数，exact-once 观察仍是明确风险而非通过项。
- 边界/兼容：错误 contract、错误 authority、同 binding 跨 Core、reader replacement、普通 1v1、pause/resume/ended/destroy 与 trusted 599/600/601 既有回归均通过；未改变 public snapshot、Replay V5、state hash 或 InputFrame。
- 主流程阻断：A1.1 不改变拾取、动作、事件或规则裁决；唯一新增阻断是错误 trusted 合同在 history/RNG 前 fail closed。

### A1.1 评分与状态

| 维度 | 满分 | 得分 | 判断 |
|---|---:|---:|---|
| ownership 架构与依赖边界 | 25 | 24 | 构造前不接管、runner 单独清理、Bot 依赖边界保持 |
| binding 合同与 fail-closed | 25 | 23 | contract/authority/跨 Core 负向证据通过 |
| 确定性与兼容性 | 15 | 15 | 未改 InputFrame、Replay V5、state hash，定向回归通过 |
| 原子性、竞态与生命周期 | 15 | 12 | Session 直接计数通过；composition exact-once 缺独立可注入观测 |
| 错误/边界测试 | 10 | 10 | 97/97 覆盖 handshake、destroy、pause/resume、trusted 边界 |
| 治理与证据完整性 | 10 | 8 | A1.1 已单列；CPU/B/full gate 明确保持未完成 |
| **合计** | **100** | **92** | **A1.1 修订候选可交主协调审查；不代表 Performance-A/P1 formalGate 通过** |

### A1.1 未完成项、回滚与后续

- 未完成：只读 Performance-B 分段诊断、清洁 CPU 复验、300/120 Bot pressure、完整回归/full build/golden、coverage、Presentation、Platform、真机与 P1 总体 advance。
- 回滚：回到 `2abd7f7`，撤回 A1.1 的 Session ownership、binding owner map、对应测试和台账段；不触碰父提交 A1.1 美术同步及已验收 `f80307b`。
- **当前结论：`formal-survival-bot-session-performance-A1.1` 评分 92/100，A1.1 仅作为生命周期/合同修订候选等待主协调验收；`formalGate=false`。A1 的 88 分、CPU 红证据和 A0 历史记录不变。**

## P1 性能整改：formal-survival-bot-session-performance-B1（一次性 InputFrame batch 候选；formalGate=false）

### 阶段定位、基线、范围与不做项

- 小门名：`formal-survival-bot-session-performance-B1`；实现审计起始基线、实际父节点与安全回滚点均为 `d750e4caa767332b5c3caaf247080b5717d56219`。本节只记录 B1 候选，不表示 B1 已签核、B2 已开始或 P1 advance。
- 前置：A1.1 生命周期/合同修订及 `formal survival Bot Composition` 已在父提交中；既有 Replay V5、checkpoint、state hash、public snapshot、599/600/601 和普通 1v1 兼容合同保持有效。
- 本批实现：Session 在玩家和 Bot 各自边界完成严格 InputFrame 规范化；MatchCore 生成绑定具体 Core、当前整数 tick 与 eventSequence 的 opaque batch；batch 精确绑定 participant 顺序、只允许一次消费；Runner 仅在 Core 成功后记录 Replay。
- 本批不做：不进入 B2 public snapshot/ActionAffordance 优化；不改 ActionResolver resolve 权威语义、Replay V5、InputFrame 字节/顺序、state hash、RNG/tick、Timeline、EquipmentSystem、Presentation、Platform、资产或正式 300-case/full regression/build。

### 行为映射与代码落点

| 要求 | B1 落点 | 证据与边界 |
|---|---|---|
| 严格输入边界 | `packages/arena-contracts/src/input-frame.ts` 为 strict normalizer 结果记录 WeakSet provenance；`LocalMatchSession` 先规范化 player，再验证 Bot 输出 | accessor/Proxy 原始输入不会进入 trusted batch；未知/错误 participant、非有限 movement、未规范化 frame 在权威变更前拒绝 |
| 同 Core/同 tick/eventSequence | `packages/arena-match/src/match-core.ts` 的 `createTrustedInputFrameBatch` 检查冻结 plain frame/array、精确字段、稳定 participant 顺序、当前 tick；WeakMap 记录 Core owner、eventSequence | 跨 Core、跨 tick、重复消费、错误顺序、缺失/重复、伪造 token、稀疏/额外/Symbol/accessor/Proxy frame fail closed；失败不改 Core |
| 一次性提交点 | `consumeTrustedInputFrameBatch` 在 `#runValidatedStep` 之前标记 consumed；Core 进入既有 `#stepNormalized` 后如发生异常销毁 Core | Core 异常不会产生半可用状态；Runner 不会在失败前写 inputFrames/events/checkpoints |
| Replay 原子记录 | `packages/arena-match/src/replay.ts` 新增内部 `stepTrustedInputFrameBatch`，Core 成功后读取已消费的只读 frame 并记录 | 失败注入测试证明 Runner Replay input/events 长度保持 0；正常 strict Runner 对照 inputFrames/events/checkpoints/finalHash/result 一致 |
| Session 接线 | `packages/arena-session/src/local-match-session.ts` 以 `core.config.participantIds` 生成稳定数组，再调用 Core batch/Runner trusted port | 普通 1v1 与正式 survival Composition 均走同一 B1 路径；公开 `HeadlessMatchRunner.step` 与 `MatchCore.step` 保持严格入口不变 |
| 架构隔离 | `tests/architecture.test.ts` 明确禁止 Bot 读取 batch port；依赖包集合与 Rule→Core→Bot→Session 方向不变 | 不新增事件总线、第二 tick、Manager 互持或 Bot→MatchCore 具体依赖 |

### B1 验证证据

| 门禁 | 结果 | 实际证据 |
|---|---|---|
| 包级刷新 | `52 packages / 11 waves` 通过 | `npm run build:packages`，仅刷新工作区包产物，不是完整应用/三端 build |
| B1 定向原子测试 | `5/5` 通过 | `tests/arena/trusted-input-batch.test.ts`：opaque/顺序/单次消费、跨 Core/过期/伪造、accessor/Proxy 零 getter、Core 异常 Replay 不增长、普通/生存逐 tick 对照 |
| 受影响 Node 回归 | `87/87` 通过 | B1 定向 + MatchCore + Replay + LocalMatchSession + survival timeline/composition；覆盖 pause/resume、ended、destroy、reentrant 的既有 Session 链 |
| Bot pressure/golden 定向 | `12/12` 通过 | `bot-survival-stress.test.ts` 与 `regression/golden-replay.test.ts`；普通 golden 及生存 golden 常量未改，Replay V5 篡改矩阵通过 |
| 架构边界 | `40/40` 通过 | 新增 source scan 禁止 arena-bot 接触 `createTrustedInputFrameBatch`/`stepTrustedInputFrameBatch`/opaque batch 类型 |
| 类型/lint/docs/diff | 全部通过 | `npm run typecheck:app` exit 0；`npm run lint` exit 0；文档检查 `263` Markdown/`837` local links/`57` commands；`git diff --check` exit 0 |

### B1 性能候选证据（污染环境，只能候选）

- 测量命令每轮均为新 Node 进程：`node --expose-gc --import tsx scripts/arena-formal-survival-bot-pressure.ts --matches=1 --seed-count=1 --hard-limit-ticks=2500`。Runner 现有 `process.cpuUsage` 计时包住 `session.step`，循环外 evidence/hash 不计入；每轮执行 canonical 2500 tick、双跑 5000 tick，未降低动作、审计或边界。
- 三轮结果：round 1 `0.5284944ms/tick`、round 2 `0.5356696ms/tick`、round 3 `0.523374ms/tick`；候选中位数 `0.5284944ms/tick`，候选最坏/P95（3 样本口径）`0.5356696ms/tick`，均高于 `0.25ms/tick`。三轮 `executionPassed=true`，但请求形状为 `1 case/1 seed`，`formalRequest=false`、`formalGateEligible=false`、`formalGatePassed=false`，状态均为 `smoke-passed`，不能冒充正式门。
- 三轮功能证据一致：manifest `9b350afb`、Definition `26a9eb8c`、config `b55acfab`、evidence `7e52e9f9`、result manifest `d0f3632d`；canonical/executed ticks `2500/5000`，events `56/112`；runtime 上限 `3`、active supply 上限 `3`、单 tick event 上限 `6`，spawn `1200/2400`、599/600/601 projection coverage、全部必达 event coverage 和 MatchEnded 均通过；heap growth 分别 `5,795,712`、`5,926,792`、`5,930,224` bytes，低于 `32MiB`。
- 污染证据：预检及轮间快照显示 Runner PID `82872` 约 `14.8–15.6%`，SimRenderServer `59700` 约 `7.0–18.0%`，SimMetalHost `59705/59703` 约 `5.5–6.4%/3.5–3.6%`，Simulator `59698` 约 `2.8–3.0%`，Flutter run `74437` 约 `1.1–10.6%`，Virtualization VM `69235` 约 `0.8–1.8%`；未停止任何外部进程。以上数值只保留为污染环境候选，不作为 CPU 签核证据。
- 与 A1 的旧候选不能做因果 before/after 结论：A1 的 `0.5350848/0.6369048/0.573974ms/tick` 也来自不同污染轮次；B1 只能报告当前路径功能不漂移及本轮候选值，不能声称已关闭 0.25 CPU 门。

### B1 三轮代码自审

1. **健壮性、合同与架构：通过。** Batch token 的权威数据不在可枚举对象中，而在 MatchCore 模块私有 WeakMap；来源 frame 必须是 contracts strict normalizer 产物，数组和字段均以 descriptor 检查，Bot 架构测试 `40/40` 通过。公开 strict API 未被弱化，Bot 未获得 Core/Session/Replay 依赖。
2. **竞态、原子性、失败兜底与生命周期：通过。** owner/tick/eventSequence 检查先于 consumed；失败 batch 不改状态且可继续使用 Core，成功消费后同 tick 重试拒绝，跨 Core/错序/缺帧/重复帧/Proxy/accessor 拒绝。Core 在 tick 内异常后 fail closed；Runner 只在 Core 成功后写 Replay；既有 `87/87` 覆盖 pause/resume、ended、destroy、reentrant、Session cleanup。B1 不新增跨线程状态，destroy 后 Core/Runner 均不可继续使用。
3. **确定性、性能与治理：功能通过，正式性能不通过。** 普通 1v1 与 survival 多 seed 的逐 tick public snapshot hash、InputFrame、events、checkpoints、finalHash/result 对照通过；固定 golden `12/12` 通过且常量未变。三轮 process CPU 均约 `0.52–0.54ms/tick`，所以不进入 B2，不建议以 B1 候选关闭 Performance/P1 硬门；300-case、full regression、full build、真机与 Platform 仍 fail closed。

### B1 评分与状态（100 分）

| 维度 | 满分 | 得分 | 判断 |
|---|---:|---:|---|
| 架构边界与依赖治理 | 25 | 24 | opaque port 与 Bot 禁止接触测试通过；仍需主协调独立审查 |
| 输入合同、fail-closed 与原子提交 | 25 | 23 | owner/tick/eventSequence/单次消费/错误清理有证据，完整长矩阵未完成 |
| Replay/hash 确定性与兼容 | 15 | 15 | 87/87、普通/生存 golden 定向通过，既有常量未改 |
| 竞态、生命周期与资源有界 | 15 | 14 | 失败、destroy、pause/resume、重入和 Replay 不增长通过 |
| CPU 性能硬门 | 10 | 4 | 三轮 `0.25ms/tick` 红，且环境污染；不作正式通过解释 |
| 测试与治理证据 | 10 | 9 | 5/5、87/87、40/40、类型/lint/docs/diff 全绿；full gate 未运行 |
| **合计** | **100** | **89** | **B1 候选；单项 CPU <80%、总分 <90，禁止提交建议，formalGate=false** |

### B1 未完成项、回滚与后续边界

- B1 未完成：清洁环境 CPU 复验、B2 public snapshot/ActionAffordance 优化、正式 300/300 且至少 120 unique seed、全量 Node/Vitest、三端 build/包体、coverage、Douyin/WeChat、Presentation、Platform、真机与 P1 总体 advance。
- B2 历史上曾在 B1 基础上形成独立候选：B1 的 batch port 与三轮 smoke 不作为 B2 snapshot/freeze/affordance 性能证据；B2 已因性能目标未达被拒绝并撤回，后续不得进入 ActionResolver 权威优化 C。
- 安全回滚点：`d750e4caa767332b5c3caaf247080b5717d56219`。仅撤回 B1 的 `arena-contracts` provenance、MatchCore/Runner/Session batch 接线、架构/定向测试及本节台账，即可恢复到本批父节点；不触碰已推送的 A0/A1、Profile/Projection、A1.1 或既有 P1 签核提交。
- **历史结论：`formal-survival-bot-session-performance-B1` 为 89/100 候选，CPU 单项红、formalGate=false；B2 不覆盖或改写 B1 证据。**

## P1 性能整改：formal-survival-bot-session-performance-C1（初版候选历史；C1.1 后撤回；formalGate=false）

### 阶段定位、基线、范围与不做项

- 小门名：`formal-survival-bot-session-performance-C1`；实现审计起始基线、实际父节点与安全回滚点均为 `d750e4caa767332b5c3caaf247080b5717d56219`。本节只保留 C1 初版增量的历史审查，不表示 B1/C1 已签核或 P1 advance；C1.1 复验失败后的当前工作树不含 C1 生产代码。
- 前置：`f80307b` 已提交生存 active lifecycle projection + formal Bot Composition，A1.1 同步父节点为 `2abd7f7`；B1 opaque InputFrame batch 已在当前工作树保留。普通 1v1、Replay V5、checkpoint、state hash、事件顺序和 `599/600/601` 合同均为既有前置。
- 本批实现（C1 初版，当前已撤回）：Timeline 内部以自身注册 Definition、规范化冻结 spawn specs 和自身 Equipment authority 生成共享 projection entries；MatchCore 通过结构合同接收由 Timeline 自己签发的 capability，并保存一个无参 `read()`。MatchCore 每次读取由闭包注入当前 tick、eventSequence、phase，Timeline 再验证当前 `nextTick` 与合法 phase；trusted 路径跳过调用方 equipment clone/consumer-side 全量 projection audit，但不接受调用方 equipment 数组作为事实。
- 本批不做：不改 `ActionResolver`/`ArenaRuleEngine` authority、不改 InputFrame、Replay V5、state hash 字段、RNG、tick、事件 payload、EquipmentSystem 写入者、Presentation/Renderer/Platform、阈值、checkpoint 频率、审计范围或压力规模；不跑 300-case、full regression、full app/三端 build。

### 行为映射与代码落点

| 要求 | C1 落点 | 证据与边界 |
|---|---|---|
| 独立依赖方向 | `packages/arena-match/src/match-core.ts` 不再 import `EquipmentSupplyTimelineSystem` 具体类，也不增加 `arena-match`→`arena-equipment` package dependency；仅消费 `MatchCoreEquipmentSupplyTimelineContract` 的结构方法 | `tests/architecture.test.ts` 40/40；arena-bot 与五个 Presentation package 均禁止 trusted supply port 名称 |
| capability provenance | Timeline 的 `createTrustedPublicSupplyProjectionReader` 只接受精确 contract hash；读函数闭包捕获 Timeline 私有字段，销毁后 `#assertUsable()` 失败；MatchCore 既有 binding owner map 继续绑定具体 Core 并验证 `authorityContentHash` | 不能靠具体类 cast 或公共 mark 函数伪造；Timeline 只验证 contract hash，authority hash 由 MatchCore 真实校验，职责不重复也不虚构 |
| 当前身份与同 tick | stored reader 对外只有 `read()`；MatchCore 每次调用注入冻结 `[tick,eventSequence,phase]`，Timeline 用描述符读取精确三元组、验证安全整数/phase、要求 `snapshotTick===timeline.nextTick` | 调用方无法传入旧 tick、未来 tick、错误 eventSequence 或 phase；状态身份不是枚举类型假证明 |
| 共享 projection core | `packages/arena-equipment/src/equipment-supply-timeline-system.ts` 的 `#buildProjectionEntries` 同时服务 public strict 与 trusted；trusted 只从 Timeline active lifecycle 调 `equipmentSystem.getSnapshot(instanceId)`，保留 Definition/spawn/lifecycle/position/world 状态校验和稳定排序 | public `getPublicSupplyProjection(options)` 原有 clone、未知字段、accessor/Proxy、双向审计和返回合同不降级；trusted 不读调用方 equipment |
| Composition contract | `packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts` 对已严格复制的 spawn specs 按 slotId 规范化，再用同一冻结数组计算 contract hash 并传 Core | 未规范化输入不会造成 trusted hash 分叉；不改变正式 Definition、位置或 supply identity |
| 普通 1v1 | 没有 EquipmentSupplyTimeline 的 Core 不创建 trusted port，原 `getSnapshot`/strict path 不变 | B1 普通 1v1 对照与 MatchCore 定向测试通过；无普通 1v1 新字段或 hash 迁移 |

### C1 原子性、边界与回滚

- 创建顺序是：MatchCore 先验证 binding owner 与真实 authority content hash，再以结构方法取得 Timeline candidate，检查 candidate 的 data `read` 方法，最后才登记 binding owner 和本地 reader。工厂失败不会留下新的 binding owner 或半初始化 C1 reader；已有合法 reader 在同 binding 的重试中不被替换。
- trusted 读取顺序是：Timeline 可用性检查 → MatchCore 注入当前状态三元组 → Timeline 精确数组字段/descriptor/安全 tick/phase 校验 → `nextTick` 校验 → Timeline snapshot 与 active lifecycle → Equipment authority runtime → 共享身份与 world/pending 校验 → 只读冻结 projection。任何失败发生在 public snapshot 发布前，不写 Equipment、Match、Bot history、RNG 或 Replay。
- 覆盖与保持：空供给、首波/后续波、`+599/+600/+601`、pending/not-ready、held/recycled、同 Core/cross Core、binding contract/authority hash 错误、destroy、普通 1v1、trusted/strict deepEqual。`+600` 仍是 expire-before-pickup 的 pending command view，不产生 `remainingTicks=0` 交互项；`+601` ready 且 pending 为空。
- 精确回滚：从当前工作树撤回 C1 的 Timeline shared/trusted projection、MatchCore structural wrapper、survival Bot Composition 规范化和 C1 测试/架构/台账段，保留 B1 的 contracts/MatchCore/Runner/Session batch 改动，即回到 B1 候选状态；不触碰已推送 `2abd7f7`、`f80307b` 或美术文件。

### C1 验证证据

| 门禁 | 结果 | 实际证据 |
|---|---|---|
| Timeline 定向 | `11/11` 通过 | `node --import tsx --test tests/arena/equipment-supply-timeline.test.ts`；public/trusted parity、599/600/601、descriptor/accessor、stale tick、destroy、资源边界均覆盖 |
| Survival/Composition 定向 | `23/23` 通过 | `node --import tsx --test tests/arena/match-core-survival-supply.test.ts tests/arena/bot-survival-composition.test.ts`；trusted/strict snapshot deepEqual、Bot InputFrame、binding/cross-Core、Replay/checkpoint、projection boundary 均通过 |
| MatchCore/Replay/B1 受影响链 | `42/42` 通过 | `node --import tsx --test tests/arena/match-core.test.ts tests/arena/replay.test.ts tests/arena/trusted-input-batch.test.ts`；普通 1v1、Replay V5、B1 batch 与失败原子性未漂移 |
| 黄金 Replay | 普通 `4/4`、生存 `1/1` | 普通 manifest `a53b401d`（`c9cd7e73/33a33688/389b7142/e560dd88`）与生存 manifest `dd30e771`（`d460b945`）保持原值 |
| 架构 | `40/40` 通过 | `node --import tsx --test tests/architecture.test.ts`；新增 Bot/Presentation 禁止 trusted supply API，MatchCore 不含具体 Timeline import |
| 包构建/类型/lint/docs/diff | 全部通过 | `npm run build:packages` 为 `52 packages/11 waves`；`npm run typecheck:app`、`npm run lint`、`npm run check:documentation`、`git diff --check` 均 exit 0 |

### C1 候选性能证据（污染环境，不是正式门）

- 测量沿用 C0 的 `/private/tmp/arena-p1-c0-diagnostic.mts`，每轮新 Node 进程，3×1300 tick warmup 后 1×2500 tick survival sample；`process.cpuUsage` 包含正式 `LocalMatchSession.step`，循环外 hash/evidence 不计入。三轮 survival CPU/tick 为 `0.325554/0.289384/0.300788ms`，均值 `0.305242ms/tick`，仍高于 `0.25ms/tick`，所以 formalGate=false。
- C0 对照三轮为 `0.332616/0.338874/0.324254ms/tick`，均值约 `0.331915ms/tick`；C1 候选均值回收约 `26.7μs/tick`，超过本小门约 `10μs` 保留线，但不能把候选改善当成正式 CPU 通过。
- C1 正式 survival 统计中 `EquipmentSupplyTimelineSystem.getPublicSupplyProjection` 调用为 0；Timeline `getSnapshot` 仍只从自身 active state 读取，约 `0.535–0.742μs/call`。这证明切口避开了 C0 的 public strict projection 重复入口；不证明整个 Session 已达到 0.25 门。
- 同轮 ordinary public CPU 为 `0.211824/0.229940/0.214638ms/tick`，未见 1v1 回归。环境快照仍有 WebKit 约 `115%`、Runner 约 `15%`、SimRenderServer 约 `16%`、SimMetalHost 约 `5%`、Simulator 约 `3%` 等外部负载，未停止任何外部进程；三轮只计候选，不能拼接旧轮充正式 5 轮。

### C1 代码自审与评分（100 分）

1. **健壮性、依赖与 fail-closed：通过。** 具体类 import/cast 已撤回；MatchCore 只依赖结构合同，Timeline capability 自带私有实例闭包；binding、descriptor、精确 state tuple、safe tick、phase、nextTick、destroy 均有定向证据。公开 strict API 仍保留原 clone/audit。
2. **竞态、原子性与生命周期：通过。** reader 只读且无写入口；binding 登记在 candidate/read 合同成功后；step 前后 public cache 仍按 tick/eventSequence/phase 失效；trusted 读取异常不触发 authority 写入，destroy 后拒绝，跨 Core 由既有 owner map 拒绝。
3. **确定性、兼容与资源：通过。** trusted/strict InputFrame、事件、public snapshot、state hash、Replay/checkpoint 对照和普通/生存 golden 通过；共享 builder 无第二 lifecycle authority、无缓存未来状态、无无界 reader 集合；B1 的 single-consumer/Replay-after-Core-success 仍由 42/42 覆盖。
4. **性能：候选通过、正式门失败。** 三轮均未达到 0.25，但 trusted projection 自身重复 public strict 入口已消失，候选均值改善约 26.7μs；因此保留 C1 候选等待主协调审查，不宣称 CPU 或 P1 advance。

| 维度 | 满分 | 得分 | 判断 |
|---|---:|---:|---|
| capability 架构与依赖治理 | 25 | 24 | 96%；结构注入、Bot/Presentation 隔离、无具体类 cast |
| projection 合同与 fail-closed | 25 | 24 | 96%；public strict/trusted parity、身份与 accessor 边界通过 |
| Replay/hash/普通 1v1 兼容 | 15 | 15 | 100%；黄金 manifest 未漂移，42/42 受影响链通过 |
| 生命周期、竞态与资源边界 | 15 | 14 | 93%；destroy、stale state、跨 Core、无第二 authority 通过 |
| 性能候选证据 | 10 | 8 | 80%；projection 切口有下降，但正式 0.25 门仍红且环境污染 |
| 测试与治理 | 10 | 9 | 90%；定向/架构/类型/lint/docs/diff/build 通过，full gate 未跑 |
| **合计** | **100** | **94** | **C1 候选；达到候选评分线但 formalGate=false，不建议提交或 P1 advance** |

### C1 未完成与后续硬门

- 未完成：清洁隔离环境下正式性能复验、完整 300/300 case 且至少 120 unique seed Bot pressure、完整 Node/Vitest、coverage、Douyin/WeChat 预算、Presentation adapter、Platform、真机、4 人 P2 与 P1 总体 advance。
- C1 没有修改 Replay V5/state hash 合同，黄金证据只证明当前常量不漂移；不把定向 42/42 或三轮污染 CPU 候选扩写成 P1 完成。
- 当前签核：C1 初版 `94/100` 与 C1.1 `87/100` 均为历史候选，未由主协调签核、未提交且已撤回；B1 的 `89/100` 候选、B2 的 `83/100` 已拒绝撤回历史和所有 P1 红门继续保留。

## P1 性能整改：formal-survival-bot-session-performance-C1.1（功能候选、性能失败、已精确撤回；formalGate=false）

### C1.1 范围、修订映射与结果

- 实现审计起始基线、实际父节点与安全回滚点为 `d750e4caa767332b5c3caaf247080b5717d56219`；C1.1 只修订 C1 trusted supply projection read port，不进入 ActionResolver authority，不触碰 B1 以外的其他性能热点、Presentation、Platform 或美术文件。
- 修订内容：Timeline 曾以唯一 `#createProjectionCandidate` 组装 public/trusted root；trusted binding 曾收敛为 Timeline-only `contractHash`，read state 曾收敛为 `[snapshotTick,eventSequence]`；EquipmentSupplyAuthority 曾增加同一 RuleEngine authority 闭包提供的 `listSnapshots()`，trusted read 对全量 runtime 做 duplicate/非法 location/rogue world/stale world 与 expected active world 集合校验；MatchCore 先验证 `authorityContentHash`，再以安全数据描述符传递冻结 `{contractHash}`。
- 功能复验在撤回前通过：受影响 Node `69/69`、架构 `40/40`、`build:packages 52/11`、`typecheck:app`、lint、文档检查、diff-check，以及普通黄金 `a53b401d`、生存黄金 `dd30e771` 均保持原值。Timeline 新增的 rogue/stale/duplicate/非法 runtime/accessor 负向测试均通过。
- C1.1 生产净行数（相对 B1、撤回前实际 diff）：Timeline `297 insertions / 83 deletions = +214`；MatchCore 的 C1 专属 hunk 由前后差分得到 `110 / 6 = +104`；survival Bot Composition `9 / 3 = +6`；合计 `+324` 行生产净增。回滚后这些 C1/C1.1 生产 hunk 均不在工作树，MatchCore 只剩 B1 `+281/-28` 差分。

### C1.1 性能候选与回滚判定

- 同一 C0 口径、每轮新 Node、3 轮 warmup、每进程 1 个 2500-tick survival sample 的新候选为：round 1 `0.3759544ms/tick`，round 2 `0.3506964ms/tick`，round 3 `0.3267644ms/tick`；均值 `0.3511384ms/tick`。
- C0 参考三轮为 `0.332616/0.338874/0.324254ms/tick`，均值约 `0.331915ms/tick`。C1.1 没有达到约 `15μs/tick` 回收线，且均值高于参考；按小门约定执行 C1/C1.1 精确回滚，不把污染状态下的结果修饰为通过。`ps aux` 被宿主拒绝，外部污染无法重新判定；未停止任何外部进程。
- 回滚后确认：相对 `d750e4c` 不再有 `arena-equipment` Timeline、survival Composition、C1 专属测试或 C1 专属架构 hunk；保留 B1 contracts/MatchCore/Runner/Session batch、A1 基线测试补正和本台账历史。C1/C1.1 不提交、不推送，当前 formalGate=false。

### C1.1 自审与评分（历史候选，不具备提交资格）

| 维度 | 满分 | 得分 | 判断 |
|---|---:|---:|---|
| projection 合同与单一语义 | 25 | 24 | public/trusted 共用 candidate，599/600/601 与 parity 通过；仅为撤回候选 |
| 全量 authority 校验与 fail-closed | 25 | 23 | rogue/stale/duplicate/非法 runtime/accessor 通过；未进入当前交付 |
| Replay/hash/普通 1v1 兼容 | 15 | 15 | 黄金 manifest 与受影响链未漂移 |
| 生命周期、竞态与资源 | 15 | 14 | destroy、stale tick、pending、跨 Core 与无写入路径通过 |
| 性能保留线 | 10 | 2 | 三轮均值未回收约 15μs，且高于 C0 参考 |
| 测试与治理 | 10 | 9 | 功能/架构/type/lint/docs/build/diff 通过；性能门失败 |
| **合计** | **100** | **87** | **性能维度低于 80%，不得提交、不得签核、不得 P1 advance** |

### C1.1 后续边界

- C1/C1.1 不改变 Replay V5、state hash、事件顺序、tick、审计阈值或普通 1v1；其功能证据只作为失败候选历史，不代表当前 B1 工作树已接入 trusted supply port。
- 当前仍未完成：B1 清洁性能复验、正式 300/300 且至少 120 unique seed Bot pressure、coverage、Douyin/WeChat 预算、Presentation adapter、Platform、真机、4 人 P2 与 P1 总体 advance。若再次开启 C1，必须以 B1 为基线重新提出更小的切口与独立性能证据。

## P1 性能整改历史：formal-survival-bot-session-performance-B2（已实现、自动化绿、性能失败、已拒绝并撤回；formalGate=false）

### 阶段定位、基线、范围与不做项

- 小门名：`formal-survival-bot-session-performance-B2`；实现审计起始基线、实际父节点与安全回滚点均为 `d750e4caa767332b5c3caaf247080b5717d56219`。本节保留 B2 的历史实现、自动化证据与拒绝记录；主协调因性能未达目标拒绝 B2，且 B2 生产代码与专属测试已从当前工作树撤回，不表示 B1 已单独签核或 P1 advance。
- 前置：B1 opaque/tick/eventSequence/一次性 InputFrame batch 与 A1.1 ownership/binding 合同均保留；普通 1v1、生存 Composition、Replay V5、checkpoint、state hash 和 `599/600/601` 合同继续有效。
- 历史实现（当前已撤回）：`MatchCore.#createSnapshot(false)` 曾在构造阶段冻结参与者、装备、向量、数组和根 plain data；地图、active supply projection、ActionAffordance 和 timeline result 曾通过私有 WeakSet 做严格一次性深冻结证明；`ArenaRuleEngine` 曾缓存不可变 PublicActionRule 的只读投影。当前工作树恢复为 B1 的 `freezeSnapshotData` 事后整树冻结路径，B2 的 RuleEngine 缓存不再存在。
- 本批不做：不改 ActionResolver 的 authority resolve/candidate 顺序，不改 Timeline、EquipmentSystem、MatchCore step 规则、InputFrame、Replay V5、state hash 字段、RNG、供给生命周期/事件语义或 Presentation/Platform；不跑 300-case、full regression、full app/三端 build，不进入性能优化 C。

### 静态热点映射与文件边界

| public snapshot 分段 | 当前落点 | B2 处理 | 语义边界 |
|---|---|---|---|
| timeline/equipment snapshot 与 public supply projection | `packages/arena-match/src/match-core.ts` `#createSnapshot` | projection 保持由 Timeline 产生；对其 plain-data 结果做私有深冻结证明，未创建第二 authority | tick/eventSequence、正式 Definition、pending/ready 与供给身份不变 |
| participants/actionRule/movement | `packages/arena-match/src/match-core.ts`；`packages/arena-core/src/arena-rule-engine.ts` | participants/动作/移动节点在构造时冻结；PublicActionRule 按不可变 action Definition ID 缓存 | action rule 字段、participant 顺序、movement 值不变；普通 1v1 继续同一规则路径 |
| ActionAffordance | `packages/arena-match/src/match-core.ts`；`packages/arena-core/src/action-affordance.ts` 未改 | 不改 projector/resolver；继续使用既有四路 probe，严格证明其已冻结结果并复用同 identity | candidate 顺序、reason/source/lane/channel、next-tick 语义不变 |
| equipment/map | `packages/arena-match/src/match-core.ts`；Map serializer 未改 | 装备节点及向量构造时冻结；地图 public snapshot 不再 shallow clone 后等待整树 freeze，而是验证已冻结 plain data 并复用 | Map/Set/Date/typed array、accessor、Symbol、循环均 fail closed |
| 事后整树 freeze | 原 `freezeSnapshotData` public 调用点 | 已移除；由 `freezeSnapshotNode` 与 `proveDeepFrozenSnapshotData` 在构造边界完成 | 内部 checkpoint 仍保留原 clone 路径，不缓存 internal snapshot/state hash |

历史实现文件：`packages/arena-match/src/match-core.ts`、`packages/arena-core/src/arena-rule-engine.ts`；历史专属测试为 `tests/arena/match-core.test.ts`、`tests/arena/match-core-movement.test.ts`。当前工作树仅保留 B1 的 `arena-contracts`、MatchCore/Replay/Session、架构测试、trusted batch 测试及本台账；B2 生产代码和 B2 专属测试已撤回，未修改美术文件，当前没有美术 dirty。

### 构造时深冻结合同

- `PROVEN_DEEP_FROZEN_SNAPSHOT_NODES` 是 `match-core.ts` 模块私有 WeakSet；外部不能通过结构造值或公开函数伪造 provenance。`proveDeepFrozenSnapshotData` 只有在对象已经 frozen、原型为 `Object.prototype`/`null` 或 `Array.prototype`、own key 精确、数组 length/索引完整、字段均为 enumerable data descriptor、子树通过同一证明且无真实环引用后才登记。
- `freezeSnapshotNode` 只接受已证明的对象子节点，构造时 `Object.freeze` 并登记；因此 shared reference 会因 visited/marker 复用而通过，真实 cycle 会在 active WeakSet 中拒绝。Map/Set/Date/typed array/accessor/Symbol/sparse array/extra field 不会进入 public snapshot。
- public `getSnapshot()` 仍只缓存当前 MatchCore 的 `(tick,eventSequence,phase)`；成功 step 清除，destroy 清除，step 中读取继续拒绝。重复读取返回同一 frozen identity，成功 step 后 identity 变化。此批未缓存 internal snapshot，不把 public cache 写回 authority。
- `ArenaRuleEngine.#publicActionRuleCache` 的 key 是 immutable Definition ID，销毁时清空；它只复用 read-only projection，不缓存 action execution、resolve 结果、RNG 或 hash 输入。

### 验证证据

| 门禁 | 结果 | 实际命令/证据 |
|---|---|---|
| public snapshot/受影响 Core | `39/39` 通过 | `node --import tsx --test tests/arena/match-core.test.ts tests/arena/match-core-movement.test.ts tests/arena/match-core-equipment.test.ts`；含同状态 identity、全树冻结、Reflect.set 失败、成功 step 失效、state hash 不变 |
| survival/Session/Bot/B1/golden 链 | `86/86` 通过 | 最终合并定向命令覆盖 `match-core.test.ts`、movement/equipment、trusted batch、LocalMatchSession、survival supply、Bot pressure 与 golden replay；golden manifest/常量未改 |
| 架构 | `40/40` 通过 | `node --import tsx --test tests/architecture.test.ts`；未增加 Core→ActionResolver 旁路或 Bot 越层依赖 |
| workspace 包级构建 | `52 packages / 11 waves` 通过 | `npm run build:packages`；只刷新包产物，未跑完整应用/三端 build |
| 严格类型 / lint | 通过 | `npm run typecheck:app`、`npm run lint` 均 exit 0 |
| 文档 / diff | 通过 | `npm run check:documentation`：263 Markdown、837 local links、57 documented commands；`git diff --check` exit 0 |
| 300/full/coverage/三端 | 未运行 | 按本小门边界保留未完成，不得把 B2 候选当作正式 pressure 或 P1 全门 |

### B2 性能与资源候选证据（污染环境，不是签核证据）

- 候选命令每轮为新 Node 进程：`node --expose-gc --import tsx scripts/arena-formal-survival-bot-pressure.ts --matches=1 --seed-count=1 --hard-limit-ticks=2500`。三轮均为 1 case/1 seed、2500 canonical ticks/5000 executed ticks；requested/actual 规模均如实保留，`formalRequest=false`、`formalGateEligible=false`、`formalGatePassed=false`、status=`smoke-passed`。
- B2 新三轮 CPU：round 1 `0.5989584ms/tick`、round 2 `0.5555628ms/tick`、round 3 `0.5462892ms/tick`；三轮均超过 `0.25ms/tick`，因此 Performance-B formal gate 红，不建议提交或 advance。heap growth 分别 `8,051,440`、`7,936,400`、`6,076,192` bytes，均低于 32MiB；runtime≤3、active supply≤3、max events/tick=6，功能事件/1200/2400/599/600/601/MatchEnded 均通过。
- 只读重分段脚本 `/private/tmp/arena-p1-performance-b-diagnostic.mts` 在当前 B2 包产物上运行：formal Session 2500 ticks CPU `1194.576ms`（约 `0.4778304ms/tick`）；`getSnapshot` 5000 reads CPU `582.357ms`（约 `0.1164714ms/read`）；trusted Bot source CPU `56.202ms`（约 `0.0224808ms/tick`）；heap delta `45,379,080` bytes，GC 0。该脚本的旧 `HeadlessMatchRunner.step`/public `MatchCore.step` wrapper 在 B1 trusted batch 后为 0 calls，不能作为正式分段结论；不把循环外 hash 计入 session step。
- 候选前后只读进程快照显示 Simulator PID `59698` 约 `3.0%`、SimRenderServer `59700` 约 `12.4%`、SimMetalHost `59703` 约 `10.7%`/`59705` 约 `2.6%`、backboardd `59736` 约 `8.6%`；未启动或停止任何外部进程。故以上三轮只是污染环境候选，不能外推清洁环境结果；同时 CPU 已明确高于门槛，不能假定自然降至 0.25。
- 功能结果的可审计身份未漂移：正式 runner smoke 仍为 definition `26a9eb8c`、config `b55acfab`、manifest `9b350afb`、evidence `7e52e9f9`、result manifest `d0f3632d`；canonical events=56、executed events=112，trace/final hash 保持单 case 稳定。普通 golden `a53b401d`、生存 golden `dd30e771` 的既有值未修改；B2 未更新黄金绕过差异。

### B2 三轮代码自审

1. **健壮性/失败关闭轮：通过。** 代码位置为 `match-core.ts` 的 `readSnapshotDataEntries`、`proveDeepFrozenSnapshotData`、`freezeSnapshotNode`；39/39 中直接遍历 public snapshot 并验证 plain object/array、frozen、无 Symbol/访问器/稀疏/循环。Map/Set/Date/typed array 不满足原型合同；真正 cycle 通过 active WeakSet 拒绝，shared reference 不误报。内部 snapshot 仍使用原 clone，不把未证明对象发布到 public root。
2. **竞态/生命周期/确定性轮：通过。** `getSnapshot` 仍在 `#stepping` 期间拒绝，cache 仅绑定本 MatchCore 的 tick/eventSequence/phase；`#runValidatedStep` 和 destroy 的 cache 清理未旁路。39/39 与最终 86/86 证明成功 step 后 identity、pause/resume/ended/destroy、supply 599/600/601、普通 1v1、InputFrame/events/checkpoint/finalHash 均未漂移；PublicActionRule cache 在 destroy 清空，未跨 match 泄漏。
3. **性能/边界/治理轮：不通过正式门。** B2 目标 snapshot candidate ≤0.07ms/read、combined session ≤0.25ms/tick；实测分段约 0.116ms/read、formal runner 三轮 0.546–0.599ms/tick，故 CPU 维度 fail closed。没有降低 tick、动作、审计、checkpoint、seed 或阈值，也没有进入 ActionResolver authority 优化 C；300/full/coverage/Platform/Presentation/真机继续未完成。

### B2 评分与状态（100 分）

| 维度 | 满分 | 得分 | 判断 |
|---|---:|---:|---|
| public snapshot 正确性与深不可变 | 25 | 24 | 构造时冻结、私有证明、identity/cache、Map/Set/accessor/cycle 边界均有直接测试 |
| 性能实现与热点收益 | 25 | 18 | 去除 public 末尾整树 freeze、复用只读节点并缓存 PublicActionRule，但 snapshot/session 仍高于目标，低于 80% |
| 确定性与兼容性 | 15 | 15 | 86/86、golden 常量、InputFrame/events/hash 对照通过，未改 Replay V5/state hash 字段 |
| 原子性、竞态与生命周期 | 15 | 14 | stepping/destroy/cache 失效、暂停/结束与失败边界通过；正式长矩阵仍未完成 |
| CPU 与资源硬门 | 10 | 3 | 三轮 CPU `0.546–0.599ms/tick` 红；heap 有界但不能抵消 CPU 红门 |
| 测试与治理证据 | 10 | 9 | 定向、架构、类型、lint、文档、包构建、diff 全绿；300/full/coverage/三端未运行 |
| **合计** | **100** | **83** | **低于总分 90，且性能维度低于 80；B2 仅候选，formalGate=false，不建议提交** |

### B2 未完成项、风险、回滚与后续边界

- B2 未完成硬门：清洁环境 CPU 复验、snapshot≤0.07/combined≤0.25 稳定证明、正式 300/300 且至少 120 unique seed 双跑、完整 Node/Vitest/coverage、三端/包体、Douyin/WeChat、Presentation adapter、Platform、前后台/真机与 P1 总体 advance。
- 旧 A0/A1/A1.1/B1 CPU 红证据继续保留；B2 三轮污染候选不得与旧轮拼接为 5 轮，也不得以“环境污染”豁免 0.25 门。旧 `arena:stress` CPU 事实和其它 P1 红门不改绿。
- 性能风险：B1 trusted batch 使 formal Session 不再经过公开 `HeadlessMatchRunner.step`/`MatchCore.step`，旧 wrapper 诊断必须修正口径；当前可见热点仍在 public snapshot/affordance/Core orchestration，下一批若继续应先独立分段，不得改 ActionResolver authority、减少校验或缓存 internal hash。
- 回滚：已按安全回滚点 `d750e4caa767332b5c3caaf247080b5717d56219` 完成精确撤回：恢复 `match-core.ts` 的 B1 `freezeSnapshotData`/`getSnapshot` 尾部路径，移除 `arena-rule-engine.ts` PublicActionRule 缓存，撤回 B2 专属深冻结测试与 movement 不可变断言；B1 batch 基础保留。未触碰父节点已有的 A1.1、`f80307b` 或既有 P1 签核提交。
- **历史结论：`formal-survival-bot-session-performance-B2` 评分 83/100；自动化证据曾通过，但 snapshot 约 `0.233ms/tick` 未达 `≤0.07` 目标，三轮 CPU `0.5989584/0.5555628/0.5462892ms/tick` 也均红，主协调拒绝并从当前工作树撤回。B2 不得提交、不改变当前 B1 候选状态，不把 P1、Bot pressure formal、Presentation 或 Platform 标记完成。**

### B2 精确撤回后的当前工作树复验

- 已执行精确撤回：`arena-rule-engine.ts` 无 B2 PublicActionRule cache；`match-core.ts` 恢复 B1 前已有的 `freezeSnapshotData` 与 `getSnapshot()` 末尾整树冻结调用；`match-core.test.ts` 的 B2 深冻结树新增测试已删除；B1 `tests/arena/trusted-input-batch.test.ts` 保留。另将 `match-core-movement.test.ts` 三处 `Reflect.set` 期望从 `true` 修正为 `false`，这是 `d750e4c` 已有深冻结行为的基线测试补正，不是 B2 代码。
- B1 原子测试 `node --import tsx --test tests/arena/trusted-input-batch.test.ts`：5/5 通过。包构建 `npm run build:packages`：52 packages/11 waves 通过；架构 40/40；`npm run typecheck:app`、`npm run lint`、文档检查与 `git diff --check` 通过。
- 首次回滚复跑发现 85 项中 1 项为上述测试期望漂移（84/85）；完成三处基线测试补正后，该测试应以 `Reflect.set(...) === false` 验证已有深冻结，同时保留后续 authority 值/hash 不变断言。后续全链复跑结果以补正后的门禁为准。
- 本次未重跑 CPU；B1 污染候选 `0.5284944/0.5356696/0.523374ms/tick` 与 B2 历史红数据继续保留，`formalGate=false`。上述复验不改变 P1 总体、Bot pressure、Presentation、Platform 或真机未完成状态。

## P1 阻断修订：expired-held-elimination-disposal（B1 上候选，formalGate=false）

### 触发事实、范围与行为映射

- 主协调 20-case 压力复验首先命中 `formal-survival-bot-001`：`pauseAtTick=1199`，wave-0 center supply 在 `expireTick=1800` 后仍被 player-1 持有；tick 1838 越界淘汰时，旧 `dropEquipment` 将它写成 dropped，但 Timeline active lifecycle 已结束，公开投影审计因此正确拒绝了一个永远不可拾取的 world runtime。该失败不是普通替换，也不是表现层问题。
- 本修订只触碰 Rule/Core 合同与测试/pressure runner：`EquipmentSystem` 是 runtime/owner/marker 的唯一写入者；`MatchCore.#resolveEliminations` 只消费 `dropOwned` 结果并按诊断码发事件；没有实例 ID 字符串特判、没有第二 lifecycle authority、没有 Bot/Presentation/Platform 或美术文件改动。
- expireTick 前的 held owner 淘汰继续走既有合法掉落，可回到 world 并可拾取；expireTick 先后仍保持 `spawn → expire → pickup → action`。expireTick 后 held runtime 在淘汰时原子转为 `DESPAWNED` 并从 authority runtime/held owner 集合移除，发 `EquipmentDespawned`，reason 固定为 `supply-lifecycle-expired-held-drop`，不伪造 `EquipmentDropped`。
- `applySupplyTimelinePhase` 的 expired-held marker add 已纳入与 runtime spawn/remove 相同的 commit `try/catch`；任一同步写入异常即销毁并清空 runtime、held owner 与 marker。replacement 回收旧 runtime、late elimination retire、destroy/fail-closed 都同步清理 marker，避免跨波次 stale disposition 或无界累积。

### 隐含权威状态、hash 与恢复边界

- `expiredHeldSupplyEquipmentInstanceIds` 会影响未来淘汰结果，因此不是普通缓存。它在 `ArenaInternalEquipmentSupplyDispositionSnapshot` schema v1 中稳定排序、版本保护并进入内部 state hash；公开 MatchSnapshot 不新增该字段，普通 1v1 没有 survival timeline/disposition，既有 hash/Replay 字节不因空 marker 改变。
- `createMatchStateHash` 对每个 disposition ID 交叉验证：恰好一个 equipment runtime、状态为 `held`、owner 非空、owner participant 存在且 participant.equipment.instanceId 相同；重复/未排序、ghost ID、非 held、owner/slot 不一致、超过 participant 数、未来 schema 均 fail closed。checkpoint/Replay 仍通过既有前缀重演恢复 marker，并在构造 hash 时验证；不把隐藏 Set 留在 hash 外。
- replacement 事务在删除 previous runtime 的同一 commit 中删除 previous marker；异常路径销毁并清空全部权威集合，不能出现 runtime 已删而 marker 半清理。当前测试覆盖 wave0 held→expire→wave1 replacement 的 marker 为空、runtime=3 与旧实例不可见；hash 合同负向覆盖 stale/forged disposition。

### Pressure runner 覆盖合同

- `ARENA_FORMAL_SURVIVAL_BOT_PRESSURE_REQUIRED_EVENT_TYPES` 现在包含 `EquipmentDespawned`；runner 另以 `equipmentDespawnReasonCounts` 与 `equipmentDespawnReasonCoverage` 记录并 hash 精确 reason，而不是把事件类型计数当作语义命中。正式 `formalGateEligible` 同时依赖事件类型与 `EQUIPMENT_DESPAWN_REASON.EXPIRED_HELD_LIFECYCLE` 的 reason coverage。稳定 result manifest 每个 canonical case 都包含 reason counts，evidence hash 还包含聚合 counts/coverage。
- runner 的 terminal ceiling 仍为 `finalTick ∈ [2401, hardLimitTicks]`；合法 sudden-death 可在 2500 前结束，不再把 tick 2456 的已结束 case 误报为 Core 功能失败。该修订没有降低 tick、动作、case、seed、事件或资源验证规模。
- runner 资源口径已拆分：`activeSupplyProjection.supplies.length ≤ 3`；world equipment（`spawned/dropped`）≤ `maximumWorldEquipmentLimit=3`；authority total runtime 上限由冻结 formal supply `spawnSpecs.length=3` 加冻结双参与者 `configTemplate.participantIds.length=2` 推导为 `maximumRuntimeLimit=5`，不再把 held runtime 误当作 world 泄漏。报告同时输出实际峰值 `maximumWorldEquipmentCount` 与 `maximumRuntimeCount`，execution/formal eligibility 两者都必须满足；3-case smoke 已直接证明 seed `1795162114` 在 tick 2401 为 `total=4/world=3/active=3`。
- 本次第二轮 20-case 复验此前的 `executionPassed=false` 已归类为 runner false negative：合法即时拾取 case `006/011/012/016/017` 在生成 tick 立即拿走一把，`maximumActiveSupplyCount=2`、`maximumWorldEquipmentCount=2`，但仍各自拥有 `spawnCountsByTick={"1200":3,"2400":3}`、6 个 `EquipmentSpawned` 与 `MatchEnded`。修订移除 per-case `active===3` 要求，新增按波次精确 spawn 数量硬门；该历史运行没有可用 CPU 签核证据。

### 当前证据与未完成门

| 门禁 | 当前结果 | 证据 |
|---|---|---|
| runner 定向 | 8/8 通过 | `node --import tsx --test tests/arena/bot-survival-stress.test.ts`；含 300/120 manifest、3-case 双跑、20-case 双跑回归、按波次 spawnCounts、active/world/runtime 三层资源边界、seed `1795162114` 在 tick 2401 的 `total=4/world=3/active=3`、事件类型/精确 reason coverage、hash 稳定和 smoke/formal 状态分离 |
| strict typecheck | 通过 | `npm run typecheck:app` exit 0 |
| 3-case functional smoke | 通过但非正式门 | `runFormalSurvivalBotPressure({caseCount:3, uniqueSeedCount:3, hardLimitTicks:2500})` 双次执行一致；`status=smoke-passed`、`formalRequest=false`、`formalGateEligible=false`；固定 seed `1795162114` 在 tick 2401 命中 `total runtime=4/world=3/active supply=3`，证明跨 expireTick held runtime 不应把总 runtime 误判为 world 泄漏；命中 `EquipmentDespawned` 与精确 `supply-lifecycle-expired-held-drop`，不代表 300-case |
| 20-case functional regression | 通过但非正式门 | runner 定向测试实际运行 `caseCount=20/uniqueSeedCount=20/hardLimitTicks=2500` 双跑；`executionPassed=true`，并直接验证 `006/011/012/016/017` 的 `maximumActiveSupplyCount=2` 与每波 spawn count=3；不产生 CPU 签核 |
| 受影响 Core/Equipment/Session/Replay | 102/102 通过 | 受影响 Node 链含淘汰、替换、hash、checkpoint、Replay、普通 1v1、runner 与 golden tamper；`node --import tsx --test ...` |
| architecture | 40/40 通过 | `node --import tsx --test tests/architecture.test.ts` |
| Equipment Vitest | 9/9 通过 | `npx vitest run packages/arena-equipment/test/equipment-primitives.test.ts` |
| golden | 普通 4/4；生存 1/1 | 普通 manifest `a53b401d`；固定 scenario 生成的生存 manifest `9f6b2d8c`、replay `3741ba11`、final `d460b945`。旧生存 manifest `dd30e771`/replay `2448457c` 仅保留为 ADR-110 前历史身份 |
| lint/docs/packages build/diff | 通过 | 本修订后 `npm run lint`、`npm run check:documentation`、`npm run build:packages`（52 packages/11 waves）与 `git diff --check` 均通过；不以 runner smoke 代替正式 300/full 门，golden 更新仍来自项目 scenario generator，不手填 hash |
| CPU/正式 pressure | 红/未完成 | CPU 仍受 `0.25ms/tick` 硬门约束；本修订不跑 300，不以 smoke 性能冒充正式证明 |

### 自审、评分与回滚

- 健壮性：所有公开输入在 mutation 前校验；marker 与 runtime commit 同一保护区；late elimination 仅依赖权威 held/disposition 状态，不读取未来 tick。竞态/重入由 `EquipmentSystem.#runMutation`、同步 commit 点和 destroy 保护；事件顺序为 `PlayerEliminated → EquipmentDespawned → reset/respawn`，普通掉落仍为 `PlayerEliminated → EquipmentDropped`。
- fail-closed：未知 runtime、marker 与 held/owner 不一致、runtime delete 失败、hash disposition 冲突、未来 schema、重复 expiry/replacement 均抛错并清理；destroy 幂等但不可继续读取。失败不会留下 runtime/marker/held 的半状态。
- 边界：1200/1800/2400 波次、599/600/601 public projection、expire 前 drop、expire 后 held retire、wave replacement、pause=1199 恢复、比赛结束与重复 destroy 均已纳入定向/runner证据；4人、300-case、coverage、Platform、Presentation、真机仍未完成。
- Replay/hash/兼容：普通 1v1 没有 timeline/disposition，不增加公开字段；生存内部 disposition 进入 hash，避免未来淘汰语义与 hash 脱钩。若黄金 fixture 命中该真实规则修复导致 hash 变化，只能按独立规则修复记录并等待主协调批准，不能伪装迁移等价。
- 暂定评分（本修订候选，不是 P1 advance）：规则/Core 行为 25/25；原子性与 fail-closed 24/25；Replay/hash/兼容 14/15；生命周期/资源 14/15；CPU/正式压力 2/10；测试与治理 10/10；合计 89/100。CPU 维度低于 80% 且 formal 300-case、Coverage、Platform 等硬门未完成，保持 `formalGate=false`，不建议 commit/push。
- 安全回滚点仍为 `d750e4caa767332b5c3caaf247080b5717d56219`；回滚必须只撤销本节 blocker repair/runner/测试 hunk，保留 B1 batch 及其原有 dirty 文件，不触碰已提交 A1.1/美术父提交或美术文件。

## P1 总体未完成硬门

- P1.2 Core：c-2 已补齐并由主协调签核隔离重演式原子全系统 checkpoint、生存黄金 Replay/篡改矩阵和 120 seed 资源长局；正式 300/120 Bot pressure 已完成执行、确定性与覆盖通过，但 CPU P95 `0.2550948ms/tick` 使 formalGate=false；不改变 P1 仍受 Platform 预算、Presentation、真机等硬门阻断。
- Replay/hash：Replay V5 保持兼容，内部 checkpoint schema v1 和黄金生存 Replay 已有签核证据；未来如引入直接快照，必须新 schema 且不得静默替换当前重演恢复语义。
- 事务矩阵：生产2人MatchCore已覆盖1200/1800、同tick拾取后动作、同波替换及竞争输入置换；EquipmentSystem/Resolver隔离层已有1/2/4竞争者输入置换证据，满足P1事务范围。4人生产权威参与者模型属于P2，不能把隔离测试误报为4人比赛支持，但也不能反向把P2能力列成P1 advance前置。
- 生命周期矩阵：Core 候选已覆盖前摇继续、淘汰与比赛结束恢复；Session 暂停、前后台、低表现帧率和真机仍未验收。
- 压力与资源：正式 300/120 实例/lifecycle/事件窗口/内存有界，`executionPassed=true`、300/300 final/trace hash 与完整覆盖通过；CPU P95 红门仍保留。修复前 CPU 五轮、旧链污染轮、D0–D7 临时候选均保留为历史，不拼接为当前正式通过。
- Bot / Presentation / Platform：Profile Definition/Registry foundation 与 public projection + formal survival Composition Bot 接线均已签核；300-case Bot stress 已真实执行但 formalGate=false；Presentation adapter、Platform、前后台和真机仍未完成；A0.3、A1.1 执行/代表样件与 Blockout 尚未开放。4人生产权威参与者仍为P2后续范围，不影响本段P1未完成结论，也不由本小门提前实现。
- 正式生存 Mode/HUD 不得在上述 P1 硬门关闭前 advance。

### P1 总体 advance 完成审计与供给 Presentation/Platform 补齐门（2026-08-02）

本节是主协调对“PA7 通过后是否足以让 P1 advance”的独立审计。结论为 **不足、保持
`remain / hardGate=false`**：P1 供给 Presentation adapter、正式 Survival Composition 接线、P1 专属设备合同与隔离验收构建虽已完成非性能签核，但当前交付包体预算仍红，PA6/PA7 正式性能、七目标设备媒体证据、A0.3 真人门、A1.1/代表样件和最终同源治理均未通过。因此即使后续 PA6/PA7 变绿，也不能单独把 P1 写成完成。

| advance 组成门 | 当前可核验证据 | 关闭标准 | 当前状态 |
|---|---|---|---|
| Rule/Core/事务 | P1.1、P1.2a/b/c 与隔离 1/2/4 竞争矩阵已有签核；完整 4 人 MatchCore 属于 P2 | 保持黄金 Replay、checkpoint/hash、普通 1v1 与 599/600/601 零漂移 | 已有阶段证据；不得外推为 P1 总门 |
| Bot/只读投影 | Profile Registry、正式生存 Composition Bot 与 active lifecycle projection 已签核 | projection 身份、resync readiness、Bot 普通 InputFrame 路径在最终 source 上复验 | 已有阶段证据；最终同源未完成 |
| PA6 性能 | runner 正确性已批准，正式 ABBA×3 尚未取得连续清洁绿证据 | 首次授权门与最终 source freeze 后的同源 ABBA×3 均按台账通过 | `formalGate=false` |
| PA7 正式证据 | PA7-0.2–0.5 与 lane A/B 非性能实现均已签核；正式 worker、完整 Snapshot/Replay/事件/生命周期、结构化进度、证据发布和失败关闭已接通 | 最终冻结源码上的 300/120 双跑、CPU/heap、全回归与评分通过 | 正确性候选完成；正式性能按 ADR-115 延期，`formalGate=false` |
| Coverage/全门 | 不改阈值补齐 `arena-contracts`、`arena-equipment` 真实边界，并把同一 PP0/PP1/PP3a Node 测试纳入 Vitest 覆盖采集；单 worker 140 文件、717/717，statements/lines `57.07%`、branches `70.90%`、functions `72.41%` | 最终 source 上复验 Node/Vitest/architecture/type/lint/docs/packages/build/coverage；性能/压力文件仍按 ADR-115 留到联合窗口 | 覆盖率门已绿；完整同源总门待 source freeze |
| 供给 Presentation adapter | PP0/PP1 已签核；PP3a 已把正式 Survival Composition、原子 post-frame/events、同一 adapter 与唯一宿主 owner 接通；PP3b 又完成 platform-neutral host、三端薄 entry、隔离 build 与 PP2 build-side attestation 闭包；主协调已接入两条隔离 build 命令与 production-unreachable 架构门 | 最终 source 上复验完整矩阵且不复制第二套供给状态机 | PP0/PP1/PP3a/PP3b 与中央接线正确性完成；非性能联合回归通过，`formalGate=false` |
| 美术 A0.3/A1 | A0.3 为 85/100、真人 0/10；A1.0-v2 已以当前源码合同 94/100 签核并通过正向与 85/85 失败关闭，A1.1 仍有三份上游 artifact 漂移；代表样件未开始 | A0.3 至少 10 人并过阈值；最终 source 上复验 A1.0-v2 并重建 A1.1；A1代表样件通过表现、预算、来源、低动效/静音与生命周期门 | A1.0-v2 合同完成；A0.3/A1.1/代表样件红 |
| Platform/包体 | 当前 dirty 三端 Product build、manifest、production-artifact、正式资产、第三方与供应链门均通过；Web/微信/抖音 JavaScript 为 `1,567,050 B / 1,668,921 B / 1,668,921 B`，交付为 `4,144,900 B / 3,997,267 B / 3,997,242 B`。Web JS 余量 `5,814 B`、交付余量 `49,404 B`；小游戏最大文件均为 `game-runtime.js=1,084,462 B`。三端共用 2,495-entry/300-module/3,005-replacement 稳定诊断目录；Web gzip `225,430 B`，小游戏只交付 `250 B` exact-key reference。连续双构建的 82 个文件路径/字节/SHA-256 全等 | 同一候选 HEAD 的三端 build、正式资产预算和交付预算全绿，不提高阈值、不降分辨率/动作/抗锯齿规避 | dirty candidate 包体门已绿；clean source freeze 与外部门未完成 |
| P1 专属 Web/设备 | PP2 已冻结 11 checks、Web 双视口与微信/抖音六目标、clean attestation、内容寻址和失败关闭 verifier；PP3b clean fixture 已生成三平台 PP2 attestation、四角色 manifest、A1.0-v2 原字节绑定和 `deviceEvidenceStatus=not-run` | 最终同一 clean source 上取得七目标独立录像/截图/日志并由 PP2 verifier 验真 | build-side 合同完成；设备尚未运行，`formalGate=false` |
| source/提交治理 | HEAD/upstream 均为 `d750e4c`，当前共享树 229 路径 dirty；PP0–PP3b、PA7、覆盖率、治理与包体候选补丁均未提交 | 已验收批次归属清晰；最终非性能门关闭后形成 source freeze；最终 attestation 后才 push | 红 |

#### P1-PP 文件域、所有权与阶段顺序预注册

以下写域已按 [ADR-115](../decisions/115-arena-v2-deferred-joint-performance-gate.md)进入一次性非性能实现窗口，但**只有线程回执、精确文件集和主协调逐门授权后才能写入**；设备运行、正式性能、commit/push仍未授权。它必须在最终 source freeze 之前完成，
否则会使 PA6/PA7 同源证据过期。为保持双开发约 20% 提速而不交叉，顺序固定为：
`PA7-0.2纠偏并重新签核 → PA7 A/B并行非性能实现 → 开发B串行形成P1-PP0/PP1候选 → 美术线程重建A1.0-v2并与开发B联合反证 → PP2/PP3验收合同与harness → A0.3真人与A1.1重建/代表样件 → 完整正确性门 → 主协调本地candidate commit → 最终同源PA6 ABBA×3 → PA7正式300/120 → P1专属Web/七目标设备 → P1独立advance审计`。

| 所有者 | 候选文件域 | 责任与禁止项 |
|---|---|---|
| 开发 B：P1-PP0 contract | 新增 `packages/arena-presentation-contracts/src/arena-supply-presentation-contract.ts`、新增 `tests/arena/presentation/arena-supply-presentation-adapter.test.ts` 的合同矩阵 | 实现 [ADR-113](../decisions/113-arena-v2-supply-presentation-adapter-boundary.md) 的 Marker/Cue/View exact-key validator；不得保存状态、导入 MatchCore/Session/Renderer或修改共享index |
| 开发 B：P1-PP1 adapter | 新增 `packages/arena-presentation-runtime/src/arena-supply-presentation-adapter.ts`，只在已登记测试文件追加adapter矩阵 | 只读消费 frozen projection/event，输出有界 marker/Cue/View并提供独立debug snapshot；覆盖 A1.0 25 项。只持marker/recent hash/pending pair/sequence/resync，不持有voice/VFX/GPU/DOM handle；不得导入 MatchCore/Resolver/Session authority、Three.js/DOM/Platform、墙钟或未注入随机；不得修改 PA7 A/B 文件 |
| 开发 A：P1-PP2 device contract | 新增 `packages/arena-device-acceptance/src/arena-p1-supply-device-acceptance-v1.ts`、新增 `scripts/lib/arena-p1-supply-device-evidence-verifier.ts`、新增 `tests/arena/presentation/arena-p1-supply-device-evidence.test.ts` | 固定供给专属 checks、七目标、acceptance build attestation 与 clean identity；不得把 Stage 8 generic record/production build manifest 改名复用或修改通用 record validator |
| 开发 B：P1-PP3 acceptance harness | 候选新增 `src/entry/arena-p1-supply-acceptance-runtime.ts`、platform-neutral host owner、Web/抖音/微信专用 acceptance entry 与 `scripts/build-arena-p1-supply-acceptance.ts`；完整 HTML/CSS/entry/build 文件清单必须先冻结 | 仅驱动正式 P1 Composition 和生产 adapter；测试/开发 bundle 必须标识为非发布入口并从默认 Product、production reachability、三端发布清单和正式资产清单排除；不得创建 P2 Mode、Result、奖励或用户导航 |
| 美术线程 | A0.3真人原始答案/汇总；PP1候选后新增版本的A1.0当前源码绑定包；最终source的A1.1 artifact；A1代表样件与正式来源/预算/截图/音频证据 | 保留历史A1.0-v1不改写；新包绑定ADR-113、PP0/PP1和25项测试。只消费adapter稳定View/Cue；不得定义tick、拾取、替换、过期、随机、终局或运行墙钟删除 |
| 主协调 | `packages/arena-presentation-contracts/src/index.ts`、`packages/arena-presentation-runtime/src/index.ts`、`packages/arena-device-acceptance/src/index.ts`、`package.json`、`scripts/build.ts`、architecture/production reachability 与本台账 | 逐 hunk 审查共享出口和构建隔离；只有六维自检、变更治理、定向红绿轮与文件零重叠通过后才接线；开发线程不得自行改中央文件或 commit/push |

#### P1-PP0 文件重叠与共享出口审计（2026-08-02）

本轮在不启动构建、测试、模拟器或正式性能任务的条件下，对上述候选写域做了逐路径只读审计。PP0–PP2 列出的六个新增源码/测试路径均不存在，
PP3 当前已点名的 runtime 与 build 脚本也不存在，因此不存在“在未知既有文件上继续编辑”的直接路径冲突；本轮审计当时尚未冻结 Web/抖音/微信 HTML、CSS、entry 和 build 文件清单，
故当时 PP3 不得开始。当前共享工作树为 178 个 dirty 路径，不能把“新增路径为空”外推为工作树隔离或 clean-source。

2026-08-03 主协调在只读核对现有 Product、研究入口、三端构建与发布隔离后，将 PP3 候选文件清单冻结为以下 10 个新增路径；第 2 项是 PP3b 开发前按 ADR-113 预留治理条款登记的唯一扩展，用于消除微信/抖音对 Web entry 的反向依赖：

1. `src/entry/arena-p1-supply-acceptance-runtime.ts`；
2. `src/entry/arena-p1-supply-acceptance-host.ts`；
3. `src/entry/web-p1-supply-acceptance.ts`；
4. `src/entry/wechat-p1-supply-acceptance.ts`；
5. `src/entry/douyin-p1-supply-acceptance.ts`；
6. `src/arena-p1-supply-acceptance.css`；
7. `scripts/arena-p1-supply-acceptance-index.html`；
8. `scripts/build-arena-p1-supply-acceptance.ts`；
9. `tests/arena/presentation/arena-p1-supply-acceptance-runtime.test.ts`；
10. `tests/arena/presentation/arena-p1-supply-acceptance-build.test.ts`。

该清单已冻结为 PP3 唯一写域。三端 entry 只能调用同一 platform-neutral runtime；Web CSS/HTML 不得成为微信/抖音第二语义源；build 只输出独立 `dist/arena-p1-supply-acceptance/{web,wechat,douyin}` 并写入 acceptance attestation，禁止修改 `scripts/build.ts`、默认 `index.html`、Product entry 或 release manifest。若实现审查证明必须新增宿主资源 owner 文件，必须先由主协调登记路径、依赖方向、测试和回滚 hunk，不能边写边扩大清单。

2026-08-03 PP1 候选冻结后的只读预审确认，PP3 必须拆成两个串行子门。`P1-PP3a` 只允许写上述第 1、9 项，先实现 formal survival Composition → `LocalMatchSession` V2 post-frame/events → PP1 adapter → injected host resource port 的唯一 owner；同一 composition options 一次派生 Session 与 lifecycle contract，宿主提交成功后才替换 last committed View。终止 Cue 只能从上一 committed View 定位，缺失时非空间可访问 fallback，禁止猜坐标。authority 已推进、adapter 已提交或宿主提交失败后永久 fail closed；destroy 对 Session、adapter、listener/particle/voice/GPU/DOM/async 资源逐项清理，失败项保留 ownership 供 retry。`P1-PP3b` 只允许写第 2–8、10 项；第 2 项必须保持 platform-neutral，三端 entry 仅各自适配平台原语并调用共享 host/PP3a，互不导入，独立构建保持默认 Product/release 不可达。

2026-08-03 主协调完成 PP2 与 PP3a 独立签核：

- PP2 为 `completed / coordinator-approved / formalGate=false / 95/100`。合同固定 11 checks、7 targets 与独立 `p1-supply-acceptance` build attestation；verifier 绑定外部 clean identity、内容寻址、每项媒体证据、双 destroy 资源归零、默认 Product/release 不可达，并在每个 artifact 前后与异常路径执行 root generation 复核。独立证据为合并 Node `22/22`、package Vitest `3/3`、type/lint/diff 全绿；源码 SHA 为 contract `af1ba6b...54db`、verifier `ee6e32bd...fcb9`、test `9b9e51a7...b79e`。这只完成设备证据合同，不表示任何设备已通过。
- PP3a 为 `completed / coordinator-approved / formalGate=false / 97/100`。独立证据为 PP3a `14/14`、PP0+PP1+PP3a `65/65`、严格 TS、ESLint、`typecheck:app` 与 diff 全绿；runtime/test SHA 为 `4a4896b9...8275`、`bfe76d24...9c81`。构造后 host 六类资源立即转移 ownership；Session/adapter 中途失败统一回滚，authority 边界吞掉的重入会在 adapter/host publication 前失败关闭，失败 cleanup 只保留未清项供精确 retry。该签核只开放 PP3b 第 2–8、10 项，不开放设备、性能、P2/A2、commit 或 push。

2026-08-03 主协调完成 PP3b 独立签核，状态为 `completed / coordinator-approved / formalGate=false / 96/100`：

- 三端 entry 只调用同一 platform-neutral host 与 PP3a；host 捕获数据 descriptor，不执行 capability getter，拒绝继承 `then`、隐式数值 coercion、墙钟 timer 与动态方法替换。同步 frame dispatch 且首次 cancel 失败时，未返回给 PP3a 的 orphan 由 `destroyAsyncCallbacks` 保留并重试；后续 schedule 失败只触发一次 shutdown，不留下 active-but-unscheduled runtime。构造从 canvas 获取起事务化，`getContext` 或 listener 中途失败会继续清理，失败 ownership 保留给公开 `handle.destroy()` 精确重试。
- formal-clean build 只在 clean source 上运行；三平台共享 commit、repository fingerprint、逻辑 buildId、adapter hash、A1.0-v2 原字节 hash 与 reachability hash，各自拥有唯一 harness/manifest/attestation hash。公共 artifact 只写 `web/shared` 一份；默认 Product 三入口使用完整 esbuild metafile 做传递可达审计。候选在同一 `dist` 文件系统的临时目录完成最终字节重读、PP2 constructor exact-key、四角色 manifest 和 source 前后身份校验后才原子 rename。`candidate → OUTPUT` 是提交点；旧 generation 清理失败只报告 `stale-backup`，不从可能残缺的 backup 回滚。
- 主协调独立证据：PP3b `15/15`，PP0+PP1+PP3a+PP3b `80/80`，PP2+PP3b `24/24`，目标 ESLint、`npm run typecheck:app`、A1.0-v2 checker 与 `git diff --check` 全绿；development isolated build 如实标记 dirty，当前 dirty formal-clean 在写入前拒绝且未覆盖开发产物，临时 clean Git fixture formal-clean 从最终 `OUTPUT` 重读通过。另一开发线程只读审计结论为无签核级硬阻塞、`94/100`。
- 最终 SHA-256：host `fe01032f64202ee4607fc26eb62e56730030d42fba8366eedac80f00b3f631e5`；Web `eca586a2ba8edb40775cd9bbbcb47d8d218845d37d0de82f3e1cb96bad627014`；WeChat `2161b7b498ace42ca005e1fe9b7372d1b68c998b581eff9b8259e905b0e71248`；Douyin `4d3ce229ed29f5cbd05f23d53f9cd9591d011eae352ba7da68d373ea610b85c5`；CSS `2e31f7e498ce006ed78891d1d0dd4fb096715f1fd4820601e284e4e52d70525f`；HTML `abcb4cc94fbe0f574fdfa0425a703842d1a11a8cf6940009f9cf53fc83f0d59e`；build `882899b36530dc3ef7ca91694ff320c9d62c4bccd799a15e608ba79205427102`；test `3a232ba757f0d46f32e813fe25f7cdebaca086cf7faceb36f810c38267d3c4fa`。
- 保留失败轮：继承 then/sync-cancel orphan/getContext 回滚最初三红；错误测试句柄造成挂起；opaque throwable 后三处旧 message 断言红；clean fixture `three` symlink 路径红；Web CSS 审计缺 outdir；静态 production 规则过宽；两处 strict TS 收窄；backup 部分删除后的危险回滚。均未与最终绿轮拼接。
- 评分：健壮性 `97`、竞态与确定性 `96`、兜底与失败关闭 `97`、边界与恶意输入 `97`、生命周期与清理 `96`、生产主流程阻断 `95`、变更治理 `96`，综合 `96/100`。剩余任意外部进程 OS-level replace、七目标媒体/运行日志、真机和性能均属于后续正式门，不由本签核外推为通过。

2026-08-03 主协调完成 PP3b 后中央接线与覆盖率收敛：

- `package.json` 新增 `arena:p1:supply:build` 与 `arena:p1:supply:build:formal`，默认 `build` 和 `scripts/build.ts` 保持 Product 唯一生产入口；`tests/architecture.test.ts` 新门对 platform-neutral host、三端薄 entry、完整生产 metafile 不可达和默认 build 不变做严格断言。该架构门与目标 ESLint、`typecheck:app`、`git diff --check` 均通过。
- 明确排除 PA6、PA7、formal pressure、performance、stress 和真人压力文件后的非性能 Node 集为 116 个文件并全部通过；最初完整 Node 尝试的 1134 项中 1131 通过，旧设备 Definition 数量断言已从宽松 `7` 改为八文件精确清单。PA7 progress 同 inode metadata 漂移和长时 pressure 用例保留到联合性能窗口，不记作本轮通过。
- 覆盖率首轮默认并发为 138 文件、624/639，通过项外有 15 个研究用例纯超时；不改测试超时或覆盖阈值，单 worker 复跑 138 文件、639/639 后确认行为全绿，但暴露真实覆盖率红门。随后开发 A/B 仅补测试：`arena-contracts` 达到 statements/lines `84.89%`、branches `77.53%`、functions `92.23%`；`arena-equipment` 达到 statements/lines `90.68%`、branches `73.49%`、functions `97.53%`。主协调用 `node:test`→Vitest 适配复用同一 PP0/PP1/PP3a 65 项断言，最终 140 文件、717/717 和全局四维阈值通过，并把 `test:coverage` 固定为单 worker 可复现入口。
- 默认 dirty Product build、build manifest、production-artifact gate 与正式资产预算通过；Web launch 改用受治理子路径出口后，架构门、52 包/11 wave 构建、typecheck、lint、三端 Product build 与 manifest 均通过，Web JavaScript 实测减少 `21,918` 字节并确认不再传递到达 `ProductCanvasUiSurface`。小游戏 CJS 共享块与原子候选发布经专项、中央 architecture 58/58、真实 Product reachability、两轮全产物确定性和预算复验通过。共享表现 helper 去重与 [ADR-117](../decisions/117-arena-v2-production-error-catalog.md) 的稳定诊断目录随后关闭 Web 门；主协调最终复验目录/小游戏构建 `14/14`、表现/产品/Quick Match/启动边界 `45/45`、architecture `58/58`、52 包/11 wave、typecheck、lint、三端 build/manifest、包体、production-artifact、供应链、正式/第三方资产、docs 与 diff 全绿。
- 诊断目录独立重读结果为：canonical JSON `1,039,029 B`、gzip `225,430 B`、gzip SHA-256 `d9857b456c512b1c07ba38ee0f3ffb71a35e91e63c7b687988f7fa253a8e1a5b`、catalog hash `04829bd99e9eaa618729664e53786480cff87e87beb1a4fda4743daeb1280835`、source inventory hash `65f829aa9e3965cd86eedb840bd307adb7d95690af7b8a1803581485009c8734`；disposition 为 transformed `3005`、aggregate `25`、custom `33`、dynamic-approved `29`、semantic-preserve/unsupported `0`。最终 Web map 中 Arena dist source 为 `0`、TypeScript source 为 `249`，`ETjkwPK` 从 `game-BLkm6KdH.js:1:2049` 回溯到 `arena-platform-runtime/src/host-capability.ts:68:45` 且 source content 完整。审查中发现原 `unsupported=0` 不具机器证明，已补充 `globalThis.Error` 等可疑构造失败关闭和命名 class-expression 遮蔽反证，再次全绿。
- 用户授权后曾精确安装并验证 `terser@5.44.1`；保守单次 Terser 对 Web/小游戏均产生体积回退，去除函数/类名的激进配置又会破坏当前 `new.target.name` 错误语义，因此该候选已完整撤回，不进入依赖清单、构建链或 source freeze。正式实现仅精确加入构建期 `magic-string@0.30.21` 与 `source-map-js@1.2.1`。包体开发门现已关闭；仍须完成最终治理、clean source freeze 和 ADR-115 的联合性能/设备/美术外部门，当前不得把 dirty candidate 写成 formal passed。

- `packages/arena-presentation-contracts/src/index.ts`、`packages/arena-presentation-runtime/src/index.ts` 与 `packages/arena-device-acceptance/src/index.ts` 已由主协调分别接通 PP0、PP1、PP2 公开 API；`package.json`、`scripts/build.ts` 继续保持主协调单写且 PP3b 不得修改。PP3a/PP3b 是隔离 entry/build，不进入共享包 index 或默认 Product。
- `tests/architecture.test.ts` 已有 PA2–PA4/性能迁移的大块未提交补丁，是明确共享冲突文件。开发 B 和美术线程不得修改；P1-PP 的依赖/host-free/reachability 断言只能在 PA 候选稳定后由主协调逐 hunk 追加并复跑完整 architecture。
- `packages/arena-presentation-runtime/src` 当前另有 8 个 PA Presentation 文件处于 modified；候选 adapter 文件虽为新路径，仍与这些补丁共享包级 typecheck/build 结果。PP1 可以运行仅覆盖新增 adapter 的 Node 定向测试，但结果只能记作功能候选，不能冒充隔离回归、PA6 正式性能或最终同源证据。
- `scripts/art/check-arena-supply-presentation-contract.ts` 与 `scripts/art/test-arena-supply-presentation-contract-fail-closed.ts` 是已跟踪且当前无 diff 的 A1.0 权威输入；PP0 必须逐字复用其六类 event shape、routing rule、64-entry 去重/重同步语义和 25 个 fixture ID，禁止复制后改名、放宽或由开发 B 修改这两份美术治理脚本。
- 三线程均已确认 ADR-115、零重叠写域和禁跑性能边界；开发/美术自检与主协调逐门验收仍是每个后续小门的必要条件，一次回执不自动开放下一门。

本审计把重叠风险从“未知”收敛为“新增文件零直接重叠、共享出口和 architecture 串行、包级验证受 PA dirty 影响”。治理维度仍为 3/5，不提高 PP0 总门评分；
用户允许忽略低负载且归属不明的环境残留，只解除非性能工作的等待，不豁免 PA6 干净环境 ABBA×3、最终 clean-source、设备和发布门禁。

adapter 的公开输出必须是深冻结、exact-key、版本化的表现数据，只表达 `markers / remainingTicks / labelSeconds / cues / resync / lifecycle identity`；资源计数只放独立debug snapshot，
三实体供给不出现三选一弹窗、不增加按键，靠近后的拾取/替换只能来自权威事件。sequence 缺口、未来 schema、投影身份冲突、replacement pair 缺失/反序、
未知 active identity 或资源上限越界必须先隐藏受影响项并进入 resync/fail closed，不能猜测或保留伪状态。暂停、前后台和 30 FPS 只改变消费节奏；恢复时过期 one-shot 不补播，
同一事件幂等不重播，冲突重复拒绝；destroy 先失效 stream，再清空 marker、recent-hash ring 和 pending pair。voice/VFX/GPU/监听器由adapter之外的表现owner管理，不能回流本adapter制造宿主依赖。

#### P1 专属浏览器/设备证据合同候选

P1 Definition 预注册 11 个检查：`clean-build-source-identity / three-markers-no-popup-or-extra-input / waves-1200-2400 /
authority-remaining-ticks / lifecycle-599-600-601 / atomic-replacement / pause-background-no-wall-clock /
catchup-no-duplicate-one-shot / reduced-motion-muted-asset-fallback / bounded-resources-double-destroy /
harness-not-production-reachable`。检查必须引用内容寻址日志、截图和录像，资源峰值/清理计数写入严格日志合同，不能只填通过布尔值；
当前通用 verifier 只允许 Stage 9 Definition 使用 `performance-trace`，P1 不得通过误标 artifact kind 绕过该边界。

P1-PP2 另冻结 `ArenaP1SupplyAcceptanceBuildAttestationV1`，顶层 exact-key 为
`schemaVersion / purpose / commit / sourceDirty / repositoryFingerprint / buildId / platform /
adapterModuleHash / harnessModuleHash / productionReachabilityAuditHash / assetManifestHash /
artifactManifestHash / attestationHash`。`purpose`精确为`p1-supply-acceptance`、`sourceDirty=false`；三平台可有不同 harness/build artifact hash，
但必须共享同一 commit、repository fingerprint、adapter hash、asset manifest hash 和逻辑 buildId。它作为严格 JSON log 由 P1 专用 verifier 解析，
不冒充当前只接受`defaultEntry=product`的`ArenaBuildManifestV1`；缺字段、额外字段、未来 schema、hash 不一致、production reachability 审计不通过或 release build 含 harness 均失败关闭。

目标记录精确为七个：一个 Web browser 记录同时包含 `390×844` 与 `1440×900` 两套内容寻址截图/录像；
`douyin-developer-tool / douyin-ios-phone / douyin-android-phone / wechat-developer-tool / wechat-ios-phone /
wechat-android-phone` 各一份。每份都必须绑定相同 clean commit、adapter/module hash、A1 资产/content hash 与对应平台 acceptance attestation；同平台 Stage 8 build manifest 只能作旁证，
不能替代 P1 attestation、record、check 或 artifact。验收必须证明：出生 3 标记、1200/2400 波次；`+599`剩1 tick且可拾取、`+600`消失且不可拾取、
`+601`不重播；旧→新原子替换；暂停/后台无墙钟推进；catch-up/Replay不补播过期 Cue；静音/低动效/资产失败保留因果；连续对局与双次 destroy 后有界资源归零；默认 Product 和发布产物不可达 harness。

P1-PP 每个小门沿用本台账六维自检加变更治理，评分为架构边界20、行为/可读性20、生命周期/失败关闭15、确定性/去重15、设备/可访问性15、迁移/回滚10、治理5；
总分≥90且每维≥80，且 A0.3、A1.1、包体、PA6、PA7 或任一目标记录红时，P1 仍保持 `remain`。代表样件和 acceptance harness 是 P1 证据，不是 P2 正式生存入口；P2 后续必须复用同一 adapter，
在生产 Mode 接入后重新做产品级集成与设备回归，不能把 P1 harness 直接列入发布产物。

#### P1-PP0 主协调设计预审与六维反证（2026-08-02）

本轮只审计当前源码和文档，没有实现或运行代码。源码事实为：Public Supply Projection v2已有max=3、ready/pending identity和权威remaining tick；四类供给严格payload已存在；
Product Presentation能收到post-frame与完整authority events；但通用`PresentationEventWindow`不保存canonical payload hash或snapshot闭包，纯函数projector也没有供给状态。因此[ADR-113](../decisions/113-arena-v2-supply-presentation-adapter-boundary.md)
采用独立stateful adapter而不是在Renderer/projector临时拼状态。

- 健壮性：Marker/Cue/View、constructor、start/update和attestation均预注册exact-key/schema/安全整数/有限数/唯一ID/有界数组；相关事件只读own data descriptor，future、extra、mixed flat+nested supply事件在状态变更前拒绝。
- 竞态与确定性：adapter同步单写；update先完整模拟后一次性交换；`nextExpectedEventSequence → post snapshotEventSequence`形成闭包，recent canonical hash区分幂等重复与冲突重复；不使用墙钟或随机。
- 兜底与失败关闭：sequence gap/catch-up只允许ready snapshot无Cue重建；not-ready隐藏marker等待下一post-frame；身份冲突不猜测。资产、静音和低动效只影响下游表达，不改变marker寿命。
- 边界与恶意输入：contracts/runtime不依赖Session/Renderer/Three.js/DOM/Platform；普通Duel不创建adapter；Proxy/accessor/Symbol/sparse/cycle/thenable和超上限批次必须进入负向矩阵。
- 生命周期与清理：状态为created/active/resync-required/destroyed并另有terminal failure；adapter只拥有3 marker、3 pending pair、64 recent hash和一个stream，destroy幂等清空；voice/VFX/GPU由外部owner负责。
- 生产主流程与阻断性bug：出生三marker、无弹窗/新按键；空槽pickup一Cue，replacement pair一Cue且后续Pickup不双播；+600删除、+601不重播；P1 harness不进入默认Product，P2必须复用同adapter。
- 变更治理：P1-PP0/1/2/3写域、共享index/构建文件主协调单写、候选提交前后同源和回滚边界已预注册；当前没有线程回执、代码、红绿测试、A1样件或设备记录，不能授权实现或签核。

设计预审评分：架构边界20/20、行为合同19/20、健壮/失败关闭14/15、确定性/竞态14/15、生命周期14/15、迁移/回滚9/10、治理3/5，合计93/100；治理仅60%低于单维80%硬门，
因此状态严格为`design-candidate / implementation-not-authorized / hardGate=false`。该预审不是开发B的六维自检；线程服务恢复后仍须由开发B逐字段反证并由美术线程确认Cue/回退输入，再由主协调修订和独立复评。

#### P1-PP0 合同交叉审计修订（2026-08-02）

主协调进一步把 ADR-113 与 A1.0 机器合同、`ArenaPublicSupplyProjection` v2、四类 strict payload、MatchCore 的
`#eventSequence` 递增语义和真实 Recycled→Replaced→PickedUp 发射顺序逐字段对照，关闭了四个实现前歧义：初始
`not-ready-pre-expiry` 不再由宿主猜测，而是 start 后直接空 View/resync；eventSequence 明确为“下一条尚未产生的 sequence”，
增量覆盖使用半开区间；Cue ID/sourceEventIds/nullable 身份矩阵固定；失败拆成 committed、snapshot-resync 和 terminal-failed，
避免一部分实现保留过期 marker、另一部分实现静默吞坏事件。

PP0 还新增硬边界：options/start/update/debug 都必须 exact-key/schema；terminal failed 后不再返回玩家 View，只有标量 debug 与 destroy；
ring 外旧事件、gap、合法 identity 无法唯一匹配时只允许 ready snapshot 无 Cue 重建；future/mixed/未知类型、冲突 duplicate、恶意输入与重入进入 terminal failed。
完整事件副本的 deterministic canonical hash 用于去重，已登记非 equipment authority event 只参加 sequence/hash，不复制其业务解释器。
Presentation hot path 禁止调用 `createArenaPublicSupplyProjectionAudit`、full audit 或 legacy snapshot，只能用 PP0 有界 validator 连接最多3个供给，防止把 PA2 已移出的昂贵审计重新引回每帧。

该修订当时只提高设计可执行性，未改变治理硬红：开发B和美术线程尚无回执、无六维反证、无代码或红绿轮，PA6也未通过。
当时设计成熟度复评为94/100，但治理仍3/5=60%，因此 PP0 状态保持
`design-candidate / implementation-not-authorized / hardGate=false`。2026-08-03 在 PA7 非性能实现完成签核、开发 B 回执并确认两个新文件写域后，主协调已将当前状态更新为
`implementation-in-progress / developer-B-acknowledged / hardGate=false`；仍不得以设计分数或实现开始绕过七项自检和主协调复验。

A1.0当前sourceAudit红门按[ADR-114](../decisions/114-arena-v2-art-evidence-versioning-and-joint-gate.md)处理，不形成实现循环：在ADR-115条件实现窗口内，开发B取得线程回执和主协调逐门授权后可按ADR-113和历史A1.0的固定25个fixture ID形成PP0/PP1候选，但主协调不得签核PP1或开放PP2/PP3，直到开发—美术联合门通过；
美术线程随后追加A1.0-v2当前源码绑定包，不修改历史v1。v2至少绑定当前authority/projection/Replay/Session来源、ADR-113、PP0 contract、PP1 adapter和25项测试，
经正向/失败关闭脚本、开发B六维自检、美术Cue/回退确认和主协调联合验收后，才允许PP1完成。候选v2路径与schema不是已交付事实，线程回执前仍禁止创建。

#### A1.0 运行时25项计划→证据矩阵

下表逐字使用A1.0机器合同的fixture ID。`PP1 Node`只证明无宿主adapter语义；`PP3 harness`证明真实帧循环与可访问fallback；`A1/设备`证明正式资产、视觉、音频和目标机。
三类证据不能互相代替。每个负向case都必须比较调用前后View/debug snapshot/hash，证明拒绝前未半提交，而不是只断言抛错。

| # | 固定fixture ID | 主证据owner | 通过标准 | 失败关闭/不可冒充 |
|---:|---|---|---|---|
| 1 | `spawn-three-physical-entities-without-modal` | PP1 Node＋PP3 harness | 同一wave严格3个唯一marker，harness显示3个世界实体且无modal/焦点/确认输入 | 只测projection数组长度、画3张卡或增加按钮均失败 |
| 2 | `ordinary-flat-equipment-spawn-bypasses-supply-adapter` | PP1 Node | flat普通Spawn只推进sequence，不改marker/cue/debug资源 | 不得把普通Duel装备误标供给或因未知普通字段失败整局 |
| 3 | `mixed-flat-and-payload-spawn-fails-closed` | PP0/PP1 Node | 同一Spawn同时含strict payload与flat supply identity时terminal fail；marker/pending/cue领域hash不半提交、调用不返回旧View | 任选一套字段继续处理或失败后继续渲染旧View均失败 |
| 4 | `active-supply-flat-pickup-terminates-exactly-one-marker` | PP1 Node | 唯一instance命中，移除1 marker并输出1个picked-up Cue，post projection逐字段一致 | 移除多项、无权威事件先移除或重复Cue失败 |
| 5 | `flat-pickup-not-matching-active-bypasses-without-cue-or-marker-change` | PP1 Node | 非active普通Pickup只推进sequence，marker/cue不变 | 猜supplyId、报假拾取或终止其它marker失败 |
| 6 | `definition-conflict-or-multiple-active-pickup-fails-closed` | PP1 Node | structurally valid冲突不得按事件猜状态；完整ready post snapshot无Cue重建，not-ready清空并resync，二者均无部分Cue/marker commit | 以首项/排序兜底、保留旧marker或继续播pickup均失败 |
| 7 | `missing-history-or-bound-active-projection-enters-resync-before-any-event` | PP1 Node | 缺连续history时先校验绑定snapshot；ready无Cue重建，not-ready隐藏并resync；初始start遇not-ready也走同一空View状态 | 先播事件再发现缺口、抛给宿主猜初始状态或保留可能过期marker失败 |
| 8 | `replacement-pair-terminates-without-waiting-for-picked-up` | PP1 Node＋PP3 harness | Recycled→Replaced同tick成对后立即移除marker并输出唯一replaced Cue；后续Pickup只确认 | 等Pickup才换槽或再播picked-up失败 |
| 9 | `strict-replacement-without-active-match-fails-closed` | PP1 Node | pair的next instance未唯一命中active marker时不提交pending/Cue；ready snapshot无Cue重建，否则空View/resync | 创建幽灵marker、只更新held HUD、跨tick保留pair或返回旧View失败 |
| 10 | `strict-expiry-without-active-match-fails-closed` | PP1 Node | Expired未唯一命中active marker时不猜；只允许ready snapshot无Cue重建或空View/resync | 静默忽略strict expiry、按位置猜marker或保留可能过期marker失败 |
| 11 | `remaining-tick-599-600-601` | PP1 Node＋PP3 harness | +599 remaining=1/label=1且可见；+600无marker且1个expired Cue；+601无重复Cue | 显示可交互0、延长尾帧或用墙钟秒数失败 |
| 12 | `same-tick-expire-before-pickup` | PP1 Node | 同tick过期先提交，后续Pickup不得救回/产生Cue；post projection为空 | 按输入数组偶然顺序允许抢救失败 |
| 13 | `same-tick-recycle-before-replace-and-pickup-before-action` | PP1 Node | 稳定sequence证明Recycle→Replace→Pickup→Action，供给状态与post snapshot闭包 | adapter自己重排authority事件或忽略非供给事件造成sequence假连续失败 |
| 14 | `duplicate-identical-event-idempotent` | PP1 Node | ring内同ID/sequence/canonical payload重复只计duplicate，不改marker且不重播 | 仅按ID忽略但不核payload失败 |
| 15 | `duplicate-conflicting-event-fail-closed` | PP1 Node | ring内同ID或sequence的不同完整canonical event hash进入terminal failed；领域state不半提交、无View返回，只允许debug/destroy | 后到覆盖、先到赢、吞冲突或继续渲染旧View失败 |
| 16 | `event-older-than-recent-ring-never-applies-or-replays-one-shot` | PP1 Node | 64项窗口外旧sequence不应用、不重播，ready snapshot保持当前状态 | 因ID已驱逐把旧事件当新事件失败 |
| 17 | `sequence-gap-and-out-of-order-resync` | PP1 Node | duplicate过滤后的新事件必须精确覆盖`[previousNextExpected, postSnapshotEventSequence)`；gap/乱序不补播，ready无Cue重建，not-ready隐藏 | 跳过缺号继续、把snapshot sequence当最后事件、按数组排序掩盖错误或保留旧marker失败 |
| 18 | `missing-required-and-future-field-rejected` | PP0/PP1 Node | Marker/Cue/View/options/start/update/debug/payload各层missing/extra/future矩阵terminal fail且getter=0；领域hash不半提交、无View返回 | 只测顶层、接受可选字段或失败后继续使用实例失败 |
| 19 | `pause-resume-no-wall-clock-progress` | PP1 Node＋PP3 harness | pause期间同snapshot输出不变；后台恢复只按新authority tick更新 | RAF、Date、setTimeout或音频时长推进失败 |
| 20 | `30fps-terminal-state-exact` | PP3 harness＋A1 | 丢表现帧仍在+600首个可见终态移除；GPU/overdraw/内存/voice记录绑定build | 只用60FPS Node循环、允许尾帧或降正式质量失败 |
| 21 | `replay-forward-and-catch-up-no-double-one-shot` | PP1 Node＋PP3 harness | forward连续时各Cue一次；catch-up用snapshot重建且历史one-shot为0 | 把录像/回放事件全部补播失败 |
| 22 | `replay-seek-or-reset-starts-new-epoch-and-clears-ring-and-pending` | PP1 Node | 新adapter/stream先清ring/pending再从ready snapshot启动，无旧Cue或跨局ID冲突 | 原实例换streamId继续、保留pending或依赖同seed判断失败 |
| 23 | `asset-failure-accessible-fallback-does-not-pass-asset-gate` | PP3 harness＋A1 | 加载失败显示基础glyph/短文且语义可操作，但A1资产成熟度明确failed | 有fallback就把正式资产门写pass失败 |
| 24 | `reduced-motion-and-silent-equivalence` | PP3 harness＋A1/设备 | 同一View/Cue identity下静态视觉保留原因/倒计时，静音仅无声；权威和adapter hash相同 | 静音隐藏结果、低动效延长生命周期或另造状态失败 |
| 25 | `destroy-twice-no-live-resources` | PP1 Node＋PP3/A1 | adapter重复destroy幂等且destroy后debug标量计数全0；harness marker/particle/voice/listener/GPU/异步回调全0，首次宿主清理失败可重试 | 禁止destroy后恢复update；只证明adapter Map清空就冒充宿主资源通过失败 |

PP0/PP1实现候选必须先完成1–19、21–22和adapter部分25；PP3/A1再完成1、8、11、19–21、23–25的宿主证据，#22由PP1 Node闭门，PP3只允许增加可选seek/reset集成旁证而不能成为新的设备前置。任一fixture缺失、改名、合并后丢失独立断言或只给最终hash，
P1-PP总门保持`hardGate=false`。25项全绿也不能替代A0.3真人、A1.1最终source重建、PA6/PA7、coverage、三端预算和七目标设备记录。

#### P1-PP0 主协调独立签核（2026-08-03）

PP0 首次签核严格只新增 `packages/arena-presentation-contracts/src/arena-supply-presentation-contract.ts` 与 `tests/arena/presentation/arena-supply-presentation-adapter.test.ts`，当时未接共享 `index.ts`、未实现 adapter/ring/pair 状态机，也未修改权威、Runtime、Product、构建或美术文件。合同冻结 Marker/Cue/View/Options/Start/Update/Debug、六类供给/普通 equipment event、25 个 A1.0 fixture ID、四类 Cue、五态生命周期、四类 terminal failure、3/64 有界容量和 canonical event hash；输入只复制一次后从同一冻结树做 exact-key 校验，输出递归冻结。

初始红轮因合同模块不存在而 `ERR_MODULE_NOT_FOUND`；实现绿后，主协调发现并拒绝了两个真实问题：Update 从 raw input 二次复制 events 会形成 split-read/TOCTOU，equipment snapshot 只要求 `schemaVersion>=1` 会接受未来版本。修复后 Update 整根只捕获一次，descriptor 反证证明 events 只读一次，equipment snapshot 精确冻结为 v1。只读交叉审计又发现 Marker 曾独立硬编码 formal namespace、instance 命名和 600 tick，主协调裁决为“通用 Marker 只验证自身时序，P1 固定 Definition 值只在 Options＋Start/Update lifecycle/projection 闭包验证”；该第二权威已删除，五类 P1 Definition mismatch 仍失败关闭。失败轮和两次修复均保留，未用最终绿轮覆盖。

主协调在最终同源字节上独立执行：Node 合同矩阵 `13/13`、两文件 ESLint `0 warning`、`npm run typecheck:app`、`npm run check:documentation` 与 `git diff --check` 全绿；两个 untracked 文件的 `git diff --no-index --check` 仅以差异状态退出且无 whitespace 诊断。source/test SHA-256 分别为 `c0bf81b5bff8eb5407c7ed5b9121b0e1e8a181b4da5b7a73ddc6b446d76cc99a`、`0578212fd2a0b8c0f1483f8eb048d1cebfcb57e2031ccab8e257a311e1ca86aa`。静态依赖复核确认只依赖 `arena-contracts`，没有 MatchCore/Session/Product/Renderer/Three/DOM/平台、墙钟、随机、类实例或持久状态；没有运行构建、性能、ABBA、300/120、模拟器或设备。

PP1 红测随后暴露一个跨层矛盾：ADR 要求超过 64 条时不做逐事件审计而安全重同步，但 PP0 结构 validator 在第 65 条先行终止，PP1 无法实现该路径。主协调冻结 PP1 写入后，以最小合同修订新增独立 `MAX_RESYNC_EVENTS_PER_UPDATE=256`：0–64 条仍可逐事件处理，65–256 条只允许在任何 canonical hash/事件语义前整帧重同步，257 条起 `input-invalid`。修订后 PP0 `13/13`、定向合同包编译和 `git diff --check` 通过；合同 source SHA-256 更新为 `42ce6bcda78981effe41141ae5f0aa70642b8ff3c5dba72280e3788eaeaaae46`。同时由主协调把合同接入共享 `index.ts` 并定向刷新本地包产物，PP1 继续从包根消费；这不授权 PP2/PP3，也不是正式性能或发布构建。PP1 仍在追加同一测试文件，因此旧 test SHA 只保留为首次 PP0 签核身份，不冒充当前联合候选身份。

评分为 `95/100`：健壮性 `96`、竞态与确定性 `96`、兜底与失败关闭 `95`、边界与恶意输入 `96`、生命周期与清理合同 `94`、生产主流程阻断 `94`、变更治理 `96`。状态为 `completed / coordinator-approved / formalGate=false`；只开放 PP1 在预注册新文件中实现同步、无宿主、有界 adapter，不代表 A1.0-v2、PP2/PP3、设备、资产、正式性能、P1 advance、commit 或 push 通过。当前联合工作树为 188 路径 dirty；回滚必须按 PP0 合同、共享 index 导出与 PP1 候选的精确 hunk 分层执行，禁止粗粒度删除共享测试文件或覆盖其它线程改动。

#### P1-PP1 无宿主 adapter 联合门候选（2026-08-03）

开发 B 只新增 `packages/arena-presentation-runtime/src/arena-supply-presentation-adapter.ts` 并在 PP0 共用测试文件追加 PP1 矩阵；未修改 PP0、中央 index、package、Product、authority、美术文件或治理文档。adapter 公开面精确为 `constructor/start/update/getDebugSnapshot/destroy`，只持有 marker、64 项 canonical recent ring、最多 3 个 replacement pending pair、waterline、计数和生命周期；不持有 Renderer、Three、DOM、voice、VFX、GPU、平台、墙钟、Promise 或随机源。终止 Cue 只输出已提交 Marker 的稳定 identity，保持非空间；PP3 消费者只能使用上一份 committed Marker 定位，缺失时采用通用非空间 fallback，禁止从 instance ID 或当前 post projection 猜坐标。

开发自检先后保留了模块不存在红轮、包根 dist 未同步红轮、PP0 第 65 条结构阻断、Pickup 歧义误判 terminal、以及扩展矩阵 `50/51` 的不同 streamId 对照错误。修复后 64 条仍是逐事件语义上限；65–256 条在任何 canonical hash/事件模拟前直接 ready 无 Cue 重建或 not-ready 隐藏；257 条起由 PP0 `input-invalid`。ring 内相同 identity/hash 幂等，id 或 sequence 绑定不同 hash 才 terminal；gap、ring 外旧事件、strict identity 不可唯一恢复、replacement 缺对/反序均 snapshot-resync。同 stream waterline 回退拒绝，Replay seek/reset 必须新建 Adapter/new stream，不能把重同步当隐式 reset。

主协调在冻结同源上独立执行联合 Node 矩阵 `51/51`、目标 ESLint `0 warning`、`npm run typecheck:app`、Presentation contracts/runtime architecture 定向 `2/2`、`git diff --check`，全部通过。PP0/PP1/test SHA-256 分别为 `42ce6bcda78981effe41141ae5f0aa70642b8ff3c5dba72280e3788eaeaaae46`、`9e8b6102b9a7c4d18f31b4c8132f573425024fa37da62ead0d4a53e1396d6014`、`cefaa8e80b226f0a5ba726b970a01ed4d681a436d63b5c1fe0c0449b142d7270`。原子发布、Proxy 吞重入、冲突第二事件不半提交、not-ready 冲突优先、同 waterline 投影漂移、双重销毁和 failed-only-destroy 均有反证；未运行全量回归、build、正式性能、ABBA、300/120、模拟器或设备。

PP1 实现预评分为 `96/100`：架构边界 `20/20`、行为与可读性 `19/20`、生命周期与失败关闭 `15/15`、确定性与去重 `15/15`、设备与可访问性输入完备度 `12/15`、迁移与回滚 `10/10`、治理 `5/5`。状态严格为 `joint-gate-candidate / formalGate=false`：Node 只证明 adapter 语义，#20、#23、#24 不冒充 30 FPS 宿主、正式资产、静音/低动效或设备结果；只有 A1.0-v2 当前源码绑定包、双方自检和主协调联合复验通过后，才能把 PP1 改为 completed 并开放下一登记小门。

#### P1-PP1 + A1.0-v2 开发—美术联合签核（2026-08-03）

美术线程严格只新增 ADR-114 登记的三个 v2 文件，保留 v1 历史身份并使用 `game-art-director → media-asset-management → threejs-game-ui-designer / vfx-realtime / audio-design`。技能约束实际把 Node 合同、来源/hash、Cue 形状与时序、低动效、静音和资产失败 fallback 分开，未把诊断几何或通用提示冒充正式角色/武器/VFX/音频。v2 绑定 28 个非自引用当前来源和 25 个固定 fixture，PP0/PP1/test 身份与冻结候选一致；终止 Cue 不含 position，PP3a 只能从上一 committed View 用 `supplyId + equipmentInstanceId` 定位，否则非空间可访问 fallback 或安全隐藏。

主协调独立重跑 v2 正向 checker 得到 `28 sources / 25 fixtures / score=94 / hardGatePassed=false`；隔离 fail-closed 为 `1` 个先行正向基线加 `85/85` 个预期拒绝，覆盖 extra/missing/future、supersedes、hash/size/path/symlink/coherent substitution、fixture 缺失/重复/改名、Cue/回退、静音/低动效、下游门抬高和回滚弱化。两脚本 strict TypeScript、ESLint、全树 `git diff --check` 均通过。v2 JSON/checker/fail-closed SHA-256 分别为 `e357ea6330bd0f8bb1bda81d44d44749b4ed3b2fffb508555c066efd14db59ca`、`bfd7dd82a3b149c4af8af4f3fdbef38c0fb59ec3a81bc3323e66a434f2f385a2`、`ed6f941aa5bd5988324aae3bc7fa393c8ef5a5de7e6ce3c9765e0e1affba5722`。

联合裁决：P1-PP1 改为 `completed / coordinator-approved / 96/100 / formalGate=false`；A1.0-v2 改为 `current-source-contract coordinator-approved / 94/100 / hardGate=false`。机器包内部仍保持 `joint-gate-candidate` 与 `coordinatorSignOff=false`，因为它不能自签主协调结论；本节是外部联合签核记录，避免修改其必绑 ADR 后制造自引用。只开放 P1-PP2 与 P1-PP3a 的非性能实现，不开放 PP3b、A0.3、A1.1、代表样件、Blockout、正式 VFX/音频、浏览器/设备、PA6/PA7 正式性能、P2/A2、commit/push 或 P1 advance。

## 风险、回滚与签核

- 主要风险：后续 Composition 绕过 Registry；Core 只实现“先清空再赋值”的非原子替换；事件载荷和实际状态身份分叉；将生存 `pickupRadius` 静默推广为普通 1v1 全局策略；把合同测试误报为 Replay/hash 完成。
- 当前 B1 回滚点：`d750e4caa767332b5c3caaf247080b5717d56219`；只撤回 B1 章节列明的 contracts provenance、MatchCore/Runner/Session batch 接线、架构/定向测试和台账，即可回到本批父节点。此前 P1.1 的历史回滚点 `fb0bc40` 与 A0.1 保护关系保持在历史章节，不得以本批回滚误删已验收美术提交。本批没有存档、运行时状态或最终资产迁移。
- 当前签核：P1.1 `contract-ready`、P1.2a `core-transaction-ready`、P1.2b `timeline-ready`、P1.2c-1 `integration-replay-ready` 与 P1.2c-2 `atomic-checkpoint-golden-ready` 已由主协调签核（2026-07-28）；P1.2c-2 已提交并推送为 `5d26a4f`；P1 CPU 性能小门已签核并提交推送为 `21948d4`。Profile Definition/Registry foundation 已由主协调签核并提交推送为 `profile-registry-foundation-ready`（2026-07-29，`7e9e3c4`）；public projection + formal survival Composition Bot 接线已提交为 `f80307b`，A1.1 同步后父节点为 `2abd7f7`。正式 pressure 当前为 `formal-failed`，未签核；Performance-A/A1/A1.1/B1 保持未签核候选；B2 与 D0–D7 候选均不进入生产签核，B2 为已拒绝并撤回的历史候选。P1 总体受 coverage threshold、Douyin/WeChat 预算、CPU、Presentation、Platform与真机硬门阻断，不得 advance；4人P2不是P1硬门。
- 提交状态：当前 HEAD/实际父节点与安全回滚点为 `d750e4caa767332b5c3caaf247080b5717d56219`；B1 生产代码、测试、架构证据与台账尚未提交，B2 与 D0–D7 临时生产候选未进入工作树，仅保留治理记录。本批不包含美术文件，当前工作树没有美术 dirty；正式压力已执行但不建议当前 dirty 候选 commit/push，压力 formal gate、P1 总体、Presentation 与 Platform 均不得 advance。

## P1-Performance Architecture-1：PA 架构批次（PA0 文档固化）

### 当前状态与前置

- 本批以 ADR-111《Action Read Model 性能边界》为设计记录，状态严格为“提议：设计门已通过；实现与性能未验收”。本回合只完成 PA0 文档固化，不是生产实现、自动化通过、性能候选或 P1 advance。
- 固定前置是正式 `300/120` pressure 的 `executionPassed=true`、完整事件/边界/确定性/资源证据通过，唯一硬门 CPU P95 `0.2550948ms/tick` 红；D0–D7 均未落仓库且 no-go。预算仍为 `0.25ms/tick`，PA 性能候选目标提高为每个 ABBA 组 P95 `≤0.225ms/tick`、稳定回收 `≥30.1us/tick`、process CPU 同向。
- 实现顺序锁定为 `Rule → Core → Bot → Presentation → Runner/Governance → Platform`。PA0 不开放任何后续阶段；Platform、真机、4 人 P2、Presentation 现状和 P1 总体仍未完成。
- 当前审计基线/安全回滚点写作 `d750e4caa767332b5c3caaf247080b5717d56219 + 当前全部 dirty patch`，而不是可破坏未提交成果的粗粒度 reset。当前已有 B1 及其它未提交文件必须原样保留。

### PA0：文档固化（completed / 主协调设计签核通过）

- **允许文件**：仅 `docs/decisions/111-arena-v2-action-read-model-performance-boundary.md`、本台账和 `docs/product/arena-v2-document-index.md`。
- **前置**：正式 pressure 事实、D0–D7 失败记录、完整消费者矩阵和第二版设计审查意见已存在；本回合不重新测量。
- **实现标准**：ADR 明确 C+B+D 唯一候选、固定 profile 零参数 owner-bound reader、MatchReadFrameV2、Bot delay、Resolver multi-intent、完整 audit schedule、三类 parity、迁移退出点、PA0–PA8 门禁和精确回滚。
- **禁止项**：生产代码、测试、runner、golden、production plan、ADR-110、美术/Presentation 资产、性能实验和任何提交/推送。
- **行为映射**：只记录旧 full snapshot、Bot current self/delayed world、Presentation local primary/hold、`primaryActionDefinitionId` 与仅在 Rule/Core 内部执行的条件 display-primary fallback、四个独立 preview intent 与 authority 同算法的设计关系；没有向 public sidecar 暴露第五次 probe。正式生存的精确 `EquipmentDespawned` reason 是 `supply-lifecycle-expired-held-drop`。
- **测试与治理矩阵**：只运行 `npm run check:documentation` 与 `git diff --check`；不把文档检查当作 PA1–PA7 代码或性能证据。
- **失败关闭/生命周期**：文档明确 reader owner、tick/eventSequence/generation、destroy、pause/resume、ended winner-active、TOCTOU、unknown/accessor/Proxy/容器/cycle 与构造失败 ownership；实现尚未发生。
- **性能证据**：不新增测量；沿用正式 P95 红门与 D0–D7 no-go，P50/P99 不推算。
- **回滚点**：删除本次新增 ADR、撤销台账本次文档 hunk；索引本轮无需改动，不得 reset/checkout，不触碰既有 dirty。首版自评 `98/100` 未充分体现合同字段和身份语义缺口，本轮逐条修正后复评为 `96/100`（文档完整性 19/20、架构边界 20/20、行为/迁移 19/20、失败关闭/生命周期 15/15、确定性/证据 15/15、性能可证伪性 5/5、治理/回滚 3/5）；该分数仅是 PA0 文档自评，实现与性能验收仍为未完成硬门。

### PA0 主协调签核记录

- **状态**：`completed` / 主协调设计签核通过；该记录只说明 PA0 文档门通过。PA1 已在本台账后续章节记录为完成并独立签核，但仍未提交；本段保留 PA0 签核时的历史状态，当前 PA2a/PA2b 状态以台账顶部及其后续实现章节为准。
- **主协调评分**：`95/100`：架构边界 `19/20`、行为等价 `19/20`、生命周期/失败关闭 `14/15`、确定性/Replay `15/15`、性能可证伪 `14/15`、迁移/回滚 `9/10`、治理 `5/5`；每维均达到 80% 硬门，总分达到 90% 硬门。
- **证据**：ADR-111 两轮合同修订关闭；`npm run check:documentation` 通过（265 markdown / 839 links / 57 commands）；`git diff --check` 通过。
- **状态边界**：ADR-111 状态仍为“提议：设计门通过；实现与性能未验收”；PA1/PA1.1 已签核但不等于 PA6/正式性能通过。本段记录 PA0 签核时 PA2a 仅为合同候选、PA2b–PA8 尚未实现的历史状态；后续章节已记录 PA2a、PA2b、PA2c 及 PA2 总门完成签核，PA3–PA8、P1 总体、Presentation、Platform、真机和 4 人 P2 仍未完成/fail closed。

### PA 阶段公共评分与 advance 硬门

每个实现阶段都采用同一 100 分表：架构边界 20、行为等价 20、生命周期与失败关闭
15、确定性/Replay/hash 15、性能可证伪性 15、迁移/回滚 10、治理 5。阶段只能在总分
`≥90` 且每个维度达到该维度满分的 `80%` 后进入主协调验收；任一维度不足或硬门红，
状态保持 `candidate`/`formalGate=false`，不得以总分补足。以下是预审时的历史门禁快照；当前 PA1/PA1.1 与 PA2a/PA2b/PA2c/PA2 总门已按后续签核章节完成，PA3–PA8 仍为“未授权/未开始、未评分、不得 advance”，不能写成预计通过。

### PA1：Rule multi-intent（completed / 主协调独立签核通过）

- **允许文件/前置**：仅 `packages/arena-core` 的 Rule/Resolver/ActionAffordance 及其定向测试、架构规则；前置为 PA0 签核。不得先改 MatchCore 或表现层。
- **实现标准**：提取唯一 `evaluateCandidate`/decision-table；一次严格准备同 participant/tick 的 immutable context，四个规范 intent 仍独立求值，authority 与 preview 结果逐字段一致。
- **禁止项**：合并四个按键、缓存 authority outcome、跨 tick/runtime 缓存、复制冲突/资源/位置规则、降低 probe/审计覆盖或改变 RNG/事件。
- **行为映射**：primary、primaryHold、jump、slam 及 `canAct=false` 时 Rule/Core 内部 display-primary 求值保持现有 reason/lane/source、channels map key、顺序和拒绝边界；外部只发布旧合同已有的 `primaryActionDefinitionId`，普通 1v1 与 survival 都不改 authority。
- **测试矩阵**：空/重复/乱序候选、无装备/拾取/替换/掉落、expired-held、599/600/601、暂停恢复、淘汰、destroy、非法/陈旧 context、Proxy/accessor/额外键/Symbol/稀疏/跨 Core；authority/preview parity。
- **失败关闭/生命周期**：准备或 context 绑定失败必须在 history/RNG/InputFrame 前拒绝；重入、旧 tick、跨 participant、destroy 和异常均拒绝或完整回退。
- **性能证据**：只做与 baseline 同口径的 D/C 消融；报告 self/inclusive、调用次数和 GC，不把嵌套成本相加；未达到 PA6 门不得建议提交。
- **回滚点/评分**：只反向本阶段 Rule/test patch，保留 PA0 与其它 dirty；主协调独立评分见签核记录，未授权 PA2 生产实现或提交。

#### PA1 实现证据（已签核、未提交）

- **实现基线与保护**：实现审计基线为 `d750e4caa767332b5c3caaf247080b5717d56219` 加现有全部 dirty。开始前已保存 `/private/tmp/arena-pa1-before.patch`，包含开始时全部 tracked/untracked dirty，SHA-256 为 `9e6b110fa0b9b8804a9557b3fe38ebd10553a9b480134b1e07831ccffb163442`，大小 225090 bytes。不得用 reset/checkout 回滚。
- **实际改动边界**：PA1 只改动 `packages/arena-core/src/action-resolver.ts`、`packages/arena-core/src/action-affordance.ts` 与新增 `tests/arena/action-affordance-multi-intent.test.ts`；本台账是唯一治理文档改动。`arena-rule-engine.ts` 的 B1/expired-held dirty 未触碰；其余 contracts、MatchCore、Session、Bot、Product/Presentation、runner、golden、ADR-111、索引和其他 dirty 均不属于 PA1。
- **Rule 行为映射**：`ActionResolver.resolve(context)` 仍是公开唯一 authority 入口；新增的内部 `WeakMap` port 只绑定具体 Resolver 实例，不从 `arena-core` package index 导出。严格 descriptor-only snapshot 先验证 context、candidate 数组、intent 数组，再一次准备现有 `tick/participantId/canAct/candidates/occupiedLanes/activeConflictTags/Definition lookup`；四个 `primary/primaryHold/jump/slam` intent 各自独立调用同一 evaluator，不能合成同时按键。`canAct=false` 的 display-primary 仍只在 Rule/Core 内部条件求值，public affordance 仍只有原 channels 与 `primaryActionDefinitionId`。
- **失败关闭与原子性**：未知键、Symbol、accessor 与畸形/隐藏索引 Proxy、稀疏/额外数组键、重复/未知 candidate、非法 Definition、非法 lane/conflict/input 拒绝；合法数据描述符 Proxy 可保持接受且不触发 getter。`#resolvePreviewBatch` 先完成 intent 数组与全部 `cloneInput` 校验，再准备 context，因此第 N 个 intent 失败时 registry `require` 次数为 0、candidate cache 不写入，随后同 Resolver 合法调用可恢复。preview 不写 authority、RNG、事件、命令，不跨 tick/participant/runtime 复用 prepared context；candidate cache 仅接受外层数组与 entry 均已冻结的只读数据，避免把 mutable entry 误当 immutable。
- **确定性/兼容**：authority 多通道输入仍逐 channel 走同一 evaluator；独立 preview 不等同同时按键，因此 same-tick lane/conflict 语义不漂移。既有 reason/lane/source/candidateId/actionDefinitionId/inputChannel、稳定顺序、no-input 和 display identity 保持；普通 1v1 与 survival affordance 回归通过，未修改 Replay V5、authority state hash、InputFrame 或事件合同。
- **生命周期/重入**：port 的 WeakMap owner 是 Resolver 实例级；任一调用只消费本次严格快照，不暴露可复用 prepared capability。`Object.freeze` 结果及 resolution 数组为只读 plain data；异常不发布半成品。destroy/生命周期拒绝仍由上层 RuleEngine 边界负责，PA1 未扩大生命周期权威。

#### PA1 自动化与性能归因

| 门禁/证据 | 实际结果 |
|---|---|
| 定向 Node（ActionResolver、PA1 新测、RuleEngine、Movement、MatchCore movement/equipment） | `60/60` passed |
| 架构依赖 | `40/40` passed |
| `npm run build:packages` | exit 0，`packageCount=52`、`waveCount=11` |
| `npm run typecheck:app` | exit 0 |
| `npm run lint` | exit 0 |
| 文档检查 / diff check | 本次台账更新后运行，结果见本节末尾 |

新增定向测试覆盖：四 intent 与逐次 legacy resolve 逐字段等价、`canAct=false` display identity、不把独立 preview 当同时按键、固定 expected fixture、occupied lane 与 active conflict 的固定 reason/lane/identity、candidate 顺序置换、fallback/cooldown、accessor/畸形 Proxy 拒绝且合法数据描述符 Proxy getter 计数为 0、额外键/Symbol/稀疏/unknown/duplicate、batch 第 N 项失败时 registry `requireCalls=0` 后的合法重试、冻结 plain-data/result、子类/fake/copy/Proxy 无 port，以及递归 production source allowlist。既有 ActionResolver、affordance、普通 1v1 和 survival 相关测试继续通过。

PA1 归因实验只在 `/private/tmp/arena-pa1-affordance-abba.mts` 执行了真实 `ActionAffordanceProjector` 上下文的 3 轮 warmup、ABBA×3，4000 次 project/sample；不是正式性能门，也未运行 300/full。这里的 `sequential-reference` 是当前 PA1 新 `ActionResolver` 连续四次 `resolve` 的参考路径，不是 pre-PA1 旧源码基线；candidate 一次准备、四次独立 evaluate：

| 指标 | sequential-reference（当前 PA1 新 resolver） | candidate |
|---|---:|---:|
| 预期 context preparation / project | 4 | 1 |
| intent evaluation / project | 4 | 4 |
| `canAct=false` display evaluation / project | 1 | 1 |
| CPU P50 ms/project | 0.013559875（六样本中位数） | 0.01332575（六样本中位数，局部波动，未作为正式门） |
| CPU P95 ms/project | 0.02097325 | 0.01632775 |

完整 CPU 样本已保留在本回合输出：sequential-reference 为 `0.02097325/0.015661/0.0115335/0.0136695/0.01160425/0.01345025`，candidate 为 `0.01412825/0.012576/0.0125765/0.01632775/0.014075/0.0118905`。局部 P95 差约 `4.6455us/project`，但 candidate P50 未形成稳定 Session 级结论，且该实验不包含正式 Session/Runner CPU；因此只作为 PA1 局部归因证据，不能宣称 PA6 的 `≤0.225ms` 或正式 `≤0.25ms`。

#### PA1 pre-PA1 differential 与 malformed 分类

`/private/tmp/arena-pa1-pre-differential.mts` 从 `d750e4caa767332b5c3caaf247080b5717d56219` 的旧 `ActionResolver`/`ActionAffordanceProjector` 与当前实现分别构造实例；旧源码在独立临时目录，未改仓库。合法矩阵覆盖 ordinary 1v1、survival、`canAct=true/false`、primary/primary-hold/jump/jump-hold/slam/released、无按键、candidate 顺序置换、同优先级 id tie-break、occupied lane、命中 `activeConflictTags`、unavailable fallback、无可用 candidate。结果为 11 scenarios × 2 canAct × 7 inputs = 154 cases，resolve 与 affordance 共 308 artifacts，`308/308` 深值/顺序/冻结图一致；tie-break stability `4/4`，无合法差异。

malformed 共 10 项，均保留 old/new class、截短 message 和 getter 计数：`both-rejected-same-class=3`，`intentional-earlier-explicit-rejection=1`（sparse，旧/新均 TypeError 但新以明确数组结构消息更早拒绝），`intentional-earlier-fail-closed=4`（candidates/occupied/active 数组额外 own field 与 hidden index），`accepted-data-proxy-without-getter=2`（旧接受且触发 9 次 get，新接受但 0 次 get），`error-class-or-timing-difference=0`，`new-accepted-malformed=0`。因此未把旧/新同类失败省略，也未把严格边界硬化误报为合法语义漂移。

#### PA1 自审与评分

| 维度 | 得分 | 自审结论 |
|---|---:|---|
| 架构边界 | 19/20 | Rule 内部 port 未进入 package public index；只有 `action-affordance.ts` 消费、`action-resolver.ts` 定义，递归 production source allowlist 通过；仅精确 `ActionResolver` 实例注册，子类/fake/copy/proxy 走 fallback，未让 Bot/Presentation 依赖 Core。 |
| 行为等价 | 19/20 | 四个独立 intent、display fallback、authority 多通道冲突与 legacy resolve 逐字段回归通过。 |
| 生命周期/失败关闭 | 15/15 | descriptor-only、Proxy 零 getter、N 项失败前 `requireCalls=0`、无 cache 写入、后续恢复、identity drift 和子类 fallback 通过；上层 destroy 语义保持由既有 RuleEngine 边界负责。 |
| 确定性/Replay/hash | 15/15 | 未改变 authority 输入、事件、Replay V5、state hash；稳定排序与 Definition lookup 保持。 |
| 性能可证伪性 | 12/15 | 有真实 projector ABBA 归因和完整样本，但非 Session 级且 P50 不稳定，故不把局部收益当正式门。 |
| 迁移/回滚 | 9/10 | 只反向三项 PA1 patch，`arena-rule-engine.ts` 及其他 dirty 由 before patch 保护；待主协调验收。 |
| 治理 | 5/5 | 台账单列实现/自动化/归因/签核边界，PA2 仍未授权。 |
| **此前自评合计** | **94/100** | 每维达到 80%；这是提交主协调前的自评，不替代主协调评分。 |

未完成/风险：PA1 尚未做 PA6 前 20 ABBA×3、正式 300、完整回归或 Session 级性能结论；PA2 Core read-model、Bot/Presentation/Platform、Coverage、Douyin/WeChat、300-case Bot stress、真机和 4 人 P2 均保持未完成/fail closed。精确回滚仅撤销上述两个生产文件与新增定向测试的 PA1 hunks，并保留 `/private/tmp/arena-pa1-before.patch` 作为保护证据；禁止粗粒度 reset/checkout。

#### PA1 主协调独立签核记录（2026-07-29）

- **状态**：`completed`；该签核只覆盖 Rule multi-intent 小门，不表示 PA1 性能完成、PA6 通过、P1 advance 或 PA2 已实现。
- **独立证据**：pre-PA1 临时镜像中的两个源文件 SHA-256 与 HEAD `d750e4caa767332b5c3caaf247080b5717d56219` 对应 git blob 完全一致；differential 为 `154` 个合法 case、`308` 个 artifacts 全等，tie-break `4/4`，`10` 个 malformed case 均有分类；定向 Node `60/60`、architecture `40/40`；`npm run build:packages` 为 `52 packages / 11 waves`；`npm run typecheck:app`、`npm run lint`、`npm run check:documentation`、`git diff --check` 全绿；无未解决代码发现。
- **主协调评分**：`96/100`：架构边界 `19/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、性能可证伪性 `12/15`、迁移 `10/10`、治理 `5/5`。每维均达到 80% 硬门，但该分数只签 PA1；正式 CPU、PA6、P1 总体仍红/未完成。
- **提交边界**：暂不 commit/push。原因是 ADR-111/本台账要求以 PA6 端到端 `readStep` 与正式门形成可提交证据；当前共享工作树还包含其它未提交阶段成果，不能拆出不完整治理提交。PA1 生产/测试 hunk 继续保留，不能用粗粒度 reset/checkout 清理。

### PA2：Core contracts/readers/read frame

- **允许文件/前置**：`arena-contracts`、`arena-match`/MatchCore、受限 Core 边界测试、架构规则；前置为 PA1 主协调签核及另行通过的 PA1.1 fixed-profile-rule-projection。不得连接 Bot/Product 主路径。
- **实现标准**：PA2 只引入独立 `MatchReadFrameV2.schemaVersion=2`、sidecar V2、固定 profile、零参数、owner-bound reader；绑定具体 Core、经 Core 创建并验证的 composition/content binding、participant、lifecycle generation，read 时身份由闭包/owner record 提供。`measurementSchemaVersion=2` 不属于 PA2 合同或实现，仅作为 PA5 formal report 门禁保留。同一个 reader 可跨 match tick 读取新 memo，但旧 sidecar 不得冒充新 tick；正式 LocalMatchSession/Product 的 `localActionSidecar` 非 nullable。
- **禁止项**：MatchCore 直接依赖 Bot/Presentation；任何调用方传 tick/eventSequence/participant/channel；concrete cast、公开 mark、用 Proxy/冻结对象伪造 capability；改变 ArenaMatchSnapshot/internal hash。输入数据的 Proxy 规则沿用 PA1：accessor/畸形/隐藏索引 Proxy 拒绝，合法 data-descriptor Proxy 可接受但 getter 必须为 0。
- **行为映射**：world 与 local/Bot sidecar 字段级定义成立；paused/resume 未推进可复用真实 authority identity；ended 按旧 ParticipantSystem 逐 participant 重组，不假设全 `canAct=false`。
- **测试矩阵**：初始、正常 t→t+1、paused/ended 同一 identity 重复读取 memo、pause/resume 不改变 identity、下一 tick 同一 reader 读取新结果且旧 sidecar 被拒、ended winner-active/淘汰者、destroy、step 中读取、跨 Core、构造失败、重复 participant/profile 绑定（无 replacement API）、有界 memo、零参数额外参数拒绝、reader 重入与所有容器/访问器/cycle/稀疏/未知字段负向；full recomposition 比较 legacy public 的全部四通道 outcome 字段（`kind/actionDefinitionId/lane/source/reason`）以及 `primaryActionDefinitionId`，display-primary 的完整内部 outcome 不公开且不直接比较，只对其最终生成的 public `primaryActionDefinitionId` 做 differential。
- **失败关闭/生命周期**：authority 写入中、非法生命周期转换、非有限 tick、过期 result、generation/eventSequence/owner 不一致和异常不得发布半 frame；稳定 paused/ended identity 可重复读；PA2 构造失败只清理本阶段自己创建的 binding/reader/frame 候选，不接管或销毁调用方 Core、外层 composition 或 Bot；PA3+ 的 Session 资源治理另行验收。
- **性能证据**：PA2 只测 private reader/frame 分段；PA5 才定义 readStep 计时与 fixed full-audit schedule，不在 PA2 把查询移出未来正式计时口径。
- **回滚点/评分**：只反向 contracts/Core/reader/read-frame patch，保留 PA1；不使用 reset/checkout；未开始，评分不作候选。

#### PA2 文件级预审与实现边界（历史预审记录；PA2a/b/c 已完成签核）

本节是 PA1 签核后的文件级审计与后续边界记录；其余候选描述保留为当时的预审快照，最终 PA2a/b/c 签核见后续章节。审计结论有一个已由 PA1.1 关闭、但不得回流的前置：当前 Core 不能把 full affordance 生成后再裁剪写成 PA2 方案。

##### 现有写入者、读取者与身份来源

| 边界 | 当前真实行为 | 身份与生命周期 | PA2 约束 |
|---|---|---|---|
| `packages/arena-match/src/match-core.ts` `#createSnapshot(false)` | 每个 participant 调 `#ruleEngine.getActionAffordance(...)`；结果放入 legacy public `ArenaParticipantSnapshot.actionAffordance`，不是 authority/hash 字段 | `tick` 来自 `MatchTimelineSystem`，`eventSequence` 由 MatchCore 唯一递增，`phase` 来自 timeline；`#publicSnapshotCache` 以当前 Core 实例内的 tick/eventSequence/phase 命中 | V2 world frame 不再为每个 participant 强制携带 generic actionAffordance；legacy full snapshot 只保留迁移/full-audit allowlist |
| `packages/arena-core/src/arena-rule-engine.ts` `getActionAffordance` | 严格校验 options 后 `#cloneActors`、`requireActorById`、`cloneAdditionalCandidates`、读取 constraints，再调用 `ActionAffordanceProjector.project` | `tick/participantId` 是调用 options；RuleEngine 自己持有 Registry、equipment/movement candidates 和 resolver | legacy 方法行为不变；新增 fixed profile 入口必须仍由 RuleEngine 组装规则输入 |
| `packages/arena-core/src/action-affordance.ts` / `action-resolver.ts` | PA1 projector 对 `primary`、`primaryHold`、`jump`、`slam` 四个独立 intent 求值；`canAct=false` 另做内部 display-primary 求值 | projector 校验输出身份与 options 一致；PA1 preview port 只属于精确 `ActionResolver` 实例 | MatchCore 不得 deep-import `getActionResolverPreviewPort`；selected profile 必须在 arena-core Rule 边界完成，不得由 Core/Bot 复制 Resolver 规则 |
| `packages/arena-contracts/src/match-snapshot.ts` | `ArenaMatchSnapshotAudit` 严格校验 legacy schema；public participant 当前允许 `actionAffordance`，internal snapshot 明确排除它 | snapshot 的 `schemaVersion` 与 internal state/hash 仍是现有合同 | 不 bump legacy schema 代替迁移；新增独立 read-frame schema |
| `packages/arena-session/src/local-match-session.ts` | `step` 运行时读取 pre/post Core snapshot；Bot 当前从受限 snapshot 生成 InputFrame，Runner 再推进 Core；paused 返回当前 snapshot | Core 在 `#stepping` 时拒绝 snapshot；成功 step 后缓存按真实 tick/eventSequence/phase 更新 | 该调用者留到 PA4/PA5；PA2 不改 Session 主 step/readStep，不在 callback 内回读半 tick |
| `packages/arena-bot/src/bot-observation.ts`、`bot-mobility-policy.ts` | 读取 snapshot 中 Bot self/current 与 delayed world，mobility 从 `actionAffordance.channels` 读取 jump/slam | Bot 只能消费受限观察并输出 InputFrame；不能持有 Core/Session | PA3 才接 `bot-mobility` sidecar；当前读取事实不能冒充 PA2 已迁移 |
| `arena-presentation-runtime`、`arena-product-presentation`、`arena-product-match` | InputMapper/表现层读取 local primary/primaryHold 与 public snapshot；产品层转发 snapshot | 表现层不参与裁决；InputMapper 有连续按压和 tick/participant 校验 | PA4 才迁移 local sidecar；PA2 不改 Presentation/Platform |

##### selected-profile 性能缺口与 PA1.1 前置

当前调用链是：`MatchCore.#createSnapshot` → 每个 participant 的
`ArenaRuleEngine.getActionAffordance` → `#cloneActors`/`cloneAdditionalCandidates`/constraints
→ `ActionAffordanceProjector.project` → PA1 `ActionResolver` preview → 四个独立 probe（`canAct=false`
时再做 display probe）。因此正式 2 人每次 legacy public snapshot 至少做两次 full projection，
通常为 8 次 intent evaluation，另加不可行动 participant 的 display evaluation；Bot 再裁剪
已经生成的 full 结果不能实现 ADR-111 的 C 边界。

这不是“contracts + arena-match”即可解决的缺口。已按该设计开设独立的
`PA1.1 fixed-profile-rule-projection` 小门已由主协调签核，作为 PA2a 前置；其实现与签核证据见上节：

- **精确窄 API（候选形状）**：在 `ArenaRuleEngine` 的现有 Rule 边界增加闭合集合
  `"local-context-primary" | "bot-mobility" | "full-audit"` 的
  `getActionAffordanceProfile(options, profile)`（或三个等价固定方法）。调用方只能选择这三种
  profile，不能传任意 `channels` 数组；options 仍按既有 Rule 输入严格快照，不能由 Bot/Presentation
  提供 trusted actors/candidates。
- **结果形状**：`full-audit` 返回现有完整 `ActionAffordance`；`local-context-primary` 只返回
  `tick/participantId/primary/primaryHold/primaryActionDefinitionId`，并按旧 canAct/display
  语义条件求值；`bot-mobility` 只返回 `tick/participantId/jump/slam`。三者都返回 plain-data、
  递归冻结结果，不能暴露 Resolver、prepared context 或 authority 引用。
- **算法边界**：projector 在准备前按固定 profile 选择 probe 集合，使用 PA1 的同一 prepared
  context/evaluator 逐 intent 独立求值；不能先 full 再 crop，不能把四个 intent 合并成同时按键，
  不能缓存裁决结果。`full-audit` 继续保留四通道和条件 display，用于 legacy differential 与
  固定 audit schedule。
- **文件与治理**：PA1.1 只允许
  `packages/arena-core/src/action-affordance.ts`、`arena-rule-engine.ts` 的 Rule contract/实现、
  必要的 `packages/arena-core/src/index.ts` runtime/type 出口，以及专门 Rule/Projector 测试和
  architecture allowlist。为满足 bot 不执行 display evaluation，已在既有 module-private port
  增加不带 profile 字符串的 `resolveWithoutDisplay(context, intents)`；旧 `resolve` 语义不变，
  `getActionResolverPreviewPort` 仍不进 package
  exports，MatchCore 只能调用 RuleEngine profile contract，不能 deep-import 或 `instanceof`
  concrete resolver。
- **PA1.1 硬测试**：四通道 full 与旧输出逐字段等价；local 只执行 primary/primaryHold（含条件
  display identity）、bot 只执行 jump/slam；计数证明没有 full→crop；普通 1v1/survival
  authority/InputFrame/events/hash/Replay 不漂移；可观察 extra key、Symbol、accessor、descriptor
  不一致/畸形 Proxy 拒绝，数组 hidden index 因 length/descriptor 审计拒绝，合法 data-descriptor
  Proxy 接受且 getter=0；不可观测 configurable 隐藏字段不宣称可检测，只保证不进入快照、不影响结果。
  unknown/duplicate 失败关闭；错误 profile 或畸形 options 必须在任何 resolver prepare/evaluate
  前拒绝，并用调用计数证明为 0，随后合法 profile 可正常恢复；bot 的 without-display port 必须
  返回精确两个结果且 display 为 null。stale/owner/history/RNG 归入
  PA2b/PA3，不在 PA1.1 冒充覆盖。未通过前 PA2a 不可开始。

##### PA1.1 已签核实现与自动化证据

- **实现边界**：仅修改 `action-affordance.ts`、`action-resolver.ts`、`arena-rule-engine.ts`、
  `arena-core/src/index.ts` 和新增 `tests/arena/action-affordance-fixed-profile.test.ts`；没有修改
  contracts、MatchCore、Session、Bot、Product/Presentation、runner、golden、ADR 或索引。旧
  `ActionResolver.resolve(context)` 和既有 preview `resolve(context,intents)` 保持语义；新增
  `resolveWithoutDisplay(context,intents)` 只在精确 ActionResolver module-private capability
  上可用，未进入 package exports。PA1/B1/expired-held 既有 dirty 继续保留。
- **profile 行为**：RuleEngine 只接受三个标量 profile：`local-context-primary` 求值
  `primary/primaryHold`，必要时按旧语义求 display identity；`bot-mobility` 只求 `jump/slam`
  并使用 without-display，`canAct=false` 也不执行 display evaluator；`full-audit` 继续四个
  独立 intent 与旧 display 语义。没有 full→crop、同时按键合并、裁决结果缓存或 authority/RNG/
  event 写入。结果均为精确 plain-data、递归冻结结构；固定 profile runtime 常量与类型均由
  `arena-core` index 一致导出。
- **失败关闭/TOCTOU**：profile 先做安全类型标签校验，不对对象执行 `String`/`toString`/Symbol
  coercion；RuleEngine 顶层 options 先从 own data descriptors 建立冻结浅层快照，再进行 tick、
  actor、candidate 与 constraints 读取。可观察 extra key、Symbol、accessor、descriptor 不一致或
  畸形 Proxy 在 Resolver prepare/evaluate 前拒绝；数组 hidden index 因 length/descriptor 审计拒绝，
  合法 data-descriptor Proxy 接受且 getter=0。不可观测的 configurable 隐藏字段不宣称可检测，只保证
  它们不进入快照、不影响裁决。without-display 与 legacy preview 均先完整校验 intents 再准备一次
  context，第 N 项失败时 `requireCalls=0`，后续合法调用恢复。
- **定向证据**：PA1.1 专用测试与 PA1 multi-intent 合计 `24/24` 通过；受影响 Resolver/Rule/
  Movement/MatchCore equipment/movement 定向集合 `70/70`；architecture `40/40`；ordinary 与
  survival golden/供给/checkpoint/Replay V5 相关集合 `24/24`。pre-PA1 临时 differential 以
  `d750e4caa767332b5c3caaf247080b5717d56219` 为旧源码基线，`154` legal cases / `308` artifacts
  全等，tie-break `4/4`，malformed `10` 项分类为 same-class `3`、earlier explicit rejection `1`、
  earlier fail-closed `4`、accepted data Proxy getter=0 `2`，合法差异 `0`。
- **门禁状态**：packages build `52/11`、`typecheck:app`、lint 均通过；本候选尚未运行正式性能、
  formal 300 或 PA6，不能宣称 CPU 门、P1 或 PA2 完成。提交仍需主协调独立验收与授权。

##### PA1.1 候选自审与评分

- **健壮性/主流程**：profile 选择发生在 RuleEngine 读取并组装既有规则输入之后，legacy full 路径
  保持；没有把 profile 接入 MatchCore/Bot 主流程，因此不会阻断现有普通 1v1 或 survival 主流程。
- **竞态/TOCTOU/原子性**：RuleEngine 顶层 options 先做 own data descriptor snapshot；Resolver 两个
  preview 入口共用“全部 intent 校验→一次 prepare→独立 evaluation”，第 N 项失败不写 registry/cache，
  不发布半 affordance；without-display 不通过伪造 `canAct` 绕过规则。
- **兜底与边界**：精确 ActionResolver 使用 opaque `resolveWithoutDisplay`；子类、fake、copy、Proxy
  无 port，仍走 custom resolver fallback。profile 不是任意 channels 对象；非法 profile、可观察 extra
  key、Symbol、accessor、descriptor 不一致/畸形 Proxy、数组 hidden index、稀疏数组和身份不一致均
  fail closed。合法 data-descriptor Proxy 保持接受且不触发 getter；不可观测 configurable 隐藏字段
  不进入快照且不影响结果，不宣称能被语言层检测。
- **生命周期/资源**：PA1.1 只生成短生命周期 frozen plain-data projection，不引入新的 authority、
  history、RNG、owner 或 destroy 语义；这些仍留给 PA2/PA3。当前读模型能力未接入 Session，故不冒充
  端到端生命周期完成。
- **确定性/兼容**：legacy/full pre-PA1 differential `308/308` 全等；ordinary/survival 既有
  Replay V5、events、InputFrame、checkpoint/final hash 相关测试通过。PA1.1 未改变 authority hash
  合同或 Replay 字节。

| 维度 | 满分 | PA1.1 自评分 | 结论 |
|---|---:|---:|---|
| 架构边界 | 20 | 19 | fixed profile 留在 Rule；Resolver port 不进 package exports，Match/Bot/Presentation 未依赖 |
| 行为等价 | 20 | 19 | legacy/full 与旧源码 308 artifacts 全等；selected profile 字段与 full 对照通过 |
| 生命周期/失败关闭 | 15 | 15 | 两个 preview 入口先校验再 prepare，身份/Proxy/非法 profile 与后续恢复通过 |
| 确定性/Replay/hash | 15 | 15 | 既有 ordinary/survival 回归和 Replay/checkpoint/hash 通过，未改 authority 合同 |
| 性能可证伪 | 15 | 12 | bot without-display 的局部次数/归因成立，但未做 Session/PA6 CPU 门 |
| 迁移/回滚 | 10 | 10 | 仅窄扩围；Resolver/测试保护在 `/private/tmp/arena-pa1.1-resolver-before.*`，不使用 reset/checkout |
| 治理 | 5 | 5 | 台账、文档、diff 门禁通过；PA2/正式门仍明确未完成 |
| **合计** | **100** | **95** | 每维≥80、总分≥90；仅为候选自审，不替代主协调验收 |

**PA1.1 当前结论**：`completed / formalGate=false / 主协调已签核（2026-07-30）`。本小门仍未
commit/push；该签核只允许进入 PA2a，不代表正式 CPU、P1 总体、Bot/Presentation/Platform、真机或
4 人 P2 完成。

#### PA1.1 主协调独立签核（2026-07-30）

- **状态与评分**：`completed`，主协调评分 `96/100`：架构边界 `19/20`、行为等价 `20/20`、
  生命周期/失败关闭 `15/15`、确定性/Replay/hash `15/15`、性能可证伪 `12/15`、迁移/回滚
  `10/10`、治理 `5/5`；每维均达到 80% 硬门。扣分只因 Session/PA6/正式 CPU 尚未发生。
- **独立证据**：`/private/tmp/arena-pa11-audit.v18crJ` 重建并核对 pre-PA1.1 文件 hash；逐 hunk
  审查 fixed profile、without-display、Rule snapshot；受影响与架构独立集合 `132/132`；PA1.1
  专用 `24/24`；`build:packages` 为 `52 packages / 11 waves`；`typecheck:app`、lint、docs、
  diff 全绿。该证据不包含正式 300 或 PA6 CPU 通过。
- **提交边界**：仍不 commit/push。共享工作树包含其它未提交阶段成果，PA1.1 不拆出不完整治理
  提交；PA2a 需另行按允许文件验收，PA2b/c 不得提前开始。

#### PA2a contracts 实现候选（2026-07-30）

- **状态/范围**：`contract-candidate / formalGate=false / awaiting-coordinator-review`。本小门只
  冻结独立 `MatchReadFrameV2`、world/sidecar 数据合同、昂贵边界 audit/normalizer 与 survival
  projection require helper；不构造 owner-bound reader，不实现 memo/generation/read()，不接
  MatchCore、Session、Bot、Product/Presentation、Replay/hash、runner 或性能链。
- **编辑前保护**：HEAD=`d750e4caa767332b5c3caaf247080b5717d56219`；完整状态和指定 dirty diff
  已保存至 `/private/tmp/arena-pa2a-before.status`、`/private/tmp/arena-pa2a-before.head`、
  `/private/tmp/arena-pa2a-before.sha256`、`/private/tmp/arena-pa2a-before.contracts-index.diff`、
  `/private/tmp/arena-pa2a-before.ledger.diff`、`/private/tmp/arena-pa2a-before.architecture.diff`。
  三个保护 hash 分别为：contracts index `5b1015b1...7bb2344`、ledger
  `4b18f0a9...782cdea`、architecture test `6a9161f6...60c351c`。现有 PA1/B1/expired-held 与
  其它 dirty 未 reset/checkout，未覆盖。
- **文件边界**：新增 `packages/arena-contracts/src/match-read-frame-v2.ts`；仅在
  `packages/arena-contracts/src/index.ts` 增加该合同的类型/运行时出口；新增
  `tests/arena/match-read-frame-v2-contract.test.ts`；在 `tests/architecture.test.ts` 增加
  hot-path 禁依赖 audit 扫描。未修改其它 production、测试、ADR、索引、golden 或 plan 文件。
- **合同落点**：`MATCH_READ_FRAME_V2_SCHEMA_VERSION=2` 与三个闭合 profile；
  `ActionAffordanceViewV2` 只有 `kind/actionDefinitionId/lane/source/reason`，lane 为
  `string|null`；`WorldSnapshotV2.authoritySchemaVersion` 映射 legacy 根 schema，不伪造为 2，
  participant 为 legacy participant 去掉 generic `actionAffordance`，active supply 为
  `null | 完整 projection`；local/bot/full sidecar 的 schema、tick、eventSequence、participant、
  profile、精确 channels 与 local `primaryActionDefinitionId` 均锁定，frame local sidecar 非 nullable。
  未引入 `measurementSchemaVersion`、owner record、reader/capability、replacement、generation 或
  `read()`。
- **严格 audit**：`createWorldSnapshotV2Audit`、三个 sidecar audit 与
  `createMatchReadFrameV2Audit` 先 `cloneFrozenData`，再做精确 keys、必填字段、跨字段 identity、
  hash/整数/participant/equipment/map/result/outcome 校验，返回递归冻结 plain data；authority、
  movement、equipment、map schema 均为安全整数且至少为 1，phase 只允许
  `preparing/running/sudden-death/ended`，result 与 phase、winner/isDraw、endedAtTick 与 world.tick
  交叉校验；`lastHitBy` 必须引用现有 participant，held equipment 与 participant.equipment
  双向一一对应并逐字段核对 instance/definition/cooldown，locationState 只允许
  `spawned/held/dropped/despawned`。合法
  data-descriptor Proxy 接受且 getter=0，可观察 extra/Symbol/accessor/descriptor mismatch、
  畸形/隐藏索引 Proxy、稀疏/额外数组键、Map/Set/Date/typed array/cycle/non-finite/future 字段
  fail closed。不可观测 configurable 隐藏字段不宣称可检测，只保证不进入快照、不影响结果。
  sidecar 的 public world 参数类型为 `unknown`，先严格 audit 再做 tick/eventSequence/participant
  identity；frame 内部的 sidecar identity 对照复用第二次严格审计后的 world，但昂贵 frame audit
  当前先 clone 完整 frame、随后再次 clone world，存在额外 world clone，明确不属于 hot-path 优化。
  `requireArenaSurvivalSupplyProjectionV2`
  只接受一个 worldValue，从已审 world 派生 projection，明确拒绝 null/缺失，不允许调用方自报
  tick、eventSequence 或 equipment；普通 1v1 的 null 仍由 world 合同允许。
- **独立审查拒绝与修订**：首轮候选被主协调以真实 ordinary snapshot 转 V2 的负向复现拒绝：
  authority/movement/map schema=0、未知 `lastHitBy`、phase/result 与 draw/winner 不一致、未知
  equipment location、held runtime 与 participant 指针/冷却不一致均曾被接受；sidecar 还曾直接
  读取未审 world getter，survival require 允许调用方自报身份参数。本轮在同一 PA2a 文件边界内
  补上上述 schema/phase/身份/生命周期双向校验，改为 sidecar `unknown` 严格边界，并收紧单参数
  world-derived require；状态仍为 `contract-candidate`，这些修订未获签核。
- **第二轮独立拒绝与修订**：主协调进一步复核发现 `none`/`ignored` outcome 的部分身份字段、
  `primaryActionDefinitionId` 与 primary outcome 的不一致组合仍可被接受；本轮仅在合同 audit 与
  dedicated test 内收紧为 none 全空、selected 全满、ignored 全空或全满，并锁定 primary identity
  与 canAct=false display fallback 的合法边界。状态继续保持 `contract-candidate / formalGate=false`，
  不进入 PA2b。
- **架构/性能边界**：architecture 扫描禁止 arena-core、arena-match、arena-session、arena-bot、
  `arena-product-match`、`arena-product-session`、`arena-product-presentation`、
  `arena-presentation-runtime`（目录存在时）生产源码引用这些昂贵 audit；本批没有生产 hot-path
 调用，不能把 audit 可用写成 PA2c frame
  已接线，也不产生任何性能通过证据。
- **测试证据**：PA2a 专用合同测试 `15/15`，连同既有 contracts/input-frame 定向为 `18/18`；覆盖 ordinary null supply、完整 supply、local/bot/full exact
  channels、frame identity、递归 freeze/source 隔离、selected outcome、future/owner/profile/
  channel、accessor/data Proxy getter=0/descriptor mismatch、container/cycle/sparse/Symbol/
  non-finite、hash/seed/tick、schema 下界、phase/result、lastHitBy、locationState、held 双向
  instance/definition/cooldown、duplicate/winner、survival null require 与失败后恢复。PA2a 只需
  证明合同边界，不冒充 PA2b/c、PA3/PA4 或正式 300/CPU。
- **实际门禁**：本轮修订后专用合同/既有 contracts-input 定向为 `18/18`，architecture 为
  `41/41`，`build:packages` 为 `52 packages / 11 waves`，`typecheck:app`、lint、docs 与
  `git diff --check` 通过；这些只证明 PA2a 合同候选，不代表 PA2b/c、正式性能或 P1 通过。
  未运行 formal 300、性能实验或模拟器。
- **失败关闭/生命周期**：audit 只产生局部候选，不接管或销毁调用方 Core/外层 composition/Bot；
  任一字段/身份/容器失败不返回半 frame，后续合法 audit 可重新构造，无跨调用状态、memo、owner
  或异步重入语义。
- **精确回滚**：删除 `match-read-frame-v2.ts`、对应 index export、专用合同测试、architecture
  audit 扫描与本 PA2a ledger hunk 的反向 patch；保留 PA1 及其它 dirty，不使用 reset/checkout。

##### PA2a 自审与候选评分（待主协调验收）

| 维度 | 满分 | 自评分 | 结论 |
|---|---:|---:|---|
| 架构边界 | 20 | 19 | 只新增 contracts 合同；audit 明确禁止进入 Core/Session/Bot hot path |
| 合同精确性 | 20 | 19 | V2 root/sidecar/profile/channel、legacy authority schema 映射与 null supply 边界已锁定 |
| 生命周期/失败关闭 | 15 | 14 | 纯审计候选无权威资源；未知字段、身份、容器、重入输入均 fail closed |
| 确定性/Replay/hash | 15 | 14 | 不修改 Replay/hash；hash/整数/排序和 source 隔离已测试，端到端重组留后续 |
| 性能可证伪 | 15 | 14 | audit 是显式昂贵边界且架构禁入 hot path；尚无 PA5 readStep 证据 |
| 迁移/回滚 | 10 | 9 | 新文件与最小 index/test hunk 可独立反向，保护当前 dirty |
| 治理 | 5 | 5 | 文件、禁止项、证据与 PA2b/c 边界单列 |
| **合计** | **100** | **94** | 每维≥80、总分≥90；仅为候选自审，不替代主协调验收 |

**PA2a 当前结论**：`contract-candidate / formalGate=false`。PA2b owner-bound readers、PA2c
read-frame composition、PA3 Bot、PA4 Presentation、PA5 legacy 退出/runner、PA6 CPU 与 P1 总体
均未完成，不得 advance；本批不 commit/push。

#### PA2a 主协调独立签核（2026-07-30）

- **状态与评分**：`completed / coordinator-approved / formalGate=false`；主协调评分 `95/100`：架构边界 `19/20`、合同精确性 `20/20`、生命周期/失败关闭 `14/15`、确定性 `14/15`、性能可证伪 `14/15`、迁移/回滚 `9/10`、治理 `5/5`。这只签 PA2a contracts，不代表 PA2b/c、性能、P1、commit/push 或 P1 advance。
- **独立证据**：真实 Core 快照的 10 个旧反例全部从 `ACCEPTED` 修为 `REJECTED`，合法 world 通过；新增 4 个不可能 outcome/primary 反例全部拒绝；专用 Node 与 contracts/input `18/18`、`arena-contracts` Vitest `12/12`、architecture `41/41`、`build:packages` `52 packages / 11 waves`、typecheck/lint/docs/diff 全绿。PA2a 仍是昂贵合同 audit/normalizer，未进入 Core hot path。
- **边界**：PA2b owner-bound readers 仅在本次另行授权后实施；PA2c read-frame composition、Session/Bot/Product/Presentation、runner/golden/perf 继续 fail closed。

##### PA2b owner-bound readers 实现候选（2026-07-30）

- **状态/范围**：`core-reader-candidate / formalGate=false / awaiting-coordinator-review`。本小门只新增 `packages/arena-match/src/match-read-port.ts`，在 `MatchCore` 增加 owner-port、单次 binding 与 Core-bound reader 的最小接线，新增 dedicated PA2b Node 测试和一条 architecture allowlist；未开始 PA2c，未接入 Session 主路径、Bot、Product/Presentation、runner、Replay/hash、golden 或性能。
- **编辑前保护**：HEAD=`d750e4caa767332b5c3caaf247080b5717d56219`；`match-core.ts`、`arena-match/src/index.ts`、`tests/architecture.test.ts` 与本台账的完整 dirty diff/SHA-256 已保存至 `/private/tmp/arena-pa2b-before.head`、`arena-pa2b-before.status`、`arena-pa2b-before.dirty.diff`、`arena-pa2b-before.sha256`。既有 B1 trusted InputFrame、expired-held/disposition、旧 trusted-public-reader hunk 均保留，未 reset/checkout；当前工作树其它 dirty 未纳入本小门。
- **Core 绑定合同**：唯一生产入口是 `MatchCore.createMatchReadBinding(descriptor: unknown)`。descriptor 仅接受 schemaVersion=1、非空 compositionId、与 Core config participantIds 精确同序的 participantIds、精确 mapDefinitionId、精确 contentSelectionHash（null 或 Core content hash）和可选 `compositionContractHash`；显式 null 与省略归一为 null，非 null 必须是小写 `/^[0-9a-f]{8}$/`。调用方不能自报 configHash、authorityContentHash 或 compositionHash；Core 结合自身 configHash/ruleContentHash 生成扁平 `{schemaVersion, compositionId, participantIds, mapDefinitionId, contentSelectionHash, compositionContractHash, configHash, authorityContentHash}` hash。成功 binding 仅登记一次，失败不消耗槽位；opaque frozen object 只在模块 WeakMap 中有 provenance，fake/clone/Proxy/cross-Core/repeat fail closed。
- **Owner record / reader**：owner record 私有保存 authorityContentHash、configHash、contentSelectionHash、compositionContractHash、compositionHash、generation 与规范化 descriptor；reader 只经 `MatchCore.createMatchReadReader(binding, participantId, fixedProfile)` 创建，index 不导出 runtime reader factory。profile 仍为 PA2a 三个固定值；同 participant/profile 不 replacement。`read()` 运行时严格拒绝额外参数，跨 tick 可读；paused/resume 未改变 authority identity 时 memo `strictEqual`，t→t+1/eventSequence/phase变化只替换当前 memo；ended 可读，step/reentrant/destroy/跨 owner/过期 binding 拒绝。
- **最小返回值**：PA2b 只返回冻结的 `match-read-identity` memo（generation、tick、eventSequence、phase、participant/profile、compositionHash 及共享 world identity），不伪造 WorldSnapshot/Local/Bot/Full sidecar，不构造供给投影，不进入 PA2c。
- **失败关闭与资源**：descriptor、owner identity、generation、phase 和 hash 均在 memo 发布前严格验证；递归 read 在 owner port 内拒绝，失败不覆盖旧 memo，后续合法读取恢复。memo 结构为一个当前 world memo 与每个 participant/profile 一个当前 memo，2 人时上界为 `2×3`，不保留历史；destroy 失效 binding/readers，重复 destroy 幂等。PA2b 不接管或销毁调用方 Core/Bot/外层 composition；Session 的生产主路径尚未迁移。
- **验证证据（候选阶段）**：专用 `tests/arena/match-read-port.test.ts` 当前 `17/17`；覆盖 ordinary null、真实 survival composition + 正式 contract hash、contentSelection non-null、missing/unknown/future/extra/accessor/Symbol/container/cycle/sparse/array-extra/hash、合法 data-descriptor Proxy getter=0、扁平 hash 独立复算、fake/clone/Proxy/cross-Core/repeat、zero-arg、tick、paused/resume、ended、destroy、step 中读、reentrant recovery、uncaught validation recovery、2×3 bounded slots 与 identity generation/phase 边界。architecture 新增 allowlist 当前与既有测试共同 `43/43`；`build:packages` 当前 `52/11`；typecheck/lint/docs/diff 已在候选收尾复跑并通过。
- **候选收尾门禁证据**：受影响 Node（PA2b 专测、PA2a 合同、MatchCore、survival、B1 trusted batch 与 architecture）`121/121`；architecture `43/43`；`build:packages` `52 packages / 11 waves`；`typecheck:app`、lint、`check:documentation`（265 markdown / 839 links / 57 commands）与 `git diff --check` 全绿。没有运行 formal300、性能实验或模拟器。
- **首轮 TOCTOU 拒绝与修订**：复现过 descriptor `ownKeys` 重入双 binding、输入 Proxy 在 step 中占槽/建 reader；现由每 owner port 的 module-private binding-creation guard 与 Core `#matchReadBindingCreating` 生命周期互斥阻断。guard 在 descriptor clone 前登记，失败/重入不发布 binding；step、trusted-step、reader、destroy 在创建期间均拒绝；binding/reader 仅允许 tick=0、eventSequence=0 初始身份。未捕获重入、捕获重入、step 失败后 tick0 恢复与晚建拒绝均有专测。`createReaderForBinding` 已为模块私有，但 `createMatchReadReaderForOwner` 仍是该内部模块 source export；runtime reader factory 不在 package index 导出，生产 deep-import architecture allowlist 为 `43/43`。
- **本轮 trusted-batch/public-reader TOCTOU 拒绝与修订**：独立 9 项复现确认 trusted batch 外部 Proxy 的 `ownKeys` 可重入 `step`、trusted step、batch、binding、reader、MatchRead read、trusted public snapshot reader、destroy；binding descriptor 外部验证也可重入 batch/public reader。新增统一 Core `#callerInputValidationActive`：在 batch、binding descriptor、reader binding、trusted public snapshot reader 开始读取 caller object 前置位，`finally` 清理；guard 期间上述 authority/capability API、checkpoint/state hash/Replay metadata/character definition 读取与 public/MatchRead reader read 均 fail closed，binding creation 反向拒绝 batch，public reader 另行先拒绝 stepping/binding transaction。捕获与未捕获重入、ownKeys abrupt failure、step Proxy 铸造 public reader、合法恢复均通过；失败不推进 tick/eventSequence、不消费 token、不发布 reader/binding owner 或槽位，既有 memo 保持 `strictEqual`。本轮专测 `17/17`、受影响链 `121/121`。
- **本轮边界补强**：PA2b 专测继续覆盖真实 descriptor 字段上的缺失/容器/循环/稀疏/额外数组键、accessor 零 getter 与合法 data-descriptor Proxy 零 getter；正式 survival Core 使用官方 Definition/冻结 spawn specs 派生的非空小写 contract hash，并以 `createDeterministicDataHash` 独立复算扁平 binding hash；2×3 reader 槽位、有界 current memo、owner identity 四类非法值、已有 memo 后重入失败且 memo 保持 `strictEqual` 均有证据。测试中的 `LocalMatchSession` 仅用于 pause/resume identity 语义回归，PA2b 未接入 Session 生产主路径。
- **代码自审与评分**：健壮性——descriptor、owner identity、generation、phase、hash 全在 memo 发布前校验，失败不改旧 memo；竞态/TOCTOU——owner port 只由 Core 完成构造后登记，reader 零参数闭包读取当前 Core identity，reentrant guard 阻断递归，旧 memo 不冒充新 identity；兜底/fail-closed——fake/clone/Proxy/cross-Core/repeat、extra arg、destroy、step 中读、未知 participant/profile 均拒绝，无任意 profile/channels 旁路；边界——safe integer、phase 闭集、大小写 hash、contentSelection null/non-null、正式 survival contract hash、ended 与暂停稳定 identity 已测；生命周期——每 Core 单 binding、无 replacement、重复 destroy 幂等、失败候选不消耗 binding 槽位、memo 上界为 participant×3；主流程——只增加 Core identity capability，不改变 authority step、events、Replay/hash、public snapshot 或 Session 主路径。PA2b 不宣称 sidecar、供给投影、Session/Bot 接线或性能改善。

| 维度 | 满分 | 自评分 | 结论 |
|---|---:|---:|---|
| 架构边界 | 20 | 19 | Core-only helper 由 architecture allowlist 锁定，index 不导出 runtime reader；PA2c 及上层未接线 |
| 合同精确性 | 20 | 19 | descriptor/hash/identity/zero-arg/profile 合同严格；完整 sidecar 留 PA2c |
| 生命周期/失败关闭 | 15 | 14 | binding、reader、memo、destroy、reentrant 与失败恢复均有证据；Session 生产迁移未开始 |
| 确定性/Replay/hash | 15 | 15 | memo 为派生读模型，不写 authority/Replay/hash；composition hash 可独立复算 |
| 性能可证伪 | 15 | 12 | memo 与 bounded map 结构可证伪，但 PA2b 不做性能宣称/未跑正式门 |
| 迁移/回滚 | 10 | 10 | 精确文件/hunk 回滚且保护 B1/expired-held/旧 reader dirty |
| 治理 | 5 | 5 | 121/121、43/43、52/11、type/lint/docs/diff 证据已入台账 |
| **合计** | **100** | **94** | 每维≥80、总分≥90；仅请求主协调验收，不代表 PA2/P1 完成 |
- **未完成硬门**：PA2c read-frame composition、Session/Bot/Product/Presentation/legacy full-snapshot 退出、PA5 measurement/audit schedule、PA6 前 20 ABBA×3、正式 300/120 CPU、Coverage/Douyin/WeChat/Platform/真机、4 人 P2 与 P1 总体均未完成；不得把 PA2b 候选写成 PA2/P1 完成。
- **精确回滚**：只反向删除 `match-read-port.ts`、`match-core.ts` 中 PA2b owner-port/binding/reader 接线、`arena-match/src/index.ts` 的 PA2b 类型出口、PA2b dedicated test、architecture allowlist 与本 PA2b ledger hunk；保留 d750e4c 之后的 B1/expired-held/旧 trusted-public-reader 及其它 dirty，不使用 reset/checkout。

##### PA2b owner-bound readers 主协调独立签核（2026-07-30）

- **状态与评分**：`completed / coordinator-approved / formalGate=false`；主协调评分 `95/100`：架构 `19/20`、合同 `19/20`、生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、性能可证伪 `12/15`、迁移/回滚 `10/10`、治理 `5/5`。该签核仅适用于 PA2b，不代表 PA2c、性能、P1、commit/push 或 P1 advance。
- **独立证据**：仓库外 TOCTOU 攻击矩阵 `9/9`；PA2b 专测 `17/17`；B1 trusted batch `5/5`；architecture `43/43`；`build:packages` `52 packages / 11 waves`；`typecheck:app`、lint、docs（`265 markdown / 839 links / 57 commands`）与 `git diff --check` 全绿。未运行性能实验、formal300 或模拟器。
- **边界**：本门只冻结 Core owner-bound binding/reader 与有界 identity memo；未构造 World V2、Local/Bot/Full sidecar，未接入 Session/Bot/Product/Presentation、runner、Replay/hash、golden 或性能。PA2c 必须单独验证 shared world、fixed profile、frame 原子发布与重入失败关闭。

##### PA2c read-frame composition 实现候选（历史记录，2026-07-30）

- **状态/范围**：`read-frame-candidate / formalGate=false / awaiting-coordinator-review`。实现审计起始基线与安全回滚点为 `d750e4caa767332b5c3caaf247080b5717d56219`；编辑前保护文件与全量 dirty diff 已保存至 `/private/tmp/arena-pa2c-before.head`、`arena-pa2c-before.status`、`arena-pa2c-before.dirty.diff`、`arena-pa2c-before.untracked`、`arena-pa2c-before.sha256`。本门只触及 `packages/arena-match/src/match-read-frame.ts`、`packages/arena-match/src/match-core.ts` 的 PA2c 最小接线、`packages/arena-match/src/index.ts` 类型出口、PA2c 专测、architecture 与本台账；未覆盖或重写 B1、expired-held、PA1、PA2a、PA2b dirty hunk。
- **行为映射**：World V2 直接从 Core 的 `#createSnapshot(false, false)` 构造，不调用 PA2a audit/normalizer，不调用旧 `getSnapshot()` 后裁剪，也不计算 generic full actionAffordance；`schemaVersion` 映射为 `authoritySchemaVersion`，participant 去掉 generic affordance，map 去掉 `privatePlan`，普通 1v1 的 `activeSupplyProjection` 为 `null`，正式 survival 缺失 projection fail closed。local reader 只使用 `local-context-primary`（primary/primaryHold），bot 只使用 `bot-mobility`（jump/slam），full 使用 `full-audit` 的四通道与既有 primary identity；不合并 intent、不缓存裁决、不写 authority/RNG/events。
- **共享 memo 与原子性**：Core 维护一份当前 world memo 与每个 participant/profile 的当前结果；同 authority identity 的 world/frame 复用为 `strictEqual`，多个 local reader 共享同一 world，sidecar reader 不构造 world。先由已注册的 PA2b `identityReader.read()` 在其 owner/reading guard 下取得当前身份；随后 `#withMatchReadBuild` 覆盖候选构造、递归冻结、末尾 identity 复核与发布前一致性检查。candidate 完整冻结后才发布 world/result，`publishWorld` 判别联合防止 frame 已有 world 但共享 memo 未提交；失败不覆盖旧 memo，step 后只替换当前 memo，destroy 清空。
- **失败关闭/生命周期**：read 是零参数运行时合同；cross-Core/fake/重复槽/额外参数/晚建/destroy 均拒绝。paused/resume 未推进 authority identity 时 frame memo `strictEqual`；ended 逐 participant 沿用旧 full affordance 行为，未将 winner 简化为全员不可用。build callback 中对 snapshot、step、destroy、trusted batch/step、trusted public reader、binding/reader/frame reader、checkpoint、state hash、Replay metadata 和跨 reader 重入均 fail closed；捕获拒绝后外层候选仍成功，未捕获异常后旧 frame/world 不提前替换且 guard 可恢复。
- **证据（候选阶段）**：PA2c 专测 `10/10`；architecture（含 PA2a hot-path audit 禁止、PA2c composer 不使用 `cloneFrozenData`/旧 snapshot 裁剪、index/runtime helper 与 deep-import allowlist）`44/44`。受影响链最终复跑 `97/97` 全绿（包含上述 architecture、PA2c 专测、PA2b owner-reader、B1 trusted batch 与相关 MatchCore movement/survival 回归）。专测已覆盖 ordinary/survival、formal null/undefined、profile 调用次数与 `genericAffordanceCalls=0`；以每次 sidecar read 前后区间证明 `listEquipmentSnapshotsCalls` 不增长，初次 local world、uncaught local 失败与 recovery 的各次增长单独计数；sidecar world-builder=0、两 local 共享 world、preparing/running/sudden-death/ended full differential、pause/resume strict identity、cycle/accessor/container、destroy/fake/cross-Core/extra args、nested reentry 捕获/未捕获恢复、events/Replay metadata/state hash/checkpoint parity 均有覆盖。未运行 formal300、性能实验或模拟器。
- **Replay/hash 与范围边界**：当前只做 reader-enabled Core 与 control Core 的 events、Replay metadata、state hash、checkpoint identity、InputFrame/terminal 结果 parity；不修改 Replay V5、authority state hash、golden fixture，不接入 Session 主 step、Bot observation delay、Product/Presentation、full audit schedule、measurementSchemaVersion、runner 规模/阈值或 Platform。PA3+ 负责 Session/Bot/产品路径迁移；PA5 负责 legacy full snapshot 退出与 evidence v2。
- **代码自审与评分（候选）**：健壮性 `19/20`（直接构造/冻结 plain-data，跨字段 identity 复核）；竞态/TOCTOU `19/20`（Core-wide build guard 与末尾复核，仍需完整门禁复跑）；生命周期/失败关闭 `15/15`（候选、旧 memo 与槽位原子）；确定性/Replay `14/15`（control/reader parity 已测，golden 复跑留 PA2c 门禁）；性能可证伪 `12/15`（fixed profile 与避免 full world 证据已测，但未做性能宣称）；迁移/回滚 `10/10`（只反向本门文件/hunk，保护既有 dirty）；治理 `5/5`。合计 `94/100`，各维≥80；仅为候选自评，等待主协调独立验收。
- **未完成硬门与回滚**：PA2c 不推进 PA3/PA4/PA5/PA6/PA7；Session/Bot/Product/Presentation/legacy full snapshot 退出、formal audit schedule、前 20 ABBA×3、正式 300/120 CPU、Coverage、Douyin/WeChat、Platform、真机、4 人 P2 与 P1 总体仍未完成/fail closed。若撤回，仅反向删除 `match-read-frame.ts`、PA2c `match-core.ts`/`index.ts` hunk、PA2c 专测/architecture hunk 与本台账段落；不使用 reset/checkout，不触碰 B1/expired-held/PA1/PA2a/PA2b 或其它 dirty。

##### PA2c 主协调独立签核（2026-07-30）

- **状态与评分**：`completed / coordinator-approved / formalGate=false`；主协调评分 `95/100`：架构边界 `19/20`、行为等价 `19/20`、生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、性能可证伪 `12/15`、迁移/回滚 `10/10`、治理 `5/5`。性能维度 `12/15` 仅因 PA2 按计划未运行正式 `readStep`/CPU，不是 PA2c 功能缺陷；不代表 PA6/PA7 或 P1 性能门通过。
- **独立证据**：首次独立 PA2c 运行 `9/10`，唯一红点是全局 `listEquipmentSnapshots` 计数混入正常 authority step，测试证据口径无效；修为逐次 `sidecar.read()` 前后区间不增长后，独立 PA2c `10/10`。仓库外恶意夹具 `2/2`（失败的第二 local profile 不清空共享 world；跨 tick 失败候选不提前发布）；扩大独立受影响回归 `112/112`；architecture `44/44`；`build:packages` `52 packages / 11 waves`；typecheck/lint/docs（`265 markdown / 839 links / 57 commands`）与 `git diff --check` 全绿。
- **范围边界**：本签核只关闭 PA2 实现门，范围为 PA2a contracts、PA2b owner-bound readers、PA2c read-frame composition；不代表 PA3 Bot、PA4 Product/Presentation、PA5 legacy/runner、PA6/PA7 CPU、P1 advance 或 commit/push。PA2 未接入 Session/Bot/Product/Presentation 主路径，未运行正式性能/压力实验或模拟器。

##### PA2 总门主协调独立签核（2026-07-30）

- **状态**：`completed / coordinator-approved / formalGate=false`。PA2 只包含已分别签核的 PA2a contracts、PA2b owner-bound readers 与 PA2c read-frame composition；下一门 PA3 Bot 尚未授权、未开始。
- **硬门边界**：PA2 的完成不改变正式 `300/120` pressure 的 `formal-failed`/CPU 红证据，不关闭 PA6/PA7 CPU、PA4/PA5、Coverage、Douyin/WeChat、Platform、真机、4 人 P2 或 P1 总体硬门。

##### PA2b/c owner/read-frame integration contract（拟议，非当前源码）

以下类型使用 `SafeTick = number`（运行时必须为非负安全整数）；所有外层和嵌套字段均为
`readonly`，但 TypeScript readonly 不替代运行时验证。`arena-contracts` 不得引用
`arena-definitions` 的 `ActionLane`，否则会形成 definitions→contracts 的反向循环；因此
`ActionAffordanceViewV2.lane` 在 contracts 中是经过结构校验的 `string | null`。`kind` 可复用
contracts 自己的 `ActionResolutionKind`，不引入 definitions 依赖。`ActionAffordanceViewV2`
精确复用 PA1 现有 outcome 字段：`kind`、`actionDefinitionId: string | null`、
`lane: string | null`、`source: string | null`、`reason: string`；不新增 `channel`，channel
只属于 channels map 的 key。

```ts
type MatchReadProfileV2 =
  | 'local-context-primary'
  | 'bot-mobility'
  | 'full-audit';

interface ActionAffordanceViewV2 {
  kind: ActionResolutionKind;
  actionDefinitionId: string | null;
  lane: string | null;
  source: string | null;
  reason: string;
}

interface WorldParticipantSnapshotV2 {
  id: string;
  characterDefinitionId: string;
  status: string;
  lives: number;
  eliminations: number;
  deaths: number;
  hitstunTicks: number;
  invulnerableTicks: number;
  respawnTicks: number;
  lastHitBy: string | null;
  lastHitTick: number;
  action: ArenaActionSnapshot;
  actionRule: DeepReadonly<unknown>;
  movement: ArenaMovementSnapshot;
  equipment: ArenaHeldEquipmentSnapshot | null;
  position: ArenaVector3Snapshot;
  velocity: ArenaVector3Snapshot;
  facing: ArenaVector2Snapshot;
  grounded: boolean;
  supportSurfaceId: string | null;
  // no generic actionAffordance field
}

interface WorldSnapshotV2 {
  authoritySchemaVersion: number; // 精确映射 ArenaMatchSnapshot.schemaVersion，不是 2
  physicsBackendVersion: string;
  configHash: string;
  ruleContentHash: string;
  matchSeed: number;
  tick: SafeTick;
  activeTick: SafeTick;
  phase: string;
  remainingTicks: SafeTick;
  eventSequence: SafeTick;
  participants: readonly WorldParticipantSnapshotV2[];
  equipment: readonly ArenaEquipmentSnapshot[];
  activeSupplyProjection: ArenaPublicSupplyProjection | null;
  map: ArenaMapSnapshot;
  result: ArenaMatchResultSnapshot | null;
}

interface LocalActionSidecarV2 {
  schemaVersion: 2;
  tick: SafeTick;
  eventSequence: SafeTick;
  participantId: string;
  profile: 'local-context-primary';
  primaryActionDefinitionId: string | null;
  channels: {
    primary: ActionAffordanceViewV2;
    primaryHold: ActionAffordanceViewV2;
  };
}

interface FullAuditSidecarV2 {
  schemaVersion: 2;
  tick: SafeTick;
  eventSequence: SafeTick;
  participantId: string;
  profile: 'full-audit';
  primaryActionDefinitionId: string | null;
  channels: {
    primary: ActionAffordanceViewV2;
    primaryHold: ActionAffordanceViewV2;
    jump: ActionAffordanceViewV2;
    slam: ActionAffordanceViewV2;
  };
}

interface BotMobilitySidecarV2 {
  schemaVersion: 2;
  tick: SafeTick;
  eventSequence: SafeTick;
  participantId: string;
  profile: 'bot-mobility';
  channels: {
    jump: ActionAffordanceViewV2;
    slam: ActionAffordanceViewV2;
  };
}

interface MatchReadFrameV2 {
  schemaVersion: 2;
  worldSnapshot: WorldSnapshotV2;
  localActionSidecar: LocalActionSidecarV2; // formal LocalMatchSession/Product 必填
}
```

`WorldParticipantSnapshotV2` 是当前 `ArenaParticipantSnapshot` 去除 generic
`actionAffordance` 后的字段级映射，不改变 action/actionRule/movement/equipment/position 等
已有值；`authoritySchemaVersion` 必须逐字来自 `ArenaMatchSnapshot.schemaVersion`，不能在
world 中伪造为 read-frame 的 2。`activeSupplyProjection` 在 V2 明确为 `null` 或完整
projection，正式生存组合缺失时必须 fail closed。`WorldSnapshotV2`、三个 sidecar 的 root、
数组、数组元素、map/projection、vector/action 嵌套对象都必须运行时递归冻结；对于输入数据，
accessor/畸形/隐藏索引 Proxy 拒绝，合法 data-descriptor Proxy 可接受但 getter 必须为 0；
另行禁止 Map/Set/Date/typed array、cycle、稀疏数组、Symbol 和 authority mutable 引用。共享
只能是已证明 plain-data immutable 值，不能用 `Object.isFrozen` 外壳推断深冻结。

`MatchReadFrameV2`、三个 sidecar 的 schemaVersion=2 属于 read-model 合同；
`measurementSchemaVersion=2` 仍只属于 PA5 formal measurement/evidence report，PA2 不创建
该 report。`FullAuditSidecarV2` 是 full-audit reader 的精确内部输出类型，不等于把旧
`ArenaMatchSnapshot` 原样公开，也不把 display-primary 第五次 probe 的完整 outcome 暴露给
消费者。

composition binding 的可执行 API 固定为 Core 生产，而不是让外部 composition factory 直接
写 `arena-match` 私有 WeakMap：

1. `MatchCore.createMatchReadBinding(compositionDescriptor: unknown)` 先在本地候选对象中严格
   clone/validate descriptor，再以自身 `configHash`、非空 `ruleContentHash` 和规范化 descriptor
   计算 `compositionHash`。descriptor 最小字段严格收敛为：`schemaVersion: 1`、
   `compositionId: string`（非空，仅标识并参与 hash）、稳定有序且必须精确等于
   `Core.config.participantIds` 的 `participantIds`、必须等于 `Core.config.mapDefinitionId` 的
   `mapDefinitionId`、必须精确等于
   `Core.config.contentSelection?.contentHash ?? null` 的 `contentSelectionHash: string | null`，
   以及可选的 `compositionContractHash: string | null`；普通 1v1 可为 null，正式生存 composition
   必须由外层组合传入非 null 值。后者必须匹配 `/^[0-9a-f]{8}$/`；大写、混合大小写、非十六进制
   字符、错误长度均拒绝。Core
   只验证格式并将其纳入派生 hash，不宣称理解外层合同语义。哈希输入固定为
   版本化、字段顺序固定的
   `{ schemaVersion, compositionId, participantIds, mapDefinitionId, contentSelectionHash,
   compositionContractHash, configHash: Core.configHash, authorityContentHash: Core.ruleContentHash }`；
   descriptor 不允许自报 `configHash`、`authorityContentHash` 或 `compositionHash` 字段。
2. Core 只核对上述自身可观察字段：participantIds 的顺序/集合、mapDefinitionId、
   contentSelectionHash、compositionContractHash 格式，以及自身 config/rule hash；不校验不存在的
   mode/profile/contentDefinition 语义。首次成功时才创建一个无可伪造的 opaque frozen binding
   object，并在 Core 私有 WeakMap 登记 `{ coreOwner, configHash, authorityContentHash,
   contentSelectionHash, compositionContractHash, compositionHash }`。descriptor 校验、哈希、
   binding 创建和登记必须是一次本地候选提交；任一步失败都不写 WeakMap、不生成 memo、不接管
   调用方资源。每个 Core 只允许成功 `createMatchReadBinding` 一次；失败候选不会消耗这个一次性
   槽位，重复成功创建直接拒绝且原 binding/readers 完全不受影响。此 API 是 composition 的唯一
   入口，后续只传同一个 binding 对象身份。
3. `MatchCore.createMatchReadReader(binding, participantId, fixedProfile)` 只接受该 Core
   WeakMap 已登记的原始 binding、已登记 participant 和固定 profile；fake、structured clone、
   Proxy、跨 Core binding、带未知/额外 hash 字段的普通对象都拒绝。reader 创建失败也不覆盖
   已有 binding 或 memo；PA2 不提供 replacement API。

`MatchReadOwnerRecordV2` 不属于 `arena-contracts` public schema；它只能定义在
`packages/arena-match` 私有模块，并由模块私有 WeakMap 保存。其严格来源必须是 Core 已验证的
opaque composition binding，而不是调用者可拼接的字符串：composition factory 只向 Core 传入
符合最小 schema 的 descriptor；Core 自己 clone/validate、结合自身 config/rule hash 计算
`compositionHash`，并在私有 WeakMap 中将新 binding 对象绑定到该 descriptor、`configHash` 与
`authorityContentHash`。MatchCore 创建 reader 时必须同时验证非空
`binding.authorityContentHash === Core.ruleContentHash`、`binding.configHash === Core.configHash`，
并通过 binding 对象身份/WeakMap 记录验证 `compositionHash`，不接受仅有同名字段的普通对象。
当前 Core 已有 `configHash`、`ruleContentHash`
和 Core 实例身份，但没有可验证的 composition binding 与 lifecycle generation；在 binding
生产者/验证路径就绪前必须 fail closed，不能把一个 Core 无法验证的字符串称为绑定。

该私有 record 的字段固定为 `coreOwner`、`authorityContentHash`、`configHash`、
`contentSelectionHash`、`compositionContractHash`、`compositionHash`、`generation`、`tick`、
`eventSequence`、`phase`、`participantId`、`profile`；
其中 `authorityContentHash` 是本设计中 content hash 的唯一权威来源映射，不能另存一个未验证
的 `contentHash` 别名。上述 record 不序列化、不从 contracts index 导出，也不作为 public frame
字段暴露。

reader 类型同样是 `arena-match` 私有 capability，不放入 contracts public schema。运行时合同
是 `read(...extraArgs)` 收到任何参数都立即抛 `TypeError`；不能依赖 JavaScript 静默忽略额外
参数。调用者只能零参数读取，tick/eventSequence/phase/participant/profile 均由闭包/owner
record 从当前 Core 提供。同一 reader 可以跨整个 match 读取新结果，但旧 sidecar 身份不能冒充
新 tick。

##### PA2 生命周期状态机与失败原子性

| 时序 | 合法读取 | 必须拒绝/回滚 |
|---|---|---|
| 初始 tick 0 | 先验证 composition/content hash、participant/profile 唯一性，再绑定 reader；无 history/RNG 前生成 frame | 合同、participant、profile、hash 任一不匹配不得创建半 reader；调用方拥有的 Core/Bot 不被错误接管 |
| 正常 `t→t+1` | step 前读取当前 sidecar；authority 写入区间拒绝 read；提交后同一 reader 读取新 tick/eventSequence 对应结果，lifecycle generation 保持不变 | 旧 frame 不能作为新 frame；step 中异常不发布 post frame，必要时 fail closed 并失效 owner |
| paused | tick/eventSequence/phase/generation 未变时重复 read 合法，返回同一 memo identity | 不得因 pause 本身虚构失效；非法 paused 输入不改 Core |
| resume 但尚未推进 | 与 paused 相同，仍可复用真实 authority identity | 不得仅以 resume 标记递增 generation；只有真实 authority identity 变化才产生新 memo |
| ended | terminal identity 稳定时可重复 read；按旧 ParticipantSystem 逐 participant 重组，winner active 仍可有 selected 输出，淘汰者才可能 unavailable | 不得统一假设 `canAct=false` 或创造 `match-ended` reason；进一步 authority step 按现有规则拒绝 |
| 重复 bind/owner 生命周期 | PA2 不提供 replacement API；同一 participant/profile 只允许一个活动绑定，重复 bind、跨 composition、跨 Core 始终拒绝，既有 reader 不受影响 | 不得覆盖旧 owner，不得递增 generation 伪装普通替换；失败不得泄漏新资源 |
| destroy / 新 Core | destroy 清空 owner/memo，并使 lifecycle generation 失效；所有旧 reader read 失败；新 Core 只能用新 binding/new reader，重复 destroy 依既有幂等语义 | destroy 后不得读；不得跨 match 泄漏 memo；构造失败只清理本阶段自有 reader/frame 资源 |

reader memo 必须是有界结构：一个 current world memo，加上每个已绑定
`participantId/profile` 的一个 current sidecar memo；key 为
`generation/tick/eventSequence/phase`。同一 identity 必须 `strictEqual` 返回同一 memo；身份变化
先在候选对象中完整构造并验证，再覆盖旧 current memo，不保留历史数组或无界 Map。每次 reader
读取和 frame compose 都有 reentrancy guard；重入或构造异常不发布半 memo，并按失败关闭处理。

generation 是 lifecycle generation，不是 tick counter：正常 `t→t+1` 不递增，只在 destroy
等 owner 生命周期失效时变化；PA2 没有 owner replacement，因此不会出现“replacement 成功但
旧 reader 如何保留”的未定义语义。

PA2 还必须锁定 `preparing/running/sudden-death/ended` fixture 的逐 participant 实际
affordance，而不是把 ended 简化成全员不可行动。full-audit 与 recomposition 比较 legacy public
四通道 outcome 的 `kind/actionDefinitionId/lane/source/reason` 以及
`primaryActionDefinitionId`；display-primary 的完整内部 outcome 不公开且不直接比较，只对其最终
生成的 public `primaryActionDefinitionId` 做 differential。

##### 精确文件触碰图与最多三个可回滚小门

PA1.1 是 selected-profile Rule 前置，不计入以下三个 PA2 小门；以下表格是 PA2 实现前的历史文件触碰预审快照，当前 PA2a、PA2b、PA2c 均已完成并由主协调签核，下一门 PA3 尚未授权：

| 小门 | 允许文件（拟议） | 测试/硬门 | 禁止项与精确回滚 |
|---|---|---|---|
| PA2a contracts | 新增 `packages/arena-contracts/src/match-read-frame-v2.ts`，最小改 `packages/arena-contracts/src/index.ts` 导出合同与昂贵 audit；新增 dedicated contract tests/architecture 规则 | frame/sidecar `schemaVersion=2`；`authoritySchemaVersion` 精确映射 legacy `ArenaMatchSnapshot.schemaVersion`；字段/nullable/freeze、future/unknown、accessor/畸形/隐藏索引 Proxy、合法 data Proxy getter=0、container/cycle/稀疏/Symbol、local sidecar non-null、普通1v1 null supply 与 survival require fail closed；评分模板总分≥90且每维≥80 | 不改 `match-snapshot.ts`、Replay、state-hash、InputFrame；不把 owner record/reader/capability/measurementSchema 放入 contracts public schema；audit 不得进入 MatchCore/Session/Bot hot path；回滚只删除新合同文件与对应测试/exports hunk，保留 PA1 |
| PA2b owner-bound readers | 新增 `packages/arena-match/src/match-read-port.ts`；在 `packages/arena-match/src/match-core.ts` 增加最小 owner/generation/cache 接线；必要时仅改 `arena-match/src/index.ts` 类型；新增 reader lifecycle/architecture tests | owner Core/composition/content/generation/tick/eventSequence/phase/profile、运行时 zero-arg（extra arg 立即 TypeError）、paused/ended memo、t→t+1、step/destroy/construct failure/cross-Core/repeated bind/reentrant/bounded memo；评分模板总分≥90且每维≥80 | 不依赖 Bot/Presentation，不深导入 resolver port，不提供 replacement API；当前 dirty `match-core.ts` 必须先由主协调隔离并批准 patch，不能覆盖 B1/expired-held；回滚只反向 PA2b 新文件和明确 hunk |
| PA2c read-frame composition | 新增 `packages/arena-match/src/match-read-frame.ts` 或等价纯 composer；只在 MatchCore 内组合 world+local frame 与 bot/full sidecar reader 输出；新增 frame/recomposition tests | world/local/bot/full sidecar 组装、旧字段 differential、递归 freeze、普通1v1/survival、pause/ended、failure-before-history；不实现 current self + delayed world、不实现 full audit schedule、不接 Session/Bot/Product；评分模板总分≥90且每维≥80 | 不修改 `arena-session/src/local-match-session.ts`，不接 Bot/Product 主路径，不落 measurementSchema/readStep，不改 authority resolve、Replay V5、hash、golden、runner 规模；回滚只反向 composer hunk/新测试，不使用 reset/checkout |

三个小门均保留公共 100 分表：架构边界20、行为等价20、生命周期/失败关闭15、确定性/Replay15、
性能可证伪15、迁移/回滚10、治理5。PA2a 之前必须完成 PA1.1；PA2c 之前必须 PA2b 通过；
任一维度不足 80% 或总分不足 90，保持 candidate，不得 advance。

##### 与现有 dirty 的重叠风险与明确禁触文件

当前 HEAD/安全回滚仍是 `d750e4caa767332b5c3caaf247080b5717d56219`，工作树已有 B1、expired-held、
golden、runner、PA1 和 ADR/台账 dirty。PA2 预审不修改其中任何文件。尤其不得未经另行授权
触碰 `packages/arena-core/src/arena-rule-engine.ts`（现有 B1/expired-held hunk）、
`packages/arena-core/src/action-resolver.ts` 与 `action-affordance.ts`（PA1 已签核 hunk）、
`packages/arena-contracts/src/match-snapshot.ts`、`equipment-supply-event-payload.ts`、
`input-frame.ts`、`packages/arena-equipment/src/equipment-system.ts`、
`packages/arena-match/src/replay.ts`、`state-hash.ts`、`packages/arena-session/src/local-match-session.ts`
的任何 hunk、Bot/Product/Presentation 源码、formal runner、golden fixture、ADR-110/111、
文档索引和 production plan。PA2b/PA2c 若确实需要 `arena-rule-engine.ts` 或 `match-core.ts`，
必须先保存/核对现有 dirty patch，使用最小显式 hunk，并由主协调重新授权；本回合没有这些修改。

##### PA2 性能归因设计（不跑 formal300、不接产品/Bot/Session）

PA1.1 证明 selected profile 的调用次数和结果 parity；PA2a 只验证 contracts 的 parse/clone/freeze
与 negative boundary 合同成本和正确性；PA2b 只测 owner reader 的 bind/read/cache-hit/miss 与失效
成本；PA2c 只测 MatchCore world+local frame composer 及 bot/full sidecar reader 的组合成本。
PA2 不实现 LocalMatchSession step、玩家 InputMapper、Bot current/delayed observation 或 full-audit
schedule；这些属于 PA3/PA4/PA5。PA5 未来定义版本化 `readStep` 计时边界，届时必要 sidecar、
Session step、post frame 和 fixed full-audit 必须全部在计时内，循环外 `evidenceHash` 只能作为独立
证据成本，不能把 action query 移到计时外。

当前 2 人 legacy public snapshot 的 action 投影是两次 full profile：canAct=true 时至少
`2 × 4 = 8` 个独立 intent evaluation，canAct=false participant 再加 display evaluation；
PA1.1 通过后，未来 PA5 readStep 的 local profile 目标是 primary/primaryHold（必要时 display
identity），bot profile 目标是 jump/slam，不能再执行 full→crop，预计为 `2+2` 个独立 intent
evaluation 加条件 display。full-audit schedule 也只能在 PA5 由正式 readStep 执行；tick0、每60
tick、phase transition、599/600/601、1199/1200/1201、1799/1800/1801、2399/2400/2401
及每个相关事件后的稳定 tick 对全部 participant 的 full-audit 不能被 selected profile
静默删除，且必须计入未来 readStep。

首轮只允许隔离的短样本和明确分段：legacy full、PA1.1 selected profile、reader hit/miss、
world/frame compose、full-audit schedule，分别记录 calls/tick、self/inclusive CPU、GC/heap
与 process CPU；不运行正式300，不启动模拟器，不把嵌套 inclusive 相加，不修改阈值/审计规模。
PA6 候选门仍是每个 ABBA 组 P95 `≤0.225ms/tick`、稳定回收 `≥30.1us/tick`、process CPU
同向且 strict parity 全绿，未有这些证据前 PA2 只能保持设计/实现候选。

#### PA2 文件级预审自审与状态

- **status**：`design-preaudit-approved`。主协调已于 2026-07-29 独立签核本设计门；本节仍只证明
  合同和文件边界已经通过预审，不授权 PA2 代码、测试、性能实验或 commit/push。当前只另行授权
  PA1.1 fixed-profile-rule-projection；PA2 实现仍未开始。
- **健壮性与架构**：selected profile 已停在 PA1.1 Rule boundary；contracts 不依赖
  `arena-definitions`；owner binding/reader 只由 Core 私有 WeakMap 生产；PA2c 不触碰 Session、
  Bot、Product/Presentation。MatchCore 不会深导入 Resolver preview port。
- **竞态/TOCTOU 与失败关闭**：descriptor 先 clone/validate，binding 只在 hash、Core config
  对照和所有字段检查成功后登记；重复 binding、fake/clone/Proxy/cross-Core、额外 reader 参数、
  reentrant read 均拒绝；candidate frame/memo 未完整冻结前不覆盖 bounded current memo。
- **边界与生命周期**：正常 tick 不递增 generation；paused/ended 同 identity memo 合法；destroy
  使旧 reader 失效；PA2 不提供 replacement API；PA2 构造失败不销毁调用方 Core/外层 composition/Bot。
- **确定性/Replay/hash**：legacy authority schema 原样映射，frame/sidecar 独立 schema=2；不改
  Replay V5、authority state hash 或事件语义；完整四通道 public recomposition differential 与
  display-primary 聚合 identity 边界已明确。
- **证据口径与 dirty 保护**：PA2 仅保留 reader/frame 分段设计，PA5 才定义 readStep/audit
  计时；当前正式 CPU P95 `0.2550948ms/tick` 仍红。现有 dirty 不用 reset/checkout 清理。

| 维度 | 满分 | 自评分 | 结论 |
|---|---:|---:|---|
| 架构边界 | 20 | 19 | 95%；Rule/Core/contract/private owner 边界明确，PA1.1 selected profile 已签核，PA2a contracts 与 hot-path allowlist 分离 |
| 合同精确性 | 20 | 19 | 95%；authority schema、V2 sidecar、hash binding、full differential 已收敛 |
| 生命周期/失败关闭 | 15 | 14 | 93%；有界 memo、零参数、destroy/rebind 规则明确，尚无实现证据 |
| 确定性/Replay | 15 | 14 | 93%；不改 authority 合同，重组 parity 尚待测试 |
| 性能可证伪 | 15 | 14 | 93%；调用链与 PA5 计时边界可测，正式 CPU 仍红 |
| 迁移/回滚 | 10 | 9 | 90%；PA2a/b/c 精确文件回滚，保护当前 dirty |
| 治理 | 5 | 5 | 100%；阶段、禁止项、门禁和签核边界清楚 |
| **此前自评分合计** | **100** | **94** | **此前内部设计自评；不替代主协调签核** |

本表是 PA2 文件级预审的历史自评分；当前 PA2a、PA2b、PA2c 已完成并由主协调签核，正式 CPU 门仍因 P95 红而 fail closed；本自评分不代表代码通过、
性能通过、P1 advance 或 Presentation/Platform 开放。

#### PA2 主协调独立签核（2026-07-29）

- **状态**：`design-preaudit-approved`；主协调评分 `95/100`：架构边界 `19/20`、合同精确性
  `20/20`、生命周期/失败关闭 `14/15`、确定性/Replay `14/15`、性能可证伪 `14/15`、迁移/回滚
  `9/10`、治理 `5/5`。每维均达到 80% 硬门，总分达到 90% 候选门。
- **边界**：该签核只覆盖 PA2 文件级预审设计，不授权 PA2b/c 生产代码、Session/Bot/Product
  接线、runner、golden、性能实验或 commit/push；本段记录预审签核当时 PA2a 获授权并形成合同候选的状态，之后 PA2a 已按后续章节 coordinator-approved，PA2b 已另行授权并形成当前候选。
  端到端 readStep、正式 CPU 与 P1 advance 仍未验收；ADR-111 状态仍为“提议：设计门通过；实现与性能未验收”。

### PA3 文件级设计预审与实现签核（PA3a+PA3b `completed / coordinator-approved / formalGate=false`）

- **基线与范围**：PA2 已 `completed / coordinator-approved / formalGate=false`；本回合使用 `documentation-and-adrs` skill，仅将 PA3 决策固化到 ADR-111 与本台账，不修改生产代码、测试、runner、golden、production plan 或其它文档。HEAD/安全回滚点为 `d750e4caa767332b5c3caaf247080b5717d56219`，编辑前完整基线已保存到 `/private/tmp/arena-pa3-preaudit-before.head`、`arena-pa3-preaudit-before.status`、`arena-pa3-preaudit-before.dirty.diff`、`arena-pa3-preaudit-before.untracked`、`arena-pa3-preaudit-before.sha256`。基线文档 SHA-256 为 ADR-111=`797aa3c96d893b277749afb67fe518d4cc4bc1934009f9f65d2da737febf226e`、本台账=`d3daa84de09fde430fd81462cd575a4036068da89253eadd530bc7625483ee5d`；其余 dirty 路径保持不动。
- **阶段拆分**：PA3a Bot observation/controller contract 与 PA3b ordinary QuickMatch/formal survival production wiring 均已在允许文件内实现并由主协调签核完成（PA3b 94/100）。PA4a、PA4b-1、PA4b-2 与 PA4b-3 均已由主协调签核完成；PA4b-3 状态为 `completed / coordinator-approved / formalGate=false`（96/100）。该预审段记录签核时 PA4b-3 尚未授权；最终签核状态见 PA4 章节。PA5+、性能、formal300、设备/真机、模拟器、美术与 commit/push 仍未授权。
- **主协调设计签核（历史证据保留）**：评分 `96/100`（架构边界 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`），各维均≥80%。独立证据为 `check:documentation`（265 Markdown/839 links/57 commands）与 `git diff --check` 通过；API 对照确认 bundle factory 唯一创建入口、Session 不消费槽位、PA2 output 不虚构 compositionHash/generation、V5 prospective/commit 顺序一致。该段是 PA3 设计预审的历史签核；PA3a 与 PA3b 随后均已另行完成并由主协调签核。
- **阶段总表文件面对齐**：PA3b 文件面同步包含 `packages/arena-session/src/bot-match-read-bundle.ts`；该文件是唯一 bundle factory 所在处，outer composition 只调用它，Session 不调用 binding/reader API。
- **PA3a 主协调签核与 PA3b 授权（PA3a 签核时历史状态，已由后续 PA3b 签核覆盖；2026-07-30）**：PA3a 状态为 `completed / coordinator-approved / formalGate=false`，评分 `94/100`（架构 `20/20`、行为 `19/20`、生命周期/失败关闭 `15/15`、确定性 `14/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`）。独立证据为仓库外恶意矩阵 `6/6`、PA3a 专测 `7/7`、Bot 受影响链 `44/44`、architecture `45/45`、`build:packages` `52/11`、typecheck/lint/docs `265/839/57` 与 diff 全绿；两次独立红门及修复事实保留在历史记录。该段记录的是当时仅授权 PA3b implementation candidate 的状态；后续 PA3b 完成与主协调签核见下方独立条目。PA4/PA5、性能/formal300、模拟器、美术、commit/push 与 P1 advance 仍未授权。
- **PA3b 测试基线补充**：在任何授权测试编辑前，现有 session/quick-match/survival 相关测试的工作树 SHA 与基线内容证据已保存于 `/private/tmp/arena-pa3b-before.allowed-tests-extra-sha256`；其中 dirty tracked 测试以 `HEAD=d750e4caa767332b5c3caaf247080b5717d56219` 作为基线，既有 untracked `tests/arena/trusted-input-batch.test.ts` 以 `/private/tmp/arena-pa3b-before.untracked.diff` 作为基线内容证据。该动作未修改工作树，后续只允许新增/修改 PA3b 授权测试并保留这些既有 dirty hunk。

- **PA3b 主协调独立签核（2026-07-30）**：状态为 `completed / coordinator-approved / formalGate=false`，评分 `94/100`：架构边界 `20/20`、行为等价 `19/20`、生命周期/失败关闭 `15/15`、确定性/Replay `14/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，各维均≥80%。实现证据为外层+architecture 合跑 `59/59`（outer `12/12`、architecture `47/47`）、完整受影响 Node `67/67`、包级 foundation `9/9`、`build:packages` `52 packages / 11 waves`、typecheck/lint、documentation `265/839/57` 与 `git diff --check` 全绿。独立审计另确认 ordinary/formal 同 bundle identity、descriptor、深层入口、cleanup ownership、Session transaction 与 retry/fail-closed。该签核关闭 PA3 总门，但不代表 PA4 生产实现、PA5 legacy/runner、PA6/PA7 性能、P1 advance 或 commit/push。
- **PA3b 关键修订事实（不拼接早期红轮）**：formal `projectionContract` 漏传、公开 factory seam 扩权、cleanup 动态 destroy 的 TOCTOU/所有权双清理、重复模块导致的 provenance 不一致、阶段测试漏观测瞬时 sudden-death，以及 package index 未禁止深层 composition builder 均已修复并由对应测试/architecture 门锁定。早期独立红门仅作为修订历史保留，不与最终绿证据拼接。

#### PA3a Bot observation/controller contract

| 项目 | 预审合同 |
|---|---|
| 允许文件 | `packages/arena-bot/src/bot-observation.ts`、`bot-controller.ts`、`bot-mobility-policy.ts`、必要 `arena-bot/src/index.ts`/type-only hunk、Bot 定向测试与最小 architecture allowlist；若无编译器必要性不得改 `bot-goals.ts`/`bot-map-navigation.ts`。 |
| 禁止文件/行为 | `arena-core`、`arena-match`、`arena-contracts`、`arena-session`、QuickMatch、survival composition、Replay V5、state-hash、runner、golden、Product/Presentation、Platform、ADR-110、production plan、美术；Bot 不得 import/持有 MatchCore、Session、Replay、Renderer，不得调用 Resolver/拾取/替换。 |
| 新观察 schema | `BotObservationV5.schemaVersion=5`；保留 schema 4 的 `observedTick`，并明确补 `observedEventSequence`；精确含 `commandTick`、`commandEventSequence`、`observedTick`、`observedEventSequence`、`phase`、`remainingTicks`、`self`、`opponent`、`botMobility`、`equipment`、restricted `map`、`arena`、`actionRule`、`opponentActionRule`、`objectives`。V5 participant 去掉 generic 四通道 `actionAffordance`、`primaryActionDefinitionId`、`primary`、`primaryHold`；专用测试统一命名 `bot-observation-v5.test.ts`。 |
| 当前/延迟语义 | Session 私有 adapter 只把当前 World V2 + current `bot-mobility` sidecar 投影为冻结 `BotCommandSourceV5`；source 只含 tick/eventSequence/phase/remaining、current self/opponent participant、equipment、restricted map 与 mobility，不含 arena/objectives 或重复 actionRule。BotController 用 prospective bounded history 选择 delayed source，`self`/`botMobility` 取 current，`actionRule` 从 current self 派生，`opponent`/opponent rule/equipment/map 取 delayed；arena/objectives 仍来自 BotController 静态配置。`observedTick`/`observedEventSequence` 是所选 delayed source 身份；普通 projection 为 null，正式 survival 才由 active-supply projection 派生 `BotVisibleEquipment.remainingTicks`。source/V5 不携带 Core/Session/Replay 或未来数据。 |
| restricted map | `BotCommandSourceV5`/`BotObservationV5` 的 map 是递归去除 `privatePlan` 的公开 map shape；出现 `privatePlan`、未知字段或内部 map 形状必须拒绝，Bot 不接收 `matchSeed`、`configHash`、`ruleContentHash` 或 private plan。 |
| 旧合同退出 | 当前 schema 4、旧 `BotActionAffordance` 与严格 `createInput(fullSnapshot)` 只保留 migration differential/外部 strict fail-closed；不在 V5 中静默复用或 cast，PA5 再完成 legacy 主路径退出。 |
| 失败关闭/生命周期 | package-neutral trusted source reader 只验证同一 opaque handle identity、tick/eventSequence/phase、participant/profile；fake/clone handle、不同 handle、错误 participant/profile、accessor/畸形 Proxy/container/cycle/sparse/Symbol/non-finite 均在 history/RNG/InputFrame 前拒绝。稳定 pause/ended 可重复读，destroy/重复 destroy 失败关闭；同 tick 前置验证修正可重试且失败不增长 bounded history、不消费 RNG。PA3a 不测试或宣称 Core/raw binding/compositionHash/generation provenance。 |
| 测试矩阵 | V5 exact keys/逐层必需字段/递归 freeze/source isolation；package-neutral trusted source/opaque handle identity、reader method 捕获与 destroy 清理；ordinary/survival source shape；599/600/601、1199/1200/1201、1799/1800/1801、2399/2400/2401、拾取/替换/普通掉落/expired-held；preparing/running/sudden-death/ended 与稳定 identity 重复读、同 tick eventSequence/phase/内容变化拒绝、前置失败同 tick 修正；旧 V4 exact key differential 与 V5 trusted/legacy InputFrame parity。真实 Core/raw binding/compositionHash/generation/cross-Core/wrong contract/fake bundle、authority events/checkpoint/state-hash/Replay V5/terminal 端到端 parity 留给 PA3b。 |
| 回滚 | 仅反向 PA3a Bot 文件、测试、architecture 与本阶段台账 hunk；保留 PA2 及其它 dirty，不 reset/checkout。 |

#### PA3b ordinary QuickMatch + formal survival production wiring

| 项目 | 预审合同 |
|---|---|
| 允许文件 | `packages/arena-session/src/local-match-session.ts`、新增专用 `packages/arena-session/src/bot-match-read-bundle.ts`（仅 bundle factory/package-private 类型）及必要 session index/type；`packages/arena-quick-match/src/quick-match-service.ts`；`packages/arena-v1-composition/src/quick-match-service.ts` 仅在确有 descriptor/bundle 转发需要时；`packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`；必要 index、session/quick-match/composition 测试与 architecture。 |
| 禁止文件/行为 | `arena-match/match-core.ts`、`match-read-*`、Rule/Resolver、contracts、equipment/timeline、Replay V5、state-hash、golden、formal runner、Product/Presentation/InputMapper、Platform、美术；不以 `core.getSnapshot()` 作为 Bot pre-step 来源，不复制 Resolver。 |
| 创建/持有 | Outer QuickMatch/survival root 只把 `{ownedNewCore, descriptor, localId, botId, projectionContract?}` 交给 `createMatchReadBotBundleV2` 一次；该 factory 是唯一调用 Core binding/两个 reader API 的位置，返回同一 opaque bundle。Session 只验证/attach bundle，从头到尾不调用 binding/reader API、不消费槽位；BotController 收到同一 bundle identity 的 Bot-facing opaque handle/source，不持有 Core/Session/Replay/raw binding。Core 私有 owner/WeakMap 负责失效。 |
| descriptor | ordinary 使用 `compositionContractHash=null` 或省略，`contentSelectionHash` 精确取 Core config；formal survival 必须使用官方 `ARENA_V2_SURVIVAL_SUPPLY_DEFINITION`、冻结 spawn specs、Profile/participant role 合同产生的非空正式 hash，禁止自报/伪造/`deadbeef`。建议稳定 compositionId 为 `arena-quick-match.v2` 与 `arena-v2-survival-supply.v1`，最终由 PA3b fixture 锁定。 |
| 同身份原子性 | bundle 创建时证明同 Core、原始 opaque binding、compositionHash 与 lifecycle generation；PA2 当前输出不含后两者，故每次 read 只核对 world/local/bot 的 `tick`、`eventSequence`、world `phase`、participant/profile。先用 prospective bounded history 选择 delayed source，再在不写 history/不耗 RNG 下冻结完整 V5；V5 成功后允许 replan/RNG 并生成、严格归一化 InputFrame，全部成功后才 commit source history、`lastCommandTick`/`lastEventSequence` 并返回。paused/resume 未推进时复用 memo；ended 逐 participant 沿旧 Resolver 语义；step/destroy/reader 重入、stale/foreign identity 全 fail closed。策略或 InputFrame 阶段异常则销毁 Controller，不支持同实例重试；只有前置 source/provenance 验证失败可同 tick 修正。 |
| 失败与槽位 | factory 在完整 binding/readers 候选构造、互相核对并冻结后才发布 opaque bundle，但现有 Core API 没有跨调用回滚：中途失败可能已消耗 binding/reader slot，故该新 Core 立即隔离并由 outer owner 销毁，绝不复用。Session 不新增槽位；attach/构造失败不接管或销毁 caller-owned Core/Bot。成功后的单 tick read 失败不改槽位，合法输入可同 tick 重试；外层各自清理一次，禁止双 destroy。 |
| 生产迁移 | ordinary QuickMatch 与 `createArenaV2SurvivalSupplyBotSession` 两条路径都必须建立 binding/readers；Bot pre-step 不再 `core.getSnapshot()`，只从 V2 bundle 生成 InputFrame。post-step legacy snapshot/result 保留给 PA4/PA5，不能把它误写成 Bot 迁移完成。V1 `quick-match-service.ts` 若只是转发则不改，并以测试/架构记录“不改”理由。 |
| 测试矩阵 | 两路径同 seed/InputFrame 与 legacy strict controller 的逐 tick InputFrame/events/state hash/checkpoint/Replay V5/terminal parity；上述四组 tick 边界、波次/pickup/replacement/expiry/expired-held、竞争、暂停恢复、ended winner/淘汰、重复 destroy；真实同 Core/raw binding/composition provenance/generation、fake bundle、cross-Core、wrong contract、stale reader 均在 history/RNG/InputFrame 前拒绝；失败前后 history/RNG 不变、同 tick 修正重试；architecture 阻止 Bot 深导入 Core/Session/Replay 与 pre-step full snapshot 回流。 |
| 回滚 | 仅反向 PA3b Session/QuickMatch/survival wiring、测试、architecture 与本阶段台账 hunk；保留已签核 PA3a/PA2，绝不回退到 d750e4c 丢失其它 dirty。 |

#### PA3a/PA3b 评分与门禁

每个小门独立使用 100 分表：架构边界 `20`、行为等价 `20`、生命周期/失败关闭 `15`、
确定性/Replay `15`、性能可证伪 `15`、迁移/回滚 `10`、治理 `5`。总分必须 `≥90` 且每维
至少达到 `80%` 才能候选；任一负向矩阵、ownership、parity 或 architecture 红门均保持
`candidate/formalGate=false`。本批不运行 formal300、PA6/PA7 CPU 或模拟器；PA3a 与 PA3b 均已实现并通过
主协调签核。PA4a 与 PA4b-1 也已完成主协调签核；PA4b-1 为 `completed / coordinator-approved /
formalGate=false`（96/100），PA4b-2 已完成主协调签核；该 PA3 预审段记录当时 PA4b-3 尚未授权，最终签核状态见 PA4 章节；PA5+、正式性能与
P1 advance 仍关闭。

- **PA3a 实现候选自审（PA3a 签核前历史快照，已由后续 PA3b 覆盖）**：架构边界 `19/20`、行为等价 `19/20`、生命周期/失败关闭
  `14/15`、确定性/Replay `12/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，
  合计 `90/100`，每维均≥80%。行为/确定性扣分来自 PA3a 仅证明 Bot 包内 V4→V5 与 trusted-command
  source 的输入帧等价，未宣称真实 Core/bundle provenance、authority events/checkpoint/state-hash/Replay
  V5 端到端 parity；性能只完成代码级边界，未做性能实验。该分数仅请求主协调验收，不代表 PA3a 已签核、PA3 完成或 P1 advance。
- **实现证据**：PA3a 保护基线为 `/private/tmp/arena-pa3a-before.head`、`arena-pa3a-before.status`、
  `arena-pa3a-before.tracked.diff`、`arena-pa3a-before.untracked`、`arena-pa3a-before.allowed-sha256`。
  实际生产改动限于 `arena-bot` observation/controller/mobility、必要 type-only goals/navigation 与 index；
  新增/修改仅为 Bot 定向测试和本台账。V4 exact shape 保持；V5 source/observation 逐层严格键/冻结，
  map 递归拒绝 `privatePlan`，legacy 与 trusted command-source 共用同一 V5 prepare/commit 状态机，
  稳定同身份重复读返回上一已提交 InputFrame 且不增长 history/计划/RNG，前置失败可同 tick 重试，
  策略/InputFrame 阶段失败销毁 Controller。PA3a 不创建 provenance handle，Controller 仅校验外层 opaque
  handle identity；真实 Core/binding/composition/generation 当时留给尚未实施的 PA3b，现已由后续 PA3b 生产接线证据覆盖。
- **本轮独立拒绝与修订**：协调侧恶意矩阵曾复现同一 reader+handle 重绑会重新捕获被替换的 `read`，以及描述符检查期间重入 attach/destroy 可在外层失败前发布或恢复 reader；同时复现 V5 visible equipment `position` 的未知 `secret` 字段被静默裁剪。修订为 source identity 先行的幂等快路、共享实例级 attach guard、局部 descriptor/function/bound wrapper 候选与末尾 usable/lifecycle 复核，失败不消费 reader 槽；V5 position 现在执行精确 vector key/required data 校验。正式测试覆盖 trap 捕获 nested error 后继续返回合法 descriptor，外层仍以“验证期间禁止重入”拒绝且 `nestedErrors=1`、无 reader 发布；同对象重绑继续使用首次捕获方法，destroy 后不发布。当前仓库外恶意矩阵最新 `6/6` 通过；该过程红门与修订事实保留，不将早期红轮拼入绿证据。
- **门禁证据**：PA3a 专测 `7/7`，Bot 受影响定向链 `44/44`，architecture `45/45`，`build:packages` `52 packages / 11 waves`；
  PA3b outer+architecture 合跑 `59/59`（outer `12/12`、architecture `47/47`），完整受影响 Node 链 `67/67`，包级 foundation `9/9`，
  `typecheck:app`、lint、`check:documentation`（265 Markdown/839 links/57 commands）与 `git diff --check` 全绿。未运行 formal300、性能实验、模拟器。
- **PA3 签核时的历史未决风险（已由后续 PA4a/PA4b-1/PA4b-3 候选状态覆盖）**：以下“PA4a
  post-step readonly frame adapter 尚待独立验收、Product/Presentation 主路径与 post-step legacy
  snapshot/result 仍留给 PA4b/PA5”的表述是 PA3 签核时的历史快照，不是当前实现状态；后续
  PA4a 已独立签核，PA4b-1 Product V2 plumbing 已形成候选；当时 Presentation 主路径仍 legacy，
  正式 readStep/CPU 计时仍留给 PA5/PA6/PA7。Platform、真机与 4 人 P2 继续未开始/fail closed。

### PA4：Product/Presentation（PA4a、PA4b-1、PA4b-2 与 PA4b-3 `completed / coordinator-approved / formalGate=false`）

- **当前状态与真实 API 缺口**：PA4a 已由主协调独立签核为 `completed / coordinator-approved / formalGate=false`，
  评分 `95/100`；PA4b-1 Product V2 plumbing 与 PA4b-2 InputMapper/Sampler/Router 亦已完成主协调签核，
  各为 `96/100`。PA4b-3 亦已由主协调独立签核为 `completed / coordinator-approved /
  formalGate=false`，评分 `96/100`，已在授权文件面内把 `ProductMatchPresentationRuntime`、Flow、V2 projector 与
  application composition 切到 V2 read-frame/LocalActionSidecarV2 主路径；PA5 legacy 退出、性能、
  formal300、设备/真机、模拟器、美术、commit/push 与 `formalGate` 仍关闭。以下旧调用链明确标为
  PA4a 预审历史快照，不再代表当前 Presentation 实现事实。
- **门拆分与允许文件**：PA4a 仅允许
  `packages/arena-session/src/local-match-session.ts`、必要 Session type/index，以及
  `packages/arena-session/src/bot-match-read-bundle.ts` 内的 package-private frame helper、
  Session/architecture 定向测试；不创建 binding/reader、不重开 PA3 Bot 事务。PA4b 在 PA4a
  签核后才允许 `arena-product-match` runtime/coordinator/ports、`arena-product-session` controller/
  ports、`arena-product-presentation` runtime/flow/session/router、`arena-presentation-runtime`
  mapper/sampler/router、必要 `arena-v1-presentation-content` projector 与 application composition，
  以及对应测试/architecture。两门均禁止 Rule/Core/MatchRead/contracts/Bot/Replay/hash/runner/
  golden/Platform/美术。V1 quick-match adapter 若无字段转换保持不改并写测试理由。
- **PA4a 合同**：复用 PA3b 同一 bundle 的 `frameReader`，由 Session-only package-private helper
  核对 bundle/Core/local+bot identity/lifecycle 后返回冻结 `MatchReadFrameV2`；不暴露 Core、raw
  reader、binding、handle 或 bundle。Session 新增只读 `getPresentationReadFrame()` 与
  `stepWithPresentationReadFrame(input)`，后者返回 `{events, readFrame, input}`，在 authority
  step 后且发布结果前原子读取 post frame；`localActionSidecar` 非 nullable，ordinary supply
  为 null，formal survival 必须 non-null，pending-expiry 不进入 visible equipment。旧
  `step/getSnapshot/runUntilEnded` 保留为 PA4/PA5 migration allowlist，不在 PA4a 删除。V2
  方法不复制 authority step 逻辑或形成第二 tick 状态机，而是委托共享的唯一 authority-step
  内核并参数化只读返回投影：legacy 分支继续构造 full snapshot，V2 production 分支在同一次
  authority step 后只读 post `MatchReadFrameV2`，不构造 legacy full snapshot。两分支共享玩家/Bot
  输入、trusted batch、runner step、状态转换和 cleanup，只差只读返回投影；专测/architecture
  必须证明一次调用只推进一次、V2 分支 `core.getSnapshot` calls=0、event/input 与 legacy `step`
  differential 一致。PA4b 生产只使用 V2 方法，PA5 再删除/重命名 legacy。
- **PA4a implementation candidate evidence（2026-07-30，签核前历史快照）**：当时状态为
  `implementation-candidate / coordinator-independent-review-pending / formalGate=false`；本门
  只完成 Session readonly local-frame adapter，未接 Product/Presentation/InputMapper，未修改
  PA4b、PA5、性能/formal300、模拟器、美术或提交发布边界。PA4a 本门新增/修改文件为
  `packages/arena-session/src/local-match-session.ts`、`packages/arena-session/src/bot-match-read-bundle.ts`
  的 Session-only helper、`packages/arena-session/src/index.ts` 的结果类型出口、
  `tests/arena/pa4a-session-read-frame.test.ts` 与 `tests/architecture.test.ts`；既有 PA1–PA3、B1、
  expired-held 及其它 dirty 保持不变。
  专测 `12/12`，受影响 Node + architecture 合跑 `148/148`（architecture `48/48`），
  `build:packages` `52 packages / 11 waves`，`typecheck:app`、lint、documentation（265 Markdown/
  839 links/57 commands）与 `git diff --check` 全绿。证据覆盖 ordinary 1v1 与 formal survival 的同 seed
  world/local/projection differential、terminal Replay/events/state hash、V2 分支
  `getSnapshot calls=0`、paused/resume stable identity、preparing/running/sudden-death/ended、
  formal `599/600/601`、`1199/1200/1201`、`1799/1800/1801`、`2399/2400/2401`；边界断言以
  legacy authority projection 的实际可见数量为准，不硬编码每波必须三件，pending-expiry 不进入
  visible equipment。另有 captured native tick/phase getter、own-shadow/prototype drift、reentry、
  stale/foreign bundle、post-read fatal cleanup 与 cleanup retry/exact-once 证据。候选自评
  架构 `20/20`、行为等价 `19/20`、生命周期/失败关闭 `14/15`、确定性/Replay `14/15`、性能可证伪
  `12/15`、迁移/回滚 `9/10`、治理 `5/5`，合计 `93/100`，每维≥80%；扣分来自 Product/Presentation
  主路径、PA5 full-audit/readStep 与正式 CPU 尚未实现/验收，不是把缺失证据写成通过。
- **PA4a 主协调独立签核（2026-07-30）**：状态为 `completed / coordinator-approved / formalGate=false`，
  评分 `95/100`：架构 `20/20`、行为等价 `19/20`、生命周期/失败关闭 `15/15`、确定性/Replay
  `15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，各维均≥80%。独立证据为 PA4a
  `12/12`、Session/PA3b/architecture `117/117`、MatchRead contracts `42/42`、合计 `159/159`；
  `build:packages` `52 packages / 11 waves`、完整 `npm run build`、`typecheck:app`、lint、
  documentation `265/839/57` 与 `git diff --check` 全绿。PA4a 只关闭 Session readonly adapter 门，
  不代表 PA4b-1/2/3、PA5、正式性能、formalGate 或 P1 advance。
- **PA4b 子门状态（当前）**：PA4b-1 Product V2 plumbing、PA4b-2 InputMapper/Sampler/Router 与
  PA4b-3 Product/Presentation main-path migration 均为
  `completed / coordinator-approved / formalGate=false`，各评分 `96/100`。PA5 legacy 退出、性能、
  formal300、模拟器、美术、Rule/Core/MatchRead/contracts/Bot/
  Replay/hash/runner/golden/Platform/资产与 commit/push 继续锁定。
- **PA4b-1 implementation candidate evidence（2026-07-30，历史候选，已由下方签核覆盖）**：候选已覆盖
  `ProductMatchRuntime`、`ProductMatchCoordinator`、`ProductSessionController` 的 V2
  begin/current/step plumbing；V2 方法不回 legacy snapshot、不创建 reader，legacy 交叉调用仍由
  read-mode/allowlist 拒绝。ProductMatch 定向测试 `11/11`、ProductSession 定向测试 `6/6`，真实
  ordinary QuickMatch、formal survival 长供给边界与 formal Product terminal 同 seed 端到端测试
  `3/3`；PA4a、PA3b、architecture 与上述真实 Product 测试合跑 `75/75`；相关包测试合计
  `39/39`，`build:packages` `52 packages / 11 waves`。真实测试断言 preparing/running/sudden-death/ended、paused frame strictEqual、resume
  单 tick、599/600/601、1199/1200/1201、1799/1800/1801、2399/2400/2401、pending 不外泄、
  Session legacy/V2 events/InputFrame/world/Replay/checkpoint/finalHash parity，以及 Product
  completion 的 replay/checkpoints/finalHash/authorityHash 与权威结果一致。Product port 与
  ProductSession port 的 non-null result 均通过 `validateProductMatchResult()` 的完整内部字段与
  authorityHash 校验，并保留 raw result identity；seed `7→8` release/rematch、旧 frame/result
  拒绝与同身份恢复也有定向证据。该段保留签核前实现候选证据，已由下方主协调签核覆盖；不表示当时的
  PA4b-1 已签核、PA4b-2/3 已授权、
  PA5 legacy 已退出或 formalGate/P1 已通过。
- **PA4b-1 Stage 8 直接回归修订（2026-07-30）**：PA4b-1 结果合同收紧后，`stage8-product-session`
  的 6 个直接失败与 `stage8-product-state` 的 1 个直接失败均定位为 fake runtime 只返回
  `{ authorityHash }`，未满足完整 `ProductMatchResult` 合同。对应测试现在通过共享
  `stage8-test-content.ts` 的 `createProductMatchResult` 夹具生成完整冻结结果，seed 分别与各自
  `publicInfo` 的 `42`/`1` 一致，replay content/authority identity 也一致；两文件合计 `29/29`
  通过。本次只修对应测试夹具，未放宽生产 validator。主协调此前完整 `npm test` 的 `895/910`
  结果不得改写为全绿；剩余 8 项（`bot-survival-stress` participantIds 顺序与
  `presentation-foundation`）是 PA4b-1 基线前既有 dirty 红项，随后由独立前置回归修复批次处理，
  不计入本段当时的修订证据。
- **PA4b-1 签核前独立回归修复（2026-07-30，非签核证据）**：仅处理上段遗留的 2+1+5 个
  已精确定位红点，未改 Product V2 生产语义、PA4b-2/3、性能或 formal300。formal pressure
  `createSession` 现在按每个 case 的 `[plan.playerParticipantId, plan.botParticipantId]` 传入
  config；因 MatchCore config 合同会规范化 participant 集合，survival composition 只使用一次冻结的
  稳定字符串排序 expected set 做校验，压力断言与 manifest/config/replay 的 canonical identity 保持一致。
  反向 player/Bot 映射、集合不匹配 fail-closed 及同 seed Replay configHash 不变由 PA3b 定向门锁定。
  Bot capability workload decorator 现在静态捕获并代理 legacy snapshot、trusted snapshot、trusted
  command-source 的 attach/create 三条路径，并统一记录 `lastBotFrame`；Presentation 相关测试只对
  `structuredClone` 后的纯数据快照做恶意变更，并断言原权威快照及 participant/map.surfaces 仍冻结且
  JSON 不变。定向结果：formal pressure `8/8`、Bot experiment `28/28`、Presentation
  foundation+greybox `25/25`、新增角色映射/集合边界 `13/13`；这些是独立回归修复证据，不升级
  `PA4b-1` 的 `implementation candidate` 为签核状态，也不代表完整 `npm test`、性能、formalGate
  或 P1 advance 已通过。
- **PA4b-1 第二个签核前治理回归修复（2026-07-30，非签核证据）**：仅处理主协调完整治理回归中
  定位的 4 个红点。`packages/arena-match/test/match-foundation.test.ts` 的 survival supplied
  fixture 现在导入正式 `ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION`，并显式携带空
  `equipmentSupplyDisposition`；ordinary fixture 仍不携带 timeline/disposition，未放宽 state-hash
  validator。KZ branch 首项、survival pressure deterministic、weapon production migration gate
  deterministic 三个重计算型 Vitest 用例分别设置局部 `20_000ms` timeout；既有 survival matrix
  timeout 保持不变，没有修改算法、案例数量或全局 timeout。该 timeout 仅是 136 文件并发下的治理执行
  预算，不是产品性能通过或性能门调整。
  4 文件定向 `16/16`；完整 `npm run test:governance` 为 `136/136` 文件、`618/618` tests。
  本批仍不升级 `PA4b-1` 候选为签核，不代表完整 Node 回归、正式性能、formalGate 或 P1 advance
  已通过。
- **PA4b-1 主协调独立签核（2026-07-30）**：状态为 `completed / coordinator-approved / formalGate=false`，评分
  `96/100`：架构边界 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay
  `15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，各维均≥80%。独立证据为定向
  formal `8/8`、Bot `28/28`、Presentation `25/25`、PA3b `13/13`；完整 Node `911/911`，
  governance `136/136` 文件、`618/618` tests；prebuild `52 packages / 11 waves`，完整
  `npm run build` 的 web/douyin/wechat 三端通过，typecheck:app、lint、documentation
  `265/839/57`、`git diff --check` 全绿。分数仅因正式 CPU/readStep 计时及 PA5 legacy 删除尚未实施而扣分，
  不是本门功能红门；PA4b-1 签核不解锁 PA4b-3、PA5、formal300、性能、设备/真机、模拟器、美术、
  commit/push 或 P1 advance，美术继续暂停。签核时 branch 为 `feature/arena-v2-design-docs`，HEAD/upstream
  均为 `d750e4caa767332b5c3caaf247080b5717d56219`；工作区仍 dirty，未提交、未推送。
- **PA4b-2 implementation candidate（2026-07-30，历史快照，已由下方主协调签核覆盖）**：当时状态为
  `implementation-candidate / coordinator-independent-review-pending / formalGate=false`，本轮只触碰
  `packages/arena-presentation-runtime/src/arena-input-mapper.ts`、`input-sampler.ts`、
  `input-snapshot-trust.ts`、`tests/arena/input/local-action-sidecar-v2.test.ts` 与本架构测试；
  `arena-input-router.ts` 未改，已由转发测试锁定其不重写 sample options。新增显式
  `ARENA_INPUT_SOURCE_MODE.LOCAL_SIDECAR_V2`，context-primary 仅消费冻结且严格校验的
  `LocalActionSidecarV2.primary/primaryHold`，不伪造或读取 jump/slam；legacy 四通道只留显式
  legacy/differential 路径。V2 缺 sidecar、eventSequence、身份不匹配、V2+legacy（含 null）混传，
  以及 legacy 携带 V2 identity 均在 raw/gesture 消费前拒绝；合法同 tick 修正可重试。严格 copy
  后建立独立 WeakSet trust，trusted fast path 只核对当前 sample identity。普通 Proxy 的
  `ownKeys`/descriptor/prototype 反射可能触发结构性 trap，不能宣称零 trap；测试证明 getter 与
  Proxy `get` 不执行，结构性 trap 异常 fail closed，且 trusted fast path 保持对象身份。
  专测 `12/12`、输入受影响 Node `40/40`、presentation-runtime Vitest `28/28`、架构 `49/49`，
  `build:packages` `52/11`，typecheck、lint、documentation `265/839/57` 与 diff check 均通过；
  另有真实 ordinary/formal MatchRead pre-step sidecar 消费覆盖。当时尚未运行完整回归、性能或 formal；
  该段是签核前历史状态，不能脱离下方签核段理解为当前状态。
- **PA4b-2 独立红门与修复（2026-07-30，历史红门，已由下方主协调签核覆盖）**：仓库外
  `/private/tmp/arena-pa4b-2-reentry-repro.ts` 首次复现了 sidecar Proxy 结构反射期间 nested sample
  先提交 `lastTick=0`、外层随后失败的 TOCTOU；`/private/tmp/arena-pa4b-2-enumerable-repro.ts`
  首次复现了 non-enumerable `profile` 被静默规范化，以及 V2 空白字符串未按 contracts 的 trim 规则拒绝。
  修订后同一前置验证事务在读取 options、V2 sidecar 或 legacy `actionAffordance` 的结构描述符前置位；
  nested sample、pointer/lifecycle 操作均 fail closed，捕获/未捕获 trap 都不发布 nested 状态，finally
  释放 guard，普通验证错误仍可在同 tick 修正重试；raw/gesture 消费开始后的 mapper/async/reentry
  仍保持 terminal fail-closed。V2 root/channels/outcome 现在要求可枚举 data field，且 V2 的
  participant、nullable identity、lane/source/reason 均采用 trim 后非空规则；legacy 字符串合同未改变。
  两个仓库外复现均已转绿，新增 sidecar/options/legacy trap、missing/undefined、continuous hold 与
  identity retry 证据后，专测为 `12/12`、输入 Node 为 `40/40`。随后第二轮独立复现
  `/private/tmp/arena-pa4b-2-error-normalization-repro.ts` 发现验证错误离开 guard 后的 hostile
  coercion 可再次 nested commit，`/private/tmp/arena-pa4b-2-terminal-normalization-repro.ts` 发现
  `#fail` 在登记 terminal 状态前格式化 hostile thrown value 会丢失 fail-closed。修订为将原始 unknown
  仅作为 opaque cause/originalError 保存，验证期不做字符串化；`#fail` 先登记静态 terminal Error，
  再执行 suspend/reset，cleanup 异常也以安全包装聚合，不能覆盖 terminal 状态。两条第二轮复现与
  新专测均已转绿。随后同源 constructor rollback 复现
  `/private/tmp/arena-pa4b-2-constructor-rollback-repro.ts` 证明 hostile constructor error 的
  coercion 会跳过已创建 `RawControlState` 的 destroy；现已让 constructor original/rollback 和
  raw/gesture destroy cleanup 全部使用不触碰 caller value 的静态包装，并在登记 cleanup 错误后继续尝试
  第二个句柄。第五条外部复现和双 cleanup 专测均已转绿。本段保留两轮红门及修复历史，不把它写成
  主协调签核或性能证据。
- **PA4b-2 主协调独立签核（2026-07-30）**：状态为 `completed / coordinator-approved / formalGate=false`，评分
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
  `d750e4caa767332b5c3caaf247080b5717d56219`，工作区仍 dirty，未 commit/push。签核当时 PA4b-3
  尚未授权；最终签核状态见本节末。PA5+、PA6/PA7、正式性能、formal300、设备/真机、模拟器、美术、
  commit/push 与 P1 advance 继续锁定。

- **PA4b-3 Product/Presentation 主路径实现候选（2026-07-30，签核前历史快照，已由下方最终签核覆盖）**：当时状态为
  `implementation-candidate / coordinator-independent-review-pending / formalGate=false`。本门使用
  `documentation-and-adrs` skill 记录实现决策与证据，只影响本 ADR、P1 台账及本轮授权的
  Product/Presentation 候选文件；不代表主协调签核、formalGate、性能或 P1 advance。
- **精确文件面**：生产改动限于
  `packages/arena-product-presentation/src/product-match-presentation-runtime.ts`、
  `product-presentation-flow.ts`、`product-presentation-session.ts`；
  `packages/arena-v1-presentation-content/src/arena-frame-projector.ts`；
  `packages/arena-v1-application-session/src/product-presentation-session-composition.ts`；以及
  `tests/arena/pa4b-3-product-presentation.test.ts`、既有 Product Presentation/边界测试和
  `tests/architecture.test.ts`。未触碰 Core/Rule/Resolver/MatchRead/contracts/Bot/Replay/hash/
  runner/golden/Platform/资产或 PA4b-2 mapper/sampler/router production 文件。
- **生产行为映射**：Presentation Runtime/Flow 只捕获 V2
  `beginMatchWithReadFrame`、`stepMatchWithReadFrame`、`getActiveMatchReadFrame`；begin 返回 current
  frame，running pre-step 读取同 identity 的 `LocalActionSidecarV2` 并以显式
  `local-sidecar-v2` 模式采样，step 只推进一次 authority 并消费 post frame/events/result。
  V2 projector 只从 world/local sidecar/events/public info/content 投影，display 只使用公开
  `primaryActionDefinitionId`，不读 `participant.actionAffordance`、不重判 authority、不制造
  jump/slam。旧 full snapshot/projector/API 继续是 PA5 legacy/differential allowlist。
- **测试与门禁证据**：PA4b-3 专测 `10/10`；Product Presentation Node `19/19`、Product boundary
  Vitest `25/25`、PA4b-2 输入 `12/12`、architecture `50/50`；受影响 PA4a `12/12`、PA3b `13/13`、
  PA4b-1 real `3/3`、Product V2 `24/24`、MatchRead `25/25`。`build:packages` 为 `52 packages / 11 waves`，
  `typecheck:app`、lint 已通过；documentation/diff check 在本文档更新后执行。真实 ordinary/formal
  完整 terminal/replay/checkpoint/finalHash/authorityHash 独立签核仍未发生，本门不运行完整 npm test/build、
  formal300 或性能实验。
- **自审与回滚**：V2 三件套固定捕获，partial/foreign/mixed frame、缺失/额外/未冻结消费字段、
  wrong participant、tick/eventSequence 混帧、reentry、thenable/async、destroy 后读取均 fail closed；
  Presentation 失败不回写 authority，authority 已推进后的 post-read 失败沿 Session fatal cleanup。
  回滚只反向本候选 Product/Presentation/projector/composition、测试和 architecture patch，保护既有
  PA1–PA4b-2 及其它 dirty，不使用 `reset`/`checkout`。未决风险是主协调独立端到端 parity 与 PA5
  legacy 退出/正式 readStep CPU 证据。
- **读取时序/所有权**：start 读 current world+local sidecar；pre-step 读同 identity current frame
  后采样玩家输入；authority step 后读取 post world/local 并原子返回；paused/resume 未推进时
  strictEqual memo；ended 按旧 ParticipantSystem 逐 participant 输出，winner 可 selected，淘汰者
  才可能 `participant-unavailable`；destroy 维持既有失效顺序与幂等。build 期间 step/trusted-step/
  destroy、reader/capability 创建、public/checkpoint/hash 与跨 reader 重入均拒绝；失败不发布或
  覆盖旧 memo。PA2 输出没有 compositionHash/generation 字段，PA4 只复核 bundle 创建时的
  provenance，并逐次核对 frame 的 tick/eventSequence/phase/participant/profile，不虚构字段。
- **PA4b 产品边界**：只让 Product port 取得冻结 frame/step result；ProductSessionController、
  ProductMatchRuntime/Coordinator、PresentationFlow/Runtime 不持有 Core/raw reader/bundle，不在
  callback 回读 Session/Core。旧 `{events,snapshot,result}` 迁移为显式 V2 forwarding；legacy
  getter 仍是有期限 allowlist，PA5 才退出。Renderer/UI 只投影 world/local，不参与命中、拾取、
  淘汰、随机、胜负或动作裁决。
- **PA4b architecture allowlist**：Product V2 生产方法与 Presentation 主路径不得调用
  `getActiveMatchSnapshot()`/`getSnapshot()`，不得读取 `participant.actionAffordance`，也不得从
  legacy snapshot 重投影 V2；这些名称只能出现在明确标注的 legacy/differential allowlist，留给
  PA5 删除。PA4b-1 的 Runtime/Coordinator/Session legacy 方法仍是迁移 allowlist，不能被当作
  V2 路径证据。Session 之外不得出现 bundle/raw reader，PA4a helper 只允许由
  `local-match-session.ts` 相对导入且不从 Session package index 导出；Product 只能消费 Session
  返回的冻结 frame/step result。
- **InputMapper 精确迁移**：`LocalActionSidecarV2` 只有
  `schemaVersion/tick/eventSequence/participantId/profile/primaryActionDefinitionId/primary/primaryHold`。
  context-primary 只消费严格 local sidecar 或显式两通道 adapter，并 exact-match tick/
  eventSequence/participant/profile；连续 press/hold 使用 current pre-step sidecar。旧
  `MapperActionAffordance` 四通道 exact shape 不能接收缺失 jump/slam，PA4 不伪造或放宽校验；
  gesture-mobility/explicit-combat-jump 不依赖 affordance，继续用显式输入。`primaryActionDefinitionId`
  仅用于显示/映射兼容，canAct=false 的 display fallback 仍由 Rule/Core 生成，Presentation 不重裁决。
- **真实消费者映射**：`ProductMatchRuntime` 从 legacy `step/getSnapshot` 改为转发 frame；
  `ProductMatchCoordinator` 转发稳定 frame；`ProductSessionController` 的 begin/step/active getter
  迁移为 V2；`ProductMatchPresentationRuntime` 的 pre-step local action 改读 sidecar、post-step
  改读同 identity frame/events；`arena-frame-projector` 从 world+local sidecar 重组 HUD。输入 pilot、
  experiment、greybox、fuzz/soak 仍是开发/测试隔离，不能回流生产双主路径。
- **审计/计时与测试**：PA4 不删除或移出 scheduled full audit；固定 tick0、每60tick、phase transition、
  599/600/601、1199/1200/1201、1799/1800/1801、2399/2400/2401，以及 MatchStarted、
  EquipmentSpawned/PickedUp/Dropped/DropFallback/Replaced/Recycled/Despawned、ActionStarted、
  HitResolved、KnockbackApplied、DownSmashLanded、PlayerEliminated/Respawned、SuddenDeathStarted、
  MatchEnded 后的稳定 tick，去重后全 participant full-audit。未来 readStep 计时必须包括玩家
  InputMapper、Bot input、Session authority step、post frame 与 schedule；PA5 才落地
  `measurementSchemaVersion=2` evidence。测试覆盖 ordinary/survival、所有 phase、winner/淘汰、
  pause/resume、连续 press/hold、旧四通道拒绝、full recomposition、Replay/events/checkpoint/
  state hash 不变、reentry/stale/foreign/destroy/failure cleanup；其中 4 人只作为 PA4b 纯数据消费者
  的 synthetic contract/顺序稳定性测试，不宣称 PA4a 或当前 P1 authority 支持真实 4 人；当前不运行。
- **回滚/评分/美术**：PA4a 只反向 Session adapter/bundle helper/test/architecture，PA4b 只反向
  Product/Presentation/InputMapper/test/architecture；保留 PA1–PA3/B1/expired-held dirty，不用
  `reset/checkout`。候选自评架构 `20/20`、行为 `19/20`、生命周期 `14/15`、确定性/Replay
  `14/15`、性能可证伪 `14/15`、迁移/回滚 `9/10`、治理 `5/5`，合计 `95/100`，每维≥80%；
  扣分因 PA5 readStep 与正式 CPU 尚无实现证据，且 PA5 legacy 删除尚未实施；PA4b-1 与 PA4b-2 均已完成主协调签核，
  该候选段记录签核前仍待主协调独立复核；PA5+ 仍未授权。PA4b-2 签核不恢复美术的只读接口适配/代表样件；正式资产替换、设备/Final 与共享
  authority 文件继续关闭。

- **PA4b-3 独立红门与修复（2026-07-30，历史红门，已由最终签核覆盖）**：首轮仓库外
  `/private/tmp/arena-pa4b-3-hostile-projector-repro.ts` 复现 post-authority hostile projector
  thrown value 后 `authoritySteps=1` 但 runtime 仍为 `running`；
  `/private/tmp/arena-pa4b-3-input-identity-repro.ts` 复现错误 tick 的官方 normalized
  `InputFrame` 已进入 `stepMatchWithReadFrame`。两项初始结果均 exit 1，保留为红门历史，不与早期
  绿证据拼接。
  修订后 caller thrown value 只作为 opaque cause 保存，静态 terminal Error/`FAILED` 先登记；
  constructor、event-window、destroy cleanup 的归一化不再 String/coerce caller value，避免 hostile
  coercion 绕过 terminal 或跳过 owned cleanup。sample 返回后、Controller 调用前新增 normalized
  provenance、当前 tick 与 local participant 校验；前置 sample 尚未返回且 authority 未进入时可同 tick
  重试，成功 sample 后的身份/shape 错误、authority 已进入及 post-frame/projector/event-window/result
  验证错误均 terminal fail-closed。两份首轮外部复现现为 `2/2`，PA4b-3 专测为 `10/10`；签核前仍是
  `implementation-candidate / coordinator-independent-review-pending / formalGate=false`，未运行完整
  npm test/build、正式 CPU/formal300、模拟器，未提交/推送。

- **PA4b-3 第二轮独立红门与修复（2026-07-30，历史红门，已由最终签核覆盖）**：
  `/private/tmp/arena-pa4b-3-post-input-identity-repro.ts` 首次证明 post frame 为 tick `1` 时，
  Controller 仍可返回另一个合法 trusted normalized `InputFrame`（tick `99`），并被 Presentation
  Runtime 接受；初始结果为 exit 1，保留为独立红门历史。现已在 post frame 严格读取后，核对返回
  input 与本次提交 input 的 participant、tick、完整 V4 语义字段及 `input.tick === postTick - 1`；
  result 同时核对当前 public match 的 matchSeed、content hash 与 opponent identity。mismatch 在
  projector 前 terminal FAILED，authority 仅进入一次；新增 wrong post tick/participant、trusted
  semantic drift、foreign result seed 矩阵，PA4b-3 专测现为 `10/10`。三份仓库外复现现为 `3/3`，
  签核前状态仍为 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`。

- **PA4b-3 第三轮独立红门与修复（2026-07-30，历史红门，已由最终签核覆盖）**：
  `/private/tmp/arena-pa4b-3-result-world-identity-repro.ts` 首次复现 post world 的
  `result` 判定 `player-1`，Controller 却返回另一位 participant 的合法 `ProductMatchResult`；
  初始结果为 exit 1，错误结果还继续触发第二次 projector 并进入 `RESULT`。
  `/private/tmp/arena-pa4b-3-flow-hostile-error-repro.ts` 首次复现 `synchronize` 的 hostile
  `Symbol.toPrimitive` 在失败登记前被 coercion，Flow 错误后仍为 active；初始结果同为 exit 1。
  两项红门均保留为独立历史，不与早期绿证据拼接。
  修订后，ProductMatchPresentationRuntime 在 projector 前轻量核对 public opponent/content participant
  identity，并将 terminal result 的 `winnerId/reason/isDraw/endedAtTick` 与 post world result
  逐字段绑定；winner 仅允许 `null/local/opponent`，world/phase/result 不一致、unknown winner
  和 foreign result 均在 authority 只进入一次后 terminal `FAILED`，第二次 step 被拒绝。
  ProductPresentationFlow 及 constructor/runtime/synchronize/recover/dispatch/destroy cleanup
  路径统一先登记静态 Error/`FAILED`，caller thrown value 只作 opaque cause，不做 `String`/隐式
  coercion，cleanup 失败继续聚合且不跳过后续 owned cleanup。
  两份新增外部复现现为 `2/2`；PA4b-3 专测为 `12/12`；受影响 Node 选择集为 `160/160`
  （含 architecture），Presentation/Product Vitest 为 `42/42`，`build:packages` 为
  `52 packages / 11 waves`，`typecheck:app` 与 lint 已通过。该轮 ordinary 终局证据使用测试
  adapter 将 public opponent profile id 改写为 authority participant id；后续独立运行真实
  Product Presentation Node 仅 `12/19`，7 项因该错误约束失败，因此这段 adapter 证据已明确
  判为无效历史快照，不得与当前 ordinary 证据拼接。formal 使用正式 survival composition 的
  证据仍保留为历史记录。此前 `10/10` 与本段 `12/12` 均为历史计数，当前计数见第四轮修复段。
  签核前状态仍为 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`；
  未运行完整 npm test/build、正式 CPU/formal300、模拟器，未提交/推送。

- **PA4b-3 第四轮独立红门与修复（2026-07-30，历史红门，已由最终签核覆盖）**：
  独立真实 ordinary 运行 `tests/arena/presentation/product-presentation.test.ts` 为 `12/19`，
  暴露上一轮 `publicMatchInfo.opponent.id === opponentParticipantId` 约束错误：QuickMatch 的
  profile id（如 `opponent-comet`）不是 authority participant id；上一轮测试 adapter 改写
  该字段，故证据无效。现已删除错误等同约束，只保留 `result.opponent` 与 public opponent
  profile identity 一致，并以 content participant assignment 与 world/result participant
  证明 authority local/opponent 身份。无 adapter 的真实 ordinary path 现为 `19/19`，PA4b-3
  专测为 `14/14`，ordinary/formal 真实 Product→Presentation 终局测试不再改写 public metadata。
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

- **PA4b-3 第五轮完整门禁红门与修复（2026-07-30，历史红门，已由下方最终签核覆盖）**：主协调独立执行的修复前
  完整 `npm test` 为 `939 tests / 927 pass / 12 fail`，第二次失败块复跑结果稳定；这 12 项
  不是新的完整回归绿证据，必须保留为本轮历史红门。共同首因是
  `ProductPresentationSession` 已固定使用 `actionSourceMode=local-sidecar-v2`，而
  `createProductPresentationSessionComposition` 的默认 `mapperId` 仍为
  `explicit-combat-jump`，使严格 InputSampler 在初始化处拒绝，连带造成
  `product-presentation-session` 11 项和 `entry-canvas-product-composition` 1 项失败。
  修订将正式组合默认值固定为 `context-primary`；若调用方显式选择 legacy/gesture mapper，
  在组合构造边界立即 fail closed，且在 renderer/host/factory 副作用前拒绝。自定义
  `mapperFactory` 仍必须返回 context-primary 合同；错误 mapper id、thenable、accessor 与
  hostile thrown value 均安全失败并回收已创建的 Presentation 资源，不放宽 InputSampler、
  不回退 legacy。listener cleanup、输入失败、Renderer 重入和 destroy 语义在修复后单独复验。
  当前局部门禁证据为：application-session composition Vitest `6/6`；
  ProductPresentationSession 与 entry-canvas Node 首轮 `15/15`；PA4b-3 专测 `14/14`；真实
  Product Presentation Node `19/19`；Product Presentation boundary Vitest `25/25`；
  architecture `50/50`；`build:packages` `52 packages / 11 waves`；`typecheck:app` 与
  lint 通过。该轮尚未重跑完整 `npm test`/完整 build，故不得把 `927/939` 历史红门改写为
  完整绿证据。当前仍为
  `implementation-candidate / coordinator-independent-review-pending / formalGate=false`（签核前历史状态）；
  PA5+、正式 CPU/formal300、模拟器/设备、美术与 commit/push 仍未授权。

- **第五轮 follow-up 红门与修复（2026-07-30，历史红门，已由最终签核覆盖）**：静态安全复核发现
  `safelyWrapMapperFactoryError` 的 `error instanceof Error` 会观察 hostile Proxy 的
  `[[GetPrototypeOf]]`，此前的 `15/15` 未覆盖该边界。现已移除所有 caller-thrown value 的
  `instanceof`/字符串化/属性观察，任意 unknown 均包装为静态 Error，仅以不可枚举 opaque
  `cause` 附着。新增 Proxy 的 `getPrototypeOf`、`get`、descriptor 与
  `Symbol.toPrimitive` trap 计数测试，mapperFactory failure 时 trap 为 `0`，controller
  destroy 精确一次，renderer/lifecycle/canvas 均回收，重复 destroy 幂等。重建 packages 后
  ProductPresentationSession 与 entry-canvas Node 为 `16/16`；`build:packages` 为
  `52 packages / 11 waves`；typecheck、lint、git diff --check 通过。该 follow-up 仍未运行
  完整 npm test/build，状态保持
  `implementation-candidate / coordinator-independent-review-pending / formalGate=false`（签核前历史状态）。

- **PA4b-3 主协调独立签核（2026-07-30）**：状态为 `completed / coordinator-approved / formalGate=false`，
  评分 `96/100`：架构边界 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay
  `15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，各维均≥80%。性能扣分仅因正式
  `readStep`/CPU 属 PA5+ 尚未运行，迁移扣分仅因 PA5 legacy 退出尚未完成，不是本门功能红门。
  主协调独立证据分为两层：历史红门保留第五轮修复前完整 `npm test` 的 `939 / 927 pass / 12 fail`
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

### PA5：文件级设计预审（四门，签核前历史预审快照；已由后文最终签核覆盖）

本节为签核前的文件级预审历史修订快照。PA5 设计状态为 `design-preaudit-approved / coordinator-approved /
formalGate=false`；当时 PA5a 与 PA5b 均为 `completed / coordinator-approved / formalGate=false`，评分均为
`96/100`；当时 PA5c、PA5d 尚未授权；当前 PA5a–PA5d 与 PA5 总门均已由后文最终签核覆盖。顺序固定为
`PA5a → PA5b → PA5c → PA5d`。该历史状态已由后文 PA5 四门与总门最终签核覆盖。本轮预审基线保留：
`feature/arena-v2-design-docs`、HEAD/upstream=`d750e4caa767332b5c3caaf247080b5717d56219`、
87 dirty entries（65 tracked、22 untracked）；PA5a 基线快照在 `/private/tmp/arena-pa5a-before.*`，早期
PA5 预审快照 `/private/tmp/arena-pa5-before.*` 仅作历史证据。

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

所有小门均禁止修改 Rule/Core 算法、Bot 行为、Presentation UI、Platform、Replay V5、state
hash、golden 语义、formal 阈值、设备与美术。每门必须独立评分：架构20、行为等价20、生命周期/
失败关闭15、确定性/Replay15、性能可证伪15、迁移/回滚10、治理5；总分≥90且每维≥80，否则停止。

#### PA5a：legacy 边界、真实改名与 audit/research/test caller 迁移

允许源码文件：

- `packages/arena-match/src/match-core.ts`
- `packages/arena-match/src/index.ts`
- `packages/arena-match/src/replay.ts`
- `packages/arena-match/src/fixed-step-match-runtime.ts`
- `packages/arena-session/src/local-match-session.ts`
- `packages/arena-session/src/index.ts`
- `packages/arena-bot/src/bot-controller.ts`
- `packages/arena-bot/src/bot-observation.ts`
- `packages/arena-bot/src/index.ts`（仅旧 trusted snapshot 面退出所需的类型/出口核对）
- `packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts`
- `packages/arena-regression/src/arena-v2-survival-golden-replay-scenario.ts`
- fuzz/stress/POC authority callers：`scripts/arena-input-fuzz.ts`、
  `scripts/arena-survival-supply-stress.ts`、`src/arena/entry/match-core-poc.ts`
- experiment/research callers：`packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts`、
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
  `packages/arena-v1-experiment/src/arena-v2-weapon-white-platinum-dual-guns-replay-prototype.ts`

`packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts` 同步移除旧
`attachTrustedSnapshotReader/createInputFromTrustedSnapshot` 装饰器，只保留普通 legacy
`createInput(snapshot)` 与 PA3b V5 command-source handshake；不得为旧 reader 创造新的 wrapper。

`packages/arena-match/src/fixed-step-match-runtime.ts` 仅是 test/dev legacy allowlist：不是真实生产入口，
不接入 PA5b Session capability；只有为了显式标记其 audit 名称或 architecture reachability 才可有
最小 hunk，否则保持零 diff。

InputPilot research-only adapter source：`packages/arena-input-pilot/src/input-pilot-observed-session.ts`；
`packages/arena-input-pilot/src/input-pilot-observed-match-service.ts` 只有实际 adapter wiring/type
需要时才可修改；`packages/arena-input-pilot/src/index.ts` 只有显式 adapter contract 需要出口时才可修改；
`packages/arena-input-pilot-presentation/src/input-pilot-presentation-runtime.ts` 只用于锁定
research-only reachability，合同不变时不得改。`arena-product-session-stress.ts`、
`arena-profile-persistence-stress.ts` 与 input-pilot web UI/Pilot state snapshot 不属于本门。

以下 source 不属于 PA5a：`packages/arena-product-match/src/product-match-runtime.ts`、
`packages/arena-product-match/src/product-match-coordinator.ts`、`packages/arena-product-session/src/ports.ts`、
`packages/arena-product-session/src/product-session-controller.ts`、
`packages/arena-quick-match/src/quick-match-service.ts`、
`packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`；它们只在 PA5c
同步退出旧 surface。`packages/arena-experiment/src/index.ts`、
`packages/arena-experiment/src/simulation-workload-registry.ts`、
`packages/arena-experiment/src/simulation-runner.ts` 的 `ArenaSimulationCase.getSnapshot()` 是
Experiment domain 的标准化 `SimulationSnapshot`，不改名、不纳入 authority legacy 改名。

**允许修改/新增的测试文件**：

- `tests/architecture.test.ts`
- `tests/arena/pa5a-legacy-snapshot-allowlist.test.ts`（新增）
- `tests/arena/match-core.test.ts`
- `tests/arena/match-core-equipment.test.ts`
- `tests/arena/match-core-movement.test.ts`
- `tests/arena/match-core-survival-supply.test.ts`
- `tests/arena/replay.test.ts`
- `tests/arena/character-foundation.test.ts`
- `tests/arena/stage5-map-integration.test.ts`
- `tests/arena/local-match-session.test.ts`
- `tests/arena/local-match-session-bot-read.test.ts`
- `tests/arena/bot-match-read-bundle.test.ts`
- `tests/arena/bot-survival-composition.test.ts`
- `tests/arena/match-read-frame.test.ts`
- `tests/arena/match-read-port.test.ts`
- `tests/arena/presentation/input-pilot-runtime.test.ts`
- `tests/arena/study/human-match-study.test.ts`
- `tests/arena/product/stage8-content-pool.test.ts`
- `tests/arena/regression/golden-replay.test.ts`
- `packages/arena-match/test/match-foundation.test.ts`
- `packages/arena-input-pilot/test/input-pilot-vocabulary.test.ts`
- `packages/arena-input-pilot-presentation/test/input-pilot-presentation-runtime.test.ts`

以下直接或间接依赖本门 authority/Session 改名，也属于允许修改面：

- `tests/arena/bot-controller.test.ts`、`tests/arena/bot-goals.test.ts`、`tests/arena/bot-mobility.test.ts`
- `tests/arena/bot-observation.test.ts`、`tests/arena/bot-observation-v5.test.ts`
- `tests/arena/input/input-frame-rate.test.ts`、`tests/arena/input/input-match-integration.test.ts`
- `tests/arena/trusted-input-batch.test.ts`、`tests/arena/pa3b-outer-wiring.test.ts`
- `tests/arena/pa4a-session-read-frame.test.ts`、`tests/arena/presentation/greybox-renderer.test.ts`
- `tests/arena/presentation/presentation-foundation.test.ts`
- `packages/arena-bot/test/bot-foundation.test.ts`
- `tests/arena/bot-controller.test.ts`、`tests/arena/bot-observation.test.ts`
- `tests/arena/bot-observation-v5.test.ts`、`tests/arena/bot-survival-composition.test.ts`

**只运行、不得默认产生 diff 的受影响回归文件**：

- `packages/arena-quick-match/test/quick-match-foundation.test.ts`
- `packages/arena-v1-composition/test/arena-v1-composition.test.ts`
- `packages/arena-experiment/test/experiment-primitives.test.ts`
- `tests/arena/experiment/arena-experiment.test.ts`

`packages/arena-experiment/test/experiment-primitives.test.ts`、
`tests/arena/experiment/arena-experiment.test.ts` 与 `scripts/arena-match-stress.ts` 中的
`simulationCase.getSnapshot()` 是 Experiment `SimulationSnapshot` 消费，不是 authority full
snapshot，明确只运行/不改名。LocalMatchSession 的 full-snapshot fallback 仅允许存在于无
`botMatchReadBundle` 的 legacy 分支；PA5a 精确 caller 为 `tests/arena/local-match-session.test.ts`、
`tests/arena/local-match-session-bot-read.test.ts`、`tests/arena/pa3b-outer-wiring.test.ts`、
`tests/arena/pa4a-session-read-frame.test.ts` 的 legacy differential/control，以及
`scripts/arena-formal-survival-bot-pressure.ts` 的 PA5b residual。QuickMatch 与 formal survival
production source 均必须以 bundle 进入 V5 分支；allowlist test 要证明该 fallback 不在两条
outer production reachability 内，且 V5 分支不调用 Core full snapshot。BotController 普通
`createInput(snapshot)` 只服务上述 legacy/audit 分支，旧 `trustedBinding`、
`TrustedSnapshotReader`、`attachTrustedSnapshotReader`、`createInputFromTrustedSnapshot` 与
`createTrustedBotSourceSnapshot` 在本轮退出。PA5a 必须是真实迁移，不是只新增 alias：`MatchCore.getSnapshot()` 改为
`getLegacyFullSnapshotForAudit()`；`createTrustedPublicSnapshotReader()` 的旧 Bot 语义在本门默认删除，
不因测试而新建 reader。只有实施中发现现有且已列入允许面的 verifier/differential source 确实需要
reader，并提交 necessity evidence，才允许引入显式 `createLegacyFullSnapshotAuditReader()`；测试本身不是保留
API 的理由。PA5a 专测应证明旧 reader symbol/生产 reachability 消失，并验证现有 MatchRead sidecar/bundle
边界，不把边界测试列为 reader caller。Headless `runUntilEnded()`
改为 `runLegacyUntilEndedForAudit()`，`step(frames)` 永久不改。LocalSession 新增/固定显式
`getLegacyFullSnapshotForAudit()`、`runLegacyUntilEndedForAudit()`、必要时
`stepWithLegacySnapshotForAudit()`；模糊 Session surface 留到 PA5c 删除，PA5a 不新增 caller。
regression、列出的 experiment workload、fuzz/stress/POC、human study 与 InputPilot observed
wrapper/test 全部转到显式 audit/research adapter。`scripts/arena-formal-survival-bot-pressure.ts`
在 PA5a 是精确 residual，PA5b 一次性迁移到 readStep 后移除其 LocalSession 模糊 snapshot 调用。
`packages/arena-experiment/src/index.ts`、`simulation-workload-registry.ts`、`simulation-runner.ts`
及其 generic tests 不改名；`scripts/arena-match-stress.ts` 对 `simulationCase.getSnapshot()` 同样
不改名。`arena-product-session-stress.ts`、`arena-profile-persistence-stress.ts` 以及 input-pilot
web 的 `getSnapshot()` 是 Product/Profile/UI state snapshot，明确排除；内部
`MatchTimelineSystem.getSnapshot()`、`MatchParticipantSystem.getSnapshot()` 等非 Arena authority
full snapshot 也排除。

PA5a 只冻结 Product 旧 surface 的退出计划；若为保持编译迁移暂时保留模糊 Session/Product
方法，必须在架构中标为 PA5c 删除对象，不能成为长期 compatibility allowlist。

#### PA5b：现有 bundle 扩展、full-audit readers 与 readStep

允许源码文件：

- `packages/arena-session/src/bot-match-read-bundle.ts`
- `packages/arena-session/src/local-match-session.ts`
- `packages/arena-session/src/index.ts`
- `packages/arena-performance-evidence/src/arena-read-step-measurement-v2.ts`（新增）
- `packages/arena-performance-evidence/src/index.ts`
- `scripts/lib/arena-read-step-runner-v2.ts`（新增）
- `scripts/arena-formal-survival-bot-pressure.ts`

允许测试文件：

- `packages/arena-performance-evidence/test/arena-read-step-measurement-v2.test.ts`（新增）
- `tests/arena/pa5b-full-audit-bundle.test.ts`（新增）
- `tests/arena/pa5b-read-step-runner.test.ts`（新增）
- `tests/arena/bot-survival-stress.test.ts`
- `tests/architecture.test.ts`

full-audit readers 必须在现有 `createMatchReadBotBundleV2` 的唯一 binding 事务内，按
`config.participantIds` 稳定顺序调用现有 Core sidecar reader API；存入同一 BundleRecord，和
frame/mobility reader 共用生命周期。禁止第二个 binding、bundle factory、WeakMap manager 或
Core reader owner。失败由 outer 新 Core owner quarantine/destroy，factory 不自行 destroy。

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
formalGate=false`；本段为首轮开发自检，随后被主协调独立验收拒绝，不能与下方修订证据拼接。
实施前保存新的
`/private/tmp/arena-pa5b-before.*`，未覆盖 PA5/PA5a 基线；branch 为
`feature/arena-v2-design-docs`，HEAD/upstream 均为 `d750e4caa767332b5c3caaf247080b5717d56219`，
基线为 125 dirty entries（102 tracked、23 untracked）。PA5c/d、PA6/PA7、完整 npm test/build、
正式 CPU/formal300、设备/模拟器、美术与 commit/push 仍关闭。

本轮仅修改 PA5b allowlist：现有 bundle 在同一 binding 事务中按 Core participant 顺序创建
full-audit readers，Session 只提供按需冻结 evidence result；新增 runner/evidence 层独占 schedule
与 `measurementSchemaVersion=2`，formal pressure 不再调用模糊 LocalSession snapshot。未新增
binding、bundle factory、WeakMap manager、raw reader export 或 authority schema；PA5c source 保持零 diff。

首轮开发自检证据：PA5b 专测 `4/4` Node、measurement `2/2` Vitest、architecture 与新增测试合跑
`55/55`、既有 bundle/Session/MatchRead/Replay/ordinary/survival 受影响链 `105/105`、
`bot-survival-stress` `8/8`、`build:packages` `52 packages / 11 waves`、`typecheck:app`、lint、
git diff check 均通过；本轮未运行完整 npm test/build、正式 CPU/formal300、模拟器或设备。既有
formal pressure 仅作为允许的测试夹具验证，不宣称性能门通过。测试覆盖稳定 participant 顺序、
duplicate schedule、full-audit 身份/失效、active transaction、ordinary/formal projection、
pause/resume/ended、tampered/future schema、accessor/Proxy/thenable fail-closed 与重入边界。

首轮开发自评（100 分，已被独立红门覆盖）：架构 `20/20`、行为等价 `19/20`、生命周期/失败关闭 `15/15`、确定性/Replay
`15/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，合计 `95/100`，各维≥80%。性能扣分
仅因本门禁止正式 CPU/readStep 门；首轮候选随后被独立红门拒绝，不解锁 PA5c。

#### PA5b 第一轮主协调独立验收拒绝与第二轮修订候选（2026-07-30）

首轮独立验收状态为 `rejected-after-independent-review / formalGate=false`，其红门不得被
首轮 `4/4`、`55/55` 或其它早期计数覆盖：R1 为 bundle publish 前无条件 eager full-audit，绕过
runner-only schedule；R2 为 tick0 frame/full-audit/校验/重组成本未进入 formal 聚合计时；R3 为
`events.length > 0` 触发未知事件且没有固定 17 类集合；R4 为 differential/recomposition 可选且
formal pressure 未实际调用，未逐 participant、逐字段重组 legacy audit oracle；R5 为 partial
reader construction、paused/resume/ended、duplicate schedule、全边界、tick0 与 accessor/Proxy/
thenable 证据不足；R6 为治理文字把未验证 schedule/differential 写成已实现。该段保留为历史拒绝，
修复后才重新形成当前候选，早期计数不与当前证据拼接。

该段记录的是首轮修复后的历史候选状态，不代表最终主协调签核；PA5c/PA5d、PA6/PA7、全量 test/build、正式 CPU/formal300、
设备/模拟器、美术与 commit/push 仍关闭。`/private/tmp/arena-pa5b-before.*` 保留实施前
`feature/arena-v2-design-docs`、HEAD/upstream=`d750e4caa767332b5c3caaf247080b5717d56219`、
125 dirty（102 tracked、23 untracked）证据；相对基线 `missing=0`，新增路径与 existing-path hash
变化均在 PA5b allowlist。

修订事实：full-audit readers 仍在同一既有 binding 事务内按 participant 顺序创建并共用
BundleRecord 生命周期，但不再在 bundle publish 前读取；普通构造/start/未命中 schedule 的 V5
step 读取计数为 0，scheduled tick 才读取全部 participants。runner 将 tick0 frame/full-audit/
验证/recomposition 放入一个 measurement，并由 formal pressure 聚合；固定 `ARENA_MATCH_EVENT`
17 类、未知事件不触发、同 tick 重复原因去重；mandatory recomposition 对 world 与全 participant
sidecars 做冻结、身份、顺序、字段和 legacy audit oracle 逐项对照，custom differential 只能附加。

修订证据：PA5b bundle/runner `9/9` Node、measurement `2/2` Vitest、architecture 与 PA5b 新增测试
`60/60`、既有 MatchRead/Session/Replay/ordinary/survival 受影响链 `162/162`、
`bot-survival-stress` `8/8`、`build:packages` `52 packages / 11 waves`、typecheck:app、lint、
git diff check 通过。专测包含真实 ordinary/formal production Session、fake-clock tick0 聚合、
17 类/未知/重复事件、599/600/601、1199/1200/1201、1799/1800/1801、2399/2400/2401、
partial reader 隔离、paused/resume/ended 稳定 identity、tamper/accessor/Proxy/thenable 与
mandatory recomposition。未运行完整 npm test/build、正式 CPU/formal300、设备/模拟器；等待第二轮
主协调独立验收。

修订候选自评：架构 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、
性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，合计 `96/100`，各维≥80%；性能扣分仅因
正式 CPU/readStep 门未在本门宣称通过。

#### PA5b 第二轮主协调独立验收拒绝：R7–R9（2026-07-30，历史）

第二轮独立状态为 `rejected-after-independent-review / formalGate=false`，不与首轮 R1–R6
修订证据拼接。R7 独立审查发现 `packages/arena-session/src/bot-match-read-bundle.ts` 含测试
factory、full-audit counter、test-only export 及正式热路径自增，违反生产无测试行为与单一 owner；
R8 仓库外复现 `/private/tmp/arena-pa5b-world-tamper-repro.ts` 证明只核对三项 identity 且
recomposition 读取 post frame world 会接受合法冻结的嵌套 world 篡改；R9 证明 tick0 仍输出裸
`measurementMicros`、未进入唯一 schema v2 evidence。三项均为阻断红门，保留本轮拒绝事实，不能用
首轮 `9/9`、`60/60` 或其它旧计数覆盖。

#### PA5b 第三轮主协调独立签核（2026-07-30）

状态为 `completed / coordinator-approved / formalGate=false`，评分 `96/100`；
PA5c/PA5d、PA6/PA7、全量 test/build、正式 CPU/formal300、设备/模拟器、美术与 commit/push
继续关闭。R7 已删除 bundle 生产源码中的 `FULL_AUDIT_READER_FACTORY_FOR_TEST`、
`fullAuditReadCount`、`getFullAuditReadCountForTest`、`withFullAuditReaderFactoryForTest` 及热路径
计数；partial reader failure 改用隔离子进程在 bundle 模块加载前 monkeypatch 原生 Core reader，
验证不发布 bundle、same-Core quarantine 与 outer destroy 恰一次。普通构造/start/未命中 schedule
的无 full-audit 证据由 runner 测试 port wrapper 计数，不污染生产 owner 或 CPU 口径。

R8 的 `requireFullAudit` 先验证 full-audit 自带 world 的递归冻结、可枚举 data 字段、完整字段顺序
和 ordered parity，再调用 legacy oracle；mandatory recomposition 只消费这个已经验证的
`fullAudit.worldSnapshot`。当前与 post-step 两组 negative tests 覆盖 `remainingTicks`、participant、
equipment、map 与 formal supply 嵌套篡改，均在 oracle 成功前拒绝。R9 让 tick0 同样返回唯一
`ReadStepMeasurementV2`，包含实际 `preFrameRead/schedule/fullAudit/differential/total`，mapper 与
authority-step 段为 0，tick/eventSequence/phase 与 `fullAuditPerformed=true` 同 identity；formal
pressure 仅聚合 `initialAudit.measurement.totalMicros`，measurement 在 total timer 停止后构造，
不留裸 `measurementMicros` 旁路。

主协调独立证据为：仓库外 `/private/tmp/arena-pa5b-world-tamper-repro.ts` 已由
`TAMPER_ACCEPTED` 转为 exit 1；生产 bundle 中不存在 `FULL_AUDIT_READER_FACTORY_FOR_TEST`、
`withFullAuditReaderFactoryForTest`、`fullAuditReadCount`、`getFullAuditReadCountForTest` 或
`initialFullAudit`；tick0 返回 `ReadStepMeasurementV2`，formal 聚合
`initialAudit.measurement.totalMicros`，不存在裸 `measurementMicros` 旁路；主协调独立 Node
`61/61`、measurement Vitest `2/2`、`bot-survival-stress` `8/8`，`build:packages` `52 packages / 11 waves`，
typecheck、lint、documentation `265/839/57` 与 `git diff --check` 均通过。基线 `missing=0`，为
8 个既有 allowlist path 与 5 个新增 allowlist path 的变化；工作树 `131 dirty（103 tracked、28 untracked）`，
branch/HEAD/upstream 保持不变。

PA5b 专测证据为 bundle/runner `10/10` Node、measurement `2/2` Vitest，architecture 与
PA5b 合跑 `61/61`（architecture `51/51`）；受影响 MatchRead/Session/Replay/ordinary/survival
链 `197/197`、`bot-survival-stress` `8/8`，`build:packages` `52 packages / 11 waves`、
`typecheck:app`、lint、documentation 与 `git diff --check` 均通过。R7 隔离失败、R8 current/post
nested tamper、R9 schema/identity/聚合断言均已落库，architecture 静态门禁止生产 test seam 与裸
measurement。未运行完整 npm test/build、正式 CPU/formal300、设备/模拟器，不得写成性能或 formal
通过；扣分仅因这些正式门与 PA5c/d 尚未执行，不是 PA5b 功能红门。
独立评分为架构 `20/20`、行为等价 `20/20`、生命周期/失败关闭 `15/15`、确定性/Replay `15/15`、
性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`，合计 `96/100`，各维≥80%；PA5c/d、正式
CPU/formal300、设备/模拟器、美术与 commit/push 仍关闭。

#### PA5c：Product/Session/QuickMatch/survival 旧 surface 退出（implementation candidate）

PA5c 不是只删除三个 Product getter，而是原子退出完整 legacy Product flow：删除
`ProductMatchRuntime.start()/step()/getSnapshot()` 与 `ProductMatchStepOutcome`；删除
`ProductMatchCoordinator.start()/step()/getMatchSnapshot()`；删除
`ProductSessionController.beginMatch()/stepMatch()/getActiveMatchSnapshot()` 与
`ProductSessionStepOutcome`。三层 Product port 只保留 V2 read-frame start/get/step、合法 lifecycle、
public/result。保留 `ProductMatchCoordinator.getSnapshot()` 与 `ProductSessionController.getSnapshot()`
作为自身 state；保留 `ProductPresentationFlow.stepMatch()` 作为 V2 表现 wrapper。

LocalSession 的模糊 `step/getSnapshot/runUntilEnded` 全部退出，固定
`stepWithLegacySnapshotForAudit/getLegacyFullSnapshotForAudit/runLegacyUntilEndedForAudit`；研究、
灰盒、InputPilot 只能调用显式 adapter。formal pressure 已在 PA5b 使用
`stepWithPresentationReadFrame`/runner/readStep，不属于 PA5c residual。

**PA5c source allowlist（逐文件）**：

- `packages/arena-session/src/local-match-session.ts`：LocalSession 显式 audit step/get/run 与 V2 隔离。
- `packages/arena-session/src/index.ts`：仅在 LocalSession result/Legacy-Audit 类型出口变化时修改。
- `packages/arena-product-match/src/product-match-runtime.ts`：删除 runtime legacy flow、旧 port capture、旧 outcome。
- `packages/arena-product-match/src/product-match-coordinator.ts`：删除 coordinator legacy flow，保留自身 state。
- `packages/arena-product-match/src/index.ts`：移除 `ProductMatchStepOutcome` 出口。
- `packages/arena-product-session/src/ports.ts`：移除旧 coordinator method capture/port 字段。
- `packages/arena-product-session/src/product-session-controller.ts`：删除 controller legacy flow。
- `packages/arena-product-session/src/index.ts`：移除 `ProductSessionStepOutcome` 出口。
- `packages/arena-quick-match/src/quick-match-service.ts`：删除模糊旧 Session method capture。
- `packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts`：删除正式 survival 的模糊旧 capture。
- `packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts`：迁移三处 Session step。
- `packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts`：迁移旧 Session step。
- `packages/arena-v1-greybox-session/src/greybox-presentation-session.ts`：改用显式 research adapter。
- `packages/arena-presentation-runtime/src/arena-match-resources.ts`：改用显式 Legacy/Audit resource contract。
- `packages/arena-input-pilot/src/input-pilot-observed-session.ts`：改名其 full-snapshot wrapper API。
- `scripts/arena-product-session-stress.ts`：begin/step 迁移 V2；自身 Product state getSnapshot 保留。

`packages/arena-input-pilot/src/input-pilot-observed-match-service.ts` 与其 `index.ts` 只有真实
adapter type/wiring 需要时可改，否则 zero diff。`packages/arena-match/src/match-core.ts` 已由 PA5a
完成，本门无修改权限。Product composition、ProductPresentation、Core、Rule、Bot、Replay、hash、golden、
Platform 与资产不在本门。

**PA5c 测试修改 allowlist**：在原表基础上明确加入
`tests/arena/bot-survival-composition.test.ts`、`tests/arena/match-read-frame.test.ts`、
`tests/arena/match-read-port.test.ts`、`packages/arena-presentation-runtime/test/arena-match-resources.test.ts`、
`packages/arena-input-pilot/test/input-pilot-vocabulary.test.ts`、
`tests/arena/pa5a-legacy-snapshot-allowlist.test.ts`。原表中的
`arena-v1-composition.test`、LocalSession、LocalSession Bot-read、PA3b、PA4a、InputPilot runtime、
human study、stage8 Product Session、两个 Product PA4b-1、两个 Product lifecycle、
`pa4b-1-product-real-session.test` 与 architecture 均是实际迁移文件，不是只运行项。
其他 ProductPresentation/quick-match/greybox/regression/experiment 测试仅可 run-only；发现直接旧 caller
必须停止并重新授权。新增 `tests/arena/pa5c-legacy-surface-exit.test.ts` 负责静态 allowlist 与负向门。

本轮修订保留前两轮 caller/call-graph 拒绝历史：第一轮漏列 LocalSession wrapper 与 Product legacy
start/step/begin/step，第二轮确认不能只删 getter。此次只固化完整 source/test 面，未开始实现，未覆盖历史
假绿或改写旧证据。

#### PA5c caller/call-graph correction 主协调独立签核（2026-07-30）

两轮 caller/call-graph 拒绝后，完整 Product legacy flow、LocalSession 显式 Legacy/Audit adapter、
regression/experiment/greybox/InputPilot wrapper、Product stress script、ports/index 与直接测试面已
逐文件修订；ADR-018 的 D1/D2 状态与三接口生效证据也已修正。相对
`/private/tmp/arena-pa5c-doc-correction-before.*` 仅三份文档 changed，`missing=0/extra=0`；主协调
独立 `check:documentation=265/839/57` 与 `git diff --check` 通过。评分 `96/100`（架构20、行为20、
生命周期15、确定性15、性能12、迁移9、治理5），`formalGate=false`。该签核只批准 correction design，
不代表 PA5c implementation started；PA5d、正式性能、设备、美术与 commit/push 继续关闭。

#### PA5c implementation candidate 开发自检（2026-07-30）

本轮仅在上述 PA5c source/test allowlist 内实施：LocalMatchSession 的模糊
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
当前尚未运行完整 npm test/build、PA5d、正式 CPU/formal300、设备/模拟器、美术或 commit/push 证据；
因此本段只记录 implementation candidate，不构成完成签核。

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

以下保留 PA5c implementation candidate 的后续独立红门与最小修复事实，不能与 D1–D7 的历史局部绿计数拼接：D9 收口 ProductMatch port 的 brand-first 同步拒绝与普通非函数 `then`；D10 统一 ProductPresentation 与 arena-presentation-runtime capability utility；D11 收口 Coordinator raw candidate cleanup 的异步返回与 retry ownership；D12 保留 QuickMatchProductFactory rollback 的 cleanup owner 并向 Coordinator 暴露同步 pending 状态/重试；D13 收口 ProductMatchRuntime 终局 `session.getState()`/`session.exportReplay()`；D14 收口 InputPilot audit `inputProvider`/`state` 同步边界。所有路径均要求 Promise brand/accessor/函数 thenable 同步拒绝、普通 hostile `then` 不执行、shadow getter=0、无 unhandled；普通非函数 `then` 继续按同步值处理。

本轮 source/test scope 为 coordinator-authorized PA5c 最小扩围，未解锁 PA5d 或其它生产包；该历史快照当时状态为 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`。

**D9–D14 修复后当前源码复验（2026-07-30）**：直接受影响的四个 package Vitest 文件为 `72/72`；原定六文件
集合为 `71/71`（当前 product-match lifecycle 已扩展为 12 tests、InputPilot vocabulary 为 29 tests）。完整
`tests/arena` Node 集合为 `108 files / 855/855`，文件差集为 `∅`；`tests/architecture.test.ts` 为 `53/53`。
`npm run build:packages` 为 `52 packages / 11 waves`，`typecheck:app`、lint、`npm run check:documentation`
的 `265/839/57` 与 `git diff --check` 均通过。ordinary Product stress 为 `200/200`，ordinary golden replay
为 `4/4`，survival golden replay 为 `1/1`；四个已约定外部 D1/D5/D6/D7 Promise 探针均 exit 0。该计数只代表
当前 D9–D14 修复后源码，不与前述历史 `64/64` 或早期局部绿证据拼接；PA5c 仍待主协调独立复核。

#### PA5c D15–D18 独立红门与修复记录（2026-07-30）

本段保留 D15–D18 的独立红门事实，不拼接修复前旧源码计数。D15 是 Coordinator 工厂返回值进入
Promise 链时再次 assimilation hostile thenable；D16 是 ProductSession boot 的 ProfileService.open
原始值被 `Promise.resolve` assimilation；D17 是 match prepare 回调对原始结果再次解析；D18 是
diagnostic sink 的 `Promise.resolve(result).catch` 执行 hostile thenable。它们共同暴露了 ProductMatch
与 ProductSession V2 主路径仍缺统一的同步返回边界。

本轮仅在已批准的 ProductMatch/ProductSession ports、Coordinator、Controller 与已有生命周期测试中
修复：原生 Promise 方法在模块初始化时捕获，先用 Promise internal-slot brand probe 收容 native/foreign
rejection，再以冻结 envelope 交给后续校验；普通 accessor/function thenable 不读 getter、不调用 then，
ordinary data `then:null`/非函数仍作同步值。诊断 sink 只观察、拒绝不影响产品状态。测试实际覆盖
Coordinator.prepare、ProductSession boot/requestMatch/diagnostic sink，以及 native/foreign 成功、
shadowed rejection、hostile thenable、无 unhandled rejection、recoverable 状态和既有 cleanup retry。

**PA5c 主协调独立签核与 D15–D18 修复后最终证据（2026-07-30）**：PA5c 状态为
`completed / coordinator-approved / formalGate=false`，评分 `96/100`（架构边界20/20、行为等价20/20、
生命周期/失败关闭15/15、确定性/Replay/hash15/15、性能可证伪12/15、迁移/回滚9/10、治理5/5）。
性能扣分仅因本门未运行正式 CPU/PA5d；迁移扣分仅因治理期 dirty 尚未形成最终 clean commit，不是当前功能红门。

主协调独立证据为：D15–D18 独立红探针修复后 `thenCalls=0`、getter 未执行、`unhandled=[]`；D1/D5/D6/D7
外部探针 `4/4 exit 0`；8 个实际变更 package 文件 `105/105`；`tests/arena` 为 `108 files / 855/855`；
architecture `53/53`；build:packages `52/11`；typecheck、lint、documentation `265/839/57` 与
`git diff --check` 均通过；ordinary Product stress `200/200`、ordinary golden replay `4/4`、survival
golden replay `1/1` 均通过。相对 `/private/tmp/arena-pa5c-impl-before.hashes` 的
`changed/missing/extra=46/0/1` 精确成立；branch 为 `feature/arena-v2-design-docs`，HEAD/upstream 同为
`d750e4caa767332b5c3caaf247080b5717d56219`，未 commit/push。PA5d、PA6/PA7、正式 CPU、formal300、
设备/真机、模拟器、美术与 commit/push 继续关闭。

PA6/PA7 的具名强制未来门（不阻断 PA5c 签核，但阻断最终发布）是 Presentation 异步边界审计：
`product-input-router`、`product-session-intent-dispatcher`、`arena-impact-audio`、
`presentation-frame-loop`、`presentation-asset-load-task` 等仍使用 `Promise.resolve`/thenable
containment 的观察者或异步端口，必须完成 brand-first、no-hostile-then、no-unhandled 的真实调用级测试。
当前正式组合只返回受控 native Promise，因此该残余不是 PA5c legacy-surface/read-model 合同缺陷；它是
发布前 mandatory future gate，不能写成已接受、已完成或发布通过。

#### PA5d：manifest/golden/evidence/tamper

允许源码文件：

- `packages/arena-regression/src/golden-replay-manifest.ts`
- `packages/arena-regression/src/golden-replay-verifier.ts`
- `packages/arena-regression/src/arena-regression-evidence.ts`
- `packages/arena-regression/src/arena-regression-evidence-validation.ts`
- `packages/arena-regression/src/arena-regression-evidence-components.ts`
- `packages/arena-regression/src/index.ts`
- `scripts/arena-golden-replay.ts`
- `scripts/arena-survival-golden-replay.ts`
- `scripts/arena-regression-evidence.ts`
- `scripts/lib/arena-regression-evidence-producer.ts`
- `scripts/lib/arena-stage9-release-producers.ts`

允许测试文件：

- `packages/arena-regression/test/pa5d-golden-evidence.test.ts`（新增）
- `tests/arena/pa5d-manifest-tamper.test.ts`（新增）
- `packages/arena-regression/test/regression-evidence-boundary.test.ts`
- `tests/arena/regression/golden-replay.test.ts`
- `tests/arena/regression/arena-regression-evidence.test.ts`
- `tests/arena/regression/arena-regression-process.test.ts`
- `tests/architecture.test.ts`

PA5d 只让 generator 产生 manifest/golden/evidence；禁止手工改 Replay、state hash、golden
fixture 或 final hash。existing `HeadlessMatchRunner.step` 语义不改；保留的审计 oracle 是
显式 `MatchCore.getLegacyFullSnapshotForAudit()`，旧 Bot reader 语义退出；只有 verifier 真实
需要时才允许显式 `createLegacyFullSnapshotAuditReader()`，并受用途/owner allowlist 保护。

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

#### PA5 四门最终 API、迁移清单与停止条件

| 对象 | PA5 总门结束后的唯一终态 |
|---|---|
| MatchCore full snapshot | 保留显式 `getLegacyFullSnapshotForAudit()`，只供 verifier/full-audit/differential；模糊 `getSnapshot()` 删除 |
| MatchCore trusted snapshot reader | 默认删除旧 `createTrustedPublicSnapshotReader()`，且不新建 reader；只有实施中确认现有且已列入允许面的 verifier/differential source 必须使用，并提交 necessity evidence，才允许显式 `createLegacyFullSnapshotAuditReader()`；测试本身不是理由 |
| LocalMatchSession | 删除模糊 `getSnapshot/runUntilEnded/step().snapshot`；固定 `getLegacyFullSnapshotForAudit/runLegacyUntilEndedForAudit/stepWithLegacySnapshotForAudit` 供显式 verifier/research 使用 |
| ProductMatchRuntime | 删除 `start/step/getSnapshot` 与 `ProductMatchStepOutcome`；V2 frame/step/result 是唯一生产读路径 |
| ProductMatchCoordinator | 删除 `start/step/getMatchSnapshot`；保留 `getSnapshot()` 作为自身 Product state；V2 frame/step/result 是 match 读路径 |
| ProductSessionController | 删除 `beginMatch/stepMatch/getActiveMatchSnapshot` 与 `ProductSessionStepOutcome`；保留 `getSnapshot()` 作为自身 ProductSession state；V2 frame/step/result 是 match 读路径 |
| QuickMatch/survival | 新生产 `SESSION_METHODS` 不捕获 Product/Session legacy 方法；外层只持有 V2 Session contract |
| ProductPresentationFlow | `stepMatch()` 永久保留，属于 V2 表现 wrapper，不是 ProductSessionController legacy flow |
| HeadlessMatchRunner | `step(frames)` 永久保留；full-snapshot `runUntilEnded` 改为显式 legacy audit 名称或删除，所有 caller 分类完成 |
| FixedStepMatchRuntime | test/dev legacy allowlist，明确不进入生产 reachability、不接入 Session capability |
| regression/golden | 使用 explicit audit/differential API，不再调用模糊 `getSnapshot()` |
| experiment/fuzz/stress/POC | 可保留显式 audit/research 调用，但不得继续调用模糊 authority full-snapshot 别名 |

每门停止条件包括：发现第二套 binding/owner、schedule 下沉 Session、audit/action query 移出
readStep 计时、authority/Replay/hash 漂移、未知/future schema 被接受、case failure 跳过、
Product/Runner legacy 回流、手工 hash/golden 改写或文件越界。每门完成后独立签核，再解锁下一门。
PA6/PA7、正式性能、formal300、设备/真机、美术、commit/push 仍关闭。

### PA6-P：Presentation async boundary hardening（PA6 前独立并行子门）

- **状态/前置**：当前为第二开发独占的 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`；前置为 PA5 总门冻结，
  不得回改 PA5 Product/Session V2、readStep、Replay/hash、manifest/golden/evidence 或 Legacy/Audit 边界。
- **唯一文件所有权**：第二开发独占 `packages/arena-product-presentation/src/product-input-router.ts`、
  `packages/arena-product-presentation/src/product-session-intent-dispatcher.ts`、
  `packages/arena-presentation-runtime/src/arena-impact-audio.ts`、
  `packages/arena-presentation-runtime/src/presentation-frame-loop.ts`、
  `packages/arena-presentation-runtime/src/presentation-asset-load-task.ts` 与新增
  `tests/arena/presentation/pa6-async-boundary-hardening.test.ts`；PA6/Core/性能开发不得触碰。
- **攻击矩阵/实现标准**：保持 Product/Session V2、authority、Replay/hash 不变；所有同步端口先以捕获的 native Promise brand probe 收容本域/foreign/
  shadowed Promise，再拒绝异步返回；普通 accessor/function hostile thenable 不读取 getter、不调用 `then`，data `then:null`/非函数保持普通同步值语义；
  任意返回链均不得产生 `unhandledRejection`。覆盖 Proxy、foreign identity、accessor、hostile coercion、循环/自返回 thenable、同步重入与迟到回调。
- **禁止项**：不得修改现有测试、共享 capability、Product/Session V2 合同、PA5d 源码、authority/Replay/hash；不得用 `Promise.resolve(raw)`、
  `instanceof Promise`、读取 caller `then`、吞错、放宽同步合同或测试专用生产 seam；不得把 PA6-P 数值计入 ABBA/正式 CPU。
- **定向测试**：唯一新增测试文件必须通过五个真实生产入口逐一证明 getter/then 调用数为 `0`、native/foreign/shadowed rejection 被收容、
  `unhandled=[]`、同步普通值语义不变，并覆盖 callback/thenable、reentry、构造半失败、销毁中迟到结果与成功主流程；不得只直测 helper。
- **失败关闭/生命周期**：输入验证前的可恢复边界不得提交半状态；已消费输入、已发布 frame/intent/audio/task 或已进入异步 owner 后的未知失败必须先登记
  terminal 状态，再以 opaque cause 保留原值。构造 rollback、多个 cleanup、destroy/repeated destroy 与第一次 cleanup 失败后的同一句柄 retry 均须 exact-once。
- **并行与暂停**：可与 PA6 只读审计、命令准备及非计时验证并行；任何 ABBA 或正式 CPU 计时期间必须暂停第二开发测试/构建及其 CPU 密集任务，
  并只读确认环境清洁。
- **评分/回滚**：按架构20、行为20、生命周期/失败关闭15、确定性15、性能可证伪15、迁移/回滚10、治理5评分，总分≥90且各维≥80；
  回滚只允许对上述六文件做精确反向 patch/删除新增测试，保护 PA5 与其它 dirty，不得 reset/checkout。
- **退出门**：PA6-P 独立签核不计入 PA6 CPU 结果；任一 hostile side effect、unhandled rejection、owner 丢失、double cleanup、V2/hash 漂移或越界文件即停止；
  未签核阻断 PA7、设备/真机与发布，签核也不自动通过 PA6。

### PA6：前 20 ABBA×3

- **允许文件/前置**：仅治理脚本、临时 profile、测试 fixture 和 PA5 已验收 runner；前置为 PA5。当前 runner 正确性已批准，但执行按 ADR-115 延期到最终 source freeze。
- **实现标准**：前 20 正式配置，至少三组交错 ABBA，每组独立进程、充分 warmup、同分母；D 与 C 分别消融，C+B+D 组合单独测量。
- **禁止项**：挑选冷轮、拼接历史污染轮、改 case/seed/tick/action、排除 audit、用 inclusive 嵌套相加、降低 0.25 或以 environment 赦免。
- **行为映射**：InputFrame/events/payload/public recomposition/checkpoint/final hash/Replay/terminal result 全部 strict parity；不同输入计划只检查定义不变量。
- **测试矩阵**：2 人普通/生存、失败关闭矩阵、Proxy/accessor/容器/cycle、pause/resume/ended/destroy、expired-held、同 tick eventSequence、full schedule。
- **失败关闭/生命周期**：任何 case、parity、resource/event window、non-finite 或生命周期红即全组失败，不跳过。
- **性能证据**：每组 P95≤0.225、稳定回收≥30.1us/tick、process CPU 同向；不得用 P50/P99 缺失推算。
- **回滚点/评分**：实验不落生产；若实现候选，按对应阶段精确反向 patch，保护其它 dirty；未开始，评分不作候选。

### PA7：正式 300/120 与完整回归

- **允许文件/前置**：ADR-115 允许先完成正式 runner、全 Node/Vitest、architecture、typecheck/lint/docs、packages/coverage/资源等非性能实现与正确性门；正式 300/120、三端/真机性能结论仍前置最终同源 PA6 主协调签核。
- **实现标准**：默认 `300 cases/120 unique seeds`，双跑、固定 identity、完整事件/边界/资源/Replay/hash，正式 status 独立记录 execution/formal gate。PA7-0及A/B实现完成六维自检、变更治理、定向/完整非性能正确性门和主协调逐文件签核后，允许主协调把精确已验收patch创建为本地`evidence-candidate`提交；该提交不推送、不表示PA7/P1通过，只用于获得可审计的clean source identity。
- **禁止项**：降低默认规模/动作/tick/审计，跳过失败 case，修改阈值，拿 smoke/20-case/临时镜像冒充正式门；P1 CPU 红不得 advance。
- **行为映射**：生存 1200/2400 波次、599/600/601、expired-held disposal、普通1v1、暂停/淘汰/结束与旧 authority 语义一致；4 人仍 P2。
- **测试矩阵**：完整 Node/Vitest、architecture、type/lint/build、golden/replay tamper、资源/runtime/lifecycle/event window、full audit schedule、三端/真机/覆盖与产品预算。
- **失败关闭/生命周期**：任意 gate 红 status=formal-failed/formalGate=false；hash/replay/evidence 不可篡改；构造/销毁/前后台/真机生命周期完整。
- **性能证据**：最终 source freeze 后先执行 PA6 ABBA×3，全部通过才执行正式 PA7；正式门 `≤0.25ms/tick`，且各评分维度≥80%；PA6 的 `.225` 是候选余量门，不得被正式运行改写。
- **回滚点/评分**：仅撤销本阶段正式 runner/fixture/manifest 变更；不动 authority 历史或已验收美术；未开始，评分不作候选。候选提交后若任一PA6/PA7/外部门失败，只允许追加中文修复提交并在新HEAD从零重跑，不得amend、reset、checkout或删除失败提交；失败提交保留为可追溯证据且绝不推送为release-ready。

#### PA7 clean source 两阶段提交协议

阶段证据要求`sourceDirty=false`，而PA7正式性能又是最终签核前置；因此“PA8前绝不产生任何commit”会形成不可执行循环。两阶段协议固定为：

1. 先把当前172路径dirty按已验收批次拆分；归属不明、未自检、未评分或跨线程重叠文件不得进入候选。每批由主协调核对起始HEAD、精确文件、diff、失败轮、回滚hunk和完整非性能门。
2. PA7实现正确性全部通过后，主协调可创建本地`evidence-candidate`中文提交；提交信息和台账明确`formalGate=false / not-release-ready / do-not-push`，不得由开发线程自行提交。
3. 在该clean commit记录HEAD、tree、repository fingerprint、package-lock/build/content hash，先从零完成同源PA6 ABBA×3，再运行PA7正式300/120、Coverage、三端/真机及适用外部门。任何代码、测试、脚本、配置或资产字节变化都使证据过期。
4. 红门只通过后续修复提交解决；每个新HEAD重新执行步骤3，不拼接旧绿轮。禁止amend、rebase、reset、checkout、force push或把失败提交改写成通过。
5. 全部门通过后，PA8只新增/更新绑定最终候选HEAD的证据台账和状态，创建最终attestation提交，再由主协调一次性push候选链与attestation；远端一致后才允许P1独立审计判`advance`。

本协议只解决证据身份和提交时序，不降低任何测试、性能、设备、真人或美术门；当前工作树尚未完成文件归属、自检与PA6，因此不允许创建candidate commit。

### PA8：最终证据提交与push候选

- **允许文件/前置**：仅主协调独立验收列出的最终证据/台账与已通过的本地candidate提交链；前置为PA7所有硬门关闭、评分≥90且每维≥80。
- **实现标准**：逐文件diff、dirty隔离、文档状态与实际证据一致；创建绑定最终candidate HEAD/build/content hash的中文attestation提交，本地/远端一致由主协调授权后执行。PA8不是第一次允许本地commit，而是第一次允许push和宣称候选证据完整。
- **禁止项**：本任务自行 commit/push、force push、合并 main、将美术文件或未验收 dirty 纳入候选、用大范围 reset/checkout 回滚。
- **行为映射**：提交只包含已验收 PA patch；Replay V5、authority hash、普通1v1和生存规则不得发生未批准漂移。
- **测试矩阵**：重跑主协调指定的完整门禁与 diff/dirty 审计；不以文档检查替代代码/设备门。
- **失败关闭/生命周期**：任何文件归属不明、父节点错误、dirty 混入、远端不一致或证据过期即停止，不发布。
- **性能证据**：只引用 PA7 已签核数据，不新增挑绿采样；Platform/真机未验收不得写完成。
- **回滚点/评分**：提交前保留精确文件清单和父节点；撤销仅用反向提交/patch，需主协调批准；未开始，评分不作候选。

### PA 批次当前自审结论

| 维度 | 结论 |
|---|---|
| 架构边界 | C+B+D 保持 Rule→Core→Bot→Presentation；Bot 不持 Core/Session；full audit 不下沉到表现层 |
| 行为等价 | 以 authority parity、full recomposition differential、public evidence V2 三证据分离，未把 schema 拆分误写为旧 public hash 等价 |
| 生命周期/失败关闭 | PA3a+PA3b 已验收 owner/tick/eventSequence/generation、reader 跨 match tick 复用与结果身份、paused/ended memo、resume 未推进、ended winner-active、destroy、重入、构造失败和同 tick 修正重试；PA4a/PA4b-1/PA4b-2/PA4b-3 已分别验收其边界；PA4b-3 的三件套捕获、mixed/foreign frame、当前 sidecar、reentry/thenable/cleanup fail-closed 与端到端生命周期证据已由主协调签核覆盖 |
| 确定性/Replay | Replay V5、authority hash/input/events/checkpoint/final result 不变；sidecar 重新验证但不入 authority hash |
| 性能可证伪 | readStep 计时边界、固定 schedule、ABBA×3、`.225/30.1us` 门与不推算 P50/P99 已写死 |
| 迁移/回滚 | legacy 有限 allowlist/退出点；每阶段精确文件 patch 回滚，保护当前 dirty，不用 reset/checkout |
| 治理 | PA1/PA1.1 completed/主协调签核但未 commit/push；PA2a、PA2b、PA2c 与 PA2 总门均为 `completed / coordinator-approved / formalGate=false`；PA3a+PA3b 为 `completed / coordinator-approved / formalGate=false`（PA3b `94/100`）；PA4a 为 `completed / coordinator-approved / formalGate=false`（`95/100`）；PA4b-1、PA4b-2 与 PA4b-3 均为 `completed / coordinator-approved / formalGate=false`（均 `96/100`）；PA5a、PA5b、PA5c 为 `completed / coordinator-approved / formalGate=false`（各 `96/100`），PA5d 同状态（`94/100`），PA5 总门已冻结；PA6-P 是独立并行发布阻断门；仅 PA6–PA8、正式性能、P1 advance 与 commit/push 仍未授权 |

#### PA5d implementation candidate 开发自检（2026-07-30）

本段记录 D20–D23 独立拒绝前的候选历史快照：当时状态为 `implementation-candidate / coordinator-independent-review-pending / formalGate=false`；
本段不是主协调签核，已被后文 D20–D23 修复候选覆盖。实施严格限于 PA5d 批准的 11 个源码文件、7 个测试文件及 ADR-111/P1 台账；PA5c 已冻结，未修改其接口或行为。

本轮收口事实：当前 Replay schema 通过 `validateArenaReplay()` 重新校验，历史 schema 走显式 unsupported 分支并在 Core
构造前拒绝；Manifest、fixture、scenario metadata、证据组件均 exact-key、递归数据、确定性排序、深冻结和内容 hash 校验。
普通黄金 generator 先写外部 staging，再完整验证后 rename；按目标路径建立独占发布锁，遗留 staging、同进程/跨进程并发生成、发布前目标目录冲突
均拒绝，主错误与清理错误组合保留。没有新增 binding/reader/Core owner，也没有手工改 Replay、golden fixture、checkpoint、state/final hash；固定五个
regression process 顺序执行，任一失败停止且不跳 case。

最终源码开发证据：新增 PA5d package 专测 `5/5`、新增 Node 专测 `4/4`、既有 regression/golden/evidence/process Node `19/19`、
完整 `tests/arena` `859/859`、architecture `54/54`、ordinary golden `4/4`、survival golden `1/1`、`build:packages` `52/11`、
`typecheck:app` 与 lint 全部通过；历史 PA5c 计数不与本轮拼接。PA5d 自评 `95/100`：架构20/20、行为等价19/20、生命周期/失败关闭15/15、
确定性/Replay15/15、性能可证伪12/15（未运行正式 CPU）、迁移/回滚9/10（PA5 总门/最终 clean commit 尚未完成）、治理5/5。
任一手工 hash、legacy 回流、第二 owner、跳 case、tamper 绕过、越界文件或 authority/Replay/hash 漂移均为停止条件；D20–D23 拒绝及修复见下文，待主协调独立验收。

#### PA5d D20–D23 修复候选与 D24 边界自检（D25 前历史快照，2026-07-30）

本段是 D25 独立拒绝前的历史候选，已由下节修复候选覆盖。状态当时仍为
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`；PA5d 未签核，PA6/PA7、正式 CPU/formal300、
设备/模拟器、美术与 commit/push 继续关闭。前一节 `859/859` 是 D20–D23 修复前的拒绝历史，不与本节当前证据拼接。

D20 的 verifier options 现在由 exact enumerable data descriptors 一次性捕获，validated `coreFactory` identity 与实际调用一致；D21 的
Manifest entry 只读取冻结的 `id/version/category/file` 数据投影，generator 不再把 runtime scenario 传入 helper；D22 的 evidence create/read
在 normalize 前一次性深复制冻结顶层输入，拒绝 accessor/Proxy TOCTOU；D23 在 canonical parent 层拒绝 repository 内 symlink，并从 canonical
parent 派生 candidate/staging/lock，真实调用级测试清理 repository probe。

D24 仅声明已实现的边界：publication lock 串行化本 generator 的合作并发，发布前 `lstat` 冲突检查；目标在 staging 期间创建时 fail closed，
非空目标 sentinel 保持不变。没有把标准 Node/FS `rename` 最后不可协作外部进程窗口写成绝对 no-replace 保证；若最终发布需要绝对禁止替换空目录，
必须另行提供可验证 OS-level no-replace 机制并过独立门。

修复后证据：D20–D23 定向 Node `7/7`；PA5d package/regression `5/5`；完整 `tests/arena` `862/862`；architecture `54/54`；既有
regression/golden/evidence/process `19/19`；ordinary/survival golden `4/4`、`1/1`；stress `200/200`；`build:packages` `52/11`；
typecheck、lint、documentation `265/839/57`、`git diff --check` 通过。旧 `859/859` 仅保留为拒绝前历史。

修复后自评 `94/100`：架构20/20、行为等价19/20、生命周期/失败关闭14/15、确定性/Replay15/15、性能可证伪12/15（未运行正式 CPU）、
迁移/回滚9/10、治理5/5。任一新 TOCTOU、canonical path 逃逸、手工 hash、第二 owner、跳 case、越界文件或 authority/Replay/hash 漂移均为停止条件，
等待主协调独立复验。

#### PA5d D25 canonical parent 零写入修复候选（最终签核前历史快照，2026-07-30）

本段记录最终签核前的历史候选，已由下节主协调签核覆盖；当时状态保持
`implementation-candidate / coordinator-independent-review-pending / formalGate=false`。D25 证明旧实现会在 canonical 校验前沿
lexical symlink 递归创建 parent，导致失败调用仍在 repository 内留下空目录。当前合同要求 candidate parent 预先存在：先
`realpath(lexicalParent)` 并验证 canonical parent 位于 repository 外，再只用 canonical parent 派生 candidate/staging/lock；校验前无写入。
真实 symlink + 不存在嵌套 parent 调用级测试确认拒绝且 repository 内目录从未出现，cleanup 后无残留。

当前证据只取 D25 修复后的最终源码：D20–D25 定向 Node `8/8`；D20–D22 外部探针 exit `0` 且 getter 计数为 `0`；旧 D23
success-asserting 探针在 canonical 拒绝处按预期 exit `1`；D25 residue 探针 exit `0` 且
`nestedParentExistsAfterRejection=false`。完整 `tests/arena` `863/863`、PA5d package/regression `5/5`、architecture `54/54`、
ordinary/survival golden `4/4`、`1/1`、stress `200/200`、`build:packages` `52/11`、typecheck 与 lint 通过；前节 `862/862` 仅作历史。

D24 仍只保证合作生成器锁、发布前目标冲突检查和非空目标不覆盖，不宣称任意外部进程窗口的绝对 atomic no-replace。自评维持
`94/100`：架构20/20、行为等价19/20、生命周期/失败关闭14/15、确定性/Replay15/15、性能可证伪12/15、迁移/回滚9/10、治理5/5。
PA6/PA7、正式 CPU/formal300、设备/模拟器、美术、commit/push 继续关闭，等待主协调独立复验。

#### PA5d 与 PA5 总门主协调独立签核（2026-07-30）

PA5d 已升级为 `completed / coordinator-approved / formalGate=false`，评分 `94/100`；PA5a、PA5b、PA5c、PA5d 全部完成，PA5 总门冻结为
`completed / coordinator-approved / formalGate=false`。评分为架构20/20、行为19/20、生命周期/失败关闭14/15、确定性/Replay15/15、
性能可证伪12/15、迁移/回滚9/10、治理5/5。D24 保守边界被接受，不宣称 arbitrary-process atomic no-replace。

主协调独立证据：D20–D22 getter/get trap=`0`、factory substitution=`0`；修正版 D23 probe
`rejected=true / candidateExists=false`；D25 `rejected=true / nestedParentExistsAfterRejection=false`；Node 定向 `27/27`、Vitest `3/3`、
architecture `54/54`、diff-check 通过。开发自验证保留最终 `tests/arena` `863/863`、package `5/5`、golden `4/4 + 1/1`、stress
`200/200`、build `52/11`、typecheck/lint/docs `265/839/57`。PA5 冻结后 PA6/PA7 只消费其签核合同，不得回改 PA5 接口或行为。

#### PA6-P 授权与文件所有权记录（随 PA5d 最终签核，2026-07-30）

PA6-P 是 mandatory future gate，不属于 PA6 ABBA CPU 结果。第二开发是以下六个文件的唯一所有者，当前 Core/性能开发禁止触碰：

- `packages/arena-product-presentation/src/product-input-router.ts`
- `packages/arena-product-presentation/src/product-session-intent-dispatcher.ts`
- `packages/arena-presentation-runtime/src/arena-impact-audio.ts`
- `packages/arena-presentation-runtime/src/presentation-frame-loop.ts`
- `packages/arena-presentation-runtime/src/presentation-asset-load-task.ts`
- 新增 `tests/arena/presentation/pa6-async-boundary-hardening.test.ts`

本门保持 Product/Session V2、authority、Replay/hash 不变；要求 brand-first/no-hostile-then/no-unhandled，并以真实调用级测试覆盖 Proxy/identity、同步重入、
构造半失败、迟到回调、destroy 与 cleanup retry。不得改现有测试、共享 capability 或 PA5d 源码。PA6-P 可与 PA6 只读审计、命令准备和非计时验证并行；
任何 ABBA/正式 CPU 计时期间必须暂停第二开发测试/构建并复核环境清洁。PA6-P 已完成签核，但其完成不替代 PA6 CPU 门；PA7 与发布继续阻断。

#### PA6-P 主协调独立签核（2026-08-02）

PA6-P 已升级为 `completed / coordinator-approved / formalGate=false`，评分 `95/100`：架构边界 `20/20`、行为等价 `20/20`、
生命周期/失败关闭 `15/15`、确定性/Replay `14/15`、性能可证伪 `12/15`、迁移/回滚 `9/10`、治理 `5/5`。扣分只来自
正式 ABBA、完整三端/真机和最终 clean commit 尚未执行，不是 PA6-P 功能红门。五个生产入口保持 Product/Session V2、authority、Replay V5、
InputFrame、events 与 checkpoint/state/final/authority hash 边界不变；普通 hostile thenable 的 getter/then 不执行，native/foreign/shadowed
rejected Promise 被收容，重入、迟到回调、构造半失败、清理失败重试和重复 destroy 均保留唯一 owner 并失败关闭。

主协调独立证据：受影响 Node `47/47`、受影响 Vitest `50/50`、PA6-P 专测单独 `11/11`、architecture `55/55`、
`npm run typecheck:app` 与 `git diff --check` 均通过。一次把两个 Vitest 文件误交给 Node test runner 的过程结果为 `47 pass / 2 runner red`；
红因 Vitest 未由其 runner 启动，保留为无效调用证据，不与正确命令结果拼接。PA6-P 完成只关闭 Presentation async boundary 子门，
不计入 PA6 CPU 数值，也不解锁 PA7。

#### PA6-P 后续源码增量 P5.3zzi（2026-08-12，代码已写、未运行）

为修复正式 Three 预加载器在加载中销毁时可能丢失迟到Lease清理Owner的问题，`presentation-asset-load-task.ts`新增只读
`isCleanupComplete()`完成水位，区分“已请求destroy”与“异步加载已落定且Lease已释放”。2026-08-02的PA6-P签核与绿证据
仍是修改前基线的历史事实，但不覆盖这次源码增量；当前源码对该文件的有效状态必须记为`P5.3zzi-code-written-not-run / formalGate=false`。
本批没有运行Node、Vitest、architecture、类型、构建或性能验证，后续统一验证前不得引用旧PA6-P结果宣称新逻辑已通过。

#### PA6 runner 正确性候选与正式性能状态（2026-08-02）

PA6 runner 当前为 `implementation-candidate / coordinator-correctness-approved / performance-deferred-by-ADR-115 / formalGate=false`。候选固定 `B-only/C+B/B+D/C+B+D` 四变体、
前 20 个唯一 case/seed、三项消融与每项 `A1/B1/B2/A2`，每组独立子进程；source identity 绑定 HEAD、dirty 与内容 fingerprint，loader
attestation 证明互斥真实源码路径。父进程以 runToken、groupIndex 和严格单调 progress 续期 inactivity watchdog；重复、回退、损坏、错组、错 token
均不得续命。失败报告原子发布并记录 completed groups、当前 comparison/worker/variant/sequence 和稳定 reason kind；超时按独立进程组
`TERM → KILL` 清理，不接受 partial JSON、stderr、超限输出或非零退出。

主协调当前正确性证据：PA6 runner 全文件 `27/27`、architecture `55/55`、`npm run typecheck:app`、`git diff --check` 均通过。
此前正式运行曾因固定 30 分钟总寿命计时器中止；定向诊断证明 group 仍在合法前进，因此该轮不是性能结论。修订后 timeout 已改为进度感知的
inactivity watchdog，但尚未在无外部 Runner/Simulator 干扰的窗口从零完成 ABBA×3；不得引用历史前三轮、污染红轮或中断轮补齐。

六维自检结论：健壮性由 exact-key/schema、调用方数据复制冻结、有限安全整数、重复 group/case/seed/token 和恶意 getter/Proxy 前置拒绝覆盖；竞态由 source 双读、runToken、原子 progress/report 与 no-overwrite 关闭；兜底采用结构化 fail-closed 且不吞主错误；边界拒绝
Proxy/accessor/sparse/cycle、未知 CLI/schema、错误 case/seed/schedule/source；生命周期覆盖 worker ready/request/shutdown、startup failure、timeout 与
孙进程清理；主流程覆盖真实四变体 loader、warmup、三组比较计划和完整 group validator。PA6 阶段评分和完成状态继续扣留，直到最终 source freeze 后清洁环境的三组均满足
`P95≤0.225ms/tick`、稳定回收 `≥30.1us/tick`、process CPU 同向；变更治理绑定精确 runner 文件、当前 HEAD/dirty fingerprint、失败轮、原子 report 与可回滚 hunk，尚无 clean commit。ADR-115 只开放 PA7/PP 非性能实现窗口，不能把本段改写为 PA6 性能通过。

#### PA6 最新只读环境复核（2026-08-02，未启动性能命令）

用户已允许忽略当前模拟器关闭失败并继续非性能工作；该授权不改变正式性能口径。本轮重新读取当前状态，`ps aux` 仍见 Apifox GPU PID `20465` 约
`104.0% CPU`、WindowServer PID `403` 约 `81.4%`、Codex service/renderer PID `6751/7528` 约 `21.1%/16.1%`，同时存在 Runner PID `7424`
（约`0.8%`）、SimMetalHost PID `79806`、backboardd PID `79834`、日志流及大量同一UDID模拟器运行时服务；Virtualization VM PID `69235`约`1.1%`。
没有发现本线程新启动的PA6、正式pressure或构建进程，但上述外部重负载和booted simulator已足以使环境不满足
PA6隔离前置。本轮只运行轻量文档检查与A1.0合同检查，没有启动ABBA、正式pressure、构建或模拟器命令，也没有停止归属不明进程。以上只作为“未测原因”的污染证据，不产生P95、回收或process CPU
结论，不得与历史轮拼接；PA6继续为`coordinator-correctness-approved / formalGate=false`。
本次继续工作的只读 `ps aux` 复核仍不满足性能隔离：Apifox GPU PID `20465` 约 `99.1% CPU`、WindowServer PID `403` 约
`80.5%`、Chrome renderer PID `49037` 约 `61.9%`，Codex renderer/service PID `7528/6751` 约 `21.3%/19.3%`；同时仍见
Runner PID `7424` 约 `1.4%` 和 CoreSimulator service。用户的“忽略继续”授权只允许非性能工作，未授权终止这些归属不明进程，也不改变 PA6 清洁前置；
因此本轮没有启动 ABBA 或 formal pressure。
2026-08-03 用户进一步明确采用 ADR-115：当前污染状态不再阻断 PA7/PP 非性能实现，但正式性能仍必须等待最终 source freeze 和清洁环境；本轮跳过不产生任何性能通过事实。

#### PA7 正式 300/120 预审矩阵与条件实现窗口（2026-08-03）

本节先把现有 runner 与 PA7 终态要求逐项映射；ADR-115 现已改变“实现前必须先跑 PA6”的顺序，但不改变最终性能前置。PA7 非性能实现状态为
`PA7-0.2–0.5-and-lane-A-B-completed-coordinator-approved / performance-deferred-by-ADR-115 / formalGate=false`；正式性能、设备、资产通过、commit/push均未授权。

| 门 | 当前源码证据与缺口 | PA7 高要求关闭标准 |
|---|---|---|
| G0 前置、同源与不可降级 | 默认已有 `300 cases / 120 unique seeds / 2500 ticks / doubleRunsPerCase=2`，但旧正式 CPU 门仍失败；PA6 fingerprint 覆盖整个工作区，任何 PA7 文件变化都会产生新 source identity | ADR-115 允许先实现 PA7；PA7/PP 冻结并形成 clean candidate 后，必须在最终 source fingerprint 上从零运行 PA6 ABBA×3，全部通过才运行 PA7 正式 300/120。不得降低 case、seed、tick、动作、full audit、阈值或拼接 smoke/历史轮 |
| G1 source/build 身份 | `FormalSurvivalBotPressureReport` 当前没有 HEAD、dirty、repository fingerprint、环境、生产 source module/variant 身份 | 报告 exact-key 绑定 HEAD/dirty/fingerprint、Node/OS/CPU、正式生产 `C+B+D` 身份、manifest/definition/config/build/content hash；前后双读漂移即失败 |
| G2 完整 WorldSnapshotV2 双跑 | `publicSnapshotProjection()` 只取 tick/eventSequence/phase/participants/equipment/activeSupplyProjection | 每 tick 对完整冻结 `WorldSnapshotV2` 计算规范 hash 并双跑全序列比较；不得以字段子集、最终 hash 或聚合计数替代 |
| G3 完整 Replay V5 | 当前双跑比较 InputFrame、events、checkpoint hash、final hash、result 等选定字段 | 两轮均先走正式 Replay V5 validator，再比较完整规范 Replay 数据/hash；schema、metadata、checkpoint、事件、输入、result 任一漂移均失败，并覆盖 tamper/unknown/future schema |
| G4 事件与逐 case 证明 | required event 集合少于 `createArenaReadStepScheduleV2()`：缺 `EquipmentDropFallback`、`EquipmentDespawned`、`DownSmashLanded`；全局聚合不能证明每 case | full-audit schedule 全事件聚合必须覆盖；每 case 单独证明 MatchStarted/MatchEnded、1200/2400 各 3 次 spawn、终局、资源上限、Replay、pause 契约和不跳 case；差异化事件可聚合但须列出覆盖 case |
| G5 599/600/601 与波次边界 | 正式 boundary snapshots 只记录 1199/1200/1201、1799/1800/1801、2399/2400/2401；599/600/601 仅在其它回归出现 | 正式 case 证据加入 599/600/601，并保留两波 spawn、+599、+600 pre-expiry pending/not-ready、+601 ready/no-repeat；每个要求必须有 caseId/tick/authority identity，不只给全局 boolean |
| G6 异常、生命周期与原子报告 | `runCase()` 有 finally 双 destroy，但正式顶层异常主要抛出，报告没有 completedCases/currentCase/reason/cleanup counters；CLI 也没有 PA6 同级 no-overwrite 原子失败报告 | 任一 case/验证/资源/CPU/cleanup 错误均形成结构化 `formal-failed`，记录 completed/current case 与稳定 reason；session create/destroy、重复 destroy、清理失败、主错+清理错、临时文件与进程退出均有计数和无残留证明 |
| G7 全门与发布外部证据 | 当前可运行 Node/Vitest/architecture/type/lint/build，但 coverage、三端预算、浏览器/真机、正式资产和纵向真人证据尚未齐 | 完整 Node/Vitest/architecture/type/lint/docs/packages/build/coverage/Replay/golden/soak 全绿；Web/抖音/微信、六目标设备、前后台、资源/包体、正式资产、reduced-motion/静音和缺陷账本分别给证据，不可互相替代 |

PA7 实施获批后的双开发预案必须保持文件不重叠：开发 A 只负责正式 runner、report contract、完整 snapshot/Replay 和逐 case/boundary 测试；开发 B 只负责
独立 source/build identity、原子发布/失败报告 verifier、全门编排与 architecture/治理测试。PA6-P 六文件冻结，不回改 PA5 readStep/evidence、authority、
Replay/hash 或生产规则；美术线程只消费稳定表现事件与只读快照。两条开发线均须先按本台账协调检查点提交
`健壮性 / 竞态与确定性 / 兜底与失败关闭 / 边界与恶意输入 / 生命周期与清理 / 主流程阻断`六维自检加变更治理，再由主协调逐文件独立验收和评分；未给出精确文件清单前不得开始写入。

为兼顾严格同源和约 20% 开发提速，执行顺序按 ADR-115 固定为：`PA7-0 合同/文件清单冻结 → A/B 并行且文件零重叠 → PP0–PP3/A1.0-v2 → 合并后完整正确性门 →
主协调本地candidate → 最终 source freeze → PA6 ABBA×3 → PA7 300/120 → 三端/真机/资产外部门 → PA8`。实现窗口禁止性能采样，所有实现一次性收敛后只做一次最终 PA6；
任一 PA7 后续源码变更都会使该复验过期并回到 source freeze，不允许沿用旧 fingerprint 的绿轮。

PA7-0 预注册文件所有权如下；ADR-115 已开放条件实现窗口，但必须先取得线程回执和主协调逐门授权，不得越过 PA7-0 串行合同门：

| 所有者 | 冻结/允许文件 | 责任与禁止交叉 |
|---|---|---|
| 开发A：PA7-0.2串行纠偏门 | `scripts/lib/arena-pa7-formal-contract-v1.ts`、`tests/arena/pa7-formal-contract.test.ts` | 首次 `95/100` 与 PA7-0.1 `8/8` 均未形成有效签核；仅允许修正事件可证明的 wave/world/held/pending/retired 生命周期、合法 `pending=0`、aggregate 真实覆盖及对应反证；重新签核前 A/B 不得消费 |
| 开发 A：case/trace 语义 | `scripts/arena-formal-survival-bot-pressure.ts`、`tests/arena/bot-survival-stress.test.ts`、新增 `tests/arena/pa7-formal-pressure-semantics.test.ts` | 完整 WorldSnapshotV2 hash、完整 Replay V5、full schedule event、逐 case 与 599/600/601；不得写发布器、package script、architecture 或治理文档 |
| 开发 B：证据/失败边界 | 新增 `scripts/lib/arena-pa7-formal-evidence-v1.ts`、新增 `scripts/arena-pa7-formal-gate.ts`、新增 `tests/arena/pa7-formal-evidence.test.ts` | HEAD/dirty/fingerprint/environment/build identity、no-overwrite 原子报告、structured failure、cleanup counters、正式 gate 编排；不得修改 A 文件或权威/表现层 |
| 主协调 | `package.json`、`tests/architecture.test.ts`、ADR-111、本台账及最终命令/证据文件 | 只在 A/B 各自自检与独立验收通过后接线；处理中央文件冲突、完整回归、评分、source freeze、PA6 复验与 PA7 正式运行 |

##### PA7-0.1 exact-key 证据合同纠偏 v1

PA7不能继续把当前`FormalSurvivalBotPressureReport`直接当最终证据。现有报告只在整轮成功返回后出现，虽然已有`completedCases`、aggregate coverage和部分boundary snapshot，但没有schema版本/validator、运行前后source双读、失败时current case/progress、完整WorldSnapshotV2与Replay V5分项摘要、cleanup账本或原子发布身份。PA7-0因此冻结“开发A产生确定性case payload，开发B独立包装source/build/failure/publication”的单向依赖，不允许双方各造一套validator。

`ArenaPa7FormalCaseEvidenceV1`每项exact-key固定为：

`schemaVersion / caseIndex / caseId / caseIdentity / seed / difficultyId / inputPlanId / pauseAtTick / doubleRunCount / finalTick / inputFrameSequenceHash / authorityEventSequenceHash / worldSnapshotSequenceHash / checkpointSequenceHash / replayV5Hash / resultHash / stateHashSequenceHash / finalHash / authorityHash / fullAuditCount / requiredEventTypeCounts / equipmentDespawnReasonCounts / lifecycleBoundaries / resourcePeaks / cleanup / caseEvidenceHash`。

- `doubleRunCount`正式值精确为2；两个run分别经正式validator后逐字比较InputFrame、完整事件、每tick完整冻结`WorldSnapshotV2`规范hash序列、checkpoint/state序列、完整Replay V5、Result和final/authority hash，再只发布共同摘要。只比较单个`traceHash`或最终hash不满足合同。
- `requiredEventTypeCounts`必须来自`createArenaReadStepScheduleV2()`冻结的完整事件集合，而不是在PA7复制列表；报告同时记录schedule definition hash。每case至少证明`MatchStarted/MatchEnded`、1200/2400各3次spawn、终局与该case合法的差异事件；聚合命中不能替代逐case必达项。
- `resourcePeaks`精确为`worldEquipmentCount / runtimeEquipmentCount / activeSupplyCount / eventsPerTick / eventWindowCount / readerCount / sessionCount`，每项同时携带derived limit；资源公式来自正式Composition/Definition，不能只写当前观测峰值。
- `cleanup`精确为`sessionsCreated / sessionDestroyAttempts / sessionsDestroyed / readersCreated / readersInvalidated / pendingCleanupCount / cleanupErrorCount`；每case完成或失败都要求创建/释放守恒、pending为0、错误为0。重复destroy计入attempt但不能重复计入destroyed。

`lifecycleBoundaries`每项exact-key固定为：

`supplyId / waveIndex / spawnTick / lifecycleOffset / authorityTick / snapshotTick / snapshotEventSequence / resyncReadiness / pendingAuthorityTick / pendingExpiryEquipmentInstanceIds / worldEquipmentInstanceIds / activeSupplyEquipmentInstanceIds / remainingTicks / authorityEventTypes / boundaryHash`。

`lifecycleOffset`必须覆盖相对每波`spawnTick`的`599 / 600 / 601`，`authorityTick=spawnTick+lifecycleOffset`；因此首波是1799/1800/1801，第二波是2999/3000/3001。当前正式hard limit 2500只能完整证明首波，若PA7仍固定2500，则第二波只证明spawn与+1，不得虚构第二波+599/+600/+601；要扩到3001以上必须先单独评估工作量、CPU预算和历史门，不得在实现中静默抬高hard limit。`+599`要求3实体、remaining=1且可拾取；`+600`要求expire先于pickup、public active为空、pending/not-ready与精确instance集合；`+601`要求ready、pending空且不重发expiry。固定比赛tick`599/600/601`若尚未spawn只可作为空前置，不计生命周期证明。

`ArenaPa7FormalRunPayloadV1`由开发A产生，exact-key固定为：

`schemaVersion / contractId / runToken / request / workloadIdentity / scheduleDefinitionHash / manifestIdentity / progressFinal / caseEvidence / aggregate / cleanup / semanticHash`。

- `request`精确为`caseCount=300 / uniqueSeedCount=120 / hardLimitTicks=2500 / doubleRunsPerCase=2`；正式门不接受“至少120”或CLI覆盖后的其它值。smoke使用独立status/contract，不能生成PA7 formal payload。
- `workloadIdentity`精确绑定正式`C+B+D` production variant、case generator revision、participant/profile/input-plan/pause集合及加载attestation hash；不得把PA6消融变体或experiment入口当正式负载。
- `progressFinal`精确为`runToken / sequence / completedCases / currentCaseIndex / currentCaseId / currentPass / currentTick / lastCommittedCaseEvidenceHash`；成功时completedCases=300、current字段全null。实现过程中的progress序列必须runToken一致、sequence严格+1、completedCases只增不减、case按0..299，重复/跳跃/回退不续watchdog。
- `aggregate`精确为`canonicalTotalTicks / executedTotalTicks / canonicalTotalEvents / executedTotalEvents / uniqueCaseIdentityCount / uniqueSeedCount / uniqueInputSequenceHashes / uniqueEventSequenceHashes / uniqueSnapshotSequenceHashes / uniqueReplayHashes / uniqueFinalHashes / eventTypeCounts / equipmentDespawnReasonCounts / lifecycleCoverage / resourcePeaks / cpu / heap`。CPU精确使用process CPU而非wall time；wall duration可旁证但不得替代或进入semanticHash。
- `semanticHash`只覆盖确定性request/workload/manifest/case语义与聚合，不覆盖generatedAt、wall duration、PID或机器配置；性能和环境由外层evidenceHash防篡改，不能混成“不同机器semantic hash应相同”的错误要求。

`ArenaPa7FormalEvidenceV1`由开发B验证并发布，顶层exact-key固定为：

`schemaVersion / contractId / sourceIdentity / buildIdentity / environmentIdentity / request / progress / payload / gates / cleanup / status / failure / semanticHash / evidenceHash / generatedAt`。

- `sourceIdentity`精确为`headCommit / sourceDirty / repositoryFingerprintBefore / repositoryFingerprintAfter / packageLockHash / productionModuleHashes`；正式通过要求`sourceDirty=false`、前后fingerprint相同且等于最终PA6同源复验。当前172路径dirty只能运行诊断，不能生成formal-passed。
- `buildIdentity`精确为`nodeVersion / packageManagerVersion / platform / architecture / buildId / buildHash / productionVariantId / loaderAttestationHash`；`environmentIdentity`精确为`cpuModel / logicalCpuCount / totalMemoryBytes / isolationEvidenceId / isolationEvidenceHash`。未知/空字段失败关闭，不从路径、进程名或当前日期猜值。
- `gates`使用固定ID升序数组：`request-exact / source-clean-stable / build-attested / manifest-unique / full-input-determinism / full-event-determinism / full-snapshot-determinism / full-replay-v5 / per-case-terminal / lifecycle-599-600-601 / resource-bounded / cleanup-zero / cpu-budget / heap-budget / atomic-publication`。每项exact-key为`id / passed / evidenceHash / failureReason`；passed时reason=null，failed时reason使用稳定枚举，不允许自由文字决定机器状态。
- `cleanup`在case级之外增加`childProcessesStarted / childProcessesExited / termSignalsSent / killSignalsSent / temporaryPathsCreated / temporaryPathsRemoved / pendingCleanupCount / cleanupErrorCount`；正式通过要求子进程与临时路径守恒、pending/error为0。timeout必须按进程组`TERM→KILL`并保留两阶段结果，不能只杀直接child。
- `status`仅`formal-passed / formal-failed`。`payload`成功时为完整已验证payload，启动前失败可为null；`failure`成功时null，失败时必填，不能靠stderr或非零exit code替代。`generatedAt`使用UTC并排除semanticHash/evidenceHash，避免时间戳改变内容身份。

结构化`failure` exact-key固定为：

`kind / phase / completedCases / currentCaseIndex / currentCaseId / currentPass / currentTick / lastCommittedCaseEvidenceHash / sourceFingerprintBefore / sourceFingerprintAfter / cleanupErrors / causeName / causeMessage`。

`kind`只允许`request-invalid / source-dirty / source-drift / build-unattested / runner-startup / progress-invalid / case-execution / case-validation / snapshot-mismatch / replay-invalid / replay-mismatch / event-coverage / lifecycle-boundary / resource-limit / cpu-limit / heap-limit / timeout / cleanup-failed / publication-conflict / publication-failed`；phase只允许`preflight / spawn / run-first / run-second / compare / aggregate / cleanup / publish`。`causeMessage`只作诊断，不参与gate分类；读取未知throwable前先安全包装，禁止执行恶意getter/then。

发布协议固定为：目标目录内创建同文件系统临时文件，严格 validator 重读后取得独占 no-overwrite 锁，并以同文件系统 hard-link 原子创建最终目标；目标已存在时 `link` 必须以 `EEXIST` 失败，禁止用可覆盖目标的 rename 冒充 no-overwrite。已有目标、残留锁、路径逃逸、符号链接、部分 JSON、额外 stdout 或发布前后 source 漂移都生成 `formal-failed` 且不覆盖旧证据。成功与失败报告都必须可独立验证；若连失败报告也无法原子发布，CLI 仍以非零退出并在独立最小 stderr 中指出 `publication-failed`，不得声称已有证据。

PA7-0合同小门至少测试：所有层级extra/missing/future schema、Proxy/accessor/Symbol/sparse/cycle、非有限数/超安全整数、重复case/gate/instance、progress回退/跳号/错token、双跑任一序列单点篡改、Replay合法但Snapshot不一致、599/600/601三边界、首/中/末case失败、主错+destroy错、timeout孙进程、source前后漂移、clean/dirty、同路径并发发布、残留临时文件、双执行no-overwrite及validator结果隔离。该合同经主协调签核前A/B只能逐字段反证，不能开始实现。

PA7-0 合同不得引用 Three.js、DOM、平台 API、墙钟作为权威结果、`Math.random()` 或通用事件总线；A/B 不得复制 PA5 readStep schedule、手工重算
authority hash、暴露测试 seam、修改 production Core/Bot/Presentation 行为，或用新 wrapper 隐藏原 runner 的失败。若实现审查证明上述新文件不是最小必要面，主协调必须在
授权前缩减清单并同步本节，不能边开发边漂移所有权。

##### PA7-0 首次签核撤销与 PA7-0.1 纠偏（2026-08-03）

PA7-0 最终只新增 `scripts/lib/arena-pa7-formal-contract-v1.ts` 与
`tests/arena/pa7-formal-contract.test.ts`，工作树从 176 路径增至 178 路径；没有修改 runner、发布器、权威层、表现层、PA6-P、共享出口或中央治理文件。合同使用正式
Replay V5 validator 与完整 `WorldSnapshotV2` audit，冻结 300/120/2500/double-run=2、真实 tick0→tick1 事件水位、完整输入/事件/snapshot/checkpoint/state/result 双跑、精确双波
spawn、首波 599/600/601 与第二波 hard-limit 内 0/1、正式 workload 集合、结构化 progress/failure/source/build/environment/gate/cleanup 及 SHA-256/8 位权威 hash 边界。

主协调在开发 A 最终字节上独立执行：PA7-0 Node `8/8`、两文件 ESLint、`npm run typecheck:app` 与 `git diff --check` 全绿；未运行 PA6 ABBA、formal pressure、300/120、模拟器或构建性能。历史修订中的 `6/8`、`7/8`、两轮类型红、错误 tick0 水位上的过期 `8/8`，以及最终修订首轮 `2/8` 均保留为失败轮，未与最终绿轮拼接。主协调逐项评分为：健壮性 `96`、竞态与确定性 `96`、兜底与失败关闭 `95`、边界与恶意输入 `96`、生命周期与清理合同 `94`、生产主流程阻断 `94`、变更治理 `96`，综合 `95/100`。

上述 `95/100` 只保留为首次候选的历史执行事实，不再是当前有效签核。随后对真实 formal workload 与 Session 能力的只读审计确认：合法即时拾取 case 的 active supply 峰值可为 2；一波三个 spawn 使用三个不同 `supplyId`；Session/Replay 只公开 checkpoint state hash 而非逐 tick Core state hash；旧 lifecycle/resource/cleanup 字段也未全部与双跑原始轨迹交叉绑定。继续消费会迫使实现伪造实体分类或伪造 hash，因此状态曾回退为 `PA7-0.1-corrective / in-progress / formalGate=false`。

PA7-0.1 完成定向 `8/8`、目标 ESLint 与 `git diff --check` 后，主协调没有沿用测试绿结论，而是再次对照正式 runner 的 `assertBoundarySemantics`、aggregate coverage 与既有即时拾取压力用例。审计确认正式语义允许 `tick1800` 的 `pendingExpiryEquipmentInstanceIds=[] / resyncReadiness=ready / pendingAuthorityTick=null`，且 `+599→+600` 间合法拾取、替换或回收会使 pending 只是上一帧 world 的子集；held 也可在三帧之间迁移。PA7-0.1 却要求每个 case 都有 world/pending/expiry、要求 `world599=pending600` 并冻结 held，因而会拒绝合法正式轨迹。该轮绿测试仅证明测试与实现一致，不构成合同签核；当前进入 `PA7-0.2-corrective / in-progress / formalGate=false`，新增目标是由 `EquipmentRecycled / EquipmentDespawned / EquipmentExpired` 权威事件证明 retired 分区，并把“至少有 pickable/pending 覆盖”移到按 300 case 真实复算的 aggregate。重新签核前 lane A/B 继续暂停；不运行 PA6、formal pressure、300/120、模拟器或性能任务。

##### PA7-0.2 主协调独立签核（2026-08-03）

PA7-0.2 将 `retiredEquipmentInstanceIds` 纳入 lifecycle exact-key；retired 只从 snapshot 可见水位之前的官方 `EquipmentRecycled`、`EquipmentDespawned`、`EquipmentExpired` 权威事件派生。`+599` 允许 world 为空并要求 `wave=world⊎held⊎retired`；`+600` 允许 `pending=0 / ready / no-expiry`，pending 非空时才要求 not-ready 与精确 expiry payload，且 pending 只是上一帧 world 子集；`+601` 要求 pending/world/active 清空、retired 单调且无重复 expiry。第二波 offset 0/1 仍分别证明未生成和三个正式实例生成；aggregate coverage 由 300 个 case 的真实边界复算，不再把全局覆盖错误地下压到每个 case。

主协调在开发 A 最终字节上独立执行合同专测 `9/9`、两文件 ESLint 与 `git diff --check`，全部通过；`npm run typecheck:app` 只报告开发 B 暂停文件 `arena-pa7-formal-evidence-v1.ts:806/809` 的两处既知 Buffer 泛型错误，PA7-0.2 两文件无类型错误。静态审计确认合法 `world0/held2/retired1`、`world1→pending0`、ready/no-expiry、held 经 despawn 进入 retired，以及无事件伪造 retired、retired 复活、无解释消失、pending 非子集、expiry 不精确和 aggregate 漂移均有正反证。未运行 PA6、formal pressure、300/120、模拟器或性能采样。

主协调评分为 `96/100`：健壮性 `96`、竞态与确定性 `96`、兜底与失败关闭 `96`、边界与恶意输入 `96`、生命周期与清理 `96`、生产主流程与阻断性 bug `95`、变更治理 `96`；状态为 `completed / coordinator-approved / formalGate=false`。该签核只开放既定 lane A/B 非性能实现，不表示 PA7 正式性能、P1、设备、资产、commit 或 push 通过。

##### PA7-0.3–0.5 合同补强与 lane A/B 主协调独立签核（2026-08-03）

PA7-0.3 补入正式公开生命周期生产器与结果深冻结，避免合同测试用手工 payload 代替生产语义；PA7-0.4 固定第二波生成后可被即时拾取的合法轨迹，允许 `world / held / retired` 按权威事件迁移，禁止把“生成三个实体”误写成后续帧必须仍有三个 world 实体。PA7-0.5 再把正式 CPU `250μs/tick`、heap 增长 `32MiB`、worker flag、loader attestation flag、run token/progress 环境变量、正式 worker 相对路径与 Node `tsx` loader 设为双方唯一共享常量。合同专测保持 `9/9`，目标 ESLint 与 `npm run typecheck:app` 通过；未运行正式性能、模拟器或构建。

lane A 最终只修改 `scripts/arena-formal-survival-bot-pressure.ts`、`tests/arena/bot-survival-stress.test.ts` 并新增 `tests/arena/pa7-formal-pressure-semantics.test.ts`。正式 worker 精确锁定 `300/120/2500/doubleRuns=2`，使用 ADR-116 的真实 Session composition provenance，逐 case 生成并以官方 validator 复核完整输入、权威事件、完整 `WorldSnapshotV2`、checkpoint/state、Replay V5、result/final/authority hash、599/600/601、资源和 cleanup 证据；progress 每 tick 只做 O(1) 相邻状态推进，磁盘 heartbeat 最多每 600 tick 或 1000ms，成功只输出一行，失败静默非零退出。CPU 改为覆盖 Session 创建到证据完成及双 destroy 的真实 `process.cpuUsage()`，旧 readStep CPU 只保留独立诊断语义。主协调独立执行 pressure semantics `8/8`、普通 stress `9/9`、目标 ESLint、`npm run typecheck:app` 与 `git diff --check` 全绿，评分 `96/100`；正式 `300/120` 未运行，状态为 `completed / coordinator-approved / performance-deferred-by-ADR-115 / formalGate=false`。

lane B 最终只新增 `scripts/lib/arena-pa7-formal-evidence-v1.ts`、`scripts/arena-pa7-formal-gate.ts` 与 `tests/arena/pa7-formal-evidence.test.ts`。它要求生产模块闭包同时含 composition provenance、正式 runner、合同与 evidence module，并只接受当前 `process.execPath` 加精确六参数 worker 形状；稳定 progress reader 使用 `O_NOFOLLOW`、dev/ino/size/mtime/ctime 和有界重试验证合法原子替换，拒绝符号链接、持续 churn、tick/sequence 不可达、提前 pass/commit、case/hash/rollback 跳变。最终关闭时重读 progress 并与 payload 精确一致，CPU P95 与 heap delta 直接从已验证 payload 计算且进入外层 payload hash；阈值相等通过、超过 1 单位失败，负 heap delta 合法。stdout/stderr 上限、TERM→KILL、临时路径清理、hard-link no-overwrite 与 source/config 双读继续 fail closed。主协调独立执行 evidence `21/21`、目标 ESLint、`npm run typecheck:app` 与 `git diff --check` 全绿，评分 `97/100`；正式 worker 未启动，状态为 `completed / coordinator-approved / performance-deferred-by-ADR-115 / formalGate=false`。

两线交叉审计曾发现并关闭三类真实阻断：lane A 早期把严格深克隆放进每 tick progress 热路径、CPU 只覆盖局部 readStep；lane B 早期稳定读取会把合法 rename 竞态误判为红门。最终字节分别改为 O(1) 内存状态、全 Session process CPU 与普通 inode 替换有界重试。失败轮保留，不用后续绿轮覆盖历史。PA7 非性能实现到此冻结，下一授权门为 P1-PP0；任何后续 PA7 源码变化都必须重新做正确性签核，并使最终性能 source identity 重新冻结。

#### 多线程协调检查点（2026-08-02，签核前历史快照）

本节记录 2026-08-02 至 2026-08-03 的逐门授权过程，不再代表当前权限或实现状态；其中“当前”“未来”“尚不存在”均应按历史时点阅读。当前真值只取本台账顶部状态与
[`Arena V2 生产化分阶段开发与治理计划`](arena-v2-production-development-plan.md) 的最新阶段门。即时消息只用于通知，不得覆盖这两个当前事实源。当时协作线程和权限如下：

| 线程 | 角色 | 当前可做 | 当前禁止 |
|---|---|---|---|
| `019fa7c7-d26e-7111-9054-782634e5c54c` | 开发 A / 原开发线程 | PA7 lane A 已签核并冻结；已完成 PP0/PP1 只读交叉预审，等待下一只读反证授权 | 不得写 lane B、PP、中央治理、P2；性能采样、提交/推送禁止 |
| `019fb364-d211-7513-b040-640045598ad6` | 开发 B / 第二开发线程 | PP0 已签核并冻结；串行执行获批的 P1-PP1 adapter 新文件并只在既有 PP 测试文件追加 PP1 矩阵 | PP1 签核前不得写 PP2/PP3；不得回改 PA7/PP0、P2、中央出口；性能采样、提交/推送禁止 |
| `019fa7c3-a20b-7130-b99a-cba1e6cbd4b2` | 美术线程 | 回执 ADR-115 gate；只读准备 A1.0-v2/Cue/回退逐字段反证 | PP1真实候选前不得创建v2或资产；A2、性能采样、提交/推送禁止 |

主协调本轮先调用线程列表，等待超过60秒无返回后终止；随后向三线程并行发送互认线程ID、P2.0/A2.0精确复核与六维自检要求，等待超过50秒仍无返回后终止。后续两次线程列表重试分别等待约25秒和31秒仍无返回并终止；再使用三线程`wait_threads(timeoutMs=0)`即时快照仍卡住约22秒后终止。因此交付状态继续是`notification-unconfirmed`，不能推定任何线程已收到新授权，也不能把线程静默解释为完成；线程服务故障不阻止主协调继续只读审计和治理文档，但不构成代码或资产授权。
用户允许忽略归属不明的低负载环境并继续非性能工作后，主协调先对三线程执行一次`wait_threads(timeoutMs=0)`，服务在本地12秒保护窗口内无返回；后续自动继续时又调用线程列表，15秒保护窗口内仍无返回。两次重试均没有取得新回执、没有发送新授权，也没有改变PA6/PA7/P1-PP/P2/A2门禁；本轮不再重复调用线程服务。
本次继续工作先后执行一次 `list_threads(limit=50)` 和一次面向三线程的并行 `send_message_to_thread`；两次均在本地 20 秒保护窗口内超时，
没有返回可验证的列表或派发回执。发送内容已经精确包含三方 threadId、互认关系、当前 gate、只读写域和六维自检格式，但在服务确认前仍按
`notification-unconfirmed` 处理，不能推定消息已送达；本轮后续不再重试线程服务。
完成 175 路径归属后又仅执行一次三线程 `wait_threads(timeoutMs=0)` 回执快照，本地 20 秒保护窗口仍超时；没有新增回执或授权，至此本轮停止线程调用。
2026-08-03 线程服务恢复：ADR-115 新门禁消息已分别取得三条 `send_message_to_thread` 送达确认。开发 B 与美术线程已逐字回执新 gate、对方 threadId 和零写入边界并保持 idle；开发 A 已进入 active，当前只执行获批的 PA7-0 两个新文件并审计现有严格 validator，尚未提交最终六维自检或小门验收申请。此前 `notification-unconfirmed` 只保留为历史故障事实，当前状态升级为 `delivered / B-art-acknowledged / A-in-progress`。
2026-08-03 后续审计：开发 A 完成 PA7-0 七项自检后，主协调曾对当时字节给出 `95/100`；该历史候选随后被真实 workload 反证，签核已撤销。PA7-0.1 又因逐 case 生命周期约束与正式 runner 不一致而未获签核；PA7-0.2 随后以独立 `9/9` 和逐字段语义审计取得 `96/100` 签核。当时协调状态为 `PA7-lane-A-B-non-performance-in-progress / art-read-only / formalGate=false`。
2026-08-03 最终非性能复核：PA7-0.3–0.5 已完成生产器、第二波即时拾取和跨 lane 唯一常量补强；lane A/B 分别以 `8/8 + 9/9` 与 `21/21` 定向测试、目标 ESLint、app typecheck、diff check 通过主协调签核，评分 `96/100` 与 `97/100`。协调状态更新为 `PA7-lane-A-B-non-performance-completed / P1-PP0-authorized / art-read-only / formalGate=false`，共享树最新为 184 路径 dirty；没有运行正式性能、模拟器、构建、提交或推送。
线程服务恢复后，三线程必须先回执 `threadId / role / acknowledgedGate / acknowledgedWriteSet /
selfCheckStatus / runningWork / blockers`；其中 `acknowledgedGate` 必须是
`PA6 correctness approved, performance deferred by ADR-115, formalGate=false; PA7/PP non-performance conditional window only; P2/A2/commit/push unauthorized`，否则继续保持只读。

任何开发小门提请验收前，所属线程必须对待提交diff单独给出六维自检：`健壮性 / 竞态与确定性 /
兜底与失败关闭 / 边界与恶意输入 / 生命周期与清理 / 生产主流程与阻断性bug`，并另交`变更治理`，逐项列出代码证据、定向测试、失败轮、已知缺口、精确文件和回滚hunk。健壮性必须单独证明输入复制冻结、exact-key/schema、非有限数/安全整数、重复ID和恶意getter/Proxy在权威变更前拒绝，不能并入边界项后省略。
缺少任一维或变更治理、只给结论不指向证据、使用历史绿轮拼接当前源码、或未证明文件零重叠，主协调直接拒绝候选。
小门通过只允许进入下一已登记小门；大门还须完整回归、评分、同源和外部证据。任何commit/push都只能由主协调执行：PA7正确性门后仅可按两阶段协议创建本地`evidence-candidate`且禁止push，PA8全部硬门通过后才可创建attestation并push。

美术侧独立复验新增当前红门：A0.2总门检查继续为`ready / 96/100 / hardGatePassed=true`；A0.3继续为
`human-blocked / 85/100 / 0/10 / hardGatePassed=false`。A1.0正向检查因15个sourceAudit来源中10个byteLength/SHA-256漂移而失败，失败关闭脚本在正向基线预检处提前停止；
历史`dd786a9`的94分只保留为设计签核，当前标`stale-upstream-evidence / hardGatePassed=false`。A1.1检查另因`match-core.ts`、`bot-observation.ts`和
`bot-controller.ts`相对`f80307b`记录的byteLength/SHA-256漂移而失败。六个供给生命周期必需字段仍可定位，但A1.1机器包当前只能标
`stale-upstream-evidence`，历史92分不得用于开放代表样件。因共享源码尚未形成clean commit，不直接改hash或伪造签核；待最终source identity冻结后，
美术线程须同时重建A1.0 sourceAudit与A1.1 artifact，提交来源/竞态/兜底/边界/生命周期/主流程自检，再由主协调复验。

#### 178 路径候选提交归属预审（2026-08-03，含 ADR-115 与 PA7-0；历史快照）

本节只记录 178 路径时点的归属预审，已被当前 229 路径 SF-0 全量分类覆盖；其中 A1.0-v2、PP0–PP3、路径数量与当前授权描述不得用于判断现状。用户当时已授权忽略归属不明、低负载的外部残留并继续非性能工作；本节据此只做共享工作树归属审计，不运行 PA6、正式 pressure、构建、模拟器或设备流程，
也不把该授权解释为性能环境清洁。审计时 `HEAD` 与上游均为 `d750e4caa767332b5c3caaf247080b5717d56219`；加入本次顺序治理 ADR 与已签核 PA7-0 两个新文件后，工作树共 `178` 条路径：
`132` 条 tracked 修改、`46` 条 untracked。没有执行 add、commit、push、reset 或 checkout。

当前不能按“一个文件等于一个阶段”直接拆候选提交。零上下文 hunk 审计确认以下 10 个中央路径同时承载多个已签核/候选批次，统一收回主协调独占，
开发 A、开发 B 和美术线程都不得追认所有权或自行暂存：

- `packages/arena-match/src/match-core.ts`：B1 trusted InputFrame batch、expired-held disposition、PA2 owner/read port、PA5 legacy/audit 退出共存；
- `packages/arena-session/src/local-match-session.ts`：B1 batch、PA3 Bot command-source、PA4 presentation frame、PA5 audit/readStep/lifecycle 共存；
- `packages/arena-bot/src/bot-observation.ts`、`packages/arena-bot/src/bot-controller.ts`：旧 snapshot 退出与 PA3 V5 observation/command-source 共存；
- `packages/arena-product-presentation/src/product-match-presentation-runtime.ts`：PA4b V2 frame/sidecar 与 PA5 production legacy 退出共存；
- `scripts/arena-formal-survival-bot-pressure.ts`：expired-held 资源/事件门、PA5 readStep/evidence 与 PA6 round 入口共存；
- `tests/architecture.test.ts`：B1、PA1–PA6-P、legacy、Product 和 runner 的跨阶段静态门共存；
- 本台账、生产计划和文档索引：状态、依赖、ADR 与最终证据接线共存。

其余路径的候选归属按下表冻结；“独立路径”只表示未来可以形成单独 patch manifest，不表示现在允许提交：

| 路径组 | 当前数量/事实 | 唯一处理者 | 当前决定 |
|---|---:|---|---|
| 美术/A1 治理 | 7 条：6 份 `arena-art-*` 文档加 ADR-114 | 历史时点：美术线程只负责后续 A1.0-v2 机器包；当时 7 条由主协调维护 | 历史时点：A1.0/A1.1 stale，保留 dirty，不创建 v2、不提交 |
| PA6 runner/readStep 独立面 | 10 条：`arena-performance-evidence` 3 条、PA6/runner 脚本 7 条 | 主协调；ADR-115 实现窗口继续冻结 | 正确性候选保留，最终 source 前不运行 ABBA、不提交 |
| PA5 显式 legacy/research 迁移 | `packages/arena-v1-experiment` 20 条 | 主协调按 PA5a/PA5c 历史 allowlist 复核 | 必须与中央 caller/architecture 同批验证，不能只按目录提交 |
| PA6-P 六文件 | 已有独立签核和精确六文件 allowlist | 原第二开发历史归属已结束，当前冻结 | 不回改；未来只由主协调纳入候选 |
| P1-PP0/PP1 | ADR-113 预注册的新 contract、adapter、25 项测试；历史时点均不存在 | 开发 B；线程回执和主协调逐门授权后写入 | 不得把当时 Product/Presentation dirty 当作 PP1 实现 |
| PA7 lane A/B | PA7-0 及两条 lane 的预注册文件 | 先授权开发A串行PA7-0；签核后再按零重叠写域开放A/B | 禁止性能采样；正式runner只允许已登记lane A hunk |
| P2/A2 | P2 台账/ADR 与 A2 只读预审 | 当前均无生产实现权限 | P1 independent `advance` 前不写 P2/A2 代码或资产 |

候选提交前必须先形成逐 hunk manifest，字段至少为 `path / hunk range / stage / owner / predecessor gate / behavior mapping / tests /
failed runs / rollback hunk / downstream evidence invalidation`。上述 10 个中央路径只能由主协调根据 manifest 组合；若同一 hunk 无法无损归入一个批次，
则保留在协调聚合候选，禁止为了得到“干净目录提交”重写、复制或放宽测试。package `index.ts`、共享 fixtures、golden/hash、`package.json` 与中央文档同样默认
为协调接线路径，除非台账已有更窄的唯一 allowlist。

安全顺序按 ADR-115 固定为：`保持零暂存 → 完成逐 hunk manifest → 线程回执 → PA7-0 → PA7 A/B与PP/A1非性能实现 → 每批六维自检和主协调验收 →
完整正确性门 → 主协调本地 evidence-candidate → 最终同源 PA6 ABBA×3 → PA7 300/120 → 三端/设备/美术门 → PA8 attestation 与 push`。当前结论仍是
`candidate-commit-not-authorized / path-level-staging-unsafe / conditional-non-performance-implementation-window-open`；双开发提速只应用于未来零重叠新文件，不 retroactively 切分
当前共享热点。

路径覆盖按当前 `git status --short` 复算为下表，合计精确为 `178`，因此不存在此前解析器误报的 `ocs/architecture` 或未计入的未知顶层目录：

| 覆盖组 | 路径数 | 当前阶段混合 | 当前所有权 |
|---|---:|---|---|
| `docs/**` | 19 | P1/PA、P2、A0/A1、ADR、玩法与索引 | 主协调；未来机器美术证据另按 ADR-114 授权 |
| contracts/core/equipment/match | 17 | B1、expired-held、PA1、PA2、PA5 | 当前全部冻结给主协调复核 |
| bot/session/formal composition | 11 | PA3、PA4、PA5 | 当前全部冻结给主协调复核 |
| Product/Presentation/Pilot/greybox | 35 | PA4、PA5、PA6-P 与 research adapter | 当前已签核 hunk 冻结；PP 新文件尚未授权 |
| regression/v1-experiment/performance-evidence | 29 | PA5 migration/golden/evidence 与 PA6 measurement | 当前全部冻结给主协调复核 |
| `scripts/**` | 13 | PA5 migration/golden/stress、PA6 runner 与 PA7-0 冻结合同 | 正式 pressure 为中央热点；PA7-0 合同只读冻结；其余按既定 allowlist |
| `tests/**` | 53 | B1、expired-held、PA1–PA7-0、Product 与 study | architecture 为中央热点；PA7-0 专测只读冻结；其余必须跟随对应生产 hunk |
| `src/**` | 1 | PA5 显式 audit POC 迁移 | 主协调按 PA5a allowlist 复核 |
| **合计** | **178** | 132 tracked + 46 untracked | 当前无开发/美术线程 retroactive commit 权限 |

第一轮稳定 symbol/hunk 归属如下。它把同一路径内可辨识的逻辑块映射回历史小门；`aggregate` 表示构造、销毁、重入或 import/export 已把多个小门交织在
同一 hunk，不能用交互式暂存强拆：

| 中央路径 | 稳定 symbol/hunk 锚点 | 归属阶段 | 候选处理 |
|---|---|---|---|
| `match-core.ts` | trusted batch provenance/validator、`#runValidatedStep` | B1 | 与 B1 测试共同复核；不单独暂存 import/field hunk |
| 同上 | `EXPIRED_HELD_LIFECYCLE` 事件 reason、`equipmentSupplyDisposition` snapshot | expired-held blocker | 与 Equipment/Replay/hash/599–601 证据共同复核 |
| 同上 | MatchRead owner/binding/readers/world memo/sidecars | PA2a–PA2c | 只消费冻结 PA1 affordance；与 reader 专测共同复核 |
| 同上 | `getLegacyFullSnapshotForAudit` 与旧 trusted public reader 删除 | PA5a | 与所有 caller 迁移和 static gate 同批复核 |
| 同上 | constructor/destroy/reentry/caller-validation guard 与 import/export | `aggregate` | 主协调聚合 hunk，禁止开发线程拆分 |
| `local-match-session.ts` | normalized player/Bot frame、trusted transaction commit/retry | B1 + PA3 | 同一 step 原子事务，保持聚合 |
| 同上 | `botMatchReadBundle`、command-source handshake | PA3a/PA3b | 与 Bot controller/bundle/composition 同批复核 |
| 同上 | presentation frame/read/step | PA4a/PA4b | 与 Product V2 端到端门共同复核 |
| 同上 | explicit legacy audit、full-audit evidence/readStep | PA5a–PA5c | 与 runner schedule 和 legacy caller 清单共同复核 |
| 同上 | pause/run/destroy/reentry/cleanup guards | `aggregate` | 主协调聚合 hunk，不能按方法名粗拆 |
| `bot-observation.ts` | restricted V5 view/interfaces/`createBotObservation` | PA3a | 与 V5 observation 专测共同复核 |
| 同上 | 删除旧 `normalizeSourceSnapshot` 路径 | PA5a | 与旧 snapshot symbol/static gate 同批复核 |
| `bot-controller.ts` | command-source reader/handle、V5 input 生成 | PA3a | 与 observation/bundle 同批复核 |
| 同上 | trusted snapshot/binding 旧入口退出 | PA5a | 与 Session 旧 handshake 删除同批复核 |
| `product-match-presentation-runtime.ts` | V2 controller/input/readFrame/sidecar/projector | PA4b | 与 PA4b-3 Product 端到端测试共同复核 |
| 同上 | 旧 snapshot/actionAffordance/getActiveMatchSnapshot 退出 | PA5c | 与 Product/Session legacy static gate 同批复核 |
| 同上 | sample/authority/reentry/failure/cleanup guard | PA4b + PA5 D9–D18 | 已交织，主协调聚合，不归 PA6-P 六文件 |
| `arena-formal-survival-bot-pressure.ts` | despawn reason、spawn count、world/runtime resource limits | expired-held blocker | 与 20/300 case 资源/事件门共同复核 |
| 同上 | schedule/full-audit/readStep/measurement | PA5b | 只消费冻结 reader/evidence 合同 |
| 同上 | PA6 percentile/collector/formal round | PA6 runner | 正确性候选保留；清洁 ABBA×3 前不提交 |
| `tests/architecture.test.ts` | performance-evidence count、legacy quick-match rename | PA5b/PA5c | 与对应生产 hunk共同复核 |
| 同上 | PA2 hot-path audit；B1/PA3/PA4/PA5/PA6 static gates | PA2–PA6 | 中央跨阶段门，永久由主协调接线 |

第二轮从当前 `git status --short` 精确路径集合进行非中央分类，加入 ADR-115 与 PA7-0 后排序的 status 路径集合 SHA-256 为
`ae048a6ba1e84a69db57fb67a14094f67a28db05b4aab56c72aecd692e0b5535`。结果 `UNCLASSIFIED=0`，17 组数量总和精确为 178：

| 分类 | 数量 | 提交/所有权规则 |
|---|---:|---|
| central-aggregate | 10 | 仅主协调按上表 hunk 聚合 |
| art-current-governance | 7 | 现有文档由主协调；未来 v2 机器包另行授权美术 |
| p2-contract-only | 2 | P1 advance 前只读，不进入 P1 候选 |
| p1-pp-contract-only | 1 | ADR-113 设计输入；PP 新代码尚不存在 |
| expired-held-authority | 8 | 跟随 blocker authority/599–601/hash/replay 证据 |
| pa1-rule | 4 | 跟随 PA1/PA1.1 签核批次 |
| pa2-read-model | 6 | 跟随 PA2a–PA2c 签核批次 |
| pa3-bot-session | 11 | 跟随 PA3a/PA3b 签核批次 |
| pa4-product-v2 | 5 | 跟随 PA4a/PA4b 专测批次 |
| pa4-pa5-product-presentation | 24 | Product/Presentation V2 与 legacy 退出已交织，只能协调聚合 |
| pa5-legacy-experiment | 20 | 跟随 PA5a/PA5c explicit audit caller 迁移 |
| pa5-migration-evidence | 17 | 跟随 PA5a–PA5d source allowlist/golden/evidence |
| pa6-p-frozen | 6 | 已签核冻结，不回改 |
| pa6-runner-readstep | 10 | 正确性候选冻结，等待清洁 ABBA×3 |
| pa7-0-frozen | 2 | 已签核冻结；lane A/B 只读消费，不回改 |
| coordinator-docs-other | 3 | ADR-018/111/115 由主协调接线 |
| coordinator-follow-caller | 42 | shared index、Replay/hash、fixtures、scripts 与测试只能跟随其生产 hunk |

至此当前 178 路径归属小门完成：非中央路径已经按单阶段或 producer-follow 规则关闭，中央 10 路径已经按稳定 symbol/hunk 关闭。
任何 status 路径增删、路径集合哈希变化、同一 hunk 新增跨阶段语义或未来线程写入都会使本清单过期并要求重审；不得再次把上述当前 dirty 分配给
开发 A/B 或美术线程。这个完成只关闭“归属清单”小门；PA7/PP 的新写域仅由 ADR-115 条件窗口另行逐门授权，不授权 staging、commit、push、P2、A2 或性能结论。

#### ADR-115 延期性能后的授权序列（2026-08-03，PP0 开始前历史快照）

用户已明确要求跳过当时的 PA6 执行，先完成下一性能阶段前的开发任务，再统一性能测试。主协调接受该顺序但不接受任何性能豁免；本节只记录 PP0 开始前的门禁和预期顺序。PP0–PP3b 与 A1.0-v2 现已完成非性能签核，当前已进入 clean source freeze 收口；最新门禁见本台账顶部和生产计划。当时门禁精确为：

`PA6 correctness-approved / performance-deferred / formalGate=false; PA7/PP non-performance conditional window; P2/A2/commit/push unauthorized`。

PA7-0 首次签核与 PA7-0.1 定向绿轮均已因真实轨迹语义反证而不构成当时签核；PA7-0.2–0.5 与 case/trace、evidence 两条非性能 lane 已完成主协调独立签核并冻结。历史时点只开放开发 B 串行实现 PP0，开发 A 只读交叉反证，美术线程只读准备 A1.0-v2/Cue/回退；当时 PP0 签核前不得进入 PP1–PP3。预期顺序为：

```text
PA7-0 + lane A/B（已冻结）
  → PP0（当前）
    → PP1 + A1.0-v2 联合门
      → PP2/PP3 + A0.3/A1.1/代表样件
        → 完整非性能正确性门
          → 主协调本地 evidence-candidate
            → 最终同源 PA6 ABBA×3
              → PA7 300/120
```

实现窗口禁止 PA6、formal pressure、300/120、消融或其它性能采样；允许与当前小门直接相关的单测、边界/负向测试、typecheck、lint、architecture、
documentation 和构建正确性验证。任一线程越过文件域、缺少六维自检、改动冻结 authority/Replay/hash/readStep、触碰中央文件或自行 commit/push，立即撤销窗口并要求回滚。

### PA0 第二轮修订关闭证据（11 项）

| # | 关闭项 | ADR-111 与台账证据 |
|---:|---|---|
| 1 | `EquipmentDespawned` reason | ADR 背景与 PA0 行为映射均固定源码值 `supply-lifecycle-expired-held-drop`，不使用缩写 reason。 |
| 2 | read frame 与 measurement schema 分离 | `MatchReadFrameV2.schemaVersion=2`；`measurementSchemaVersion=2` 仅出现在 formal measurement/evidence report，PA2/PA5 同步写明。 |
| 3 | local primary identity/fallback | `LocalActionSidecarV2.primaryActionDefinitionId` 必填可验证字段；`canAct=false` 时由 Rule/Core 内部 display-primary fallback 填充，外部不接收完整第五 probe，PA4 只对旧 public identity 做 differential。 |
| 4 | outcome 字段精确性 | `ActionAffordanceView` 只记录现有 `kind/actionDefinitionId/lane/source/reason`；channel 只属于 channels map key，未向 outcome 新增字段。 |
| 5 | reader 跨 tick 语义 | capability 可贯穿 match；下一 tick 同一 reader 可读新 memo，结果绑定 tick/eventSequence/generation，旧 sidecar 不可冒充新 tick，跨 Core/owner 仍拒绝。 |
| 6 | memo 非 single-use | paused/ended 同一 authority identity 的重复 `read()` 是合法 memo hit；只拒绝过期 result、重复 participant/profile 绑定和跨 owner，不再写 duplicate consumption。 |
| 7 | Resolver 输入边界 | owner/read envelope 单独验证 Core、generation、tick、eventSequence、phase；prepared context 只复用现有 `tick/participantId/canAct/candidates/occupiedLanes/activeConflictTags/Definition lookup`。 |
| 8 | full-audit 事件覆盖 | audit schedule 补齐 `MatchStarted`、`EquipmentDropped`、`EquipmentDropFallback`、`KnockbackApplied`、`DownSmashLanded`、`SuddenDeathStarted` 与既有事件，稳定 tick 去重且全 participant full-audit。 |
| 9 | local sidecar 缺失语义 | `MatchReadFrameV2.localActionSidecar` 改为非 nullable；正式 LocalMatchSession/Product 本地 participant 缺失即 fail closed，world-only 需另立合同。 |
| 10 | ended 逐 participant 语义 | PA2/PA4 明确按旧 ParticipantSystem 重组；winner active 可保留 selected，淘汰者才可能 `participant-unavailable`，display fallback 的 `primaryActionDefinitionId` 做 differential。 |
| 11 | ADR/台账同步 | ADR、PA2/PA4/PA5 的 reader lifecycle、字段边界、audit schedule 和 readStep 计时口径已同步；文档索引无需新增内容，ADR-111 已在原位置登记。 |

首版 `98/100` 未充分暴露上述合同字段和身份语义缺口，因此本轮复评为 `96/100`：
文档完整性 `19/20`、架构边界 `20/20`、行为/迁移 `19/20`、失败关闭/生命周期 `15/15`、
确定性/证据 `15/15`、性能可证伪性 `5/5`、治理/回滚 `3/5`。该分数仅是 PA0 文档
自评，不授予任何生产实现、性能签核或 commit/push 权限。所有后续阶段均等待主协调逐门
授权；P1 总体、Presentation、Platform、真机和 4 人 P2 继续保持未完成/fail closed。
