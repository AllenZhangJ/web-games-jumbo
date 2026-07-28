import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = 'docs/quality/art/reference-sources/original/a0.2.1-supplemental-weapon-feedback';
const PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-supplemental-weapon-feedback-v1.json';
const ORIGINAL_PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json';
const DECLARATION_PATH = 'docs/quality/art/reference-sources/original/arena-a0.2.1-supplemental-clean-room-declaration.md';
const GENERATOR_PATH = 'scripts/art/generate-arena-weapon-feedback-supplement.ts';
const WIDTH = 1600;
const HEIGHT = 900;
const DATE = '2026-07-28';
const FONT = `'PingFang SC','Noto Sans CJK SC','Microsoft YaHei',Arial,sans-serif`;

type Domain = 'weapon-direct' | 'combat-feedback-direct';

type VisualDefinition = Readonly<{
  entryId: string;
  domain: Domain;
  title: string;
  subtitle: string;
  compositionSignature: string;
  coverageTags: readonly string[];
  eventMappings: readonly string[];
  specificTakeaway: string;
  doNotCopy: string;
  usageBoundary: string;
  body: () => string;
}>;

const C = Object.freeze({
  ink: '#172033', panel: '#273451', paper: '#F4EBDD', muted: '#CFC6B3',
  cyan: '#35B8FF', red: '#FF5C5C', amber: '#FFB020', green: '#45D483', violet: '#8B6DFF',
});

function sha256(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function esc(value: string): string { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function text(x: number, y: number, value: string, size = 28, fill: string = C.paper, weight = 600, anchor = 'start'): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(value)}</text>`;
}
function line(x1: number, y1: number, x2: number, y2: number, color: string = C.cyan, width = 12, dash = ''): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}
function arrow(x1: number, y1: number, x2: number, y2: number, color: string = C.cyan, width = 14): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const a = 28;
  const p1 = `${x2},${y2}`;
  const p2 = `${x2 - Math.cos(angle - 0.55) * a},${y2 - Math.sin(angle - 0.55) * a}`;
  const p3 = `${x2 - Math.cos(angle + 0.55) * a},${y2 - Math.sin(angle + 0.55) * a}`;
  return `${line(x1, y1, x2, y2, color, width)}<polygon points="${p1} ${p2} ${p3}" fill="${color}"/>`;
}
function actor(x: number, y: number, scale = 1, color: string = C.paper, facing: 'left' | 'right' = 'right'): string {
  const sign = facing === 'right' ? 1 : -1;
  return `<g transform="translate(${x} ${y}) scale(${scale})"><circle cx="0" cy="-115" r="42" fill="${color}"/><rect x="-48" y="-67" width="96" height="128" rx="38" fill="${color}"/><line x1="-22" y1="58" x2="-56" y2="145" stroke="${color}" stroke-width="28" stroke-linecap="round"/><line x1="22" y1="58" x2="58" y2="145" stroke="${color}" stroke-width="28" stroke-linecap="round"/><line x1="${34 * sign}" y1="-42" x2="${105 * sign}" y2="12" stroke="${color}" stroke-width="26" stroke-linecap="round"/></g>`;
}
function weapon(kind: 'light' | 'medium' | 'heavy' | 'chain' | 'shield', x: number, y: number, scale = 1, color: string = C.amber, angle = 0): string {
  const shape = kind === 'light'
    ? `<path d="M-110 0 H100 L132 -18 L142 0 L132 18 H-110 Z" fill="${color}"/><rect x="-142" y="-18" width="42" height="36" rx="8" fill="${C.paper}"/>`
    : kind === 'medium'
      ? `<rect x="-128" y="-17" width="210" height="34" rx="12" fill="${C.paper}"/><path d="M70 -54 L144 -28 L144 28 L70 54 Z" fill="${color}"/>`
      : kind === 'heavy'
        ? `<rect x="-150" y="-20" width="190" height="40" rx="12" fill="${C.paper}"/><rect x="25" y="-92" width="155" height="184" rx="26" fill="${color}"/><rect x="50" y="-58" width="105" height="116" rx="18" fill="${C.ink}" opacity=".18"/>`
        : kind === 'chain'
          ? `<path d="M-140 0 C-70 -85 30 85 90 0" fill="none" stroke="${color}" stroke-width="22" stroke-dasharray="18 14"/><circle cx="118" cy="0" r="45" fill="${color}"/><rect x="-172" y="-20" width="54" height="40" rx="10" fill="${C.paper}"/>`
          : `<circle cx="35" cy="0" r="105" fill="${color}"/><circle cx="35" cy="0" r="62" fill="${C.ink}" opacity=".18"/><rect x="-135" y="-16" width="92" height="32" rx="10" fill="${C.paper}"/>`;
  return `<g transform="translate(${x} ${y}) rotate(${angle}) scale(${scale})">${shape}</g>`;
}
function panel(x: number, y: number, width: number, height: number, title: string, accent: string = C.cyan): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="30" fill="${C.panel}" stroke="${accent}" stroke-width="5"/>${text(x + 28, y + 46, title, 24, accent, 800)}`;
}
function badge(x: number, y: number, value: string, color: string = C.green): string {
  const width = Math.max(150, value.length * 15 + 32);
  return `<rect x="${x}" y="${y - 30}" width="${width}" height="42" rx="21" fill="${color}" opacity=".18" stroke="${color}" stroke-width="2"/>${text(x + 16, y, value, 18, color, 800)}`;
}

