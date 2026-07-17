# Arena Stage 6 S6.6 输入盲测合同记录

## 结论

2026-07-17 的 S6.6.1 当前候选已建立版本化盲测 Definition、确定性 A/B 分组、严格原始记录和去标识聚合报告。该合同只固定试验口径，不代表已经招募受测者，也不产生 Mapper 胜者。真实新手样本、微信/抖音 E3 和最终输入冻结仍待完成。

## 合同边界

- `InputPilotDefinition` 固定任务、两套 Mapper、目标设备环境、分组 seed、10 秒成功窗口、180 秒试验上限、最低样本和胜者门槛；修改任一字段都会改变 content hash。
- 分组按显式 `enrollmentIndex` 做两人一组的确定性区组随机；每个完整区组恰有 A/B 各一人，追加样本不会重排已有分组。
- `InputPilotAssignment` 可由 Definition、匿名参与者编号和入组序号完整复现；篡改 variant、Mapper、seed 或 Definition hash 会在采纳记录前被拒绝。
- `InputPilotRecord` 将自动采集、观察者计数和受测者复述拆为三个独立字段组；不记录原始触点、墙钟时间、隐藏 Bot 难度或生产 Match 权威对象。
- `InputPilotReport` 只输出分方案汇总、来源数据校验 hash 和证据状态，不输出参与者编号、trial 或 assignment 明细，也不会修改默认 Mapper 或任何运行时配置。

## 样本口径

以下记录从主要指标中排除，并逐项保留排除计数：

- 试验被明确作废。
- 参与者此前接触过 Arena。
- 参与者此前接触过另一个 Mapper 方案。
- 平台、设备形态、方向或输入模式与 Definition 不一致。

主动放弃不属于无效数据：只要没有上述排除条件，它仍进入分母并按未在窗口内成功处理，避免删除不利样本。重复参与者、trial ID、入组序号或 assignment ID 在生成报告前失败，不允许静默覆盖。

参与者字段必须由试验执行者生成匿名编号，不能写姓名、手机号、邮箱或设备账号。聚合报告中的 FNV 校验值只用于确定性和误改检测，不是密码学匿名化；原始记录仍应按敏感研究资料控制访问。

## 候选判定

报告只可能返回以下状态：

- `insufficient-data`：任一方案有效样本不足 5 人。
- `threshold-not-met`：任一方案 10 秒成功率低于 80%。
- `no-clear-winner`：主要指标差距不足 10 个百分点。
- `conflicting-secondary-metrics`：主要指标胜者在意图不匹配、误触或单手完成率上反向劣于另一方案。
- `candidate-winner`：主要门槛与次要指标同向，只形成待人工复核的候选。

即使得到 `candidate-winner`，仍必须人工检查原始记录、设备证据和观察备注，再更新 ADR-009、生产 Mapper 与阈值。当前代码没有自动冻结路径。

## 生命周期与竞态边界

本批次是纯合同与纯聚合函数，不拥有 UI、存储、Session 或平台监听器，因此没有后台计时器和可泄漏资源。下一批采集入口必须遵守：

1. 由单一入组账本原子分配并持久化 `enrollmentIndex`，不能由两个并发页面各自计算数组长度。
2. assignment 先持久化，再创建 trial；刷新或恢复时复用原 assignment，不能重新抽签。
3. trial 只允许一次终态提交；重复点击、页面恢复和迟到回调必须幂等拒绝或返回同一结果。
4. 自动指标只能来自只读 Presentation 事件/快照，不得给 MatchCore 增加盲测分支。
5. 到达 180 秒上限必须转为可审计的放弃记录并释放 Session；App hide 不得偷偷消耗操作时长。

S6.6.2 已实现并通过进程内单写入账本、已消费 InputFrame 观察、active-tick 计时和一次 assignment 一局的本机门禁，证据见 [S6.6.2 盲测运行时门禁记录](arena-stage6-input-pilot-runtime.md)。S6.6.3a 已继续建立平台 Storage 结果合同、Workspace 双槽/CAS、协作 lease 和跨刷新 checkpoint，证据见 [S6.6.3a 持久化基础门禁记录](arena-stage6-input-pilot-persistence.md)。原始记录终态提交、独立 UI 与真机竞态仍未实现，不能用合同或 Node 测试替代。

## 当前自动化证据

定向测试覆盖：

- Definition/Registry 深冻结、schema、未知字段、重复方案和非法 seed。
- 分组可复现、区组平衡、追加稳定和 assignment 防误改。
- 记录最大时长、嵌套未知字段、assignment 篡改和全部排除原因。
- 无效样本不污染指标，真实放弃不被排除。
- 数据顺序不影响报告，聚合结果不含参与者编号且深冻结。
- 样本不足、门槛不足、无明显差异、次要指标冲突和所有重复身份边界。
- Arena authority/presentation 依赖方向保持不变。

当前通过命令：

```bash
node --test tests/arena/presentation/input-pilot.test.js tests/architecture.test.js
```

完整仓库门禁、构建和 diff 检查在本批次提交前另行执行。

## 尚未证明

- 尚未建立可给受测者使用的独立采集入口和单写入账本。
- 尚无每方案 5 名未接触项目的新手记录。
- 尚无目标手机上的 10 秒上手、误触、意图匹配和单手完成结论。
- 尚未冻结 Mapper、Gesture 配置或正式动画语义。
- 尚未完成微信/抖音开发者工具和目标真机 E3。
