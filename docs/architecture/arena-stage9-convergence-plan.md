# Arena Stage 9 平衡、可靠性与性能收敛计划

## 文档状态

执行中，2026-07-21。S9.1～S9.3 的实验、Replay V5、三 Mapper input fuzz、生命周期回归、平衡验证和 11 条命 Product 默认已落地。S9.4 的质量/性能/设备合同与三端构建预算已建立，本次正式角色与音频构建在 Web/微信/抖音均通过 4 MiB 交付门；六个真实 target Record 尚未采集。S9.5 的预注册真人研究、工作台和逐 Tick Replay/Bot 复验已建立但真实样本为空。S9.6 已接入十一门 producer；Formal Assets 已有真实 GLB/PNG/OGG、来源、许可、正式资产专用预算、声音开关和 reduced-motion 运行时，但因项目方批准、Formal Bundle 与目标真机材料未齐，仍不可进入冻结。

## 收敛原则

- 先记录实验定义和内容 hash，再运行模拟；不在看到结果后改写样本范围。
- 平衡结论同时看分布、来源和异常局，不只看一个平均胜率。
- 无渲染权威性能与有渲染帧性能分开测量，不能互相替代。
- 低档机只降低表现质量；Core 固定为 60 Hz，规则、RNG 与回放 hash 不变。
- 每个阻断缺陷必须留下最小复现 seed、输入或回放，修复后加入长期回归集。

## 可复现实验合同

当前 `ArenaExperimentDefinition` 固定：

- 实验 ID、说明、metric schema version、40 位代码 commit 与 dirty 状态。
- 完整解析后的 Match config、Match schema、物理版本、config hash 与 Rule/Equipment/Map/Character 聚合 content hash。
- 严格递增的显式 seed 或不可歧义的 uint32 闭区间，单份 Definition 最多 100,000 个 case。
- 版本化 workload 及其纯数据参数；玩家基准、Bot 或输入生成器必须成为 workload 身份的一部分。
- 版本化 collector 列表及其不可变参数、每局最大 tick 与允许失败数。Definition V2 将阈值写入 content hash；V1 仍可读取但不能携带 Collector 参数。

`SimulationExperimentRunner` 只通过版本化 workload 的 case port 运行；Collector 只能收到深冻结 metadata、输入、已发生事件和快照，不会获得 Core、Bot、RNG 或可写宿主引用。case 失败进入结构化失败 seed 并按阈值停止；Collector 自身异常属于基础设施失败，Runner 终止并清理，不能把半指标发布成 Report。机器可读 Report 同时保存原始计数、分母、派生指标、环境与失败 seed；`resultHash` 排除墙钟/运行环境，clean source 且全部 case 完成时才允许 `freezeEligible=true`。

落盘证据使用 schema V1 `ArenaExperimentReportBundle`。Reader 会用 Definition 和原始 cases/metrics 重建整个 Report，再核对 bundle hash；输出文件使用 exclusive create，不能覆盖已有候选。`freezeEligible` 只表示该实验定义与结果可作为不可变候选，不替代真人胜率、设备证据或 Stage 10 发布评审。

Collector 可以输出 schema V1 `ArenaMetricGate`。Gate 只保存稳定 check ID 与布尔结果，详细分子/分母仍在同一指标数据中；任一 Gate 失败都会使 Report outcome 为 failed。它解决了“case 都跑完但能力顺序、覆盖或精确计数不达标仍被误标为可冻结”的缺口。

第一条 `arena.stage9.scripted-pressure` workload 使用固定版本的双方脚本压力输入，证明编排、确定性、生命周期和指标合同。双方节奏有意不同，因此它不是公平性或最终平衡结论；三档隐藏 Bot 与真人基准必须由后续独立 workload/collector 迁入。

## 指标集合

### 对局与公平性

- 完成率、时长分布、超短局、超时局、比分和胜者。
- 玩家/机器人胜率按隐藏难度、地图版本、装备池和出生侧分层。
- 自杀、无归属淘汰、地图淘汰、装备淘汰和基础动作淘汰来源。
- 装备预警到达率、拾取率、持有时长、使用率、命中率和造成淘汰率。
- 中心控制时间、危险区停留、边缘恢复和连续受控时间。
- 走、跑、跳、蹲跳、二段跳、下砸与上下文动作意图匹配指标。

### 可靠性

- 非法数值、状态机拒绝、重复事件、未结束局和 fail-closed 计数。
- 连续多局的 session、监听器、定时器、资源、几何、纹理和音频节点变化。
- 前后台、上下文丢失、触控取消、加载失败和存储失败后的恢复结果。

