import { assertIntegerAtLeast } from '@number-strategy-jump/arena-contracts';

export const MAP_TIMELINE_TRANSITION = Object.freeze({
  WARNING: 'warning',
  END: 'end',
  START: 'start',
});

const TRANSITION_PRIORITY = Object.freeze({
  [MAP_TIMELINE_TRANSITION.WARNING]: 0,
  [MAP_TIMELINE_TRANSITION.END]: 1,
  [MAP_TIMELINE_TRANSITION.START]: 2,
});

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareTransitions(left, right) {
  return left.tick - right.tick
    || TRANSITION_PRIORITY[left.transition] - TRANSITION_PRIORITY[right.transition]
    || compareText(left.occurrenceId, right.occurrenceId);
}

export class MapTimeline {
  #occurrences;
  #transitionsByTick;

  constructor(mapDefinition) {
    if (!mapDefinition || !Array.isArray(mapDefinition.events)) {
      throw new TypeError('MapTimeline 需要 MapDefinition。');
    }
    const occurrences = [];
    const transitions = [];
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
    this.#transitionsByTick = new Map();
    for (const transition of transitions) {
      if (!this.#transitionsByTick.has(transition.tick)) {
        this.#transitionsByTick.set(transition.tick, []);
      }
      this.#transitionsByTick.get(transition.tick).push(transition);
    }
    for (const [tick, values] of this.#transitionsByTick) {
      this.#transitionsByTick.set(tick, Object.freeze([...values]));
    }
    Object.freeze(this);
  }

  requireOccurrence(occurrenceId) {
    const occurrence = this.#occurrences.get(occurrenceId);
    if (!occurrence) throw new RangeError(`未知 map occurrence ${String(occurrenceId)}。`);
    return occurrence;
  }

  transitionsAt(activeTick) {
    assertIntegerAtLeast(activeTick, 0, 'MapTimeline activeTick');
    return this.#transitionsByTick.get(activeTick) ?? Object.freeze([]);
  }

  listOccurrences() {
    return Object.freeze([...this.#occurrences.values()]);
  }
}
