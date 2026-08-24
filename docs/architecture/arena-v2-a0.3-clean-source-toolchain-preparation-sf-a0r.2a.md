# Arena SF-A0R.2A A0.3 clean-source工具链准备

## 状态与范围

- 阶段ID：`SF-A0R.2A`
- 状态：`toolchain-preparation / code-written-not-run / validationStatus=not-run / hardGate=false`
- 起点：协调者退回SF-A0R.2机器证据；原因是生成器修改后未先形成clean commit，产物错误声称绑定`baselineCommit=de1ef89`
- 范围：A0.3 source-freeze helper、render/blind/gate/human生成器、检查器、延期反证夹具和美术状态文档
- 非目标：不重生成或覆盖当前PNG/manifest/blind/proxy/gate/human kit，不运行生成/检查/测试，不修改生产package、P2–P7台账或通用生产计划，不commit/push
- 使用技能：`game-art-director`、`media-asset-management`
- 泛化技能缺口：`docs/collaboration-protocol.md`、`docs/game-design-theory.md`、`templates/art-bible.md`仍只登记为红缺口，不创建占位

当前机器产物保留原字节用于审计失败轮，但统一标记`non-admissible-dirty-toolchain-source`。它们不能证明A0.3 source identity闭合，不能作为B段输入，更不能开放Blockout。

## A/B两段协议

### A段：toolchain-preparation

本批只提交工具链代码。工具链不得硬编码协调者未来提交：

1. 协调者通过`ARENA_A0_3_EXPECTED_SOURCE_COMMIT=<40位clean commit>`显式指定B段目标；`render-arena-silhouettes.ts`调用`acquireArenaSilhouetteCleanSourceFreeze(expectedSourceCommit)`，从当前Git HEAD动态取得完整`sourceCommit`和提交日期，并要求二者精确一致。未来commit不写死在源码。
2. clean预检通过前不调用`mkdirSync`、Sharp输出、manifest写入或任何A0.3证据写操作。
3. render manifest未来写入完整`sourceFreeze`，包含当前实际`runtimeToolchain`；下游只继承该对象，不自行猜commit或运行环境。
4. blind/gate/human/checker调用`validateArenaSilhouetteInheritedSourceFreeze()`；不再要求全工作树clean，因为render输出本身会造成预期dirty。
5. A段提交后必须暂停并行写入；只有协调者确认该提交clean且远端一致，才能开放B段生成窗口。

### B段：clean-source regeneration

协调者提交A段形成clean commit后，B段必须在同一commit、无并行写入的窗口中依次执行：

`render/PNG → blind questions/answer/proxy/package → gate → human kit → positive checks → isolated fail-closed`。

B段产物必须记录A段clean commit的`sourceCommit`、同一`sourceFreeze`和各自generator identity。任何HEAD切换或关键文件漂移都在下游写入前拒绝。B段完成后才可评价机器结果；真人仍须独立执行。

## 首输出前clean检查

新增[`arena-silhouette-source-freeze.ts`](../../scripts/art/arena-silhouette-source-freeze.ts)执行以下顺序：

1. 在Git目录创建排他`arena-a0.3-source-freeze.lock`；锁位于`.git`，不会污染工作树。已有锁时直接拒绝，不并发启动第二个render。
2. 确认`git rev-parse --show-toplevel`等于当前仓库，并取得当前完整HEAD。
3. 要求HEAD精确等于协调者显式传入的40位目标提交；缺失、缩写或错误目标均拒绝。
4. 执行`git status --porcelain=v1 --untracked-files=all`；任何tracked、untracked或并行差异均拒绝。
5. 对固定关键集合逐项执行`git ls-files --error-unmatch`，读取工作树字节并与`git show <sourceCommit>:<path>`逐字节比较。
6. 关键集合包括根`package.json / package-lock.json`、相机、方向resolver、当前Catalog、生产批准账本、Stage7 intake、两角色/圆盾GLB、校准图、CC0许可/来源证明，以及包含source-freeze helper在内的14个A0.3生成/检查/答卷工具文件。
7. 全部hash完成后再次读取HEAD和全工作树status；任一变化拒绝。
8. 只有目标commit、双重HEAD/status及逐字节比较同时通过，才返回`clean-at-render-start`证据并允许第一个输出写入。
9. 144张输出完成后、写render manifest前再执行一次继承校验；若期间出现非A0.3输出路径dirty、HEAD切换或关键字节漂移，则不发布新的manifest。

Git没有跨进程文件系统事务，排他锁只能串行化A0.3 render，不能阻止其他开发任务写文件。因此B段仍要求协调者暂停并行写入。双重检查负责首输出前检测竞争；下游关键文件复核负责检测首输出后的漂移。

## 预期dirty与下游继承

render一旦写PNG/manifest，工作树按设计变dirty。下游若再次要求全局clean会错误拒绝合法证据链，因此采用以下边界：

