# Arena 企业治理状态台账

- 更新时间：2026-07-23
- 当前分支：`feature/arena-enterprise-governance`
- Arena 产品基线：`51e28220295c080261d30e33aaac7e43c5f91685`
- 目标：达到与最新 `origin/main` 的合并前审计条件；不执行合并
- 总体状态：迁移中，不可合并，不可宣称正式发布

## 决策登记

| 决策 | 已确认值 |
| --- | --- |
| 唯一生产游戏 | Arena |
| 旧数值跳台 | 仅保留于 Git 历史，不提供运行时兼容 |
| 真实用户数据迁移 | 无 |
| 项目负责人 | Allen（`@AllenZhangJ`） |
| 正式资产审批角色 | 项目唯一负责人 |
| 程序化角色 | 仅正式资产加载失败兜底 |
| Greybox/Study/Pilot/POC | 仅开发/测试，不进入生产交付 |
| 性能策略 | 不降低分辨率、抗锯齿、动作或关节；优化算法与生命周期 |
| 诊断 | 仅本地证据，不新增网络遥测 |
| 合并门禁 | 自动化 + 三端 clean build + Web 手机验收 |
| 发布门禁 | 合并门禁 + 微信/抖音 iOS/Android 真机记录 |
| 提交策略 | 中文批次提交、逐批推送、禁止 force push |

## 批次状态

| 批次 | 状态 | 当前证据或阻断 |
| --- | --- | --- |
| G0 基线冻结 | 已完成 | 自动化、压力、资产和三端构建通过；ADR/计划/证据已落盘；tag `arena-product-baseline-51e2822` 指向基线提交 |
| G1 治理外壳/唯一产品 | 已完成 | Arena 已成为唯一生产产品；旧产品实现/专属测试/资产/规范已退役；strict TS、ESLint、Vitest、CI、CODEOWNERS、JS 递减清单和唯一产物门禁已启用 |
| G2 Definition/合同/配置 | 已完成 | strict TS `arena-contracts`、`arena-definitions`、`arena-profile-contracts` 与 `arena-platform-contracts` 已承接确定性、输入/事件、权威快照、同步存储、平台能力、玩家档案/存档协议，以及动作/角色/装备/地图 Definition、只读 Registry 和唯一 Gameplay V2 数值配置；受审计 JavaScript 已降至 500 个 |
| G3 Rule/Core/Replay | 已完成 | strict TS `arena-core`、`arena-movement`、`arena-physics`、`arena-equipment`、`arena-map` 与 `arena-match` 已承接规则/移动/物理/装备、完整地图权威链、比赛配置、Participant/Timeline 唯一写入者、角色 Runtime/物理投影、状态 hash、完整 MatchCore 编排、fixed-step Runtime 与 Replay；strict `arena-v1-content` 集中发布具体动作、装备、角色、地图、移动动作与平衡 Definition；黄金语料保持 `0dace228` |
| G4 Bot/Product/Persistence | 已完成 | strict TS Bot、Matchmaking、Quick Match、Local Match Session、Product State、Progression、ProductMatchResult、奖励事务、Profile Service/Repository、Storage Lease、Product Match、Product Session Controller、对称内容池、Arena V1 产品内容与通用 Product Composition 已闭环；Arena V1 应用组合根已在 G6.36 归入独立 strict 包 |
| G5 Presentation/资产/反馈 | 已完成 | strict `arena-presentation-contracts`、`arena-presentation-runtime`、`arena-v1-presentation-content`、`arena-product-presentation`、`arena-presentation-three` 与 `arena-product-presentation-three` 已承接通用合同、输入/反馈/生命周期、具体 V1 表现、Product 表现所有权和 Three Surface；设备/性能证据合同已归入独立 strict 包；共享对局资源取得/回滚原语完成 strict 迁移。生产 Product Session 组合已在 G6.37 归包；旧 Greybox ArenaPresentationSession 是 G6 应用根，Pilot 是 G7 测试/研究链，不再伪装为 G5 通用表现缺口 |
| G6 Platform/入口/构建 | 进行中 | 三端默认入口是 Product；运行实例 ID、启动协调、失败兜底、Web teardown、三端平台适配、Arena V1 应用组合根、生产 Session、顶层 Launch、Web Product UI、三端实际 Product Entry，以及 Greybox Session 组合、表现生命周期、应用根和三端 Greybox Entry 均已 strict 化。Web 研究环境、clean build 身份、JSON 下载所有权、Human Match Study Product Runtime、Study/Pilot Workbench View 及两个研究薄启动入口已 strict 化；两个研究 Web App 待迁移，并继续证明生产交付和开发/研究入口彻底隔离 |
| G7 零 JS/完整质量门 | 进行中 | 独立 strict `arena-human-match-study` 已承接真人研究通用 Definition、Assignment、Capture Session、Submission/Record、Bundle、Capture Package、Checkpoint/Receipt/Workspace/Envelope，以及 Arena Stage 9 真人公平性 V1 内容定义；独立 strict `arena-input-pilot` 已承接 Input Pilot 共享词汇、Definition/Registry/Assignment/V1、Record Fields/Record、Review Draft、Form Model、同步存储 Port/Lease、Assignment Match Service、Trial Runtime Port、Trial Checkpoint/State、Enrollment Ledger、Workspace/Envelope/Repository、Coordinator、评估 Report、Audit/Aggregate Export、Evidence Bundle、Action Metrics、Metric Collector、Observed Session/Match Service 与 Trial Controller；独立上层 strict `arena-input-pilot-presentation` 已承接 Pilot 表现运行时。ESLint、strict TypeScript、Vitest 和 JavaScript 精确递减门禁持续运行。其余 Study/Pilot/Release/测试链迁移、正式 coverage 阈值和零 JS 尚未完成 |
| G8 资产/安全/所有权 | 未开始 | CODEOWNERS、CI 安全与正式资产最终批准待补齐 |
| G9 文档归真 | 未开始 | README 首标题和大量章节仍以数值跳台 v3 为产品真值 |
| G10 最新 main 审计 | 未开始 | 只能在 G0-G9 完成后执行；禁止实际合并 |

## G0 已取得证据

完整数值见 [Arena 产品基线 51e2822](../baselines/arena-product-51e2822.md)。当前已确认：

- `npm test`：696/696 通过；该总数混含旧产品测试，尚不能作为 Arena 专属覆盖结论。
- 黄金 Replay manifest：`0dace228`，4 个样本通过。
- 输入 fuzz：120 场、6 次 Replay 复验、120 个唯一 final hash。
- 生命周期专项：91/91 通过。
- Presentation/Product soak：各 100 场，堆增长均低于 8 MiB，资源残留为零。
- 移动压力：100 场、417355 tick、100 个唯一 final hash、3 个 Replay 样本，门禁通过。
- Product 压力：200 场；Profile 压力：500 次提交，门禁通过。
- 正式资产预算：结果 `82a8b378`，策略 `532faaa2`，通过。
- 三端 clean build 与预算：通过；当前 Web/微信/抖音 delivery 分别为 3773570 / 3587013 / 3586988 bytes。

## 当前不可合并原因

1. 当前 216 个受维护 JavaScript 文件仍在精确允许清单中；G6 尚需迁移两个研究 Web App，G7 尚需迁移其余 Pilot/Study/Release/其他测试与验收链并建立零 JS 门禁。
2. Vitest 当前保护底层合同包和治理门禁；Arena 其余测试尚待按 workspace 迁移并建立正式 coverage 阈值与零 JS 门禁。
3. 正式资产最终审批与完整安全/依赖长期治理尚未闭环。
4. 文档仍含迁移前阶段性叙述，尚未完成 G9 全量链接、状态与命令归真。
5. 尚未对治理完成后的候选提交与最新 `origin/main` 做独立虚拟合并审计。

以上是迁移入口，不是已接受的永久例外。

## G1 完成证据

- 旧产品退役范围和 Arena 承接关系见 [退役数值跳台能力映射](retired-v3-capability-map.md)。
- Node 测试：638/638 通过；相对 G0 减少的 58 项来自六个已登记旧产品测试文件。
- JavaScript 精确清单：基线 549，当前 521；新增或未登记 JavaScript 为零。
- strict TypeScript、ESLint 和 Vitest 治理测试全部通过；ESLint 同时检查现存 JS，并清理了 15 个存量静态问题。
- 生产依赖 `npm audit --omit=dev --audit-level=high`：0 vulnerabilities。
- 黄金 Replay manifest 保持 `0dace228`，正式资产预算保持 `82a8b378`。
- Web 生产交付只含 `index.html`；Greybox/Study/Pilot/`product.html` 不再进入产物。
- Web delivery 从 3773570 B 降至 3560653 B，JavaScript 从 1395707 B 降至 1217043 B；微信/抖音仍在既定预算内。
- `.github/CODEOWNERS` 使用有效账号 `@AllenZhangJ`；CI 使用 Node 20、`npm ci` 和统一 `npm run check`。

## G2.1 确定性合同包迁移证据

- 新增 strict TypeScript workspace：`@number-strategy-jump/arena-contracts`，只承载最底层无宿主数据合同，不依赖 Core、Bot、Presentation、Three.js、DOM 或平台 API。
- 安全数据克隆/冻结、Definition 参数校验、稳定 FNV-1a 数据哈希、seed 派生和确定性随机流已从 3 个散落 JavaScript 模块迁入该包。
- 203 个上层消费文件改为通过包公开 API 引用合同；旧的相对路径实现已删除。
- JavaScript 精确允许清单由 521 降至 518，未出现新增或未登记 JavaScript。
- strict TypeScript 构建、ESLint、5 项 Vitest 包/治理测试和 638 项 Node 测试通过。
- 黄金 Replay manifest 保持 `0dace228`；三个目标构建、唯一生产产物检查和预算门禁通过。
- 本节仅证明 G2 首个迁移批次通过，不代表 G2 已完成；Definition、Registry、输入/事件/快照/平台/存档合同和统一数值配置仍是后续阻断项。

## G2.2 动作与角色 Definition 迁移证据

- 新增 strict TypeScript workspace：`@number-strategy-jump/arena-definitions`，依赖仅指向 `arena-contracts`。
- 动作与角色的 Definition、公共字面量类型、不可变返回类型和只读 Registry 已迁入包公开 API；原 4 个 JavaScript 实现已删除。
- Registry 构造阶段执行完整归一化、稳定 ID 排序和重复 ID 拒绝，不向调用者暴露内部可变集合。
- 所有生产与测试消费者改为通过 workspace 包导入，不再依赖原源码相对路径。
- JavaScript 精确允许清单由 518 降至 514；8 项 Vitest 包/治理测试和 44 项动作/角色/移动定向回归通过。
- 本批提交时尚未迁移统一数值配置；该项已由下方 G2.3 承接。装备、地图、输入、事件、存档与平台合同仍是 G2 阻断项。

## G2.3 唯一 Gameplay 数值配置迁移证据

- 移动、跳跃、拾取、8 个地面/空中攻击及其范围、起手/生效/收手/冷却、击退和僵直已迁入 `arena-definitions` 的 strict TypeScript 配置真值。
- 现有权威数值逐项保持不变，稳定配置 hash 为 `8c322912`；任何数值变更都必须显式更新受审查 hash 和 Replay 证据。
- `npm run arena:config:print` 直接输出运行时消费的完整配置，不维护第二套手抄表；字段对应关系见 [Arena Gameplay V2 数值配置真值](arena-gameplay-config.md)。
- 角色、装备、Product 和物理配置消费者全部改用 workspace 公共入口；16 项配置/角色/装备定向测试通过。
- JavaScript 精确允许清单由 514 降至 513；当时待迁移的装备与地图已由下方 G2.4 承接，输入、事件、存档和平台合同仍是 G2 阻断项。

## G2.4 装备与地图 Definition 迁移证据

- 装备 Definition/Registry 已迁入 `arena-definitions`：构造期校验拾取/掉落策略，并通过只读 ActionRegistry 拒绝地面或空中动作悬空引用。
- 地图 Definition/Registry 已迁入 `arena-definitions`：构造期校验 surface、出生点支撑、装备点归属、事件 schedule 和 10000 次时间轴安全上限。
- Registry 只发布重新归一化、冻结且按稳定 ID 排序的定义，不保留调用者可变对象引用。
- 22 项装备、地图和地图权威集成测试通过；strict TypeScript、ESLint、公共包测试与架构门禁通过。
- JavaScript 精确允许清单由 513 降至 509；当时待迁移的输入与事件协议已由下方 G2.5 承接，快照、存档与平台合同仍是 G2 阻断项。

## G2.5 InputFrame 与权威事件协议迁移证据

- `InputFrame V4`、批量缺帧补中立输入、移动向量归一化和 Arena 权威事件词表已迁入 `arena-contracts` strict TypeScript 公共 API。
- Bot、Core、Replay、实验、输入适配和测试统一从同一包消费协议；物理层保留兼容导出但不再维护第二份移动归一化算法。
- InputFrame 在权威状态变更前拒绝未知字段、访问器、非法 tick、重复 participant、非布尔边沿和越界移动；事件类型由字面量联合类型约束。
- 31 项输入、物理与架构定向测试通过；黄金 Replay 后续仍作为全门禁验证。
- JavaScript 精确允许清单由 509 降至 507；快照、存档和平台合同仍待迁移，G2 保持进行中。

## G2.6 同步存储与平台能力合同迁移证据

- Profile、Pilot 与 Study 共用的同步存储 Port 已迁入 `arena-contracts`：宿主 Promise、矛盾读结果和非布尔写/删回执在进入仓库状态前被拒绝。
- Canvas 准备、帧调度、WebGL2 校验、存储并发声明和默认平台 Port 已迁入独立 `arena-platform-contracts` strict TypeScript workspace；权威层禁止依赖该外围包。
- Web/微信/抖音适配仍在 `src/platform` 作为 G6 迁移对象；本批未改变宿主时钟、触控、安全区、离屏 Canvas 或存储语义。
- strict 公共包测试 16 项、Profile/Pilot/Study 存储定向测试 52 项、平台/架构定向测试 56 项与三端构建前置验证通过。
- JavaScript 精确允许清单由 507 降至 505；权威快照和 PlayerProfile 存档 schema 仍是 G2 阻断项。

## G2.7 权威快照合同迁移证据

- MatchCore 公开/内部快照、Participant、Movement、Equipment、Map、Result 与 RNG state 的 strict TypeScript 结构已进入 `arena-contracts`。
- 显式审计器拒绝未知字段、访问器、非有限向量、重复 ID、引用错配、无效 tick 关系和非 uint32 随机状态。
- 审计器仅供迁移、fixture、Replay 工具和边界测试显式调用；MatchCore 每 tick 快照路径未加入重复深拷贝/深校验，避免手机端额外发热。
- strict 公共包测试增至 17 项，并由真实 MatchCore 公开快照完成集成验证；JavaScript 数保持 505，PlayerProfile 存档 schema 仍是 G2 最后阻断项。

## G2.8 玩家档案与存档协议迁移证据

- 新增 strict TypeScript workspace：`@number-strategy-jump/arena-profile-contracts`；依赖仅指向底层 `arena-contracts`，不拥有 Storage、租约、CAS、平台 API 或产品生命周期。
- `PlayerProfileDefinition`、不可变 Profile、revision 更新、存档信封、未来 schema 错误和连续迁移 Registry 已迁入公共包；所有生产、测试和压力脚本消费者改用包入口，旧 5 个 JavaScript 实现已删除。
- 存档信封继续绑定 payload 稳定哈希与 generation；迁移函数仍对隔离输入执行两次并比较确定性哈希，未来 envelope、payload 与嵌套 Profile 均拒绝被旧客户端覆盖。
- strict 公共包测试增至 20 项；65 项 Profile/Product 定向回归与 500 次 A/B 存档提交压力通过，JavaScript 精确允许清单由 505 降至 500。
- G2 交付范围已关闭；Repository、租约、CAS、唯一 Profile 写入者和产品生命周期作为有状态能力留在 G4 迁移，不在协议批次混改并发语义。

## G3.1 动作状态与裁决核心迁移证据

- 新增 strict TypeScript workspace：`@number-strategy-jump/arena-core`；依赖仅指向 `arena-contracts` 和 `arena-definitions`，明确禁止 Bot、Product、Presentation、Three.js、DOM、平台 API 与墙钟时间。
- Action phase/runtime state、候选归一化与稳定排序、输入通道裁决、lane/conflictTag 仲裁、冷却/不可用回退和只读 Affordance 投影已迁入包公开 API。
- Resolver 仍只认识通用 ActionDefinition 与候选，不认识 hammer/chain/shield 或 Equipment 实现；Architecture 门禁已改为直接审计 strict TS 源文件。
- strict 公共包测试增至 22 项；63 项动作、规则、移动和架构定向回归通过，JavaScript 精确允许清单由 500 降至 496。
- 本批未迁移 ActionExecutionSystem，权威动作计时唯一写入者及其状态变化仍保持原实现；它是 G3.2 的下一依赖层。

## G3.2 动作执行唯一写入者迁移证据

- `ActionExecutionSystem` 已迁入 `arena-core` strict TypeScript 公共 API，ActionRuntimeState 仍只有该系统写入 phase、剩余 tick 与命中目标集合。
- start batch 会先验证所有 participant、lane、input channel、Definition 引用、活动 conflictTag 与同 tick 冲突，再按稳定 participant/lane/definition/candidate 顺序一次提交；中途输入错误不会留下部分动作。
- advance、recordHits、interrupt、reset、当前/下一 tick constraints 与只读快照均获得显式类型；内部 Map 缺项、非 idle 缺失 definitionId 等不可能状态 fail closed。
- strict 公共包测试增至 23 项；51 项 ActionExecution/Resolver/Rule/Architecture 定向回归通过，JavaScript 精确允许清单由 496 降至 495。
- G3 下一批迁移通用 targeting/effect/command Registry 与 RuleEngine；本批未改变权威 tick、ActionDefinition 数值或 Replay schema/hash。

## G3.3 通用动作策略迁移证据

- targeting、action effect 与 rule command 三类 Registry 及默认处理器已迁入 `arena-core` strict TypeScript 公共 API，旧六个 JavaScript 实现删除，所有生产与测试消费者改从包入口导入。
- Targeting 只读取冻结 actor 快照并稳定排序唯一 target ID；Effect 只把不可变 Definition 与上下文解析为冻结 RuleCommand；Command Registry 在执行任何 mutation port 前先验证完整批次是否均有处理器。
- 自定义 Movement effect handler 仍通过同一个通用接口扩展，核心策略不知道 Movement、Equipment 或具体角色；命令提交仍由 RuleEngine 掌控，Registry 未新增第二个权威状态写入者。
- 参数在 Registry 边界每次只验证一次，默认处理器不做重复逐 tick 校验；未增加墙钟、随机、平台、DOM、Three.js 或通用事件总线依赖。
- strict 公共包测试增至 26 项；45 项策略、RuleEngine、Movement 与架构定向回归通过，JavaScript 精确允许清单由 495 降至 489。
- G3 下一批单独迁移 `ArenaRuleEngine`，保持审查面可控；本批未改变 Gameplay V2 数值、权威 tick、命中次序或 Replay schema/hash。

## G3.4 ArenaRuleEngine 迁移证据

- 753 行 `ArenaRuleEngine` 已迁入 `arena-core` strict TypeScript 公共 API，动作解析、同 tick 双向命中、正面 guard、命令批次提交、Affordance、装备委托和终止生命周期均获得显式输入/输出类型。
- RuleEngine 不再直接导入或构造具体 Equipment/Movement 实现；组合层注入 `createEquipmentSystem` 与不可变 Movement command adapter，核心只依赖窄合同，消除 workspace 对上层 JavaScript 的反向依赖。
- RuleEngine 仍拥有注入 EquipmentSystem 的完整生命周期；工厂返回不完整对象时会先调用其 `destroy()` 再拒绝构造，清理也失败时以 `AggregateError` 同时保留原合同错误和清理原因。
- commit 会先验证 port 与完整命令支持集，再进入不可重入提交区；mutation port 抛错后 RuleEngine fail closed。迁移未新增事件总线、平台、渲染、墙钟或随机依赖。
- 迁移过程移除了类型收窄导致的临时 actor Map 分配及重复 InputFrame Map 查询，逐 tick 主路径不增加这些额外工作。
- strict 公共包测试增至 27 项；117 项 RuleEngine、Equipment、Movement、MatchCore 与架构定向回归通过，JavaScript 精确允许清单由 489 降至 488。
- G3 下一批按依赖方向迁移 Movement/Equipment 与 Physics，再收敛 Map、MatchCore 和 Replay；本批未改变 Gameplay V2 数值、Replay schema 或黄金 hash。

## G3.5 移动规则原语迁移证据

- 新增 strict TypeScript workspace：`@number-strategy-jump/arena-movement`；依赖仅指向 `arena-contracts` 与 `arena-definitions`，架构测试同时扫描其完整源码并核对 package 依赖白名单。
- 可序列化 MovementRuntime、命令、物理 mutation、角色 Definition 驱动的 walk/run 意图投影、只读能力计算和稳定序列化已迁入包公共 API；原 6 个 JavaScript 实现删除，所有生产与测试消费者统一从包入口导入。
- 运行时 identity 继续以不可写数据属性固定；临时状态可克隆、可重置且 revision 单调递增。快照继续校验模式互斥、角色引用、coyote/buffer/空中跳/蓄力边界，序列化继续拒绝重复 participantId。
- 命令与 mutation 继续在权威状态变更前完成未知字段、类型和范围校验；能力投影和意图投影均不写入状态，且未引入 Physics、MatchCore、Bot、Presentation、Three.js、DOM、平台、墙钟或随机依赖。
- strict 公共包测试增至 32 项；42 项 Movement、ActionResolver、MatchCore 与输入集成定向回归通过，JavaScript 精确允许清单由 488 降至 482。
- G3 下一批迁移 Movement 的状态转换、执行计划、tick batch 和唯一写入系统，再通过窄端口迁移 Physics；本批未改变 Gameplay V2 数值、权威 tick、攻击挥空、空中下劈、Replay schema 或黄金 hash。

## G3.6 MovementSystem 唯一写入者迁移证据

- Movement 状态转换、命令执行计划、prepare/complete tick 批次与 `MovementSystem` 已迁入 `arena-movement` strict TypeScript；原 4 个 JavaScript 实现删除，MatchCore 与测试只从包公共入口构造唯一写入系统。
- `MovementSystem` 公共构造、prepare/execute/complete、能力投影、水平意图、reset/interrupt、快照和物理 mutation port 均有显式类型；执行计划和状态转换保留为包内部实现，不扩大公共 mutation API。
- prepare 在提交前克隆并验证所有 participant 状态；execute 在调用物理 port 前完成全命令排序、重复 participant 拒绝、能力校验、mutation 生成及状态草稿快照校验；complete 必须匹配已准备且已执行的连续 tick。
- mutation port 只允许同步单批提交；异步回执、异常或重入会让系统 fail closed。无效输入在进入 mutation 区前拒绝并保持系统可继续使用；destroy 幂等且清理全部 Map 和准备态引用。
- strict 公共包测试增至 35 项，其中新增正常完整 tick、输入前置拒绝和物理 port 失败关闭三条写入者合同；54 项 Movement、MatchCore、输入集成和架构定向回归通过，JavaScript 精确允许清单由 482 降至 478。
- G3 下一批迁移物理 mutation 窄端口与确定性 lightweight physics，再迁移 Equipment；本批未改变 Gameplay V2 数值、攻击可挥空、空中下劈、权威 tick、Replay schema 或黄金 hash。

## G3.7 物理合同与 Movement mutation 端口迁移证据

- 新增 strict TypeScript workspace：`@number-strategy-jump/arena-physics`；物理世界、Arena/角色输入、向量、角色状态/reset 和 Movement mutation port 均有显式合同。
- `assertPhysicsWorld` 统一验证九项完整同步能力；Arena surface 和角色 Definition 在进入世界前验证有限数、正范围、唯一 ID 并复制向量，避免调用方后续修改写回物理运行时。
- Movement→Physics port 会先归一化完整 mutation 批次，再对世界执行一次同步 `applyCharacterMutationBatch`；任何一项非法时世界调用次数保持为零，不出现部分物理提交。
- G3.7 提交时 `arena-physics` 只依赖 `arena-contracts` 与 `arena-movement`；G3.8 为直接消费唯一 Gameplay V2 Definition 增加 `arena-definitions` 依赖。架构门禁持续扫描全部 strict 源码并核对精确依赖白名单；不依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台、墙钟或随机源。
- strict 公共包测试增至 37 项；62 项 Physics、Movement、MatchCore、Replay 与架构定向回归通过，JavaScript 精确允许清单由 478 降至 476。
- G3 下一批迁移 429 行 lightweight 固定步长求解器，并把默认物理配置直接绑定到 Gameplay V2 Definition；POC 的性能计时和报告继续留在开发/测试编排层。

## G3.8 lightweight 固定步长求解器迁移证据

- 429 行 lightweight 求解器已从 `src/arena` JavaScript 迁入 `arena-physics` strict TypeScript；MatchCore、Replay、物理合同测试和 POC 只从包公开入口构造物理世界，不再存在旧实现路径。
- 默认 tick rate、fixed delta、重力、角色碰撞/质量/移动、水平与垂直速度上限、地面探测、自动跨步、地面吸附和 substep 全部直接由 `ARENA_GAMEPLAY_V2_TUNING` 派生；G3.15 后由 `arena-match` 引用同一只读对象，不再存在 `src/arena/config.js` 或第二份物理数值。
- 求解器内部角色、surface、配置、批量 mutation 草稿和稳定分离方向均有显式类型；角色排序索引或 Map 关系一旦破坏会 fail closed，固定 tick 之外的步长、销毁后调用、非法 surface/角色和非有限速度继续前置拒绝。
- Movement mutation 使用 `arena-movement` 的唯一 kind 合同；完整批次先形成草稿再一次提交，后项失败不会写入前项。角色碰撞顺序按稳定 ID 排序，同 Arena、输入和 tick 得到相同角色状态。
- POC 的 `performance.now()`、压力 tick 和报告仍只存在于开发/测试编排层，权威 `arena-physics` 包未引入墙钟、随机、Three.js、DOM 或平台 API。
- strict 公共包测试增至 41 项；62 项 Physics、Movement、MatchCore、Replay 与架构定向回归通过，JavaScript 精确允许清单由 476 降至 475。
- G3 下一批迁移 Equipment 规则与运行时，再按依赖方向收敛 Map、MatchCore 和 Replay；本批未改变 Gameplay V2 数值、权威 fixed tick、Replay schema 或黄金 hash。

## G3.9 装备运行时与确定性裁决原语迁移证据

- 新增 strict TypeScript workspace：`@number-strategy-jump/arena-equipment`；装备碰撞距离、冷却、运行时状态/快照、spawn、序列化、自动拾取竞态与死亡掉落回退七个 JavaScript 实现迁入包公共 API。
- 包只依赖 `arena-contracts` 与 `arena-definitions`，架构门禁扫描完整源码并核对精确依赖白名单；不依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台、墙钟或随机源。
- EquipmentRuntime 的稳定 identity 与可变状态获得显式分离类型；位置输入拒绝访问器、未知字段和非有限数，snapshot 校验 spawned/held/dropped/despawned 的 owner/position 不变量并深复制冻结。
- 自动拾取先验证 participant/equipment 唯一性、uint32 contest seed、资格与拾取半径，再按距离、稳定 seed hash、equipment ID 和 participant ID 裁决；调用方数组顺序不影响结果。
- 掉落裁决同步验证 `isPositionValid` 返回值，依次尝试 last-safe 与 origin，二者无效时明确 despawn；序列化按 instance ID 稳定排序、拒绝重复并经 Registry 复原。
- strict 公共包测试增至 45 项；62 项 Equipment、MatchCore、Map、Replay 与架构定向回归通过，JavaScript 精确允许清单由 475 降至 468。
- G3 下一批迁移 `EquipmentSystem` 唯一写入者并收紧 spawn/pickup/cooldown/drop/reconcile 事务边界；本批未改变装备动作、攻击距离/速度/击退、拾取规则、Gameplay V2 数值、Replay schema 或黄金 hash。

## G3.10 EquipmentSystem 唯一写入者迁移证据

- `EquipmentSystem` 已迁入 `arena-equipment` strict TypeScript 并成为 spawn、pickup、cooldown、drop、reconcile 与 primary slot 的唯一写入者；RuleEngine 组合与测试只从包公开入口构造系统。
- participant、ActionRegistry、EquipmentRegistry、runtime/owner Map、动作候选、掉落结果及所有公开返回值获得显式类型；排序使用稳定字符串比较，不依赖 locale、墙钟或随机源。
- 所有权威写入口统一经过同步 `#runMutation` 重入锁；pickup 在变更前验证完整 participant 集并预建全部 pending，reconcile 在 despawn 前验证所有回调结果，非法/异步回调和重入不会留下部分提交。
- held runtime 缺少 last-safe position、world runtime 缺少 position、participant Map 与稳定 participant 列表不一致等不可能状态均 fail closed；destroy 幂等，变更期间拒绝销毁，终止后拒绝全部读写。
- `arena-equipment` 仅新增对 `arena-core` ActionCandidate/priority 合同的单向依赖，继续只消费 Definition 和底层合同；架构门禁核对精确依赖集并扫描全部 strict 源码。
- strict 公共包测试增至 48 项，其中新增系统完整主流程、掉落重入原子性和 reconcile 全量预验证；62 项 Equipment、MatchCore、Map、Replay 与架构定向回归通过，JavaScript 精确允许清单由 468 降至 467。
- G3 下一批迁移 Map 时间线、surface mutation 与 equipment release/collapse 协调，再收敛 MatchCore 和 Replay；本批未改变武器动作、冷却、攻击距离/速度/击退、Gameplay V2 数值、Replay schema 或黄金 hash。

## G3.11 Map 时间线、拓扑与出生安全迁移证据

- 新增 strict TypeScript workspace：`@number-strategy-jump/arena-map`；Map event/command/domain 常量、整数 tick 时间线、永久安全面、角色碰撞体出生安全和 collapse 前后步行连通性五个 JavaScript 实现迁入包公共 API。
- MapTimeline 为 occurrence、transition 和 transition kind 建立显式不可变类型；warning/end/start 在同 tick 按固定优先级与 occurrence ID 排序，内部 Map 缺项和非法 tick fail closed，不依赖 locale 或调用方数组顺序。
- topology 使用具名 surface 接触容差，验证初始及每次按 tick/occurrence 排序后的 collapse 状态；没有 surface、不可连通、跨步高度超限或角色直径无法通过都会在组合阶段拒绝。
- 默认安全验证确保最终至少一个永久 surface、装备 wave 每次释放时有足够未塌陷点位及两个不同安全重生点；角色安全进一步用角色 radius/halfHeight、地面探测容差和 surface footprint 验证每个实际出生分配。
- `arena-map` 基础层只依赖 `arena-contracts` 与 `arena-definitions`，架构门禁扫描完整 strict 源码并核对精确依赖集；不依赖 MatchCore、Bot、Presentation、Three.js、DOM、平台、墙钟或随机源。
- strict 公共包测试增至 52 项；65 项 Map、Equipment、MatchCore、Product content、Replay 与架构定向回归通过，JavaScript 精确允许清单由 467 降至 462。
- G3 下一批迁移 Map command/event strategy registry 与三个默认策略，再迁移 MapRuntime/serializer 和 ArenaMapSystem 唯一写入者；本批未改变地图时间点、风力、坍塌、装备 wave、Gameplay V2 数值、Replay schema 或黄金 hash。

## G3.12 Map 命令注册与事件策略迁移证据

- `MapCommandRegistry`、`MapEventStrategyRegistry`、默认 mutation-port handlers，以及 wind-zone、collapse-surfaces、equipment-wave 三个策略已迁入 `arena-map` strict TypeScript 公共 API；组合根和既有集成测试不再引用 `src/arena/map` 私有实现。
- 命令执行先深复制冻结调用方批次并完成全量 handler/字段验证，再调用任何 mutation port；端口回调不能篡改尚未执行的后续命令，未知命令、字段漂移、非法 metadata/vector 会在权威写入前拒绝。
- 策略注册器固定由 Registry 最后注入 `mapDefinition`、`event` 和 `occurrence`，调用方同名上下文不能覆盖权威对象；plan、commands、events 均经可序列化深复制冻结，访问器、循环引用、非有限数和非数据对象 fail closed。
- equipment-wave 仅使用由 `ArenaMapSystem` 按 match seed、map ID、occurrence ID 派生后注入的 seed；候选点排除已禁用或在 release tick 前已塌陷 surface，预警只公开落点，不提前公开装备身份。wind/collapse 只产生声明式命令与领域事件，不直接写物理、surface 或装备状态。
- `arena-map` 依赖仍精确限定为 `arena-contracts` 与 `arena-definitions`，未增加 MatchCore、Equipment runtime、Bot、Presentation、Three.js、DOM、平台、墙钟或未注入随机源依赖。
- strict 公共包测试增至 56 项，其中新增完整命令批次预验证、权威 occurrence 防覆盖、装备波同 seed 确定性/信息边界、风场与坍塌声明式命令测试；77 项 Map、MatchCore、Replay 与架构定向回归通过，JavaScript 精确允许清单由 462 降至 455。
- G3 下一批迁移 `MapRuntime` 与 serializer，随后迁移 `ArenaMapSystem` 唯一写入者；本批未改变地图时间点、风力、坍塌、装备 wave、攻击/移动/跳跃数值、Replay schema 或黄金 hash。

## G3.13 MapRuntime 与快照序列化迁移证据

- `MapRuntime`、occurrence/surface 状态类型、`MAP_OCCURRENCE_PHASE` 与 `serializeMapRuntimeSnapshot` 已迁入 `arena-map` strict TypeScript 公共 API；MapSystem、Bot navigation/observation 和既有测试不再引用 `src/arena/map` 运行时私有文件。
- Runtime 是 surface enabled/revision、occurrence phase/private plan/public payload/revision、next active tick 与整体 revision 的唯一写入者；warning、active/completed、ended 转换显式拒绝非法前态，tick 必须无间隙单调推进，destroy 幂等且销毁后拒绝读写。
- `warn()` 在改变任何状态前先完整验证并深复制 private/public 计划，再一次性提交 phase 与两级 revision；非法访问器、循环引用或后半份坏数据不会留下半写入。surface、occurrence、整体 revision 与 next tick 的安全整数上限也全部在写入前验证。
- serializer 拒绝未知/访问器字段、重复 identity、非法 tick 顺序、phase/endTick 矛盾、子 revision 超过整体 revision、非有限或不可序列化 payload；结果按稳定 ID 排序并深冻结。公开模式拒绝任何 `privatePlan`，内部模式要求每个已公开 occurrence 都显式包含它。
- Bot collapse-warning 测试中手工追加 occurrence 后未同步提升 `map.revision` 的旧夹具已归真；真实 Runtime 从未生成该矛盾状态，生产规则和 Bot 可见信息未改变。
- strict 公共包测试增至 58 项，其中新增 warning 原子性、getter 零执行、私有计划隔离、surface/tick/destroy 生命周期，以及 phase/revision/privacy/options schema 漂移测试；93 项 Map、MatchCore、Replay、Bot 与架构定向回归通过，JavaScript 精确允许清单由 455 降至 453。
- G3 下一批迁移 `ArenaMapSystem` 两阶段提交唯一写入者；本批未改变地图时间点、风力、坍塌、装备 wave、攻击/移动/跳跃数值、Replay schema 或黄金 hash。

## G3.14 ArenaMapSystem 两阶段提交迁移证据

- `ArenaMapSystem`、`ARENA_MAP_EVENT`、advance batch/domain event/system contract 与无 getter 执行的结构断言已迁入 `arena-map` strict TypeScript 公共 API；组合根、MatchCore 和既有集成测试不再引用 `src/arena/map/map-system.js`，完整地图权威链已离开旧 JavaScript 目录。
- 构造器只接受真实不可变 `MapDefinition`、`MapEventStrategyRegistry` 与 `MapCommandRegistry`，并在创建 Runtime 前完成 registry/content/seed/ruleset 验证；调用方 options、actor、position、validation context 和 system contract 的访问器不会被求值。
- advance 保持 warning → end → start 的固定 transition 顺序、按 ID 排序 actor/active occurrence、按 map ID + occurrence ID 派生 seed；每段策略结果先深复制并验证全部 commands/events 和所有 surface identity，再执行内部 surface 预提交。任何已进入权威 tick 后的异常都会把系统标记为 failed，禁止继续读取或推进。
- commit 只接受最近一次 advance 返回的原始批次；端口字段与全部命令在外部写入前重验，端口函数复制冻结后执行，回调不能替换后续回调。非法端口属于可恢复输入错误，可用正确端口重试；端口开始后任何异常都 fail closed，避免在部分外部写入后继续比赛。
- commit 回调可读取 advance 已完成的地图快照和 surface 状态，以支持 MatchCore 在装备生成前验证刷新点；advance/commit/destroy 的重入仍被拒绝。该边界由实际装备波主流程与专门回调测试共同固定。
- `isPositionOnEnabledSurface` 不执行调用方 getter；`assertArenaMapSystem` 沿原型链检查数据方法而不触发 accessor。源码中重复/隐式字段路径已统一为显式类型化事件构造。
- strict 公共包测试增至 61 项，其中新增原始批次身份、可重试端口验证、端口失败关闭、回调快照/只读/重入和 getter 零执行测试；93 项 Map、MatchCore、Replay、Bot 与架构定向回归通过，JavaScript 精确允许清单由 453 降至 452。
- G3 下一批开始拆分 MatchCore 的权威编排与胜负状态，再迁移 Replay/state hash；本批未改变地图时间点、风力、坍塌、装备 wave、攻击/移动/跳跃数值、Replay schema 或黄金 hash。

## G3.15 比赛内容合同与权威配置边界迁移证据

- 新增 strict TypeScript workspace `arena-match`，集中承接比赛阶段、参赛者状态、固定 tick 配置、默认 POC 场地和统一 MatchConfig；MatchCore、Runtime、Bot、Replay、Product 与 Presentation 消费者均改从公共包读取，不再依赖 `src/arena/config.js`。
- `MatchContentSelection` 已下沉至最底层 `arena-contracts`，继续绑定 schema、内容池、参赛角色分配与确定性 `contentHash`；公开视图由同一校验器重建，访问器、重复 identity、未知内容和 hash 篡改在进入比赛前拒绝。
- Arena V1 的两个稳定角色 ID 与默认角色 ID 已进入 `arena-definitions`，产品内容、正式资产、Presentation 与 Match 组合不再共享 `src` 私有常量文件。
- MatchConfig 构造先通过数据 descriptor 深复制冻结完整输入，再验证全部字段、tick 上下界、场地边界、装备刷新、角色覆盖和内容选择一致性；Gameplay V2 攻击、Physics tick/角色参数仍直接引用既有唯一 Definition/公共常量，未引入第二份数值。
- `arena-match` 的依赖精确限定为 `arena-contracts`、`arena-core`、`arena-definitions` 与 `arena-physics`；架构门禁审计该依赖集和全部源码，禁止 Bot、Product、Presentation、Three.js、DOM、平台、墙钟或未注入随机源。
- strict 公共包测试增至 65 项，其中新增默认配置逐项映射、深冻结、getter 零执行、schema/hash/分配漂移拒绝和角色稳定 ID 测试；164 项 MatchCore、Replay、内容池、Bot、Presentation 与架构定向回归通过，JavaScript 精确允许清单由 452 降至 449。
- G3 下一批抽取 Participant/胜负阶段唯一写入者，再把 MatchCore 编排迁入 `arena-match`；本批未改变生命、准备/决胜/硬时限、出生、装备、攻击/移动/跳跃数值、Replay schema 或黄金 hash。

