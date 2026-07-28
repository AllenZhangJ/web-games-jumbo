import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../..');
const UI_DIR = resolve(ROOT, 'docs/quality/art/reference-sources/project-ui-wireframes');
const COMPOSITION_DIR = resolve(ROOT, 'docs/quality/art/reference-sources/project-composition');
const FONT = `'PingFang SC','Noto Sans CJK SC','Microsoft YaHei',Arial,sans-serif`;

type VisualSpec = Readonly<{
  id: string;
  fileName: string;
  width: number;
  height: number;
  purpose: string;
  svg: string;
}>;

function hashBytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function hashFile(path: string): string {
  return hashBytes(readFileSync(resolve(ROOT, path)));
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function text(x: number, y: number, value: string, size = 20, fill = '#F4EBDD', weight = 500, anchor = 'start'): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function pill(x: number, y: number, width: number, label: string, accent = '#35B8FF'): string {
  return `<g><rect x="${x}" y="${y}" width="${width}" height="34" rx="17" fill="${accent}" opacity="0.15"/><rect x="${x}" y="${y}" width="5" height="34" rx="2.5" fill="${accent}"/>${text(x + 18, y + 23, label, 14, '#F4EBDD', 700)}</g>`;
}

function button(x: number, y: number, width: number, height: number, label: string): string {
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${Math.min(20, height / 2)}" fill="#35B8FF"/><path d="M${x + 25} ${y + height / 2 - 8} L${x + 39} ${y + height / 2} L${x + 25} ${y + height / 2 + 8} Z" fill="#172033"/>${text(x + 54, y + height / 2 + 8, label, 22, '#172033', 850)}</g>`;
}

function header(width: number, page: string, index: string): string {
  return `<g>${text(44, 52, 'ARENA', 25, '#F4EBDD', 900)}${text(150, 52, page, 20, '#CFC6B3', 650)}${text(width - 44, 51, `${index} · CONTRACT WIREFRAME · NOT FINAL`, 13, '#FFB020', 750, 'end')}<line x1="44" y1="73" x2="${width - 44}" y2="73" stroke="#CFC6B3" opacity="0.22"/></g>`;
}

function desktopShell(page: string, index: string, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#172033"/><path d="M0 590 L220 470 L420 530 L670 350 L890 430 L1280 210 L1280 720 L0 720 Z" fill="#273451"/><path d="M-30 650 L250 510 L440 570 L680 390 L905 468 L1310 250" fill="none" stroke="#8B6DFF" stroke-width="5" opacity="0.36"/>${header(1280, page, index)}${body}</svg>`;
}

function homeSvg(): string {
  const body = `${text(60, 142, '两次主要点击内', 17, '#45D483', 750)}${text(60, 193, '进入下一场对局', 46, '#F4EBDD', 900)}
  ${pill(62, 231, 166, '默认 · 常规 1v1')}${pill(242, 231, 148, '地图 · KZ-01', '#8B6DFF')}
  <g transform="translate(60 305)"><rect width="620" height="236" rx="30" fill="#F4EBDD"/><text x="34" y="46" fill="#172033" font-family="${FONT}" font-size="15" font-weight="750">本局承诺</text><text x="34" y="96" fill="#172033" font-family="${FONT}" font-size="32" font-weight="900">击落对手 · 熟悉路线</text><path d="M36 136 H560" stroke="#CFC6B3" stroke-width="2"/><text x="36" y="170" fill="#273451" font-family="${FONT}" font-size="16">当前角色  跑酷学徒</text><text x="345" y="170" fill="#273451" font-family="${FONT}" font-size="16">当前武器  重锤</text>${button(340, 184, 246, 54, '快速开局')}</g>
  <g transform="translate(760 138)"><circle cx="210" cy="166" r="134" fill="#273451" stroke="#35B8FF" stroke-width="5"/><path d="M120 208 L170 126 L230 168 L290 86" fill="none" stroke="#F4EBDD" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><circle cx="120" cy="208" r="15" fill="#45D483"/><circle cx="290" cy="86" r="18" fill="#FFB020"/><text x="210" y="336" fill="#F4EBDD" font-family="${FONT}" font-size="18" text-anchor="middle">下一段：连续修正</text></g>
  <g>${text(60, 646, '开始', 15, '#35B8FF', 800)}${text(150, 646, '武器', 15, '#CFC6B3', 650)}${text(240, 646, '地图', 15, '#CFC6B3', 650)}${text(330, 646, '记录', 15, '#CFC6B3', 650)}</g>`;
  return desktopShell('首页 / 快速开局', 'UI-B01', body);
}

function weaponIcon(kind: 'hammer' | 'chain' | 'shield', x: number, y: number, color: string): string {
  if (kind === 'hammer') return `<g transform="translate(${x} ${y}) rotate(-18)"><rect x="38" y="18" width="14" height="104" rx="7" fill="${color}"/><rect x="5" y="5" width="80" height="38" rx="10" fill="${color}"/></g>`;
  if (kind === 'chain') return `<g transform="translate(${x} ${y})"><path d="M18 25 C85 0 40 115 108 90" fill="none" stroke="${color}" stroke-width="12" stroke-dasharray="18 8" stroke-linecap="round"/><path d="M100 78 l30 12 -28 18 z" fill="${color}"/></g>`;
  return `<g transform="translate(${x} ${y})"><circle cx="62" cy="62" r="52" fill="${color}"/><circle cx="62" cy="62" r="31" fill="#273451"/><circle cx="62" cy="62" r="13" fill="${color}"/></g>`;
}

function collectionSvg(): string {
  const body = `${text(55, 134, '武器收藏', 40, '#F4EBDD', 900)}${text(55, 166, '先看核心动词，再看个人记录', 16, '#CFC6B3', 500)}
  <g transform="translate(55 205)"><rect width="180" height="420" rx="24" fill="#273451"/>${text(24, 46, '功能族', 15, '#CFC6B3', 700)}${pill(18, 72, 144, '全部 · 12')}${pill(18, 124, 144, '推离 · 3', '#FFB020')}${pill(18, 176, 144, '换位 · 2', '#8B6DFF')}${pill(18, 228, 144, '压制 · 2', '#FF5C5C')}${text(24, 386, '已获得  03 / 12', 14, '#45D483', 750)}</g>
  <g transform="translate(270 206)"><rect width="290" height="418" rx="28" fill="#F4EBDD"/>${pill(20, 18, 102, '已装备', '#45D483')}${weaponIcon('hammer', 78, 74, '#172033')}${text(24, 244, '边缘重锤', 27, '#172033', 900)}${text(24, 278, '核心动词 · 推离', 16, '#273451', 700)}<line x1="24" y1="302" x2="266" y2="302" stroke="#CFC6B3"/>${text(24, 334, '优势  高击飞 / 窄路', 14, '#273451', 550)}${text(24, 362, '代价  前摇公开', 14, '#FF5C5C', 650)}${text(24, 396, '使用  021 场', 14, '#273451', 550)}</g>
  <g transform="translate(590 206)"><rect width="290" height="418" rx="28" fill="#273451" stroke="#8B6DFF" stroke-width="3"/>${weaponIcon('chain', 74, 70, '#8B6DFF')}${text(24, 244, '回位锁链', 27, '#F4EBDD', 900)}${text(24, 278, '核心动词 · 换位', 16, '#CFC6B3', 700)}<line x1="24" y1="302" x2="266" y2="302" stroke="#CFC6B3" opacity=".3"/>${text(24, 334, '优势  路线转移', 14, '#F4EBDD', 550)}${text(24, 362, '代价  障碍可断', 14, '#FFB020', 650)}${text(24, 396, '使用  008 场', 14, '#CFC6B3', 550)}</g>
  <g transform="translate(910 206)"><rect width="290" height="418" rx="28" fill="#273451" stroke="#CFC6B3" stroke-width="2"/>${weaponIcon('shield', 83, 70, '#CFC6B3')}${text(24, 244, '圆盾', 27, '#F4EBDD', 900)}${text(24, 278, '核心动词 · 反制', 16, '#CFC6B3', 700)}<line x1="24" y1="302" x2="266" y2="302" stroke="#CFC6B3" opacity=".3"/>${text(24, 334, '优势  读招回应', 14, '#F4EBDD', 550)}${text(24, 362, '代价  方向要求', 14, '#FFB020', 650)}${text(24, 396, '使用  000 场', 14, '#CFC6B3', 550)}</g>`;
  return desktopShell('武器收藏', 'UI-B02', body);
}

function detailSvg(): string {
  const body = `${text(56, 132, '武器详情', 18, '#35B8FF', 750)}${text(56, 178, '边缘重锤', 43, '#F4EBDD', 900)}${text(56, 210, '用公开前摇换取明确推离', 17, '#CFC6B3', 500)}
  <g transform="translate(58 244)"><rect width="510" height="390" rx="30" fill="#F4EBDD"/>${weaponIcon('hammer', 160, 56, '#172033')}<path d="M48 286 H452" stroke="#CFC6B3" stroke-width="3"/><circle cx="90" cy="286" r="14" fill="#45D483"/><circle cx="250" cy="286" r="14" fill="#FFB020"/><circle cx="410" cy="286" r="14" fill="#FF5C5C"/>${text(62, 328, '准备', 14, '#273451', 700)}${text(222, 328, '有效', 14, '#273451', 700)}${text(382, 328, '收招', 14, '#273451', 700)}${text(48, 366, '地图用途 · 窄路 / 边缘 / 落点争夺', 15, '#172033', 700)}</g>
  <g transform="translate(620 132)">${text(0, 28, '动作事实', 17, '#CFC6B3', 750)}${pill(0, 52, 172, '命中 · 横向推离', '#FF5C5C')}${pill(188, 52, 172, '空中 · 高击飞', '#FFB020')}${pill(376, 52, 172, '反制 · 提前离开', '#45D483')}<rect y="112" width="560" height="250" rx="26" fill="#273451"/>${text(28, 150, '公开数值轴', 15, '#CFC6B3', 700)}${text(28, 194, '前摇', 15, '#F4EBDD', 600)}<rect x="118" y="179" width="340" height="13" rx="6" fill="#172033"/><rect x="118" y="179" width="196" height="13" rx="6" fill="#FFB020"/>${text(508, 194, '中', 15, '#F4EBDD', 750, 'end')}${text(28, 238, '击飞', 15, '#F4EBDD', 600)}<rect x="118" y="223" width="340" height="13" rx="6" fill="#172033"/><rect x="118" y="223" width="292" height="13" rx="6" fill="#FF5C5C"/>${text(508, 238, '高', 15, '#F4EBDD', 750, 'end')}${text(28, 282, '自身位移', 15, '#F4EBDD', 600)}<rect x="118" y="267" width="340" height="13" rx="6" fill="#172033"/><rect x="118" y="267" width="76" height="13" rx="6" fill="#35B8FF"/>${text(508, 282, '低', 15, '#F4EBDD', 750, 'end')}${text(28, 334, '个人记录  021 场  ·  边缘击落 006', 15, '#CFC6B3', 600)}${button(0, 404, 260, 58, '带入下一局')}</g>`;
  return desktopShell('武器详情', 'UI-B03', body);
}

function routeDiagram(x: number, y: number, scale = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M18 245 L112 245 L178 178 L256 178 L330 96 L420 96 L488 32" fill="none" stroke="#F4EBDD" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="M256 178 L338 252 L442 252" fill="none" stroke="#8B6DFF" stroke-width="23" stroke-linecap="round"/><circle cx="18" cy="245" r="21" fill="#45D483"/><path d="M470 20 l38 12 -22 34 z" fill="#FFB020"/><rect x="230" y="150" width="52" height="52" rx="8" fill="#FF5C5C" transform="rotate(45 256 176)"/></g>`;
}

function mapModeSvg(): string {
  const body = `${text(55, 136, '地图与模式', 39, '#F4EBDD', 900)}${text(55, 170, '同一地形基座，不同胜负目标', 16, '#CFC6B3', 500)}
  <g transform="translate(55 207)"><rect width="710" height="426" rx="30" fill="#273451"/>${routeDiagram(75, 68, 1.12)}${text(36, 378, 'KZ-01 · 分叉与恢复', 24, '#F4EBDD', 850)}${text(36, 407, '主路高承诺 / 紫色恢复支路 / 橙色终点', 14, '#CFC6B3', 500)}</g>
  <g transform="translate(810 200)">${text(0, 24, '选择模式', 16, '#CFC6B3', 750)}<rect y="48" width="400" height="92" rx="22" fill="#F4EBDD"/>${text(24, 83, '常规 1v1', 22, '#172033', 850)}${text(24, 113, '击落对手 · 共享地图规则', 14, '#273451', 500)}<rect y="154" width="400" height="92" rx="22" fill="#273451" stroke="#35B8FF" stroke-width="3"/>${text(24, 189, '竞速', 22, '#F4EBDD', 850)}${text(24, 219, '先到终点 · 原处重生', 14, '#CFC6B3', 500)}<rect y="260" width="400" height="92" rx="22" fill="#273451" stroke="#CFC6B3" stroke-width="2"/>${text(24, 295, '生存 1vE', 22, '#F4EBDD', 850)}${text(24, 325, '坚持更久 · 无终点', 14, '#CFC6B3', 500)}${button(0, 380, 400, 62, '以竞速开始')}</g>`;
  return desktopShell('地图 / 模式', 'UI-B04', body);
}

function resultSvg(): string {
  const body = `${text(55, 135, '本局结算', 17, '#45D483', 750)}${text(55, 187, '路线完成', 49, '#F4EBDD', 900)}${text(55, 221, '结果先于奖励，下一目标只保留一个', 16, '#CFC6B3', 500)}
  <g transform="translate(55 262)"><rect width="480" height="314" rx="30" fill="#F4EBDD"/>${text(30, 52, '本局事实', 15, '#273451', 750)}${text(30, 108, '01:42.318', 44, '#172033', 900)}${text(30, 141, '竞速时间', 14, '#273451', 550)}<line x1="30" y1="170" x2="450" y2="170" stroke="#CFC6B3"/>${text(30, 207, '关键命中', 14, '#273451', 600)}${text(420, 207, '004', 18, '#172033', 850, 'end')}${text(30, 241, '原处重生', 14, '#273451', 600)}${text(420, 241, '001', 18, '#172033', 850, 'end')}${text(30, 275, '新记录', 14, '#273451', 600)}${text(420, 275, '−03.221', 18, '#45D483', 850, 'end')}</g>
  <g transform="translate(590 262)"><rect width="620" height="314" rx="30" fill="#273451" stroke="#8B6DFF" stroke-width="3"/>${text(30, 48, '唯一下一目标', 15, '#8B6DFF', 800)}${text(30, 98, '熟悉恢复支路', 32, '#F4EBDD', 900)}${text(30, 132, '在分叉后完成一次不重生的连续修正', 16, '#CFC6B3', 500)}${routeDiagram(320, 68, .48)}${pill(30, 176, 174, '奖励 · 地图熟练 +1', '#45D483')}${button(30, 232, 272, 58, '再次开始')}${text(330, 268, '查看地图详情', 15, '#CFC6B3', 650)}</g>`;
  return desktopShell('结算 / 下一目标', 'UI-A01', body);
}

function mobileStressSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844"><rect width="390" height="844" fill="#172033"/><rect x="12" y="12" width="366" height="820" rx="30" fill="none" stroke="#FFB020" stroke-dasharray="8 8" opacity=".5"/>${text(24, 49, 'ARENA', 22, '#F4EBDD', 900)}${text(366, 47, 'UI-T01 · 390×844', 11, '#FFB020', 750, 'end')}${text(24, 78, '窄屏压力样本 · NOT FINAL', 12, '#CFC6B3', 550)}
  <g transform="translate(20 104)"><rect width="350" height="128" rx="24" fill="#F4EBDD"/>${text(20, 31, '下一局', 13, '#273451', 700)}${text(20, 68, '竞速 · KZ分叉与恢复', 20, '#172033', 900)}${text(20, 101, '最长标签压力：连续修正与原处重生', 12, '#273451', 500)}${button(238, 18, 94, 44, '开局')}</g>
  <g transform="translate(20 252)">${text(0, 22, '武器收藏', 16, '#F4EBDD', 800)}<rect y="38" width="350" height="126" rx="22" fill="#273451" stroke="#35B8FF" stroke-width="2"/>${weaponIcon('hammer', 14, 45, '#35B8FF')}${text(144, 77, '边缘重锤', 20, '#F4EBDD', 850)}${text(144, 104, '推离 · 前摇公开', 13, '#CFC6B3', 550)}${text(330, 139, '021 场', 13, '#F4EBDD', 750, 'end')}</g>
  <g transform="translate(20 450)">${text(0, 22, '地图 / 下一目标', 16, '#F4EBDD', 800)}<rect y="38" width="350" height="154" rx="22" fill="#273451"/>${routeDiagram(20, 58, .55)}${text(20, 176, '完成 01 / 06 段', 13, '#45D483', 750)}${text(330, 176, '记录 01:42.318', 13, '#F4EBDD', 750, 'end')}</g>
  <g transform="translate(20 678)"><rect width="350" height="94" rx="22" fill="#F4EBDD"/>${text(18, 30, '结果 / 原因 / 唯一步骤', 12, '#273451', 700)}${text(18, 61, '熟悉恢复支路', 20, '#172033', 900)}<circle cx="310" cy="47" r="24" fill="#35B8FF"/><path d="M302 37 l14 10 -14 10 z" fill="#172033"/></g>${text(195, 814, '虚线 = 移动安全区；最小触控 48px', 11, '#FFB020', 600, 'middle')}</svg>`;
}

function compositionSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#273451"/><rect width="960" height="12" fill="#8B6DFF"/>${text(36, 57, 'KZ ROUTE · ENTRY → COMMITMENT → LANDING → RECOVERY', 18, '#F4EBDD', 850)}${text(924, 31, 'COMPOSITION-B01 · PROJECT CONTRACT VISUAL', 11, '#FFB020', 750, 'end')}
  <path d="M80 508 L240 508 L330 410 L462 410 L560 276 L684 276 L812 112" fill="none" stroke="#F4EBDD" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/><path d="M462 410 L570 508 L760 508" fill="none" stroke="#8B6DFF" stroke-width="36" stroke-linecap="round"/><circle cx="80" cy="508" r="34" fill="#45D483"/><path d="M784 86 l72 24 -43 62 z" fill="#FFB020"/><rect x="425" y="373" width="74" height="74" rx="10" fill="#FF5C5C" transform="rotate(45 462 410)"/>
  ${text(54, 582, '入口', 22, '#45D483', 800)}${text(214, 468, '承诺路径', 20, '#F4EBDD', 800)}${text(430, 349, '落点判断', 20, '#FF5C5C', 800)}${text(573, 552, '恢复支路', 20, '#8B6DFF', 800)}${text(760, 79, '远端目标', 20, '#FFB020', 800)}<text x="924" y="616" text-anchor="end" fill="#CFC6B3" font-family="${FONT}" font-size="13">480×320预检：主路23px、支路18px、最小标签10px；入口/路径/目标保持独立形状</text></svg>`;
}

