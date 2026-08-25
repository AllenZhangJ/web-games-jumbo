# Arena V2 A4 武器命中音频生产评审准备候选 V1

## 状态与目的

- 状态：`production-unreachable / code-written-not-run / validationStatus=not-run / hardGate=false`。
- 目的：落实`a4-weapon-impact-audio`第六批可做的生产前准备，把20把武器的命中音频、1份徒手基础推击、40个地面/空中动作身份、因果边界、确定性变化、SFX总线与设备试听收敛成逐资产评审包。
- 明确不做：不下载、生成、转换、修改、加载、解码或播放音频，不改变武器、动作、命中、击落或移动，不调整Web Audio运行图，不把来源批准、编码字节或Catalog登记写成听感证据。

## 任务记录

| 项目 | 本批记录 |
|---|---|
| 任务产物 | `arena-v2.a4-weapon-impact-audio-production-review-preparation.candidate.v1`确定性只读准备合同 |
| 消费面 | 20把武器的地面/空中命中反馈与2个徒手动作的基础推击音 |
| 权威来源 | Formal Audio Catalog、Readiness、逐资产批准账本、工作队列、二十武器音画Manifest、Formal Audio Resolver |
| 使用技能 | `audio-design`、`game-art-director` |
| 强制参考 | 项目Art Bible、美术/音频流程、对齐矩阵、Kenney intake、项目生成记录、Web Audio候选和两个技能说明 |
| 正式或研究 | 正式武器命中音频生产评审准备；不是音频批准、试听通过、Integration或Final |
| 来源 revision / license / SHA | 21项逐一继承当前Catalog/账本；4份Kenney intake来源批准与21份生产批准严格分离 |
| 目标设备 | 耳机、桌面扬声器、手机扬声器和三端目标；均未播放或录音 |
| reduced-motion / 静音 / 失败回退 | 静音、缺音频或加载失败时保留视觉形状、方向、结果、文字和语义公告 |
| 预算影响 | 零新增字节；21份当前编码合计125,974 B，只是Catalog事实，不代表解码、响度、混音或总预算批准 |
| 验证 | 直接规格已纳入SF-A3A6P.1固定runner；波形、响度、盲听、浏览器解码、设备录音和性能仍顺延 |
| 回滚点 | 删除本候选源码、导出、延期测试、治理标记和本文；不影响音频资产、Resolver、Web Audio或入口 |

## 21份命中音频闭包

- 20份武器命中音频与20个Equipment Definition一一对应。
- 每把武器绑定唯一的地面/空中Action Definition，共40个互不重复动作身份，并继承同一Combat Grammar身份。
- 每把武器已有24个`3模式 × 2情境 × 4结果`反馈配方；音频只消费这些权威派生命令，不自行推断命中、击落或移动。
- 另1份`base-push`只服务2个徒手动作，不占用武器身份，也不能成为未登记武器的通用兜底。
- 4份`verified-intake-only`为Kenney来源文件；其中3份绑定重锤/引力链/蓄力盾，1份绑定徒手。17份`authored-candidate-not-approved`为固定脚本加工的衍生候选。
- 21份资产生产批准当前全部为`missing-not-approved`；来源intake批准和项目生成记录均不能升级为试听、设备或Final批准。

## 因果、变化与混音目标

- 精确动作查找固定为`exact-action-definition-id`；不得从武器名、动画、距离、接触点或当前画面猜音频。
- 重量感可以强化已经发生的权威结果，但不能让普通命中听成击落，也不能给挥空或移动失足补武器冲击体。
- 重复变化只允许由`sourceEventId`确定性选择`0.96 / 1.00 / 1.04`播放率；不得使用墙钟或运行随机，也不得通过过大变调改变武器身份。
- 单声命令仍受`-6 / -3 / -2 dB`和Priority `1 / 2 / 3`闭集约束；实际逐结果平衡、响度和遮蔽未评审。
- 待核对混音链为`voice gain → SFX(0 dB) → Master(-6 dB) → limiter(-3 dB, 20:1) → destination`。Limiter只是安全网，不是“混音已通过”。
- 同时最多8个Voice，拥塞时`drop-lowest-priority`；同一`sourceEventId`只播放一次。必须证明高价值击落/终局不会被低价值重复命中遮蔽。
- 不允许振荡器、现场合成或借用不相关声音兜底；音频失败不能阻断渲染或修改Authority。

## 十项后续评审门

以下全部为`not-run`：

1. 20武器命中音与1徒手基础推击是否无重叠闭合。
2. 4份来源intake和17份衍生候选的revision/license/SHA是否闭合。
3. 20武器是否精确绑定40个地面/空中Action与Combat Grammar。
4. 20把武器在无画面盲听时是否可辨。
5. 轻/中/重与承诺感是否支持、但不伪造权威结果。
6. 三档确定性播放率是否减轻重复且不漂移身份。
7. SFX、Gain和Priority阶梯是否保留高价值反馈。
8. 8 Voice、溢出和sourceEvent去重是否在拥塞下正确。
9. Master Headroom、Limiter、耳机、扬声器和手机是否无削波/遮蔽。
10. 静音、缺音频、预载失败、stopAll和destroy是否保留视觉/文字因果并完整清理。

## 生产边界

当前只开放`source-identity-causality-mix-budget-and-review-preparation-only`：

- `productionBlockoutAllowed=false`；
- `integrationAllowed=false`；
- `finalAllowed=false`；
- `assetUsePermitted=false`；
- 默认Formal Bundle、Preloader与Entry继续不消费本候选。

源码构造时会拒绝21资产或20武器不闭合、40动作身份不唯一、徒手/武器身份混用、path/bytes/SHA漂移、4/17成熟度分组漂移、伪造批准及Resolver查找策略漂移；直接规格已由固定runner执行。十项真实评审仍`not-run`，不能声明解码、盲听、响度、混音、设备、拥塞、静音或生命周期通过。
