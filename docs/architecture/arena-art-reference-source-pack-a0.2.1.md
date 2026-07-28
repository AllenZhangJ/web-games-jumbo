# Arena A0.2.1 六类参考板来源与权利包

## 状态与边界

- 小阶段：`A0.2.1`
- 状态：`source-ready`，主协调已签核（2026-07-28）
- 日期：2026-07-28
- Git 基线：`8e3e6eff6724612e83b124aa2ae6574a3967af9e`
- 上游合同：[Arena Art Bible](arena-art-bible.md)、[六类注释参考登记](arena-art-reference-register.md)、[A0–A7 对齐矩阵](arena-art-development-alignment-matrix.md)
- 机器台账：[arena-a0.2.1-source-pack-v1.json](../quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json)
- 离线复核：`node --import tsx scripts/art/check-arena-reference-source-pack.ts`

本包只批准六张参考板的来源输入、权利结论和可复算身份，不是六张板面。本包签核时A0.2.2尚未开始；当前A0.2.2已于2026-07-28另行签核为`board-ready`，不改变本包证据范围。A0.2整体、Reference Board、生产Blockout、LOD、设备、真人和Final仍继续`incomplete`/fail closed。

## 1. 技能影响

| 技能 | 本阶段的实际约束 |
|---|---|
| `art-bible` | 不改已签核视觉宪法；本阶段只做来源输入，不越级生产资产或板面 |
| `game-art-director` | 六类严格使用mood/color/composition/character/environment/UI；每板7/2/1，每条写具体借鉴、不复制和用途边界，T01承担刻意张力或Anti-reference |
| `media-asset-management` | 源文件与后续板面分离；每个可嵌入文件固定来源、权利、路径、byteLength、SHA-256和尺寸，并提供离线漂移检查 |
| `character-design-sheet` | Character B01–B03必须显示可审阅的正/侧/三分之四体块与附件关系，不允许再用UV色块代替角色视图 |
| `blender-web-pipeline` | 因本机无Blender，采用固定正交相机的软件渲染器直接读取正式GLB、骨骼Idle姿态与UV；输入GLB/纹理、相机、脚本和输出hash全部固定 |
| `threejs-game-ui-designer` | 六张UI输入分别回答首页快速开局、武器收藏、武器详情、地图/模式、结算/下一目标和390×844压力；遵循单一主动作、固定数值槽、安全区与非Final标识 |

## 2. 实际来源与权利

### 2.1 可嵌入视觉：36个唯一文件

| 来源 | 数量 | 权利与固定方式 | 使用范围 |
|---|---:|---|---|
| The Met Open Access公共领域馆藏 | 26 | 官方Open Access政策按CC0开放公共领域作品图像；每个对象下载前由官方对象API确认`isPublicDomain=true`，固定对象ID、官方页、API proof URL、取得日、本地byteLength/SHA-256/尺寸 | mood/color/environment各6件；composition 5件；character 3件 |
| 正式KayKit资产的项目自产干净渲染 | 3 | 输入Rogue、Skeleton、圆盾GLB与纹理均来自已批准CC0 Formal Asset Bundle；[渲染manifest](../quality/art/reference-sources/project-character-renders/character-render-manifest-v1.json)固定输入hash、Idle采样、正交相机、软件光照和输出hash | Character B01正/侧、B02正/三分之四、B03角色+圆盾持握侧并置；明确不是A0.3剪影或运行时挂点证据 |
| Arena V2项目自产合同视觉 | 7 | [生成器](../../scripts/art/generate-arena-reference-source-visuals.ts)只读取已签核Art Bible token与[V2 screen map](../product/arena-v2-screen-map.md)；[manifest](../quality/art/reference-sources/project-ui-wireframes/ui-source-visual-manifest-v1.json)固定权威文档hash、生成器版本、输出hash和缩略预检 | UI 6件覆盖六种职责；Composition B01替换为高对比KZ路线层级样图；均不是已实现页面、地图Blockout或Final |

The Met文件位于`docs/quality/art/reference-sources/met-open-access/`，只服务设计证据，不进入`public/`或运行时Bundle。没有下载CS1.6 KZ、热血英豪或弹壳特攻队截图，也没有使用搜索缩略图、AI转绘或来源不明图。

