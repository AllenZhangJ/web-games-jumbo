import {
  PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
  ProductMessageCatalog,
} from './product-message-catalog.js';
import {
  ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1,
} from './arena-v2-control-learning-copy-candidate-v1.js';

interface ArenaV2WeaponInformationCopyV1 {
  readonly name: string;
  readonly learningProblem: string;
  readonly groundResult: string;
  readonly aerialResult: string;
}

const ARENA_V2_WEAPON_INFORMATION_COPY_V1 = Object.freeze({
  'charge-shield': Object.freeze({
    name: '冲锋盾',
    learningProblem: '用自我位移换取推人距离，同时避免冲出安全边缘。',
    groundResult: '地面向前冲入并推开路线上的目标。',
    aerialResult: '空中向下切入，落地时制造短距离推离。',
  }),
  'heavy-hammer': Object.freeze({
    name: '重锤',
    learningProblem: '用明显前摇换取高击退，并承担挥空后的长恢复。',
    groundResult: '地面正面重击，制造最高的一次性水平击退。',
    aerialResult: '空中下砸覆盖落点，命中后把目标推离平台。',
  }),
  'gravity-chain': Object.freeze({
    name: '引力锁链',
    learningProblem: '用长距离拉扯改写站位，但必须提前承诺瞄准方向。',
    groundResult: '从远处拉回直线上的目标，打乱双方前后顺序。',
    aerialResult: '跨越高度差向下拉取目标，创造落点冲突。',
  }),
  'line-suppressor': Object.freeze({
    name: '线性压制器',
    learningProblem: '用细长判定封锁路线，同时接受侧移即可避开的弱点。',
    groundResult: '短前摇压住一条长直线，持续干扰窄路进入。',
    aerialResult: '在空中封锁一条较窄通道，迫使对手改线。',
  }),
  'read-counter': Object.freeze({
    name: '读招反击器',
    learningProblem: '读准对手出手后再释放，过早离开蓄势会失去收益。',
    groundResult: '在地面完成蓄势后惩罚接近或挥空的对手。',
    aerialResult: '在空中守住一条路线并于落地前释放反击。',
  }),
  'flank-blade': Object.freeze({
    name: '侧袭刃',
    learningProblem: '依靠背面角度制造优势，失败时暴露在正面反制中。',
    groundResult: '从目标背面快速切入，改变平台入口的站位关系。',
    aerialResult: '跨越高度差完成背面切击，适合追击转身目标。',
  }),
  'hook-spear': Object.freeze({
    name: '钩索长枪',
    learningProblem: '把拉取距离推到更远，但窄判定更怕横向躲避。',
    groundResult: '沿路线边缘发出细长拉取，命中后把目标带回。',
    aerialResult: '跨高度斜向拉取目标，破坏其落点选择。',
  }),
  'burst-gauntlet': Object.freeze({
    name: '爆发拳套',
    learningProblem: '用极快短击抢先手，但必须贴近才能产生有效位移。',
    groundResult: '在对手站稳前打出快速短推。',
    aerialResult: '落地前释放小范围爆发，快速打断但击退较弱。',
  }),
  'vault-lance': Object.freeze({
    name: '跃台长枪',
    learningProblem: '把自身位移用于跨台进攻，距离判断错误会直接越界。',
    groundResult: '跨过一个平台入口并推开正面的目标。',
    aerialResult: '承诺更长的向下切入路线，换取空中追击距离。',
  }),
  'scatter-cannon': Object.freeze({
    name: '散射炮',
    learningProblem: '用宽覆盖占住中距离，但每次出手后的空档更长。',
    groundResult: '宽幅覆盖中距离路线一个节拍。',
    aerialResult: '扫过较宽空中入口，但单次击退低于重型武器。',
  }),
  'sky-anchor': Object.freeze({
    name: '天坠锚',
    learningProblem: '控制垂直落点和下方空间，但在地面横向威胁有限。',
    groundResult: '守住高度转换下方，阻止对手直接落入安全区。',
    aerialResult: '强力向下切入，以垂直击退换取较小水平位移。',
  }),
  'edge-scythe': Object.freeze({
    name: '边缘镰',
    learningProblem: '在边缘获得宽扫优势，但在平台中心难以形成终结。',
    groundResult: '横扫单侧边缘，以中等力量扩大危险区。',
    aerialResult: '覆盖边缘落点弧线，限制对手的回台方向。',
  }),
  'rebound-hook': Object.freeze({
    name: '回拉钩',
    learningProblem: '近距离快速拉换位，挥空时会把主动权交给对手。',
    groundResult: '快速近拉并反转双方相对顺序。',
    aerialResult: '把目标拉到自己下方，制造落点碰撞。',
  }),
  'pulse-baton': Object.freeze({
    name: '脉冲棍',
    learningProblem: '靠高频打断保持压力，但单次位移不足以直接终结。',
    groundResult: '反复打断窄路入口，不让敌人轻易站稳。',
    aerialResult: '轻点空中路线，保留机动而不封死整条通道。',
  }),
  'siege-axe': Object.freeze({
    name: '攻城斧',
    learningProblem: '追求最大击退，必须接受所有人都能看见的长前摇。',
    groundResult: '完成明显蓄力后打出最大地面推离。',
    aerialResult: '制造大型落点威胁，命中强但恢复时间很长。',
  }),
  'twin-fan': Object.freeze({
    name: '双风扇',
    learningProblem: '用大范围软压制换取路线控制，但终结能力较弱。',
    groundResult: '同时压住两个路线角度，迫使对手绕行。',
    aerialResult: '短暂守住宽空中走廊，为自己争取落点。',
  }),
  'diving-claw': Object.freeze({
    name: '俯冲爪',
    learningProblem: '空中侧袭能力突出，但地面正面对抗距离不足。',
    groundResult: '以小幅地面侧袭为下一次跳跃创造角度。',
    aerialResult: '跨高度完成强力空中侧袭，攻击转身中的目标。',
  }),
  'route-bow': Object.freeze({
    name: '路线弓',
    learningProblem: '获得最长直线射程，但判定很细且冷却明显。',
    groundResult: '争夺视野中最长的直线路线。',
    aerialResult: '在落地前压住一条细长空中线路。',
  }),
  'pivot-blade': Object.freeze({
    name: '回身刃',
    learningProblem: '用快速回身攻击背面，但必须持续阅读对手朝向。',
    groundResult: '在平台入口快速回身切击目标背面。',
    aerialResult: '跨高度时完成短距离背面切击。',
  }),
  'commitment-fist': Object.freeze({
    name: '蓄势拳',
    learningProblem: '用较短蓄势换取稳定惩罚，提前退出仍会失去时机。',
    groundResult: '以较低力量完成更短、更灵活的蓄势惩罚。',
    aerialResult: '守住一条空中路线并在落地前主动释放。',
  }),
} satisfies Readonly<Record<string, ArenaV2WeaponInformationCopyV1>>);

