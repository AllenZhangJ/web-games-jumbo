# Arena V2 武器命中音频候选生成记录

- 日期：2026-08-11。
- 状态：`authored-candidate-not-approved / production-unreachable / validationStatus=not-run`。
- 生成器：`scripts/arena-build-authored-weapon-audio-candidates.ts`。
- 生成器revision：`arena-v2-authored-weapon-audio-builder.candidate.v1`。
- 输入：已入库并已完成来源批准的Kenney Impact Sounds 1.0四份CC0 OGG。
- 输出：`public/assets/arena/audio/authored-weapon-candidates/`下17份单声48 kHz OGG。

## 1. 目标与边界

这批候选用于让20把武器在命中时先拥有可区分的听觉身份。新增17份音频分别补齐原先未覆盖的武器；重锤、引力链、蓄力盾和徒手推击继续使用4份来源intake已核验的Kenney音频，但逐资产生产批准账本当前仍把它们和其余候选一并记为`missing-not-approved`，只允许隔离开发试听。

生成只发生在开发工具链：使用固定滤波、均衡、包络、压缩和有界延时重塑已有CC0冲击源。比赛运行时仍只解码和播放静态OGG，不运行振荡器、不现场生成声音、不用无关音效兜底。

这17份是待试听的粗颗粒开发候选，不是正式完成音效。默认严格音频端口拒绝播放它们；只有隔离Web开发宿主显式开启`allowUnapprovedCandidateCues`才会预载和试听。

## 2. 设计分组

- 重量与承诺：攻城斧、承诺重拳、散射炮和天空锚优先保留低频、较长收尾和更强压缩感。
- 切割与绕侧：侧翼刃、边缘镰、枢轴刃和下潜爪使用更高的频率中心和更短收尾。
- 拉拽与回弹：钩矛、回弹钩、路线弓和跃迁长矛使用金属源与不同延时，区分“拉住”、“回来”和“穿过”。
- 节奏与突发：爆发护手、脉冲棍、双扇和读招反制用短延时或高频峰值强化动作时点。
- 范围与压力：直线压制器保留宽、暗、不尖锐的冲击，避免与快刃混淆。

## 3. 产物清单

| 武器 | 设计意图 | bytes | SHA-256 |
| --- | --- | ---: | --- |
| `line-suppressor` | wide-muted-pressure | 5,678 | `5c3e101bee65d89c379e2b92bb2b95b32124721c6195e4bb6ca5a96dbf794509` |
| `read-counter` | short-metal-answer | 6,164 | `951e2787f1794d596725478b4c93a2af2cc843eff7810e56b9565fddb8c6bd01` |
| `flank-blade` | fast-side-cut | 5,240 | `f9fa5ddf7a3a079ba5ef4fb23c96ea7ea14636905b33f4f6286a5910e32743c7` |
| `hook-spear` | hook-then-drag | 5,188 | `aeae39b5a16c5400005afad66c6dddc7436e0f28d2de0e6e4ad6bcc641bf6a5b` |
| `burst-gauntlet` | compact-burst | 6,233 | `958243463d8d17ebcdd6cc40a0c82cc17df922e0da0103de3ddd3403895591d3` |
| `vault-lance` | long-clean-thrust | 5,121 | `777582413386821b1bc817f3c4bf31e7cda8df286eae8260bb5e98be9a4c205f` |
| `scatter-cannon` | broad-scatter-blast | 4,523 | `cbcdaabd6028f39db3b8c2be83bc87aa44556eef8036ecb4d3ed37922e2eaf9e` |
| `sky-anchor` | dense-downward-lock | 6,845 | `d91d2ffcafd2882dec31d5b753dc25e75ab183039e388ac80882d9fa323e1965` |
| `edge-scythe` | thin-edge-sweep | 5,031 | `c3d089d6a9c1cadc22540c02238ff9ffb0268623a2af2c25031daf995d9a472c` |
| `rebound-hook` | elastic-return | 5,729 | `689f717fb3391b9fe1b2db6cd66362192918d2d6e0087ef0bce7d28e50f6956e` |
| `pulse-baton` | bright-pulse | 5,568 | `766e36cf96f99cacd9212ddc5427adbace72ce85a04a18ae1adac8e80a2ec6ac` |
| `siege-axe` | slow-heavy-cleave | 4,479 | `ffa32331ee96ae3cd4c5fcd9e2a02156ab1fd25b6e6ccbab5763f896c083fd27` |
| `twin-fan` | paired-air-slap | 5,725 | `7539b5c295060c1df94f9c478f5a304a10a57c926732b439cdd09d64a96b9019` |
| `diving-claw` | sharp-downward-grab | 5,572 | `9fdfedd38218b18afb70377a44cb0cb4a1cad272e17891056812edaa40c16401` |
| `route-bow` | light-ranged-twang | 5,166 | `b31bbb8c5ad3dd311439cce0877899658458dbee7d631ac82c826c848e6173b2` |
| `pivot-blade` | balanced-turning-cut | 5,158 | `d2f89abf1afef0e8a281e63f3743af1c1efd28fbf9e910e5ffaabfde549dce01` |
| `commitment-fist` | committed-heavy-punch | 5,961 | `c2d829e2bea6e83e3d5c633c15b5102f09e298be5989d5bfc621cde42919ad51` |

## 4. 后续批准要求

1. 盲听时同组武器可辨识，不依赖画面才能区分。
2. 轻、中、重反馈的主观排序与击飞承诺一致，不让弱攻击听起来比重攻击更重。
3. 连续命中、8 voice拥塞和手机扬声器下不爆音、不掩盖终局或供给提示。
4. 每份候选单独完成制作批准、真机批准和预算验收后，才能将maturity改为正式可用。

当前未执行音频试听、波形/响度验证、浏览器解码、真机、性能或资产预算门。
