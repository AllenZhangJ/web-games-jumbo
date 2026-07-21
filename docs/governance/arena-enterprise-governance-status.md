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
| G3 Rule/Core/Replay | 进行中 | 已建立 strict TS `arena-core` workspace，动作状态、候选、Resolver 与 Affordance 投影已迁入；Execution、Rule、Movement、Physics、Equipment、Map、MatchCore、Replay 仍待迁移 |
| G4 Bot/Product/Persistence | 未开始 | 当前功能与压力证据存在，尚未迁入 strict TS workspace |
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

1. 当前 496 个受维护 JavaScript 文件仍在精确允许清单中，Rule/Core/Replay、Bot/Product/Persistence/Presentation/Platform 尚未完成 strict TypeScript workspace 迁移。
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
