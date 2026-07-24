# Arena 企业治理迁移计划

- 目标分支：`feature/arena-enterprise-governance`
- 产品基线：`51e28220295c080261d30e33aaac7e43c5f91685`
- 最终终点：完成对最新 `origin/main` 的合并前审计，不执行合并
- 执行原则：Arena 行为不回退、治理能力不打折、证据先于结论

## 完成定义

只有同时满足以下条件，治理分支才可进入最终合并审计：

1. Arena 是代码、入口、构建、资产、测试和文档中的唯一生产产品；旧数值跳台只存在于 Git 历史。
2. 生产源码、测试和治理脚本全部纳入 strict TypeScript 工作区，受维护 JavaScript 为零。
3. Rule/Core/Bot/Presentation/Platform 依赖方向由自动化检查保护，权威层无 DOM、Three.js、墙钟或未注入随机源。
4. Arena 行为映射、黄金回放、确定性、fuzz、stress、soak、生命周期、存档和产品闭环门禁全部通过。
5. 正式资产来源、revision、许可、哈希、预算和负责人审批完整；程序化角色仅是加载失败兜底。
6. Web、微信、抖音各只有一个生产入口；clean build Manifest 和预算可复现，开发页面不进入交付。
7. Web iPhone 13 Pro/Chrome 验收记录有效；微信/抖音四个真机目标若未完成，必须明确列为发布阻断而非隐去。
8. README、ADR、架构、验收、第三方声明和状态台账只陈述可由当前提交复验的事实。
9. 与最新 `origin/main` 的虚拟合并无未处置冲突，主干新增治理能力有逐项承接记录。

## 批次与门禁

### G0：冻结 Arena 产品基线

交付：基线 tag、ADR-030、计划、状态台账、自动化/产物/资产哈希、当前债务清单。

门禁：当前 `npm test`、Arena regression/fuzz/lifecycle/soak、movement/product/profile stress、资产预算、三端 clean build、产物预算、`git diff --check` 全通过。总测试数不得冒充 Arena 覆盖率；旧产品测试必须在 G1 建立归属映射。

### G1：承接主干治理外壳并统一产品身份

交付：npm workspaces、strict TS 基础配置、ESLint、Vitest/coverage、CI、CODEOWNERS、依赖审计、渐进式 JS 允许清单；删除旧产品入口、产品说明和发布资产；开发入口与生产交付隔离。

迁移约束：允许清单初值由脚本生成并锁定，新增 JS 或清单增长立即失败。旧产品测试按“退役/迁移为 Arena 共享合同/保留为治理测试”逐项记录。

门禁：治理外壳能在未完成全量 TS 时运行；唯一产品入口检查、JS 清单单调递减检查、旧产品符号/路径检查、CI 本地等价命令通过。

### G2：迁移 Definition、合同与配置

交付：不可变 Definition、Registry 校验、输入/事件/快照/平台/存档合同、统一数值配置表迁入 strict TS workspace；消除跨层魔法数。

门禁：schema/边界/不可变性/Registry 冲突测试、配置引用审计和公共 API 类型测试通过；数值与基线逐项一致。

### G3：迁移权威 Rule/Core 与 Replay

交付：动作裁决、移动、物理、装备、地图、胜负、固定 tick、具名随机流、Replay 与 state hash 进入 strict TS；每类权威状态保持唯一写入者。

门禁：黄金 Replay 当前为 `a53b401d`（ADR-041 批准 movement 场景版本 2）或经 ADR 明确批准的新 schema/hash、同 seed/输入确定性、30/60/120 Hz 等价、失败关闭、无渲染模拟、fuzz/stress 全通过。

### G4：迁移 Bot、Product 与 Persistence

交付：受限 Bot observation → `InputFrame`、Quick Match、Product 状态机、奖励事务、A/B Profile、CAS/lease/migration 生命周期进入 strict TS。

门禁：Bot 无未来状态/权威对象依赖；启动/暂停/恢复/销毁竞态、迟到回调、重复奖励、存档损坏/未来 schema/租约争用测试和 200 场产品、500 次存档压力通过。

### G5：迁移 Presentation、Three、反馈与资产加载

交付：Renderer/UI/Audio 只消费只读快照和权威事件；正式角色/武器/动作正常加载；程序化模型仅错误兜底；本地性能诊断有界且不拥有生命周期。

