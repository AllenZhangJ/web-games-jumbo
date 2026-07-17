# Arena Stage 6 验收与证据矩阵

## 状态

执行中。本文定义 Stage 6 的完成证据，不表示后续批次已经通过。S6.1～S6.5.4 已提交；Web 真实浏览器和 100 局 Session soak 已通过。S6.6.1 当前候选已有盲测 Definition、确定性分组和报告合同，但采集入口与真实样本尚未完成；微信/抖音开发者工具和目标真机 E3 也仍未通过。实现边界见 [Stage 6 输入、移动与灰盒执行计划](../architecture/arena-stage6-input-movement-plan.md)，决策背景见 [ADR-009](../decisions/009-arena-semantic-input-and-movement-authority.md)。

## 使用规则

Stage 6 只有在本矩阵所有阻断项都有当前 commit 对应的权威证据后才算完成。以下证据不能互相替代：

- Node 单元测试不能证明触控发现性、手机单手操作或真机 WebGL 生命周期。
- 构建成功不能证明产物能在微信、抖音或手机浏览器运行。
- 截图不能证明回放、竞态、暂停恢复、资源回收或多局稳定性。
- 压力脚本跑完不能证明 Bot 没有读取未来；必须同时检查依赖与观察合同。
- 一次人工成功不能证明确定性；必须有相同输入的重复 hash。

每条证据记录必须包含：

1. Git commit 或未提交工作区标识。
2. 测试命令、seed、配置和样本数。
3. 原始输出或产物路径，而不是只写“通过”。
4. 若为设备证据，记录平台、客户端/基础库、设备、系统、方向和日期。
5. 若为盲测，记录方案、任务、成功定义、观察者和匿名样本编号。

建议把运行证据放在 `docs/acceptance/stage6/<commit-or-build-id>/`；生成物和录屏不进入权威规则目录。

## 证据等级

| 等级 | 证据 | 能证明什么 | 不能证明什么 |
|---|---|---|---|
| E1 | 纯 Node 单元/合同测试 | schema、状态转换、边界、依赖方向 | 实际整局和设备行为 |
| E2 | 无渲染模拟/回放/压力/模糊测试 | 多系统编排、确定性、稳定性、性能趋势 | 触控可用性和渲染资源 |
| E3 | Web/开发者工具/真机运行记录 | 平台输入、生命周期、渲染、资源与设备能力 | 新手是否理解操作 |
| E4 | 新手盲测与 A/B 记录 | 10 秒上手、误触和意图匹配 | 规则确定性和长时稳定性 |

“完成”必须使用该需求要求的最高证据等级，不能由更低等级推断。

## S6.1 合同与 Character 基础

| ID | 阻断要求 | 最低证据 | 必须验证的内容 |
|---|---|---|---|
| S6-C01 | CharacterDefinition 是版本化深冻结纯数据 | E1 | 拒绝未知字段、函数、访问器、循环、非有限值；调用方对象修改不能回写 |
| S6-C02 | CharacterRegistry 独立、只读且引用完整 | E1 | 重复 ID、未知角色、非法 movement/collision 数据在组合期失败；列表顺序稳定 |
| S6-C03 | Runtime 只保存稳定 ID 和可序列化状态 | E1 | 不持有 Registry、Definition、Physics body、Renderer 或回调 |
| S6-C04 | Map 安全使用实际角色数据 | E1/E2 | 角色直径、台阶高度或出生安全不再读取散落常量；不兼容角色/地图在开局前失败 |
| S6-C05 | Authority content hash 包含 Character/Movement | E1 | 内容顺序不影响 hash，语义数值变化必须改变 hash，外观路径不得改变 hash |
| S6-I01 | InputFrame V4 是唯一玩家/Bot输入合同 | E1 | 严格字段、有限归一化移动、全部布尔语义、未知 participant/tick/字段失败 |
| S6-I02 | InputFrame 无平台与墙钟数据 | E1/架构检查 | 禁止 Pointer ID、像素坐标、时间戳、Mapper ID、DOM 或宿主对象进入 Frame |
| S6-I03 | Replay/Match 版本显式提升 | E1/E2 | V3 回放明确拒绝；V4 完整录制 primary/jump/slam；缺失帧转中性帧 |
| S6-I04 | Bot 与玩家规范帧完全相同 | E1 | Bot 不使用内部扩展字段，不直接输出动作 ID 或 Movement 命令 |

S6.1 退出门：现有 Stage 5 地图、装备、Bot 和 MatchCore 脚本全部改用 V4 中性新字段后仍通过，且旧回放失败信息可诊断。

