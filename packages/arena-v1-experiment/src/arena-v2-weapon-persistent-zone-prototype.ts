import {
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-magic-blood-scythe-definition-prototype.js';
import {
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-mammoth-stone-axe-definition-prototype.js';
import {
  advanceArenaV2WarningZone,
  createArenaV2WarningZoneRuntime,
  isArenaV2WarningZonePointInside,
} from './arena-v2-warning-zone-prototype.js';

export type ArenaV2WeaponPersistentZoneReferenceId =
  | 'magic-blood-scythe'
  | 'mammoth-stone-axe';

export type ArenaV2WeaponPersistentZoneResponsePolicy =
  | 'hold-center'
  | 'leave-before-impact'
  | 'enter-during-linger';

export type ArenaV2WeaponPersistentZoneOutcome =
  | 'hit-active'
  | 'hit-lingering'
  | 'evaded';

export interface ArenaV2WeaponPersistentZoneProbeResult {
  readonly referenceId: ArenaV2WeaponPersistentZoneReferenceId;
  readonly weaponId: string;
  readonly actionDefinitionId: string;
  readonly responsePolicy: ArenaV2WeaponPersistentZoneResponsePolicy;
  readonly warningTicks: number;
  readonly activeTicks: number;
  readonly lingerTicks: number;
  readonly lingerStartsAtTick: number;
  readonly expiresAtTickExclusive: number;
  readonly responseAtTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstLingerTick: number | null;
  readonly firstHitTick: number | null;
  readonly firstHitPhase: 'active' | 'lingering' | null;
  readonly outcome: ArenaV2WeaponPersistentZoneOutcome;
  readonly feedback: 'impact-hit' | 'linger-zone-hit' | 'route-escape';
}

export interface ArenaV2WeaponPersistentZonePrototypeResult {
  readonly researchOnly: true;
  readonly timingSource: 'definition-warning-hypothesis';
  readonly probeCount: number;
  readonly probes: readonly ArenaV2WeaponPersistentZoneProbeResult[];
}

interface PersistentZoneDefinition {
  readonly referenceId: ArenaV2WeaponPersistentZoneReferenceId;
  readonly weaponId: string;
  readonly actionDefinitionId: string;
  readonly warning: Readonly<{
    readonly warningTicks: number;
    readonly activeTicks: number;
    readonly lingerTicks: number;
    readonly radius: number;
    readonly maximumVerticalDifference: number;
  }>;
}

interface PersistentZonePoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const DEFINITIONS: readonly PersistentZoneDefinition[] = Object.freeze([
  Object.freeze({
    referenceId: 'magic-blood-scythe',
    weaponId: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.weaponId,
    actionDefinitionId: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.groundAction.id,
    warning: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.warningHypothesis,
  }),
  Object.freeze({
    referenceId: 'mammoth-stone-axe',
    weaponId: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.weaponId,
    actionDefinitionId: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.groundAction.id,
    warning: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.warningHypothesis,
  }),
]);

const RESPONSE_POLICIES: readonly ArenaV2WeaponPersistentZoneResponsePolicy[] = Object.freeze([
  'hold-center',
  'leave-before-impact',
  'enter-during-linger',
]);

function responseAtTick(
  definition: PersistentZoneDefinition,
  policy: ArenaV2WeaponPersistentZoneResponsePolicy,
): number | null {
  switch (policy) {
    case 'hold-center':
      return null;
    case 'leave-before-impact':
      return Math.max(1, definition.warning.warningTicks - 2);
    case 'enter-during-linger':
      return definition.warning.warningTicks + definition.warning.activeTicks + 1;
  }
}

function pointForPolicy(
  definition: PersistentZoneDefinition,
  policy: ArenaV2WeaponPersistentZoneResponsePolicy,
  tick: number,
): PersistentZonePoint {
  const outside = Object.freeze({
    x: definition.warning.radius + 0.8,
    y: 0,
    z: 0,
  });
  if (policy === 'hold-center') return Object.freeze({ x: 0, y: 0, z: 0 });
  if (policy === 'leave-before-impact') {
    return tick >= responseAtTick(definition, policy)! ? outside : Object.freeze({ x: 0, y: 0, z: 0 });
  }
  const responseTick = responseAtTick(definition, policy)!;
  return tick >= responseTick && tick < definition.warning.warningTicks
    + definition.warning.activeTicks + definition.warning.lingerTicks
    ? Object.freeze({ x: 0, y: 0, z: 0 })
    : outside;
}

function runProbe(
  definition: PersistentZoneDefinition,
  responsePolicy: ArenaV2WeaponPersistentZoneResponsePolicy,
): ArenaV2WeaponPersistentZoneProbeResult {
  const warning = definition.warning;
  let runtime = createArenaV2WarningZoneRuntime({
    id: `weapon-persistent-zone:${definition.referenceId}:${responsePolicy}`,
    ownerId: 'research-attacker',
    languageId: definition.referenceId,
    center: { x: 0, y: 0, z: 0 },
    radius: warning.radius,
    maximumVerticalDifference: warning.maximumVerticalDifference,
    startsAtTick: warning.warningTicks,
    activeTicks: warning.activeTicks,
    lingerTicks: warning.lingerTicks,
  });
  let firstActiveTick: number | null = null;
  let firstLingerTick: number | null = null;
  let firstHitTick: number | null = null;
  let firstHitPhase: 'active' | 'lingering' | null = null;
  for (let tick = 0; tick <= runtime.expiresAtTickExclusive; tick += 1) {
    runtime = advanceArenaV2WarningZone(runtime, tick);
    if (runtime.phase === 'active' && firstActiveTick === null) firstActiveTick = tick;
    if (runtime.phase === 'lingering' && firstLingerTick === null) firstLingerTick = tick;
    if (isArenaV2WarningZonePointInside(runtime, pointForPolicy(definition, responsePolicy, tick))) {
      firstHitTick ??= tick;
      firstHitPhase ??= runtime.phase === 'active' || runtime.phase === 'lingering'
        ? runtime.phase
        : null;
    }
  }
  const outcome: ArenaV2WeaponPersistentZoneOutcome = firstHitPhase === 'active'
    ? 'hit-active'
    : firstHitPhase === 'lingering' ? 'hit-lingering' : 'evaded';
  return Object.freeze({
    referenceId: definition.referenceId,
    weaponId: definition.weaponId,
    actionDefinitionId: definition.actionDefinitionId,
    responsePolicy,
    warningTicks: warning.warningTicks,
    activeTicks: warning.activeTicks,
    lingerTicks: warning.lingerTicks,
    lingerStartsAtTick: warning.warningTicks + warning.activeTicks,
    expiresAtTickExclusive: runtime.expiresAtTickExclusive,
    responseAtTick: responseAtTick(definition, responsePolicy),
    firstActiveTick,
    firstLingerTick,
    firstHitTick,
    firstHitPhase,
    outcome,
    feedback: outcome === 'hit-active'
      ? 'impact-hit'
      : outcome === 'hit-lingering' ? 'linger-zone-hit' : 'route-escape',
  });
}

export function runArenaV2WeaponPersistentZonePrototype(): ArenaV2WeaponPersistentZonePrototypeResult {
  const probes = DEFINITIONS.flatMap((definition) => (
    RESPONSE_POLICIES.map((responsePolicy) => runProbe(definition, responsePolicy))
  ));
  return Object.freeze({
    researchOnly: true,
    timingSource: 'definition-warning-hypothesis',
    probeCount: probes.length,
    probes: Object.freeze(probes),
  });
}
