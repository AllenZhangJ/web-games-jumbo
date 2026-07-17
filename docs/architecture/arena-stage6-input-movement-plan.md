# Arena Stage 6 输入、移动与灰盒执行计划

## 状态

执行中。本文冻结实现边界与验收顺序，不提前冻结 A/B 输入方案的产品胜者。Stage 6 继续按 `Rule → Core → Bot → Presentation` 分批落地。

S6.1～S6.5.4 已提交并推送；Web 真实浏览器桌面/竖屏、结果/重赛闭环和 100 局 Session soak 已完成。S6.6.1 当前候选已建立版本化盲测合同、确定性区组分配和聚合报告，但采集入口与真实新手样本尚未开始。微信、抖音开发者工具与目标真机 E3 仍未执行，因此 Mapper 胜者和手势阈值仍未冻结。

逐项完成证据与阻断级门禁见 [Stage 6 验收与证据矩阵](../quality/arena-stage6-verification-matrix.md)。

## S6.5 当前边界与缺口

截至已提交的 S6.5.4：

- `InputFrame V4` 的 `primary/jump/slam` 已进入同一 Resolver/Movement/Physics 权威链路。
- `BotObservation` 已只投影公开 MovementSnapshot/ActionAffordance；当前自身状态可即时读取，对手和世界仍按难度延迟。
- Bot 只生成 V4 `InputFrame`，走、跑、跳、蹲跳、二段跳和下砸继续通过同一 Resolver/Movement/Physics 链路。
- RawControlState、InputSampler、Gesture Recognizer、Mapper A/B 和平台 Pointer Adapter 已拆分实现；Pointer、像素、墙钟和 Mapper ID 均未进入权威帧。
- 方案 B 的点击、长按和下拖只读取 Rule 投影的 `ActionAffordance`；输入层不复制命中距离、装备优先级或动作 ID 选择。
- 本机已覆盖多指、同帧按下释放、乱序/陌生 pointer、resize、暂停恢复、迟到回调、重入 destroy、回放和外层帧率差异；证据见 [S6.4 输入与竞态门禁记录](../research/arena-stage6-input-results.md)。
- Arena 已有只读投影、程序化灰盒 Renderer、HUD、输入路由、固定帧循环和唯一 Session 组合根；默认三端入口不再加载旧数值跳台 runtime。
- Web 已完成桌面与 390×844 竖屏运行、动作键、比赛结束和重赛冒烟，fresh tab 为 0 error / 0 warning；100 局 soak 后 RAF、生命周期监听器、Canvas 监听器和输入绑定均归零。
- 微信、抖音目前只有构建和宿主合同 E2，尚无两端开发者工具、目标真机触控、前后台、WebGL context loss 与安全区 E3。

因此当前可以完成 S6.5 的本机 Web 门并准备两端开发者工具 E3，但不能用 Web 或 Node soak 代替微信/抖音真机证据，也不能在 S6.6 盲测前冻结 Mapper 胜者和手势阈值。

## 目标依赖链

```text
Platform Pointer / Keyboard（非权威）
                  ↓
        RawControlState + InputSampler
                  ↓
      InputMapper A / InputMapper B
                  ↓
        InputFrame V4（可录制）
                  ↓
 CharacterDefinition + MovementSystem
                  ↓
 Candidate Provider → ActionResolver
                  ↓
 ActionExecution + RuleCommandRegistry
                  ↓
          MatchCore → Physics Port
                  ↓
     MatchSnapshot + PresentationEvent
                  ↓
       Arena Renderer / HUD / Audio
```

Bot 不经过 Pointer、Gesture 或 InputMapper；它直接生成同版本 `InputFrame`，并与玩家经过完全相同的 Rule、Movement、Action 和 Physics 链路。

## 权威所有权

