# 退役数值跳台能力映射

- 退役批次：G1
- 产品决策：Arena 是唯一生产产品
- 数据迁移：无真实用户数据，不迁移旧存档
- 历史恢复：仅可通过 Git tag `arena-product-baseline-51e2822` 的父系历史查阅，不保留运行时开关

## 删除与承接

| 退役范围 | 原职责 | Arena 承接或退役结论 | 证据 |
| --- | --- | --- | --- |
| `src/core/game-state.js`、`operations.js` | 数值选择和单人阶段规则 | 产品规则退役，不迁移 | Arena Rule/Action/MatchCore 测试与黄金 Replay |
| `src/core/jump-physics.js`、`geometry.js`、`world-state.js` | 单人蓄力跳台世界 | 产品规则退役，不迁移 | Arena movement/physics/map 测试与 100 场移动压力 |
| `src/core/rng.js` | 旧 RNG 导出 | 实现退役；Arena 使用 `src/shared/deterministic-rng.js` | 固定 8 值序列、具名 stream、Replay hash |
| `src/runtime/*` | 旧单人游戏生命周期 | 产品运行时退役 | LocalMatchSession、ProductSessionController、PresentationSession 生命周期专项 |
| `src/render3d/*` | 旧跳台 Three.js 表现 | 产品表现退役 | `src/arena/presentation/three` 及对应资源/Context loss/soak 测试 |
| 六个根级旧产品测试 | 保护已退役业务 | 随实现删除，不计入 Arena 覆盖 | `npm test` 总数下降必须与本表一致；Arena 测试不得删除 |
| v3 概念图和旧渲染截图 | 旧产品视觉基线 | 退役，不进入 Arena 资产 | 正式 Arena GLB/纹理/音频预算 `82a8b378` |
| v3 架构/规则/视觉/产品文档 | 旧产品规范 | 退役；历史由 Git 保存 | README/PRODUCT 只声明 Arena；ADR-030 记录决策 |
| `product.html` 跳转页 | 迁移期别名入口 | 删除 | Web 唯一生产入口为 `index.html` |

## 保留但重新归属

- `src/platform`、平台测试和通用启动/销毁辅助仍被 Arena Product 使用，不属于旧产品，保留并在 G6 迁入 Platform workspace。
- `src/shared/deterministic-rng.js` 与 deterministic hash 已是 Arena 确定性合同，保留并在 G2/G3 迁入 strict TypeScript。
- `greybox.html`、`pilot.html`、`study.html` 及其实现目前保留为开发/测试工具，但 G1 起不再进入 `npm run build` 的生产交付；G5-G7 再决定其 TS 包归属。
- 旧 ADR 若仍解释仓库演进，在 G9 逐一标记“已被 ADR-030 取代”或删除；不得继续作为当前实现规范被引用。

## 测试计数解释

G0 的 `npm test` 为 696 项，混合了 Arena、共享基础设施和旧产品测试。G1 删除六个旧产品测试文件后，总数下降是显式产品退役结果，不是通过删 Arena 测试规避质量门。后续 coverage 以 Arena workspace 和能力映射为分母，不能用旧产品代码退出提高覆盖率的事实冒充新增质量。

## 退役门禁

- 退役路径不存在，README/PRODUCT 唯一声明 Arena。
- JavaScript 允许清单同步删除退役文件，只能缩小。
- Arena 黄金 Replay manifest `0dace228` 保持可复验。
- 全量 Arena/共享测试、回归、压力、资产和三端生产构建通过。
- Web 生产产物不存在 Greybox、Pilot、Study 或跳转别名页面。
