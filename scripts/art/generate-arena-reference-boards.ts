import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '../..');
const SOURCE_PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-source-pack-v1.json';
const SUPPLEMENTAL_PACK_PATH = 'docs/quality/art/reference-sources/arena-a0.2.1-supplemental-weapon-feedback-v1.json';
const OUTPUT_DIR = 'docs/quality/art/reference-boards';
const BOARD_WIDTH = 2560;
const BOARD_HEIGHT = 1440;
const MOBILE_WIDTH = 780;
const MOBILE_HEIGHT = 6420;
const FONT = `'PingFang SC','Noto Sans CJK SC','Microsoft YaHei',Arial,sans-serif`;
const GENERATED_AT = '2026-07-28';

type SourceArtifact = Readonly<{
  path: string;
  byteLength: number;
  sha256: string;
  width: number;
  height: number;
}>;

type SourceEntry = Readonly<{
  entryId: string;
  weightClass: 'baseline' | 'aspiration' | 'tension';
  boardSlot: string;
  sourceKind: string;
  title: string;
  creator: string;
  rightsHolder: string;
  sourceLocator: string;
  sourceRevision: string;
  retrievedAt: string;
  licenseId: string;
  licenseLocator: string;
  proofLocator: string;
  rights: Readonly<{
    commercialUseAllowed: boolean;
    modificationAllowed: boolean;
    redistributionAllowed: boolean;
  }>;
  embeddingMode: 'embedded' | 'link-only';
  artifact: SourceArtifact | null;
  specificTakeaway: string;
  doNotCopy: string;
  usageBoundary: string;
  antiReferenceReason: string | null;
  reviewStatus: string;
  sourceArtifact?: SourceArtifact;
  domain?: 'weapon-direct' | 'combat-feedback-direct';
  creationMethod?: string;
  compositionSignature?: string;
  perceptualHash?: string;
  coverageTags?: readonly string[];
  eventMappings?: readonly string[];
  cleanRoomBoundary?: string;
}>;

type SourcePack = Readonly<{
  id: string;
  status: string;
  baselineCommit: string;
  boards: ReadonlyArray<Readonly<{ category: string; entries: readonly SourceEntry[] }>>;
}>;

type SupplementalPack = Readonly<{
  id: string;
  status: string;
  entries: readonly SourceEntry[];
}>;

type DecisionClass = 'adopt' | 'avoid' | 'experiment';

type BoardDefinition = Readonly<{
  id: 'character' | 'weapon' | 'map-composition' | 'combat-feedback' | 'ui' | 'color-material';
  title: string;
  subtitle: string;
  purpose: string;
  sourceIds: Readonly<Record<DecisionClass, readonly string[]>>;
  constraints: Readonly<Record<string, string>>;
  keyTakeaways: readonly [string, string, string];
  antiReferences: readonly [string, string];
  selfScore: Readonly<Record<'sourceFit' | 'annotation' | 'composition' | 'consistency' | 'scaleEvidence' | 'governance', number>>;
  evidenceScope: 'actual-reference-board' | 'direction-contract';
  risk: string;
}>;

type BoardEntry = Readonly<{
  entryId: string;
  decisionSlot: string;
  decisionClass: DecisionClass;
  decisionReason: string;
  arenaConstraint: string;
  source: SourceEntry;
  crop: Readonly<Record<string, unknown>> | null;
}>;

