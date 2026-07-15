# ADR-008：动作存档使用首帧后调度器

## 状态

Accepted

## 日期

2026-07-15

## 背景

`release-charge` 会在同一调用栈内创建跳跃并记录 replay。此前 `recordAction` 随即同步调用 Storage；Web 的 localStorage 和小游戏宿主存储都可能阻塞 JavaScript。即使桌面写入很快，也不应让平台存储位于松手到首个起跳帧的关键路径。

## 决策

1. recordAction 只追加 ReplayAction 并把最新 SaveEnvelope 放入 SaveScheduler。
2. 动作后的第一个成功 Renderer 帧只把 pending 存档标记为 ready，不执行写入。
3. 后续成功 Renderer 帧在 render 调用后 flush；此时首个起跳帧已有机会提交给浏览器。
4. 多个未刷新的动作合并为最新 Envelope。
5. Hide/PageHide/Destroy 绕过等待并立即 flush；clear save 先取消 pending。
6. 进程在 lifecycle flush 前被系统强杀时，允许最后一个 pending 动作丢失；该取舍已由项目负责人接受。

## 备选方案

### recordAction 立即写入

- 拒绝：一致性最强，但把不可控平台 I/O 放在释放热路径。

### 固定 setTimeout 防抖

- 拒绝：小游戏宿主计时和后台挂起行为不一致，且与真实渲染进度脱节。

## 后果

- 首跳表现优先于最后一次动作的立即落盘。
- SaveScheduler 有 pending、readyAfterRender、queued、flushes 和 failedFlushes 诊断。
- SaveEnvelope 格式和恢复算法不变。
