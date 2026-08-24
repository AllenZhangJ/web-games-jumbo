# Arena V2 A3–A6 生产批准新不可变账本组装候选 V1

## 状态与目的

- 状态：`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
- 目的：把一项或多项已完成七槽证据、独立评估和独立生产批准的Decision Record，机械组装为新的内容寻址账本提案。
- 当前只生成内存中的深冻结plain-data提案；不读取证据字节、不写文件、不替换当前账本、不发布账本、不授权正式资产运行。

## 开发路由

- 使用技能：`media-asset-management`，用于保持Source → Process → Deliver → Manage证据链和不可变版本身份。
- 强制参考：`arena-art-and-audio-development-flow.md`、`arena-art-bible.md`、当前生产批准证据账本V1、Accepted Evidence Set V1与Approval Decision Record V1。
- 本批不进入角色、武器、地图、VFX或音频资产制作，不改变任何资产字节和来源记录。

## 输入与组装规则

输入必须exact-key闭合，并显式绑定：

- 当前130项基线账本ID与`contentHash`；
- 精确下一`contentVersion`；
- 组装请求ID、组装人和UTC时间；
- 一至130项`decisionInput + approvalDecisionIdentity`。

组装器不会信任已经派生的批准摘要，而会逐项重新执行Decision Record与Accepted Evidence Set规范化。只有同时满足以下条件的记录可以进入提案：

- Decision为`approved`且仍绑定当前基线账本；
- Evidence Set精确包含同一资产的七个accepted槽；
- Catalog资产ID、路径和SHA-256与基线逐项一致；
- Asset、Decision、Evidence Set、批准记录Locator与SHA均唯一；
- 组装者不兼任任何被组装资产的collector、reviewer或approver；
- 组装时间不早于任何批准决定。

输入顺序不会成为身份来源。批准项按规范资产ID排序后进入提案，等价批准集合形成稳定顺序。

## 新提案与当前账本的关系

提案仍完整包含130项：

- 被批准资产标记为`approved-decision-assembled-not-published`，写入七槽接受身份与批准决定引用；
- 未提供批准决定的资产保持`missing-not-approved`及七槽`missing`；
- 所有资产继续`assetUsePermitted=false / formalReady=false`；
- 提案整体继续`publicationStatus=immutable-proposal-not-published`；
- 当前导出的V1基线账本对象不变，`currentLedgerMutated=false`；
- Bundle、Preloader与默认Entry均不消费该提案。

提案分别生成：

- 只由规范账本内容决定的`proposedLedger.contentHash`；
- 绑定组装请求、组装人、时间、批准Decision集合与账本内容的`immutableLedgerProposalIdentity`。

这两层身份避免把“机械账本内容”和“谁在何时提交本次组装请求”混为一个事实。

## 后续边界

本候选不实现账本发布。未来仍需独立Ledger Publication Decision/Owner重新核对完整或允许的部分批准覆盖、当前Catalog与预算身份、提案内容哈希、发布责任人和运行时消费范围，然后才能产生新的已发布不可变账本。该未来动作不得原位修改当前V1常量，也不得绕过Formal Bundle、Preloader和Entry的逐资产批准检查。

## 回滚点

删除组装源码、公开导出、延期测试、P6静态治理登记和本文即可；现有Evidence Submission、Independent Evaluation、Accepted Evidence Set、Approval Decision、当前130项账本、Catalog、预算与运行时入口均不受影响。
