# ADR-051：生存武器等级采用按核心语法的正式 Definition 变体

## 状态

已接受（开发/测试工具链原型，不代表生产 V2 合同已冻结）

## 日期

2026-07-27

## 背景

ADR-050 先用研究冲量端口证明生存等级会改变真实战斗结果，但该端口无法作为回放内容身份，也无法保证地面/空中参数和武器自身风险被正确表达。用户要求武器差异必须能在概览中看到，并且本局武器成长不能增加新的操作按键或污染局外收藏属性。

## 决策

在 `packages/arena-v1-experiment` 中建立 `Arena V2 SurvivalWeaponDefinition` 研究合同：

- 公开数值从当前权威 Action Definition 推导，地面和空中上下文分别保存，不由 UI 手写；
- 只验证等级 1、5、10 三个节点，等级是本局临时状态；
- 每把武器声明自己的成长字段：重锤为目标横向控制、锁链为目标换位控制、冲锋盾为目标接触控制；
- 每个等级生成唯一的 Action/Equipment Definition ID，例如 `hammer-smash.survival-tier-10` 和 `hammer.survival-tier-10`；
- 生成确定性的 definition bundle hash，作为后续回放内容身份的候选输入；
- 冲锋盾的自身位移风险不跟随目标横向控制一起缩放，保持基础值，避免成长把武器的失败风险悄悄改掉；
- 该合同只用于研究、平衡和 UI 数值来源验证，不进入生产 V1、网络合同、局外存档或永久武器属性。

## 被考虑的方案

### 继续使用研究冲量端口

- 优点：改动最小。
- 放弃原因：动作 ID 和装备 ID 不包含等级，回放无法仅靠内容身份复现同一套战斗定义，且容易让概览数值与实际规则分离。

### 所有武器使用统一百分比击退成长

- 优点：实现简单，便于批量生成数值。
- 放弃原因：重锤在物理速度上限下会出现等级 5 到 10 的位移平台；锁链、冲锋盾的核心问题分别是换位和接触风险，不能用同一语义解释。

### 立即把等级字段扩展进生产 V1 Definition、网络和存档

- 优点：接入路径最短。
- 放弃原因：生存模式的敌人压力、地图边缘、真人理解率和最终回放合同尚未收敛，会过早扩大生产边界和迁移成本。

## 结果与后果

- 正向结果：实际战斗使用等级专属 Action/Equipment Definition，输入语法保持不变；
- 正向结果：主页概览可以同时展示基础值、本局等级值、地面/空中值和成长语义；
- 正向结果：相同配置、相同等级和相同定义包会生成相同 hash，具备进入回放验证的边界；
- 正向结果：冲锋盾的自身位移风险仍可解释，等级不会把风险和收益一起隐式放大；
- 重要限制：重锤等级 5/10 在当前物理和平台上仍有位移饱和，必须改测前摇、二次威胁或地图边缘收益，不能继续盲目加击退；
- 重要限制：当前只有三把原型武器、三个等级节点，尚不能说明完整武器库的成长平衡；
- 重要限制：尚未接入正式 MatchCore、多人网络、局外存档和真机/真人测试。

## 验证证据

- 定义：`packages/arena-v1-experiment/src/arena-v2-survival-weapon-definition.ts`
- 实际战斗：`packages/arena-v1-experiment/src/arena-v2-survival-tier-combat-prototype.ts`
- 定义测试：`packages/arena-v1-experiment/test/arena-v2-survival-weapon-definition.test.ts`
- 战斗测试：`packages/arena-v1-experiment/test/arena-v2-survival-tier-combat-prototype.test.ts`
- 结果：[Arena V2 生存 1vE 最小循环原型结果 V1](../research/arena-v2-survival-loop-prototype-results-v1.md#7-生存临时武器等级实际战斗原型)
