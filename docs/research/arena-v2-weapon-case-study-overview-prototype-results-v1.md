# 深研武器概览适配层原型 V1

## 状态

- 状态：研究工具链原型通过；白金双枪、血影钩刃、幻虎巨拳与真·哈迪斯钩镰已接入研究 Definition 数值投影，其余两件仍待候选 Definition
- 日期：2026-07-28
- 范围：魔血镰刃、真·哈迪斯钩镰、白金双枪、血影钩刃、幻虎巨拳、猛犸石斧六件逐动作深研案例
- 生产影响：不新增默认武器、不修改 Content Registry、不改变现有玩家界面

## 为什么补这一层

当前生产武器概览已经能够从权威 `Definition` 投影 9 个主数值轴、2 个行为轴和地面/空中上下文。六件逐动作深研案例中，白金双枪已经映射到 `research-line-pressure`，血影钩刃、幻虎巨拳和真·哈迪斯钩镰已经有独立研究 Definition 与 Replay；幻虎巨拳和真·哈迪斯钩镰另有边缘结果，血影钩刃另有独立障碍探针；其余两件仍只有官方事实、设计推导、反制、失败成本和数值审计，不能填入假数值。

如果直接把案例写入玩家数值卡，研究推断会被误读为已经平衡的数值。因此本原型只负责把“研究结论”和“还必须测量什么”接到同一份结构化读出，不填假数值。

## 原型输出

`createArenaV2WeaponCaseStudyOverview()` 为六件案例生成研究行，每行包含：

- 核心动词、战斗主张、地面/跑动/空中等上下文；
- 必须公开的公共数值轴；
- 每个数值轴的 `must-measure` 或 `research-only` 状态、原因和玩家含义；
- 地图关系信号和动作级反制集合；
- `numericReadout: research-projection` 或 `not-yet-available`：前者必须带来源 Definition、地面/空中投影和比较集合，后者必须解释为什么仍不能展示数值。

`must-measure` 不是“已经测出”，而是说明该轴必须进入后续候选 `Definition` 与边界测试；`research-only` 说明当前还不能承诺为玩家可读数值，例如预警、持续状态或障碍依赖。

## 固定结果

| 案例 | 核心动词 | 上下文 | 生产状态 | 数值状态 |
| --- | --- | --- | --- | --- |
| 魔血镰刃 | 封路并改变落点 | 地面、跑动、空中、蓄力、延迟、命中后 | 仅研究 | 尚未连接权威投影 |
| 真·哈迪斯钩镰 | 利用支撑面换位并改变高度 | 地面、跑动、空中、蓄力、反击、命中后 | 仅研究 | 已连接 `research-true-hades-hook-scythe` 研究投影 |
| 白金双枪 | 保持距离并逼走位 | 地面、跑动、空中、资源 | 仅研究 | 已连接 `research-line-pressure` 研究投影 |
| 血影钩刃 | 拉近并重写相对位置 | 地面、跑动、空中 | 仅研究 | 已连接 `research-blood-shadow-hook-blade` 研究投影 |
| 幻虎巨拳 | 读懂承诺并用重拳改变落点 | 地面、跑动、空中、蓄力、反击 | 仅研究 | 已连接 `research-phantom-tiger-fist` 研究投影 |
| 猛犸石斧 | 预判落点并改变路线 | 地面、跑动、蓄力、延迟、资源 | 仅研究 | 尚未连接权威投影 |

血影钩刃的方向分支已经由 `rear-cone` 与目标主动转身 Replay 验证；障碍阻挡仍由独立二维探针验证，不会被伪装成现有 9 个主比较轴。真·哈迪斯钩镰已经由真实 MatchCore/MatchReplay 验证提前释放、到期取消、提交后命中和平台边缘击落，但这只证明“承诺与支撑面后果”可以被权威链路读取，不等同于原作的完整反弹、多阶段追击或正式平衡。障碍依赖仍需接入真实地图表面、空中高度和复活重新进入路线后，才有资格讨论是否新增玩家可读字段。

## 与生产 UI 的边界

生产链路仍是 `Definition → product-session-view-model → WebProductUiSurface`，并且现有 UI 已按通用数组渲染数值、行为和上下文。此次新增的是 `arena-v1-experiment` 研究适配层，不被默认生产内容组合调用；因此它只能帮助研究人员收敛测量任务，不能让未通过迁移门禁的武器出现在正式玩家界面。

## 验证

- `arena-v2-weapon-case-study-overview-prototype.ts`：六件案例的统一研究读出，并区分已有研究 Definition 投影与尚未连接的案例；
- `arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.ts`：血影钩刃地面/空中 Definition、9 项主轴、6 项上下文轴、2 项行为轴及权威数值投影；
- `arena-v2-weapon-blood-shadow-hook-blade-replay-prototype.ts`：目标保持背向、主动转身、active 前转回三组真实 MatchCore/MatchReplay 场景，并输出拉近/躲避反馈；
- `arena-v2-weapon-true-hades-hook-scythe-definition-prototype.ts`：真·哈迪斯钩镰地面承诺动作、空中下砸动作、9 项主轴、6 项上下文轴、2 项行为轴及权威数值投影；
- `arena-v2-weapon-true-hades-hook-scythe-replay-prototype.ts`：提前释放、提交释放、到期持续按住和平台边缘四组真实 MatchCore/MatchReplay 场景，并输出承诺取消、命中保留支撑面和击落反馈；
- `arena-v2-weapon-case-study-overview-prototype.test.ts`、真·哈迪斯钩镰 Definition/Replay 测试：相关 9 项测试通过；
- 断言覆盖六件案例顺序、三件研究投影的来源 Definition 与上下文、`must-measure`/`research-only` 差异、血影钩刃障碍信号、目标朝向分支、确定性和深冻结；
- 当前生产边界不变：研究 Definition 未注册默认生产装备。

## 下一步

1. 为魔血镰刃和猛犸石斧分别建立最小候选 Definition；
2. 对每件候选的地面/空中动作测出主 9 轴和行为 2 轴，不能凭官方原作数值换算；
3. 将四件已有投影统一接入可读性矩阵，再进行真人首见时间、命中归因和反制可读性测试；
4. 只有通过候选 Definition、Replay、地图后果、反馈表现和设备/真人门禁，才评估生产迁移。