### S6.1 当前证据

| 证据 | 结果 | 边界 |
|---|---|---|
| `npm test` | 233/233 通过 | E1；含架构、敌意数据、内容快照、旧版拒绝和回放 |
| `npm run build` | Web/微信/抖音产物构建成功 | 只是构建 E2，不是真机 E3 |
| `npm run arena:poc:build` | 三端无渲染 POC 构建成功 | 只证明可打包与无浏览器依赖 |
| `npm run arena:map:stress` | 100 局、720,100 tick、3 份回放、100 唯一 hash | E2；地图 V4 兼容 |
| `npm run arena:bot:stress` | 900 局、9 份回放、900 唯一 hash；能力指数 `14.09 < 17.8567 < 18.61` | E2；不冻结 Stage9 最终胜率 |
| `npm run arena:stress` | 1,000/1,000 结束、5 份回放、0 非有限状态、1,000 唯一 hash | E2；平均 tick 0.05911ms，堆增长 3.04MB |
| `git diff --check` | 通过 | 格式门禁 |

完整命令、样本与限制见 [S6.1 合同门禁记录](../research/arena-stage6-contract-results.md)。该证据只关闭 S6.1，不能用来关闭本矩阵后续任何 E3/E4 项目。

## S6.2 Movement Rule/Core

| ID | 阻断要求 | 最低证据 | 必须验证的内容 |
|---|---|---|---|
| S6-M01 | Physics 与 Movement 写入权唯一 | E1/架构检查 | Physics 只写 transform/velocity/contact；Movement 只写 buffer/coyote/jump budget/mode |
| S6-M02 | 地面跳 tick 边界明确 | E1 | grounded、coyote 最后合法 tick、下一非法 tick、重生/硬直/淘汰均覆盖 |
| S6-M03 | Jump buffer 只消费一次 | E1 | 落地前、同 tick 落地、过期、连续按住、重复 edge 和取消场景 |
| S6-M04 | 二段跳预算无法被 contact 抖动恢复 | E1/E2 | 悬崖离地、台阶 probe、surface disable、边缘擦碰、落地一次恢复 |
| S6-M05 | 蹲跳是独立可配置规则 | E1/E2 | 蓄力上下限、打断、松开、硬直、离地、重生和冲量限幅 |
| S6-M06 | 下砸由权威落地触发 | E1/E2 | 地面禁止、空中启动、重复输入、surface 塌陷、落地效果一次、淘汰前后顺序 |
| S6-M07 | 走/跑由 Definition 与模拟决定 | E1/E2 | 摇杆阈值、斜向归一、加减速、空中控制、击飞时控制抑制和非有限值 |
| S6-M08 | ActionResolver 统一所有候选 | E1 | combat/locomotion/interaction lane、冲突标签、稳定 ID、注册顺序和 participant 顺序无关 |
| S6-M09 | 方案 B 的 primary 回退来自 Rule | E1 | 装备、互动、可命中基础动作、跳跃、none 的完整优先级；UI/Mapper 无复制判断 |
| S6-M10 | ActionAffordance 与实际选择同源 | E1/E2 | 同一快照与意图下提示和下一 tick 可选动作一致；不可用原因稳定且不泄漏隐藏信息 |
| S6-M11 | 命令批次失败关闭 | E1/E2 | 整批预验证、重复/伪造/乱序、port 抛错、重入；失败后 Core 不可继续 |
| S6-M12 | 固定 tick 阶段顺序有回归保护 | E1/E2 | 落地+跳跃、淘汰+动作、硬直结束+动作、地图塌陷+contact 的顺序和事件固定 |
| S6-M13 | Movement 全量进入 Snapshot/Serializer/hash | E1/E2 | 私有 buffer/预算不漏字段；调用方修改快照不能回写；回放 checkpoint 一致 |
| S6-M14 | 新增移动动作无需修改 MatchCore 类型分支 | E1/扩展测试 | 测试动作通过 Definition、Candidate Provider、Strategy/Command 注册接入 |

S6.2 退出门：纯 Node 可以完成走、跑、普通跳、蹲跳、二段跳和下砸；同 seed、同 V4 输入得到相同事件、checkpoint 和最终 hash。

### S6.2 当前证据

