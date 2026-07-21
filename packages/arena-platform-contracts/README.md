# @number-strategy-jump/arena-platform-contracts

Arena 宿主边界的 strict TypeScript 合同：Canvas 准备、帧调度、WebGL2 能力与平台默认 Port。

本包位于 Presentation/Platform 外围，不得被 Arena 权威 Rule、Core 或 Bot 依赖。Web、微信和抖音的宿主适配保持在 `src/platform`，只通过本包组合能力。