- `sourceCommit`必须仍等于当前HEAD；禁止换commit后继续沿用旧render。
- `sourceFreeze.toolchainPaths`和`criticalArtifacts`必须是固定规范集合，不能漏项、增项或重排。
- `runtimeToolchain`必须exact-key记录实际`nodeVersion / platform / arch / threeVersion / sharpVersion`。Node值直接来自当前进程；Three/Sharp版本通过当前模块解析到实际安装包的`package.json`读取，禁止手写。
- 下游解析Git porcelain，dirty/untracked只允许位于`docs/quality/art/silhouette/`；任何package、script、Art文档或其他路径变化直接拒绝。
- 下游重新从`git show <sourceCommit>:<path>`取得关键文件并与当前字节比较，再核对byteLength/SHA与`cleanCheckFingerprint`；调用方不能通过重算manifest伪造dirty关键源。
- `cleanCheckFingerprint`同时覆盖`sourceCommit / commit date / criticalArtifacts / runtimeToolchain`；同一commit下Node、OS/CPU架构、Three或Sharp任一漂移均拒绝。
- render/blind/gate/human必须逐值继承同一`sourceFreeze`；proxy继承同一`sourceCommit + fingerprint`。
- 生成输出目录不属于关键源码集合，因此render产生的预期证据diff不会被误判为source drift。
- 任何package、工具、GLB、许可、证明、Catalog、ledger或HEAD漂移都在下游写入前失败关闭。

## 延期失败关闭夹具

现有反证源码已从固定`baselineCommit`改为动态`sourceCommit`，并新增：

- sourceCommit篡改；
- source-freeze fingerprint篡改；
- critical artifact SHA篡改；
- runtimeToolchain任一字段漂移；
- render与blind继承对象分叉；
- blind/human generator身份漂移。
- 错误目标commit及render后dirty重入均须在输出SHA变化前拒绝。

这些夹具本批不运行。B段应先验证dirty起跑在首输出前拒绝，再在clean commit与固定实际运行环境上完成render；render造成预期dirty后，正向下游应通过，而上述漂移探针必须失败。延期计数现为gate manifest `25/25 + 2项clean-start`、human kit `18/18`，不得沿用失败轮旧计数。

## 当前不可采信产物

以下现有内容必须保留但不得采信：

- `docs/quality/art/silhouette/`下当前render manifest、288张PNG、blind questions/answer/images/package、proxy、gate、human kit；
- 当前记录的`de1ef89`、generator SHA、输出SHA、确定性聚合SHA及21/21、16/16等运行结果；
- [`SF-A0R.2失败轮报告`](arena-v2-a0.3-current-source-machine-regeneration-sf-a0r.2.md)中的机器闭环结论。

原因不是这些文件内部hash不一致，而是生成器/checker字节不属于其自称的source commit。B段必须从A段clean commit整链重建，不能局部替换`sourceCommit`、generator SHA或下游hash。

## 自检、回滚与红门

1. 来源/许可/SHA：未来clean检查覆盖根依赖清单/锁文件、Catalog、账本、三项GLB、许可与证明；本批不更新机器SHA。
2. 原子性/竞态：Git目录排他锁＋双HEAD/status＋HEAD字节比较；外部并行写入仍由协调者暂停。
3. fail closed：render起跑dirty/untracked、未跟踪工具、HEAD变化、关键文件漂移、锁冲突、下游非输出路径dirty和继承分叉均拒绝。
4. 预期dirty：下游只复核sourceCommit与关键文件，不把render输出diff当source drift。
5. 生命周期：锁在正常/异常路径关闭并删除；陈旧锁不得自动绕过，需协调者确认无活跃进程后处理。
   Human kit还会在首个participant输出前同时拒绝非零intake与被Git忽略的旧raw JSON，旧真人答卷不能跨sourceCommit复用。
6. 预算/三模式：未改144输出、双视口、题量、媒体预算或任何Duel/Race/Survival表现事件。
7. 主流程：A0.3保持85/100、真人0/10、`hardGate=false`；A1.1、Blockout及默认生产消费继续关闭。
8. 回滚：删除source-freeze helper，撤销本批生成器/检查器/夹具的动态sourceCommit改动和状态文档；不得删除当前失败轮机器产物或回退开发并行文件。

可复现性边界：Git commit固定源码和依赖声明，`package-lock.json`固定解析图，`runtimeToolchain`固定实际执行二进制/库版本；三者必须同时一致。它仍不声称跨操作系统PNG必然相同，而是让跨平台或依赖漂移显式失败，要求每个可采信证据链在同一记录环境中双跑确定性。回滚A段会同时移除runtime identity门，因而必须把A0.3继续保持`pending-clean-regeneration`，不能回退后沿用B段证据。

本阶段只申请`SF-A0R.2A toolchain-preparation`源码小阶段验收。协调者提交A段并给出新的clean commit前，禁止执行B段。
