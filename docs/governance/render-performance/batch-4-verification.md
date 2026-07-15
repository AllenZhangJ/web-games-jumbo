# 第四批：调度、画质与生产门禁验证

验证日期：2026-07-15

## 自动化证据

- ContentMenuController 支持 gameplay/task/character/quality 四个注册轴及非法值回退。
- 高低画质通过 Renderer Facade 调整资源预算、DPR、阴影和特效池；Scene 只接收 `shadowMapSize` 小契约。
- FrameMetrics 使用固定 Float64Array 窗口，记录平均/最大帧、长帧和松手响应。
- SaveScheduler 单元/集成路径证明：recordAction 不写存储；首个成功渲染只 arm；后续帧 flush；Hide/Destroy 强制 flush。
- 画质设置刷新恢复；不写入 SaveEnvelope，不影响回放。
- 完整门禁：25 个测试文件、158 项测试通过；覆盖率行/语句 89.91%、函数 93.37%、分支 72.24%。
- 1000 会话、100 轮平台/特效资源、零旧 JS、架构/热路径守卫、依赖/许可审计和三端构建通过。

## 390×844 生产预览

| 指标 | 高画质 | 低画质 |
|---|---:|---:|
| DPR | 2 | 1.5 |
| 缓存预算 | 24 MiB | 10 MiB |
| 动态预算 | 12 MiB | 6 MiB |
| 应用后当前纹理 | — | 10,047,360 bytes |
| 松手到首个 jumping 帧 | 6.6 ms | 5.7 ms |
| 240 帧窗口最大帧 | 12.5 ms | 31 ms |
| >50ms 长帧 | 0 | 0 |
| 起跳新增 CanvasTexture | 0 | 0 |
| Runtime/console 错误 | 0 | 0 |

低画质在刷新后仍保持 DPR 1.5 和对应预算；切回高画质后 DPR 恢复 2。浏览器会话观测到 SaveScheduler `queued=2`、`flushes=2`、`failedFlushes=0`。

以上是本机 Chromium 生产预览证据，不代表 iPhone 13 Pro 真机已经通过。iOS 26 Chrome 的帧率、发热、长按、页面生命周期和 10 分钟稳定性由项目负责人使用最终局域网地址验收。