## G3.16 Participant 权威状态唯一写入者迁移证据

- `MatchParticipantSystem` 已进入 `arena-match` strict TypeScript 公共 API，成为双方生命、active/respawning/eliminated 状态、淘汰/死亡统计、受击归因、硬直、无敌和重生计时的唯一写入者；MatchCore 不再持有或暴露可写 participant Map。
- 同 tick 淘汰先完整校验参与者集合、tick、决胜状态、归因窗口和重生时长，再按稳定 participant ID 一次提交；同时最终掉落仍保留双方击杀归因，未知/重复/非 active participant 不会留下部分生命或统计变化。
- 普通计时重生只允许在倒计时归零后提交；进入决胜或比赛结束时使用显式 `phase-transition` 原因提前恢复。两条路径均清除旧命中归因和硬直，重新应用统一无敌时长，MatchCore 继续负责选择合法地图出生点并协调 Rule/Movement/Physics 重置。
- 超时排名统一由 Participant 系统按生命、淘汰数和稳定 ID 计算；MatchCore 只消费不可变 outcome。公开/内部快照每次获得冻结副本，调用方不能写回 participant authority。
- 构造输入与 elimination/respawn options 均使用 descriptor 安全深复制，拒绝 getter、未知字段和非法范围；系统销毁幂等，销毁后全部读取/写入拒绝。架构门禁明确禁止 MatchCore 重新出现 `#participants` 或私有 participant 构造器。
- strict 公共包测试增至 71 项，其中新增 participant 初始化/隔离、计时、命中归因、同时淘汰、批次原子拒绝、阶段重生和终态生命周期；94 项 MatchCore、Equipment、Movement、Replay、Session、内容池与架构定向回归通过，JavaScript 精确允许清单保持 449。
- G3 下一批迁移比赛 phase、active tick 与 Result 唯一写入者，然后迁移完整 MatchCore 编排；本批未改变生命数、受击归因窗口、重生/无敌时长、超时排序、事件顺序、Replay schema 或黄金 hash。

## G3.17 比赛 Timeline 与 Result 唯一写入者迁移证据

- `MatchTimelineSystem` 已进入 `arena-match` strict TypeScript 公共 API，成为 `tick`、`activeTick`、preparing/running/sudden-death/ended phase、首次 MatchStarted claim 和终局 Result 的唯一写入者；MatchCore 不再持有这些可写字段。
- 每个权威 step 必须经过 `beginStep → preparation/active transition → optional end → completeStep`，且 preparation/active 时间线在同一 step 至多推进一次；输入在 begin 前完整归一化，非法输入仍可恢复，begin 后任一未知错误由 MatchCore fail closed 销毁整局。重复 begin、重复推进、无活动 step complete、非法 phase transition 和 ended 后继续推进均明确拒绝。
- preparing 切换 running、进入 sudden death、硬时限和 Result 的 `endedAtTick` 保持原事件 tick 顺序：事件在当前 tick 生成，只有所有权威协调完成后才提升总 tick；active tick 在淘汰已结束比赛时不再增加，和既有回放语义一致。
- Result 在写入前完整拒绝 getter、未知字段、空 reason 及 winner/isDraw 矛盾；公开 getter 返回副本。Core 销毁前保留只读终态 timeline 快照，使失败后的 Replay Runner 仍能输出“未完成不可导出”诊断，但不能继续 step 或读取完整权威快照。
- 架构门禁要求 MatchCore 必须组合 `MatchTimelineSystem`，并禁止重新出现 `#tick`、`#activeTick`、`#phase`、`#result` 或 `#started`。Timeline 构造和生命周期无 DOM、平台、墙钟、随机源或外部 callback。
- strict 公共包测试增至 78 项，其中新增 preparation/start claim、active/sudden/timeout、结果 tick、错误恢复、step 重入/重复推进和销毁测试；88 项 MatchCore、Equipment、Movement、Replay、Session 与架构定向回归通过，JavaScript 精确允许清单保持 449。
- G3.17 本批未改变阶段阈值、事件 ID/顺序、胜负原因、Replay schema 或黄金 hash；随后完成的权威基础原语迁移见 G3.18。

## G3.18 权威基础原语迁移证据

- 通用 `normalizeThrownError` 与 `combineCleanupFailure` 已迁入最底层 `arena-contracts`；所有 Core、Replay、Session、Product、Presentation、Study、实验与脚本消费者统一引用一个实现，组合错误保留原始失败及冻结的清理失败副本。
- 角色 Runtime 身份引用和配置/状态 hash 已迁入 `arena-match`，CharacterDefinition 到物理参数的唯一纯投影已迁入 `arena-physics`；MatchCore 不再从本地 JavaScript 引入以上原语。
- `createCharacterRuntimeReference` 在读取调用方字段前拒绝 getter、Symbol、未知字段和非普通包装对象，并通过只读 CharacterRegistry 固定 definition identity；不持有 Physics body、Renderer 或可写 Definition。
- state hash 保持参与者权威顺序，并对装备、地图 surface/occurrence 与具名 RNG 流使用环境无关的稳定排序；位置/速度/朝向继续按一百万比例量化并拒绝非有限或不安全整数，未改变现有 hash。
- strict 公共包测试增至 83 项，新增生命周期错误聚合、角色身份数据边界、角色物理投影、配置/状态 hash 排序和非法数值测试；JavaScript 精确允许清单由 449 降至 445。
- G3 下一批将迁移完整 MatchCore 组合编排，再迁移 fixed-step Runtime 与 Replay；本批不改变 Gameplay V2 数值、命中/动作/阶段行为、Replay schema 或黄金 hash。

## G3.19 MatchCore 权威编排迁移证据

- 完整 `MatchCore` 已从 `src/arena/match-core.js` 迁入 `arena-match` strict TypeScript 公共 API；Session、Replay、fixed-step Runtime、Quick Match、Arena V1 组合与测试统一通过 workspace 入口消费，旧实现已删除。
- Rule、Map、Movement 和 Physics 跨包边界补齐了结构化 batch、event、equipment、mutation port 与移动命令合同；Movement 命令在进入唯一写入系统前再次校验，未引入 `any`、`ts-nocheck` 或表现层反向依赖。
- RuleEngine、MapSystem 与 PhysicsWorld 工厂均使用统一候选资源接管：校验失败会在抛错前回收半成品，回收异常与原始异常同时保留；Participant/Timeline 也纳入构造失败清理边界。
- 每个 tick 仍先完整归一化输入，再按 Timeline→Participant/Rule/Map/Equipment→Movement/Physics→Elimination/Result 的唯一顺序提交；任一已进入权威流程的未知错误继续 fail closed 销毁整局。
- strict package build、639 项 Node 测试、83 项 strict package/治理测试全部通过；其中 MatchCore/Movement/Equipment/Map/Product 定向回归 60 项、架构门禁 24 项。JavaScript 精确允许清单由 445 降至 444。
- 本批不改变 Gameplay V2 数值、攻击挥空、命中/击退/动作阶段、生命/重生/胜负、事件 ID/顺序、Replay schema 或黄金 hash；G3 下一批迁移 fixed-step Runtime。

## G3.20 定步运行时迁移证据

- `FixedStepMatchRuntime` 已从 `src/arena/runtime` 迁入 `arena-match` strict TypeScript 公共 API；输入帧率集成与 Replay 测试均从 workspace 入口消费，旧 JavaScript 实现已删除。
- 固定步长继续直接读取 MatchCore 配置；暂停丢弃墙钟积压、单帧增量上限、最大追帧步数、积压饱和报告、终局清空和 30/60/120Hz 外层调度一致性均保持原语义。运行时默认值集中于只读 `FIXED_STEP_RUNTIME_DEFAULTS`，不引入第二份 Gameplay 数值。
- options 边界拒绝非普通对象、访问器、Symbol、未知字段和非法范围，且访问器不会被执行；input provider 非数组输出会在 Core step 前拒绝，保留待执行 accumulator，使调用方修正后可重试而不丢 tick。
- `advance` 仍不可重入；失败后 `finally` 释放运行锁，暂停/销毁不得插入 advance 中途，destroy 幂等且不越权销毁由上层拥有的 MatchCore。Runtime 不写命中、移动、阶段或胜负权威状态。
- strict package build、640 项 Node 测试、83 项 strict package/治理测试全部通过；JavaScript 精确允许清单由 444 降至 443。
- 本批不改变 Gameplay V2 数值、攻击挥空、输入采样、命中/击退/动作阶段、事件 ID/顺序、Replay schema 或黄金 hash；G3 下一批迁移 Replay。

## G3.21 Replay 迁移与 G3 完成证据

- Replay V5 schema、兼容错误、Headless Runner、checkpoint/事件/结果验证、重放执行与 Core 工厂资源接管已进入 `arena-match` strict TypeScript；Runner、schema 与 error code 消费者直接引用包 API。`src/arena/replay.js` 只保留 `createArenaV1MatchCore` 的依赖注入组合，不承载 schema、校验、Runner 或重放算法，避免底层包反向依赖产品内容；该适配器仍计入 G6/G7 的 JavaScript 清零范围。
- Headless Runner 构造与 run options、Replay match options、checkpoint 和 result 均拒绝 getter、Symbol、未知字段及非法范围；getter 不会执行。`beforeStep` 保持同步合同，Promise 会被拒绝并吸收迟到 rejection，恶意 `then` getter 不执行。
- Core 工厂返回非法候选时只通过数据方法描述符执行安全回收；合同失败和回收失败同时保留。有效 Replay 无论通过或失败均释放验证 Core，验证失败与 destroy 失败也以组合错误同时保留，不掩盖原始原因。
- MatchCore Replay metadata 补齐此前遗漏的 `airJumpHorizontalImpulse` 与 `contextPrimaryMobilityEnabled`；非默认产品移动配置现在可以完整导出并通过同一 config hash 重建，不再依赖默认值碰巧一致。
- 642 项 Node 测试、83 项 strict package/治理测试通过；Replay 专项 17 项，生命周期专项 94 项。黄金 Replay manifest 及四个 entry replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`。
- JavaScript 精确允许清单保持 443：本批将 344 行 Replay 权威逻辑迁入 strict 包，同时保留 14 行 Arena V1 组合适配；G3 的 Rule/Core/Replay 交付与门禁完成，下一批进入 G4 Bot/Product/Persistence。

## G4.1 Bot 确定性基础迁移证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-bot`；第一批只承接 Bot 难度配置、seed 驱动人格生成和纯效用裁决，不拥有 MatchCore、Session、Matchmaking、Product、Presentation、Three.js、DOM、平台 API 或墙钟时间。
- 三档难度的观察延迟、重规划、方向误差、动作承诺、暂停、输入幅度、边缘安全、预测、威胁感知、攻击范围和移动动作 tick 数值保持逐项不变；人格仍只由注入的 uint32 seed 派生，效用裁决仍按分数、显式优先级和稳定 ID 排序。
- 公共 API 拒绝未知难度、非法 seed、空 evaluator、非法分数/优先级和非普通计划；evaluator 与计划字段访问器在执行前拒绝，恶意 getter 调用次数为零，返回的 profile、人格、决策和计划保持只读。
- package 依赖精确限定为 `arena-contracts`，架构门禁扫描全部 Bot strict 源码并禁止 MatchCore 私有实现、Session、Matchmaking、Presentation、Platform、Three.js、宿主全局、墙钟和非确定性随机。
- 干净提交 `da236490323a257d6f2fa9eb3cca513a308c69c3` 的统一 `npm run check` 通过：642/642 Node、87/87 strict package/治理、94/94 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、三端 clean build/预算和唯一生产产物检查均通过。
- 黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 443 降至 440。
- G4 仍在进行中；下一批迁移 Bot observation 与地图导航公开合同，再迁 policy/scheduler/controller，之后才进入 Quick Match、Product 状态机和 Persistence 生命周期，不以本批基础能力冒充 G4 完成。

## G4.2 Bot 受限观察与地图导航迁移证据

- Bot observation 与 map navigation 已从 `src/arena/ai` 迁入 `@number-strategy-jump/arena-bot` strict TypeScript 公共 API，旧两个 JavaScript 实现删除；生产控制器、目标层与测试统一从包入口消费。Bot 包依赖精确扩展为 `arena-contracts`、`arena-equipment`、`arena-map`、`arena-match` 与 `arena-movement`，未依赖 MatchCore 私有实现、Session、Matchmaking、Product、Presentation、Three.js、DOM、平台、墙钟或未注入随机源。
- 受限观察为当前/历史公开快照、actor/target、动作 affordance、可见装备、地图公开 occurrence 与 observation tick 建立显式不可变合同；未来快照、身份错配、affordance tick 漂移、非法 phase/mode、私有地图计划、非法可见装备和 schema 漂移在进入 Bot 决策前拒绝。地图导航只消费公开 warning/active payload 与已启用 surface，不读取未来时间线、装备身份或权威私有计划。
- 外部 source/options/arena/objective 与嵌套公开快照均通过数据 descriptor 边界读取，访问器在执行前拒绝，恶意 getter 调用次数为零；由模块自身构造并深冻结的观察源与 arena view 使用模块私有 `WeakSet` 登记的安全快速路径，外部对象不能伪造信任身份，弱引用也不阻止生命周期回收。
- 初版严格边界在本机 180 tick 定向测试中约为 795 ms，未作为可接受实现保留；消除内部快照重复深校验和冻结后，本机同一定向观测约为 181 ms，优于迁移前曾观测的约 198 ms。以上仅是本机定向观测，不替代 iPhone 13 Pro / iOS 26 / Chrome 的真机帧率、温升与触控验收。
- 干净代码提交 `6bd7feaddcf2f8c723b0a9d3475af6854a85e004` 的统一 `npm run check` 通过：642/642 Node、88/88 strict package/治理、94/94 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、三端 clean build/预算和唯一生产产物检查均通过；黄金 Replay manifest 及四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`。
- 同一干净提交上的 Bot 专项压力完成 easy/normal/hard 各 300 场、共 900 场，耗时 `1543713.604708 ms`，结果 hash `12dcdc7e`，`sourceDirty=false`、`outcome=passed`、`freezeEligible=true`。三档 capability index 为 `7.62 / 18.34 / 19.453333333333333`，score rate 为 `0.44333333333333336 / 0.8566666666666667 / 0.89`，life pressure 为 `-0.4700000000000002 / 1.9433333333333334 / 2.3`；能力、得分率和生存压力均保持 easy < normal < hard。
- 压力测试中每档均得到 300 个唯一 final hash 并完成 3 次 Replay 复验；难度分布 `0.3308 / 0.3396 / 0.3296`（easy/normal/hard），地面跳、二段跳、蹲下/释放、下砸、步行、跑动、地图 warning/start、未归因死亡上限和全部梯度 gate 均通过。JavaScript 精确允许清单由 440 降至 438。
- G4 仍在进行中；下一批按依赖方向迁移 mobility policy、scheduler、goals 与 controller，随后治理 Quick Match/Session、Product 状态机和 Profile Repository/租约/迁移生命周期。本批未改变 Gameplay V2 数值、攻击挥空、移动/跳跃、武器动作、Bot 随机流、权威 tick、Replay schema 或黄金 hash。

## G4.3a Bot 目标策略与移动调度迁移证据

- 八类目标 evaluator、语义移动意图与 `BotMobilityScheduler` 已从 `src/arena/ai` 迁入 `@number-strategy-jump/arena-bot` strict TypeScript 公共 API；生产控制器与测试只从包入口消费，旧三个 JavaScript 实现删除。Goal context、plan、goal/intent ID、调度输入输出和 debug snapshot 均有显式只读类型，包依赖集未扩大。
- 效用计划由浅层复制改为数据型深复制冻结：嵌套 target、Symbol、访问器、循环引用、非有限值和非普通对象在计划发布前拒绝，嵌套恶意 getter 调用次数为零；合法 evaluator 的分数、优先级和稳定 ID 裁决次序不变。
- Scheduler 构造参数先复制校验再接管；同一待采样 tick 重复 schedule、未采样即跨 tick、采样错 tick、非连续 tick、非法 intent/布尔值和销毁后调用均在修改动作边沿前拒绝。内部热路径改为直接传递 tick/intent/布尔原语，去除每 tick `sample` options 临时对象；正常 crouch hold、jump/slam 单 tick edge、冷却与 cancel 语义保持不变。
- 干净代码提交 `f2ba9d1ba7574354e86ca36475b6436adf3cc0f9` 的统一 `npm run check` 通过：642/642 Node、90/90 strict package/治理、94/94 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-f2ba9d1ba757-product`，Web/微信/抖音 delivery 为 `3588326 / 3616696 / 3616671 B`，`sourceDirty=false`。
- 黄金 Replay manifest 及四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 438 降至 435。
- 同一干净提交上的 Bot 专项小样本完成 easy/normal/hard 各 10 场、共 30 场，耗时 `52845.201708 ms`，结果 hash `61765567`，`sourceDirty=false`、`outcome=passed`、`freezeEligible=true`。三档 capability index 为 `4.800000000000001 / 13.399999999999999 / 19.6`，score rate 为 `0.4 / 0.6 / 0.9`，life pressure 为 `-1 / 0.8999999999999999 / 2.2`；每档 10 个唯一 final hash、3 次 Replay 复验及全部移动/地图/梯度 gate 通过。G4.2 已另有 900 场正式证据，本节不把 30 场小样本夸大为替代。
- G4 仍在进行中；下一批单独迁移有状态 `BotController`，收紧构造、逐 tick 原子更新、失败关闭和销毁生命周期，随后进入 Quick Match/Session、Product 与 Persistence。本批未改变 Bot 难度数值、目标评分、随机消费顺序、Gameplay V2 数值、攻击挥空、动作/移动/跳跃、权威 tick、Replay schema 或黄金 hash。

## G4.3b BotController 迁移与 Bot 包闭环证据

- `BotController` 已从 `src/arena/ai` 迁入 `@number-strategy-jump/arena-bot` strict TypeScript 公共 API；Quick Match、Human Study、Bot capability workload 与测试统一从包入口消费，旧 JavaScript 实现删除。构造参数、输入帧、计划、人格、观察历史、移动调度和 debug snapshot 均有显式类型，Bot 包依赖集未扩大，JavaScript 精确允许清单由 435 降至 434。
- 构造边界不再通过参数解构执行调用方访问器：只接受普通对象、已知可枚举数据字段、非空参与者 ID、已登记难度、uint32 seed 与合法 arena view，恶意 getter 调用次数为零。输入处理增加同步重入锁；外部快照先完成深复制、身份/连续 tick/受限观察校验，再进入内部可变阶段。
- 无效快照不再先写入观察历史：同一合法 tick 可在边界拒绝后安全重试，历史、RNG、计划与 scheduler 均不改变。内部规划、随机消费、调度或输入归一化一旦失败则销毁 controller 和 scheduler，禁止继续使用半更新状态；`destroy()` 保持幂等，debug snapshot 及嵌套人格/移动状态保持深只读。
- 观察历史热路径不为每 tick 复制历史数组：先从“现有有界历史 + 当前候选”计算延迟快照，只有完整 InputFrame 成功后才原位提交并裁剪历史，同时保留失败可重试语义。Bot 难度数值、目标评分、随机调用顺序、移动/攻击输入节奏均保持不变。
- 干净代码提交 `fdfb818bf61a9ba5aecccd9769415216aa434928` 的统一 `npm run check` 通过：646/646 Node、91/91 strict package/治理、94/94 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-fdfb818bf61a-product`，Web/微信/抖音 delivery 为 `3589781 / 3618261 / 3618236 B`，`sourceDirty=false`。
- 同一干净提交上的 Bot 专项压力完成 easy/normal/hard 各 300 场、共 900 场，耗时 `1479303.175792 ms`，定义 hash `6fb412ea`、结果 hash `a3bb3847`，`sourceDirty=false`、`outcome=passed`、`freezeEligible=true`。三档 capability index 为 `7.62 / 18.34 / 19.453333333333333`，score rate 为 `0.44333333333333336 / 0.8566666666666667 / 0.89`，life pressure 为 `-0.4700000000000002 / 1.9433333333333334 / 2.3`；能力、得分率和生存压力均严格 easy < normal < hard。
- 每档 300 个唯一 final hash、3 次 Replay 复验，以及地面跳、二段跳、蹲下/释放、下砸落地、步行、跑动、地图 warning/start、未归因死亡上限和全部梯度 gate 均通过；黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`。
- Bot strict 包闭环完成，但 G4 尚未完成；下一批按所有权方向迁移 Quick Match/Local Match Session，再迁 Product 状态机、奖励事务与 Profile Repository/CAS/lease/migration 生命周期。本批未改变 Gameplay V2 数值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、权威 tick、Replay schema 或正式资产。

## G4.4a LocalMatchSession 迁移与生命周期加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-session`，`LocalMatchSession` 已从 `src/arena/session` 迁入包公共 API，旧 JavaScript 实现删除；Quick Match 与全部会话测试统一从包入口消费。该包只依赖 `arena-contracts` 与 `arena-match`，位于 MatchCore 之上并持有其完整生命周期；Bot 通过最小结构化端口注入，Session 不反向依赖具体 Bot、Matchmaking、Product、Presentation、Three.js、DOM、平台或墙钟。
- 构造参数、公开信息、帧结果、运行选项与 Replay 结果建立显式只读合同。构造对象、Bot controller 方法和 `runUntilEnded` 选项只按数据描述符读取，访问器不会执行；公开信息及嵌套字段、帧结果和暂停事件均被冻结，调用方不能回写会话内部状态。
- 玩家输入先完成数据型边界校验再触发 Bot 或 Core，无效帧不会改变 tick、Bot 或权威状态，同一边界可安全重试。Bot 或 Core 在内部推进阶段失败时，会话 fail closed 并回收 runner、controller 与 core，原始失败和清理失败同时保留，不发布半可用实例。
- `runUntilEnded` 在反射 options 和调用输入 provider 前即持有操作锁；恶意 Proxy、options/provider 回调尝试重入 start/step/pause/destroy 均被拒绝。非法 `maximumTicks` 在启动前拒绝；已自然结束的会话仍可重复导出同一 Replay，保持原行为。
- 清理先发布 terminal 状态和清理中锁，再调用外部 destroy callback；callback 重入无法推进或重复接管资源。一次清理失败时仍保留未释放资源所有权并允许后续重试，`destroy()` 成功后幂等；构造失败不越权销毁尚未正式移交的 MatchCore。
- 干净代码提交 `319404e8f472d66fdcc5f35cbc150407a17c8071` 的统一 `npm run check` 通过：651/651 Node、93/93 strict package/治理、99/99 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-319404e8f472-product`，Web/微信/抖音 delivery 为 `3592787 / 3621657 / 3621632 B`，`sourceDirty=false`。
- 同一干净提交的 Product 压力完成 200 场，得到 200 个唯一 authority hash、2 个 content hash、334 次生命周期转换、96 次 rematch、最大 59 tick、7 次 restart、22000 experience，结果为 `ok=true`。独立 Presentation Session soak 完成 100 场、耗时 `526.986875 ms`、堆增长 `2861192 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `46691.841417 ms`、堆增长 `6286992 B`，两者帧、生命周期监听、Canvas 监听和输入绑定残留均为零。
- 黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 434 降至 433。
- G4 仍在进行中；下一批先迁移确定性匹配 Definition、seed、assignment 与 opponent profile，再治理 Quick Match 的工厂所有权、重入、失败回收和产品组合边界，之后才进入 Product 状态机与 Persistence。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、Bot 随机流、权威 tick、Replay schema 或正式资产。

## G4.4b Matchmaking 与 Quick Match 迁移加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-matchmaking`，承接 12 个虚构对手档案、确定性 assignment 和顺序 match seed source；旧的 profile/assignment/seed 三个 JavaScript 实现删除，生产、实验、Human Study 与测试统一从包入口消费。该包只依赖 `arena-contracts` 与 `arena-bot` 的公开难度 Definition，不拥有 MatchCore、BotController、Session、Product、Presentation 或平台生命周期。
- 对手选择、隐藏难度选择及 `bot-behavior:player-2`、`bot-personality:player-2`、`map`、`equipment` 四条具名随机流保持原 seed 标签和消费顺序；难度 override 只改变 effective difficulty，不改变自然难度、对手或其他 seed。连续 10000 个 seed 的 easy/normal/hard 分布继续通过既有 `0.313–0.353` 门禁，12 个对手均覆盖三档自然难度。
- assignment 入口改为普通对象、已知可枚举数据字段与 uint32 seed 合同，访问器不会执行，未知字段/Symbol/非法 difficulty 在发布 assignment 前拒绝；assignment、opponent、seeds 与 diagnostics 均冻结，diagnostics 只接受本模块实际创建的 assignment，外部对象不能伪造隐藏匹配证据。
- 新增无宿主组合 workspace `@number-strategy-jump/arena-quick-match`，只组合 Bot、合同、Match、Matchmaking 与 Session；Arena V1 私有 Core 工厂仍由 `src/arena/matchmaking/quick-match-service.js` 的薄适配器注入，strict 包不反向依赖 `src/arena`。该适配器仍计入后续 Product/G6/G7 的 JavaScript 清零范围。
- `QuickMatchService` 构造与 create options、seed source、content provider、Core/Bot/Session factory 和 diagnostic sink 均在描述符边界复制或快照；getter 零执行，端口校验与调用之间不可替换。创建锁在 options/Proxy 反射及任何注入回调前建立，factory/provider/diagnostic/cleanup 回调重入 create/destroy 均不能交错第二条所有权链；diagnostic 仍是纯观察，失败不取消已成立比赛。
- Core、BotController 与 LocalMatchSession 按创建顺序接管、按逆序回收；只接受原生 MatchCore 与 LocalMatchSession，调用内部能力时绕过实例自定义覆盖。创建失败和清理失败同时保留；清理失败的资源句柄不会丢失，而是在下一次 create 前或显式 `destroy()` 中精确重试，重试仍失败则阻断新比赛。成功返回后 Session 所有权一次性移交调用方，服务不再持有。
- 干净代码提交 `3cb5239752eafa5ab18d4c55278968a3db518fe1` 的统一 `npm run check` 通过：653/653 Node、97/97 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-3cb5239752ea-product`，Web/微信/抖音 delivery 为 `3598650 / 3627541 / 3627516 B`，`sourceDirty=false`。
- 同一干净提交的 Product 压力完成 200 场，得到 200 个唯一 authority hash、2 个 content hash、334 次生命周期转换、96 次 rematch、最大 59 tick、7 次 restart、22000 experience，结果为 `ok=true`。Presentation Session soak 完成 100 场、耗时 `536.538917 ms`、堆增长 `2639304 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `46800.714833000005 ms`、堆增长 `6368224 B`，两者资源残留均为零。
- 黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 433 降至 430。
- Bot、Matchmaking、Quick Match 与 Local Match Session strict 链路已闭环，但 G4 尚未完成；下一批按 state → profile → match coordinator → composition 顺序治理 Product 状态机、完成事务与 Profile Repository/CAS/lease/migration 生命周期。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、Bot 难度与随机顺序、权威 tick、Replay schema 或正式资产。

## G4.5a Product State 迁移与状态边界加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-product-state`，承接 Product 状态/事件 Definition、转换 Registry、状态机与公开错误合同；四个旧 JavaScript 实现删除，Controller、Composition、Presentation、脚本与测试统一从包入口消费。该包只依赖 `arena-contracts`，不依赖 Profile、Persistence、Matchmaking、Composition、Presentation、Three.js、DOM、平台或墙钟。
- 14 个 Product 状态、19 个事件和 14 条 Arena V1 转换保持原 ID、方向与顺序；boot/profile、选角、matching/preparing/in-match、results/reward/unlock、suspended/recoverable/fatal/destroyed 语义不变。暂停期间异步完成仍只推进 active/resume state，不虚假发布前台状态；retry 仍精确回到登记的 recovery state。
- 状态机构造 options 改为普通对象、已知可枚举数据字段边界，访问器不会执行；Transition Definition/数组在 Registry 接管前完成数据克隆、未知字段/非法状态/事件和重复边校验。状态机只接受原生冻结 Registry，拒绝通过子类覆盖 `resolve()` 注入转换逻辑。
- 状态转换仍由单一同步锁串行执行，非法转换在 revision 或状态修改前拒绝；suspend/resume/fatal/destroy 保持幂等边界。新增对缺失 resume/recovery state 的 fail-closed 检查，避免损坏内部状态时写入 `null`；snapshot 与 lastTransition 均为显式只读类型和冻结副本。
- Product cleanup failure 的 causes 改为逐索引数据描述符读取并冻结，访问器槽位不会执行；Error 自身仍保留原有 message 与 `causes` 公共字段，未改变 Controller 的错误分类和重试路径。
- 干净代码提交 `4ec010ec64fdb8caec9e78b30e64cb147420ba42` 的统一 `npm run check` 通过：653/653 Node、100/100 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-4ec010ec64fd-product`，Web/微信/抖音 delivery 为 `3599573 / 3628453 / 3628428 B`，`sourceDirty=false`。
- 同一干净提交的 Product 压力完成 200 场，得到 200 个唯一 authority hash、2 个 content hash、334 次生命周期转换、96 次 rematch、最大 59 tick、7 次 restart、22000 experience，结果为 `ok=true`。Presentation Session soak 完成 100 场、耗时 `539.4461660000001 ms`、堆增长 `2641480 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `46807.026875 ms`、堆增长 `6425432 B`，两者资源残留均为零。
- 黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 430 降至 426。
- Product State strict 底座完成，但 G4 尚未完成；下一批迁移 Product Progression/Profile 的纯 Definition、Registry、reward resolve/grant，再治理 Profile Service 与 Repository/CAS/lease/migration，之后处理 Product Match Coordinator 和顶层 Controller/Composition。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、奖励数值、解锁条件、权威 tick、Replay schema 或正式资产。

## G4.5b1 Progression 纯成长合同迁移证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-progression`，承接 Match Reward Definition、Unlock Definition、只读 Progression Registry 与 RewardGrant 数据合同；四个旧 JavaScript 实现删除，产品内容、奖励事务、Product ViewModel 与测试统一从包公开入口消费。该包只依赖 `arena-contracts`，不解析 ProductMatchResult、不读取或写入 Profile，也不依赖 Persistence、Composition、Presentation、Three.js、DOM、平台、墙钟或随机源。
- 奖励和解锁 schema、ID、经验数值、参与者、解锁种类及 Profile key 映射保持原值；RewardResolver 与 RewardCommitter 本批仍留在产品事务层，未把比赛结果验证或 Profile 唯一写入者错误下沉到纯数据包，后续必须连同 ProductMatchResult/Profile Service 的依赖方向单独治理。
- Definition 和 RewardGrant 继续先做无访问器的数据克隆、已知字段与安全整数校验，再深冻结公开结果；原生精确实例可复用，子类/原型伪造对象不能绕过构造校验。Registry options、数组长度和逐索引内容均通过描述符读取，getter 零执行；稀疏数组、访问器、额外字段、重复奖励、重复解锁目标、缺失前置和解锁环在 Registry 发布前拒绝。
- Registry 以稳定 ID 排序并私有持有索引，包级架构门禁同时锁定源码禁用 Product/Profile/Persistence/Presentation/平台依赖、墙钟、非确定性随机与 locale 排序，`package.json` 依赖精确限定为 `arena-contracts`。新增包测试覆盖排序、深冻结、访问器零执行、伪造子类、稀疏/重复/缺失/环内容和 RewardGrant hash/集合边界。
- 干净代码提交 `ec305d32777bb89479945cdc11d565b196da7a89` 的统一 `npm run check` 通过：653/653 Node、104/104 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-ec305d32777b-product`，Web/微信/抖音 delivery 为 `3600842 / 3629713 / 3629688 B`，`sourceDirty=false`。
- 同一干净提交的 Product 压力完成 200 场，得到 200 个唯一 authority hash、2 个 content hash、334 次生命周期转换、96 次 rematch、最大 59 tick、7 次 restart、22000 experience，结果为 `ok=true`。统一门禁中的 Presentation Session soak 完成 100 场、耗时 `533.529042 ms`、堆增长 `2642000 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `47700.655041000005 ms`、堆增长 `6353848 B`，两者帧、生命周期监听、Canvas 监听和输入绑定残留均为零。
- 黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 426 降至 422。
- Progression 纯成长合同已闭环，但 G4 尚未完成；下一批治理 RewardResolver/RewardCommitter 与 ProductMatchResult/Profile 合同边界，再迁 Profile Service、Repository/CAS/lease/migration 生命周期，之后处理 Product Match Coordinator 和顶层 Controller/Composition。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、奖励数值、解锁条件、权威 tick、Replay schema、黄金 hash 或正式资产。

## G4.5b2 Product 结果与奖励事务迁移证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-product-contracts`，只依赖 `arena-contracts`，承接 `ProductMatchResult`、公开对手/比赛信息、权威身份与结果校验；新增 `@number-strategy-jump/arena-product-progression`，仅组合基础合同、Product 结果、Profile 合同和 Progression 合同，承接 `RewardResolver` 与非拥有型 `RewardCommitter`。三个旧 JavaScript 实现删除，Product、Presentation、Study 与测试消费者统一从包公开入口导入。
- `ProductMatchResult` 继续绑定 match seed、Replay V5 schema/物理版本、config/rule/final hash、权威结果和冻结内容选择；对手隐藏难度不进入公开结果。创建 options、Replay 及嵌套 config 必须使用可枚举数据字段，访问器不会执行；未知字段、seed/content 漂移、胜者/平局矛盾和 authority hash 篡改均在结果发布前拒绝。
- `ProgressionRegistry` 在组合阶段预计算并冻结解锁依赖拓扑顺序；奖励解析由反复扫描固定点改为一次线性拓扑遍历，同时保持现有已解锁前置、经验门槛和同 grant 依赖链语义。公开 grant 继续深冻结并保持 `arena-result:r<profile-revision>:<seed-hex>:<authority-hash>`，没有把 Profile revision 从本地单未结算事务作用域移除。
- `RewardCommitter` 在构造期按描述符快照 Profile 端口方法，阻止访问器执行和运行中方法替换；同步重入在任何端口调用前拒绝。同一事务即使由不同不可变结果对象表达，也按已校验 authority hash 返回同一结果；只有写端显式返回数据字段 `recoverable=true` 的异常允许重试，无法确认写入结果、矛盾/缺字段 outcome、未登记 grant、错误 revision/experience 或缺失解锁均失败关闭，避免半提交后再次发奖。
- 包级架构门禁锁定两个 workspace 的依赖集合，并禁止反向依赖 Product 组合、Persistence、Presentation、平台、Three.js、DOM、墙钟、非确定性随机或 locale 排序。新增严格测试覆盖深冻结、隐藏字段剥离、Replay/authority 篡改、访问器零执行、线性依赖链、不同结果对象去重、端口重入、明确可恢复重试、歧义写失败关闭和畸形 outcome 关闭。
- 干净代码提交 `7b667bbf343b9da658f257fce108cf66617ddf45` 的统一 `npm run check` 通过：653/653 Node、113/113 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、Presentation/Product 各 100 场 soak、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-7b667bbf343b-product`，Web/微信/抖音 delivery 为 `3604524 / 3633442 / 3633417 B`，`sourceDirty=false`。
- 同一干净提交的 Presentation Session soak 完成 100 场、耗时 `541.673084 ms`、堆增长 `2891744 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `46999.75575 ms`、堆增长 `6382952 B`，帧、生命周期监听、Canvas 监听和输入绑定残留均为零。Product 压力完成 200 场、200 个唯一 authority hash、2 个 content hash、334 次生命周期转换、96 次 rematch、最大 59 tick、7 次 restart、22000 experience，最近 grant 为 `arena-result:r200:000027d8:0de72e23`；Profile 压力 500 次提交完成，revision 为 500，故障注入后诊断保持有效。
- 黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 422 降至 419。
- Product 结果与奖励事务 strict 边界已闭环，但 G4 尚未完成；下一批迁移并加固 `PlayerProfileService`、Repository/CAS/lease/migration，再处理 Product Match Coordinator、Controller 与 Composition。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、奖励数值、解锁条件、权威 tick、Replay schema、黄金 hash 或正式资产。

## G4.5c1 PlayerProfileService 迁移与事务边界加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-profile-service`，只依赖 `arena-contracts` 与 `arena-profile-contracts`；原 Product 私有 JavaScript Service 删除，Composition、Controller、Reward 和测试消费者统一从包公开入口使用唯一 Profile 写入者。该包不实现 Storage、A/B 槽、lease 或平台适配，也不依赖 Product State、Match、Presentation、Three.js、DOM、墙钟或随机源。
- 构造 options、progression grant、Repository commit outcome 全部使用精确已知字段与数据描述符读取，未知字段或访问器不会被执行。Repository 的 `open/getSnapshot/renewLease/compareAndSet/destroy` 在构造期沿原型链快照并绑定，运行中替换方法不能改变已经取得的事务端口。
- `open`、续租、CAS、提交后读回与 `destroy` 共用同步不可重入生命周期边界；Repository 回调不能重入读取、第二次提交或销毁。销毁首次失败时仍保留完整 Repository 所有权并允许精确重试，成功后销毁幂等。
- 角色选择与奖励继续先生成完整不可变 Profile，再在同一临界区写前续租、按旧 revision CAS 并校验精确 commit outcome，最后从 Repository 读回与候选逐项一致的 Profile。明确拒写且旧快照仍可确认时保持可恢复；写后状态歧义、畸形 outcome、读回失败/漂移或确认租约丢失都会把 Service 失败关闭，避免重复发奖或覆盖未知 generation。
- grantId、最近一次 grant 的有界存储、经验和解锁规则保持不变；同 grant 重试仍不增加 revision，正常选择或奖励每次只递增一次。新增 5 项 strict 测试覆盖正常选择/奖励、options/端口 getter 零执行、方法替换隔离、所有 Repository 回调重入、暂时拒写、写后抛异常、畸形 outcome、租约丢失与销毁重试。
- 干净代码提交 `36fbf26569e79783b7a3a734bfff3e023cc79e2b` 的统一 `npm run check` 通过：653/653 Node、118/118 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-36fbf26569e7-product`，Web/微信/抖音 delivery 为 `3606611 / 3635745 / 3635720 B`，`sourceDirty=false`。
- 同一 clean-source 门禁中的 Presentation Session soak 完成 100 场、耗时 `531.856792 ms`、堆增长 `2641680 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `47046.680917 ms`、堆增长 `6357784 B`，帧、生命周期监听、Canvas 监听和输入绑定残留均为零。Profile 压力完成 500 次提交，包含 17 次读回回滚、29 次 head 失败和 16 次非当前槽损坏，最终 revision 为 500、A/B/head 数据 key 保持有界。
- 黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 419 降至 418。
- Profile Service strict 边界已闭环，但 G4 尚未完成；下一批迁移并加固 `PlayerProfileRepository` 与共享同步 lease/CAS/migration 生命周期，再处理 Product Match Coordinator、Controller 与 Composition。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、奖励数值、解锁条件、权威 tick、Replay schema、黄金 hash 或正式资产。

