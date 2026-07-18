# Arena Stage 8 产品设备验收操作手册

## 当前状态

S8.5.6 的版本化 Definition、构建 Manifest 和证据校验器已经就绪，但当前没有任何微信/抖音开发者工具或真机通过记录。合同通过、Node 测试通过和桌面浏览器截图都不能替代六个目标宿主的实际 Record。

当前 Definition ID 为 `arena.stage8.product-device-acceptance.v1`。不要手抄 Definition hash，始终从当前代码生成：

```bash
npm run arena:product:device:evidence -- --describe
```

## 为什么单独建立 Stage 8 Definition

Stage 6 E3 验证输入、移动和灰盒生命周期；Stage 8 还必须证明 Product Session、双槽 Profile、奖励幂等、单 Canvas 产品 UI 与重赛在真实宿主中共同成立。两者复用相同的 Definition/Record/Bundle/Report 基础，但检查项和完成条件互不替代。

S8.5.5 的 Web 语义 DOM 已完成真实浏览器验收，因此本 Definition 只收集仍缺失的微信和抖音证据。

## 准备唯一可追溯构建

1. 先提交所有源码，确认 `git status --short` 为空。
2. 执行 `npm test`、`npm run build` 和 `npm run arena:build:verify -- --require-clean-source`。
3. 三端 Manifest 必须具有同一 `buildId`、同一 40 位 commit，且 `sourceDirty=false`。
4. 微信、抖音必须导入本次 `dist/wechat`、`dist/douyin`，不得沿用开发者工具缓存中的旧目录。
5. 每次修复后使用新 commit/build；失败 Record 不能被同一 Bundle 中的重试结果抵消。

默认 build ID 为 `arena-<commit 前 12 位>-product`。CI 可显式传入 `ARENA_BUILD_ID`，但不得伪改 Manifest 的 commit 或 `sourceDirty`。

建议证据目录：

```text
docs/acceptance/stage8/<build-id>/
├── device-evidence.json
├── build/
│   ├── douyin/arena-build-manifest.json
│   └── wechat/arena-build-manifest.json
├── douyin-developer-tool/
├── douyin-ios-phone/
├── douyin-android-phone/
├── wechat-developer-tool/
├── wechat-ios-phone/
└── wechat-android-phone/
```

同一平台的开发者工具、iOS 和 Android Record 应引用同一份只读构建 Manifest。截图、录像和日志必须来自各自 run，不能跨 run 复用路径、文件或相同内容。

## 六个强制目标

| Target ID | 系统/宿主 | 重点 |
|---|---|---|
| `douyin-developer-tool` | macOS 抖音开发者工具 | 正常产品闭环 + 三类存储故障 |
| `douyin-ios-phone` | iOS 抖音真机 | 完整闭环 + context recovery + 性能长稳 |
| `douyin-android-phone` | Android 抖音真机 | 完整闭环 + context recovery + 性能长稳 |
| `wechat-developer-tool` | macOS 微信开发者工具 | 正常产品闭环 + 三类存储故障 |
| `wechat-ios-phone` | iOS 微信真机 | 完整闭环 + context recovery + 性能长稳 |
| `wechat-android-phone` | Android 微信真机 | 完整闭环 + context recovery + 性能长稳 |

Record 的 `device.osName` 必须与 target 精确匹配 `macOS`、`iOS` 或 `Android`；“手机通过一次”不能同时代表两个系统。

## 每个目标的正常产品流程

