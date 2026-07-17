# Arena Stage 6 S6.6.4 设备证据合同门禁记录

## 结论

2026-07-18 的 S6.6.4 已建立版本化设备验收 Definition、最终运行 Record、单构建 Bundle、确定性 Report 与 Node CLI。当前 Definition 为 `arena.stage6.device-acceptance.v1`，内容 hash 为 `e43f2eef`，固定覆盖 Web 手机、微信/抖音开发者工具与微信/抖音手机五个 target。

本批只关闭设备证据“如何记录和机器验证”的 E1/E2 基础，不关闭 E3/E4：没有生成占位 Record，没有把本机或自动化结果伪装为目标设备通过，也没有真人新手样本。

## 边界与失败关闭

- Definition/Record/Bundle/Report 位于 `presentation/acceptance`，无 Renderer、Session、平台、DOM、Three.js、Node 文件系统、墙钟读取或随机源依赖。
- Record 必须完整绑定 Definition hash、40 位 commit、build ID、目标环境、全部检查项和被引用的截图/录屏/日志。
- Bundle 拒绝混合 commit/build、重复 record/run、跨运行重复路径、过量记录和早于运行时间的创建时间。
- 同一构建存在任何失败 Record 时保持 `failed`，不能追加一次成功运行将其抵消。
- CLI 流式计算 SHA-256，检查文件句柄前后状态，并拒绝目录逃逸、符号链接替换、大小变化、内容篡改、同路径、同文件或同内容复用。
- Manifest、Record 与附件数量都有显式上限；非法输入在生成 Report 前拒绝，不留下半完成输出。

## 自动化证据

```text
node --test tests/arena/presentation/arena-device-acceptance.test.js tests/architecture.test.js
npm test
npm run arena:poc:build
npm run arena:stress
npm run arena:map:stress
npm run arena:movement:stress
npm run arena:input:fuzz
npm run arena:bot:stress
npm run arena:session:soak
npm run arena:device:evidence -- --describe
npm run build
git diff --check
```

- 定向测试：18/18 通过；覆盖 schema/深冻结、混合构建、失败抵消、不完整退出码、真实临时附件、SHA-256 篡改、内容复用和符号链接逃逸。
- 全量测试：389/389 通过。
- POC、1,000 局 MatchCore、100 局地图、三档共 900 局 Bot 压测均成功退出并通过脚本内确定性、回放、能力顺序和稳定性断言。
- Movement：100 局、99,732 tick、3 份回放、100 个唯一最终 hash。
- Input fuzz：A/B 各 40 局、共 72,000 tick、4 份回放、80 个唯一最终 hash；覆盖 878 次 resize、480 次暂停恢复和 2,820 次有效 cancel。
- Session soak：100 局；9 次暂停恢复、6 次 context 恢复、14 次 resize；最终 frame、生命周期监听器、Canvas 监听器和输入绑定残留均为 0，GC 后堆增长 `2,388,960B < 8,388,608B`。
- 三端构建通过。Web 主 chunk 仍有既有的 `839.81kB > 650kB` 警告，继续留给 Stage 9 包体/拆包实测，不冒充本批已解决。
- `git diff --check` 通过。

## 尚未证明

- 五个 target 尚无真实 Record；E3 状态仍是未执行。
- CLI 证明 Manifest 与附件在校验时一致，不会自动理解录屏内容，仍需复核者审看。
- commit/build 绑定是项目证据合同，不是代码签名或可信时间戳。
- 原始录屏与日志尚未采集，保留期限和存储位置需在采集前确认。
- 真人新手 E4、Mapper 胜者、Gesture 阈值和 Stage 9 设备/性能预算均未冻结。
