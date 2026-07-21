# Arena Map

Arena 地图时间线、拓扑、出生安全、命令注册与事件策略的 strict TypeScript workspace。

- 地图只消费不可变 Map Definition 与确定性整数 tick；
- topology、collapse 后连通性、永久安全面和角色碰撞体出生安全均在组合前验证；
- 命令批次先完整校验再调用显式 mutation ports，事件策略只返回不可变计划、命令与事件；
- equipment-wave 使用调用方注入的 occurrence seed，其他地图事件和 Bot 随机流不会扰动选择；
- 不依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台 API、墙钟或未注入随机源。
