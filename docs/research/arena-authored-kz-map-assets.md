# Arena 自制 KZ 地图静态资产候选

## 定位

两张地图是项目自制的静态 GLB 表现候选，几何直接来自当前权威 `MapDefinition` 的 Surface 尺寸和位置。设计只学习经典 KZ 地图的“方向 + 跳跃、断层、窄路、楼梯、走钢丝、路线读取”训练价值，不复制 CS 1.6 地图文件、贴图或第三方关卡几何。

当前状态是 `authored-candidate-not-approved`。这批文件用于继续接通 Three.js 正式场景开发，不代表美术批准、浏览器验收、真机验收或生产门禁通过。

## 可复现生成

生成器：`scripts/arena-build-authored-kz-map-assets.ts`

生成器直接读取以下两个 TypeScript 定义文件里的 `SURFACES`、`ANCHORS` 与 `segments` 字面量，避免依赖滞后的工作区构建产物：

- `packages/arena-product-content/src/arena-v2-kz-base-map-candidate-v1.ts`
- `packages/arena-product-content/src/arena-v2-kz-switchback-map-candidate-v1.ts`

输出坐标将权威 X 轴镜像为 Three 表现 X 轴，与正式角色、相机和世界武器的现有坐标合同保持一致。生成的是预构建静态 GLB，运行时不创建程序化地图兜底。

## 当前产物

| Map Definition | 产物 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| `arena-v2-kz-base-map.candidate.v1` | `public/assets/arena/maps/authored-candidates/kz-base.glb` | 37,248 | `c70ac5f8d01d960c399b9433bbb05b34720841594e1116b42dd0f2ce062e30ef` |
| `arena-v2-kz-switchback-map.candidate.v1` | `public/assets/arena/maps/authored-candidates/kz-switchback.glb` | 27,292 | `32732dac39379cb9009f7f0c4d95de7ca214bb11ae74c7458751d76cbf2ebc54` |

每个 Surface 包含深色承重体和高对比顶面；基础平台、缺口、楼梯、迷宫、窄路、钢丝现在分别使用稳定的顶面色彩语言，每段入口增加一个低矮静态路标。十二段基础图使用冷色纵深体系，八段回折图使用暖色转向体系，终点继续使用静态门架。生成器会拒绝未被段落精确持有的 Surface，防止表现路标脱离权威Route Definition。所有附加结构仅参与表现，不改变碰撞、检查点、复活、掉落、胜负或随机。

## 尚未完成

- 生成脚本已执行并产出上述固定字节与SHA；未运行独立模型结构、材质、浏览器或真机验证。
- 未做相机遮挡、边缘可读性、色弱和低动效人工验收。
- 未做最终主题化美术、环境叙事、灯光烘焙或正式批准。
- 未关闭 `formalVisualAssetsReady`，也未把候选组合接到默认入口。