## G4.5c2a 共享同步存储租约迁移与宿主边界加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-storage`，依赖精确限定为 `arena-contracts`；原共享 JavaScript 租约删除，Product Profile、Human Study 与 Input Pilot 统一从公开包消费同一所有权协议。该包只负责同步 Storage 上的竞争、续租、fencing、确认释放与 v1 → v2 兼容，不拥有 Profile、Study、Pilot 聚合、A/B 槽、迁移 Registry 或平台实现。
- 租约构造参数与持久化值只按可枚举数据描述符读取，未知字段、Symbol、访问器和非普通对象在执行前拒绝。底层 `SynchronousStoragePort` 同步加固为沿原型链快照三个宿主方法，运行中替换方法不影响已取得端口，方法/options getter 零执行；Promise/thenable 返回继续被同步边界拒绝并收容迟到拒绝。
- `acquire/assertHeld/renew/release/destroy` 现在覆盖同一同步不可重入边界，修复原 `assertHeld()` 经墙钟或 Storage read 回调可重入的缺口。写入或删除即使先完成后抛异常仍以权威读回为准；获取候选无法确认时清理，确认释放失败时保留所有权供精确重试，成功销毁保持幂等。
- lease schema 继续为 v2，`ownerId/holderId/revision/acquiredAtMs/expiresAtMs` 语义和默认 60 秒时长不变；读取 v1 后只在成功接管时写为 v2，未来 schema 原地保护。Web 默认多运行时互斥、微信/抖音显式 same-owner takeover 与旧实例 fencing 保持不变。
- 新增 5 项 strict 租约测试和 1 组 Storage Port 恶意宿主测试，覆盖 options/存储/方法 getter 零执行、v1 升级、同 owner 接管、全公共方法回调重入、方法替换隔离、释放失败销毁重试；Profile/Pilot/Study 定向集成和 24 项架构门禁通过。JavaScript 精确允许清单由 418 降至 417。
- 干净代码提交 `616ef1f7ef4a5b838c3b0d1f7e3cdd6c85b72a4c` 的完整门禁通过：653/653 Node、124/124 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-616ef1f7ef4a-product`，Web/微信/抖音 delivery 为 `3608777 / 3638125 / 3638100 B`，`sourceDirty=false`。
- 同一代码提交的 Presentation Session soak 完成 100 场、耗时 `523.185792 ms`、堆增长 `2674168 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `46587.390917 ms`、堆增长 `6426320 B`，帧、生命周期监听、Canvas 监听和输入绑定残留均为零。Profile 压力完成 500 次提交，包含 17 次读回回滚、29 次 head 失败和 16 次非当前槽损坏，最终 revision 为 500。
- 共享同步 Storage Lease 已完成 strict 治理，但 G4 尚未完成；下一批迁移并加固 `PlayerProfileRepository` 的 A/B 槽、CAS、迁移与失败关闭生命周期，再处理 Product Match Coordinator、Controller 与 Composition。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、奖励数值、解锁条件、权威 tick、Replay schema、黄金 hash、lease schema 或正式资产。

## G4.5c2b PlayerProfileRepository 迁移与持久化事务加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-profile-persistence`，依赖精确限定为 `arena-contracts`、`arena-profile-contracts` 与 `arena-storage`；原 Product 私有 JavaScript Repository 删除，Composition、压力脚本与测试统一从包公开入口消费。Repository 只实现 A/B 槽、非权威 head、迁移、CAS、lease 组合和失败关闭，不拥有 Profile 业务、奖励、Product 状态、Match、Presentation 或平台实现。
- 构造 options 只接受精确数据字段；Storage Port 与 lease 共用同一组已快照同步方法，运行中替换宿主方法不能分裂两者视图。`open/getSnapshot/getDiagnostics/getStorageKeys/renewLease/compareAndSet/destroy` 共用一个同步不可重入边界，Storage 与墙钟回调不能重入读取、写入、续租或销毁。
- CAS 在写槽前确认 lease 和当前持久化 generation；新槽只有完整写后读回验证成功才发布到内存。写回调先变更后抛异常以读回为准，读回不确定时回滚非当前槽并再次读回确认；未来 schema、同 generation 冲突、租约被取代、其他有效 generation 或无法确认回滚均原地保护并失败关闭。head 继续只是提示，失败不否定已经确认的新槽。
- 打开失败会释放已取得 lease；销毁清理失败保留全部所有权供精确重试。新增 7 项 strict 仓储测试，覆盖 options getter 零执行、Storage 方法快照、打开/CAS 回调全公共方法重入、租约接管、运行期未来 schema、删除已生效但回执为 false，以及销毁失败重试；既有 Profile/Product 专项、500 次提交压力和 24 项架构门禁继续通过。
- 干净代码提交 `1865dcf90bb884316bcc3e6a3686389abcd3a6e0` 的全部门禁项目通过：653/653 Node、131/131 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。沙箱中的统一命令只因 npm 官方审计域名不可解析在审计步骤退出；同一锁文件随后联网审计为 0，且被中止后的 build/verify/budget/artifact 命令逐项通过。build ID 为 `arena-1865dcf90bb8-product`，Web/微信/抖音 delivery 为 `3610945 / 3640840 / 3640815 B`，`sourceDirty=false`。
- 同一 clean-source 门禁中的 Presentation Session soak 完成 100 场、耗时 `631.01225 ms`、堆增长 `2882968 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `51771.881417 ms`、堆增长 `6439008 B`，帧、生命周期监听、Canvas 监听和输入绑定残留均为零。Profile 压力完成 500 次提交，包含 17 次读回回滚、29 次 head 失败和 16 次非当前槽损坏，最终 revision 为 500。
- 黄金 Replay manifest 与四组 replay/final hash 保持 `0dace228`、`17b60bcb/c9cd7e73`、`543a7a80/33a33688`、`2e092bc6/389b7142`、`b68c763e/ee341734`；正式资产结果保持 `82a8b378`。JavaScript 精确允许清单由 417 降至 416。
- Product Profile 持久化链的合同、唯一写入者、Repository 与共享 lease 已闭环，但 G4 尚未完成；下一批处理 Product Match Coordinator、Runtime、Factory、Controller 与 Composition 的所有权和生命周期。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、奖励数值、解锁条件、权威 tick、Replay schema、黄金 hash、Profile/lease schema 或正式资产。

## G4.5d1 Product Match 单局编排迁移与生命周期加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-product-match`，依赖精确限定为 `arena-contracts` 与 `arena-product-contracts`；`ProductMatchRuntime`、`QuickMatchProductFactory`、`ProductMatchCoordinator` 三个旧 JavaScript 实现删除，组合根、Controller、Presentation、Human Study 与测试统一从包公开入口消费。该包不依赖 Product State、Profile、Persistence、Presentation、Three.js、DOM、平台、墙钟或随机源，也不创建第二份 MatchCore。
- Runtime/Factory/Coordinator 构造 options 只读取精确自有数据字段，接口方法在取得所有权时沿原型链快照；运行中替换实例方法不能改变已持有资源的启动、暂停、step、结果或清理语义。同步端口拒绝 Promise/thenable 并收容迟到 rejection，所有同步入口具有不可重入边界，宿主回调不能在半次操作中重入生命周期。
- Factory 按创建顺序接管 QuickMatch 返回值并在校验失败、包装失败或 Runtime 构造失败时逆序清理；清理失败与主错误同时保留。Coordinator 对异步 create 去重，以 generation 拒绝 destroy 后迟到候选；无效候选、迟到候选和释放失败均保留精确清理所有权，后续操作在重试完成前不能创建下一局。暂停请求可在 pending create 期间记忆，完成后只作用于同一 Runtime。
- 新增 6 项 strict 生命周期测试，覆盖 options getter 零执行、原型方法快照、同步回调重入、thenable 拒绝、创建去重、迟到资源、无效候选、清理重试和销毁幂等；24 项架构门禁、38 项 Product/Human Study 定向测试与 200 局 Product 压力继续通过。压力产生 200 个唯一 authority hash、96 次快捷重赛、7 次产品重建，maximum tick 为 59。
- 干净代码提交 `8b6197d03be81fc56f5f0cb83d87ca119b09c9e4` 的全部门禁项目通过：653/653 Node、137/137 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。统一命令在沙箱中只因 npm 官方审计域名不可解析于审计步骤退出；同一锁文件联网审计为 0，其余被中止项目逐项补验通过。build ID 为 `arena-8b6197d03be8-product`，Web/微信/抖音 delivery 为 `3615738 / 3646671 / 3646646 B`，`sourceDirty=false`。
- 同一 clean-source 门禁中的 Presentation Session soak 完成 100 场、耗时 `587.843375 ms`、堆增长 `2891896 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `51784.042708 ms`、堆增长 `6765072 B`，帧、生命周期监听、Canvas 监听和输入绑定残留均为零。黄金 Replay manifest 与正式资产结果继续保持 `0dace228` 与 `82a8b378`。
- Product Match Runtime/Factory/Coordinator strict 链路已闭环，JavaScript 精确允许清单由 416 降至 413，但 G4 尚未完成；下一批处理 `ProductSessionController` 与其端口，再治理 Composition 与内容池外围。本批未改变 Gameplay V2 配置值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、奖励数值、解锁条件、Bot 难度和随机顺序、权威 tick、Replay/Profile/lease schema、黄金 hash 或正式资产。

## G4.5d2 Product Session Controller 迁移与聚合生命周期加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-product-session`，承接 `ProductSessionController` 与窄端口；两个旧 JavaScript 文件删除，Arena V1 组合根和测试统一从包入口消费。该包只编排 Product State、Product Match、Profile 与奖励公开合同，不依赖 Repository/Storage 实现、MatchCore、Bot、Presentation、Three.js、DOM、平台、墙钟、随机或帧调度。
- 构造 options 只接受精确自有数据字段，StateMachine、ProfileService、MatchCoordinator 与 RewardCommitter 方法沿原型链一次性快照；运行中替换实例方法不能改变已接管语义。所有同步意图、状态读取、step、奖励、续租和清理共用不可重入边界；同步端口返回 Promise/thenable 时立即拒绝并收容迟到 rejection，诊断保持非所有者。
- recover/fatal/destroy 先发布产品状态再调用外部观察或清理；若 destroyed/fatal 状态本身未发布，Match/Profile 清理不会提前执行。Match、Profile 与 StateMachine 分别保留清理所有权，失败只重试未完成项；destroy 期间的异步 Profile 迟到成功会重新取得清理责任，失败以 `cleanup-failed` 留存并允许下一次 destroy 精确重试。
- Profile 加载/选择与奖励结果在低频事务边界做数据克隆和冻结，畸形 committed/duplicate、grant unlocks 或 profile 在公开前失败关闭；逐帧 `getActiveMatchSnapshot/step` 不增加权威快照深拷贝，不以降低分辨率、抗锯齿、动作或关节换性能。既有 boot/match 去重、挂起完成、reward/unlock、快捷重赛、任意距离挥空与公开脱敏语义保持不变。
- 新增 7 项 strict 生命周期测试，覆盖 options getter 零执行、方法快照、回调重入、伪异步同步端口、迟到 Profile 清理重试、fatal/destroy 终态先发布和畸形奖励失败关闭；61 项 Product/Progression/Presentation 定向测试、24 项架构门禁与 200 局 Product 压力通过，压力仍为 200 个唯一 authority hash、96 次快捷重赛、7 次产品重建和 maximum tick 59。
- 干净代码提交 `2bed49ca4fdd75a15087a2f99573889fbe0aebed` 的全部门禁项目通过：653/653 Node、144/144 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。统一命令在沙箱中只因 npm 官方审计域名不可解析于审计步骤退出；同一锁文件联网审计为 0，其余被中止项目逐项补验通过。build ID 为 `arena-2bed49ca4fdd-product`，Web/微信/抖音 delivery 为 `3621147 / 3653891 / 3653866 B`，`sourceDirty=false`。
- 同一 clean-source 门禁中的 Presentation Session soak 完成 100 场、耗时 `614.41375 ms`、堆增长 `2650992 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `51793.440541 ms`、堆增长 `6573824 B`，帧、生命周期监听、Canvas 监听和输入绑定残留均为零。黄金 Replay manifest 与正式资产结果继续保持 `0dace228` 与 `82a8b378`。
- Product Session Controller strict 链路已闭环，JavaScript 精确允许清单由 413 降至 411，但 G4 尚未完成；下一批治理 Arena V1 Product Composition 与内容池外围，再审计剩余 Product/Persistence 适配。本批未改变 Gameplay V2 配置、攻击/命中/击退、武器动作、移动/跳跃、奖励/解锁数值、Bot 难度、随机顺序、权威 tick、Replay/Profile/lease schema、黄金 hash 或正式资产。

## G4.5d3 对称内容池迁移与同步端口加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-product-content`，承接内容替代 Definition/Registry、Catalog、内容池 Definition、冻结结果、Resolver 与 Profile Provider；七个旧 JavaScript 实现删除，Arena V1 内容、Composition 与测试统一从包公开入口消费。该包依赖精确限定为 `arena-contracts` 与 `arena-profile-contracts`，不依赖 Match、Session、Persistence、Composition、Presentation、Three.js、DOM、平台、墙钟或非确定性随机。
- Definition、Catalog、替代数组、Resolver/Provider options 和 resolve input 只接受精确数据字段；访问器不会执行，稀疏/额外字段数组、重复来源、替代环、仍在线来源、缺失目标和未知内容均在比赛创建前拒绝。地图与对手角色继续使用原 `content-pool:map`、`content-pool:opponent-character` 具名随机流，同 Profile 与 match seed 的 `selection/contentHash/poolHash` 保持确定。
- `ProfileContentPoolProvider` 在构造期沿原型链快照 `getSnapshot/resolve`，运行中替换方法不能改变已取得端口；整个同步解析边界不可重入，Promise/thenable 不能冒充同步 Profile 或内容池并会收容迟到 rejection。非法 seed 在调用 Profile 端口前拒绝，Resolver 返回的 seed、Profile revision 或 hash 不一致会失败关闭，不把错配内容交给 Quick Match。
- 新增 5 项 strict 边界测试，覆盖确定性 hash、options getter 零执行、方法快照、回调重入、异步伪装、输入先验拒绝、结果 provenance 错配及替代歧义/环/访问器；既有 S8.4 内容池、地图投影、Replay V5 与 Quick Match 测试全部通过。JavaScript 精确允许清单由 411 降至 404。
- 干净代码提交 `c123c702afaaa77ada29822e5bfd788ef7d055b6` 的发布级门禁通过：653/653 Node、149/149 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、200 局 Product 压力、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-c123c702afaa-product`，Web/微信/抖音 delivery 为 `3623573 / 3656346 / 3656321 B`，`sourceDirty=false`、三端 `freezeEligible=true`。
- Presentation Session soak 完成 100 场、堆增长 `2441864 B`；完整 Product Presentation Session soak 完成 100 场、堆增长 `6561856 B`，两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。Product 压力继续得到 200 个唯一 authority hash、2 个 content hash、96 次快捷重赛、7 次重建、最大 59 tick 与 22000 experience；黄金 Replay manifest 和正式资产结果保持 `0dace228` 与 `82a8b378`。
- Web Chrome 在 `390×844` 的 iPhone 13 Pro CSS 视口完成首屏、对局和交互复验：页面标题/非空画面正常、无框架错误覆盖、控制台 0 warning/error；对手约 7m 时攻击键保持可用，点击后进入攻击恢复态。该证据是桌面 Chrome 的手机视口验证，不冒充 iPhone 真机；微信/抖音 iOS/Android 发布真机记录仍属于后续发布门禁。
- 对称内容池 strict 链路已闭环，但 G4 尚未完成；下一批迁移 Arena V1 三个产品内容组合模块和顶层 Product Composition，审计 seed/Storage/诊断端口的构造、逆序清理、重入与失败重试所有权。本批未改变 Gameplay V2 配置、任意距离挥空、命中/击退、武器动作、移动/跳跃、奖励/解锁数值、Bot 难度与随机顺序、权威 tick、Replay/Profile/lease schema、黄金 hash 或正式资产。

## G4.5d4 Arena V1 产品内容真值迁移证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-product-v1-content`，承接 Arena V1 内容池/Catalog/Replacement、Player Profile Definition 与 Reward/Progression Registry；三个旧 JavaScript 内容组合实现删除，Product Composition、脚本和测试统一从包公开入口消费。依赖精确限定为 `arena-definitions`、`arena-product-content`、`arena-profile-contracts` 与 `arena-progression`，不依赖 Match、Session、Persistence、Presentation、Three.js、DOM、平台、墙钟或随机源。
- 三件装备、退役地图和当前 Gameplay V2 地图稳定 ID 收口到 `arena-definitions` 的不可变公共 API；既有 Rule/Map 内容模块仅重导出同一真值，产品 Profile、内容 Catalog 和替代规则不再复制字符串常量。退役 Stage 5 地图仍只作为 Replay/存档兼容来源，当前 Profile 继续解析到 Gameplay V2 大地图。
- 新增 2 项 Arena V1 产品内容包测试和 1 项 Definition 稳定 ID 测试，验证 Profile/Catalog 同源、默认选择、地图替代和 Reward Registry 一致性；架构门禁同时固定该包的唯一允许依赖。JavaScript 精确允许清单由 404 降至 401。
- 干净代码提交 `14e1f70dab6d232de104dc2d567a8fb22814f08c` 的发布级门禁通过：653/653 Node、152/152 strict package/治理、101/101 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-14e1f70dab6d-product`，Web/微信/抖音 delivery 为 `3623563 / 3656342 / 3656317 B`，`sourceDirty=false`、三端 `freezeEligible=true`。
- Presentation Session soak 完成 100 场、耗时 `567.574083 ms`、堆增长 `2650464 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `47984.21075 ms`、堆增长 `6547312 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；黄金 Replay manifest 与正式资产结果继续保持 `0dace228` 与 `82a8b378`。
- Arena V1 产品内容真值已完成 strict 治理，但 G4 尚未完成；下一批只迁移并加固顶层 Product Composition，审计 seed/Storage/诊断端口构造、部分资源逆序清理、回调重入、异步迟到所有权与失败重试。本批未改变 Gameplay V2 数值、任意距离挥空、命中/击退、武器动作、移动/跳跃、奖励数值、Bot 难度与随机顺序、权威 tick、Replay/Profile/lease schema、黄金 hash 或正式资产。

## G4.5d5 Product Composition 迁移与 G4 收口证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-product-composition`，按 Profile Repository → Profile Service → Content Provider/Quick Match → Match Coordinator → Reward Committer → Product Session 的方向组装唯一所有权图。包只依赖已治理的 Product/Profile 边界，不依赖 MatchCore、Presentation、Three.js、DOM、平台、墙钟实现、帧调度或网络遥测；Arena V1 JavaScript 文件缩为内容与 Quick Match 工厂注入适配，不再承载生命周期算法。
- options/defaults 仅接受精确可枚举数据字段，`matchConfig`、回调、takeover 与 seed port 在资源接管前预检；seed 方法在组合期快照，Promise/thenable 不能冒充同步 Quick Match 工厂且迟到 rejection 被收容。调用方覆盖位于基础配置和强制配置之间，`contextPrimaryMobilityEnabled=false` 仍不可被覆盖，因此任意距离攻击挥空不退化。
- 构造中按取得顺序记录 Repository、Profile Service、Match Coordinator 与 Controller 的原型数据方法；失败时按 Controller → Match → Profile → Repository 逆序清理并合并清理错误。诊断回调保持无所有权且异常/重入被隔离，Match completion 仍由 Product Match Runtime 在权威终局后唯一调用。
- 新增 3 项 strict 组合边界测试和 2 项 Arena V1 集成测试，覆盖 getter 零执行、未知字段、配置/回调/seed 先验拒绝、默认值访问器、seed 方法替换与诊断重入；统一生命周期回归由 101 增至 103。JavaScript 精确允许清单保持 401，因为剩余 32 行 Arena V1 文件是 G6/G7 的应用注入适配，不是 Product 生命周期实现。
- 干净代码提交 `a84e1d4c3f6c646164318376fa97136093d08733` 的发布级门禁通过：655/655 Node、155/155 strict package/治理、103/103 生命周期、120 场 fuzz/6 次 Replay、200 局 Product 压力、500 次 Profile 压力、0 个生产依赖漏洞、正式资产与三端 clean build/预算/唯一生产产物均通过。build ID 为 `arena-a84e1d4c3f6c-product`，Web/微信/抖音 delivery 为 `3628686 / 3661452 / 3661427 B`，`sourceDirty=false`、三端 `freezeEligible=true`。
- Presentation Session soak 完成 100 场、耗时 `526.167625 ms`、堆增长 `2666136 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `47049.00675 ms`、堆增长 `6604952 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；黄金 Replay 与正式资产结果保持 `0dace228`、`82a8b378`。
- 390×844 Chrome 手机视口重新完成首屏、真实对局和攻击点击复验：画面正常，攻击产生明确命中圈与击退，页面自身 0 warning/error。该证据不冒充 iPhone 13 Pro/iOS 26 真机记录。Web 主业务 chunk 为 `653.27 kB`（gzip `171.05 kB`），触发 Vite 的 650 kB 信息警告但仍低于项目 JavaScript/交付预算；G6 构建治理需评估拆包，不以降低分辨率、抗锯齿、动作或关节规避。
- G4 的 Bot/Product/Persistence 治理已关闭；下一批进入 G5 Presentation、Three、反馈与正式资产加载所有权。G4 未改变 Gameplay V2 数值、命中/击退、武器动作、移动/跳跃、奖励数值、Bot 难度与随机顺序、权威 tick、Replay/Profile/lease schema、黄金 hash 或正式资产。

## G5.1 表现基础合同迁移与生命周期清理加固证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-presentation-contracts`，承接 19 个动画语义、动画源/动作类别、资产 Definition/Registry、角色表现 Definition/Registry、显式 fallback 绑定解析与逐帧动画语义解析。包依赖精确限定为 `arena-contracts`，不依赖 MatchCore、Bot、Session、Three.js、DOM、平台、墙钟或随机源；Renderer/UI/Audio 只能消费其不可变数据与解析结果。
- 七个旧 JavaScript 真值文件已删除，生产内容、正式资产、角色 Runtime、Three View、Release 交接与测试统一从包公开 API 消费；JavaScript 精确允许清单由 401 降至 394。Definition 深复制并冻结调用方数据，Registry 在发布前验证重复 ID、默认角色、模型/附件种类和完整动画/插槽引用。
- 动画解析构造参数、capability 数组、事件与逐帧必要字段拒绝访问器而不执行 getter；动作 presentation 在构造时快照。坏帧在 overlay 校验失败前不再提前改写空中动作记忆，重试不会继承半完成的二段跳状态；同 tick 结果幂等，match seed/tick 回退重置和 `destroy()` 终态保持明确。
- Arena/Product Presentation Session 的 Canvas context 事件现在要求成对绑定/解绑能力；解绑失败时 cleanup 不再被提前标记完成，Session 保留 Canvas 所有权并允许下一次 `destroy()` 精确重试。新增故障注入回归验证第一次清理失败后仍有 1 个待清监听，第二次清理后监听、binding 与 cleanupIncomplete 全部归零。
- 干净代码提交 `5327654829f50af7329e0e3ee9394cd42acfeb39` 的等价发布门禁全部通过：657/657 Node、158/158 strict package/治理、103/103 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产和三端 clean build/预算/唯一生产产物均通过。黄金 Replay 与正式资产结果保持 `0dace228`、`82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `626.389542 ms`、堆增长 `2640920 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `60921.637958 ms`、堆增长 `6578144 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；后续批次需继续观察完整 Product soak 的耗时波动，不能用降低分辨率、抗锯齿、动作或关节规避。
- build ID 为 `arena-5327654829f5-product`，Web/微信/抖音 delivery 为 `3633435 / 3666023 / 3665998 B`，`sourceDirty=false`、三端 `freezeEligible=true`。Web 主业务 chunk 为 `658.02 kB`（gzip `171.95 kB`），仍触发 650 kB 信息警告，归入 G6 拆包审计。
- 390×844、DPR 3 的 Chrome 手机视口完成首屏、正式角色、真实对局和攻击点击复验；攻击键可用并出现红色命中反馈。合成 `webglcontextlost` 的默认行为被阻止，恢复后 Canvas 保持 `780×1688`，运行事件为零。该记录不冒充 iPhone 13 Pro/iOS 26 真机；微信/抖音四目标真机记录仍是发布门禁。
- 本批未改变 Gameplay V2 数值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、Bot 难度与随机顺序、权威 tick、Replay/Profile/lease schema、黄金 hash 或正式资产字节。G5 仍在进行；下一批按纯反馈/Frame/Quality → 资产加载 → Three Runtime → Presentation Session 的依赖方向迁移并完成动作/武器验收映射审计。

## G5.2 表现运行时原语迁移与调度失败关闭证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-presentation-runtime`，承接 `PresentationEventWindow`、`PresentationFrameLoop`、`FixedTickAccumulator`、画质 Definition/Registry 和渲染节拍。依赖精确限定为只读 `arena-contracts` 与公开 tick 配置所在的 `arena-match`，不依赖 MatchCore 实例、Bot、Product/Session、Renderer、Three.js、DOM、平台全局、墙钟实现、定时器或随机源。
- 七个旧 JavaScript 真值文件已删除，Session、Renderer、入口、性能证据和测试统一从包公开 API 消费；JavaScript 精确允许清单由 394 降至 387。高画质仍保持最大 DPR 2、抗锯齿开启和 60 FPS；低画质 30 FPS 的表现节拍不改变 60 Hz 权威 tick。
- FrameLoop 用独立 pending 所有权位处理宿主返回 `null`/`undefined` 帧令牌，停止时仍精确取消并用 generation 抑制迟到回调；同步 requestFrame 回调、回调重入、Promise/thenable 回调、调度异常和诊断异常均被收容并失败关闭。EventWindow、质量参数与构造 options 拒绝访问器而不执行 getter；FixedTickAccumulator 在有限数溢出或步数非法时保持提交前状态，可安全判定失败而不留下半步累积。
- 干净代码提交 `66d1ebf0de53bcfda2ca352d39a312299edc3370` 的等价发布门禁全部通过：658/658 Node、162/162 strict package/治理、103/103 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产和三端 clean build/预算/唯一生产产物均通过。黄金 Replay 与正式资产结果保持 `0dace228`、`82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `556.313833 ms`、堆增长 `2642688 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `52941.087542 ms`、堆增长 `6632048 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- build ID 为 `arena-66d1ebf0de53-product`，Web/微信/抖音 delivery 为 `3635086 / 3667706 / 3667681 B`，`sourceDirty=false`、三端 `freezeEligible=true`。Web 主业务 chunk 为 `659.67 kB`（gzip `172.53 kB`），仍是 G6 拆包审计项，不以降低分辨率、抗锯齿、动作或关节规避。
- 390×844、DPR 3 的 Chrome 手机视口完成首屏、正式角色、真实对局和攻击点击复验；实战出现红色命中/攻击反馈，合成 WebGL context loss 被阻止且恢复后 Canvas 为 `780×1688`，运行事件为零。该记录不冒充 iPhone 13 Pro/iOS 26 真机；微信/抖音四目标真机记录仍是发布门禁。
- 本批未改变 Gameplay V2 数值、任意距离攻击挥空、命中/击退、武器动作、移动/跳跃、Bot 难度与随机顺序、权威 tick、Replay/Profile/lease schema、黄金 hash 或正式资产字节。G5 继续按反馈语义/视觉效果 → 正式资产加载 → Three Runtime → Presentation Session 的依赖方向治理，并在收口前完成全部动作与不同武器的验收映射审计。

## G5.3 正式资产加载 lease 与六方向运行时治理证据

- `PresentationAssetLoadTask`、四类固定资产 Provider ID 和 `SixSectorDirectionResolver` 已迁入 strict `@number-strategy-jump/arena-presentation-runtime`；三个旧 JavaScript 真值文件删除，精确允许清单由 387 降至 384。表现合同包和运行时包同时补齐 TypeScript `composite`、声明文件和 source map 输出，运行时包只新增对底层表现合同包的单向依赖，不接触 Three.js、DOM 或平台全局。
- 资产 Registry、asset ID、loader 和 lease 均在状态变更前经过普通对象/精确字段/数据方法边界；loader 方法在构造期快照，运行中替换不能改变已接管任务。lease 身份、值和同步 release 必须完整；无效 lease 若清理失败会保留所有权供 `destroy()` 精确重试，Promise/thenable release 被收容并失败关闭，不以“已清理”掩盖不确定状态。
- 六方向构造与逐次 resolve 拒绝访问器、Symbol、未知字段、非布尔 reset、非有限/非正交向量；方向候选只在整次输入验证和结果构造完成后提交。带 `reset=true` 的坏 camera/facing 不再提前丢失上一 sector，边界迟滞与销毁终态保持原有行为。
- 干净代码提交 `f8a9b909c5b62577546d4994f23a10b3006955fd` 的等价发布门禁通过：658/658 Node、164/164 strict package/治理、103/103 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产预算和三端 clean build/预算/唯一生产产物均通过。黄金 Replay 与正式资产结果保持 `0dace228`、`82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `536.251833 ms`、堆增长 `2650640 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `50140.293333 ms`、堆增长 `6582328 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- build ID 为 `arena-f8a9b909c5b6-product`，Web/微信/抖音 delivery 为 `3635863 / 3668473 / 3668448 B`，`sourceDirty=false`、三端 `freezeEligible=true`。Web 主业务 chunk 为 `660.45 kB`（gzip `172.69 kB`），继续归入 G6 拆包审计。
- 390×844、DPR 3 Chrome 手机视口通过 CDP 捕获到两个正式角色 GLB（`922332 B`、`974548 B`）、盾牌 GLB（`13084 B`）及三张正式纹理成功响应；实战 Canvas 为 `780×1688`，对手 4m 外攻击键可用并完成挥空，合成 WebGL context loss 被阻止并恢复，页面 warning/error 为零。该记录不冒充 iPhone 13 Pro/iOS 26 真机。
- 本批没有改变 Gameplay V2 数值、任意距离攻击、命中/击退、武器动作、移动/跳跃、画质、分辨率、抗锯齿、关节数量、Bot、权威 tick、Replay/Profile schema 或正式资产字节。G5 下一批迁移并加固 Character View Runtime，修复底层 view 释放失败后不可重试的生命周期缺口，再进入 Three 对象图和反馈所有权。

## G5.4 Character View Runtime 迁移与可重试释放证据

- `CharacterViewRuntime` 已迁入 strict `@number-strategy-jump/arena-presentation-runtime`，旧 JavaScript 真值删除，精确允许清单由 384 降至 383。运行时继续只依赖不可变角色表现 Definition、动画语义解析、六方向解析和注入 View Port，不导入 Three.js、DOM、平台或权威写入 API。
- 构造 options、Factory 与 View 的 `create/getAnimationCapabilities/sync/update/getDebugSnapshot/dispose` 均要求数据方法并在接管时快照；访问器不会执行，后续方法替换不能劫持既有 Runtime。Factory/View 返回 Promise 或 thenable 会被收容并拒绝，View debug snapshot 深复制冻结，participant 表现身份和 camera input basis 在同步前验证。
- Runtime 增加同步操作重入保护；View 回调不能在 `sync/update` 中销毁或再次推进同一 Runtime。动画 resolver、方向 resolver 和底层 View 分别记账，只有对应 `destroy/dispose` 成功后才放弃所有权；失败关闭或显式销毁遇到瞬时释放错误时，下一次 `dispose()` 会只重试未完成项，不再因提前设置 `viewDisposed` 而永久跳过。
- 干净代码提交 `2c9902df568a336236ec86cd14c54f19117852c6` 的等价发布门禁通过：659/659 Node、164/164 strict package/治理、103/103 生命周期、120 场 fuzz/6 次 Replay、0 个生产依赖漏洞、正式资产预算和三端 clean build/预算/唯一生产产物均通过。黄金 Replay 与正式资产结果保持 `0dace228`、`82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `679.348166 ms`、堆增长 `2641192 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `56233.564458 ms`、堆增长 `6587488 B`。两者低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- build ID 为 `arena-2c9902df568a-product`，Web/微信/抖音 delivery 为 `3638715 / 3671424 / 3671399 B`，`sourceDirty=false`、三端 `freezeEligible=true`。Web 主业务 chunk 为 `663.30 kB`（gzip `173.60 kB`），继续归入 G6 拆包审计。
- 390×844、DPR 3 Chrome 手机视口实战确认两个正式角色 GLB、盾牌和三张纹理均返回 200，正式角色与武器附件正常，攻击触发视觉反馈，Canvas `780×1688`，页面 warning/error 为零。该证据不冒充 iPhone 13 Pro/iOS 26 真机。
- 本批没有改变 Gameplay V2 数值、任意距离攻击、命中/击退、动作/武器差异、移动/跳跃、画质、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或资产字节。下一批治理 `CharacterViewRegistry`、GLTF/程序化 View 及其他 Three Registry 的对象挂载/卸载/释放重试，关闭上层 Registry 先删记录后清理失败导致的所有权丢失。

## G5.5 Three 表现资源边界与 Registry 可重试所有权证据

