# ADR-078：KZ 地图研究卡必须区分来源事实与 Arena 迁移结论

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 CS1.6 KZ 地图研究目录、路线合同和后续地图灰盒设计

## 背景

当前 KZ 研究已经从“断层、窄路、走钢丝”等空间印象进入可执行路线合同，但外部地图资料同时包含两类信息：来源直接公布的难度/长度/检查点事实，以及 Arena 根据这些资料推导出的段落用途和生存复用方式。如果两者写在同一个没有来源边界的字段里，后续容易把第三方地图数据误当成 Arena 的平衡结论。

## 决策

1. `ArenaV2KzMapResearchCard` 增加 `sourceProfile`，只记录来源明确公布的难度、路线长度、普通检查点和金检查点数量；来源没有公布时使用 `unknown` 或 `null`。
2. `designSignals` 单独记录可迁移的地图语言，例如训练区、连续路线、垂直推进、恢复空间、移动类型标签和记录节点；它不是原地图的资产或布局描述。
3. KZ-Rush 页面可作为社区数据库证据，Workshop/社区档案可作为观察对象证据，但所有来源都只进入 `research-only` 工具链，不进入生产 `MapDefinition` 或发布资产。
4. Arena 路线仍以自己的 `segmentId`、`lesson`、六维难度、回应窗口和恢复关系为权威；研究卡只能影响设计假设和验证顺序，不能直接生成地图几何。
5. 选择样本时优先覆盖不同学习问题，而不是堆叠同一种地图：至少包含练习型、连续节奏型、垂直推进型、混合移动标签型和短路线入门型。

## 被拒绝的替代方案

### 只保存地图名称与链接

拒绝原因：无法判断该样本具体教什么，也不能把研究结论映射到 Arena 的段落验证。

### 把外部难度直接当作 Arena 难度

拒绝原因：CS1.6 的预加速、侧移和 Bhop 要求不等于本项目的方向 + 跳跃操作；外部标签只能作为来源事实，不能直接成为生产平衡。

### 直接复制原地图布局作为竞速基座

拒绝原因：违反原创资产和许可边界，也会把第三方物理、计时插件和路线设计强行带入当前规则/物理体系。

## 后果

- 研究目录可以直接回答“资料原文说了什么”和“Arena 借鉴了什么”，减少研究结论漂移；
- 新增样本会增加字段维护，但能支持按学习问题筛选地图，而不是按名字收藏；
- 真实地图 Definition、授权核对、移动/攻击场景和真人视野测试仍是独立工作，不会被研究卡的存在伪装成完成；
- 生产入口、默认地图和构建资产不发生变化。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-kz-map-research-catalog.ts`
- `packages/arena-v1-experiment/test/arena-v2-kz-map-research-catalog.test.ts`
- [CS1.6 KZ 跳跃地图研究 V1](../research/arena-v2-cs16-kz-map-study-v1.md)
- [KZ-Rush 难度标准](https://kz-rush.com/en/article/map-difficulty-criterias)
- [bkz_goldbhop_v2 地图记录](https://kz-rush.com/en/maps/cs16/bkz_goldbhop_v2)
- [kz_giantbean_b15 地图记录](https://kz-rush.com/en/maps/cs16/kz_giantbean_b15)