const BOARD_DEFINITIONS: readonly BoardDefinition[] = [
  {
    id: 'character',
    title: '角色 · 轮廓、体块与附件边界',
    subtitle: '当前只承认2个正式角色；用正/侧/三分之四与历史甲胄检验体块，不预造另外4个角色',
    purpose: '固定角色生产时可采用的头肩、重心、负空间和附件关系，并把换色、巨型头饰与外部职业符号排除在角色差异之外。',
    sourceIds: {
      adopt: ['character-b01', 'character-b02', 'character-b03', 'character-b04', 'character-b05', 'character-b06', 'character-b07'],
      avoid: ['character-a02', 'character-t01'],
      experiment: ['character-a01'],
    },
    constraints: {
      'character-b01': '角色槽必须在正/侧视保留头肩、披风、手脚空隙；换色不得替代轮廓差异。',
      'character-b02': '方硬角色必须以头盔横宽、肩角和短腿重心区别于Rogue。',
      'character-b03': '圆盾可占单侧轮廓，但不得遮住面向、肩线或攻击手。',
      'character-b04': '重型候选只借肩—腰—下摆节奏，不引入写实甲片密度。',
      'character-b05': '板面固定只承认2个正式角色；其余4槽保持未设计。',
      'character-b06': '轻型来源只证明资产身份，不等于Arena原创角色造型完成。',
      'character-b07': '方型来源只证明正式输入，不得复制骷髅世界观或身份。',
      'character-a02': '不得复制热血英豪角色、武器姿态或职业符号，只保留“装备改变重心”的研究问题。',
      'character-t01': '头饰高度不得吞掉肩颈负空间，也不得遮挡移动与攻击方向。',
      'character-a01': '只在后续Blockout候选测试宽肩/窄腰/分层下摆是否适配玩具比例。',
    },
    keyTakeaways: ['先用头肩、重心和负空间分角色，再讨论表面细节。', '附件必须改变轮廓但不能遮挡面向与攻击方向。', '当前只有2个正式角色，六角色上限不是六个已设计角色。'],
    antiReferences: ['拒绝把换色、服装纹样或世界观符号当作新角色。', '拒绝用巨型头饰、写实甲片密度或外部职业姿态制造差异。'],
    selfScore: { sourceFit: 18, annotation: 19, composition: 19, consistency: 14, scaleEvidence: 14, governance: 10 },
    evidenceScope: 'actual-reference-board',
    risk: '角色图仍是固定Idle来源审阅视图，不是A0.3游戏镜头剪影或真人识别证据。',
  },
  {
    id: 'weapon',
    title: '武器 · 动作承诺、命中后果与恢复节奏',
    subtitle: '先冻结“准备→结果→恢复”的可读情绪，再由P4逐把绑定正式Definition与反馈事件',
    purpose: '直接固定武器体量、轮廓、握持、准备—命中—恢复、地空差异、位移承诺和空挥后果；正式模型与动作仍等待P4逐把冻结。',
    sourceIds: {
      adopt: ['weapon-s01', 'weapon-s02', 'weapon-s03', 'weapon-s04', 'weapon-s05', 'weapon-s06', 'mood-a02'],
      avoid: ['weapon-s07', 'mood-b06'],
      experiment: ['weapon-s08'],
    },
    constraints: {
      'weapon-s01': '轻/中/重必须由体量、支点、握持和身体负空间直接区分。',
      'weapon-s02': '前三把生产基线与后三个门禁槽必须六轮廓可分，但不新增操作键。',
      'weapon-s03': '准备、命中、恢复分别承担方向承诺、单一焦点和反制窗口。',
      'weapon-s04': '地面用支撑脚和水平结果，空中用下方负空间、垂直轨迹和落点。',
      'weapon-s05': '圆盾推离、锁链回拉、重锤抛弧在命中前后保持同一方向承诺。',
      'weapon-s06': '空挥不得补HitResolved特效；恢复姿态和危险窗口承担失败后果。',
      'mood-a02': '武器视觉、瞬态反馈与声音必须同源解释同一权威事件。',
      'weapon-s07': '拒绝多刃、多环、多色常驻光和遮脸握持同时竞争。',
      'mood-b06': '热血英豪只保留功能关系研究，不嵌图、不复制造型、招式或专有表达。',
      'weapon-s08': '实验后三个功能槽的负空间，只测学习问题，不提前定义武器外形。',
    },
    keyTakeaways: ['轻/中/重先由轮廓、握持支点和身体负空间区分。', '准备、命中、恢复与地面/空中后果必须在固定镜头直接可读。', '推离、回拉、抛弧和空挥窗口从权威事件/快照读取，不增加操作键。'],
    antiReferences: ['拒绝复制热血英豪或其他研究对象的武器、招式、职业、数值和特效。', '拒绝多刃、多环、多色常驻光、遮脸握持和伪造HitResolved。'],
    selfScore: { sourceFit: 19, annotation: 19, composition: 18, consistency: 14, scaleEvidence: 13, governance: 10 },
    evidenceScope: 'direction-contract',
    risk: '本板已用clean-room直接视觉证明武器方向，但仍没有正式重锤/锁链/圆盾模型与动作；P4须逐把独立Concept。',
  },
  {
    id: 'map-composition',
    title: '地图 / 构图 · 下一决策、落点与恢复支路',
    subtitle: 'KZ只借路线句法；正式地图必须原创，固定镜头优先显示下一决策而非角色特写',
    purpose: '固定入口—承诺—落点—恢复—目标的构图层级，并用轴线、前中远层和高位分区保证地图选择可读。',
    sourceIds: {
      adopt: ['composition-b01', 'composition-b02', 'composition-b03', 'composition-b04', 'composition-b06', 'composition-b07', 'composition-a02'],
      avoid: ['composition-b05', 'composition-t01'],
      experiment: ['composition-a01'],
    },
    constraints: {
      'composition-b01': '固定镜头必须同时读出入口、主路、落点、恢复支路和远端目标。',
      'composition-b02': '重复地标只服务前进轴，不得形成可误判为落地面的装饰。',
      'composition-b03': '前景事件不得遮住中景路径和远端目标，三层必须有明确主次。',
      'composition-b04': '斜俯视下可走区以大块明度分区，不依赖细纹理或小箭头。',
      'composition-b06': '长跳、连续修正和练习段只转译为原创路线节奏。',
      'composition-b07': '距离、节奏、空中修正分别成为可测构图压力，不混成难度标签。',
      'composition-a02': '每条生产路线必须具备身份、完成条件和审阅式检查记录。',
      'composition-b05': 'CS1.6只确认研究对象身份，禁止嵌图、复制布局、材质、名称或标志。',
      'composition-t01': '持续拥挤、英雄特写与强对角线不得遮住下一落点和恢复面。',
      'composition-a01': '实验以岸线式明度弯折同时提示快路与恢复支路。',
    },
    keyTakeaways: ['构图中心始终是下一决策和可恢复关系。', '路线依靠大块明度、地标重复和形状分支，不依赖细节。', 'KZ研究只提供句法，正式几何、材质和命名必须原创。'],
    antiReferences: ['拒绝缓存或转绘CS1.6/KZ截图并冒充原创地图。', '拒绝英雄特写、持续拥挤、风暴或装饰遮住落点。'],
    selfScore: { sourceFit: 19, annotation: 19, composition: 19, consistency: 14, scaleEvidence: 14, governance: 10 },
    evidenceScope: 'actual-reference-board',
    risk: '构图板没有正式Map Definition与生产相机截图，不能替代P3可达、拥挤或真人路线理解。',
  },
  {
    id: 'combat-feedback',
    title: '战斗反馈 · 事件核心、方向与同屏层级',
    subtitle: '命中、停顿、击退、落边、供给生命周期与遮挡上限都必须映射权威事件，不冒充运行时VFX',
    purpose: '直接固定命中核心/方向、受击停顿、击退落点、落边淘汰、拾取替换过期、同屏层级与reduced-motion等效语法。',
    sourceIds: {
      adopt: ['feedback-s01', 'feedback-s02', 'feedback-s03', 'feedback-s04', 'feedback-s05', 'feedback-s06', 'environment-b05'],
      avoid: ['feedback-s07', 'environment-a02'],
      experiment: ['feedback-s08'],
    },
    constraints: {
      'feedback-s01': '命中只保留接触核心、来源尾迹和击退法线三层。',
      'feedback-s02': '受击停顿分接触前、核心、保持、释放四段，不把示意帧当tick。',
      'feedback-s03': '击退实线、趋势虚线和支撑面落点分层，越界后才转淘汰语义。',
      'feedback-s04': '危险边缘、越界和PlayerEliminated必须按权威事件递进。',
      'feedback-s05': '拾取、替换、回收、过期绑定同一权威身份和事件顺序。',
      'feedback-s06': '同屏核心层高于方向层和装饰层，角色轮廓与支撑面始终可见。',
      'environment-b05': '六段路线只在决策点触发反馈，不让地图研究轴变成常驻HUD。',
      'feedback-s07': '拒绝常驻雾、全屏闪、伤害数字雨和无来源多焦点。',
      'environment-a02': '拒绝把插件审核、排行榜和系统状态直接搬进战斗反馈。',
      'feedback-s08': '实验reduced-motion下用静态方向楔、接触印记和非视觉槽位保持等效语义。',
    },
    keyTakeaways: ['命中核心、来源尾迹和击退法线分别解释接触、来源与结果。', '危险边缘、越界、淘汰及拾取/替换/回收/过期必须按权威事件递进。', '同屏核心层高于方向层和装饰层，角色轮廓与支撑面始终可见。'],
    antiReferences: ['拒绝全屏闪、常驻雾、伤害数字雨、无来源粒子和多焦点遮挡。', '拒绝由Presentation推算tick、淘汰、替换、过期或装备身份。'],
    selfScore: { sourceFit: 20, annotation: 19, composition: 18, consistency: 14, scaleEvidence: 13, governance: 10 },
    evidenceScope: 'direction-contract',
    risk: '本板已用clean-room直接视觉证明反馈层级并标注权威事件映射，但仍不是运行中VFX样件；A1/A4继续受事件与设备门阻断。',
  },
  {
    id: 'ui',
    title: 'UI · 单一问题、单一主动作与窄屏压力',
    subtitle: '11页职责不扩张；首页、收藏、详情、地图、结算和390×844压力共享同一视觉语法',
    purpose: '固定Arena局外UI的信息优先级、单一主动作、武器/地图学习入口和窄屏密度上限。',
    sourceIds: {
      adopt: ['ui-b01', 'ui-b02', 'ui-b03', 'ui-b04', 'ui-b05', 'ui-a01', 'ui-a02'],
      avoid: ['ui-b06', 'ui-b07'],
      experiment: ['ui-t01'],
    },
    constraints: {
      'ui-b01': '首页到开局不超过两次主要点击，首屏只保留一个主动作。',
      'ui-b02': '收藏先显示核心动词、优势/代价和记录，不展示综合战力。',
      'ui-b03': '详情按时序、地图用途和反制解释武器，数值必须同源。',
      'ui-b04': '三模式共用地图基础语法，目标与重生差异不复制三套页面。',
      'ui-b05': '11页清单、一页一问题和单一主动作是不可扩张边界。',
      'ui-a01': '结算先结果与原因，再给唯一下一目标和再次开始。',
      'ui-a02': '先用行为和场景解释武器，再显示细数值；外部图像不嵌入。',
      'ui-b06': '不复制弹壳特攻队页面、图标、货币、成长结构或商店皮肤。',
      'ui-b07': '不以商店截图或跨商店营销信息代替Arena产品信息架构。',
      'ui-t01': '实验390×844下长标签、六位记录和安全区；任一重叠即返工。',
    },
    keyTakeaways: ['每页只回答一个问题，主动作始终优先于收藏与记录。', '武器、地图和下一目标承担长期学习，不扩张商城或多货币。', '390×844必须保持48px触控、长标签与固定数值槽。'],
    antiReferences: ['拒绝复制弹壳特攻队页面皮肤、图标、货币和成长系统。', '拒绝日志、红点、排行榜、多入口和营销卡挤入首屏。'],
    selfScore: { sourceFit: 20, annotation: 19, composition: 19, consistency: 14, scaleEvidence: 14, governance: 10 },
    evidenceScope: 'actual-reference-board',
    risk: '本板使用合同线框而非当前运行页面；响应式、触控、真机和真人证据仍未产生。',
  },
  {
    id: 'color-material',
    title: '色彩 / 材质 · 暖纸底、深墨结构与具名强调',
    subtitle: '颜色必须回落到Art Bible Token；材质只借大色块、纸感与有限焦点，不复制馆藏题材',
    purpose: '固定暖纸白与深墨色的稳定骨架、有限语义强调和低纹理密度材质方向，并标出高饱和与金红过载上限。',
    sourceIds: {
      adopt: ['color-b01', 'color-b02', 'color-b03', 'color-b04', 'color-b05', 'color-b06', 'color-b07'],
      avoid: ['color-a02', 'color-t01'],
      experiment: ['color-a01'],
    },
    constraints: {
      'color-b01': '黄绿场景、深蓝结构和暖白高光必须保持主次，不增加无名强调色。',
      'color-b02': '同一语义最多使用有限蓝阶，纸白负空间保持视觉休息。',
      'color-b03': '低饱和底色只允许蓝与暖红承担具名焦点并配形状冗余。',
      'color-b04': '自然绿背景中角色依靠深色体块与暖肤分离，不靠荧光描边。',
      'color-b05': '所有取色必须回落到已签核Token及使用限制。',
      'color-b06': '低纹理密度大色块用于角色分区，不把KayKit身份色当规则色。',
      'color-b07': '正文、大字和图形配对必须继续满足已计算对比与非色彩冗余。',
      'color-a02': '拒绝复制弹壳特攻队高饱和奖励、稀有度、货币与渐变体系。',
      'color-t01': '拒绝金底、红色和发光同时大面积出现造成语义竞争。',
      'color-a01': '实验小面积金/红/蓝多焦点是否仍能在克制底色中保持阅读顺序。',
    },
    keyTakeaways: ['暖纸白和深墨色构成稳定骨架，语义色只承担具名事件。', '低纹理密度、大色块与有限焦点优先于写实材质噪声。', '颜色从不单独表达状态，必须配形状、图标、纹理或声音。'],
    antiReferences: ['拒绝高饱和稀有度、货币色、商业渐变和全屏奖励金光。', '拒绝金底、红光、蓝紫霓虹同时竞争并掩盖材质与轮廓。'],
    selfScore: { sourceFit: 19, annotation: 19, composition: 19, consistency: 14, scaleEvidence: 13, governance: 10 },
    evidenceScope: 'actual-reference-board',
    risk: '馆藏图只提供色彩/材质关系，不是生产贴图；真实材质参数和设备色彩仍待后续阶段。',
  },
] as const;

