# Arena Stage 6 S6.4 输入与竞态门禁记录

## 结论

- 日期：2026-07-17。
- 范围：S6.4 Presentation Input 的本机 E1/E2 候选，不包含灰盒 Renderer、HUD 或 Arena Session。
- 结论：RawControlState、Gesture Recognizer、InputSampler、Mapper A/B、键盘调试 Adapter 和 Web/微信/抖音 Pointer 绑定已形成同一 V4 输入链路；本机自动化与 fuzz 通过。
- 未关闭：Web、微信开发者工具、抖音开发者工具中的多点触控、取消、前后台和真机手感 E3。该证据必须由 S6.5 可视 Session 提供，不能用 Node 结果替代。
- 产品决策：A/B 都保留为盲测候选；本记录不冻结胜者、手势阈值或发行手感。

## 已落地边界

- `RawControlState` 独占 pointer/control 所有权；每个 control 在边沿消费前最多容纳一次交互，同 tick start/end 后的第二次占用被拒绝。
- `GestureRecognizer` 只识别 contact、方向、短划与保持，不读取 Match、Rule、装备或 Physics。
- `InputMapper` 只生成 V4 语义字段。方案 A 用移动区上/下手势生成显式 jump/slam；方案 B 用右侧点击、长按和下拖生成 primary/hold/slam。
- 方案 B 只读取 Rule 投影的 `ActionAffordance.channels.primary/primaryHold`。合法 combat primary 保持高于蹲跳；无高优先动作时长按才进入上下文蹲跳。输入层不计算距离、装备冷却或最终动作 ID。
- `InputSampler` 在固定 tick 消费一次边沿；任一采样后错误进入终态失败关闭。hide、blur、cancel、resize、入口停止和恢复都会清空 held，并要求新触点。
- Web 使用 Pointer Events 与 window 级 move/up/cancel；微信/抖音逐个分发 changed touches；平台对象通过 Adapter 注入，不进入 authority。
- 键盘调试输入输出相同 V4 `InputFrame`，失焦清空按键，解绑/销毁后的迟到监听器保持惰性。

## 自动化结果

### 定向测试

- 输入、MatchCore 集成和架构定向命令共 29 项通过。
- 提交前全量 `npm test` 共 302/302 项通过。
- Mapper A 经真实 Core 完成地面跳、二段跳、显式蹲跳开始/释放和下砸。
- Mapper B 经真实 Core 完成上下文地面跳、上下文蹲跳开始/释放和下砸；有合法基础推击时长按不会误入蹲跳。
- Pointer Adapter 覆盖部分绑定回滚、hide/show、迟到回调，以及 start/stop cleanup 内重入 destroy。
- 30/60/120Hz 外层调度均采样 180 个相同 V4 帧，最终 `MatchSnapshot` 与 Core hash 一致，无 dropped time。

### `npm run arena:input:fuzz`

当前门禁参数为每套 Mapper 40 局，共 80 局、72,000 个固定 tick：

| 指标 | 结果 |
|---|---:|
| 完整比赛 | 80/80 |
| 唯一最终 hash | 80/80 |
| 完整回放复验 | 4/4 |
| 陌生 pointer move 拒绝 | 22,696 |
| 合法同帧 tap | 7,199 |
| 合法 move / end / cancel | 2,743 / 2,735 / 2,820 |
| resize | 878 |
| suspend/resume | 480 |
| Mapper A jump / slam / primary 边沿 | 218 / 521 / 3,408 |
| Mapper B primary / slam / context hold | 2,959 / 446 / 454 |

随机序列使用由 match seed 派生的具名 RNG；失败信息包含 Mapper、局序号和 seed。回放只记录规范 InputFrame，不记录 pointer 数量或 Mapper ID。

## fuzz 发现并固化的问题

第一轮 fuzz 复现了同一 control 在一个固定 tick 内完成 `start/end` 后，又被第二个 pointer 重新占用的问题。Raw 层能接受第二次 start，但单份 Gesture snapshot 无法无损表达两次完整交互，最终触发重复 start 并关闭采样器。

修复后，control 的 pending edge 在 `consumeSnapshot()` 前视为所有权栅栏；第二次占用返回 `false`，不会覆盖第一组边沿。该序列已加入 RawControlState 回归测试，避免靠重试掩盖竞态。

## GitHub 借鉴落点

- Leafwing Input Manager 的物理输入与逻辑 ActionState 分层，落实为 Platform Pointer → Raw → Gesture → Mapper → V4 Frame；没有引入 Bevy/Rust 依赖。
- Godot Demo Projects 的平台动作与角色物理分离，落实为 Mapper 不导入 Rule/Core/Physics，Renderer/平台事件不进入 Replay。
- Ev01 PlatformerController2D 与 Celeste 的移动计数器和显式执行顺序已在 S6.2 Rule/Core 使用；S6.4 不复制其平台输入实现。

本批没有复制第三方代码、资源或配置，不新增运行时依赖。

## 进入 S6.5 前仍需保留的门

- 用可视 Arena Session 在 Web、微信、抖音各验证多点触控、系统取消、hide/show、context loss 和恢复后新触点要求。
- Session 必须成为 RAF、Pointer Adapter、Core、Bot、Renderer 和资源的唯一生命周期所有者，并提供连续多局 soak。
- HUD 只能显示同一 `ActionAffordance`；相机、插值和程序化角色不得影响输入世界方向或 authority hash。
