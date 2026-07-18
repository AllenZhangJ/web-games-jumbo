# Arena Stage 6 E3/E4 验收操作手册

## 当前状态

执行合同已就绪，尚无目标设备 E3 或真人新手 E4 记录。本目录不得因为 schema/CLI 通过就标记 Stage 6 完成。

E3 验证当前构建在真实宿主中的输入、生命周期、渲染和资源行为。E4 验证未接触项目的受测者是否能在 10 秒内理解输入。两者不能互相代替。

## 准备一个构建

1. 从干净工作区执行 `npm test` 和 `npm run build`。
2. 记录完整 40 位 commit，不使用短 hash：`git rev-parse HEAD`。
3. 生成本次唯一 build ID，建议使用 `<commit-short>-<YYYYMMDD>-<sequence>`。
4. Web、微信和抖音必须来自同一 commit/build，不得混合旧产物。
5. 为该构建新建独立归档目录，不从上一个 build 复制附件。

建议结构：

```text
docs/acceptance/stage6/<build-id>/
├── device-evidence.json
├── web-phone/
│   ├── launch.png
│   ├── lifecycle.mp4
│   └── runtime.log
├── wechat-developer-tool/
├── wechat-phone/
├── douyin-developer-tool/
└── douyin-phone/
```

## E3 目标矩阵

| Target ID | 宿主 | 必测边界 |
|---|---|---|
| `web-phone` | 手机浏览器真机 | 全部通用项 + WebGL context loss/recovery |
| `wechat-developer-tool` | 微信开发者工具 | 全部通用项 |
| `wechat-phone` | 微信真机 | 全部通用项 + WebGL context loss/recovery |
| `douyin-developer-tool` | 抖音开发者工具 | 全部通用项 |
| `douyin-phone` | 抖音真机 | 全部通用项 + WebGL context loss/recovery |

通用项：

1. 启动并进入可交互 1v1 对局。
2. 左侧移动与右侧动作多指同时操作，没有 pointer 串号。
3. 按住时触发 cancel/中断，角色停止持续输入，旧触点不复活。
4. 按住时前台→后台→前台，暂停期间 tick 不追赶，恢复必须新触摸。
5. 竖屏安全区、HUD、摇杆和动作键可见且可触达。
6. 完成一局并触发再来一局，只有一个 Session 获得输入。
7. 返回/切局后无双帧循环、无持续日志异常、无不可交互遮罩。
8. UI、对手名称、日志和结算不出现 Bot 或难度。

每个 target 都要有截图、连续录屏和日志。一个附件可为同一次运行的多个 check 提供证据，但每个附件必须至少被一个 check 引用；同一路径、同一文件或相同内容不得伪装成多个附件或跨 run 复用。

## `device-evidence.json`

Bundle 顶层必须包含当前 Definition ID/hash、commit、build ID、UTC 创建时间和 records。每个 record 必须完整填写 target 要求的 checks 与 artifacts；未执行完的草稿不是 Record。

以 `web-phone` 为例（check 列表需按 Definition 补齐）：

```json
{
  "schemaVersion": 1,
  "definitionId": "arena.stage6.device-acceptance.v1",
  "definitionHash": "<npm test 输出/代码生成的 8 位 hash>",
  "commit": "<40 位小写 commit>",
  "buildId": "<build-id>",
  "createdAt": "2026-07-18T12:30:45.000Z",
  "records": [
    {
      "schemaVersion": 1,
      "recordId": "record-web-phone-001",
      "definitionId": "arena.stage6.device-acceptance.v1",
      "definitionHash": "<同上>",
      "commit": "<同上>",
      "buildId": "<同上>",
      "targetId": "web-phone",
      "runId": "run-web-phone-001",
      "performedAt": "2026-07-18T12:00:00.000Z",
      "operatorId": "operator-001",
      "client": {
        "name": "Mobile Safari",
        "version": "<version>",
        "baseLibraryVersion": null
      },
      "device": {
        "manufacturer": "<vendor>",
        "model": "<model>",
        "osName": "iOS",
        "osVersion": "<version>"
      },
      "orientation": "portrait",
      "inputMode": "touch",
      "checks": [
        {
          "id": "launch-interactive",
          "result": "passed",
          "notes": "从冷启动进入首局并可同时移动/操作。",
          "artifactIds": ["launch-screen", "lifecycle-video", "runtime-log"]
        }
      ],
      "artifacts": [
        {
          "id": "launch-screen",
          "kind": "screenshot",
          "path": "web-phone/launch.png",
          "sha256": "<64 位小写 SHA-256>",
          "byteLength": 12345
        }
      ]
    }
  ]
}
```

上述片段是结构示例，不是可通过的伪造证据。不得用占位符、空文件或复制附件运行验证器。

不要手抄 Definition 或 hash。先执行：

```bash
npm run arena:device:evidence -- --describe
```

命令会输出当前完整 Definition 和 `definitionHash`，将两者对应的 ID/hash 写入 Bundle 与每条 Record。附件字节数与 SHA-256 必须根据最终文件计算。

## 校验命令与结果

```bash
npm run arena:device:evidence -- \
  --bundle docs/acceptance/stage6/<build-id>/device-evidence.json \
  --artifacts-root docs/acceptance/stage6/<build-id>
```

- 退出码 `0`：五个 target 都有完整通过记录，没有任何失败 record，附件全部读回一致。
- 退出码 `2`：证据不完整或当前构建有失败 target。
- 退出码 `1`：schema、路径、字节数、SHA-256 或 I/O 失败。

当前构建只要有一条最终失败 Record，就不能用后续成功 Record 抵消。修复后必须生成新 commit/build ID 和新 Bundle。

进入 S9.6 候选时，`stage9.stage6-device` Evidence Statement 只登记该目录的 `device-evidence.json` 顶层索引。Readiness producer 会复用同一 verifier 重新打开全部日志、截图和录像，再重算固定 Stage 6 Definition 的 Report；不接受 CLI stdout 摘要或人工 `ready`。

## E4 执行顺序

E3 全部通过后才开始计入 E4 样本，避免把设备/宿主缺陷误计为玩家不理解。

1. 打开独立 `pilot.html`，确认页面显示 `Web · 手机 · 竖屏 · 触控`。
2. 每位受测者只获得“移动并把对手击出平台”，不说明按钮、手势或上下文优先级。
3. 受测者不得知道 Mapper 方案、Bot 身份或难度。
4. 观察者只记录可见行为，结束后再填理解度。
5. 每个 Mapper 至少 5 名未接触本项目的新手；已学习一个方案的人不能作为另一方案的首次样本。
6. 导出匿名汇总与审计包；不在即时结果中手动修改分组或删除不利样本。
7. 只有 Report 达到既定门槛时才进入 Mapper 冻结评审；指标冲突或差距小于 10 个百分点时不宣称胜者。

## 隐私与保留

- operator 使用项目内匿名编号；不在 Manifest、文件名、日志或录屏中写真实姓名、账号、手机号或设备唯一标识。
- E3 录屏不录入旁观者/受测者脸部、声音、通知内容或其他 App。
- E4 只使用 Pilot 匿名编号；不把 E3 设备 Manifest 与 E4 参与者记录合并。
- 原始录屏与日志的保留时间在真正采集前由项目方确认；在没有政策前不上传公开仓库。
