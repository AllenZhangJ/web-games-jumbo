import { ARENA_V2_WEAPON_PUBLIC_AXIS_ID } from './arena-v2-weapon-public-axis-contract.js';
import {
  createArenaV2WeaponCaseStudyNumericReview as numeric,
  type ArenaV2WeaponCaseStudy,
  type ArenaV2WeaponCaseStudyMove,
} from './arena-v2-weapon-case-study-contract.js';

export type ArenaV2WeaponTrueHadesHookScytheCaseStudy = ArenaV2WeaponCaseStudy & {
  readonly referenceId: 'true-hades-hook-scythe';
  readonly referenceName: '真·哈迪斯钩镰';
};

const moves: readonly ArenaV2WeaponCaseStudyMove[] = [
  {
    id: 'double-slash-launch',
    input: 'XX',
    context: 'ground',
    officialFact: '先横挥大镰，再上挑，官方说明标注为暴击浮空效果。',
    designPurpose: '用短距离的两段节奏把普通接近转换成垂直落点变化，让基础动作也能改变路线。',
    playerDecision: '在近身距离提交两段攻击，还是只用第一段试探后撤退。',
    counterplay: '在第一段后改变距离或高度，迫使第二段上挑落空；不要把被第一段触碰等同于必然浮空。',
    failureCost: '第二段承诺使攻击者继续靠近，挥空后需要承担更长收招和边缘位置风险。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE, '近身浮空动作的成立距离必须和远程武器分开比较。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '两段之间的形成时间决定对手能否在中间离开。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL, '第二段的主要回报是改变高度，不是单纯增加伤害。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '上挑空放后需要明确的可惩罚时间。', 'must-measure'),
    ]),
    arenaMinimumVersion: '短距离两段攻击，第二段改变垂直落点；不迁移暴击伤害和原连招。',
  },
  {
    id: 'three-slash-ground-pressure',
    input: 'CCC',
    context: 'ground',
    officialFact: '连续三次横斩，最后一段带有刃击痉挛和倒地效果。',
    designPurpose: '提供低复杂度的近身持续压力，让玩家学习在命中确认后是否继续完成动作。',
    playerDecision: '继续完成第三段取得倒地，还是在前两段后改变位置避免把自己留在原地。',
    counterplay: '利用连段间隙后退或跳跃，诱导最后一段挥空；目标被击倒后必须给出明确的重返路线。',
    failureCost: '连续输入越长，越容易在目标已离开后继续承诺；第三段不是免费安全收尾。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES, '连续攻击需要区分每一段有效时间，而不是只显示一条总攻击线。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '连段结束后的恢复影响对手能否反抢。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL, '痉挛和倒地必须分别投影为控制时间与结果。', 'must-measure'),
    ]),
    arenaMinimumVersion: '固定三段近战节奏，第三段产生短控制；不引入复杂拆招树。',
  },
  {
    id: 'turning-running-slash',
    input: 'DX',
    context: 'running',
    officialFact: '跑动中回转身体横斩，官方说明标注为旋转倒地效果。',
    designPurpose: '让跑动攻击覆盖接近路径和侧向关系，而不是只沿角色正面直线命中。',
    playerDecision: '用跑动横切穿过目标，还是停下使用更稳定的近身动作。',
    counterplay: '保持距离、改变侧向位置或让攻击者旋转后离开安全支撑面；正面站定并不等于唯一答案。',
    failureCost: '跑动横切会扩大自身位移，错过目标后更容易越过边缘或进入对手身后。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '侧向横切的价值来自覆盖形状，不能只展示正面距离。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT, '跑动攻击必须把自身位移作为风险展示。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT, '旋转倒地改变的是目标位置和支撑面关系。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '越过目标后的恢复决定是否可以继续追击。', 'must-measure'),
    ]),
    arenaMinimumVersion: '跑动横切 + 方向性击倒，保留自身位移和失位风险；不复制原角色属性。',
  },
  {
    id: 'rebound-blade',
    input: 'VXC',
    context: 'aerial',
    officialFact: '空中横挥后向下发出刀光，刀光触地反弹；向下阶段造成击倒，反弹后造成暴击浮空。',
    designPurpose: '把支撑面变成动作的一部分：同一次空中提交根据是否触地产生两套不同的高度结果。',
    playerDecision: '选择直接压低目标，还是利用触地反弹换取第二高度威胁。',
    counterplay: '改变支撑面、离开刀光下落线或在第一阶段结束前抢占安全落点；不能只看攻击者朝向。',
    failureCost: '第一阶段落点错误时，反弹不会替玩家修正几何；空中动作还会减少下一次跳跃调整空间。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP, '向下命中与反弹命中的高度条件必须分开测量。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL, '反弹后浮空是动作的主要空间回报。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE, '刀光触地位置决定横向落点压力。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '触地失败后必须保留可观察的空中恢复成本。', 'must-measure'),
    ]),
    arenaMinimumVersion: '一个受支撑面影响的两阶段空中动作；先验证触地/反弹差异，不迁移暴击和复杂空中连击。',
  },
  {
    id: 'fixed-nonlethal-charge',
    input: 'DXC',
    context: 'charged',
    officialFact: '短暂蓄力后向前冲击，官方说明标注破防、固定伤害、没有致死判定，并带有无敌时间。',
    designPurpose: '用高承诺动作制造一次强制状态转换，同时保留“命中但不能直接结束”的后续决策。',
    playerDecision: '接受短蓄力暴露换取强制命中，还是继续用普通动作保持位置和节奏。',
    counterplay: '在蓄力或前冲阶段离开直线，诱导其空放，并在无敌结束后的恢复阶段反抢。',
    failureCost: '高承诺动作空放会同时丢失距离、时间和资源；强保护不能覆盖错误预判。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '短蓄力长度决定对手是否有可靠反应。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT, 'Arena 需要把“固定伤害”转译为明确的横向位置结果。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '无敌结束后的收招是核心反制窗口。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT, '前冲会改变攻击者自身的边缘关系。', 'must-measure'),
    ]),
    arenaMinimumVersion: '短蓄力直线冲入 + 非致死的固定位置转换；不复制破防、无敌和原伤害系统。',
  },
  {
    id: 'multi-stage-launch',
    input: 'ZXC',
    context: 'ground',
    officialFact: '横挥命中后产生连续刀光，再由死亡之影将目标强力浮空。',
    designPurpose: '把一次命中拆成确认、持续命中和最终垂直结果，让玩家必须读到前段是否成立。',
    playerDecision: '用高回报多阶段动作追求边缘淘汰，还是选择短动作避免把自己锁在追击流程里。',
    counterplay: '在第一段未命中时离开攻击线；若第一段成立，则用支撑面和落点恢复准备下一次交锋。',
    failureCost: '多阶段动作的后段不应在前段挥空时自动追踪，否则玩家看不到真正的命中门槛。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '前段确认时间决定对手能否离开多阶段链。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES, '连续刀光必须显示每阶段的有效时间。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL, '最终浮空是路线结果，不能只写成高伤害。', 'must-measure'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL, '前后段控制时间要分开记录，避免伪造无条件连击。', 'must-measure'),
    ]),
    arenaMinimumVersion: '命中确认后的一次垂直派生，前段空放时后段取消；不迁移自动追击连招。',
  },
  {
    id: 'charged-counter',
    input: 'XC反击',
    context: 'counter',
    officialFact: '蓄力向前发动强力一击，官方说明标注为高空击飞、长无敌时间和破防。',
    designPurpose: '展示原作如何用防守/反击状态提供高回报，但这部分不应直接进入 Arena，因为本项目已明确不做格挡。',
    playerDecision: '研究层只观察“等待对手主动”如何形成高回报，不把它作为 Arena 可操作系统。',
    counterplay: '原作可通过不主动撞入或骗出反击回应；Arena 对应问题转成读招反制候选的等待/假动作，而非防御键。',
    failureCost: '没有对手主动动作时，反击投资不会产生空间收益；高保护也不应成为无条件先手。',
    numericReview: Object.freeze([
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP, '反击的等待承诺需要与主动攻击分开测量。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL, '高空击飞是研究结果，不是 Arena 直接复制的防御回报。', 'research-only'),
      numeric(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY, '等待失败后的恢复仍然是读招候选的必要成本。', 'must-measure'),
    ]),
    arenaMinimumVersion: '只迁移等待/假动作/承诺窗口的读招语法；不迁移格挡、破防和反击键。',
  },
];

