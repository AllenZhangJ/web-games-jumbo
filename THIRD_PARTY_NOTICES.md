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

## 分发要求

如果分发的 Web、微信或抖音构建中包含上述软件或其实质部分，分发包必须同时携带本文件和对应的完整许可文本。
