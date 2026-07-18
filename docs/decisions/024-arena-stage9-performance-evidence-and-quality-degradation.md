# ADR-024：Arena S9.4 使用数据驱动质量降级与可重算性能证据

- 状态：已接受；工程基础已实施，六个真实 target Record 待采集
- 日期：2026-07-18

## 背景

Stage 8 的设备证据能证明产品闭环与构建身份，但“十分钟运行正常”仍是人工判断，不能回答帧时间、Core 追帧、资源增长、内存和包体是否达到统一标准。桌面浏览器、Node 无渲染压力测试和开发者工具也不能替代最终手机宿主。

低档设备需要允许表现降级，但降级不能改变 60 Hz Core、输入语义、随机、命中、淘汰、回放或胜负。若 Renderer 自己判断设备并散落开关，未来无法证明两个质量档只存在表现差异。

## 决策

### 质量是不可变 Definition

Arena V1 注册 `high`、`medium`、`low` 三个版本化 `PresentationQualityDefinition`。Definition 固定目标表现帧率、最大像素比、抗锯齿、阴影、并发特效、拖尾和轮廓，并具有内容 hash。正式 S9.4 主流目标使用 `high`，低档目标使用 `low`；`medium` 保留为可扩展档，不参与当前六目标冻结。

`PresentationRenderPacer` 只能跳过 Renderer 调用。宿主帧循环、固定步长累计器、输入采样和 MatchCore 仍继续运行；同 seed、同输入下 high/low 必须产生相同权威快照和回放 hash。

### 性能采集是有界、只读的观察者

`PresentationPerformanceProbe` 只接收已发生的里程碑、宿主帧、Core step 数、丢弃时间、渲染耗时和资源快照。它不持有 Controller、Flow、Core 或 Renderer，也不能触发状态变化。样本数量有硬上限；超过上限会显式记录丢弃数并使冻结门失败。

Three.js 资源数据来自 `renderer.info`。Web 在浏览器暴露 `performance.memory.usedJSHeapSize` 时读取 JS heap；小游戏真机或外部分析工具通过入口层 `performanceMemoryProvider` 注入进程内存。采集异常只增加 `observerErrorCount`，不会中断对局；但任何观察异常、缺帧或缺少全部内存来源都会使性能报告失败，不能用 0 代替未知值。

### 性能 Policy 与设备 Record 双重绑定

`arena.stage9.performance.v1` 固定 Web、微信、抖音各一台低档 Android 与一台主流 iOS，共六个 target。每条 `ArenaPerformanceRecord` 必须绑定：

- Policy ID/hash、质量 Definition ID/hash；
- 40 位 commit、clean build ID、target、run ID 与 UTC 执行时间；
- 至少十分钟、至少三局、前后台一次、WebGL context 丢失/恢复一次；
- 完整帧样本、资源样本、启动里程碑和内存样本。

机器重新计算启动、帧间隔、长帧、渲染耗时、Core 追帧、丢弃时间、资源峰值/尾部增长、内存峰值和内存尾部增长。资源与内存各至少需要 100 个时间分散的样本，避免一次瞬时读数冒充十分钟稳态；内存后 20% 样本相对前半段峰值的增长不得超过对应预算的 5%。相同 run 的 Device Record 必须把 `performance-budget` 结果写成同一结论，且 Performance Trace 是有 SHA-256/大小约束的独立附件。设备与性能记录在 commit、build、target、run、执行时间、平台或 OS 上任一不一致都拒绝。

Stage 9 新建独立 Device Definition，不改写 Stage 6/8 历史合同。

### 包体使用更严格的项目内预算

`arena.stage9.build-budget.v1` 对 Web、微信和抖音均设置 4 MiB delivery 上限，并进一步限制 JavaScript、最大单文件和文件数量；source dirty 的构建即使数值通过也不能冻结。4 MiB 是当前首屏/小项目的内部工程预算，不宣称等于各平台完整官方上限。

抖音官方文档当前说明：不使用分包时小游戏总体积上限为 20 MB；使用分包时总包上限 20 MB、主包不超过 4 MB、单个分包不超过 20 MB。内部 4 MiB 预算因此更保守，平台规则变化时应新建 Policy 版本，不回写 V1。来源：[抖音开放平台小游戏分包加载](https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/develop/guide/basic-function/subpackages/introduction)。

## 未选择的方案

### 根据实时 FPS 自动修改质量

自动降级可能让同一 run 中配置漂移，且难以区分冷启动抖动与持续性能不足。V1 通过明确 launch token 选择固定 Definition；未来若增加自适应策略，必须单独版本化状态机、滞回阈值和证据。

### 只保存平均 FPS 或人工截图

平均值会掩盖长帧、Core 追帧和资源增长，截图无法绑定完整运行。V1 保存有界原始样本，由 Registry 中的纯 collector 重算 Gate。

### 缺少内存 API 时默认通过

“不可测”不等于“未超标”。目标 run 至少要有 JS heap 或进程内存之一；若宿主不暴露，使用外部工具注入真实采样，否则该 run 不能通过。

### 用桌面浏览器代表手机三端

桌面结果只适合开发期诊断。S9.4 必须由六个手机 target 的最终 clean build Record 关闭。

## 后果

正面：质量差异可审计，采集不拥有生命周期，性能结论可重算，设备证据与最终构建强绑定，Stage 6/8 历史不被改写。

代价：六个 target 均需十分钟连续录制、生命周期/context 恢复和内存工具支持；低档 Android、主流 iOS 的具体机型仍须写入真实 Record。一个物理设备可以执行同系统的多个平台 target，但每个 run 的 Trace 与附件必须独立。Probe 会增加少量观察开销，因此正式报告应保留相同工具链和采样频率。

## 完成条件

1. `npm run arena:build:budget` 对 clean build 返回 `status=passed` 且 `freezeEligible=true`。
2. `npm run arena:performance:evidence` 对同一 clean build 的六个 target 返回 Device/Performance `ready`。
3. high/low 路径权威回放、压力、生命周期和长稳门全部通过。

工程合同和本机测试通过不等于 S9.4 完成；缺少任一真实 target Record 时状态保持“待采集”。