| 数据 | 唯一写入者 | 说明 |
|---|---|---|
| Pointer ID、触点、像素坐标 | Platform Input Adapter | 不进入 Core、Replay 或 hash |
| 手势候选、摇杆中心、按键按住 | RawControlState | 表现层可清空、不可决定玩法 |
| 当前 tick 的语义输入 | InputMapper + InputSampler | 只生成 `InputFrame`，不修改 Match |
| 位置、速度、接地、支撑面 | PhysicsWorld | 继续是接触真相 |
| coyote、buffer、跳跃预算、移动模式 | MovementSystem | 不在 Physics、Bot 或 Renderer 重复维护 |
| 动作选择与优先级 | ActionResolver | UI 不能自行判断“此时该攻击还是跳” |
| 动作阶段、前摇、有效期、恢复 | ActionExecutionSystem | 允许按 lane 管理，不建立第二套计时器 |
| 生命、比赛阶段、编排顺序 | MatchCore | 不吸收手势、动画或平台生命周期细节 |
| 当前动作提示 | Authority Snapshot Projector | 与实际候选共用规则，HUD 只显示结果 |

`grounded` 不复制进 MovementRuntime。MovementSystem 每 tick 读取 Physics 快照并维护只属于规则的计数器；公开 `MovementSnapshot` 是两者组合后的只读投影。

## 数据合同

### CharacterDefinition

Stage 6 先引入真正的不可变 `CharacterDefinition`、`CharacterRegistry` 和 Arena V1 内容目录。权威 Definition 只包含玩法数据：

- 稳定 ID 与 schema 版本。
- 半径、半高、质量等碰撞参数。
- 走/跑阈值、地面/空中加速度和最大速度。
- 普通跳、蹲跳、二段跳和下砸参数。
- coyote tick、jump buffer tick、最大空中跳次数和自动台阶高度。

模型、材质、骨骼、衣服、翅膀和拖尾路径不进入该 Definition；Stage 7 使用单独的 Presentation Definition 按稳定角色 ID 绑定。

Map 安全校验必须读取实际注册并被本局选中的 CharacterDefinition，而不是继续读取散落常量。

### InputFrame V4

建议将旧 `actionPressed/actionHeld` 明确升级为语义通道：

```text
tick
participantId
moveX / moveZ
primaryPressed / primaryHeld
jumpPressed / jumpHeld
slamPressed
```

- `primary` 表示“请求上下文动作”，不是“直接攻击”。
- `jump` 表示显式跳跃意图，供方案 A 使用。
- `slam` 表示显式向下动作；不能由 Renderer 直接施加速度。
- 字段使用严格布尔值和有限归一化向量，缺失帧仍转中性输入。
- Pointer、墙钟时间、屏幕坐标、A/B 方案 ID 都不进入权威帧。

Match/Replay schema 升至 V4；如果垂直物理语义发生变化，`physicsBackendVersion` 同步提升。旧回放显式拒绝，不做隐式字段补齐。

### MovementRuntime

每个 participant 独立保存最小可序列化状态：

- 当前 movement mode。
- coyote 剩余 tick。
- 缓冲的跳跃意图及剩余 tick。
- 已消费的空中跳次数。
- 蹲跳蓄力 tick（若实验方案启用）。
- 下砸是否已提交以及等待落地的动作 ID。

Runtime 不保存 Registry、Physics body、Renderer、回调或墙钟对象。Serializer 与 state hash 必须覆盖全部权威字段。

## 统一动作解析

### 意图通道与动作 lane

`ActionDefinition.input` 增加显式意图通道；Action Candidate 声明 lane 与冲突标签：

- `combat`：基础推击与装备动作。
- `locomotion`：普通跳、蹲跳、二段跳、下砸。
- `interaction`：后续机关互动。

ActionResolver 仍是唯一选择入口，但可以返回每个互斥 lane 至多一个选择。显式冲突标签处理硬直、全身动作和禁止空中控制；不能用 participant 遍历顺序或 Registry 注册顺序决定结果。

同 tick 同时出现显式 jump 和 primary 时，可以在配置允许下分别选择 locomotion 与 combat；同一个 primary 意图不能同时触发攻击和跳跃。

### 上下文动作

方案 B 的 primary 回退必须由 Rule 判断：

1. 可使用且有明确目标/自用语义的装备动作。
2. 可交互机关。
3. 当前可命中的基础动作。
4. 合法的地面跳或二段跳。
5. 无合法候选时返回 `none` 或带原因的 `ignored`。

这要求基础攻击候选不再永远报告 available，而是使用与实际 Targeting Strategy 相同的纯查询结果。HUD 的按钮图标和提示读取 Core 输出的 `ActionAffordance`，不在 UI 中复制优先级。

