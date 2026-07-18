# ADR-021：Stage 8 使用版本化产品设备证据与可校验构建 Manifest

- 状态：已接受；证据合同已实施，外部 Record 待采集
- 日期：2026-07-18

## 背景

Stage 6 已有输入/灰盒设备验收合同，但它不能证明 Product Session、Profile 双槽、奖励幂等、Canvas 产品 UI 与连续重赛。另一方面，仅在开发者工具截图或手写 commit 不能证明实际导入的 `game.js` 来自该 commit；“微信/抖音手机”各一条记录也无法证明 iOS 与 Android 都通过。

S8.5.6 还包含存档损坏、写失败和未来 schema，这些场景适合开发者工具故障注入；真机更适合验证系统打断、WebGL context、触控、安全区、帧时间、内存和长稳。强迫每台真机修改存档既不可重复，也会诱发伪造证据。

## 决策

### 复用证据框架，新增 Stage 8 Definition

保留 `ArenaDeviceAcceptanceDefinition → Record → Bundle → Report`，通过显式 Catalog 选择 Stage 6 或 Stage 8 Definition。CLI 默认仍为 Stage 6，保证现有命令兼容；Stage 8 必须显式使用 `arena.stage8.product-device-acceptance.v1`。

### 固定六个外部目标

Stage 8 需要微信/抖音开发者工具，以及两端各自 iOS、Android 真机，共六个 target。Definition 允许声明 `requiredOsNames`，Record 必须精确匹配；Stage 6 未声明该字段，因此原 Definition JSON/hash 不变化。

开发者工具执行正常产品闭环和存档损坏、写失败、未来 schema 三类故障。真机执行正常闭环、context recovery、性能采样和十分钟长稳。两者互不替代。

### 每次构建生成三端 Manifest

`scripts/build.mjs` 在每个 `dist/<target>` 写入 `arena-build-manifest.json`，记录：

- 40 位 commit、build ID 与源码是否 dirty；
- 目标平台与默认 Product/Greybox 入口；
- 除 Manifest 自身外全部文件的相对路径、字节数和 SHA-256；
- 小游戏 `game.js` 必须与所选 Product/Greybox bundle 哈希和大小一致。

Manifest 是数据合同，不进入 Authority，也不在运行时读取。独立 verifier 会重新枚举目录并阻止文件新增、缺失、篡改、符号链接或三端 build 身份漂移。

### Build Manifest 是唯一可跨 run 复用的附件

同一平台开发者工具与真机必须测试同一个构建，所以可引用同一 Manifest。截图、录像和日志仍必须每个 run 唯一，不能通过复制内容冒充不同宿主证据。证据 CLI 会解析 Manifest，并拒绝 dirty、commit/build 不一致、平台不一致或默认入口不是 Product 的记录。

## 未选择的方案

### 继续使用 Stage 6 Definition

会漏掉 Profile、奖励、产品 UI 与故障恢复，或者把 Stage 6 语义不断膨胀成无法冻结的清单。

### 只在文档中填写 commit

文本无法证明导入产物；旧缓存、手工替换 `game.js` 或不同构建混用都不会被发现。

### 把故障注入代码打进生产入口

会增加包体和攻击面，并让生产运行时出现第二条存储路径。故障通过开发者工具宿主能力执行，代码层继续由现有单测/压力测试覆盖。

### 用一个 phone target 代表 iOS 与 Android

两套宿主的 WebGL、CanvasTexture、安全区和内存行为可能不同，单条 Record 不能证明两者。

## 后果

正面：

- 设备证据与实际构建文件建立可重算关系。
- Stage 6 合同保持冻结，Stage 8 产品风险有独立版本。
- 开发者工具和真机各验证适合自己的风险，不制造无法执行的清单。
- 后续 Definition 可通过 Catalog 新增，不修改旧记录语义。

代价：

- 发布候选必须从干净 commit 重新构建，dirty Manifest 只能用于开发调试。
- 六个 target 都需要截图、连续录像和日志，采集成本高于一次人工冒烟。
- Manifest/Record 防止流程性混用和误标，但不是数字签名；若未来需要不可信提交者证据，应在独立 ADR 中加入签名或 CI provenance。

## 完成条件

运行 `npm run arena:product:device:evidence` 得到 `ready` Report，且六个 target 均来自同一 clean build。合同或模拟测试通过不能关闭 Stage 8。
