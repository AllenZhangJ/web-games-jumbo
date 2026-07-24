# Arena Stage 8 S8.5.6 产品设备证据合同结果

## 结论

S8.5.6 的本机“证据准备层”已经建立：Stage 8 产品验收 Definition、六目标 OS 约束、三端构建 Manifest、目录重算 verifier 与支持多 Definition 的证据 CLI 已可执行。抖音开发者工具当前已完成 dirty 构建预验收，但仍没有任何可计入合同的 clean-build 开发者工具或真机 Record，因此 S8.5.6 和 Stage 8 保持未完成。

## 本批落地

- `arena.stage8.product-device-acceptance.v1` 固定 14 个检查与 6 个目标。
- 开发者工具验证 Product 正常闭环与损坏槽、写失败、未来 schema。
- 微信/抖音 iOS、Android 真机分别验证正常闭环、context recovery、性能和十分钟长稳。
- target 可声明 `requiredOsNames`；未声明的 Stage 6 JSON/hash 保持兼容。
- Build Manifest 记录 commit/build/dirty/default entry 和全部产物 SHA-256。
- `arena:build:verify` 会重枚举三端目录并检查别名、篡改、增删和身份漂移。
- 设备 CLI 只允许 Build Manifest 跨同平台 run 复用；普通附件仍禁止路径、文件或内容复用。

## 本机门禁

- 定向合同测试覆盖：Stage 6 兼容、Stage 8 六目标、OS 错配、Manifest 默认入口、目录篡改、dirty 拒绝、共享 Manifest 与六目标 ready Report。
- Product 与 Greybox 构建模式都生成并通过 Manifest verifier；当前开发工作区构建被正确标记为 `sourceDirty=true`，不能进入正式设备证据。
- `npm run arena:product:device:evidence -- --describe` 当前 Definition hash 为 `4c9e33e8`；执行时仍应从命令读取，不在 Record 中凭文档手抄。

## 外部环境审计

- 2026-07-20 本机抖音开发者工具 `4.5.3` 已处于登录状态，并成功导入、编译和运行 `arena-e972bf830595-product-dirty`。iPhone 15 Pro/iOS 15 模拟器内 Product 主页、正式 GLTF 角色与手持装备、屏外地图、移动/攻击/跳跃、强制刷新和重新入局均通过预检，Console 未见项目错误。由于 `sourceDirty=true` 且没有合同附件 Bundle，该结果不生成通过 Record。
- 本机只检测到普通微信客户端，没有微信开发者工具。
- 未连接可用于微信/抖音验收的 iOS、Android 目标设备。

以上是外部执行条件，不是代码失败，也不能通过虚构附件绕过。完整操作见 [Stage 8 设备验收手册](../acceptance/stage8/README.md)，设计原因见 [ADR-021](../decisions/021-arena-stage8-device-evidence-and-build-manifest.md)。