const caseStudy: ArenaV2WeaponTrueHadesHookScytheCaseStudy = {
  referenceId: 'true-hades-hook-scythe',
  referenceName: '真·哈迪斯钩镰',
  sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=526',
  productionAssetStatus: 'research-only',
  battleThesis: '真·哈迪斯钩镰的核心不是“镰刀更强”，而是让支撑面、阶段命中、前冲位置和非致死高承诺共同决定一次攻击的价值；同一输入在不同地面/空中关系下产生不同答案。',
  designReasons: Object.freeze([
    '基础两段和三段动作建立近身确认与垂直落点。',
    '跑动横斩把自身移动和侧向覆盖绑定，形成错身与失位风险。',
    '触地反弹让地图支撑面参与命中结果，而不是只做背景。',
    '短蓄力非致死冲击把命中结果转成后续位置决策，而不是直接结束战斗。',
    '多阶段浮空要求前段命中确认，避免后段成为无条件追踪。',
    '反击动作只作为原作设计证据，不进入 Arena 的操作合同。',
  ]),
  moves: Object.freeze(moves.map((move) => Object.freeze({
    ...move,
    numericReview: Object.freeze([...move.numericReview]),
  }))),
  minimumVersion: Object.freeze({
    coreVerb: '利用支撑面换位并改变高度',
    contexts: Object.freeze(['ground', 'running', 'aerial', 'charged'] as const),
    requiredPublicAxes: Object.freeze([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COOLDOWN,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
    ]),
    notToCopy: Object.freeze([
      '格挡和反击键',
      '破防与无敌同时存在',
      '固定伤害和原作生命系统',
      '自动派生追击',
      '原武器名称、动作资产和资源规则',
    ]),
  }),
};

export const ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY = Object.freeze(caseStudy);
