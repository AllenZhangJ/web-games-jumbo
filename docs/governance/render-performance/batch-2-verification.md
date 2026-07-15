# 第二批：资源内核与 HUD 验证

验证日期：2026-07-15

## 自动化

- TextureManager 同时限制缓存条目和估算 RGBA 字节，引用中的淘汰纹理延迟到 release 后销毁。
- 50 次内容组合更新只重绘一个 `1024×1024` DynamicCanvasTexture；不产生 `hud-content:*` 缓存条目。
- 内容菜单关闭后动态纹理数量和字节均归零。
- charging 阶段预热 jumping 状态纹理；测试断言释放前后 `createdTextures` 不增长。
- HudScene 原地更新 SpriteMaterial 的 map、颜色和透明度，不在状态切换时替换 Material。
- 完整门禁：25 个测试文件、152 项测试通过；三端构建和包体预算通过。

## 390×844 浏览器验证

环境：Codex 应用内 Chromium，`http://127.0.0.1:4173/`，生产构建，390×844，DPR 2。

| 检查 | 结果 | 证据 |
|---|---|---|
| 页面与首屏 | 通过 | 标题“数域跃迁”，Canvas 与内容菜单可见，无框架错误层。 |
| 内容遍历 | 通过 | 循环玩法、任务和 10 个角色后 `createdDynamicTextures=1`。 |
| 菜单打开资源 | 通过 | cache 4,800,768 bytes + dynamic 4,194,304 bytes，总计 8,995,072 bytes。 |
| 菜单关闭资源 | 通过 | dynamic 0 bytes，总计 6,332,928 bytes。 |
| 长按 | 通过 | 左箭头按下 450ms 后阶段为 `charging`。 |
| 松开起跳 | 通过 | 松开命令往返 16ms；40ms 后阶段为 `jumping`。 |
| 起跳纹理创建 | 通过 | 松开前后 `createdTextures` 均为 16。 |
| 错误 | 通过 | Runtime error 0；console warn/error 0。 |

16ms 是本机浏览器控制命令的观测值，不是 iPhone 帧时间，也不能替代 iOS Chrome 真机验收。iPhone 13 Pro 仍在第四批最终生产预览上验收。