const ARENA_V2_KZ_SEGMENT_INFORMATION_COPY_V1 = Object.freeze([
  Object.freeze({ name: '起步平台', lesson: '先建立方向与跳跃的最短操作闭环。' }),
  Object.freeze({ name: '定向断层', lesson: '起跳前承诺方向，并在空中做一次小修正。' }),
  Object.freeze({ name: '节奏阶梯', lesson: '用连续三步建立稳定跳跃节奏。' }),
  Object.freeze({ name: '双路迷宫', lesson: '在快速暴露线和安全恢复线之间做选择。' }),
  Object.freeze({ name: '窄路校正', lesson: '在受攻击风险下进行微小方向校正。' }),
  Object.freeze({ name: '长线钢丝', lesson: '选择稳定折线或更快、更暴露的钢丝路线。' }),
  Object.freeze({ name: '重置平台', lesson: '在第二轮难度抬升前恢复节奏与朝向。' }),
  Object.freeze({ name: '高差阶梯', lesson: '在连续上升中维持节奏并处理高度变化。' }),
  Object.freeze({ name: '高位迷宫', lesson: '在高位分岔中再次权衡速度和恢复空间。' }),
  Object.freeze({ name: '长断层', lesson: '完成全图最长的一次方向承诺与空中修正。' }),
  Object.freeze({ name: '压力窄路', lesson: '在长跳后立即切换到高精度微调。' }),
  Object.freeze({ name: '终局钢丝', lesson: '综合路线阅读、节奏和边缘控制完成终局选择。' }),
] as const);