- 新增 strict TypeScript workspace `@number-strategy-jump/arena-presentation-three`，承接视觉坐标与灰盒样式、程序化锤/盾/锁链、Three 资源释放 lease、`SurfaceViewRegistry`、`EquipmentViewRegistry` 与 `CharacterViewRegistry`。七个旧 JavaScript 真值已删除，精确允许清单由 383 降至 376；依赖精确限定为 `arena-presentation-contracts`、`arena-presentation-runtime` 与固定版本 `three@0.185.1`。
- 新治理门禁 `check:presentation-three-boundaries` 同时核对包依赖白名单和全部 9 个 strict 源文件，禁止 MatchCore/RuleEngine、权威 mutation、非确定性随机、DOM、宿主帧调度、Product/Session/Match 反向依赖。Renderer、Canvas UI、GLTF/程序化角色 View 和测试消费者均改从包公开入口使用 Three 能力。
- 三类 Registry 在修改对象图前完成整批数据校验：拒绝重复身份、未知装备状态、状态/位置矛盾、未知平台警告、稀疏数组、索引访问器和未知 options，不执行调用方 getter。同步/更新回调重入被拒绝；运行失败立即关闭主流程并尝试逆向清理，不继续发布半可用表现状态。
- `ThreeObjectDisposalLease` 分别持有 texture/material/geometry 与 parent detach 的完成位；首次释放失败只重试失败资源，不重复释放已成功资源。Registry 不再先从 Map 删除后清理，而是保留未 detach/未 dispose 的记录；失败关闭或首次 `dispose()` 不完整后，后续 `dispose()` 能精确重试。故障注入分别覆盖角色 root/runtime 双重失败、装备 root 失败和 Three material 失败，以及第二次失败关闭与终态第三次成功清理。
- 干净代码提交 `5e700a340a13cbc3f898152f91d74a4134153ef5` 的门禁通过：660/660 Node、168/168 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 120 场，共 360 场、360 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case。
- Presentation Session soak 完成 100 场、耗时 `554.417666 ms`、堆增长 `2646288 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `60317.896042 ms`、堆增长 `6639424 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；完整 Product soak 耗时继续作为性能观察项，不以降低分辨率、抗锯齿、动作或关节规避。
- clean build ID 为 `arena-5e700a340a13-product`，Web/微信/抖音 delivery 为 `3650028 / 3683535 / 3683510 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；正式资产预算仍为 `82a8b378`，生产依赖审计为 0 vulnerabilities。Web 主业务 chunk 为 `674.61 kB`（gzip `176.06 kB`），仍触发 650 kB 信息警告并保留为 G6 拆包审计项。
- 390×844、DPR 3 的桌面 Chrome 手机视口完成 Product 首屏、正式角色、大于视口的世界、盾/锁链和实战攻击点击复验；Canvas 为 `780×1688`，两份正式角色 GLB 与盾牌 GLB 均返回 HTTP 200，页面自身 0 warning/error。对手约 7m 时攻击点击进入既有恢复期，自动化仍证明任意距离可起手、仅有效范围命中。该记录不是 iPhone 13 Pro/iOS 26 真机证据，微信/抖音四目标真机记录仍是发布门禁。
- 本批未改变 Gameplay V2 数值、攻击/命中/击退、动作与武器差异、移动/跳跃、画质、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。G5 下一批治理 GLTF/程序化角色 View、动画 Controller、资产 loader、命中特效、World/HUD/Renderer 与 Presentation Session，继续关闭 Three 资源与监听器所有权后再做完整动作/武器验收映射审计。

## G5.6 正式角色动画 Controller 迁移与失败关闭证据

- `CharacterAnimationController` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并从包公开入口提供，旧 JavaScript 真值删除，精确允许清单由 376 降至 375，Three 包治理源文件由 9 增至 10。GLTF Character View 与正式动画测试不再通过源码相对路径引用控制器。
- Controller 在建立或修改 Three AnimationMixer 状态前完整归一化 clips、action presentations、velocity、equipment、action、animation semantics 与 base binding，并以数据字段读取 hit direction；稀疏数组、重复 clip、Symbol/访问器、未知 option、无效动作阶段、idle/非 idle 身份与剩余 tick 矛盾、`baseEnteredAtTick > tick` 均在提交前拒绝。`equipment.definitionId` getter 不会执行，边界拒绝后同一 Controller 仍可继续使用。
- 正式角色仍保留原有跑/走速度匹配、起跳准备/空中、二段跳启动/空中、正面/背面受击、基础动作淡入，以及按统一动作 timing 驱动的 windup/active/recovery 上半身 overlay；锤、盾、链条和空手继续映射各自 clip。同步或 mixer 更新的内部异常会失败关闭，不继续发布半动画状态。
- AnimationMixer 的 stop 与 root uncache 分别记账；首次 `dispose()` 瞬时失败后只重试未完成步骤，不重复执行已经成功的清理，终态重复释放幂等。故障注入同时覆盖 presentation getter、equipment getter、坏动作组合、坏 tick 关系与 stop 首次失败。
- 干净代码提交 `a8559290383eca6c4f5256b2ba2898b02a421552` 的门禁通过：660/660 Node、169/169 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case。
- Presentation Session soak 完成 100 场、耗时 `659.278958 ms`、堆增长 `2676032 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `50482.302084 ms`、堆增长 `6616064 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-a8559290383e-product`，Web/微信/抖音 delivery 为 `3655651 / 3689419 / 3689394 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；正式资产预算保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。Web 主业务 chunk 为 `680.23 kB`（gzip `177.15 kB`），仍触发 650 kB 信息警告并保留为 G6 拆包审计项。
- 390×844、DPR 3 的桌面 Chrome 手机视口复验正式 GLTF 角色与攻击输入；Canvas 为 `780×1688`。攻击采样进入 `base-push active`，上半身片段为 `Unarmed_Melee_Attack_Punch_A`、overlay track 为 9，释放后输入归零；1656 个渲染样本 P95 为 `2100 μs`，无 dropped seconds、context loss 或应用错误。该记录不是 iPhone 13 Pro/iOS 26 真机证据。
- 正式资产字节与结构预算已重算通过，但仓库不存在外部正式授权 Intake Bundle 与独立证据目录，因此没有运行并通过 `verified-intake-only`，不得把资产预算冒充最终来源审批；该项继续保留在 G8/发布门禁。无参数执行 intake CLI 只会因缺少必需的 `--bundle` 与 `--artifacts-root` 被正确拒绝。
- 本批未改变 Gameplay V2 配置 hash `8c322912`、任意距离起手与仅有效范围命中、攻击/击退、动作与武器差异、移动/跳跃、画质、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。G5 下一批治理 GLTF/程序化 Character View 与 Factory、平台纹理/GLTF loader，再进入命中特效、World/HUD/Renderer 与 Presentation Session。

## G5.7 GLTF 与宿主纹理 Loader 迁移和资源回滚证据

- `GltfPresentationAssetLoader` 与 `PlatformTextureLoader` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并从包公开入口提供，Renderer、Character Factory 与正式资产测试统一改用包 API；两个旧 JavaScript 真值删除，精确允许清单由 375 降至 373，Three 包治理源文件由 10 增至 12。
- GLTF Loader 在构造期快照 `loadAsync/parseAsync`、可选字节读取端口及 LoadingManager handler 方法，后续替换 loader 方法不能劫持已接管实例。options/Definition/GLTF result 必要字段均以数据字段读取；未知 options、访问器、错误 provider、非 ArrayBuffer、非 Object3D scene、稀疏或非 AnimationClip 动画数组在发布 lease 前拒绝。
- 外部纹理 URL 仅允许 `assets/`，同时检查原始与 decode 后的反斜线、`..` 和坏百分号编码；小程序 `./assets/` 到 `assets/` 的宿主兼容重试保持不变。createImage、LoadingManager 与完成/失败回调均要求同步合同；thenable 会被收容拒绝，不制造迟到 unhandled rejection。
- LoadingManager `addHandler` 若返回异步伪装或抛错，会调用已快照的 `removeHandler` 回滚；无效 GLTF 若已经取得 scene，会在抛错前释放材质/geometry/纹理。有效 GLTF lease 使用可重试 `ThreeObjectDisposalLease`，首次材质释放失败后只重试材质，已经成功的 geometry 不重复释放，连续成功 release 幂等。
- 干净代码提交 `8a6ac4ce1cb51cf55d292f8fdde54b4ef6c1afef` 的门禁通过：660/660 Node、170/170 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case。
- Presentation Session soak 完成 100 场、耗时 `1070.632916 ms`、堆增长 `2670912 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `47905.966708 ms`、堆增长 `6595632 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-8a6ac4ce1cb5-product`，Web/微信/抖音 delivery 为 `3660670 / 3694569 / 3694544 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；正式资产预算保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。Web 主业务 chunk 为 `685.24 kB`（gzip `178.01 kB`），仍是 G6 拆包审计项。
- 390×844、DPR 3 的桌面 Chrome 手机视口中，盾牌与两份正式角色模板全部 ready、`loadErrorAssetIds=[]`；两名角色均为正式 `gltf-character`，分别有 56/54 个对象且各有 18 个动作片段，跑酷学徒与发条角色模型和纹理可见。Canvas 为 `780×1688`，无 dropped seconds、context loss 或页面 warning/error。该记录不是 iPhone 13 Pro/iOS 26 真机证据。
- 本批仍没有外部正式授权 Intake Bundle 与独立证据目录，因而没有 `verified-intake-only` 结论；这与已通过的字节/节点/关节/纹理预算是两类证据，继续保留为 G8/发布阻断。未改变 Gameplay V2 配置、任意距离起手、命中/击退、动作/武器差异、移动/跳跃、画质、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批治理 GLTF/程序化 Character View 与 Factory 的异步任务、fallback 和对象释放所有权。

## G5.8 程序化角色 Factory 严格边界与重入保护证据

- `ProgrammaticCharacterViewFactory` 已迁入 strict `@number-strategy-jump/arena-presentation-three`，旧 JavaScript 真值删除，精确允许清单由 373 降至 372，Three 包治理源文件由 12 增至 13。World Stage 只在组合点注入现有 `ProgrammaticCharacterView` 构造函数，程序化角色仍仅是正式 GLTF 资产路径不可用时的既定兜底，没有取代当前生产模型。
- Factory 构造与 `create()` 仅接受精确字段集合；asset Registry、participant、角色表现 Definition、动作表现和注入构造函数在调用前完成数据字段校验与快照。动作表现深复制冻结，调用方后续修改 timing、weapon scale 或嵌套值不会改变已接管工厂；options 访问器不会执行。
- 角色表现 Definition 由公共合同重新规范化并与资产 Registry 交叉校验，只允许 `character-model` 与 `programmatic-character-v1` provider。Factory 回调收到冻结 options；同步回调重入被明确拒绝，`finally` 恢复创建门，异常不会把工厂永久卡在 creating 状态。View 对象合同、thenable 收容和失败候选清理由下游 `CharacterViewRuntime` 继续唯一负责，未形成第二套生命周期所有者。
- 干净代码提交 `d51923d9ec97ea95cbf67832607c4c84149afadc` 的门禁通过：660/660 Node、171/171 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case。
- Presentation Session soak 完成 100 场、耗时 `586.421833 ms`、堆增长 `2660280 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `53585.256916 ms`、堆增长 `6613392 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-d51923d9ec97-product`，Web/微信/抖音 delivery 为 `3662369 / 3696349 / 3696324 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；正式资产预算保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。Web 主业务 chunk 为 `686.94 kB`（gzip `178.32 kB`），继续保留为 G6 拆包和运行成本审计项。
- 390×844、DPR 3 的桌面 Chrome 手机视口完成 Product 首屏和正式 GLTF 对局；渲染策略保持 DPR 2 上限，Canvas 为 `780×1688`。两名正式角色和盾牌共 3 个模板 ready，`loadErrorAssetIds=[]`，运行状态为 `running/ready`，authority backlog `droppedSeconds=0`，无 context loss 或应用错误。当前生产组合实际使用 GLTF，因此本次浏览器证据证明主流程未回退；程序化 Factory 路径由 Node Three 集成测试覆盖。该记录不是 iPhone 13 Pro/iOS 26 真机证据。
- 本批没有改变 Gameplay V2 配置、任意距离起手、命中/击退、动作/武器差异、移动/跳跃、画质、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批迁移并加固完整 `ProgrammaticCharacterView`，重点关闭 sync 中途失败的原子性、装备替换回滚、动画状态输入和 Three 对象释放重试，再治理 GLTF Character View/Factory。

## G5.9 程序化角色 View 迁移、事件去重与可重试释放证据

- `ProgrammaticCharacterView` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并由包公开入口提供，World Stage 与 GLTF fallback Factory 不再引用上层 JavaScript 实现。旧 JavaScript 真值删除，精确允许清单由 372 降至 371，Three 包治理源文件由 13 增至 14。
- 构造 options、角色表现 Definition、asset source、动作表现、动画 capabilities、participant snapshot、animation semantics、direction resolution、frame events 与 world participant 位置均通过数据字段读取和范围校验；调用方 getter 不执行。动作表现深复制冻结，snapshot/animation/frame 在任何 Three 对象或内部状态修改前完成归一化，边界输入失败后同一 View 保持可用。
- 原有 13 个程序化关节和动作集合完整保留：呼吸、走/跑摆臂摆腿、停止缓冲、起跳准备、上升/下落、二段跳启动/空中、落地、正背受击，以及空手、锤、链、盾的 raise/swing/follow-through/retract、空中攻击姿态和 weapon scale。同步和更新期间增加重入保护，内部 Three mutation 异常后失败关闭，不发布半可用角色。
- `HitResolved` 与地面起跳 `ActionStarted` 现在按单调 event sequence 去重，累积 frame 不会每帧重新启动受击或起跳准备。装备替换先完整创建候选 lease，再释放旧装备并挂载；旧装备释放失败时保留所有权并回滚候选。角色本体与动态装备分别使用 `ThreeObjectDisposalLease`，首次材质释放失败后第二次只重试失败资源，终态重复 `dispose()` 幂等。
- 干净代码提交 `09b9728afafd7a437ddf67c936d60a12f90cabfd` 的门禁通过：660/660 Node、173/173 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case。
- Presentation Session soak 完成 100 场、耗时 `598.798625 ms`、堆增长 `2527048 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `58629.246417 ms`、堆增长 `6601816 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。正常生产继续使用 GLTF View，因此本批严格归一化开销仅属于 GLTF 失败兜底，不进入正常正式角色每帧路径。
- clean build ID 为 `arena-09b9728afafd-product`，Web/微信/抖音 delivery 为 `3671284 / 3705615 / 3705590 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；正式资产预算保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。Web 主业务 chunk 为 `695.86 kB`（gzip `181.08 kB`），相对上一批增加的严格 fallback 代码继续列入 G6 拆包审计，不以降画质规避。
- 390×844、DPR 3 桌面 Chrome 手机视口通过 CDP 主动阻断全部 3 个 GLB 请求，确认 `loadErrorAssetIds` 精确包含盾牌和两名正式角色且 `templateAssetIds=[]`；Product 仍进入 `running` 对局，两个程序化角色 `failed=false`、各 13 个关节，Canvas `780×1688`、`droppedSeconds=0`、无 context loss。实战诊断捕获 `hit-front`、锤子 `retract` 和非 1.0 武器缩放，证明 fallback 动作链实际运行。该故障注入不是 iPhone 13 Pro/iOS 26 真机证据，也不代表程序化轮廓替代正式模型。
- 本批没有改变 Gameplay V2 配置、任意距离起手、命中/击退、正式 GLTF 动作与武器差异、移动/跳跃、画质、分辨率、抗锯齿、正式角色关节、Bot、权威 tick、Replay/Profile schema 或资产字节。下一批迁移 `GltfCharacterView` 与 `GltfCharacterViewFactory`，治理模板克隆、装备附件、异步 load/dispose 竞争、失败回滚和骨骼资源所有权。

## G5.10 正式 GLTF 角色 View 迁移与共享资源所有权证据

- `GltfCharacterView` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并由包公开入口提供，GLTF Factory 不再引用上层 JavaScript View。旧 JavaScript 真值删除，精确允许清单由 371 降至 370，Three 包治理源文件由 14 增至 15；正常正式角色仍使用原有骨骼克隆、18 个动画片段、双手插槽和动作叠加路径。
- 构造 options、角色表现 Definition、角色/装备模板、动作表现、participant snapshot、animation semantics/base binding、direction 与 frame events/world participants 均在任何对象图或内部状态修改前通过数据字段、范围和交叉关系校验；未知字段、访问器、稀疏数组、坏 clip、零朝向、动作 phase/identity/tick 矛盾和未知装备会被拒绝，调用方 getter 不执行。动作表现深复制冻结，边界拒绝后同一 View 仍可用。
- 原有正式角色表现没有缩减：呼吸、停止缓冲、走/跑、起跳准备与空中姿态、二段跳旋转/收腿、正背受击，以及空手、锤、链、盾的 raise/swing/follow-through/retract、空中攻击和武器放大均保持。同步和更新增加不可重入锁；Controller、装备或 Three mutation 内部异常后 View 失败关闭，由上层 `CharacterViewRuntime` 立即回收，不继续使用半更新状态；重复 `HitResolved` sequence 只消费一次。
- 正式 GLTF clone 继续共享已加载模板的 geometry、material 和 texture，View 销毁只解绑 clone，不越权释放 Factory 的模板 lease。程序化装备候选在旧装备移除前创建并取得独立 `ThreeObjectDisposalLease`；旧装备清理失败会保留所有权并回滚候选。Controller、装备、root detach 与 root clear 分别记账，首次清理异常后只重试未完成项，成功后重复 `dispose()` 幂等。
- 干净代码提交 `aeed058c97ad23754cc0ad8b8dd880e1b63ce36d` 的门禁通过：660/660 Node、175/175 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case；生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `610.42475 ms`、堆增长 `2658192 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `59371.021542 ms`、堆增长 `6575888 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。正式角色每帧严格边界仍需在 G5/G6 的目标设备性能审计中继续观察，不以降低分辨率、抗锯齿、动作或关节换取指标。
- clean build ID 为 `arena-aeed058c97ad-product`，Web/微信/抖音 delivery 为 `3680116 / 3714750 / 3714725 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `704.69 kB`（gzip `181.75 kB`），继续列入 G6 拆包与运行成本审计。
- 390×844 的 Codex 内置 Chromium 手机视口完成 Product 首屏与正常生产对局；跑酷学徒、骷髅战士和锤类附件正常可见，开始匹配、攻击、跳跃与空中攻击均触发界面/角色状态变化，首屏和对局三轮 console 检查均无 warning/error。该记录不冒充 iPhone 13 Pro/iOS 26 Chrome 真机证据，也不替代微信/抖音目标真机发布门禁。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离起手与仅有效范围命中、攻击/击退、动作与武器差异、移动/跳跃、画质、分辨率、抗锯齿、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批单独迁移并加固 `GltfCharacterViewFactory` 的异步模板加载、fallback、竞争取消、候选释放与 Factory 终止生命周期，再进入命中特效、World/HUD/Renderer 与 Presentation Session。

## G5.11 正式 GLTF 角色 Factory 迁移与异步清理所有权证据

- `GltfCharacterViewFactory` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并由包公开入口提供；World Stage 与正式角色测试不再引用上层 JavaScript Factory。旧 JavaScript 真值删除，精确允许清单由 370 降至 369，Three 包治理源文件由 15 增至 16。正式角色仍优先使用已加载 GLTF 模板，程序化角色只在对应模板加载失败时兜底。
- Factory options、create options、动作表现、角色表现 Definition、资产 kind/provider 和装备附件映射在接管或创建对象前完成精确字段、数据 descriptor 与交叉引用校验；访问器不会执行，动作表现深复制冻结。Loader 的原型数据方法在构造期快照，运行中替换 `load()` 不能劫持已接管实例；重复装备模板在启动加载前拒绝。
- `load()` 为每个正式模板建立唯一 `PresentationAssetLoadTask` 并去重并发调用；单个 GLTF/附件加载失败只记录其稳定 asset ID，角色创建走受限程序化 fallback，不把部分模板或错误对象发布给 View。正式内容现在必须先完成 `load()` 才能同步角色，旧地图测试中绕过该生命周期的夹具已修正为显式等待，而没有放宽 Factory 约束。
- Factory 销毁先进入终止态，加载完成后的迟到 lease 不会重新发布模板；仍在加载的 task 与首次释放失败的 lease 保留在原 owner 中，后续 `dispose()` 只重试未完成清理。故障注入证明 loader accessor 零执行、loader 方法快照、未加载 create 拒绝、加载中销毁、迟到 lease 连续两次释放失败和第三次精确重试成功；create 回调重入与 dispose 重入均被明确拒绝。
- 干净代码提交 `705972b39ab987c7209f6278b5061fb192a9219b` 的门禁通过：660/660 Node、176/176 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case；生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `710.300291 ms`、堆增长 `2898024 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `55824.625542 ms`、堆增长 `6665672 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-705972b39ab9-product`，Web/微信/抖音 delivery 为 `3683459 / 3718502 / 3718477 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `708.03 kB`（gzip `182.26 kB`），继续列入 G6 拆包与运行成本审计，不以降低分辨率、抗锯齿、动作或关节规避。
- Codex 内置 Chromium 的单标签隔离环境完成 Product 首屏、正式角色对局与攻击点击复验：正式角色和装备正常显示，攻击后角色手臂进入挥击姿态，持续只有一个对局 Canvas 且没有可见 alert。两个并行标签访问同一 origin 时第二个标签被 Profile lease 正确拒绝，改用单标签隔离 origin 后正常启动；该记录不冒充 390×844 设备模拟，更不冒充 iPhone 13 Pro/iOS 26 Chrome 真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离起手与仅有效范围命中、攻击/击退、动作与武器差异、移动/跳跃、画质、分辨率、抗锯齿、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批进入命中特效、World/HUD/Renderer 与 Presentation Session 的分层迁移，并在会话层复核标签关闭、租约释放和清理失败重试的完整所有权链。

## G5.12 命中特效对象池迁移与可重试 Three 资源释放证据

- `GreyboxEventEffects` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并由包公开入口提供，World Stage 不再引用上层 JavaScript 实现；旧 JavaScript 真值删除，精确允许清单由 369 降至 368，Three 包治理源文件由 16 增至 17。Hit、Knockback、DownSmash、淘汰、重生与拾取仍复用同一个有界对象池，锤/盾/链/空手的颜色、尺寸、条纹和持续时间保持原值。
- options、事件数组、事件 type/id/action/目标字段与位置回调结果在任何池状态或 Three 对象变化前完整规范化；稀疏数组、访问器、非法位置、异步伪装和无效 ID 会在提交前拒绝，getter 不执行。一次 consume 内按 participant ID 缓存不可变位置，避免同批事件重复调用位置解析器；外部回调即使捕获并吞掉重入异常，外层操作仍检测并拒绝，且不留下半个激活特效。
- 激活/更新/清空的内部 Three mutation 异常会终止整个对象池并尝试回收，不继续发布半更新视觉。每个预热 effect 持有独立 `ThreeObjectDisposalLease`；首次材质释放失败后池保留原 effect 所有权，后续 `dispose()` 只重试未完成资源，成功资源不重复释放，终态重复销毁幂等。构造中途失败也会回收此前已预热的 effect 并同时保留原错误与清理原因。
- 干净代码提交 `aae3db59dc6e371fbe91c8fbb46276f1aea4d1a5` 的门禁通过：660/660 Node、178/178 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case；生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `619.28875 ms`、堆增长 `2670088 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `55472.673791 ms`、堆增长 `6562344 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-aae3db59dc6e-product`，Web/微信/抖音 delivery 为 `3686809 / 3722883 / 3722858 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `711.38 kB`（gzip `182.98 kB`），继续列入 G6 拆包与运行成本审计。
- Codex 内置 Chromium 单标签环境完成 Product 首屏、正式角色对局与连续攻击 smoke，持续只有一个对局 Canvas 且没有可见 alert。0.22～0.34 秒特效没有被非确定截图稳定捕获，因此本批不声称浏览器截图证明每个爆闪分支；对象池激活、锤击分支、生命周期和释放重试由 deterministic Three 集成测试精确证明。该记录不是手机设备模拟或 iPhone 13 Pro/iOS 26 Chrome 真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、攻击起手/命中/击退、动作与武器差异、摄像机 hit-stop、移动/跳跃、画质、分辨率、抗锯齿、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批治理 `ArenaWorldStage` 的输入快照、Camera/Registry/Effect 组合、加载与销毁重试所有权，再进入 HUD、Renderer、Audio 与 Session。

## G5.13 Camera 模型迁移与 World Stage 依赖前置治理证据

- 全地图正交 Camera、大地图本地跟随 Camera 与 surface bounds 纯计算已迁入 strict `@number-strategy-jump/arena-presentation-three`，World Stage 和基础测试只从包公开入口消费。旧 JavaScript 真值删除，精确允许清单由 368 降至 367，Three 包治理源文件由 17 增至 18；World Stage 不再反向引用上层 Camera 源码，为下一批整体迁移消除了依赖倒置。
- Camera 默认值统一收口为只读 `ARENA_CAMERA_DEFAULTS`：全地图 padding 2、最小纵向跨度 16、跟随镜头竖屏/横屏跨度 14/12、竖屏阈值 0.82、镜头高度/纵深偏移 16/16、目标高度 0、near/far 0.1/80。默认数值、X 镜像和世界 X/Z 输入基向量均保持原值，不存在第二套手抄配置。
- Camera options、viewport、world bounds、target 与 surface 几何改为数据字段快照；访问器不会执行，未知 option/viewport 几何字段、稀疏 surface 数组、非有限值、非正面积 bounds 和非正跨度在模型发布前拒绝。Renderer 标准 viewport 的 `pixelRatio` 与 `safeArea` 被登记为已知兼容字段但不参与 Camera 计算；返回的 bounds、frustum、position、target、视觉变换和输入基向量均冻结。
- 新增 2 项 strict Camera 边界测试，覆盖 getter 零执行、未知字段、跨 surface bounds、相同输入确定性、全地图容纳宽度、跟随目标和深冻结；原 World Stage/Renderer 13 项回归、基础 Camera 跨宽高比输入方向回归与治理精确计数均通过。
- 干净代码提交 `6ad663647cb39fb0e5085f4f00117087c7f22b82` 的门禁通过：660/660 Node、180/180 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，未产生 reproduction case；生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `727.063875 ms`、堆增长 `2645328 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `77535.068875 ms`、堆增长 `6657736 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；完整 Product soak 耗时继续作为性能观察项，不以降低分辨率、抗锯齿、动作或关节规避。
- clean build ID 为 `arena-6ad663647cb3-product`，Web/微信/抖音 delivery 为 `3688716 / 3724810 / 3724785 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `713.29 kB`（gzip `183.52 kB`），继续列入 G6 拆包与运行成本审计。
- 单一桌面 Chromium 页面完成 Product 首屏、正式 1v1、大地图本地跟随和远距离攻击输入冒烟；Canvas 数量为 1、可见 alert 为 0，镜头保持本地角色可读且地图可超出屏幕，对手约 18 米时攻击按钮仍可触发输入。该记录不是 390×844 仿真，也不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离起手与仅有效范围命中、攻击/命中/击退、动作与武器差异、hit-stop、移动/跳跃、画质、分辨率、抗锯齿、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批迁移并加固 `ArenaWorldStage` 本体的输入快照、加载、同步失败关闭与销毁重试所有权，再进入 HUD、Renderer、Audio 与 Session。

## G5.14 World Stage 迁移、失败关闭与异步资源所有权证据

- `ArenaWorldStage` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并由包公开入口提供，Renderer 不再引用上层 JavaScript 实现。旧 JavaScript 真值删除，精确允许清单由 367 降至 366，Three 包治理源文件由 18 增至 19；Arena V1 内容改为在应用组合点显式注入，Three 包没有反向依赖产品内容。
- Camera 跟随、灯光、阴影、深渊、最大帧增量、镜头震动/缩放和四类 hit-stop 参数统一收口为只读 `ARENA_WORLD_STAGE_DEFAULTS`。原值全部保持；`update()` 将同一个限制到 `0..0.1 s` 的有限 delta 传给平台、角色、装备、效果和 Camera，避免无效或超大帧间隔在下游重复产生错误运算，不通过降低分辨率、抗锯齿、动作或关节换取流畅度。
- content、Registry、map/actions、frame、participant position、event sequence 与 sync options 在表现提交前检查数据字段、未知字段、稀疏数组和有限值。可恢复边界输入在任何 Three mutation 前拒绝并允许同 Stage 重试；Registry 已发生部分同步后再失败则 Stage fail closed，统一回收所有表现资源，不发布半更新画面。
- `load()` 只接受原生 Promise、并发调用复用同一个操作；销毁后迟到完成保持终态，内部 GLTF Factory 的清理所有权保留到加载结算。构造回滚、运行失败和正常销毁分别聚合原错误与清理原因；每个 Registry、Factory、深渊 lease 和 Scene 维护独立完成位，释放失败后只重试未完成资源，成功资源不重复释放，重复销毁幂等。诊断快照失败被隔离为本地 `unavailable`，不阻断对局或发起网络遥测。
- 新增 6 项 strict World Stage 边界/生命周期测试，覆盖 getter 零执行、提交前拒绝、下游部分同步失败关闭、加载去重与迟到完成、内部 GLTF lease 三次精确重试、Factory 构造失败回滚和材质释放失败后仅重试未完成资源。干净代码提交 `042d29582fbe7e5c6d7bc41a153f603968328e7c` 的门禁通过：660/660 Node、186/186 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `36998.678542 ms`，未产生 reproduction case；生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `656.705333 ms`、堆增长 `2651152 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `62623.267625 ms`、堆增长 `6791200 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；相邻批次耗时会受本机负载影响，G6 仍以目标设备 trace 识别近距离攻击卡顿的实际热点。
- clean build ID 为 `arena-042d29582fbe-product`，Web/微信/抖音 delivery 为 `3698792 / 3736032 / 3736007 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `723.37 kB`（gzip `186.00 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与运行成本审计。
- 单一桌面 Chromium 页面完成 Product 首屏、正式 1v1、Camera 跟随和攻击区点击冒烟；Canvas 数量为 1、可见 alert 为 0，攻击输入后对局继续运行。该记录不是手机 viewport 模拟，也不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据；近距离连续攻击卡顿、机身发热、动作灵活度与武器动作差异仍需用户手机验收和后续目标设备性能证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离起手与仅有效范围命中、攻击/命中/击退数值、动作与武器差异、移动/跳跃、画质、分辨率、抗锯齿、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批迁移并加固 HUD 与 Renderer 的事件消费、Context loss、监听器和 Stage 失败重试所有权，再进入 Audio 与 Presentation Session；G5 未完成，当前不可合并。

## G5.15 唯一触控布局与 HUD 迁移、宿主绘制失败关闭证据

- `DEFAULT_ARENA_CONTROL_LAYOUT`、按钮/摇杆半径、触控命中与归一化位移已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-presentation-runtime`；`RawControlState` 与 HUD 共同消费一个公开真值，攻击/跳跃按钮画面位置和真实输入命中不再存在两套手抄参数。布局 override、viewport 与 point 只接受已知数据字段，访问器不执行，结果不可变；原布局数值和触控优先级保持不变。
- `ArenaHudLayer` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并由包公开入口提供，Renderer 不再引用上层 HUD JavaScript。两份旧 JavaScript 真值删除，精确允许清单由 366 降至 364，Three 包治理源文件由 19 增至 20；Three 包仍不依赖 DOM、权威 Core、产品 Session 或上层应用内容。
- HUD 只快照绘制所需的 source、phase、生命、动作可用态、结果和角色位置；viewport/safe area、state、frame、participant、point 与宿主 Canvas 方法在表现提交前验证。Canvas 2D 方法在构造时固定引用，宿主运行时替换不会改变已获取能力；相同签名继续跳过纹理重绘，最大 HUD 纹理边保持 `1536`，没有降低像素比、抗锯齿或角色画质。
- Canvas 绘制异常、异步伪装返回或宿主回调重入会使 HUD fail closed；即使宿主吞掉自己的重入错误，外层仍检测并终止。Quad 的 texture/material/geometry 使用可重试 Three lease，Scene 单独记录清理完成位；释放失败后只重试未完成资源，成功资源不重复释放，重复销毁幂等。结束态“再来一局”按输入 Canvas 与 HUD viewport 比例映射，不依赖固定设备分辨率。
- 新增 5 项 strict runtime/HUD 边界与生命周期测试，覆盖布局 getter 零执行、统一攻击命中、HUD 提交前拒绝、远距/生命/结束态绘制、缩放后的再来一局命中、宿主绘制失败、宿主吞掉重入错误和材质释放精确重试。干净代码提交 `c3ebc1bcbc8165feadb741c3e9204be8d5350c42` 的门禁通过：660/660 Node、191/191 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 按三套 mapper 各 40 场，共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `33248.388209 ms`，未产生 reproduction case；生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `561.593917 ms`、堆增长 `2674504 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `48733.538625 ms`、堆增长 `6527224 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-c3ebc1bcbc81-product`，Web/微信/抖音 delivery 为 `3707678 / 3745646 / 3745621 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `732.25 kB`（gzip `188.01 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与运行成本审计。
- 单一桌面 Chromium 页面完成 Product 首屏、正式 1v1、准备/对决 HUD、权威生命、远距方向提示和攻击区点击冒烟；对手显示约 `16m` 时攻击键仍为红色可用并可点击，Canvas 数量为 1、可见 alert 为 0。结束态再来一局的精确缩放命中由 strict 集成测试证明；该页面记录不是 iPhone 13 Pro/iOS 26/Chrome 真机证据，近距离连续攻击卡顿与发热仍需目标设备 trace。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离起手与仅有效范围命中、攻击/命中/击退数值、动作与武器差异、移动/跳跃、画质、分辨率、抗锯齿、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批迁移并加固 Renderer 的 Context loss、Stage/HUD/Audio 清理重试和失败终态，再迁移 Audio 与 Presentation Session；G5 未完成，当前不可合并。

## G5.16 打击音频池迁移、可选宿主失败隔离与精确释放证据

- `ArenaImpactAudio` 已迁入宿主无关 strict `@number-strategy-jump/arena-presentation-runtime`，Renderer 不再反向引用上层音频 JavaScript；旧真值删除，精确允许清单由 364 降至 363。音频层只消费 Renderer 已去重的权威表现事件，不参与攻击、命中、击退或胜负裁决。
- 四类正式音源、音量与声部上下限统一收口为只读 `ARENA_IMPACT_AUDIO_SOURCE_BY_ACTION`、`ARENA_IMPACT_AUDIO_VOLUME_BY_ACTION` 和 `ARENA_IMPACT_AUDIO_DEFAULTS`：基础推击 `0.72`、锤击 `0.95`、链击 `0.78`、盾击 `0.88`，默认每动作 2 个声部、允许 1～4、自定义动作兜底音量 `0.8`。原音源、音量、轮转顺序与有声开关语义保持不变。
- options、音源表、play options 与宿主 voice 方法改为数据字段/固定方法快照；访问器不执行，未知字段、非资产内路径、异步伪装的同步 load/stop/destroy 会被拒绝或隔离。voice 创建、属性写入、预载和播放失败只使对应可选音效不可用，不阻断 Renderer 与对局；播放 Promise 拒绝被就地消费，宿主吞掉回调重入错误时仅禁用音频层。
- 每个 voice 独立记录停止、移除音源和宿主 destroy 完成位；初始化中途失败但首次清理失败的 voice 进入 cleanup backlog，不丢失引用。`dispose()` 会尝试全部资源并聚合未完成原因，后续只重试失败步骤；成功 destroy 视为终态，重复销毁幂等。
- 新增 4 项 strict 音频边界/生命周期测试，覆盖 options getter 零执行、运行时方法替换无效、初始化失败后的 cleanup backlog、停止/移除音源成功而 destroy 首次失败的精确重试，以及宿主吞掉播放重入后的音频单层禁用。干净代码提交 `caf66bb70786a322134a68e32a66f20c5a32e98b` 的门禁通过：660/660 Node、195/195 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `65099.944792 ms`，未产生 reproduction case；本批耗时上升与相同操作计数并存，按本机调度波动记录，不据此声称代码性能回退或改善。生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `1395.636958 ms`、堆增长 `2908296 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `61219.259667 ms`、堆增长 `6653744 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；目标设备性能仍以 G6 真机 trace 为准。
- clean build ID 为 `arena-caf66bb70786-product`，Web/微信/抖音 delivery 为 `3712183 / 3750705 / 3750680 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `736.76 kB`（gzip `189.02 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与运行成本审计。
- 单一桌面 Chromium 页面完成 Product 首屏、正式 1v1 和攻击区点击后的音频组合路径冒烟，Canvas 数量为 1、可见 alert 为 0，播放能力未阻断渲染。浏览器自动化没有可靠扬声器听感证据，因此本批不声称音量、音色或延迟已由页面自动验收；这些仍需 iPhone 13 Pro/iOS 26/Chrome 人工听感与近距离连续攻击验收。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离起手与仅有效范围命中、攻击/命中/击退数值、动作与武器差异、hit-stop、移动/跳跃、画质、分辨率、抗锯齿、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批整体迁移并加固 Renderer 的 Stage/HUD/Audio 所有权、Context loss、加载迟到完成、渲染重入和清理重试终态；G5 未完成，当前不可合并。

## G5.17 Renderer 迁移、显式内容组合与失败关闭证据

- `ArenaGreyboxRenderer` 已迁入 strict `@number-strategy-jump/arena-presentation-three` 并由包公开入口提供；旧 JavaScript 真值删除，精确允许清单由 363 降至 362，Three 包治理源文件由 20 增至 21。Renderer 不再反向导入上层产品内容，`content` 必须由组合根显式注入：开发会话注入 `ARENA_V1_GREYBOX_CONTENT`，正式 Product 注入 `ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT`；通用 `ProductRenderer` 不再隐式创建内容归属不明的 gameplay Renderer。
- Renderer options、render options、viewport、反馈事件、Canvas/Platform/WebGL 方法在接管或提交前按边界快照；未知字段与访问器不会在资源创建前执行。浏览器与小游戏 Canvas 的原生 IDL 属性只在宿主所有权建立后读取，仍保留真实 2×像素比输入 viewport；没有降低 pixel ratio、MSAA、阴影、动作、关节或反馈质量。
- Stage、HUD、Audio、WebGL renderer 与 context loss 分别持有清理完成位。加载中销毁会立即失效 generation，并由 Stage 保留迟到资产 lease；迟到完成后只补齐未完成资源。实际释放失败进入 `dispose-incomplete`，下一次 `dispose()` 只重试失败资源，不重复释放已成功的 Stage/HUD/Audio/context；构造中途失败执行两轮有界回滚并同时保留初始化原因与清理原因。
- render/resize/context restore 内部错误会失败关闭并回收整个表现所有权图，不继续暴露半可用 Renderer。外部 WebGL、overlay、振动回调即使捕获并吞掉嵌套调用异常，外层仍识别重入并终止；Context loss 在宿主 `preventDefault()` 异常时仍进入暂停态。可选振动/音频的一般宿主失败保持局部隔离，不参与权威判定。
- 新增 4 项 Renderer 边界/生命周期回归，覆盖隐式内容和 getter 零执行、渲染提交失败关闭、Renderer dispose 首次失败后的精确重试，以及宿主吞掉振动回调重入；原加载迟到终态与 Context loss 竞态继续通过。干净代码提交 `4a3479abd578886e4561f753be48139f4e8afeab` 的门禁通过：664/664 Node、195/195 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `33709.627084 ms`，未产生 reproduction case；生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `571.328167 ms`、堆增长 `2690576 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `45748.225875 ms`、堆增长 `6727696 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-4a3479abd578-product`，Web/微信/抖音 delivery 为 `3718785 / 3758237 / 3758212 B`，三端 `sourceDirty=false`、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `743.36 kB`（gzip `190.52 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与运行成本审计。
- 单一隔离 origin 的桌面 Chromium 页面完成 Product 首屏、正式 1v1 和攻击区点击冒烟；对局 Canvas 为 1、像素比为 2、可见 alert 为 0，攻击键为红色可用，点击后页面仍保持单 Canvas，控制台无 warning/error。同 origin 旧标签触发 Profile lease 拒绝符合单 owner 合同；该验证通过隔离 origin 重建干净环境，没有删除或篡改浏览器存储。此记录不是 iPhone 13 Pro/iOS 26/Chrome 真机证据，近距离连续攻击卡顿、发热、音频听感和动作灵活度仍需目标设备验收。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离起手与仅有效范围命中、攻击/命中/击退数值、动作与武器差异、hit-stop、移动/跳跃、画质、分辨率、抗锯齿、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。下一批迁移并加固 Presentation Session 的帧、输入、Renderer、Match、Profile 与宿主监听完整所有权链；G5 未完成，当前不可合并。

## G5.18a Product 表现协议与观测型内存快照前置收敛证据

- 产品 UI 意图、输入路由模式、Presentation Flow/Session 生命周期状态从上层 JavaScript 真值迁入 strict `@number-strategy-jump/arena-presentation-contracts`。这些协议属于表现边界，不进入 `arena-product-contracts`；比赛结果与权威 provenance 仍留在产品核心合同，架构门禁已验证两者没有反向依赖。
- `ProductUiIntent` 只接受固定字段和登记 ID，角色选择必须且只能携带 `characterDefinitionId`；所有输入先隔离复制并冻结，未知字段、Symbol、访问器、非普通对象和矛盾 payload 在 UI、Flow 或 Session 状态变化前拒绝。快速点击去重 key 继续由规范化后的同一意图生成，原运行语义未改变。
- 观测型内存快照迁入宿主无关 strict `@number-strategy-jump/arena-presentation-runtime`。不可用计数保持 `null` 而非伪造为零，资源诊断先深复制冻结再合并内存值；访问器和 schema 漂移不执行、不进入本地性能证据。该能力不拥有 Probe、Renderer 或 Session 生命周期，也不新增网络遥测。
- 两个旧 JavaScript 真值删除，所有生产、压力与测试消费者改用包公开 API，精确允许清单由 362 降至 360。新增 4 项 strict 边界测试，覆盖不可变状态词表、意图字段关系、getter 零执行、未知字段、非法内存值和资源快照访问器；strict package/治理测试由 195 增至 199。
- 代码提交 `843af81fa8c77e7f895d50b6e0a13d19aafd6ab1` 的门禁通过：664/664 Node、199/199 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `43124.67225 ms`，未产生 reproduction case；正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `652.088417 ms`、堆增长 `2694928 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `59896.147792 ms`、堆增长 `6613072 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-843af81fa8c7-product`，Web/微信/抖音 delivery 为 `3718909 / 3758362 / 3758337 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产 Web 构建继续仅交付 `index.html`，开发页面未进入生产产物。
- 本批是 Product Presentation Session 分层迁移的协议前置，不把现存约千行 Session JavaScript 伪报为已经治理完成，也不改变 Gameplay V2 配置 hash `8c322912`、任意距离攻击挥空、命中范围/速度/击退、动作与武器差异、hit-stop、移动/跳跃、画质、角色关节、权威 tick、Replay/Profile schema 或正式资产。下一批先把 Product Input/Flow 的可复用宿主无关实现迁入 strict 表现包，再迁移 Session 所有权根；G5 仍未完成，当前不可合并。

## G5.18b Product 输入路由、意图串行化与能力边界加固证据

- 新增 strict `@number-strategy-jump/arena-product-presentation`，依赖精确限定为底层合同、Presentation Contracts/Runtime 与 Product State；架构门禁禁止该包依赖 Three.js、DOM、平台、Renderer、MatchCore、Bot、墙钟、宿主定时器或网络。首批迁入 `ProductInputRouter` 与非 Controller 所有者的 `ProductSessionIntentDispatcher`，生产 Flow、Session 组合和测试统一从包入口消费。
- UI/Gameplay 触控统一使用迁入 `arena-presentation-runtime` 的 point/viewport/整数/有限数边界；所有旧输入模块共享同一数据字段校验，不再保留上层 `input-validation.js`。未知字段、Symbol、访问器、非法 pointerId/viewport、非 boolean 同步回执和 thenable 伪装会在 Router 状态提交前拒绝。
- InputSampler 与 ProductSessionController 的方法在构造时沿原型链快照为数据方法，运行中替换不会改变已取得能力；无效 Sampler 候选会释放可取得的清理能力。Router 以单操作锁阻断 pointer、sample、mode、resize、前后台、替换与销毁重入；即使恶意宿主捕获并吞掉嵌套异常，外层也检测重入、释放 Sampler 并失败关闭，不继续暴露输入半状态。
- UI 指针只有 start/end 命中同一规范化意图 key 才提交；同一快速意图共享 pending Promise，不同并发意图明确拒绝。Dispatcher 不销毁 Controller，迟到完成只清理自身 pending 引用；Controller snapshot 的 state/activeState 必须是自有数据字段，访问器不执行。
- 三个旧 JavaScript 真值删除，精确允许清单由 360 降至 357。新增 5 项 strict 包测试和 1 项 Node 架构测试，覆盖 UI→Gameplay 主流程、options/方法 getter 零执行、运行期方法替换隔离、吞异常重入失败关闭、快速点击去重和非所有者销毁；完整 Node 测试由 664 增至 665，strict package/治理测试由 199 增至 204。
- 代码提交 `110ba8e970ed437d639146f06d8fd810dc1a65ad` 的门禁通过：665/665 Node、204/204 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `33545.80125 ms`，未产生 reproduction case；生产依赖审计为 0 vulnerabilities，正式资产结果保持 `82a8b378`。
- Presentation Session soak 完成 100 场、耗时 `504.648166 ms`、堆增长 `2674200 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `49339.899792 ms`、堆增长 `6680760 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-110ba8e970ed-product`，Web/微信/抖音 delivery 为 `3723722 / 3763285 / 3763260 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；Web 主业务 chunk 为 `748.30 kB`（gzip `192.23 kB`），增长来自本批严格能力适配与运行时检查，仍在预算内并继续列入 G6 拆包/目标设备 trace，而不是通过降低画质、动作或关节规避。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离攻击挥空、命中范围/速度/击退、动作与武器差异、hit-stop、移动/跳跃、画质、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批按依赖顺序迁移 Product 表现 Definition/Registry/Message/ViewModel 与单局表现桥，再迁移 Flow 和 Session；G5 仍未完成，当前不可合并。