门禁：表现层禁止命中/位移/胜负写入；Context loss、前后台、资源迟到完成、销毁重入、监听器/帧/对象池泄漏测试通过；动作/武器验收映射无缺项。

### G6：迁移三端 Platform、唯一入口与构建治理

交付：Web/微信/抖音平台合同和生产入口进入 strict TS；开发工具独立构建；Manifest、资产复制、source-clean、预算、时钟/存储并发合同统一。

门禁：三个 clean build 只有 Arena Product 生产入口；交付中无 Greybox/Pilot/Study/POC；包体、JS、最大文件和资产预算不劣于基线；平台能力/安全区/触控/暂停恢复测试通过。

### G7：收紧到零 JavaScript 和完整质量门

状态：已完成。受维护 JavaScript 为零，许可清单已删除，分层 coverage 和负向零 JS 门已接入统一治理检查。

交付：删除 JS 允许清单；Vitest 单元/集成/架构/coverage、Replay、fuzz、stress、soak、零 JS、依赖/资产/构建检查汇总为单一 `npm run check`；CI 使用锁文件干净安装。

门禁：全门禁从 clean checkout 可复现；coverage 阈值基于 Arena 包分别设定，不用删除测试抬高比例；没有 skipped/focused 测试和未审计例外。

### G8：资产、安全与长期所有权

状态：已完成。Allen 已授权联网审计；开发工具链 3 个 high 以精确 `sharp@0.35.3` override 闭环，全依赖与生产依赖审计均为 0 vulnerabilities，资产/owner/供应链/secret/遥测门禁通过。

交付：资产批准记录、第三方声明、固定 revision/hash、CODEOWNERS `@AllenZhangJ`、分支保护建议、依赖更新和漏洞处置规则、敏感信息扫描、本地诊断保留策略。

门禁：资产 Intake/预算通过且审批完整；仓库无 secret、远程遥测或未经固定的第三方代码；关键路径具有 owner。

### G9：文档归真

状态：已完成。当前产品真值、历史批次证据、正式资产批准、Stage 7/9 阻断口径和仓库运营策略已归真；链接、npm 命令与关键现行状态已进入自动门禁。

交付：README、架构、配置表、产品/验收/发布文档、ADR 索引和状态台账以当前实现重写；旧产品文档删除或在 ADR 中留下历史定位。

门禁：链接、命令、路径、hash、状态声明自动检查；“自动化通过 / Web 通过 / 真机通过 / 可发布”四类结论严格分离。

### G10：最新 main 合并前独立审计

状态：已执行当前候选审计，结论为不可直接合并。全量 TypeScript 测试发现、clean-install workspace 构建、未跟踪空目录假阳性、安装阶段隐式 npm audit 外发边界、开发依赖 high、跨平台 Replay、包级 ESLint、公开命令前置构建、启动失败边界、精确候选 Linux CI 和 `main` 保护均已闭环。rename-aware 虚拟合并现识别出 52 个产品/治理冲突并已补齐逐文件处置矩阵；候选为 `a71ecc1`。剩余阻断只有 iPhone 13 Pro/Chrome 最终手感确认，以及未来独立集成授权、实际冲突解决和集成后复验。详见 [合并前独立审计](arena-main-merge-preflight.md)与[冲突处置矩阵](arena-main-conflict-disposition.md)。

交付：fetch 最新 `origin/main`；建立主干新增提交/能力承接表；在临时 worktree 或无写入虚拟合并中检查文本和语义冲突；对候选提交执行完整门禁和 Web 手机验收；形成审计报告。

结论只能是：

- `可合并`：无阻断项，列出仍属发布门禁的真机证据；或
- `不可合并`：逐项列明可复现阻断、责任批次与修复入口。

本批次禁止执行实际 merge、rebase main、修改 main 或 force push。

## 每批提交协议

1. 状态台账将批次标记为进行中并记录基线提交。
2. 只修改该批范围；行为变化必须另有 ADR 和验收映射。
3. 执行批次门禁并保存关键 hash/计数/失败修复说明。
4. 更新台账为已完成或保留明确阻断，不使用“基本完成”。
5. `git diff --check`，中文提交，推送治理分支，核对远端与本地 hash 一致。
6. 下一批只从已推送、可复验的提交开始。
