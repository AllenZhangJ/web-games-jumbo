# Stage 7 正式资产入库手册

## 当前结论

两套 KayKit 正式角色、圆盾、独立 PNG、固定上游 revision、CC0 许可和三端运行时已进入项目；Kenney CC0 命中音效、声音开关、reduced-motion 镜头/震动降级、正式资产专用预算和三端 4 MiB 构建预算也已落地。当前仍缺项目方 `approvedBy/approvedAt`、完整 Formal Asset Intake Bundle、reduced-motion 人工验收和目标真机可读性记录，因此 `stage7.formal-assets` 仍不是 ready。

Intake 通过的含义严格限定为：声明的 Presentation Asset Definition、内容字节、来源 revision、许可文本、授权证明和批准记录可以重新建立同一身份。它不代表 S7.2～S7.5 或 Stage 9 RC Gate 已通过。

## 项目方先决输入

进入 Stage 7 冻结前仍需确认：

- 对当前 KayKit Rogue / Skeleton Warrior 造型与项目自制重锤完成最终视觉签字。
- 确认 CC0 开源来源符合项目成本与发行策略；来源 commit 已固定在研究记录中。
- 明确授权主体，确认商业使用、修改、随 Web/微信/抖音最终构建分发的权利。
- 提供可留存的许可证文本，以及合同、发票、订单或权利声明等证明。

显式攻击/跳跃 Mapper 已进入 Product，动作语义已接到 18 条正式动画；真实新手盲测仍决定最终操作冻结和后续动画精修优先级。

## Bundle 结构

每个 Bundle 使用固定 V1 Policy，包含：

- `assets`：待入库的 `PresentationAssetDefinition`；必须带 `formal` tag，不能带 `greybox`，也不能使用程序化角色 Provider。
- `records`：与 assets 一一对应的 provenance record。
- 每条 record 的 `contentArtifact`：GLB 主文件路径、大小和 SHA-256。
- `dependencyArtifacts`：同一 GLB 运行时依赖的 PNG 等文件；与主文件一起复验，不能只固定模型而遗漏纹理。
- `license.textArtifact`：许可或权利授予文本。
- `proofArtifact`：合同、订单、发票、作者声明或开源来源快照等证明。
- `sourceLocator/sourceRevision`：可定位且固定的来源身份。
- `approvedBy/approvedAt`：项目内批准记录。

许可或证明可以被多个资产复用，但同一路径必须拥有相同大小和摘要。内容文件路径不能被多个 asset ID 复用。敏感证明建议保存在受控证据根目录，不提交 Git。

## 复验命令

复算当前运行时资产的文件格式、模型复杂度、动作数量、纹理解码内存与音频预算：

```bash
npm run arena:assets:budget
```

该命令已接入 `npm run build` 的打包前门禁。它要求两套正式角色各保留 18 条动作，并限制 GLB 节点、关节、primitive、材质、内嵌图片、1024² 纹理、12 MiB 当前解码纹理和四类 OGG。预算通过不替代来源批准和目标真机内存证据。

查看当前合同：

```bash
npm run arena:assets:intake:verify -- --describe
```

复验真实 Bundle：

```bash
npm run arena:assets:intake:verify -- \
  --bundle /absolute/path/formal-asset-intake.json \
  --artifacts-root /absolute/path/formal-asset-evidence
```

成功状态是 `verified-intake-only`。任何未知字段、Definition hash 漂移、缺失记录、权利不足、路径逃逸、文件替换、大小或 SHA-256 不一致都会失败。

## 后续仍需完成

Intake 之后仍按 Stage 7 顺序推进：

1. 补齐两套 KayKit 资产的正式 Bundle、批准人和批准时间，并复验 GLB + PNG + 许可/来源证明。
2. 在目标设备复验链条、盾牌和重锤的持握/起手/收手，以及 reduced-motion 与音频降级。
3. 采集三端最终包、目标真机小屏可读性、前后台/上下文恢复、内存与加载数据。
4. 将已经通过的专用资产预算、构建预算与后续目标设备记录汇总为 `arena:assets:evidence` 可重算材料。

因此当前仍不能生成 `stage7.formal-assets = ready`。
