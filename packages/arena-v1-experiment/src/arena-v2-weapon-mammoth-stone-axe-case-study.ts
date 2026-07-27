import { ARENA_V2_WEAPON_PUBLIC_AXIS_ID } from './arena-v2-weapon-public-axis-contract.js';
import {
  createArenaV2WeaponCaseStudyNumericReview as numeric,
  type ArenaV2WeaponCaseStudy,
  type ArenaV2WeaponCaseStudyMove,
} from './arena-v2-weapon-case-study-contract.js';

export type ArenaV2WeaponMammothStoneAxeCaseStudy = ArenaV2WeaponCaseStudy & {
  readonly referenceId: 'mammoth-stone-axe';
  readonly referenceName: '猛犸石斧';
};

const moves: readonly ArenaV2WeaponCaseStudyMove[] = [
  {
    id: 'delayed-axe-drop',
    input: 'ZC',
    context: 'delayed',
    officialFact: '把巨斧掷向空中，约 3 秒后砸向前方地面；命中后先造成短暂眩晕，再造成倒地，眩晕期间可以追加攻击。',
    designPurpose: '把“现在按下”与“稍后落点”分开，让玩家通过预判路线而不是即时反应获得重击机会。',
    playerDecision: '预判目标将要经过的位置，还是保留直接移动来应对目标改变路线；落点越强，等待成本越高。',
    counterplay: '看到落点预警后改变横向路线、跳过危险位置或逼迫攻击者提前交出落点；不要把延迟落点当成自动追踪。',
    failureCost: '目标提前离开后，攻击者损失等待时间和下一次尝试窗口，落点空放还会暴露恢复阶段。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY, '官方明确存在约 3 秒延迟，必须把等待时间从普通前摇中独立展示。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING, '玩家必须看见落点或危险提示，才能形成公平的路线回应。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '延迟动作的价值来自落点覆盖，而不是瞬时接触距离。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '目标离开落点后，收招决定攻击者是否会被反抢。', 'must-measure'),
    ]),
    arenaMinimumVersion: '固定前方落点 + 明确预警 + 短延迟重击；先不做自动追踪和必然追加。',
  },
  {
    id: 'charged-ground-slam',
    input: 'ZX-X',
    context: 'charged',
    officialFact: '用巨斧叩击地面，并可按 X 蓄力；蓄力情况对应 3 种攻击方式，蓄力攻击额外带有滑倒判定，可以击倒前方一定范围内的所有人。',
    designPurpose: '让同一个基础动作通过蓄力改变覆盖和结果，形成“立即释放保位置”与“等待更强范围”之间的取舍。',
    playerDecision: '现在释放低档攻击，还是等待更高档覆盖；蓄力期间还要判断目标是否已经走出前方区域。',
    counterplay: '离开前方覆盖、改变高度或逼迫使用者提前释放；范围扩大不能抹掉蓄力期间的可读承诺。',
    failureCost: '蓄力越久，目标越容易离开，空放后还会损失下一次移动和收招时间。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '蓄力档位的核心差异是达到覆盖结果前需要等待多久。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '三种攻击方式必须用覆盖宽度区分，而不是只写“范围更大”。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL, '滑倒/击倒需要转译为可观察的控制结果。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '高档空放后的恢复是对手的主要反制窗口。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING, '蓄力档位需要有闪光或阶段提示，避免高档结果不可读。', 'research-only'),
    ]),
    arenaMinimumVersion: '最多两档地面蓄力，公开阶段和覆盖变化；不迁移三档复杂派生和原作属性。',
  },
  {
    id: 'rolling-coin-pressure',
    input: '转一圈XC',
    context: 'ground',
    officialFact: '召唤巨大古代钱币并用巨斧击打，使钱币向前滚动；命中对手会造成暴击击飞，对地有效并具有压扁效果。',
    designPurpose: '把武器本体的近身风险转成一枚沿地面移动的空间物体，让目标必须处理滚动物体的路线和速度。',
    playerDecision: '在宽平台上用滚动物体逼迫横移，还是在窄路入口提前封住落点；释放后需要重新判断目标是否会跳过。',
    counterplay: '跳过滚动物体、改变高度或从侧面离开其路线；在滚动物体经过后抓住攻击者重新建立武器的空档。',
    failureCost: '滚动物体方向固定，目标离开路线后不会自动修正；使用者会损失一次高回报空间尝试。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE, '滚动物体的投放距离决定它能否在不贴身时改变路线。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '物体宽度和滚动路线共同决定可绕行空间。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT, '暴击击飞应转译为横向/垂直落点变化，而不是只显示伤害。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES, '滚动威胁的有效持续时间决定玩家能否读懂其结束。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一枚固定方向的地面滚动物体 + 明确结束时间；不加入多物体叠加和复杂资源回收。',
  },
  {
    id: 'running-wall-rebound',
    input: '跑XC',
    context: 'running',
    officialFact: '跑到对手面前先用斧柄撞击，再挥斧重重击飞；目标撞上前方石块后会再次弹回，玩家可以把握时机追加地面技能。',
    designPurpose: '把跑动接触、墙面几何和二次落点串起来，让地图墙面成为动作价值的一部分。',
    playerDecision: '沿路线提交跑动撞击，还是停下避免把自己带到墙边；命中后还要决定是否追击弹回目标。',
    counterplay: '让攻击者越过目标、改变墙面关系或提前离开撞击线；墙面反弹不应在没有可用空间时自动保证追击。',
    failureCost: '跑动空放会扩大自身失位，目标没有碰到墙时，二次追击条件不成立。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT, '跑动接触会改变攻击者自身支撑面，必须公开风险。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT, '墙面反弹需要把目标位移和二次落点作为独立结果记录。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP, '目标是否贴近同一高度的墙面决定反弹分支能否成立。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '二次追击失败后必须留下可惩罚收招。', 'must-measure'),
    ]),
    arenaMinimumVersion: '跑动命中 + 墙面反弹条件 + 一次可读追击窗口；不做自动吸附墙面。',
  },
  {
    id: 'mammoth-charge-risk',
    input: 'ZXC',
    context: 'delayed',
    officialFact: '将巨斧砸向地面召唤猛犸巨象，猛犸会连续冲刺攻击；如果不躲开，使用者自己也会受到伤害。攻击结束后地面出现可食用三次的猛犸肉。',
    designPurpose: '把大范围高回报动作变成“敌我都必须处理”的公共危险，同时让战斗后留下短期资源选择。',
    playerDecision: '在拥挤路线中释放猛犸制造清场，还是保留动作避免自身受伤；结束后还要决定是否冒险拾取恢复物。',
    counterplay: '离开猛犸冲刺线、利用地形分隔敌我，或等攻击结束后争夺恢复物；不能只看召唤者一方的命中结果。',
    failureCost: '误判会同时损失自身状态和位置，恢复物还可能把玩家重新吸引到危险区域。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY, '猛犸从召唤到冲刺的等待决定双方能否处理公共危险。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING, '召唤和冲刺路径必须有明确预警，否则无法归因自伤或被击。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '连续冲刺的覆盖不是一次攻击范围，必须记录路径占用。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '攻击结束和恢复物出现之间要有可读的重新进入窗口。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN, '大范围公共危险需要有明确再次使用限制。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一次带公开路径的短时公共危险；不迁移自伤、治疗物和复杂资源系统到首个生产版本。',
  },
  {
    id: 'mammoth-meat-recovery',
    input: '拾取猛犸肉',
    context: 'resource',
    officialFact: '猛犸攻击结束后在地面留下猛犸肉，最多可食用三次，每次回复 5HP。',
    designPurpose: '研究攻击结果如何留下局内次级目标，让战斗结束后的路线和风险继续影响下一次交锋。',
    playerDecision: '立刻回收恢复物，还是放弃恢复物保留边缘和战斗位置；资源不应成为无条件奖励。',
    counterplay: '在恢复物附近保持威胁、逼迫使用者离开，或利用其停留动作抢回路线；资源点要能被双方理解。',
    failureCost: '为了恢复物回到危险落点会再次丢失位置，资源收益与地图风险必须同时展示。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY, '恢复物出现时间决定攻击结束后是否还有重新选择窗口。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING, '资源出现位置和可拾取状态必须被明确反馈。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN, '恢复物使用次数和再次产生条件需要与战斗循环分开记录。', 'research-only'),
    ]),
    arenaMinimumVersion: '首轮只记录“攻击后出现一个可争夺资源点”，不直接迁移治疗数值和三次使用规则。',
  },
];

