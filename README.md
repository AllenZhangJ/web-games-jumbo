# 数域跃迁（Number Strategy Jump）v3

一款以“左右选择数值运算 + 按住蓄力跳跃”为核心的竖屏小游戏。v3 保留现有数值策略、连续世界、真实落点、碰撞规则、测试和 Web/微信/抖音平台适配层，将原 Canvas 2D 表现层重构为 Three.js/WebGL2 三维场景。

> **项目状态：** Web、微信、抖音默认入口已切换到 Arena V1 Product Session：独立轻量物理、1v1 MatchCore、隐藏本地机器人、三件装备、地图时间轴、语义移动/触控、程序化角色、HUD、角色选择、奖励和重赛已连成产品闭环。Web 使用语义 DOM，微信/抖音共享单 Canvas Product UI；Web `/greybox.html` 与小游戏 `game-greybox.js`/`build:greybox` 保留可执行回退。Stage 8 S8.1～S8.5.5 已落地；S8.5.6 六目标设备证据合同与三端构建 Manifest 已就绪，但微信/抖音开发者工具及两端 iOS/Android 真机 Record 尚未采集。Stage 9 S9.1a 已建立版本化无渲染实验基础，S9.1b 已迁移 MatchCore 状态不变量、事件上限、seed 隔离、抽样回放及 CPU/heap 门禁；Map/Bot/Movement 迁移、黄金回放、平衡与设备性能冻结仍未完成。Web 真实浏览器、小游戏宿主组合、100 局旧表现 Session soak 和 100 局 Product Presentation Session soak 已通过；目标真机 E3 与 A/B 新手盲测仍未完成。数值跳台 v3 代码与资产继续保留，两条领域代码保持隔离。

