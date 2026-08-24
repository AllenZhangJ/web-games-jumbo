# ADR-135：Arena V2 三模式 Timeline 产品提案与变体

- 日期：2026-08-15
- 状态：`proposed-not-approved / production-unreachable / code-written-not-run`
- hardGate：`false`
- validationStatus：`not-run`

## 背景

旧 Timeline Policy 只有单一 hard limit，无法表达 Survival 的 1/4/8/12/16 敌人数运行变体。P2.0u/P2.0v 已拆开验证预算与交互式本地时限，但三模式当前手感数值仍缺一个不授予平衡批准的产品提案单一来源。

## 决策

1. 保留旧 Timeline 字段形状作为 V1。旧形状的 `contentVersion` 继续接受任意正安全整数；是否为 V2 只由自有 `variants` 字段判别，旧对象的规范化字节与哈希不变。
2. Timeline V2 固定 `contentVersion=2`。Duel/Race 只允许一个 `default` 变体；Survival 必须按 1/4/8/12/16 敌人数有序、无缺口地声明五个变体。
3. `arena-product-content` 唯一保存 `preserved-current-runtime-values` 提案：Duel 30/1800/3600，Race 60/5940，Survival 0准备、无突然死亡及 4930/6130/9730/12130/13330 五档 hard limit。
4. 产品三模式 Registry 候选只接受与该提案逐模式哈希一致的 Timeline；通用 ModeRegistry 仍接受合法旧 Timeline，不把产品值约束下沉为通用规则。
5. Runtime Policy Binding 的 V2投影必须显式提交 selector；selector、Policy版本与绑定身份进入投影哈希。真实 Runtime 目前只读取同源提案以保留既有数值，仍不注入 Timeline bundle。
6. 三模式资格报告逐变体比较后可报告 `runtimeMirrorsAligned=true`，但 `balanceApprovalStatus=not-run / mayWireRuntimeTimelinePolicy=false` 始终保持。

## 兼容与回滚

- V1旧形状、旧正整数版本与旧哈希保持兼容；V2只允许“基础Policy V1 + Timeline V2”。
- 默认 Registry/Composition/Entry 不接线，不修改Replay/Profile/Presentation或玩法数值。
- 回滚可删除Timeline产品提案文件及V2投影/资格增量，并恢复三个Runtime的本地只读常量别名；不得恢复验证预算反向推导产品时限。

## 未完成

测试、类型、构建、治理脚本、浏览器、设备、性能和真人证据均未运行。平衡批准、真实 Timeline bundle 接线与默认生产入口继续顺延。
