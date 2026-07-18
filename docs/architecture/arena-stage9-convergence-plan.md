# Arena Stage 9 平衡、可靠性与性能收敛计划

## 文档状态

执行中，2026-07-18。S9.1a 已落地实验基础，S9.1b 已迁移 MatchCore，S9.1c 已迁移 Map、Movement、Bot 专业 workload/collector/composition，并让 Collector 阻断门参与 Report outcome/freeze 判定。S9.2 已建立版本化 Replay V5 黄金语料、严格历史拒绝、input fuzz 单例复现与生命周期回归门。下一步是 S9.3 平衡候选；S9.4～S9.5 仍未开始。Stage 8 已提供版本化设备证据和构建 Manifest 边界；Stage 9 性能指标 Definition、精确设备与预算仍需在真机门禁前由项目方确认。

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
- 版本化 collector 列表、每局最大 tick 与允许失败数。

`SimulationExperimentRunner` 只通过版本化 workload 的 case port 运行；Collector 只能收到深冻结 metadata、输入、已发生事件和快照，不会获得 Core、Bot、RNG 或可写宿主引用。case 失败进入结构化失败 seed 并按阈值停止；Collector 自身异常属于基础设施失败，Runner 终止并清理，不能把半指标发布成 Report。机器可读 Report 同时保存原始计数、分母、派生指标、环境与失败 seed；`resultHash` 排除墙钟/运行环境，clean source 且全部 case 完成时才允许 `freezeEligible=true`。

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

`PresentationQualityDefinition` 建议至少提供：

- `high`：目标主流设备完整表现。
- `medium`：降低阴影、粒子、拖尾和轮廓成本。
- `low`：允许 30 FPS 表现帧率、进一步限制特效与分辨率比例。
- `reduced-motion`：与设备质量正交，降低镜头、震动和大幅运动。

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
- 生命周期回归门组合 Session、Replay、Pointer、Product Session、Profile Persistence 与 Product Presentation，并继续执行两条 100 局 soak。项目当前没有音频运行时，因此不把“音频挂起恢复”伪报为已覆盖。

### S9.3 平衡候选

- 运行预注册 seed 集，分层审查对局时长、三档能力、装备争夺和淘汰来源。
- 任何调参都生成独立候选，不循环覆盖同一报告。

### S9.4 三端性能与长稳

- 在每端低档与主流目标机运行最终包、多局 soak、前后台和上下文恢复。
- 建立质量 profile 和实测预算；不以桌面浏览器代替真机。
- 复用 [ADR-014](../decisions/014-arena-versioned-device-acceptance-evidence.md) 的版本/构建绑定和附件完整性边界，通过新的 Stage 9 Definition 增加性能指标；不改写 Stage 6 历史证据。

### S9.5 冻结评审

- 汇总配置 hash、报告、回放、缺陷清单、三端证据和剩余风险。
- 通过后形成 Stage 10 RC 输入；未通过则只修复当前候选。

## 进入 Stage 9 前仍需项目方确认

1. Web、微信、抖音各一台低档目标机和一台主流目标机。
2. 低档机允许表现层降到 30 FPS、Core 保持 60 Hz 的产品接受度。
3. 目标平台最终首包、总包和内存预算；以上线时官方限制与实测设备为依据。

这些决定不阻塞 Stage 6～8 的架构和自动化建设，但会阻塞 Stage 9 真机冻结。

## 阻断门禁

- 每份平衡结论都能由固定 Definition、seed、版本/hash 和脚本重现。
- 当前黄金回放严格一致，历史不兼容语料被明确拒绝而不是静默接受。
- 连续多局、前后台、上下文恢复和存储异常没有持续资源增长或串局。
- 低质量/30 FPS 表现下 Core 仍为 60 Hz，权威 hash 与高质量路径一致。
- 主要对局落在 2～3 分钟，异常分布和三档能力顺序有可解释证据。
- Web、微信、抖音的目标机启动、帧时间、内存和包体全部通过已确认预算。
- 所有阻断级和高优先级缺陷关闭；每个修复保留自动化或可重复实机证据。
