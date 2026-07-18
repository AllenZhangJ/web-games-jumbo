# Arena Stage 4～9 要求—证据—缺口矩阵

## 状态口径

本矩阵以 `arena.stage9.rc-handoff.v1` 为机器权威门集，说明当前工程证据能证明什么、还缺什么。`ready` 只允许由 Gate 指定的 producer 语义复验形成；材料存在、单测通过或文档写明“完成”均不能自动替代。

当前为 S9.6b1：候选/证据/报告合同和材料完整性预检已完成，构建完整性与构建预算 producer 已启用语义复算；其余十个 Gate 尚未适配或缺少真实材料，因此还不存在可冻结的 S9.6 候选。

## 当前矩阵

| Gate | 覆盖阶段 | 已有能力 | 当前缺口 | 当前状态 |
|---|---|---|---|---|
| `stage6.input-pilot` | S6.6 | A/B Definition、区组分配、运行时观察、双槽工作区、独立工作台与报告 | 目标设备 E3、真实新手 E4、最终 Mapper 决策和 release producer | incomplete（外部 + 工程） |
| `stage7.formal-assets` | S7.2～S7.5 | 角色/资产/动画语义 Registry、六方向、程序化占位和生命周期合同 | 两个正式角色、GLB/动作/附件/音画、预算、许可和真机可读性 | incomplete（内容生产） |
| `stage9.golden-replay` | S4～S9.2 | Replay V5 四类黄金场景、严格重放/再生成与历史拒绝 | release producer 适配及最终候选 commit 复跑 | incomplete（工程） |
| `stage9.regression` | S9.2 | input fuzz、生命周期矩阵、两条 100 局 soak、200 局 Product stress | 原子化机器 Evidence、当前候选复跑和 producer 适配 | incomplete（工程） |
| `stage9.balance-validation` | S9.3 | 900 局 11 条命 validation、Report Bundle 与 Product 默认 | 当前最终 commit 的身份复核/必要时复跑及 producer 适配 | incomplete（工程） |
| `stage9.build-integrity` | S9.4 | 三端 Manifest、产物 hash、同 commit/build 和 clean source 校验；release producer 已复算实际产物 | 最终候选 clean build 的 Evidence Statement | incomplete（候选材料） |
| `stage9.build-budget` | S9.4 | 三端 4 MiB 内部预算与可重算 Report；release producer 与完整性门复用同一材料 | 最终候选 clean build 的 Evidence Statement | incomplete（候选材料） |
| `stage9.stage6-device` | S6/S9.4 | 版本化 E3 Device Definition、Record、附件和 Manifest 验证 | Web/微信/抖音目标真机 Record | incomplete（外部） |
| `stage9.stage8-product-device` | S8/S9.4 | 产品闭环 Device Definition、Canvas/DOM 正式入口与证据合同 | 六目标设备正式 Record | incomplete（外部） |
| `stage9.performance-device` | S9.4 | Quality Definition、Probe、Policy、Trace/Record/Report 与六 target | 六目标设备十分钟/三局/内存/恢复证据 | incomplete（外部） |
| `stage9.human-fairness` | S9.5 | 预注册三隐藏组、工作台、离线入库、Replay/Bot 逐 Tick 复验 | 至少 90 名合格完成者、270 局、退出/失效账本和最终 Report | incomplete（外部） |
| `stage9.defects` | S9.6 | 自动回归和各阶段结果记录 | 版本化缺陷/已知问题/剩余风险账本及 producer | incomplete（工程） |

## 不可替代关系

- Stage 6 输入盲测回答操作映射，不由 S9.5 机器人自然度研究替代。
- Stage 6/8 设备记录回答触控与产品闭环，不由 Stage 9 性能 Trace 替代。
- Stage 9 性能记录回答帧时间、内存和恢复，不由 Node soak 或桌面截图替代。
- S9.3 Bot benchmark 回答确定性和相对能力，不由真人样本替代；S9.5 真人研究也不能由 Bot benchmark 替代。
- 正式资产预算、许可和手机可读性不由程序化占位角色替代。
- 材料 SHA-256 只证明文件未变化，不证明报告结论正确；必须由具名 producer 重算。

## 下一工程批次

S9.6b1 已完成构建完整性与构建预算适配。下一批接入黄金回放、回归和平衡 producer；随后复用现有 Device/Performance/Human verifier 输出；最后补齐 Input Pilot、Asset 和 Defect 三类尚不存在的正式 evidence producer。任何 producer 只能输出自己的窄证据，不能直接修改总 Report。
