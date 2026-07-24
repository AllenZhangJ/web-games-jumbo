# Arena 长期开发约束

本文件适用于整个仓库。Arena 是唯一生产游戏；历史数值跳台 v3 只保留在 Git 历史中，不得继续作为源码、构建入口、存档合同或发布资产存在。治理迁移期间必须先建立行为映射和删除证据，再移除对应实现，禁止让旧产品重新成为默认入口或兼容分支。

## 产品与迁移边界

- 生产入口、产品文案、构建产物、验收和发布证据只允许指向 Arena Product。
- `greybox`、研究、Pilot、概念验证只允许存在于开发/测试工具链，不得进入生产交付清单；程序化角色只允许在正式资产加载失败时兜底，不能成为正常渲染路径。
- 当前没有真实用户数据迁移要求；不得因此省略 Profile schema、A/B 写入、CAS、租约、未来版本保护和失败关闭测试。
- 治理迁移目标是 strict TypeScript 工作区。迁移期间禁止新增受维护的 JavaScript；审计清单中的 JavaScript 文件只能逐批减少，最终生产源码、测试和治理脚本归零。
- 不以降低分辨率、抗锯齿、动作数量或关节数量换取性能通过；必须先移除无效计算、重复分配、错误补帧和生命周期泄漏，并用设备证据证明结果。

## 实现顺序

必须按 `Rule → Core → Bot → Presentation` 推进。表现层只能消费只读快照和权威事件，不能参与命中、拾取、淘汰、随机或胜负判定。

## 依赖方向

允许的方向是：

```text
Definition / State
        ↓
Registry / Resolver / System
        ↓
MatchCore
        ↓
Bot Observation / Replay / Session
        ↓
Renderer / UI / Audio
```

- Definition 是只含数据的不可变值；Registry 独立、只读并在组合阶段完成校验。
- Runtime Instance 与 Definition 分离；权威状态每类只允许一个写入者。
- 跨系统动作只能生成候选命令，由 `ActionResolver` 统一裁决；装备、Bot、Renderer 不得直接触发命中或位移。
- `ai` 只能读取受限观察并输出 `InputFrame`，不得依赖 MatchCore、Session、Replay、Renderer 或未来状态。
- Arena 权威层不得依赖 Three.js、DOM、平台 API、墙钟时间、`Math.random()` 或未注入的随机源。
- 禁止循环依赖、Manager 互相持有、通用事件总线和不断膨胀的工具类。跨模块通信优先使用显式参数、返回值、命令与稳定事件。

## 数据与扩展

- 新角色、装备、地图、动作、Buff、机关、Bot Profile 或 Mode 优先新增 Definition、处理策略和组合注册，不修改已有同类实现。
- 第三方能力必须包在项目接口后；引用或复制前固定 commit、核对许可证，并更新调研与第三方声明。
- 不为“以后可能需要”引入框架；只有可测量的复杂度或性能证据才能扩大依赖。

## 确定性与生命周期

- 所有权威时间使用整数 tick；随机使用 match seed 派生的具名流。
- 同配置、同 seed、同输入必须得到相同事件、回放和状态 hash。
- 构造失败需回收已创建资源；`start/pause/resume/destroy` 必须幂等或明确拒绝非法转换；失败后不得继续半可用运行。
- 可恢复输入错误应在权威状态变更前拒绝；tick 中途的未知错误应 fail closed 并清理。

## 阶段门禁

新增 Core 能力至少需要：Definition/Registry 校验、边界单测、确定性或回放测试、无渲染模拟，以及架构依赖检查。阶段完成前运行 `npm test`、相关 stress 脚本、`npm run build` 和 `git diff --check`；真机表现证据不能由 Node 测试替代。

## 治理批次协议

- 每个迁移批次必须在状态台账中写明范围、前置条件、行为映射、风险、验证证据、回滚点和未完成项。
- 每批按 `Rule → Core → Bot → Presentation → Platform` 的依赖顺序推进；不得为了类型迁移改变确定性 hash、Replay 语义或产品手感，除非有独立 ADR 和验收证据。
- 每批至少执行受影响测试、架构依赖检查、严格类型检查、构建与 `git diff --check`；阶段门禁还必须执行完整回归、压力/soak、资产和三端产物预算。
- 文档状态只能引用已存在的代码、命令输出、设备记录或固定 commit。计划、已实现、自动化通过、Web 验收通过和真机发布通过必须分开表述。
- 每批使用中文提交并推送当前治理分支，确认本地与远端提交一致；禁止 force push。合并 `main` 必须由最终独立审计给出判断，本治理任务不执行合并。
