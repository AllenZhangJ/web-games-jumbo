# Arena V1 Composition

Arena V1 的 strict TypeScript 应用组合根。它把具体权威内容注入 Movement、Rule、Map、MatchCore、Quick Match 和 Product 组合，但不拥有宿主、表现、帧循环或运行时全局状态。

本包只能沿已治理的公开包依赖向下组合。新增角色、装备、地图、动作或数值应进入对应 Definition/Content 包，而不是在本包复制第二份规则数据。
