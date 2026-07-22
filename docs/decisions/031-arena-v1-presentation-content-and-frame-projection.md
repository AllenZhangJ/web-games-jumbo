# ADR-031：Arena V1 具体表现内容与权威帧投影独立治理

- 状态：已接受并实施（G5.26）
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 代码提交：`5e677ff4b93090e329b9ab6a151474bf28b81742`

## 背景

迁移前，Arena V1 灰盒内容、Gameplay V2 正式角色内容和 frame projector 共 789 行 JavaScript，直接位于上层 `src/arena/presentation`。projector 为未传内容的调用方隐式选择灰盒内容，并从 `arena-core` 读取动作裁决字面量；具体内容又直接导入上层 Action、Equipment 与 Map 实例。这使通用表现运行时、具体产品内容和权威规则来源之间的边界不够清晰，也让调用遗漏被静默回退掩盖。

## 决策

### 独立具体内容包

新增 strict `@number-strategy-jump/arena-v1-presentation-content`。它只负责 Arena V1 的地图外观、动作/装备表现、角色/资产注册和公开快照到只读表现帧的投影；依赖只允许指向 contracts、definitions、match 的公开配置以及表现 contracts/runtime。

该包不得依赖 Core、Bot、Product、Session、Three、Renderer、Platform、DOM、墙钟或随机源，也不得拥有命中、位移、拾取、淘汰、随机和胜负写入能力。Three 视图继续消费它的输出，不反向成为内容或规则所有者。

### 权威 Definition 显式注入

ActionDefinition、EquipmentDefinition 和 MapDefinition 由 Arena V1 应用组合桥显式注入。表现包直接引用权威 action timing，不复制攻击速度、命中范围、僵直或击退规则；地图表现从所选权威地图 Definition 构造。迁移期保留一个薄 JavaScript 组合桥，待 Arena V1 应用注入层进入 strict workspace 后删除。

动作视觉阶段、武器缩放和角色表现阈值是纯表现配置，集中为导出的深冻结值。不同武器与空中动作可以有不同 clip、语义、起手/主动/收手阶段和武器倍率，但这些值不能反向改变权威判定。

### 无隐式默认的帧投影

`projectArenaPresentationFrame` 必须显式接收表现内容。缺少内容、跨比赛 seed、重复参与者、缺失地图面、过期 action affordance、错误布尔值、非有限向量或缺失表现引用均在返回帧前失败关闭。输出只包含复制冻结的公开 action、movement、equipment、事件、结果和表现引用，不泄漏 Bot 难度或权威可变对象。

动作裁决结果词汇 `ACTION_RESOLUTION_KIND` 属于公开快照合同，因此下沉到 `arena-contracts`，`arena-core` 继续兼容重导出。表现层不再依赖 Core，也不写死 `'selected'`。

## 被否决方案

### 把 projector 放入通用 presentation runtime

通用 runtime 只拥有节拍、输入采样和事件生命周期。加入 Arena V1 地图、角色和 HUD 语义会让通用包反向承载具体产品内容，并扩大所有消费者的依赖面。

### 把具体内容放入 Three 包

内容与帧投影不需要 Three.js。放入 Three 包会让无渲染测试、Canvas/UI 和未来其他 Renderer 被迫依赖 Three，并模糊“数据内容”与“资源视图”的生命周期。

### 在表现包复制权威数值或保留隐式灰盒回退

复制权威 timing、范围或地图几何会形成第二真值；隐式回退会掩盖组合错误，使正式内容缺失时悄悄显示灰盒。两者都不符合企业级可审计组合。

## 后果

正面：具体表现有严格类型和依赖边界；武器/动作视觉配置有单一公开位置；frame projector 的每个调用都可审计；Rule/Core 仍是唯一权威写入者；正式内容缺失不再静默回退。

代价：组合调用必须显式传入内容；迁移期仍有一个上层 JavaScript Definition 注入桥；新增内容时需同时通过 Definition 引用、Registry、投影和架构门测试。

执行证据见 [Arena 企业治理状态台账 G5.26](../governance/arena-enterprise-governance-status.md#g526-arena-v1-表现内容与只读帧投影迁移证据)。
