# Arena Stage 8 S8.5.4 Product Renderer 与 Web 宿主结果

## 结论

S8.5.4 已建立可投入后续三端组合的正式 `ProductRenderer`，并用独立 `product.html` 落地 Web 语义 DOM 宿主。产品页面和 Three 比赛渲染共享同一个 `ProductPresentationSession`、Flow、Match 和输入所有权图，没有创建第二局比赛或第二份奖励写入路径。

本批仍不切换 `index.html`、微信或抖音默认入口；它们属于 S8.5.5。

## 模块边界

```text
ProductPresentationSession
  ├── ProductPresentationFlow       # 状态、奖励、结果缓存
  ├── ProductInputRouter            # Canvas UI / gameplay 模式事务切换
  └── ProductRenderer
       ├── ArenaGreyboxRenderer      # 只读 matchFrame
       └── WebProductUiSurface       # 只读 viewModel + DOM intent
```

- `presentation/product` 继续保持无宿主、无 Three、无 DOM。
- `presentation/renderer` 只做 Renderer 组合，不读取平台全局对象。
- DOM、页面资产映射和 pagehide 只存在于 Web entry 侧。
- DOM intent 由 Session 注册和清理，最终进入既有 Dispatcher。

## 视觉与无障碍

使用已接受 `arena-stage8-product-flow-v1.png` 作为规格，保留暖白纸张、低多边形玩具、手稿轮廓、珊瑚红 + 青色与竖屏大按钮。补充三张不含文字/按钮的生成资产：

- `public/assets/arena-product/lobby-duo-v1.webp`
- `public/assets/arena-product/parkour-apprentice-v1.webp`
- `public/assets/arena-product/windup-cube-v1.webp`

真实文本和操作不烘焙进图片。Web 宿主使用 H1、button、radiogroup/radio、live region、键盘 focus ring、reduced motion 和安全区；匹配页不提供尚无协议的取消按钮，也不展示机器人或随机难度。

## 浏览器发现并修复的问题

### 每帧 DOM 重建导致点击节点失效

Flow 会重新投影等值 ViewModel 对象。最初 DOM 层按对象身份跳过渲染，导致角色卡片在 RAF 中不断被替换；截图视觉正常，但真实浏览器点击会等待到节点失效。

修复后 DOM 使用公开 revision、产品状态、输入开关、当前选择、结果和错误组成渲染签名。签名不变时不替换节点；intent pending 时只更新 disabled 状态。角色切换、焦点和读屏语义保持稳定。

### reload 遗留 Profile lease

浏览器硬 reload 不保证应用代码继续运行；只把 `pagehide` 当暂停会让旧页面 lease 等待超时。新增 Web teardown：真实导航/reload 销毁 Session，bfcache `persisted=true` 保持暂停语义，HMR 重绑清除旧监听。

## 生命周期与竞态

| 场景 | 结果 |
| --- | --- |
| DOM 快速连点 | Surface 立即锁住全部动作，Dispatcher 继续提供业务串行 |
| ViewModel 等值重投影 | revision/状态签名不变，不重建节点 |
| DOM cleanup 失败 | Session 保留 binding cleanup，下一次 destroy 精确重试 |
| UI Surface 或 Three 部分销毁失败 | ProductRenderer 只保留失败子句柄 |
| WebGL context loss | Session 暂停输入/权威 tick，恢复成功后 resize 再继续 |
| hide/show | wall-time 累积清空，不补跑后台 tick |
| pagehide 导航/reload | 销毁 Session 并释放 Profile lease |
| pagehide bfcache | 不销毁，由 show 恢复 |
| HMR 重绑 | 先移除旧 teardown listener，不重复拥有 |

## 自动化与构建证据

定向测试覆盖：

- ProductRenderer 子端口、上下文恢复和清理重试。
- Product Session DOM intent 绑定所有权及原有竞态矩阵。
- Web scene model 资产映射和机器人/难度脱敏。
- Web DOM 语义动作、并发锁、缺失宿主失败与幂等销毁。
- pagehide、bfcache 与 HMR teardown。
- 架构依赖方向和 mini-game DOM 隔离。

生产构建新增 `product.html`，生成 Web 产品 chunk；Web、微信、抖音原入口仍正常构建。完整门禁仍按项目约束运行 `npm test`、相关压力、`npm run build` 与 `git diff --check`。

## 下一步

S8.5.5：

1. 把 Web 默认入口切换为 Product Session，同时保留可撤销旧入口。
2. 实现共享 Canvas ProductUiSurface，并分别组合微信、抖音入口。
3. 验证小游戏触控、安全区、前后台、context loss 和可访问替代文本。

S8.5.6 再用最终三端构建完成首装、存档损坏、写失败、前后台、重赛和长稳证据，关闭 Stage 8。
