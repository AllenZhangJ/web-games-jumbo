# ADR-022：Arena S9.3 使用预注册配对平衡候选与可验证报告

- 状态：已接受；S9.3a 与首份 clean baseline 已完成，候选未通过预注册门
- 日期：2026-07-18

## 背景

S9.1 已能固定 workload 和 Collector 版本，但 Collector 引用没有参数，阈值仍可能藏在实现代码中。若先看 900 局结果再调整阈值，就无法区分“候选通过”与“标准迁就候选”。只输出 stdout 也不足以形成多年后可读取、可验证且不会被覆盖的证据。

S9.3 还必须区分两类结论：脚本 benchmark 可以证明确定性、相对难度、玩法来源覆盖和工程分布，却不能证明真人胜率或新手理解。

## 决策

1. `ArenaExperimentDefinition` 升级为 schema V2。Collector 引用增加不可变 `parameters`，由 `MetricCollectorRegistry` 校验后注入；完整参数进入 Definition hash。V1 Definition 继续可读，但不能携带参数。
2. S9.3 baseline 固定 300 个 paired seed。每个 seed 依次运行 easy/normal/hard，共 900 局；三档共享 Match config、地图/装备随机和 benchmark player，只允许 Bot Profile 不同。
3. 固定 5 个 replay seed，三档合计 15 条严格回放。正式 suite 拒绝 `--cases`、`--first-seed` 和 `--replay-samples` 覆盖。
4. Policy 在运行前固定：主要对局 2～3 分钟、超短/超时上限、三档能力与生命压力最小差值、三件装备拾取/动作/命中的数量和宽松角色差异区间，以及有归属、装备归因和无归属环境淘汰占比。
5. 装备淘汰只在 `HitResolved` 与 `PlayerEliminated` 的 attacker 一致且位于 `lastHitCreditTicks` 内时归因。无攻击归属的淘汰称为“环境或自身”，不伪造具体机关原因。
6. 落盘使用 schema V1 `ArenaExperimentReportBundle`。Reader 通过 Definition 和 cases/metrics 重建 Report，拒绝额外或漂移字段并核对 bundle hash。文件只允许 exclusive create；调参产生新候选、新 ID 和新文件。
7. `freezeEligible=true` 仅表示实验资产可复现且通过其预注册门，不表示真人公平、设备通过或可发布。

## 被否决方案

### 阈值硬编码在 Collector

代码版本可以追踪变化，但 Report 无法单独证明运行时采用了哪组阈值，也不利于复用同一 Collector 比较不同候选。

### easy/normal/hard 使用不同 seed

地图、装备和出生随机会混入难度差异。paired seed 能降低这些混杂因素，同时不改变真实 Bot 输入权限。

### 为方便开发允许 CLI 改样本数

开发小样本可以使用 S9.1 bot suite；正式 balance suite 的样本身份必须唯一。否则相同实验 ID 会对应不同统计功效。

### 用脚本 benchmark 冻结真人胜率

benchmark 有固定策略和出生偏差，只能作为相对工程基准。真人 E4/试玩数据仍是最终胜率和可理解性的必要证据。

### 直接覆盖上一份 JSON

会破坏失败候选和调参历史。报告必须追加，并由 Definition、candidate ID 和 hash 区分。

## 后果

正面：阈值、样本、实现和结果形成完整可验证链；同一 workload 可由不同参数化 Collector 复用；失败 baseline 也能长期保留。

代价：Definition schema 增加兼容路径；完整报告会增加证据文件体积；第一份 baseline 很可能因产品目标未达而失败，但失败本身是下一候选的输入，不能修改原标准掩盖。

## 剩余条件

- 首份 baseline 已在 clean commit `cb1b3744c06e98412296f885a1fbaa57a069a5d0` 上完成：300/300 paired case、900 局、15 条严格回放均执行成功，但时长、装备归因上限和环境淘汰下限未通过；Report Bundle 见 [S9.3 证据索引](../quality/arena-stage9/balance/README.md)。
- 下一轮只创建新候选 Definition、Policy 和 Report，不覆盖本 ADR 的 baseline Policy 或失败证据。
- 真人样本、目标设备和 S9.4 性能证据齐备前，不进入 S9.5 公平性和发布冻结。
