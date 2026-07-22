# Arena Presentation Runtime

Arena 的宿主无关表现运行时原语。该包拥有有界事件窗口、质量档位、渲染节拍、固定 tick 累加器和单帧调度生命周期，但不拥有 Match、Renderer、Three.js、DOM 或平台资源。

宿主调度、墙钟和错误观察器必须通过同步端口注入；所有输入在状态变化前验证，迟到帧通过 generation 失效。
