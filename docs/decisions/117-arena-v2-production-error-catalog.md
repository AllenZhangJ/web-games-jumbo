# ADR-117：三端生产技术错误使用稳定诊断目录

## 状态

Accepted

## 日期

2026-08-04

## 背景

Arena 的 Web 生产 JavaScript 已接近单文件预算。联合生产依赖图中存在大量只用于开发诊断的
`new Error`、`new TypeError` 与 `new RangeError` 静态文本。这些文本不是权威状态、Replay、hash、
公开业务文案或玩家操作语义，但过去随每个平台的 JavaScript 重复交付。直接删除文本会让启动失败和
线上诊断失去可关联证据；只压缩 Web 又会让共享包的同一错误在三端得到不同身份。

现有 `ProductMessageCatalog` 的八类玩家文案属于公开产品合同，不在本决策范围。`Error.name`、
构造器类型、`cause`、动态表达式求值和 `AggregateError` 聚合语义也必须保持。

## 决策

构建开始前，从 Web、微信和抖音三个 Product entry 分别计算生产可达图，并取
`packages/arena-*/dist` JavaScript 模块的联合 inventory。每个可识别的 Error 构造节点必须归入：

- `transformed`：真实全局 `Error`、`TypeError` 或 `RangeError`，且首参数是字符串或模板；
- `semantic-preserve`：经明确登记、必须保留原技术文本的观察点；
- `dynamic-approved`：首参数不是静态字符串/模板，保持原样；
- `aggregate-error`：`AggregateError`，保持原样；
- `custom-error`：自定义 Error 类或被词法绑定遮蔽的同名构造器，保持原样；
- `unsupported`：无法证明语义的构造形态，构建失败。

`unsupported` 和未分类数量必须为零。Quick Match 的缺失数据方法分支改用包内
`MissingDataMethodError` 类型身份，不再观察 `error.message`，因此不需要把技术中文加入
`semantic-preserve` 白名单。

### 稳定码与变换

稳定身份由 schema/transform 版本、构造器、模板静态段、占位数量及规范化表达式 AST 组成；不包含
行号、chunk、平台或遍历顺序。码为 `E` 加 SHA-256 base64url 前六字符，共七字符。不同身份得到同码时，
在任何平台候选发布前失败，不自动加盐。

只替换构造器首参数。动态模板保留每个表达式一次且保持从左到右顺序、模板原生 ToString 以及后续
`cause` 等参数的求值顺序。构造器、`name` 与 `AggregateError` 不变。变换使用
`magic-string@0.30.21` 生成 hires source map；Web 最终 map 必须可追溯到包的原 TypeScript source。

### 产物分层

Web 在 `assets/diagnostics/arena-production-error-catalog-v1.json.gz` 发布完整、canonical、稳定排序的
联合目录；构造器、规范化表达式 AST、source sites 与完整 identity 均不得投影删除。gzip 只使用
Node 内置 zlib 的固定参数，不写时间戳或文件名；`catalogHash` 散列未压缩 canonical JSON。微信和
抖音只发布 exact-key reference：schema、transform ID、catalog hash、source inventory hash，不复制
目录正文。普通 build manifest 按真实 gzip 字节绑定这些文件，gzip 不得从 4 MiB 门中排除；目录
不是设备 READY、性能或发布门通过证明。

三个目标使用同一 transformer。每个目标实际 encounter 的模块和替换数必须与该目标 inventory
精确一致，并且是联合 inventory 的子集。catalog/reference 均使用 SHA-256、最终字节重读和
no-overwrite 候选目录；source 漂移、碰撞、路径逃逸、陈旧 reference、漏转、额外字段或部分 JSON
均失败关闭。Web 与小游戏都只在候选完整后原子发布，失败不留下半包。

### 启动友好提示

Web startup fallback 只从外部抛值 `message` 的 own data descriptor 读取
`/^E[A-Za-z0-9_-]{6}/`。不执行 getter，也不使用 `instanceof`、`String` 或 `toString` 观察任意外部
throwable。玩家只看到固定中文提示和可选“诊断码”；读不到安全码时只显示固定提示。

## 被否决方案

### 使用六字符码

否决。虽然原型可刚好通过 Web 单文件预算，但碰撞空间和后续目录增长余量不足。采用七字符码并由
表现 helper 去重回收至少 2 KiB。

### 只变换 Web

否决。同一共享生产错误会按平台产生不同诊断身份，给三端复现和支持流程制造漂移。小游戏通过小型
reference 绑定同一完整目录，不承担目录正文的重复交付。

### 按行号、chunk 或遍历序号编号

否决。无语义的构建顺序变化会改码，也无法在三端保持一致。

### 直接隐藏所有异常文本

否决。线上错误将无法与源码诊断目录关联；同时可能误伤公开文案或依赖 message 的控制流。

## 后果

- JavaScript 只保留短码与动态诊断值，完整静态模板转移为受 manifest 约束的诊断数据。
- catalog 会增加 Web 总交付字节，但不计入 JavaScript 单文件；仍必须通过现有 4 MiB 总预算。
- 新增任何 `Error` 构造形态都必须进入机器 inventory 的明确 disposition。
- `Error.message` 继续被定义为非权威诊断字段；不得进入 Replay、authority hash 或业务分支。
- 本 ADR 不授权 PA6/PA7 性能、设备、模拟器、A2/P2、commit 或 push。

## 验证

- 稳定码、碰撞失败、canonical identity、动态表达式顺序/次数/ToString/cause 与构造器反证；
- Quick Match 不读取 message；startup hostile getter/Proxy 不执行；
- 三端联合/目标 inventory、漏转和 source 漂移反证；
- Web catalog gzip 的确定性、压缩/解压上限、篡改/截断/bomb/非 gzip，以及小游戏 reference
  exact-key、hash、路径、no-overwrite 和最终字节重读；
- Web 最终 source map 回到原 TypeScript；
- 三端双构建 bytes/SHA、manifest、production artifacts、资产/供应链/docs 与现有预算门。
