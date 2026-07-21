# Arena Match

Arena 比赛权威编排层的 strict TypeScript workspace。

- 集中定义比赛阶段、参赛者状态、固定 tick 配置与默认 POC 场地；
- 比赛数值只引用 Gameplay V2 Definition 与 Physics 公共常量，不维护第二份魔法数；
- 构造配置前拒绝访问器、未知字段、非有限值、非法 tick 关系和内容选择漂移；
- `MatchParticipantSystem` 是生命、状态、命中归因、硬直/无敌/重生计时、淘汰统计和超时排名的唯一写入者；
- `MatchTimelineSystem` 是 tick、active tick、比赛阶段、首次开始声明和终局结果的唯一写入者，以显式 step 生命周期约束顺序；
- 角色 Runtime 只保留经过 Registry 验证的 participant/definition 身份；配置 hash 与量化 state hash 均在本包维护稳定排序和数值语义；
- MatchCore 子系统编排、固定步长 Runtime 与 Replay 按 G3 后续批次迁入；
- 只能依赖底层合同、Core、Definition 与 Physics，不得依赖 Bot、Product、Presentation、Three.js、DOM、平台 API、墙钟或未注入随机源。
