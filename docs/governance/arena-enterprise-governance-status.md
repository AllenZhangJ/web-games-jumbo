# Arena 企业治理状态台账

- 更新时间：2026-07-21
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
| G3 Rule/Core/Replay | 已完成 | strict TS `arena-core`、`arena-movement`、`arena-physics`、`arena-equipment`、`arena-map` 与 `arena-match` 已承接规则/移动/物理/装备、完整地图权威链、比赛配置、Participant/Timeline 唯一写入者、角色 Runtime/物理投影、状态 hash、完整 MatchCore 编排、fixed-step Runtime 与 Replay；黄金语料保持 `0dace228` |
| G4 Bot/Product/Persistence | 进行中 | strict TS Bot、Matchmaking、Quick Match、Local Match Session、Product State、Progression 纯成长合同、ProductMatchResult 与奖励事务已闭环；Profile Service/Repository、Product 其余层与 Persistence 仍待分批迁移 |
| G5 Presentation/资产/反馈 | 未开始 | 正式资产预算通过；审批字段与唯一正常路径仍待治理 |
| G6 Platform/入口/构建 | 未开始 | 三端默认入口是 Product，但生产交付未与开发页面彻底隔离 |
| G7 零 JS/完整质量门 | 未开始 | ESLint、strict TypeScript、Vitest 和 JavaScript 精确递减门禁已作为迁移护栏运行；coverage 阈值、测试归包和零 JS 尚未完成 |
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

1. 当前 419 个受维护 JavaScript 文件仍在精确允许清单中，Profile Service/Repository、Product Match/Controller/Composition、Presentation/Platform 和 Arena V1 应用组合适配尚未完成 strict TypeScript workspace 迁移。
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
