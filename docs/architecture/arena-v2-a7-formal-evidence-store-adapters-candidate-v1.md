# Arena V2 A7 正式 Evidence Store Adapter 候选 V1

## 状态

- 日期：2026-08-15
- production reachability：`production-unreachable`
- implementation：`code-written-not-run`
- validation：`not-run`
- 当前门：`incomplete / hardGate=false`
- 默认入口与 Release Bundle：未接入
- 本批没有创建、读取或修改任何真实Evidence Store文件

## 显式Store布局

Adapter只能由调用方提供绝对`evidenceRoot`后创建，不提供默认根目录。规范Locator按以下方式映射：

```text
evidence://arena-v2/<path>
  → <evidenceRoot>/arena-v2/<path>
  → <evidenceRoot>/arena-v2/<path>.metadata.json
```

Factory首次执行Reader或Writer时会捕获`evidenceRoot`的规范真实路径与目录device/inode，并将该身份保留到Factory生命周期结束。每次读取、写入及返回前都会重新解析调用方原路径并核对同一目录身份；符号链接改指另一份即使具有相同Snapshot内容的Store，也会失败关闭。首次捕获失败保持粘滞失败，Factory不会在后续请求中静默绑定另一目录。

Evidence原始文件保存实际字节；sidecar精确保存：

- `schemaVersion=1`；
- Record ID；
- 原始Evidence Locator；
- Evidence Media Type；
- Recorded At UTC；
- Producer ID。

Reader使用项目既有稳定文件校验能力：打开普通文件、拒绝最终符号链接、限制显式最大字节、读取前后核对descriptor/path identity，并拒绝通过父级符号链接逃逸Evidence Root。sidecar对象通过完整字段与值验证后，还必须与公开规范序列化器生成的唯一UTF-8文本、字节长度和SHA完全一致；字段重排、缩进或额外空白都失败关闭。在读取体积更大的原始Evidence前，sidecar的Record ID、Locator、Media Type、Recorded At和Producer还必须与请求中已规范化的Expected Record逐项一致。未来Evidence Producer必须使用该序列化器，不能各自拼接metadata JSON。Reader不接受sidecar自报字节或SHA；Evidence字节长度来自实际文件，内容SHA由独立Hasher对返回字节重算。

Store Root还必须预先存在唯一Snapshot Manifest：

```text
<evidenceRoot>/arena-v2/store-snapshot.json
```

Manifest保存`Snapshot ID / Revision / Created At UTC / Formal Evidence Record Index Identity / Record Count`，Snapshot Identity由完整规范内容确定性生成。Manifest磁盘文件还必须等于该规范对象唯一序列化后的精确UTF-8字节；字段重排、缩进、额外空白或其他语义等价重写都会失败关闭，使一个Snapshot Identity只能对应一个可归档文件表示。候选公开唯一规范序列化器，未来Provisioner必须先创建并验证Manifest，再使用该序列化器取得待写入文本，不能自行依赖对象字段插入顺序拼接JSON。Retrieval Plan、Verifier Session、Reader/Hasher/Writer请求、回执Payload、验证目录和最终A7都绑定同一个Snapshot Identity。Adapter在每条Evidence读取前与原始字节读取后、回执写入前以及`committed`返回前稳定重读Manifest，核对Snapshot、索引与数量身份及规范字节；Snapshot创建时间不得早于其包含的任一Evidence记录。记录读取期间Snapshot发生切换时，Reader在返回字节前失败关闭。本候选不创建、更新或激活真实Snapshot。

## 回执原子发布

调用方必须预先创建并治理：

```text
<evidenceRoot>/arena-v2/a7/verification-receipts/
```

Writer不会递归创建可能穿过未知符号链接的治理父目录。Factory第一次写入时还会固定该父目录的规范真实路径与device/inode；后续批次写入前及`committed`回读返回前都必须仍为同一目录身份，父目录符号链接在同一Root内改指也失败关闭。回执sidecar与原始Evidence sidecar调用同一个公开规范序列化器，不维护第二套JSON字段顺序。回执正文同样通过公开规范序列化器重建完整外层身份、规范Payload和Payload Identity；外层Session/Plan/Index/Snapshot与内层Payload任一错配都不能产生待写字节，Writer不再另行拼接回执JSON。每次Verification Session：