1. 清空 `arena.player-profile.arena-v1-local-player.*` 后冷启动，进入默认 Profile 和可操作大厅。
2. 选择另一个角色，硬重启，确认选择保持。
3. 完成大厅 → 角色 → 匹配 → 对局 → 奖励 → 再来一局。
4. 记录奖励前后经验与 grant；硬重启后经验保持且同一 grant 不重复。
5. 对局中前后台切换，确认暂停期间不追 tick、旧触点不复活、恢复需要新触摸。
6. 连续运行至少十分钟并多次重赛，确认无双 Session、双帧循环、持久遮罩或持续错误。
7. 检查大厅、角色卡、按钮、HUD、字体和触控区域均位于竖屏安全区。
8. 检查只有一个上屏 WebGL Canvas；离屏 2D Canvas 只用于 Product CanvasTexture。
9. 检查 UI、日志、存档和结算不出现 `bot`、`difficulty`、难度档位或虚假真人声明。

## 开发者工具故障注入

只在开发者工具执行以下破坏性场景，操作前复制当前有效存档和运行日志。停止当前 Session 后再直接编辑存储；不得修改生产源码或 `game.js` 来制造“通过”。

### 损坏槽恢复

1. 先产生至少两个有效 generation，确认 slot A/B 都存在。
2. 破坏最新槽 payload/hash，保留另一槽，硬重启后应加载最后一个有效 Profile。
3. 再破坏两个槽，硬重启后应安全恢复默认 Profile，并在诊断中报告两个 invalid slot。
4. 原始损坏内容不得进入玩家文案或普通日志。

### 写入、读回与 head 失败

1. Session 打开后，通过开发者工具支持的存储配额/故障能力使下一目标槽写入失败；执行角色保存或奖励提交。
2. UI 必须进入可恢复路径，硬重启仍加载最后有效 Profile；恢复写入能力后重试只提交一次。
3. 单独制造“写入返回异常但数据实际落盘”和“新槽写入后读回失败”，记录是否确认或回滚。
4. 单独让 head 更新失败；有效新 generation 仍可在重启时按 revision 选出，旧 head 不能覆盖它。
5. 若开发者工具不支持可靠故障注入，Record 必须标记失败并保留限制，不能用 Node fixture 替代。

### 未来 schema 保护

1. 在任一槽写入高于当前版本的 envelope/payload schema，并移除其他会掩盖该场景的测试数据。
2. 冷启动必须拒绝旧客户端覆盖，展示脱敏错误并释放 lease。
3. 再次读取原槽，未来 generation 必须原样保留。

## 真机额外证据

- 分别记录冷启动、普通对局和十分钟连续运行的帧时间、峰值内存、draw calls/三角形（宿主可提供时）和温升观察。
- 触发或观察 WebGL context loss：丢失时停止渲染与输入提交，恢复后不出现旧触点、重复 GPU 资源、状态倒退或重复奖励。
- 如果宿主不暴露主动 context loss 能力，记录可执行的系统打断路径及限制；没有证据时该 check 不能标记通过。
- 性能阈值在 Stage 9 目标设备预算冻结前只记录原始样本，不凭桌面数据宣称达标。

## 每条 Record 的附件

每条 Record 必须同时包含：

- `build-manifest`：对应平台的 `arena-build-manifest.json`；
- `screenshot`：能辨认 target、关键 UI 和安全区；
- `video`：连续覆盖目标流程或故障恢复，不用剪辑拼接隐藏失败；
- `log`：客户端/基础库版本、步骤、原始错误、性能样本和结果。

所有附件必须填写真实 `byteLength` 和 SHA-256，并由同一 Bundle 的 checks 引用。不要创建空文件、占位哈希或复制附件。

## 校验

```bash
npm run arena:product:device:evidence -- \
  --bundle docs/acceptance/stage8/<build-id>/device-evidence.json \
  --artifacts-root docs/acceptance/stage8/<build-id>
```

- 退出码 `0`：六个 target 各有至少一个完整通过 Record，构建 Manifest 干净且附件一致。
- 退出码 `2`：缺少 target 或存在失败 Record。
- 退出码 `1`：Definition、OS、commit/build、Manifest、路径、大小、SHA-256 或文件读取无效。

只有 Report 为 `ready` 才能关闭 S8.5.6 和 Stage 8。
