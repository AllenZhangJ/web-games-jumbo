import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION = 1;

export const ARENA_DEVICE_ACCEPTANCE_PLATFORM = Object.freeze({
  WEB: 'web',
  WECHAT: 'wechat',
  DOUYIN: 'douyin',
} as const);

export const ARENA_DEVICE_ACCEPTANCE_SURFACE = Object.freeze({
  MOBILE_BROWSER: 'mobile-browser',
  DEVELOPER_TOOL: 'developer-tool',
  PHYSICAL_DEVICE: 'physical-device',
} as const);

export const ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND = Object.freeze({
  BUILD_MANIFEST: 'build-manifest',
  SCREENSHOT: 'screenshot',
  VIDEO: 'video',
  LOG: 'log',
  PERFORMANCE_TRACE: 'performance-trace',
} as const);

export type ArenaDeviceAcceptancePlatform =
  typeof ARENA_DEVICE_ACCEPTANCE_PLATFORM[keyof typeof ARENA_DEVICE_ACCEPTANCE_PLATFORM];
export type ArenaDeviceAcceptanceSurface =
  typeof ARENA_DEVICE_ACCEPTANCE_SURFACE[keyof typeof ARENA_DEVICE_ACCEPTANCE_SURFACE];
export type ArenaDeviceAcceptanceArtifactKind =
  typeof ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND[keyof typeof ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND];

export interface ArenaDeviceAcceptanceCheck {
  readonly id: string;
  readonly title: string;
}

export interface ArenaDeviceAcceptanceTarget {
  readonly id: string;
  readonly platform: ArenaDeviceAcceptancePlatform;
  readonly executionSurface: ArenaDeviceAcceptanceSurface;
  readonly minimumPassingRuns: number;
  readonly requiredCheckIds: readonly string[];
  readonly requiredArtifactKinds: readonly ArenaDeviceAcceptanceArtifactKind[];
  readonly requiredOsNames?: readonly string[];
}

export interface ArenaDeviceAcceptanceDefinitionData {
  readonly schemaVersion: typeof ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly stage: string;
  readonly checks: readonly ArenaDeviceAcceptanceCheck[];
  readonly targets: readonly ArenaDeviceAcceptanceTarget[];
}

const DEFINITION_KEYS = new Set(['schemaVersion', 'id', 'stage', 'checks', 'targets']);
const CHECK_KEYS = new Set(['id', 'title']);
const TARGET_KEYS = new Set([
  'id',
  'platform',
  'executionSurface',
  'minimumPassingRuns',
  'requiredCheckIds',
  'requiredArtifactKinds',
  'requiredOsNames',
]);
const MAXIMUM_CHECKS = 128;
const MAXIMUM_TARGETS = 128;