1. 在同一父目录创建唯一staging目录；
2. 为整批回执及sidecar写入0600临时文件并同步；
3. 创建不可覆盖的Session reservation目录；
4. 将完整staging目录一次rename为`<session>/committed`；
5. 同步Session及其父目录；
6. 返回前从`committed`逐文件重新打开回执与sidecar，核对稳定路径/文件身份、原始字节、长度、SHA与规范metadata；
7. 只有全部回读一致的`committed` Locator会返回给A7。

相同Session Identity再次写入必须失败，不能覆盖已有回执。发布前失败清理staging与reservation；发布后的同步或回读失败尝试移除且只移除本次新建Session、再次同步治理父目录，并报告任何清理错误。该合同不授权删除任何既有Session；若清理本身失败，调用方得到包含主错误与清理错误的失败结果，不能把残留目录当作有效回执。

## 与核验器的关系

Store Adapter只提供三个端口：

- `evidenceReader`；
- `sha256Hasher`；
- `verificationReceiptWriter`。

Factory同时拥有并返回三个固定、互异的Adapter ID。Reader、Hasher和Writer在执行各自能力前，都会把请求中的ID与Factory固定ID精确比较；调用方不能把本实现的函数配上另一实现的身份写入Session、Payload或回执。Reader会在首次Store I/O前精确捕获外层请求并重建唯一Expected Record副本，拒绝future字段、访问器、非法索引/数量和非规范记录；Hasher同样精确捕获请求，只接受显式上限内的非共享`Uint8Array`并复制后计算SHA，避免调用方在Hash边界复用可变字节身份。Writer还会在任何Store I/O前精确捕获整批请求和每条Payload，验证其完整字段、三端口ID、时间与Evidence元数据，拒绝超过Factory单记录上限的自报字节，并用Verifier同一domain重新计算`verificationPayloadIdentityHash`。随后Writer按每条Payload的Verifier、核验时间和三端口ID重算Verification Session Identity，并在访问Store前闭合批次Session/Plan/Index/Snapshot、顺序和数量；不同Verifier或时间的Payload不能拼入同一批。外层Writer ID正确但内层Reader/Hasher/Writer ID、Payload hash或批次身份自报漂移时，整批不发布。规范组合可把Factory结果直接展开给Verifier，避免手工重复填写ID。

它不构造Retrieval Plan、不决定Verifier、不授予A7 PASS，也不接Freeze。Verifier仍负责顺序、角色、时间、源记录对账、回执身份互斥和无部分结果语义。最终验证目录逐条保留派生Retrieval Plan Identity和Store Snapshot Identity；A7会自行重建Plan后再对账，不能只依赖Writer自报。

## 延后验证

延期规格已覆盖：真实临时根目录取回、Factory绑定后Root符号链接改指同内容Store拒绝、Receipt Parent在首批后改指同Root另一目录拒绝、Reader/Hasher请求future字段与访问器拒绝、共享字节拒绝、规范sidecar与Expected Record漂移在Evidence读取前拒绝、Writer回执sidecar与回执正文分别等于公开规范序列化器输出、Writer超限Payload在Store I/O前拒绝、Factory外层与Writer Payload内层三端口ID冒用拒绝、Payload Identity与Verification Session Identity重算、批次身份在Store I/O前闭合、Snapshot Manifest身份/索引/数量/时间/唯一规范字节、Snapshot与原始Evidence sidecar语义等价重排拒绝、二进制SHA、committed回执、返回前回读、重复Session不可覆盖、符号链接逃逸、发布前失败无目标及发布后回读失败只清理新Session。全部规格、类型、治理、构建与设备验证均未运行；当前状态保持`production-unreachable / hardGate=false / code-written-not-run / validationStatus=not-run`。
