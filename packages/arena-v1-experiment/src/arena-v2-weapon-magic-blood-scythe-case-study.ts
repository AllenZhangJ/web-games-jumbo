import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
} from './arena-v2-weapon-public-axis-contract.js';
import {
  createArenaV2WeaponCaseStudyNumericReview as numeric,
  type ArenaV2WeaponCaseStudy,
  type ArenaV2WeaponCaseStudyMove,
} from './arena-v2-weapon-case-study-contract.js';

export type ArenaV2WeaponMagicBloodScytheCaseStudy = ArenaV2WeaponCaseStudy & {
  readonly referenceId: 'magic-blood-scythe';
  readonly referenceName: '魔血镰刃';
};

const moves: readonly ArenaV2WeaponCaseStudyMove[] = [
  {
    id: 'medium-wheel',
    input: 'ZC',
    context: 'ground',
    officialFact: '从身后举镰向前砸击并发射纵向魔轮，合适的中距离可以形成最多三次命中；官方说明强调魔轮范围大，不易用跳跃躲开。',
    designPurpose: '用中距离、宽覆盖和多次命中建立第一层稳定威胁，让武器不必每次都贴身换血。',
    playerDecision: '在中距离直接压制，还是等待对手进入更容易被后续动作转换的位置。',
    counterplay: '离开魔轮的攻击线、贴近到其远程价值下降，或利用高低差改变高度关系；不能只依赖一次跳跃。',
    failureCost: '目标已经离开攻击线后，宽覆盖不会自动转化为命中，使用者仍要承担动作收招和资源成本。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE, '中距离是该动作成立的核心空间门槛。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '官方明确强调魔轮范围大，必须与其他直线动作横向比较。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '对手是否来得及离开攻击线取决于形成攻击的时间。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '贴身反制需要依赖挥空后的恢复成本。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES, '多次命中不能只显示总伤害，需要显示攻击判定持续多久。', 'must-measure'),
    ]),
    arenaMinimumVersion: '单一中距离直线投射物；公开攻击线和收招，不迁移自动瞄准与三次命中保证。',
  },
  {
    id: 'foot-trap-conversion',
    input: 'ZX',
    context: 'delayed',
    officialFact: '先以镰尾命中，随后在目标脚下附带鲜血陷阱，再用镰刀勾击击飞；陷阱约持续 20 秒且可以继续释放。',
    designPurpose: '把一次命中拆成即时结果和后续路线压力，让目标的下一步选择成为武器价值的一部分。',
    playerDecision: '把陷阱放在当前脚下争取即时命中，还是把危险位置留给目标之后必须经过的路线。',
    counterplay: '看到公开标记后离开危险区域，等待危险结束或换路线；不能让陷阱无预警地覆盖全部平台。',
    failureCost: '放错位置会占用再次使用机会；持续时间越长，越需要用清晰预警换取对手回应时间。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY, '陷阱何时真正产生危险决定目标是否有公平回应时间。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING, '官方持续陷阱的可学习性必须转成公开标记到生效的时间。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '路线封锁的影响面不能只用命中范围代替。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN, '不能以无限堆叠替代长期内容，必须公开下一次尝试成本。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一个带公开标记的短时危险区；先验证离开、等待和换路线三种回应，不迁移无限叠加。',
  },
  {
    id: 'stop-hook',
    input: '急停XC',
    context: 'running',
    officialFact: '跑动中急停并架起魔镰，从对手身后勾击，命中后令对手旋转并可继续追加攻击。',
    designPurpose: '把“跑动”从单纯接近改成改变攻击方向和时机的承诺，奖励玩家在移动中读取对手朝向。',
    playerDecision: '继续跑过目标、急停换成背后攻击，还是放弃攻击保留自己的安全位置。',
    counterplay: '保持正面、改变转身时机、封住绕后路线，或让攻击者急停后落入自己的近身范围。',
    failureCost: '急停方向和目标朝向判断错误时，动作既没有远程补偿，也会损失跑动位置。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '移动中急停到生效的时间决定对手能否转身。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE, '背后关系需要显示方向容错，而不是伪装成更大的攻击范围。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '背后动作失败后必须保留可惩罚恢复。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT, '急停与跑动路线会改变攻击者自身位置风险。', 'must-measure'),
    ]),
    arenaMinimumVersion: '保留跑动进入、目标朝向和方向性击退；不迁移自动从背后成立的判定。',
  },
  {
    id: 'aerial-wheel-short',
    input: '空中XC短按',
    context: 'aerial',
    officialFact: '跃起后向斜下方横向发射魔轮，官方说明强调攻击范围大且不易闪躲。',
    designPurpose: '让空中状态拥有独立的横向压制答案，而不是把地面投射物简单复制到空中。',
    playerDecision: '用空中动作控制落点附近空间，还是保留落地后的再次行动。',
    counterplay: '改变水平位置或支撑面，避开斜下攻击线，并在其落地恢复期间抢回空间。',
    failureCost: '空中动作会消耗落点调整机会，错过目标后不能立即用地面动作修正。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP, '空中攻击必须明确目标高度差，而不是只显示地面射程。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '斜下横向覆盖决定落点附近的真实压力。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '落地前后的恢复是空中动作风险的主要来源。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一个有独立高度差和落点恢复的空中投射动作；不复制空中自动追踪。',
  },
  {
    id: 'aerial-wheel-long',
    input: '空中XC长按',
    context: 'charged',
    officialFact: '长按发射魔轮后，角色在下落过程中继续用镰向前砸击，命中可将目标击向空中并追击。',
    designPurpose: '同一空中输入通过按住时间形成“先控制落点”与“继续提交重击”的选择。',
    playerDecision: '短按先结束动作，还是长按接受更长承诺换取垂直控制和追击。',
    counterplay: '预判长按后的下落线，提前离开或诱使攻击者错过支撑面；不要把长按当作免费追加。',
    failureCost: '长按错过会同时损失空中落点和地面回合，收招暴露比短按更大。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '长按后的重击形成时间是对手反应依据。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL, '追加砸击的核心回报是改变高度和落点。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '长按必须有比短按更高的失败恢复成本。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT, '下落前冲会把攻击者带离原安全点。', 'must-measure'),
    ]),
    arenaMinimumVersion: '短按/长按两档空中动作，共享一个输入；长按只增加公开承诺和垂直结果。',
  },
  {
    id: 'running-charge-levels',
    input: '跑XC Lv1 / Lv2 / Lv3',
    context: 'charged',
    officialFact: '跑动中向前推进并按蓄力时间分为三档：短蓄力三段且不倒地；中蓄力五段并击向空中且带超级护甲；长蓄力七段并击飞，攻击中具有无敌效果。',
    designPurpose: '把威力、承诺、保护和回应时间绑定成逐级风险曲线：越强，越需要让对手看见并让使用者承担空档。',
    playerDecision: '现在释放低档保留行动，还是等待更高档接受更长可读承诺。',
    counterplay: '逼迫使用者提前释放，离开攻击线，或在蓄力到期/收招时反击；不能用同一套高档保护覆盖所有失败。',
    failureCost: '等待越久越容易丢失移动位置；高档若空放，应该同时承担更长恢复或资源成本。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '三档的核心差异是达到不同结果前的承诺时间。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT, '档位提升必须改变路线位移，而非只改变视觉。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL, '中档/高档的浮空和击飞结果需要单独比较。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '高档空放要有可惩罚的退出成本。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING, '档位闪光或其他公开节点需要转成玩家可读预警。', 'research-only'),
    ]),
    arenaMinimumVersion: '最多两档蓄力，使用公开节点、到期取消和不同击退/恢复；不迁移超级护甲和无敌叠加。',
  },
  {
    id: 'underground-lock',
    input: 'ZXC',
    context: 'delayed',
    officialFact: '将魔镰插入地面，自动锁定前方对手并从目标脚下突起攻击，命中后还能接跑XC或空中XC。',
    designPurpose: '用地面威胁覆盖对手的静态等待，迫使对手在水平移动和跳跃之间提前做选择。',
    playerDecision: '把地面突起留在对手当前脚下，还是等待其路线明确后再提交。',
    counterplay: '保持移动、改变高度或利用公开的落点/生效提示离开；被追击时优先争取支撑面，而不是硬吃第二段。',
    failureCost: '自动锁定降低了瞄准成本，Arena 必须用固定前方落点、较长预警或更高冷却补回对手回应空间。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY, '地面突起从标记到生效的等待是核心反制窗口。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING, '玩家必须看见危险位置，而不是被不可见命中。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '落点附近范围决定跳跃和横移是否有区别。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN, '低瞄准成本必须由再次使用成本约束。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL, '命中后的追击窗口要与第一段威胁分开记录。', 'must-measure'),
    ]),
    arenaMinimumVersion: '固定前方落点 + 公开预警 + 短延迟；先不加入自动锁定与必然派生追击。',
  },
];

