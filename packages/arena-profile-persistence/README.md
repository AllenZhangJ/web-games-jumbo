# Arena Profile Persistence

玩家档案的本地同步持久化实现。该包组合 Profile 数据合同与通用同步租约，负责 A/B 双槽、非权威 head、CAS、迁移、写后读回、未来 schema 保护和失败关闭；不包含角色选择、奖励业务、Product 状态、表现或平台实现。

- Profile Service 仍是业务聚合的唯一写入者，Repository 只实现持久化端口。
- 所有公开操作使用一个同步不可重入生命周期边界。
- 新 generation 只有经过完整读回验证后才发布到内存。
- 无法确认写入、回滚、租约或销毁结果时失败关闭并保留可清理所有权。
