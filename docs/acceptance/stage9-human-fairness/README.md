# Arena Stage 9 S9.5 真人公平性验收手册

## 当前状态

S9.5a 已具备版本化 Definition、隐藏 block 分组、生产 seed、Product 完成端口、内存 Capture Session、Record/Bundle/Report 和逐 Tick Replay/Bot 复验 CLI。尚未提供面向操作员的独立可恢复采集工作台，也尚未采集真实参与者；因此当前只能称“工程证据基础完成”，不能称 S9.5 公平性通过。

完整决策依据见 [ADR-025](../../decisions/025-arena-stage9-preregistered-human-fairness-study.md)。

## 冻结前提

1. 使用最终 clean commit/build；Balance Definition、Bot Profiles 或 Replay schema 变化后必须新建 Study 版本。
2. 使用 Web 手机竖屏触控环境。
3. 连续入组，不跳号、不替换参与者、不删除退出或失效记录。
4. 每个 arm 至少 30 名合格完成者；最低总计 90 名完成者、270 局，实际招募应预留退出和失效。
5. 使用去标识 `participantId`；参与者真实身份与联系方式不得进入仓库证据。
6. 先完成知情同意与资格核对，再生成 assignment。

查看不可修改的 V1：

```bash
npm run arena:human-fairness:evidence -- --describe
```

## 单名参与者流程

1. 按实际入组顺序分配从 0 开始的 `enrollmentIndex`，同一人不得重复参加。
2. 资格字段在开始前固定：同意、既往 Arena 经验、既往研究暴露、提示偏离、操作员协助。
3. 只向参与者展示 Definition 中的提示：

   > 完成三局 1v1 对局，尽可能利用装备和地图将对手击出平台。

4. 不展示或口头透露 arm、easy/normal/hard、seed、机器人身份；也不得宣称对手是真人。
5. 使用 `HumanMatchStudyCaptureSession.getPresentationPorts()` 返回的 `seedSource` 与 `matchCompletionSink` 注入正常 Product Presentation Session。不得另建简化比赛或难度覆盖。
6. 连续完成三局。缺失 Replay、运行失败、恢复了半局状态或协议偏离时，停止本次 Trial 并记录 `invalidated`；参与者主动停止记录 `abandoned`。
7. 三局结束后一次性记录：对手类型猜测（human/bot/unsure）、公平性 1～5、自然度 1～5、是否愿意再来一局。
8. 导出 Operator Capture，将每局 Replay 保存为独立 JSON，再形成包含 SHA-256 和 byte length 的终态 Record。原始 Capture 不等于可提交证据。

采集端口为同步端口，禁止在 Product `step()` 内直接执行网络或异步文件 I/O。当前独立持久化工作台未完成前，不应开展正式大样本；临时 harness 只允许做内部流程演练。

## Record 规则

- `completed`：必须正好包含三局和终局自评。
- `abandoned`：可包含已完成的连续前缀，对应原因只能是 participant-abandoned。
- `invalidated`：用于 runtime-failed、protocol-deviation 或 running-recovered。
- 所有 Match 必须从 index 0 连续；result seed、生产对手、隐藏难度和 Replay schema 必须与 assignment 一致。
- 同一 Bundle 内 record、participant、assignment、enrollment、match seed、artifact ID/path 均唯一。
- Bundle 只能包含同一 commit/build，`createdAt` 不得早于任一 Record。

建议目录：

```text
docs/acceptance/stage9-human-fairness/<build-id>/
├── human-fairness-evidence.json
└── participants/
    ├── participant-000/
    │   ├── match-0.json
    │   ├── match-1.json
    │   └── match-2.json
    └── ...
```

不要把姓名、手机号、录音、聊天或设备唯一标识放进此目录。若研究管理确需保存身份映射，应由项目方在仓库外按适用隐私规则独立管理。

## 机器复验

```bash
npm run arena:human-fairness:evidence -- \
  --bundle docs/acceptance/stage9-human-fairness/<build-id>/human-fairness-evidence.json \
  --artifacts-root docs/acceptance/stage9-human-fairness/<build-id>
```

CLI 会校验附件边界和 SHA-256，严格重放权威逻辑，并逐 Tick 重生隐藏 Bot 输入。退出码：

- `0`：三个 arm 样本齐备且全部预注册门通过，Report 为 `ready`。
- `2`：样本不足或真实指标失败，Report 为 `incomplete`/`failed`。
- `1`：合同、身份、路径、附件、Replay 或 I/O 无效。

只有退出码 0、真实参与者记录、六目标 S9.4 设备证据同时齐备，才可进入 S9.5 冻结评审。任何自动化或内部演练数据都必须与正式 Bundle 隔离。
