# ADR-034：Arena V1 应用组合根使用独立 strict 包

- 状态：已接受并实施
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 实施提交：`583012b451e9691a791f3af75f3ddbef2a3d7073`

## 背景

Arena 的通用 Definition、MatchCore、Bot、Quick Match、Product State/Session、具体 V1 权威内容和表现内容都已进入 strict workspace，但具体 V1 如何把内容、规则、地图、移动、比赛和 Product 组合起来仍散落在 `src/arena` JavaScript。该层不是通用 Rule/Core，也不是 Platform/Entry：它选择 Arena V1 内容版本，建立只读 Registry，向通用 Match/Product 工厂注入具体策略，并发布应用级构造 API。

若继续保留相对路径薄桥，TypeScript 无法证明组合依赖方向，调用方 Registry 也可能在校验后被替换方法或内容，形成检查与使用之间的竞态。反之，把具体组合直接塞回 MatchCore 或 Product 通用包，会让底层依赖 Arena V1 内容并破坏未来内容版本或 Mode 的扩展边界。

## 决策

### 独立应用组合层

具体 V1 应用装配统一由 strict workspace `@number-strategy-jump/arena-v1-composition` 发布：

```text
Definition / Arena V1 Content
              ↓
  Arena V1 Application Composition
  Registry Snapshot / Rule / Map / Match
  Movement / Quick Match / Product Adapter
              ↓
 Session / Replay / Bot Workload / Presentation Host
              ↓
        Platform / Entry
```

该包可以依赖已治理的合同、Definition、V1 内容、通用 Match/Map/Movement、Bot/Matchmaking、Quick Match 与 Product Composition；不得依赖 Presentation、Renderer、Three.js、Platform、Entry、DOM、宿主时钟、网络、研究/发布工具或未注入随机源。表现和宿主只能调用公开组合 API，不能反向进入权威判定。

### Registry 快照与失败关闭

应用组合根不保留调用方可变 Registry。注入对象的 `require/list` 必须是沿有限原型链可找到的数据方法，访问器不得执行；组合根取得 `list()` 的同步数组后，用底层 Registry 类型重建独立 Action、Equipment、Map 与 Character 快照。Equipment 快照必须使用同一 Action Registry 再次验证动作引用。

外部 options/config 只接受已知自有数据字段。访问器、Symbol、未知字段、异步伪装、无效内容选择和 Map/Character 不一致均在 MatchCore 取得运行资源前拒绝。构造完成后，调用方替换原 Registry 方法或数组不能改变已取得的对局内容。

### 单一数值与兼容出口

攻击范围、攻击速度、起手/收手/僵直、击退、移动和跳跃仍只由 Gameplay V2 Tuning 与 `arena-v1-content` Definition 编译；组合根只选择、验证和注入，不复制数值。`QuickMatchService` 作为存量兼容导出必须是 `ArenaV1QuickMatchService` 的同一实现别名，不维护第二套生命周期或默认值。

新增角色、武器、地图、动作或 Mode 时，先扩展 Definition/Registry 与 V1 内容，再在本组合层新增数据驱动的注册/策略；不得在 MatchCore、Renderer 或 Entry 增加同类硬编码分支。

## 被否决方案

### 保留 `src/arena` JavaScript 薄桥

相对路径无法形成 workspace 依赖门禁，也不能以 strict 类型和声明产物保护所有消费者；可变 Registry 还会保留校验后篡改窗口。

### 并入通用 `arena-match` 或 `arena-product-composition`

通用包不应依赖具体 Arena V1 内容、地图和规则版本。并入会造成依赖倒置，使未来 Mode、内容版本和无渲染测试无法独立组合。

### 让 Platform 或 Presentation 直接选择权威内容

宿主和表现层不能参与命中、位移、拾取、淘汰、随机或胜负内容的选择。直接装配会违反 `Rule → Core → Bot → Presentation` 顺序并产生多写入者。

## 后果

正面：

- Arena V1 具体应用装配有唯一 strict 所有者和公开 API；
- 注入 Registry 被重建为独立快照，消除方法替换和内容漂移窗口；
- 通用 Match/Product 与具体 V1 内容保持单向依赖，可继续扩展新内容版本；
- 架构、确定性、生命周期、压力和三端构建门能共同验证组合根。

代价：

- 新组合能力必须显式登记 package dependency、源文件集合和测试；
- 重建 Registry 有一次性构造成本，但不进入每 tick 热路径；
- Stage 6/Product Session 与 Entry 仍是独立 G6 宿主根债务，不能因本 ADR 完成而宣称 G6 或合并审计完成。

## 生效证据

- 9 个旧 JavaScript 真值已迁入 strict TypeScript，精确允许清单由 292 降至 283；
- 全仓 678 项 Node、301 项 strict package/治理与 104 项生命周期测试通过；黄金 Replay 保持 `0dace228`；
- 输入 fuzz、Presentation/Product Session soak、生产依赖审计和正式资产预算均通过；
- clean build `arena-583012b451e9-product` 三端预算通过且 `freezeEligible=true`；
- 完整数值与浏览器组合证据见 [Arena 企业治理状态台账 G6.36](../governance/arena-enterprise-governance-status.md#g636-arena-v1-应用组合根-strict-迁移与注入边界加固证据)。
