# ADR-042：以 Arena 为第一父集成 main 治理历史

## 状态

已接受。

## 日期

2026-07-24。

## 背景

`feature/arena-enterprise-governance@55230dd5e5d655913fed2a8968c1720ec7538b16` 已把 Arena 建成唯一生产产品；`origin/main@4c340f1c5bc00dcae712c2261462661d842339da` 的 12 个独有提交继续治理已退役的数值跳台。两者共同祖先是 `d53e7349ff718b3fa0638af197e8f7c43d190b38`。rename-aware 预审和实际普通 merge 均产生 52 个冲突，其中 31 个是旧产品 TypeScript rename 与 Arena 删除结果的 rename/delete 冲突，其余 21 个位于入口、构建、配置、测试和治理真值。

Git 没有报告冲突的 main 新增文件仍包含旧 `application`、`gameplay`、`jump-engine`、`platform`、`renderer-three` 产品包及其旧发布文档。只解决 52 个文本冲突而接受这些新增文件，会重新形成第二套产品、权威状态和发布真值。

## 决策

- 从已验收、已归真的 Arena 治理提交创建 `feature/arena-main-integration`，使 Arena 成为 merge 的第一父；只合入一次固定的 `origin/main@4c340f1`。
- 52 个冲突按[逐文件处置矩阵](../governance/arena-main-conflict-disposition.md)裁决，不对整树使用 `ours` 或 `theirs`。
- 旧产品源码、入口、测试和产品文档保持删除；main 无文本冲突但属于旧产品的新增文件同样删除，不能以“自动合并成功”绕过产品边界。
- Arena 入口、构建、manifest、strict TypeScript、CI、CODEOWNERS、生命周期测试和文档门禁保留现行实现。main 的适用治理意图只在已有 Arena 门禁能够独立证明时视为已承接。
- 合并提交 `b4faa2c8f1af59605a95281948406376cb442ea6` 的树必须与第一父 `55230dd` 的树完全相同；两者实际 tree hash 均为 `f3621cf35bddf90af1ceccd196d782a724cde5a2`。
- 合并后必须在干净提交执行统一全门、全依赖审计和三端构建，并把除 build manifest 提交身份外的交付产物与已验收基线逐文件比较。任何玩法配置、Replay、资产或交付字节漂移都阻断集成。
- 本批只推送集成候选，不修改或合并 `main`，不 force push。是否进入 `main` 由本批完成后的独立终审结论决定。

## 未采用方案

### 从 main 创建分支后覆盖 Arena

拒绝。main 的产品树是已退役实现，作为第一父会使审计和回滚都把旧产品当成默认真值。

### 整树使用 ours 策略

拒绝。虽然最终产品树应保持 Arena，但整树策略会隐藏 52 个冲突和 main 非冲突新增文件的逐项语义判断，无法证明治理意图是否已承接。

### Rebase 数百个 Arena 提交

拒绝。它会改写已验收历史、扩大冲突面，并使 Replay、产物和设备证据难以绑定到原候选。

### 只 cherry-pick main 的部分提交

拒绝。main 的 12 个提交同时混合旧产品实现与治理，提交级摘取不能形成可靠边界；适用治理意图已经按能力而不是按源码复制到 Arena。

## 影响

- 集成历史明确包含最新 main，Git 后续不会再次要求合并同一批 main 提交。
- Arena 产品实现、玩法手感、三端入口和交付字节不变；只有 commit/build identity 随双父提交变化。
- 回滚点是合并提交的第一父 `55230dd`。若回滚本次集成，应移动或反向提交集成分支，不删除 main 历史或恢复旧产品文件。
- 微信/抖音 iOS 与 Android 真机记录仍是发布门禁，不阻断本次代码合并判断。

## 验证

- 双父分别为 `55230dd5e5d655913fed2a8968c1720ec7538b16` 与 `4c340f1c5bc00dcae712c2261462661d842339da`，合并树与第一父 tree hash 相同。
- 退役路径扫描零命中；归真提交把本次暴露的 13 个旧 TypeScript 包、脚本和组合入口加入负向门禁，使受保护退役路径从 16 增至 29。
- `npm run check` 在 clean merge commit 上通过；61 个 Vitest 文件/387 项、88 个 Node 文件/706 项、104 项生命周期、120 场输入 fuzz、两组各 100 场 soak 均通过。
- Gameplay V2 hash `8c322912`、黄金 Replay manifest `a53b401d`、movement replay/final `8673e0bf / e560dd88`、正式资产 Bundle/预算 `e03ff2b4 / 82a8b378` 保持不变。
- Web/微信/抖音 delivery bytes 保持 `3807531 / 3835130 / 3835105`；除 `arena-build-manifest.json` 的 commit/buildId 外，三端产物与已验收基线逐文件相同。
- `npm audit --audit-level=high` 和生产闭包审计均为 0 vulnerabilities。
