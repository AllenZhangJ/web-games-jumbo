# Arena Product Presentation

该 strict TypeScript workspace 承接 Product 的宿主无关表现编排。当前公开能力包括 UI/Gameplay 输入路由、UI 意图串行化、内容/屏幕 Definition、只读 Registry、本地消息目录、Arena V1 静态内容工厂、只读 ViewModel、单局表现桥与 Product Presentation Flow；宿主 Session 所有权根仍留在上层等待后续迁移。

边界约束：

- 只消费产品公开状态、表现合同和注入的 InputSampler/Controller 窄端口。
- 不依赖 Three.js、DOM、平台 API、Renderer、MatchCore、Bot、墙钟或网络。
- 不拥有 ProductSessionController；InputRouter 只拥有其注入的 InputSampler。
- 宿主能力在构造时快照，访问器、异步伪装和重入在状态提交前拒绝或失败关闭。
- Definition 与消息目录只接受可序列化数据并冻结；Registry 只接受完整数组并拒绝空槽、访问器、重复身份与可变伪实现。
- ViewModel 只消费公开 Product/Match/Reward 数据并投影冻结 UI 状态，不拥有或修改 Controller、Match 或 Profile。
- 单局表现桥借用 Controller/InputSource，只拥有有界事件窗；frame projector 与具体表现内容必须由组合点注入，失败或销毁后释放全部借用能力和大对象引用。
- Flow 只拥有 IntentDispatcher 与当前 MatchPresentationRuntime，统一串行化 intent、自动奖励、保存重试、租约心跳和 Match 表现清理；Arena V1 内容与 frame projector 仍由应用组合点显式注入。
