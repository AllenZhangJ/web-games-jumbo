# Arena V2 武器价值链结构审计结果 V1

## 文档状态

- 状态：六件热血英豪逐动作研究案例已通过结构审计；审计只验证研究合同完整性，不代表平衡或生产就绪
- 日期：2026-07-28
- 关联实现：`packages/arena-v1-experiment/src/arena-v2-weapon-case-study-contract.ts`、`packages/arena-v1-experiment/src/arena-v2-weapon-value-chain-audit.ts`
- 关联测试：`packages/arena-v1-experiment/test/arena-v2-weapon-value-chain-audit.test.ts`
- 关联决策：[ADR-107：研究武器必须通过六项价值链结构审计](../decisions/107-arena-v2-weapon-value-chain-audit.md)

## 审计结果

`createArenaV2WeaponValueChainAuditReport()` 当前输出：

| 指标 | 结果 |
| --- | ---: |
| 研究案例数 | 6 |
| 六项门槛全部通过 | 6 |
| 被结构门槛阻断 | 0 |
| 生产就绪 | 不作判断，仍由生产迁移门禁决定 |

六件案例均通过：魔血镰刃、真·哈迪斯钩镰、白金双枪、血影钩刃、幻虎巨拳、猛犸石斧。

## 六项可执行门槛

| 门槛 | 结构证据 |
| --- | --- |
| 动作身份 | 来源、核心动词、至少三个独立动作、输入和上下文 |
| 承诺时间 | `startup`/`delay` 公共轴，以及至少一项 `must-measure` 动作复核 |
| 空间条件 | 地面、第二种空间/时机上下文、距离/覆盖轴；空中案例再要求高度差 |
| 命中后果 | 动作级 `impact`/`vertical`/`control` 复核、核心动词和地图理由 |
| 失败成本 | 每个动作的失败成本、最小实现边界和 `recovery` 轴 |
| 反制与反馈 | 每个动作的来源事实、可执行反制、数值复核理由和不迁移清单 |

这六项审计把“武器有独立玩法”从文档判断变成可重复执行的结构检查。它不会检查数值是否平衡，也不会检查真人是否能在三分钟内理解；这两项仍由 Definition/Replay、设备和真人测试分别负责。

## 负向验证

测试把魔血镰刃案例缩减为一个动作，并清空动作 ID、失败成本和反制，审计同时阻断：

- 动作身份；
- 失败成本；
- 反制与反馈。

因此后续新增案例不能只补一段武器描述或一个外观标签来绕过门槛。

## 边界

- 通过结构审计不等于进入默认 `EquipmentRegistry`；六件案例仍是 `research-only`。
- 通过结构审计不等于公开延迟、预警、持续区域等研究字段；这些字段仍需权威运行时和真人可读性证据。
- 通过结构审计不等于完成 CS1.6 KZ 地图、弹壳特攻队局外界面或真机验收；三条研究线继续保持独立证据链。
