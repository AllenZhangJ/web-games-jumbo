# Arena Stage 8 S8.4 对称内容池与快捷重赛结果

## 结论

S8.4 已完成无 UI 对称内容闭环：PlayerProfile 解锁经版本化 Definition/Catalog/Replacement Registry 解析为每局冻结池，玩家与隐藏对手共享角色、装备和地图边界；Authority Content 按该选择生成只读 Registry 与地图投影；Match/Replay V5 可以独立重建；reward/unlock 均可直接快捷重赛。

本批没有接产品页面、正式资产或三端真机生命周期。它证明无宿主 Rule/Core/Product 合同和连续局隔离，不替代 S8.5 的 Web、微信、抖音运行证据。

治理后续状态：2026-07-21，内容池七个实现已迁入 strict TypeScript workspace `@number-strategy-jump/arena-product-content`。迁移保持 S8.4 的具名随机流、内容选择、Replay V5 和压力结果，新增 getter 零执行、方法快照、同步不可重入、Promise 拒绝、seed 先验校验及返回 provenance/hash 复核；Arena V1 内容组合与顶层 Product Composition 仍是后续治理范围。干净提交 `c123c702afaaa77ada29822e5bfd788ef7d055b6` 的 653 项 Node、149 项 strict、101 项生命周期、200 局压力、三端 clean build/预算与 390×844 Chrome 交互复验均通过，JavaScript 精确清单由 411 降至 404。

## 落地边界

```text
ProfileService snapshot
        ↓
ContentPoolResolver -> FrozenMatchContentPool
        ↓                    产品 provenance 到此为止
MatchContentSelection (V1)
        ↓
MatchConfig/Replay V5
        ↓
Character / Equipment / Action / Map Registry snapshot
        ↓
MatchCore -> BotObservation -> ProductMatchResult V2
```

- `content-pool/` 不依赖组合根、持久化、Match Runtime、Session 或表现层。
- Profile revision/poolHash 不进入 MatchCore 和公开内容。
- Bot 仍只读公开快照并输出普通 `InputFrame`，没有获得 Profile 或未来内容。
- 原始 Character/Equipment/Map Definition 不被修改；地图装备波生成本局投影。

## 合同与失败策略

| 场景 | 结果 |
| --- | --- |
| Profile 含未知 ID 且无替代 | 比赛创建前拒绝 |
| 替代来源重复、形成环或目标不存在 | 组合阶段拒绝 |
| retired ID 仍存在于 Catalog | 作为歧义配置拒绝 |
| 地图装备波与装备池无交集 | Match 构造失败并清理 |
| 初始装备、角色分配或地图与选择不一致 | MatchConfig V5 拒绝 |
| 内容 hash 或冻结池 hash 被修改 | 校验失败 |
| Product 公开内容与 replay.config 不一致 | ProductMatchResult 拒绝 |
| 重赛快速连点 | 共用一个 Promise，只创建一个 Match |
| 重赛准备失败 | 回到原 reward/unlock，展示快照不丢失 |
| 后台完成重赛准备 | visible state 保持 suspended，activeState 变为 preparing |
| 新 Match 准备成功 | 清除旧奖励，每局重新冻结内容 |

## 版本升级

- MatchConfig/Match snapshot schema：V4 → V5。
- Replay schema：V4 → V5；旧 V4 明确拒绝。
- ProductMatchResult schema：V1 → V2，新增经权威配置复核的公开 content。
- InputFrame 与 BotObservation 仍保持各自 V4 合同，没有借内容升级修改输入或 Bot 权限。

## 自动化与压力证据

定向测试覆盖 Definition 深冻结、hash 防篡改、替代链/环、Catalog 协调、具名随机流、单装备地图投影、Replay 重建、公开信息脱敏和 reward/unlock 重赛竞态。

本机门禁：

```text
npm test
460/460 通过

npm run arena:profile:stress
500 次提交通过；17 次读回回滚、29 次 head 失败、16 次损坏注入均保留有效 Profile

npm run arena:product:stress
200 局通过；96 次快捷重赛、334 次生命周期转换、7 次产品重启

npm run build
Web、微信、抖音构建通过
```

产品压力结果：

```json
{"ok":true,"matches":200,"authorityHashCount":200,"contentHashCount":2,"lifecycleTransitions":334,"rematches":96,"maximumTicks":59,"restarts":7,"experience":22000,"latestGrantId":"arena-result:r200:000027d8:c01a479d"}
```

`contentHashCount=2` 来自当前两个可用对手角色与唯一地图/完整装备池的确定性组合，不表示只有两局内容；200 局 authority hash 均独立。

## GitHub 借鉴与依赖

继续使用已固定的 Motumbo RNG 分流思想和 XState 显式转换思想，边界见 [ADR-017](../decisions/017-arena-frozen-symmetric-match-content.md)。没有复制第三方代码、没有新增依赖。

## 尚未证明

- S8.5 产品 UI、无障碍文本、本地化以及 Web/微信/抖音真实 App 生命周期尚未接入。
- 当前生产内容仍全部解锁，尚无正式新增内容验证真实经验门槛和解锁节奏。
- 当前只有一张正式地图，不能用本批证明多地图内容量与加载性能。
- 现代 Three.js 路径仍要求目标宿主 WebGL2；真机失败必须进入明确降级/版本决策。
