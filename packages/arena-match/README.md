# Arena Match

Arena 比赛权威编排层的 strict TypeScript workspace。

- 集中定义比赛阶段、参赛者状态、固定 tick 配置与默认 POC 场地；
- 比赛数值只引用 Gameplay V2 Definition 与 Physics 公共常量，不维护第二份魔法数；
- 构造配置前拒绝访问器、未知字段、非有限值、非法 tick 关系和内容选择漂移；
- 当前先承接比赛配置边界，MatchCore、胜负编排、固定步长 Runtime、state hash 与 Replay 按 G3 后续批次迁入；
- 只能依赖底层合同、Core、Definition 与 Physics，不得依赖 Bot、Product、Presentation、Three.js、DOM、平台 API、墙钟或未注入随机源。
