# Arena Movement

Arena 确定性移动规则的 strict TypeScript workspace。

当前职责：

- 管理可序列化、可克隆、可重置的移动运行时状态；
- 定义移动命令与唯一可接受的物理变更；
- 从角色 Definition 投影 walk/run 意图，不持有速度魔法数；
- 计算只读移动能力，并稳定序列化权威状态。

本包只依赖底层合同与 Definition。Physics 通过后续窄端口接入，不允许反向依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台 API 或墙钟时间。