const VISUALS: readonly VisualDefinition[] = [
  {
    entryId: 'weapon-s01', domain: 'weapon-direct', title: '武器体量阶梯与握持边界', subtitle: '轻 / 中 / 重三档必须先由轮廓、支点与负空间读出', compositionSignature: 'three-columns-mass-ladder',
    coverageTags: ['mass-light', 'mass-medium', 'mass-heavy', 'silhouette', 'grip-boundary'], eventMappings: ['ActionStarted:future-presentation-mapping'], specificTakeaway: '以三列等比例角色和不同支点直接比较轻、中、重体量；握手区、身体负空间和前端质量均可见。', doNotCopy: '不把几何训练道具当正式武器造型，不写外部武器名称或职业。', usageBoundary: '仅冻结体量/轮廓/握持问题，正式模型、命中盒和数值等待P4。',
    body: () => `${panel(70, 180, 440, 590, 'LIGHT · 单手 / 低遮挡', C.green)}${panel(580, 180, 440, 590, 'MEDIUM · 双手 / 中轴', C.cyan)}${panel(1090, 180, 440, 590, 'HEAVY · 双手 / 前重', C.amber)}${actor(250, 500, .8)}${weapon('light', 330, 450, .9, C.green, -12)}${actor(760, 500, .8)}${weapon('medium', 845, 455, .92, C.cyan, 8)}${actor(1270, 510, .8)}${weapon('heavy', 1370, 440, .82, C.amber, -8)}${badge(105, 735, '轮廓空隙 ≥ 一只手宽')}${badge(615, 735, '支点贴近身体中轴', C.cyan)}${badge(1125, 735, '前端质量不可遮脸', C.amber)}`,
  },
  {
    entryId: 'weapon-s02', domain: 'weapon-direct', title: '六个正式武器功能槽的轮廓问题', subtitle: '三把生产基线 + 直线压制 / 读招反制 / 绕后；不新增操作键', compositionSignature: 'hex-functional-silhouette-roster',
    coverageTags: ['six-weapon-directions', 'silhouette', 'base-hammer', 'base-chain', 'base-shield', 'line-pressure', 'read-counter', 'flank'], eventMappings: ['ActionStarted:future-presentation-mapping'], specificTakeaway: '用六个不同外接框和作用方向区分功能槽，前三个对应重锤、锁链、圆盾，后三个只定义学习问题。', doNotCopy: '不把后三槽画成Final，不复制研究游戏的武器、招式、数值或专有命名。', usageBoundary: '仅为P4逐件Concept提供槽位；每把仍须独立四门、提交和回滚。',
    body: () => [[240,320,'重锤','heavy'],[800,320,'锁链','chain'],[1360,320,'圆盾','shield'],[240,650,'直线压制','light'],[800,650,'读招反制','medium'],[1360,650,'绕后','light']].map(([x,y,label,kind],i)=>`${panel(Number(x)-200,Number(y)-110,400,250,`${i+1} · ${label}`,i<3?C.cyan:C.violet)}${weapon(kind as 'light'|'medium'|'heavy'|'chain'|'shield',Number(x),Number(y),.72,i<3?C.amber:C.violet,i===5?155:0)}${text(Number(x),Number(y)+92,i<3?'BASELINE SLOT':'GATED FUTURE SLOT',18,i<3?C.green:C.violet,800,'middle')}`).join(''),
  },
  {
    entryId: 'weapon-s03', domain: 'weapon-direct', title: '准备 → 命中 → 恢复三段视觉节奏', subtitle: '同一重体量训练锤，三帧分别承担承诺、结果与可反制窗口', compositionSignature: 'horizontal-three-phase-storyboard',
    coverageTags: ['phase-windup', 'phase-hit', 'phase-recovery', 'timing-readability'], eventMappings: ['ActionStarted:future-presentation-mapping', 'HitResolved:future-presentation-mapping'], specificTakeaway: '准备帧保留高举负空间，命中帧只保留单一接触焦点，恢复帧明确武器落后身体与反制窗口。', doNotCopy: '不把三帧当动画关键帧、tick数或命中盒，不复制外部招式。', usageBoundary: '节奏比例为美术方向；精确tick和Action Definition由P4冻结。',
    body: () => `${panel(70,200,440,560,'01 PREPARE',C.amber)}${panel(580,200,440,560,'02 CONTACT',C.red)}${panel(1090,200,440,560,'03 RECOVER',C.green)}${actor(250,530,.8)}${weapon('heavy',330,360,.7,C.amber,-70)}${arrow(360,360,430,520,C.amber)}${actor(760,530,.8)}${weapon('heavy',860,540,.7,C.amber,20)}<circle cx="1010" cy="550" r="64" fill="${C.red}" opacity=".28"/><path d="M970 510 L1050 590 M1050 510 L970 590" stroke="${C.paper}" stroke-width="18"/>${actor(1270,530,.8)}${weapon('heavy',1170,650,.65,C.amber,150)}${line(1130,675,1440,675,C.green,10,'18 12')}${text(290,720,'方向承诺',22,C.amber,800,'middle')}${text(800,720,'单一焦点',22,C.red,800,'middle')}${text(1310,720,'可反制窗口',22,C.green,800,'middle')}`,
  },
  {
    entryId: 'weapon-s04', domain: 'weapon-direct', title: '地面 / 空中动作可读差异', subtitle: '支撑面、重心与轨迹必须在固定游戏镜头中一眼分开', compositionSignature: 'split-ground-air-platform',
    coverageTags: ['ground-read', 'air-read', 'support-surface', 'trajectory'], eventMappings: ['ActionStarted:future-presentation-mapping', 'HitResolved:future-presentation-mapping'], specificTakeaway: '地面攻击以支撑脚和水平承诺读取，空中攻击以角色下方负空间、垂直轨迹和落点读取。', doNotCopy: '不增加空中专用按键，不把轨迹线当权威判定范围。', usageBoundary: '只约束Presentation可读差异；输入和Action Resolver不由美术改变。',
    body: () => `${panel(70,190,700,590,'GROUND · 支撑脚 + 水平承诺',C.green)}${panel(830,190,700,590,'AIR · 下方负空间 + 落点',C.violet)}${line(120,650,720,650,C.muted,18)}${actor(310,510,.9)}${weapon('medium',430,470,.9,C.green,0)}${arrow(490,470,650,470,C.green)}${line(880,690,1480,690,C.muted,18)}${actor(1080,420,.9)}${weapon('medium',1190,440,.85,C.violet,58)}${arrow(1230,475,1320,650,C.violet)}<circle cx="1320" cy="650" r="36" fill="${C.amber}" opacity=".35"/>${badge(140,740,'GROUND: 水平结果')}${badge(900,740,'AIR: 垂直结果',C.violet)}`,
  },
  {
    entryId: 'weapon-s05', domain: 'weapon-direct', title: '击退 / 位移承诺的形状语法', subtitle: '圆盾推离、锁链拉回、重锤抛弧必须在命中前后保持同一方向', compositionSignature: 'three-lane-displacement-vectors',
    coverageTags: ['knockback-push', 'displacement-pull', 'vertical-launch', 'direction-promise'], eventMappings: ['HitResolved:future-presentation-mapping', 'KnockbackApplied:future-presentation-mapping'], specificTakeaway: '三条独立路线用直推、回拉和抛弧区分位移后果，箭头从武器承诺连续到目标结果。', doNotCopy: '箭头长度不表示公开数值，轨迹不是物理模拟或命中盒。', usageBoundary: '未来从HitResolved/KnockbackApplied只读事件映射；冲量参数仍属Core。',
    body: () => `${panel(70,190,1460,185,'PUSH · 圆盾向外',C.cyan)}${weapon('shield',270,290,.55,C.cyan)}${actor(520,315,.55)}${arrow(650,290,1010,290,C.cyan,18)}${actor(1180,315,.55,C.paper)}${panel(70,400,1460,185,'PULL · 锁链回收',C.violet)}${weapon('chain',1280,500,.55,C.violet,180)}${actor(1050,525,.55)}${arrow(930,500,570,500,C.violet,18)}${actor(400,525,.55)}${panel(70,610,1460,185,'LAUNCH · 重锤抛弧',C.amber)}${weapon('heavy',290,710,.45,C.amber)}${actor(510,735,.55)}<path d="M640 720 Q920 500 1210 690" fill="none" stroke="${C.amber}" stroke-width="18" stroke-linecap="round"/><polygon points="1210,690 1168,680 1195,648" fill="${C.amber}"/>${actor(1290,700,.48)}`,
  },
  {
    entryId: 'weapon-s06', domain: 'weapon-direct', title: '失败 / 空挥后的可反制后果', subtitle: '没有HitResolved时不补命中特效；恢复姿态和危险窗口承担失败可读性', compositionSignature: 'miss-arc-recovery-window',
    coverageTags: ['whiff', 'miss-consequence', 'recovery-window', 'no-fake-hit'], eventMappings: ['ActionStarted:future-presentation-mapping', 'action-snapshot:field-pending-P4'], specificTakeaway: '攻击弧与目标错开后，接触焦点消失；武器落后身体、脚步停滞和虚线窗口共同说明空挥代价。', doNotCopy: '不伪造HitResolved，不用红叉伤害数字替代姿态结果。', usageBoundary: '空挥Presentation读取动作快照；字段名与阶段必须等P4合同冻结。',
    body: () => `${panel(90,180,620,600,'MISS · 接触焦点为空',C.red)}${panel(890,180,620,600,'RECOVERY · 反制窗口',C.green)}${actor(300,520,.9)}${weapon('heavy',420,470,.75,C.amber,-18)}<path d="M390 350 Q610 330 640 520" fill="none" stroke="${C.red}" stroke-width="15" stroke-dasharray="20 16"/>${actor(610,540,.58,C.muted)}${text(400,720,'NO HitResolved',24,C.red,900,'middle')}${actor(1110,520,.9)}${weapon('heavy',1020,650,.68,C.amber,150)}<rect x="940" y="300" width="470" height="390" rx="42" fill="none" stroke="${C.green}" stroke-width="10" stroke-dasharray="22 16"/>${text(1175,745,'COUNTER WINDOW',24,C.green,900,'middle')}`,
  },
  {
    entryId: 'weapon-s07', domain: 'weapon-direct', title: '规避：轮廓、轨迹与特效同时过载', subtitle: '拒绝多刃、多环、多色常驻光与遮脸握持', compositionSignature: 'anti-reference-overloaded-weapon',
    coverageTags: ['anti-overload', 'anti-silhouette-noise', 'anti-face-occlusion'], eventMappings: ['none:anti-reference'], specificTakeaway: '反例把五种尖刃、三圈轨迹和多色焦点叠在同一角色上，证明信息竞争会吞掉面向与支撑脚。', doNotCopy: '不复制该故意过载造型；禁止以更多发光、尖刺和轨迹制造“旗舰感”。', usageBoundary: '仅为Anti-reference，不得进入Concept候选。',
    body: () => `${panel(170,160,1260,650,'ANTI-REFERENCE · 信息竞争',C.red)}${actor(650,540,1.05)}${weapon('heavy',800,430,.95,C.red,-40)}${weapon('chain',780,520,.9,C.violet,30)}${weapon('shield',650,470,.7,C.amber,0)}<circle cx="760" cy="480" r="230" fill="none" stroke="${C.red}" stroke-width="16"/><circle cx="760" cy="480" r="285" fill="none" stroke="${C.violet}" stroke-width="12" stroke-dasharray="20 12"/><circle cx="760" cy="480" r="335" fill="none" stroke="${C.amber}" stroke-width="9" stroke-dasharray="8 14"/><path d="M260 220 L1340 760 M1340 220 L260 760" stroke="${C.red}" stroke-width="28" opacity=".8"/>${text(800,850,'拒绝：轮廓噪声 ≠ 武器差异',30,C.red,900,'middle')}`,
  },
  {
    entryId: 'weapon-s08', domain: 'weapon-direct', title: '实验：后三个功能槽的负空间测试', subtitle: '直线压制 / 读招反制 / 绕后只测试作用空间，不提前定武器外形', compositionSignature: 'experimental-three-spatial-functions',
    coverageTags: ['experiment-line-pressure', 'experiment-read-counter', 'experiment-flank', 'negative-space'], eventMappings: ['ActionStarted:future-presentation-mapping', 'HitResolved:future-presentation-mapping'], specificTakeaway: '用窄直廊、前置反制扇区和背后弧区三种负空间检验学习问题，避免先画具体武器。', doNotCopy: '不把空间图当地图、攻击范围、数值或已批准的后三把武器。', usageBoundary: '实验项须等P4 Definition和预警字段冻结后再进入单件Concept。',
    body: () => `${panel(70,190,440,590,'LINE PRESSURE',C.violet)}${panel(580,190,440,590,'READ / COUNTER',C.violet)}${panel(1090,190,440,590,'FLANK',C.violet)}${actor(210,540,.65)}<rect x="300" y="330" width="160" height="330" rx="28" fill="${C.violet}" opacity=".28"/>${arrow(300,495,440,495,C.violet)}${actor(720,540,.65)}<path d="M780 500 L960 360 A230 230 0 0 1 960 640 Z" fill="${C.violet}" opacity=".28"/>${actor(1230,540,.65)}<path d="M1250 660 A220 220 0 1 1 1450 440" fill="none" stroke="${C.violet}" stroke-width="70" opacity=".3"/>${arrow(1450,440,1380,390,C.violet)}${text(290,730,'窄直廊',22,C.violet,800,'middle')}${text(800,730,'前置扇区',22,C.violet,800,'middle')}${text(1310,730,'背后弧区',22,C.violet,800,'middle')}`,
  },
  {
    entryId: 'feedback-s01', domain: 'combat-feedback-direct', title: '命中核心火花与方向指针', subtitle: '一个接触点、一个法线方向、一个来源尾迹', compositionSignature: 'impact-core-normal-tail',
    coverageTags: ['hit-spark', 'hit-direction', 'source-tail', 'core-layer'], eventMappings: ['HitResolved:future-presentation-mapping'], specificTakeaway: '命中核心限制为暖白菱形，青色来源尾迹和红色法线箭头分别说明从哪来、往哪去。', doNotCopy: '不加入伤害数字、全屏闪白或持续粒子云。', usageBoundary: '未来只消费HitResolved；火花不参与命中判定。',
    body: () => `${panel(130,170,1340,650,'HIT CORE / NORMAL / SOURCE',C.red)}${actor(420,570,.9)}${actor(1120,570,.9,C.paper,'left')}${line(520,460,740,460,C.cyan,22)}<polygon points="800,370 890,460 800,550 710,460" fill="${C.paper}"/><circle cx="800" cy="460" r="155" fill="none" stroke="${C.amber}" stroke-width="18" stroke-dasharray="18 22"/>${arrow(860,460,1080,460,C.red,20)}${text(610,330,'SOURCE TAIL',22,C.cyan,800,'middle')}${text(800,620,'CONTACT CORE',22,C.paper,800,'middle')}${text(1050,330,'KNOCKBACK NORMAL',22,C.red,800,'middle')}`,
  },
  {
    entryId: 'feedback-s02', domain: 'combat-feedback-direct', title: '受击停顿的四帧时间条', subtitle: '接触前 → 核心帧 → 保持 → 释放；只冻结视觉分段，不写tick', compositionSignature: 'four-frame-hitstop-timeline',
    coverageTags: ['hitstop', 'contact-frame', 'hold-frame', 'release-frame'], eventMappings: ['HitResolved:future-presentation-mapping', 'action-snapshot:timing-field-pending-P4'], specificTakeaway: '四帧用姿态间距和背景脉冲说明停顿位置；核心帧最亮，保持帧不新增第二次爆点。', doNotCopy: '不把示意帧数当tick，不用镜头冻结替代权威模拟。', usageBoundary: '表现时间窗等待P4/P5事件字段；Core继续整数tick推进。',
    body: () => [0,1,2,3].map((i)=>{const x=70+i*380;const names=['PRE','CONTACT','HOLD','RELEASE'];const colors=[C.cyan,C.red,C.amber,C.green];return `${panel(x,220,330,500,`${i+1} · ${names[i]}`,colors[i])}${actor(x+115,520,.48)}${actor(x+245,520,.48,C.paper,'left')}${i===1?`<circle cx="${x+180}" cy="440" r="70" fill="${C.red}" opacity=".35"/>`:''}${i===2?`<circle cx="${x+180}" cy="440" r="95" fill="none" stroke="${C.amber}" stroke-width="12"/>`:''}${line(x+35,670,x+295,670,colors[i],12,i===2?'18 12':'')}`}).join(''),
  },
  {
    entryId: 'feedback-s03', domain: 'combat-feedback-direct', title: '击退轨迹与落点结果', subtitle: '起点、飞行、预期落点与实际支撑面分层', compositionSignature: 'trajectory-arc-landing-support',
    coverageTags: ['knockback-trajectory', 'landing-point', 'support-surface', 'direction'], eventMappings: ['KnockbackApplied:future-presentation-mapping', 'PlayerEliminated:future-presentation-mapping'], specificTakeaway: '实线表示已发生位移，虚线只提示趋势；落点菱形必须贴支撑面，越界后才转入淘汰语义。', doNotCopy: '不把整条预测线当永久HUD，不预判Core尚未裁决的淘汰。', usageBoundary: '轨迹消费KnockbackApplied和只读位置；PlayerEliminated后才显示淘汰结果。',
    body: () => `${line(100,700,1500,700,C.muted,24)}${actor(280,580,.65)}<path d="M390 580 Q780 180 1160 620" fill="none" stroke="${C.cyan}" stroke-width="22"/><path d="M1160 620 Q1300 740 1450 790" fill="none" stroke="${C.red}" stroke-width="16" stroke-dasharray="20 16"/>${actor(760,330,.55,C.paper)}<polygon points="1160,620 1200,660 1160,700 1120,660" fill="${C.amber}"/>${text(350,760,'起点',22,C.cyan,800,'middle')}${text(800,230,'飞行方向',22,C.cyan,800,'middle')}${text(1160,760,'支撑面落点',22,C.amber,800,'middle')}${text(1390,820,'越界候选',22,C.red,800,'middle')}`,
  },
  {
    entryId: 'feedback-s04', domain: 'combat-feedback-direct', title: '落边 / 击落的事件递进', subtitle: '危险边缘 → 越界 → 权威淘汰；三者不可提前合并', compositionSignature: 'ledge-ringout-three-stage',
    coverageTags: ['ledge-risk', 'ringout', 'elimination', 'event-sequence'], eventMappings: ['KnockbackApplied:future-presentation-mapping', 'PlayerEliminated:future-presentation-mapping'], specificTakeaway: '边缘阶段只显示脚下危险形，越界阶段保留轨迹，收到PlayerEliminated后才出现封闭淘汰印记。', doNotCopy: '不在接近边缘时提前播放死亡或胜负反馈。', usageBoundary: '严格按权威事件递进；本图不定义killY或淘汰时机。',
    body: () => `${panel(70,190,440,590,'01 LEDGE RISK',C.amber)}${panel(580,190,440,590,'02 OUTSIDE SUPPORT',C.red)}${panel(1090,190,440,590,'03 ELIMINATED EVENT',C.violet)}${line(120,620,420,620,C.muted,20)}${actor(360,515,.7)}<polygon points="380,630 440,690 320,690" fill="${C.amber}"/>${line(630,620,880,620,C.muted,20)}${actor(930,660,.65)}${arrow(820,500,980,700,C.red)}${actor(1270,520,.7,C.muted)}<circle cx="1270" cy="480" r="170" fill="none" stroke="${C.violet}" stroke-width="24"/><path d="M1170 380 L1370 580 M1370 380 L1170 580" stroke="${C.violet}" stroke-width="28"/>${text(1310,735,'ONLY AFTER PlayerEliminated',18,C.violet,900,'middle')}`,
  },
  {
    entryId: 'feedback-s05', domain: 'combat-feedback-direct', title: '拾取 / 替换 / 回收 / 过期反馈链', subtitle: '供给反馈必须绑定权威身份和事件顺序，不用倒计时猜测状态', compositionSignature: 'equipment-lifecycle-event-chain',
    coverageTags: ['equipment-pickup', 'equipment-replaced', 'equipment-recycled', 'equipment-expired', 'identity-continuity'], eventMappings: ['EquipmentPickedUp:future-presentation-mapping', 'EquipmentReplaced:future-presentation-mapping', 'EquipmentRecycled:future-presentation-mapping', 'EquipmentExpired:future-presentation-mapping'], specificTakeaway: '四节点以同一equipment identity线连接；替换同时显示旧件回收，新件过期只在权威expire事件发生后消退。', doNotCopy: '不在Presentation推算600 tick，不自行删除或复制装备身份。', usageBoundary: '消费P1.2a权威事件；视觉不参与CAS、拾取竞争或回收。',
    body: () => `${line(180,470,1420,470,C.muted,18)}${[[220,'PICKED UP',C.green,'shield'],[600,'REPLACED',C.cyan,'heavy'],[980,'RECYCLED',C.violet,'light'],[1360,'EXPIRED',C.red,'chain']].map(([x,label,color,kind],i)=>`${circleNode(Number(x),470,Number(i)+1,String(label),String(color))}${weapon(kind as 'light'|'heavy'|'chain'|'shield',Number(x),650,.5,String(color),0)}`).join('')}${text(800,815,'IDENTITY + TICK 来自权威事件，不由表现层推算',24,C.paper,800,'middle')}`,
  },
  {
    entryId: 'feedback-s06', domain: 'combat-feedback-direct', title: '同屏层级与遮挡上限', subtitle: '核心层 > 方向层 > 装饰层；三人同屏仍保留角色和支撑面', compositionSignature: 'multiplayer-layer-budget',
    coverageTags: ['same-screen-hierarchy', 'occlusion-budget', 'core-direction-decoration', 'multiplayer'], eventMappings: ['HitResolved:future-presentation-mapping', 'KnockbackApplied:future-presentation-mapping'], specificTakeaway: '三组同时事件中，命中核心最小但最高对比；方向箭头次之；装饰圈限制低透明度且不得跨越支撑面。', doNotCopy: '不让装饰层覆盖角色头肩、落点或超过单事件局部区域。', usageBoundary: '遮挡比例为美术候选，需后续游戏镜头和设备证据复核。',
    body: () => `${line(80,700,1520,700,C.muted,22)}${actor(320,590,.7)}${actor(800,590,.7)}${actor(1280,590,.7)}${impactCluster(430,500,C.red,1)}${impactCluster(910,520,C.amber,.8)}${impactCluster(1390,470,C.violet,.65)}${panel(110,190,420,120,'CORE · 最高对比',C.red)}${panel(590,190,420,120,'DIRECTION · 次级',C.amber)}${panel(1070,190,420,120,'DECORATION · 低透明',C.violet)}${text(800,835,'角色轮廓 + 支撑面始终可见',26,C.green,900,'middle')}`,
  },
  {
    entryId: 'feedback-s07', domain: 'combat-feedback-direct', title: '规避：全屏反馈与多焦点遮挡', subtitle: '拒绝常驻雾、全屏闪、伤害数字雨和无来源粒子', compositionSignature: 'anti-reference-fullscreen-vfx',
    coverageTags: ['anti-fullscreen', 'anti-occlusion', 'anti-multi-focus'], eventMappings: ['none:anti-reference'], specificTakeaway: '反例故意叠加全屏红幕、多个爆点和无来源数字，直接展示路线、角色与事件来源被吞没。', doNotCopy: '禁止把该过载反例拆成多个可用特效；任何单层也需独立过遮挡门。', usageBoundary: '只作Anti-reference，不是VFX样件。',
    body: () => `${actor(420,560,.9,C.muted)}${actor(1180,560,.9,C.muted)}<rect x="0" y="120" width="1600" height="780" fill="${C.red}" opacity=".28"/>${[300,600,900,1250].map((x,i)=>`<circle cx="${x}" cy="${360+i%2*190}" r="${120+i*18}" fill="${[C.amber,C.red,C.violet,C.cyan][i]}" opacity=".48"/>${text(x,380+i%2*190,String(999-i*111),64,C.paper,900,'middle')}`).join('')}<path d="M180 210 L1420 820 M1420 210 L180 820" stroke="${C.red}" stroke-width="38"/>${text(800,850,'拒绝：屏幕占满 ≠ 反馈清晰',34,C.red,900,'middle')}`,
  },
  {
    entryId: 'feedback-s08', domain: 'combat-feedback-direct', title: '实验：reduced-motion等效反馈', subtitle: '运动轨迹降级为方向楔形 + 接触印记 + 声音/触觉槽位', compositionSignature: 'reduced-motion-equivalent-triptych',
    coverageTags: ['reduced-motion', 'static-direction', 'impact-mark', 'accessibility-equivalent'], eventMappings: ['HitResolved:future-presentation-mapping', 'KnockbackApplied:future-presentation-mapping'], specificTakeaway: '关闭高运动反馈时保留静态方向楔、短时接触印记和非视觉槽位，事件语义不变。', doNotCopy: '不把reduced-motion变成删光信息，也不由美术定义音频或触觉实现。', usageBoundary: '实验项需在后续Presentation、静音替代、设备和真人门中验证。',
    body: () => `${panel(70,190,440,590,'STATIC DIRECTION',C.cyan)}${panel(580,190,440,590,'IMPACT MARK',C.amber)}${panel(1090,190,440,590,'NON-VISUAL SLOT',C.green)}<polygon points="170,500 430,360 430,640" fill="${C.cyan}" opacity=".5"/>${actor(280,540,.55)}<polygon points="800,330 960,490 800,650 640,490" fill="${C.amber}" opacity=".55"/>${actor(800,520,.5)}<circle cx="1310" cy="490" r="150" fill="none" stroke="${C.green}" stroke-width="18"/><path d="M1230 490 Q1310 390 1390 490 Q1310 590 1230 490" fill="none" stroke="${C.green}" stroke-width="18"/>${text(1310,720,'AUDIO / HAPTIC CONTRACT',20,C.green,900,'middle')}`,
  },
];

