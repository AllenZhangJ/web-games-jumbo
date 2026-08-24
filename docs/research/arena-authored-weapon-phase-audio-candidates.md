# Arena V2 武器阶段音频候选生成记录

## 状态

- 当前状态：`generated-not-auditioned / authored-candidate-not-approved / code-written-not-run`。
- 数量：20 把武器 × `windup / release / recovery` = 60 份单声道 OGG。
- 运行目录：`public/assets/arena/audio/authored-weapon-phase-candidates/`。
- 生成器：`scripts/arena-build-authored-weapon-phase-audio-candidates.ts`。
- 生成 revision：`arena-v2-authored-weapon-phase-audio-builder.candidate.v1`。

## 来源与权利

所有候选只从项目已经登记的 20 份武器命中音频派生；其中基础三把和空手基底来自 Kenney Impact Sounds 1.0（CC0-1.0），17 把扩展武器命中候选也由同一固定来源派生。阶段候选没有加入外部录音、运行时振荡器或未知授权素材。当前生成和登记不等于美术/音频批准。

## 设计分工

- `windup`：短上扬、较低响度，表达动作承诺开始，不表达命中。
- `release`：最清晰的动作释放瞬态，但与命中确认音分离；没有权威命中事件时也不能伪装为命中。
- `recovery`：低频、低响度的复位尾音，表达收招窗口。

运行链只消费本地玩家的权威 `ActionStarted` 与权威 `participant.action.phase`。`active` 映射为音频语义 `release`；恢复到半截动作且没有观察到开始事件时不播放，静音期间只推进幂等水位而不补播。最多 8 路 one-shot，继续沿用最低优先级丢弃策略。

## 当前未完成

- 未试听 60 份候选，未检查爆音、直流偏移、首尾点击、响度与三段层级。
- 未做 20 把武器身份盲听、命中音遮蔽、多人拥塞、静音切换与长局生命周期验证。
- 未做浏览器、iOS、Android 或耳机/扬声器设备验收。
- 未纳入正式资产预算白名单，60 份均未批准；默认生产资产门继续关闭。

本轮只为连续开发生成并接线，没有执行测试、构建、压测或设备验证。
