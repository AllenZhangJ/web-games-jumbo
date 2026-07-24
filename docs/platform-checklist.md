# Arena 平台与真机验收清单

## 口径

本清单只验收当前唯一生产产品 Arena。旧数值跳台 v3 已退役，历史截图、dirty build 或旧入口结果不能填充当前候选证据。

结论分为四类：

- 自动化通过：Node/Vitest、Replay、fuzz、stress、soak、构建与预算通过，不代表真机通过。
- 本机浏览器通过：指定视口和本机 Chrome 通过，不代表 iPhone 或小游戏真机通过。
- 目标设备通过：记录必须绑定 clean commit、build ID、平台版本、设备、操作人和原始附件。
- 可发布：只能由 Stage 9 RC 的全部 12 门语义复验得出，单一平台通过不等于可发布。

## 候选前置

- [x] 工作树干净，集成候选为 `b4faa2c8f1af59605a95281948406376cb442ea6`。
- [x] `npm run check` 通过；Allen 已授权向 npm 发送审计元数据，生产闭包与全依赖审计均为 0 vulnerabilities。
- [x] `npm run build` 生成 Web/微信/抖音唯一 Product 交付，不包含 Greybox/Pilot/Study/POC 入口。
- [x] `npm run arena:build:verify -- --require-clean-source`、`npm run arena:build:budget` 和 `npm run check:production-artifacts` 通过。
- [x] 正式资产 `check:formal-assets`、`check:third-party-assets` 与 `arena:assets:budget` 通过。

## Web 合并验收

目标设备：iPhone 13 Pro / iOS 26 / Chrome。Allen 已于 2026-07-24 明确确认完成真机验收。手机实际体验的产品产物与集成前验收基线一致；集成提交重新构建后，除 `arena-build-manifest.json` 中随 Git 身份变化的 commit/buildId 外，Web/微信/抖音交付与该基线逐文件相同。因此验收可绑定到 `b4faa2c8f1af59605a95281948406376cb442ea6` / `arena-b4faa2c8f1af-product`，不是复用 2026-07-20/21 的 dirty build 结论。

- [x] 首屏、首局、结算和重赛无黑屏、不重复创建 Canvas/Session。
- [x] 对手远离时攻击键仍可用，可连续挥空；贴身连续攻击不出现距离门控或非 hit-stop 长帧。
- [x] 走/跑/停、起跳准备/空中/落地、二段跳、抛臂/挥臂/随挥/收臂和正背面受击可辨认。
- [x] 赤手、锤、链、盾的外观、速度、起手/生效/收手/僵直、范围和击退体感可区分。
- [x] 空中攻击是向下加速攻击，命中/落地不重复结算；武器攻击缩放在收招、中断、淘汰和换武器后归一。
- [x] Allen 已确认真机流畅度和温升体验可接受；没有通过降低分辨率、抗锯齿、动作数或关节数换取结果。结构化 FPS/长帧/内存/温度附件仍按 Stage 9 发布证据合同留存，不冒充本次人工合并验收材料。
- [x] 验收体验无阻断性错误；本机 390×844 Chrome 补充检查无未处理 error/warning，资产失败路径另有自动化兜底测试。

## 微信/抖音发布验收

每个平台的 iOS 和 Android 必须分别留证，开发者工具模拟器不替代真机。

- [ ] 微信 iOS：导入、WebGL2、安全区、触控、音频、前后台、上下文恢复、完整对局和 10 分钟性能通过。
- [ ] 微信 Android：同上。
- [ ] 抖音 iOS：同上。
- [ ] 抖音 Android：同上。
- [ ] 六 target 的 Device/Performance Record、附件和 clean Build Manifest 通过对应 CLI 复验。

## 当前已有但不可替代的历史证据

- 2026-07-20，iPhone 13 Pro / iOS 26 / Chrome dirty build 体验评分 `4.3/10`，发现发热、约 `1/10` 卡顿、动作/二段跳僵硬、攻击距离门控和少量穿插。
- 2026-07-21，同设备第二轮评分 `5/10`，确认任意距离攻击已改善，但贴身长帧、手臂起落挥收和动作灵活度仍不足。
- 本机 Chrome `390×844` 产品包已验证远距离挥空、二段跳姿态和无 Console error/warning。这些结果是回归输入，不是最终 G10 手机通过记录。

具体历史与问题追踪见 [Stage 7 正式资产结果](research/arena-stage7-formal-asset-intake-results.md)。
