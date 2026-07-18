# Arena Stage 9 S9.4 性能与长稳验收手册

## 当前状态

质量 Definition、性能 Policy、Probe、构建预算、六目标设备 Definition 和证据校验器已就绪；当前没有六个真实 target 的通过 Record，因此 S9.4 尚未冻结。

先查看机器生成的完整合同，不手抄 hash：

```bash
npm run arena:performance:evidence -- --describe
```

## 六个强制目标

| Target ID | 系统 | 质量档 | 最低表现目标 |
| --- | --- | --- | --- |
| `web-low-device` | Android 手机浏览器 | `low` | 30 FPS 表现、60 Hz Core |
| `web-mainstream-device` | iOS 手机浏览器 | `high` | 60 FPS 表现、60 Hz Core |
| `wechat-low-device` | Android 微信小游戏 | `low` | 30 FPS 表现、60 Hz Core |
| `wechat-mainstream-device` | iOS 微信小游戏 | `high` | 60 FPS 表现、60 Hz Core |
| `douyin-low-device` | Android 抖音小游戏 | `low` | 30 FPS 表现、60 Hz Core |
| `douyin-mainstream-device` | iOS 抖音小游戏 | `high` | 60 FPS 表现、60 Hz Core |

具体厂商、型号、系统版本、浏览器/基础库版本必须写入 Record。一个物理设备可以在同系统上执行不同平台 target，但每次 run、截图、录像、日志和 Trace 必须独立，不能复制附件冒充不同宿主。

## 生成唯一 clean build

```bash
npm test
npm run build
npm run arena:build:verify -- --require-clean-source
npm run arena:build:budget
```

构建预算必须 `status=passed` 且 `freezeEligible=true`。三端 Record 使用同一 40 位 commit/build ID；Web 引用 `dist/web/arena-build-manifest.json`，小游戏引用各自目录 Manifest。修复后必须新建 commit/build/run，不能覆盖失败证据。

## 每个 target 的固定流程

1. 冷启动最终包，记录启动到 `interactive` 与首次请求匹配到 `first-match-ready`。
2. 连续运行至少 600,000 ms，完整完成至少三局大厅 → 匹配 → 对局 → 奖励 → 重赛。
3. 对局中至少执行一次后台/前台，确认暂停期间不追 Core tick、旧触点不复活。
4. 至少执行一次 WebGL context lost/restored；确认单 Session、资源重建、输入与奖励不重复。
5. 低档 run 明确选择 `low`，主流 run 明确选择 `high`。低档仍需看清风场、塌陷、装备刷新、动作前摇、受击与淘汰边界。
6. 记录完整连续录像、关键截图、运行日志、构建 Manifest 和 Performance Trace。
7. 检查 UI、日志、Trace 和结算没有机器人身份、隐藏难度或虚假真人声明。

Web 可用查询参数固定质量：`?arenaQuality=low` 或 `?arenaQuality=high`。微信/抖音可用启动 query `arenaQuality`；验收期间不得在同一 run 中切换质量。

## 内存与 Trace

运行时通过 `globalThis.__NUMBER_STRATEGY_GAME__.finishPerformanceCapture()` 停止并取得 capture。调用后该 Session 不再继续采样；因此只在完整流程、生命周期和十分钟长稳结束后调用。

Web 在 Chromium 暴露 `performance.memory.usedJSHeapSize` 时自动记录 JS heap。目标宿主没有可靠内存 API 时，设备工具应在启动前提供只读采样函数：

```js
globalThis.__ARENA_PERFORMANCE_MEMORY_PROVIDER__ = () => ({
  processMemoryBytes: /* 外部工具本次采样的真实进程内存字节数 */,
});
```

不得填写设备总内存、估算值或固定占位值。至少需要 JS heap 或进程内存一种真实来源，并形成至少 100 个内存样本；两者都缺失或样本不足时性能门必然失败。
该函数会在表现采样点同步调用，只应返回外部工具预先缓存的最新真实值；不要在函数内执行 I/O、异步查询或昂贵计算。

将 capture 与 `--describe` 输出的 Policy 身份、commit/build/target/run/performedAt 组合成 schema V1 `ArenaPerformanceRecord`，独立保存为该 run 的 `performance-trace` JSON。Trace 必须先停止，且不能删减帧、资源或生命周期计数来迁就预算。

## 附件与校验

每条 Device Record 必须包含并引用：

- `build-manifest`：对应平台的 clean Manifest，可在同平台 run 间复用；
- `performance-trace`：该 run 唯一的完整 Performance Record；
- `log`、`screenshot`、`video`：该 run 唯一且内容真实。

八项 check 必须和 `--describe` 精确一致。`performance-budget` 的 passed/failed 必须与机器重算 Trace 一致，否则整个证据拒绝。

建议目录：

```text
docs/acceptance/stage9/<build-id>/
├── device-evidence.json
├── build/
│   ├── web/arena-build-manifest.json
│   ├── wechat/arena-build-manifest.json
│   └── douyin/arena-build-manifest.json
├── web-low-device/
├── web-mainstream-device/
├── wechat-low-device/
├── wechat-mainstream-device/
├── douyin-low-device/
└── douyin-mainstream-device/
```

最终校验：

```bash
npm run arena:performance:evidence -- \
  --bundle docs/acceptance/stage9/<build-id>/device-evidence.json \
  --artifacts-root docs/acceptance/stage9/<build-id>
```

退出码 `0` 且 Device Report 与 Performance Report 都为 `ready` 才能关闭 S9.4。退出码 `2` 表示证据不完整或真实失败；退出码 `1` 表示合同、身份、附件或 I/O 无效。任何一种都不能手工改成通过。
