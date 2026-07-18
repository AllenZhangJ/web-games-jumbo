# Arena Stage 9 S9.2 黄金回放、模糊与回归结果

## 结论

S9.2 实现边界已完成并通过提交前全量门禁。当前 Replay V5 具有可审查的版本化黄金语料、严格重放与场景再生成、Core 创建前历史 schema 拒绝、受控候选提升、input fuzz 单 seed 复现和覆盖 Stage 3～8 生命周期的组合回归门。

## 权威边界

- `ArenaGoldenReplayManifest` 是严格、不可变的纯数据合同，固定 replay/config/content/hash、seed、结果、输入/checkpoint 和事件计数。
- 场景 Registry 只组合版本完全匹配的 `createReplay/assertReplay` port；Manifest 与 Registry 对当前版本必须双向完全覆盖。
- Verifier 不依赖 Node IO、Three.js、DOM、平台或墙钟，只接受已读取数据和 Core factory。文件读写仅存在于 CLI。
- 当前版本每条语料先核对完整 replay hash，再严格重放，并从真实场景重新生成。历史版本必须在 Core 创建前以稳定兼容错误码拒绝。
- 普通验证只读。候选生成到仓库外；提升需要 `bootstrap-v5` 或由当前 Manifest hash 派生的 `replace-*` token，并在临时目录再次验证后替换。

## 首批 Replay V5 语料

| 场景 | 权威覆盖 | seed | 结束 tick | replay hash | final hash |
| --- | --- | ---: | ---: | --- | --- |
| `equipment.scripted-pressure` | 三件装备拾取/动作/命中 | 2584805376 | 899 | `5af05895` | `5be8a131` |
| `lifecycle.quick-match-pause-resume` | QuickMatch/Session start 前与局中暂停 | 1375600641 | 479 | `9103f728` | `5c0b93fa` |
| `map.first-wind-cycle` | 风场预警/开始/结束 | 1517158400 | 1199 | `803aa64f` | `648fc274` |
| `movement.semantic-actions` | 地面跳、二段跳、蹲跳、下砸/落地 | 1834352640 | 899 | `32bf5868` | `ee5cbf64` |

Manifest hash 为 `5f9df22c`。完整 JSON 约 1.8 MiB，当前有意保留输入、checkpoint、事件与结果的人工可审查性；只有仓库体积出现可测量问题时才评估压缩归档格式。

Replay V4 没有可证明来自旧实现的可信语料，因此本批不伪造历史文件，而是以合成版本漂移验证稳定错误码和零 Core factory 调用。第一次升级到 Replay V6 时，真实 V5 目录将保留并进入历史拒绝路径。

## Input fuzz 失败缩减

批量 fuzz 保持两套 Mapper 各 40 局和抽样严格回放。失败时额外输出 schema V1 回归候选，固定：

- mapper ID；
- 原始 match index；
- 显式 uint32 match seed；
- `replayRequired=true`；
- 有界错误名称与消息。

候选可用 `--mapper`、`--match-index`、`--match-seed` 隔离成单一严格回放 case。真实缺陷修复后再将缩减场景注册为 `regression-*`；当前没有真实阻断缺陷，所以没有制造空洞的回归 fixture。

## 生命周期回归矩阵

自动化组合覆盖：

- LocalMatchSession 的 start 前 hide/show、快速 pause/resume、严格回放与 fail closed；
- Pointer Adapter 的 cancel、多指、hide/show、旧 pointer 和 start/destroy 重入；
- Product Session 的异步 boot/destroy、过期结果、重赛/奖励和暂停失败；
- Profile 双槽恢复、存储失败、过期 CAS 与 lease；
- Product Presentation 的异步 start 中同步 hide、hide/show、WebGL lost/restored、过期 RAF/输入与平台 lease；
- 旧表现 Session 与 Product Presentation Session 各 100 局 soak。

项目当前没有音频运行时，因此“音频挂起/恢复”没有可执行证据，不将其标记为通过；加入音频系统时必须补生命周期 Port 和回归场景。

## 命令

```bash
npm run arena:replay:verify
npm run arena:input:fuzz
npm run arena:regression:lifecycle
npm run arena:regression

# 仓库外生成候选
npm run arena:replay:candidate -- --output=/tmp/arena-replay-candidate

# 评审后显式提升；替换 token 由当前 Manifest hash 得到
npm run arena:replay:promote -- --candidate=/tmp/arena-replay-candidate \
  --approve=replace-5f9df22c
```

## 下一步

S9.3 需要在运行正式候选前预注册工程阈值与 seed 集。真人胜率和新手理解仍必须由 E4/试玩数据提供，不能用脚本或隐藏机器人自证。

## 提交前验证

- 全量测试：552/552 通过。
- 黄金语料：4/4 严格重放与再生成，Manifest hash `5f9df22c`。
- input fuzz：两套 Mapper 各 40 局，80/80 唯一最终 hash，4/4 抽样严格回放。
- 生命周期回归：83/83 通过。
- 旧表现 Session soak：100/100，最终 frame/listener/input 所有权均为 0/未绑定，GC 后堆增长 2,417,768 B，低于 8 MiB 预算。
- Product Presentation Session soak：100/100、100 个唯一 Authority hash，最终资源所有权清零，GC 后堆增长 5,187,488 B，低于 8 MiB 预算。
- Web、微信、抖音三端构建与 Manifest 验证通过；该次是提交前 dirty build，只证明构建门，冻结证据仍要求 clean commit 与目标真机 Record。
