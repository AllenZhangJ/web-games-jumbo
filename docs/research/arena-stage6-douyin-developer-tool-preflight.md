# Arena Stage 6 抖音开发者工具预验收记录

## 结论

2026-07-18 使用抖音开发者工具 V4.5.3、iPhone 15 Pro 竖屏模拟器，对 Stage 6/当前 Product 默认入口做了设备执行前预检。预检发现并修复了“强制停止后旧租约阻断重启”和“宿主性能时钟单位导致对局加速”两个主流程问题。

本次运行使用未提交的 `arena-19b0e55ae66e-product-dirty` 构建，只用于发现问题和回归修复。没有连续录屏、真实多点触控、触摸 cancel、前后台中断或正式附件 Bundle，因此不是 `douyin-developer-tool` E3 Record，也不改变 Stage 6 的执行中状态。

## 2026-07-20 正式角色资产回归

在已登录的同一抖音开发者工具 V4.5.3 中导入并运行 `dist/douyin` 当前 Product 构建 `arena-e972bf830595-product-dirty`（Build Manifest hash `083341bb`）。运行环境为 iPhone 15 Pro 模拟器、iOS 15、393×852、DPR 3、安全区 top 59 / bottom 818、JS SDK/Core `4.8.0.7`。

- 本地“编译”完成并显示 `[Simulator]Compile End`，Product 主页正常显示。
- 进入对局后，KayKit Rogue/Skeleton GLTF 角色、手持武器/盾牌、屏外延展地图、移动摇杆、攻击与跳跃按钮均正常显示。
- 实际点击攻击、跳跃后对局继续运行；强制刷新会回到主页，重新进入对局成功，没有旧租约阻断。
- 编译、刷新、重新入局后的 Console 只有开发者工具自身的 `[TMG] use engine: helium`，未见项目运行时错误。
- 小游戏资源由宿主文件、图片和音频接口读取，Network 面板无请求不能用来推断 GLB/PNG/OGG 缺失；本次以模拟器画面和 Console 为预检依据。

本轮仍是 dirty 构建上的开发者工具预验收，没有上传、预览、真机调试或正式证据 Bundle，不能替代 Stage 6 E3、Stage 7 正式资产批准或 Stage 8 真机 Record。

## 发现与修复

### 强制停止后的 Profile lease

修复前，开发者工具停止模拟器不会给 Product Session 留出可靠的 release 时机，立即重启会进入“暂时无法开始/进度读取失败”，只能等待 60 秒租约过期。

修复后，小游戏平台声明 `single-active-runtime`，默认 Product 使用稳定 owner，并只在该组合路径启用同 owner revision 接管。每次运行另生成唯一 holder fencing token，避免相同 owner、相同毫秒的竞争者得到不可区分的租约。第一轮 holder 回归中，Storage 面板可见 owner 保持 `arena-product-douyin-single-active-runtime`，holder 从 `f9a7e52f…` 依次变为 `cc984b4c…`、`6def9c5a…`，revision 从 92 增至 93、95。

兼容性审计随后把新增 holder 的 lease 写入 schema 从 v1 提升为 v2：正式 v1（无 holder）可被新代码读取，旧代码遇到 v2 则按未来 schema 失败关闭。开发期中间产物的 v1+holder 被当前 dirty 构建替换为 v2 revision 1；再次强制停止后立即重启，holder 从 `92a2bb85…` 变为 `b68df99c…`，revision 增至 3，旧 holder/revision 不再具备写入资格，Console 无运行时错误。

### 抖音 performance clock 单位

开发者工具 Console 的受控测量为：

```text
真实墙钟增量 dd = 1002
tt.getPerformance().now() 增量 dp = 1001500
```

即当前抖音小游戏性能时钟以微秒增长，而 Presentation 帧循环要求毫秒。适配层归一后，在同一个自动化调用内连续截图，最新构建的倒计时在 `3001ms` 墙钟内从 `144s` 变为 `141s`；较早一次回归也从 `120s` 变为 `117s`。修复前约 2.2 秒会从 `77s` 跳到 `53s`。

## 已通过的预检项

- 393×852 竖屏、安全区、HUD、左摇杆和右动作键可见。
- Product 主页可启动 1v1；移动和动作输入有效。
- UI、对手名称、Console 和结算未出现 Bot 或难度信息。
- 一局完成后奖励 `EXP +100` 正常提交，没有再次出现奖励保存失败。
- “再来一局”进入新的 150 秒对局，双方初始生命均为 x1。
- 最新 v2 构建强制停止后立即重启，没有旧租约阻断；holder 更新并提升 revision。
- Console 无运行时异常；只有现有大文件和 ES6→ES5 跳过两条编译警告。

## 自动化回归

新增/更新的测试覆盖：

- 抖音 performance clock 微秒到毫秒归一。
- 单活动宿主同 owner 接管产生更高 revision，并 fence 旧实例。
- 默认租约仍拒绝同 owner 并发写入。
- Product Entry 不执行非法 options 访问器。
- Web 使用独立运行时 ID，研究页与 Product 复用同一个 ID helper。

截至本记录更新，提交候选已通过：

- 全量测试 `660/660` 与 `git diff --check`。
- 地图 100 局、移动 100 局、输入模糊 80 局和 Bot 三档配对 900 局；所要求的回放、动作、地图事件与难度顺序 gate 均通过。
- Presentation/Product Session 各 100 局浸泡，退出后帧、监听和输入绑定均归零，堆增长低于 8 MiB 门槛。
- Profile 故障注入 500 次提交和 Product 主流程 200 局。
- Web、抖音、微信三端 dirty 构建及 manifest 校验。

MatchCore CPU 门禁曾在开发者工具和其他任务占用资源时三次略高于 `0.25ms/tick`（`0.26904`、`0.25185`、`0.25762`）；基础提交的隔离干净基线为 `0.24394ms/tick`，且两者产出相同 tick、事件和结果。关闭模拟器并独占复跑当前候选后，1000/1000 局、1,026,775 tick、5 份回放、零不变量/非有限数，`averageCpuTickMs = 0.23131`，堆增长约 4.00 MiB/32 MiB，门禁通过。该阈值对同机负载敏感，正式 freeze 仍必须使用干净候选构建。

## 尚未证明

- Computer Use 的 click/drag 不能制造两个同时保持的真实触点，也不能可靠注入宿主 `touchcancel`；`multi-touch-ownership` 与 `cancel-clears-input` 尚未执行。
- 尚未执行按住时切后台→前台、恢复后必须新触摸的人工场景。
- 没有连续视频和正式日志附件，且构建来源为 dirty workspace。
- 没有抖音 iOS/Android 真机结果，Web/微信目标也未由本次预检覆盖。
- 该次预验收尚未采集或上传正式媒体。现行仓库策略已将原始录屏与日志的本地保留期固定为 7 天；内容寻址且去标识的正式 Evidence Bundle 按对应验收合同保留。

正式执行必须从干净 commit 生成新 build ID，人工完成全部通用检查，并按 [Stage 6 E3/E4 验收手册](../acceptance/stage6/README.md) 生成内容寻址 Bundle。
