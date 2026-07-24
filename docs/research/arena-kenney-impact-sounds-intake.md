# Kenney Impact Sounds 命中音效入库记录

- 来源：<https://www.kenney.nl/assets/impact-sounds>
- 上游版本：`1.0`
- 上游 ZIP SHA-256：`029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8`
- 许可：CC0-1.0
- 用途：基础推击、重锤、锁链和盾撞的事件驱动命中音效

## 选择文件

| 项目文件 | 上游文件 | SHA-256 |
| --- | --- | --- |
| `base-push.ogg` | `impactPunch_medium_000.ogg` | `486988aa2d6440ffc4c62a0e8ccf3c23673ba84424bd4723378d451b7255eb5c` |
| `hammer-smash.ogg` | `impactMetal_heavy_000.ogg` | `e07045693e4a2b3d165c424e3dab4c781d9ff8880a386880ac89a51315d7f831` |
| `chain-pull.ogg` | `impactMetal_light_000.ogg` | `33b5e6e37c6e9d54e07bf5a89b12c76e879f40c1ea83cdd82714df1d6f9fec6d` |
| `shield-charge.ogg` | `impactPlate_heavy_000.ogg` | `112d4f93ddcc370b410630f971c0f5d991856102da9c76bc5c5540d388e75aaa` |

运行时使用固定两声道小池播放，只消费已去重的 `HitResolved` 表现事件。声音开关来自只读 Product Profile；音效失败不会进入权威逻辑，也不会中断渲染循环。

四个 OGG 当前合计 `32593` bytes，并已通过 `arena.stage7.formal-asset-budget.v1`。许可文本 `kenney-impact-sounds-CC0-LICENSE.txt` 为 `448` bytes，SHA-256 为 `d66be41e71d4f284733729d7edb2cbbb65811b8b9603c8640b0ca0f687ba0c7c`。2026-07-23，Allen 已完成来源批准；目标真机音频验收仍需单独完成。
