# Arena V1 Presentation Content

Arena V1 的具体角色、武器、地图与 Product 预览表现组合真值。

- 只从 `arena-v1-content` 消费权威 Definition，不拥有命中、位移、淘汰或胜负。
- 统一发布 Greybox、Gameplay V2 和 Product 角色预览的不可变表现内容。
- 不持有 Renderer、Three、DOM、平台、Session 或宿主生命周期。

Arena V1 的只读地图、角色、动作、装备表现内容与权威快照投影。

- 权威 Definition 由组合层显式注入，包内不复制命中、位移或胜负规则。
- 帧投影只消费公开快照、公开比赛信息和只读表现内容。
- 不依赖 Three.js、DOM、平台 API、墙钟或随机源。
