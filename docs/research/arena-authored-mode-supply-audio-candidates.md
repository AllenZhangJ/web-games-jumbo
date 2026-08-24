# Arena V2 模式与供给音频候选生成记录

- 日期：2026-08-11。
- 状态：`authored-candidate-not-approved / production-unreachable / validationStatus=not-run`。
- 生成器：`scripts/arena-build-authored-mode-supply-audio-candidates.ts`。
- 生成器revision：`arena-v2-authored-mode-supply-audio-builder.candidate.v1`。
- 输入：已入库且来源获批的Kenney Impact Sounds 1.0四份CC0 OGG。
- 输出：`public/assets/arena/audio/authored-mode-supply-candidates/`下17份单声48 kHz OGG。

## 1. 目标与边界

这批候选关闭模式与供给反馈的“登记缺口”：13个模式Cue覆盖开局、三种掉落原因、等待重生、完成重生、安全锚、竞速终点、敌人进入/离场、生存第一次/第二次掉落和对局结束；4个供给Cue覆盖刷新、拾取、替换与10秒生命周期结束。

Cue只消费已经进入HUD反馈队列的权威事件身份。音频resolver不读取位置变化猜掉落、不比较世界武器列表猜拾取、不以播放完成回写重生或胜负。比赛运行时只解码静态OGG，不生成振荡器，也不借用未登记音频兜底。

这些文件只是粗颗粒试听候选。默认严格Web Audio端口拒绝未批准候选；只有隔离开发宿主可显式预载和试听。

## 2. 听觉分层

- 进入与完成：开局、重生、终点和结算使用较明亮的中高频与短延时，提供明确阶段边界。
- 失败与压力：被击落、环境掉落、敌人压力和第二次生存掉落保留低频与更长收尾；路线失误更轻，避免错误强化为“被攻击”。
- 恢复与进度：等待重生、安全锚和第一次生存掉落保留可恢复感，不使用终局重量。
- 供给生命周期：刷新最醒目，拾取最短，替换有两段感，消失最轻；不会让普通消失压过终点或终局。

## 3. 产物清单

| Cue | 类别 | 设计意图 | bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `mode-started` | mode | clear-round-open | 6,440 | `7e22872ed48b5342ee4a64f5a5a83af427708c5835d20014a6f02ca056247d27` |
| `participant-fell-credited-hit` | mode | credited-heavy-drop | 4,460 | `a0b3424254ff5c4277ff9d8dd76e8d6f7f4022b3ba6cc03f97bcf3362063d936` |
| `participant-fell-movement` | mode | light-route-miss | 5,613 | `eb682dc780d934c3e1e3999cb291922b296ed48140d9a5f4f953dab0844f223e` |
| `participant-fell-environment` | mode | dark-world-drop | 4,462 | `f94f67f0202288f24f688f46e3824f2a096379e54c17a597fd7bcb7648da1af2` |
| `respawn-scheduled` | mode | soft-pending-pulse | 6,770 | `108c870450343c3368177ce525ad3873dd173575626e81c922b6c67f91b12070` |
| `respawned` | mode | bright-return-confirm | 5,938 | `f5fe4a9e2b9c0e097d2c2060119d4021ef804a55ba2f309e8859ecfb8c3ad51a` |
| `safe-anchor-committed` | mode | precise-checkpoint-lock | 4,908 | `a713de29e9a6dcbd813c7d5d6cd26e1aff3301a0be04466ddbb9fdc8c66cb4ab` |
| `race-finish-claimed` | mode | wide-finish-release | 6,152 | `9def72f1f464cf97f99dcee960631d6aa0491bc5eb8a68fbec0ce4ab7e3c1237` |
| `enemy-pressure` | mode | low-threat-entry | 4,522 | `78a38ebde41e37029441d74da8c05040144711f82bcf50ed8e2154106bc1ab6c` |
| `enemy-left` | mode | pressure-release | 5,317 | `f139eedf2b0c4db00403e93265ceea2bba4084522d08b2598966d14a040fe0cb` |
| `survival-first-fall` | mode | warning-with-recovery | 4,724 | `c1bfe7e97de02a9f3cf5b55cfa817b49cb4a3a05abe8603c130aa20dfba4883c` |
| `survival-terminal-fall` | mode | terminal-heavy-stop | 4,547 | `c063c940d3a9dac184933f752479cf20f6230bcfe4ed8fee89cb5ed521210ede` |
| `match-ended` | mode | neutral-round-close | 7,049 | `0724f7c034f47cd77895cb809932b0c5a7ff5e61712536ea65400cde1d871dba` |
| `supply-spawned` | supply | visible-world-arrival | 6,009 | `92af8a59d7939ccbf231687c5ab0b268eee93e19a9a8f19dbb9a0fed500d90a5` |
| `supply-picked-up` | supply | quick-ownership-confirm | 4,754 | `24b1a992f5761967e9e3bfa824d53c87f20564ba03e4c41764a810a325145cde` |
| `supply-replaced` | supply | two-stage-swap-confirm | 5,259 | `89e45d12532a96e3e4c5d92480544547a044de19bcb02b84f1a1d8bed6d874be` |
| `supply-expired` | supply | quiet-lifecycle-close | 5,153 | `8934825466dc626c757b747c18394e8a31cb33f0b2d272487cdd06c6aae7d843` |

## 4. 后续批准要求

1. 玩家在不看文字时，能区分“被武器击落”“路线失误”“环境掉落”和生存第二次终局掉落。
2. 供给刷新与拾取在地图战斗中可察觉，但不压过命中、终点和终局。
3. 同tick多事件和最多8 voice拥塞时，优先级听感符合warning > strong > normal。
4. 手机扬声器、浏览器、静音恢复、后台切换和低动效场景完成试听后，才能批准maturity。

当前未执行音频试听、响度/波形审计、浏览器解码、真机、性能或资产预算门。