### 2.2 Link-only：24条

每板4条且全部`artifact: null`。外部受限来源只保留权利人、作者或一手社区页面；项目研究文档记录Arena的推导，不缓存页面图片。官方页面变化不能自动把受限来源升级为可嵌入。

## 3. 六板各10条覆盖

`E`为合法可嵌入视觉，`L`为纯文字link-only卡。

| 板 | B01–B07（70%） | A01–A02（20%） | T01（10%） | E/L |
|---|---|---|---|---:|
| mood | `E`全景庄园、`E`林荫亮点、`E`远村三层、`E`恢复田园、`L`Art Bible、`L`热血英豪官方方向、`L`产品情绪 | `E`地中海轻盈留白、`L`美术音频流程 | `E`沉重后果压力 | 6/4 |
| color | `E`黄绿/深蓝、`E`有限蓝阶、`E`低饱和双焦点、`E`绿底人物分离、`L`语义色Token、`L`KayKit色块、`L`WCAG证据 | `E`克制底色多焦点、`L`弹壳特攻队高饱和上限 | `E`金底红色过载 | 6/4 |
| composition | `E`自产入口—路径—落点—恢复—目标、`E`中央轴线、`E`前中远三层、`E`斜俯视分区、`L`CS1.6身份、`L`KZ作者指南、`L`KZ-Rush难度 | `E`主路/恢复支路、`L`CS2KZ审核 | `E`拥挤对角线 | 6/4 |
| character | `E`Rogue正/侧、`E`Skeleton正/三分之四、`E`Rogue+圆盾、`E`甲胄体块、`L`两角色边界、`L`KayKit Adventurers、`L`KayKit Skeletons | `E`宽肩窄腰层级、`L`热血英豪装备姿态 | `E`头肩轮廓过载 | 6/4 |
| environment | `E`开阔恢复面、`E`谷地地标、`E`路线重入、`E`人物尺度、`L`Arena KZ研究、`L`KZ Workshop、`L`KZ-Rush地图 | `E`重复平台/垂直层、`L`CS2KZ地图系统 | `E`风暴噪声 | 6/4 |
| UI | `E`首页快速开局、`E`武器收藏、`E`武器详情、`E`地图/模式、`L`Arena界面地图、`L`App Store、`L`Google Play | `E`结算/下一目标、`L`Apple生存指南 | `E`390×844窄屏压力 | 6/4 |

每板均为B区4个E、A区1个E、T区1个E。36个嵌入文件的路径和SHA-256均唯一，不以同图不同裁切充数。

## 4. 指定研究方向

| 方向 | 条目 | 借鉴什么 / 为什么 | 明确不复制 | 权利处理 |
|---|---|---|---|---|
| CS1.6 KZ | composition B05–B07/A02；environment B05–B07/A02 | 路线分段、练习顺序、距离/节奏/修正难度、入口—承诺—落点—恢复和地图审核 | 地图几何、材质、标志、名称、插件、物理参数、截图 | Valve产品页、作者Workshop/指南、KZ-Rush和CS2KZ资料只link-only |
| 热血英豪武器 | mood B06；character A02 | 武器改变姿态、重心、动作承诺、命中后果与反制 | 角色、服装、职业、武器名、招式、特效、数值、截图 | 官方/权利人页面无图像再分发授权，只link-only |
| 弹壳特攻队UI | color A02；UI B06/B07/A02 | 快速开始、行为先于细数值、结算给唯一下一目标；高饱和只作强调上限 | 页面数量、卡片皮肤、渐变、图标、货币、成长系统、截图和营销文案 | App Store、Google Play和Apple指南只link-only |

## 5. Anti-reference闭环

