# Arena V2 A7 正式视觉/媒体资产冻结证据候选 V2

## 状态与目的

- 日期：2026-08-12
- 状态：`production-unreachable / code-written-not-run / incomplete`
- `hardGate=false / formalVisualMediaReady=false / currentPassInstanceExists=false`
- 默认 Release Bundle、Web、微信、抖音入口：未接线
- 验证：按当前开发优先约束统一顺延；未运行 test、typecheck、lint、build、diff-check、压力、浏览器、模拟器或设备

A7 V2 解决的是代码合同缺口：A7 V1 只能用旧 10 项预算白名单评估，无法表示当前 130 项正式表现目录。
V2 保留 V1 已有的 source、许可、逐资产批准、阶段、六环境、三端交付、36 项截图/录像和 7 项人工评审
证据封套，只把预算与当前目录闭合升级为 130 项版本。它不创建资产、不读取二进制、不批准预算、不执行
设备或真人任务，也不计算 P7 `advance`。

## 技能与项目真值

本批按 `game-art-director → media-asset-management → documentation-and-adrs` 收口：

- 视觉与媒体证据必须覆盖剪影、非颜色冗余、低动效、静音等价、失败回退和资源释放；
- source → process → deliver → manage 的 revision、license、SHA-256、批准与交付身份保持分层；
- 当前候选目录、预算候选和逐资产批准账本只代表静态事实，不得替代生产批准。

强制项目真值为 [Art Bible](arena-art-bible.md)、[美术与音频开发流程](arena-art-and-audio-development-flow.md)、
[A0–A7 对齐矩阵](arena-art-development-alignment-matrix.md)、当前 130 项正式表现 Catalog、
`arena.stage7.formal-asset-budget.v2-candidate` 与 A3–A6 逐资产生产批准证据账本。

## 单一 130 项闭包

A7 V2 的唯一目录断言同时核对三方数据，任一处漂移都在产出前失败关闭：

1. 当前正式表现 Catalog identity：`catalogId / revision / contentHash / expectedAssetCount=130`；
2. 逐资产批准账本：固定顺序的 ID、阶段、媒体类、路径、字节、SHA、source locator/revision、license、
   rights holder 与 proof document；
3. 正式预算 V2 候选：固定顺序的 ID、路径、kind、编码容器、当前/最大编码字节、解码纹理格式/宽高/字节与 SHA。编码容器只允许24项`glb`模型、98项`ogg`音频和8项`png`纹理，并与Catalog Source和路径后缀逐项闭合；OGG容器不等同于编码器、采样率、声道或解码内存证明。

后续A7 V3复用A7 V2的130项目录闭包，P7 Freeze Manifest 和 Assembly 不再各维护一份映射算法，并继续核对
同一 source/content/六环境 build identity。A7 V1保留为旧10项证据历史层和迁移反证，A7 V2保留当前目录与未批准预算的失败关闭语义；P7最终冻结只接受新增Approved Policy Assembly后的schema V3。

## 为什么当前永远不能 PASS

当前 `arena.stage7.formal-asset-budget.v2-candidate` 明确为：

- `approvalStatus=proposed-not-approved`；
- `hardGateUsable=false`；
- `structuralLimits.status=unresolved-not-approved`；
- 上限仅精确冻结当前字节，没有性能余量；
- 节点、关节、动作、primitive、material、纹理、加载、设备和产品余量仍需独立批准证据。

因此即使未来补齐 130 项字节 observation，A7 V2 仍保留
`formal-budget-v2-policy:proposed-not-approved` 与
`formal-budget-v2-structural-limits:unresolved-not-approved`，固定
`hardGate=false / formalVisualMediaReady=false`。这避免用“目录字节完全匹配”冒充“结构预算与真机表现已批准”。
未来若要形成合法 PASS，必须新增获批预算策略及对应版本化 A7 schema，而不是修改或伪造当前候选状态。

## 失败关闭与顺延验证

- exact-key、plain enumerable data、stored result 全量重算、future field、身份漂移和旧 V1 输入全部失败关闭；
- 当前 130 项真实不完整夹具仍保留全部生产批准、环境、交付、截图/录像和人工评审缺口；
- 旧 10 项全绿夹具只能证明 V1 历史合同，不能进入 P7；
- 已登记 V2 定向测试、P7 runner、治理边界和版本化不可达检查，但本批均未执行；
- 默认入口、资产加载、发布、分支、tag、upload、sign、commit 与 push 均未改变。

当前可继续开发玩法、地图、武器、页面和成长；只有最终发布冻结必须等待预算正式批准与所有真实证据闭合。
