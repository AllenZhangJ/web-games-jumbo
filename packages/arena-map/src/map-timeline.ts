import { assertIntegerAtLeast } from '@number-strategy-jump/arena-contracts';
import type { MapDefinition, MapEventDefinition } from '@number-strategy-jump/arena-definitions';

export const MAP_TIMELINE_TRANSITION = Object.freeze({
  WARNING: 'warning',
  END: 'end',
  START: 'start',
} as const);

export type MapTimelineTransitionKind =
  typeof MAP_TIMELINE_TRANSITION[keyof typeof MAP_TIMELINE_TRANSITION];

export interface MapOccurrence {
  readonly occurrenceId: string;
  readonly occurrenceIndex: number;
  readonly eventId: string;
  readonly kind: string;
  readonly warningTick: number;
  readonly startTick: number;
  readonly endTick: number | null;
  readonly event: MapEventDefinition;
}

export interface MapTimelineTransition {
  readonly tick: number;
  readonly transition: MapTimelineTransitionKind;
  readonly occurrenceId: string;
}

const TRANSITION_PRIORITY: Readonly<Record<MapTimelineTransitionKind, number>> = Object.freeze({
  [MAP_TIMELINE_TRANSITION.WARNING]: 0,
  [MAP_TIMELINE_TRANSITION.END]: 1,
  [MAP_TIMELINE_TRANSITION.START]: 2,
});

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareTransitions(
  left: MapTimelineTransition,
  right: MapTimelineTransition,
): number {
  return left.tick - right.tick
    || TRANSITION_PRIORITY[left.transition] - TRANSITION_PRIORITY[right.transition]
    || compareText(left.occurrenceId, right.occurrenceId);
}

export class MapTimeline {
  readonly #occurrences: Map<string, MapOccurrence>;
  readonly #transitionsByTick: Map<number, readonly MapTimelineTransition[]>;

  constructor(mapDefinition: MapDefinition) {
    if (!mapDefinition || !Array.isArray(mapDefinition.events)) {
      throw new TypeError('MapTimeline 需要 MapDefinition。');
    }
    const occurrences: MapOccurrence[] = [];
    const transitions: MapTimelineTransition[] = [];
    for (const event of mapDefinition.events) {
      for (let index = 0; index < event.schedule.repeatCount; index += 1) {
        const startTick = event.schedule.startTick + event.schedule.repeatEveryTicks * index;
        const occurrence = Object.freeze({
          occurrenceId: `${event.id}:${index}`,
          occurrenceIndex: index,
          eventId: event.id,
          kind: event.kind,
          warningTick: startTick - event.schedule.warningLeadTicks,
          startTick,
          endTick: event.schedule.durationTicks > 0
            ? startTick + event.schedule.durationTicks
            : null,
          event,
        });
        occurrences.push(occurrence);
        transitions.push(Object.freeze({
          tick: occurrence.warningTick,
          transition: MAP_TIMELINE_TRANSITION.WARNING,
          occurrenceId: occurrence.occurrenceId,
        }));
        if (occurrence.endTick !== null) {
          transitions.push(Object.freeze({
            tick: occurrence.endTick,
            transition: MAP_TIMELINE_TRANSITION.END,
            occurrenceId: occurrence.occurrenceId,
          }));
        }
        transitions.push(Object.freeze({
          tick: occurrence.startTick,
          transition: MAP_TIMELINE_TRANSITION.START,
          occurrenceId: occurrence.occurrenceId,
        }));
      }
    }
    occurrences.sort((left, right) => (
      left.startTick - right.startTick || compareText(left.occurrenceId, right.occurrenceId)
    ));
    transitions.sort(compareTransitions);
    this.#occurrences = new Map(occurrences.map((occurrence) => [
      occurrence.occurrenceId,
      occurrence,
    ]));
    const transitionsByTick = new Map<number, MapTimelineTransition[]>();
    for (const transition of transitions) {
      const values = transitionsByTick.get(transition.tick) ?? [];
      values.push(transition);
      transitionsByTick.set(transition.tick, values);
    }
    this.#transitionsByTick = new Map();
    for (const [tick, values] of transitionsByTick) {
      this.#transitionsByTick.set(tick, Object.freeze([...values]));
    }
    Object.freeze(this);
  }

  requireOccurrence(occurrenceId: unknown): MapOccurrence {
    const occurrence = typeof occurrenceId === 'string'
      ? this.#occurrences.get(occurrenceId)
      : undefined;
    if (!occurrence) throw new RangeError(`未知 map occurrence ${String(occurrenceId)}。`);
    return occurrence;
  }

  transitionsAt(activeTick: unknown): readonly MapTimelineTransition[] {
    const tick = assertIntegerAtLeast(activeTick, 0, 'MapTimeline activeTick');
    return this.#transitionsByTick.get(tick) ?? Object.freeze([]);
  }

  listOccurrences(): readonly MapOccurrence[] {
    return Object.freeze([...this.#occurrences.values()]);
  }
}
