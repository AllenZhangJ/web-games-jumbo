# Arena A0.2.1 武器与战斗反馈补充来源包

- 日期：2026-07-28
- 基线：`8de2997a76601afce18b26d8126fb5cb24ca6feb`
- 状态：`supplemental-source-ready`，主协调已签核（2026-07-28）
- 评分：95/100且各维度≥80%；补充来源小门已通过
- 边界：这是A0.2.1已签核来源包之外的独立补充包，不改写原60条、95/100及`source-ready`事实，也不代表A0.2整体或生产样件通过

## 1. 目的与交付

上一轮A0.2.2的武器、战斗反馈板虽然权利合规，但嵌入图不能直接证明领域结论。本补充包以项目原创、clean-room矢量图补齐16个独立输入：武器8个、战斗反馈8个。机器台账为[arena-a0.2.1-supplemental-weapon-feedback-v1.json](../quality/art/reference-sources/arena-a0.2.1-supplemental-weapon-feedback-v1.json)，原创与权利声明为[clean-room declaration](../quality/art/reference-sources/original/arena-a0.2.1-supplemental-clean-room-declaration.md)。

每个输入同时保存`1600×900` SVG源文件与不透明sRGB PNG评审图，记录制作方法、生成器与输出hash、字节数、尺寸、项目权利、禁止复制边界、构图签名及感知哈希。16个SVG、PNG和构图签名均唯一，PNG两两最低感知距离为16；同一底图换色不计独立输入。

## 2. 直接视觉覆盖

| 领域 | 条目 | 直接证明的范围 |
| --- | --- | --- |
| 武器 | `weapon-s01`—`weapon-s08` | 轻/中/重体量与握持、六把规划方向、准备→命中→恢复、地面/空中、推/拉/击飞、空挥反制、过载反例、负空间实验 |
| 战斗反馈 | `feedback-s01`—`feedback-s08` | 命中核心与方向、受击停顿、击退轨迹、落边/击落、拾取/替换/回收/过期、同屏层级与遮挡上限、全屏噪声反例、低动效等效 |

热血英豪只作为已登记的功能关系研究方向；这些图没有使用或转绘其角色、武器造型、招式、截图、数值或专有表达，也没有增加Arena操作键。反馈条目只映射已存在的`ActionStarted`、`HitResolved`、`KnockbackApplied`、`PlayerEliminated`、`EquipmentPickedUp`、`EquipmentReplaced`、`EquipmentRecycled`、`EquipmentExpired`；空挥恢复保留为`action-snapshot:field-pending-P4`，不虚构权威事件。

## 3. 机器复核与失败关闭

- `generate-arena-weapon-feedback-supplement.ts`确定性生成16组SVG+PNG及机器台账。
- `check-arena-weapon-feedback-supplement.ts`验证原签核包身份未变、8+8领域数量、原创与权利、路径不越界、SVG无外嵌图片、源/输出hash与尺寸、直接覆盖标签、允许事件槽、唯一字节/构图和感知差异。
- `test-arena-weapon-feedback-supplement-fail-closed.ts`分别篡改领域数量、权利、重复渲染字节、重复构图、未知事件槽和路径逃逸；6/6均被拒绝。

## 4. 评分、风险与回滚

| 维度 | 分数 | 结论 |
| --- | ---: | --- |
| 方向相关性 | 24/25 | 两领域各8个直接视觉；尚未由运行时样件验证 |
| 权利完备 | 20/20 | 项目原创声明、方法、源与输出hash完整 |
| 覆盖与独立性 | 19/20 | 必需语义覆盖且16图独立；仍属二维合同图 |
| 可嵌入质量 | 18/20 | 板面尺度可直接读域；不是正式模型或VFX |
| Anti-reference | 7/7 | 两领域均有可见拒绝样本和禁止复制边界 |
| 治理可复算 | 7/8 | 自动检查与6类失败关闭通过；尚缺独立协调复跑 |
| 合计 | 95/100 | 各维度≥80%；主协调于2026-07-28签核为`supplemental-source-ready` |

风险是二维图不能证明3D握持、动作时序、事件驱动VFX、性能、设备或真人可读性。协调签核只批准补充来源身份、权利与领域相关性。回滚时只删除本补充包台账、原创声明、16组源/评审图和三份补充脚本，再恢复两张板对原来源的引用；不得改写原A0.2.1签核包或覆盖并行开发文件。
