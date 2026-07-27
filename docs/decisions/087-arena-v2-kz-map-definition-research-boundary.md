# ADR-087：CS1.6 KZ 路线先接入研究 MapDefinition，再进入生产地图

- 状态：accepted
- 日期：2026-07-28
- 范围：Arena V2 CS1.6 KZ 风格竞速基座、六段路线、竞速/生存复用和地图 Definition 适配

## 背景

六段路线合同和轻量物理灰盒已经可以验证可达性，但此前几何仍由实验代码直接提供，尚未通过项目的权威 `MapDefinition` 合同。若竞速和生存各自维护一份表面，后续武器、复活和视野验证会产生两个不一致的地图事实。

## 决策

1. 用研究工具链 `arena-v2-kz-map-definition-prototype.ts` 把六段路线的静态 surface、四个起点和六个段落装备锚点编译为一个 `MapDefinition`。
2. 竞速模式读取同一份几何和 `finishAnchor`；生存模式读取同一份几何、段落和恢复锚点，但不启用终点。两种模式不得复制第二套地图表面。
3. 地图板块在本研究基座中不可塌陷，地图事件保持为空；攻击、击落、恢复和敌人刷新由各自的 Rule/Core/Mode 合同验证，不偷偷写入静态地图几何。
4. 段落教学、回应窗口、命中后恢复和复活锚点属于研究包装层，不伪装成当前 `MapDefinition` 已支持的任意新字段。
5. 该 Definition 保持 `research-only`，未进入默认 `MapRegistry`；只有完成多人移动攻击、3 秒复活、摄像机、设备和真人路线理解验证，才评估生产地图迁移。

## 被拒绝的替代方案

### 继续让竞速和生存各自直接读取灰盒 surface

拒绝原因：会产生两份地图事实，后续同图复用无法证明一致，也无法让地图注册、Replay 和存档使用稳定地图 ID。

### 把攻击、敌人刷新和板块塌陷直接写进 KZ MapDefinition

拒绝原因：这会把模式规则和地图静态几何耦合，违反 Rule → Core → Bot → Presentation 的边界，也与“竞速地图板块不会掉落”的已确认约束冲突。

### 把外部 CS1.6 地图文件直接作为生产资产

拒绝原因：当前只借鉴路线语言和学习结构，尚未完成授权、资产审计和 Arena 规则迁移。

## 后果

- KZ 研究已经具备可注册、可哈希、可供 MatchCore 使用的静态地图合同，但仍不会改变默认生产入口。
- 竞速和生存可以在同一份几何上继续验证终点开关、敌人压力、武器路线差异和复活关系。
- 4 个起点满足 2–4 人首批配置的静态数量要求；真实多人争抢和摄像机可读性仍需独立测试。

## 验证入口

- `packages/arena-v1-experiment/src/arena-v2-kz-map-definition-prototype.ts`
- `packages/arena-v1-experiment/test/arena-v2-kz-map-definition-prototype.test.ts`
- [CS1.6 KZ 跳跃地图研究 V1](../research/arena-v2-cs16-kz-map-study-v1.md)
- [ADR-063：KZ 地图段落必须声明回应窗口与恢复关系](063-arena-v2-kz-route-response-contract.md)
- [ADR-054：KZ 段落攻击探针复用地图与武器规则](054-arena-v2-kz-route-combat-probe-boundary.md)
