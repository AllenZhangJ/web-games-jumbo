# GitHub 方案调研：角色与 Arena V1

## 文档状态

调研记录，2026-07-16。当前仅借鉴架构和设计思想，没有从下列新增候选复制代码。若后续实质复用，必须固定 commit、核对许可并更新 `THIRD_PARTY_NOTICES.md`。

## 推荐组合

```text
现有 Platform Contract + Three.js Renderer
                  ↑
       只读快照 + 玩法事件
                  ↑
        本地确定性 Arena MatchCore
          ↑                 ↑
     真人 InputFrame    BotPolicy InputFrame
```

Arena V1 的“快速匹配”只创建本地 1v1，不引入 Colyseus、Nakama 或 P2P 网络。网络候选仅作为未来真人对战研究留档。

## 阶段 4 Rule/Core 架构复核

本轮新增复核没有复制代码或新增依赖，决策细节见 [ADR-007](../decisions/007-arena-rule-core-governance.md)。

### [`ecsyjs/ecsy`](https://github.com/ecsyjs/ecsy)

借鉴 Component 只保存数据、System 保存逻辑、System 按明确顺序执行和 World 负责作用域的边界。仓库自述仍为高度实验性，最近发布与维护节奏不适合作为 3～5 年核心依赖，因此只吸收原则。

### [`NateTheGreatt/bitECS`](https://github.com/NateTheGreatt/bitECS)

借鉴小型数据导向 ECS、查询和序列化设计。项目采用 MPL-2.0，当前不复制其实现；Arena V1 的实体规模也尚未证明引入 ECS 存储和查询迁移的收益。

### [`boardgameio/boardgame.io`](https://github.com/boardgameio/boardgame.io)

借鉴以 move/command 描述权威状态变化、视图无关模拟、日志与 time-travel 的思想。不引入回合、房间和网络框架；Arena 的实时固定 tick 仍由项目内 Core 管理。

### [`statelyai/xstate`](https://github.com/statelyai/xstate)

借鉴显式状态、事件、转换表和模型测试。当前不引入 Actor 运行时或异步计时语义，避免让权威 tick 生命周期绑定第三方解释器。

## 阶段 3 AI 实现复核

### [`Mugen87/yuka`](https://github.com/Mugen87/yuka)

固定参考 commit `10591304811222d6856020d5de129b39ef43b58d`，MIT。

- 改编：`GoalEvaluator` / `Think` 的最高效用仲裁结构，并保留许可与归属。
- 不引入：实体系统、目标栈、导航、感知序列化和完整 npm 依赖。
- 明确拒绝：`Regulator` 基于经过墙钟时间控制更新频率；Arena 必须使用整数 tick 才能严格回放。

### [`libgdx/gdx-ai`](https://github.com/libgdx/gdx-ai)

固定参考 commit `6726e345248ddcad7cec0737f6ad83e4e028266d`，Apache-2.0。只借鉴 Scheduler 所表达的“AI 任务按不同频率运行”和层级调度原则；不复制 Java 代码，不引入 libGDX 或行为树解析器。

### Motumbo 阶段 3 复核

固定参考 commit `141cb972982e08b3ca5552ae75a7e58388314e4b`，MIT。阶段 3 重点借鉴：

- 世界随机与每个 Bot 的随机子流隔离。
- 个性决定风格、难度决定技能质量，两者不固定绑定。
- 机器人低频重规划，在规划之间持续输出普通输入。
- 先处理危险地面、边缘安全和卡死恢复，再争夺目标或追击。

不复制其 C/Box3D 实现，也不把机器人放进 MatchCore；本项目坚持受限 `BotObservation → InputFrame` 边界。

## 竞技场与击飞

### [`axelromero99/motumbo`](https://github.com/axelromero99/motumbo)

MIT。浏览器 Three.js 物理相扑，包含塌陷地图、拾取物、机器人、固定步长、状态 hash、输入锁步和批量确定性测试。

借鉴：

