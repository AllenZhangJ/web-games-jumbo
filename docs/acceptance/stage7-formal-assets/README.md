# Stage 7 正式资产入库手册

## 当前结论

当前只完成来源中立的 Intake 合同和文件复验器，没有任何正式 GLB、授权证明或资产预算进入项目。程序化 Q 版人物、发条机器人以及 Web 产品概念图都不是 `stage7.formal-assets` 的通过材料。

Intake 通过的含义严格限定为：声明的 Presentation Asset Definition、内容字节、来源 revision、许可文本、授权证明和批准记录可以重新建立同一身份。它不代表 S7.2～S7.5 或 Stage 9 RC Gate 已通过。

## 项目方先决输入

开始首个纵切前需确认：

- 首个角色沿用既定“Q 版跑酷学徒、低多边形玩具、手稿轮廓”方向，并完成最终造型签字。
- 选择原创、委托、购买或开源来源，并给出可接受的制作/采购成本。
- 明确授权主体，确认商业使用、修改、随 Web/微信/抖音最终构建分发的权利。
- 提供可留存的许可证文本，以及合同、发票、订单或权利声明等证明。

真实新手输入盲测与 Mapper 冻结仍阻塞正式动作生产；可以先完成资产来源和合同谈判，但不能提前把未冻结的动作语义批量烘焙进正式动画。

## Bundle 结构

每个 Bundle 使用固定 V1 Policy，包含：

- `assets`：待入库的 `PresentationAssetDefinition`；必须带 `formal` tag，不能带 `greybox`，也不能使用程序化角色 Provider。
- `records`：与 assets 一一对应的 provenance record。
- 每条 record 的 `contentArtifact`：实际 GLB/纹理/附件文件路径、大小和 SHA-256。
- `license.textArtifact`：许可或权利授予文本。
- `proofArtifact`：合同、订单、发票、作者声明或开源来源快照等证明。
- `sourceLocator/sourceRevision`：可定位且固定的来源身份。
- `approvedBy/approvedAt`：项目内批准记录。

许可或证明可以被多个资产复用，但同一路径必须拥有相同大小和摘要。内容文件路径不能被多个 asset ID 复用。敏感证明建议保存在受控证据根目录，不提交 Git。

## 复验命令

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

1. S7.2：一个正式角色、一个骨架、最小冻结动作集与 GLB 离线校验。
2. S7.3：第二角色骨架和外观插槽。
3. S7.4：战斗、地图、音频、镜头、reduced-motion 与质量降级。
4. S7.5：三端最终包、目标真机小屏可读性、前后台/上下文恢复、内存与加载数据。
5. 基于首个真实纵切的实测值制定 Asset Budget Policy，再接入 `arena:assets:evidence` release producer。

因此当前仍不能生成 `stage7.formal-assets = ready`。
