export type ArenaV2SurvivorIoUiEvidenceType =
  | 'official-store-page'
  | 'official-guide'
  | 'official-update-history';

export interface ArenaV2SurvivorIoUiEvidenceCard {
  readonly referenceId: string;
  readonly sourceUrl: string;
  readonly evidenceType: ArenaV2SurvivorIoUiEvidenceType;
  /** Claims directly observable from the linked official material. */
  readonly sourceClaims: readonly string[];
  /** Information patterns inferred from how the claims are presented. */
  readonly informationSignals: readonly string[];
  /** The smallest Arena translation that can be tested without adding systems. */
  readonly arenaTranslation: readonly string[];
  /** Explicit boundaries so reference-game breadth does not become Arena scope. */
  readonly notToCopy: readonly string[];
  readonly productionAssetStatus: 'research-only';
}

const cards: readonly ArenaV2SurvivorIoUiEvidenceCard[] = [
  {
    referenceId: 'official-store-core-promise-cn',
    sourceUrl: 'https://apps.apple.com/cn/app/%E5%BC%B9%E5%A3%B3%E7%89%B9%E6%94%BB%E9%98%9F/id1628270358',
    evidenceType: 'official-store-page',
    sourceClaims: [
      '官方页面强调单手操作。',
      '官方页面强调海量敌人同屏与 Roguelike 技能组合。',
      '官方页面把不同关卡难度作为主要体验承诺。',
    ],
    informationSignals: [
      '核心体验先被压缩成少数短句，玩家不需要先读完整系统说明。',
      '操作方式、局内选择和难度变化被放在开始决策之前。',
    ],
    arenaTranslation: [
      '首页首屏只保留一个主要开始入口和当前目标。',
      '模式选择卡只说明目标、时长感受和记录类型，再把细节后置到准备页。',
      '基础操作保持方向 + 跳跃，武器差异通过动作、地图和反馈承担。',
    ],
    notToCopy: [
      '自动攻击或 Roguelike 技能组合',
      '海量敌人同屏作为制作目标',
      '用多个入口替代一个清晰的开始动作',
    ],
    productionAssetStatus: 'research-only',
  },
  {
    referenceId: 'official-store-core-promise-global',
    sourceUrl: 'https://play.google.com/store/apps/details?id=com.dxx.firenow',
    evidenceType: 'official-store-page',
    sourceClaims: [
      '官方页面再次强调单手操作、海量敌人、技能组合和不同难度。',
      '官方页面将游戏描述为单人 Roguelike 体验。',
    ],
    informationSignals: [
      '不同商店入口仍然使用同一组短承诺，说明核心定位需要跨入口保持稳定。',
      '长期内容可以被概括，但每一局的主要选择不需要在首页展开成系统树。',
    ],
    arenaTranslation: [
      '首页、模式选择和结算页使用同一套三句话：这一局做什么、留下什么、下一局做什么。',
      '竞技与生存共享角色、武器和地图基础认知，但不共享复杂成长页面。',
    ],
    notToCopy: [
      '把商店页的营销承诺直接当作 Arena 的功能清单',
      '为跨入口一致性增加多语言内容系统',
      '将单人 Roguelike 结构迁移到 1v1 或竞速',
    ],
    productionAssetStatus: 'research-only',
  },
  {
    referenceId: 'official-guide-weapon-and-scenario-language',
    sourceUrl: 'https://apps.apple.com/cn/ipad/story/id1649510203',
    evidenceType: 'official-guide',
    sourceClaims: [
      '官方指南将苦无描述为自动追击目标且不需要瞄准。',
      '官方指南将霰弹枪、太刀和棒球棍描述为需要面对方向的武器。',
      '官方指南按开阔空间、敌人数量和首领场景给出不同武器选择建议。',
    ],
    informationSignals: [
      '武器先用可观察行为区分，再用场景说明什么时候有价值。',
      '玩家学习的是“我看见什么、应该如何选”，而不是先背完整数值表。',
    ],
    arenaTranslation: [
      '武器概览先显示核心动词、命中结果和适合的地图空间，再显示真实数值。',
      '武器详情补充前摇、收招、方向要求、地图后果和一种反制方式。',
      '地面与空中上下文必须在同一比较结构中可见，避免用颜色或名称伪造差异。',
    ],
    notToCopy: [
      '自动锁定和自动攻击',
      '把武器选择改成局内随机技能池',
      '用参考对象的具体武器、数值或动作资产作为生产内容',
    ],
    productionAssetStatus: 'research-only',
  },
  {
    referenceId: 'official-update-history-complexity-boundary',
    sourceUrl: 'https://apps.apple.com/cn/app/%E5%BC%B9%E5%A3%B3%E7%89%B9%E6%94%BB%E9%98%9F/id1628270358',
    evidenceType: 'official-update-history',
    sourceClaims: [
      '官方版本记录中可以观察到特工、宠物、载具、收藏品、活动和联机等长期内容入口。',
      '官方版本记录展示了持续追加内容的运营方式。',
    ],
    informationSignals: [
      '长期回访可以由多种内容入口共同承担，但这会显著扩大局外信息复杂度。',
      '“内容很多”与“玩家每次只需要一个下一目标”可以同时成立。',
    ],
    arenaTranslation: [
      '把参考对象的内容广度当成复杂度警戒线，而不是功能待办清单。',
      'Arena 的长期容量只先由武器收藏、地图段落熟悉和模式记录承担。',
      '结算页只给一个下一目标，并在 2 次主要点击内回到重开或目标入口。',
    ],
    notToCopy: [
      '宠物、科技、部件、载具和多货币',
      '活动中心、商城、社交和复杂收藏子系统',
      '用签到或重复掉落伪造 200 小时内容容量',
    ],
    productionAssetStatus: 'research-only',
  },
];

export const ARENA_V2_SURVIVOR_IO_UI_EVIDENCE: readonly ArenaV2SurvivorIoUiEvidenceCard[] = Object.freeze(
  cards.map((card) => Object.freeze({
    ...card,
    sourceClaims: Object.freeze([...card.sourceClaims]),
    informationSignals: Object.freeze([...card.informationSignals]),
    arenaTranslation: Object.freeze([...card.arenaTranslation]),
    notToCopy: Object.freeze([...card.notToCopy]),
  })),
);
