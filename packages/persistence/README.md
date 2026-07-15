# @number-strategy/persistence

版本化本地 SaveEnvelope v4、v1/v2/v3 迁移、包含玩法/任务/角色身份的确定性 Replay、存储失败隔离和不含个人信息的诊断导出。

写入时机由 Application 的 SaveScheduler 编排：首个动作表现帧返回后再写，Hide/PageHide/Destroy 强制刷新。Persistence 包只负责 Envelope 校验、迁移和原子 Storage 调用，不依赖帧或 Renderer。