指标必须记录分母和版本，避免将“没有产生事件”误报为 0% 成功率。

## 黄金回放与回归语料

按规则大版本保存：

```text
tests/arena/fixtures/replays/vN/
├── manifest.json
├── equipment-*.json
├── map-*.json
├── movement-*.json
├── lifecycle-*.json
└── regressions-*.json
```

manifest 固定 replay schema、config hash、各内容 hash、seed、checkpoint、最终结果和关键事件。策略：

- 新代码必须严格重放当前版本语料。
- 不兼容规则升级创建新目录；旧语料保留并测试“明确拒绝”，不偷偷覆盖期望 hash。
- fuzz 或 soak 发现失败后，先缩减 seed/输入为最小复现，再进入 `regressions`。
- 只有经过评审的预期规则变化才允许更新黄金结果，并同时记录原因和新旧对比。

Replay V5 首批已覆盖装备、地图首轮风场、正式移动语义和 QuickMatch/LocalMatchSession 暂停恢复。验证同时执行完整 JSON hash、严格重放、注册场景再生成和 Registry/Manifest 双向覆盖。候选必须先写到仓库外部，使用 `bootstrap-v5` 或 `replace-<current-manifest-hash>` 显式提升；普通测试不会改写语料。V4 当前没有可信历史文件，因此使用稳定错误码验证 Core 创建前拒绝；第一次不兼容升级到 V6 时保留真实 V5 目录，进入历史读取门。

## 输入模糊与生命周期矩阵

输入生成覆盖：

- 最大/最小摇杆、快速反向、按钮抖动、重复 press/hold/release、触控取消。
- 跳跃缓冲、土狼时间、二段跳预算、落地/淘汰/重生临界 tick。
- 装备前摇、冷却、受击打断、机关互动和比赛结束同 tick 冲突。

生命周期至少组合：

- `start` 前 hide/show、启动中销毁、切局后旧异步结果到达。
- 比赛中多次 hide/show、长时间后台、恢复首帧和触控指针丢失。
- Renderer context lost/restored、音频挂起、存储写失败和重复结算。
- 连续再来一局与返回首页交错，不允许两个 session 同时获得平台输入。

## 性能证据分层

### 权威逻辑预算

Node/无渲染测固定 tick 成本、峰值、堆增长、完成率和确定性。它证明 Rule/Core/Bot 的上限，不证明手机帧率。

### 表现帧预算

最终包在目标设备记录：

- 启动到可交互、首场景和首局准备完成时间。
- CPU frame time、长帧、RAF 丢帧和 Core catch-up 次数。
- GPU/渲染侧 draw calls、triangles、programs、geometries、textures。
- JS heap（平台可用时）、进程内存、WebGL context 与资源稳定值。
- 首包、分包/总包和单个高成本资产。

Three.js `renderer.info` 可作为资源与 draw call 的基础采集源；平台时钟和生命周期通过注入的 `PerformanceProbePort` 提供。Spector.js 固定参考 commit `97927a00940d4c86620ee9de6e0e56f94d19db7c`、MIT，只作为开发期 WebGL 抓帧候选，不进入生产包和 Core。

## 表现质量降级

`PresentationQualityDefinition` 当前提供：

- `high`：目标主流设备完整表现。
- `medium`：降低阴影、粒子、拖尾和轮廓成本。
- `low`：允许 30 FPS 表现帧率、进一步限制特效与分辨率比例。

`reduced-motion` 仍是与设备质量正交的后续可访问性能力，不混入当前性能 Policy。

所有 profile 都必须保留：

- 风场、塌陷、装备刷新和淘汰边界预警。
- 角色朝向、装备持有状态、动作前摇和受击状态。
- 60 Hz Core tick、相同输入语义、内容版本和比赛结果。

当表现以 30 FPS 运行时，Runtime 继续消费全部权威事件并插值快照，不通过跳过 Core tick 换取帧率。

## 配置冻结流程

```text
配置候选
 -> 生成 content hash
 -> 固定 Experiment Definition
 -> 批量模拟与异常 seed 复核
 -> 黄金回放/模糊/长稳
 -> 三端目标设备验收
 -> 评审报告
 -> 冻结候选版本
```

冻结后改变规则数值、地图时间轴、装备定义、角色玩法模板或机器人 profile，都必须生成新候选和新报告。纯表现优化仍需证明回放 hash 不变并重跑对应设备门禁。

## 实施批次

### S9.1 实验与指标基础

