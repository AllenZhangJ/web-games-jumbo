# Product

本仓库同时保存一个已经实现的技术原型，以及下一阶段已经确认的产品目标。两者必须明确区分。

## 当前实现：数值跳台 v3

当前代码仍是一款“左右选择数值运算 + 按住蓄力跳跃”的单人竖屏小游戏。其已实现规则、技术架构和视觉基线分别见：

- [数值跳台 v3 产品基线](docs/product/number-strategy-jump-v3.md)
- [当前游戏规则](docs/gameplay-rules.md)
- [当前技术架构](docs/architecture.md)
- [v3 视觉与动作系统](docs/design-system-v3.md)

## 目标产品：Arena V1

Arena V1 是面向 H5、微信和抖音小游戏的单人轻竞技派对游戏：一名玩家通过“快速匹配”进入 1v1 对局，与本地生成的隐藏对手在 2～3 分钟内争夺装备，利用地图、站位和击飞方向完成淘汰。

产品口号：

> 10 秒学会操作，100 小时研究玩法。

权威目标与第一版边界见：

- [Arena V1 产品愿景](docs/product/arena-v1-vision.md)
- [Arena V1 游戏规则](docs/gameplay/arena-v1-rules.md)
- [Arena V1 分阶段路线](docs/roadmap/arena-v1-vertical-slice.md)
- [Arena V1 架构提案](docs/architecture/arena-v1-proposal.md)
- [角色设计索引](docs/characters/README.md)
- [GitHub 方案调研](docs/research/github-arena-references.md)

## 已确认的产品边界

- 第一版本固定为 1v1，不做真人对战、匹配服务器或 P2P 联机。
- 对手是本地机器人；生产界面不展示机器人身份，也不提供难度选择。
- 简单、普通、困难由每局 match seed 等概率随机抽取，仅在调试、回放和质量数据中记录。
- 匹配界面可以使用“快速匹配”“寻找对手”等中性表达，但不宣称真人在线，不伪造在线人数、聊天或其他真人社交信号。
- 机器人遵守与玩家相同的输入、冷却、装备和地图规则，不读取未来随机结果。
- 三条命，无传统生命值条；位置、击飞和地图淘汰决定胜负。
- 装备自动拾取，动作键优先执行战斗行为。
- 小地形可自动跳跃，但不会自动救回已经被击飞的角色。
- 新装备解锁只扩展后续对局的对称掉落池；玩家和机器人共享同一池，不提供开局强度优势。
