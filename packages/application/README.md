# @number-strategy/application

Application 负责 Session、Command、Clock、Lifecycle、Event、Snapshot、内容菜单和持久化编排。SaveScheduler 将动作存档移出松手到首个起跳帧的关键路径；画质作为独立本地设置经 Renderer Port 预览/应用，不进入玩法真相或 Replay。

固定步长会话、命令和生命周期编排、兼容内容选择、事件收集与快照工厂。Renderer、Input、Clock、Lifecycle、Feedback 和 Storage 均从组合根注入；内容菜单只编排 ID，不依赖 Three.js 或角色定义实现。
