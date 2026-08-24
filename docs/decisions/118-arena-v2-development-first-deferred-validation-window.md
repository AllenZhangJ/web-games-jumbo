# ADR-118：Arena V2 开发优先与集中延期验证窗口

## 状态

已接受。该决策自 2026-08-10 起调整 P1→P2 的实施顺序，但不改变任何正式通过标准。

## 日期

2026-08-10

## 背景

P1 的非性能实现、三端构建治理和本地源码冻结已经形成候选，正式 PA6 ABBA×3、PA7 300/120、
设备、真人和美术外部门仍未完成。当前正式性能又受不归属本项目的模拟器和系统负载阻挡；继续等待
会让已经完成字段预审、写域拆分和回滚设计的 P2 实现长期空转。

用户明确要求：不要等待验证、测试或压测；无法立即执行的门禁统一顺延，以继续开发为主。随后又明确
要求持续开发到下一个必须执行性能测试的聚合阶段，再一次性补验。该要求改变执行顺序，不构成降低旗舰
目标、删除测试、把未测写成通过、开放发布或忽略后续失败的授权。

## 决策

### 1. 验证顺延，不豁免

- PA6、PA7、完整测试、Coverage、构建、设备、真人、A0.3/A1 和发布门继续保留，状态均不得从
  `not-run`、`deferred`、`formalGate=false` 或历史红门改写为通过。
- 本窗口产生的代码、测试、文档和资产都标记为 `implementation-candidate / verification-deferred /
  formalGate=false`。
- 历史绿轮、污染轮和旧 source identity 不得用于证明新代码；集中验证时必须绑定届时的同一候选源码。

### 2. 开放 P2.0-P2.5 连续条件实现与 P2.6 聚合基础设施窗口

主开发线程可在同一分支依赖有序地实现：

1. P2.0a Mode/Policy Definition 与只读 Registry；
2. P2.0b V6 权威合同、MatchReadFrame V3 与供给公开身份合同；
3. 上述切片对应的未来自动化测试代码和恶意输入夹具，但本窗口不要求立即运行。

P2.0 静态交接后继续开放 P2.1-P2.5：通用参与者与 Mode Core、Duel 等价迁移、Race Core、Survival Core、
Replay/Assignment/Result/Session 集成。每一片仍按 `Rule → Core → Bot → Presentation` 推进，前一片至少完成
静态七维自检、精确 diff 与回滚边界后才开始下一片；测试代码同步编写但统一顺延执行。

共享 `index.ts` 只允许主协调为版本化新合同做单写导出；这不等于生产入口接入。P2.6聚合期允许主协调
单写根`package.json`中的候选测试/治理命令、只读治理脚本、独立V6 Golden清单和压力矩阵合同；不得改写
现有正式Golden语料、package依赖方向或任何默认入口。各package manifest的依赖、默认Registry、三端产品
入口和Presentation继续冻结。P2.1-P2.5可以修改已登记的Core/Replay/Product/Session文件，但新模式只能
由显式V6测试/开发组合创建，现有V5 Duel默认链不得被静默切换。

本决策生效时，Race/Survival 未冻结的复活保护、压力阶段、刷新延迟和成长平衡数值只能存在于显式 `.test.` fixture，不能
注册成生产Definition。后续ADR-120/121仅把真实Runtime已存在且发生身份漂移的Survival 60/30与Race 180/30行为收敛为生产不可达、平衡未批准的版本化候选；这不开放默认入口，也不改变本ADR的延期验证门。P2.5完成后停止功能扩展，但可继续完成P2.6的定向测试编排、architecture/reachability
治理、V6 Golden清单、4/8/12/16压力预注册合同及其同步双跑编排器；这些文件只定义未来如何验证，不能生成绿证据、写入游戏
硬时限/敌人数默认值或接生产入口。运行验证仍统一顺延；未补验前不得继续P3、开放用户入口或声明P2完成。

### 3. 静态自检仍是开发交接前置

每个切片交接时必须给出：

- 健壮性；
- 竞态与确定性；
- 兜底与失败关闭；
- 边界与恶意输入；
- 生命周期与清理；
- 生产主流程与阻断性 bug；
- 变更治理：起始 HEAD、精确文件、未运行验证、已知缺口、回滚 hunk、下游失效范围。

本窗口允许把测试命令标记为 `deferred-by-ADR-118`，但不允许省略测试设计、失败场景或静态反证。
缺少任一维、越过写域、出现通用事件总线、模式分支散落、未冻结外部输入或未知值默认降级时，主协调
仍直接退回修改。

### 4. 美术只开放 A2.0 预生产合同

美术线程可并行完善 Race/Survival 的权威事件→Cue→回退→低动效/静音映射，以及角色、武器、地图的
生产约束和占位规格；不得生成或替换正式资产字节，不得从坐标、动画完成、音频时长或事件顺序重判
终点、掉落、排名、重生、拾取或胜负。

A2.0 只消费 P2.0b 的冻结候选字段。字段变化时文档和样件计划必须失效重绑，不能让美术草案反向成为
权威规则来源。

### 5. 提交与发布

- 开发和美术线程不得自行 commit/push。
- 主协调可以在完成静态自检和逐文件审阅后创建中文本地检查点提交，提交必须写明
  `verification-deferred / formalGate=false / do-not-push`。
- 在集中验证全部通过前禁止 push、合并、release-ready、P1/P2 advance 或生产入口开放。

### 6. 集中补验顺序

开发完成 P2.5、到达 P2.6 无渲染压力与总门聚合点后，按当前最终源码一次性补齐：

```text
逐切片定向测试与恶意输入矩阵
  → architecture / typecheck / lint / docs / diff
    → 完整 Node、Replay、golden、Coverage、build、三端预算
      → PA6 ABBA×3
        → PA7 300/120
          → P2 无渲染压力、设备、真人与美术门
```

任一红门都必须修复，并使受影响的后续证据重新运行；积累开发量较大不是放宽阈值或保留错误兼容分支的
理由。

## 影响与代价

- 开发不再因外部性能环境空转，可先冻结可回滚的模式合同、Core、集成骨架和P2.6聚合基础设施。
- 缺陷发现会变晚，集中验证可能要求跨多个切片返工；该成本由用户明确选择。
- 通过新文件优先、版本化共享出口主协调单写、生产默认入口冻结、静态七维自检限制返工半径。
- P1/P2 的正式状态不会因开发推进而提前改变。

## 回滚

若切片出现依赖倒置、权威重复写入、无法精确回滚或合同持续漂移，停止后续切片，仅反向撤销该切片的
新增文件或已登记 hunk。不得使用 reset/checkout 覆盖共享工作树；失败候选和延期验证记录继续保留。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：P2 Mode 与 Policy 边界。
- [ADR-115](115-arena-v2-deferred-joint-performance-gate.md)：P1 性能延期；本 ADR 仅部分取代其“不开放 P2”顺序限制。
- [ADR-120](120-arena-v2-survival-first-respawn-single-source-candidate.md)：Survival首次复活单一来源候选。
- [ADR-121](121-arena-v2-race-respawn-single-source-candidate.md)：Race重生单一来源候选与起跑格职责分离。
- [生产化分阶段开发与治理计划](../architecture/arena-v2-production-development-plan.md)。
- [P2 实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
