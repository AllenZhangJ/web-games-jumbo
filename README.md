# 数域跃迁（Number Strategy Jump）v3

一款以“左右选择数值运算 + 按住蓄力跳跃”为核心的竖屏小游戏。v3 保留现有数值策略、连续世界、真实落点、碰撞规则、测试和 Web/微信/抖音平台适配层，将原 Canvas 2D 表现层重构为 Three.js/WebGL2 三维场景。

> **项目状态：** 当前可视产品仍是数值跳台 v3。Arena V1 已完成独立的轻量物理骨架、无渲染 1v1 MatchCore，以及隐藏本地机器人与快速匹配内核；装备、地图和 Arena 渲染尚未接入。两条领域代码保持隔离，不把 Arena 规则混入现有 v3 Core。

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
```

`arena:poc:build` 生成 Web、微信、抖音无渲染 MatchCore POC；`arena:stress` 连续运行 1,000 局并验证逻辑预算、有限状态、内存增长和抽样回放。

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
- [Arena V1 架构提案](docs/architecture/arena-v1-proposal.md)
- [Arena V1 角色索引](docs/characters/README.md)
- [GitHub 方案调研](docs/research/github-arena-references.md)
- [Arena 物理 POC 结果](docs/research/arena-physics-poc-results.md)
- [Arena MatchCore 压测结果](docs/research/arena-matchcore-stress-results.md)
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

## 许可与素材

- Three.js、参考项目 `web-jump` 与改编来源 Yuka 均按各自 MIT 许可使用，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 `licenses/`。
- `web-jump` 的参考基线固定为 commit `3fdcb17436f77ddb6664b9aad8f9c5fffdf0fe58`。
- 不把参考项目的快递箱、魔方等纹理默认视为可发行资产；正式发布前仍需由项目方完成代码、美术、音频、商标与平台审核。
