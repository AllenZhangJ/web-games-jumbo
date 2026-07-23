# Arena Stage 8 S8.5.5 Canvas Product UI 与三端默认入口结果

## 结论

S8.5.5 已把 Web、微信、抖音默认入口切换到同一 `ProductPresentationSession`。Web 使用语义 DOM Surface；微信和抖音使用共享 `ProductCanvasUiSurface`。小游戏产品 UI、比赛世界和 HUD 通过唯一 WebGLRenderer 合成，没有第二主 Canvas、第二局 Match 或第二条奖励/Profile 写入路径。

历史候选当时仍可执行旧入口：Web 提供 `/greybox.html`，小游戏可生成独立灰盒 `game.js` 包。G1 已退役 `build:greybox` 发行命令，当前生产构建只交付 Product；本节数值只是当时的历史验证。

## 模块边界

```text
公开 Product ViewModel
        ↓
ProductUiSceneModel（无宿主）
        ↓
┌──────────────────────────────┬──────────────────────────────┐
│ WebProductUiSurface          │ ProductCanvasUiSurface       │
│ DOM / semantic controls      │ Offscreen 2D / CanvasTexture │
└──────────────────────────────┴──────────────────────────────┘
        ↓                                      ↓
 DOM intent delegate          Canvas hitTest → ProductInputRouter
        └──────────────────────┬───────────────┘
                               ↓
                  ProductPresentationFlow
```

- `presentation/product` 只负责公开场景数据，不依赖 Three 或平台。
- `presentation/canvas` 内部继续分为纯 layout、纯 painter 与资源/命中 Surface；三者均不读取产品 Controller，只有 Surface 接触 Three 纹理生命周期。
- `presentation/renderer` 负责 Surface 与比赛 Renderer 组合。
- `entry` 负责选择 DOM/Canvas Surface、默认入口和回退入口。
- `scripts/build.mjs` 只在构建期选择小游戏最终 `game.js`。

## 本批发现并修复的问题

### 单 Canvas 不能使用第二个 WebGLRenderer

小游戏只有一个受支持的可见主 Canvas。最终实现让 Canvas Surface 只拥有离屏 2D 纹理和透明 Three Scene，由 `ArenaGreyboxRenderer.renderComposite()` 借出当前帧唯一 Renderer 完成合成。

### 子资源合同校验前可能丢失候选句柄

原 `ProductRenderer` 在 `validateSurface(factory())` 抛错时不会保存 factory 返回的候选，完整但合同错误的候选无法清理。现改为先登记候选，再校验合同；构造失败会释放已登记的 Gameplay Renderer 与 UI Surface。

### 角色 radio 名称在点击中变化

Web 真实点击发现角色已成功切换，但 `aria-label` 同时从角色名变为“角色名，当前已选择”，使等待同一目标的交互失配。`role=radio` 已通过 `aria-checked` 表达状态，现保持 accessible name 为稳定角色名，读屏信息不重复且点击不再竞态。

### Web 多入口共享 Three 形成超限 chunk 警告

默认产品页、灰盒回退页和 Pilot 共同构建后，Rollup 把 Three 与共享代码合并为超过 650 kB 的 chunk。构建现在显式把固定版本 Three 拆为独立 chunk；生产构建无 chunk size 警告。

## 自动化证据

- `npm test`：最终完整门禁 513/513 通过。
- Product Canvas：safe area、48 px 以上动作区、输入 buffer 坐标、角色卡/主次动作命中、gameplay 透明、Surface 生命周期。
- 小游戏宿主组合：真实 `createMiniGamePlatform` + 真实 Product Session/Flow/Input + 真实 Canvas Surface + 模拟 GPU；覆盖 UI touch、hide/show、destroy、触摸/生命周期解绑和 Profile lease 清理。
- 默认小游戏 entry 的 esbuild metafile 必须包含 Product Session/Canvas Surface 且不包含 Web Platform。
- 灰盒 entry 必须包含旧 Arena Session、不包含 Canvas Product Surface，且能独立打成 IIFE。
- `npm run build` 同时生成 Web、微信、抖音产品与回退产物。
- 历史 `build:greybox` 候选中，两端 Manifest 的 `defaultEntry` 为 `greybox`；默认构建为 `product`。该命令已在 G1 退役，当前不应执行。
- Product Presentation Session soak：100 局、100 个唯一 seed/hash、10 次暂停恢复、6 次 context restore、15 次 resize，帧/监听/输入资源归零，堆增长 5,163,928 B，低于 8 MiB 门限。
- Product stress：200 局、96 次快捷重赛、7 次重启；Profile stress：500 次提交并覆盖读回失败、head 失败和损坏回退，数据键保持有界。

## Web 真实浏览器证据

测试流程：`/` → 选择/切换角色 → 确认 → 开始匹配 → 1v1 Canvas → 奖励 → 再来一局。

结果：

- 页面身份为“深渊竞技场”，默认 `/` 直接进入产品大厅。
- DOM 非空，H1、button、radiogroup/radio、live region 保持语义。
- 角色点击竞态修复后真实点击成功，选中态通过 `aria-checked` 更新。
- 对局结束进入奖励页，本次失败结果发放基础经验 100；重赛重新进入 Canvas 对局。
- 390×844 下根容器与页面均为 390×844，无水平/垂直溢出；主按钮约 58.4 px，次按钮约 53.1 px。
- `/product.html` 自动转到 `/`；`/greybox.html` 可独立启动旧灰盒。
- 桌面、移动端、对局、奖励和回退流程控制台均为 0 warning / 0 error，无框架错误覆盖层。

本机截图保存在仓库外：

- `/tmp/arena-s855-web-home-desktop.png`
- `/tmp/arena-s855-web-match-desktop.png`
- `/tmp/arena-s855-web-reward-desktop.png`
- `/tmp/arena-s855-web-home-mobile.png`
- `/tmp/arena-s855-web-greybox-mobile.png`

## 尚未关闭的证据

S8.5.6 仍需使用微信、抖音开发者工具和目标真机验证：

1. 首装、正常存档、损坏存档、写满/写失败与未来 schema 保护。
2. 前后台、系统打断、context loss、硬重启和连续重赛。
3. 真实安全区、触控手感、字体、离屏 Canvas/CanvasTexture 兼容性。
4. 首包/总包、启动时间、帧时间、峰值内存和长稳资源证据。

在这些平台证据完成前，Stage 8 尚未关闭；本批只关闭默认入口与共享 Canvas 产品 UI 的代码门禁。
