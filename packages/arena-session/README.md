# @number-strategy-jump/arena-session

Arena 本地比赛的生命周期与所有权编排层。该包在 `MatchCore` 之上持有
`HeadlessMatchRunner`、Bot 输入端口和 Core，只接受公开快照与 InputFrame，
不依赖具体 Bot 实现、产品状态机、表现层、Three.js、DOM 或平台 API。

外部输入和运行参数在权威状态变化前校验；Bot、Runner 或 Core 内部失败会
fail closed 并清理整局。`start`、暂停、逐 tick、批量运行和 `destroy` 的重入
边界均由 Session 统一裁决。
