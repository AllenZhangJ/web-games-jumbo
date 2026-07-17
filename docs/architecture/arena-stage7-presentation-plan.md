# Arena Stage 7 角色、动画与反馈执行计划

## 文档状态

执行中，2026-07-18。S7.1 已建立版本化角色表现、资产、动画语义、六方向与运行时生命周期合同，并把原有程序化角色迁到可替换 Factory 后；它仍是灰盒占位，不表示正式角色资产已经制作或接入。只有 Stage 6 输入映射通过盲测并冻结后，玩法级动作语义才允许进入 S7.2 及后续正式动画生产。

## 目标与非目标

Stage 7 把已经稳定的权威快照和事件翻译成可读的角色、动画、特效、镜头与音频，不建立第二套玩法真相。

目标：

- 支持 Q 版跑酷学徒与拟人发条方块机器人两类不同骨架。
- 支持低多边形玩具主体、手稿风轮廓、六方向可读性和组合外观插槽。
- 覆盖待机、走、跑、起跳、蹲跳、二段跳、下砸、落地、受击、击飞、淘汰、装备和胜负等语义。
- 在 Web、微信、抖音的单 Canvas 路径中安全加载、实例化、暂停、恢复与释放资源。
- 表现质量可以降级，但危险预警、装备状态和动作前摇仍必须可读。

非目标：

- 动画事件不判定命中、位移、落地、拾取、击飞或淘汰。
- 角色外观、服装、翅膀、挂件和拖尾不改变碰撞体或基础属性。
- 不为六个方向制作六套玩法状态机；方向只是权威朝向在相机空间中的表现映射。
- 不在尚未测量前冻结三角面、骨骼、纹理、内存或包体的伪精确预算。

## 数据边界

### 1. 玩法角色定义

`CharacterDefinition` 属于 Rule/Content，保存速度、体型、跳跃模板等允许存在的少量玩法差异。它只能引用稳定的 `characterId`，不能包含 GLB 路径、动画片段名、材质或特效对象。

### 2. 角色表现定义

`CharacterPresentationDefinition` 属于 Presentation/Content，当前包含：

- 稳定 `id`、适配的 `characterDefinitionId`、默认表现标记与内容版本。
- `modelAssetId`、`rigProfileId`、材质与轮廓 profile。
- `animationMap`：从稳定动作语义到资产 clip 的映射与回退链。
- 六方向映射策略，以及角色默认正面轴。
- `body`、`outfit`、`wings`、`accessory`、`trail` 等显式插槽。
- 允许的皮肤、挂件和特效 ID，不直接持有运行时 Three.js 对象。

Definition 在注册后深冻结；资产 URL 由独立 `PresentationAssetRegistry` 解析，避免内容定义、CDN/包内路径和运行时实例相互耦合。

### 3. 稳定动画语义

表现层消费以下语义，不消费具体 clip 名：

```text
idle / walk / run
jump / crouch-charge / crouch-jump / double-jump / down-smash / land
attack-windup / attack-active / equipment / defend
hitstun / knockback / eliminated
win / lose / draw
```

`AnimationSemanticResolver` 从只读 Participant Snapshot、权威动作阶段和已发生事件推导基础动作与覆盖动作两条语义。clip 缺失时按 Definition 的显式有序回退链降级，禁止通过猜测 clip 名静默成功。

### 4. 表现事件

命中线、击飞线、拾取、地图预警、镜头和音频只消费带稳定 `eventId` 与 tick 的 `PresentationEvent`。表现运行时维护有界去重窗口；重复帧、恢复追赶或重建不得重复播放一次性反馈。

## 模块拆分

建议保持小模块、单一所有者：

```text
src/arena/presentation/
├── content/                 # Presentation Definition 与注册表
├── assets/                  # AssetLoaderPort、缓存与资源所有权
├── character/               # CharacterViewFactory / Runtime
├── animation/               # 语义解析、过渡与每实例 Mixer
├── attachments/             # 服装、翅膀、挂件和拖尾插槽
├── effects/                 # Effect Strategy Registry
├── audio/                   # Audio Strategy Registry
├── camera/                  # 跟随、冲击与减少动态效果策略
├── quality/                 # 表现质量 profile
└── arena-renderer.js        # 组合根，不承载具体规则
```

职责边界：

- `PresentationAssetLoaderPort` 隔离 Three.js 加载器与平台路径差异；返回带同步 `release()` 的 lease。
- `CharacterViewFactory` 只创建实例并登记资源所有权。
- `CharacterViewRuntime` 每个参与者独占语义解析器、六方向解析器和 View，只把快照映射到 transform、方向和当前语义。
- `AnimationController` 每个角色实例拥有独立 `AnimationMixer`，不得共享可变动作状态。
- `AttachmentSlotSystem` 只接受白名单插槽，不通过骨骼遍历隐式寻找未知节点。
- `EffectStrategyRegistry` 与 `AudioStrategyRegistry` 按权威事件类型分派，不集中成巨型 `switch`。
- `ArenaRenderer` 负责连接模块和生命周期，不直接实现每种角色、装备或地图特效。

## 六方向与根运动

- 六方向由权威 `facing`、角色位置和相机基向量量化得到；镜头改变不会改写 Core 朝向。
- 方向切换使用表现滞回避免临界角抖动，滞回结果不回传 Core。
- 正式动画关闭或忽略 root motion。角色世界位置、跳跃轨迹和击飞速度始终来自快照。
- 骨盆位移、压缩、拉伸和落地回弹只能在模型局部空间内表现，并在语义退出时归一。
- 人物与机器人共享语义合同，但允许不同骨架、不同 clip 集和不同回退策略。