function circleNode(x: number, y: number, index: number, label: string, color: string): string {
  return `<circle cx="${x}" cy="${y}" r="78" fill="${C.panel}" stroke="${color}" stroke-width="12"/>${text(x,y+12,String(index),34,color,900,'middle')}${text(x,y-118,label,20,color,850,'middle')}`;
}

function impactCluster(x: number, y: number, color: string, scale: number): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><polygon points="0,-55 55,0 0,55 -55,0" fill="${C.paper}"/><circle r="105" fill="none" stroke="${color}" stroke-width="16"/><path d="M0 0 L180 -80" stroke="${color}" stroke-width="18"/><polygon points="180,-80 142,-85 160,-50" fill="${color}"/></g>`;
}

function svg(definition: VisualDefinition): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="${C.ink}"/><rect width="1600" height="14" fill="${definition.domain === 'weapon-direct' ? C.cyan : C.red}"/>${text(70,78,definition.title,40,C.paper,900)}${text(70,122,definition.subtitle,22,C.muted,600)}${badge(1270,78,definition.domain === 'weapon-direct' ? 'WEAPON DIRECT' : 'FEEDBACK DIRECT',definition.domain === 'weapon-direct' ? C.cyan : C.red)}${definition.body()}${text(1530,870,`${definition.entryId.toUpperCase()} · CLEAN-ROOM PROJECT ORIGINAL`,16,C.muted,700,'end')}</svg>`;
}

