# 数域跃迁（Number Strategy Jump）v3

一款以“左右选择数值运算 + 按住蓄力跳跃”为核心的竖屏小游戏。v3 保留现有数值策略、连续世界、真实落点、碰撞规则、测试和 Web/微信/抖音平台适配层，将原 Canvas 2D 表现层重构为 Three.js/WebGL2 三维场景。

v3 的动作与构图参考开源项目 [`shenmaxg/web-jump`](https://github.com/shenmaxg/web-jump)，但不使用它的单路线玩法作为游戏规则，也不直接复用来源不明的品牌纹理。参考代码的 MIT 许可与归属见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

> 当前代码和项目事实从 [项目文档索引](docs/README.md)进入。自动化测试或本机浏览器成功不等于真机通过；微信、抖音 iOS/Android 的 WebGL2、触摸、前后台、安全区和性能仍必须用最终构建产物验收。

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
packages/
├── game-contracts/         # strict TS：版本化定义、Command/Event/Snapshot 与小型 Port
├── difficulty/             # strict TS：easy/normal/hard、校验、注册和迁移投影
├── jump-engine/            # strict TS：RNG、几何、轨迹、碰撞和 WorldState
├── gameplay/               # strict TS：数值规则、状态机、Gameplay/Task 注册表
├── application/            # strict TS：Session、Command、Clock、Lifecycle、Event、Snapshot
├── content/                # strict TS：Scene/Character 注册、回退与资源生命周期
├── feedback/               # strict TS：事件驱动声音/震动与本地设置
├── persistence/            # strict TS：版本化存档、迁移、回放和诊断
├── renderer-three/         # strict TS：World/HUD/Camera/Resource/Context Lifecycle
└── platform/               # strict TS：Web / 微信 / 抖音宿主能力
src/
└── entry/                   # strict TS：唯一具体组合根与三端入口
```

第四批已把平台、入口、测试、配置和构建/审计工具迁为 strict TypeScript，并删除旧 JS 与过渡 tsconfig。`npm run check:zero-js` 会在维护目录发现任一旧 JavaScript 或宽松迁移开关时失败。

数据严格单向流动：

```text
平台输入 → Application → Gameplay + Jump Engine → 只读快照/事件 → Renderer3D
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

- [项目文档索引](docs/README.md)
- [项目概览](docs/project-overview.md)
- [仓库结构与模块目录](docs/repository-structure.md)
- [运行主流程与生命周期](docs/runtime-flow.md)
- [测试、验证与发布](docs/testing-and-release.md)
- [发布清单](docs/release-checklist.md)
- [资产与许可证](docs/assets-and-licenses.md)
- [v0.1.0 行为与工程基线](docs/baselines/v0.1.0.md)
- [完整治理路线图](docs/governance/roadmap.md)
- [当前治理状态](docs/governance/status.md)
- [贡献指南](CONTRIBUTING.md)
- [技术架构](docs/architecture.md)
- [v3 视觉与动作系统](docs/design-system-v3.md)
- [平台与真机验收清单](docs/platform-checklist.md)
- [游戏规则与玩法](docs/gameplay-rules.md)
- [产品边界](PRODUCT.md)
- [ADR-001：Three.js/WebGL2 单 Canvas](docs/decisions/001-threejs-webgl2-single-canvas.md)
- [ADR-002：核心状态单向驱动表现层](docs/decisions/002-core-driven-presentation.md)
- [ADR-003：`web-jump` 参考与 MIT 合规](docs/decisions/003-web-jump-reference-and-license.md)
- [ADR-004：分批治理的模块化单体](docs/decisions/004-modular-governance-roadmap.md)

## 许可与素材

- Three.js 与参考项目 `web-jump` 均按各自 MIT 许可使用，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 与 `licenses/`。
- `web-jump` 的参考基线固定为 commit `3fdcb17436f77ddb6664b9aad8f9c5fffdf0fe58`。
- 不把参考项目的快递箱、魔方等纹理默认视为可发行资产；正式发布前仍需由项目方完成代码、美术、音频、商标与平台审核。