| 证据 | 结果 | 边界 |
|---|---|---|
| `npm test` | 276/276 通过 | E1；含原子批次、重入/失败关闭、缓冲跳主流程、tick 边界、affordance 同源与 participant 顺序 |
| `npm run arena:movement:stress` | 100 局、99,732 tick、3 份回放、100 唯一 hash；全部移动动作有覆盖 | E2；3 个长局覆盖地图塌陷，不是触控/真机证据 |
| `npm run arena:stress` | 1,000/1,000 结束、921,560 tick、5 份回放、1,000 唯一 hash | E2；平均 0.23615ms/tick，GC 后堆增长 4.16MB |
| `npm run arena:map:stress` | 100 局、720,100 tick、3 份回放、100 唯一 hash | E2；Stage 5 长时间轴回归通过 |
| Bot 回归 | 900 局原始数据、9 份回放、每档 300 唯一 hash；最终目标型指标 90 局复验通过 | 只证明 S6.2 未破坏旧 Bot；Bot 尚不会使用新动作，不能关闭 S6.3 |

完整命令、动作计数、性能与限制见 [S6.2 Movement 门禁记录](../research/arena-stage6-movement-results.md)。

## S6.3 Bot 公平性

| ID | 阻断要求 | 最低证据 | 必须验证的内容 |
|---|---|---|---|
| S6-B01 | Bot 只读公开 MovementSnapshot | E1/架构检查 | 自身状态可为当前公开值，对手与外部变化按 Profile 延迟；不导入 MatchCore/Physics/MovementSystem，不读取未来 contact、buffer 或私有地图 plan |
| S6-B02 | Bot 只输出 V4 InputFrame | E1/E2 | jump/slam 必须经过同一 Resolver、冷却、冲突、物理与地图规则 |
| S6-B03 | Bot 不具备完美边缘帧 | E1/E2 | coyote/jump buffer 使用普通输入；保留反应延迟、规划间隔、误差和暂停概率 |
| S6-B04 | Bot 不非法寻路或无限空中修正 | E1/E2 | 动态 surface、缺角、塌陷预警、不可达平台和下落状态 |
| S6-B05 | 难度来自 Profile 而非权限 | E1/E2 | 三档动作资格相同；只改变观察、决策、失误与反应参数；生产不泄漏难度 |
| S6-B06 | 新动作加入后能力仍有序且可解释 | E2 | 三档能力指标、跳跃成功/失败、地图自杀和下砸使用率；困难仍在真人输入范围 |

S6.3 退出门：机器人压力脚本覆盖三档、动态地图和全部移动动作；回放抽检一致，且架构测试证明无权威层旁路。

### S6.3 当前证据

| 证据 | 结果 | 边界 |
|---|---|---|
| `npm test` | 280/280 通过 | E1；含观测延迟/深冻结、affordance tick 一致、调度连续性、架构禁止依赖与 App/Session 回归 |
| `npm run arena:bot:stress` | 900 局、9 份回放、900 唯一 hash；能力指数 `7.50 < 18.72 < 19.51` | E2；三档全动作、走跑、下砸落地和动态地图均有覆盖 |
| 无归属 Bot 死亡 | 平均 `0.010 / 0.003 / 0.007` 次/局 | E2；未见高难度依靠大量地图自杀或非人类移动 |
| 依赖方向门禁 | Bot 层禁止 MatchCore、MovementSystem、Physics、Session、Replay、Renderer 依赖 | E1；只允许公开状态值与 V4 InputFrame |

完整原始计数与未证明边界见 [S6.3 Bot 移动与公平性门禁记录](../research/arena-stage6-bot-movement-results.md)。此处不冻结 Stage 9 发行胜率。

## S6.4 输入适配器与竞态

| ID | 阻断要求 | 最低证据 | 必须验证的内容 |
|---|---|---|---|
| S6-T01 | RawControlState 有唯一 Pointer 所有权 | E1/E3 | 左摇杆、右键、手势不能被同一 pointer 重复占用；陌生 pointer 的 move/end/cancel 被忽略 |
| S6-T02 | pressed/released edge 每 tick 至多消费一次 | E1/E2 | 同帧按下释放、render catch-up 多 tick、重复宿主事件和事件乱序 |
| S6-T03 | held 可以持续但暂停时强制清空 | E1/E3 | hide、blur、cancel、context loss、来电、入口替换后不残留移动/攻击 |
| S6-T04 | 恢复必须使用新触点 | E1/E3 | show/resume 不复活旧 pointer，不补发后台动作，不追赶后台时间 |
| S6-T05 | A/B Mapper 严格可替换 | E1 | 相同接口、不可变配置、无 Rule/Physics/Equipment 导入；输出均为 V4 Frame |
| S6-T06 | Gesture Recognizer 与 Mapper 分离 | E1 | dead zone、划动、保持、方向识别可独立测试；Gesture 不读取玩法状态，Mapper 除只读 ActionAffordance 外不读取其他玩法对象 |
| S6-T07 | 输入采样不依赖 Renderer FPS | E2/E3 | 30/60/120Hz 外层调度在相同规范采样下得到相同 Core hash |
| S6-T08 | 生命周期终态不可重入 | E1/E3 | start 并发、pause/resume 乱序、destroy 幂等、destroy 后迟到回调、失败后不可复用 |