| 板 | 拒绝方向 | A0.2.2返工动作 |
|---|---|---|
| mood | 末世肃杀、写实死亡叙事压过玩具轻快 | 删除脏污和叙事符号，恢复明快体块与可解释后果 |
| color | 金底、红色、发光同时占满画面 | 灰度重做层级，只恢复一个具名强调 |
| composition | 英雄特写、持续拥挤遮住落点 | 回到固定游戏镜头，优先下一决策和恢复路线 |
| character | 巨大头饰吞掉肩颈负空间 | 退回轮廓，保留头肩、背部和肢体间隙 |
| environment | 风暴、雾和动态噪声掩盖KZ边缘 | 移除持续噪声，仅保留不干扰路线的瞬态反馈 |
| UI | 日志、红点、多入口挤入窄屏结算 | 收敛为结果、原因和唯一下一步 |

## 6. 480×320来源质量抽检

自动生成的[六类抽检页manifest](../quality/art/reference-source-inspection/a0.2.1-contact-sheet-manifest-v1.json)逐类列出6个embedded输入、entry ID、源artifact hash、缩略图hash与抽检页hash。每格图片框固定`480×320 contain`，六页共覆盖36个embedded输入，不使用同图裁切充数。

这六页没有A0.2.2要求的10格7/2/1完整板面、逐条可见注释、板面裁切批准和双签核；manifest强制`a0_2_2BoardPass: false`，因此抽检通过不能写成Reference Board通过。

## 7. A0.2.1独立评分：95/100

| 维度 | 分值 | 实际证据与扣分 |
|---|---:|---|
| 方向相关性 | 18/20 | 六类与Art Bible逐条对齐，角色、UI和构图阻断项已替换；扣2分：自产UI是合同视觉而非当前运行页面，且尚未进入A0.2.2完整板面语境 |
| 权利完备 | 23/25 | 36个嵌入项具商业/修改/再分发结论，游戏来源仅link-only，项目自产图固定权威输入；扣2分：The Met仍是取得日快照，项目自产权利声明仍随仓库所有权而非独立法务文件 |
| 70/20/10覆盖 | 15/15 | 六板均恰好10条、7/2/1，B/A/T都有合法视觉 |
| 可嵌入质量 | 17/20 | 26件开放馆藏、3张正式模型干净渲染、6张不同职责UI线框和1张高对比构图均在六类抽检页可审；扣3分：角色是固定Idle软件渲染、UI不是运行页面，且A0.2.2尚未做10格裁切与注释去噪 |
| Anti-reference | 9/10 | 六板均有T01和失败返工方向，抽检页已可并排看出张力样本；扣1分：尚未进入A0.2.2正式板面与双签核 |
| 治理可复算 | 13/15 | 60条与六张抽检页均校验路径、权利、hash、尺寸和源条目映射，并阻止仓库越界/符号链接逃逸；扣2分：尚未接常规npm/CI，外部页面在线可用性不做离线复验 |

总分95，所有维度均≥80%。主协调已于2026-07-28仅对A0.2.1“来源与权利包”小门签核为`source-ready`；没有新增或虚构板面证据。该分只评价来源包及来源质量抽检，不借用A0.2.2板面、A0.3剪影、LOD、设备、真人或Final证据。

## 8. 失败关闭与下一门

检查器强制六类齐全、每板10条、7/2/1、每板恰好6个嵌入、B/A/T均有视觉、60个entry ID唯一、36个路径和内容hash唯一、嵌入权利三项均为true、link-only不得缓存artifact、关键字段与状态枚举有效、外部来源域名白名单、本地source/license/proof存在、artifact实路径留在仓库且不能经符号链接逃逸、byteLength/SHA-256/尺寸与磁盘一致。状态允许协调签核前`source-ready-candidate`及签核后`source-ready`，但六板状态必须与包状态一致。

检查器同时复核六张抽检页各自恰好映射6个embedded条目、源hash一致、抽检页hash/尺寸一致，且必须显式保持`a0_2_2BoardPass: false`。

文件漂移、重复图片、权利字段缺失、受限图进入仓库、任一板不足6个合法视觉、出现占位符或A0.2.2把link-only卡替换成截图，都会使A0.2.1退回`incomplete`。

A0.2.2已在独立小门生成六张2560×1440 SVG/PNG，执行contain裁切、可见注释、板面manifest、缩略可读性和双签核，并于2026-07-28签核为`board-ready`。本包没有创建或借用这些文件；两个小门通过后，A0.2整体仍不可写“Reference Board通过”，也不得开始生产Blockout。
