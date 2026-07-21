# Arena Product Match

局外产品对单局本地比赛的有状态编排层。该包负责 Quick Match 包装、单 Runtime 所有权、异步准备去重、暂停记忆、结果发布、迟到候选回收和清理重试。

- 只依赖底层数据合同与 Product 公开结果合同。
- 外部 Factory、Session、Runtime 方法在取得所有权时按描述符快照。
- 所有同步宿主回调都位于不可重入边界内。
- 不拥有 Profile、奖励、Product 页面、Renderer、平台 API 或 Match 权威判定。
