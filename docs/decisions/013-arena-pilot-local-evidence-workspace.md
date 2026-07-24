# ADR-013：Arena 盲测使用版本化本地证据工作区与协作租约

- 状态：已接受（S6.6.3a～c 已实施）
- 日期：2026-07-18

## 背景

S6.6.2 已能分配 A/B assignment，并从真实 MatchSession 消费的 `InputFrame`、快照和权威事件生成自动指标，但持久化仍只是抽象回调。独立盲测入口需要跨刷新保存入组、进行中的阶段和终态记录，同时避免两个页面把同一个 `enrollmentIndex` 分给不同参与者。

旧 Platform Storage Contract 的 `storageGet()` 把“键不存在”“JSON 损坏”和“宿主读取失败”都折叠成 `undefined`，无法安全决定应该创建默认数据还是停止写入。Web `localStorage` 和小游戏同步存储也不提供跨多个 key 的事务；直接分别保存 ledger、checkpoint 和 records 会产生孤立 assignment 或重复终态记录。

盲测数据不是 MatchCore 权威状态，不应为了恢复半局而把 Renderer、平台墙钟或原始触点引入 Core。首版也没有服务器、账号或跨设备同步。

## 决策

### 1. Platform Storage 提供有结果的同步端口

Platform Contract 新增：

- `storageRead(key) -> { ok, found, value }`
- `storageWrite(key, value) -> boolean`
- `storageDelete(key) -> boolean`
- `wallNow() -> integer milliseconds`

旧 `storageGet/storageSet/storageRemove` 保留为兼容入口，并委托给同一平台实现。`wallNow` 只用于本地 lease 过期，不参与权威 tick、自动试验时长、Replay 或 state hash。

