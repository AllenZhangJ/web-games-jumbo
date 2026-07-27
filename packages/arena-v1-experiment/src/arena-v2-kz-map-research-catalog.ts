export type ArenaV2KzMapEvidenceType =
  | 'community-database'
  | 'community-archive'
  | 'workshop-reference';

export interface ArenaV2KzMapResearchCard {
  readonly referenceId: string;
  readonly title: string;
  readonly sourceUrl: string;
  readonly evidenceType: ArenaV2KzMapEvidenceType;
  readonly movementFocus: string;
  readonly observedFeatures: readonly string[];
  readonly arenaLesson: string;
  readonly notToCopy: readonly string[];
  readonly productionAssetStatus: 'research-only';
}

const cards: readonly ArenaV2KzMapResearchCard[] = [
  {
    referenceId: 'kz_longjumps2',
    title: 'Longjump / Countjump 练习地图',
    sourceUrl: 'https://steamcommunity.com/workshop/filedetails/?id=1583718472',
    evidenceType: 'workshop-reference',
    movementFocus: 'longjump、countjump、highjump、bhop longjump、trickjump',
    observedFeatures: [
      '把同一类跳跃能力拆成可重复练习的区域',
      '同时包含课程和独立练习区',
      '难度可以来自落点距离，而不是新增操作按键',
    ],
    arenaLesson: '把断层段拆成短练习段与连续竞速段，让玩家先熟悉落点，再承担路线时间压力。',
    notToCopy: ['原地图布局', '原地图材质与名称', '依赖 CS1.6 特定物理漏洞的跳法'],
    productionAssetStatus: 'research-only',
  },
  {
    referenceId: 'kz_cmp_collage_v2',
    title: '长路线综合攀爬地图',
    sourceUrl: 'https://kz-rush.com/en/maps/cs16/kz_cmp_collage_v2',
    evidenceType: 'community-database',
    movementFocus: '长路线、连续段落、检查点与完成计时',
    observedFeatures: [
      '社区记录同时标注难度、路线长度和检查点数量',
      '长路线可以用多个可复盘的节点组织，而不是只有一个终点',
      '完成时间和路线稳定性可以成为长期记录',
    ],
    arenaLesson: '竞速地图要有可命名的段落节点；玩家失败后知道自己丢在第几段，而不是只看到总时间归零。',
    notToCopy: ['原路线几何', '原检查点文件与计时插件', '原地图截图和素材'],
    productionAssetStatus: 'research-only',
  },
  {
    referenceId: 'kz_climbers_b01',
    title: '垂直攀爬与失败恢复地图',
    sourceUrl: 'https://cs-games.net/cs16/maps/kz/344-karta-kz_climbers_b01-dlja-cs-16.html',
    evidenceType: 'community-archive',
    movementFocus: '垂直攀爬、桥、台阶、低处恢复空间',
    observedFeatures: [
      '路线通过垂直高度和不同落点连续推进',
      '低处存在水面/缓冲空间，失败不总是立即终止学习',
      '地图以计时记录把“完成”与“熟练”分开',
    ],
    arenaLesson: '每张高难地图至少保留一个恢复段；生存模式可以把它转成躲避和重新整理位置的安全区。',
    notToCopy: ['原树木、桥梁和场景主题', '原高度比例', '原下载包或第三方资源'],
    productionAssetStatus: 'research-only',
  },
  {
    referenceId: 'kz_bhop_arcane',
    title: '混合 Bhop / Surf / Raceway 样本',
    sourceUrl: 'https://steamcommunity.com/app/626680/workshop/',
    evidenceType: 'workshop-reference',
    movementFocus: 'Bhop、Surf、Bhop Raceway 和分档难度',
    observedFeatures: [
      '同一社区目录把移动类型和难度作为独立标签',
      '混合地图可以把不同移动节奏放在同一课程中，但需要显式分段',
      '不同玩家可以按自己的熟练层级选择相同地图的不同挑战目标',
    ],
    arenaLesson: 'Arena 首批不引入 surf 或特殊物理；只借鉴“移动类型标签 + 段落难度”的信息组织，保持方向 + 跳跃操作不变。',
    notToCopy: ['Surf 物理', 'Bhop 专用服务器参数', '原地图路线与视觉资产'],
    productionAssetStatus: 'research-only',
  },
];

export const ARENA_V2_KZ_MAP_RESEARCH_CATALOG: readonly ArenaV2KzMapResearchCard[] = Object.freeze(
  cards.map((card) => Object.freeze({
    ...card,
    observedFeatures: Object.freeze([...card.observedFeatures]),
    notToCopy: Object.freeze([...card.notToCopy]),
  })),
);
