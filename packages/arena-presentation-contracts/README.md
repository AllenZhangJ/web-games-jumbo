# Arena Presentation Contracts

Arena 表现层的宿主无关合同包。它只定义不可变资产/角色表现数据、只读注册表，以及确定性的动画语义解析；不依赖 Three.js、DOM、平台 API、墙钟或 MatchCore。

渲染器、UI 与音频只能消费这里的只读 Definition、快照和事件。该包不参与命中、位移、胜负、随机或任何权威状态写入。
