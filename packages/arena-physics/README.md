# Arena Physics

Arena 确定性物理合同与实现的 strict TypeScript workspace。

- 接受固定步长、显式 Arena/角色 Definition 与已验证 mutation；
- Movement 只能通过同步单批端口提交物理变更；
- 不依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台 API、墙钟或随机源；
- POC、性能计时与报告保留在开发/测试编排层，不进入权威世界。
