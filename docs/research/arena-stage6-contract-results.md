# Arena Stage 6 S6.1 合同门禁记录

## 结论

2026-07-17 的当前未提交 Stage 6 工作区已通过 S6.1 本机 E1/E2 退出门。这只证明 Character 内容合同、InputFrame/Replay V4 和 Stage4/5 中性兼容可以作为 S6.2 输入，不证明 Movement、触控、灰盒表现、真机或 A/B 盲测已完成。

## 候选范围

- `CharacterDefinition` 仅保存版本化玩法数据，深冻结并拒绝未知字段、访问器、循环与非有限值。
- `CharacterRegistry` 在组合期拍摄独立内容快照，外部目录后续修改不能改写已创建比赛。
- Runtime 只保存 participant ID 和 Character Definition ID，不持有 Physics、Renderer 或回调。
- Match schema、Bot Observation 和 Replay 升至 V4；V3 在 Core factory 运行前明确拒绝。
- `primary/jump/slam` 使用同一严格 `InputFrame`；S6.1 的 jump/slam 是中性字段，不越过 S6.2 触发动作。
- Character 目录进入 `ruleContentHash`，参赛者角色 ID 进入快照、状态 hash 和回放元数据。

## 执行证据

| 命令 | 结果 |
|---|---|
| `npm test` | 233/233 通过 |
| `npm run build` | `dist/web`、`dist/wechat`、`dist/douyin` 构建成功 |
| `npm run arena:poc:build` | `dist/arena-poc/{web,wechat,douyin}` 构建成功 |
| `npm run arena:map:stress` | 100/100 局，720,100 tick，3 份严格回放，100 个唯一最终 hash |
| `npm run arena:bot:stress` | 三档各 300 局，共 900 局；每档 3 份回放，900 个唯一最终 hash |
| `npm run arena:stress` | 1,000/1,000 局结束，0 非有限状态，5 份严格回放，1,000 个唯一最终 hash |
| `git diff --check` | 通过 |

## 关键统计

### 地图兼容

- 样本：100 个 seed。
- 时间轴：720,100 tick。
- 全量结束：100 局；唯一最终 hash：100。
- 回放：3 份严格一致。

### 隐藏 Bot 兼容

- 10,000 个连续 seed 的难度份额：简单 33.08%、普通 33.96%、困难 32.96%。
- 能力指数：简单 14.09、普通 17.8567、困难 18.61，保持单调顺序。
- 本次结果不冻结最终玩家胜率；Movement 与真人触控接入后必须在 Stage9 重新测量。

### MatchCore 稳定性

- 总 tick：909,066；平均每局 909.066；最长 1,307。
- 平均 tick 耗时：0.05911ms，当前脚本预算 0.25ms。
- GC 后堆增长：3,039,672 bytes，当前脚本预算 33,554,432 bytes。
- 完成局：1,000；未完成：0；非有限状态：0。

## 不能由本记录推断的事项

- `arena:movement:stress`、`arena:input:fuzz` 和 `arena:session:soak` 尚未实现，因此 S6.2、S6.4 和 S6.5 不能关闭。
- 构建成功不等于微信、抖音开发者工具或目标真机通过。
- 无渲染回放不能证明动画/特效关闭后 hash 一致，该证据要等 Presentation 路径存在后采集。
- 没有新手 A/B 盲测，不允许冻结 Mapper 胜者或宣称“10 秒学会”已验证。
