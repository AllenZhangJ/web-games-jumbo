# Arena Stage 6 S6.5 灰盒与 Session 门禁记录

## 结论

2026-07-17 的 S6.5.4 已通过本机 E1/E2、Web 真实浏览器桌面/手机竖屏冒烟和 100 局 Session soak，并随提交 `a340107` 推送。S6.5 的本机 Web 门可以关闭，但微信开发者工具、抖音开发者工具与目标真机 E3 尚未执行，因此不能把 S6.5 或 Stage 6 标记为全部完成。

S6.5.1～S6.5.3 对应提交：

- `c89dfd3`：只读投影、事件窗口和正交相机合同。
- `b25bd49`：模块化程序灰盒 Renderer、HUD、角色、装备和地图表现。
- `9a1ab00`：输入路由、Arena Presentation Session、三端入口、失败回滚和可重试清理。

本记录覆盖紧随 `9a1ab00` 的 S6.5.4 变更；最终提交标识以本文件的 Git 历史为准。

## 自动化门禁

```bash
npm run check
npm run arena:session:soak
git diff --check
```

`npm run check` 结果：

- 326/326 测试通过。
- Web、微信、抖音三端构建通过。
- Web 主包 838.51 kB minified / 219.11 kB gzip；存在大于 650 kB 的非阻断体积预警，留给 Stage 9 预算治理。

`arena:session:soak` 固定参数与结果：

| 指标 | 结果 |
|---|---:|
| 连续比赛 | 100 |
| 唯一 matchSeed | 100 |
| render 次数 | 328 |
| hide/show | 9 |
| WebGL context loss/restore | 6 |
| resize | 14 |
| `session-failed` 诊断 | 0 |
| GC 后堆增长 | 2,397,080 B |
| 堆增长预算 | 8,388,608 B |
| 结束后 RAF | 0 |
| 结束后生命周期监听器 | 0 |
| 结束后 Canvas 监听器 | 0 |
| 结束后输入绑定 | 0 |

脚本使用 `initialSeed = 0x65050000`，每局使用真实 `QuickMatchService`、`LocalMatchSession`、隐藏 Bot 和 MatchCore；Renderer 使用无 GPU 的合同替身，因此该脚本证明 Session 所有权与状态串局边界，不替代真实 GPU/宿主 E3。

## Web 真实浏览器验收

环境：Codex 应用内 Chromium 浏览器，`http://127.0.0.1:4174/`，2026-07-17。

| 检查 | 桌面 1440×900 | 手机竖屏 390×844 |
|---|---|---|
| 页面标题 | `深渊竞技场` | `深渊竞技场` |
| 非空/无框架错误层 | 通过 | 通过 |
| Canvas 可访问名称 | `竞技场跑酷对决游戏画布` | 同左 |
| 首屏 WebGL 灰盒 | 通过 | 通过 |
| 输入交互 | 左侧移动手势后画面状态变化 | 动作键点击后比赛继续且无错误 |
| 结果态 | 通过 | 通过，显示“再接再厉”与“再来一局” |
| 重赛 | 通过 | 点击后回到新一局“准备”态，随机对手外观更新 |
| fresh tab 控制台 | 0 error / 0 warning | 0 error / 0 warning |

初次运行发现 Three.js `PCFSoftShadowMap` 弃用警告；S6.5.4 已改为 `PCFShadowMap`，reload 后新标签页复验为 0 warning。验收截图作为本次开发任务附件交付，不写入权威规则或源码目录。

## 生命周期与竞态修复

- `ArenaInputRouter` 只在 sampler 暂停/恢复成功后提交 mode，避免半提交状态。
- Session 在渲染帧内收到宿主输入错误时延迟到帧尾清理，避免销毁 Renderer 的 render 重入。
- Session 清理不可重入；清理回调错误进入统一原因链。
- 一次性生命周期解绑失败会保留 cleanup，并允许第二次 `destroy()` 重试。
- 架构守卫不再把 `presentation-event-window.js` 文件名误判为浏览器 `window` 全局，同时仍禁止真实 DOM/BOM 依赖。

## 未关闭风险

- 微信、抖音开发者工具和目标真机尚未执行多点触控、取消、前后台、context loss、安全区与 WebGL2 E3。
- 100 局 soak 使用 Renderer 合同替身；真实 GPU 纹理/几何长稳与低端机内存仍需 Stage 9 设备测试。
- A/B Mapper 仍同时存在于代码中，S6.6 必须用未接触项目的新手盲测冻结胜者。
- 当前 Web 单包体积预警不阻断 Stage 6，但必须在 Stage 9 建立明确首包与加载时间预算。
