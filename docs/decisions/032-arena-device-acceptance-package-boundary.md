# ADR-032：设备验收 Definition 独立于运行时与性能组合

- 状态：已接受并实施（G5.28a）
- 日期：2026-07-22
- 决策人：Allen（GitHub：`@AllenZhangJ`）
- 代码提交：`c523d7a00e78a0342e1f2bbe1ef65e12fbb8888d`

## 背景

Stage 6、Stage 8 和 Stage 9 的设备验收 Definition 原位于 `src/arena/presentation/acceptance`。它们不渲染、不采集宿主数据，也不参与对局，却因目录位置容易被误认为表现运行时的一部分。记录、Bundle、构建清单和性能报告又从多个 Release、CLI、测试与资产模块以相对路径读取这些 Definition，形成跨层私有路径耦合。

Stage 9 设备 Definition 需要由性能 Policy 的六个目标派生；性能 Policy 同时需要设备平台词汇。如果把全部设备和性能实现一次性塞进同一个低层包，会掩盖真实依赖并制造循环组合。

## 决策

新增 strict `@number-strategy-jump/arena-device-acceptance`，当前只拥有：

- 设备平台、执行表面和证据附件种类等稳定词汇；
- 不可变 `ArenaDeviceAcceptanceDefinition`、check 与 target 数据合同；
- 不依赖性能 Policy 的 Stage 6 与 Stage 8 固定 Definition。

该包只允许依赖 `arena-contracts`，不得依赖 Presentation、Performance、Product、Release、Node、Three.js、DOM、平台 API、墙钟、随机源或网络。所有数据先完整复制、校验并冻结；访问器、Symbol、循环引用、非有限值、重复 id、悬空 check、空附件集合和非法枚举在 Definition 发布前失败关闭。

Stage 9 设备/性能目标组合暂时保留在上层。后续迁移时，性能数据合同依赖设备平台合同，Stage 9 的具体 Policy 与 Device Definition 在更高组合层相互校验；不得让低层设备包反向依赖性能实现。

通用证据标量继续由 `arena-evidence-contracts` 独立拥有。设备 Record、Bundle、构建 Manifest 和性能报告会按这一依赖方向分批迁移，不允许创建通用 Evidence Manager。

## 被否决方案

### 把设备验收放入 presentation runtime

运行时负责输入、节拍、反馈和资源生命周期；设备验收描述外部材料和发布门禁。运行时依赖验收报告会把发布流程带入每帧生产链，并反转依赖。

### 一次性建立包含设备、性能、构建和 Release 的大包

这会隐藏 Stage 9 的组合关系，使低层平台词汇与上层 Policy 互相持有，并迅速演化成 God Utility。分层包和显式组合更容易测试、替换和审计。

### 保留 `src` 私有相对路径

CLI、Release、测试和资产模块继续穿透私有目录会让重构没有稳定 API，也无法用 workspace 依赖和 strict 类型锁定边界。

## 后果

正面：设备验收 Definition 有稳定公开 API；Stage 6/8 目录只有一个真值；架构门可精确禁止运行时和宿主依赖；消费者不再穿透私有实现；Stage 9 循环依赖被显式留在待迁移组合层。

代价：迁移期同时存在 strict 设备基础包与上层 Stage 9/Record/Bundle 实现；新增性能目标必须在上层组合中完成双向注册校验，不能直接加入低层设备包。

执行证据见 [Arena 企业治理状态台账 G5.28a](../governance/arena-enterprise-governance-status.md#g528a-证据标量与设备验收-definition-分层证据)。