小游戏 adapter 优先使用 `getStorageInfoSync().keys` 区分缺失 key，并识别抖音官方 `getStorageSync` 的 `100599 data not found`；其他宿主异常仍返回读取失败。参考：[抖音 `tt.getStorageSync`](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/api/data-caching/tt-get-storage-sync)、[抖音 `tt.getStorageInfoSync`](https://developer.open-douyin.com/docs/resource/zh-CN/mini-app/develop/api/data-caching/tt-get-storage-info-sync)。

### 2. 一个 Workspace 保存完整证据聚合

`InputPilotWorkspace` 同时保存：

- 当前 Definition ID/hash 与单调 revision。
- `InputPilotEnrollmentLedger` 快照。
- 至多一个 `enrolled/running/reviewing` active checkpoint。
- 已完成、放弃或作废的终态 records。

每个已入组 assignment 必须恰好由 active checkpoint 或一个终态 record 覆盖。Workspace 在写入前验证全部嵌套 schema、未知字段、Definition 绑定、重复 trial/assignment 和覆盖关系。聚合根显式探测 Assignment、Ledger、Checkpoint、Record 的未来 schema；旧客户端不能把嵌套新版本误当损坏并覆盖。

### 3. 双槽提交，head 只作提示

`InputPilotWorkspaceRepository` 使用 A/B 数据槽和一个 head：

1. 打开时读取并校验两个槽，不盲信 head。
2. 选择 revision 最高的有效槽；同 revision 不同 hash 硬失败。
3. 以 expected revision 做进程内 CAS 检查。
4. 写入非当前槽，立即读回并验证 envelope、payload、hash 和 revision。
5. 读回成功才更新 head 与内存快照；head 失败不否定已经验证的槽。

Envelope 的创建、校验与未来版本探测由独立纯数据模块负责，Repository 只编排 lease、槽选择、CAS 和生命周期。Envelope hash 用于发现截断、损坏与部分写入，不声称防篡改。普通损坏槽可以回退；任何 envelope、workspace 或嵌套未来 schema 都停止打开且不覆盖。

### 4. 协作 lease 限制本地单写入者

Repository 打开前取得带 owner、revision、acquiredAt 和 expiresAt 的同步 lease。写入前再次确认 lease 与 expected revision；打开失败会释放已取得的 lease，destroy 幂等释放。损坏的临时 lease 可以重建，未来 lease schema 必须保护。

这是面向首版“同一设备、一个观察者入口”的协作租约，不是分布式事务或安全锁。同步 Storage API 无法提供跨浏览器进程的强原子 compare-and-swap；极端并发最多形成可检测的同 generation 冲突，不能静默选择不同内容。若未来允许多窗口高并发、远程采集或云同步，必须在此接口后换成 Web Locks/IndexedDB 事务、平台事务能力或服务器协调，而不是扩大当前 lease 的承诺。

### 5. A/B 同区组共享比赛 seed

`InputPilotAssignment` schema 升至 V2，增加由 Definition assignment seed 和 block index 派生的 `matchSeed`。每个完整 A/B 两人区组共享同一个 match seed，相邻区组使用不同 seed，避免地图、装备或隐藏难度差异污染 Mapper 对比。

当前没有真实已采集 assignment，因此不迁移尚未产生的 V1 数据；旧合成快照会被明确拒绝。

### 6. 不持久化半局 MatchCore

Checkpoint 只保存试验阶段、assignment、环境、资格、reviewing 阶段的已冻结自动指标和已校验复核草稿，不保存 MatchCore、Bot、Pointer、Renderer 或隐藏难度。S6.6.3b/c 的 Trial Controller 对刷新后的 `running` trial 生成可审计的 invalidated 终态；`reviewing` 恢复观察者与自评草稿。这一终态编排不由 Repository 猜测。

### 7. Trial Controller 是采集生命周期唯一所有者

Controller 在运行时创建前先持久化 `running`，在正常结束、超时或主动结束时先提交带自动指标与草稿的 `reviewing`，再销毁 Runtime。启动失败、运行时失败、运行中刷新和无法完成原子转换均失败关闭；不伪造观察或自评证据。

Web 工作台只通过只读快照和显式 action 与 Controller 交互。具体 `ArenaPresentationSession` 适配放在 `presentation/session`，DOM 与下载放在 `entry`；无渲染 Pilot 层不依赖具体 Session、Three.js 或宿主 API。

## 被否决方案

### 单 key 原地覆盖

容量失败、退出或宿主异常可能同时丢失新旧值，也没有读回确认和最后有效版本。

### Ledger、Checkpoint、Record 分 key 独立保存

需要跨 key 事务才能保证 assignment 不孤立、终态不重复。当前三端同步存储没有统一事务合同。

### 直接引入 localForage、IndexedDB 或 Web Locks

localForage/IndexedDB 只覆盖 Web，不能直接解决微信和抖音；Web Locks 也不是三端公共能力。当前数据量小且写入频率低，先保留可替换 Storage Port，不增加第二套运行时依赖。

### 首版使用后端收集

会引入账号/匿名标识治理、网络重试、服务端幂等、隐私与运维，超出本地 1v1 V1 和当前最低样本 pilot 的范围。

### 恢复一半 MatchCore 对局

需要持久化完整权威状态、输入、Bot 时序和内容版本，扩大攻击面并把研究入口与 Core 生命周期耦合。首版将中断局作废并重新入组更可审计。

## 后果

正面：

- 缺失、读取失败、普通损坏和未来版本有不同处理语义。
- assignment、active trial 与终态 record 作为一个聚合提交，不产生半份证据。
- A/B 同区组控制比赛 seed，分组仍可复现且追加稳定。
- Repository、平台 adapter 和后续 UI/Trial Controller 可分别测试和替换。

代价与限制：

- 每次提交需要槽写入、读回和可选 head 写入，代码与故障矩阵增加。
- 本地数据可被用户修改，hash 不是安全签名。
- 协作 lease 不能替代真正的跨进程事务；V1 明确限制为一个观察者采集页面。
- 独立 Web 入口、终态表单与导出已实施，但仍不证明微信/抖音 pilot UI、目标设备 E3 或真人 E4 盲测已完成。

## 生效证据

- Workspace 不变量、嵌套未来 schema、A/B 同 block seed 有自动化测试。
- lease 覆盖竞争、续租、过期接管、损坏恢复、未来版本、墙钟倒退和同步合同。
- Repository 覆盖双槽轮换、读回、head 失败、槽损坏、双损坏修复、同 generation 冲突、打开失败清理和 stale CAS。
- Web、微信/抖音 adapter 覆盖缺失、成功、删除、JSON/容量/宿主错误与抖音缺失错误码。
- 当前门禁结果见 [S6.6.3a 持久化基础门禁记录](../research/arena-stage6-input-pilot-persistence.md)。
- Trial Controller、可恢复复核草稿、导出与独立 Web 入口证据见 [S6.6.3b/c 盲测终态与 Web 工作台门禁记录](../research/arena-stage6-input-pilot-workbench.md)。