function enumValue<T extends string>(
  value: unknown,
  values: Readonly<Record<string, T>>,
  name: string,
): T {
  if (typeof value !== 'string' || !Object.values(values).includes(value as T)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function cloneChecks(values: unknown): readonly ArenaDeviceAcceptanceCheck[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaDeviceAcceptanceDefinition.checks 不能为空。');
  }
  if (values.length > MAXIMUM_CHECKS) {
    throw new RangeError(`ArenaDeviceAcceptanceDefinition.checks 不能超过 ${MAXIMUM_CHECKS} 项。`);
  }
  const ids = new Set<string>();
  const checks = values.map((value: unknown, index): ArenaDeviceAcceptanceCheck => {
    const name = `ArenaDeviceAcceptanceDefinition.checks[${index}]`;
    assertKnownKeys(value, CHECK_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复的设备验收 check ${id}。`);
    ids.add(id);
    return Object.freeze({
      id,
      title: assertNonEmptyString(value.title, `${name}.title`),
    });
  });
  return Object.freeze(checks.sort((left, right) => compareText(left.id, right.id)));
}

function cloneTargets(
  values: unknown,
  checkIds: ReadonlySet<string>,
): readonly ArenaDeviceAcceptanceTarget[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaDeviceAcceptanceDefinition.targets 不能为空。');
  }
  if (values.length > MAXIMUM_TARGETS) {
    throw new RangeError(`ArenaDeviceAcceptanceDefinition.targets 不能超过 ${MAXIMUM_TARGETS} 项。`);
  }
  const ids = new Set<string>();
  const targets = values.map((value: unknown, index): ArenaDeviceAcceptanceTarget => {
    const name = `ArenaDeviceAcceptanceDefinition.targets[${index}]`;
    assertKnownKeys(value, TARGET_KEYS, name);
    const id = assertNonEmptyString(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复的设备验收 target ${id}。`);
    ids.add(id);
    const requiredCheckIds = cloneFrozenStringSet(
      value.requiredCheckIds as readonly unknown[],
      `${name}.requiredCheckIds`,
    );
    if (requiredCheckIds.length === 0) {
      throw new RangeError(`${name}.requiredCheckIds 不能为空。`);
    }
    for (const checkId of requiredCheckIds) {
      if (!checkIds.has(checkId)) throw new RangeError(`${name} 引用未知 check ${checkId}。`);
    }
    const requiredArtifactKinds = cloneFrozenStringSet(
      value.requiredArtifactKinds as readonly unknown[],
      `${name}.requiredArtifactKinds`,
    ).map((kind) => enumValue(
      kind,
      ARENA_DEVICE_ACCEPTANCE_ARTIFACT_KIND,
      `${name}.requiredArtifactKinds`,
    ));
    if (requiredArtifactKinds.length === 0) {
      throw new RangeError(`${name}.requiredArtifactKinds 不能为空。`);
    }
    const requiredOsNames = value.requiredOsNames === undefined
      ? null
      : cloneFrozenStringSet(
        value.requiredOsNames as readonly unknown[],
        `${name}.requiredOsNames`,
      );
    if (requiredOsNames !== null && requiredOsNames.length === 0) {
      throw new RangeError(`${name}.requiredOsNames 不能是空数组。`);
    }
    const common = {
      id,
      platform: enumValue(value.platform, ARENA_DEVICE_ACCEPTANCE_PLATFORM, `${name}.platform`),
      executionSurface: enumValue(
        value.executionSurface,
        ARENA_DEVICE_ACCEPTANCE_SURFACE,
        `${name}.executionSurface`,
      ),
      minimumPassingRuns: assertIntegerAtLeast(
        value.minimumPassingRuns,
        1,
        `${name}.minimumPassingRuns`,
      ),
      requiredCheckIds,
      requiredArtifactKinds: Object.freeze(requiredArtifactKinds),
    };
    return Object.freeze(requiredOsNames === null ? common : { ...common, requiredOsNames });
  });
  return Object.freeze(targets.sort((left, right) => compareText(left.id, right.id)));
}

export class ArenaDeviceAcceptanceDefinition implements ArenaDeviceAcceptanceDefinitionData {
  readonly schemaVersion!: typeof ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION;
  readonly id!: string;
  readonly stage!: string;
  readonly checks!: readonly ArenaDeviceAcceptanceCheck[];
  readonly targets!: readonly ArenaDeviceAcceptanceTarget[];

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'ArenaDeviceAcceptanceDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'ArenaDeviceAcceptanceDefinition');
    if (source.schemaVersion !== ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ArenaDeviceAcceptanceDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    const checks = cloneChecks(source.checks);
    const targets = cloneTargets(source.targets, new Set(checks.map(({ id }) => id)));
    const referencedCheckIds = new Set(targets.flatMap(({ requiredCheckIds }) => requiredCheckIds));
    const unusedCheck = checks.find(({ id }) => !referencedCheckIds.has(id));
    if (unusedCheck) throw new RangeError(`设备验收 check ${unusedCheck.id} 未被任何 target 引用。`);
    Object.defineProperties(this, {
      schemaVersion: { value: ARENA_DEVICE_ACCEPTANCE_DEFINITION_SCHEMA_VERSION, enumerable: true },
      id: { value: assertNonEmptyString(source.id, 'ArenaDeviceAcceptanceDefinition.id'), enumerable: true },
      stage: {
        value: assertNonEmptyString(source.stage, 'ArenaDeviceAcceptanceDefinition.stage'),
        enumerable: true,
      },
      checks: { value: checks, enumerable: true },
      targets: { value: targets, enumerable: true },
    });
    Object.freeze(this);
  }

  getCheck(id: string): ArenaDeviceAcceptanceCheck | null {
    return this.checks.find((check) => check.id === id) ?? null;
  }

  getTarget(id: string): ArenaDeviceAcceptanceTarget | null {
    return this.targets.find((target) => target.id === id) ?? null;
  }

  toJSON(): ArenaDeviceAcceptanceDefinitionData {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      stage: this.stage,
      checks: this.checks,
      targets: this.targets,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(
      this.toJSON(),
      `ArenaDeviceAcceptanceDefinition ${this.id}`,
    );
  }
}

export function createArenaDeviceAcceptanceDefinition(
  value: unknown,
): ArenaDeviceAcceptanceDefinition {
  return value instanceof ArenaDeviceAcceptanceDefinition
    ? value
    : new ArenaDeviceAcceptanceDefinition(value);
}
