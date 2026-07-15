# 项目文档索引

本目录是“数域跃迁”项目的权威文档入口。文档分为当前事实、目标治理、决策历史和验收证据四类；当文档与代码冲突时，以当前代码和自动化验证结果为准，并在本批次结束前校准文档。

## 新成员阅读顺序

1. [项目概览](project-overview.md)：产品目标、当前能力、平台和明确限制。
2. [仓库结构](repository-structure.md)：每个目录和关键文件的实际职责。
3. [运行主流程](runtime-flow.md)：启动、输入、固定步长、跳跃事务和 Web 生命周期。
4. [技术架构](architecture.md)：现有 v3 架构边界和 Three.js 单 Canvas 约束。
5. [测试与发布](testing-and-release.md)：测试地图、构建产物和批次提交门禁。
6. [v0.1.0 行为与工程基线](baselines/v0.1.0.md)：固定 seed、回放、视觉、包体和性能起点。
7. [治理路线图](governance/roadmap.md)：第 0 批到第四批的最终执行基线。
8. [治理状态](governance/status.md)：当前批次已完成、未完成和仍不明确的事实。

## 当前事实文档

- [项目概览](project-overview.md)
- [仓库结构与模块目录](repository-structure.md)
- [运行主流程与生命周期](runtime-flow.md)
- [游戏规则与玩法](gameplay-rules.md)
- [视觉与动作系统](design-system-v3.md)
- [平台与真机验收清单](platform-checklist.md)
- [产品边界](../PRODUCT.md)

## 治理与协作文档

- [完整治理路线图](governance/roadmap.md)
- [当前治理状态](governance/status.md)
- [每批提交前检查清单](governance/batch-checklist.md)
- [贡献与提交规范](../CONTRIBUTING.md)

## 架构决策

- [ADR-001：Three.js/WebGL2 单 Canvas](decisions/001-threejs-webgl2-single-canvas.md)
- [ADR-002：核心状态单向驱动表现层](decisions/002-core-driven-presentation.md)
- [ADR-003：`web-jump` 参考与 MIT 合规](decisions/003-web-jump-reference-and-license.md)
- [ADR-004：采用分批治理的模块化单体](decisions/004-modular-governance-roadmap.md)

## 文档状态规则

- `当前`：描述当前提交已经存在且可验证的行为。
- `目标`：计划中的未来结构，不得写成已经完成。
- `待验证`：代码可能存在，但没有足够自动化或真机证据。
- `未完成`：明确不存在或尚未落地。
- 每批开发结束必须先完成代码验证和问题修复，再更新文档状态，最后才能提交。
