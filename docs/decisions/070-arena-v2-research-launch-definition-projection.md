# ADR-070：六个首发位置统一使用 Definition 数值投影

## 状态

已接受，适用于 V2 开发/测试工具链；研究候选仍不得进入生产目录。

## 日期

2026-07-28

## 背景

首发六个功能位置已经收敛为三把生产基线和三把研究候选。生产基线能够从权威调优投影概览数值，但研究候选此前只在各自动作原型中存在，容易出现“有玩法描述、没有统一数值卡”的断层。

这会直接削弱项目的核心目标：玩家在武器概览中必须能看出武器的真实差异，而不是只看到名称、外观或一句定位。

## 决策

1. 为直线压制、读招反制、绕后三个首发研究候选建立统一的 research-only Definition 原型。
2. 每个候选必须同时提供地面和空中 `ActionDefinition`、统一的 9 项主概览数值、2 项行为补充数值，以及固定等待/离开回应证据。
3. 研究动作通过共享的 `projectArenaV2ActionDefinitionPublicNumbers` 投影到与产品武器概览相同的数值结构；覆盖宽度、方向容错和横向击飞距离继续使用固定派生公式。
4. `research-only` 是硬边界：这些 Definition 可以用于无渲染规则、地图探针、数值比较和后续表现原型，但不创建生产 `EquipmentDefinition`、存档身份或发布入口。
5. 研究候选的审计状态可以是 `ready`，但 `implementationStatus` 必须明确为 `research-only-definition`，不得解释为生产已实现。

## 不采用

### 只保留语言文案

放弃原因：无法验证三种候选的数值差异，也无法让概览与对局使用同一组数据。

### 为每种候选复制一套投影函数

放弃原因：同一字段会出现不同几何公式和单位解释，后续调优容易让概览与规则漂移。

### 直接写入生产内容

放弃原因：三个候选仍缺少真实设备、多人拥挤、正式 Presentation 和真人可读性证据；研究原型不能越过生产边界。

## 影响

- 六个首发位置现在都具备可比较的数值证据，其中前三个来自生产权威内容，后三个来自 research-only Definition。
- 读招反制的前摇/有效窗口、绕后的方向容错、直线压制的距离/覆盖差异可以进入同一套概览审计。
- 仍未证明平衡、真人理解率、音效特效可读性和正式生产迁移；这些继续由独立门禁验证。

## 验证证据

- `packages/arena-v1-experiment/src/arena-v2-weapon-action-public-projection.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-launch-research-definition-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-weapon-launch-research-definition-prototype.test.ts`
- `packages/arena-v1-experiment/src/arena-v2-weapon-definition-migration-audit.ts`
