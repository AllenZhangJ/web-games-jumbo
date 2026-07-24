# ADR-014：Arena 设备验收使用版本化证据包与内容寻址附件

- 状态：已接受（Stage 6 E3 执行基础）
- 日期：2026-07-18

## 背景

Stage 6 已有单元、模拟、回放、fuzz、soak 和 Web 工作台证据，但 E3 仍只在验收矩阵中以文字列出。自由格式的截图或“真机已通过”无法可靠回答：

- 是否针对当前 commit 和同一份构建。
- Web、微信、抖音的开发者工具与真机还缺哪个目标。
- 多指、cancel、前后台、安全区、再来一局和 WebGL 恢复是否都有原始证据。
- 附件是否被替换、截断、跨运行复用或通过符号链接逃逸归档目录。

设备信息、操作时间和录屏不是 MatchCore 权威状态，也不是 E4 受测者数据，不应进入 Rule/Core、Replay 或 Pilot Workspace。

## 决策

### 1. 设备验收是独立 Presentation/Acceptance 聚合

`ArenaDeviceAcceptanceDefinition` 定义目标、检查项、最少通过次数和必需附件类型。`Record` 记录一次最终设备运行，`Bundle` 绑定一个完整 Git commit 与 build ID，`Report` 只做可重现的完整性判定。

该层只依赖纯数据校验与确定性 hash，不依赖 Renderer、Session、DOM、平台 API 或 Node 文件系统。文件读取与 SHA-256 校验仅存在于外层 CLI。

### 2. Stage 6 V1 固定五个 E3 目标

- Web 手机浏览器真机。
- 微信开发者工具。
- 微信手机真机。
- 抖音开发者工具。
- 抖音手机真机。

每个目标至少一次通过，并要求截图、录屏和日志三类附件。真机额外要求 WebGL context loss/recovery；开发者工具不伪装该项的真机证据。

### 3. 记录必须与构建、客户端和设备环境绑定

每条 Record 包含：

- 40 位 Git commit、build ID、Definition ID/hash。
- target/run/record ID 和 UTC 执行时间。
- 匿名 operator ID，不保存真实姓名。
- 客户端版本、小游戏基础库版本、设备型号和系统版本。
- 每个必测项的 pass/fail、观察说明和附件引用。

一个 Bundle 不允许混入不同 commit/build，也不允许重复 record ID、run ID 或跨运行复用同一附件路径。

### 4. 附件使用相对路径、字节数与 SHA-256

Manifest 拒绝绝对路径、URL、反斜杠、空段、`.` 和 `..`。CLI 读回时使用 `realpath` 再次确认附件没有通过符号链接离开证据根，使用同一打开文件句柄检查前后状态、字节数与 SHA-256，并拒绝同路径、同文件或同内容附件复用。

Definition 和汇总的项目内 hash 用于确定性变更检测；附件 SHA-256 用于内容完整性。两者都不声称身份签名或防恶意篡改。

### 5. 同一构建的失败不能被成功样本抵消

目标在没有失败 Record 且达到最少通过次数时才是 `ready`。同一 commit/build 只要存在失败，目标与整个 Bundle 都保持 `failed`。真正修复必须产生新 commit/build 并新建证据包，不通过选择性删除失败来“变绿”。

## 被否决方案

### 只保留截图与 Markdown 结论

无法验证构建身份、必测项完整性和附件是否变更，也容易在新包上误用旧截图。

### 把设备信息写入 MatchCore 或 Replay

会污染确定性权威数据，使回放 hash 受宿主和墙钟影响。

### 复用 Input Pilot Workspace

E4 Pilot 是匿名受测者 A/B 数据，E3 是构建/设备运行证据。两者隐私、生命周期、完成判定和保留策略不同，强行复用会制造两个模型的联合 God Object。

### 首版引入服务器、数据库或第三方采集 SDK

当前只需五个 Stage 6 目标和少量人工运行。引入账号、网络重试、服务端幂等和隐私合规超出当前复杂度；纯数据接口保留了未来替换路径。

## 后果

正面：

- E3 缺失、失败和完整通过有不可混淆的机器结论。
- 设备目标、检查项和附件类型可通过新 Definition 扩展，不改动 Record/Bundle/Report 编排。
- Stage 9 可以用新 Definition 增加低档/主流机和性能指标，不需把 Stage 6 文档升格为通用代码。

代价与限制：

- 每次最终运行需整理 manifest、录屏、截图与日志。
- CLI 能证明附件与 manifest 一致，不能自动判断录屏中的玩法是否真正正确；仍需复核者审看。
- 本 ADR 和当前空证据包不证明 E3 已通过，只证明执行合同已就绪。

## 生效证据

- Definition/Record/Bundle/Report 的 schema、深冻结、未知字段、引用完整性和汇总状态有单元测试。
- CLI 用临时真实文件验证目录边界、字节数、SHA-256、内容复用、符号链接逃逸与篡改拒绝。
- 执行协议见 [Stage 6 E3/E4 验收操作手册](../acceptance/stage6/README.md)。
