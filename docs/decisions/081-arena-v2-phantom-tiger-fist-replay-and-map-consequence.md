# ADR-081：幻虎巨拳必须同时通过承诺 Replay 与地图后果验证

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 研究候选幻虎巨拳的动作承诺、命中反馈和平台边缘后果

## 背景

幻虎巨拳已经建立了地面/空中 Definition 和可比较数值投影，但数值本身不能证明玩家会感受到正确的风险。尤其是蓄力动作，必须证明提前松开、达到承诺、到期持续按住会进入不同结果；地图方面又必须证明命中会经过位移和支撑面判定，而不是直接把横向作用数字当作淘汰。

## 决策

1. 幻虎巨拳研究候选必须使用真实 `MatchCore + ActionExecutionSystem + MatchReplay` 验证三组固定承诺场景：提前释放、成功提交、到期取消。
2. 成功提交必须同时存在 `ActionCommitmentCommitted`、`HitResolved` 和可回放最终 hash；提前释放与到期取消必须没有该动作的正式命中。
3. 地图后果使用独立的双人窄平台 Replay，按 `命中 → 横向位移 → 支撑面丢失 → PlayerEliminated` 的顺序读取事件和快照，不由表现层推断淘汰。
4. 反馈必须区分“命中确认”和“击落·失去支撑面”；同一武器的数值投影、权威事件和地图后果保持单向链路。
5. 这些证据仍属于研究工具链，不能因此把幻虎巨拳注册到默认生产内容，也不能把 Definition 投影假设表述为真人平衡结论。

## 被拒绝的替代方案

### 只测试动作快照，不跑真实 Replay

拒绝原因：快照可以看见状态，却不能证明输入、事件顺序、命中和最终状态在回放中保持确定性。

### 只用抽象物理探针，不接 MatchCore

拒绝原因：抽象物理可以回答“冲量是否移动目标”，但不能证明装备拾取、承诺状态、命中事件和淘汰反馈接在同一条权威链路上。

### 用表现层根据位移直接显示淘汰

拒绝原因：位移、离开支撑面和正式淘汰是不同状态；表现层不能重做 Rule/Core 判定。

## 后果

- 幻虎巨拳现在有可复核的承诺 Replay 和地图边缘证据，后续可以继续接反馈 Cue 与真人可读性测试。
- 地图边缘结果要求足够长的回放窗口，让竖直冲量有时间完成“离开支撑面 → 掉落判定”；不能用过短 hard limit 把结果误判成安全。
- 研究工具链的输出字段会比玩家界面多，但玩家概览仍只消费权威 Definition 投影和正式事件。
- 生产迁移仍被正式反馈资产、真人验证、设备验证和多地图重复测试阻塞。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-weapon-phantom-tiger-fist-replay-prototype.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-phantom-tiger-fist-edge-replay-prototype.ts`
- [幻虎巨拳 Replay 与地图边缘原型结果 V1](../research/arena-v2-weapon-phantom-tiger-fist-replay-and-edge-results-v1.md)
- [ADR-075：承诺动作由统一 ActionExecutionSystem 裁决](075-arena-v2-action-commitment-state.md)
- [ADR-069：命中反馈必须保留失败原因的因果区分](069-arena-v2-hit-feedback-causal-contract.md)
