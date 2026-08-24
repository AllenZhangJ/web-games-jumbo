# Arena V2 A4/A5 角色×武器首屏战斗可读性候选包 V1

状态：`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`

基线：`524a5dc0a21fd6f3cc8c7058168b9d2b664e6a64` 加共享工作树中的六角色、20 武器、正式 Presentation 候选；这些候选尚未提交，本文不把它们写成生产冻结事实。

范围：美术/表现预生产候选；不修改 Rule、Core、Bot、Composition、默认 Surface、主索引或入口。

## 1. 本批实际交付

- 六角色继续共用 `arena.rig.kaykit-humanoid.v1` 与同一个 Rogue GLB，不新增第七角色、骨骼或技能。角色选择页的隔离信息Surface现已接入正式预览候选：复用实战Character Registry、SkeletonUtils clone与材质Profile，并按手感固定采样既有Idle/Run/Jump/Land动作形成六种选择姿态；同一视觉设计表还把手感绑定为六种唯一的身体明暗分区，选择页与实战角色实例共用。P5.3zzztq进一步从当前模式的只读装备预览取得真实选择：1v1/竞速在同一`handslot.r`挂载正式已选武器clone并复用首屏持握Euler/缩放，生存强制空手，不误示开局装备。P5.3zzztr再把滚动位置从mount身份分离：完整可见才绘制、裁剪时保留模型、离开角色页才释放。切换卡片后只绘制当前角色与该模式的开局剪影，不新增动作键、自动旋转、RAF或程序化角色兜底。该路径仍是`not-run`，不能写成正式美术验收。
- 20 把武器均有有界静态目录：GLB 身份、来源 revision、许可、byteLength、SHA-256、轮廓、非色彩纹理、主色、危险色、持握方向、地面拾取姿态、0/5/12m 目标和动作三阶段语言。
- 可读性档案现已覆盖全部20把武器，并同时接入正式角色手持附件、正式Three Stage的地面世界武器实例与收藏页正式GLB预览；收藏目录读取地面拾取Euler，详情读取手持Euler，使局内拾取、使用和局外认识共享同一轮廓语言。P5.3zzzvm进一步在该唯一档案内为20把附件冻结各自的`identityScaleAxes`，同一比例同时作用于角色持有态和世界拾取态，两者只保留已有确定Euler姿态差。这些轴比例在`0.84..1.25`内以宽/长/厚强化附件原有轮廓，不是按目录序号造微差；不新建几何、材质、draw call或碰撞。它仍是`production-unreachable`候选，没有接入默认Surface。
- 没有新增或重写二进制资产；复用的20个GLB合计`639,472 B`，单个均小于Art Bible当前`64 KiB/武器`候选预算。未运行模型加载、三角面/材质/纹理实测，因此不能据此通过正式资产预算门。

## 2. 六角色身份边界

| 身份 | Character Definition | 材质 | 手感形状轴 | 非色彩明暗分区 |
|---|---|---|---|---|
| balanced | `arena-v2-kz-verification-character.candidate.v1` | `#EF6A64` | 居中稳定 | 躯干最亮，四肢等重 |
| sprint | `arena-v2-character-sprint.candidate.v1` | `#35C5D8` | 水平推进 | 双腿最亮，上身压暗 |
| air-control | `arena-v2-character-air-control.candidate.v1` | `#9B78E8` | 横向展开 | 双臂与披风最亮 |
| high-jump | `arena-v2-character-high-jump.candidate.v1` | `#A2D855` | 竖直弹跳 | 双腿最亮，头部次亮 |
| quick-start | `arena-v2-character-quick-start.candidate.v1` | `#F2B843` | 对角起步 | 右臂与左腿形成亮对角 |
| forgiving | `arena-v2-character-forgiving.candidate.v1` | `#4D8FE8` | 稳定括号 | 躯干与双臂较亮，双腿压暗 |

分区只在共享GLB既有`Rogue_ArmLeft/Right、Rogue_Body、Rogue_Head、Rogue_LegLeft/Right、Rogue_Cape`七个Mesh的实例克隆材质上调整value，倍率固定在0.5..1；不增加几何、材质数、draw call、贴图、光源或骨骼。`PublicMatchInfoV2.identityGlyphKey + identityPatternKey`是参与者席位身份，不能冒充角色手感身份。六者仍没有不同外轮廓，不能把明暗分区写成已通过角色剪影门；A0.3真人仍为`0/10`，12m截图、色觉差异和真人识别继续是红门。

