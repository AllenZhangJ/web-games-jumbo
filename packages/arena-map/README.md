# Arena Map

Arena 地图时间线、拓扑和出生安全合同的 strict TypeScript workspace。

- 地图只消费不可变 Map Definition 与确定性整数 tick；
- topology、collapse 后连通性、永久安全面和角色碰撞体出生安全均在组合前验证；
- 不依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台 API、墙钟或随机源。
