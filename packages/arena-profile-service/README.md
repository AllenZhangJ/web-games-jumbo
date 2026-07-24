# Arena Profile Service

玩家档案用例层。它在 Profile Definition 与持久化 Repository 端口之间提供选择和奖励事务，负责不可重入生命周期、写前续租、CAS 结果校验与权威读回。

本包不实现存储、租约或平台适配，不依赖 Product、Presentation、DOM 或墙钟。
