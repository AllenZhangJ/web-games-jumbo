# Arena V2 A3–A6 正式资产生产评审程序候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：把九个已写入源码的生产评审准备包合成为唯一交接Owner，按工作队列顺序汇总130项资产、910个证据缺口、95个评审单元、受阻期间可继续动作及前置条件闭合后的真实评审动作。
- 明确不做：不执行测试、构建、评审、截图、试听或性能命令，不创建、修改、加载、渲染或播放资产，不授予批准，不开启Blockout、Integration、Final或资产使用门。

## 统一闭包

| 优先级 | 批次 | 资产 | 评审单元 | 当前可继续准备 | 前置条件满足后的动作 |
|---:|---|---:|---:|---|---|
| 1 | A3地图 | 2 | 16 | 两图捕获脚本输入 | 两图路线/可读性Blockout评审 |
| 2 | A3生存敌人 | 1 | 9 | 四视图、密度、动作输入 | 单一敌人族Blockout评审 |
| 3 | A4可玩角色 | 1 | 10 | 六身份姿态/明暗输入 | 共享模型六身份可读性评审 |
| 4 | A4武器附件 | 20 | 10 | Bounds、持握、落地、距离输入 | 二十武器附件Blockout评审 |
| 5 | A4材质纹理 | 3 | 10 | PBR、色彩空间、灯光、内存输入 | 三纹理运行材质评审 |
| 6 | A4武器命中音频 | 21 | 10 | 盲听、混音、设备输入 | 武器命中音频生产评审 |
| 7 | A4武器阶段音频 | 60 | 10 | 阶段层级、遮蔽、恢复输入 | 武器阶段音频生产评审 |
| 8 | A5核心反馈VFX | 5 | 10 | 灰度、粒子、过绘、生命周期输入 | 核心反馈VFX生产评审 |
| 9 | A5模式/供给音频 | 17 | 10 | 因果、拥塞、静音、设备输入 | 模式与供给音频生产评审 |

总计为9批、130项资产、95个评审单元。地图是2张×每图8项，因此形成16个评审单元；其他批次使用各自共享门。所有准备代码状态为`code-written-not-run`，已验证批次、评审通过数和生产批次数均为0。

## 三个共同前置条件

1. `A0.3-current-source-human-silhouette`仍为待重生成且真人`0/10`，阻断生产Blockout。
2. `A1.1-current-source-readiness`仍待按当前source重建，阻断生产Blockout。
3. 130/130逐资产生产批准仍缺失，910个证据槽全部`missing`，阻断资产使用、Integration和Final。

交接Owner只复用工作队列中的上述事实，不新建第二套门禁。某项评审暂不可运行时可顺延，但不得把`not-run`改成通过，也不得沿用旧证据、邻近资产证据或前三轮证据填补当前资产缺口。

## 执行与治理边界

- 九批顺序必须与唯一Work Queue一致，不能因实现容易而改写生产依赖顺序。
- 每批必须保留独立Preparation ID和Identity Hash；任何批次源码身份变化都需要重新形成其后续评审证据。
- “准备代码已写”只表示评审输入Owner存在，不表示源码可编译、运行可达、资产可用或玩家体验成立。
- 受阻期间只能继续细化源码、评审输入、失败关闭和交接结构，不能执行被用户明确顺延的验证，也不能生成伪证据。
- 前置条件满足后，每批仍需独立执行、独立批准、独立回滚；统一程序不能批量授予通过。
- 默认Formal Bundle、Preloader和Entry不消费该程序；它不参与Gameplay Authority。

## SF-A3A6P.1 固定自动化边界

`npm run arena:a3-a6:production-preparation:test`固定运行15个直接Vitest文件，共59项规格：队列、九批Preparation、Program，以及`submission → independent evaluation → seven-slot accepted set → independent decision`。四段链路的`*Identity`沿用项目`createDeterministicDataHash`八位数据身份，证据文件与审批记录的`*Sha256`仍严格为64位，二者不得互换。

runner通过只说明合同可构造且恶意输入失败关闭；`executesReviews=false`、生产批准`0/130`、证据槽`910 missing`、95项真实评审`not-run`、默认Bundle/Preloader/Entry关闭均不改变。

## 回滚点

删除统一程序源码、公开导出、延期测试、治理登记和本文即可；九个逐批准备包、Catalog、资产、工作队列、批准账本和运行时均不受影响。
