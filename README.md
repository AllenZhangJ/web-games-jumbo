# 深渊竞技场（Arena）

一款面向 Web、微信小游戏和抖音小游戏的本地 1v1 动作竞技游戏。玩家通过移动、跳跃、二段跳、下砸和武器攻击争夺空间，把对手击出平台；对手由遵守同一输入与规则的本地 Bot 驱动。

Arena 是本仓库唯一生产产品。早期数值跳台实现已经退出活动源码与生产构建，只能通过 Git 历史查阅；不得作为兼容入口重新引入。

## 当前能力

- 固定整数 tick 的权威 MatchCore，同 seed、同输入可复现状态、事件与 Replay。
- 任意距离可攻击并挥空；命中、击退、淘汰和胜负只由 Core 裁决。
- 行走/跑动、停止、起跳准备、空中、二段跳、下砸、正背面受击等动作语义。
- 基础攻击、链钩、锤击、盾冲具有独立范围、速度、阶段、僵直与击退 Definition。
- 正式 KayKit 双角色、武器附件、纹理和 Kenney 打击音效；程序化角色只作为加载失败兜底。
- 1v1 Quick Match、本地 Bot、角色选择、奖励事务、重赛与版本化本地 Profile。
- Web、微信、抖音三个 Product 入口及可复现构建 Manifest、资产/产物预算。
- 黄金 Replay、输入 fuzz、生命周期、压力与 soak 门禁。

当前游戏性仍在持续提高，尤其是动作灵活度、手臂起落/挥收、空中攻击、连招上限和移动质感。治理迁移不得以减少动作、关节、分辨率或抗锯齿换取性能结果。

## 本地运行

要求 Node.js 20 或更高版本。

```bash
npm ci --ignore-scripts
npm run dev
```

局域网手机验收：

```bash
npm run dev:lan
```

生产构建：

```bash
npm run build
npm run arena:build:verify -- --require-clean-source
npm run arena:build:budget
```

完整治理门禁：

```bash
npm run check
```

## 架构边界

实现必须按以下依赖方向推进：

```text
Definition / State
        ↓
Registry / Resolver / System
        ↓
MatchCore
        ↓
Bot Observation / Replay / Session
        ↓
Renderer / UI / Audio
```

权威层不依赖 Three.js、DOM、平台全局、墙钟或未注入随机源。Bot 只能读取受限观察并输出 `InputFrame`。表现层只消费只读快照与权威事件，不能参与玩法判定。

详细规则见 [AGENTS.md](AGENTS.md) 与 [Arena V1 架构提案](docs/architecture/arena-v1-proposal.md)。

## 企业治理迁移

当前治理分支以 `51e28220295c080261d30e33aaac7e43c5f91685` 为不可变产品基线。全仓生产源码、测试和治理脚本已经完成 strict TypeScript 迁移，受维护 JavaScript 为零；ESLint、分层 Vitest coverage、架构边界、供应链、敏感信息、正式资产和唯一生产入口均已进入 `npm run check:governance`。

- [ADR-030：Arena 唯一生产产品](docs/decisions/030-arena-only-enterprise-governance.md)
- [完整迁移计划](docs/governance/arena-enterprise-governance-plan.md)
- [实时状态台账](docs/governance/arena-enterprise-governance-status.md)
- [最新 main 合并前审计](docs/governance/arena-main-merge-preflight.md)
- [产品基线证据](docs/baselines/arena-product-51e2822.md)

当前审计结论是不可直接合并：联网 `npm audit` 尚待负责人明确授权；最新 `main` 与治理分支有 23 个产品/治理冲突，必须另行批准 Arena 保留型集成；iPhone 13 Pro/iOS 26/Chrome 真机验收尚未完成。微信/抖音 iOS/Android 真机证据继续作为发布阻断。

## 验收边界

自动化和本机构建不能替代设备体验：

- 合并门禁：完整自动化、三端 clean build、Web iPhone 13 Pro/Chrome 验收。
- 发布门禁：合并门禁之外，还必须补齐微信/抖音 iOS 与 Android 真机记录。

缺少真机记录时可以形成代码合并审计判断，但不能宣称已经具备正式发布条件。

## 第三方资产与代码

第三方来源、固定 revision、许可和归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 `licenses/`。Allen 已作为项目唯一负责人完成当前 3 个来源、10 个运行时资产和 3 个正式 GLTF Definition 的批准；`npm run check:third-party-assets` 与 `npm run check:formal-assets` 会复验来源、许可、证明、字节哈希和运行时绑定。该批准不替代目标真机可读性、性能、reduced-motion 或发行候选证据。
