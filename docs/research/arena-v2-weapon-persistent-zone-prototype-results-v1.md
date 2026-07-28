# Arena V2 武器持续封路原型结果 V1

## 文档状态

- 状态：研究工具链验证通过；不进入生产动作、生产武器或正式玩家数值
- 日期：2026-07-28
- 范围：热血英豪武器研究中的“命中后继续占用路线”与“瞬时延迟重击”差异
- 实现：`packages/arena-v1-experiment/src/arena-v2-warning-zone-prototype.ts`、`packages/arena-v1-experiment/src/arena-v2-weapon-persistent-zone-prototype.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-warning-zone-prototype.test.ts`、`packages/arena-v1-experiment/test/arena-v2-weapon-persistent-zone-prototype.test.ts`

## 1. 为什么要补这一层

此前预警区只验证“危险窗口开始时是否命中”。这不足以区分两类武器：

```text
延迟重击：预警 → 有效命中窗口 → 结束
持续封路：预警 → 有效命中窗口 → 区域仍占用路线 → 结束
```

热血英豪的魔血镰刃研究卡记录了命中后留下陷阱、继续改变对手路线的结构；猛犸石斧则更接近延迟落点和短时重击。这里不把官方描述中的时间直接换算成 Arena tick，而是用研究假设验证这两种时间语法能否由同一套确定性运行时表达。

## 2. 结构调整

研究区预警运行时从：

```text
telegraph → active → expired
```

扩展为：

```text
telegraph → active → lingering → expired
```

新增字段：

| 字段 | 作用 | 生产状态 |
|---|---|---|
| `lingerTicks` | 有效命中窗口结束后，区域继续占用路线的 tick 数 | 研究专用 |
| `lingerStartsAtTick` | 持续阶段开始的整数 tick | 研究专用 |
| `phase=lingering` | 让命中检测和反馈能区分“命中瞬间”与“持续区命中” | 研究专用 |

`lingerTicks=0` 仍表示瞬时区域，因此现有猛犸石斧延迟探针不改变行为。所有区域命中仍由同一个点测试读取，Renderer 不自行猜测区域是否有效。

## 3. 两件深研武器的对照

| 武器 | 预警 | 有效窗口 | 持续封路假设 | 研究解释 |
|---|---:|---:|---:|---|
| 魔血镰刃 | 18 tick | 6 tick | 12 tick | 命中后仍能改变路线，重新进入区域仍有代价 |
| 猛犸石斧 | 18 tick | 2 tick | 0 tick | 主要考验落点预判，命中窗口后不继续占位 |

以上是 Arena 研究假设，不是原作数值，也不是正式平衡值。

## 4. 固定探针结果

每件武器使用相同的 3 种回应，共 6 个探针：

| 武器 | 回应 | 首次命中阶段 | 结果 | 反馈 |
|---|---|---|---|---|
| 魔血镰刃 | `hold-center` | `active` | 命中有效窗口 | `impact-hit` |
| 魔血镰刃 | `leave-before-impact` | 无 | 提前离开 | `route-escape` |
| 魔血镰刃 | `enter-during-linger` | `lingering` | 有效窗口结束后重新进入仍被区域命中 | `linger-zone-hit` |
| 猛犸石斧 | `hold-center` | `active` | 命中有效窗口 | `impact-hit` |
| 猛犸石斧 | `leave-before-impact` | 无 | 提前离开 | `route-escape` |
| 猛犸石斧 | `enter-during-linger` | 无 | 没有持续阶段，重新进入不产生命中 | `route-escape` |

固定结果由 `runArenaV2WeaponPersistentZonePrototype()` 生成，同一输入重复运行保持相同结果；6 个探针全部通过，数组和结果对象均深冻结。

## 5. 结论

本轮关闭了一个结构问题：持续封路不能继续用“延迟命中窗口”一个布尔结果表达。现在至少可以在数据和反馈上区分：

1. 命中发生在有效窗口内；
2. 命中发生在有效窗口结束后的持续区域内；
3. 玩家在危险生效前离开路线；
4. 武器根本没有持续区域，重新进入不应被误判为再次命中。

这使魔血镰刃与猛犸石斧的差异来自时间和地图关系，而不只是名称、外观或攻击力。

## 6. 未关闭边界

- 持续区重新进入是否应造成一次性命中、持续压制还是只改变路线；
- 多个持续区叠加、刷新、覆盖和同一玩家重复触发的规则；
- 持续区在 KZ 窄路、走钢丝、分叉入口和复活重入锚点上的真实后果；
- 多人遮挡、区域标记可读性、最终音效/特效、设备和真人理解率；
- 持续区域仍未接入默认生产 `ActionDefinition`、生产 UI 数值或玩家存档。

## 7. 相关研究

- [武器延迟/预警信号原型结果 V1](arena-v2-weapon-warning-signal-prototype-results-v1.md)
- [魔血镰刃 Definition 与路线 Replay 原型结果 V1](arena-v2-weapon-magic-blood-scythe-definition-and-replay-results-v1.md)
- [猛犸石斧延迟落点原型结果 V1](arena-v2-weapon-mammoth-stone-axe-delay-prototype-results-v1.md)
- [热血英豪武器研究 V1](arena-v2-hot-blooded-weapon-study-v1.md)
- [ADR-092：延迟区域必须区分瞬时命中和持续封路](../decisions/092-arena-v2-persistent-zone-lifecycle.md)
