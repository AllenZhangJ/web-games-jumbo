# Arena V2 A7 正式资产结构预算证据候选 V1

## 状态与目的

- 状态：`production-unreachable / hardGate=false / hardGateUsable=false / code-written-not-run / validationStatus=not-run`。
- 目的：为当前130项预算V2补齐“结构与六环境实测事实如何提交、如何独立复核”的数据合同。
- 明确不做：不运行测量工具、不读取资产、不生成或修改媒体、不定义预算上限、不批准预算、不接Formal Bundle、Preloader、Entry或发布链。

## 开发路由

- 使用技能：`media-asset-management`。
- 强制参考：`arena-art-and-audio-development-flow.md`、`arena-art-bible.md`、预算V2候选、当前130项Catalog/批准证据账本、P7六环境预注册。
- 管线位置：Source保留资产与构建身份；Process记录结构/内存观察；Deliver绑定六环境build和证据SHA；Manage的上限提案、批准、撤回和发布继续属于后续独立Owner。

## 提交合同

提交必须绑定：

- 当前预算V2的`policyId + policyContentHash`；
- 当前Catalog content hash与130项账本；
- clean source commit、package-lock SHA和toolchain identity SHA；
- 唯一批次、采集人、UTC时间、总报告Locator/SHA；
- 130项按规范顺序排列的资产观察；
- P7预注册顺序中的六环境观察。

批次/角色等治理标识最多256字符，证据Locator最多2048字符，备注最多4096字符；标识和Locator拒绝首尾空白及控制字符。这样Collector/Reviewer不能通过空白差异绕过角色隔离，异常长地址也不能进入提交或评估身份。

每项资产观察逐项重验`assetId + path + kind + encoded media format + artifact SHA + encoded bytes + decoded texture bytes`。编码容器身份由当前Catalog经预算Policy投影绑定：模型为`glb`、音频为`ogg`、纹理为`png`；Evidence和上限提案不得重写格式，也不得从OGG后缀推断编码器、采样率、声道或解码内存。结构字段按媒体类别失败关闭：

- 角色模型记录节点、关节、动作、primitive、material与GPU/常驻内存；
- 地图和附件模型记录节点、primitive、material与GPU/常驻内存；
- 纹理记录宽高、解码纹理字节与GPU/常驻内存；提交通过Policy content identity绑定Formal Catalog投影的`rgba8`格式，宽高必须逐项匹配预算V2显式元数据（3张1024×1024材质纹理、5张128×128 VFX纹理），不得在Evidence/Release层从解码字节反推尺寸或以`1 × N`等面积伪造实际尺寸，且GPU实测下限不得低于RGBA8解码字节；
- 音频记录解码音频字节与常驻内存，禁止伪造模型/纹理指标。

六环境逐项记录build identity、常驻/GPU/音频解码峰值、资源上传时间、Context恢复、清理回归基线和独立证据Locator/SHA。六个环境记录必须彼此唯一，总报告和后续独立评估记录也不得复用任一环境原始证据身份。合同只保证事实完整和类型正确，不把任意观察值解释成通过。

## 独立评估合同

独立评估重新构造提交并核对`submissionIdentity`。采集与评估时间统一使用仓库Evidence合同验证的毫秒精度规范UTC instant，日期在日历中不存在时即使字符串外形正确也会失败关闭。Reviewer不能兼任Collector，时间不得早于采集；评估记录的Locator/SHA也不得复用结构观察报告的Locator/SHA。Accepted要求报告SHA、130项覆盖、结构指标、六环境覆盖和source/build identity全部被独立复核，并只使用规范接受原因。该隔离继续由下游提案、批准和Policy装配承接，形成五层互斥证据身份。

Accepted只得到`eligibleForSeparateStructuralLimitProposal=true`，同时保持：

- `acceptedEvidenceDoesNotDefineOrApproveLimits=true`；
- `grantsBudgetApproval=false`；
- `hardGate=false / hardGateUsable=false`；
- `writesFilesOrEvidence=false / runsMeasurementTools=false`；
- 默认Bundle、Preloader、Entry和Release全部关闭。

Accepted Evaluation还可通过专用投影生成A7 V2所需的六字段`formalBudgetEvidence`输入。该投影只把已复核的130项观察报告标记为`passed observation`，并继续显式声明`producesA7V2ObservationInputOnly=true / definesOrApprovesStructuralLimits=false`；A7 V2仍会因为预算未批准和结构上限未定义而保持INCOMPLETE。

后续仍需单独的Structural Limit Proposal与独立预算批准，以实测分布和产品余量确定上限；本候选不允许用测试夹具数字替代真实测量。

## 回滚点

删除本源码、测试规格、包导出、P7 runner/治理登记和本文即可；预算V2、A7 V2、当前Catalog、资产字节、默认入口和发布链均不受影响。
