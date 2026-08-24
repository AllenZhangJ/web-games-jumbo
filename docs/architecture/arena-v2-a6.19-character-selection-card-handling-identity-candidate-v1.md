# Arena V2 A6.19 六角色选择卡非颜色手感身份 Candidate V1

## 1. 状态与边界

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 本批只增强既有 `character-select:selection-character` 六张卡的 renderer-neutral RenderPlan；不新增角色、模型、材质、页面、按钮、动作、输入、规则或资产请求。
- 六条身份来自既有 `ARENA_V2_CHARACTER_FIRST_SCREEN_IDENTITIES_CANDIDATE_V1`，全部仍是候选身份，`productionAssetApproved=false`。A0.3 保持 `85/100 / human 0/10 / hardGate=false / pending-regeneration`，Blockout、设备、真人和 Final 均关闭。
- 现有角色选择 3D 预览生命周期不变：A6.19 不创建 Three、Renderer、loader、lease、mount、RAF 或 timer，也不改变正式资产批准真值。

## 2. 技能与参考账本

本批按顺序使用：

1. `game-art-director`
   - 以轮廓、负空间、明暗和手感姿态建立身份；颜色只作辅助，不成为唯一编码。
2. `threejs-game-ui-designer`
   - 已读取 `ui-patterns`、`game-ui-quality`、`hud-readability`、`responsive-ui-fit`；本批不改变触控命中、手势或移动布局，因此没有扩展 `mobile-input` 合同。

强制项目参考：

- `docs/architecture/arena-art-bible.md`
- `docs/architecture/arena-art-and-audio-development-flow.md`
- `docs/architecture/arena-v2-a4-a5-character-weapon-first-screen-readability-candidate-v1.md`
- `arena-v2-character-weapon-first-screen-readability-candidate-v1.ts`
- `arena-v2-information-selection-render-plan-candidate-v1.ts`
- `arena-v2-information-character-selection-preview-surface-composition-candidate-v1.ts`
- `arena-v2-ui-render-plan-v1.ts`

`game-art-director` 泛化要求的 `docs/collaboration-protocol.md` 与 `docs/game-design-theory.md` 仍不存在；它们继续作为治理红缺口登记，本批不创建占位，也不把缺口写入产品机器身份。

## 3. 唯一事实源与视觉翻译

A6.19 不从 `characterDefinitionId` 字符串猜语义，只按既有角色身份目录逐项闭合以下字段：

- `handlingKind`
- `handlingShapeAxis`
- `selectionPose.semantic / sampleRatio / intent`
- `valuePattern.cue / colorIsNeverSoleSignal`

视觉翻译固定为每卡右侧一条非交互身份轨：`2 panel + 1短glyph text`。glyph 只提供辅助语义；六项唯一性必须完全由两个 panel 的相对位置、尺寸和圆角构成的纯几何 signature 证明，换 glyph、颜色或文案不能让重复几何通过。

| 手感身份 | 来源姿态/明暗轴 | 纯几何语言 | glyph 辅助 |
|---|---|---|---|
| balanced | idle / center-bright-core | 居中竖块＋稳定底座 | `◎` |
| sprint | run / bright-paired-legs | 水平推进条＋前端点 | `⇥` |
| air-control | jump / bright-arms-and-cape | 横向展开条＋中轴 | `↔` |
| high-jump | jump / bright-spring-legs | 竖直主轴＋弹跳底座 | `↑` |
| quick-start | run / bright-start-diagonal | 两段错位形成对角起步 | `↗` |
| forgiving | land / bright-stable-bracket | 左右稳定括号 | `⌒` |

这些图形只说明既有手感身份的学习线索，不发布速度、重量、跳跃、碰撞、命中或隐藏数值。

## 4. RenderPlan 与组合边界

`addArenaV2CharacterSelectionCardHandlingIdentityToRenderPlanCandidateV1` 只接受身份精确为 `character-select:selection-character` 的现有计划：

