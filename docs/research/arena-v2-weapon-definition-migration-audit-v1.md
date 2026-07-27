# Arena V2 武器 Definition 迁移审计 V1

## 1. 文档状态

- 状态：三把生产基线审计完成，三个研究候选已形成统一 research-only Definition，生产迁移尚未开始
- 日期：2026-07-28
- 适用范围：Arena V2 开发/测试工具链与现有 V1 权威内容
- 关联实现：`packages/arena-v1-experiment/src/arena-v2-weapon-definition-migration-audit.ts`
- 关联决策：[ADR-067：武器概览数值必须从权威 Definition 投影](../decisions/067-arena-v2-weapon-definition-migration-boundary.md)
- 后续门禁：[首发武器生产迁移门禁结果 V1](arena-v2-weapon-production-migration-gate-results-v1.md)

本文档回答两个问题：当前三把生产武器能否提供真实的概览数值；三个首发研究候选是否已经具备可比较的研究 Definition，以及进入生产前还缺什么。它不把研究审计结果写回生产 Definition，也不把研究候选显示成已实现武器。

## 2. 审计结论

### 现有三把生产基线

冲锋盾、重锤、引力锁链的权威 `ActionDefinition` 和 `ARENA_GAMEPLAY_V2_TUNING` 已经能提供：

- 主概览 9 轴：有效距离、覆盖宽度、出手时间、收招时间、横向击飞、垂直控制、控制时间、自身位移风险、再次使用时间；
- 行为补充 2 轴：有效攻击窗口、方向容错；
- 地面/空中上下文 6 轴：有效距离、覆盖宽度、出手时间、横向击飞、垂直控制、命中高度差。

因此当前生产武器的主要问题不是“没有数值”，而是必须继续保证 UI 只读取同一份权威调优投影，不能在页面层重新写一套独立数值。

### 三个研究候选

| 候选 | 审计状态 | Definition 状态 | 当前还不能宣称完成的内容 |
|---|---|---|---|
| 直线压制 | `ready` | `research-only-definition` | 真实投射物飞行、多人拥挤和正式生产迁移 |
| 读招反制 | `ready` | `research-only-definition` | 正式 Definition、取消/提交反馈表现和正式生产迁移 |
| 绕后 | `ready` | `research-only-definition` | 主动转身、多方向拥挤和正式生产迁移 |

三个候选现在都有统一的地面/空中研究 `ActionDefinition`、9 项主概览数值、2 项行为补充数值和固定命中/空放证据，但仍没有生产 `EquipmentDefinition`，不能进入生产目录。详见[首发研究候选 Definition 原型结果 V1](arena-v2-launch-research-definition-prototype-results-v1.md)和[ADR-070](../decisions/070-arena-v2-research-launch-definition-projection.md)。

## 3. 权威字段到玩家数值的固定映射

| 玩家数值 | 权威来源 | 投影方式 |
|---|---|---|
| 有效距离 | `action.tuning.targeting.range` | 直接读取 |
| 覆盖宽度 | `targeting.radius` 或 `targeting.minimumFacingDot` | 根据目标策略推导 |
| 出手时间 | `action.tuning.cadence.windupSeconds` | 直接读取 |
| 收招时间 | `action.tuning.cadence.recoverySeconds` | 直接读取 |
| 横向击飞 | `action.tuning.knockback.targetGroundDistance` | 直接读取 |
| 垂直控制 | `action.tuning.knockback.verticalImpulse` | 直接读取 |
| 控制时间 | `action.tuning.hitstunTicks / tickRateHz` | tick 转秒 |
| 自身位移风险 | `action.tuning.selfMovement.horizontalImpulse` | 直接读取；无自身位移时为零 |
| 再次使用时间 | `action.tuning.cadence.cooldownSeconds` | 直接读取 |
| 有效攻击窗口 | `action.tuning.cadence.activeSeconds` | tick/时间投影 |
| 方向容错 | `minimumFacingDot` 或 `radius` | 推导为角度 |

所有数值必须由整数 tick 和权威调优计算得到，UI 只接收只读 ViewModel。覆盖宽度和方向容错属于派生量，必须固定公式，不能按武器卡手工填写。

## 4. 当前研究 Definition 证据

三个候选共用 `projectArenaV2ActionDefinitionPublicNumbers`，统一投影距离、覆盖、时间、击退、控制、自身风险、冷却、有效窗口和方向容错。迁移审计现在能够检查三把研究候选的地面/空中动作身份、公开轴和上下文轴；这一步解决的是“六个首发位置都能看出数值差异”的结构缺口，不是生产迁移。

## 5. 迁移顺序

### 第一步：直线压制

优先实现一条可见直线的单次投射或刺击。先验证距离、覆盖、前摇、击退和冷却能否在概览和对局中保持一致，再验证宽平台、长直线、窄桥的路线压力。

### 第二步：读招反制

已将整数 tick 承诺原型接入研究边界内的权威状态与 Replay。下一步必须补齐正式 Definition、反馈表现和多人/地图边缘场景，保证蓄力可读、失败有收招成本，不引入格挡或额外按键。

### 第三步：绕后

在确定的目标朝向策略上实现侧向/后方判定，并将命中方向转成可解释的击退方向。先验证正面失败、侧后方成功和分叉路线三种对照，再接入 UI 数值。

每一步都要按 `Rule → Core → Bot → Presentation` 推进；表现层不得直接判断命中或改变位置。

## 6. 生产迁移验收门槛

研究候选只有在以下条件全部满足后，才能从 `research-only-definition` 进入生产候选：

- 具备地面/空中两套权威动作身份；
- 具备至少一套可复现的命中、空放和收招行为；
- 必需公开数值全部来自权威字段或固定派生公式；
- 概览与对局中的数值相同；
- 命中反馈能让玩家知道命中、击退方向和出界原因；
- 在宽平台、窄路、边缘和高低差上产生不同且可解释的后果；
- 通过确定性、回放、无渲染和概览展示测试；
- 真人能够在短时间内说出它和另外五种语言的主要区别。

本节条件现在由五项迁移门禁统一执行；当前六个首发候选的生产就绪数为 `0/6`。详见[首发武器生产迁移门禁结果 V1](arena-v2-weapon-production-migration-gate-results-v1.md)和[ADR-074](../decisions/074-arena-v2-weapon-production-migration-gate.md)。
