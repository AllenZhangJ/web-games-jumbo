import {
  assertKnownKeys,
  assertNonEmptyString,
} from '../../rules/definition-utils.js';

const EMPTY_PARAMETERS = new Set();
const MILESTONE_PARAMETERS = new Set(['startId', 'endId']);
const LONG_FRAME_PARAMETERS = new Set(['thresholdMs']);
const RESOURCE_PARAMETERS = new Set(['field']);
const MEMORY_BUDGET_PARAMETERS = new Set(['maximumJsHeapBytes', 'maximumProcessMemoryBytes']);
const LIFECYCLE_PARAMETERS = new Set(['field']);
const RESOURCE_FIELDS = new Set([
  'drawCalls',
  'triangles',
  'points',
  'lines',
  'programs',
  'geometries',
  'textures',
  'jsHeapBytes',
  'processMemoryBytes',
]);
const LIFECYCLE_FIELDS = new Set([
  'hideCount',
  'showCount',
  'contextLostCount',
  'contextRestoredCount',
]);

function available(value, unit, { numerator = null, denominator = null } = {}) {
  return Object.freeze({ available: true, value, unit, numerator, denominator, reason: null });
}

function unavailable(reason) {
  return Object.freeze({
    available: false,
    value: null,
    unit: null,
    numerator: null,
    denominator: null,
    reason,
  });
}

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} 必须是有限正数。`);
  return value;
}

function quantile(values, probability) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(probability * sorted.length) - 1)];
}

function maximum(values) {
  let result = -Infinity;
  for (const value of values) {
    if (value > result) result = value;
  }
  return result;
}

function safeIntegerSum(values, name) {
  let result = 0;
  for (const value of values) {
    result += value;
    if (!Number.isSafeInteger(result)) throw new RangeError(`${name} 求和溢出。`);
  }
  return result;
}

function noParameters(parameters, name) {
  assertKnownKeys(parameters, EMPTY_PARAMETERS, name);
}

function milestoneMap(record) {
  return new Map(record.capture.probe.milestones.map(({ id, elapsedMs }) => [id, elapsedMs]));
}

function renderedIntervals(record) {
  const rendered = record.capture.probe.frames.filter(({ rendered: value }) => value);
  const intervals = [];
  for (let index = 1; index < rendered.length; index += 1) {
    intervals.push(rendered[index].elapsedMs - rendered[index - 1].elapsedMs);
  }
  return intervals;
}

function resourceValues(record, parameters, name) {
  assertKnownKeys(parameters, RESOURCE_PARAMETERS, name);
  const field = assertNonEmptyString(parameters.field, `${name}.field`);
  if (!RESOURCE_FIELDS.has(field)) throw new RangeError(`${name}.field 不受支持：${field}。`);
  return record.capture.probe.resources
    .map((sample) => sample[field])
    .filter((value) => value !== null);
}

export class ArenaPerformanceMetricCollectorRegistry {
  #collectors;

  constructor(values = []) {
    if (!Array.isArray(values)) throw new TypeError('性能 Metric collectors 必须是数组。');
    this.#collectors = new Map();
    for (const value of values) this.register(value);
  }

  register(value) {
    if (!value || typeof value !== 'object') throw new TypeError('性能 Metric collector 无效。');
    const id = assertNonEmptyString(value.id, 'ArenaPerformanceMetricCollector.id');
    if (typeof value.collect !== 'function') {
      throw new TypeError(`ArenaPerformanceMetricCollector ${id} 缺少 collect()。`);
    }
    if (this.#collectors.has(id)) throw new RangeError(`重复性能 Metric collector ${id}。`);
    this.#collectors.set(id, Object.freeze({ id, collect: value.collect }));
    return this;
  }

  require(id) {
    const collector = this.#collectors.get(id);
    if (!collector) throw new RangeError(`未知性能 Metric collector ${String(id)}。`);
    return collector;
  }

  listIds() {
    return Object.freeze([...this.#collectors.keys()].sort());
  }
}

const BUILTIN_COLLECTORS = [
  {
    id: 'observer-error-count',
    collect(record, parameters) {
      noParameters(parameters, 'observer-error-count parameters');
      return available(record.capture.observerErrorCount, 'count');
    },
  },
  {
    id: 'soak-duration-ms',
    collect(record, parameters) {
      noParameters(parameters, 'soak-duration-ms parameters');
      return available(record.capture.probe.durationMs, 'ms');
    },
  },
  {
    id: 'observed-match-count',
    collect(record, parameters) {
      noParameters(parameters, 'observed-match-count parameters');
      return available(record.capture.observedMatchCount, 'count');
    },
  },
  {
    id: 'recorded-frame-count',
    collect(record, parameters) {
      noParameters(parameters, 'recorded-frame-count parameters');
      return available(record.capture.probe.recordedFrameCount, 'count');
    },
  },
  {
    id: 'dropped-frame-sample-count',
    collect(record, parameters) {
      noParameters(parameters, 'dropped-frame-sample-count parameters');
      return available(record.capture.probe.droppedFrameSampleCount, 'count');
    },
  },
  {
    id: 'dropped-resource-sample-count',
    collect(record, parameters) {
      noParameters(parameters, 'dropped-resource-sample-count parameters');
      return available(record.capture.probe.droppedResourceSampleCount, 'count');
    },
  },
  {
    id: 'recorded-resource-sample-count',
    collect(record, parameters) {
      noParameters(parameters, 'recorded-resource-sample-count parameters');
      return available(record.capture.probe.resources.length, 'count');
    },
  },
  {
    id: 'memory-sample-count',
    collect(record, parameters) {
      noParameters(parameters, 'memory-sample-count parameters');
      return available(record.capture.probe.resources.filter((sample) => (
        sample.jsHeapBytes !== null || sample.processMemoryBytes !== null
      )).length, 'count');
    },
  },
  {
    id: 'milestone-duration-ms',
    collect(record, parameters) {
      assertKnownKeys(parameters, MILESTONE_PARAMETERS, 'milestone-duration-ms parameters');
      const endId = assertNonEmptyString(parameters.endId, 'milestone-duration-ms.endId');
      const startId = parameters.startId === undefined
        ? null
        : assertNonEmptyString(parameters.startId, 'milestone-duration-ms.startId');
      const milestones = milestoneMap(record);
      const end = milestones.get(endId);
      const start = startId === null ? 0 : milestones.get(startId);
      if (end === undefined) return unavailable(`缺少 milestone ${endId}。`);
      if (start === undefined) return unavailable(`缺少 milestone ${startId}。`);
      if (end < start) return unavailable(`milestone ${endId} 早于 ${startId}。`);
      return available(end - start, 'ms');
    },
  },
  {
    id: 'rendered-frame-count',
    collect(record, parameters) {
      noParameters(parameters, 'rendered-frame-count parameters');
      return available(
        record.capture.probe.frames.filter(({ rendered }) => rendered).length,
        'count',
      );
    },
  },
  {
    id: 'rendered-frame-interval-p95-ms',
    collect(record, parameters) {
      noParameters(parameters, 'rendered-frame-interval-p95-ms parameters');
      const intervals = renderedIntervals(record);
      const value = quantile(intervals, 0.95);
      return value === null ? unavailable('渲染帧间隔样本不足。') : available(value, 'ms');
    },
  },
  {
    id: 'render-duration-p95-ms',
    collect(record, parameters) {
      noParameters(parameters, 'render-duration-p95-ms parameters');
      const values = record.capture.probe.frames
        .map(({ renderDurationMicroseconds }) => renderDurationMicroseconds)
        .filter((value) => value !== null)
        .map((value) => value / 1_000);
      const value = quantile(values, 0.95);
      return value === null ? unavailable('宿主未提供 render duration。') : available(value, 'ms');
    },
  },
  {
    id: 'long-rendered-frame-share',
    collect(record, parameters) {
      assertKnownKeys(parameters, LONG_FRAME_PARAMETERS, 'long-rendered-frame-share parameters');
      const thresholdMs = finitePositive(
        parameters.thresholdMs,
        'long-rendered-frame-share.thresholdMs',
      );
      const intervals = renderedIntervals(record);
      if (intervals.length === 0) return unavailable('渲染帧间隔样本不足。');
      const numerator = intervals.filter((value) => value > thresholdMs).length;
      return available(numerator / intervals.length, 'ratio', {
        numerator,
        denominator: intervals.length,
      });
    },
  },
  {
    id: 'core-catch-up-frame-share',
    collect(record, parameters) {
      noParameters(parameters, 'core-catch-up-frame-share parameters');
      const active = record.capture.probe.frames.filter(({ coreSteps }) => coreSteps > 0);
      if (active.length === 0) return unavailable('没有 Core 活跃帧。');
      const numerator = active.filter(({ coreSteps }) => coreSteps > 1).length;
      return available(numerator / active.length, 'ratio', {
        numerator,
        denominator: active.length,
      });
    },
  },
  {
    id: 'dropped-core-time-ms',
    collect(record, parameters) {
      noParameters(parameters, 'dropped-core-time-ms parameters');
      const microseconds = safeIntegerSum(
        record.capture.probe.frames.map(({ droppedMicroseconds }) => droppedMicroseconds),
        'dropped-core-time-ms',
      );
      return available(microseconds / 1_000, 'ms');
    },
  },
  {
    id: 'resource-peak',
    collect(record, parameters) {
      const values = resourceValues(record, parameters, 'resource-peak parameters');
      return values.length === 0
        ? unavailable(`资源字段 ${parameters.field} 不可用。`)
        : available(maximum(values), parameters.field.endsWith('Bytes') ? 'bytes' : 'count');
    },
  },
  {
    id: 'resource-tail-growth',
    collect(record, parameters) {
      const values = resourceValues(record, parameters, 'resource-tail-growth parameters');
      if (values.length < 4) return unavailable(`资源字段 ${parameters.field} 样本不足。`);
      const baselineEnd = Math.max(1, Math.floor(values.length / 2));
      const tailStart = Math.max(baselineEnd, Math.floor(values.length * 0.8));
      const baselinePeak = maximum(values.slice(0, baselineEnd));
      const tailPeak = maximum(values.slice(tailStart));
      return available(
        Math.max(0, tailPeak - baselinePeak),
        parameters.field.endsWith('Bytes') ? 'bytes' : 'count',
      );
    },
  },
  {
    id: 'memory-budget-ratio',
    collect(record, parameters) {
      assertKnownKeys(parameters, MEMORY_BUDGET_PARAMETERS, 'memory-budget-ratio parameters');
      const maximumJsHeapBytes = finitePositive(
        parameters.maximumJsHeapBytes,
        'memory-budget-ratio.maximumJsHeapBytes',
      );
      const maximumProcessMemoryBytes = finitePositive(
        parameters.maximumProcessMemoryBytes,
        'memory-budget-ratio.maximumProcessMemoryBytes',
      );
      const ratios = [];
      for (const sample of record.capture.probe.resources) {
        if (sample.jsHeapBytes !== null) ratios.push(sample.jsHeapBytes / maximumJsHeapBytes);
        if (sample.processMemoryBytes !== null) {
          ratios.push(sample.processMemoryBytes / maximumProcessMemoryBytes);
        }
      }
      return ratios.length === 0
        ? unavailable('宿主和外部工具均未提供可验证内存样本。')
        : available(maximum(ratios), 'budget-ratio');
    },
  },
  {
    id: 'memory-tail-growth-budget-ratio',
    collect(record, parameters) {
      assertKnownKeys(
        parameters,
        MEMORY_BUDGET_PARAMETERS,
        'memory-tail-growth-budget-ratio parameters',
      );
      const budgets = [
        ['jsHeapBytes', finitePositive(
          parameters.maximumJsHeapBytes,
          'memory-tail-growth-budget-ratio.maximumJsHeapBytes',
        )],
        ['processMemoryBytes', finitePositive(
          parameters.maximumProcessMemoryBytes,
          'memory-tail-growth-budget-ratio.maximumProcessMemoryBytes',
        )],
      ];
      const ratios = [];
      for (const [field, budget] of budgets) {
        const values = record.capture.probe.resources
          .map((sample) => sample[field])
          .filter((value) => value !== null);
        if (values.length < 4) continue;
        const baselineEnd = Math.max(1, Math.floor(values.length / 2));
        const tailStart = Math.max(baselineEnd, Math.floor(values.length * 0.8));
        const baselinePeak = maximum(values.slice(0, baselineEnd));
        const tailPeak = maximum(values.slice(tailStart));
        ratios.push(Math.max(0, tailPeak - baselinePeak) / budget);
      }
      return ratios.length === 0
        ? unavailable('可验证内存样本不足，无法计算尾部增长。')
        : available(maximum(ratios), 'budget-ratio');
    },
  },
  {
    id: 'lifecycle-counter',
    collect(record, parameters) {
      assertKnownKeys(parameters, LIFECYCLE_PARAMETERS, 'lifecycle-counter parameters');
      const field = assertNonEmptyString(parameters.field, 'lifecycle-counter.field');
      if (!LIFECYCLE_FIELDS.has(field)) {
        throw new RangeError(`lifecycle-counter.field 不受支持：${field}。`);
      }
      return available(record.capture.lifecycle[field], 'count');
    },
  },
];

export const ARENA_DEFAULT_PERFORMANCE_METRIC_REGISTRY =
  new ArenaPerformanceMetricCollectorRegistry(BUILTIN_COLLECTORS);
