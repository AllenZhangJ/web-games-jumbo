# Arena Stage 4～9 要求—证据—缺口矩阵

## 状态口径

本矩阵以 `arena.stage9.rc-handoff.v1` 为机器权威门集，说明当前工程证据能证明什么、还缺什么。`ready` 只允许由 Gate 指定的 producer 语义复验形成；材料存在、单测通过或文档写明“完成”均不能自动替代。

当前为 S9.6b5b：候选/证据/报告合同和材料完整性预检已完成，十一个 Gate 已启用语义复算；输入盲测已绑定原始 Audit、clean Web build 和同候选 Stage 6 E3。正式资产 Intake/批准已就绪，但其 release producer 尚未实现；四类外部门仍缺真实材料，因此还不存在可冻结的 S9.6 候选。

## 当前矩阵

| Gate | 覆盖阶段 | 已有能力 | 当前缺口 | 当前状态 |
|---|---|---|---|---|
| `stage6.input-pilot` | S6.6 | A/B Definition、区组分配、运行时观察、按 build 隔离的双槽工作区、Evidence Bundle、Audit/report/build/E3 release producer | 目标设备 E3、真实新手 E4、`candidate-winner` 与最终 Evidence Statement | incomplete（外部） |
| `stage7.formal-assets` | S7.2～S7.5 | 双 KayKit 正式角色、18 动作语义、GLB/PNG 宿主加载、SkeletonUtils、左右手插槽、三种装备、Kenney CC0 命中音频、声音开关、reduced-motion 镜头/震动降级、固定来源/许可/字节、Allen 批准、真实 Intake Bundle、Formal Asset 专用复杂度/内存预算和三端包体预算 | release producer，以及真机小屏/音频/reduced-motion/峰值内存可读性 | incomplete（producer 与外部证据） |
| `stage9.golden-replay` | S4～S9.2 | Replay V5 四类黄金场景、严格重放/再生成、历史拒绝及 release producer | 最终候选 clean commit 的 Evidence Statement | incomplete（候选材料） |
| `stage9.regression` | S9.2 | 固定 Regression Definition、无 shell 受限编排、input fuzz、六文件 lifecycle、两条 100 局 soak、200 局 Product stress、原子 Report 及 release producer | 最终候选 clean commit 的 Evidence Report/Statement；开发中的 shell 聚合不可复用 | incomplete（候选材料） |
| `stage9.balance-validation` | S9.3 | 900 局 11 条命 validation、可重建 Report Bundle、Product 默认及 release producer | 最终候选 clean commit 重跑 900 局并形成 Evidence Statement；旧 commit Report 不可复用 | incomplete（候选材料） |
| `stage9.build-integrity` | S9.4 | 三端 Manifest、产物 hash、同 commit/build 和 clean source 校验；release producer 已复算实际产物 | 最终候选 clean build 的 Evidence Statement | incomplete（候选材料） |
| `stage9.build-budget` | S9.4 | 三端 4 MiB 内部预算与可重算 Report；release producer 与完整性门复用同一材料 | 最终候选 clean build 的 Evidence Statement | incomplete（候选材料） |
| `stage9.stage6-device` | S6/S9.4 | 版本化 E3 Device Definition、Record、附件校验及复用同一 verifier 的 release producer | Web/微信/抖音目标真机 Record 与最终 Evidence Statement | incomplete（外部） |
| `stage9.stage8-product-device` | S8/S9.4 | 产品闭环 Device Definition、Canvas/DOM 正式入口、构建绑定及 release producer | 六目标设备正式 Record 与最终 Evidence Statement | incomplete（外部） |
| `stage9.performance-device` | S9.4 | Quality Definition、Probe、Policy、Trace/Record/Report、六 target 及 release producer | 六目标设备十分钟/三局/内存/恢复证据与最终 Statement | incomplete（外部） |
| `stage9.human-fairness` | S9.5 | 预注册三隐藏组、工作台、离线入库、Replay/Bot 逐 Tick 复验及 release producer | 至少 90 名合格完成者、270 局、退出/失效账本和最终 Report/Statement | incomplete（外部） |
| `stage9.defects` | S9.6 | 版本化 Defect Ledger、派生 Report、开放严重度/风险 owner/解决证据约束及 release producer | 最终 clean commit 的完整人工复核账本与 Evidence Statement | incomplete（候选材料） |

## 不可替代关系

- Stage 6 输入盲测回答操作映射，不由 S9.5 机器人自然度研究替代。
- Stage 6/8 设备记录回答触控与产品闭环，不由 Stage 9 性能 Trace 替代。
- Stage 9 性能记录回答帧时间、内存和恢复，不由 Node soak 或桌面截图替代。
- S9.3 Bot benchmark 回答确定性和相对能力，不由真人样本替代；S9.5 真人研究也不能由 Bot benchmark 替代。
- 正式资产许可和手机可读性不由桌面 Web 截图、程序化武器或构建预算替代。
- 材料 SHA-256 只证明文件未变化，不证明报告结论正确；必须由具名 producer 重算。

## 下一工程批次

S9.6b1-b5b 已完成十一个 producer。Formal Assets 的真实资产、预算、许可、Bundle 和负责人批准已就绪；下一工程项是实现窄责任 release producer，且只有目标真机材料齐全后才能输出 `ready`。任何 producer 只能输出自己的窄证据，不能直接修改总 Report。
