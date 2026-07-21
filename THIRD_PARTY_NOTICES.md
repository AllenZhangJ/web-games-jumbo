# Third-Party Notices

本项目使用或参考了以下第三方开源软件。本文件不修改各项目的原始许可条款；完整许可文本位于 `licenses/`。

## shenmaxg/web-jump

- 来源：<https://github.com/shenmaxg/web-jump>
- 参考基线：`3fdcb17436f77ddb6664b9aad8f9c5fffdf0fe58`
- 许可：MIT License
- 版权：Copyright (c) 2018 Edwin Webb
- 许可全文：[`licenses/web-jump-LICENSE`](licenses/web-jump-LICENSE)

本项目 v3 的 Three.js 场景结构、正交构图、基础几何角色、蓄力压缩/回弹、空翻、世界平移、平台工厂、拖尾、粒子和失败动作参考或改编了该项目的实现思路。本项目保留自身的数值策略、连续世界、真实落点、碰撞规则和三端平台适配，并将过时 Three.js API 升级为现代实现。

这一归属不表示 `web-jump` 原作者认可、赞助或与本项目存在商业关系。

## Three.js

- 项目：<https://github.com/mrdoob/three.js>
- 当前锁定依赖：`three@0.185.1`
- 许可：MIT License
- 版权：Copyright © 2010-2026 three.js authors
- 许可全文：[`licenses/three-LICENSE`](licenses/three-LICENSE)

Three.js 提供 WebGL 渲染器、Scene、Camera、Geometry、Material、Light 和其他三维基础设施。

## Yuka

- 来源：<https://github.com/Mugen87/yuka>
- 参考基线：`10591304811222d6856020d5de129b39ef43b58d`
- 许可：MIT License
- 版权：Copyright © 2023 Yuka authors
- 许可全文：[`licenses/yuka-LICENSE`](licenses/yuka-LICENSE)

Arena V1 的项目内效用仲裁器改编了 Yuka `GoalEvaluator` / `Think` 的最高效用选择结构。项目没有打包 Yuka 依赖，也没有复制其实体、目标栈、感知或墙钟调度系统。

## KayKit Character Pack: Adventurers

- 来源：<https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0>
- 固定版本：`672074b73ba276876a19e8816ecdc5241817ab47`
- 许可：Creative Commons Zero v1.0 Universal（CC0-1.0）
- 作者：KayKit Game Assets / Kay Lousberg
- 许可全文：[`licenses/kaykit-adventurers-CC0-LICENSE.txt`](licenses/kaykit-adventurers-CC0-LICENSE.txt)

Arena 正式角色纵切引用并允许修改该资源包中的 Rogue 骨骼角色和圆盾模型。重锤与锁链由项目自行建模；玩法、碰撞、动作时序与命中判定仍由本项目实现，资源作者不为本项目背书。

## KayKit Character Pack: Skeletons

- 来源：<https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0>
- 固定版本：`15b62b9bad122f72926c10fb14d622c73819fa54`
- 许可：Creative Commons Zero v1.0 Universal（CC0-1.0）
- 作者：KayKit Game Assets / Kay Lousberg
- 许可全文：[`licenses/kaykit-skeletons-CC0-LICENSE.txt`](licenses/kaykit-skeletons-CC0-LICENSE.txt)

Arena 第二角色纵切引用该资源包中的 Skeleton Warrior 骨骼模型及其动画，作为发条角色的正式高辨识度外观。玩法、碰撞、动作时序与命中判定仍由本项目实现；资源作者不为本项目背书。

## Kenney Impact Sounds

- 来源：<https://www.kenney.nl/assets/impact-sounds>
- 上游版本：`1.0`
- 上游 ZIP SHA-256：`029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8`
- 作者：Kenney
- 许可：Creative Commons Zero v1.0 Universal（CC0-1.0）
- 项目用途：基础推击、重锤、锁链和盾撞命中音效
- 许可全文：[`licenses/kenney-impact-sounds-CC0-LICENSE.txt`](licenses/kenney-impact-sounds-CC0-LICENSE.txt)

## 分发要求

如果分发的 Web、微信或抖音构建中包含上述软件或其实质部分，分发包必须同时携带本文件和对应的完整许可文本。
