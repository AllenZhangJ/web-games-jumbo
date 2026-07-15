import type { GameEvent } from '@number-strategy/game-contracts';

export class EventCollector {
  #nextId = 1;
  readonly #events: GameEvent[] = [];
  readonly #now: () => number;

  constructor(now: () => number) {
    this.#now = now;
  }

  emit<TPayload>(type: string, payload: TPayload): GameEvent<TPayload> {
    if (!type.trim()) throw new TypeError('事件 type 不能为空。');
    const occurredAtMs = this.#now();
    if (!Number.isFinite(occurredAtMs)) throw new TypeError('事件时钟必须返回有限数。');
    const event = Object.freeze({
      id: this.#nextId++,
      type,
      occurredAtMs,
      payload,
    });
    this.#events.push(event);
    return event;
  }

  drain(): readonly GameEvent[] {
    return this.#events.splice(0);
  }

  clear(): void {
    this.#events.length = 0;
  }
}