- S9.1a 已建立 Experiment Definition、Workload/Collector Registry、Runner 和 JSON Report schema。
- 已接入第一条无渲染脚本压力 workload 与 Match Summary collector，提供显式分母和稳定结果 hash。
- S9.1b 已迁移 MatchCore workload/collector，保留有限状态、surface/装备位置、事件上限、唯一 hash 与抽样严格回放断言；Node CPU/heap 门直接驱动相同 case。
- S9.1c 已迁移 Map 时间轴精确计数、Movement 状态/动作覆盖和 Bot 同-seed三档配对能力实验；旧 stress CLI 只保留宿主职责。
- S9.1 实现边界完成；新增实验继续通过 Registry 扩展，通用 Runner 不增加玩法分支。

### S9.2 回放、模糊与回归集

- 已建立版本化 Manifest、场景 Registry、严格回放/再生成、完整目录校验和受审批 token 保护的候选提升。
- 已覆盖 Stage 4 装备、Stage 5 地图、Stage 6 移动以及 Stage 3/8 QuickMatch/Session 暂停恢复；Replay V4 在创建 Core 前以稳定错误码拒绝。
- input fuzz 支持固定 mapper/index/seed 的单 case 严格回放，并在失败时输出版本化回归候选；真实缺陷缩减后再进入 `regression-*`，不制造虚假回归样本。
- 生命周期回归门组合 Session、Replay、Pointer、Product Session、Profile Persistence 与 Product Presentation，并继续执行两条 100 局 soak。命中音频已覆盖失败软化、固定 voice 池、事件去重与销毁；目标宿主前后台音频中断/恢复仍没有正式设备 Record，不把它伪报为已覆盖。

### S9.3 平衡候选

- S9.3a 已预注册 300 个固定 paired seed：easy/normal/hard 共 900 局，5 个 seed 三档均严格回放；CLI 禁止覆盖样本数量和 replay 数。
- 工程门固定 2～3 分钟主要分布、超短/超时占比、三档能力与生命压力最小差值、三件装备拾取/动作/命中数量及占比，以及有归属/装备归因/无归属环境淘汰占比。
- 装备淘汰归因只使用权威 `HitResolved`、`lastHitCreditTicks` 与 `PlayerEliminated.creditedAttackerId`；无归属淘汰标为“环境或自身”，不伪称能区分具体地图机关。
- 第一份 clean baseline 已完成 300/300 paired case、900 局和 15 条严格回放，0 case 失败；Bot 排序与装备参与门通过，候选因时长过短、装备归因过高和环境淘汰过低而失败。
- S9.3b 只创建新的候选 Definition/Report，不回写 S9.3a 阈值或覆盖失败证据；先处理对局节奏、装备致死结构与地图机会，再运行新的固定样本。
- S9.3b 第一轮只探索 9/11/13 条命：60 paired exploration seed 与历史 baseline、后续 300 paired validation seed 完全隔离；三个候选共享除 lives 外的全部权威内容。
- 候选先过 clean source、case 完整、Bot、sample 和未知装备资格门，再按固定归一化违规罚分机器选优；三份 Report、Selection 和外层 hash 必须可独立重建。
- 首份 clean exploration 已完成 540 局与 18 条严格回放：11 条命候选罚分为 0，目标时长占比 87.22%，中位数 7,439 tick，并通过全部资格/平衡门；它只获得进入隔离 validation 的资格，不等于已经冻结。
- 11 条命 validation 已在另一组 300 paired seed 上完成 900 局与 15 条严格回放：目标时长占比 87.44%，中位数 7,448 tick，0 case/Metric Gate 失败，Report 可冻结；Product 默认提升必须复用该已验证配置，而不是修改 MatchCore 通用默认。
- Product 组合默认读取 `arena-v1.balance-lives-11.v1` 不可变 Definition；显式 `matchConfig` 只作为测试或未来 Mode 的覆盖层。产品真实权威快照回归要求双方初始 11 条命，非对象配置在资源获取前拒绝。
- 任何调参都生成独立候选，不循环覆盖同一报告。

### S9.4 三端性能与长稳

- S9.4a 已建立 high/medium/low 质量 Definition；30 FPS 只跳过表现帧，同输入的 high/low 权威快照回归一致。
- 已建立有界只读 Probe、版本化 Performance Policy/Record/Report 和纯 Collector Registry；观察异常、样本丢失或全部内存来源缺失均不能通过。
- 已固定 Web/微信/抖音各一台低档 Android 与主流 iOS 的六 target、十分钟/三局/生命周期/context 恢复门，并复用构建 Manifest 和附件完整性边界；不改写 Stage 6/8 历史证据。
- 已建立 4 MiB 内部 delivery 预算及 JavaScript、最大单文件、文件数量门；dirty build 只能诊断，不能冻结。
- S9.4b 待在六个真实 target 运行最终 clean build，生成独立 Trace、截图、录像和日志；桌面与 Node 结果不能替代。

