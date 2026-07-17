# ADR-009：Arena 使用语义输入与独立 Movement 权威

## 状态

已接受 Rule/Core 边界。A/B Mapper 的产品胜者仍要等 S6.6 盲测后追加决策结果。

实施进度：S6.1 已建立 Character/Input/Replay V4 合同；S6.2 已建立 MovementSystem、多通道 ActionResolver、多 lane ActionExecution、原子 Physics mutation batch 与 next-tick ActionAffordance；S6.3 已建立受限 Bot Movement 观测、语义移动策略和真人时序调度器。S6.4 当前候选已建立 Raw/Gesture/Sampler/A-B Mapper、`primaryHold` 只读资格、三端 Pointer Adapter 和键盘调试路径，并通过本机输入竞态、回放及帧率门禁。S6.5 灰盒/三端 E3 与 S6.6 盲测仍未完成，不能据此视为 Stage 6 完成或冻结 Mapper 胜者。

## 日期

2026-07-17。

## 背景

Stage 5 的 `InputFrame` 只包含二维移动与一个动作布尔值。Stage 6 将加入走、跑、普通跳、蹲跳、二段跳、下砸、上下文攻击和机关互动。如果手势层直接判断动作，UI、Bot 和 MatchCore 会形成不同规则；如果把跳跃直接塞进 Physics，输入缓冲、跳跃预算、硬直和动作优先级又会分散到多个写入者。

同时，单动作键的 A/B 方案还没有真机证据，不能为了先做画面而冻结错误合同。

## 决策

### 1. 平台输入先映射为语义输入

Pointer、像素坐标、手势时间和平台事件只存在于 Presentation Input Adapter。可替换 `InputMapper` 在固定 tick 边界输出版本化 `InputFrame`；Replay 记录的是规范 InputFrame，不记录原始触摸事件。

InputFrame 表达 `primary`、显式 `jump` 和显式 `slam` 意图，但不表达最终选中的装备、攻击或跳跃动作。玩家和 Bot 使用完全相同的 InputFrame schema。

### 2. ActionResolver 是上下文选择的唯一入口

装备、基础攻击、跳跃、下砸和互动都提交 ActionCandidate。Resolver 按意图通道、lane、优先级、冲突标签和稳定 ID 选择动作。

方案 B 的“无可攻击目标时跳跃”由 Rule 的候选可用性完成；InputMapper 与 HUD 都不能复制命中距离或动作优先级。HUD 只显示由同一 Rule 投影出的 `ActionAffordance`。

### 3. MovementSystem 独占移动规则状态

PhysicsWorld 继续独占位置、速度、接地和支撑面；MovementSystem 独占 coyote、jump buffer、空中跳预算、蹲跳蓄力和下砸模式。MovementRuntime 不复制 grounded，也不持有 Physics body 或 Definition。

移动动作经 ActionResolver 选择后生成命令，MovementSystem 预校验并更新规则状态，Physics Port 接收最终冲量。下砸落地等效果由权威 contact transition 触发，动画事件没有玩法权限。

### 4. Character 玩法数据进入不可变 Definition

碰撞、走跑、加速度、跳跃和台阶参数从散落配置迁入 `CharacterDefinition + CharacterRegistry`。角色模型和外观插槽使用独立 Presentation Definition，不进入 rule content hash。

共享 Authority Content 同时验证 Action、Equipment、Map 与 Character 引用；新增角色不修改 MatchCore 分支。

### 5. 保持固定且显式的阶段编排

模块继续细分，但固定 tick 的输入校验、计时推进、contact 读取、候选生成、动作解析、命令提交、Physics step、事件收集和 Replay 提交顺序必须集中可读。改变顺序属于 ruleset 语义变化。

Stage 6 提升 Match/Replay schema；旧回放显式拒绝。Renderer FPS、A/B Mapper、动画、音效和相机均不得进入 authority hash。

### 6. A/B 只替换映射，不复制规则

Mapper A 使用移动区手势产生显式 jump/slam；Mapper B 使用 primary 上下文回退和向下拖动。两者实现同一接口、接受同类只读提示并生成同一 InputFrame。

两个方案都先进入灰盒；最终只按 10 秒上手、误触、意图匹配和单手完成数据冻结，不以开发便利决定。

## GitHub 借鉴

- Leafwing Input Manager `5533c5f1707e5c9ba604e6bcbb5524e507746d65`（MIT/Apache-2.0）：物理输入与逻辑 action state 解耦、多输入到多动作映射、冲突消解和可测试输入状态。
- Ev01 PlatformerController2D `178b1df40dd9ec40841893807d5ea3da819931d0`（MIT）：coyote、jump buffer、double jump 分离，以及悬崖离地错误恢复跳数的实际修复。
- NoelFB/Celeste `1b0ce45c75e05649ae91b44a8bb6b196684e4352`（MIT）：高度耦合的角色移动需要显式执行顺序；动画逻辑应从角色规则分离。
- Godot Demo Projects `9ed97d10cac6750ec2f84441d2a7c64b3f527a08`（MIT）：平台输入动作、角色物理和表现节点之间的边界。

只吸收模式与失败经验，不复制代码，不新增第三方依赖。

## 考虑过的替代方案

### InputMapper 直接输出最终动作 ID

实现快，但会让方案 B、Bot 和 HUD各自知道装备、命中和跳跃资格，形成第二套规则。拒绝。

### PhysicsWorld 自己处理跳跃和二段跳

能少一个模块，但 Physics 将拥有输入缓冲、动作资格和角色差异，未来替换物理后端会改变玩法。拒绝。

### 一个大型 PlayerController 同时处理输入、物理和动画

执行顺序直观，但无法无渲染测试，也会让 Bot、Replay 与角色资产绑定。保留“顺序集中可读”的优点，拒绝“状态和权限集中在一个类”的实现。

### 立即引入通用输入框架或完整 ECS

当前三端触控合同、实体规模和性能没有证明依赖成本合理。使用项目内小接口，未来通过 Adapter 替换。拒绝当前引入。

### 先选 A 或 B 再实现

缺少真机盲测，容易把错误的手势假设写进权威合同。两个方案只替换映射，共享规则与测试。拒绝提前冻结。

## 后果

- Stage 6 前半段仍没有正式画面，但输入、Bot、Replay 和动作提示不会分叉。
- Match/Replay schema 与规则内容签名需要提升，旧回放不能静默兼容。
- 文件与测试数量增加，但 Character、Movement、Mapper、Gesture 和 Presentation 生命周期均可独立替换。
- ActionResolver 需要从单结果扩展为按 lane 的稳定批次，同时保持当前装备与基础攻击兼容测试。
- 真机盲测前所有手感数值保持数据化候选，不宣称发行冻结。

## 验收门禁

- Character Definition 深冻结、Registry 引用完整、运行时不持有表现对象。
- InputFrame 严格、可回放，Pointer/墙钟/A-B ID 不进入权威状态。
- coyote、buffer、二段跳、蹲跳和下砸有 tick 边界、失败关闭和回放测试。
- Bot 只输出同一 InputFrame，不读取未来 contact、落点或隐藏动作资格。
- UI 动作提示与实际 Resolver 使用同一候选来源。
- App hide/show、pointer cancel、catch-up 和 destroy 不留下 held 输入或迟到回调。
- 关闭 Presentation 后事件与最终 replay hash 一致。
