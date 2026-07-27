export type ArenaV2WeaponOfficialActionContext =
  | 'ground'
  | 'running'
  | 'aerial'
  | 'charged'
  | 'delayed'
  | 'counter'
  | 'after-hit'
  | 'resource';

export interface ArenaV2WeaponOfficialActionPattern {
  readonly id: string;
  readonly input: string;
  readonly context: ArenaV2WeaponOfficialActionContext;
  readonly observableOutcome: string;
  readonly mapMeaning: string;
  readonly failureCost: string;
}

export interface ArenaV2WeaponOfficialEvidence {
  readonly referenceId: string;
  readonly sourceUrl: string;
  readonly observedSignals: readonly Readonly<{
    readonly id: string;
    readonly value: string;
    readonly meaning: string;
  }>[];
  readonly actionPatterns: readonly ArenaV2WeaponOfficialActionPattern[];
  readonly arenaLesson: string;
}

export const ARENA_V2_WEAPON_OFFICIAL_EVIDENCE: readonly ArenaV2WeaponOfficialEvidence[] = Object.freeze([
  {
    referenceId: 'magic-blood-scythe',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=793',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'trap-duration', value: 'about-20-seconds', meaning: '陷阱不是瞬时命中，而是持续占据路线。' }),
      Object.freeze({ id: 'charge-levels', value: 'three-levels', meaning: '蓄力层级改变段数、击飞和风险回报。' }),
      Object.freeze({ id: 'auto-target', value: 'ground-target', meaning: '自动寻找目标会显著降低位置判断成本。' }),
      Object.freeze({ id: 'super-armor', value: 'high-charge-only', meaning: '高层级承诺被强表现和强结果保护。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'medium-line-projectile',
        input: 'ZC',
        context: 'ground',
        observableOutcome: '中距离直线魔轮，可形成多次命中。',
        mapMeaning: '长直线和窄路入口可以被提前压住。',
        failureCost: '目标已经离开线后，投射物不再提供即时回报。',
      }),
      Object.freeze({
        id: 'foot-trap-conversion',
        input: 'ZX',
        context: 'delayed',
        observableOutcome: '先命中或制造脚下陷阱，再产生击飞。',
        mapMeaning: '同一落点同时拥有即时威胁和持续封路价值。',
        failureCost: '陷阱放错位置会占用资源，却不一定命中目标。',
      }),
    ]),
    arenaLesson: 'Arena 只保留公开预警、短时持续和一个可比较的蓄力档位，不同时迁移自动锁定、无限堆叠和超级护甲。',
  },
  {
    referenceId: 'phantom-tiger-fist',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=546',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'charge-flashes', value: 'two-flashes', meaning: '蓄力阶段给玩家可读的承诺节点。' }),
      Object.freeze({ id: 'charge-cancel', value: 'auto-cancel-after-limit', meaning: '错过释放时机不会无限等待。' }),
      Object.freeze({ id: 'turn-during-charge', value: 'direction-can-change', meaning: '蓄力不是静态站桩，方向本身也是决策。' }),
      Object.freeze({ id: 'counter-reward', value: 'high-launch', meaning: '成功读招的回报必须明显高于普通先手。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'counter-timing',
        input: 'ZX',
        context: 'counter',
        observableOutcome: '对手主动命中时触发高击飞回应。',
        mapMeaning: '边缘对峙时，等待比无脑先手更有价值。',
        failureCost: '对手不出招时，蓄力时间换不到空间收益。',
      }),
      Object.freeze({
        id: 'charged-direction-commitment',
        input: 'ZXC-XC',
        context: 'charged',
        observableOutcome: '蓄力节点后释放突进，成功时高空摔落。',
        mapMeaning: '窄路或边缘把高回报命中转成明确的淘汰威胁。',
        failureCost: '错过释放窗口会自动取消并暴露位置。',
      }),
    ]),
    arenaLesson: '读招反制应研究蓄力、取消、方向更新和高击飞回报；不迁移真正格挡、破防和无敌的叠加。',
  },
  {
    referenceId: 'white-platinum-dual-guns',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=329',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'fire-modes', value: 'point-burst-spread', meaning: '同一武器用覆盖形状改变空间压力。' }),
      Object.freeze({ id: 'movement-contexts', value: 'ground-running-aerial', meaning: '跑动和空中不是换皮动作，而是不同的安全距离。' }),
      Object.freeze({ id: 'resource-cost', value: 'per-shot-cost', meaning: '连续压制必须承担可见的再次使用成本。' }),
      Object.freeze({ id: 'close-range-falloff', value: 'melee-vulnerability', meaning: '远程收益必须有被贴身后的明确反答案。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'ground-burst',
        input: 'X-X',
        context: 'ground',
        observableOutcome: '向前连续点射，攻击线清晰且可预判。',
        mapMeaning: '宽平台和长直线让保持距离成为主要收益。',
        failureCost: '贴身后远程动作的空间收益迅速下降。',
      }),
      Object.freeze({
        id: 'aerial-horizontal-sweep',
        input: '空中XC',
        context: 'aerial',
        observableOutcome: '空中水平扫射，改变落点附近的横向压力。',
        mapMeaning: '高低差和落点选择成为远程武器的第二层学习。',
        failureCost: '空中资源消耗后，落地前缺少再次调整机会。',
      }),
    ]),
    arenaLesson: '直线压制先只保留一种投射形状，再用冷却和贴身反制形成学习曲线，不同时引入多种瞄准模式。',
  },
  {
    referenceId: 'blood-blade',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=2204',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'rear-attack', value: 'target-relative-facing', meaning: '背后是目标朝向关系，不是扩大正面范围。' }),
      Object.freeze({ id: 'damage-duration', value: 'about-15-seconds', meaning: '持续威胁和即时命中是两条不同时间轴。' }),
      Object.freeze({ id: 'trap-duration', value: 'about-12-seconds', meaning: '陷阱持续时间会改变路线价值。' }),
      Object.freeze({ id: 'directional-summon', value: 'behind-target', meaning: '攻击发生的位置本身就是武器价值。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'rear-cone-conversion',
        input: '背后命中动作',
        context: 'ground',
        observableOutcome: '只在目标背后关系成立时产生方向性结果。',
        mapMeaning: '分叉和绕后空间比单纯增加攻击距离更重要。',
        failureCost: '正面交换能力不稳定，位置错了就失去主要价值。',
      }),
      Object.freeze({
        id: 'delayed-foot-threat',
        input: '脚下召唤',
        context: 'delayed',
        observableOutcome: '命中后留下持续的脚下威胁。',
        mapMeaning: '目标的下一步路线会被迫重新选择。',
        failureCost: '持续威胁不能替代第一次命中的方向判断。',
      }),
    ]),
    arenaLesson: '绕后只先迁移目标朝向和方向性击退；持续伤害、陷阱持续时间和背后召唤必须分别研究，不能合成一个“不可防御”属性。',
  },
  {
    referenceId: 'blood-shadow-hook-blade',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=1109',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'pull-to-front', value: 'target-relative-reposition', meaning: '拉位结果是双方相对位置的改变。' }),
      Object.freeze({ id: 'obstruction-failure', value: 'physical-obstacle-can-break', meaning: '地图几何可以成为明确反制，而不是装饰。' }),
      Object.freeze({ id: 'horizontal-control', value: 'forced-horizontal-pull', meaning: '控制方向必须在数值和命中结果中公开。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'front-pull',
        input: '钩镰命中',
        context: 'ground',
        observableOutcome: '命中后把双方相对距离改写为拉近。',
        mapMeaning: '边缘附近的“拉回”和“拉出”必须由支撑面决定。',
        failureCost: '障碍物或错误距离会让换位动作空放。',
      }),
      Object.freeze({
        id: 'obstacle-break',
        input: '穿越路径',
        context: 'ground',
        observableOutcome: '实体阻挡可以切断或削弱拉位结果。',
        mapMeaning: '地图几何成为真实反制，而不是装饰背景。',
        failureCost: '直线被挡住时，武器不能只凭高数值强行成立。',
      }),
    ]),
    arenaLesson: '换位武器需要把阻挡、距离和目标相对位置纳入地图验证，不应只显示“拉回”文案。',
  },
  {
    referenceId: 'red-demon-claw',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=729',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'running-float', value: 'forward-running-launch', meaning: '跑动攻击把接触距离和浮空结果绑定在一起。' }),
      Object.freeze({ id: 'aerial-dive', value: 'downward-approach', meaning: '空中动作不是地面连击的换皮，而是另一条接近路径。' }),
      Object.freeze({ id: 'commit-cancel', value: 'charged-super-armor-with-cancel', meaning: '高承诺动作必须同时给出保护、取消和失败空档。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'running-launch',
        input: '跑X',
        context: 'running',
        observableOutcome: '前进过程中挑空并保留追击窗口。',
        mapMeaning: '窄路追击时，移动本身就是攻击范围的一部分。',
        failureCost: '跑动方向错误会把自己带进对手近身范围。',
      }),
      Object.freeze({
        id: 'charged-claw-commitment',
        input: '跑XC',
        context: 'charged',
        observableOutcome: '蓄力后连续挑起并摔落目标。',
        mapMeaning: '边缘附近的命中回报来自位置变化，而不是单纯伤害。',
        failureCost: '蓄力空放会消耗追击机会并暴露恢复时间。',
      }),
      Object.freeze({
        id: 'aerial-downward-claw',
        input: '空中X',
        context: 'aerial',
        observableOutcome: '向斜下方快速下降并扩大接触面。',
        mapMeaning: '高低差和跳跃时机决定能否把接近转成命中。',
        failureCost: '下降后落点固定，错过目标时恢复路径有限。',
      }),
    ]),
    arenaLesson: '先迁移跑动接近、空中下切和一次高承诺追击，保留移动风险；不把多段连招、无敌旋转和复杂派生一起搬入。',
  },
  {
    referenceId: 'true-hades-hook-scythe',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=526',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'rebound-projectile', value: 'ground-to-air-rebound', meaning: '落点反弹让同一动作跨越地面和空中两个回应窗口。' }),
      Object.freeze({ id: 'guard-break', value: 'short-charge-break', meaning: '破防是状态转换条件，不应直接当作高伤害标签。' }),
      Object.freeze({ id: 'fixed-damage', value: 'non-lethal-fixed-damage', meaning: '固定伤害与击落/致死结果可以被明确拆开。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'rebound-blade',
        input: 'VXC',
        context: 'aerial',
        observableOutcome: '刀光先向下命中，再从地面反弹形成第二高度关系。',
        mapMeaning: '高低差和支撑面会改变同一动作的命中阶段。',
        failureCost: '第一段没有命中时，第二段不会自动补偿错误落点。',
      }),
      Object.freeze({
        id: 'short-charge-break',
        input: 'DXC',
        context: 'charged',
        observableOutcome: '短蓄力后前冲，破防并产生固定伤害。',
        mapMeaning: '防守站位和边缘距离共同决定是否值得提交。',
        failureCost: '破防动作空放后，前冲和收招会留下可惩罚窗口。',
      }),
    ]),
    arenaLesson: '把反弹、破防条件和非致死固定结果拆为独立字段；不迁移无敌突进、破防和高击飞的全套叠加。',
  },
  {
    referenceId: 'true-thor-hammer',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=802',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'marked-delay', value: 'three-mark-sequential-lightning', meaning: '标记把预警时间变成可学习的落点序列。' }),
      Object.freeze({ id: 'chain-targeting', value: 'up-to-three-targets', meaning: '多目标不是单纯范围变大，还包含命中顺序和反馈身份。' }),
      Object.freeze({ id: 'directional-mobility', value: 'invisible-free-movement', meaning: '自身移动状态会改变攻击风险和回到安全面的能力。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'marked-lightning',
        input: 'DXC 蓄力',
        context: 'delayed',
        observableOutcome: '先留下多个标记，再按顺序落雷。',
        mapMeaning: '路线交汇处可以通过预警顺序逼迫玩家移动。',
        failureCost: '标记放错位置会让对手有足够时间离开。',
      }),
      Object.freeze({
        id: 'chain-lightning',
        input: 'ZXC',
        context: 'resource',
        observableOutcome: '首个目标命中后按顺序连锁其他目标，后续效果递减。',
        mapMeaning: '多目标反馈需要区分首个目标和被连锁目标。',
        failureCost: '需要资源与目标聚集，单目标或分散站位会降低价值。',
      }),
    ]),
    arenaLesson: '先研究标记落点、顺序反馈和目标身份，不把自动锁定、连锁三人和无敌状态直接当作生产规则。',
  },
  {
    referenceId: 'mammoth-stone-axe',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=775',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'delayed-axe-drop', value: 'about-three-second-drop', meaning: '落点攻击把输入时刻和危险生效时刻分开。' }),
      Object.freeze({ id: 'charge-branches', value: 'three-ground-attack-branches', meaning: '蓄力改变覆盖和控制结果，而不只是改变伤害。' }),
      Object.freeze({ id: 'rolling-object', value: 'ground-rolling-coin', meaning: '武器可以用移动物体改变路线，而不必直接贴身。' }),
      Object.freeze({ id: 'wall-rebound', value: 'wall-contact-follow-up', meaning: '墙面和目标落点决定命中后是否存在二次追击。' }),
      Object.freeze({ id: 'shared-danger', value: 'summon-can-hurt-owner', meaning: '高回报召唤同时给使用者风险，必须形成敌我共同的公开危险。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'delayed-axe-drop',
        input: 'ZC',
        context: 'delayed',
        observableOutcome: '约 3 秒后从空中落下，命中后先短暂控制再倒地。',
        mapMeaning: '长直线、窄路和固定落点可以成为预判空间。',
        failureCost: '目标提前离开后，攻击者损失等待时间和下一次尝试。',
      }),
      Object.freeze({
        id: 'charged-ground-slam',
        input: 'ZX-X',
        context: 'charged',
        observableOutcome: '蓄力对应三种地面攻击，并可击倒前方范围内目标。',
        mapMeaning: '覆盖宽度会改变目标能否从侧面绕开。',
        failureCost: '蓄力越久，目标越容易走出前方区域。',
      }),
      Object.freeze({
        id: 'rolling-coin-pressure',
        input: '转一圈XC',
        context: 'ground',
        observableOutcome: '地面滚动物体向前移动，命中后产生暴击击飞。',
        mapMeaning: '滚动路线可以压住窄路入口和边缘落点。',
        failureCost: '方向固定，目标改变高度或侧移后可以避开。',
      }),
      Object.freeze({
        id: 'running-wall-rebound',
        input: '跑XC',
        context: 'running',
        observableOutcome: '跑动撞击后将目标击向墙面，并可能产生弹回追击。',
        mapMeaning: '墙面、边缘和目标初始位置共同决定动作价值。',
        failureCost: '目标没有碰到墙时，跑动攻击只承担自身失位和收招。',
      }),
      Object.freeze({
        id: 'mammoth-shared-danger',
        input: 'ZXC',
        context: 'delayed',
        observableOutcome: '猛犸连续冲刺，未躲开时使用者自己也会受伤。',
        mapMeaning: '召唤路径是双方共同处理的公共危险。',
        failureCost: '错判会同时损失自身状态、位置和后续恢复机会。',
      }),
    ]),
    arenaLesson: '先迁移落点预警、蓄力覆盖、滚动路线和墙面后果；不把三档复杂派生、自伤、治疗物和 MP 规则整体复制到生产。',
  },
  {
    referenceId: 'phantom-tiger-rotary-staff',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=1375',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'hit-buff-duration', value: 'ten-second-refreshing-buff', meaning: '命中后短时状态改变后续动作节奏。' }),
      Object.freeze({ id: 'hit-gated-branch', value: 'follow-up-requires-hit', meaning: '派生不是免费按钮，而是对前一次命中的奖励。' }),
      Object.freeze({ id: 'transition-exposure', value: 'invulnerable-start-exposed-landing', meaning: '短暂安全与落地暴露同时存在，形成真实风险交换。' }),
    ]),
    actionPatterns: Object.freeze([
      Object.freeze({
        id: 'tempo-buff',
        input: '带★动作命中',
        context: 'after-hit',
        observableOutcome: '命中后十秒内缩短普通攻击间隔，重复命中只刷新时间。',
        mapMeaning: '先手命中会改变后续节奏，而非只结算一次击退。',
        failureCost: '没有先拿到命中，后续动作不会获得额外节奏。',
      }),
      Object.freeze({
        id: 'hit-gated-air-branch',
        input: 'X 后 XC',
        context: 'after-hit',
        observableOutcome: '只有前段命中后才能派生升空追击，变招短暂安全但落地暴露。',
        mapMeaning: '边缘和高低差决定派生后的恢复是否安全。',
        failureCost: '前段挥空时不能强行派生，错误追击会暴露落地位置。',
      }),
    ]),
    arenaLesson: '把“命中后短时节奏状态”和“命中门槛派生”作为独立成长语法研究，不引入复杂连段树。',
  },
] as const);