## G5.18c Product 表现 Definition、Registry 与消息目录迁移证据

- Product 内容表现 Definition/Registry、屏幕 Definition/Registry 与本地消息目录已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-product-presentation`；Arena V1 内容组合与 ViewModel 只通过包公开 API 消费，不再引用旧源码相对路径。五个旧 JavaScript 真值删除，精确允许清单由 357 降至 352。
- 内容种类、屏幕种类、产品状态、UI intent、schema 与 JSON 输出均有显式只读类型；Definition 在构造时复制、校验并冻结，继续以稳定数据哈希绑定内容。消息模板只接受登记占位符及字符串/有限数参数，未知参数、缺失参数、坏括号、非有限数和访问器均在格式化前拒绝。
- 两类 Registry 在建立索引前拒绝空数组、空槽、访问器、Symbol/额外数组字段、重复 ID、重复内容或重复 active state；内部索引不向调用者暴露。原可接受任意“鸭子类型”对象的断言已收紧为包内真实只读 Registry 实例，避免可变伪实现或方法替换进入 ViewModel。
- strict 包新增 3 项不可变数据边界测试，覆盖稳定冻结/hash、私有 Registry、空槽/访问器零执行、伪 Registry 拒绝、模板有限数和消息 getter 零执行；包内 Product 表现测试共 8 项。架构门禁要求 strict 包至少保有 8 个受审计源码，并同步把上层剩余 Product 表现源码下限收缩为 5，防止迁移清单与真实文件数漂移。
- 代码提交 `88b1ab8930f20e3c77ce4996bc7239125a7c75ce` 的门禁通过：665/665 Node、207/207 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `46238.09375 ms`，未产生 reproduction case。
- Presentation Session soak 完成 100 场、耗时 `528.944875 ms`、堆增长 `2676344 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `47401.824417 ms`、堆增长 `6641768 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-88b1ab8930f2-product`，Web/微信/抖音 delivery 为 `3723319 / 3763113 / 3763088 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `747.89 kB`（gzip `192.35 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与目标设备 trace。
- 本批是无生命周期的纯数据层迁移，没有新增浏览器或手机交互结论，也不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据。未改变 Gameplay V2 配置 hash `8c322912`、任意距离攻击挥空、命中范围/速度/击退、动作与武器差异、hit-stop、移动/跳跃、画质、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批迁移严格 ViewModel 与 Arena V1 产品表现静态内容，再迁移 Match bridge、Flow 和 Session；G5 仍未完成，当前不可合并。

## G5.18d Product ViewModel 与 Arena V1 静态表现内容迁移证据

- 只读 `createProductSessionViewModel` 与 Arena V1 屏幕/中文消息/角色内容工厂已迁入 strict `@number-strategy-jump/arena-product-presentation`。上层 Arena V1 文件仅保留从统一角色表现内容注入 preview asset ID 的薄适配，不再维护屏幕、消息或角色选择内容副本；旧 ViewModel JavaScript 删除，精确允许清单由 352 降至 351。
- ViewModel 对 Product snapshot、公开 Match Result、RewardGrant、Profile 可见字段、Screen/Content Registry 和 MessageCatalog 建立显式只读输入/输出类型；只投影公开对手、内容 hash、玩家结果、奖励、解锁、错误和 UI intent，不读取 Bot 难度、未来状态、MatchCore 或 Renderer。状态、结果与奖励继续由既有公开合同复验后才进入 UI。
- 原函数参数解构会在边界校验前执行 options getter；迁移后先验证普通对象、自有数据字段、Symbol/未知字段与内容 schema，再读取能力。预览资产映射必须精确覆盖两个 Arena V1 角色，未知字段、缺失/空 asset ID 和 getter 在 Registry 构造前拒绝；返回内容与 ViewModel 均冻结。
- strict 包新增 2 项测试，覆盖 Arena V1 精确预览映射、未知角色字段和 ViewModel options getter 零执行；包内 Product 表现测试共 10 项。架构依赖白名单新增且仅新增 `arena-definitions`、`arena-product-contracts` 与 `arena-progression` 三个已治理的底层/公开合同包，继续禁止 Product Composition/Session、MatchCore、Bot、Three.js、DOM、平台、墙钟、定时器和网络。
- 代码提交 `c86939efd97d2676ef1d8492eece896fe2e25242` 的门禁通过：665/665 Node、209/209 strict package/治理、103/103 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `32127.627916999998 ms`，未产生 reproduction case。
- Presentation Session soak 完成 100 场、耗时 `492.99779200000006 ms`、堆增长 `2676640 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `46377.694958 ms`、堆增长 `6698816 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-c86939efd97d-product`，Web/微信/抖音 delivery 为 `3724433 / 3764234 / 3764209 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `749.01 kB`（gzip `192.63 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与目标设备 trace。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离攻击挥空、命中范围/速度/击退、动作与武器差异、hit-stop、移动/跳跃、画质、角色关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批迁移 Product Match 表现桥，再迁移 Flow 与 Session 所有权根；G5 仍未完成，当前不可合并。

## G5.18e Product Match 单局表现桥迁移证据

- `ProductMatchPresentationRuntime` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-product-presentation`，生产 Flow 与测试统一从包公开 API 消费；旧真值删除，精确允许清单由 351 降至 350。Arena frame projector 和 Gameplay V2 表现内容仍由上层组合点显式注入，strict 包没有反向依赖具体 Renderer、Three.js、DOM、平台或 Arena V1 应用内容。
- 单局桥只借用 ProductSessionController 与 InputSource 窄端口，自有且只自有有界事件窗；控制器、输入、投影器和内容能力均在构造时校验/快照，同步返回值拒绝 thenable 伪装。start/step 在公开比赛信息、权威快照、参与者 affordance、Product 状态、Match result 和表现 frame 全部复验后才提交本地状态，宿主回调重入即使被吞掉也会失败关闭。
- 销毁路径先解除非所有权端口、投影器、内容、最后帧和结果引用，再清理自有事件窗；事件窗首次销毁失败只保留该资源供精确重试，不错误销毁 Controller/InputSource，也不把大对象挂在失败 Runtime 上。无效构造候选会调用可取得的 destroy 能力；debug snapshot 只读取自有数据描述符，不执行 frame/source 访问器。
- strict 包新增 2 项恶意边界测试，覆盖 options/Controller 方法 getter 零执行和被 Controller 吞掉的 Runtime 重入；包内 Product 表现测试增至 12 项，Product Presentation 集成 18 项与架构 27 项通过。代码提交 `7ae7f0defc70cc3b9fcb4a4e968bcee8a8aab50f` 的完整门禁通过：665/665 Node、211/211 strict package/治理、103/103 生命周期；生产依赖审计为 0 vulnerabilities。
- 黄金 Replay manifest 保持 `0dace228`。增强输入 fuzz 共 360 场、360 个唯一 final hash、18 次 Replay 复验，耗时 `114990.237458 ms`，未产生 reproduction case；正式资产预算结果保持 `82a8b378`。Presentation Session soak 完成 100 场、耗时 `1715.302583 ms`、堆增长 `2679544 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `64021.03125 ms`、堆增长 `6971616 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-7ae7f0defc70-product`，Web/微信/抖音 delivery 为 `3726849 / 3766948 / 3766923 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `751.42 kB`（gzip `193.35 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与目标设备 trace。
- 仓库仍没有项目负责人批准的外部 Formal Asset Intake Bundle 与独立证据目录，所以本批只重算并通过正式资产结构/字节预算，不把缺参数时正确拒绝的 Intake CLI 或现有 CC0 来源记录冒充最终资产批准。未新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也未改变 Gameplay V2 配置 hash `8c322912`、任意距离攻击挥空、攻击/击退/动作/武器/移动/跳跃/画质/关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批迁移 Product Presentation Flow，再迁移 Session 所有权根；G5 仍未完成，当前不可合并。

## G5.18f Product Presentation Flow 迁移证据

- `ProductPresentationFlow` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-product-presentation`，生产 Session Composition 与测试统一从包公开 API 消费；旧真值删除，精确允许清单由 350 降至 349。Arena V1 UI 内容、Gameplay V2 表现内容和具体 frame projector 仍由上层组合点显式注入，strict Flow 不依赖 Renderer、Three.js、DOM、平台、MatchCore、Bot、墙钟、帧调度或应用内容实现。
- Flow 在构造时一次性快照 Controller、InputSource、Dispatcher、Match Runtime 和 projector 能力；options、内容边界和候选方法拒绝访问器、未知字段与异步伪装。同步、step、heartbeat、hide/show、snapshot、dispatch 和 destroy 使用统一操作锁；宿主回调即使吞掉嵌套异常，外层仍会失败关闭。UI intent 继续按规范 key 去重，普通业务拒绝不污染 Flow，基础设施分派错误才关闭运行时。
- 自动创建单局表现、权威结果交叉复验、奖励提交、保存失败精确重试、fatal/lease expiry 清理和回到 ready 的现有状态流保持不变。每次同步只读取并复用一份已复验 Product snapshot，Match Runtime 状态白名单预构建为只读集合，不再在每个表现 tick 重复读取 Controller snapshot 或分配状态数组。
- Flow 只拥有 IntentDispatcher 与当前 MatchPresentationRuntime，不销毁 ProductSessionController/InputSource。无效 Dispatcher/Runtime 候选会在 getter 零执行前提下清理；销毁时先释放内容、投影器、工厂、帧和结果引用，再分别处理两项自有资源，任一失败只保留对应资源供精确重试，迟到 intent 完成在 destroy request 后返回 `null`，不能重新发布状态。
- strict 包新增 5 项 Flow 边界测试，覆盖 options/Controller getter 零执行、无效 Dispatcher/Runtime 候选清理、吞异常重入、方法替换隔离和异步 lease 端口失败关闭；包内 Product 表现测试增至 17 项，Product/Session 定向集成 30 项与架构 27 项通过。代码提交 `a217da9148879628f1d365c62015220d723dccad` 的完整门禁通过：665/665 Node、216/216 strict package/治理、103/103 生命周期；生产依赖审计为 0 vulnerabilities。
- 黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `41114.362417000004 ms`，未产生 reproduction case；正式资产预算结果保持 `82a8b378`。Presentation Session soak 完成 100 场、耗时 `1539.687834 ms`、堆增长 `2925816 B`；最终代码的完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `72848.787 ms`、堆增长 `6837744 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-a217da914887-product`，Web/微信/抖音 delivery 为 `3732839 / 3773893 / 3773868 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `757.41 kB`（gzip `194.78 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与目标设备 trace，不能通过降低分辨率、抗锯齿、动作或关节规避。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离攻击挥空、攻击/击退/动作/武器/移动/跳跃/画质/关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批迁移 Product Presentation Session 所有权根及其组合边界；G5 仍未完成，当前不可合并。

## G5.18g Product Presentation Session 所有权根迁移证据

- `ProductPresentationSession` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-product-presentation`；生产入口、小游戏 Canvas 集成、生命周期测试与 Product soak 统一通过应用组合工厂创建包内 Session。旧约千行 JavaScript 真值删除，精确允许清单由 349 降至 348。具体 Arena 内容、输入实现、Renderer、Probe、平台与 Product Controller 仍由上层 composition 显式注入，strict 包没有反向依赖 Three.js、DOM、平台实现、MatchCore、Bot、墙钟、宿主定时器或网络。
- Session composition 只接受固定自有数据字段，拒绝 Symbol、未知字段、访问器、非法标量、缺失方法与同步端口 thenable；Platform、Canvas、Renderer、Controller、Flow、Input、Accumulator、FrameLoop、RenderPacer 与 Probe 方法在取得时快照。Flow snapshot、heartbeat、累加器批次、帧时间、RenderPacer 回执和性能资源都在发布前复验，错误不能把半初始化资源发布为可运行 Session。
- Session 明确拥有 Canvas 监听、Renderer、Controller、Flow、InputRouter/Adapter、FrameLoop 与 Probe；无效工厂候选保留可安全取得的 cleanup，失败清理只保留对应资源供下一次 destroy 精确重试。异步 Renderer/Flow 启动在 destroy 后的迟到完成不能重新发布状态；Canvas 直到监听和 Renderer 均释放后才解除。Probe 仍是本地观测能力，错误不会拥有 Product 权威生命周期。
- 帧处理继续使用固定 tick accumulator，hide/show、WebGL context loss、外部暂停与 Profile lease 心跳保持原语义。公开方法在 frame 内重入会拒绝；即使 Renderer 捕获并吞掉重入异常，外层仍检测并失败关闭、停止帧循环和回收全部资源。该加固没有新增每 tick 的 Controller 重复读取，也没有引入网络遥测或自适应降画质分支。
- 新增 2 项 strict Session 边界测试与 1 项 Node 生命周期测试，覆盖 composition/platform getter 零执行、未知字段、启动前幂等销毁和 Renderer 吞掉 frame 重入。代码提交 `a116aa9f516ef116af07b9625853e3c7e2e2a3df` 的完整门禁通过：666/666 Node、218/218 strict package/治理、104/104 生命周期；架构 27/27，生产依赖审计为 0 vulnerabilities。
- 黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `38987.166667 ms`，未产生 reproduction case；正式资产预算结果保持 `82a8b378`。Presentation Session soak 完成 100 场、耗时 `882.5181670000001 ms`、堆增长 `2914000 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `70443.453042 ms`、堆增长 `6929096 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-a116aa9f516e-product`，Web/微信/抖音 delivery 为 `3747176 / 3788791 / 3788766 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `771.75 kB`（gzip `196.47 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包与目标设备 trace，不能通过降低分辨率、抗锯齿、动作或关节规避。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离攻击挥空、攻击/击退/动作/武器/移动/跳跃/画质/关节、Bot、权威 tick、Replay/Profile schema 或正式资产。G5 的核心 Product 表现所有权根已迁移，但上层仍有输入、Canvas、具体内容投影、性能/验收证据和旧 Stage 6 表现文件需要逐项迁移或证明退役；因此 G5 仍未完成，当前不可合并。

## G5.19 生产输入语义映射迁移与挥空攻击不变量证据

- 三套生产 `InputMapper`、统一 mapper contract、工厂和手势方向枚举已迁入 strict `@number-strategy-jump/arena-presentation-runtime`；生产组合、Pilot、fuzz 与测试统一从包公开 API 消费。五个旧 JavaScript 真值删除，精确允许清单由 348 降至 343；上层 `GestureRecognizer` 只复用包内方向真值，不再维护重复枚举。
- mapper ID、方向、原始控制、手势、动作可用性与语义输出均有显式只读类型。context、raw control、vector、edge、gesture 和 affordance 只读取自有数据字段，拒绝 Symbol、未知字段、访问器、非法方向、非有限/超单位向量、矛盾结束边沿和 tick/participantId 漂移；回调只取得冻结快照，映射输出再次精确校验并冻结。
- `explicit-combat-jump-v1` 的攻击意图只取决于独立攻击按钮边沿与按住状态，不读取敌人、距离或命中可用性；因此空场和任意距离都能起手挥空，攻击与跳跃可同 tick 独立成立。命中目标、范围、击退和伤害仍由权威 Rule/Core 在 active window 裁决，表现层没有取得写权限。
- 新增 3 项 strict 边界测试，覆盖空场攻击、context/affordance getter 零执行、未知字段、不可变语义结果和单位向量上限；输入定向 19 项及 30/60/120Hz 外层调度确定性通过。代码提交 `a5c00567267a6f6cbfba255e39f32a7125fc8bda` 的完整门禁通过：666/666 Node、221/221 strict package/治理、104/104 生命周期；生产依赖审计为 0 vulnerabilities。
- 黄金 Replay manifest 保持 `0dace228`。输入 fuzz 共 120 场、120 个唯一 final hash、6 次 Replay 复验，耗时 `41896.052792 ms`，未产生 reproduction case；正式资产预算结果保持 `82a8b378`。Presentation Session soak 完成 100 场、耗时 `692.025292 ms`、堆增长 `2479112 B`；完整 Product Presentation Session soak 完成 100 场、100 个唯一 authority hash、耗时 `53157.837417 ms`、堆增长 `6981000 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-a5c00567267a-product`，Web/微信/抖音 delivery 为 `3750606 / 3792237 / 3792212 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `775.18 kB`（gzip `197.82 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续列入 G6 拆包和目标设备 trace，不通过降低画质、分辨率、动作或关节规避。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、攻击/命中/击退数值、动作与武器差异、hit-stop、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批按热路径所有权迁移 `RawControlState`、`GestureRecognizer` 与 `InputSampler`，统一校验和快照责任并审计每 tick 分配，再迁移 Pointer/Canvas 适配；G5 仍未完成，当前不可合并。

## G5.20 原始触控、手势与固定 tick 采样热路径迁移证据

- `RawControlState`、`GestureRecognizer` 与 `InputSampler` 已迁入 strict `@number-strategy-jump/arena-presentation-runtime`，生产 Session 组合、fuzz 和全部输入测试统一从包公开 API 消费。三个旧 JavaScript 真值删除，精确允许清单由 343 降至 340；Raw → Gesture → Mapper → Sampler 现在属于同一宿主无关包，不依赖 Renderer、Three.js、DOM、平台、墙钟、Bot 或 MatchCore。
- Raw options、viewport、layout 与 pointer 均在取得所有权前按数据字段复验；每个 pointer/control 只允许一个 owner，同帧 start/end 边沿继续保留到唯一一次 consume。resize、suspend、resume 会原子清除旧 pointer 所有权。摇杆半径从旧实现每个快照对三个 control 重复计算三次，收敛为构造/resize 时计算一次并缓存，所有布局参数与数值保持原值。
- Gesture 继续用临时 session map 完整计算三个 control，只有全部输入有效才提交 tick/session；坏访问器、非法 pointer、矛盾边沿、暂停态活跃输入、重复 start 和 tick 间隙均在提交前拒绝。Sampler 在构造时快照 mapper id/map，options 与 sample options 拒绝访问器/未知字段；构造后期失败会回滚已建 Raw owner，采样内部失败进入终止态。
- 包内 Raw、Gesture、Affordance 与 mapped semantic 快照使用模块私有 WeakSet 标识真实冻结对象；正常生产链复用已验证对象，不重复深复制/字段遍历，外部构造或伪造对象无法获得标识，仍走完整严格校验。Mapper 回调尝试重入 sample、pointer、resize、生命周期或调试读取时，即使自行捕获并吞掉异常，外层 Sampler 仍检测并失败关闭，不能在采样中途改写触控状态。
- 新增 3 项 strict 边界测试，覆盖 Raw options getter/未知字段、Sampler options/mapper getter 零执行与吞异常重入失败关闭；完整门禁通过：666/666 Node、224/224 strict package/治理、104/104 生命周期，生产依赖审计为 0 vulnerabilities。黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`。
- 相同 fuzz workload 的操作计数与 frame 计数逐项保持一致，120 场仍产生 120 个唯一 final hash、6 次 Replay 复验且无 reproduction case；耗时由 G5.19 的 `41896.052792 ms` 降为 `30449.535958999997 ms`，约减少 27.3%。这是同机脚本热路径证据，不推断 iPhone 温度或电量。Presentation Session soak 100 场耗时 `519.052042 ms`、堆增长 `2647432 B`；Product Presentation Session soak 100 场、100 个唯一 authority hash，耗时 `46029.242542 ms`、堆增长 `6895504 B`，均低于 8 MiB且无帧/监听/输入残留。
- clean build ID 为 `arena-dc9534e3c7fe-product`，Web/微信/抖音 delivery 为 `3752902 / 3794781 / 3794756 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `777.48 kB`（gzip `198.45 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），仍进入 G6 拆包与目标设备 trace。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退数值、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批迁移 Pointer Adapter 与 Input Router，再治理 Canvas 输入/绘制边界；G5 仍未完成，当前不可合并。

## G5.21 Pointer 宿主输入适配迁移与生命周期加固证据

- `PointerInputAdapter` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-presentation-runtime`；Product Session、旧 Stage 6 Session 组合与输入测试统一从包公开 API 消费，旧 JavaScript 真值删除，精确允许清单由 340 降至 339。适配器只连接已注入的平台绑定、viewport provider 与 `InputSampler`，不依赖 DOM、Three.js、Renderer、MatchCore、Bot、墙钟或网络。
- options 只接受固定自有数据字段，拒绝 Symbol、未知字段和访问器；平台及 Sampler 方法在构造时按数据方法快照，后续替换不能改变已接管能力。所有绑定、viewport、输入回调、错误观察与 cleanup 必须同步完成；Promise、访问器 thenable 和自定义数据 thenable 都在零执行其 `then` 的前提下拒绝，不能把异步迟到结果带入同步输入生命周期。
- start/stop/destroy 具有显式状态与销毁请求。构造或部分绑定失败按逆序回滚；cleanup 失败保留原函数，只在下一次 stop/destroy 精确重试，并在清理完成前阻断再次启动。启动期间发生 start/stop 重入时，即使宿主捕获并吞掉内部异常，外层仍检测并回滚；启动/停止期间的 destroy 记忆请求，清理完成后发布终态。停止后迟到输入回调返回 `false`，不再触达 Sampler。
- 新增 3 项 strict 边界测试，覆盖 options getter 零执行、方法替换隔离、吞异常 start 重入回滚，以及伪 thenable 零执行拒绝。代码提交 `99fdc9087789f974604c607afa4de2487303fc10` 的完整门禁通过：666/666 Node、227/227 strict package/治理、104/104 生命周期；生产依赖审计为 0 vulnerabilities。黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，操作计数和 frame 计数与前批逐项一致，耗时 `32671.907833 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `530.679333 ms`、堆增长 `2633072 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `54119.842875 ms`、堆增长 `7117784 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。
- clean build ID 为 `arena-99fdc9087789-product`，Web/微信/抖音 delivery 为 `3754862 / 3796821 / 3796796 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `779.44 kB`（gzip `198.77 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续进入 G6 拆包与目标设备 trace。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退数值、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。旧 Stage 6 `ArenaInputRouter` 不在 Product 生产组合中，`KeyboardInputAdapter` 只被测试使用，二者留到 G7 退役审计；G5 下一批治理具体内容投影、Canvas 绘制与本地性能观测边界，当前仍不可合并。

## G5.22 Product UI 场景投影迁移与冻结快照缓存证据

- `createProductUiSceneModel` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-product-presentation`；Canvas UI、Web UI 场景映射、小游戏组合与测试统一从包公开 API 消费，旧 JavaScript 真值删除，精确允许清单由 339 降至 338。原架构门禁同步改为检查 strict package 与仅存应用薄适配，不再用旧 `src/arena/presentation/product` 文件数量冒充产品表现合同覆盖。
- 投影入口先复制并冻结完整公开 ViewModel 数据，拒绝访问器、Symbol、稀疏数组、循环引用、函数、非有限数、非法标量、重复角色和多选状态；输出的 SceneModel、动作、角色卡、选中角色与首个解锁视图均不可变。该层只做公开 UI 数据投影，不持有 Controller、Match、Profile、Renderer、Three.js、DOM、平台、墙钟或网络。
- 新增模块私有可信 ViewModel 标记：只有包内 `createProductSessionViewModel` 完整构造并冻结的对象可进入 WeakMap 缓存；外部对象即使只冻结顶层也不能伪造信任，避免其嵌套字段后续变化造成陈旧 UI。相同可信 ViewModel 的 Canvas render/hit-test 复用同一 SceneModel，不再重复深复制和卡片数组分配；缓存键为弱引用，不延长 ViewModel 生命周期。
- 新增 1 项 strict 边界测试，覆盖冻结 SceneModel、可信对象缓存和恶意 getter 零执行；Canvas/小游戏/Web 场景 6 项定向集成通过。代码提交 `85060cc024f72e1f527eff9533bcb4300f770881` 的完整门禁通过：666/666 Node、228/228 strict package/治理、104/104 生命周期；生产依赖审计为 0 vulnerabilities。黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，操作计数和 frame 计数逐项保持一致，耗时 `31455.992167 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `526.6838339999999 ms`、堆增长 `2643392 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `47367.064875000004 ms`、堆增长 `7029776 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零。相对 G5.21 的 Product soak 改善只作为同机脚本信号，不推断手机温度、电量或真实帧率。
- clean build ID 为 `arena-85060cc024f7-product`，Web/微信/抖音 delivery 为 `3757367 / 3799333 / 3799308 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `781.94 kB`（gzip `199.34 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续进入 G6 拆包与目标设备 trace。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退数值、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批治理 Product Canvas layout/painter/surface 的平台能力、热路径分配、构造回滚与清理重试，再迁具体 Arena 内容投影；G5 仍未完成，当前不可合并。

## G5.23 Product Canvas 布局与命中几何迁移证据

- `createProductCanvasLayout` 与 `pointInProductCanvasRect` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-product-presentation`；Canvas Surface、小游戏组合和测试统一从包公开 API 消费，旧 JavaScript 真值删除，精确允许清单由 338 降至 337。布局只依赖可信不可变 SceneModel 与数据型 viewport，不依赖 Canvas context、Three.js、DOM、平台 API、Controller、Match、墙钟或网络。
- SceneModel 通过模块私有 WeakSet 证明由 strict 场景投影生成；外部伪造模型先完整复制冻结并校验，无法用顶层冻结绕过数据边界。viewport 与 safeArea 拒绝访问器、Symbol、稀疏数组、循环引用和非有限数；标准手机安全区内的主/次动作与角色卡保持稳定布局，禁用动作不进入 hits，单独 secondary 仍保持 secondary 语义。
- 命中几何对 point/rect 使用自有数据 descriptor 读取，访问器零执行；非有限坐标、缺字段和负尺寸直接返回 `false`。正常触控热路径不再创建闭包、临时 point/target 对象或 `Object.values` 数组，避免为边界加固反向引入每次 hit-test 分配。极窄安全区的按钮宽度至少为 1，不产生负矩形。
- 新增 1 项 strict 边界测试，覆盖安全区、边界点、非有限点、viewport/point getter 零执行；Canvas/小游戏 4 项定向集成通过。代码提交 `9e652379e9fbbb74587a9928e59f4303debf4245` 的完整门禁通过：666/666 Node、229/229 strict package/治理、104/104 生命周期；生产依赖审计为 0 vulnerabilities。黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，操作计数和 frame 计数逐项保持一致，耗时 `31692.541333 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `511.738667 ms`、堆增长 `2646008 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `47421.876917 ms`、堆增长 `6717032 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；脚本耗时不外推为手机帧率或发热结论。
- clean build ID 为 `arena-9e652379e9fb-product`，Web/微信/抖音 delivery 为 `3757426 / 3800257 / 3800232 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`；生产产物边界检查通过。Web 主业务 chunk 为 `782.00 kB`（gzip `199.37 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续进入 G6 拆包与目标设备 trace。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退数值、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批迁移 Canvas Painter 的宿主无关绘制命令与 Surface 的 Three/平台资源生命周期，二者仍需分层；G5 未完成，当前不可合并。

## G5.24 Product Canvas 绘制规则迁移与确定性证据

- `paintProductCanvasScene` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-product-presentation`，旧 JavaScript 真值删除，精确允许清单由 337 降至 336。Painter 只消费 `ProductUiSceneModel`、`ProductCanvasLayout`、viewport 与结构化 2D 绘制端口，不依赖 Three.js、DOM、平台 API、Controller、Match、墙钟、网络，也不拥有 Canvas、Texture 或 Scene 生命周期。
- 绘制颜色、字体、人物轮廓、场景分支、按钮样式、位置和缩放数值原样迁移；Canvas Surface 统一从 strict 包公开入口消费。能力探测与方法快照没有塞入每次绘制调用：Painter 的调用方必须提供已验证端口，下一批由拥有真实宿主资源的 Surface 在构造期完成验证、回滚和清理，这避免热路径重复反射宿主对象。
- 新增 1 项 strict 边界测试，以同一冻结 SceneModel/Layout 连续绘制两次并比较完整命令序列，同时验证标题、动作文本、输入 JSON 与冻结状态不变。Canvas/小游戏 4 项定向集成通过。代码提交 `56978d5febd362f4e83e227c8a684853bfd54bf9` 的完整门禁通过：666/666 Node、230/230 strict package/治理、104/104 生命周期；生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `32207.200333 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `524.191667 ms`、堆增长 `2651432 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `48434.779124999994 ms`、堆增长 `6888696 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；这些脚本指标不外推为手机帧率、功耗或发热结论。
- clean build ID 为 `arena-56978d5febd3-product`，Web/微信/抖音 delivery 为 `3757426 / 3800257 / 3800232 B`，与 G5.23 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。Web 主业务 chunk 为 `782.00 kB`（gzip `199.37 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续进入 G6 拆包与目标设备 trace。
- 本批没有新增浏览器或手机交互结论，不冒充 iPhone 13 Pro/iOS 26/Chrome 真机证据，也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退数值、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。下一批迁移并加固 Canvas Surface 的平台能力快照、Three/Canvas 资源回滚、显式生命周期、命中映射和清理重试；G5 未完成，当前不可合并。

## G5.25 Product Canvas/Three Surface 迁移与资源生命周期证据

- `ProductCanvasUiSurface` 已从上层 JavaScript 迁入新的 strict `@number-strategy-jump/arena-product-presentation-three`，旧真值删除，精确允许清单由 336 降至 335。该窄包只依赖宿主无关 Product 表现、通用 Three 资源治理和 Three.js；通用 `arena-presentation-three` 仍禁止反向依赖 Product，治理门现在分别锁定通用包 21 个源文件与 Product-Three 包 2 个源文件及其精确依赖白名单。
- options、平台 `createOffscreenCanvas`、Canvas `getContext`、完整 2D 方法与 Renderer `render` 均按数据方法快照；访问器零执行，宿主返回 Promise/thenable 会在不调用自定义 `then` 的前提下拒绝。viewport、safeArea、input viewport、point 与 intent binding 只读取固定自有数据字段；无效 resize 在任何 Canvas 写入前拒绝，命中只复用同一 SceneModel 的布局，避免仅凭 revision/scene 误复用陈旧几何。
- 旧实现每次 render 都 `JSON.stringify` 完整 SceneModel、safeArea、卡片和动作来构造 signature；现以包内可信 ViewModel 的弱缓存 SceneModel 身份加 viewport revision 判定重绘。Canvas 方法只在构造期反射一次，debug snapshot 使用缓存纹理尺寸，不读取宿主 getter。DPR 仍限制在既有 `0.5..2`，纹理最长边仍为 `2048`，没有降低分辨率、抗锯齿、动作或关节。
- Three Scene/Camera/Quad、CanvasTexture、材质和几何由 Surface 单一拥有；构造失败回收局部资源，绘制/resize 失败关闭。Canvas 或 Renderer 回调即使吞掉重入异常，外层仍检测；Three 清理通过资源租约逐项记录完成状态，部分失败进入 `dispose-incomplete`，下一次只重试未完成资源，完成后 dispose 幂等。借用的 WebGLRenderer 不被 Surface 销毁。
- 新增 4 项 strict 故障测试，覆盖 options/平台方法 getter 零执行、Canvas 方法替换隔离、坏 resize 原子拒绝、吞异常绘制重入失败关闭和 Three 材质清理精确重试；原 Canvas/小游戏 4 项、架构 27 项与新包治理门通过。代码提交 `3eb426a85af5ed14572cbe97af13562fe4112fb8` 的完整门禁通过：666/666 Node、234/234 strict package/治理、104/104 生命周期；生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `31491.013625 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `590.226083 ms`、堆增长 `2635744 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `56669.105791999995 ms`、堆增长 `6958728 B`。两者均低于 8 MiB且无帧/监听/输入残留；Product soak 使用测试 Renderer，其单次耗时波动不能证明 Canvas Surface 的手机性能或温度变化。
- clean build ID 为 `arena-3eb426a85af5-product`。Web delivery 保持 `3757426 B`；微信/抖音为 `3807156 / 3807131 B`，较 G5.24 各增加约 `6.9 kB` 且仍通过 4 MiB 预算，三端 `sourceDirty=false`、默认入口均为 Product、`freezeEligible=true`，生产产物边界检查通过。Web 主业务 chunk 仍为 `782.00 kB`（gzip `199.37 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`）。
- 本批是小游戏 Canvas Surface 边界变更，Web 默认入口使用 DOM Surface，因此没有伪造浏览器视觉结论；也不冒充 iPhone 13 Pro/iOS 26/Chrome、微信或抖音真机证据。Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退数值、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 和正式资产均未改变。下一批迁移具体 Arena 表现内容与 frame projector；G5 未完成，当前不可合并。

## G5.26 Arena V1 表现内容与只读帧投影迁移证据

- 具体地图、17 个动作、3 类装备、程序化兜底角色、正式 KayKit 角色/附件及 `projectArenaPresentationFrame` 已迁入新的 strict `@number-strategy-jump/arena-v1-presentation-content`；789 行旧表现实现被 strict 源码取代，应用层仅保留从权威 Action/Equipment/Map Definition 组合两套内容的薄桥。旧角色内容、灰盒内容和 projector JavaScript 真值删除，精确允许清单由 335 降至 332。
- 新包精确依赖 `arena-contracts`、`arena-definitions`、`arena-match`、`arena-presentation-contracts` 与 `arena-presentation-runtime`，禁止依赖 Core、Bot、Product、Session、Three、Renderer、Platform、DOM、墙钟或随机源；自动化架构门锁定该方向。`ACTION_RESOLUTION_KIND` 的稳定公共词汇提升到最底层 contracts，Core 兼容重导出，frame projector 不再为读取 `selected` 依赖 Core 或写魔法字符串。完整决策见 [ADR-031](../decisions/031-arena-v1-presentation-content-and-frame-projection.md)。
- 权威 ActionDefinition、EquipmentDefinition 和 MapDefinition 由应用组合显式注入，表现包不复制命中范围、攻击速度、僵直、击退、移动或胜负规则。8 个战斗动作的 `timing` 经测试逐项直接投影权威 Definition；动作视觉阶段、武器起手/主动/收手缩放与角色方向/移动表现阈值集中在导出的不可变配置。重锤、锁链、盾、徒手及其空中动作保持不同语义、clip、阶段和倍率，二段跳、蹲跳与下砸均有独立动作语义。
- projector 删除隐式灰盒默认，所有调用方必须显式提供内容；它只读取公开快照和公开比赛信息，检查 seed、participant 身份唯一性、地图面完整性、布尔值、有限向量、动作 affordance tick 与内容引用，完整复制冻结 action、movement、equipment、事件和结果。访问器事件零执行，坏快照在输出前失败关闭；表现层仍无命中、位移、拾取、淘汰或胜负写入能力。
- 代码提交 `5e677ff4b93090e329b9ab6a151474bf28b81742` 的完整门禁通过：669/669 Node、235/235 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities。输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `40789.987792 ms`，无 reproduction case。
- Presentation Session soak 完成 100 场，耗时 `972.777375 ms`、堆增长 `2631008 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `63531.434791 ms`、堆增长 `7024520 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；后者耗时波动仍只属于同机脚本信号，不推断手机帧率、功耗或温度。
- clean build ID 为 `arena-5e677ff4b930-product`。Web/微信/抖音 delivery 为 `3759889 / 3809564 / 3809539 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。Web 主业务 chunk 为 `784.46 kB`（gzip `200.09 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`）。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、移动/跳跃、权威 tick、Replay/Profile schema、画质、关节、Bot 或正式资产，也没有新增浏览器视觉或 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。下一批迁移本地性能观测/证据边界并继续审计具体 Three 表现适配；G5 未完成，当前不可合并。

## G5.27 本地性能观察器迁移与原子记录证据

- `PresentationPerformanceProbe` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-presentation-runtime`；Product Session、旧 Stage 6 Session 组合和相关测试统一从包公开 API 消费，旧 JavaScript 真值删除，精确允许清单由 332 降至 331。观察器只记录注入的帧时间、tick backlog、质量级别、资源快照与本地时间戳，不依赖 `performance` 全局、DOM、Three.js、Renderer、MatchCore、Bot、墙钟、随机源、网络或遥测服务，也不能写入权威状态。
- options 与 frame 仅接受固定自有数据字段，访问器在零执行其 getter 的前提下拒绝。一次 `recordFrame` 会先完整复制、校验和冻结输入，再读取注入时间并更新计数；任何字段非法时，时间戳、序号、汇总、慢帧和资源采样均不发生部分提交，修正后重试仍从原状态继续。资源快照直接基于已复制的完整 frame 数据校验，不再对同一资源诊断做第二次深复制。
- 生命周期仍保持显式 `start/stop/destroy`，销毁后拒绝重新启动；资源采样序号在计算前检查安全整数边界。架构门对宿主计时的检查收窄为真实的 `performance.`/`performance[...]` 能力访问，不再把文件名中的 `performance` 文本误报为宿主依赖，同时继续禁止运行时代码读取该全局。
- 新增 2 项 strict 边界测试，覆盖 options/frame getter 零执行、坏 frame 全字段原子拒绝及修正重试时间戳。代码提交 `b2dc16930e2cda788cda72c9ba19a1654ca75b0e` 的完整门禁通过：669/669 Node、237/237 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `38173.805291 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `519.344584 ms`、堆增长 `2296680 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `63255.992458 ms`、堆增长 `6986280 B`。两者均低于 8 MiB且无帧、生命周期监听、Canvas 监听或输入绑定残留；这些同机脚本数据不推断手机帧率、功耗或温度。
- clean build ID 为 `arena-b2dc16930e2c-product`。Web/微信/抖音 delivery 为 `3761253 / 3810903 / 3810878 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。Web JavaScript 为 `1417643 B`；微信/抖音 JavaScript 均为 `1482807 B`。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，也没有新增浏览器视觉或 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。下一批迁移上层性能与验收证据的数据合同及报告边界，再继续审计具体 Three 表现适配；G5 未完成，当前不可合并。

## G5.28a 证据标量与设备验收 Definition 分层证据

- 跨 Gate 标量合同已从 `src/arena/evidence` 迁入 strict `@number-strategy-jump/arena-evidence-contracts`；设备平台/执行表面/附件词汇、不可变 Definition 及 Stage 6/8 固定目录迁入 strict `@number-strategy-jump/arena-device-acceptance`。所有 CLI、Release、Experiment、Regression、Study、Asset、Acceptance、Performance 和测试消费者改为通过包公开 API 引用，4 个旧 JavaScript 真值删除，精确允许清单由 331 降至 327。
- `arena-evidence-contracts` 与 `arena-device-acceptance` 的依赖均被架构门锁定为仅 `arena-contracts`，不得读取 Node、Three.js、Presentation、Performance、Product、Release、平台、墙钟、随机或网络。Stage 9 Device Definition 仍由上层 Performance Policy 目标派生，下一批按“设备基础合同 → 性能合同 → Stage 9 组合”迁移，避免低层设备包反向依赖性能实现。完整决策见更新后的 [ADR-028](../decisions/028-arena-shared-evidence-value-contract.md) 与 [ADR-032](../decisions/032-arena-device-acceptance-package-boundary.md)。
- Definition 在发布前复制、校验并冻结全部数据；访问器零执行，Symbol、循环引用、非有限数、重复 target/check、悬空 check、空附件集合与非法枚举失败关闭。Stage 6 的 5 个 target/9 个 check、Stage 8 的 6 个 target/14 个 check、系统约束和 content hash 继续由既有 Node 测试与新增 strict 包测试双重保护。
- 代码提交 `c523d7a00e78a0342e1f2bbe1ef65e12fbb8888d` 的完整门禁通过：671/671 Node、241/241 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `45960.932541999995 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `935.5872499999999 ms`、堆增长 `2633832 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `69247.25654199999 ms`、堆增长 `7026784 B`。两者均低于 8 MiB且无帧、生命周期监听、Canvas 监听或输入绑定残留；这些同机脚本数据不推断手机帧率、功耗或温度。
- clean build ID 为 `arena-c523d7a00e78-product`。Web/微信/抖音 delivery 为 `3761253 / 3810903 / 3810878 B`，JavaScript 为 `1417643 / 1482807 / 1482807 B`，与 G5.27 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。这证明证据合同未进入生产游戏 bundle。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，也没有新增浏览器视觉或 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。下一批迁移设备 Record/Bundle/Build Manifest 与性能数据合同，再在无环上层组合 Stage 9；G5 未完成，当前不可合并。