### 垂直动作命令

动作效果只能产生可校验命令，例如：

- `request-ground-jump`
- `request-air-jump`
- `begin-crouch-jump`
- `begin-down-smash`

MovementSystem 先验证完整命令批次，再更新跳跃预算或模式；Physics Port 只接收最终限幅冲量。任一 mutation port 失败时 MatchCore fail closed，不在部分提交状态继续运行。

下砸落地由 Physics 接触变化驱动 Movement Transition，再由 Rule 产生范围效果和权威事件；动画落地帧不能补判。

## 固定 tick 顺序

Stage 6 应将顺序保持在一个可读编排器中，模块虽细但不能隐藏执行先后：

1. 克隆并校验全部 InputFrame。
2. 推进 Action、Equipment、Movement 计时器。
3. 读取上一 tick 完成后的 Physics 接触快照。
4. MovementSystem 更新 coyote、buffer、落地与跳跃预算。
5. 各 Candidate Provider 生成不可变候选。
6. ActionResolver 按意图、lane、优先级和稳定 ID 解析。
7. ActionExecutionSystem 推进选中动作并生成命令。
8. 完整批次预校验后提交 Movement、Physics 和状态效果。
9. 设置二维移动意图并推进固定步长 Physics。
10. 收集新接触、淘汰、拾取、地图和动作事件。
11. 提交快照、事件、Replay frame 与 state hash。

任何顺序调整都属于 ruleset 语义变化，必须有回放版本或内容版本边界。

## A/B InputMapper

| 行为 | 方案 A：移动手势承担机动 | 方案 B：右键上下文化 |
|---|---|---|
| 走/跑 | 摇杆幅度 | 摇杆幅度 |
| 普通跳 | 左侧向上短划 → `jumpPressed` | 右键 primary 无高优先候选时回退 |
| 二段跳 | 空中再次向上短划 | 空中 primary 无高优先候选时回退 |
| 下砸 | 左侧向下短划或独立下划区 → `slamPressed` | 右键向下拖 → `slamPressed` |
| 攻击/装备 | 右键 `primary` | 右键 `primary` |
| 蹲跳实验 | 上划保持/释放映射为 jump held | primary 被 Rule 保留为跳跃候选时保持/释放 |

两个 Mapper 实现同一个严格接口，并共享 dead zone、手势距离、最大保持时间等不可变配置。Mapper 不能导入 MatchCore、RuleEngine、EquipmentSystem 或 Physics；方案 B 所需上下文由 authority 的只读 `ActionAffordance` 表达。

InputSampler 对每个固定 tick 只消费一次 pressed/released edge，held 状态可以连续采样。发生 App hide、pointer cancel、失焦、入口替换或 destroy 时必须清空全部 held/edge，并要求新触点重新开始，避免恢复后卡住移动或动作。

## 分批实施

### S6.1 合同与 Character 基础

- CharacterDefinition、Registry、Runtime 引用和共享内容目录。
- InputFrame V4、Replay V4、state hash 与旧版本拒绝测试。
- Authority content hash 纳入 Character 与 Movement 数据。

门禁：仍可使用中性新字段跑完现有 Stage 5 全部回放和压力脚本。

### S6.2 Movement Rule/Core

- 状态：当前候选已实现，证据见 [S6.2 Movement 门禁记录](../research/arena-stage6-movement-results.md)。
- MovementRuntime、Serializer、System、Candidate Provider、Command handlers。
- 普通跳、coyote、jump buffer、二段跳、蹲跳与下砸。
- ActionResolver lane/冲突模型和 ActionAffordance。

门禁：纯 Node 完成所有动作边界、同 tick 冲突、失败关闭、Replay 和 fuzz 测试。

### S6.3 Bot 接入

- 状态：当前候选已实现，证据见 [S6.3 Bot 移动与公平性门禁记录](../research/arena-stage6-bot-movement-results.md)。
- BotObservation 只增加公开 MovementSnapshot 与 ActionAffordance。
- Bot 通过相同 InputFrame 发出 jump/slam，不调用移动命令。
- 难度仍只改变观察延迟、规划质量、失误和反应时间。

