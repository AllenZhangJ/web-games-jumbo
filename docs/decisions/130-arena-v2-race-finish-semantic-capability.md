# ADR-130：Race终点采用跨地图语义能力绑定

## 状态

提议：`production-unreachable / code-written-not-run / hardGate=false`。

## 日期

2026-08-12

## 背景

Race Objective Policy需要声明`finishGateCapabilityId`。此前候选夹具直接使用基础长图的物理`finishAnchorId`，而第二张折返图拥有不同的真实终点锚。如果把首图物理锚注册为通用Objective，显式Mode Registry路径会在选择第二张图时携带错误语义；如果把两张物理锚都塞进Mode required capabilities，又无法表达“每局只使用所选地图的一个终点”。

重生锚已经通过语义能力与地图物理锚分离，Race终点需要采用相同的单一来源边界。

## 决策

### 1. 新增唯一Race终点语义能力

产品内容层新增`ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1`。它只表达“当前Race地图的有效终点”，不包含坐标、surface或具体anchor ID。

Race Objective Policy必须精确引用该能力；三模式Registry拒绝未知能力，也拒绝继续提交任一地图的物理finish anchor。

### 2. 每张地图显式绑定语义能力到真实终点锚

两张KZ地图候选各自公开深冻结`raceFinishCapability`：

- `capabilityId`必须是统一Race终点能力；
- `anchorId`必须等于该地图`routeDefinition.finishAnchorId`；
- 物理终点锚必须真实存在于该路线。

不复制锚、不改路线几何，也不要求两张地图使用相同ID或位置。

### 3. Registry只登记语义能力

三模式Registry的Map capability目录登记统一Race终点能力，并从通用能力目录中排除两张地图的物理finish anchor。其他路线锚继续按现有候选登记，供重生、压力和地图闭包使用。

因此Mode Definition表达的是“需要一张实现Race终点能力的地图”，而不是“同时需要两张地图的终点锚”。

### 4. Runtime按本局所选地图解析

Race Runtime选定地图后核对：

- 地图的能力绑定指向本路线真实finish anchor；
- resolved Objective引用统一能力；
- 实际终点穿越、finish claim和RaceModeSystem仍使用该地图适配器生成的本局`finishGateId`。

Policy不直接进入物理碰撞判断，也不成为finish claim第二写者。

### 5. 不接管Timeline与平衡

本决策不改变60 tick准备、Race hard-limit、排名规则、地图长度、角色移动、武器或最终平衡。默认Registry、Composition和Entry仍关闭。

## 影响

- 两张地图可以拥有不同物理终点，同时共享同一Race Objective语义。
- 后续新增地图必须显式实现该能力，不能借用现有地图锚ID。
- Registry、Runtime和地图内容之间形成单一可审计映射。
- 测试、类型检查、构建、压力、性能、设备和真人验证全部未运行，本ADR不构成阶段通过。

## 未采用的方案

### 使用基础长图finish anchor作为通用能力

会把首图物理实现泄漏进第二张图和Policy，形成跨地图错误引用。

### 把两张finish anchor都列为Race必需能力

每局只选择一张地图；要求同时具备两张地图的物理锚无法表达本局实际终点。

### 复制一个同名终点锚到每张路线

KZ Route要求anchor ID在单路线内唯一，但跨地图强行复用物理ID仍会混淆内容身份与证据。语义能力应独立于物理锚。

## 回滚

1. 移除统一Race终点能力文件和包级导出；
2. 移除两张地图的`raceFinishCapability`映射；
3. 恢复Registry接受物理finish anchor的旧候选；
4. 移除Race Runtime对语义能力的核对。

回滚不得开放默认Registry或把两张地图的物理锚混为同一内容身份。

## 关联决策

- [ADR-112](112-arena-v2-formal-mode-definition-and-policy-boundary.md)：Mode/Policy Registry边界。
- [ADR-121](121-arena-v2-race-respawn-single-source-candidate.md)：Race跨地图重生能力。
- [ADR-128](128-arena-v2-resolved-frozen-policy-runtime-binding.md)：resolved Policy运行绑定。
- [P2实施状态台账](../architecture/arena-v2-p2-implementation-ledger.md)。