## G5.28b 设备 Record、Bundle 与 Build Manifest 迁移证据

- 设备 `Record`、`Bundle`、派生 `Report` 与三端 `ArenaBuildManifest` 已迁入 strict `@number-strategy-jump/arena-device-acceptance`，CLI、构建脚本、Release producer、Web build identity、性能证据和测试全部改用包公开 API。3 个旧 JavaScript 真值删除，精确允许清单由 327 降至 324；`src/arena/presentation/acceptance` 现在只剩 Stage 9 性能组合目录与目录选择器。
- 包依赖保持单向：`arena-device-acceptance` 只依赖 `arena-contracts` 和 `arena-evidence-contracts`。Record 在发布前绑定 Definition/hash、commit/build、target、系统、客户端、全部 required checks 与附件；Bundle 拒绝混合 build、重复 run/record、跨运行复用非 Manifest 附件和同平台 Manifest 漂移；Report 只从已验证记录派生 ready/failed/incomplete，不能接受手写状态。
- Build Manifest 保持三端必需文件、Product 默认入口、规范相对路径、SHA-256、字节数、唯一产物路径和自引用拒绝；构建脚本与 Release producer 仍以同一公开类型重算 identity。所有数组和返回数据冻结，字符串排序使用显式码点比较，不引入区域设置不确定性。
- 代码提交 `e56ab2f992c492de163d96792716e36a9d472b28` 的完整门禁通过：671/671 Node、242/242 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `37330.81775 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `871.993667 ms`、堆增长 `2615352 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `58393.682875 ms`、堆增长 `6988488 B`。两者均低于 8 MiB且无帧、生命周期监听、Canvas 监听或输入绑定残留；脚本耗时不外推为手机帧率、功耗或温度。
- clean build ID 为 `arena-e56ab2f992c4-product`。Web/微信/抖音 delivery 为 `3761253 / 3810903 / 3810878 B`，JavaScript 为 `1417643 / 1482807 / 1482807 B`，继续与 G5.27/G5.28a 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，也没有新增浏览器视觉或 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。下一批建立 strict 性能证据包并迁移 Policy/Record/Metric/Report/Build Budget，再在上层收口 Stage 9 Device/Performance 组合；G5 未完成，当前不可合并。

## G5.29a 构建预算证据包分层证据

- 新建 strict `@number-strategy-jump/arena-performance-evidence`，先迁移 `ArenaBuildBudgetPolicy`、Stage 9 V1 三端预算和 `createArenaBuildBudgetReport`；构建脚本、Release producer、RC handoff 与测试统一从包公开 API 消费，旧 JavaScript 真值删除，精确允许清单由 324 降至 322。预算数值、Policy hash `d7e9250a`、Manifest 绑定、dirty 构建不具冻结资格及五类 gate 语义均保持不变。
- 包只依赖 `arena-contracts` 与 `arena-device-acceptance`。架构门锁定 3 个源码入口并禁止 Node、Three.js、DOM、宿主计时、计时器、随机源、微信/抖音 API 和网络；它只能重算调用方注入的 Manifest，不采集运行时指标，也不持有观察器、Renderer、Session 或权威生命周期。运行时性能观察继续由 `arena-presentation-runtime` 负责，二者边界已同步归真至 ADR-024。
- 代码提交 `8636a9969386204b33dd61860425acec16756b91` 的完整门禁通过：672/672 Node、243/243 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `43648.781458 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `1100.394084 ms`、堆增长 `2459840 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `66911.56625 ms`、堆增长 `6964504 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；脚本耗时不外推为手机帧率、功耗或温度。
- clean build ID 为 `arena-8636a9969386-product`。Web/微信/抖音 delivery 为 `3761253 / 3810903 / 3810878 B`，JavaScript 为 `1417643 / 1482807 / 1482807 B`，与 G5.27/G5.28 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。这证明构建预算证据包没有进入生产游戏 bundle。
- 本批只重构数据合同，没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此不重复浏览器视觉验证；也不新增或冒充 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。下一批迁移性能 Policy/Record/Metric/Report，再收口 Stage 9 性能组合；G5 未完成，当前不可合并。

## G5.29b1 性能 Policy 与原始 Record 迁移证据

- 性能 Policy Definition、低档/主流设备类别、Gate operator、完整 Trace Record 归一化与内容 hash 已迁入 strict `@number-strategy-jump/arena-performance-evidence`；Stage 9 V1 组合、设备/性能 Evidence、Report 与测试统一从包公开 API 消费，2 个旧 JavaScript 真值删除，精确允许清单由 322 降至 320。Metric Registry 与 Report 暂留上层，下一批独立迁移，避免同时改写千行指标算法和 Trace 数据模型。
- Policy/Target/Gate 与 lifecycle/milestone/frame/resource/probe/capture/record 均建立显式只读类型。输入会先复制、校验、排序并冻结；访问器、Symbol、循环、非有限数、重复 target/gate、平台/设备类别重复、Policy/hash/质量身份漂移、非连续帧、资源序号倒退、样本计数不守恒和超上限数据均失败关闭。资源样本从动态键写入改为完整字段构造，没有改变字段顺序、空值语义或 Record hash 规则。
- 新增 2 项 strict 测试，覆盖 Policy/Record 深冻结、稳定内容 hash 和访问器零执行；原设备/性能 19 项定向测试全部通过。代码提交 `3d33b5cc202d8b1f7177932688d66c72e59d198f` 的完整门禁通过：672/672 Node、245/245 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `41272.223333 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `660.920458 ms`、堆增长 `2531208 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `51344.476417 ms`、堆增长 `7013952 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；同机脚本数据不外推为手机帧率、功耗或温度。
- clean build ID 为 `arena-3d33b5cc202d-product`。Web/微信/抖音 delivery 为 `3761253 / 3810903 / 3810878 B`，JavaScript 为 `1417643 / 1482807 / 1482807 B`，继续与 G5.27-G5.29a 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此不重复浏览器视觉验证；也不新增或冒充 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。下一批迁移 Metric Registry 与 Performance Report，再收口 Evidence/Stage 9 组合；G5 未完成，当前不可合并。

## G5.29b2 性能 Metric Registry 与 Report 迁移证据

- 性能 Metric Registry、可注入 Collector 合同与 Performance Report 已迁入 strict `@number-strategy-jump/arena-performance-evidence`；上层 Evidence、Stage 9 组合与测试统一消费包公开 API，2 个旧 JavaScript 真值删除，精确允许清单由 320 降至 318。该证据包现已承接 Build Budget Policy/Report 和 Performance Policy/Record/Metric/Report，仅余宿主观察器注入与 Stage 9 内容组合留在上层。
- Registry 在注册时快照 collector 的 `id` 和 `collect`，拒绝访问器与重复 id，不保留可被调用方篡改的插件对象。Report 输入及 collector 返回值均逐字段校验、复制和冻结，拒绝未知键、访问器、非有限数、无效 metric/gate 和伪造 Registry；指标算法、gate 语义、排序和 report hash 规则保持不变。
- 新增 2 项 strict 测试，覆盖 collector 快照、正常报告与 Registry/Report 访问器零执行。代码提交 `f883c9ff0272b9e949e45c503b5325fa7d595d11` 的完整门禁通过：672/672 Node、247/247 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `33232.519291 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `630.60875 ms`、堆增长 `2434784 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `53055.035667 ms`、堆增长 `6836280 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；同机脚本数据不外推为手机帧率、功耗或温度。
- clean build ID 为 `arena-f883c9ff0272-product`。Web/微信/抖音 delivery 为 `3761253 / 3810903 / 3810878 B`，JavaScript 为 `1417643 / 1482807 / 1482807 B`，继续与 G5.27-G5.29b1 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。
- 本批只收紧证据数据流，没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此不重复浏览器视觉验证；也不新增或冒充 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。下一批收口 Performance Evidence/Stage 9 组合；G5 未完成，当前不可合并。

## G5.29c Stage 9 设备/性能证据内容分层证据

- 新建 strict `@number-strategy-jump/arena-stage9-evidence-content`，迁移 Stage 9 六 target Performance Policy、Device Definition、Device/Performance 组合 Report 和三阶段 Definition Catalog；CLI、文件验证器、Release producer、RC handoff 与测试统一从包公开 API 消费。4 个旧 JavaScript 真值删除，精确允许清单由 318 降至 314，旧 `src/arena/presentation/acceptance`、`performance` 与 `quality` 组合目录已清零并由架构测试锁定。
- 新包只依赖 `arena-contracts`、`arena-device-acceptance`、`arena-performance-evidence` 和 `arena-presentation-runtime`，用表现质量 Definition 固定六个 target 的质量 hash；它不读取 Node、Three.js、宿主 API、墙钟、随机源或网络，也不持有观察器、Renderer 或 Session 生命周期。运行时观察器仍由 `arena-presentation-runtime` 注入，证据内容包只做版本化组合与重算。
- 组合 Report 现在使用属性描述符先校验外层参数，再独立快照原始 Performance Records，访问器、Symbol、未知键和自定义 id 转换会在执行业务工厂前被拒绝；已验证的 Definition/Policy 实例仍可合法复用。新增 3 项 strict 公开 API 测试及 1 项 Node 架构边界测试。
- 代码提交 `50466fe7b81b4c00ddd61ab5f77978341638ec41` 的完整门禁通过：673/673 Node、250/250 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成每个 mapper 120 场、合计 360 场，产生 360 个唯一 final hash 并完成 6 次 Replay 复验，耗时 `95765.769583 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `531.876208 ms`、堆增长 `2650032 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `50479.669542 ms`、堆增长 `7010992 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；同机脚本数据不外推为手机帧率、功耗或温度。
- clean build ID 为 `arena-50466fe7b81b-product`。Web/微信/抖音 delivery 为 `3761253 / 3810903 / 3810878 B`，JavaScript 为 `1417643 / 1482807 / 1482807 B`，继续与 G5.27-G5.29b2 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此不重复浏览器视觉验证。本批也没有生成六个真实 target 的最终 Record，不新增或冒充 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据，S9.4 仍为待采集；G5 未完成，当前不可合并。

## G5.30a ProductRenderer strict 迁移与端口加固证据

- 宿主无关 `ProductRenderer` 已从旧上层 JavaScript 迁入 strict `@number-strategy-jump/arena-product-presentation`，生产入口和测试统一从包公开 API 消费；旧真值删除，精确允许清单由 314 降至 313。架构门只为包内 `./product-renderer.js` 开放明确例外，其他 Renderer、Three、Platform、Entry、Core、Bot 与 MatchCore 依赖仍被禁止，没有扩大表现包的依赖面。
- 构造 options、Canvas 与所有子端口方法在资源接管前按属性描述符和方法数据字段快照；访问器零执行，调用方后续改写子对象方法不能改变已取得能力。传给 Gameplay Renderer 的 UI overlay 是冻结的最小能力包装，不泄露原 Surface 身份。frame、render options 与 profile 标量先复制/校验再渲染，未知异步 thenable 不能伪装成同步 render、resize、viewport、hit-test、intent、context、diagnostic 或 dispose 端口。
- 加载 generation 保持迟到完成取消语义；context loss 与异步 UI load 竞态不会恢复成 ready。构造失败回收已创建候选，常规销毁只清空成功子句柄；失败或异步清理保留精确所有权并进入 `dispose-incomplete`，后续调用只重试未完成资源。新增 3 项 ProductRenderer 回归，覆盖 options getter 零执行、方法快照/异步渲染拒绝、同步查询拒绝 thenable 和异步清理所有权保留。
- 代码提交 `3765202b083b793d33e8b11ffd90a33cac937b95` 的完整门禁通过：676/676 Node、250/250 strict package/治理、104/104 生命周期；最终架构规则另以 31/31 定向测试复验。黄金 Replay manifest 保持 `0dace228`，正式资产预算结果保持 `82a8b378`，生产依赖审计为 0 vulnerabilities。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `31449.187417 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `546.299042 ms`、堆增长 `2646776 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `48941.19675 ms`、堆增长 `6993544 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；同机脚本数据不外推为手机帧率、功耗或温度。
- clean build ID 为 `arena-3765202b083b-product`。Web/微信/抖音 delivery 为 `3765024 / 3814735 / 3814710 B`，JavaScript 为 `1421414 / 1486639 / 1486639 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。相对 G5.29c 的小幅增加来自进入生产 bundle 的端口校验和失败关闭逻辑，没有降低画质或删减动作。
- 本地真实浏览器已验证 `/` 首页、“开始匹配”到 1v1 Canvas 主流程；Canvas buffer 为 `1084×1440`、CSS 为 `542×720`，角色、武器、平台和推击/跳跃控制正常渲染，控制台 0 warning / 0 error。该结果只证明当前桌面浏览器生产组合可用，不替代 Allen 的 iPhone 13 Pro、iOS 26、Chrome 真机验收，也不新增微信/抖音设备证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退数值、动作/武器差异、移动/跳跃、画质、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。G5 仍需治理余下旧 Stage 6 表现适配并完成分类，当前不可合并。

## G5.30b Arena V1 权威内容 strict 分层证据

- 新建 strict `@number-strategy-jump/arena-v1-content`，集中发布具体动作、装备、角色、地图、移动动作、初始装备生成点与平衡 Definition；7 个旧 `src/arena/content` JavaScript 真值删除，生产、实验、回放、研究、表现和测试消费端统一从包公开 API 引用，精确允许清单由 313 降至 306。长期边界见 [ADR-033](../decisions/033-arena-v1-authority-content-boundary.md)。
- 新包依赖仅为 `arena-contracts`、`arena-definitions`、`arena-map`、`arena-match` 与 `arena-movement`，不依赖 MatchCore、Bot、Session、Product、Presentation、Renderer、Three、Platform、Entry、DOM、墙钟或随机源。架构门锁定依赖集合与 8 个源文件；攻击、击退、移动和跳跃数值仍只来自 `ARENA_GAMEPLAY_V2_TUNING`，对局命数只由 `ARENA_V1_BALANCE_DEFINITION` 持有，地图/生成点只由对应内容 Definition 持有，没有在 Product 或 Presentation 复制第二份权威数值。
- `createStage4ContentRegistries` 在创建 Registry 前按精确字段复制并冻结 options，访问器零执行、未知字段和未知装备 ID 失败关闭；Action/Equipment Registry 继续统一校验重复 ID、悬空引用和裁剪后的装备/动作闭包。新增 3 项 strict 包测试，覆盖完整 Catalog、统一攻击数值编译、深冻结与恶意 options；完整门禁为 677/677 Node、253/253 strict package/治理、104/104 生命周期。
- 黄金 Replay manifest 保持 `0dace228`。地图压力完成 100 场、`720100` tick、100 个唯一 final hash 与 3 次 Replay 复验；移动压力完成 100 场、`417355` tick、100 个唯一 final hash、3 次 Replay 复验与 3819 次下劈落地；Bot 压力完成 easy/normal/hard 各 300 场、合计 900 场、900 个唯一 final hash 与 9 次 Replay 复验，能力指数保持 `7.62 < 18.34 < 19.453333333333333`，分配和能力全部门禁通过。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `36735.747041 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `643.036333 ms`、堆增长 `2624560 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `58318.612584 ms`、堆增长 `7028504 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；同机脚本数据不外推为手机帧率、功耗或温度。
- 代码提交为 `bf4653ebcee1301c102b2d398433fd8b1ea3d88a`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。clean build ID 为 `arena-bf4653ebcee1-product`；Web/微信/抖音 delivery 为 `3765291 / 3815002 / 3814977 B`，JavaScript 为 `1421681 / 1486906 / 1486906 B`，三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。
- 本地真实浏览器复验 `/` 首页、“开始匹配”到唯一 1v1 Canvas；Canvas buffer 为 `1084×1440`、CSS 为 `542×720`，页面无异常滚动，控制台仅有 Vite 连接 debug、无 warning/error。该证据只证明本地桌面 Web 组合，不新增或冒充 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。
- 本批改变的是内容所有权和输入边界，没有改变 Gameplay V2 配置 hash、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot 规则、权威 tick、Replay/Profile schema 或正式资产。900 场 Bot 门禁耗时约 28.8 分钟且运行期间无进度心跳，后续应改善长压脚本可观测性，但该运维债务不影响本批正确性结论；G5 仍未完成，当前不可合并。

## G5.30c Arena V1 具体表现内容归包证据

- Gameplay V2/Greybox 具体组合与 Product 角色预览组合已从两个上层 JavaScript 薄桥迁入 strict `@number-strategy-jump/arena-v1-presentation-content`，Session、Entry 与测试统一消费包公开 API；旧 `src/arena/presentation/content` 和 `product` 真值删除，精确允许清单由 306 降至 304。ADR-031 已同步归真，不再保留“迁移期薄 JavaScript Definition 注入桥”的失效结论。
- `arena-v1-presentation-content` 现在显式依赖 `arena-v1-content` 的不可变权威 Definition 和通用 `arena-product-presentation` 的只读 Product 表现合同；通用 Product 表现包不反向依赖具体 V1 内容。架构门精确锁定 6 个源文件和完整依赖集合，只为获准的通用 Product 表现包及包内具体内容导出开放窄例外，Core、Bot、Session、Renderer、Three、Platform、Entry、DOM、墙钟与随机源仍被禁止。
- 新增 2 项 strict 公开 API 测试，证明 Greybox 与 Gameplay V2 地图由对应权威 Map Definition 组合、Product 两个角色预览与同一角色表现 Catalog 的模型资产 ID 一致。完整门禁通过：677/677 Node、255/255 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `33191.0985 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `624.077625 ms`、堆增长 `2624712 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `51088.193374999995 ms`、堆增长 `7067464 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；同机脚本数据不外推为手机帧率、功耗或温度。
- 代码提交为 `ee9f0ecfabb6b093e3045717598663f349bdbce2`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。clean build ID 为 `arena-ee9f0ecfabb6-product`；Web/微信/抖音 delivery 为 `3765291 / 3815002 / 3814977 B`，JavaScript 为 `1421681 / 1486906 / 1486906 B`，与 G5.30b 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。
- 本地真实浏览器验证首页进入“选择角色”，同时展示“跑酷学徒/发条方块”；切换为“发条方块”并确认后可从“开始匹配”进入唯一 1v1 Canvas。Canvas buffer 为 `1084×1440`、CSS 为 `542×720`，页面无异常滚动，控制台 0 warning / 0 error。该结果只证明本地桌面 Web 组合，不新增或冒充 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。
- 本批只收口具体表现所有权，没有改变权威数值、任意距离挥空、命中/击退、动作/武器、移动/跳跃、分辨率、抗锯齿、关节、Bot、Replay/Profile schema 或正式资产字节；G5 仍需治理旧 Stage 6 输入/Session/Pilot 表现适配并完成保留或退役分类，当前不可合并。

## G5.30d 旧 Stage 6 输入适配归类与生命周期加固证据

- 旧 Greybox/Pilot 使用的 `ArenaInputRouter` 与仅开发/测试使用的 `KeyboardInputAdapter` 已从上层 JavaScript 迁入 strict `@number-strategy-jump/arena-presentation-runtime`；旧 Session 组合和测试统一消费包公开 API，两个旧 JavaScript 真值删除，精确允许清单由 304 降至 302。二者明确归类为可维护的开发/证据能力，不进入当前 Product 输入链；Product 继续使用独立的 strict `ProductInputRouter` 和触控采样链。
- Router 在接管前按数据字段复制 options、按对象身份和方法描述符快照 sampler 能力；调用方后续改写方法不能替换已取得能力，同一 sampler 替换直接返回 `false`，避免旧实现先销毁自己再重新持有。resize/suspend 构造失败回滚所有权，旧 sampler 销毁失败后 Router fail closed；sampler、命中测试、重赛回调和调试快照均拒绝异步 thenable 伪装成同步能力。
- Keyboard Adapter 对键位、keydown options 和 EventTarget 方法执行访问器零执行校验；监听注册部分失败会逆序回滚，解绑失败保留精确 cleanup 与绑定终态供第二次重试，迟到事件由失活 token 隔离。新增 4 项 strict 回归，覆盖能力快照/同对象替换、异步边界、option getter 零执行和解绑失败精确重试；完整门禁通过：677/677 Node、259/259 strict package/治理、104/104 生命周期。
- 黄金 Replay manifest 保持 `0dace228`。输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `47009.000833 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `2033.955167 ms`、堆增长 `2804680 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `67788.130166 ms`、堆增长 `7130488 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；本批压力任务并行执行，耗时只记录门禁事实，不与串行历史批次比较，也不外推为手机帧率、功耗或温度。
- 代码提交为 `9e6d7f3c16a1dd7e90da0f7f28618626bbc825cd`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。clean build ID 为 `arena-9e6d7f3c16a1-product`；Web/微信/抖音 delivery 为 `3765400 / 3815275 / 3815250 B`，JavaScript 为 `1421790 / 1487179 / 1487179 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。
- 本地真实浏览器验证首页进入“选择角色”，展示“跑酷学徒/发条方块”，切换并确认“跑酷学徒”后可从“开始匹配”进入唯一 1v1 Canvas。Canvas buffer 为 `1084×1440`、CSS 为 `542×720`，控制台只有 Vite 连接 debug、0 warning / 0 error。该结果只证明本地桌面 Web 组合，不新增或冒充 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。旧输入适配分类已关闭，但 Stage 6 Session/Pilot/灰盒宿主组合仍待逐项治理，因此 G5 仍未完成，当前不可合并。

## G5.30e 表现对局资源原语 strict 迁移与 G5 收口证据

- `createArenaMatchResources` / `destroyArenaMatchCandidate` 已从旧 Stage 6 Session 私有 JavaScript 迁入 strict `@number-strategy-jump/arena-presentation-runtime`；旧 Session 通过公开 API 消费，原 JavaScript 真值删除，精确允许清单由 302 降至 301。资源原语只负责注入式 Match、Mapper、Sampler 与 EventWindow 的取得、校验和回滚，不创建 Platform、Renderer、Three、Bot、墙钟、随机源或网络能力，也不参与命中、位移、胜负和权威 tick。
- 工厂只快照组合对象所需的六个自有数据字段，不执行 getter，也不把合法的上层组合扩展误判为 schema 漂移；matchService、工厂与全部资源方法按描述符快照并拒绝 thenable。Quick Match bundle、公开信息和权威 snapshot 的 matchSeed 必须同为 uint32 且完全一致；公开信息和 snapshot 在交给表现 Session 前深复制冻结。任一后续工厂失败时按 EventWindow → Sampler → Session 逆序回滚，清理失败以 AggregateError 保留全部原因。
- 新增 4 项 strict 回归，覆盖成功取得/依赖逆序清理、宿主方法突变隔离、后续工厂失败回滚、getter 零执行和异步能力拒绝。代码提交为 `983f6f9eda805329d8087d7dd0a3cbc88a16be32`；完整门禁通过：677/677 Node、263/263 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `43928.084124999994 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `1133.855916 ms`、堆增长 `2756688 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `60049.017750000006 ms`、堆增长 `7054088 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；并行任务耗时只记录门禁事实，不与串行历史值比较，也不外推手机性能。
- clean build ID 为 `arena-983f6f9eda80-product`。Web/微信/抖音 delivery 为 `3765400 / 3815275 / 3815250 B`，JavaScript 为 `1421790 / 1487179 / 1487179 B`，与 G5.30d 完全一致；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。Product bundle 内容没有变化，因此不重复浏览器视觉冒烟，也不新增或冒充 iPhone 13 Pro/iOS 26/Chrome、微信、抖音真机证据。
- 边界分类至此冻结：宿主无关表现合同、运行时、反馈、具体内容和 Three Surface 归 G5，G5 完成；`ArenaPresentationSession`、`arena-session-composition`、`product-presentation-session-composition`、Platform 与 Entry 是 G6 应用/宿主根；`InputPilotPresentationRuntime` 及 Pilot/Study 是 G7 测试/研究链。该分类只移动治理责任，不删除 Greybox 回滚或研究能力，也不把它们并入当前 Product 生产链。G6/G7/G8/G9/G10 仍未完成，当前不可合并。

## G6.31 平台运行实例标识 strict 迁移证据

- 新建零依赖 strict `@number-strategy-jump/arena-platform-runtime`，将 Product 与 Web Pilot/Study 共用的运行实例 ID 从 Entry 私有 JavaScript 真值迁入平台运行时公共 API；三个消费入口全部改为包导入，旧文件删除，精确允许清单由 301 降至 300。该包不依赖 Arena 权威、Bot、Session、Presentation、Three.js、DOM 或网络，也不进入确定性 tick、状态 hash 与 Replay。
- 前缀在宿主能力调用前执行非空、长度和安全字符校验；`crypto.randomUUID`、`crypto.getRandomValues`、`Date.now` 与 `performance.now` 仅通过快照后的数据方法调用。getter、Proxy 异常、非法值、异步 thenable 和方法后续改写均不能把半有效身份带入产品；不可用的 `randomUUID` 会继续尝试有界字节熵源，零值宿主时钟保持为合法值，最终回退由墙钟、单调时钟和模块内递增序列共同避免同一 VM 碰撞。
- 迁移后的首次全量 Node 运行暴露两个研究页面仍引用已删除旧路径；该遗漏在提交前由加载阶段失败检出并统一修复。新增 6 项 strict 包测试，覆盖 UUID、小游戏字节熵源、异步降级、零时钟、回退唯一性、命名空间和依赖边界；完整门禁通过：677/677 Node、269/269 strict package/治理、104/104 生命周期。黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `34385.985375 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `564.312834 ms`、堆增长 `2648888 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `50770.901875 ms`、堆增长 `7103144 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；这些本机脚本结果不外推为手机帧率、功耗或温度。
- 代码提交为 `e5836763639744d3eba6c28378bb0bf53742eb62`，clean build ID 为 `arena-e58367636397-product`。Web/微信/抖音 delivery 为 `3766704 / 3816561 / 3816536 B`，JavaScript 为 `1423094 / 1488465 / 1488465 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。相对 G5.30e 的增加来自新 strict 平台边界及其同步失败关闭逻辑，没有降低画质、分辨率、抗锯齿、动作或关节。
- 本地真实浏览器已走通首页、选择“发条方块”、确认选择、开始匹配和唯一 1v1 Canvas；Canvas buffer 为 `1084×1440`、CSS 为 `542×720`，控制台仅有 Vite 连接 debug、无 warning/error。该证据只证明桌面 Web 组合可用，不新增或冒充 Allen 的 iPhone 13 Pro、iOS 26、Chrome 真机验收，也不新增微信/抖音设备证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、Bot、权威 tick、Replay/Profile schema 或正式资产字节。G6 仍需治理 Stage 6/Product Session、Arena V1 应用注入、Platform 与 Entry 的其余宿主根；G7-G10 亦未完成，当前不可合并。

## G6.32 宿主启动兜底与 Web teardown strict 迁移证据

- 小游戏启动失败提示、Web 可访问错误面板和 `pagehide`/HMR teardown 已从三个 Entry 私有 JavaScript 真值迁入零依赖 strict `@number-strategy-jump/arena-platform-runtime`；Web、微信、抖音的 Product/灰盒入口及 Pilot/Study 入口统一消费包 API，旧文件删除，精确允许清单由 300 降至 297。Web teardown 现在显式注入 `stopLaunchedGame`，平台包不反向依赖 Entry 或具体游戏组合。
- 所有宿主方法按描述符快照，访问器方法、Proxy 异常和异步 thenable 不得伪装为同步能力；真实 Promise 拒绝会被消费，不产生未处理拒绝。小游戏 modal 不可用或异步时安全降级 toast；Web 错误面板只保留一个 `role=alert` 实例，以 `textContent` 写入错误详情并在恢复时同时移除面板与 Canvas `aria-hidden`，不使用 HTML 注入。
- Web teardown 在绑定前验证完整 add/remove 能力，HMR 替换先完成旧 listener 清理；绑定后无法持有状态会回滚 listener。remove 失败不丢失 listener/状态所有权，可由同一 cleanup 精确重试；状态槽访问器不执行、外部替换会失败关闭，bfcache `persisted=true` 不终止游戏，宿主生命周期回调中的 stop 异常或异步回执不会逃逸为浏览器未处理错误。
- 新增 7 项 strict 回归，覆盖异步 modal 降级、单一 Web 错误面板、bfcache/HMR、清理失败重试、状态持有回滚、访问器零执行与架构依赖；原 8 项 Entry 集成回归继续通过。完整门禁为 677/677 Node、276/276 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `33073.705333 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `553.573375 ms`、堆增长 `2649224 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `50208.384917 ms`、堆增长 `6989504 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；这些本机脚本结果不外推为手机帧率、功耗或温度。
- 代码提交为 `1bd7be320852268a178f1212beec4ab55f9af547`，clean build ID 为 `arena-1bd7be320852-product`。Web/微信/抖音 delivery 为 `3768864 / 3816937 / 3816912 B`，JavaScript 为 `1425254 / 1488841 / 1488841 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。增加的字节是同步宿主能力验证、失败回滚和清理所有权状态，不涉及画质降级。
- 本地真实浏览器已走通首页、“开始匹配”和唯一 1v1 Canvas；Canvas buffer 为 `1084×1440`、CSS 为 `542×720`，启动错误面板数量为 0，控制台仅有 Vite 连接 debug、无 warning/error。该证据只证明桌面 Web 组合可用，不新增或冒充 Allen 的 iPhone 13 Pro、iOS 26、Chrome 真机验收，也不新增微信/抖音设备证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。`launchGame` 的启动协调和销毁所有权仍是下一 Entry 治理批次；G6-G10 尚未完成，当前不可合并。

## G6.33 游戏启动协调器 strict 迁移证据

- `launchGame` / `stopLaunchedGame` 已从 Entry 私有 JavaScript 迁入零依赖 strict `@number-strategy-jump/arena-platform-runtime`；Web、微信、抖音的 Product/灰盒入口和 Pilot/Study 入口统一消费包 API，旧文件删除，精确允许清单由 297 降至 296。协调器只拥有宿主启动 generation、当前/启动中游戏与待重试清理记录，不依赖具体 Platform、Product、Presentation、Core、Bot、Three.js、DOM、网络或权威时间。
- options 在任何资源取得前按自有数据字段做精确 schema 校验，访问器、Symbol 和未知字段零执行拒绝；游戏 `start`/`destroy` 方法按描述符快照，调用方后续改写方法不影响已取得生命周期能力。调试暴露使用非枚举自有数据字段，既不执行宿主 setter，也不参与启动成功判定。
- 新 generation 会同步失效并销毁旧 current/starting 实例，迟到 start 完成不会重新发布旧游戏且不会重复 destroy。同步 destroy 失败会把同一个实例保留在 `pendingCleanup`、阻断新 Platform/Game 获取并在下一次启动或停止时精确重试；启动失败且清理失败会以 AggregateError 同时保留原因。destroy 内重入不会递归启动，onSuccess/onError 的抛错或 Promise 拒绝不取得生命周期所有权。
- 新协调器可识别旧 JavaScript HMR 状态结构，先接管并清理旧 current/starting 游戏，再以不可替换的版本化协调状态继续；损坏的新状态、访问器状态槽、重复/已销毁 pending 记录和非法 generation 均失败关闭。新增 6 项 strict 启动测试，覆盖输入边界、清理失败重试、方法快照/迟到完成、destroy 重入、访问器状态和旧 HMR 接管；完整门禁为 677/677 Node、282/282 strict package/治理、104/104 生命周期。
- 黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `33613.821291 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `585.77675 ms`、堆增长 `2666592 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `50614.85 ms`、堆增长 `7231440 B`。两者均低于 8 MiB且资源残留为零；这些本机脚本结果不外推手机性能。
- 代码提交为 `a8797d91150b93a5af9b3479eb068db83f8a2599`，clean build ID 为 `arena-a8797d91150b-product`。Web/微信/抖音 delivery 为 `3776066 / 3824145 / 3824120 B`，JavaScript 为 `1432456 / 1496049 / 1496049 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。增加的字节来自显式协调状态、重入隔离、失败清理重试和旧 HMR 接管，不涉及画质或动作削减。
- 本地真实浏览器在整页重载后走通首页、“开始匹配”和唯一 1v1 Canvas；Canvas buffer 为 `1084×1440`、CSS 为 `542×720`，控制台只有两轮 Vite 连接 debug、无 warning/error。该证据只证明桌面 Web 重载与主流程，不新增或冒充 Allen 的 iPhone 13 Pro、iOS 26、Chrome 真机验收，也不新增微信/抖音设备证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。G6 继续迁移 Platform、剩余 Entry、Stage 6/Product Session 和 Arena V1 应用注入；G7-G10 尚未完成，当前不可合并。

## G6.34 Web 平台 strict 迁移与生命周期加固证据

- Web Canvas、WebGL2、RAF、Pointer Input、Resize/Show/Hide、同步存储、资源读取、分享与振动适配已从 `src/platform/web.js` 迁入 strict `@number-strategy-jump/arena-platform-runtime/web`，旧 JavaScript 真值删除，精确允许清单由 296 降至 295。运行时根入口不重导出 Web 实现；微信/抖音 Product 与 Greybox 的 esbuild metafile 门禁均证明没有把 `web-platform.js` 带入小游戏包。平台运行时当前精确依赖只有 `arena-platform-contracts`，仍不依赖 Authority、Bot、Session、Presentation、Three.js 或具体产品组合。
- Pointer bindings 在注册监听前按固定自有数据字段校验，getter、Symbol、未知字段、非函数回调和 Proxy 读取失败不会取得资源；EventTarget、RAF、时钟、存储、分享与振动方法均在使用前快照。必需事件缺失或任何宿主同步 API 返回 thenable 会失败关闭并逆序回滚；Promise 拒绝被消费，不产生未处理拒绝。存储异步误用返回明确失败值，不把未确认写入伪装为成功。
- 输入、resize、show 与 hide 生命周期均以失活 token 阻断清理后的迟到事件。监听或 ResizeObserver 清理失败时保留未完成资源供同一 cleanup 精确重试，已完成项保持幂等；部分注册失败会回滚此前取得的全部监听，并以 AggregateError 同时保留原始错误和清理错误。`onStart` 消费者抛错会回滚 pointer 所有权与 capture，避免同一手指永久卡住。
- 新增 7 项 strict Web 平台故障测试，覆盖输入 getter/未知字段零执行、宿主方法突变隔离、监听清理失败精确重试、迟到 input/resize 隔离、异步注册完整回滚、回调失败后的 pointer 重试及异步存储结果消费；原 Web/架构 60 项继续通过。完整门禁为 677/677 Node、289/289 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `33893.708834000005 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `630.260083 ms`、堆增长 `2661704 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `54927.660834 ms`、堆增长 `7035288 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；这些本机脚本结果不外推为手机帧率、功耗或温度。
- 代码提交为 `330c067c2c5746828374aef23b912d141898ec6b`，clean build ID 为 `arena-330c067c2c57-product`。Web/微信/抖音 delivery 为 `3779538 / 3824145 / 3824120 B`，JavaScript 为 `1435928 / 1496049 / 1496049 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。小游戏字节与 G6.33 完全一致，证明 Web 专属子路径未污染小游戏交付。
- 本地真实浏览器已走通首页、进入角色选择、切换并确认“发条方块”、开始匹配和唯一 1v1 Canvas；Canvas buffer 为 `1084×1440`。整页重载后重新回到可操作首页，启动错误面板为 0，控制台仅有 Vite 连接 debug、无 warning/error。该证据只证明本地桌面 Web 组合与重载生命周期，不新增或冒充 Allen 的 iPhone 13 Pro、iOS 26、Chrome 真机验收，也不新增微信/抖音设备证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。G6 下一步迁移小游戏 Platform 及其微信/抖音薄适配，之后继续治理剩余 Entry、Stage 6/Product Session 与 Arena V1 应用注入；G7-G10 尚未完成，当前不可合并。

## G6.35 小游戏平台 strict 迁移与宿主边界加固证据

- 小游戏 Canvas、触摸输入、视口/安全区、RAF、生命周期、同步存储、本地资产、音频、振动与分享适配已从 `src/platform` 迁入 strict `@number-strategy-jump/arena-platform-runtime`；微信、抖音和通用小游戏实现分别通过 `/wechat`、`/douyin`、`/mini-game` 子路径发布，旧三个 JavaScript 真值删除，精确允许清单由 295 降至 292。四个小游戏 Product/Greybox 入口和平台集成测试均改为消费包 API；平台运行时依赖仍精确限定为 `arena-platform-contracts`，不依赖 Authority、Bot、Session、Presentation、Three.js 或具体产品组合。
- 平台身份、主/离屏 Canvas、宿主能力与必要的 touch on/off 配对在取得所有权前验证；主 Canvas 不再被写入私有平台字段，也不能被宿主重复返回为离屏 Canvas。宿主方法统一快照，调用方后续改写不能改变已接管能力；同步 API 返回 thenable、异步注册、资产路径逃逸、非法安全区、超过 32 个触点、未知输入/分享字段与访问器均失败关闭，Promise 拒绝会被消费。
- 输入部分注册失败会逆序回滚；cleanup 即使有一项失败也继续释放其余资源，全部回调立即失活，失败项保留精确所有权供同一 cleanup 重试。迟到触摸不会再进入 Sampler。视口安全区和分享 payload 复制冻结；文件读取拒绝“同步回调成功但同时返回 thenable”的歧义宿主，GLB 字节在进入加载链前复制为独立 ArrayBuffer；同步存储不会把未确认的异步结果伪装为成功。
- 新增 8 项 strict 小游戏平台故障测试，覆盖身份/Canvas 所有权、安全区与分享快照、访问器零执行、清理失败重试、异步触摸注册回滚、恶意触点上限、存储能力快照及歧义文件读取；平台、入口组合与架构 61 项定向回归通过。完整门禁为 677/677 Node、297/297 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `41133.378249999994 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `762.6523750000001 ms`、堆增长 `2659248 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `52235.562416999994 ms`、堆增长 `6978544 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；这些本机脚本结果不外推为手机帧率、功耗或温度。
- 代码提交为 `b3024c010afa2afc6e43a066fe19867c521b142c`，clean build ID 为 `arena-b3024c010afa-product`。Web/微信/抖音 delivery 为 `3779538 / 3829021 / 3828996 B`，JavaScript 为 `1435928 / 1500925 / 1500925 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。Web 字节与 G6.34 完全一致，小游戏增加约 4.9 kB 来自宿主校验、回滚与安全快照，不涉及降低分辨率、抗锯齿、动作或关节。
- 本批只改变微信/抖音小游戏平台子路径，Web 生产 bundle 内容与 G6.34 完全一致，因此不重复桌面浏览器视觉冒烟。当前没有新增微信/抖音模拟器、真机或 Allen 的 iPhone 13 Pro、iOS 26、Chrome 验收记录；自动化与 clean build 不能替代这些外部设备证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、分辨率、抗锯齿、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。三端 Platform 迁移已关闭；G6 下一步治理 Stage 6/Product Session、Arena V1 应用注入与其余 Entry 宿主根，G7-G10 尚未完成，当前不可合并。

