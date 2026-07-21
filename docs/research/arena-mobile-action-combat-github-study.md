# Arena 手机动作战斗专项 GitHub 调研

## 文档状态

问题记录、成熟项目调研与首轮落地记录，更新于 2026-07-21。本轮没有引入新依赖、复制第三方代码或导入第三方资产；已按 `Rule → Core → Bot → Presentation` 将结论落实到 Gameplay V2，iPhone 13 Pro 真机热量与长时稳定性仍需用户复验。

## 本轮落地状态

- A1 已完成代码侧改造：角色插值向量复用；命中特效改为固定容量预热池；正式角色攻击 `AnimationAction` 入局预热，命中时不再临时创建动作、几何体或材质。
- A2 已完成权威入口：`arena-gameplay-v2-tuning.js` 统一配置移动速度、目标跳高、攻击三段时长、攻击范围和目标击退距离；高度/距离在组合阶段编译为确定性 impulse。
- A3 已完成首版：正式 GLTF 使用上半身 track mask 叠加攻击，程序化与 GLTF 视图均实现 `raise → swing → follow-through → retract`，锤、链、盾具有不同肘/腕曲线和武器缩放峰值。
- A4 已完成首版：赤手、锤、链、盾分别拥有空中攻击 Definition；Rule 只在显式战斗控制且 airborne 时生成高优先级候选；Core 执行向下初速、逐 tick 加速、最大速度和向下圆柱命中。
- A5 已完成自动门禁与浏览器前置；iPhone 13 Pro / iOS 26 / Chrome 的 10 分钟温升和贴身连续 30 次攻击仍必须在真机记录，不能由 Node 或桌面浏览器替代。

Better Combat 的学习结果具体落在“装备同时绑定地面/空中动作 ID、每段动作独立 timing/targeting/effects、候选合法性与开始/冷却分离”，而不是把现有单动作分支换个名字。Mesh2Motion 的学习结果具体落在“按解剖骨骼筛选上半身 tracks、下肢 locomotion 保持连续、动作按权威 tick 固定采样定位、预热后只切换 weight/time”；本轮没有使用其资产或运行时代码。

## 验收输入

项目方在 iPhone 13 Pro、iOS 26、Chrome 上复验后给出综合评分 `5/10`：

- 贴近对手攻击时仍会卡顿。
- 动作仍不够灵活，手臂缺少清晰的抬臂、收臂、挥臂过程。
- 跳起后的攻击应向下攻击并产生向下加速。
- 武器应在攻击有效阶段适度放大，收招后恢复原始大小。
- 武器击退距离、攻击范围、攻击速度、角色移动速度、角色起跳高度必须数据化配置，但不显示在游戏界面。
- 流畅度优化不得通过降低分辨率、抗锯齿或动作数量实现。

这次评分从上一轮 `4.3/10` 提升到 `5/10`，说明任意距离起手、基础打击反馈和跳跃姿态改动有效，但距离“灵活、合理、可深挖”的动作游戏仍有明显差距。

## 改造前代码基线（调研输入，现已关闭）

以下事实记录的是本轮实现开始前的代码状态，用于说明为什么选择 A1～A4；它们不是当前提交后的能力清单。当前落地状态以前文“本轮落地状态”和可复算测试为准。

### 改造前：已经数据化，但策划语义仍不完整

- `CharacterDefinition.movement.walkSpeed/runSpeed/groundAcceleration/airAcceleration` 已控制角色移动。
- `CharacterDefinition.jump.groundImpulse/crouchImpulse/airImpulse/downSmashSpeed` 已控制普通跳、蓄力跳、二段跳和下砸。
- `ActionDefinition.targeting.parameters.range` 已控制各动作攻击范围。
- `ActionDefinition.timing.windupTicks/activeTicks/recoveryTicks/cooldownTicks` 已控制攻击起手、有效、收招和冷却。
- 各武器击退目前配置为 `horizontalImpulse/verticalImpulse`，不是玩家提出的“击退距离”。实际距离还受质量、原速度、地面加速度、碰撞和边缘坠落影响，不能简单把字段改名。

当前主要缺口不是“所有数值都写死”，而是配置分散、命名偏物理实现，缺少一个面向内容制作的武器/角色调参入口，以及“高度、距离、每秒攻击次数”到整数 tick 和确定性物理参数的组合期编译。

### 改造前：动作系统已有基础，但层次不足

- GLTF 角色已有基础 locomotion action 和独立攻击 overlay，但攻击 overlay 仍是整段 clip 按权威阶段定位，尚未建立只影响上半身的骨骼遮罩或真正的 additive clip。
- 程序化角色已有武器差异姿态，但抬臂、命中挥臂和收臂主要由单一阶段进度控制，缺少 anticipation、contact、follow-through、retract 四段曲线。
- `movement.down-smash` 已能设置向下速度，但它仍是独立移动动作，不是“空中武器攻击”：没有武器专属向下命中盒、伤害/击退和落地硬直组合。
- 武器尚无只属于表现层的攻击缩放曲线。