### 生命周期/竞态场景

| 场景 | 必须结果 |
|---|---|
| start 前收到 hide/show | 记忆可见状态，但不提前启动比赛 |
| held 期间 hide | 同步清空所有 pointer、held 和 edge；Core 从下一 tick 接收中性输入 |
| hide/show 快速交替 | paused tick 不推进；恢复不 catch-up；只存在一个帧循环 |
| 同一帧 pointerdown + pointerup | pressed 只进入一个固定 tick，held 在后续 tick 为 false |
| catch-up 一次推进多个 tick | edge 只给首个待消费 tick，held 按采样规则重复，不能重复 pressed |
| 旧 Session 尚在异步启动时替换 | 旧实例立即失效；迟到完成不得绑定监听器或覆盖新实例 |
| destroy 与宿主 cancel 同时发生 | 允许任一先到，资源只释放一次，迟到事件无副作用 |
| Renderer/资源初始化失败 | 不进入可交互状态；已创建 Session、监听器和资源全部释放 |
| WebGL context loss | 输入和表现暂停；Core 行为按明确策略暂停或无渲染继续，不能两种状态混用 |
| 再来一局连续触发 | 只创建一个新 Session；旧比赛不再接受输入或调度帧 |

S6.4 退出门：上述场景均有自动化测试；Web、微信开发者工具、抖音开发者工具至少各完成一次多点触控、取消和前后台冒烟。

当前本机证据：29 项输入/集成/架构定向测试通过；30/60/120Hz 外层调度得到相同 180 个规范帧、最终快照和 hash；80 局输入 fuzz 覆盖 72,000 tick、4 份完整回放、878 次 resize、480 次暂停恢复和 2,820 次合法 cancel。详情见 [S6.4 输入与竞态门禁记录](../research/arena-stage6-input-results.md)。Web/微信/抖音 E3 未执行，因此这里不标记完整退出。

## S6.5 灰盒 Presentation 与 Session

| ID | 阻断要求 | 最低证据 | 必须验证的内容 |
|---|---|---|---|
| S6-P01 | Renderer 只消费只读快照与事件 | E1/E2 | 禁止调用 Rule/Physics mutation；关闭 Renderer 后 hash 不变 |
| S6-P02 | 程序化角色不参与碰撞 | E1/E3 | 模型尺寸、动画 root motion、挂点和视觉插值不能改变权威 transform |
| S6-P03 | 相机不影响输入世界方向 | E1/E3 | 六方向语义、相机跟随和屏幕旋转后移动方向映射明确且稳定 |
| S6-P04 | HUD 提示来自 ActionAffordance | E1/E3 | 图标/文本不自行计算攻击距离、装备冷却、跳跃资格或互动优先级 |
| S6-P05 | 事件有稳定 ID 并去重 | E1/E2 | 帧跳过、恢复、重复 render、重建 Scene 不重复音效、粒子或结算 |
| S6-P06 | Session 是跨层生命周期唯一所有者 | E1/E3 | listener、RAF、Core、Bot、Renderer、纹理、材质、几何体均在失败/替换/destroy 回收 |
| S6-P07 | 快速匹配到再来一局闭环 | E2/E3 | 匹配、准备、对局、淘汰、结算、再来一局可连续完成；不泄漏 Bot/难度 |
| S6-P08 | 连续多局资源有界 | E2/E3 | 至少规定局数的 listener、RAF、Scene object、GPU resource 和 heap 回到稳态区间 |
| S6-P09 | 三端产物可构建并启动 | E2/E3 | Web、微信、抖音构建；宿主 API 隔离；错误有可诊断可见反馈 |

S6.5 退出门：必须有当前构建的 Web 截图/录屏和开发者工具运行记录；Node 构建日志不能替代运行证据。正式角色资产、正式音效与特效不属于本门。

## S6.6 新手盲测与 A/B 冻结

### 任务脚本

