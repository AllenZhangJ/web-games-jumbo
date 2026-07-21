# 唯一生产产品：Arena

Arena 是面向 Web、微信和抖音小游戏的本地 1v1 动作竞技游戏，也是本仓库唯一生产产品。早期数值跳台产品不提供源码、入口、存档迁移或运行时兼容，只保留在 Git 历史。

## 产品承诺

> 10 秒学会操作，100 小时研究玩法。

- 玩家通过移动、跳跃、二段跳、下砸、基础攻击和武器动作完成空间对抗。
- 任何距离都可以攻击；没有目标时正常挥空，攻击按钮不得置灰。
- 对局由三条命、击飞、平台边界和地图事件决定，不使用传统生命值消耗作为胜负主轴。
- 对手是本地 Bot，生产界面不伪造真人在线、人数、聊天或社交信号。
- Bot 与玩家共享输入、动作、装备、冷却和地图规则，不读取未来状态。
- 武器、角色与动作差异来自统一 Definition；表现层不决定命中、击退或胜负。
- 新内容不得给予玩家非对称的开局数值优势。

## 当前产品闭环

角色选择 → 快速匹配 → 1v1 对局 → 胜负 → 奖励事务 → 解锁/重赛已经连通。Web 使用语义 DOM Product UI，微信与抖音使用单 Canvas Product UI，三端共享同一权威 MatchCore、Product 状态机与 Profile 合同。

## 开发与生产边界

Greybox、输入 Pilot、真人 Study 和 POC 仅用于开发/测试，不进入生产交付。正式角色与武器资产是正常路径；程序化角色仅在正式资产加载失败时兜底。

当前没有真实用户数据迁移要求，但 Arena 存档仍必须保留 schema 版本、未来版本保护、A/B 原子写入、CAS、租约和失败关闭。

## 目标与状态

游戏性改进重点是动作灵活度、呼吸与跑动质感、抬臂/挥臂/收臂、空中下劈、连招深度和靠近攻击流畅度。性能优化不得减少分辨率、抗锯齿、动作或关节。

当前实现状态与治理状态必须以 [企业治理状态台账](docs/governance/arena-enterprise-governance-status.md) 为准；计划不能写成已实现，自动化通过不能写成真机通过。

权威产品、玩法与架构资料：

- [Arena V1 产品愿景](docs/product/arena-v1-vision.md)
- [Arena V1 游戏规则](docs/gameplay/arena-v1-rules.md)
- [Arena V1 架构提案](docs/architecture/arena-v1-proposal.md)
- [统一配置值说明](docs/gameplay/arena-stage6-input-movement-config.md)
- [ADR-030：Arena 唯一生产产品](docs/decisions/030-arena-only-enterprise-governance.md)