const caseStudy: ArenaV2WeaponMagicBloodScytheCaseStudy = {
  referenceId: 'magic-blood-scythe',
  referenceName: '魔血镰刃',
  sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=793',
  productionAssetStatus: 'research-only',
  battleThesis: '魔血镰刃的核心不是“镰刀伤害高”，而是把中距离压制、命中后封路、移动绕后、空中落点和多档承诺放进同一套战斗语言；每个强结果都改变对手下一步路线。',
  designReasons: Object.freeze([
    '中距离魔轮解决“如何在不贴身的情况下建立威胁”。',
    '脚下陷阱解决“如何让一次命中继续影响目标的下一步路线”。',
    '急停背后勾击解决“如何把移动和目标朝向变成独立决策”。',
    '空中短按/长按解决“如何让同一输入在落点和垂直控制之间取舍”。',
    '跑动三档蓄力解决“如何把威力提升与承诺、预警、风险绑定”。',
    '地面突起解决“如何惩罚静态等待，同时保留移动和跳跃反制”。',
  ]),
  moves: Object.freeze(moves.map((move) => Object.freeze({
    ...move,
    numericReview: Object.freeze([...move.numericReview]),
  }))),
  minimumVersion: Object.freeze({
    coreVerb: '封路并改变落点',
    contexts: Object.freeze([
      'ground',
      'running',
      'aerial',
      'charged',
      'delayed',
    ] as const),
    requiredPublicAxes: Object.freeze([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING,
    ]),
    notToCopy: Object.freeze([
      '自动锁定',
      '无限叠加陷阱',
      '三档蓄力保护与无敌叠加',
      '多段连招和自动派生追击',
      'MP 资源系统和原武器动作资产',
    ]),
  }),
};

export const ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY = Object.freeze(caseStudy);