const ARENA_V2_KZ_SWITCHBACK_SEGMENT_INFORMATION_COPY_V1 = Object.freeze([
  Object.freeze({ name: '回折起步台', lesson: '建立朝东起跑和第一次跳跃的稳定节拍。' }),
  Object.freeze({ name: '东向长跳', lesson: '在起跳前完成方向承诺，尽量落在平台中心。' }),
  Object.freeze({ name: '上行三阶', lesson: '以三次递增高差练习上行跳跃节奏。' }),
  Object.freeze({ name: '北转窄道', lesson: '在狭窄支撑面上完成九十度转向和微调。' }),
  Object.freeze({ name: '西向钢丝', lesson: '突然反转行进方向，在长钢丝上抵抗攻击干扰。' }),
  Object.freeze({ name: '下行三阶', lesson: '下行时不追求过度加速，保留下一跳的稳定朝向。' }),
  Object.freeze({ name: '北向再跳', lesson: '在下行节奏后立即切换为跨缺口的长跳。' }),
  Object.freeze({ name: '西侧收官', lesson: '在终点前保留侧向空间，应对最后一次推离。' }),
] as const);

function createArenaV2ConcreteInformationMessagesV1(): Readonly<Record<string, string>> {
  const messages: Record<string, string> = {
    'arena.v2.map.kz-base.name': 'KZ 十二段竞技路线',
    'arena.v2.map.kz-switchback.name': '回折八段竞技路线',
  };
  for (const [weaponId, copy] of Object.entries(ARENA_V2_WEAPON_INFORMATION_COPY_V1)) {
    messages[`arena.v2.weapon.${weaponId}.name`] = copy.name;
    messages[`arena.v2.weapon.${weaponId}.learning-problem`] = copy.learningProblem;
    messages[`arena.v2.weapon.${weaponId}.ground-result`] = copy.groundResult;
    messages[`arena.v2.weapon.${weaponId}.aerial-result`] = copy.aerialResult;
  }
  ARENA_V2_KZ_SEGMENT_INFORMATION_COPY_V1.forEach((copy, index) => {
    const ordinal = String(index + 1).padStart(2, '0');
    messages[`arena.v2.map.kz-base.segment-${ordinal}.name`] = copy.name;
    messages[`arena.v2.map.kz-base.segment-${ordinal}.lesson`] = copy.lesson;
  });
  ARENA_V2_KZ_SWITCHBACK_SEGMENT_INFORMATION_COPY_V1.forEach((copy, index) => {
    const ordinal = String(index + 1).padStart(2, '0');
    messages[`arena.v2.map.kz-switchback.segment-${ordinal}.name`] = copy.name;
    messages[`arena.v2.map.kz-switchback.segment-${ordinal}.lesson`] = copy.lesson;
  });
  return Object.freeze(messages);
}

