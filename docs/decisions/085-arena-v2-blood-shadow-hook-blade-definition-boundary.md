# ADR-085：血影钩刃动作规则与障碍后果分层验证

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 血影钩刃研究 Definition、目标朝向 Replay、实体障碍探针和后续地图验证

## 背景

血影钩刃的研究重点同时包含目标朝向、命中后的拉近和实体障碍。当前 Arena 权威规则层已经有 `rear-cone` 与 `pull-to-source`，但还没有把二维障碍路径检测作为通用命中条件。若把两者混成一个“已完成的钩刃数值”，会让玩家和开发者误以为障碍已经由 MatchCore 裁决。

## 决策

1. 用研究 Definition 表达最小地面/空中动作：地面读取 `rear-cone`，空中使用独立高度关系；命中后的距离变化使用已有 `pull-to-source`。
2. 用真实 MatchCore/MatchReplay 验证目标保持背向、主动转身、active 前转回三种分支，并输出“拉近”或“目标已转身”的反馈语义。
3. 障碍阻挡保持独立地图探针，直到它接入真实地图表面、碰撞生命周期、目标高度和复活重新进入路线；在此之前不新增正式公共数值轴，不在武器 Definition 里伪造障碍字段。
4. Definition、Replay 和障碍探针均保持 `research-only`，不进入默认生产 Registry。

## 后果

- 玩家可读差异来自目标朝向、地面/空中上下文、拉近距离和恢复风险，而不只是外观。
- 研究可以分别定位“没有命中”“命中但拉位被挡”“命中并成功拉近”三种原因。
- 障碍规则还不能被当作生产能力；后续需要真实地图表面和设备/真人验证。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-blood-shadow-hook-blade-definition-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-blood-shadow-hook-blade-replay-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-hook-obstruction-prototype.ts`
- [血影钩刃 Definition 与目标朝向 Replay 原型结果 V1](../research/arena-v2-weapon-blood-shadow-hook-blade-definition-and-replay-results-v1.md)
- [血影钩刃障碍阻挡原型结果 V1](../research/arena-v2-weapon-hook-obstruction-prototype-results-v1.md)