v3 的动作与构图参考开源项目 [`shenmaxg/web-jump`](https://github.com/shenmaxg/web-jump)，但不使用它的单路线玩法作为游戏规则，也不直接复用来源不明的品牌纹理。参考代码的 MIT 许可与归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

> 当前文档描述 v3 的目标架构与验收边界。自动化测试或本机浏览器成功不等于真机通过；微信、抖音 iOS/Android 的 WebGL2、触摸、前后台、安全区和性能仍必须用最终构建产物验收。

## 视觉基线

v3 概念图：[`public/assets/concept/web-jump-three-v3.png`](public/assets/concept/web-jump-three-v3.png)。本机运行验收截图：[`docs/render-final-v3.jpg`](docs/render-final-v3.jpg)。其实现规则见 [v3 视觉与动作系统](docs/design-system-v3.md)。

![数域跃迁 v3 竖屏三维概念](public/assets/concept/web-jump-three-v3.png)

## 玩法核心

- 玩家从当前平台出发，前方始终有左右两个运算候选。
- 只有按住底部 `↖` / `↗` 按钮才会锁定左/右路线并蓄力，松开后按真实按住时长起跳；点击场景不会误触。
- 只有物理落点位于目标平台顶面内，才执行运算并扣除一步。
- 落地保留真实偏心位置，因此会改变下一跳的实际距离和所需力度。
- 在有限步数内让当前值精确等于目标值。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

执行完整自动化检查：

```bash
npm run check
```

Arena 阶段 1～2 验证：

```bash
npm run arena:poc
npm run arena:poc:stress
npm run arena:poc:build
npm run arena:stress
npm run arena:experiment:matchcore
npm run arena:map:stress
npm run arena:movement:stress
npm run arena:input:fuzz
```

`arena:poc:build` 生成 Web、微信、抖音无渲染 MatchCore POC；`arena:experiment:matchcore` 通过通用 Runner 连续运行 1,000 局版本化 MatchCore 实验；`arena:stress` 直接驱动同一 workload case 测量 CPU/GC，避免把通用实验编排成本误算为 Core 成本。`arena:map:stress` 让 100 个 seed 完整跑满 120 秒地图时间轴；`arena:movement:stress` 用 100 个 seed 覆盖走跑、跳跃、蹲跳、二段跳、下砸、地图塌陷和回放一致性；`arena:input:fuzz` 随机验证两套 Mapper 的多指、取消、resize、暂停恢复和完整回放。

Arena 阶段 3 机器人验证：

```bash
npm run arena:bot:stress
```

该门禁检查 10,000 个 seed 的隐藏难度分布，并用 900 局无渲染对局验证三档行为效率、确定性回放和人类可操作约束。它不替代装备与地图闭环后的最终胜率平衡。

构建产物：

```text
dist/
├── web/       # 普通浏览器静态站点
├── douyin/    # 导入抖音小游戏开发者工具
└── wechat/    # 导入微信开发者工具
```

## 手机局域网预览

手机和电脑连接同一 Wi-Fi 后，让 Vite 监听所有本机网卡：

```bash
npm run dev:lan
```

验收生产构建时使用：

```bash
npm run build
npm run preview:lan
```

再在手机打开终端显示的 `Network` 地址。更换 Wi-Fi 后电脑的局域网 IP 通常会变化，之前的地址不应继续作为验收入口。Web 预览只能验证浏览器路径，不能代替微信或抖音真机验收。

## 微信与抖音导入

1. 执行 `npm run build`。
2. 在对应开发者工具中导入 `dist/wechat` 或 `dist/douyin`。
3. 填写项目方的真实 AppID；不要把仓库中的占位配置当作发布凭据。
4. 在开发者工具先检查 WebGL2 创建、首帧、触摸和前后台。
5. 分别使用 iOS 与 Android 真机完成 [平台验收清单](docs/platform-checklist.md)。

默认 `game.js` 是 Product Session。需要验证或紧急回退到旧灰盒入口时执行 `npm run build:greybox`；构建目录还会同时保留 `game-product.js` 与 `game-greybox.js` 供核对。Web 回退入口为 `/greybox.html`。

每次构建会在三端目录生成 `arena-build-manifest.json`。使用 `npm run arena:build:verify` 重算全部产物；正式设备证据还必须增加 `-- --require-clean-source`。Stage 8 Definition 与证据校验使用 `npm run arena:product:device:evidence -- --describe`，执行手册见 [Stage 8 产品设备验收](docs/acceptance/stage8/README.md)。

Stage 9 无渲染实验入口为 `npm run arena:experiment`。默认 suite 是 30-seed `scripted-pressure` 基础验证；增加 `-- --suite=matchcore-invariants --cases=1000 --replay-samples=5` 可运行 MatchCore 专业实验。先用 `--describe` 审核固定 commit、完整 Match config、Authority hash、seed、workload、collector 和停止条件；只有 clean source 且全部 case 通过的 Report 才会标记 `freezeEligible=true`。开发中可显式增加 `--allow-dirty` 检查逻辑，但该结果不能进入冻结评审。

## v3 架构

```text
src/
├── core/                   # 数值、世界、轨迹与碰撞；唯一玩法真相
├── platform/               # Web / wx.* / tt.* 画布、输入、生命周期和设备能力
├── runtime/                # 固定步长编排与核心→表现快照同步
├── render3d/
│   ├── renderer3d.js        # Renderer3D 外观，隔离 Three.js 内部细节
│   ├── stage.js             # WebGLRenderer、世界 Scene 与 HUD Scene
│   ├── camera-rig.js        # 正交相机与连续构图
│   ├── lighting-rig.js      # 环境光、方向光与受限阴影
│   ├── character-rig.js     # 蓄力形变、回弹、空翻与失败表现
│   ├── platform-*.js        # 平台 Mesh 工厂与 ID→View 注册表
│   ├── effects/             # 拖尾与粒子，只反映事件而不判定结果
│   └── hud/                 # 同一 WebGL Canvas 上的独立 HUD Scene
└── entry/                   # Web / 微信 / 抖音入口
```

数据严格单向流动：

```text
平台输入 → Runtime → Core 状态/碰撞结果 → 只读快照 → Renderer3D
```

Three.js Mesh、缓动和特效不得反向修改核心世界，不得决定是否落地，也不得把偏心落点吸附到平台中心。详细理由见 [技术架构](docs/architecture.md) 和 [ADR](docs/decisions/)。

## 重要边界

- 核心层不直接访问 Three.js、DOM、`window`、`tt.*` 或 `wx.*`。
- 物理和状态更新使用固定逻辑步长；渲染只消费快照。
- 世界 Scene 与 HUD Scene 共用一个上屏 WebGL Canvas。
- `worldRoot` 的视觉平移不改变核心平台的绝对世界坐标。
- 角色形变、空翻、拖尾、倾倒和粒子只属于表现层。
- 现代 Three.js 路径以 WebGL2 为前提；任一目标真机不满足时，必须重新评审版本或降级路径，不得忽略失败。

## 文档

- [产品状态索引](PRODUCT.md)
- [Arena V1 产品愿景](docs/product/arena-v1-vision.md)
- [Arena V1 游戏规则](docs/gameplay/arena-v1-rules.md)
- [Arena V1 分阶段路线](docs/roadmap/arena-v1-vertical-slice.md)
- [Arena Stage 5～9 决策门](docs/roadmap/stage5-9-decision-gates.md)
- [Arena V1 架构提案](docs/architecture/arena-v1-proposal.md)
- [Arena Stage4 Rule/Core 执行管线](docs/architecture/arena-stage4-rule-pipeline.md)
- [Arena Stage5 地图权威执行管线](docs/architecture/arena-stage5-map-pipeline.md)
- [Arena Stage6 输入、移动与灰盒执行计划](docs/architecture/arena-stage6-input-movement-plan.md)
- [Arena Stage6 验收与证据矩阵](docs/quality/arena-stage6-verification-matrix.md)
- [Arena Stage7 角色、动画与反馈执行计划](docs/architecture/arena-stage7-presentation-plan.md)
- [Arena Stage8 局外产品循环与本地进度执行计划](docs/architecture/arena-stage8-product-progression-plan.md)
- [Arena Stage9 平衡、可靠性与性能收敛计划](docs/architecture/arena-stage9-convergence-plan.md)
- [Arena V1 角色索引](docs/characters/README.md)
- [GitHub 方案调研](docs/research/github-arena-references.md)
- [Arena 物理 POC 结果](docs/research/arena-physics-poc-results.md)
- [Arena MatchCore 压测结果](docs/research/arena-matchcore-stress-results.md)
- [Arena Stage5 地图压测结果](docs/research/arena-map-stress-results.md)
- [Arena Stage6 S6.1 合同门禁结果](docs/research/arena-stage6-contract-results.md)
- [Arena Stage6 S6.2 Movement 门禁结果](docs/research/arena-stage6-movement-results.md)
- [Arena Stage6 S6.3 Bot 移动与公平性门禁结果](docs/research/arena-stage6-bot-movement-results.md)
- [Arena Stage7 S7.1 表现合同与占位实例门禁结果](docs/research/arena-stage7-presentation-contract-results.md)
- [Arena Stage8 S8.3 奖励与解锁结果](docs/research/arena-stage8-reward-progression-results.md)
- [Arena Stage8 S8.4 对称内容池与快捷重赛结果](docs/research/arena-stage8-content-pool-results.md)
- [Arena Stage8 S8.5.1～S8.5.3 产品表现基础](docs/research/arena-stage8-product-presentation-foundation.md)
- [Arena Stage8 S8.5.4 Product Renderer 与 Web 宿主结果](docs/research/arena-stage8-product-renderer-web-results.md)
- [Arena Stage8 S8.5.5 Canvas Product UI 与三端默认入口结果](docs/research/arena-stage8-canvas-product-entry-results.md)
- [Arena Stage8 S8.5.6 产品设备证据合同](docs/research/arena-stage8-device-evidence-contract.md)
- [Arena Stage9 S9.1 可复现实验基础](docs/research/arena-stage9-s9.1-experiment-foundation.md)
- [Arena 机器人压测结果](docs/research/arena-bot-stress-results.md)
- [技术架构](docs/architecture.md)
- [v3 视觉与动作系统](docs/design-system-v3.md)
- [平台与真机验收清单](docs/platform-checklist.md)
- [游戏规则与玩法](docs/gameplay-rules.md)
- [产品边界](PRODUCT.md)
- [ADR-001：Three.js/WebGL2 单 Canvas](docs/decisions/001-threejs-webgl2-single-canvas.md)
- [ADR-002：核心状态单向驱动表现层](docs/decisions/002-core-driven-presentation.md)
- [ADR-003：`web-jump` 参考与 MIT 合规](docs/decisions/003-web-jump-reference-and-license.md)
- [ADR-004：Arena V1 首版采用隐藏本地对手的 1v1](docs/decisions/004-arena-v1-local-bot-first.md)
- [ADR-005：Arena V1 采用轻量街机物理](docs/decisions/005-arena-lightweight-physics.md)
- [ADR-006：Arena V1 使用项目内 tick 驱动的效用机器人](docs/decisions/006-arena-local-tick-utility-bot.md)
- [ADR-007：Arena 采用项目内数据驱动 Rule/Core 分层](docs/decisions/007-arena-rule-core-governance.md)
- [ADR-008：Arena 地图使用独立权威时间轴](docs/decisions/008-arena-map-authority-timeline.md)
- [ADR-009：Arena 使用语义输入与独立 Movement 权威（提议）](docs/decisions/009-arena-semantic-input-and-movement-authority.md)
- [ADR-010：Arena 使用语义表现合同与独立资产注册表（S7.1 已接受）](docs/decisions/010-arena-semantic-presentation-and-assets.md)
- [ADR-011：Arena 使用版本化双槽本地进度与对称内容池](docs/decisions/011-arena-versioned-local-progression.md)
- [ADR-012：Arena 使用可复现实验收敛并只降级表现层](docs/decisions/012-arena-reproducible-convergence.md)
- [ADR-013：Arena 盲测使用本地证据工作区](docs/decisions/013-arena-pilot-local-evidence-workspace.md)
- [ADR-014：Arena 使用版本化真机验收证据](docs/decisions/014-arena-versioned-device-acceptance-evidence.md)
- [ADR-015：Arena 使用无 UI 显式产品状态机与单 Match 所有权](docs/decisions/015-arena-headless-product-session-lifecycle.md)
- [ADR-016：Arena 使用单未结算结果与本地幂等奖励事务](docs/decisions/016-arena-local-match-reward-transaction.md)
- [ADR-017：Arena 每局冻结双方对称的权威内容选择](docs/decisions/017-arena-frozen-symmetric-match-content.md)
- [ADR-018：Arena 产品表现使用版本化 ViewModel、意图端口与非拥有 Match 桥](docs/decisions/018-arena-product-presentation-contracts.md)
- [ADR-019：Arena 产品渲染使用组合 Renderer，Web 菜单使用语义 DOM 宿主](docs/decisions/019-arena-product-renderer-and-web-host.md)
- [ADR-020：小游戏产品 UI 使用单 WebGL Canvas 叠层，三端默认入口切换到 Product Session](docs/decisions/020-arena-canvas-product-surface-and-default-entries.md)
- [ADR-021：Stage 8 使用版本化产品设备证据与可校验构建 Manifest](docs/decisions/021-arena-stage8-device-evidence-and-build-manifest.md)

## 许可与素材

- Three.js、参考项目 `web-jump` 与改编来源 Yuka 均按各自 MIT 许可使用，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 `licenses/`。
- `web-jump` 的参考基线固定为 commit `3fdcb17436f77ddb6664b9aad8f9c5fffdf0fe58`。
- 不把参考项目的快递箱、魔方等纹理默认视为可发行资产；正式发布前仍需由项目方完成代码、美术、音频、商标与平台审核。
