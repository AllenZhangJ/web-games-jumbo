# ADR-080：热血英豪武器逐件研究必须以动作链和数值审计为单位

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 热血英豪武器研究、逐件案例档案、武器概览数值审计和候选 Definition 评审

## 背景

当前已经有 12 件参考武器总表和多组官方动作证据，但总表容易把一件武器压缩成“近战/远程/封路”标签。这样无法回答三个关键问题：每个动作为什么存在、对手如何处理、Arena 概览应该公开哪一组真实数值。特别是具有投射、陷阱、跑动、空中和蓄力多上下文的武器，如果只保留一个总数值，会重新退回外观或标签差异。

## 决策

1. 每件深入研究的武器必须按动作保存：官方事实、设计推导、玩家决策、反制、失败成本和数值审计状态；魔血镰刃、真·哈迪斯钩镰、白金双枪和血影钩刃共同使用这一合同。
2. 官方事实与 Arena 推导分开存储；官方页面只证明动作、输入上下文、命中结果或资源/持续描述，不直接证明 Arena 的平衡数值。
3. 数值审计必须引用公共轴：距离、覆盖、出手、收招、横向作用、垂直控制、控制、再次使用、命中高度差；延迟和预警在未完成持续区域原型前保持 `research-only`。
4. 逐件研究先生成研究工具链档案，再决定是否进入候选 Definition；研究档案不自动注册生产武器。
5. 复杂参考武器先收敛为一个可玩的最小功能版本，最多保留核心空间关系和一组明确反制，不把自动锁定、无限堆叠、无敌、MP 或复杂派生整体迁移。

## 被拒绝的替代方案

### 只按武器名称建立一张总卡

拒绝原因：无法看出同一件武器在地面、跑动、空中、蓄力和命中后为什么产生不同答案。

### 将官方动作描述直接当作 Arena 数值

拒绝原因：原游戏输入、物理、资源和职业属性不同，直接移植会制造不可验证的平衡假设。

### 用更多按钮复制参考武器的动作数量

拒绝原因：本项目的操作目标是 3 分钟掌握基础操作，深度应来自上下文、地图和反制，不是按键数量。

## 后果

- 热血英豪研究可以逐件扩展，并且每件都能直接生成概览字段和原型任务；
- 研究卡字段更多，但“事实、推导、数值、反制”不会互相污染；
- 延迟区域、自动锁定和持续效果仍需要独立原型与真人验证，不会被文档描述伪装成完成；
- 当前生产武器、玩家存档和默认入口不发生变化。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-magic-blood-scythe-case-study.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-magic-blood-scythe-case-study.test.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-true-hades-hook-scythe-case-study.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-true-hades-hook-scythe-case-study.test.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-white-platinum-dual-guns-case-study.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-white-platinum-dual-guns-case-study.test.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-blood-shadow-hook-blade-case-study.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-blood-shadow-hook-blade-case-study.test.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-case-study-contract.ts`
- [热血英豪武器研究 V1](../research/arena-v2-hot-blooded-weapon-study-v1.md)
- [魔血镰刃官方说明](https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=793)
- [真·哈迪斯钩镰官方说明](https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=526)
- [白金双枪官方说明](https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=329)
- [热血英豪武器指南](https://bfo.web.sdo.com/web4/guide/wuqi.asp)
- [血影钩刃官方说明](https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=1109)
