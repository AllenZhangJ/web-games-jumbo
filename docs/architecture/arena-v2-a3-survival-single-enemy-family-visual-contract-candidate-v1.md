# Arena V2 A3 生存单一敌人家族视觉合同 Candidate V1

状态：`code-written-not-run`。本记录来自当前源码静态核对，未运行测试、构建、浏览器、设备或性能门。

## 产品约束

生存模式只使用一个敌人家族外观。压力增长来自权威敌人数量、行动频率和局内武器等级变化，不来自新增敌人种类、额外操作或不同角色技能。

## 当前单一来源

- Survival Authority 的全部 `enemy` participant assignment 都使用 `arena-v2.character.survival-enemy-family.candidate.v1`。
- 正式角色表现目录对该 Definition 只登记一个 `survival-enemy-model`：KayKit Skeleton 候选。
- 该敌人使用唯一材质 Profile `arena.material.kaykit-skeleton-clockwork.v1`；不会复用六个玩家角色的不同手感外观。
- 正式 Scene Resolution 按 participant 的同一 `characterDefinitionId` 解析表现，因此敌人数量增加不会改变模型家族身份。

武器附件可以显示敌人当前真实持有的权威武器，但这不构成第二种敌人；不得用不同武器外观反向推断敌人规则、等级或技能。

## 禁止扩张

- 不新增精英敌人、Boss、敌人职业或敌人专属按键；
- 不按压力阶段切换敌人模型、角色 Definition 或碰撞体；
- 不让 Presentation 从敌人序号、颜色、名字或装备猜测不同战斗规则；
- 不为了视觉丰富度增加新的敌人动画系统、AI树、掉落表或成长字段。

## 顺延验证

- 1/4/8/12/16 敌人场景的 Definition 与表现身份闭包；
- 所有敌人同模型、同材质家族但仍可凭位置与公开编号区分目标；
- 武器附件替换不改变敌人家族身份；
- 浏览器、设备、可读性、同屏预算与性能。
