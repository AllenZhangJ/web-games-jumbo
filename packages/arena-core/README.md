# Arena Core

Arena 权威 Rule/Core 的 strict TypeScript 实现。当前承载动作状态、候选裁决、执行唯一写入者、通用 targeting/effect/command 策略注册表及 ArenaRuleEngine。具体 Equipment 与 Movement 实现由组合层通过受校验端口注入，核心包不反向依赖具体子系统。该包只能依赖 Definition 与底层数据合同，不得依赖 Bot、Product、Presentation、Three.js、DOM、平台 API 或墙钟时间。