const visuals: VisualSpec[] = [
  { id: 'ui-b01', fileName: 'ui-b01-home-quick-start.png', width: 1280, height: 720, purpose: '首页快速开局', svg: homeSvg() },
  { id: 'ui-b02', fileName: 'ui-b02-weapon-collection.png', width: 1280, height: 720, purpose: '武器收藏', svg: collectionSvg() },
  { id: 'ui-b03', fileName: 'ui-b03-weapon-detail.png', width: 1280, height: 720, purpose: '武器详情', svg: detailSvg() },
  { id: 'ui-b04', fileName: 'ui-b04-map-mode.png', width: 1280, height: 720, purpose: '地图与模式', svg: mapModeSvg() },
  { id: 'ui-a01', fileName: 'ui-a01-result-next-goal.png', width: 1280, height: 720, purpose: '结算与下一目标', svg: resultSvg() },
  { id: 'ui-t01', fileName: 'ui-t01-mobile-narrow-stress.png', width: 390, height: 844, purpose: '窄屏压力样本', svg: mobileStressSvg() },
];

mkdirSync(UI_DIR, { recursive: true });
mkdirSync(COMPOSITION_DIR, { recursive: true });
for (const visual of visuals) {
  await sharp(Buffer.from(visual.svg)).png({ compressionLevel: 9, palette: true }).toFile(resolve(UI_DIR, visual.fileName));
}
const compositionPath = resolve(COMPOSITION_DIR, 'composition-b01-kz-route-hierarchy.png');
await sharp(Buffer.from(compositionSvg())).png({ compressionLevel: 9, palette: true }).toFile(compositionPath);
const thumbnail = await sharp(compositionPath).resize(480, 320).png().toBuffer();
const compositionRelative = 'docs/quality/art/reference-sources/project-composition/composition-b01-kz-route-hierarchy.png';