门禁：三档均能合法避险和二段跳；没有未来落点、完美边缘帧或无限空中修正。

### S6.4 输入适配器

- 状态：当前候选已完成本机 E1/E2，证据见 [S6.4 输入与竞态门禁记录](../research/arena-stage6-input-results.md)；三端 E3 随 S6.5 可视入口验收。
- RawControlState、InputSampler、Gesture Recognizer。
- Mapper A/B 与可注入配置。
- 键盘调试 Adapter 使用相同语义合同。

门禁：多点触控、乱序 cancel、同帧按下释放、暂停恢复、catch-up 多 tick 和 destroy 后迟到回调均有测试。

### S6.5 灰盒表现与完整生命周期

- Arena Presentation Session、正交相机、程序化角色与地图。
- HUD、上下文动作提示、匹配转场、结算、再来一局。
- Renderer 只消费快照和去重事件；资源所有权按 Session 释放。

门禁：Web、微信、抖音连续多局无监听器、帧循环、纹理、几何体或 Session 泄漏。

### S6.6 盲测与冻结

- 状态：S6.6.1 当前候选已建立 Definition、固定 seed 区组分配、原始记录校验和只给出候选的聚合报告；详见 [S6.6 输入盲测合同记录](../research/arena-stage6-input-pilot-contract.md)。采集入口、单写入入组账本和真实样本仍待实现。
- 分别测试 A/B，不向受测者解释隐藏优先级。
- 记录首次有效移动时间、首次正确动作时间、误触率、意图不匹配率、单手完成率和主动纠错次数。
- 使用相同地图、seed 分层与角色碰撞数据，避免内容差异污染结果。
- 冻结胜出 Mapper 和阈值；未胜出 Mapper 保留到独立实验分支或删除，不在生产包维持双重路径。

## 必测边界

- 离地后的 coyote tick 恰好生效，不因离开悬崖额外重置二段跳。
- 落地前的 buffer 在合法首 tick 消费且只消费一次。
- 同 tick 落地与跳跃、淘汰与跳跃、硬直与跳跃有稳定顺序。
- 二段跳不因 contact 抖动、台阶探测或 disabled surface 重复恢复。
- 下砸不能在地面、重生、淘汰、硬直或非法 surface 上启动。
- 非有限输入、重复 participant、未来 tick 和未知字段在状态修改前拒绝。
- 输入回放不依赖 Renderer FPS、Pointer 事件数量或 A/B Mapper 实例。
- 关闭 Renderer、动画、音频和震动后，事件序列与最终 hash 不变。
- Bot 与玩家在相同规范帧下得到相同动作资格、冲量和冷却。

## GitHub 借鉴与许可证

- Leafwing Input Manager，commit `5533c5f1707e5c9ba604e6bcbb5524e507746d65`，MIT/Apache-2.0：借鉴物理输入到逻辑 ActionState 的多对多映射、可测试 action state 和输入冲突消解；不引入 Bevy/Rust 依赖。
- Ev01 PlatformerController2D，commit `178b1df40dd9ec40841893807d5ea3da819931d0`，MIT：借鉴 coyote、jump buffer、double jump 分离计数器及“离开悬崖不能凭空多一次跳跃”的回归边界；不复制 GDScript。
- NoelFB/Celeste Player 说明，commit `1b0ce45c75e05649ae91b44a8bb6b196684e4352`，MIT：借鉴“执行顺序必须集中可读、动画应独立于角色规则”的经验；不复制角色实现。
- Godot Demo Projects，commit `9ed97d10cac6750ec2f84441d2a7c64b3f527a08`，MIT：借鉴平台输入动作与 CharacterBody/表现节点分离；不引入 Godot 运行时。

本计划没有复制第三方代码、资源或配置，不新增运行时依赖，因此当前不需要修改第三方分发清单。若实现阶段复制任何片段，必须先单独记录来源文件、固定 commit、许可证和本地改写范围。

## 现在不需要冻结的数值

coyote tick、buffer tick、跳跃高度、二段跳高度、蹲跳蓄力、下砸速度、手势距离和摇杆走跑阈值都先作为 Definition/Mapper 配置进入灰盒。它们必须由自动化边界和真机盲测共同收敛，不能在无触控证据时写死为最终发行值。
