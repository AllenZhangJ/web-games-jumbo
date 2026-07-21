# Arena Product Composition

Strict TypeScript 产品组合根。它在宿主边界之外组装 Profile、内容池、Quick Match、奖励与 Product Session，并把具体 Arena 内容和 Quick Match 工厂作为不可变默认值注入。

本包不拥有 Presentation、DOM、Three.js、平台 API、帧循环或网络遥测；权威比赛仍只由注入的 Core 工厂创建。