## G6.36 Arena V1 应用组合根 strict 迁移与注入边界加固证据

- 新建 strict `@number-strategy-jump/arena-v1-composition`，集中承接 Arena V1 权威内容装配、内容选择、RuleEngine/MapSystem/MatchCore 工厂、移动候选与效果处理、Quick Match 适配和 Product Session 组合；9 个旧 JavaScript 真值删除，生产、实验、回放、研究、表现、脚本与测试统一消费包公开 API，精确允许清单由 292 降至 283。长期边界见 [ADR-034](../decisions/034-arena-v1-application-composition-boundary.md)。
- 新包依赖集合与 10 个源文件由架构门精确锁定；只允许已治理的合同、Definition、V1 内容、Match/Map/Movement、Bot/Matchmaking、Quick Match 与 Product 组合包，禁止 Presentation、Renderer、Three、Platform、Entry、Experiment、Study、Regression、Release、DOM、宿主时钟、定时器和未注入随机源。`arena-product-composition` 同步补齐 composite declaration 输出，避免 strict 消费者依赖无声明 JavaScript 产物。
- 外部 options/config 在读取前先拒绝访问器、Symbol、未知字段与非普通数据；注入 Registry 的 `require/list` 必须是原型链上的数据方法，随后按 `list()` 值重建 Action、Equipment、Map 与 Character Registry 快照。调用方后续替换方法或篡改原 Registry 不能改变已取得的权威内容，Equipment 仍用同一个 Action Registry 重验悬空引用，内容选择和 MatchConfig 不形成第二份数值真值。
- 新增 4 项 strict 组合根测试，覆盖外层/嵌套 getter 零执行、同 seed Quick Match 确定性、Registry 访问器零执行及兼容导出生命周期终态；架构门新增 1 项精确包边界测试。完整门禁通过：678/678 Node、301/301 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`，生产依赖审计为 0 vulnerabilities，正式资产预算结果保持 `82a8b378`。
- 输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `34169.973957999995 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `605.885667 ms`、堆增长 `2700920 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `51301.543832999996 ms`、堆增长 `7016352 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；本机脚本数据不外推为手机帧率、功耗或温度。
- 代码提交为 `583012b451e9691a791f3af75f3ddbef2a3d7073`，clean build ID 为 `arena-583012b451e9-product`。Web/微信/抖音 delivery 为 `3780713 / 3830183 / 3830158 B`，JavaScript 为 `1437103 / 1502087 / 1502087 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。Web 主业务 chunk 为 `805.29 kB`（gzip `204.47 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），继续进入 G6 拆包与目标设备 trace，不以降低分辨率、抗锯齿、动作或关节规避。
- 本机 Chrome 无头 DevTools 主流程走通首页、角色选择、切换并确认“发条方块”、开始匹配、唯一 Three.js 1v1 Canvas及整页刷新回首页；启动错误为零，应用异常与应用控制台 warning/error 为零。软件 WebGL 验收环境产生 4 条驱动层 `ReadPixels` 性能提示，已与应用日志分离记录；本证据不新增或冒充 Allen 的 iPhone 13 Pro、iOS 26、Chrome 人工验收，也不新增微信/抖音真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、分辨率、抗锯齿、关节、Bot 规则、权威 tick、Replay/Profile schema 或正式资产字节。Arena V1 应用注入债已关闭；G6 下一步治理 Stage 6/Product Session 与其余 Entry 宿主根，G7-G10 尚未完成，当前不可合并。

## G6.37 生产 Product Presentation Session 组合根 strict 迁移证据

- 新建 strict `@number-strategy-jump/arena-v1-application-session`，承接生产 Product Presentation Session 的平台端口快照、seed/身份、质量、Renderer/Controller/Flow、输入、帧循环、性能探针与 V1 内容注入；旧 JavaScript 组合真值删除，Entry、压力脚本与测试统一消费包公开 API，精确允许清单由 283 降至 282。长期边界见 [ADR-035](../decisions/035-arena-v1-product-presentation-session-composition.md)。
- 新包依赖只允许已治理的合同、Match/Matchmaking、Presentation Runtime、Product Presentation、V1 应用组合与 V1 表现内容；2 个源文件和完整依赖集合由架构门精确锁定。禁止 Three 具体实现、Platform Runtime、Entry、Experiment、Study、Regression、Release、DOM、宿主全局、定时器、网络和未注入随机源；生产 Product Session 不复用旧 Greybox `ArenaPresentationSession` 的所有权图。
- options 只接受普通对象、自有数据字段和精确白名单，访问器、Symbol 与未知字段零执行拒绝。平台必需方法沿最多 32 层原型链快照为绑定数据方法；Renderer 所需的离屏 Canvas、WebGL、资产、音频、振动、分享与兼容存储能力按存在性快照，精简测试宿主不被强迫伪造未使用能力。平台 ID/存储并发模式、seed source `nextSeed` 和 match config 在发布组合前完成数据快照，调用方后续替换方法不能改变已取得能力。
- 定向迁移过程中发现“只快照 Product Session 直接方法会丢失 Renderer 所需平台扩展能力”，已改为必需/扩展双集合并由小游戏 Canvas 主流程回归覆盖。新增 4 项 strict 测试，覆盖 options/平台 getter 零执行、Symbol 拒绝、平台与 seed 方法替换隔离、可选平台 getter 零执行及 viewport getter 零执行；完整门禁通过：679/679 Node、305/305 strict package/治理、104/104 生命周期，黄金 Replay manifest 保持 `0dace228`。
- 输入 fuzz 加强为每个 Mapper 120 场，共 360 场、360 个唯一 final hash 与 6 次 Replay 复验，耗时 `112949.832375 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `1364.612625 ms`、堆增长 `2863600 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `60279.253208 ms`、堆增长 `7271768 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；本机数据不外推为手机帧率、功耗或温度。
- 本批 `package-lock.json` 只新增内部 workspace 包链接和 7 条内部包依赖，没有新增或升级外部依赖；`npm ls --omit=dev --all` 证明生产树完整。G6.36 对相同外部生产依赖闭包的联网审计结果为 0 vulnerabilities；本批重复联网查询因安全策略阻止向外部服务发送依赖元数据而未执行，不能伪写为一次新的审计。正式资产预算结果保持 `82a8b378`。
- 代码提交为 `44c51121ab5f6efe36bc27ed9529d52e3c8b9b51`，clean build ID 为 `arena-44c51121ab5f-product`。Web/微信/抖音 delivery 为 `3783105 / 3832577 / 3832552 B`，JavaScript 为 `1439495 / 1504481 / 1504481 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。Web 主业务 chunk 为 `807.68 kB`（gzip `204.49 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`），增长来自宿主能力快照与校验，不通过降低分辨率、抗锯齿、动作或关节规避。
- 本机 Chrome 无头 DevTools 主流程走通首页、角色选择、切换并确认“发条方块”、开始匹配、唯一 Three.js 1v1 Canvas及整页刷新回首页；启动错误、应用异常和应用控制台 warning/error 均为零。软件 WebGL 环境的 4 条 `ReadPixels` 驱动提示独立记录；本证据不冒充 Allen 的 iPhone 13 Pro、iOS 26、Chrome 人工验收，也不新增微信/抖音真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。生产 Product Session 组合债已关闭；G6 下一步治理旧 Greybox ArenaPresentationSession 与其余 Entry，G7-G10 尚未完成，当前不可合并。

## G6.38 顶层 Product Launch 组合 strict 迁移与发布契约加固证据

- 新建 strict `@number-strategy-jump/arena-v1-application-launch`，承接运行实例身份、单 Runtime Profile Lease 默认值、表现质量选择、内存观察、Product Renderer Factory 与 Canvas Product Game 组合；5 个旧 Entry JavaScript 真值删除，Web、微信、抖音、真人研究运行时和测试统一消费包公开 API，精确允许清单由 282 降至 277。实际宿主页面、微信/抖音 API 选择和启动错误展示仍留给薄 Entry；长期边界见 [ADR-036](../decisions/036-arena-v1-application-launch-boundary.md)。
- 新包依赖精确限定为已治理的 Platform Runtime、Presentation Runtime/Three、Product Presentation/Three、V1 Application Session 与 V1 Presentation Content；6 个源文件和 7 条依赖由架构门锁定。禁止 Authority 反向依赖、Entry/Experiment/Study/Regression/Release、Node、DOM、Storage 全局、宿主计时器、直接 `tt.*`/`wx.*` 和未注入随机源。`arena-v1-application-session` 与新包同时补齐 composite、declaration、declaration map 和 source map，修复了包声明 `types` 但实际缺少 `.d.ts` 的发布契约缺口。
- 所有 Launch options、Renderer factory 参数和平台标识在资源创建前只从普通对象或有限原型链读取数据描述符；访问器和 Symbol 零执行拒绝，未知 Renderer 字段失败关闭。质量调试值、小游戏 API 与外部内存 provider 的访问器按“能力不可用”处理；真实 Chromium `performance.memory` 只在 Entry 观察边界内安全读取。显式 `root:null` 保持隔离而不会意外回落到 `globalThis`；迟到注入的合法内存 provider 仍可被每次采样观察。
- 新增 4 项 strict Launch 测试和 1 项 Node 架构门，覆盖 Renderer/Canvas/options getter 零执行、可选能力 getter 零执行、显式隔离 root 和 factory 参数拒绝。完整门禁通过：680/680 Node、309/309 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `46428.552333 ms`，无 reproduction case。
- Presentation Session soak 完成 100 场，耗时 `1754.635417 ms`、堆增长 `2745592 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `62383.435834 ms`、堆增长 `7011392 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；本机数据不外推为手机帧率、功耗或温度。正式资产预算结果保持 `82a8b378`。
- `package-lock.json` 仅新增当前内部 workspace 链接及 7 条既有内部包依赖，没有新增或升级外部依赖；`npm ls --omit=dev --all` 证明生产树完整。G6.36 已对相同外部生产依赖闭包得到 0 vulnerabilities；本批未把旧审计伪写为新的联网审计结果。
- 代码提交为 `a5a7dfbc18900490ada1ebe8989dfaf15bc8e872`，clean build ID 为 `arena-a5a7dfbc1890-product`。Web/微信/抖音 delivery 为 `3805515 / 3835130 / 3835105 B`，JavaScript 为 `1461905 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。Web 主业务 chunk 为 `830.09 kB`（gzip `211.11 kB`），Three chunk 为 `631.82 kB`（gzip `161.92 kB`）；增长来自显式 Launch 边界、宿主能力校验和 source map，不通过降低分辨率、抗锯齿、动作或关节规避。
- 本批迁移实现完成后的本机 Chrome 无头 DevTools 主流程走通首页、角色选择、切换并确认“发条方块”、开始匹配、唯一 Three.js 1v1 Canvas及整页刷新回首页；启动错误、应用异常和应用控制台 warning/error 均为零，软件 WebGL 环境产生 4 条独立的 `ReadPixels` 驱动提示。补齐声明输出与 `root:null` 隔离测试后，复验所需的新隔离 Chrome 被本机既有 Chrome 单例阻止打开调试端口；未关闭用户浏览器，生产默认 root 路径未改变，新增隔离路径由自动化覆盖。该记录不冒充 Allen 的 iPhone 13 Pro、iOS 26、Chrome 人工验收，也不新增微信/抖音真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。顶层 Product Launch 组合债已关闭；G6 下一步治理旧 Greybox ArenaPresentationSession 与实际 Entry 宿主根，G7-G10 尚未完成，当前不可合并。

## G6.39 三端 Product Entry 与 Web Product UI strict 迁移证据

- Web/微信/抖音实际 Product Entry、Web Product Scene Model 与 Web Product UI Surface 已从 5 个 JavaScript 文件迁为 strict TypeScript；无人引用的 `web-product.js` 兼容入口删除，精确允许清单由 277 降至 271。HTML 与小游戏构建输入明确指向 `.ts`；小游戏架构测试继续证明微信/抖音 Product bundle 不导入 Web Platform 或 DOM。长期边界见 [ADR-037](../decisions/037-arena-strict-product-host-entries.md)。
- 三端 Entry 只选择已治理 Platform、Product Launch、宿主错误面和 teardown，不参与命中、移动、随机、Profile、奖励或胜负。Web Scene Model 只把已校验公开 ViewModel 映射到已接受产品图片，不暴露 Bot 身份/难度；Web UI 只渲染语义 DOM 并把点击序列化为 Product Intent，不直接写 Product Session 或 Match。
- Web UI 的 Canvas/root、intent callbacks 与 viewport 改为显式类型和数据描述符边界；constructor/bindIntent 访问器、Symbol 与未知字段在取得事件所有权前拒绝，viewport 访问器不执行。新增 1 项 getter 零执行/零 listener 所有权回归；Node 测试通过 `node --import tsx --test` 直接加载迁移中的 strict 源码，未保留 JavaScript 代理或双份实现。
- 完整门禁通过：681/681 Node、309/309 strict package/治理、104/104 生命周期；黄金 Replay manifest 保持 `0dace228`。输入 fuzz 完成 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `41749.208916999996 ms`，无 reproduction case。
- Presentation Session soak 完成 100 场，耗时 `1014.712 ms`、堆增长 `2933728 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `58519.678415999995 ms`、堆增长 `6981952 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；正式资产预算结果保持 `82a8b378`。
- 本批没有新增或升级依赖，`package-lock.json` 未改变；tsx 是既有开发依赖，只用于迁移期 Node 测试加载 strict 源码。代码提交为 `0e2ad413cd9663c907e3f16ab826f9b027efb5e9`，clean build ID 为 `arena-0e2ad413cd96-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。小游戏字节与 G6.38 完全一致；Web 增加 `2016 B` 来自 UI 数据边界和类型迁移后的 bundle 形态，不通过降低画质、动作或关节规避。
- G6.38 已对同一 Product Launch、Web 页面结构和业务主流程完成 Chrome DevTools 冒烟。本批尝试启动新的隔离 Chrome 复验时，本机既有 Chrome 单例未开放调试端口；未关闭用户浏览器，也未把失败的 harness 启动写成应用通过。当前新增 UI 行为由 DOM 交互、三端 bundle、完整 Session/入口测试覆盖；仍需 Allen 在 iPhone 13 Pro、iOS 26、Chrome 进行人工验收，且没有新增微信/抖音真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。实际 Product Entry strict 债已关闭；G6 下一步治理旧 Greybox ArenaPresentationSession、Greybox Entry 与研究入口，G7-G10 尚未完成，当前不可合并。

## G6.40 Greybox Session 组合 strict 迁移与回退边界隔离证据

- 新建 strict `@number-strategy-jump/arena-v1-greybox-session`，先承接 Greybox/Input Pilot 共用 Session 的 options、平台能力、seed、Quick Match、输入/帧/事件工厂、灰盒 Renderer 与 V1 表现内容组合；旧 `arena-session-composition.js` 删除，现存 `ArenaPresentationSession` 改从包公开 API 取得组合，精确允许清单由 271 降至 270。该包明确是开发回退应用边界，不属于生产 Product Session，也不得进入默认生产交付。
- 新包当前 2 个源文件和 7 条内部依赖由架构门精确锁定；允许 Greybox 应用根使用已治理的 Contracts、Definitions、Matchmaking、Presentation Runtime/Three、V1 Composition 与 Presentation Content，禁止 Entry、Experiment、Study、Regression、Release、Node、DOM/BOM、Storage 全局、宿主定时器、直接 `tt.*`/`wx.*` 和未注入随机源。
- options 只接受普通对象、自有数据字段和精确白名单；访问器、Symbol 与未知字段零执行拒绝。平台必需/可选能力、平台 ID、外部 MatchService `create()` 与 SeedSource `nextSeed()` 均沿有限原型链取得数据描述符并绑定快照，调用方随后替换方法不会改变已发布组合。默认 seed 容忍 `now/getViewport` 宿主故障，并且不执行 viewport 访问器；match config 在发布前深克隆冻结。
- 新增 3 项 strict 恶意边界测试，覆盖 options/平台 getter 零执行、平台与 MatchService 方法替换隔离、viewport getter 零执行；新增 1 项 Node 架构门并保留微信/抖音 Greybox 回退入口独立打包测试。完整门禁通过：682 项 Node、312 项 strict package/治理、104 项生命周期；黄金 Replay manifest 保持 `0dace228`。
- 输入 fuzz 完成 3 个 Mapper 各 120 场，共 360 场、360 个唯一 final hash 与 6 次 Replay 复验，耗时 `101138.96 ms`，无 reproduction case。Presentation Session soak 完成 100 场，耗时 `1041.7850409999999 ms`、堆增长 `2704840 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `54158.708042000006 ms`、堆增长 `6923640 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；正式资产预算结果保持 `82a8b378`。
- `package-lock.json` 只新增当前内部 workspace 链接和 7 条既有内部包依赖，没有新增或升级外部依赖；`npm ls --omit=dev --all` 证明生产树完整。联网 `npm audit` 因安全策略不允许在缺少明确授权时向 npm 服务发送依赖元数据而未执行；G6.36 对相同外部生产依赖闭包的结果为 0 vulnerabilities，但本批不把旧结果伪写为新审计。
- 代码提交为 `c7baf3e8e931410762f1d1a8ad9973d72f5334a8`，clean build ID 为 `arena-c7baf3e8e931-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。所有生产字节与 G6.39 完全一致，证明 Greybox 组合未进入默认 Product bundle。
- 本批未改变生产 Product 入口、页面、Renderer 或交互，且 clean 生产 bundle 与 G6.39 字节完全一致，因此没有伪造新的浏览器主流程通过记录；G6.38 的相同 Product 主流程 Chrome 证据仍有效，但仍需 Allen 在 iPhone 13 Pro、iOS 26、Chrome 进行人工验收，也没有新增微信/抖音真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。Greybox 组合层 strict 债已关闭；G6 下一步迁移旧 Greybox `ArenaPresentationSession` 类与 `createArenaGame` 应用根，再治理 Greybox Entry 与研究入口。G7-G10 尚未完成，当前不可合并。

## G6.41 Greybox 表现会话与应用根 strict 迁移证据

- 旧 `arena-presentation-session.js` 与 `create-arena-game.js` 已删除；`ArenaPresentationSession`、完整生命周期状态机和 `createArenaGame` 统一迁入 strict `@number-strategy-jump/arena-v1-greybox-session`。Greybox 三端入口、Input Pilot 和 Session soak 全部改从包公开 API 取得应用根，不再存在 JavaScript 转发真值；精确允许清单由 270 降至 268。边界决策见 [ADR-038](../decisions/038-arena-greybox-presentation-session-boundary.md)。
- Session 在取得所有权时快照并绑定 Renderer、FrameLoop、Accumulator、Input Router、Input Adapter、Match Session、EventWindow 和 Canvas 能力；访问器方法不执行。除 Renderer `load()` 外，平台、输入、权威会话、渲染、帧循环、监听注册和清理端口的异步返回全部在成功状态发布前 fail closed，并收容原生拒绝 Promise，避免未处理 rejection。
- Canvas 监听若在宿主已注册后抛错会用对应 remove 回滚，回滚失败时保留原错误和清理错误；帧内 destroy/host failure 延迟到当前帧退出后清理。清理失败会保留确切资源和 cleanup 所有权供后续 `destroy()` 重试，不会以丢引用伪装成功。比赛快照在进入 Greybox 表现前复制冻结，Accumulator batch 拒绝访问器、异步值、越界步数和非法 dropped time。
- 完整 `npm test` 为 686/686 Node 与 312/312 strict package/治理测试通过；生命周期专项 104/104 通过。黄金 Replay 4 个样本通过，manifest 保持 `0dace228`。新增回归覆盖 Renderer 方法访问器零执行、Canvas throw-after-mutation 回滚、异步 Input Adapter 启动和异步 WebGL context restore 失败关闭。
- 输入 fuzz 完成 3 个 Mapper 各 40 场，共 120 场、120 个唯一 final hash 与 6 次 Replay 复验，耗时 `33624.100833 ms`，无 reproduction case。Greybox Presentation Session soak 完成 100 场，耗时 `918.6969580000001 ms`、堆增长 `2729328 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `51071.799333999996 ms`、堆增长 `7041528 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；这些本机脚本数据不等同于手机帧率、功耗或温度。
- `package-lock.json` 只为 Greybox strict 包新增已有内部 `arena-match` workspace 依赖，没有新增或升级外部依赖；`npm ls --omit=dev --all` 证明生产树完整。联网 `npm audit` 因安全策略不允许在缺少明确授权时向 npm 服务发送依赖元数据而未执行；G6.36 对相同外部生产依赖闭包的结果为 0 vulnerabilities，但本批不把旧结果伪写为新审计。正式资产预算结果保持 `82a8b378`。
- 代码提交为 `224076133ee8622b442dda5d1e39e9405f406706`，clean build ID 为 `arena-224076133ee8-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`，生产产物边界检查通过。三端生产交付体积与 G6.40 完全一致，证明 Greybox 会话与应用根未进入默认 Product bundle。
- 本批未改变生产 Product 入口、页面、Renderer 或交互，clean 生产 bundle 的交付体积也保持既有值，因此没有伪造新的浏览器主流程通过记录；G6.38 的相同 Product 主流程 Chrome 证据仍有效。仍需 Allen 在 iPhone 13 Pro、iOS 26、Chrome 进行人工验收，且没有新增微信/抖音真机证据。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。Greybox 表现会话和应用根 strict 债已关闭；G6 下一步治理 Greybox Entry 与研究入口。G7-G10 尚未完成，当前不可合并。

## G6.42 三端 Greybox 薄宿主入口 strict 迁移证据

- Web、微信和抖音 Greybox Entry 从 `.js` 直接迁为 `.ts`，`greybox.html` 与小游戏独立 bundle 测试均指向 strict 真值；没有保留 JavaScript 代理。三个入口只选择对应 Platform、`createArenaGame`、启动协调、错误展示和 Web teardown，不持有命中、移动、随机、比赛、Renderer 或资源生命周期；精确允许清单由 268 降至 265。
- 小游戏架构测试逐个把微信/抖音 Greybox Entry 打成独立 IIFE，并证明 bundle 包含 strict Greybox Presentation Session、但不导入 Web Platform、DOM 或生产 Product Canvas UI。生产产物检查继续排除 `greybox.html` 和所有开发入口，正式三端默认入口仍为 Product。
- 完整质量门为 686/686 Node 与 312/312 strict package/治理测试通过，生命周期专项 104/104 通过；黄金 Replay 4 个样本通过，manifest 保持 `0dace228`。输入 fuzz 完成 120 场、120 个唯一 final hash 和 6 次 Replay 复验，耗时 `32505.73925 ms`，无 reproduction case。
- Greybox Presentation Session soak 完成 100 场，耗时 `706.974083 ms`、堆增长 `2686968 B`；Product Presentation Session soak 完成 100 场、100 个唯一 authority hash，耗时 `49894.687292 ms`、堆增长 `7067776 B`。两者均低于 8 MiB，帧、生命周期监听、Canvas 监听和输入绑定残留为零；正式资产预算结果保持 `82a8b378`。
- 新鲜本地 Vite 服务在隔离 Chrome Headless 中完成真实模块与 WebGL 启动：`readyState=complete`、样式表 1、Canvas 从默认 `300×150` 调整到 `756×469`、错误提示为空，稳定后 Runtime/Log 观察为空。第一次连接占用 `4174` 的旧 Vite 实例时出现 `Outdated Optimize Dep` 和白页，已用新端口重建服务并证明是旧开发缓存而非本批代码；该失败实例未计为通过。此证据是桌面 Chrome 冒烟，不替代 Allen 的 iPhone 13 Pro、iOS 26、Chrome 或微信/抖音真机验收。
- 本批没有新增或升级依赖，`package-lock.json` 未改变。代码提交为 `693873e24dbe40601d3b826618723891d03b1914`，clean build ID 为 `arena-693873e24dbe-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。三端生产交付体积与 G6.41 完全一致，证明 Greybox Entry 未进入默认 Product bundle。
- 本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产字节。三端 Greybox Entry strict 债已关闭；G6 下一步治理 Web 研究入口及其宿主辅助层。G7-G10 尚未完成，当前不可合并。

## G6.43 Web 研究环境与 clean build 身份 strict 迁移证据

- Pilot/Study 共用的 Web 设备分类、页面 owner ID、clean build manifest 读取，以及两个研究类型的 build identity 包装共 5 个 JavaScript 文件迁为 strict TypeScript；所有既有消费者继续通过唯一模块路径取得能力，精确允许清单由 265 降至 260。
- 设备分类只接受有限正数，宿主 screen/navigator/matchMedia 缺失或抛错时使用明确安全默认；owner ID 复用已治理的 Runtime Instance ID，不新增墙钟或随机实现。build identity options 只接受普通对象自有数据字段，fetch/json 能力从最多 32 层无环原型链快照并拒绝访问器方法，Manifest 仍必须是 clean Web build 且覆盖对应 `pilot.html` 或 `study.html`。
- 新增回归证明 fetch/json 访问器均零执行并返回不可采集状态；完整 Node 测试增至 687/687，strict package/治理测试保持 312/312，ESLint、strict typecheck 和生产产物隔离门禁通过。本批只改变研究宿主辅助路径，没有重跑 G6.42 已通过且代码路径未变的 Replay、fuzz、生命周期和 Session soak；也不把旧结果伪写为本批新执行。
- 本批没有新增或升级依赖，`package-lock.json` 未改变。代码提交为 `499fe710df4ebaebdc6e7e72cc9f114c16daa16a`，clean build ID 为 `arena-499fe710df4e-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。生产交付体积与 G6.42 完全一致，研究辅助层未进入默认 Product bundle。
- 本批不改变 Product/Greybox 页面或交互，因此未新增浏览器或真机通过记录。Allen 的 iPhone 13 Pro、iOS 26、Chrome 以及微信/抖音真机验收仍是外部门禁。本批也没有改变 Gameplay V2 配置 hash `8c322912`、攻击/动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。G6 下一步单独治理 Pilot/Study JSON 下载所有权和 Blob URL 清理；G7-G10 尚未完成，当前不可合并。

## G6.44 Pilot/Study JSON 下载所有权 strict 迁移证据

- Pilot 与 Human Match Study 两个 JSON 下载模块从 JavaScript 直接迁为 strict TypeScript，并新增共用的 Web JSON Download Lease；旧实现删除且没有 JavaScript 转发层，精确允许清单由 260 降至 258。共用层只管理 UTF-8/Blob payload、一次性点击、临时 DOM 节点和 Blob URL，不参与研究数据生成、比赛状态或 Product 运行时。
- Pilot options 只接受普通对象的 `kind/revision/value` 自有数据字段，嵌套数据在序列化前安全复制冻结，访问器零执行。Study CapturePackage/Workspace 同样先复制冻结，SHA-256 对实际下载的 UTF-8 bytes 计算并校验为 32 bytes；文件名、revision、payload 类型和同步 DOM/URL 方法均有显式边界。
- Download Lease 在构造、append、click、延迟分发与 release 各失败点 fail closed；临时链接优先用 `remove()`，并用 `parent.removeChild()` 兼容回退，Blob URL 必须 revoke。清理失败保留原错误与清理错误，租约不把未释放资源伪装为成功；异步返回的同步 DOM/URL 方法被拒绝，原生拒绝 Promise 被收容，不形成未处理 rejection。
- 最终代码提交上的完整 Node 测试为 688/688 通过，Pilot/Study 定向测试为 13/13 通过；strict package/治理测试保持 312/312，ESLint、strict typecheck、JS 递减和生产边界门禁均通过。新增回归覆盖嵌套访问器零执行、click 失败回滚、异步 append 拒绝，以及无 `anchor.remove()` 时的 `removeChild()` 清理。该研究辅助批次未改变权威、Replay、Session 或渲染路径，因此没有重跑 Replay、fuzz、生命周期和 soak，也不把 G6.42 的结果伪写为本批新执行。
- 本批没有新增或升级依赖，`package-lock.json` 未改变。代码提交为 `0080fb919473f2b848de49f6ca415f3ebfbcf2b5`，clean build ID 为 `arena-0080fb919473-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。生产交付体积与 G6.43 完全一致，证明研究下载层未进入默认 Product bundle。
- 本批没有改变 Product/Greybox 页面或交互，未新增浏览器或真机通过记录。Allen 的 iPhone 13 Pro、iOS 26、Chrome 以及微信/抖音真机验收仍是外部门禁；Pilot/Study 页面将在其 Workbench、应用和薄入口完成 strict 迁移后统一做真实浏览器下载验证。本批也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。G6 下一步迁移 Human Match Study Product Runtime；G7-G10 尚未完成，当前不可合并。

## G7.1 真人研究 Definition/Assignment/Capture strict 基础证据

- 新建 strict `@number-strategy-jump/arena-human-match-study` workspace，先按 Definition → Assignment → Capture 顺序承接 3 个真人研究 JavaScript 真值；所有 Study 领域消费者、Web Runtime、测试和普通 Node CLI 改从包公开 API 取得能力，没有保留 JavaScript 转发。边界决策见 [ADR-039](../decisions/039-human-match-study-domain-boundary.md)。
- Definition 固定候选、预注册环境、隐藏 arm 与门槛；Assignment 只接受普通对象自有数据 options，并继续使用生产 Matchmaking 产生 block-balanced 天然难度 seed；Capture completion 先复制冻结，只接受 `result/replay`，验证预注册 seed、Replay schema、完整序列、生产隐藏难度和 Product Result 重建一致性。options/completion 访问器均零执行，seed、端口和所有权越界显式失败。
- 新增 2 项 strict 包测试；Human Study 领域与两个普通 Node CLI 11/11 通过，其中 ingest/evidence CLI 继续用 Node 20 直接加载编译包，并完整复现 Authority 与每个隐藏 Bot 输入。该结果是离线研究证据链回归，不等于正式 Gameplay 黄金 Replay 门禁的新执行。
- 这只是 G7 的依赖前置基础：Record、Capture Package、Workspace、Repository、Report、Replay Verifier、Pilot/Release/其余测试迁移，coverage 阈值和零 JavaScript 门禁仍未完成，当前不可合并。

## G6.45 Human Match Study Product Runtime strict 迁移证据

- `human-match-study-product-runtime.js` 已直接迁为 strict TypeScript。Runtime 只组合内存存储 Platform、正式 Product Game、Web Product UI 和 Study Capture 端口，不持有 Workspace、表单、下载或收据；精确允许清单连同 G7.1 的 3 个基础真值由 258 降至 254。
- Runtime options、Platform 与 Game 生命周期方法在取得所有权前检查自有数据/数据方法；临时 Product 存储用安全复制冻结代替 JSON round-trip。Game 候选必须先提供同步 `destroy()`：缺少 `start()` 或其他接口时仍先纳入 Runtime 所有权，启动清理失败会保留引用供后续 `destroy()` 重试。并发 `start()` 共用一个 Promise，启动中销毁只释放一次，异步同步端口和访问器方法 fail closed。
- 最终提交上的完整 Node 测试为 689/689，strict package/治理测试为 314/314；Study Web 支持 8/8、Human Study/CLI 11/11 通过，ESLint、strict typecheck、JS 递减与生产边界门禁通过。新增回归覆盖 Platform 能力访问器零执行、无效 Game 候选清理失败重试，以及 start/destroy 竞态。本批没有改变正式权威、输入、Renderer 或 Session，未重跑 Gameplay 黄金 Replay、输入 fuzz、生命周期和 soak。
- `package-lock.json` 只增加新的内部 workspace 链接及其既有内部依赖，外部版本未改变；`npm ls --omit=dev --all` 证明生产树完整。`npm install` 的自动全树审计报告 3 个 high severity，但没有输出具体 advisory，且该全树包含开发工具链；本批不把它写成生产漏洞结论，也不执行破坏性 `npm audit fix --force`，由 G8 对生产闭包与开发工具链分别归因和闭环。
- 代码提交为 `00686d5e20523d597221c9ab57804eb2d1879ce4`，clean build ID 为 `arena-00686d5e2052-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。生产交付体积与 G6.44 完全一致，证明 Study 领域包和 Product Runtime 未进入默认 Product bundle。
- Study Workbench、Web App 和薄入口尚未 strict 化，因此本批没有把旧页面冒烟或手机下载伪写成新通过。Allen 的 iPhone 13 Pro、iOS 26、Chrome 以及微信/抖音真机记录仍是外部门禁。本批也没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot 参数、权威 tick、Replay/Profile schema 或正式资产。G6 下一步迁移 Study/Pilot Workbench View；G7-G10 仍未完成，当前不可合并。

## G6.46 Human Match Study Workbench View strict 迁移证据

- `human-match-study-workbench-view.js` 已直接迁为 strict TypeScript，精确允许清单由 254 降至 253。View 只拥有研究页面 DOM 投影、表单读取、actions 监听和忙碌状态；不依赖 MatchCore、Bot、Product Session、Workspace Repository、下载实现或研究分组逻辑。
- render model 在写 DOM 前完整复制冻结并校验唯一字段集合、环境、计数、收据与布尔能力；actions 必须是完整普通对象的自有数据函数，访问器零执行。评分只接受 1～5 安全整数，对手判断只接受 `human/bot/unsure`，避免非法表单值越过 View 边界。
- 8 个按钮监听逐项取得所有权；中途注册失败会逆序回滚。销毁只移除成功 cleanup，失败项保留供下一次 `destroy()` 精确重试，并在此期间阻止 action、渲染和重复绑定；异步 action 在 View 已销毁或正在销毁后不再回写页面。
- 最终代码上的完整 Node 测试为 690/690，strict package/治理测试为 314/314，Study Web 支持为 9/9；ESLint、strict typecheck、JS 递减和生产边界门禁通过。新增纯 Node DOM 宿主回归覆盖 model/actions 访问器零执行、监听释放失败、销毁态阻断和二次清理归零。
- 本批没有新增或升级依赖，`package-lock.json` 未改变。代码提交为 `ffa21ed04018f8c7b40725cb9d170dae3329138e`，clean build ID 为 `arena-ffa21ed04018-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。生产交付体积与 G6.45 完全一致，Study View 未进入默认 Product bundle。
- Study Web App 与薄入口仍是 JavaScript，页面结构和交互本批没有改变，因此没有伪写真实浏览器或手机通过记录，也没有重跑 Gameplay Replay、fuzz、生命周期和 soak。Allen 的 iPhone 13 Pro、iOS 26、Chrome 以及微信/抖音真机记录仍是外部门禁。本批没有改变 Gameplay V2 配置 hash `8c322912`、攻击/动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。G6 下一步先迁移 Pilot 领域依赖和 Workbench View；G7-G10 仍未完成，当前不可合并。

## G7.2 Input Pilot 共享词汇 strict 基础证据

- 新建 strict `@number-strategy-jump/arena-input-pilot` workspace，首批只承接 Action Outcome、Comprehension、Trial Status、Termination Reason、Exclusion Reason 和 Trial Controller State 六类稳定线上值；不把 DOM、Product Runtime、Workspace、下载或入口带入领域包。边界决策见 [ADR-040](../decisions/040-input-pilot-domain-and-workbench-boundary.md)。
- 旧 Pilot Record/Controller 消费者已统一导入新包，并从原有公开路径重导出以保持已有消费合同；原文件中的重复常量真值已删除，没有 JavaScript 转发实现。
- 新增 2 项 strict 包测试，证明每类词汇已冻结、类内线上值唯一，并锁定销毁、运行失败、作废和输入模式不匹配等关键值。strict package/治理测试由 314 增至 316，完整通过。
- 本节只是 Input Pilot 依赖顺序的基础批次。Definition、Assignment、Record、Workspace、Repository、Report、Evidence/Release 与其余测试仍须按依赖方向继续迁移；不宣称 G7 或零 JavaScript 已完成。

## G6.47 Input Pilot Workbench View strict 迁移证据

- `input-pilot-workbench-view.js` 已直接迁为 strict TypeScript，精确允许清单由 253 降至 252。View 只拥有 Pilot 页面 DOM 投影、观察/复核表单、actions 监听、Canvas 宿主位置和忙碌状态；不参与分组、命中、移动、胜负、Replay 或证据生成。
- options、actions、snapshot、environment、form snapshot 和 review draft 在使用前校验普通对象、唯一字段集与合法值，访问器零执行。render 仅复制当前页面所需的有界字段，不深拷贝整个 Workspace；研究人员可控的 task prompt、build ID、阻断原因、环境和参与者 ID 进入 `innerHTML` 前必须转义。
- 两类监听逐项取得所有权，绑定中途失败逆序回滚。构造失败会归还原 Canvas；销毁只删除已成功的 cleanup，失败项保留供后续 `destroy()` 精确重试。销毁期间不再接受表单或 action，异步 action 结束后也不会复活页面；`saveDraft`/form restore/reset 按现有合同必须同步完成。
- Input Pilot 定向测试 42/42、完整 Node 测试 691/691、strict package/治理测试 316/316 通过；ESLint、strict typecheck、JS 递减、产品依赖和 Three 边界门禁均通过。新增纯 Node 伪 DOM 回归覆盖 actions/snapshot 访问器零执行、动态 HTML 转义、监听释放首次失败、销毁态阻断和二次清理归零。
- 本批没有新增或升级外部依赖；`package-lock.json` 只增加 `arena-input-pilot` 内部 workspace 链接。代码提交为 `dc531c9b983bfc1a063957886f35499a9962ea48`，clean build ID 为 `arena-dc531c9b983b-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。交付字节与 G6.46 完全一致，证明 Pilot 词汇包和 Workbench View 未进入默认 Product bundle。
- Pilot Web App 与薄入口仍是 JavaScript，因此本批未将旧页面或手机结果伪写为新的浏览器/真机通过；本批也未单独重跑 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Allen 的 iPhone 13 Pro、iOS 26、Chrome 以及微信/抖音真机记录仍是外部门禁。本批没有改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。G6 尚余两个研究 Web App 与薄入口；G7-G10 仍未完成，当前不可合并。

## G7.3 Input Pilot Definition/Registry/Assignment strict 迁移证据

- Input Pilot Definition、Registry、确定性 Assignment 和 Arena Input Pilot V1 组合共 4 个 JavaScript 真值已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 252 降至 248。CLI、Release、Record、Workspace、Repository、Trial、Presentation Runtime、Web App 与测试全部通过包公开 API 消费，没有保留旧 JavaScript 转发层。
- Definition 继续固定 schema 2、两个不重复 mapper variant、uint32 assignment seed、目标环境与预注册门槛，所有输入安全复制、深冻结并保持确定性 content hash。Registry 按 ID 稳定排序，重复 ID 在发布前拒绝。
- Assignment options 从解构动态对象收紧为唯一 `definition/participantId/enrollmentIndex` 自有数据字段，访问器零执行且未知字段失败关闭。每个完整两人 block 仍各包含一个 variant，同 definition/seed/enrollment 可复现 variant、match seed 和 assignment ID；校验器仍逐字段重建后比对，不信任持久化派生值。
- Input Pilot 扩展定向测试 57/57、完整 Node 测试 691/691、strict package/治理测试 318/318 通过；ESLint、strict typecheck、JS 递减、产品依赖和 Three 边界门禁均通过。新增 strict 回归覆盖 V1 冻结、Registry 发布、每 block 平衡和 Definition/Assignment options 访问器零执行。
- 包依赖只增加仓内 `arena-contracts` 和 `arena-presentation-runtime`，`package-lock.json` 只记录已有内部 workspace 依赖，没有新增或升级外部依赖。代码提交为 `03f3d0f0779f73c4917705e4adcb460fe9279fd2`，clean build ID 为 `arena-03f3d0f0779f-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。交付字节与 G6.47 完全一致，证明 Pilot Definition/Assignment 未进入默认 Product bundle。
- 本批是无宿主研究领域迁移，未改变 Pilot 页面交互，因此未新增浏览器/手机通过记录；也未单独重跑 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。本批不改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产。Record/Workspace/Repository/Report/Evidence 和 Web App/薄入口仍待 strict 迁移；G7-G10 仍未完成，当前不可合并。

