# Arena 产品基线：51e2822

- 冻结提交：`51e28220295c080261d30e33aaac7e43c5f91685`
- 原始分支：`feature/arena-stage6-input-movement`
- 治理分支：`feature/arena-enterprise-governance`
- 验证日期：2026-07-21
- 工作树：验证时 clean
- 用途：防止企业治理迁移让当前 Arena 产品行为、打击感、输入、动作、武器、回放或生命周期修复倒退

## 自动化基线

| 门禁 | 基线结果 |
| --- | --- |
| `npm test` | 696 tests，696 pass，0 fail；包含旧数值跳台测试，不能直接当作 Arena 覆盖率 |
| `npm run arena:replay:verify` | Replay schema v5；4 个样本；manifest `0dace228` |
| `npm run arena:input:fuzz` | 3 个 mapper × 40 场；120 个唯一 final hash；6 个 Replay 复验 |
| `npm run arena:regression:lifecycle` | 91/91 通过 |
| `npm run arena:session:soak` | 100 场；heap +2433112 B / 8388608 B；资源残留 0 |
| `npm run arena:product:session:soak` | 100 场；heap +5960016 B / 8388608 B；资源残留 0 |
| `npm run arena:movement:stress` | 100 场；417355 tick；100 个唯一 final hash；3 个 Replay；result `029e5ef6` |
| `npm run arena:product:stress` | 200 场；200 个 authority hash；334 次生命周期转换；96 次重赛 |
| `npm run arena:profile:stress` | 500 次提交；17 次读回回滚；29 次 head 故障；16 次损坏注入；最终 revision 500 |
| `npm run arena:assets:budget` | 10 个正式资产；result `82a8b378`；policy `532faaa2`；通过 |
| `npm run build` | Web/微信/抖音构建通过；buildId `arena-51e28220295c-product` |
| `npm run arena:build:verify -- --require-clean-source` | 三端 ready；默认入口均为 `product` |
| `npm run arena:build:budget` | policy `d7e9250a`；三端通过 |
| `git diff --check` | 通过 |

## 确定性锚点

黄金 Replay：

| 场景 | final hash | replay hash |
| --- | --- | --- |
| `equipment.scripted-pressure` | `c9cd7e73` | `17b60bcb` |
| `lifecycle.quick-match-pause-resume` | `33a33688` | `543a7a80` |
| `map.first-wind-cycle` | `389b7142` | `2e092bc6` |
| `movement.semantic-actions` | `ee341734` | `b68c763e` |

迁移可以因明确的 Replay schema ADR 更新这些值，但不得静默变化。类型迁移、包移动和治理外壳本身不构成改变玩法结果的理由。

## 正式资产锚点

- 总编码体积：1990436 B / 2359296 B
- 音频体积：32593 B / 65536 B
- 解码纹理体积：12582912 B / 16777216 B
- 两个角色均为 41 joints、18 animations；Rogue 54 nodes，Skeleton 52 nodes
- 角色 GLB SHA-256：
  - Rogue：`3ee71059eef32d9a6259c5cfd4121f31dffda0a9667509b5f24129fb2c7a1cab`
  - Skeleton：`1a424efda14e7875180989a66186fafcc94a12ac85ebdfdc7e3f998a00584e39`
- Shield GLB SHA-256：`a61bcd83ccac9bc8596bf09894867ca491487d7a4b0662bb64dca2d1b19e790d`

资产哈希和预算通过只证明文件与自动化合同一致，不等于已取得项目最终批准；批准闭环属于 G8。

## 三端产物锚点

| 平台 | delivery | JavaScript | artifacts | manifest | result |
| --- | ---: | ---: | ---: | --- | --- |
| Web | 3773570 B | 1395707 B | 52 | `72c5d257` | `4dd06058` |
| 微信 | 3587013 B | 1258917 B | 23 | `4713d9b5` | `c9ee184c` |
| 抖音 | 3586988 B | 1258917 B | 23 | `669bc8a1` | `08ec767b` |

当前预算通过并不代表交付结构符合目标治理：Web 构建仍包含 `greybox.html`、`pilot.html`、`study.html` 等开发/研究页面，G6 必须将它们移出生产产物；优化后的交付不应劣于上述体积。

## 必须保住的产品行为

- 任意距离均可发起攻击并出现挥空动作，攻击键不得因附近没有敌人而禁用。
- 权威命中、击退、淘汰和胜负只能由 Core 判定；Renderer/UI 不得回写。
- 武器攻击范围、速度、起手/收手/僵直、击退和角色移动/跳跃来自统一 Definition，不回退到散落魔法数。
- 正式角色与武器是正常路径；程序化模型仅在资产加载失败时兜底。
- 移动、停止、起跳准备、空中、二段跳、正/背面受击和武器动作的现有状态语义不得在纯治理迁移中丢失。
- 固定 tick、暂停不补时、30/60/120 Hz 权威等价、Replay 可复验、生命周期失败关闭继续成立。
- Profile 奖励不可重复发放；损坏、未来 schema、CAS/租约竞争和迟到异步回调继续失败关闭。

## 基线债务（不是豁免）

- `src/tests/scripts/public` 当前统计为 506 个 `.js`、43 个 `.mjs`，尚无 strict TS 治理。
- 旧数值跳台 v3 的 `src/core`、`src/runtime`、对应测试、资产和文档仍存在。
- 根 README 仍以旧产品为标题和主要说明。
- Web 交付混入开发/研究页面。
- 当前使用 Node test runner，尚未承接 main 的 Vitest、coverage、ESLint、CI、CODEOWNERS、零 JS 与 workspace 治理。
- 自动化和本机构建不能替代 iPhone 13 Pro/Chrome 的本轮 Web 验收，也不能替代微信/抖音四目标真机发布证据。

这些债务必须由 G1-G9 清零或形成明确、经审计的发布阻断；最终 G10 不接受未登记的例外。
