import {
  ARENA_V2_JUMP_ROUTE_INPUTS,
  ARENA_V2_KZ_MAP_RESEARCH_CATALOG,
  createArenaV2JumpRoutePrototype,
  runArenaV2JumpRoutePrototype,
  runArenaV2KzBranchWeaponConsequencePrototype,
  type ArenaV2JumpRouteBranchOption,
  type ArenaV2JumpRoutePrototype,
  type ArenaV2JumpRouteSegment,
  type ArenaV2JumpRouteSurface,
  type ArenaV2KzBranchWeaponAttackPoint,
  type ArenaV2KzBranchWeaponConsequencePrototypeResult,
} from '@number-strategy-jump/arena-v1-experiment';

type MapMode = 'race' | 'survival';
type BranchPreference = 'fast' | 'safe';

interface KzStudyDocument extends Document {
  readonly defaultView: (Window & typeof globalThis) | null;
}

const SEGMENT_KIND_LABELS: Readonly<Record<ArenaV2JumpRouteSegment['kind'], string>> = Object.freeze({
  'basic-platform': '基础跳台',
  gap: '断层',
  stairs: '楼梯',
  maze: '迷宫',
  'narrow-path': '窄路',
  wire: '走钢丝',
});

const SURVIVAL_ROLE_LABELS: Readonly<Record<ArenaV2JumpRouteSegment['survivalLoopRole'], string>> = Object.freeze({
  safe: '安全整理段',
  pressure: '战斗压力段',
  choice: '路线选择段',
  recovery: '失败恢复段',
});

const DIFFICULTY_LABELS: Readonly<Record<keyof ArenaV2JumpRouteSegment['difficulty'], string>> = Object.freeze({
  distance: '距离',
  rhythm: '节奏',
  turn: '转向',
  route: '路线识别',
  recovery: '恢复成本',
  combat: '战斗暴露',
});

const ATTACK_POINT_LABELS: Readonly<Record<ArenaV2KzBranchWeaponAttackPoint, string>> = Object.freeze({
  entry: '入口',
  turn: '转折',
  exit: '出口',
});

const SEGMENT_REFERENCE: readonly string[] = Object.freeze([
  'kz_longjumps2',
  'kz_longjumps2',
  'kz_giantbean_b15',
  'kz_cmp_collage_v2',
  'bkz_goldbhop_v2',
  'kz_climbers_b01',
]);

const ATTACK_POINTS: readonly ArenaV2KzBranchWeaponAttackPoint[] = Object.freeze([
  'entry',
  'turn',
  'exit',
]);

function required<T extends Element>(root: ParentNode, selector: string): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`KZ 地图研究缺少 ${selector}。`);
  return node;
}

function text(node: Element, value: string): void {
  node.textContent = value;
}

function formatDifficulty(value: number): string {
  return `${value}/4`;
}

function selectedBranch(
  segment: ArenaV2JumpRouteSegment,
  preference: BranchPreference,
): ArenaV2JumpRouteBranchOption | null {
  const role = preference === 'fast' ? 'fast-exposed' : 'safe-recovery';
  return segment.branchOptions.find((branch) => branch.role === role)
    ?? segment.branchOptions[0]
    ?? null;
}

function sourceCardForSegment(segmentIndex: number) {
  const referenceId = SEGMENT_REFERENCE[segmentIndex];
  const card = ARENA_V2_KZ_MAP_RESEARCH_CATALOG.find(({ referenceId: value }) => value === referenceId);
  if (!card) throw new Error(`KZ 路线段 ${segmentIndex + 1} 缺少来源卡 ${referenceId}。`);
  return card;
}

function mainRoutePoint(route: ArenaV2JumpRoutePrototype, segment: ArenaV2JumpRouteSegment): ArenaV2JumpRouteSurface {
  const surface = route.surfaces.find(({ segmentId }) => segmentId === segment.segmentId);
  if (!surface) throw new Error(`KZ 段落 ${segment.segmentId} 缺少画布 surface。`);
  return surface;
}

function drawText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color: string,
  size = 13,
  weight = '700',
): void {
  context.fillStyle = color;
  context.font = `${weight} ${size}px "Avenir Next", "Noto Sans CJK SC", system-ui, sans-serif`;
  context.fillText(value, x, y);
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('KZ 地图研究无法创建 2D 画布。');
  return context;
}

