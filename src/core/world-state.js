const DEFAULT_PLATFORM = Object.freeze({
  halfWidth: 1.05,
  halfDepth: 0.75,
  topY: 0,
  height: 0.34,
});

const DEFAULT_LAYOUT = Object.freeze({
  forwardMin: 3.8,
  forwardMax: 4.25,
  lateralMin: 1.25,
  lateralMax: 1.65,
  commonRangeMin: 2.6,
  commonRangeMax: 6,
});

export const PLATFORM_ROLE = Object.freeze({
  HISTORY: 'history',
  CURRENT: 'current',
  CANDIDATE: 'candidate',
});

export const BRANCH_SIDE = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
});

function clonePoint(point) {
  return { x: point.x, z: point.z };
}

function clonePosition(position) {
  return { x: position.x, y: position.y, z: position.z };
}

function assertFinitePoint(point, name, includeY = false) {
  if (!point || typeof point !== 'object') throw new TypeError(`${name} 必须是坐标对象。`);
  for (const axis of includeY ? ['x', 'y', 'z'] : ['x', 'z']) {
    if (!Number.isFinite(point[axis])) throw new TypeError(`${name}.${axis} 必须是有限数。`);
  }
}

function clonePlatform(platform) {
  const operation = platform.operation && typeof platform.operation === 'object'
    ? { ...platform.operation }
    : platform.operation;
  const payload = platform.payload && typeof platform.payload === 'object'
    ? { ...platform.payload, ...(operation ? { operation } : {}) }
    : platform.payload;
  return {
    ...platform,
    center: clonePoint(platform.center),
    heading: clonePoint(platform.heading),
    operation,
    payload,
  };
}

function normalizedHeading(heading, fallback = { x: 0, z: 1 }) {
  assertFinitePoint(heading, 'heading');
  assertFinitePoint(fallback, 'fallback heading');
  const magnitude = Math.hypot(heading.x, heading.z);
  if (magnitude < Number.EPSILON) {
    const fallbackMagnitude = Math.hypot(fallback.x, fallback.z);
    if (fallbackMagnitude < Number.EPSILON) throw new RangeError('fallback heading 不能为零向量。');
    return { x: fallback.x / fallbackMagnitude, z: fallback.z / fallbackMagnitude };
  }
  return { x: heading.x / magnitude, z: heading.z / magnitude };
}

function randomUnit(rng) {
  const value = typeof rng === 'function' ? rng() : rng?.next?.();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new TypeError('rng 必须返回 [0, 1) 内的有限数。');
  }
  return value;
}

function randomBetween(rng, min, max) {
  return min + (max - min) * randomUnit(rng);
}

function normalizeCandidateDescriptors(descriptors) {
  if (!Array.isArray(descriptors) || descriptors.length !== 2) {
    throw new RangeError('每个当前平台必须绑定恰好两个候选分支。');
  }
  if (descriptors.some((descriptor) => !descriptor || typeof descriptor !== 'object')) {
    throw new TypeError('候选分支描述必须是对象。');
  }
  return [...descriptors];
}

function validatePlatformSize(platform) {
  for (const key of ['halfWidth', 'halfDepth', 'topY', 'height']) {
    if (!Number.isFinite(platform[key])) throw new TypeError(`platform.${key} 必须是有限数。`);
  }
  if (platform.halfWidth <= 0 || platform.halfDepth <= 0 || platform.height <= 0) {
    throw new RangeError('平台半宽、半深和高度必须为正数。');
  }
}

function validateLayout(layout, platform) {
  validatePlatformSize(platform);
  const orderedPairs = [
    ['forwardMin', 'forwardMax'],
    ['lateralMin', 'lateralMax'],
    ['commonRangeMin', 'commonRangeMax'],
  ];

  for (const [minKey, maxKey] of orderedPairs) {
    if (!Number.isFinite(layout[minKey]) || !Number.isFinite(layout[maxKey])) {
      throw new TypeError(`layout.${minKey} 和 layout.${maxKey} 必须是有限数。`);
    }
    if (layout[minKey] < 0 || layout[minKey] > layout[maxKey]) {
      throw new RangeError(`layout.${minKey} 必须介于 0 和 layout.${maxKey} 之间。`);
    }
  }

  const sourceRadius = Math.hypot(platform.halfWidth, platform.halfDepth);
  const nearestCenter = Math.hypot(layout.forwardMin, layout.lateralMin);
  const farthestCenter = Math.hypot(layout.forwardMax, layout.lateralMax);
  if (nearestCenter - sourceRadius < layout.commonRangeMin
    || farthestCenter + sourceRadius > layout.commonRangeMax) {
    throw new RangeError('平台布局无法保证从当前平台任意边缘落点到候选中心仍位于常用射程。');
  }
}

function platformRadius(platform) {
  return Math.hypot(platform.halfWidth, platform.halfDepth);
}

/**
 * 返回从 source 任意合法落点到 target 中心的保守距离范围。
 */
