# ADR-065：生产武器必须显式映射到最小战斗语言

- 状态：已接受，已接入开发/测试工具链审计
- 日期：2026-07-27
- 范围：当前 `STAGE4_EQUIPMENT_DEFINITIONS` 与 V2 武器研究合同之间的映射

## 背景

研究语言目录最初从 12 件参考武器抽取出 7 种语言，但当前生产武器已经有三种明确语义：重锤“推离”、引力锁链“换位”、冲锋盾“冲入”。其中“推离”没有显式的研究语言 ID，意味着生产武器可能只靠 `category: knockback` 或 UI 文案解释，规则、研究和数值展示之间会重新分叉。

## 决策

1. 增加生产基线语言 `push-away`，其最小版本是短距离重击、中高横向击退、垂直控制和明显前摇/收招。
2. 当前生产武器固定映射为：

   | Equipment | 最小语言 | 地面动作 | 空中动作 |
   |---|---|---|---|
   | `hammer` | `push-away / 推离` | `hammer-smash` | `hammer-air-smash` |
   | `chain` | `reposition / 换位` | `chain-pull` | `chain-air-lash` |
   | `shield` | `approach / 冲入` | `shield-charge` | `shield-air-drop` |

3. 映射必须从真实 `STAGE4_EQUIPMENT_DEFINITIONS` 读取动作身份，并通过公开轴报告确认 `ready`；不允许通过装备分类或展示层字符串隐式推断。
4. `push-away` 是 Arena 生产基线语言，不伪造为某一件外部参考武器的完整复刻；参考武器仍保持原有 7 类研究映射。
5. 本 ADR 只建立审计和语义映射，不新增生产武器、不改变现有动作数值、不把 V2 研究合同直接接入生产入口。

## 被考虑的替代方案

### 把重锤归入延迟重击

- 优点：可以复用已有名称。
- 放弃原因：当前重锤没有公开预警和延迟落点，把它归入延迟重击会误导玩家，也会绕过 `delay/warning` 阻塞门禁。

### 继续使用 `category: knockback`

- 优点：不增加研究字段。
- 放弃原因：分类只能说明实现类型，不能说明玩家要学习的时机、地图价值和失败成本。

## 后果

正面影响：

- 当前三把生产武器都能在研究合同中找到明确的核心语法；
- 重锤不再是研究语言目录中的隐形例外；
- 首发候选可以按语言和地面/空中动作评审，而不是按名称或外观评审。

限制：

- `push-away` 目前只有生产基线合同，没有独立的外部参考卡；
- 这不是六把首发武器的最终名单，也不代表正式 V2 迁移完成；
- 仍需完成六把候选的权威 Definition、回放、地图后果和真人体验评审。

## 验证证据

- 实现：`packages/arena-v1-experiment/src/arena-v2-weapon-function-language.ts`
- 映射与审计：`packages/arena-v1-experiment/src/arena-v2-weapon-minimum-version-contract.ts`
- 测试：`packages/arena-v1-experiment/test/arena-v2-weapon-minimum-version-contract.test.ts`
- 生产来源：`packages/arena-v1-content/src/stage4-equipment.ts`
- 关联合同：[ADR-064：武器必须先通过最小功能版本合同](064-arena-v2-weapon-minimum-version-contract.md)