## G7.4 Input Pilot Record/Review/Form strict 迁移证据

- Input Pilot Record Fields、Record、Review Draft 和 Form Model 共 4 个 JavaScript 真值已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 248 降至 244。Workspace、Trial、Metric、Report、Web App 和测试统一从包公开 API 消费，旧实现已删除且没有 JavaScript 转发层。
- Device、Eligibility、Automated Metrics、Observer/Self Report、Record 和 Review 全部在构造前校验普通数据字段，访问器零执行；Record 继续重建 Assignment，校验 Trial Status/Termination Reason 关系、三类证据完整性和环境排除原因。
- 修复了存量 `FormModel.restore()` 可通过持久化草稿绕过 0～999 观察计数上限的边界缺口。恢复现在先完整校验 observer/selfReport 和所有计数，在临时值全部合法后才一次提交；失败不会部分污染已有表单状态。高频 set/adjust 路径复用预构建键集，不每次重建 Set。
- 完整 Node 测试 691/691、strict package/治理测试 320/320 通过；Input Pilot 定向原回归通过，ESLint、strict typecheck、JS 递减、产品依赖和 Three 边界门禁均通过。新增 2 项 strict 测试覆盖超上限恢复原子失败、合法草稿恢复，以及 Record/Review 访问器零执行。
- 本批无新增或升级依赖，`package-lock.json` 未改变。代码提交为 `7dfdea22470bd6d77e1b2e1d924b94f8c34d2d31`，clean build ID 为 `arena-7dfdea22470b-product`。Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`；三端 `sourceDirty=false`、默认入口均为 Product、预算通过且 `freezeEligible=true`。交付字节与 G7.3 完全一致，本研究领域批次未进入默认 Product bundle。
- 本批未改变 Pilot 页面结构或游戏玩法，未新增浏览器/手机通过记录，也未单独重跑 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Workspace/Repository/Report/Evidence 和 Web App/薄入口仍待 strict 迁移；G7-G10 仍未完成，当前不可合并。

## G7.5 Input Pilot 存储与运行端口 strict 迁移证据

- Input Pilot 同步存储 Port、Storage Lease、Assignment Match Service 和 Trial Runtime Port 共 4 个 JavaScript 真值已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 244 降至 240。Workspace Repository、Trial Controller、Presentation Runtime 和测试统一从包公开 API 消费，旧实现已删除且没有 JavaScript 转发层。
- Storage Lease 继续复用 `arena-storage` 的 schema 2、同步读写、租约确认、时钟单调性、同 owner 多实例隔离、过期接管和显式释放协议；包只新增既有仓内依赖 `arena-storage`，未新增或升级外部依赖。Assignment Match Service 固定 uint32 assignment seed、只允许成功创建一局，并在 create 失败后恢复可重试状态。
- Runtime 与 Match Service 的方法能力按最多 32 层无环原型链读取数据方法描述符并绑定，访问器零执行。可选 `destroy()` 只有在整条原型链确实不存在时才允许缺省；同名 getter 或非函数不再被误吞为“可选能力”。Match options 先复制全部自有可枚举数据字段，访问器、Symbol 和不安全键在设置一次性创建状态前拒绝，失败后仍可用合法 options 重试。
- Input Pilot 存储/运行定向 Node 回归 28/28、完整 Node 测试 691/691、strict package/治理测试 323/323 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界与 `git diff --check` 均通过。新增 3 项 strict 回归覆盖 Runtime/Status 访问器零执行、缺失与恶意可选销毁的区分、Match options 原子拒绝和重试。
- 代码提交为 `c70d8c1dfcd2c4e9883666eb5dda3e8af36ff124`，clean build ID 为 `arena-c70d8c1dfcd2-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验和预算通过且 `freezeEligible=true`；交付字节与 G7.4 完全一致，证明本研究端口批次未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构、Product bundle 或游戏玩法，因此未新增浏览器/手机通过记录，也未重跑与本批路径无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Allen 的 iPhone 13 Pro、iOS 26、Chrome 以及微信/抖音真机记录仍是外部门禁；Workspace/Repository/Report/Evidence、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移，G7-G10 尚未完成，当前不可合并。

## G7.6 Input Pilot Trial Checkpoint 与 Enrollment Ledger strict 迁移证据

- Trial Checkpoint 与 Enrollment Ledger 两个 JavaScript 真值已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 240 降至 238。Workspace、Coordinator、Trial State/Controller、Presentation Runtime 与测试统一从包公开 API 消费，旧实现已删除且没有 JavaScript 转发层。
- Checkpoint 继续固定 schema 3 和 enrolled/running/reviewing 三阶段不变量：只有 reviewing 可携带且必须携带 automated、可提交终止原因和可恢复 reviewDraft；其他阶段三者必须为空。Definition、Assignment、设备、资格、自动指标和草稿均通过既有 strict 构造器重建，调用方访问器在读取证据前拒绝且不会执行。
- Enrollment Ledger 继续以 Definition ID/hash 绑定 assignment 序列，revision 必须等于已提交数量，participant、enrollment index 与 assignment ID 全局唯一；持久化必须先以旧 revision 完成同步确认，成功后才替换内存快照。构造与 enroll options 改为唯一自有数据字段，访问器零执行；原生 Promise 拒绝被收容，外来数据方法 thenable 不执行其 `then`，访问器 thenable 直接拒绝。失败不提升 revision、不遗留 mutating 状态，修正 writer 后可用同一实例精确重试。
- Input Pilot 持久化/运行定向 Node 回归 41/41、完整 Node 测试 691/691、strict package/治理测试 326/326 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界与 `git diff --check` 均通过。新增 3 项 strict 回归覆盖 Ledger 构造/入组访问器零执行、伪 thenable 原子拒绝与重试、Checkpoint 访问器零执行。
- 代码提交为 `909595b892d5ed2829b148fe36c8304a298129bf`，clean build ID 为 `arena-909595b892d5-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验和预算通过且 `freezeEligible=true`；交付字节与 G7.5 完全一致，本研究状态批次未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构、Product bundle 或游戏玩法，因此未新增浏览器/手机通过记录，也未重跑与本批路径无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Workspace/Repository/Report/Evidence、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.7 Input Pilot Trial State 与 Workspace strict 迁移证据

- Trial State 与 Workspace 值对象两个 JavaScript 真值已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 238 降至 236。Controller、Coordinator、Repository/Envelope、Export 和持久化测试统一从包公开 API 消费，旧实现已删除且没有 JavaScript 转发层。
- Trial State 继续只允许 enrolled → running → reviewing → terminal 的显式转换，复核终止原因映射为 completed/abandoned，恢复/运行失败/协议偏差只能形成 invalidated Record。所有转换 options 现在先验证唯一自有数据字段且访问器零执行；修复了旧提交路径用 `Boolean(invalidate)` 把数字、字符串等静默强制为作废标记的问题，只有真实 boolean 才能进入 Review Draft/Record。
- Workspace 继续以 Definition ID/hash、单调 revision、Enrollment、唯一 active trial 和按 enrollment index 排序的终态 Record 构成不可变聚合；每个 assignment 必须且只能由 active trial 或一个 terminal record 覆盖，重复 trial、孤立 assignment、active/terminal 重叠与 definition 漂移均拒绝。未来 schema 探针继续遍历 Workspace、Ledger、Assignment、Checkpoint 和 Record，防止旧客户端把嵌套未来数据当作普通损坏覆盖。
- Input Pilot 状态/持久化定向 Node 回归 39/39、完整 Node 测试 691/691、strict package/治理测试 329/329 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界与 `git diff --check` 均通过。新增 3 项 strict 回归覆盖转换 options 访问器零执行、非布尔 invalidate 拒绝，以及 Workspace update 访问器原子拒绝。
- 代码提交为 `f64c91124b1ef73c6f180b484376e1ea3f330811`，clean build ID 为 `arena-f64c91124b1e-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验和预算通过且 `freezeEligible=true`；交付字节与 G7.6 完全一致，本研究状态批次未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构、Product bundle 或游戏玩法，因此未新增浏览器/手机通过记录，也未重跑与本批路径无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Coordinator/Repository/Report/Evidence、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.8 Input Pilot Workspace Envelope 与 Coordinator strict 迁移证据

- Workspace Envelope 与 Coordinator 两个 JavaScript 真值已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 236 降至 234。Trial Controller、Repository 与测试统一从包公开 API 消费，旧实现已删除且没有 JavaScript 转发层。
- Envelope 继续以 schema 1、Definition ID/hash、Workspace revision/generation 和确定性 payload hash 绑定完整聚合；校验会重建 Workspace 后比对 generation/hash。未来 schema 探针仍只把真实未来 Envelope/嵌套 Workspace 作为受保护数据抛出，普通旧值或损坏值由 Repository 按既定恢复策略处理。
- Coordinator 现在在接管前快照并绑定 Repository 的 open/getSnapshot/CAS/renew/destroy 五个数据方法，访问器方法零执行，后续方法替换不能劫持已取得生命周期。所有返回值拒绝异步/伪异步 thenable；Repository snapshot 每次经 Workspace 重建，CAS 回执必须是唯一 `committed/reason/headUpdated` 自有数据字段，访问器回执不会执行且失败后释放 commit guard，允许同一 Coordinator 重试。
- 修复了 Coordinator 销毁失败后仍在 `finally` 丢失 Repository 引用的问题：现在只有 `repository.destroy()` 同步成功后才清空所有权并进入 destroyed；首次清理失败保留原状态与同一绑定方法，修正外部故障后可精确重试。Input Pilot Workspace/Controller 定向 Node 回归 26/26、完整 Node 测试 691/691、strict package/治理测试 332/332 通过；新增 3 项 strict 回归覆盖方法访问器零执行、CAS 回执原子拒绝/重试和销毁失败所有权保留。
- 代码提交为 `e778eeb8ddafe0246da98980724e095ae0981c7a`，clean build ID 为 `arena-e778eeb8ddaf-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验和预算通过且 `freezeEligible=true`；交付字节与 G7.7 完全一致，本研究协调批次未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构、Product bundle 或游戏玩法，因此未新增浏览器/手机通过记录，也未重跑与本批路径无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Repository、Report/Evidence、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.9 Input Pilot Workspace Repository strict 迁移证据

- Workspace Repository 的 JavaScript 真值已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 234 降至 233。Trial Controller、Pilot Web App 与持久化测试统一从包公开 API 消费，旧实现已删除且没有 JavaScript 转发层。
- Repository options 现在先验证唯一自有数据字段且访问器零执行，再取得同步 Storage Port、四个稳定存储键和 Storage Lease。Repository 继续使用双槽、advisory head、generation/payload hash、同 generation 冲突拒绝、最新合法槽恢复、未来嵌套 schema 保护和租约持有检查；内存 revision、存储 revision 与 CAS expected revision 三者不一致时不会覆盖外部数据。
- 修复了宿主 `storageWrite` 已实际落盘但随后抛错时的恢复缺口：目标槽写入无论返回 false 或抛错都执行权威读回；只要 schema、payload hash 和 revision 精确匹配就完成内存提交。head 写入是非权威提示索引，返回 false 或先写后抛只使 `headUpdated=false`，不否定已读回确认的槽提交。这避免下次加载到更高 generation 后把当前实例永久卡在 `storage-revision-mismatch`。
- Input Pilot Repository/Controller/Web 支持定向 Node 回归 33/33、完整 Node 测试 691/691、strict package/治理测试 334/334 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界与 `git diff --check` 均通过。新增 2 项 strict 回归覆盖构造 options 访问器零执行，以及 slot/head 先写后抛仍以读回结果完成一致提交。
- 代码提交为 `d515a5a3dfb440e836cfe53225d38f6e48b3d6d0`，clean build ID 为 `arena-d515a5a3dfb4-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验和预算通过且 `freezeEligible=true`；交付字节与 G7.8 完全一致，本研究持久化批次未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构、Product bundle 或游戏玩法，因此未新增浏览器/手机通过记录，也未重跑与本批路径无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Report/Evidence、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.10 Input Pilot 评估 Report strict 迁移证据

- Input Pilot 评估报告的 JavaScript 真值已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 233 降至 232。Report 的页面导出、Release Evidence 和对应测试统一从包公开 API 消费；旧实现已删除，没有 JavaScript 转发层。
- Report 继续按 enrollment index 和 trial ID 的确定性顺序生成 source hash，逐 variant 汇总入组、排除原因、首次有效操作、动作成功率、观察项、单手完成率、目标完成率和理解正确率，并只在主指标差距与次指标一致时给出候选。迁移保持原有逐字符 trial ID 排序，未引入依赖区域设置的 `localeCompare`；足量样本下所需指标仍必须存在，异常数据 fail closed。
- 修复了旧实现直接 `recordValues.map(...)` 会执行数组索引访问器的问题：报告现在先用确定性数据合同深拷贝并冻结整个输入数组，稀疏数组、访问器、循环引用和非确定性值都在任何 getter 执行前拒绝。新增 strict 回归证明数组索引访问器读取次数为零。
- Input Pilot Report/Release Evidence 定向 Node 回归 9/9、完整 Node 测试 691/691、strict package/治理测试 335/335 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、`git diff --check` 和生产构建均通过。
- 代码提交为 `edb9cbfdd2373e07957bea5a50d9d909fdeafd7f`，clean build ID 为 `arena-edb9cbfdd237-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.9 完全一致，本离线研究评估批次未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构、Product bundle 或游戏玩法，因此未新增浏览器/手机通过记录，也未重跑与本批路径无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Evidence/Export、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.11 Input Pilot Export 与 Evidence Bundle strict 迁移证据

- Input Pilot 的 pseudonymous Audit Export、identity-free Aggregate Export 与 Evidence Bundle 已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 232 降至 230。Trial Controller、研究 Web App、Release producer、Node 验证器和测试均直接消费包公开 API；两个旧 JavaScript 真值已删除，没有兼容转发层。
- Export 继续重建并核对固定 Definition、workspace revision、严格递增 enrollment、record count、source hash 和 Report，活动 trial 存在时拒绝终态审计导出；Aggregate 不包含 participant ID。Evidence Bundle 继续绑定 40 位 commit、受限 build ID、8 位 build manifest hash 和可完全重算的 Audit Export。宿主下载、文件读取、Build Manifest 打开和 Release 裁决仍在上层，strict 领域包没有取得 DOM、Node I/O 或网络副作用。
- Audit Export 与 Evidence Bundle 都先通过确定性数据合同快照外部值；新增 2 项 strict 回归证明外部访问器读取次数为零。定向 strict 回归 23/23，Export/Evidence/Controller/Web 支持 Node 回归 16/16，完整 Node 测试 691/691，strict package/治理测试 337/337 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、本地生产依赖树、`git diff --check` 和生产构建均通过。
- 包依赖只新增仓内既有 `@number-strategy-jump/arena-evidence-contracts`，`package-lock.json` 没有新增或升级外部包。尝试重新执行联网 `npm audit --omit=dev --audit-level=high` 时，安全策略因其会向 npm 服务发送项目依赖元数据而拒绝授权；本批不把该项写成新通过，G8/CI 仍须在获授权环境执行正式生产依赖审计。
- 代码提交为 `fe6f00ce1407e2a28bb65965bfc30bbeee6ff8e0`，clean build ID 为 `arena-fe6f00ce1407-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.10 完全一致，本研究证据合同未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构、Product bundle 或游戏玩法，因此未新增浏览器/手机通过记录，也未重跑与本批路径无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Pilot 指标/运行时/Controller、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.12 Input Pilot Action Metrics 与 Metric Collector strict 迁移证据

- Input Pilot 的动作指标和逐 tick 指标收集器已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 230 降至 228。Presentation Runtime 与指标回归直接消费包公开 API，两个旧 JavaScript 真值已删除，没有兼容转发层。
- Collector 仍只消费规范化 InputFrame、比赛只读快照和权威事件，使用 active tick 计算时长，按配置的 `effectiveMovementDistance` 判定首次有效移动，并区分地面跳、空中跳、下砸的尝试与权威成功事件；没有写入 MatchCore、装备、移动或胜负状态。每 tick 只投影本地参与者的位置/落地/动作 affordance 和事件标量，不深拷贝整场快照，避免给手机运行增加与地图、角色数和事件历史成比例的重复开销。
- 修复了证据身份缺口：step 前后 `matchSeed` 除了必须相同，现在还必须等于当前 Input Pilot Assignment 的 `matchSeed`，测试夹具同步改为真实 Assignment seed，错误比赛不能污染试验记录。修复了部分提交缺口：外部 options、快照字段、参与者数组和事件字段先在 observe reentrancy guard 内通过自有数据描述符投影，事件访问器读取次数为零；全部校验和派生成功后才一次提交 tick、时长、移动与动作累计状态，异常后同 tick 状态保持可重试。
- 包级定向回归 24/24、Metric/Presentation Runtime Node 回归 15/15、完整 Node 测试 691/691、strict package/治理测试 338/338 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、本地依赖树、`git diff --check` 和生产构建均通过。包依赖只新增仓内既有 `arena-match` 与 `arena-v1-content`，锁文件没有新增或升级外部包；联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。
- 代码提交为 `bbaeca4fd9d813b41f56fa56fc4a5e3b4462ed8d`，clean build ID 为 `arena-bbaeca4fd9d8-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.11 完全一致，本研究指标链未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构或游戏玩法，不改变 Gameplay V2 配置 hash `8c322912`、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Observed Session/Match Service、Presentation Runtime、Trial Controller、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.13 Input Pilot Observed Session 与 Match Service strict 迁移证据

- Input Pilot 的只读会话包装器与一次性 Match Service 已迁入 `@number-strategy-jump/arena-input-pilot`，精确允许清单由 228 降至 226。Presentation Runtime 和 Runtime 回归直接消费包公开 API；两个旧 JavaScript 真值已删除，没有兼容转发层。
- Observed Session 继续只把 delegate 已提交的 before snapshot、实际 consumed input、after snapshot 与 events 交给 Metric Collector；暂停且未推进的 step 必须保持 `input=null/events=[]`，不会制造指标。正式 Session 合同返回的顶层冻结快照走零复制快速路径，可变测试替身或外部适配值才在研究边界复制冻结，避免每 tick 重复遍历整张地图。`runUntilEnded` 增加独立运行 guard，input provider 不能重入 step、暂停、快照或销毁。
- Session/Collector/MatchService 的方法现在通过原型数据描述符在构造时取得并绑定，方法访问器读取次数为零，后续替换不能劫持 start/pause/step/observe/destroy。Match 返回值的 session、matchSeed 和 opponent 必须是自有数据字段；opponent 访问器零执行且创建回滚会销毁已取得 session。
- 修复了两处资源所有权丢失：Session 的业务操作失败或显式 destroy 失败时保留原 delegate 与绑定 destroy，实例停止服务但允许精确清理重试；Match Service 创建回滚或 destroy 失败时保留 pending cleanup port，`hasSession=true` 如实暴露仍持有资源，成功重试后才释放 MatchService/Collector 并进入 destroyed。原始错误与清理错误继续分别保留。
- 包级定向回归 26/26、Observed/Presentation Runtime Node 回归 15/15、完整 Node 测试 691/691、strict package/治理测试 340/340 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、`git diff --check` 和生产构建均通过。本批没有新增或升级依赖，联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。
- 代码提交为 `5dcfd9dd5eeba3e17e3486a74512ef318ca0e5b9`，clean build ID 为 `arena-5dcfd9dd5eeb-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.12 完全一致，本研究观察链未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构或游戏玩法，不改变 Gameplay V2 配置 hash `8c322912`、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Presentation Runtime、Trial Controller、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.14 Input Pilot Presentation Runtime strict 迁移证据

- Input Pilot 表现运行时已从 `src/arena/presentation/session` 迁入独立上层 strict `@number-strategy-jump/arena-input-pilot-presentation`，精确允许清单由 226 降至 225。该包显式依赖 Pilot 领域、Arena V1 组合和隔离 Greybox Session，不把 Greybox/Application 依赖反向压入低层 `arena-input-pilot`；研究 Web App 与 Node 回归统一从包公开 API 消费，旧 JavaScript 真值已删除且没有兼容转发层。
- Runtime options、session options、trial 和工厂 Port 均先以自有数据描述符校验；访问器 options 和方法读取次数为零，start/pause/destroy 等方法在构造期绑定，后续替换不能劫持已取得生命周期。表现 `state` 读取器固定原始数据字段或类 getter：正常状态仍可动态变化，数据字段在运行期被替换为访问器时会在不执行 getter 的前提下拒绝。
- Runtime 继续固定 Assignment match seed 和 mapper，串接 Metric Collector、Observed Match Service、一次性 Assigned Match Service 与 Greybox 表现会话。自定义 Collector/Presentation 工厂返回不完整 Port 时，会在抛出合同错误前调用已取得的 destroy；诊断回调保持观察性，失败回调异常不能取得 Runtime 生命周期。最终指标使用显式已冻结标记缓存，不再把合法假值误判为未完成。
- 修复了依赖清理顺序与重试所有权：Assigned Match Service 只有在底层 destroy 成功后才清空已绑定方法；Presentation Runtime 的上层表现资源清理失败时进入 failed、保留同一 destroy 并停止继续拆除其 Match Service/Collector，下一次 destroy 从失败点重试。每一层只有成功释放后才移交下一层，全部完成后才进入 destroyed，避免半清理对象继续运行或底层依赖被提前销毁。
- 严格包/治理测试 345/345、完整 Node 测试 691/691 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、本地生产依赖树、`git diff --check` 和生产构建均通过。新增 5 项严格回归，其中 4 项覆盖 Runtime 的依赖清理重试、方法绑定/状态访问器零执行、options 访问器零执行及无效工厂产物回收，1 项覆盖 Assigned Match Service 销毁失败后的同一所有权重试。
- 新 package 与根 workspace 只新增仓内依赖，没有新增或升级外部包。`npm ls --omit=dev --all` 通过；正式联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态，不能用本地安装命令输出的开发依赖告警替代该结论。
- 代码提交为 `de7711fa32d3daaf0d0a837cedad567b001cf823`，clean build ID 为 `arena-de7711fa32d3-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.13 完全一致，本研究表现运行时未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构或游戏玩法，不改变 Gameplay V2 配置 hash `8c322912`、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Trial Controller、Study 其余领域和两个研究 Web App/薄入口仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.15 Input Pilot Trial Controller strict 迁移证据

- Trial Controller 已从误导性的 `src/arena/presentation/pilot` 路径迁入 host-free strict `@number-strategy-jump/arena-input-pilot`，精确允许清单由 225 降至 224。Controller 只编排 Definition、Workspace Coordinator、Runtime Port、Trial 状态转换与 Export，不依赖具体 Renderer、Greybox Session、Three.js、DOM、平台 API、墙钟或非注入随机；Pilot Web App 和 Node 回归统一从包公开 API 消费，旧 JavaScript 真值已删除且没有兼容转发层。
- Controller options、入组、复核和 Runtime/Status Port 均通过自有数据描述符与已迁移 strict 构造器验证，访问器输入零执行。Runtime Factory 产物先取得并绑定 destroy，再校验 start/pause/status/finalize；不完整产物会在拒绝前回收。复核 submission 现在只接受真实 boolean `invalidate`，不再用 `Boolean()` 把数字、字符串或对象折叠成合法终态/幂等 hash。
- 修复了 Runtime 与 Workspace 的依赖清理所有权：Controller 不再在调用 destroy 前清空 Runtime 引用，也不会在 Runtime 清理失败后继续销毁其 Workspace 依赖。首次清理失败进入 failed、保留同一绑定资源与可读 Workspace 快照；故障修正后再次 destroy 从失败层重试，全部成功后才清空 Definition/Factory 并进入 destroyed。打开、heartbeat、启动、作废失败的 fatal 路径使用同一逆序清理规则。
- 复核或作废记录已经 CAS 落盘、但 Runtime 随后清理失败时，不再把 Controller 留在可继续入组/提交的 reviewing/terminal 假成功状态：Controller fail closed，同时保留已提交 reviewing/terminal Workspace 和 Runtime 清理所有权，只允许显式 destroy 重试；下一实例仍可从持久化 checkpoint 审计恢复。Runtime 在 finalize 期间同步报告失败时先冻结首个 failure，再阻止正常复核提交，避免转换重入形成双记录。
- 启动异步窗口增加持久暂停意图：`startTrial()` 已进入 starting 但 Runtime 尚未由微任务创建时，`setPaused(true)` 不再返回成功却丢失操作；Runtime 完成 start 后会应用最新暂停意图。销毁请求继续阻止迟到的 start Promise 复活 Controller，同一 start Promise 仍去重并在 finally 释放。
- Pilot 严格定向测试 33/33、Pilot Controller/Runtime/Web 支持 Node 回归 26/26、完整 Node 测试 691/691、strict package/治理测试 351/351 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、`git diff --check` 和生产构建均通过。新增 6 项严格回归覆盖无效 Runtime 回收、Controller options 访问器零执行、一般销毁失败重试、复核落盘后清理失败、启动前暂停保留和非布尔幂等提交拒绝。架构门禁同步改为审计新的 strict Pilot 源目录，不再把已删除空目录当成保护对象。
- 本批没有新增或升级依赖；正式联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。代码提交为 `e5cd21c7acb8ebbd8a7cb3c4f9e3625320a609d4`，clean build ID 为 `arena-e5cd21c7acb8-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.14 完全一致，本研究控制器未进入默认 Product bundle。
- 本批没有改变 Pilot 页面结构或游戏玩法，不改变 Gameplay V2 配置 hash `8c322912`、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Study 其余领域、两个研究 Web App/薄入口和 Release/测试链仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G6.48 Pilot/Study Web 薄启动入口 strict 迁移证据

- `web-input-pilot` 与 `web-human-match-study` 两个研究薄启动入口已迁为 strict TypeScript，精确允许清单由 224 降至 222；`pilot.html`、`study.html` 显式引用 `.ts` 真值，旧 JavaScript 入口已删除且没有运行时转发层。两个入口只创建已治理 Web Platform、调用统一 `launchGame`、构造对应研究 Web App，并复用统一成功清屏与可访问失败面板，不拥有研究状态、比赛、渲染或持久化规则。
- `launchGame` 的插件式 options 合同刻意接受 unknown callback，因此入口显式把 createPlatform 结果收窄为 `ArenaPlatformContract`，错误保持 unknown 直至统一错误面板处理。为尚待迁移的两个大型 JavaScript Web App 增加同名 `.d.ts` 迁移边界，只声明 constructor/start/destroy/getSnapshot，不生成运行时代码、不掩盖 JS 计数，也不宣称 App 已 strict；对应 App 迁移时必须删除这两个临时声明。
- 两个入口完成独立 browser/ESM bundle smoke；Pilot/Study HTML 与 Web 支持定向 Node 回归 17/17、完整 Node 测试 692/692、strict package/治理测试 351/351 通过。ESLint、strict typecheck、JS 递减、产品依赖、Three 边界和 `git diff --check` 均通过；新增 HTML 回归锁定 `.ts` 入口并拒绝退回 `.js`。
- 本批没有新增或升级依赖。代码提交为 `a35d81f14d5a93d53332df70a92e3f8dad5a3df8`，clean build ID 为 `arena-a35d81f14d5a-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.15 完全一致，`pilot.html`、`study.html` 及两个研究入口仍不进入默认 Product bundle。
- 本批没有改变研究页面布局、Pilot/Study 数据或游戏玩法，不改变 Gameplay V2 配置 hash `8c322912`、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Bot、权威 tick、Replay/Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。两个研究 Web App 仍是 G6 阻断项；G7-G10 尚未完成，当前不可合并。

## G7.16 Arena Stage 9 真人公平性 V1 内容定义 strict 迁移证据

- Arena Stage 9 真人公平性 V1 定义已从 `src/arena/study` 迁入 strict `@number-strategy-jump/arena-human-match-study`，精确允许清单由 222 降至 221。CLI、证据验证器、Release producer/handoff、Study Web App 和测试统一从包公开 API 消费；旧 JavaScript 真值已删除，没有兼容转发层。
- V1 内容继续明确绑定 Arena V1 角色/地图/装备池、easy/normal/hard 三个 Bot 难度臂、每位参与者 3 场比赛、匿名质量字段和随机展示顺序；接受的内容 hash 保持 `484492a6`。新增 strict 回归锁定 hash、arm 顺序、比赛数和冻结的 arm ID，不以文档手抄值替代运行时代码真值。
- 定向真人研究/发布 Node 回归 28/28、完整 Node 测试 692/692、strict package/治理测试 352/352 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、本地生产依赖树、`git diff --check`、生产构建和生产产物边界均通过。包依赖只新增仓内既有 `arena-match` 与 `arena-v1-content`，锁文件没有新增或升级外部包；联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。
- 代码提交为 `9ca0d7e595b21981cb4c555e03a1e428926abd2a`，clean build ID 为 `arena-9ca0d7e595b2-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G6.48 完全一致，本离线研究内容定义未进入默认 Product bundle。
- 本批没有改变研究页面、游戏玩法或 Bot 实现，不改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、权威 tick、Replay/Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Study Record/Capture Package/Workspace/Repository/Report/Release 链及两个研究 Web App 仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.17 真人研究 Submission/Record strict 迁移证据

- 真人研究 Submission/Record 合同已迁入 strict `@number-strategy-jump/arena-human-match-study`，精确允许清单由 221 降至 220。Capture Package、Bundle、Workspace/Controller、Report、Replay Verifier、Study Web App 和测试全部从包公开 API 消费；旧 JavaScript 真值已删除，没有兼容转发层。
- Record 显式区分预注册环境与真实观测环境：真实平台、设备形态、方向和输入模式保留受限字符串，后续由协议排除规则与 Definition 对照，不用不真实的枚举断言掩盖环境偏差。Submission、Eligibility、Replay Artifact、Self Report、Match 和终止状态均提供只读 strict 类型；completed 仍要求完整预注册场次和终局自评，seed、隐藏难度、对手、Replay schema、winner 与证据路径/hash/字节继续逐项复核。
- Record 输入先经确定性深拷贝冻结，新增 strict 回归证明顶层访问器读取次数为零；观测环境差异仍生成排除原因，不污染预注册 Definition。定向真人研究/发布 Node 回归 28/28、完整 Node 测试 692/692、strict package/治理测试 353/353 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、本地生产依赖树、`git diff --check`、生产构建和生产产物边界均通过。
- 包依赖只新增仓内既有 `arena-evidence-contracts`，锁文件没有新增或升级外部包；联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。代码提交为 `789d39850c658fe53f0120b917f489e57841fb7d`，clean build ID 为 `arena-789d39850c65-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.16 完全一致，本研究记录合同未进入默认 Product bundle。
- 本批没有改变研究页面、游戏玩法、Bot 或运行时生命周期，不改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、权威 tick、Replay/Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Study Capture Package/Bundle/Workspace/Repository/Report/Release 链及两个研究 Web App 仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.18 真人研究 Bundle strict 迁移证据

- 真人研究 Bundle 合同已迁入 strict `@number-strategy-jump/arena-human-match-study`，精确允许清单由 220 降至 219。证据 CLI/验证器、Release producer 和测试统一从包公开 API 消费；旧 JavaScript 真值已删除，没有兼容转发层。
- Bundle 继续重建每条 Record，并约束同一 commit/build、`createdAt` 不早于记录、record/participant/assignment/enrollment/match seed/replay artifact ID 与路径全局唯一、enrollmentIndex 从 0 连续，最终按 enrollmentIndex/recordId 稳定排序并冻结。动态 Set 索引已改为显式有类型集合，避免错误集合名在 strict 迁移中被隐式接受。
- 新增 strict 回归证明 Bundle 顶层访问器读取次数为零。真人研究/Release 定向链和完整 Node 测试 692/692、strict package/治理测试 354/354 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、`git diff --check`、生产构建和生产产物边界均通过。本批没有新增或升级依赖；联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。
- 代码提交为 `57813f702120027bef9fa17b3d7bccbc67e29878`，clean build ID 为 `arena-57813f702120-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.17 完全一致，本离线 Bundle 合同未进入默认 Product bundle。
- 本批没有改变研究页面、Capture、游戏玩法、Bot 或运行时生命周期，不改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、权威 tick、Replay/Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的 Gameplay 黄金 Replay、输入 fuzz、专项生命周期或 soak。Study Capture Package/Workspace/Repository/Report/Release 链及两个研究 Web App 仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.19 统一 Replay 验证与真人研究 Capture Package strict 迁移证据

- `arena-match` 既有 Replay 验证器已作为 `validateArenaReplay` 公共只读合同发布，Capture Package 不再维护一套仅检查三个数组存在的弱验证；真人研究 Capture Package 已迁入 strict `@number-strategy-jump/arena-human-match-study`，精确允许清单由 219 降至 218。Workspace Controller、证据 CLI/验证器和测试统一从包公开 API 消费，旧 JavaScript 真值已删除且没有兼容转发层。
- Capture Package 继续绑定 Submission、连续 matchIndex、预注册 seed、天然隐藏难度、正式对手、Product result 与 Replay 重建结果，并以稳定身份 hash 生成 packageId。现在还完整执行 Replay schema/已知字段/uint32 seed/config/result/hash/严格递增 checkpoint 及 tick 0 初始 checkpoint 验证；两个旧 Workspace 夹具因缺少 tick 0 checkpoint 被正确拒绝并修成合法 Replay，没有降低生产合同迁就夹具。
- materialize 在读取 Replay Artifact 之前先确定性深拷贝冻结整个数组，稀疏项、索引访问器和额外字段均不会被业务代码提前执行。新增 Replay 与 Capture 顶层访问器零执行回归；架构门禁同步审计旧 Study 目录和 strict Study 包，不再用旧目录文件数量误判迁移失败。
- 真人研究/Release 定向测试 19/19、完整 Node 692/692、strict package/治理测试 356/356、黄金 Replay 4/4（manifest `0dace228`）、输入 fuzz 120 场/6 次 Replay/120 个唯一 final hash 均通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、本地生产依赖树、`git diff --check`、生产构建和生产产物边界均通过。本批没有新增或升级依赖；联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。
- 代码提交为 `0245a634d8f85731404be07b026545293195f2d6`，clean build ID 为 `arena-0245a634d8f8-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.18 完全一致，本研究证据链未进入默认 Product bundle。
- 本批没有改变研究页面、游戏玩法、Bot、Replay schema 或权威运行结果，不改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节、Profile schema 或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的专项生命周期或 soak。Study Workspace/Repository/Report/Replay Verifier/Release 链及两个研究 Web App 仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.20 真人研究 Checkpoint/Receipt/Workspace strict 迁移证据

- 真人研究 Checkpoint、Package Receipt、归档 Receipt 与 Workspace 状态合同已迁入 strict `@number-strategy-jump/arena-human-match-study`，精确允许清单由 218 降至 217。Envelope、Repository、Controller、证据 CLI/验证器、Study Web App 与测试统一从包公开 API 消费；旧 JavaScript 真值已删除，没有兼容转发层。
- 状态合同继续约束 enrolled/running/reviewing/recovery-required/export-pending 的终态、完成局数和 package receipt 组合；completed 必须覆盖全部预注册比赛，recovery-required 必须是零局 running-recovered 作废，归档时间不能早于入组时间。Workspace 保持连续 enrollment、participant/trial/package/hash 唯一、revision 不低于已覆盖 enrollment，并冻结全部输出。
- `createEnrolledHumanMatchStudyCheckpoint` 与 `advanceHumanMatchStudyWorkspace` 不再在函数参数解构阶段读取外部对象；options 先经过确定性深拷贝和已知字段检查。新增 strict 回归证明 enrollment/transition 访问器读取次数为零。定向真人研究/Release 测试 19/19、完整 Node 692/692、strict package/治理测试 357/357 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、本地生产依赖树、`git diff --check`、生产构建和生产产物边界均通过。
- 本批没有新增或升级依赖；联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。代码提交为 `3e14eed3ccc06530bc7fa27f146ec7a7c3d6144d`，clean build ID 为 `arena-3e14eed3ccc0-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.19 完全一致，本研究状态合同未进入默认 Product bundle。
- 本批没有改变研究页面、Capture、游戏玩法、Bot、Replay/Profile schema 或运行时生命周期，不改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的黄金 Replay、输入 fuzz、专项生命周期或 soak。Study Envelope/Repository/Controller/Report/Replay Verifier/Release 链及两个研究 Web App 仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。

## G7.21 真人研究 Workspace Envelope strict 迁移证据

- Workspace Envelope 已迁入 strict `@number-strategy-jump/arena-human-match-study`，精确允许清单由 217 降至 216。Repository 与测试直接消费包公开 API；旧 JavaScript 真值已删除，没有兼容转发层。
- Envelope 继续绑定 Definition 身份、Workspace revision/generation 和可重算 payload hash，验证后只返回重新构造的规范 Envelope 与 Workspace。未来 schema 探针显式区分普通记录、数组和原始值，递归保护 Envelope、Workspace、active Checkpoint、Receipt 及其 Assignment schema；损坏旧数据允许由 Repository 尝试备用槽，任何未来嵌套 schema 仍 fail closed。
- 新增 strict 回归证明版本探针遇到访问器时不执行 getter，并拒绝未来 Workspace schema。Workspace 定向测试 4/4、完整 Node 692/692、strict package/治理测试 358/358 通过；ESLint、strict typecheck、JS 递减、产品依赖、Three 边界、本地生产依赖树、`git diff --check`、生产构建和生产产物边界均通过。本批没有新增或升级依赖；联网生产依赖审计仍保持 G7.11 已登记的 G8 外部门禁状态。
- 代码提交为 `203f51eb918e9890fae998899836e5022f91876e`，clean build ID 为 `arena-203f51eb918e-product`；Web/微信/抖音 delivery 为 `3807531 / 3835130 / 3835105 B`，JavaScript 为 `1463921 / 1507034 / 1507034 B`。三端 `sourceDirty=false`、默认入口均为 Product、Manifest 校验、预算和生产产物边界通过且 `freezeEligible=true`；交付字节与 G7.20 完全一致，本持久化值合同未进入默认 Product bundle。
- 本批没有改变 Repository 写入、研究页面、游戏玩法、Bot、Replay/Profile schema 或运行时生命周期，不改变 Gameplay V2 配置 hash `8c322912`、任意距离挥空、攻击/命中/击退、动作/武器、移动/跳跃、画质、关节或正式资产，因此未新增浏览器/手机通过记录，也未重跑无关的黄金 Replay、输入 fuzz、专项生命周期或 soak。Study Repository/Controller/Report/Replay Verifier/Release 链及两个研究 Web App 仍待 strict 迁移；G7-G10 尚未完成，当前不可合并。