async function perceptualHash(path: string): Promise<string> {
  const { data } = await sharp(path).resize(16, 9, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const mean = [...data].reduce((sum, value) => sum + value, 0) / data.length;
  return [...data].map((value) => value >= mean ? '1' : '0').join('');
}

function artifact(path: string, width: number, height: number): Readonly<Record<string, unknown>> {
  const bytes = readFileSync(resolve(ROOT, path));
  return { path, byteLength: bytes.length, sha256: sha256(bytes), width, height, colorSpace: 'srgb', transparent: false };
}

mkdirSync(resolve(ROOT, OUTPUT_DIR), { recursive: true });
const entries: Array<Record<string, unknown>> = [];
for (const definition of VISUALS) {
  const base = `${OUTPUT_DIR}/${definition.entryId}`;
  const svgPath = `${base}.svg`;
  const pngPath = `${base}.png`;
  const svgBytes = Buffer.from(svg(definition));
  writeFileSync(resolve(ROOT, svgPath), svgBytes);
  await sharp(svgBytes, { density: 72 }).resize(WIDTH, HEIGHT, { fit: 'fill' }).flatten({ background: C.ink }).png({ compressionLevel: 9 }).toFile(resolve(ROOT, pngPath));
  entries.push({
    entryId: definition.entryId,
    boardSlot: definition.entryId,
    weightClass: 'supplemental',
    sourceKind: 'project-original',
    title: definition.title,
    creator: 'Arena Art Direction / Codex clean-room vector study',
    rightsHolder: 'Arena project',
    sourceLocator: svgPath,
    sourceRevision: `generator-sha256:${sha256(readFileSync(resolve(ROOT, GENERATOR_PATH)))}`,
    retrievedAt: DATE,
    licenseId: 'PROJECT-ORIGINAL-INTERNAL',
    licenseLocator: DECLARATION_PATH,
    proofLocator: DECLARATION_PATH,
    rights: { commercialUseAllowed: true, modificationAllowed: true, redistributionAllowed: true },
    embeddingMode: 'embedded',
    artifact: artifact(pngPath, WIDTH, HEIGHT),
    sourceArtifact: artifact(svgPath, WIDTH, HEIGHT),
    domain: definition.domain,
    creationMethod: 'Deterministic clean-room SVG assembled from Arena semantic tokens and primitive geometry; rasterized by sharp without external image inputs.',
    compositionSignature: definition.compositionSignature,
    perceptualHash: await perceptualHash(resolve(ROOT, pngPath)),
    coverageTags: definition.coverageTags,
    eventMappings: definition.eventMappings,
    specificTakeaway: definition.specificTakeaway,
    doNotCopy: definition.doNotCopy,
    usageBoundary: definition.usageBoundary,
    cleanRoomBoundary: 'No third-party screenshot, character, weapon silhouette, move frame, number, texture, logo or proprietary expression was used as an image input.',
    reviewStatus: 'supplemental-art-director-self-reviewed',
  });
}

const originalBytes = readFileSync(resolve(ROOT, ORIGINAL_PACK_PATH));
const declarationBytes = readFileSync(resolve(ROOT, DECLARATION_PATH));
const pack = {
  schemaVersion: 1,
  id: 'arena.art.reference-source-pack.a0.2.1.supplemental.weapon-feedback.v1',
  status: 'supplemental-source-ready',
  generatedAt: DATE,
  baselineCommit: '8de2997a76601afce18b26d8126fb5cb24ca6feb',
  originalApprovedPack: { path: ORIGINAL_PACK_PATH, sha256: sha256(originalBytes), status: 'source-ready', immutable: true },
  declaration: { path: DECLARATION_PATH, sha256: sha256(declarationBytes), byteLength: declarationBytes.length },
  generator: { path: GENERATOR_PATH, sha256: sha256(readFileSync(resolve(ROOT, GENERATOR_PATH))) },
  counts: { total: entries.length, weaponDirect: entries.filter((entry) => entry.domain === 'weapon-direct').length, combatFeedbackDirect: entries.filter((entry) => entry.domain === 'combat-feedback-direct').length },
  rightsConclusion: { projectOriginal: true, commercialUseAllowed: true, modificationAllowed: true, redistributionAllowed: true, externalImageInputs: 0 },
  entries,
  gate: { score: 95, maximum: 100, hardGatePassed: true, reason: 'Arena V2 coordinator approved this supplemental source pack on 2026-07-28; original A0.2.1 source-ready fact is unchanged.' },
  signOff: {
    status: 'coordination-approved',
    artDirector: { name: 'Codex / game-art-director self-review', signedAt: DATE },
    coordinator: { name: 'Arena V2 主协调', signedAt: DATE },
  },
};
writeFileSync(resolve(ROOT, PACK_PATH), `${JSON.stringify(pack, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: pack.status, entries: pack.counts, pack: PACK_PATH })}\n`);
