# Arena Presentation Three

Arena 的 Three.js 表现场景资源边界。该包拥有视觉坐标转换、程序化装备、平台/场景装备/角色 View Registry，以及 Three 资源释放生命周期；只消费表现合同和只读帧，不参与权威命中、移动、随机或胜负判定。

Registry 在修改场景前完成整批快照校验，失败后关闭主流程并保留未释放资源的重试句柄。`dispose()` 是可重试的终态清理：成功资源不会重复释放，失败资源不会因 Map 清空而丢失。
