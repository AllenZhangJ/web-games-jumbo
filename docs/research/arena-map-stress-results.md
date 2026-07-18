# Arena Stage 5 地图时间轴压测结果

> 本文保留 Stage 5 历史基线。当前 `arena:map:stress` 已改为驱动 Stage 9 `arena.stage9.map-timeline` 版本化 workload/collector，当前迁移证据见 [S9.1 专业实验记录](arena-stage9-s9.1-experiment-foundation.md)。

## 状态

Stage 5 本机无渲染地图门禁已通过，复测于 2026-07-17。本结果验证权威地图时间轴，不等价于预警美术、角色可读性或目标真机性能。

## 方法

- 100 个连续 seed，每局使用中性 `InputFrame` 和 99 条压测生命，完整推进 120 秒 Stage 5 时间轴。
- 每 tick 验证至少一个可用 surface、grounded 支撑合法、无装备滞留在塌陷区，且公开快照不泄漏 `privatePlan`。
- 抽取 3 局重放完整 120 秒输入，核对最终 hash。
- 最终状态必须只剩永久 `tile-center`。

执行命令：

```bash
npm run arena:map:stress
```

## 结果

| 指标 | 结果 |
|---|---:|
| 完整地图样本 | 100 / 100 |
| 权威 tick | 720,100 |
| 抽样完整回放 | 3 / 3 |
| 唯一最终 hash | 100 |
| 预警 / 开始 / 结束 | 1,300 / 1,300 / 600 |
| surface 塌陷 | 800 |
| 装备波释放 | 400 |
| 装备权威回收 | 416 |
| 非法最终安全岛 | 0 |
| 不可达世界装备 | 0 |

## 结论与边界

Stage 5 的预警、风场、装备波、分阶段塌陷、无效装备回收、最终安全岛和回放 hash 已形成可复现闭环。Stage 6 仍需在灰盒视觉中验证预警是否真正可读；Stage 9 再用正式输入、Bot 和目标真机冻结节奏与性能。
