export const ARENA_V2_WEAPON_OFFICIAL_EVIDENCE = Object.freeze([
  {
    referenceId: 'magic-blood-scythe',
    sourceUrl: 'https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=793',
    observedSignals: Object.freeze([
      Object.freeze({ id: 'trap-duration', value: 'about-20-seconds', meaning: '陷阱不是瞬时命中，而是持续占据路线。' }),
      Object.freeze({ id: 'charge-levels', value: 'three-levels', meaning: '蓄力层级改变段数、击飞和风险回报。' }),
      Object.freeze({ id: 'auto-target', value: 'ground-target', meaning: '自动寻找目标会显著降低位置判断成本。' }),
      Object.freeze({ id: 'super-armor', value: 'high-charge-only', meaning: '高层级承诺被强表现和强结果保护。' }),
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
    arenaLesson: '换位武器需要把阻挡、距离和目标相对位置纳入地图验证，不应只显示“拉回”文案。',
  },
] as const);

export type ArenaV2WeaponOfficialEvidence = typeof ARENA_V2_WEAPON_OFFICIAL_EVIDENCE[number];
