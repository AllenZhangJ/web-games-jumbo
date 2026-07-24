# Arena Stage 9 S9.5 真人公平性验收手册

## 当前状态

S9.5a 已具备版本化 Definition、隐藏 block 分组、生产 seed、Product 完成端口、内存 Capture Session、Record/Bundle/Report 和逐 Tick Replay/Bot 复验 CLI。S9.5b 已新增独立 `study.html` 工作台、双槽 Workspace、协作租约、运行中恢复作废、单参与者原始包、离线原子入库和 clean Web build 强绑定。尚未采集真实参与者，因此当前只能称“采集与复验工程基础完成”，不能称 S9.5 公平性通过。

完整决策依据见 [ADR-025](../../decisions/025-arena-stage9-preregistered-human-fairness-study.md)，本机门禁记录见 [S9.5b 工作台与离线入库](../../research/arena-stage9-s9.5b-human-study-workbench.md)。

## 冻结前提

1. 使用最终 clean commit/build；Balance Definition、Bot Profiles 或 Replay schema 变化后必须新建 Study 版本。
2. 使用 Web 手机竖屏触控环境。
3. 连续入组，不跳号、不替换参与者、不删除退出或失效记录。
4. 每个 arm 至少 30 名合格完成者；最低总计 90 名完成者、270 局，实际招募应预留退出和失效。
5. 使用去标识 `participantId`；参与者真实身份与联系方式不得进入仓库证据。
6. 先完成知情同意与资格核对，再生成 assignment。
7. 使用 `npm run arena:build:verify -- --require-clean-source` 通过的 Web 构建；工作台和最终 CLI 都必须绑定同一个 `arena-build-manifest.json`。

查看不可修改的 V1：

```bash
npm run arena:human-fairness:evidence -- --describe
```

## 单名参与者流程

1. 从最终 clean Web 构建打开 `/study.html`。dirty build、桌面/鼠标、横屏或非手机环境只允许查看工作台，正式入组按钮会被禁用。
2. 按实际入组顺序分配从 0 开始的 `enrollmentIndex`，同一人不得重复参加；工作台只生成随机去标识 ID。
3. 资格字段在开始前固定：同意、既往 Arena 经验、既往研究暴露、提示偏离、操作员协助。
4. 只向参与者展示 Definition 中的提示：

   > 完成三局 1v1 对局，尽可能利用装备和地图将对手击出平台。

5. 不展示或口头透露 arm、easy/normal/hard、seed、机器人身份；也不得宣称对手是真人。
6. 工作台把 `HumanMatchStudyCaptureSession.getPresentationPorts()` 注入正常 Product Presentation Session。不得另建简化比赛或难度覆盖。
7. 连续完成三局。缺失 Replay、运行失败、恢复了半局状态或协议偏离时，停止本次 Trial 并记录 `invalidated`；参与者主动停止记录 `abandoned`。
8. 三局结束后一次性记录：对手类型猜测（human/bot/unsure）、公平性 1～5、自然度 1～5、是否愿意再来一局。
9. 点击“生成并下载原始采集包”，在系统下载目录核对文件名和 SHA-256 后再点击确认。若文件没有落盘，必须选择“文件未保存”，当前 assignment 将生成零局 `running-recovered` 作废包。

采集端口为同步端口，禁止在 Product `step()` 内直接执行网络或异步文件 I/O。Workspace 只持久化小型生命周期检查点与导出回执；完整 Replay 仅在当次内存 Capture 中存在。刷新或崩溃后不恢复半局，也不声称保留了已丢失 Replay，而是自动进入可审计作废流程。

## Record 规则

- `completed`：必须正好包含三局和终局自评。
- `abandoned`：可包含已完成的连续前缀，对应原因只能是 participant-abandoned。
- `invalidated`：用于 runtime-failed、protocol-deviation 或 running-recovered。
- 所有 Match 必须从 index 0 连续；result seed、生产对手、隐藏难度和 Replay schema 必须与 assignment 一致。
- 同一 Bundle 内 record、participant、assignment、enrollment、match seed、artifact ID/path 均唯一。
- Bundle 只能包含同一 commit/build，`createdAt` 不得早于任一 Record。

把所有单参与者原始包放在仓库外的受控目录，再执行一次禁止覆盖的离线入库：

```bash
npm run arena:human-fairness:ingest -- \
  --package /secure/captures/human-study-package-aaaa1111.json \
  --package /secure/captures/human-study-package-bbbb2222.json \
  --workspace /secure/captures/human-study-workspace-r360.json \
  --build-root dist/web \
  --output /secure/evidence/<build-id>
```

`--output` 必须不存在。CLI 先复验 clean Web build、所有包的 commit/build、连续 enrollment、每局 Replay 与逐 Tick Bot 输入，再以一个 `evidence/` 子目录原子发布；失败不留下可误认成完成证据的 Bundle。

生成目录：

```text
/secure/evidence/<build-id>/
└── evidence/
    ├── human-fairness-evidence.json
    ├── capture-package-manifest.json
    ├── workspace-audit.json
    ├── raw-capture-packages/
    └── replays/
        ├── enrollment-0000/
        │   ├── match-00.json
        │   ├── match-01.json
        │   └── match-02.json
        └── ...
```

不要把姓名、手机号、录音、聊天或设备唯一标识放进原始包或证据目录。若研究管理确需保存身份映射，应由项目方在仓库外按适用隐私规则独立管理。

## 机器复验

```bash
npm run arena:human-fairness:evidence -- \
  --bundle /secure/evidence/<build-id>/evidence/human-fairness-evidence.json \
  --artifacts-root /secure/evidence/<build-id>/evidence \
  --build-root dist/web
```

CLI 会先重算 clean Web 构建 Manifest，再校验附件边界和 SHA-256，严格重放权威逻辑，并逐 Tick 重生隐藏 Bot 输入。退出码：

- `0`：三个 arm 样本齐备且全部预注册门通过，Report 为 `ready`。
- `2`：样本不足或真实指标失败，Report 为 `incomplete`/`failed`。
- `1`：合同、身份、路径、附件、Replay 或 I/O 无效。

只有退出码 0、真实参与者记录、六目标 S9.4 设备证据同时齐备，才可进入 S9.5 冻结评审。任何自动化或内部演练数据都必须与正式 Bundle 隔离。

进入 S9.6 候选时，`stage9.human-fairness` Evidence Statement 精确登记三个顶层索引：`human-fairness-evidence.json`、同目录的 `capture-package-manifest.json`，以及所绑定 clean Web 构建的 `arena-build-manifest.json`。Readiness producer 会从这些索引递归读回 Workspace、原始包、Replay 和构建产物；无需也不能用截断材料清单替代。样本不足的合法 Bundle 会稳定产生 `incomplete`，不会因为候选声明而升级。
