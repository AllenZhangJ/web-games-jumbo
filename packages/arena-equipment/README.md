# Arena Equipment

Arena 装备运行时、拾取/掉落裁决与序列化原语的 strict TypeScript workspace。

- 只消费底层合同、Core action 候选合同与只读 Equipment Definition/Registry；
- `EquipmentSystem` 是 spawn、pickup、cooldown、drop、reconcile 的唯一写入者；
- 所有位置、运行时状态和竞态裁决均在权威写入前验证；
- 不依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台 API、墙钟或随机源。