function sha256Bytes(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha256File(path: string): string {
  return sha256Bytes(readFileSync(resolve(ROOT, path)));
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function truncate(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

function wrap(value: string, maximum: number, lines: number): readonly string[] {
  const result: string[] = [];
  let rest = value.trim();
  while (rest.length > 0 && result.length < lines) {
    if (rest.length <= maximum) { result.push(rest); rest = ''; break; }
    let split = maximum;
    const candidate = rest.slice(0, maximum + 1);
    const whitespace = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('，'), candidate.lastIndexOf('；'));
    if (whitespace > Math.floor(maximum * 0.55)) split = whitespace + 1;
    result.push(rest.slice(0, split).trim());
    rest = rest.slice(split).trim();
  }
  if (rest.length > 0 && result.length > 0) result[result.length - 1] = truncate(result[result.length - 1]!, maximum);
  return result;
}

function text(x: number, y: number, value: string, size: number, fill: string, weight = 500, anchor = 'start'): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function multiline(x: number, y: number, values: readonly string[], size: number, fill: string, lineHeight: number, weight = 500): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" font-size="${size}" font-weight="${weight}">${values.map((value, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(value)}</tspan>`).join('')}</text>`;
}

function mimeFor(path: string): string {
  return extname(path).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
}

function imageDataUri(path: string): string {
  return `data:${mimeFor(path)};base64,${readFileSync(resolve(ROOT, path)).toString('base64')}`;
}

function decisionVisual(decision: DecisionClass): Readonly<{ color: string; label: string; pattern: string }> {
  if (decision === 'adopt') return { color: '#35B8FF', label: '采用 USE', pattern: 'solid' };
  if (decision === 'avoid') return { color: '#FF5C5C', label: '规避 AVOID', pattern: '12 8' };
  return { color: '#8B6DFF', label: '实验 TEST', pattern: '3 8' };
}

function displayRect(artifact: SourceArtifact): Readonly<{ x: number; y: number; width: number; height: number }> {
  const scale = Math.min(480 / artifact.width, 320 / artifact.height);
  const width = Math.round(artifact.width * scale * 1000) / 1000;
  const height = Math.round(artifact.height * scale * 1000) / 1000;
  return { x: Math.round((480 - width) / 2 * 1000) / 1000, y: Math.round((320 - height) / 2 * 1000) / 1000, width, height };
}

function decisionReason(decision: DecisionClass, source: SourceEntry): string {
  if (decision === 'avoid') return `规避，因为${source.antiReferenceReason ?? source.doNotCopy}`;
  if (decision === 'experiment') return `实验，用“${source.specificTakeaway}”验证边界。`;
  return `采用，因为${source.specificTakeaway}`;
}

function createBoardEntries(definition: BoardDefinition, sourceIndex: ReadonlyMap<string, SourceEntry>): readonly BoardEntry[] {
  const entries: BoardEntry[] = [];
  for (const decision of ['adopt', 'avoid', 'experiment'] as const) {
    for (const [index, sourceId] of definition.sourceIds[decision].entries()) {
      const source = sourceIndex.get(sourceId);
      if (!source) throw new Error(`${definition.id} references missing approved source ${sourceId}`);
      const prefix = decision === 'adopt' ? 'USE' : decision === 'avoid' ? 'AVOID' : 'TEST';
      const crop = source.artifact ? {
        mode: 'contain',
        sourceRect: { x: 0, y: 0, width: source.artifact.width, height: source.artifact.height },
        displayRect: displayRect(source.artifact),
        croppedPixels: 0,
        approval: {
          status: 'approved-no-crop',
          reviewer: 'Codex / game-art-director self-review',
          signedAt: GENERATED_AT,
          rationale: '完整源图按contain缩放，保留全部上下文；不裁切、不拉伸。',
        },
      } : null;
      entries.push({
        entryId: source.entryId,
        decisionSlot: `${prefix}${String(index + 1).padStart(2, '0')}`,
        decisionClass: decision,
        decisionReason: decisionReason(decision, source),
        arenaConstraint: definition.constraints[sourceId]!,
        source,
        crop,
      });
    }
  }
  return entries;
}

function tileSvg(entry: BoardEntry, x: number, y: number): string {
  const visual = decisionVisual(entry.decisionClass);
  const source = entry.source;
  const image = source.artifact
    ? `<image href="${imageDataUri(source.artifact.path)}" x="${x}" y="${y}" width="480" height="320" preserveAspectRatio="xMidYMid meet"/>`
    : `<g><rect x="${x}" y="${y}" width="480" height="320" fill="#273451"/><rect x="${x + 152}" y="${y + 64}" width="176" height="142" rx="18" fill="#172033" stroke="${visual.color}" stroke-width="4" stroke-dasharray="${visual.pattern}"/><path d="M${x + 190} ${y + 102} h92 v70 h-92 z M${x + 206} ${y + 122} h60 M${x + 206} ${y + 142} h42" fill="none" stroke="#F4EBDD" stroke-width="8" stroke-linecap="round"/><text x="${x + 240}" y="${y + 252}" text-anchor="middle" fill="#F4EBDD" font-family="${FONT}" font-size="25" font-weight="850">LINK ONLY · 禁止嵌图</text><text x="${x + 240}" y="${y + 282}" text-anchor="middle" fill="#CFC6B3" font-family="${FONT}" font-size="15">${escapeXml(truncate(source.sourceLocator, 48))}</text></g>`;
  const reason = wrap(entry.decisionReason, 31, 2);
  const constraint = wrap(entry.arenaConstraint, 31, 2);
  const noCopy = wrap(`不复制：${source.doNotCopy}`, 36, 1);
  return `<g data-entry-id="${escapeXml(entry.entryId)}" data-decision="${entry.decisionClass}">
    <rect x="${x}" y="${y}" width="480" height="480" fill="#273451" stroke="${visual.color}" stroke-width="6" stroke-dasharray="${visual.pattern}"/>
    ${image}
    <rect x="${x}" y="${y + 320}" width="480" height="160" fill="#F4EBDD"/>
    <rect x="${x}" y="${y + 320}" width="480" height="8" fill="${visual.color}"/>
    ${text(x + 16, y + 352, `${entry.decisionSlot} · ${source.entryId.toUpperCase()}`, 18, '#172033', 850)}
    ${text(x + 464, y + 352, visual.label, 15, visual.color, 850, 'end')}
    ${text(x + 16, y + 376, truncate(source.title, 24), 15, '#273451', 650)}
    ${text(x + 464, y + 376, `${source.licenseId} · ${source.embeddingMode}`, 11, '#273451', 650, 'end')}
    ${multiline(x + 16, y + 399, reason, 14, '#172033', 17, 650)}
    ${multiline(x + 16, y + 436, constraint, 14, '#273451', 17, 650)}
    ${multiline(x + 16, y + 470, noCopy, 12, '#FF5C5C', 15, 650)}
  </g>`;
}

function boardSvg(definition: BoardDefinition, entries: readonly BoardEntry[], manifestId: string): string {
  const tiles = entries.map((entry, index) => tileSvg(entry, 80 + (index % 5) * 480, 140 + Math.floor(index / 5) * 480)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="1440" viewBox="0 0 2560 1440">
  <rect width="2560" height="1440" fill="#172033"/>
  <rect width="2560" height="14" fill="#35B8FF"/>
  ${text(80, 74, definition.title, 38, '#F4EBDD', 900)}
  ${text(80, 112, definition.subtitle, 19, '#CFC6B3', 550)}
  ${text(2480, 70, 'A0.2.2 · BOARD-READY', 18, '#45D483', 800, 'end')}
  ${text(2480, 106, '7采用（实线） / 2规避（虚线） / 1实验（点线）', 17, '#F4EBDD', 700, 'end')}
  ${tiles}
  <rect x="80" y="1120" width="2400" height="250" rx="24" fill="#273451"/>
  ${text(110, 1162, '本板目的', 17, '#35B8FF', 800)}
  ${multiline(110, 1192, wrap(definition.purpose, 92, 2), 17, '#F4EBDD', 22, 600)}
  ${text(110, 1246, 'KEY TAKEAWAYS', 16, '#45D483', 800)}
  ${text(110, 1276, `1. ${definition.keyTakeaways[0]}`, 16, '#F4EBDD', 600)}
  ${text(110, 1304, `2. ${definition.keyTakeaways[1]}`, 16, '#F4EBDD', 600)}
  ${text(110, 1332, `3. ${definition.keyTakeaways[2]}`, 16, '#F4EBDD', 600)}
  ${text(1320, 1162, 'ANTI-REFERENCE', 16, '#FF5C5C', 800)}
  ${text(1320, 1194, `A. ${definition.antiReferences[0]}`, 16, '#F4EBDD', 600)}
  ${text(1320, 1224, `B. ${definition.antiReferences[1]}`, 16, '#F4EBDD', 600)}
  ${text(1320, 1276, definition.id === 'weapon' || definition.id === 'combat-feedback'
    ? 'Art Bible: A0.1 contract-ready · Base Source: source-ready · Supplement: supplemental-source-ready'
    : 'Art Bible: A0.1 contract-ready · Source Pack: A0.2.1 source-ready', 15, '#CFC6B3', 600)}
  ${text(1320, 1306, `Manifest: ${manifestId}`, 15, '#CFC6B3', 600)}
  ${text(1320, 1336, 'Art Director: Codex 2026-07-28 · Coordinator: Arena V2 主协调 2026-07-28', 15, '#45D483', 700)}
  <text x="2480" y="1406" text-anchor="end" fill="#CFC6B3" font-family="${FONT}" font-size="13">A0.2.2实际板小门已通过 · 不代表A0.2、Reference Board、Blockout、A0.3、设备、真人或Final通过</text>
  </svg>`;
}

function mobileCardSvg(entry: BoardEntry, index: number): string {
  const y = 190 + index * 590;
  const visual = decisionVisual(entry.decisionClass);
  const source = entry.source;
  const image = source.artifact
    ? `<image href="${imageDataUri(source.artifact.path)}" x="40" y="${y + 52}" width="700" height="220" preserveAspectRatio="xMidYMid meet"/>`
    : `<g><rect x="40" y="${y + 52}" width="700" height="220" rx="18" fill="#273451"/><text x="390" y="${y + 154}" text-anchor="middle" fill="#F4EBDD" font-family="${FONT}" font-size="32" font-weight="850">LINK ONLY · 禁止嵌图</text><text x="390" y="${y + 198}" text-anchor="middle" fill="#CFC6B3" font-family="${FONT}" font-size="22">${escapeXml(truncate(source.sourceLocator, 56))}</text></g>`;
  return `<g data-mobile-entry-id="${escapeXml(entry.entryId)}"><rect x="24" y="${y}" width="732" height="570" rx="24" fill="#F4EBDD" stroke="${visual.color}" stroke-width="8" stroke-dasharray="${visual.pattern}"/>${text(48, y + 36, `${entry.decisionSlot} · ${source.entryId.toUpperCase()}`, 25, '#172033', 850)}${text(732, y + 36, visual.label, 22, visual.color, 850, 'end')}${image}${text(48, y + 302, truncate(source.title, 34), 20, '#273451', 700)}${text(732, y + 332, `${source.licenseId} · ${source.embeddingMode}`, 17, '#273451', 650, 'end')}${multiline(48, y + 366, wrap(entry.decisionReason, 29, 3), 23, '#172033', 29, 650)}${multiline(48, y + 456, wrap(`Arena：${entry.arenaConstraint}`, 29, 3), 23, '#273451', 29, 650)}${multiline(48, y + 544, wrap(`不复制：${source.doNotCopy}`, 36, 1), 19, '#FF5C5C', 24, 650)}</g>`;
}

function mobileSvg(definition: BoardDefinition, entries: readonly BoardEntry[], manifestId: string): string {
  const cards = entries.map(mobileCardSvg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MOBILE_WIDTH}" height="${MOBILE_HEIGHT}" viewBox="0 0 ${MOBILE_WIDTH} ${MOBILE_HEIGHT}"><rect width="780" height="6420" fill="#172033"/><rect width="780" height="14" fill="#35B8FF"/>${text(28, 62, definition.title, 31, '#F4EBDD', 900)}${text(28, 104, '390×844 CSS viewport @2x · full-page scroll equivalent', 21, '#CFC6B3', 600)}${text(752, 145, '7采用 / 2规避 / 1实验', 22, '#FFB020', 800, 'end')}${cards}<rect x="24" y="6110" width="732" height="266" rx="20" fill="#273451"/>${text(48, 6162, `Manifest: ${manifestId}`, 20, '#CFC6B3', 600)}${text(48, 6210, '完整10条注释可滚动审阅；不代表真机、交互或响应式实现通过。', 22, '#F4EBDD', 700)}${text(48, 6258, 'Coordinator: APPROVED 2026-07-28 · A0.2 overall: INCOMPLETE', 20, '#45D483', 800)}</svg>`;
}

function artifact(path: string, width: number, height: number, colorSpace = 'srgb'): Readonly<Record<string, unknown>> {
  const absolute = resolve(ROOT, path);
  return { path, sha256: sha256File(path), byteLength: statSync(absolute).size, width, height, colorSpace };
}

function sumScore(score: BoardDefinition['selfScore']): number {
  return Object.values(score).reduce((total, value) => total + value, 0);
}

const sourcePack = JSON.parse(readFileSync(resolve(ROOT, SOURCE_PACK_PATH), 'utf8')) as SourcePack;
if (sourcePack.status !== 'source-ready') throw new Error('A0.2.1 source pack must be source-ready');
const supplementalPack = JSON.parse(readFileSync(resolve(ROOT, SUPPLEMENTAL_PACK_PATH), 'utf8')) as SupplementalPack;
if (supplementalPack.status !== 'supplemental-source-ready') throw new Error('A0.2.1 supplemental pack must be supplemental-source-ready');
const sourceIndex = new Map<string, SourceEntry>();
for (const board of sourcePack.boards) for (const entry of board.entries) sourceIndex.set(entry.entryId, entry);
for (const entry of supplementalPack.entries) {
  if (sourceIndex.has(entry.entryId)) throw new Error(`supplemental source collides with approved source ${entry.entryId}`);
  sourceIndex.set(entry.entryId, entry);
}
mkdirSync(resolve(ROOT, OUTPUT_DIR), { recursive: true });
const usedSources = new Set<string>();
const masterBoards: Array<Record<string, unknown>> = [];

for (const definition of BOARD_DEFINITIONS) {
  const entries = createBoardEntries(definition, sourceIndex);
  for (const entry of entries) {
    if (usedSources.has(entry.entryId)) throw new Error(`approved source reused across boards: ${entry.entryId}`);
    usedSources.add(entry.entryId);
  }
  const manifestId = `arena.art.reference-board.${definition.id}.a0.2.2.v1`;
  const base = `arena-reference-board-${definition.id}-v1`;
  const svgPath = `${OUTPUT_DIR}/${base}.svg`;
  const pngPath = `${OUTPUT_DIR}/${base}.png`;
  const tenPath = `${OUTPUT_DIR}/${base}-10pct.png`;
  const mobilePath = `${OUTPUT_DIR}/${base}-mobile-review.png`;
  const manifestPath = `${OUTPUT_DIR}/${base}.json`;
  const svgBytes = Buffer.from(boardSvg(definition, entries, manifestId));
  writeFileSync(resolve(ROOT, svgPath), svgBytes);
  await sharp(svgBytes, { density: 72 })
    .resize(BOARD_WIDTH, BOARD_HEIGHT, { fit: 'fill' })
    .flatten({ background: '#172033' })
    .png({ compressionLevel: 9 })
    .toFile(resolve(ROOT, pngPath));
  await sharp(resolve(ROOT, pngPath)).resize(256, 144, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(resolve(ROOT, tenPath));
  const mobileBytes = Buffer.from(mobileSvg(definition, entries, manifestId));
  await sharp(mobileBytes, { density: 72, limitInputPixels: false })
    .resize(MOBILE_WIDTH, MOBILE_HEIGHT, { fit: 'fill' })
    .flatten({ background: '#172033' })
    .png({ compressionLevel: 9 })
    .toFile(resolve(ROOT, mobilePath));
  const manifest = {
    schemaVersion: 1,
    id: manifestId,
    status: 'board-ready',
    category: definition.id,
    artBibleRevision: 'a0.1-contract-ready@22b9fd0e39b83de0b6a3ed766a2a66f3d2f67b1d',
    sourcePack: { path: SOURCE_PACK_PATH, id: sourcePack.id, sha256: sha256File(SOURCE_PACK_PATH), status: sourcePack.status },
    supplementalPack: { path: SUPPLEMENTAL_PACK_PATH, id: supplementalPack.id, sha256: sha256File(SUPPLEMENTAL_PACK_PATH), status: supplementalPack.status },
    generatedAt: GENERATED_AT,
    weights: { adopt: 70, avoid: 20, experiment: 10 },
    layout: {
      canvas: { width: BOARD_WIDTH, height: BOARD_HEIGHT, colorSpace: 'srgb', transparent: false },
      grid: { x: 80, y: 140, columns: 5, rows: 2, tileWidth: 480, tileHeight: 480, visualHeight: 320, annotationHeight: 160 },
      order: ['USE01', 'USE02', 'USE03', 'USE04', 'USE05', 'USE06', 'USE07', 'AVOID01', 'AVOID02', 'TEST01'],
    },
    purpose: definition.purpose,
    sourceArtifact: artifact(svgPath, BOARD_WIDTH, BOARD_HEIGHT),
    reviewArtifact: artifact(pngPath, BOARD_WIDTH, BOARD_HEIGHT),
    tenPercentReview: {
      ...artifact(tenPath, 256, 144),
      scale: 0.1,
      readabilityScope: ['board-identity', '7-2-1-decision-zones', 'embedded-vs-link-only', 'dominant-silhouette-and-value'],
      fullAnnotationReadability: 'mobile-equivalent-required',
      status: 'overview-readable',
    },
    mobileEquivalentReview: {
      ...artifact(mobilePath, MOBILE_WIDTH, MOBILE_HEIGHT),
      cssViewport: { width: 390, height: 844, devicePixelRatio: 2 },
      capture: 'full-page-scroll-equivalent',
      entryCount: 10,
      annotationReadability: 'full',
      status: 'board-ready',
    },
    entries: entries.map((entry, index) => ({
      entryId: entry.entryId,
      decisionSlot: entry.decisionSlot,
      decisionClass: entry.decisionClass,
      tileIndex: index,
      sourceKind: entry.source.sourceKind,
      title: entry.source.title,
      creator: entry.source.creator,
      rightsHolder: entry.source.rightsHolder,
      sourceLocator: entry.source.sourceLocator,
      sourceRevision: entry.source.sourceRevision,
      retrievedAt: entry.source.retrievedAt,
      licenseId: entry.source.licenseId,
      licenseLocator: entry.source.licenseLocator,
      proofLocator: entry.source.proofLocator,
      rights: entry.source.rights,
      embeddingMode: entry.source.embeddingMode,
      artifact: entry.source.artifact,
      crop: entry.crop,
      decisionReason: entry.decisionReason,
      specificTakeaway: entry.source.specificTakeaway,
      arenaConstraint: entry.arenaConstraint,
      doNotCopy: entry.source.doNotCopy,
      usageBoundary: entry.source.usageBoundary,
      antiReferenceReason: entry.source.antiReferenceReason,
      reviewStatus: 'coordination-approved',
      sourceArtifact: entry.source.sourceArtifact,
      domain: entry.source.domain,
      creationMethod: entry.source.creationMethod,
      compositionSignature: entry.source.compositionSignature,
      perceptualHash: entry.source.perceptualHash,
      coverageTags: entry.source.coverageTags,
      eventMappings: entry.source.eventMappings,
      cleanRoomBoundary: entry.source.cleanRoomBoundary,
    })),
    keyTakeaways: definition.keyTakeaways,
    antiReferences: definition.antiReferences,
    selfReview: {
      status: 'board-ready',
      evidenceScope: definition.evidenceScope,
      score: sumScore(definition.selfScore),
      maximum: 100,
      dimensions: definition.selfScore,
      risk: definition.risk,
      hardGatePassed: true,
      hardGateReason: 'Arena V2 coordinator approved the A0.2.2 board-level gate on 2026-07-28; this does not approve A0.2 overall or downstream gates.',
    },
    signOff: {
      status: 'coordination-approved',
      artDirector: { name: 'Codex / game-art-director self-review', signedAt: GENERATED_AT },
      coordinator: { name: 'Arena V2 主协调', signedAt: GENERATED_AT },
    },
    failClosed: {
      a0_2_2Passed: true,
      a0_2Passed: false,
      referenceBoardPassed: false,
      blockoutAllowed: false,
      a0_3Passed: false,
      deviceVerified: false,
      humanVerified: false,
      finalApproved: false,
    },
  };
  writeFileSync(resolve(ROOT, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  masterBoards.push({
    id: definition.id,
    manifest: { path: manifestPath, sha256: sha256File(manifestPath), byteLength: statSync(resolve(ROOT, manifestPath)).size },
    svg: manifest.sourceArtifact,
    png: manifest.reviewArtifact,
    tenPercent: manifest.tenPercentReview,
    mobile: manifest.mobileEquivalentReview,
    selfScore: manifest.selfReview,
  });
}

if (usedSources.size !== 60) throw new Error(`expected 60 unique board sources, used ${usedSources.size}`);
const supplementalSourcesUsed = [...usedSources].filter((entryId) => supplementalPack.entries.some((entry) => entry.entryId === entryId));
if (supplementalSourcesUsed.length !== 16) throw new Error(`expected all 16 supplemental direct sources, used ${supplementalSourcesUsed.length}`);
const ledgerPath = `${OUTPUT_DIR}/arena-a0.2.2-reference-board-ledger-v1.json`;
const ledger = {
  schemaVersion: 1,
  id: 'arena.art.reference-boards.a0.2.2.v1',
  status: 'board-ready',
  generatedAt: GENERATED_AT,
  baselineCommit: '8de2997a76601afce18b26d8126fb5cb24ca6feb',
  generator: { path: 'scripts/art/generate-arena-reference-boards.ts', sha256: sha256File('scripts/art/generate-arena-reference-boards.ts') },
  sourcePack: { path: SOURCE_PACK_PATH, id: sourcePack.id, sha256: sha256File(SOURCE_PACK_PATH), status: sourcePack.status },
  supplementalPack: { path: SUPPLEMENTAL_PACK_PATH, id: supplementalPack.id, sha256: sha256File(SUPPLEMENTAL_PACK_PATH), status: supplementalPack.status },
  boardCount: 6,
  sourceEntryCount: 60,
  originalApprovedSourceUseCount: 44,
  supplementalDirectSourceUseCount: 16,
  uniqueSourceUse: true,
  decisionTotals: { adopt: 42, avoid: 12, experiment: 6 },
  boards: masterBoards,
  a0_2_2GateScore: {
    total: 94,
    maximum: 100,
    dimensions: {
      boardsAndRatio: { score: 25, maximum: 25 },
      annotationActionability: { score: 19, maximum: 20 },
      sourceLicenseHash: { score: 20, maximum: 20 },
      consistencyAndAntiReference: { score: 12, maximum: 15 },
      layoutAndReviewability: { score: 8, maximum: 10 },
      dualSignOff: { score: 10, maximum: 10 },
    },
    hardGatePassed: true,
    gateReason: 'Arena V2 coordinator approved all six boards on 2026-07-28; score remains 94 and approval is limited to A0.2.2 board evidence.',
  },
  statusBoundary: {
    a0_2_2: 'board-ready',
    a0_2: 'incomplete',
    referenceBoard: 'incomplete',
    blockout: 'forbidden',
    a0_3: 'incomplete',
    device: 'incomplete',
    human: 'incomplete',
    final: 'incomplete',
  },
};
writeFileSync(resolve(ROOT, ledgerPath), `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: ledgerPath, boardCount: ledger.boardCount, sourceEntryCount: ledger.sourceEntryCount, decisionTotals: ledger.decisionTotals })}\n`);
