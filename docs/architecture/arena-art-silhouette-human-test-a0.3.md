# Arena A0.3 真人剪影盲测最小执行包

## 状态与边界

- 日期：2026-08-25（`SF-A0R.2B` clean-source机器包）
- source commit：`60fbc13430f8ba31eb58d8bef775c7a75b5abec7`
- 测试包：`ready-for-external-human-input / machine-verified-human-empty`
- 真人证据：0/10，`hardGatePassed=false`
- A0.3：`incomplete`；Blockout与Final继续`forbidden`/fail closed

当前human kit由`60fbc13` clean source完整生成，绑定同一sourceFreeze、依赖锁及Node/Three/Sharp运行环境，且机器正向与失败关闭矩阵已通过，可以进入外部真人输入阶段。任何内部代理、制作人员自测或模拟答卷都不能替代真人；0/10期间A0.3、Blockout与Final继续关闭。

## 最小测试包

机器manifest位于[`arena-a0.3-human-test-kit-v1.json`](../quality/art/silhouette/human-test-kit/arena-a0.3-human-test-kit-v1.json)。每个`participant/form-01`至`form-10`目录是一份独立离线包，包含：

- `index.html`：无需服务端即可打开的24题页面；
- `form.json`：固定题序、匿名`qNNNN`身份和图片hash；
- `images/`：该表单的24张匿名10%剪影；
- 两张仅用于认识角色A/C01与角色B/C02的仓库自产校准图，点击开始后隐藏。

10份表单共240个题位，覆盖全部144张匿名图；每张出现1–2次，每份内部不重复。manifest内的`restrictedEvaluator`合同位于参与者目录之外，以path、byteLength和SHA-256固定blind package、questions与answer key；blind package还必须反向绑定同一questions和answer key。检查器与评分器各自复算三者身份、答案键严格schema及值域，并证明`C01/C02 × unarmed/shield × 六方向 × 0/5/12m × desktop/mobile`的`2×2×6×3×2=144`完整笛卡尔积每个tuple恰好一次、144个`sourceOutputId`唯一且与tuple精确对应、每个72细分层恰好包含双视口，以及答案键、questions、10份assignment和图像集合双向一致。受限答案键只供评估端复算采样；表单分配后每个细分层有2–4题，距离层样本为0m=75、5m=80、12m=85。参与者目录不含答案键、正式资产名、源输出ID或其他参与者答卷。

页面只要求协调者预分配的`P-XXXXXX`匿名编号，不收集姓名、邮箱、电话、IP或账号。参与者必须确认：同意匿名测试、未参与Arena角色/美术/测试包制作、未接触答案键、未提交个人信息。完成后页面下载未经评分的`P-...__form-..__raw.json`原始答卷。

## 真实参与者收集流程

1. 协调者招募至少10名未参与Arena制作的真人，并为每人分配唯一匿名编号与唯一表单；一人只做一份，10份表单各至少收到一份。
2. 只把对应`participant/form-XX/`目录交给该参与者；不得发送仓库、答案键目录、代理报告或别人的答案。
3. 参与者独立打开`index.html`，阅读校准图后开始，完成24题并下载原始JSON；制作人员不得旁答、提示或解释具体轮廓。
4. 协调见证者以`W-XXXX`匿名见证码接收原文件，不编辑内容，执行：

   ```bash
   node --import tsx scripts/art/intake-arena-silhouette-human-response.ts /absolute/path/P-XXXXXX__form-XX__raw.json W-XXXX
   ```

   Intake会独立复算kit与restricted evaluator合同，再验证表单hash、24题覆盖、选项、四项声明、30秒–2小时耗时、参与者/表单唯一性。`completedAt`最多允许相对当前时间5分钟时钟偏差，台账的规范化`receivedAt`保证不早于`completedAt`。源文件只读取一次；已读取bytes以`wx`排他方式写入canonical destination，重读复算byteLength/SHA-256后依次`fsync raw → fsync raw父目录 → fsync ledger临时文件 → 原子替换ledger → fsync ledger父目录`。ledger替换成功即进入`committed`状态；此后即使输出失败也绝不删除raw。提交前失败会删除本次新建raw且不会覆盖已有答卷。台账只记录匿名参与者码、表单、匿名见证码、接收时间、仓库内忽略路径、byteLength和SHA-256，禁止记录输入原文件名。

   `responses/.gitignore`只允许策略文件自身与`.gitkeep`被提交，并忽略其余文件；检查器还会拒绝任何被Git跟踪的raw JSON。真人资格和同意证明不进入仓库，由协调者保存在本地受控记录中。
