# KayKit Skeletons 第二角色资产记录

- 来源：<https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0>
- 固定 revision：`15b62b9bad122f72926c10fb14d622c73819fa54`
- 许可：CC0-1.0
- 用途：发条角色的正式骨骼外观与 18 条运行时动作

## 选择理由

- 与首个 KayKit Adventurers 角色来自同一作者，视觉比例、骨架命名和动画语义兼容。
- Skeleton Warrior 自带独立头部、下颌、披风、眼睛和四肢网格，轮廓明显区别于跑酷学徒。
- 上游模型包含 `handslot.r`、`handslot.l` 和覆盖 locomotion/战斗的动作集合；项目优化产物固定保留 18 条运行时动作，可复用项目的手部挂点及动作时序控制器。
- 上游声明低多边形、移动端适用、允许商业使用且无需署名；仓库保存了许可全文。

## 内容摘要

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `clockwork-warrior.glb`（项目优化产物） | `974548` | `1a424efda14e7875180989a66186fafcc94a12ac85ebdfdc7e3f998a00584e39` |
| `skeleton_texture.png` | `17037` | `15741a25c53e04fa9bf3beac3bc0de442359404b1ff9be863b892cb551ad3657` |
| `kaykit-skeletons-CC0-LICENSE.txt` | `914` | `5d822abca4e08c5a91d329e5372b3dc605cba8d994f752cb0f7dfdb7a0a79954` |

上游 Skeleton Warrior GLB 原始 SHA-256 为 `178b6fda810b814c250d8a2010c24dfd9b458b9006dd323353e620b7ff118bbe`。项目通过 `npm run arena:assets:optimize-characters` 仅保留 18 条运行时动作并清理未引用数据；模型、骨架、材质和手部挂点语义保持不变。PNG 从 GLB 内嵌 image 数据无损拆出，交给三端宿主图片对象解码。

模型已进入三端运行时，并通过 `arena.stage7.formal-asset-budget.v1` 和 4 MiB 构建预算。2026-07-23，Allen 已完成 Formal Asset Intake 批准；当前仍需三端真机加载/动作可读性和峰值内存记录。本记录固定公开来源和当前字节身份，批准真值位于正式 Bundle 与项目来源批准记录。
