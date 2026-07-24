import type {
  ArenaMapOccurrenceSnapshot,
  ArenaMapSnapshot,
  ArenaMapSurfaceSnapshot,
  DeepReadonly,
} from '@number-strategy-jump/arena-contracts';

export const MAP_OCCURRENCE_PHASE = Object.freeze({
  DORMANT: 'dormant',
  WARNING: 'warning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ENDED: 'ended',
} as const);

export type MapOccurrencePhase =
  typeof MAP_OCCURRENCE_PHASE[keyof typeof MAP_OCCURRENCE_PHASE];

export type SerializableMapOccurrencePhase = Exclude<MapOccurrencePhase, 'dormant'>;

export interface MapRuntimeSurfaceState extends ArenaMapSurfaceSnapshot {
  enabled: boolean;
  revision: number;
}

export interface MapRuntimeOccurrenceState {
  readonly occurrenceId: string;
  readonly eventId: string;
  readonly kind: string;
  readonly warningTick: number;
  readonly startTick: number;
  readonly endTick: number | null;
  phase: MapOccurrencePhase;
  privatePlan: DeepReadonly<unknown> | null;
  publicPayload: DeepReadonly<unknown> | null;
  revision: number;
}

export interface MapRuntimeInternalOccurrenceSnapshot
  extends Omit<ArenaMapOccurrenceSnapshot, 'phase' | 'privatePlan'> {
  readonly phase: SerializableMapOccurrencePhase;
  readonly privatePlan: DeepReadonly<unknown>;
}

export interface MapRuntimeInternalSnapshot extends Omit<ArenaMapSnapshot, 'occurrences'> {
  readonly occurrences: readonly MapRuntimeInternalOccurrenceSnapshot[];
}
