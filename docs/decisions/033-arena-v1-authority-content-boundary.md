# ADR-033：Arena V1 具体权威内容使用独立 strict 包

- 状态：已接受并实施
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 实施提交：`bf4653ebcee1301c102b2d398433fd8b1ea3d88a`

## 背景

Arena 的 Action、Equipment、Character、Map、Movement Action 与平衡配置已经分别具备 Definition、Registry 和统一 Gameplay Tuning，但具体 V1 内容仍位于 `src/arena/content`。这使底层权威组合、实验、回放、研究、Product 和 Presentation 都通过应用相对路径读取同一批文件，包依赖图无法表达“规则结构”和“产品具体内容”的区别，也无法阻止具体内容意外取得 MatchCore、Bot、宿主或表现生命周期。

Product 内容池解决的是每局允许哪些稳定 ID，Presentation 内容解决的是如何把权威快照投影成角色、武器和地图表现；两者都不应成为具体攻击、装备、角色或地图 Definition 的第二真值。若继续把这些数据留在应用目录，后续新增武器或地图很容易在 Product、Presentation 或实验代码中复制数值并产生 hash 漂移。

## 决策

### 独立权威内容层

Arena V1 具体权威内容统一由 strict workspace `@number-strategy-jump/arena-v1-content` 发布：

```text
统一 Gameplay Tuning + Definition/Registry 合同
                       ↓
             arena-v1-content
      Action / Equipment / Character / Map
        Movement Action / Balance Definition
                       ↓
      Rule/Core 组合与每局内容选择
                       ↓
       Bot / Replay / Product / Presentation
```

本包只包含不可变 Definition、稳定内容 ID、初始生成点和只读 Registry 工厂。它不持有 MatchCore、Runtime State、Bot、Session、Replay、Product、Renderer、平台或宿主生命周期。

### 唯一数值真值

攻击范围、攻击速度、起手/收手/僵直、击退、角色移动速度和跳跃能力继续由 `ARENA_GAMEPLAY_V2_TUNING` 及底层 Definition 合同统一管理。`arena-v1-content` 把这些配置编译为 Action/Equipment/Character/Map Definition；对局命数由本包的 `ARENA_V1_BALANCE_DEFINITION` 单独持有，地图几何、事件和生成点由对应 Map/Content Definition 单独持有。每类数值只有一个明确所有者，不在 Product 或 Presentation 中复制权威数值。

Product 内容包只选择和冻结稳定 ID；Presentation 内容包只能读取注入的权威 Definition/快照并附加表现语义。任何表现参数不得反向决定命中、位移、淘汰或胜负。

### 依赖与输入边界

允许依赖仅为底层数据合同、Definition/Registry、地图事件种类、比赛固定 tick 常量和移动动作合同。禁止依赖 MatchCore、Bot、Session、Product、Presentation、Renderer、Three.js、DOM、平台 API、墙钟和未注入随机源。

Registry 工厂在取得资源前先验证精确 options 字段，并复制、校验、冻结调用方数据；访问器、Symbol、未知字段、重复 ID、未知装备和悬空 Action 引用失败关闭。运行期不能向 Registry 注册或替换内容。

### 扩展规则

新增角色、装备、地图或动作时：

1. 先在统一 Gameplay Tuning 或底层 Definition 合同中声明可配置数据；
2. 在 `arena-v1-content` 新增具体不可变 Definition，并通过 Registry 完整性测试；
3. 在 Product Catalog/Pool 中登记可选择 ID；
4. 在 Presentation Content 中独立登记外观、动画或音频语义；
5. 更新内容 hash、Replay/压力与资产证据，不修改 Resolver 的同类分支。

发布后删除稳定 ID 仍遵守 ADR-017 的替代记录与 Profile 迁移规则。

## 被否决方案

### 继续保留 `src/arena/content`

应用相对路径不能形成 workspace 级依赖门禁，具体内容容易被上层生命周期和宿主能力污染，也无法在新增内容时明确所有权。

### 把具体权威内容并入 `arena-definitions`

`arena-definitions` 应提供通用 schema、Registry 和统一配置合同。并入具体 V1 Catalog 会让所有底层消费者被迫依赖产品版本内容，阻碍未来 Mode 或内容版本并存。

### 把数值放入 Product 或 Presentation 内容包

Product 负责选择，Presentation 负责表现；两者若拥有攻击或移动数值，会形成与 Rule/Core 不一致的第二真值，并破坏 Replay hash 与无渲染验证。

## 后果

正面：

- 具体 V1 内容有独立、可测试、可审计的所有权边界；
- Rule/Core、实验、回放、Product 和 Presentation 通过同一公开 API 消费；
- 新内容可以按 Definition → Product ID → Presentation 语义扩展，不复制权威数值；
- TypeScript、架构测试、黄金回放和压力门禁共同防止内容漂移。

代价：

- 新内容需要同时登记权威 Definition、产品 Catalog 和表现语义；
- 包依赖与源文件集合被精确门禁锁定，扩展时必须显式更新架构测试；
- 长时内容压力需要额外运行时间，Bot 全量门禁还需补充进度心跳以改善可观测性。

## 生效证据

- 7 个旧 JavaScript 内容真值已迁为 strict TypeScript，精确允许清单由 313 降至 306；
- 新包 3 项测试和全仓 677 项 Node、253 项 strict package/治理测试通过；
- 黄金 Replay manifest 保持 `0dace228`；地图、移动、Bot、输入 fuzz 和生命周期 soak 全部通过；
- clean build `arena-bf4653ebcee1-product` 的三端预算通过且 `freezeEligible=true`；
- 完整数值与浏览器组合证据见 [Arena 企业治理状态台账 G5.30b](../governance/arena-enterprise-governance-status.md#g530b-arena-v1-权威内容-strict-分层证据)。