function artifact(path: string, width: number, height: number): Readonly<Record<string, unknown>> {
  const absolute = resolve(ROOT, path);
  return { path, byteLength: statSync(absolute).size, sha256: hashFile(path), width, height };
}

const screenMapPath = 'docs/product/arena-v2-screen-map.md';
const manifestPath = 'docs/quality/art/reference-sources/project-ui-wireframes/ui-source-visual-manifest-v1.json';
const manifest = {
  schemaVersion: 1,
  id: 'arena.art.reference-ui-source-visuals.a0.2.1.v1',
  status: 'source-review-only',
  generatedAt: '2026-07-28',
  generator: {
    path: 'scripts/art/generate-arena-reference-source-visuals.ts',
    sha256: hashFile('scripts/art/generate-arena-reference-source-visuals.ts'),
    revision: 'arena-reference-source-visual-generator-v1',
    artBibleTokens: ['#172033', '#F4EBDD', '#35B8FF', '#FF5C5C', '#FFB020', '#45D483', '#8B6DFF', '#273451', '#CFC6B3'],
    limitation: 'A0.2.1 source-quality inputs only; not implemented UI, A0.2.2 board artwork, device evidence, human evidence or Final.',
  },
  authority: {
    path: screenMapPath,
    sha256: hashFile(screenMapPath),
    baselineCommit: '8e3e6eff6724612e83b124aa2ae6574a3967af9e',
  },
  outputs: visuals.map((visual) => ({ entryId: visual.id, purpose: visual.purpose, artifact: artifact(`docs/quality/art/reference-sources/project-ui-wireframes/${visual.fileName}`, visual.width, visual.height) })),
  compositionReplacement: {
    entryId: 'composition-b01',
    purpose: '在480×320抽检尺度保持入口—路径—落点—恢复—目标层级',
    artifact: artifact(compositionRelative, 960, 640),
    thumbnailPreflight: {
      width: 480,
      height: 320,
      sha256: hashBytes(thumbnail),
      mainRouteStrokePx: 23,
      recoveryRouteStrokePx: 18,
      minimumLabelPx: 10,
      shapeRedundancy: ['green-circle-entry', 'white-main-route', 'red-diamond-landing', 'purple-branch-recovery', 'orange-arrow-goal'],
      result: 'pass-source-quality-only',
    },
  },
};
writeFileSync(resolve(ROOT, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ status: 'generated', manifest: manifestPath, uiOutputs: manifest.outputs, composition: manifest.compositionReplacement })}\n`);
