# Arena Stage 8 S8.5.1～S8.5.3 产品表现基础

## 结论

S8.5.1～S8.5.3 已建立产品表现基础：产品状态由版本化 Screen Definition、本地化 Message Catalog 和内容表现 Registry 投影为只读 ViewModel；页面输入通过串行 Intent Dispatcher 进入 ProductController；真实比赛通过非拥有 Match 桥复用既有 Arena frame projector，同时保持 ProductController 是唯一 Match 所有者；`ProductPresentationFlow` 统一编排比赛启动、表现推进、自动奖励、保存失败重试和展示缓存释放；`ProductPresentationSession` 最终统一拥有 Controller、Flow、输入、FrameLoop、Profile lease 心跳、生命周期绑定和注入的 Renderer。

本批不是 S8.5 完成声明。通用产品 Session 已用真实 Product/Match 和可控假宿主验证，但 Web/微信/抖音正式 Renderer、产品入口、无障碍宿主绑定和真机留证尚未接入。

概念方向保存在 [S8 产品流程概念图](../quality/concepts/arena-stage8-product-flow-v1.png)。其中匹配取消仅是概念探索，当前代码没有取消协议，也没有发布该按钮。

## 落地边界

```text
ScreenDefinition + MessageCatalog + ContentPresentationRegistry
                              ↓
ProductSession snapshot -> ProductSessionViewModel -> Product Renderer（注入）
                              ↑
                      ProductUiIntent
                              ↓
                   IntentDispatcher
                              ↓
                 ProductSessionController
                              ↓ 只读快照 / InputFrame
             ProductMatchPresentationRuntime
                              ↓
                  ArenaPresentationFrame
                              ↑
       ProductPresentationFlow（意图/比赛/奖励编排）
                              ↑
        ProductPresentationSession（唯一宿主资源所有者）
             ↑ Platform 生命周期 / Pointer / FrameLoop
```

- `presentation/product` 不依赖 DOM、Three.js、平台、墙钟、定时器或 Product 组合根。
- ViewModel 只发布公开昵称/头像/外观，不发布对手 ID、Bot Profile 或难度。
- Match 桥只拥有事件去重窗口，不拥有 Controller 或输入源。
- Flow 只拥有 Dispatcher 与 Match 表现桥，不拥有 Controller 或输入源。
- Product Session 拥有 Controller、Flow、InputRouter、Pointer Adapter、FrameLoop、Renderer 和宿主绑定；销毁顺序与失败重试只有一个入口。
- ProductInputRouter 在 UI 与 gameplay 间事务切换；UI 必须按下/抬起命中同一意图才提交，gameplay 只输出普通 `InputFrame`。
- Session 前台每 20 秒续租 Profile lease，瞬时未确认按 1 秒重试；恢复前台和 Profile 写入前再次检查，确认丢失后停止 Match 并关闭写入。
- 同一 tick 只经 ProductController 推进一次；表现投影失败不尝试重放。
- Product Match 释放后，上一局结果只作为有界只读展示缓存保留。
- Flow 对外不发布原始 Product 快照；非结算页面不携带上一局结果。

## 已覆盖失败策略

| 场景 | 结果 |
| --- | --- |
| 未知产品状态、文案、内容或错误码 | ViewModel 构造失败，不发布半模型 |
| 重复已解锁角色、非布尔设置、未知胜者 | 严格拒绝 |
| 同一按钮快速连点 | 返回同一 pending Promise |
| pending 时触发不同意图 | 明确拒绝，不并行修改 Product |
| Dispatcher 销毁后异步完成 | 不恢复适配器，也不取得 Controller 所有权 |
| Match 启动/step 与产品状态不一致 | Match 表现桥失败关闭 |
| 重复表现事件 | 有界 sequence/ID 窗口过滤 |
| event window 构造后合同无效 | 尝试清理候选再抛错 |
| event window 首次销毁失败 | 保留资源引用，允许下一次 destroy 重试 |
| 权威结果完成 | Flow 冻结公开结果并自动提交同一奖励事务 |
| 奖励保存失败 | 保留 result Runtime 和 frame，retry 后精确重提 |
| Flow 前后台切换 | Controller 暂停权威 tick，恢复后从同一 tick 继续 |
| Match Runtime 候选无效或清理失败 | 清理候选；失败关闭并保留可重试资源引用 |
| 启动中同步收到 hide | boot 先进入可挂起状态，再绑定宿主；完成后保持 suspended |
| hide/show 或 WebGL context lost/restored | 停止 FrameLoop、清空累积时间并暂停权威 tick；恢复不追帧 |
| 异步 Renderer load 后 Session 已销毁 | 迟到完成只返回“启动已取消”，不恢复资源 |
| 无效宿主输入或 Flow 基础设施失败 | Session 失败关闭并释放完整所有权图 |
| UI 状态竞争导致意图拒绝 | 只拒绝该意图；Flow 仍健康时不误杀 Session |
| Pointer/Canvas/Renderer 首次清理失败 | 保留失败句柄和 Canvas 所有权，下一次 destroy 精确重试 |
| Profile lease 单次续租未确认 | 保持产品状态，1 秒后重试；写入前仍需再次续租 |
| 后台停留超过 lease 或被另一实例取代 | 恢复时先关闭 Match/Profile 写入并展示脱敏 fatal 状态，不推进 tick 或发奖 |

## 当前自动化证据

定向门禁覆盖真实 Product 组合、完整本地比赛、现有 Arena projector、ViewModel/Intent 边界、架构依赖和失败清理。

本机完整门禁：

```text
npm test
495/495 通过

npm run arena:profile:stress
500 次提交通过；17 次读回回滚、29 次 head 失败、16 次损坏注入均保留有效 Profile

npm run arena:product:stress
200 局通过；200 个独立 authority hash、96 次快捷重赛、334 次生命周期转换、7 次产品重启

npm run arena:product:session:soak
100 局通过；100 个独立 seed/hash、10 次前后台、6 次 context restore、15 次 resize，销毁后帧/生命周期/Canvas/输入资源全部归零

npm run build
Web、微信、抖音构建通过
```

产品压力结果：

```json
{"ok":true,"matches":200,"authorityHashCount":200,"contentHashCount":2,"lifecycleTransitions":334,"rematches":96,"maximumTicks":59,"restarts":7,"experience":22000,"latestGrantId":"arena-result:r200:000027d8:c01a479d"}
```

Product Session soak 首轮先暴露了重赛复用 `InputSampler` 导致 tick 从 59 回到 0 的阻断，修复为每局事务替换 sampler；随后在第 60 局暴露默认 60 秒 Profile lease 没有续租，修复为 Session 心跳、写前续租和恢复前强制检查。最终 100 局全部通过，heap 增长 `5,148,368 B`，低于 `8 MiB` 门禁。

Web 当前主 chunk 为 `876.95 kB` minified / `228.85 kB` gzip，仍超过项目现有 `650 kB` 非阻断警告线。S8.5.3 Session 尚未进入正式入口；该警告继续留给 Stage 9 拆包、启动与目标设备内存实测，不在本批伪装为已解决。

## 尚未证明

- 真实 Web DOM 与小游戏 Canvas 上的页面布局、触摸命中和焦点/读屏语义。
- 正式 Product Renderer、三端 Platform 组合与默认入口切换；当前 Session 要求显式注入 Renderer。
- 首装、旧存档、损坏恢复和容量失败的三端截图/日志证据。
- 微信与抖音开发者工具以及目标真机的视觉、内存和长稳表现。

完整架构理由见 [ADR-018](../decisions/018-arena-product-presentation-contracts.md)。
