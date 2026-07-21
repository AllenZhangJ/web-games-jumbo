# KayKit Adventurers 首批正式角色资产记录

- 来源：<https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0>
- 固定 revision：`672074b73ba276876a19e8816ecdc5241817ab47`
- 许可：CC0-1.0
- 用途：跑酷学徒骨骼角色和圆盾模型

## 内容摘要

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `parkour-apprentice-rogue.glb`（项目优化产物） | `922332` | `3ee71059eef32d9a6259c5cfd4121f31dffda0a9667509b5f24129fb2c7a1cab` |
| `rogue_texture.png` | `16670` | `a4032e877c3b91939f5cdbb630349c1998fdbc3211bbd587c111125500fe4cc5` |
| `shield-round.glb`（项目转换产物） | `13084` | `a61bcd83ccac9bc8596bf09894867ca491487d7a4b0662bb64dca2d1b19e790d` |
| `shield_texture.png` | `14172` | `5d250ccc5da020e6126bfa3839f83bd9a465a951ed223e4d13c08b1925e154d4` |
| `kaykit-adventurers-CC0-LICENSE.txt` | `891` | `ae322141814056dda0deea7540d74c41d87aee1da319977cd1bd84ee5a923629` |

上游 Rogue GLB 原始 SHA-256 为 `e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d`。项目通过 `npm run arena:assets:optimize-characters` 仅保留 18 条运行时动作并清理未引用数据；模型、骨架、材质和手部挂点语义保持不变。PNG 从 GLB 内嵌 image 数据无损拆出，以便 Web、微信和抖音统一使用宿主图片解码器，不依赖浏览器 Blob/URL/Image API。

上游圆盾由 `shield_round_color.gltf`、二进制和纹理组成；项目使用 glTF-Transform 转为 GLB，并把 PNG 作为同目录、受哈希固定的发行资产。GLB 由文件系统端口读取，PNG 由宿主 `createImage()` 解码。上游 GLTF SHA-256 为 `fe705e62a3edaae07928ce90f9b305593f868e9c40bd23e73b550e14438108bd`。

模型、附件、纹理已进入三端运行时，并通过 `arena.stage7.formal-asset-budget.v1` 和 4 MiB 构建预算。进入正式资产冻结前仍需项目方 Formal Asset Intake 批准、clean-build 最终包和目标真机可读性/峰值内存记录。本记录固定公开来源和当前字节身份，不替代批准记录。