## 3. 20武器目录与统一装饰器

危险预备统一使用 `#FFB020 + 姿态偏移/轮廓变化`，active 使用 `#FF5C5C + 动作阶段形状`，命中强调保留 `#FFF4B8`；颜色从不单独表达结论。

| 武器 | 状态 | 轮廓/非色彩锚点 | 主色 | 持握/地面方向合同 |
|---|---|---|---|---|
| charge-shield | 首批代码候选 | 宽圆盘＋四分面 | `#35B8FF` | 圆面垂直前进方向；地面平放圆盘 |
| heavy-hammer | 首批代码候选 | 顶重块面＋双头带 | `#273451` | 锤头领先攻击弧；地面横置 |
| gravity-chain | 首批代码候选 | 线＋实心端点＋点划 | `#8B6DFF` | 端点指向拉拽线；地面对角 |
| vault-lance | 首批代码候选 | 长枪线＋前向箭纹 | `#35B8FF` | 枪尖与位移同轴；地面纵向展长 |
| scatter-cannon | 首批代码候选 | 宽横杆＋三辐口 | `#273451` | 中轴朝前、横杆表达宽覆盖 |
| edge-scythe | 首批代码候选 | 新月刃＋边缘条纹 | `#45D483` | 新月开口朝扫击方向；地面横置 |
| line-suppressor | 静态目录 | 长直杆＋三环 | `#45D483` | 对齐窄直线压力轴 |
| read-counter | 静态目录 | 开书 V 形＋双页线 | `#FFF4B8` | 开口朝承诺方向 |
| flank-blade | 静态目录 | 短后刃＋斜切纹 | `#FF5C5C` | 刃体偏离后髋轮廓 |
| hook-spear | 静态目录 | 长钩杆＋尖端带 | `#8B6DFF` | 钩尖领先细长拉拽线 |
| burst-gauntlet | 静态目录 | 紧凑拳块＋中心点 | `#FFB020` | 仅超出前手，不夸大射程 |
| sky-anchor | 静态目录 | 下刺圆体＋竖条 | `#273451` | 最低尖刺定义垂直威胁 |
| rebound-hook | 静态目录 | 回转钩＋回箭 | `#8B6DFF` | 回转缺口指向使用者 |
| pulse-baton | 静态目录 | 短棒＋端环 | `#45D483` | 放大端头标注打断方向 |
| siege-axe | 静态目录 | 双重楔头＋双警示带 | `#273451` | 前楔始终脱离身体轮廓 |
| twin-fan | 静态目录 | 单个径向面＋交替扇区 | `#FFF4B8` | 当前只有一个附件，不伪造双持 |
| diving-claw | 静态目录 | 下钩尖＋三爪纹 | `#FF5C5C` | 仅由空中 authority phase 转向下方 |
| route-bow | 静态目录 | 细弧线＋平行路线纹 | `#35B8FF` | 不生成或暗示非权威投射物 |
| pivot-blade | 静态目录 | 后摆弯刃＋半环 | `#FF5C5C` | 视觉跨身但不改权威 facing |
| commitment-fist | 静态目录 | 紧凑手持体＋进度条纹 | `#FFB020` | 完整保持承诺阶段，不冒充蓄力数值 |

“20把代码候选”只表示同一装饰器与资料合同已闭合，全部仍是`not-run`，不得写成已完成美术验收或已批准。

## 4. 权威输入与禁止反判

```text
Equipment Definition identity
  + MatchReadFrameV3 participant.action.phase
  + ArenaMatchEventV6 ActionStarted / WeaponFeedbackResolved 的已校验 Cue
                    ↓
持握/地面姿态、材质危险强调、去重后的表现 one-shot token
```

