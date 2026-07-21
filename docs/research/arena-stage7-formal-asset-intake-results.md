# Arena Stage 7 正式资产 Intake 合同门禁结果

## 结论

2026-07-20，来源中立的正式资产入库治理合同、文件复验器和负向门禁已落地。它证明项目可以在不依赖 Three.js、DOM 或平台 API 的情况下，把未来正式资产 Definition 精确绑定到内容字节、来源 revision、许可文本、权利证明和批准记录。

当前已有真实 KayKit GLB/PNG、固定 revision 和 CC0 许可，但尚未由项目方填写 `approvedBy/approvedAt` 并形成真实 Bundle。因此仍不表示 `stage7.formal-assets` 或发行冻结完成。

## 已落地边界

- `FormalAssetIntakePolicy`：版本化来源类型、正式/灰盒 tag、禁止 Provider 和最低权利要求。
- `FormalAssetProvenanceRecord`：一个 asset ID、Definition hash、内容 artifact、许可、证明和批准身份。
- `FormalAssetIntakeBundle`：资产与记录精确一一覆盖；共享许可/证明保持同一摘要，内容路径不得复用。
- 文件复验器：复用共享的无跟随打开、真实路径约束、读取前后 inode/时间状态和 SHA-256 校验。
- CLI：`arena:assets:intake:verify` 只输出 `contract-only` 或 `verified-intake-only`，不会生成 release-ready 声明。

## 负向覆盖

- 灰盒 tag 和程序化角色 Provider 不能进入 Formal Bundle。
- 商业使用、修改或随构建分发权缺一即拒绝。
- 需要署名但没有署名文本、Definition hash 漂移、记录缺失或重复均拒绝。
- 内容路径不能被两个 asset ID 共享，也不能同时充当授权文档。
- 同路径许可/证明的大小或摘要发生冲突时拒绝。
- 文件在 Bundle 生成后发生替换，即使大小不变也会因 SHA-256 不一致而拒绝。
- 已构造 Bundle 不能绕过另一版本 Policy 的身份校验。
- Stage 7 架构门继续拒绝 Node、Three.js、DOM、平台、墙钟和随机依赖。

## 验证记录

- Formal Asset Intake 定向测试：4/4。
- Stage 7 + 架构定向测试：36/36；首次全量发现普通变量名 `document` 触发宿主隔离规则，已改为 `rights-material` 后通过。
- 全量 `npm test`：696/696。
- Replay V5 严格复验：4/4，manifest hash 为 `0dace228`。
- 三端 Product 构建：Web/微信/抖音构建成功；Web 3,773,570 bytes、微信 3,587,013 bytes、抖音 3,586,988 bytes，均通过 4 MiB 交付预算。
- Web 生产包真实浏览器复验：两套角色 GLB、盾牌 GLB、三张外置 PNG 和四类双声道 OGG 均加载；角色使用 18 个正式动作片段、手部装备插槽和 2× 高画质像素比，无资源加载失败、运行时异常或控制台错误。
- 抖音开发者工具 V4.5.3 预验收：iPhone 15 Pro/iOS 15 模拟器中正式 GLTF 角色、手持武器/盾牌、屏外地图和移动/攻击/跳跃均可见可用；编译、强制刷新和重新入局通过，Console 未见项目错误。该结果绑定 dirty 构建，只作运行兼容性预检。
- Product 会话压力测试：100 场、100 个唯一 seed/权威 hash，暂停恢复 10 次、上下文恢复 6 次、尺寸切换 15 次；结束后帧、生命周期监听器、Canvas 监听器和输入绑定均为 0。
- Formal Asset Budget V1：10 个运行时资产精确覆盖，总编码 1,990,436 bytes、音频 32,593 bytes、三张纹理解码 12,582,912 bytes；两名角色各 18 动作/41 关节，全部复杂度门通过，Policy hash 为 `532faaa2`、Report hash 为 `82a8b378`。该门已接入 `npm run build`。
- 本节列出的具体包体数值来自提交前 dirty 构建与本地复算，不能直接作为候选 clean-build 设备 Record；release candidate 的 clean source 身份以重建后的 Manifest 为准，也不能替代目标设备 Record。

## 未完成项

- 已选择并固定两套 KayKit CC0 开源来源，但项目方尚未做最终造型和成本策略签字。
- 许可文本、GLB、PNG 和来源研究记录已进入仓库；正式 Bundle 与批准身份尚缺。
- GLB Provider、宿主文件/图片加载、AnimationMixer、SkeletonUtils、手部插槽和三种装备运行时已接通。
- 三端构建包体与 Formal Asset 专用的格式、骨骼、动作、材质、绘制 primitive、纹理解码内存及音频 Policy 均已通过；目标真机峰值内存与加载时延仍需设备证据。
- 已有 reduced-motion 镜头/震动降级与 Kenney CC0 命中音频运行时；仍没有人工 reduced-motion、小屏可读性、三端生命周期和目标真机证据。
- 抖音开发者工具模拟器已证明正式角色与装备的基础宿主兼容性；微信开发者工具、抖音/微信 iOS 与 Android 真机、峰值内存和加载时延仍无正式证据。

