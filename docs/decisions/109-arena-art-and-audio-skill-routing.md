# ADR-109：Arena 美术与音频工作统一走14技能路由和资产门禁

## 状态

已接受

## 日期

2026-07-28

## 背景

Arena V2 最近的 Git 维护集中在武器反馈、KZ 地图、武器价值链、11 个局外页面和正式资产入库。项目已经有角色、圆盾和 Kenney 音效的正式入库基础，但仍缺首批武器资产、五类反馈的最终视觉/音频、生产 KZ 地图表现、完整 HUD 表现和 Stage 9 正式资产 producer。

如果美术和音频工作只依赖一次性提示词或个人习惯，容易出现：研究素材进入生产、程序化几何成为正常路径、反馈重新判定规则、动画/音频与事件脱节、资源预算不一致，以及桌面浏览器通过但真机不可读。

## 决策

1. 在仓库 `.agents/skills/` 中保留并使用14个技能，并用 `skills-lock.json` 记录每个技能的来源、路径和内容 hash。
2. 以 [Arena 美术与音频开发流程](../architecture/arena-art-and-audio-development-flow.md) 作为所有角色、武器、地图、VFX、HUD、音乐和音效任务的路由基线。
3. 技能按 `视觉总纲 → 角色/地图/UI → 3D资产 → Blender/GLB → Three.js表现 → VFX/粒子 → 音乐/音频 → 媒体治理` 分流；一个任务只启用与产物相关的技能，但必须记录技能 ID 和强制参考文件。
4. 项目自身的 `Rule → Core → Bot → Presentation → Platform`、确定性 tick/Replay/hash、正式资产来源合同、资产预算和三端验收优先于外部技能的通用示例或预算。
5. 技能只作为开发期能力，不进入生产 bundle。AI 生成、外部下载和压缩工具产生的内容必须经过人工视觉评审、许可证/来源审计、资产预算、浏览器和目标设备门禁，才能进入正式 Bundle。

## 14个技能清单

- 视觉与角色：`art-bible`、`game-art-director`、`character-design-sheet`
- 3D资产与媒体：`game-3d-assets`、`blender-web-pipeline`、`glb-compressor-cli`、`media-asset-management`
- Three.js与表现：`threejs-animation`、`threejs-materials-lighting`、`vfx-realtime`、`particle-systems`
- 地图与界面：`level-design`、`threejs-game-ui-designer`
- 音乐与音频：`audio-design`

## 被否决的替代方案

- **只保留一个通用美术技能**：无法覆盖 GLB 骨骼、材质色彩空间、粒子 overdraw、音频总线和移动端 HUD 验收，因此拒绝。
- **以技能默认预算作为项目预算**：外部技能的 `<50k triangles`、通用粒子数量或图片页面预算不能替代 Arena 的 `arena.stage7.formal-asset-budget.v1` 和三端 delivery budget，因此拒绝。
- **直接把 AI/下载素材放入生产**：与项目来源、许可证、原创地图和正式资产入库边界冲突，因此拒绝。
- **让表现层从坐标或动画时间猜反馈**：会破坏权威事件因果和 Replay/hash 一致性，因此拒绝。

## 影响

### 正面影响

- 每类美术/音频任务都有明确入口、输出物和验收证据。
- 14个技能的适用范围被项目规则收敛，能复用外部知识而不把不匹配的 Unity/Godot/Unreal 做法直接带入 TypeScript/Three.js。
- 资产来源、压缩、导出、运行时接入、反馈可读性、声音开关和真机证据进入同一条交付链。

### 成本与约束

- 每个批次需要额外记录 skill/reference、来源 hash、资产预算和设备/人工证据。
- 正式资产不能因为浏览器截图通过就立即标记 `ready`；Stage 7/9 的设备、人工和 producer 门仍然独立存在。
- 维护技能需要同时更新锁文件、流程文档和本 ADR 的路由说明。

## 回滚与失效处理

如果某个技能源版本不再可用、许可证发生变化、内容 hash 漂移或其建议与项目证据冲突：

1. 停止该技能产生的新正式资产入库；
2. 保留已批准资产及其原始 provenance，不删除历史证据；
3. 回滚 `skills-lock.json` 到上一个可审计版本，或暂时改用项目现有工具链；
4. 在新的 ADR/状态台账中记录原因、影响范围和重新启用门槛。

## 验证

- 14个 `SKILL.md` 存在于 `.agents/skills/`，且 `skills-lock.json` 记录14项。
- 生产计划、项目 `AGENTS.md` 和文档索引都能链接到本 ADR 与执行流程。
- 美术/音频批次执行项目资产预算、正式资产复验、构建、测试和 `git diff --check`；真机与真人证据仍按阶段门禁独立记录。
