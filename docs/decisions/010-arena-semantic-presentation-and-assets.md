# ADR-010：Arena 使用语义表现合同与独立资产注册表

- 状态：已接受 S7.1 合同边界；正式资产路径仍待 Stage 6 E3/E4 与 Mapper 冻结
- 日期：2026-07-18

实施进度：S7.1 已建立不可变 `PresentationAssetDefinition/Registry`、`CharacterPresentationDefinition/Registry`、基础/覆盖动画语义、显式有序回退、相机相对六方向迟滞、`CharacterViewRuntime` 与可注入 `CharacterViewFactory`。原程序化 Q 版人物和发条机器人仅作为 Provider 占位实例接入；来源/许可/证明的正式入库治理由 [ADR-027](027-arena-formal-asset-intake-provenance.md) 补充。GLB、骨骼、正式动画、外观附件、音画反馈和三端资产验收尚未开始。

## 背景

Arena V1 需要同时支持 Q 版人物和拟人物件机器人、真 3D 低多边形、手稿风轮廓、六方向、服装、翅膀、挂件、拖尾以及完整走跑跳战斗反馈。两类角色不一定拥有相同骨架，但权威玩法必须保持一致、可回放，且关闭表现层后结果不能变化。

如果模型路径、clip 名、骨骼节点和玩法字段混在同一个角色定义中，资产迭代会污染规则版本；如果动画回调参与命中或位移，则低帧率、clip 缺失和平台差异会产生第二套玩法真相。

## 决策

Stage 7 采用四层分离：

1. Rule/Content 的 `CharacterDefinition` 只保存有限玩法模板。
2. Presentation/Content 的 `CharacterPresentationDefinition` 保存模型、骨架 profile、语义到 clip 的映射、六方向策略和外观插槽。
3. `PresentationAssetRegistry` 保存稳定 asset ID、Provider 与 source key；实际加载由注入的 `PresentationAssetLoaderPort` 完成，不让 Definition 直接绑定 URL 或 Three.js 对象。
4. `CharacterViewRuntime`、动画、特效、镜头和音频只消费只读快照与已发生事件。

人物与机器人共享稳定 `AnimationSemantic` 合同，但不强制共用骨架或 clip。六方向由权威朝向和相机基向量在表现层量化；root motion 不驱动世界位置。动画事件只能产生表现提示，不能提交命中、落地、冲量、淘汰或奖励。

每个角色实例拥有独立语义解析、方向迟滞和 View 状态；S7.2 接入正式骨骼动画后，每实例再拥有独立 Animation Mixer。带骨骼对象使用 Three.js `SkeletonUtils` 的安全克隆路径；几何和不可变材质只有在明确资源所有权时共享。加载任务去重并发调用，Loader 返回带同步 `release()` 的 lease；销毁后迟到的结果立即释放，释放首次失败时保留 lease 供生命周期重试。

S7.1 的程序化 View 是第一个 Provider，用来证明内容、资产、运行时和 Three 实例之间可以替换。投影帧不再携带 `geometry`，`CharacterViewRegistry` 不再直接构造具体 View；任一 View 同步失败都会释放并脱离全部受管角色，使表现层失败关闭而不是继续半可用运行。

## GitHub 借鉴边界

- [Three.js](https://github.com/mrdoob/three.js)，项目当前为 `0.185.1`，参考 commit `2431a09f46f34c560bc8e44b33be0e567723d5b9`，MIT：复用官方 `GLTFLoader`、`AnimationMixer`、`SkeletonUtils` 能力，不复制其示例为玩法架构。
- [KhronosGroup/glTF-Validator](https://github.com/KhronosGroup/glTF-Validator)，参考 commit `434283be08a668a8fb4e437145630ddbf93b0686`，Apache-2.0：作为 GLB 离线校验候选。
- [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform)，参考 commit `7dbd34c83eff4da2b0885a6cc90ada0be5642481`，MIT：作为资产检查和优化候选，只有实测收益成立后才加入开发依赖。

本 ADR 不新增依赖，也不复制第三方代码；实际引入时必须更新锁文件、许可清单和可重复命令。

## 被否决方案

### 所有角色强制共用一个骨架

会限制拟人物件机器人的结构设计，并把美术差异伪装成技术统一。稳定语义比相同骨骼更重要。

### 为六个方向维护六套玩法状态

会放大内容量并让相机方向侵入 Core。六方向只是表现可读性，不是六套规则。

### 由动画 marker 判定命中或位移

会让帧率、资源缺失和动画替换改变比赛结果，破坏固定 tick、回放和跨平台一致性。

### 把加载、动画、插槽、特效和音频集中在单个 Renderer 类

短期文件更少，但会形成难以测试和释放的生命周期中心。组合根应连接小模块，不承载所有内容策略。

### 在投影帧中携带 geometry 并由 Registry 直接 new 具体 View

会把内容、资源 Provider、Three 构造和运行时所有权绑在一条分支上。新增 GLB 或第二种骨架时只能继续扩大 Registry，且无法无渲染验证 Definition 和回退。S7.1 改为稳定 presentation/asset 引用与注入 Factory。

### 根据相似名称猜测缺失 clip

不同资产工具导出的名称不稳定，猜测成功会掩盖内容错误。Definition 必须完整声明语义和有序回退；全部不可用时明确失败，不静默播放任意动作。

## 后果

正面：

- 角色、美术和动作可以独立迭代，不改玩法 hash。
- 不同骨架仍能共享行为合同、测试和降级路径。
- clip 缺失、加载失败、低质量模式和上下文恢复有确定兜底。

代价：

- 需要维护表现 Definition、asset ID、语义映射和资源所有权。
- 正式资产必须经过命名、校验、清单和三端加载门禁。

## 后续生效条件

- Stage 6 输入映射与玩法级动作语义通过 E3/E4 盲测冻结后，才进入 S7.2 正式资产纵切。
- 单角色正式纵切继续证明关闭 Renderer 后回放 hash 不变。
- 两种骨架、缺失 clip、迟到加载、销毁与上下文恢复测试通过。
- GLB 校验、三端加载与资源预算通过后，才进入批量正式资产生产。
