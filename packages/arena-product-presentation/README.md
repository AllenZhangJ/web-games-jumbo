# Arena Product Presentation

该 strict TypeScript workspace 承接 Product 的宿主无关表现编排。当前公开能力包括 UI/Gameplay 输入路由、UI 意图串行化、内容/屏幕 Definition、只读 Registry 与本地消息目录；后续按依赖方向继续承接只读 ViewModel、单局表现桥与 Flow。

边界约束：

- 只消费产品公开状态、表现合同和注入的 InputSampler/Controller 窄端口。
- 不依赖 Three.js、DOM、平台 API、Renderer、MatchCore、Bot、墙钟或网络。
- 不拥有 ProductSessionController；InputRouter 只拥有其注入的 InputSampler。
- 宿主能力在构造时快照，访问器、异步伪装和重入在状态提交前拒绝或失败关闭。
- Definition 与消息目录只接受可序列化数据并冻结；Registry 只接受完整数组并拒绝空槽、访问器、重复身份与可变伪实现。
