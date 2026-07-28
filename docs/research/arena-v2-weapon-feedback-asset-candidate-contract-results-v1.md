# Arena V2 命中反馈候选资产合同结果 V1

## 状态与边界

- 状态：五类反馈均已有候选视觉、候选音频和低动效替代 ID；资产交付、设备可读性和真人因果理解仍阻塞
- 日期：2026-07-28
- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-feedback-asset-candidate-contract.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-feedback-asset-candidate-contract.test.ts`
- 关联决策：[ADR-105：命中反馈先固定候选资产合同，再绑定最终资产](../decisions/105-arena-v2-weapon-feedback-asset-candidate-contract.md)

这批工作解决的是“反馈语义已经存在，但最终声音/特效如何接入、低动效如何降级、何时允许算完成”没有固定的问题。它只建立候选资产的稳定身份，不声称对应文件已经制作或已经进入正式资源包。

## 五类候选合同

| 权威反馈 | 语义职责 | 视觉候选 | 音频候选 | 低动效视觉候选 |
|---|---|---|---|---|
| `hit-confirm` | 命中确认 | `arena.feedback.visual.impact-confirm.v1` | `arena.feedback.audio.weapon-hit.v1` | `arena.feedback.visual.impact-confirm.reduced.v1` |
| `hit-surface-transfer` | 支撑面转移 | `arena.feedback.visual.impact-surface-transfer.v1` | `arena.feedback.audio.weapon-transfer.v1` | `arena.feedback.visual.impact-surface-transfer.reduced.v1` |
| `hit-ring-out` | 失去支撑面 | `arena.feedback.visual.ring-out.v1` | `arena.feedback.audio.weapon-ring-out.v1` | `arena.feedback.visual.ring-out.reduced.v1` |
| `attack-evaded` | 攻击线被避开 | `arena.feedback.visual.evaded-warning.v1` | `arena.feedback.audio.weapon-evaded.v1` | `arena.feedback.visual.evaded-warning.reduced.v1` |
| `movement-fall` | 路线失误掉落 | `arena.feedback.visual.movement-fall-warning.v1` | `arena.feedback.audio.movement-fall.v1` | `arena.feedback.visual.movement-fall-warning.reduced.v1` |

候选身份只由权威反馈语义索引，不能由表现层根据位置、颜色或动画重新推断。五类视觉 ID、音频 ID 和低动效 ID 均要求互不重复，避免最后把所有结果又合并成一个“命中音/命中特效”。

## 当前门禁

当前审计固定为 `blocked`，阻塞项为：

1. 尚未绑定最终视觉文件；
2. 尚未绑定最终音频文件；
3. 尚未完成目标设备可读性验收；
4. 尚未完成真人因果理解验收。

因此本合同不会自动改变 `WeaponFeedbackPresented` 的生产表现，也不会让三个研究武器进入默认生产目录。现有灰盒 Cue 仍只是运行时占位和研究信号。

## 下一步

1. 为五类语义分别提交最终视觉、最终音频和低动效版本，并保留来源、许可、大小和时长证据；
2. 在窄屏、低端设备和 `prefers-reduced-motion` 下检查同时命中与多人遮挡；
3. 用真人完成“看到结果后说出下一次调整动作”的任务，记录正确率和反应时间；
4. 只有上述证据齐全，才重新运行首发武器五项迁移门禁。
