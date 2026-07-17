# Arena V1 物理 POC 结果

## 状态

已完成本机自动化 POC，最近复测于 2026-07-17。目标真机仍需使用 `dist/arena-poc` 做微信、抖音 iOS/Android 验收。

## 方法

两个可执行候选实现同一 `PhysicsAdapter`，运行相同的 60 tick/s 场景：静止接地、加速与制动、0.3m 低台、角色互撞、击飞落地、平台边缘跌落、重置和 20,000 tick 长稳。包体由 esbuild 以 `iife / platform: neutral / es2020 / minify` 构建并 gzip。

执行命令：

```bash
npm run arena:poc
npm run arena:poc:stress
npm run arena:poc:build
```

测量环境：Node.js 20.19.5，macOS arm64。数值只用于同机候选比较，不代替目标真机性能结论。

## 结果

| 指标 | 轻量 JavaScript | Rapier 3D deterministic compat 0.19.3 |
|---|---:|---:|
| 运行 tick | 20,763 | 20,763 |
| 平均 step | 0.00056 ms | 0.00600 ms |
| 最大 step | 0.273 ms | 5.286 ms |
| 初始化 | 3.06 ms | 22.37 ms |
| minified bundle | 8,254 B | 2,284,249 B |
| gzip | 2,781 B | 844,292 B |
| 非有限状态 | 0 | 0 |
| 0.3m 低台最高接地中心 | 1.30m | 1.063m |
| 低台场景接地 tick | 45/45 | 19/45 |
| 边缘跌落 | 第 48 tick | 第 48 tick |
| 重置速度误差 | 0 | 0 |

轻量方案在本次构建中 gzip 约为 Rapier 的 `1/303`，平均物理 step 约为 `1/10.7`。Rapier 的动态胶囊在统一控制条件下不能稳定通过 0.3m 低台；若继续采用，需要额外接入其角色控制器并重新调试冲量、接地和动态角色互撞。

## 结论

选择项目内轻量街机物理作为 Arena V1 后端。它满足当前两个角色、静态平台、显式冲量和确定性回放需求，并为 16.67ms 的 60 FPS 帧预算保留更多空间。

Rapier POC 代码和依赖已经从最终工作树移除，避免失败候选进入生产包。Box3D 当前为 C17 alpha 且缺少成熟官方 JavaScript/WASM 分发，不进入可执行候选。

## 最终门禁

- 胜出方案额外运行 100,763 tick：平均 `0.000408ms/tick`、最大 `0.310ms`、非有限状态 `0`，最终 hash `672de1f1`；加入完整边界与生命周期守卫后的 POC gzip 为 `3,810 B`。
- 包含完整 MatchCore 的无渲染入口已构建为 Web、微信、抖音三个无外部模块的 ES2020 IIFE，输出位于 `dist/arena-poc`。
- 架构自动化守卫会阻止 Arena 引入 Three.js、DOM、宿主 API、平台层或已拒绝的 Rapier 依赖。

## 未覆盖

- 当前 POC 只覆盖轴对齐静态平台和低台，不包含坡面、移动平台、旋转机关或复杂网格。
- 当前是本机无渲染测量；三端真机帧时间、内存、启动和前后台仍需单独验收。
- POC 数值不是最终平衡值；后续调参不得破坏相同输入和相同 seed 的回放一致性。
