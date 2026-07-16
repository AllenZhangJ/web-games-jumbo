# Arena V1 角色设计索引

## 文档状态

角色方向已接受。概念图用于设计、建模和动作拆解，不作为运行时背景贴图。

## 首批角色

1. Q 版跑酷学徒。
2. 拟人发条方块机器人。

两者是外观与表现差异，不是不同职业。Arena V1 第一阶段共用同一套玩法物理和装备规则。

## 视觉方向

- 低多边形玩具主体。
- 手稿风线条、局部轮廓和速度线。
- 六方向朝向在固定斜俯视相机下保持轮廓可读。
- 衣服、翅膀、挂件和拖尾属于可组合外观层，不改变碰撞与击飞结果。

## 动作层级

### 纯外观动作

待机、呼吸、衣物摆动、发条转动、面部和胜负表情。

### 表现性动作

走、跑、起跳、二段跳、下砸、落地、受击、击飞、淘汰和装备动作的视觉强化。

### 玩法级动作

根位置、朝向、动作阶段、命中窗口和击飞结果只来自 Arena MatchCore。角色模型只解释结果。

## 概念图

- [双角色概念图](parkour-duo-concept-v1.png)
- [跑酷学徒模型拆解](parkour-apprentice-model-sheet-v1.png)
- [跑酷学徒动作拆解](parkour-apprentice-action-sheet-v1.png)
- [发条方块模型拆解](wind-up-cube-model-sheet-v1.png)
- [发条方块动作拆解](wind-up-cube-action-sheet-v1.png)

## 代码接口方向

程序化代理和正式 GLB 都应消费同一种只读运动快照：

```text
MotionSnapshot
  position / velocity / facing
  grounded / movementSpeed
  actionSemantic / actionPhase
  equipmentSemantic
  hitstun / eliminated
```

正式资源使用 Three.js `GLTFLoader`、`AnimationMixer` 和 `SkeletonUtils`。角色动画不向 Core 报告“已经命中”或“已经落地”。
