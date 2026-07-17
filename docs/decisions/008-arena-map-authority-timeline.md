# ADR-008：Arena 地图使用独立权威时间轴

## 状态

已接受。

## 日期

2026-07-17。

## 背景

Stage 5 开始同时引入风场、分阶段塌陷、装备波、动态重生和 Bot 避险。如果把时间轴直接加进 `MatchCore` 或 `ArenaRuleEngine`，动作、装备、地图和物理的写入权会再次混合，且表现层很容易以动画计时取代权威 tick。

## 决策

### 1. 地图权威独立分层

地图使用 `MapDefinition → MapTimeline → MapRuntime → ArenaMapSystem` 链路。

- `MapDefinition` 是版本化、深冻结的纯数据。
- `MapRegistry` 在组合阶段拒绝重复 ID 和失效引用。
- `MapTimeline` 只计算 warning/start/end 的稳定顺序。
- `MapRuntime` 是 surface 和 occurrence 状态的唯一写入者。
- `ArenaMapSystem` 在固定 tick 生成命令，通过显式 port 提交物理冲量、surface 开关和装备生成。

`MatchCore` 只编排 Rule 和 Map 两个权威子系统，不实现风场、塌陷或装备波的类型分支。

Arena V1 使用一个组合根创建并共享 Action、Equipment 和 Map Registry。配置解析从 MapRegistry 取得 arena，MapSystem 再用实际注入 RuleEngine 暴露的只读装备 catalog 校验地图引用；因此不兼容的自定义 RuleEngine 在构造期失败，而不是等装备波释放后才中断对局。

### 2. 随机按事件 occurrence 隔离

每个 occurrence 使用 `matchSeed + mapDefinitionId + occurrenceId` 派生 seed。新增或调整其他地图事件不应扰动已存 occurrence 的结果，也不读取对手资料、难度或 Bot RNG。

### 3. 公开预警与私有计划分离

预警 tick 同时生成：

- `publicPayload`：玩家、Bot 和 Renderer 可见的风区、塌陷 surface 或落点标记。
- `privatePlan`：释放前不公开的装备类型等权威决策。

`privatePlan` 只进入内部快照和 state hash，不进入公开 `MatchSnapshot` 或 `BotObservation`。Bot 只能读取经过难度延迟的公开地图快照。

### 4. 地图安全是启动门禁

注册 Stage 5 地图前必须验证：

- 至少一个永久 surface、一个永久装备点和两个永久安全重生点。
- 初始及每轮塌陷后的行走连通性符合角色直径与台阶高度。
- 装备波不会选择在释放 tick 已塌陷的 surface。
- 已存无主装备所在 surface 塌陷时，同 tick 权威回收；死亡掉落无任何合法点时也回收，不创建悬空道具。

### 5. 回放和快照版本同步提升

Stage 5 将 Match/Replay schema 升至 V3，物理版本升至 `lightweight-v2`。MapDefinition ID、surface 状态、occurrence 阶段、公开 payload 和私有 plan 都参与权威 hash。旧回放必须显式拒绝，不在新规则下静默播放。

地图 content hash 同时包含显式 ruleset 兼容版本。未来即使 Definition 不变，只要事件或命令语义改变，也必须提升 ruleset 版本，使旧回放在兼容边界上显式失败。

### 6. 地图 tick 使用受约束的两阶段提交

`advance()` 只生成并登记一个待提交批次，`commit()` 只接受该原始批次一次。存在待提交批次时不能推进下一 tick，也不能复制、重放或乱序提交。CommandRegistry 必须在调用任一 mutation port 前完成整批结构校验；port 写入失败后 MapSystem 与 MatchCore fail closed。

## GitHub 借鉴

- Motumbo：借鉴地图可校验数据、塌陷、拾取物、RNG 分流与确定性测试；不复制其大型 C 单文件结构。
- boardgame.io：借鉴命令描述权威状态转换和可追溯日志；不引入回合制或网络运行时。
- XState：借鉴显式阶段和转换验证；不引入 Actor 计时语义。

本阶段没有复制新的第三方代码，也没有新增运行时依赖。

## 后果

- 文件和合同数量增加，但风场、塌陷和刷新可独立测试、替换和回放。
- 新地图只扩展内容目录和必要 Strategy，不修改 MatchCore 或地图 ID 分支。
- Renderer 只需消费公开预警和已发生事件，不需要知道地图随机或计时实现。
- 动态地形的存档恢复延后到确实需要 checkpoint 恢复的阶段；V1 仍以输入回放重建权威状态。

## 验收门禁

- 地图 Definition、Registry、Timeline、Runtime、Serializer、Strategy 和 Command 可无渲染测试。
- 所有地图写入都通过 `ArenaMapSystem` 和显式 port，失败后 fail closed。
- 地图批次不可跳过、复制、重复或乱序提交；end 阶段的 surface 命令必须同时更新 Runtime 与物理 port。
- 公开快照不含 `privatePlan`，内部快照完整参与 hash。
- 100 个 seed 完整跑满 120 秒地图时间轴，事件数精确、无不可达装备或无安全 surface，抽样回放一致。