- `windup/active/recovery` 只读 `participant.action.phase`；阶段长度继续来自已有 `ActionDefinition.timing`，装饰器不创建墙钟或补帧计时。
- `ActionStarted` 必须绑定当前 participant、武器和动作；`WeaponFeedbackResolved` 还必须携带 `attackerId`，并与当前 held participant、动作身份精确闭合。同武器/同动作的其他玩家反馈一律拒绝；`movement-fall-warning` 不在本装饰器允许的 Cue 枚举中，`movement-fall` 等缺少 attacker/action 的事件也不能装饰到武器；所有 Cue tick 必须早于 post-step 输入 tick。
- 禁止从坐标差、动画播完、事件出现顺序、音频时长或局部 VFX 推断命中、拾取、替换、掉落、胜负。
- 二十把武器的专用反馈 cue 已接入同预算的差异化运行时形状语言：轮廓分段、宽高比、方向箭头比例和粒子分布表达武器身份，四类权威反馈结果仍决定命中/转移/击落/闪避结果形状；低动效关闭粒子后保留轮廓差异。该实现只消费已解析表现身份，不新增规则、按键或 VFX 预算，代码尚未运行与视觉验收。
- `ActionStarted + WeaponFeedback` 共用 64 项有界事件窗口。事件 ID、sequence、tick、attacker/action/equipment 和视觉语义形成 canonical identity：窗口内重复的 Action/Feedback 都抑制新的 one-shot token，同 ID 或同 sequence 冲突失败关闭；早于 sequence 水位且已离开窗口的旧事件也拒绝，不会在第65项后重播。仅显式 Presentation epoch reset 可清空窗口、tick 与 sequence 水位。
- 每次 `consume` 先完成 exact-key、participant/attacker/action、tick、同 tick canonical identity 与64项窗口的纯数据预演；之后才允许写 Object3D、材质和内部队列。预检失败保持上一个已提交视觉/队列状态不变。
- 本候选不新增输入；仍只有 `direction + jump + primary`，冲锋盾明确不表示格挡或无敌。

## 5. 降级、静音、低动效与生命周期

- reduced-motion：保留武器静态轮廓、纹理与危险色，删除阶段旋转和缩放脉冲；权威动作阶段不变。
- muted：视觉状态完全不依赖音频播放、结束或时长；没有音频也不会改变动作阶段和命中反馈身份。
- 资产失败：隐藏缺失附件并向上游请求“非空间状态 Cue”；不创建程序化武器、不以占位几何冒充资产门通过。
- 装饰器构造后是“附件根节点局部 transform、visible 与材质引用”的唯一 owner；宿主只能移动父节点来更新权威世界位置，不能在装饰器生命周期内写同一附件根节点。构造时记录宿主原始 position、Euler/order、非均匀 scale 与 visible；每次表现均以该基准叠加候选 offset/rotation/multiplier，绝不调用归零式 position/rotation/scale 写法，地面高度只叠加到原 Y。`destroy()` 精确恢复原值。
- 材质构造是事务：先登记整棵附件树的全部借入材质身份；每次 clone 必须返回新的、彼此不同且不等于任何借入值的 `THREE.Material`。任一 clone 身份非法、clone 抛错或 mesh.material 赋值失败时，逆序恢复此前所有 mesh 的原材质引用（多材质时保留原数组身份），只释放已确认的独立自有材质，绝不释放借入材质或借入几何。
- `consume` 的 transform/material 写入发生异常时，尽力恢复构造基准、原 visible 和原材质，清空未提交事件状态并进入 `failed` 或 `dispose-incomplete`，之后不能继续消费。`destroy()` 只有全部恢复与自有材质释放成功后才标记 `destroyed`；释放失败保留待释放所有权，允许再次 `destroy()`，不伪报完成。
- 若宿主在生命周期中改写附件根节点局部 transform 或材质引用，装饰器判定所有权冲突并执行同一失败关闭回收。正式预加载器、角色实例、地图、Renderer/Scene 生命周期仍由现有 Owner 管理。
- 20把的本地持握/地面变换均标记`candidate-local-transform-not-render-verified`。手持附件由角色节点承载世界位置；地面附件使用独立世界根节点承载权威位置，子附件只由可读性Owner写局部姿态，避免Stage与装饰器争抢transform。后续模型加载和截图可能触发逐把回调，不允许把“写入数值”当作视觉证据。
- P5.3zzzvm的轮廓轴比例每次都从宿主原始非均匀scale重算；持握动作阶段只在已应用的共享轮廓上叠加一次既有统一倍率。重复`consume`不会累乘，替换或`destroy`依旧恢复精确宿主基准；地面父节点的权威世界位置、角色骨骼、hitbox与碰撞均不变。

