# Arena Map

Arena 地图时间线、拓扑、出生安全、命令注册、事件策略与运行时快照的 strict TypeScript workspace。

- 地图只消费不可变 Map Definition 与确定性整数 tick；
- topology、collapse 后连通性、永久安全面和角色碰撞体出生安全均在组合前验证；
- 命令批次先完整校验再调用显式 mutation ports，事件策略只返回不可变计划、命令与事件；
- equipment-wave 使用调用方注入的 occurrence seed，其他地图事件和 Bot 随机流不会扰动选择；
- Runtime 单独拥有 surface、occurrence、tick 与 revision；公开快照不含 private plan，内部快照必须显式请求并通过同一 serializer 校验；
- 不依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台 API、墙钟或未注入随机源。
