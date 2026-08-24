# KayKit Adventurers 首批正式角色资产记录

- 来源：<https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0>
- 固定 revision：`672074b73ba276876a19e8816ecdc5241817ab47`
- 许可：CC0-1.0
- 用途：跑酷学徒骨骼角色和圆盾模型

2026-08-11 的 Arena V2 P5 连续开发批次继续从同一已批准、同一固定 revision 的
`Assets/gltf` 目录导入 19 份武器附件候选。转换仅把上游 `.gltf + .bin + PNG`
打包成自包含 GLB，不改网格、材质或权威武器规则；映射仍标记为
`silhouette-candidate-not-device-approved`，不代表武器美术、手持方向或三端验收通过。

## 内容摘要

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `parkour-apprentice-rogue.glb`（项目优化产物） | `922332` | `3ee71059eef32d9a6259c5cfd4121f31dffda0a9667509b5f24129fb2c7a1cab` |
| `rogue_texture.png` | `16670` | `a4032e877c3b91939f5cdbb630349c1998fdbc3211bbd587c111125500fe4cc5` |
| `shield-round.glb`（项目转换产物） | `13084` | `a61bcd83ccac9bc8596bf09894867ca491487d7a4b0662bb64dca2d1b19e790d` |
| `shield_texture.png` | `14172` | `5d250ccc5da020e6126bfa3839f83bd9a465a951ed223e4d13c08b1925e154d4` |
| `kaykit-adventurers-CC0-LICENSE.txt` | `891` | `ae322141814056dda0deea7540d74c41d87aee1da319977cd1bd84ee5a923629` |

## Arena V2 武器附件候选

| Arena 武器 | 上游静态道具 | GLB 字节 | SHA-256 |
| --- | --- | ---: | --- |
| `heavy-hammer` | `axe_2handed` | 38440 | `cecfb0cd3c89f11d80c2947f6e5c6bdd36721917d83968d29ba77f7e12fc74e4` |
| `gravity-chain` | `crossbow_1handed` | 43256 | `ab5de123ed622c1df24fa559f7b73354183885ea6783e16c6ad6511e13915d68` |
| `line-suppressor` | `staff` | 36260 | `ed6a9a096c421501ae0d41beb688ac9b58ee76a2de8444583a0f3fe1d755b9f8` |
| `read-counter` | `spellbook_open` | 32820 | `4180675597116ea56334dc835fbe047340e09c3b0d47fa59d97d9905f7204448` |
| `flank-blade` | `dagger` | 25704 | `994e1a03eb7e6e088961683cd757c4c58df6bd5bad7a987136f635818999a66e` |
| `hook-spear` | `sword_2handed` | 35472 | `9b195e8028942ce08b62f3af65fda667d37f9e4f89fd154c9fde5ca9154da276` |
| `burst-gauntlet` | `shield_badge_color` | 26060 | `9a27a73cf24224a811abda9a788deb75f7d9176afdb5ace348f76aed8144d392` |
| `vault-lance` | `sword_2handed_color` | 35444 | `c1b17c71a43bd48ecede3589da9c2018f5fff35018b732341c35923684450670` |
| `scatter-cannon` | `crossbow_2handed` | 52948 | `5768c5a2b954d2f6195e24f5953ef0ef08d2bdf0b86e8c9218eb971148216bd7` |
| `sky-anchor` | `shield_spikes` | 37024 | `e4d210517937f6ee74d1b047da2bba45c6e69605e80ad2348531c2323b83fd5a` |
| `edge-scythe` | `axe_1handed` | 29004 | `4f57ce0baef0176e576ae04231ba3fc8e1f8be772f2b14f8792c051d4151e72a` |
| `rebound-hook` | `arrow_bundle` | 33400 | `58a99c5c49e74f13c2e6b59443d62d5cf89e3bf51337df118a3afd73d9013339` |
| `pulse-baton` | `wand` | 23644 | `f2faa495e45e34b2db60542e4c8520c61310e883475f0b7ab9cbcc1068abbd85` |
| `siege-axe` | `shield_spikes_color` | 37032 | `c10657ac0ead435f34df2779daa0748f79a188715cf53dd4c9ea6a254842fae2` |
| `twin-fan` | `shield_badge` | 26184 | `a03fd7105cd434c3d4783bec29efdcdc1992645b7de34fb2627774771fab875e` |
| `diving-claw` | `arrow` | 20692 | `2f10e01ced917bd7da0c37e6345d7993511e9bdb7d5c578e1161fb457cafee9a` |
| `route-bow` | `quiver` | 31936 | `148de5df220be81b33b76b72b3603881c0589b6fa3d1d2f63f97b893c3217617` |
| `pivot-blade` | `sword_1handed` | 28816 | `71d9422b28b2296ed85262a2d139338005a13d3fcb9aa1621b2955727f6c3194` |
| `commitment-fist` | `mug_full` | 32252 | `d7435ad682548dfbb40b8385501a8dfecb406b233d9b434903b32f409fac5562` |

可复现导入入口为 `scripts/arena-import-kaykit-weapon-attachments.ts`。本批只执行导入和
哈希记录，没有运行模型检查、构建、浏览器、设备、性能或人工轮廓验收。

上游 Rogue GLB 原始 SHA-256 为 `e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d`。项目通过 `npm run arena:assets:optimize-characters` 仅保留 18 条运行时动作并清理未引用数据；模型、骨架、材质和手部挂点语义保持不变。PNG 从 GLB 内嵌 image 数据无损拆出，以便 Web、微信和抖音统一使用宿主图片解码器，不依赖浏览器 Blob/URL/Image API。

上游圆盾由 `shield_round_color.gltf`、二进制和纹理组成；项目使用 glTF-Transform 转为 GLB，并把 PNG 作为同目录、受哈希固定的发行资产。GLB 由文件系统端口读取，PNG 由宿主 `createImage()` 解码。上游 GLTF SHA-256 为 `fe705e62a3edaae07928ce90f9b305593f868e9c40bd23e73b550e14438108bd`。

模型、附件、纹理已进入三端运行时，并通过 `arena.stage7.formal-asset-budget.v1` 和 4 MiB 构建预算。2026-07-23，Allen 已完成 Formal Asset Intake 批准；当前仍需候选 clean build 和目标真机可读性/峰值内存记录。本记录固定公开来源和当前字节身份，批准真值位于正式 Bundle 与项目来源批准记录。
