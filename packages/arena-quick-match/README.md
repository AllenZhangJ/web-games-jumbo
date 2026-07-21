# arena-quick-match

无宿主的本地快速匹配组合层。它只通过注入的 Core 工厂组装确定性 assignment、BotController 与 LocalMatchSession，并负责创建期间的原子所有权转移、失败回收与重入隔离。产品内容组合仍由上层注入。
