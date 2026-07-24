# ADR-027：正式资产先经过来源、授权与字节级入库合同

- 状态：已接受并实现；2026-07-23 已完成真实 Bundle 与 Allen 批准，S7.5 目标真机验收未完成
- 日期：2026-07-21

## 背景

S7.1 已能通过稳定 `PresentationAssetDefinition` 替换程序化角色，但“有一个 GLB”不等于该资产可以合法进入正式构建。购买页可能下架，授权范围可能不含商业发布或修改，文件也可能在审批后被替换。若等到 S7.5 才补来源和许可，资产身份、代码引用和法律材料很容易无法一一对应。

合同建立后，项目接入了 KayKit Rogue、Skeleton Warrior 与圆盾，并把外置 PNG 作为 GLB 的运行时依赖。治理必须同时固定主文件和依赖文件，不能只对 GLB 建摘要而允许纹理静默替换。

## 决策

在正式资产接入 Loader 和产品 Registry 之前，先经过独立的 `Formal Asset Intake`：

1. `FormalAssetIntakePolicy` 固定允许的来源类型、必须/禁止的资产 tag、禁止的 Provider，以及商业使用、修改和随构建分发的最低权利。
2. `FormalAssetProvenanceRecord` 把一个稳定 asset ID 和 Definition hash 绑定到来源定位、来源 revision、主内容及 `dependencyArtifacts` 的 SHA-256、许可证文本、权利持有人、权利标志、授权证明和批准记录。
3. `FormalAssetIntakeBundle` 要求资产 Definition 与 provenance 一一覆盖；内容路径只能属于一个 asset ID，共享许可或证明只有在路径、大小和摘要完全相同时才允许复用。
4. `arena:assets:intake:verify` 在独立证据根目录重新读取全部声明文件，拒绝目录逃逸、符号链接逃逸、大小或摘要变化。

V1 Intake Policy 允许原创、委托、购买和开源四类来源，但都必须明确允许商业使用、修改和随最终构建分发。程序化灰盒 Provider 与 `greybox` tag 明确禁止；正式 Definition 必须带 `formal` tag。

授权证明可以保存在受控的外部证据目录，不要求将合同、发票或个人信息提交到 Git。Bundle 只保存稳定相对路径和摘要。

## 明确不是本决策的内容

- Intake 通过只表示来源、授权声明与文件完整性可复验，不表示角色造型、动画、可读性、性能或三端生命周期通过。
- GLB Provider、正式双角色和动作运行时已经接入，真实 Bundle 与项目负责人批准已闭环；这些仍不能替代目标真机证据。
- 三端 4 MiB 构建预算和 `arena.stage7.formal-asset-budget.v1` 已通过；目标真机峰值内存、加载时间和画面可读性仍需设备记录。
- `stage7.formal-assets` 发行 producer 仍不可用，直到正式双角色、动作覆盖、reduced-motion、预算和真机材料都有可重算的真实合同。

## 被否决方案

### 只在第三方声明中写一个下载链接

链接不能证明构建中实际使用的字节，也不能防止供应商更新或本地替换。Definition、内容摘要、许可文本和证明必须闭环。

### 把授权字段直接塞进 PresentationAssetDefinition

会让 CDN/Provider/表现内容与法务材料一起变化，并迫使运行时加载不需要的敏感元数据。Presentation Definition 保持运行时最小；Intake Bundle 作为独立治理证据。

### 先给占位资产填“正式”tag

会让 Stage 9 在没有真实内容时产生虚假完成度。V1 Policy 明确拒绝程序化 Provider 和 greybox tag。

## 后果

正面：

- 购买、委托、原创或开源资产使用同一套可复验入口。
- 资产换源、换版本或换授权都会改变 hash，不能静默沿用旧批准。
- 许可和证明可以外置保存，不污染运行时代码与构建。

代价：

- 每个正式 asset ID 必须维护 provenance record 和三类 artifact。
- 真实资产变更后必须重新批准和生成 Bundle。
- Intake 只关闭治理风险，不能减少后续动画、预算和真机验收工作。

## 项目方输入

进入正式资产冻结前的项目方来源/造型确认已由 Allen 完成：

1. 对当前 KayKit 开源来源和项目自制武器的成本/发行策略签字。
2. 对 Rogue、Skeleton Warrior、盾牌、锁链和重锤的最终造型签字。
3. `approvedBy/approvedAt`、来源批准记录和正式 Bundle 已于 2026-07-23 完成；后续任何字节、Definition、来源或许可变更都必须重新批准。

完整操作见 [Stage 7 正式资产入库手册](../acceptance/stage7-formal-assets/README.md)。
