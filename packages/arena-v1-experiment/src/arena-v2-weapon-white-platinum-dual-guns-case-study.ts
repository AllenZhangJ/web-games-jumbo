import { ARENA_V2_WEAPON_PUBLIC_AXIS_ID } from './arena-v2-weapon-public-axis-contract.js';
import {
  createArenaV2WeaponCaseStudyNumericReview as numeric,
  type ArenaV2WeaponCaseStudy,
  type ArenaV2WeaponCaseStudyMove,
} from './arena-v2-weapon-case-study-contract.js';

export type ArenaV2WeaponWhitePlatinumDualGunsCaseStudy = ArenaV2WeaponCaseStudy & {
  readonly referenceId: 'white-platinum-dual-guns';
  readonly referenceName: '白金双枪';
};

const moves: readonly ArenaV2WeaponCaseStudyMove[] = [
  {
    id: 'ground-double-shot',
    input: 'XX',
    context: 'ground',
    officialFact: '向前连续射出两发子弹，每发都会消耗 MP；官方说明将其列为白金双枪的基础点射。',
    designPurpose: '用短促、可重复的直线威胁建立距离语言，让玩家先学习瞄准线和出手时机，而不是依赖大范围效果。',
    playerDecision: '在有效距离内立刻点射，还是保留资源等待对手的落点和接近路线更清楚。',
    counterplay: '横向改变位置、利用支撑面遮挡或快速贴近枪手，迫使直线点射失去安全距离；被看见不等于必须硬接。',
    failureCost: '点射落空会消耗资源并暴露枪口恢复，枪手不能用连续按键把每次错误都变成无成本覆盖。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE, '点射首先依赖有效距离，必须与近战武器直接可比较。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '出手速度决定对手能否在看到枪口后改变落点。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '点射后的恢复决定贴身反制是否成立。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN, '连续点射间隔是资源和覆盖之间的约束。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一条低覆盖直线点射 + 明确出手和恢复；不迁移 MP、伤害数值和自动瞄准。',
  },
  {
    id: 'running-forward-back-fire',
    input: '跑X',
    context: 'running',
    officialFact: '跑动中可以向前或向后快速射击，官方说明标注该动作连续消耗资源。',
    designPurpose: '把射击和自身移动绑定，形成“边改变位置边维持威胁”的武器身份，而不是站桩远程。',
    playerDecision: '边跑边保持火线，还是停止射击换取更可靠的转向和落点控制。',
    counterplay: '从射击方向外侧切入、利用高度差或迫使枪手越过安全支撑面；追逐子弹线会把反制变成自我暴露。',
    failureCost: '跑动射击覆盖前后但不代表全向安全，错过目标后枪手仍要承担转向、恢复和资源消耗。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '前后方向的价值来自覆盖形状，不能只显示一条距离数值。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT, '跑动射击必须公开自身位移，否则玩家看不出越过边缘的风险。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE, '前后射击的方向容错需要独立观察，不能伪装成更大的范围。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '跑动状态退出射击后的恢复决定近身对手能否反抢。', 'must-measure'),
    ]),
    arenaMinimumVersion: '跑动中保留前后射击和自身位移；不引入自动追踪、无限转身和无条件全向保护。',
  },
  {
    id: 'aerial-diagonal-double-shot',
    input: '空中XX',
    context: 'aerial',
    officialFact: '空中向斜下方连续发射两发子弹，每发消耗资源；官方说明将其作为独立的空中射击。',
    designPurpose: '让空中射击承担落点压制和高度转换，而不是把地面点射简单复制到跳跃状态。',
    playerDecision: '用斜下火线压住目标落点，还是保留跳跃调整能力等待更好的支撑面。',
    counterplay: '改变水平位置、快速落地或站到斜下火线之外；空中射击结束后要抓住枪手的落地恢复。',
    failureCost: '空中射击会消耗下一次落点调整空间，斜线错过后不能用地面距离补偿。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP, '斜下射击的成立条件来自目标与枪手的高度差。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '空中斜线覆盖要和地面直线分开显示。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '落地前后的恢复决定空中压制是否可被反制。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT, '空中动作对自身落点的影响是重要失败成本。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一个有高度差门槛的斜下空中点射；不复制原作资源消耗和空中弹幕密度。',
  },
  {
    id: 'upward-double-shot',
    input: 'ZC-C',
    context: 'ground',
    officialFact: '从地面向斜上方连续发射两发子弹，每发消耗资源；官方说明将其作为向上覆盖动作。',
    designPurpose: '补足远程武器对高位路线的回答，让地图的上下层关系成为瞄准选择，而不是所有射击都只沿水平线。',
    playerDecision: '提前读出对手跳跃路线向上点射，还是继续保留水平火线避免错过地面目标。',
    counterplay: '改变跳跃节奏、贴近枪手或进入斜上火线之外的水平位置；高位覆盖不能同时覆盖所有低位路线。',
    failureCost: '向上点射会放弃部分水平空间并消耗资源，预判错误时枪手要承担换线空档。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP, '向上射击必须公开其能处理的高度差。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '斜上覆盖范围决定它是否只是视觉变化还是实际战术分工。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE, '方向容错决定预判失败时是否仍会无条件擦中。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '射击方向切换后的恢复是贴身反制窗口。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一个有明确高度差和方向门槛的斜上点射；不加入自动锁定和全角度补偿。',
  },
  {
    id: 'aerial-horizontal-volley',
    input: '空中XC',
    context: 'aerial',
    officialFact: '空中向前方横向连续发射大量子弹，官方说明将其列为高覆盖空中射击，并持续消耗资源。',
    designPurpose: '提供一次高覆盖的空中路线封锁，让玩家在“覆盖更多空间”和“失去落点控制”之间做取舍。',
    playerDecision: '用高覆盖火力锁住横向路线，还是放弃弹幕、保留跳跃和落地后的主动权。',
    counterplay: '从弹幕上下边界切出、逼迫枪手提前落地，或等待其高覆盖动作结束后的恢复；不把弹幕视为不可穿越墙体。',
    failureCost: '大量射击换来更长动作承诺和更少落点调整，错误使用会让枪手在空中失去支撑面选择。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '高覆盖是该动作区别于点射的主要价值，必须在概览中可见。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES, '连续弹幕需要显示有效攻击窗口，不能只显示“子弹多”。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP, '空中弹幕的上下边界决定对手从哪里离开。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '高覆盖结束后的落地和收招是核心反制窗口。', 'must-measure'),
    ]),
    arenaMinimumVersion: '低频高覆盖的空中横向压制 + 明确结束和落地风险；不迁移原作弹药密度和 MP。',
  },
  {
    id: 'running-fan-sweep',
    input: '跑XC',
    context: 'running',
    officialFact: '跑动中向前方大范围扇形扫射，官方说明将其列为消耗资源的范围攻击。',
    designPurpose: '把武器的覆盖形状从直线扩展为扇形，形成对窄路入口和横向追击的路线压力。',
    playerDecision: '在对手进入扇形前提交扫射，还是继续跑动寻找更好的角度，避免用大招覆盖空地。',
    counterplay: '贴近扇形内侧、从后方切入、利用高度差或让枪手越过扫射方向；扇形更宽也应更容易读出承诺。',
    failureCost: '扫射空放会同时丢失跑动路线和资源，宽覆盖不能消除方向与时机错误。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '扇形宽度是该动作的核心公共差异。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '大范围前的可读启动时间决定回应是否公平。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '扫射结束后的收招决定对手能否从边缘反入。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT, '跑动扫射需要把越过目标和边缘失位的风险公开。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一个低频扇形路线压制动作，公开起手、覆盖和收招；不复制高频弹幕和爆炸子弹。',
  },
  {
    id: 'resource-reset',
    input: 'ZXC',
    context: 'resource',
    officialFact: '官方说明显示该动作可以恢复全部 MP，并限制最多使用五次；这是一条资源循环规则，而非普通攻击。',
    designPurpose: '研究远程武器如何把高频消耗动作和有限的长期资源回补绑定，避免强覆盖技能无限重复。',
    playerDecision: '现在回补资源继续控线，还是把有限次数留到更关键的边缘或高位交锋。',
    counterplay: '迫使枪手在不利位置提前使用回补，或在回补动作的启动和恢复阶段取得主动；资源重置不应同时修复位置错误。',
    failureCost: '回补次数有限，错误使用会减少整局可用的高覆盖机会；若动作被打断，资源和位置都应产生损失。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN, '回补动作的再次使用时间决定它是否会取代普通资源管理。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '回补时的可打断窗口决定资源收益是否需要位置保护。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '回补不应以攻击覆盖伪装成免费安全按钮。', 'research-only'),
    ]),
    arenaMinimumVersion: '只保留“有限次数的资源回补”研究问题；Arena 最小版本不引入 MP、自动补满或五次固定使用。',
  },
];

