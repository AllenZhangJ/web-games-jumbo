# Arena Product Session

产品状态、Profile、奖励事务与单局 Match Coordinator 之间的有状态编排层。

- 只通过窄端口编排，不持有 MatchCore、Bot、Renderer、DOM 或平台实现。
- 构造数据按描述符读取，所有端口方法在取得所有权时快照。
- 同步生命周期统一不可重入，异步完成以终态和所有权代次裁决。
- fatal/destroy 先发布终态，再调用外部清理；失败所有权保留到精确重试成功。