### S9.5 真人公平性冻结

- S9.5a 已固定 Web 手机竖屏触控、三局/人、easy/normal/hard 隐藏平行组和每组至少 30 名完成者；改变样本、阈值、候选或环境必须新建 Study 版本。
- 研究 seed 只能让生产 `createMatchAssignment()` 天然选择对应隐藏难度，不提供研究专用难度覆盖；参与者视图不含 arm、difficulty 或 seed。
- Product 增加默认关闭的同步完成端口，只输出深冻结 Result/Replay；Study Capture 注入该端口和 seedSource，Product/Presentation 不反向依赖 Study。
- Bundle 绑定 commit/build/Definition 与内容寻址 Replay；CLI 严格重放每局并逐 Tick 重生 Bot 输入，早期样本异常不能绕过样本量门禁。
- S9.5b 已完成独立 `study.html`、双槽可恢复 Workspace、去标识原始包、离线原子入库与 clean Web build 强绑定；工作台中断只生成作废记录，不恢复半局。
- S9.5c 待执行真实招募：至少 90 名合格完成者、全部退出/失效记录和最终 CLI。

### S9.6 RC 交接评审

- S9.6a 已固定输入盲测、正式资产、黄金回放、回归、平衡、构建、三类设备证据、真人研究和缺陷账本共 12 个必选门。
- Candidate 绑定唯一 commit/build/source dirty；Evidence 绑定 Gate producer、requirement hash、结果 hash 和内容寻址材料，跨 Gate 冲突或身份漂移在汇总前拒绝。
- `arena:stage9:readiness` 已复算两个构建 producer、黄金回放、固定平衡验证、原子组合回归、Stage 6/8 设备、性能和真人研究；外部四门直接复用原 verifier，不信任 CLI 摘要。source producer 还强制 clean checkout、候选 commit 一致与运行前后身份稳定。
- 缺陷门使用版本化 Ledger；开放 blocking/high 自动失败，所有开放缺陷必须由具名 residual risk owner 承接，已解决缺陷必须保留验证引用。未经过对应 producer 语义复验的 `ready` 声明仍按 incomplete 处理，没有人工 override。
- Input Pilot 使用版本化 Evidence Bundle，将可重算 Audit 与 clean Web Manifest 绑定；正式采集 Workspace 以 commit/build/manifest hash 隔离，并复验同候选 Stage 6 Device Gate。Formal Assets 等待 S7.2～S7.5 真实资产合同。真实 Device/Performance/Human Record 继续作为外部阻断。完整状态见 [Stage 4～9 要求—证据—缺口矩阵](../quality/arena-stage4-9-evidence-matrix.md)，决策见 [ADR-026](../decisions/026-arena-stage9-rc-evidence-handoff.md)。
- 全部门 ready 后才汇总配置 hash、报告、回放、缺陷、三端证据和剩余风险，形成 Stage 10 RC 输入；未通过则只修复当前候选。

## 进入 S9.4/S9.5 前仍需项目方提供

1. 六个 target 的真实厂商、型号、系统版本和可执行设备；当前 Policy 已默认低档 Android、主流 iOS。
2. 微信/抖音开发者工具登录与真机调试权限，以及没有宿主内存 API 时可导出的真实进程内存采样。
3. 为 S9.5 提供真实新手参与者、知情同意/隐私执行条件和操作人员；V1 样本、难度胜率区间与感知阈值已按默认值预注册，不再等待临场决策。

低档表现 30 FPS/Core 60 Hz、启动/帧时间/内存/包体 V1 默认预算和 S9.5 V1 研究阈值均已进入版本化合同，不再是当前未决项。外部设备和真人证据会阻塞 S9.4/S9.5 冻结，但不阻塞工程基础继续完善。

## 阻断门禁

- 每份平衡结论都能由固定 Definition、seed、版本/hash 和脚本重现。
- 当前黄金回放严格一致，历史不兼容语料被明确拒绝而不是静默接受。
- 连续多局、前后台、上下文恢复和存储异常没有持续资源增长或串局。
- 低质量/30 FPS 表现下 Core 仍为 60 Hz，权威 hash 与高质量路径一致。
- 主要对局落在 2～3 分钟，异常分布和三档能力顺序有可解释证据。
- Web、微信、抖音的目标机启动、帧时间、内存和包体全部通过已确认预算。
- 所有阻断级和高优先级缺陷关闭；每个修复保留自动化或可重复实机证据。