function runStudy(documentValue: KzStudyDocument): void {
  const route = createArenaV2JumpRoutePrototype();
  const routeRun = runArenaV2JumpRoutePrototype();
  const weaponRun: ArenaV2KzBranchWeaponConsequencePrototypeResult = runArenaV2KzBranchWeaponConsequencePrototype();
  const canvas = required<HTMLCanvasElement>(documentValue, '#kz-map-canvas');
  const context = getCanvasContext(canvas);

  const segmentCount = required<HTMLElement>(documentValue, '#kz-segment-count');
  const inputCount = required<HTMLElement>(documentValue, '#kz-input-count');
  const branchCount = required<HTMLElement>(documentValue, '#kz-branch-count');
  const respawnTime = required<HTMLElement>(documentValue, '#kz-respawn-time');
  const contractStatus = required<HTMLElement>(documentValue, '#kz-contract-status');
  text(segmentCount, `${route.segments.length} 段`);
  text(inputCount, ARENA_V2_JUMP_ROUTE_INPUTS.join(' + '));
  text(branchCount, `${route.segments.reduce((count, segment) => count + segment.branchOptions.length, 0)} 条`);
  text(respawnTime, `${route.respawnSeconds} 秒`);
  text(contractStatus, routeRun.completed ? '路线可达' : '路线阻塞');

  let selectedIndex = 0;
  let mode: MapMode = 'race';
  let preference: BranchPreference = 'fast';
  let attackIndex = -1;
  let hitAreas: readonly Readonly<{ segmentIndex: number; x: number; y: number; width: number; height: number }>[] = [];

  const minX = -2;
  const maxX = 33;
  const minZ = -5;
  const maxZ = 4;
  const chartPadding = { left: 46, right: 32, top: 42, bottom: 35 };

  function mapPoint(x: number, z: number): Readonly<{ x: number; y: number }> {
    return Object.freeze({
      x: chartPadding.left + ((x - minX) / (maxX - minX)) * (canvas.width - chartPadding.left - chartPadding.right),
      y: chartPadding.top + ((maxZ - z) / (maxZ - minZ)) * (canvas.height - chartPadding.top - chartPadding.bottom),
    });
  }

  function surfaceRect(surface: ArenaV2JumpRouteSurface): Readonly<{ x: number; y: number; width: number; height: number }> {
    const topLeft = mapPoint(surface.center.x - surface.halfExtents.x, surface.center.z + surface.halfExtents.z);
    const bottomRight = mapPoint(surface.center.x + surface.halfExtents.x, surface.center.z - surface.halfExtents.z);
    return Object.freeze({
      x: topLeft.x,
      y: topLeft.y,
      width: Math.max(2, bottomRight.x - topLeft.x),
      height: Math.max(2, bottomRight.y - topLeft.y),
    });
  }

  function segmentColor(segment: ArenaV2JumpRouteSegment, active: boolean): string {
    if (active) return '#6de5d0';
    if (mode === 'survival' && segment.survivalLoopRole === 'safe') return '#376759';
    if (mode === 'survival' && segment.survivalLoopRole === 'pressure') return '#754b3a';
    if (mode === 'survival' && segment.survivalLoopRole === 'choice') return '#594b72';
    return '#2f485a';
  }

  function drawGrid(): void {
    context.fillStyle = '#0c141d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgb(109 229 208 / 8%)';
    context.lineWidth = 1;
    for (let x = minX; x <= maxX; x += 2) {
      const point = mapPoint(x, minZ);
      const top = mapPoint(x, maxZ);
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(top.x, top.y);
      context.stroke();
    }
    for (let z = minZ; z <= maxZ; z += 1) {
      const left = mapPoint(minX, z);
      const right = mapPoint(maxX, z);
      context.beginPath();
      context.moveTo(left.x, left.y);
      context.lineTo(right.x, right.y);
      context.stroke();
    }
    drawText(context, mode === 'race' ? 'RACE / FINISH ACTIVE' : 'SURVIVAL / LOOP SPACE', chartPadding.left, 25, mode === 'race' ? '#ff9b63' : '#91e6a8', 11, '800');
    drawText(context, 'Z · 路线高度', 8, chartPadding.top - 4, '#718892', 10, '600');
    drawText(context, 'X · 进度方向', canvas.width - 110, canvas.height - 10, '#718892', 10, '600');
  }

  function drawPolyline(points: readonly Readonly<{ x: number; y: number }>[], color: string, lineWidth: number, dashed = false): void {
    if (points.length < 2) return;
    context.save();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.setLineDash(dashed ? [8, 7] : []);
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
    context.restore();
  }

  function drawBranches(): void {
    for (const segment of route.segments) {
      for (const branch of segment.branchOptions) {
        const selected = segment === route.segments[selectedIndex]
          && selectedBranch(segment, preference)?.branchId === branch.branchId;
        const points = branch.waypoints.map(({ x, z }) => mapPoint(x, z));
        drawPolyline(
          points,
          selected ? (branch.role === 'fast-exposed' ? '#ff9b63' : '#91e6a8') : 'rgb(151 169 178 / 55%)',
          selected ? 6 : 2,
          !selected,
        );
      }
    }
  }

  function drawMainSurfaces(): void {
    hitAreas = route.segments.map((segment, segmentIndex) => {
      const surfaces = route.surfaces.filter(({ segmentId }) => segmentId === segment.segmentId);
      for (const surface of surfaces) {
        const rect = surfaceRect(surface);
        const active = segmentIndex === selectedIndex;
        context.fillStyle = segmentColor(segment, active);
        context.fillRect(rect.x, rect.y, rect.width, rect.height);
        context.strokeStyle = active ? '#f6d994' : 'rgb(109 229 208 / 30%)';
        context.lineWidth = active ? 2 : 1;
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
      const first = surfaces[0];
      if (!first) throw new Error(`KZ 画布缺少 ${segment.segmentId} 的 surface。`);
      const rect = surfaceRect(first);
      drawText(context, `${String(segmentIndex + 1).padStart(2, '0')} ${SEGMENT_KIND_LABELS[segment.kind]}`, rect.x, Math.max(chartPadding.top + 13, rect.y - 8), segmentIndex === selectedIndex ? '#f6d994' : '#9baab0', 11, '800');
      return Object.freeze({ segmentIndex, x: rect.x - 10, y: rect.y - 18, width: Math.max(35, rect.width + 20), height: Math.max(38, rect.height + 36) });
    });
  }

  function drawFinishAndSpawn(): void {
    const start = mapPoint(route.anchors['anchor-start']!.x, route.anchors['anchor-start']!.z);
    context.fillStyle = '#6de5d0';
    context.beginPath();
    context.arc(start.x, start.y, 7, 0, Math.PI * 2);
    context.fill();
    drawText(context, 'START', start.x - 18, start.y - 13, '#6de5d0', 10, '800');
    if (mode === 'race') {
      const finishAnchor = route.anchors[route.finishAnchor];
      if (!finishAnchor) throw new Error('KZ 画布缺少终点锚点。');
      const finish = mapPoint(finishAnchor.x, finishAnchor.z);
      context.strokeStyle = '#ff9b63';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(finish.x, finish.y - 17);
      context.lineTo(finish.x, finish.y + 10);
      context.stroke();
      context.fillStyle = '#ff9b63';
      context.fillRect(finish.x, finish.y - 17, 25, 11);
      drawText(context, 'FINISH', finish.x - 12, finish.y + 25, '#ff9b63', 10, '800');
    }
  }

  function drawAttackPoint(): void {
    if (attackIndex < 0) return;
    const segment = route.segments[selectedIndex];
    if (!segment) throw new Error(`KZ 画布不存在第 ${selectedIndex + 1} 段。`);
    const branch = selectedBranch(segment, preference);
    const fraction = [0.2, 0.52, 0.84][attackIndex] ?? 0.2;
    let point: Readonly<{ x: number; y: number }>;
    if (branch) {
      const waypointIndex = Math.min(branch.waypoints.length - 1, Math.round((branch.waypoints.length - 1) * fraction));
      const waypoint = branch.waypoints[waypointIndex]!;
      point = mapPoint(waypoint.x, waypoint.z);
    } else {
      const surfaces = route.surfaces.filter(({ segmentId }) => segmentId === segment.segmentId);
      const surface = surfaces[Math.min(surfaces.length - 1, Math.round((surfaces.length - 1) * fraction))] ?? mainRoutePoint(route, segment);
      point = mapPoint(surface.center.x, surface.center.z);
    }
    context.save();
    context.strokeStyle = '#ff756e';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(point.x, point.y, 14, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = 'rgb(255 117 110 / 24%)';
    context.beginPath();
    context.arc(point.x, point.y, 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
    drawText(context, `攻击点·${ATTACK_POINT_LABELS[ATTACK_POINTS[attackIndex]!]}`, point.x + 17, point.y + 4, '#ff756e', 11, '800');
  }

  function drawCanvas(): void {
    drawGrid();
    drawBranches();
    drawMainSurfaces();
    drawFinishAndSpawn();
    drawAttackPoint();
  }

  function renderMetrics(segment: ArenaV2JumpRouteSegment): void {
    const metrics = required<HTMLElement>(documentValue, '#kz-selected-metrics');
    metrics.replaceChildren();
    for (const [key, label] of Object.entries(DIFFICULTY_LABELS)) {
      const item = documentValue.createElement('div');
      item.className = 'kz-axis';
      const name = documentValue.createElement('span');
      text(name, label);
      const value = documentValue.createElement('strong');
      text(value, formatDifficulty(segment.difficulty[key as keyof typeof segment.difficulty]));
      item.append(name, value);
      metrics.append(item);
    }
  }

  function renderEvidence(segmentIndex: number): void {
    const card = sourceCardForSegment(segmentIndex);
    const root = required<HTMLElement>(documentValue, '#kz-evidence-card');
    root.replaceChildren();
    const source = documentValue.createElement('div');
    const title = documentValue.createElement('h3');
    text(title, card.title);
    const focus = documentValue.createElement('p');
    text(focus, `移动重点：${card.movementFocus}`);
    const observed = documentValue.createElement('ul');
    for (const item of card.observedFeatures) {
      const li = documentValue.createElement('li');
      text(li, item);
      observed.append(li);
    }
    source.append(title, focus, observed);
    const facts = documentValue.createElement('div');
    facts.className = 'kz-evidence-facts';
    const translationLabel = documentValue.createElement('span');
    translationLabel.className = 'kz-label';
    text(translationLabel, 'Arena 迁移结论');
    const translation = documentValue.createElement('strong');
    text(translation, card.arenaLesson);
    const factsList = documentValue.createElement('dl');
    const factPairs: readonly [string, string][] = [
      ['来源难度', card.sourceProfile.difficulty],
      ['来源长度', card.sourceProfile.length],
      ['检查点', card.sourceProfile.checkpointCount === null ? '未公布' : String(card.sourceProfile.checkpointCount)],
      ['生产状态', card.productionAssetStatus],
    ];
    for (const [label, value] of factPairs) {
      const term = documentValue.createElement('dt');
      text(term, label);
      const description = documentValue.createElement('dd');
      text(description, value);
      factsList.append(term, description);
    }
    const link = documentValue.createElement('a');
    link.href = card.sourceUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    text(link, '打开研究来源');
    facts.append(translationLabel, translation, factsList, link);
    root.append(source, facts);
  }

  function renderInspector(): void {
    const segment = route.segments[selectedIndex];
    if (!segment) throw new Error(`KZ 研究不存在第 ${selectedIndex + 1} 段。`);
    const branch = selectedBranch(segment, preference);
    text(required(documentValue, '#kz-selected-index'), `SEGMENT ${String(selectedIndex + 1).padStart(2, '0')}`);
    text(required(documentValue, '#kz-selected-role'), segment.survivalLoopRole.toUpperCase());
    text(required(documentValue, '#kz-selected-title'), SEGMENT_KIND_LABELS[segment.kind]);
    text(required(documentValue, '#kz-selected-lesson'), `先学：${segment.lesson}`);
    renderMetrics(segment);
    text(required(documentValue, '#kz-selected-response'), segment.responseOptions.join(' / '));
    text(required(documentValue, '#kz-selected-recovery'), `命中后的恢复：${segment.hitRecovery} · 回应窗口 ${segment.responseWindowTicks} tick`);
    text(required(documentValue, '#kz-selected-survival-role'), SURVIVAL_ROLE_LABELS[segment.survivalLoopRole]);
    text(required(documentValue, '#kz-selected-remix'), `再练：${segment.remix}`);
    const attackPoint = attackIndex < 0 ? null : ATTACK_POINTS[attackIndex];
    text(required(documentValue, '#kz-selected-attack-point'), `${attackPoint ? ATTACK_POINT_LABELS[attackPoint] : '入口'}·${attackPoint ? '已标记' : '尚未标记'}`);
    const attackResult = required(documentValue, '#kz-selected-attack-result');
    if (!attackPoint) {
      text(attackResult, branch
        ? `${branch.label}：预计路线 ${branch.routeTicks} tick，攻击暴露 ${branch.exposureWindowTicks} tick。`
        : '这段没有分叉攻击探针；先验证主路线的回应窗口和恢复关系。');
    } else if (!branch) {
      text(attackResult, `主路线攻击点已标出；本段的直接回应是 ${segment.responseOptions.join(' / ')}。`);
    } else {
      const summary = weaponRun.attackPointSummaries.find((candidate) => (
        candidate.segmentId === segment.segmentId
        && candidate.branchId === branch.branchId
        && candidate.attackPoint === attackPoint
      ));
      text(attackResult, summary
        ? `${branch.label}：${summary.hitCount}/${summary.probeCount} 命中，${summary.ringOutCount} 次击落，${summary.surfaceTransferCount} 次落点转移。`
        : `${branch.label}：尚无 ${ATTACK_POINT_LABELS[attackPoint]} 的攻击探针结果。`);
    }
    const caption = required(documentValue, '#kz-canvas-caption');
    text(caption, mode === 'race'
      ? `${SEGMENT_KIND_LABELS[segment.kind]}是竞速路线的一段；终点当前生效。`
      : `${SEGMENT_KIND_LABELS[segment.kind]}转为${SURVIVAL_ROLE_LABELS[segment.survivalLoopRole]}；终点已移除。`);
    const announcement = required(documentValue, '#kz-canvas-announcement');
    text(announcement, branch
      ? `${branch.label} · 预计 ${branch.routeTicks} tick · 攻击暴露 ${branch.exposureWindowTicks} tick`
      : '主路线 · 没有额外分叉');
    renderEvidence(selectedIndex);
  }

  function renderSegmentNav(): void {
    const nav = required<HTMLElement>(documentValue, '#kz-segment-nav');
    nav.replaceChildren();
    route.segments.forEach((segment, index) => {
      const button = documentValue.createElement('button');
      button.type = 'button';
      button.dataset.segmentIndex = String(index);
      button.setAttribute('aria-current', index === selectedIndex ? 'true' : 'false');
      const strong = documentValue.createElement('strong');
      text(strong, `${String(index + 1).padStart(2, '0')} · ${SEGMENT_KIND_LABELS[segment.kind]}`);
      const small = documentValue.createElement('small');
      text(small, `${SURVIVAL_ROLE_LABELS[segment.survivalLoopRole]} · 战斗 ${formatDifficulty(segment.difficulty.combat)}`);
      button.append(strong, small);
      button.addEventListener('click', () => {
        selectedIndex = index;
        attackIndex = -1;
        renderSegmentNav();
        renderInspector();
        drawCanvas();
      });
      nav.append(button);
    });
  }

  function setMode(nextMode: MapMode): void {
    mode = nextMode;
    for (const button of documentValue.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      button.setAttribute('aria-pressed', button.dataset.mode === mode ? 'true' : 'false');
    }
    renderInspector();
    drawCanvas();
  }

  function setPreference(nextPreference: BranchPreference): void {
    preference = nextPreference;
    for (const button of documentValue.querySelectorAll<HTMLButtonElement>('[data-branch]')) {
      button.setAttribute('aria-pressed', button.dataset.branch === preference ? 'true' : 'false');
    }
    renderInspector();
    drawCanvas();
  }

  for (const button of documentValue.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
    button.addEventListener('click', () => setMode(button.dataset.mode as MapMode));
  }
  for (const button of documentValue.querySelectorAll<HTMLButtonElement>('[data-branch]')) {
    button.addEventListener('click', () => setPreference(button.dataset.branch as BranchPreference));
  }
  required<HTMLButtonElement>(documentValue, '#kz-attack-button').addEventListener('click', () => {
    attackIndex = (attackIndex + 1) % ATTACK_POINTS.length;
    renderInspector();
    drawCanvas();
  });
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    const hit = hitAreas.find(({ x: left, y: top, width, height }) => x >= left && x <= left + width && y >= top && y <= top + height);
    if (!hit) return;
    selectedIndex = hit.segmentIndex;
    attackIndex = -1;
    renderSegmentNav();
    renderInspector();
    drawCanvas();
  });

  renderSegmentNav();
  renderInspector();
  drawCanvas();
}

const documentValue = document as KzStudyDocument;
try {
  runStudy(documentValue);
} catch (error) {
  const message = error instanceof Error ? error.message : 'KZ 地图研究页面初始化失败。';
  const alert = documentValue.querySelector<HTMLElement>('#kz-study-error');
  if (alert) {
    text(alert, message);
    alert.hidden = false;
  }
}