const caseStudy: ArenaV2WeaponMammothStoneAxeCaseStudy = {
  referenceId: 'mammoth-stone-axe',
  referenceName: '猛犸石斧',
  sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=775',
  productionAssetStatus: 'research-only',
  battleThesis: '猛犸石斧的核心不是单次重击，而是把预判落点、蓄力覆盖、滚动路线、墙面反弹和公共危险叠在地图几何上；玩家要学习的是“什么时候让对手必须走位”，而不是只记住一把大斧的伤害。',
  designReasons: Object.freeze([
    '延迟落斧把即时输入和最终命中位置分离，形成稳定的预判学习目标。',
    '地面蓄力用覆盖和控制结果区分档位，而不是只提高伤害。',
    '滚动物体让武器在不贴身时也能改变路线。',
    '跑动撞击把墙面和支撑面纳入命中后果，避免地图只是背景。',
    '猛犸召唤把高回报改成敌我共同承担的公共危险。',
    '猛犸肉说明战斗结果可以留下短期争夺目标，但这属于后续成长研究，不应直接塞入首个生产版本。',
  ]),
  moves: Object.freeze(moves.map((move) => Object.freeze({
    ...move,
    numericReview: Object.freeze([...move.numericReview]),
  }))),
  minimumVersion: Object.freeze({
    coreVerb: '预判落点并改变路线',
    contexts: Object.freeze(['ground', 'running', 'charged', 'delayed', 'resource'] as const),
    requiredPublicAxes: Object.freeze([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE,
    ]),
    notToCopy: Object.freeze([
      'MP 资源和原作属性改变',
      '三档复杂蓄力与原作特殊判定',
      '自动墙面反弹和必然追加攻击',
      '召唤自伤、治疗物和三次恢复规则',
      '原武器名称、动作资产和伤害数值',
    ]),
  }),
};

export const ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY = Object.freeze(caseStudy);