export function candidateDistanceRange(source, target) {
  assertFinitePoint(source?.center, 'source.center');
  assertFinitePoint(target?.center, 'target.center');
  validatePlatformSize({
    ...DEFAULT_PLATFORM,
    halfWidth: source?.halfWidth,
    halfDepth: source?.halfDepth,
  });
  const centerDistance = Math.hypot(
    target.center.x - source.center.x,
    target.center.z - source.center.z,
  );
  const radius = platformRadius(source);
  return {
    min: Math.max(0, centerDistance - radius),
    max: centerDistance + radius,
  };
}

/** 检查一个世界坐标是否落在平台的矩形顶面上。 */
export function isPointOnPlatform(platform, position, margin = 0) {
  if (
    !platform?.center
    || !position
    || !Number.isFinite(position.x)
    || !Number.isFinite(position.z)
    || !Number.isFinite(platform.center.x)
    || !Number.isFinite(platform.center.z)
    || !Number.isFinite(platform.halfWidth)
    || !Number.isFinite(platform.halfDepth)
    || !Number.isFinite(margin)
    || margin < 0
  ) return false;
  return Math.abs(position.x - platform.center.x) <= platform.halfWidth + margin
    && Math.abs(position.z - platform.center.z) <= platform.halfDepth + margin;
}

function boundPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') throw new TypeError('平台 payload 必须是对象。');
  const payloadRecord = /** @type {Record<string, any>} */ (payload);
  const operation = payloadRecord.operation && typeof payloadRecord.operation === 'object'
    ? { ...payloadRecord.operation }
    : payloadRecord.operation ?? null;
  const safePayload = /** @type {Record<string, any>} */ ({
    ...payloadRecord,
    operation,
  });
  return {
    operation,
    preview: safePayload.preview ?? null,
    payload: safePayload,
  };
}

/**
 * 纯数据的连续世界平台模型。它不依赖 Canvas、DOM 或具体跳跃物理。
 */
export class WorldState {
  constructor({
    rng = /** @type {any} */ (Math.random),
    historyLimit = 3,
    platform = {},
    layout = {},
    initialCenter = { x: 0, z: 0 },
    initialHeading = { x: 0, z: 1 },
    initialCurrent = {},
    initialCandidates = [{}, {}],
  } = {}) {
    if (!Number.isInteger(historyLimit) || historyLimit < 0) {
      throw new RangeError('historyLimit 必须是大于等于 0 的整数。');
    }

    this.rng = /** @type {any} */ (rng);
    this.historyLimit = historyLimit;
    this.platformSize = Object.freeze({ ...DEFAULT_PLATFORM, ...platform });
    this.layout = Object.freeze({ ...DEFAULT_LAYOUT, ...layout });
    validateLayout(this.layout, this.platformSize);

    assertFinitePoint(initialCenter, 'initialCenter');
    this._initialCenter = clonePoint(initialCenter);
    this._initialHeading = normalizedHeading(initialHeading);
    this._nextPlatformNumber = 1;
    this.reset({ current: initialCurrent, candidates: initialCandidates });
  }

  reset({ current = {}, candidates = [{}, {}] } = {}) {
    const candidateDescriptors = normalizeCandidateDescriptors(candidates);
    if (!current || typeof current !== 'object') throw new TypeError('current 必须是对象。');
    const nextPlatformNumber = this._nextPlatformNumber;
    const rngSnapshot = this.rng?.snapshot?.();
    const heading = clonePoint(this._initialHeading);
    let stagedCurrent;
    let stagedCandidates;
    try {
      stagedCurrent = this._createPlatform({
        role: PLATFORM_ROLE.CURRENT,
        center: this._initialCenter,
        heading,
        payload: current,
        createdAtStep: 0,
      });
      stagedCandidates = this._createCandidates(stagedCurrent, candidateDescriptors, {
        heading,
        createdAtStep: 0,
      });
    } catch (error) {
      this._nextPlatformNumber = nextPlatformNumber;
      if (rngSnapshot !== undefined) this.rng.restore?.(rngSnapshot);
      throw error;
    }

    this.step = 0;
    this.heading = heading;
    this.history = [];
    this.current = stagedCurrent;
    this.candidates = stagedCandidates;
    this.player = {
      supportPlatformId: stagedCurrent.id,
      position: {
        x: stagedCurrent.center.x,
        y: stagedCurrent.topY,
        z: stagedCurrent.center.z,
      },
    };
    this._rebuildPlatforms();
    return this.snapshot();
  }

  /**
   * 将一次已经由物理层判定为成功的落地原子提交到世界。
   */
  commitLanding({ platformId, position, nextCandidates }) {
    const candidateDescriptors = normalizeCandidateDescriptors(nextCandidates);
    const selected = this.candidates.find((platform) => platform.id === platformId);
    if (!selected) {
      throw new RangeError(`平台 ${platformId} 不是当前可选候选。`);
    }
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) {
      throw new TypeError('position 必须包含有限的 x 和 z 坐标。');
    }
    if (position.y != null && !Number.isFinite(position.y)) {
      throw new TypeError('position.y 必须是有限数。');
    }
    if (!isPointOnPlatform(selected, position)) {
      throw new RangeError('落点不在所选平台的顶面内。');
    }