## 2026-07-20 手机人工预验收基线

项目方使用 iPhone 13 Pro、iOS 26、Chrome，通过局域网 Web Product dirty 构建完成一轮人工试玩，综合评分 `4.3/10`。本记录是迭代输入，不冒充 clean-build Stage 7/Stage 8 正式设备 Record。

- 已确认：打击感明显、有输有赢、上手难度不高，无黑屏。
- 动作问题：整体仍不够灵活；二段跳缺少足够明显的人物姿态变化；垂直起跳不符合人体发力过程。
- 操作问题：基础攻击被距离错误门控；可操作上限不足，下一阶段需要连招；不同武器需要更鲜明的专属动作。
- 碰撞问题：存在少量可见模型穿插。
- 性能问题：约 `1/10` 概率卡顿，稍微影响操作；设备明显发热。优化必须保留当前分辨率、抗锯齿和动作量，优先减少重复运算、每帧分配和无变化材质更新。

由该基线直接触发的首批修复包括：显式操作模式下攻击可在任意距离起手、命中只在有效帧判定；首跳蓄力/腾空关节姿态与二段跳收身旋转；锤、链、盾和赤手动作关节强调；性能资源采样降频、静态表面材质写入消除、部分角色/镜头插值缓存、静止镜头投影矩阵缓存，以及音频等热路径复用。当时的第二轮代码复核仍发现程序化角色插值和命中特效存在临时对象构造；该发现已作为下一批 A1 输入，不代表 2026-07-21 提交后的当前代码。可见穿插仍需区分角色碰撞、武器穿插和动画 overshoot，未擅自改动会导致回放漂移的权威碰撞半径。

首批修复后的本机 Chrome 生产包复验采用 `390×844` 视口：对手约 `5m` 外时攻击键仍为可用态，点击后进入动作/冷却态；连续两次跳跃能观察到第二跳展臂、收身和旋转姿态；首屏、对战和交互过程控制台无 error/warning。一次优化前短样本在 `2.03s` 内记录约 `4.30MB` JS 堆增长；优化后 `5.03s` 样本记录约 `0.39MB` 增长。两次样本窗口和 GC 时机不同，只能证明短期分配压力方向性下降，不能替代 iPhone 温度/FPS 结论。贴身截图仍能观察到肢体/装备网格交叉而角色中心未直接贯穿，因此穿模后续按表现层动作过冲优先处理。

## 2026-07-21 手机第二轮人工预验收

项目方继续使用 iPhone 13 Pro、iOS 26、Chrome 验收，综合评分提升至 `5/10`。任意距离攻击和上一轮打击反馈改动有效，但贴近对手攻击仍会卡顿，动作灵活度仍未达到动作游戏要求。

- 手臂需要可辨认的抬臂、挥臂、随挥和收臂过程，而不是只在三个权威 phase 上切换角度。
- 空中攻击应成为向下攻击并产生加速的正式动作；它不能只是表现层旋转，也不能复用没有武器命中的移动下砸。
- 武器攻击期间可适度放大，收招、中断或换武器后必须恢复原始大小；缩放只影响 visual，不扩大权威 hitbox。
- 武器击退距离、攻击范围、攻击速度、角色移动速度和目标起跳高度需要集中、版本化配置，不在 HUD 展示。
- 当轮性能调查锁定命中瞬间临时创建多组 Three.js 几何/材质/Mesh，以及程序化角色逐帧临时 Vector3 两个高优先级嫌疑点；后续 A1 已改为固定容量预热池和复用向量。真机仍必须用命中窗口证据区分设计 hit-stop 与真实长帧。

随后完成的 Gameplay V2 代码批次还统一了移动速度、目标跳高、攻击三段时长、攻击范围和目标击退距离；正式角色攻击改为上半身 track mask，程序化与 GLTF 视图均按 `raise → swing → follow-through → retract` 推进；赤手、锤、链、盾拥有独立空中下劈 Definition、向下加速/封顶速度和命中形状。浏览器 `390×844` 生产包复验确认对手约 `17m` 外仍可挥空、快速连续输入不阻断主循环且 Console 无 error/warning；这些结果仍不替代 iPhone 发热与贴身长帧复验。

成熟项目证据、许可证边界、建议 schema 和 A1–A5 落地顺序见 [手机动作战斗专项 GitHub 调研](arena-mobile-action-combat-github-study.md)。

决策与操作分别见 [ADR-027](../decisions/027-arena-formal-asset-intake-provenance.md) 和 [Stage 7 正式资产入库手册](../acceptance/stage7-formal-assets/README.md)。