const caseStudy: ArenaV2WeaponWhitePlatinumDualGunsCaseStudy = {
  referenceId: 'white-platinum-dual-guns',
  referenceName: '白金双枪',
  sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=329',
  productionAssetStatus: 'research-only',
  battleThesis: '白金双枪的核心不是“远程伤害高”，而是用直线、前后移动、斜上/斜下和扇形覆盖改变玩家对空间的解释；不同射击动作必须同时显示覆盖形状、上下文、落点风险和资源承诺。',
  designReasons: Object.freeze([
    '地面点射建立最基础的有效距离和火线学习。',
    '跑动前后射击把自身移动和方向关系变成独立决策。',
    '斜下与斜上射击让地图高度差参与瞄准，而不是只做装饰。',
    '空中横向弹幕展示高覆盖与落点控制之间的取舍。',
    '跑动扇形扫射把覆盖形状扩展到窄路入口和追击路线。',
    '资源回补动作研究有限资源如何约束高频覆盖，不把资源系统直接迁移到 Arena。',
  ]),
  moves: Object.freeze(moves.map((move) => Object.freeze({
    ...move,
    numericReview: Object.freeze([...move.numericReview]),
  }))),
  minimumVersion: Object.freeze({
    coreVerb: '保持距离并逼走位',
    contexts: Object.freeze(['ground', 'running', 'aerial', 'resource'] as const),
    requiredPublicAxes: Object.freeze([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE,
    ]),
    notToCopy: Object.freeze([
      'Z 瞄准、自动追踪和 TEC 带来的命中补偿',
      'MP 资源系统和固定五次补满',
      '高频子弹、爆破子弹和原作伤害数值',
      '全角度无条件覆盖',
      '原武器名称、动作资产和职业属性',
    ]),
  }),
};

export const ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY = Object.freeze(caseStudy);
