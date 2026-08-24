# Arena V2 A7 正式 Evidence 取回核验器候选 V1

## 状态

- 日期：2026-08-15
- production reachability：`production-unreachable`
- implementation：`code-written-not-run`
- validation：`not-run`
- 当前门：`incomplete / hardGate=false`
- 默认 Release Bundle / Entry：未接入
- 真实 Evidence store、SHA-256 Adapter、回执 Writer：未配置、未执行

## 目的

P7.50定义了A7最终Evidence记录和独立核验回执的数据形状，但future-only目录本身不能证明证据文件真的被重新读取。V1核验器补上可执行编排边界，同时刻意不拥有任何默认文件、网络或进程能力。

完整方向固定为：

```text
A7 V3 retrieval plan
  → injected Evidence Reader
    → injected SHA-256 Hasher
      → one atomic Receipt Writer batch
        → A7 V3 verification directory
          → A7 final evidence / Release Freeze
```

A7 V3先从Legacy Evidence、Approved Policy Assembly与Locator目录生成不授予PASS的规范取回计划。计划冻结完整Record Index、Index Identity与Plan Identity，解除“必须先构造最终A7才能取得待核验索引”的循环。

## 执行合同

核验器必须显式注入三个互异Adapter：

- Evidence Reader：按规范`evidence://arena-v2/...`Locator返回记录元数据与原始`Uint8Array`；
- SHA-256 Hasher：对核验器复制后的字节计算内容SHA；
- Receipt Writer：在全部记录读取和哈希成功后，一次原子提交整批规范回执。

核验器固定串行、并发度1。每条记录都要满足：

- Record ID、Locator、媒体类型、记录时间、Producer与计划完全一致；
- 实际字节长度等于计划字节；
- 实际字节SHA等于计划Evidence SHA；
- Verifier不等于计划目录中的任一Producer；
- 核验时间不早于任一记录时间；
- 回执Locator/SHA不复用源证据，也不复用其他回执；
- 回执Writer逐项回显Record Index、Payload Identity，并以整批原子结果返回。

全部回执保留Payload Identity，生成独立Receipt Index Identity并安全累加总字节。对外投影的`formalEvidenceRecordVerificationDirectory`精确符合A7 V3输入，不夹带Producer私有字段。

P7.55–P7.56继续要求调用方显式提供Formal Evidence Store Snapshot Identity。该身份进入Verification Session、Reader/Hasher/Writer请求、每条Payload、原子批回执结果和最终Verification Result；对外A7目录逐条保留同一个Snapshot Identity与派生Retrieval Plan Identity。A7 V3会从Legacy Evidence、Approved Policy Assembly、Locator Directory和Snapshot Identity重新生成Plan，再逐条核对目录中的Plan/Snapshot身份，禁止跨Snapshot或跨Plan拼接。

## 生命周期与失败关闭

- `created → running → completed/failed → destroyed`；
- `start()`只能调用一次；运行中禁止`destroy()`；
- 任一读取、元数据、字节、SHA、回执身份或端口结果失败时，不发布部分结果；
- 三个注入端口在成功或失败结算后立即释放；
- Receipt Writer必须由宿主保证一次调用的全有或全无原子提交，候选本身不提供默认写入实现；
- 成功结果也固定`hardGate=false`，不能直接授予A7 PASS、批准资产或发布资格。

## 当前明确不做

- 不读取本地文件、HTTP对象或云存储；
- 不实现默认SHA-256、默认时钟或默认回执持久化；
- 不创建真实证据、审批、设备、人审或发布记录；
- 不接默认Registry、Composition、Release Bundle或三端入口；
- 不运行测试、类型、构建、治理、设备或性能验证。

下一集中验证窗口需要执行延期的成功链、元数据/SHA漂移、恶意Promise/访问器、Adapter身份、原子批回执、重复身份、生命周期、治理边界与可达性规格。此前状态只能是`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