### 改造前：贴身命中卡顿存在明确热路径嫌疑

- `ProgrammaticCharacterView.update()` 的位置插值仍逐帧创建 `THREE.Vector3`。
- `GreyboxEventEffects.consume()` 在 `HitResolved` 到达的瞬间新建 Group、几何体、多份材质和多个 Mesh；贴身命中恰好同时触发命中特效、hit-stop、镜头震动、音频和震动，是首要排查点。
- 音频已经使用按动作预加载的双 voice 池，方向正确；角色 `AnimationMixer.clipAction()` 也会复用同一 mixer/clip 的 action，但仍应在入局加载阶段预热全部会首次命中的动画 action 和 shader/material。
- 当前 `hit-stop` 有意冻结角色与装备动画 `42–75 ms`。真机主观“卡顿”可能混合了设计停顿与真实掉帧，必须把二者在性能探针中分开记录，不能直接删除打击停顿。

## 带着问题搜索成熟方案

### Three.js 官方动画系统

固定研究 commit：`34a5b176cc96f56441c1a8f8c0b5acd17a56e8c8`，MIT。

参考：

- [`AnimationAction`](https://github.com/mrdoob/three.js/blob/34a5b176cc96f56441c1a8f8c0b5acd17a56e8c8/docs/pages/AnimationAction.html.md)
- [骨骼 additive blending 示例](https://github.com/mrdoob/three.js/blob/34a5b176cc96f56441c1a8f8c0b5acd17a56e8c8/examples/webgl_animation_skinning_additive_blending.html)

可落地答案：

- 保留 idle/walk/run/jump 作为基础动作；攻击作为同时播放的 overlay，避免攻击时整个人突然换成另一套僵硬姿态。
- 使用 `weight`、`fadeIn/fadeOut`、`crossFadeTo` 和 `setEffectiveTimeScale` 控制叠加强度、进出速度和武器速度差异。
- 将攻击 clip 转为 additive 前必须明确参考帧；只保留脊柱、肩、上臂、前臂、手腕相关 tracks，腿和根运动继续消费 locomotion。
- 不能在每次攻击时复制 clip 或重建 mixer；入局时缓存 action，攻击只重置 time、weight、loop 和 tick 派生的相位。

### pmndrs/ecctrl

固定研究 commit：`e2f4eb899ab54787170f5472832efb0a238c0ef9`，MIT。

参考：

- [`Ecctrl.tsx`](https://github.com/pmndrs/ecctrl/blob/e2f4eb899ab54787170f5472832efb0a238c0ef9/src/character/Ecctrl.tsx)
- [`LICENSE`](https://github.com/pmndrs/ecctrl/blob/e2f4eb899ab54787170f5472832efb0a238c0ef9/LICENSE)

可落地答案：

- 将最大走/跑速度、加速、减速、跳跃速度、空中控制、下落重力倍率和最大下落速度暴露为控制器配置，而不是散落在 update 逻辑中。
- 动画只读取稳定语义状态，如 `IDLE/WALK/RUN/JUMP_START/JUMP_IDLE/JUMP_FALL/JUMP_LAND`；物理控制器不直接操纵模型骨骼。
- 热循环里的 Vector3、Quaternion、Ray 和查询结果容器长期复用，通过 `copy/set/multiplyScalar` 原地更新。
- 本项目只采用配置、状态语义和零热分配原则；不引入 React Three Fiber、Rapier 或 ecctrl 运行时，因为当前规模没有证据支持替换确定性 Core。

### GDQuest Godot 4 第三人称控制器

固定研究 commit：`821551577957a924ba9625c5131b60f2aaa46fcc`。脚本/场景为 MIT；项目美术资产为 `CC-BY-NC-SA-4.0`，不适合直接进入本项目商业资产池。

参考：

- [`character_skin.gd`](https://github.com/gdquest-demos/godot-4-3d-third-person-controller/blob/821551577957a924ba9625c5131b60f2aaa46fcc/player/character_skin.gd)
- [`player.gd`](https://github.com/gdquest-demos/godot-4-3d-third-person-controller/blob/821551577957a924ba9625c5131b60f2aaa46fcc/player/player.gd)
- [`LICENSE`](https://github.com/gdquest-demos/godot-4-3d-third-person-controller/blob/821551577957a924ba9625c5131b60f2aaa46fcc/LICENSE)

可落地答案：

- 将 gameplay controller 与 `CharacterSkin` 分离，skin 只接收 moving、speed、jump、fall、punch 等语义命令。
- walk/run 用连续 blend value，而跳跃/下落走显式状态转换；拳击使用 OneShot 覆盖层，不打断整个移动状态机。
- 移动速度、加速度、起跳冲量、持续按跳附加力和攻击冲量全部是导出配置。该结构验证了“低操作门槛 + 高表现灵活度”不需要让渲染层参与规则判定。

### Better Combat

固定研究 commit：`0707b34d0202958ed7e9f07a13f8718c016205d4`。许可证为 **All Rights Reserved**。

参考：

- [`WeaponAttributes.java`](https://github.com/ZsoltMolnarrr/BetterCombat/blob/0707b34d0202958ed7e9f07a13f8718c016205d4/common/src/main/java/net/bettercombat/api/WeaponAttributes.java)
- [`hammer.json`](https://github.com/ZsoltMolnarrr/BetterCombat/blob/0707b34d0202958ed7e9f07a13f8718c016205d4/common/src/main/resources/data/bettercombat/weapon_attributes/hammer.json)
- [`LICENSE`](https://github.com/ZsoltMolnarrr/BetterCombat/blob/0707b34d0202958ed7e9f07a13f8718c016205d4/LICENSE)

只作设计观察：

- 武器配置包含 range、持武器 pose、单双手、类别和攻击序列。
- 单次攻击包含 hitbox、移动速度倍率、范围倍率、角度、upswing、动画和音效；不同记录串联后自然形成连招。
- 这种“武器定义包含攻击序列，每一段拥有独立动作/范围/节奏”的数据形状值得重新独立设计。
- 因许可证不授权复用，本项目不得复制代码、JSON、动画、音效、命名表或作为依赖安装；只保留抽象问题清单。

### Mesh2Motion

固定研究 commit：`408db807d2d77fd2c96eb2fbd6517a7fa8106070`。README 声明平台代码 MIT、艺术/rig/动画 CC0。

参考：[`mesh2motion-app`](https://github.com/Mesh2Motion/mesh2motion-app/tree/408db807d2d77fd2c96eb2fbd6517a7fa8106070)

它适合作为离线动作制作候选：可给 GLB/GLTF 模型分配骨骼、测试动作并导出 GLB；最新提交还支持只导出动画与骨架。下一阶段可用它快速验证抬臂、挥臂、收臂和空中下劈 clip，但任何实际导出资产仍必须单独固定来源 revision、保存许可文本、生成内容摘要并通过 Formal Asset Intake，不能仅凭 README 直接入库。

## 建议的数据模型

### 角色 Definition

保持 `CharacterDefinition` 为权威、不可变、Registry 校验的数据：

```js
movement: {
  walkSpeed,
  runSpeed,
  groundAcceleration,
  groundDeceleration,
  airAcceleration,
  maximumHorizontalSpeed,
},
jump: {
  targetGroundJumpHeight,
  targetChargedJumpHeight,
  targetAirJumpHeight,
  downAttackStartSpeed,
  downAttackAcceleration,
  maximumDownAttackSpeed,
}
```

内容作者配置“目标高度”，组合阶段按固定 gravity 和 tick rate 编译为起跳速度/冲量；Core 仍只使用冻结后的确定性参数。现有 `groundImpulse` 可在 schema 迁移期保留为编译产物，不同时开放两套互相冲突的作者输入。

### 武器与动作 Definition

```js
weapon: {
  id,
  stanceId,
  attacks: [actionDefinitionId],
},
action: {
  timing: { windupTicks, activeTicks, recoveryTicks, cooldownTicks },
  targeting: { kind, parameters: { range, radius, angle } },
  knockback: {
    targetHorizontalDistance,
    targetVerticalHeight,
    settleTicks,
  },
  airborne: {
    mode: 'down-strike',
    startSpeed,
    accelerationPerTick,
    maximumSpeed,
    landingRecoveryTicks,
  },
}
```

- “攻击速度”以整数 tick 的三段 timing 为权威真值；可提供 `attacksPerSecond + phaseRatios` 作者预设，在组合阶段编译为 ticks，但不能在运行时混用两套计时。
- “击退距离”作为内容作者输入时，必须结合固定阻尼/停止时长编译为 impulse profile，并用无渲染模拟验证实际空旷地面距离容差。碰撞、空中状态和边缘仍会改变最终位移，UI/文档不能把它承诺成任何场景都精确相同。
- 攻击范围、速度和击退属于 Rule/Core；动作 clip、武器放大和挥线只属于 Presentation，两边通过 action ID、phase 和只读事件对齐。

### 表现 Definition

```js
presentation: {
  baseClipId,
  upperBodyOverlayClipId,
  boneMaskId,
  phaseCurveId,
  animationTimeScale,
  weaponScaleCurve: {
    idle: 1,
    windupPeak: 1.06,
    activePeak: 1.15,
    recoveryEnd: 1,
  },
}
```

武器放大只缩放手部 slot 下的武器 visual root，不能缩放角色骨骼、拾取碰撞体或权威攻击范围。缩放由权威 tick/phase 推导，不使用墙钟 tween；中断、受击、淘汰或换武器必须立即或短淡出恢复到 `1`。

## 原始分阶段实施计划

A1～A4 的代码项已按本文开头的“本轮落地状态”完成首版；A1 的真机命中窗口证据和 A5 全部真机项仍未完成。下列清单保留原始验收范围，不能把“代码已实现”解读为“iPhone 已通过”。

### A1：先消除近身命中热分配并建立证据

- 给性能探针增加 `HitResolved` 前后窗口、JS 长帧、effect pool 使用量、renderer.info 和设计 hit-stop 时长。
- 复用角色插值 Vector3；把 Pulse/DirectionalImpact 的几何、材质和 Mesh 变成有上限的对象池，入局时预热。
- 预热四类攻击 AnimationAction、命中特效材质/shader 和音频 voice；命中时只重置变换、颜色、透明度和生命周期。
- 在 iPhone 13 Pro 连续贴身攻击 30 次；验收必须区分“有意 hit-stop”与 `> 50 ms` 非预期长帧。

### A2：统一可配置数值入口

- 升级 Character/Action/Presentation Definition schema 和 Registry 校验，建立一个 Arena Gameplay V2 内容入口。
- 把移动速度、目标跳高、攻击范围、三段攻击时间和目标击退距离纳入版本化定义；旧 replay 通过 schema/migration 或固定旧内容版本继续复验。
- 增加边界测试、非法组合测试、同 seed/同输入 hash 测试和每把武器无渲染距离标定测试。

### A3：实现手臂四段动作和武器差异

- locomotion 继续驱动髋、腿和根；upper-body overlay 驱动胸椎、肩、上臂、前臂和手腕。
- 每把武器至少定义 `raise → contact/swing → follow-through → retract` 四段曲线，赤手、锤、链、盾拥有不同速度、双手约束、起手和收招。
- 正面攻击时脚步/髋部保持移动连续性；需要承诺感的重武器只降低移动倍率，不冻结输入读取。
- 武器缩放曲线与挥臂曲线同步，active 峰值后在 recovery 内回到 `1`。

### A4：空中下劈成为正式组合动作

- Rule 根据 grounded/airborne、装备和冲突 lane 产生候选，ActionResolver 统一裁决，不能由 Renderer 看见按键后自行下移角色。
- Core 在 windup 后施加向下初速度和逐 tick 加速，激活专属向下 hitbox；首次命中或落地只结算一次。
- 武器定义决定范围、击退、落地硬直和动作速度；Presentation 只播放向下挥臂、躯干收束、腿部配重和武器缩放。
- 覆盖二段跳后下劈、被打断、空中换武器禁止、边缘落空、落地同 tick 命中和回放一致性。

### A5：手机动作与热量验收

- iPhone 13 Pro / iOS 26 / Chrome：远距离空挥、贴身连打、跑动攻击、普通跳攻击、二段跳下劈各 30 次。
- 视觉检查抬臂、挥臂、接触、随挥、收臂均可辨；武器只在攻击期间放大，任何中断后不残留尺寸。
- 记录 10 分钟常态/高频命中的 FPS、长帧、draw calls、三角形、内存趋势和设备热感；不得以降低 DPR、关闭抗锯齿或减少关节动画作为通过手段。

## 采用边界

- 直接使用：项目已依赖的 Three.js `AnimationMixer/AnimationAction/AnimationUtils` 官方能力。
- 模仿实现：ecctrl 的配置与热对象复用原则、GDQuest 的 controller/skin 分层；实现必须按本项目接口和确定性规则重写。
- 离线候选：Mesh2Motion，仅在正式资产来源和许可材料通过 intake 后导出动作。
- 明确拒绝：引入 React Three Fiber/Rapier 只为动作优化；复制 Better Combat 任意代码或数据；由 Presentation 改写命中、位移或胜负；用降画质掩盖热路径问题。

## 结论

本轮已不再沿用“在单个 update 函数里继续堆关节角度”的旧路线：权威动作、装备绑定、下劈物理、表现相位和热资源生命周期已经分层。下一轮的重点应由“是否实现”转成真机证据与细调：确认贴身 hit-stop 和真实长帧的边界，按四把武器分别校正挥臂可读性、命中时刻、收招速度和空中命中半径，再决定是否进入连招序列 Definition；不能在没有 iPhone 数据时继续堆表现或降低画质。