export const ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1 = new ProductMessageCatalog({
  schemaVersion: PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
  id: 'arena.v2.information.messages.zh-CN.candidate.v1',
  contentVersion: 10,
  locale: 'zh-CN',
  messages: {
    'arena.v2.screen.loading.question': '正在把竞技场准备好',
    'arena.v2.screen.home.question': '下一局想挑战什么？',
    'arena.v2.screen.mode-select.question': '这一局要比什么？',
    'arena.v2.screen.character-select.question': '选择哪种操作风格？',
    'arena.v2.screen.match-prep.question': '如何赢下这一局？',
    'arena.v2.screen.survival-prep.question': '如何坚持得更久？',
    'arena.v2.screen.weapon-index.question': '下一把要熟悉哪件武器？',
    'arena.v2.screen.weapon-detail.question': '这把武器什么时候最强？',
    'arena.v2.screen.map-index.question': '下一张地图要熟悉哪条路线？',
    'arena.v2.screen.map-detail.question': '这张地图的关键路线是什么？',
    'arena.v2.screen.result-reward.question': '这局之后最值得做什么？',

    'arena.v2.action.retry-loading': '重新加载',
    'arena.v2.action.choose-mode': '选择模式',
    'arena.v2.action.start-selected-mode': '开始这一局',
    'arena.v2.action.save-character': '使用这个角色',
    'arena.v2.action.start-match': '开始竞技',
    'arena.v2.action.start-survival': '开始生存',
    'arena.v2.action.open-weapon': '查看这把武器',
    'arena.v2.action.use-weapon-next-match': '选择模式',
    'arena.v2.action.open-map': '查看这张地图',
    'arena.v2.action.use-map-next-match': '选择模式',
    'arena.v2.action.play-again-or-next': '继续下一个目标',

    'arena.v2.screen.loading.announcement': '竞技场正在加载。',
    'arena.v2.screen.home.announcement': '已进入首页，可以在两次主要点击内开始一局。',
    'arena.v2.screen.mode-select.announcement': `请选择一对一、竞速或生存模式。所有角色只使用${ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.spokenControlText}。${ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.platformControlAccessibilityText}一对一和竞速会携带当前武器与地图；生存只使用当前地图并空手开局。`,
    'arena.v2.screen.character-select.announcement': `请选择角色。角色只改变操作手感，仍然只使用${ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.spokenControlText}。${ARENA_V2_CONTROL_LEARNING_COPY_CANDIDATE_V1.platformControlAccessibilityText}`,
    'arena.v2.screen.match-prep.announcement': '竞技准备已就绪。',
    'arena.v2.screen.survival-prep.announcement': '生存准备已就绪，开局默认没有武器。',
    'arena.v2.screen.weapon-index.announcement': '已进入武器收藏。',
    'arena.v2.screen.weapon-detail.announcement': '已进入武器详情。',
    'arena.v2.screen.map-index.announcement': '已进入地图收藏。',
    'arena.v2.screen.map-detail.announcement': '已进入地图详情。',
    'arena.v2.screen.result-reward.announcement': '本局结果、本局推进和下一个目标已更新。',

    'arena.v2.navigation.start': '开始',
    'arena.v2.navigation.weapons': '武器',
    'arena.v2.navigation.maps': '地图',
    'arena.v2.navigation.records': '记录',

    'arena.v2.field.asset-progress': '加载进度',
    'arena.v2.field.input-summary': '基础操作',
    'arena.v2.field.recovery-status': '恢复状态',
    'arena.v2.field.load-diagnostic': '加载说明',
    'arena.v2.field.next-goal': '下一个目标',
    'arena.v2.field.last-mode': '上次模式',
    'arena.v2.field.quick-start': '快速开始',
    'arena.v2.field.recent-records': '记录总览',
    'arena.v2.field.mode-objective': '模式目标',
    'arena.v2.field.participant-count': '参与人数',
    'arena.v2.field.record-type': '记录方式',
    'arena.v2.field.character-entry': '角色选择',
    'arena.v2.field.preparation-entry': '对局准备',
    'arena.v2.field.selected-character': '当前角色',
    'arena.v2.field.handling-summary': '操作特点',
    'arena.v2.field.movement-difference': '移动差异',
    'arena.v2.field.character-record': '角色记录',
    'arena.v2.character.balanced.name': '均衡者',
    'arena.v2.character.balanced.handling-summary': '速度、加速、跳跃和空中修正全部采用基准值',
    'arena.v2.character.balanced.movement-difference': '适合第一次游玩，也适合用同一基准比较不同武器。',
    'arena.v2.character.sprint.name': '追风者',
    'arena.v2.character.sprint.handling-summary': '直线跑速与地面加速更高，空中修正略弱',
    'arena.v2.character.sprint.movement-difference': '擅长长直道抢位，但起跳后改变落点需要更早决定。',
    'arena.v2.character.air-control.name': '领航者',
    'arena.v2.character.air-control.handling-summary': '空中修正更强，地面极速略低',
    'arena.v2.character.air-control.movement-difference': '适合断层、走钢丝和受击后的落点挽救。',
    'arena.v2.character.high-jump.name': '弹簧仔',
    'arena.v2.character.high-jump.handling-summary': '跳跃高度更高，地面速度与加速略低',
    'arena.v2.character.high-jump.movement-difference': '更容易跨过高低差，但连续平面路线会损失少量速度。',
    'arena.v2.character.quick-start.name': '急先锋',
    'arena.v2.character.quick-start.handling-summary': '更早进入奔跑且起步加速更快，极速略低',
    'arena.v2.character.quick-start.movement-difference': '适合迷宫、楼梯和频繁变向的短节奏路线。',
    'arena.v2.character.forgiving.name': '稳步者',
    'arena.v2.character.forgiving.handling-summary': '跳跃输入与离地容错更宽，地面速度较低',
    'arena.v2.character.forgiving.movement-difference': '适合初学窄路与边缘起跳，用速度换稳定。',
    'arena.v2.field.mode-goal': '获胜目标',
    'arena.v2.field.map-rule': '地图规则',
    'arena.v2.field.weapon-entry': '武器入口',
    'arena.v2.field.map-entry': '地图入口',
    'arena.v2.field.weapon-map-plan': '本局练法',
    'arena.v2.field.unarmed-start': '开局装备',
    'arena.v2.field.supply-timing': '武器供给',
    'arena.v2.field.fall-rule': '掉落规则',
    'arena.v2.field.pressure-summary': '敌人压力',
    'arena.v2.field.best-survival-record': '最佳生存',
    'arena.v2.field.owned-progress': '收藏进度',
    'arena.v2.field.next-unowned': '武器研究目标',
    'arena.v2.field.practice-target': '熟练目标',
    'arena.v2.field.all-weapon-records': '全部武器记录',
    'arena.v2.field.range-coverage': '距离与覆盖',
    'arena.v2.field.timing-risk': '时机与风险',
    'arena.v2.field.ground-aerial': '核心打法',
    'arena.v2.field.counter-inputs': '反制方式',
    'arena.v2.field.map-consequences': '地图后果',
    'arena.v2.field.weapon-record': '武器记录',
    'arena.v2.field.segment-progress': '路线收藏',
    'arena.v2.field.next-map': '路线目标',
    'arena.v2.field.mode-coverage': '可用模式',
    'arena.v2.field.all-map-records': '全部地图记录',
    'arena.v2.field.route-goal': '路线目标',
    'arena.v2.field.hazard-summary': '路线骨架',
    'arena.v2.field.best-record': '最佳记录',
    'arena.v2.field.full-route': '完整路线',
    'arena.v2.field.weapon-consequences': '武器影响',
    'arena.v2.field.mode-records': '模式记录',
    'arena.v2.field.match-result': '本局结果',
    'arena.v2.field.earned-progress': '本局推进',
    'arena.v2.field.reward-breakdown': '经验明细',
    'arena.v2.field.full-match-record': '完整对局记录',
    'arena.v2.field.collection-change': '阶段与收藏',

    'arena.v2.reason.loading': '仍在加载',
    'arena.v2.reason.selection-required': '请先完成选择',
    'arena.v2.reason.content-unavailable': '内容暂不可用',
    'arena.v2.reason.match-busy': '当前对局仍在进行',
    'arena.v2.reason.resync-required': '正在同步权威状态',
    'arena.v2.reason.restart-required': '结算确认需要重启恢复',

    'arena.v2.verb.push': '推离',
    'arena.v2.verb.pull': '拉取',
    'arena.v2.verb.charge': '突进',
    'arena.v2.verb.suppress': '压制',
    'arena.v2.verb.counter': '反击',
    'arena.v2.verb.flank': '侧袭',
    'arena.v2.counter.direction': '改变方向',
    'arena.v2.counter.jump': '跳跃离开',
    'arena.v2.risk.long-recovery': '挥空后恢复较长',
    'arena.v2.risk.aim-commitment': '出手前必须承诺瞄准方向',
    'arena.v2.risk.self-overshoot': '自身位移可能越过安全边缘',
    'arena.v2.risk.landing-commitment': '空中出手会承诺落点',
    'arena.v2.risk.narrow-coverage': '覆盖窄，横向移动可避开',
    'arena.v2.risk.hold-commitment': '蓄势期间会暴露行动意图',
    'arena.v2.risk.position-dependent': '效果依赖边缘、朝向或高度位置',
    'arena.v2.retry.long-recovery': '确认对手进入有效范围后再出手，并给恢复阶段留出安全位置',
    'arena.v2.retry.aim-commitment': '先用方向对准对手路线，再按主攻击承诺出手',
    'arena.v2.retry.self-overshoot': '从更安全的平台内侧起手，避免自身位移冲出边缘',
    'arena.v2.retry.landing-commitment': '先确认可落支撑面，再在空中按主攻击',
    'arena.v2.retry.narrow-coverage': '先用方向对齐对手移动路线，再释放窄判定',
    'arena.v2.retry.hold-commitment': '缩短无效蓄势，等对手进入路线后再松开主攻击',
    'arena.v2.retry.position-dependent': '先移动到武器擅长的边缘、朝向或高度位置再出手',
    'arena.v2.map-situation.edge': '边缘',
    'arena.v2.map-situation.narrow-path': '窄路',
    'arena.v2.map-situation.height-transition': '高度变化',
    'arena.v2.map-situation.platform-entry': '平台入口',
    'arena.v2.map-situation.gap': '断层',
    'arena.v2.map-situation.open-platform': '开阔平台',
    'arena.v2.segment-kind.basic-platform': '基础平台',
    'arena.v2.segment-kind.gap': '断层',
    'arena.v2.segment-kind.stairs': '阶梯',
    'arena.v2.segment-kind.maze': '迷宫',
    'arena.v2.segment-kind.narrow-path': '窄路',
    'arena.v2.segment-kind.wire': '钢丝',
    'arena.v2.survival-role.safe': '安全重整',
    'arena.v2.survival-role.pressure': '持续压力',
    'arena.v2.survival-role.choice': '路线选择',
    'arena.v2.survival-role.recovery': '失败恢复',
    'arena.v2.hit-recovery.same-segment': '本段恢复',
    'arena.v2.hit-recovery.adjacent-segment': '相邻段恢复',
    'arena.v2.hit-recovery.respawn-anchor': '安全锚点重生',
    'arena.v2.response.hold': '停住',
    'arena.v2.response.strafe': '横向移动',
    'arena.v2.response.jump': '跳跃',

    ...createArenaV2ConcreteInformationMessagesV1(),
  },
});

export const ARENA_V2_INFORMATION_PRESENTATION_CONTENT_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultNavigationWired: false as const,
  formalVisualAssetsReady: false as const,
  messageCatalog: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
  contentHash: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.getContentHash(),
});