- 必须精确闭合六个已登记角色；每卡必须已有 `panel / label / description / action`，缺失、重复或未知身份在任何输出前拒绝。
- action primitive 保持原对象与完整卡片矩形，48px 命中下限、selected/available、intent、label 和 accessibility 语义均不变。
- label/description 的文字、读屏、tone、role、行数和 clip 不变；只收窄绘制宽度，在卡片右侧为身份轨留出不遮挡区域。
- 移动端沿用现有 82px 卡高，桌面沿用现有 90px 卡高；身份图形必须完全落在卡片内，并继续使用原 content viewport clip。
- primitive 预算固定为六卡每卡新增 `2 panel + 1 glyph text`，因此只允许精确增加 18 项；增强后的完整 RenderPlan primitive 总量必须 `<=128`。源计划无法预留这 18 项、输出不是精确 `source + 18` 或总量越界时，必须在发布前失败关闭。
- 非角色页返回原 RenderPlan 引用；不增加第12页、主动作、卡片或横向滚动。

`ArenaV2InformationCharacterSelectionPreviewSurfaceCompositionCandidateV1` 在调用底层 `surface.render` 前生成增强计划；`contextProvider` 与滚动刷新继续接收同一次原始稳定计划，因此既有正式角色 3D preview panel、viewport、选中身份和资源生命周期不被二次增强或改写。

## 5. 无障碍、低动效与静音

- 颜色不是唯一编码：两块 panel 的纯几何 signature、glyph 和既有文字三通道并行。
- reduced-motion：身份轨完全静态，不旋转、不闪烁、不脉冲，不创建补间、RAF 或 timer。
- muted：所有几何、glyph、文字和读屏信息不变；理解不依赖音频。
- 辅助图形非交互，不截获 pointer/focus，不改变 action rect，也不新增读屏操作。

## 6. 失败关闭与未运行测试设计

已写但未运行的测试源码覆盖：

- 390×844 与 1440×900 既有卡片规格；
- 六项纯 panel 几何 signature 唯一，glyph 不参与唯一性放行；
- 六卡合计精确新增18项primitive，增强后总量不超过128；源预算不足、非精确增量或总量越界均拒绝；
- 两块 panel 和 glyph 均位于卡片内并沿用原 clip；
- action 对象/矩形不变，文字与 accessibility 事实不变；
- 同输入同输出，非角色页原引用返回；
- 缺卡、重复 primitive、未知角色身份在发布前失败关闭；
- 组合层底层 Surface 收到增强计划，3D context 仍收到原计划；null context 时 renderer/mount 工厂调用为 0。

测试、typecheck、lint、format、build、浏览器、截图、设备、性能与真人识别全部 `not-run`，不得把源码候选写成视觉验收通过。

## 7. 六维静态自检与回滚

| 维度 | 静态结论 | 顺延证据 |
|---|---|---|
| 视觉/内容范围 | 六卡各固定2 panel＋1 glyph，精确新增18项且总量≤128；纯几何签名6/6唯一；无新页面/动作/规则 | 双视口截图、长文裁切、真人学习效果 |
| 来源/身份 | 只读既有角色手感、姿态与value pattern目录；不按ID猜语义 | 当前source最终签核与A0.3重生成 |
| 可读/无障碍 | 几何＋glyph＋文字三通道；action/读屏事实不变 | 色觉、读屏与设备证据 |
| 恶意边界 | 六卡结构、身份字段、卡高、clip、action intent失败关闭 | 未运行测试与严格类型 |
| 生命周期/副作用 | 纯RenderPlan；不创建Three/资源/RAF/timer；原3D context不变 | 浏览器滚动、销毁、重入实测 |
| 治理/回滚 | 状态固定code-written-not-run/not-run；不开放A0.3、Blockout或批准门 | 主协调签核、设备、真人、Final |

最小回滚：删除 A6.19 新增增强器及测试和本文，移除包导出，并把角色选择 Surface 的 `surface.render(enhancedPlan)` 恢复为 `surface.render(plan)`。无需回滚资产、角色目录、3D preview owner、Authority、Profile 或默认入口。

## 8. 建议中央治理 marker

主协调后续可在中央治理台账登记：

`A6.19 character-selection card non-color handling identity: production-unreachable / code-written-not-run / validationStatus=not-run / six pure-panel geometry signatures / action-and-3D-lifecycle-unchanged / default-entry-unchanged / hardGate=false`
