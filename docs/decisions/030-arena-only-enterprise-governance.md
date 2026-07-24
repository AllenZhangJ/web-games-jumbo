# ADR-030：Arena 成为唯一生产产品并执行可审计的企业级治理迁移

- 状态：已接受，迁移中
- 日期：2026-07-21
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 正式资产审批角色：项目唯一负责人
- 基线提交：`51e28220295c080261d30e33aaac7e43c5f91685`

## 背景

`feature/arena-stage6-input-movement` 已形成可玩的 Arena Product：1v1 权威对局、武器差异、移动与二段跳、正式角色资产、反馈、机器人、回放、存档和 Web/微信/抖音入口均已存在，并通过当前分支的回归与三端构建门禁。用户验收也确认打击感、胜负闭环和低上手门槛已有明显进展。

但该分支是在早期数值跳台 v3 工程上持续演进得到，当前仍同时存在两套产品身份、大量 JavaScript、非生产页面进入 Web 交付、分散脚本与文档状态不一致等问题。`main` 已建立 strict TypeScript、npm workspaces、Vitest、ESLint、CI、CODEOWNERS 和零 JavaScript 等治理能力，但其产品实现仍是旧数值跳台，不能用 `main` 的业务代码覆盖 Arena 的现有成果。

## 决策

### 唯一产品

Arena 是仓库唯一生产游戏。历史数值跳台 v3 的源码、测试、入口、资产和产品文档在完成能力映射后删除，只保留在 Git 历史与本 ADR 的迁移记录中。迁移不提供旧产品运行时兼容开关。

当前无真实用户数据，因此不迁移数值跳台存档；Arena Profile 仍保留版本化 schema、未来版本保护、A/B 原子写入、CAS 和租约语义。

### 治理承接方式

以 Arena 基线为业务真值，在独立分支 `feature/arena-enterprise-governance` 上承接 `main` 的治理能力，而不是把 Arena 回退到 `main` 的旧实现。迁移按 `Rule → Core → Bot → Presentation → Platform` 顺序进行，并以行为映射、确定性 hash、Replay 和验收记录防止功能倒退。

目标仓库采用 strict TypeScript npm workspaces，启用 ESLint、Vitest/coverage、依赖方向检查、零 JavaScript、资产审计、三端产物预算和 CI。迁移期使用版本化 JavaScript 允许清单，只允许减少，不允许增加；最终审计前清单必须为空。

### 产品与资产边界

- Web、微信、抖音各只有一个生产入口，均启动 Arena Product。
- Greybox、Pilot、Study 和 POC 仅作为开发/测试能力，不进入生产交付清单。
- 正式 GLB/纹理/音频为正常路径；程序化角色只在正式资产加载失败时兜底。
- 正式资产入库必须固定来源、revision、许可、字节哈希、预算结果，并由“项目唯一负责人”完成批准记录。
- GitHub 代码所有者使用仓库有效账户 `@AllenZhangJ`。

### 性能与验收

性能优化不得以减少分辨率、抗锯齿、动作或关节为手段。预算以 Arena 当前真实产物为基线，后续只能由消除无效计算、重复分配、错误补帧、泄漏和不必要交付内容来改善。

自动化、strict typecheck、测试/coverage、回放/fuzz/stress/soak、资产审计、三端 clean build 和 Web 手机验收共同构成合并门禁。微信/抖音 iOS 与 Android 真机记录是发布门禁；没有这些记录时可以判断代码是否具备合并条件，但不能宣称已具备正式发布条件。

诊断数据只保存在本地验收证据中，不新增网络遥测。

### 提交与审计

治理按可回滚批次执行。每批更新状态台账、运行对应门禁、中文提交、推送并核对远端提交。禁止 force push。

最终只对治理分支与届时最新 `origin/main` 做虚拟合并、语义冲突和完整门禁审计，输出“可合并/不可合并”的证据化判断；本任务不执行实际合并。

## 被否决方案

### 直接把当前 Arena 分支合并到 main

会一次性带入两套产品、大量 JavaScript、旧入口和治理缺口，显式冲突之外还有产品身份、包边界、构建和文档的语义冲突，无法形成可长期维护的主干。

### 以 main 为底重新实现 Arena

会丢失当前已验收的打击感、动作、武器、输入、回放和生命周期修复，并使“治理迁移”变成不可审计的重写。治理能力应迁入 Arena 基线，业务行为必须由测试与 Replay 固定。

### 永久保留两套游戏并共享基础设施

用户已决定 Arena 是唯一产品。继续保留旧产品会扩大入口、存档、资产、测试和文档矩阵，也让未来修改无法判断哪个实现代表产品真值。

### 一次性把全部 JavaScript 改名为 TypeScript

仅改扩展名无法建立类型边界，且数百个文件同时变化会让行为回归、循环依赖和隐藏 `any` 难以定位。迁移必须按依赖层逐批收紧，允许清单严格递减并在最终审计前归零。

## 后果

正面：Arena 的现有游戏性成为迁移基线；主干治理能力被系统承接；产品身份、资产责任、门禁和文档状态有唯一真值；每一批都可回滚和审计。

代价：迁移期间会同时维护运行门禁和渐进式类型门禁；旧测试必须先区分“仍保护 Arena 的共享能力”和“只保护已退役产品的能力”；在六目标真机记录补齐前不得宣称可发布。

执行批次、当前证据和未完成项分别见：

- [Arena 企业治理迁移计划](../governance/arena-enterprise-governance-plan.md)
- [Arena 企业治理状态台账](../governance/arena-enterprise-governance-status.md)
- [Arena 产品基线 51e2822](../baselines/arena-product-51e2822.md)