## 资产流水线

### 离线门禁

每个 GLB 进入仓库或正式资产包前执行：

1. 使用 glTF 2.0 校验器检查结构、buffer、accessor、动画、图片和扩展。
2. 检查稳定节点名、插槽名、clip 语义映射、循环标记和默认姿态。
3. 生成资产清单：文件大小、三角面、材质、纹理、骨骼、动画和依赖扩展。
4. 在需要时评估去重、裁剪、重采样或压缩；优化前后必须做视觉和动作回归。
5. Web、微信、抖音使用最终包验证加载，而不是只看桌面编辑器。

参考工具只作为开发期候选，不在本阶段规划文档中自动增加依赖：

- Three.js `r185`（项目当前依赖 `0.185.1`），固定参考 commit `2431a09f46f34c560bc8e44b33be0e567723d5b9`。可复用 `GLTFLoader`、`AnimationMixer` 与 `SkeletonUtils` 的官方能力。
- KhronosGroup `glTF-Validator`，固定参考 commit `434283be08a668a8fb4e437145630ddbf93b0686`，Apache-2.0。
- `glTF-Transform`，固定参考 commit `7dbd34c83eff4da2b0885a6cc90ada0be5642481`，MIT；只有实测证明能降低包体或运行成本时才加入开发流水线。

### 实例与释放

- 带骨骼角色使用 `SkeletonUtils.clone` 或等价的安全克隆路径，不直接 `Object3D.clone()` 后共享可变骨骼。
- 几何和不可变材质可以共享，但缓存必须显式记录引用计数与释放所有者。
- 每个加载任务只允许一次启动并去重并发 `load()`；页面销毁或切局后到达的旧结果立即释放，不能挂入新场景。
- `release()` 首次失败时保留 lease，使上层生命周期能够重试清理；底层释放实现必须同步且可重试。
- 上下文恢复从最新快照和当前内容注册表重建，不尝试继续使用已失效 GPU 对象。
- 对象池只在 Stage 9 测量证明高频创建是瓶颈后引入；池化不能掩盖资源泄漏。

## 可读性与无障碍

- 前摇、持有装备、危险预警和淘汰边界优先于装饰性轮廓与拖尾。
- 手机尺寸下检查六方向轮廓、人物/机器人区分、装备持有状态和风场/塌陷预警。
- `reduced-motion` 关闭大幅镜头冲击、强震动和长拖尾，降低粒子数量；不能删除必要规则提示。
- 音频是增强反馈，不是唯一信息渠道；静音仍能完成整局。

## 实施批次

### S7.1 合同与占位实例

- 建立 Presentation Definition、Asset Registry、语义解析与资源生命周期合同。
- 用程序化占位体证明 renderer 开关不改变回放 hash。

状态：代码与本机自动门禁已落地。程序化 Q 版人物和发条机器人已从投影帧中的 `geometry` 字段迁出，统一经过 `PresentationAssetRegistry → CharacterPresentationRegistry → CharacterViewFactory → CharacterViewRuntime`。已覆盖显式动画回退、基础/覆盖语义、六方向迟滞、迟到加载、释放重试、角色移除和同步失败关闭。浏览器视觉证据与完整门禁见 [S7.1 结果记录](../research/arena-stage7-presentation-contract-results.md)。

### S7.2 单角色单骨架纵切

- 只接入一个经过校验的角色和最小动作集。
- 验证加载失败、clip 缺失、暂停、恢复、重复事件和销毁后迟到回调。

状态：未开始。受 Stage 6 E3/E4 与 Mapper 冻结门禁阻断，不提前选择正式动作资产。

### S7.3 双角色与外观插槽

- 加入第二种骨架，验证共享语义但不共享可变运行时。
- 接入衣服、翅膀、挂件和拖尾白名单插槽。

### S7.4 战斗、地图与音画反馈

- 按事件策略接入命中、击飞、装备、风场、塌陷、淘汰和结算反馈。
- 完成减少动态效果与质量 profile。

### S7.5 资产与三端验收

- 固化 GLB 校验报告、资产清单、小屏截图/录像、三端运行与生命周期证据。
- 根据实测建立资产预算，预算进入 Stage 9 冻结候选。

## 阻断门禁

- 开关 Renderer、动画、特效和音频后，同输入回放的权威结果与 hash 不变。
- 两种骨架都使用相同动画语义合同；缺失动作有明确回退且不阻断比赛。
- 外观组合不改变碰撞体、移动、跳跃、击退和装备规则。
- 迟到加载、切局、前后台、上下文丢失和重复事件均不会串局或泄漏资源。
- GLB 校验、资产清单、小屏可读性和三端最终包证据齐全。
- 任何表现降级均不删除危险预警或改变 60 Hz 权威 tick。

## S7.1 明确未完成项

- 没有接入 GLB、骨骼、AnimationMixer、正式材质、手稿轮廓或正式动作片段。
- 没有实现服装、翅膀、挂件和拖尾实例；本批只冻结六类白名单插槽合同。
- 没有完成微信、抖音或目标真机表现验收，也没有冻结资产与性能预算。
- 没有解除 Stage 6 E3 设备证据、E4 真实新手盲测及 Mapper 胜者冻结门禁。
