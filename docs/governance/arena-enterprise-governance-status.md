# Arena 企业治理状态台账

- 更新时间：2026-07-21
- 当前分支：`feature/arena-enterprise-governance`
- Arena 产品基线：`51e28220295c080261d30e33aaac7e43c5f91685`
- 目标：达到与最新 `origin/main` 的合并前审计条件；不执行合并
- 总体状态：迁移中，不可合并，不可宣称正式发布

## 决策登记

| 决策 | 已确认值 |
| --- | --- |
| 唯一生产游戏 | Arena |
| 旧数值跳台 | 仅保留于 Git 历史，不提供运行时兼容 |
| 真实用户数据迁移 | 无 |
| 项目负责人 | Allen（`@AllenZhangJ`） |
| 正式资产审批角色 | 项目唯一负责人 |
| 程序化角色 | 仅正式资产加载失败兜底 |
| Greybox/Study/Pilot/POC | 仅开发/测试，不进入生产交付 |
| 性能策略 | 不降低分辨率、抗锯齿、动作或关节；优化算法与生命周期 |
| 诊断 | 仅本地证据，不新增网络遥测 |
| 合并门禁 | 自动化 + 三端 clean build + Web 手机验收 |
| 发布门禁 | 合并门禁 + 微信/抖音 iOS/Android 真机记录 |
| 提交策略 | 中文批次提交、逐批推送、禁止 force push |

## 批次状态

| 批次 | 状态 | 当前证据或阻断 |
| --- | --- | --- |
| G0 基线冻结 | 已完成 | 自动化、压力、资产和三端构建通过；ADR/计划/证据已落盘；tag `arena-product-baseline-51e2822` 指向基线提交 |
| G1 治理外壳/唯一产品 | 进行中 | 当前仍有 506 个 `.js` 与 43 个 `.mjs`（统计范围 `src/tests/scripts/public`）；Web 仍交付 Greybox/Study/Pilot 页面；旧数值跳台源码/测试/README 仍存在 |
| G2 Definition/合同/配置 | 未开始 | 当前为 JavaScript，无 strict TS workspace 门禁 |
| G3 Rule/Core/Replay | 未开始 | 当前行为有 Replay/hash 证据，但尚未迁入 strict TS |
| G4 Bot/Product/Persistence | 未开始 | 当前功能与压力证据存在，尚未迁入 strict TS workspace |
| G5 Presentation/资产/反馈 | 未开始 | 正式资产预算通过；审批字段与唯一正常路径仍待治理 |
| G6 Platform/入口/构建 | 未开始 | 三端默认入口是 Product，但生产交付未与开发页面彻底隔离 |
| G7 零 JS/完整质量门 | 未开始 | 当前 `node --test`，无 ESLint/Vitest/coverage/零 JS 门禁 |
| G8 资产/安全/所有权 | 未开始 | CODEOWNERS、CI 安全与正式资产最终批准待补齐 |
| G9 文档归真 | 未开始 | README 首标题和大量章节仍以数值跳台 v3 为产品真值 |
| G10 最新 main 审计 | 未开始 | 只能在 G0-G9 完成后执行；禁止实际合并 |

## G0 已取得证据

完整数值见 [Arena 产品基线 51e2822](../baselines/arena-product-51e2822.md)。当前已确认：

- `npm test`：696/696 通过；该总数混含旧产品测试，尚不能作为 Arena 专属覆盖结论。
- 黄金 Replay manifest：`0dace228`，4 个样本通过。
- 输入 fuzz：120 场、6 次 Replay 复验、120 个唯一 final hash。
- 生命周期专项：91/91 通过。
- Presentation/Product soak：各 100 场，堆增长均低于 8 MiB，资源残留为零。
- 移动压力：100 场、417355 tick、100 个唯一 final hash、3 个 Replay 样本，门禁通过。
- Product 压力：200 场；Profile 压力：500 次提交，门禁通过。
- 正式资产预算：结果 `82a8b378`，策略 `532faaa2`，通过。
- 三端 clean build 与预算：通过；当前 Web/微信/抖音 delivery 分别为 3773570 / 3587013 / 3586988 bytes。

## 当前不可合并原因

1. 两套产品身份与旧源码仍共存，README 仍以数值跳台 v3 为标题。
2. 受维护代码未进入 strict TypeScript 工作区，缺少 ESLint、Vitest/coverage、零 JS 和 CI 等目标门禁。
3. Web 生产交付仍包含 Greybox、Study、Pilot 等开发页面。
4. 正式资产最终审批、CODEOWNERS 与安全/依赖治理未闭环。
5. 尚未对治理完成后的候选提交与最新 `origin/main` 做独立虚拟合并审计。

以上是迁移入口，不是已接受的永久例外。