    const landingY = position.y ?? selected.topY;
    if (Math.abs(landingY - selected.topY) > 1e-7) {
      throw new RangeError('落点高度不在所选平台的顶面。');
    }

    const previous = this.current;
    const rejected = this.candidates.find((platform) => platform.id !== platformId);
    const nextHeading = normalizedHeading({
      x: selected.center.x - previous.center.x,
      z: selected.center.z - previous.center.z,
    }, this.heading);
    const nextPlatformNumber = this._nextPlatformNumber;
    const rngSnapshot = this.rng?.snapshot?.();
    let stagedCandidates;
    try {
      stagedCandidates = this._createCandidates(selected, candidateDescriptors, {
        heading: nextHeading,
        createdAtStep: this.step + 1,
      });
    } catch (error) {
      // Keep the visible world transaction intact if candidate generation
      // fails. Snapshot-capable RNGs are rewound as well; every gameplay field
      // remains unchanged and the caller may retry safely.
      this._nextPlatformNumber = nextPlatformNumber;
      if (rngSnapshot !== undefined) this.rng.restore?.(rngSnapshot);
      throw error;
    }

    previous.role = PLATFORM_ROLE.HISTORY;
    previous.side = null;
    this.history.push(previous);

    selected.role = PLATFORM_ROLE.CURRENT;
    selected.side = null;
    this.current = selected;
    this.heading = nextHeading;
    selected.heading = clonePoint(this.heading);

    this.player = {
      supportPlatformId: selected.id,
      position: {
        x: position.x,
        y: selected.topY,
        z: position.z,
      },
    };

    const removedHistory = this.history.length > this.historyLimit
      ? this.history.splice(0, this.history.length - this.historyLimit)
      : [];

    this.step += 1;
    this.candidates = stagedCandidates;
    this._rebuildPlatforms();

    return {
      previous: clonePlatform(previous),
      current: clonePlatform(selected),
      rejected: rejected ? clonePlatform(rejected) : null,
      removedHistory: removedHistory.map(clonePlatform),
      candidates: this.candidates.map(clonePlatform),
      player: {
        supportPlatformId: this.player.supportPlatformId,
        position: clonePosition(this.player.position),
      },
    };
  }

  snapshot() {
    const platformClones = new Map(
      this.platforms.map((platform) => [platform.id, clonePlatform(platform)]),
    );
    return {
      step: this.step,
      heading: clonePoint(this.heading),
      history: this.history.map((platform) => platformClones.get(platform.id)),
      current: platformClones.get(this.current.id),
      candidates: this.candidates.map((platform) => platformClones.get(platform.id)),
      platforms: this.platforms.map((platform) => platformClones.get(platform.id)),
      player: {
        supportPlatformId: this.player.supportPlatformId,
        position: clonePosition(this.player.position),
      },
    };
  }

  _createPlatform({ role, center, heading, side = null, payload = {}, createdAtStep = this.step }) {
    assertFinitePoint(center, 'platform center');
    const binding = boundPayload(payload);
    return {
      id: `platform-${this._nextPlatformNumber++}`,
      role,
      side,
      center: clonePoint(center),
      heading: normalizedHeading(heading),
      halfWidth: this.platformSize.halfWidth,
      halfDepth: this.platformSize.halfDepth,
      topY: this.platformSize.topY,
      height: this.platformSize.height,
      operation: binding.operation,
      preview: binding.preview,
      payload: binding.payload,
      createdAtStep,
    };
  }

  _createCandidates(origin, descriptors, {
    heading = this.heading,
    createdAtStep = this.step,
  } = {}) {
    const forward = normalizedHeading(heading);
    const right = { x: forward.z, z: -forward.x };
    const sides = [BRANCH_SIDE.LEFT, BRANCH_SIDE.RIGHT];

    return descriptors.map((payload, index) => {
      const side = sides[index];
      const sign = side === BRANCH_SIDE.LEFT ? -1 : 1;
      const forwardDistance = randomBetween(this.rng, this.layout.forwardMin, this.layout.forwardMax);
      const lateralDistance = randomBetween(this.rng, this.layout.lateralMin, this.layout.lateralMax);
      const offset = {
        x: forward.x * forwardDistance + right.x * lateralDistance * sign,
        z: forward.z * forwardDistance + right.z * lateralDistance * sign,
      };
      const candidate = this._createPlatform({
        role: PLATFORM_ROLE.CANDIDATE,
        side,
        center: {
          x: origin.center.x + offset.x,
          z: origin.center.z + offset.z,
        },
        heading: offset,
        payload,
        createdAtStep,
      });

      const distanceRange = candidateDistanceRange(origin, candidate);
      if (distanceRange.min < this.layout.commonRangeMin - Number.EPSILON
        || distanceRange.max > this.layout.commonRangeMax + Number.EPSILON) {
        throw new RangeError('生成的候选平台超出常用射程，请检查布局参数。');
      }
      return candidate;
    });
  }

  _rebuildPlatforms() {
    this.platforms = [...this.history, this.current, ...this.candidates];
  }
}