## 6. 来源与许可

- 20 个附件均绑定 KayKit Adventures 1.0：source revision `672074b73ba276876a19e8816ecdc5241817ab47`，许可 `CC0-1.0`，rights holder `KayKit Game Assets / Kay Lousberg`，证明 `docs/research/arena-kaykit-adventurers-intake.md`。
- 每项 path、byteLength、SHA-256 固定在候选源码，并与现有 formal asset catalog 身份做失败关闭绑定。
- 六角色共享 GLB：`public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb`，`922,332 B`，低于当前单角色 `1 MiB` 候选预算；SHA-256 `3ee71059eef32d9a6259c5cfd4121f31dffda0a9667509b5f24129fb2c7a1cab`，同一 CC0 来源。
- 上述“approvedBy Allen”只代表既有来源/权利 intake；`productionAssetApproved=false`，不代表模型、持握、材质、设备或 Final 签核。

## 7. 纯源码/清单七维自检

| 维度 | 当前结论 | 红门/返工触发 |
|---|---|---|
| 轮廓与镜头 | 20/20 有形状与非色彩纹理；0/5/12m 仅规格 | 未截图、未缩略、未真人，`not-run` |
| 色彩与材质 | 六角色各有唯一七部件明暗分区和材质身份；武器主/危险/active/impact色分层 | 真实GLB、地图灯光、色觉和12m对比未测；明暗分区不等于外轮廓通过 |
| 持握与朝向 | 20/20有`handslot.r`、前轴、持握/地面姿态并可实例化同一装饰器 | GLB未加载；穿插、反向或地面不可见即逐把返工 |
| 动作阶段 | 20/20 绑定地面/空中 Definition 与三阶段语言 | 当前共用动画 clip；无逐把动作样件与设备证据 |
| 来源与预算 | 20/20 path/bytes/SHA/license/revision；单件低于 64 KiB | 未测多边形、材质、纹理与运行内存 |
| 无障碍与失败关闭 | reduced-motion、silent、missing-asset、future/identity/attacker/tick drift 均有静态合同 | 未接真实宿主、未运行恶意输入测试 |
| 生命周期与治理 | 构造事务、基准组合、失败回收、可重试destroy、64项事件水位、epoch reset、整文件回滚 | 默认 Surface 断开；所有测试/构建/设备/性能顺延 |

## 8. 未完成硬门与回滚

- A0.3 真人仍 `0/10`；A1.1 必须按当前 source 重建；正式来源批准、capture harness、浏览器/GPU、iOS/Android、代表样件、Blockout、正式 VFX/音频、Presentation 集成和 Final 均未开放。
- `docs/collaboration-protocol.md`、`docs/game-design-theory.md` 仍是 `game-art-director` 强制引用红缺口；本批不创建占位文件。
- 验证按用户要求全部顺延：测试、typecheck、lint、build、截图、GLB 加载、浏览器、模拟器、设备、性能均为 `not-run`。
- P5.3zzztq/P5.3zzztr使用项目本地`threejs-game-ui-designer`，强制参考`SKILL.md`、`references/ui-patterns.md`、`references/checklists/game-ui-quality.md`、`references/checklists/hud-readability.md`与`references/checklists/responsive-ui-fit.md`。该技能导致角色＋开局武器剪影共用同一取景bounds，且生存用空手形状而非颜色区分；滚动只改变逐帧绘制位置，裁剪与离页使用不同生命周期。技能要求的双视口截图、字体、读屏、真人识别与运行时响应验证按开发优先指令顺延，不能换算为通过。
- P5.3zzzts又把该预览的构造回滚和终态销毁收敛为可重试所有权：Owner/Renderer产生即移交，共享角色模型clone和自有材质产生即登记并由Preview Owner或正式角色Factory承接债务；子清理成功才清引用，滚动解绑、Renderer或Mount失败不会提前丢底层Surface。故障注入、浏览器/GPU和内存证据仍为`not-run`。
- 最小回滚：撤销正式角色材质Profile的`valuePattern`、角色视觉设计表字段、GLTF实例分区消费和本文件/P5台账对应段落；没有资产字节、Rule/Core、默认Surface或入口需要回滚。
