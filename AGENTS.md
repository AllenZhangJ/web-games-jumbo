# Arena 长期开发约束

本文件适用于 `src/arena`、对应测试、脚本与 Arena 文档。已有数值跳台 v3 保持独立，除非任务明确要求，不用 Arena 重构波及 `src/core`。

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