5. 收齐前运行评分命令必须失败；收齐10名且10份表单各一份后执行：

   ```bash
   node --import tsx scripts/art/evaluate-arena-silhouette-human-responses.ts
   ```

6. 评分器不信任intake状态或“已先运行checker”的假设，会独立验证kit manifest、restricted evaluator三项固定输入、每份assignment/runner/image、10个唯一参与者、10份不重复表单、24题、枚举、时间、声明、`receivedAt>=completedAt`、raw目录与台账双向一致及原始文件hash；随后使用已验证受限答案键输出角色/装备/方向混淆矩阵、0/5/12m与双视口分层、角色×装备联合准确率，以及72个“角色×装备×方向×距离”细分层。整体三项及每个距离/视口层三项均须≥90%，每个角色×装备与每个细分层联合准确率须≥80%，每个细分层至少2个样本。评估报告通过临时文件、`fsync`、原子rename和父目录`fsync`完整落盘；任何一项失败时完整失败报告可保留，但A0.3继续关闭并触发姿态/体块/持握返工。
7. 即使自动阈值通过，报告仍为`human-threshold-candidate`、`hardGatePassed=false`且协调签核为空；主协调独立核对参与者资格、原始hash与报告后，才能决定是否签核A0.3。自动脚本不得直接放行Blockout。

## 检查与失败关闭

生成与检查命令：

```bash
node --import tsx scripts/art/generate-arena-silhouette-blind-test.ts
node --import tsx scripts/art/generate-arena-silhouette-human-test-kit.ts
node --import tsx scripts/art/check-arena-silhouette-human-test-kit.ts
node --import tsx scripts/art/test-arena-silhouette-human-test-kit-fail-closed.ts
node --import tsx scripts/art/test-arena-silhouette-human-response-intake-fail-closed.ts
node --import tsx scripts/art/test-arena-silhouette-human-evaluator-fail-closed.ts
```

SF-A0R.2B检查器已证明10表单×24题、144题全覆盖、1–2次出现、72细分层各2–4题、严格144 tuple笛卡尔积、双视口与sourceOutputId身份、restricted evaluator三项固定输入、答案键/题目/assignment/图像双向集合一致、校准来源、runner内嵌assignment hash、无答案/资产名泄露、零个人信息要求、raw JSON不被Git跟踪、原始答卷数与intake台账一致、A0.3/Blockout/Final关闭。当前结果为human kit `18/18`、intake `12/12`恶意输入及原子写/提交后耐久、evaluator `15/15`并证明完美10人工具候选仍不自动开门；旧dirty-toolchain结果不得沿用。

### 2026-08-25 主协调 clean-source复验

- 机器包绑定`60fbc13430f8ba31eb58d8bef775c7a75b5abec7`、Node `v20.19.5`、darwin/arm64、Three `0.185.1`、Sharp `0.35.3`。
- 两次完整生成树聚合SHA均为`f2ecd9ff7f21fc07742b75d12207f104c93cd8f5854e69055392496b2d3cffa4`。
- 包检查为10份表单×24题、144个唯一tuple、72细分层、真人`0/10`，`hardGatePassed=false`。
- Gate `25/25+2`、human kit `18/18`、intake `12/12+2`、evaluator `15/15+1`均通过。

该复验只批准包进入真实外部参与者收集，不签认任何真人结果。

### 2026-08-02 主协调独立复验

- 当前包检查：`ready-for-external-human-input`，10份表单×24题、144个唯一tuple、72细分层、真人`0/10`，`hardGatePassed=false`。
- 测试包失败关闭：`14/14`通过。
- Intake失败关闭：`12/12`恶意答卷拒绝，合法排他写入与提交后故障耐久探针各1项通过。
- Evaluator失败关闭：`15/15`通过；完美10答卷工具候选仍保持`hardGatePassed=false`、`coordinatorSignOff=null`和Blockout禁止。

该复验只签认“外部真人输入工具已就绪且不会自动开门”，不签认任何真人结果。下一动作必须是10名真实独立参与者分别完成唯一表单；禁止由代理、
制作人员、脚本生成答卷或重复参与者补齐。

## 尚需外部真人输入

- 10名真实、独立、未参与制作的参与者；
- 10个协调者分配的匿名参与者编号；
- form-01至form-10各一份真实完成的原始JSON；
- 每份答卷的接收见证码与未编辑SHA-256记录；
- 自动评分后的混淆矩阵和分层结果；
- 主协调对参与者独立性、原始证据和阈值结果的最终签核。

这些输入当前全部缺失；因此不得声称真人盲测或A0.3通过。