- 游戏模拟与 Three.js 渲染分离。
- 真人和机器人都转为紧凑输入。
- 地图是可校验数据，不是渲染代码。
- 地图 RNG 与机器人 RNG 分流。
- 同 seed 双实例 hash 对比、虚拟延迟和机器人自杀率测试。
- 拾取物围绕击退、吸附、护盾、重量和位移设计。

不照搬：

- 把全部玩法集中到一个大型 C 文件。
- WebRTC P2P、桌面键盘限定和缺少 TURN 的联机方式。
- 其球体角色数值、地图布局和具体装备平衡。
- 未做小游戏真机验证前引入 C/WASM 工具链。

### [`erincatto/box3d`](https://github.com/erincatto/box3d)

MIT。新的 3D Box3D 提供碰撞查询、角色移动、跨平台确定性、录制和回放。作为阶段 1 物理 POC 候选，不直接决定采用。

### [`dimforge/rapier`](https://github.com/dimforge/rapier)

Apache-2.0。成熟的 2D/3D Rust 物理引擎并提供 TypeScript/WASM 绑定。作为性能、包体和工具成熟度对照，不在文档阶段增加依赖。

### [`Bombanauts/Bombanauts`](https://github.com/Bombanauts/Bombanauts)

MIT。Three.js 多人武器竞技场。

借鉴：

- 玩家、地图、武器、计时和胜负分模块测试。
- 随机地图仍保护出生区。
- 4 人房间所需的实体身份和回合状态边界。

不照搬：

- Three.js r84、Cannon.js 和旧构建工程。
- 客户端报告击杀、物体破坏和完整高频状态的网络模式。

### [`MLH-Fellowship/AmongUps`](https://github.com/MLH-Fellowship/AmongUps)

MIT、Unity。只借鉴胜者选择强化、败者获得剩余强化的局间追赶设计。Arena V1 暂不加入局内数值成长，也不复用 Unity 代码。

## 网络候选：Arena V1 延后

### [`colyseus/colyseus`](https://github.com/colyseus/colyseus)

MIT。Node.js/TypeScript 房间、匹配、重连和服务器权威状态同步。若未来做真人 PvP，是和当前 JavaScript Core 距离较近的首个 POC 候选，但不属于 Arena V1。

### [`heroiclabs/nakama`](https://github.com/heroiclabs/nakama)

Apache-2.0。包含账号、存储、匹配、排行榜和社交。只有产品进入云存档、长期运营或真人社交阶段时才评估。

## 角色控制与动画

### [`pmndrs/ecctrl`](https://github.com/pmndrs/ecctrl)

MIT。借鉴只读运动状态到动画语义的解析方式，不引入 React Three Fiber 和 Rapier 依赖。

### [`hh-hang/three-player-controller`](https://github.com/hh-hang/three-player-controller)

MIT。借鉴 Vanilla Three.js 下输入、控制、碰撞、相机和动画的模块边界，不移植其自由漫游胶囊/BVH 世界。

### Three.js 官方动画组件

直接采用 [`GLTFLoader`](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/GLTFLoader.js)、[`AnimationMixer` 混合示例](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_animation_skinning_blending.html) 和 [`SkeletonUtils`](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/utils/SkeletonUtils.js)。

### [`pmndrs/meshline`](https://github.com/pmndrs/meshline)

MIT。用于武器挥线、击飞速度线和角色拖尾的兼容性 POC；如果小游戏 Shader 或包体不理想，则实现项目内轻量 RibbonTrail。

## GLB 资产管线

- [`KhronosGroup/glTF-Validator`](https://github.com/KhronosGroup/glTF-Validator)：校验 GLB 格式、动画、图片和扩展。
- [`donmccurdy/glTF-Transform`](https://github.com/donmccurdy/glTF-Transform)：执行 inspect、prune、dedup 和动画 resample。

第一阶段不默认启用 Draco、KTX2 或额外运行时解码器，先保证 Web、微信和抖音加载链路稳定。