受测者只获得“移动并把对手击出平台”的目标，不提前解释上下文优先级。两方案使用相同角色碰撞、地图、装备池、seed 分层、HUD 信息量和设备方向。

每个样本至少记录：

- 首次有效移动时间。
- 首次主动跳跃、二段跳和下砸是否成功。
- 首次正确使用 primary 的时间。
- 玩家预期动作与实际动作不一致次数。
- 误触、重复点击、放弃输入和主动纠错次数。
- 单手是否能完成任务。
- 10 秒内是否完成“移动 + 一次正确上下文动作”。
- 结束后的简短复述：玩家认为按钮在地面、空中、有装备时分别做什么。

### 默认试验门槛

- 先做每方案至少 5 名未接触本项目的新手 pilot；学习过一个方案的样本不能直接当另一个方案的“首次接触”样本。
- 至少 80% 样本在 10 秒内完成移动和一次正确上下文动作，才满足“10 秒学会”的阶段目标。
- 若两方案的主要指标差距小于 10 个百分点，或误触与意图匹配给出相反结论，不宣称胜者；调整提示/阈值后重新测试。
- 方案冻结必须记录选择理由、被拒方案问题和最终 Mapper 配置；ADR-009 再从“提议”更新为“已接受”。

这些是 Stage 6 的默认 pilot 门槛，不是发行级统计结论。Stage 9 仍需更大样本和平衡/设备数据。

S6.6.1 当前本机合同证据见 [S6.6 输入盲测合同记录](../research/arena-stage6-input-pilot-contract.md)：固定 Definition 与分组 seed、每个完整区组 A/B 平衡、assignment 防误改、记录来源分离、无效样本排除、真实放弃保留、去标识聚合和保守候选判定均有自动化测试。该证据不能替代采集入口竞态测试或 E4 真人记录。

## 模糊测试与压力脚本要求

实现阶段应提供以下独立命令；命令不存在或没有门禁断言时，不能将对应项标记完成：

| 计划命令 | 目的 | 最低断言 |
|---|---|---|
| `npm run arena:movement:stress` | 多 seed 完整移动/地图模拟 | 无 NaN、非法跳数、卡死、悬空支撑、回放分叉 |
| `npm run arena:input:fuzz` | 随机 pointer/gesture/lifecycle 序列 | 无 stuck held、重复 edge、重入、destroy 后副作用 |
| `npm run arena:session:soak` | 连续多局与替换/恢复 | 局数完整、资源有界、无状态串局、无未处理错误 |
| `npm run arena:bot:stress` | 三档隐藏 Bot 全动作验证 | 输入合法、能力有序、回放一致、无作弊指标 |
| `npm run arena:stress` | MatchCore 性能与稳定性 | 完整结束、hash 唯一、回放一致、逻辑/堆预算通过 |

Fuzz 必须使用记录在输出中的固定 seed；发现失败后将最小化事件序列固化为 Regression Test，不能只增加重试。

## 阶段总门禁

Stage 6 提交候选至少运行：

```bash
npm test
npm run arena:poc:build
npm run arena:stress
npm run arena:map:stress
npm run arena:movement:stress
npm run arena:input:fuzz
npm run arena:bot:stress
npm run arena:session:soak
npm run build
git diff --check
```

其中 `arena:movement:stress` 已在 S6.2 实现；`arena:input:fuzz` 已在 S6.4 实现并通过当前 80 局门禁；`arena:session:soak` 已在 S6.5.4 实现并通过 100 局、9 次前后台、6 次 context loss/restore、14 次 resize 门禁。当前数据见 [S6.5 灰盒与 Session 门禁记录](../research/arena-stage6-presentation-results.md)。

最终完成判定还需要：

- 架构测试证明 Rule/Core 不导入 Bot、Presentation、Three.js、DOM 或宿主 API。
- Renderer 关闭与开启两条路径复放同一规范输入，事件和最终 hash 一致。
- Web、微信开发者工具、抖音开发者工具的当前构建运行证据。
- A/B pilot 原始记录与冻结结论。
- 所有阻断级和高优先级问题关闭，不能用“后续优化”替代。

## Stage 6 明确不证明的事项

- 正式角色、六方向动画、衣服/翅膀/挂件/拖尾资产质量：Stage 7。
- 局外奖励、解锁、损坏存档恢复和完整教程：Stage 8。
- 2～3 分钟发行时长分布、最终 Bot 胜率、目标低端机性能与包体冻结：Stage 9。
- 真人 PvP、服务器权威、账号与社交：Arena V1 不包含。
