# Arena Stage 6 S6.6.3a 盲测持久化基础门禁记录

## 结论

2026-07-18 的 S6.6.3a 已建立有结果的三端同步 Storage Contract、版本化 Pilot Workspace、A/B 双槽 Repository、协作 lease、跨刷新 checkpoint 合同，以及 A/B 同区组共享 match seed。当前 370 项全仓单测通过。

本批只关闭“平台存储、聚合一致性和恢复协议”的本机 E1/E2 基础，不关闭 S6.6.3：尚未实现 Trial Controller、终局原子提交、观察者/受测者表单、去标识导出和独立 Web 采集入口，也没有微信/抖音开发者工具或真人 E4 证据。

## 模块所有权

```text
Platform Storage Contract
        ↓ rich sync result
InputPilotStoragePort
        ↓
InputPilotStorageLease ── one cooperative writer
        ↓
InputPilotWorkspaceRepository ── A/B slot + readback + expected revision
        ├── InputPilotWorkspaceEnvelope ── generation + hash + version probe
        ↓
InputPilotWorkspace
  ├── Enrollment snapshot
  ├── one active TrialCheckpoint
  └── terminal InputPilotRecords
```

- Platform adapter 负责把宿主异常折叠为明确的 `ok/found/boolean`，Pilot 层不依赖 Web、微信或抖音 API。
- Workspace 是持久化聚合根，强制每个 assignment 恰好处于 active 或 terminal 状态。
- Repository 只负责校验、恢复和提交，不决定 trial 状态转换，也不创建 MatchSession。
- Checkpoint 与 Record 复用同一组 device、eligibility 和 automated field validator，没有第二套字段真相。
- `wallNow` 只进入 lease；试验时长继续来自 authority active tick。

## 版本与确定性

- `InputPilotAssignment` schema 从 V1 升至 V2，新增 `matchSeed`。
- 同一个两人 block 的 A/B assignment 使用同一 match seed，相邻 block seed 不同；participant ID 仍只改变 assignment 身份，不改变该 enrollment index 的 variant 或 match seed。
- 当前尚无真人 V1 assignment，因此明确拒绝旧合成快照，不引入无数据可迁移的兼容分支。
- 独立 Workspace Envelope 模块负责 generation、hash、规范化和未来版本探测；Repository 只编排 lease、槽选择、CAS 与生命周期。
- Workspace envelope、payload 与全部嵌套持久化对象都检查未来 schema；未来版本不会作为普通损坏被旧包覆盖。

## 故障与生命周期策略

- slot 读取失败：打开失败并释放已取得 lease，不创建默认 Workspace。
- 普通损坏：回退最高有效 revision；两槽都损坏时只在内存创建默认 Workspace，直到一次写入读回成功才形成新有效槽。
- 未来版本：停止打开并保留原值。
- slot 写失败或读回不一致：不推进内存 revision，也不更新 head。
- head 写失败：读回确认的新 slot 仍算提交成功，下次按 revision 恢复。
- 同 revision 不同 payload hash：硬失败，不猜测赢家。
- lease 竞争、过期、被替换或墙钟倒退：停止当前写入；destroy 释放或报告未能确认的清理失败。
- 异步 Storage/ledger 回调：同步合同立即拒绝，并吸收迟到 Promise rejection，避免逃逸到 App 生命周期。

协作 lease 不能宣称跨浏览器进程的强事务；当前 V1 只允许一个观察者采集页面。该限制和未来替换路径见 [ADR-013](../decisions/013-arena-pilot-local-evidence-workspace.md)。

## 平台语义复核

- Web 通过 `localStorage.getItem()` 的 `null` 区分缺失，并把 JSON 解析、序列化、容量和删除异常转为失败结果。
- 小游戏优先读取 `getStorageInfoSync().keys`；抖音 `getStorageSync` 对缺失 key 可能抛出 `100599 data not found`，adapter 将它归一为“成功但不存在”，其他错误仍失败关闭。
- 参考官方文档：[抖音 `tt.getStorageSync`](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/api/data-caching/tt-get-storage-sync)、[抖音 `tt.getStorageInfoSync`](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/api/data-caching/tt-get-storage-info-sync)。微信/抖音最终行为仍需开发者工具和目标真机 E3，Node fixture 不能代替宿主证据。

## 当前自动化证据

定向测试覆盖：

- Assignment V2 可复现、区组 A/B 平衡、同 block match seed、篡改与旧 schema 拒绝。
- Workspace 覆盖、重复 trial、active/terminal 冲突、Checkpoint phase/automated 约束。
- Storage Port 同步返回值、Promise rejection containment、lease 竞争/续租/接管/释放/损坏/未来版本。
- Repository 双槽轮换、重开恢复、head 失败、槽写失败、读取失败清理、单槽/双槽损坏、同 generation 冲突、未来 envelope/workspace/嵌套 schema。
- Web 与小游戏 Storage 的缺失、正常读写删除、宿主错误和抖音 `100599`。
- 架构测试继续证明 Pilot 是可选的无渲染 Presentation adapter，不进入 Authority、正式 Session 或平台全局。

本批次最终本机证据：

```text
npm test
npm run arena:session:soak
npm run build
git diff --check
```

- `npm test`：370/370 通过。
- `npm run arena:session:soak`：100/100 局完成，100 个唯一 match seed；9 次前后台、6 次 context restore、14 次 resize；残留 frame/listener/input 均为 0；GC 后堆增长 `2,338,584B < 8,388,608B`。
- `npm run build`：Web、微信、抖音构建成功；Web 主 chunk `839.07kB`、gzip `219.28kB`。既有超过 650kB 警告保留为 Stage 9 真机测量与拆包事项，本批新增持久化模块尚未进入正式游戏入口。
- `git diff --check`：通过。

## 尚未证明

- 尚未把 EnrollmentLedger 与 Workspace CAS 编排为一次“入组 + active checkpoint”事务。
- 尚未在比赛结束、超时、中断和刷新恢复时形成一次终态 record。
- 尚无观察者计数表单、受测者复述表单、原始记录导出和聚合报告 UI。
- 尚无独立 Web pilot 入口、截图或触屏小屏验收。
- 尚无微信/抖音开发者工具、目标真机 E3 或每方案五名新手 E4。
- 尚未冻结 Mapper、Gesture 参数或正式动画生产输入。
