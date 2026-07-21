import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type { Vector3Definition } from '@number-strategy-jump/arena-definitions';

const HANDLER_KEYS = new Set(['kind', 'validate', 'execute']);

export type MapCommandPhase = 'start' | 'tick' | 'end';

export interface MapCommandMetadata {
  readonly occurrenceId: string;
  readonly mapEventId: string;
  readonly mapEventKind: string;
  readonly phase: MapCommandPhase;
  readonly sequence: number;
}

export interface MapRuleCommand extends Readonly<Record<string, unknown>> {
  readonly kind: string;
}

export interface MapMutationPorts {
  applyImpulse(participantId: string, impulse: Vector3Definition): void;
  setSurfaceEnabled(surfaceId: string, enabled: boolean): void;
  spawnEquipment(spawn: Readonly<{
    instanceId: string;
    definitionId: string;
    spawnId: string;
    position: Vector3Definition;
  }>): void;
}

export interface MapCommandExecutionContext {
  readonly ports: MapMutationPorts;
}

export interface MapCommandHandler {
  readonly kind: string;
  validate(command: unknown, name: string): void;
  execute(command: MapRuleCommand, context: MapCommandExecutionContext): void;
}

function cloneHandler(value: unknown, index: number): Readonly<MapCommandHandler> {
  const name = `Map command handlers[${index}]`;
  assertKnownKeys(value, HANDLER_KEYS, name);
  const kind = assertNonEmptyString(value.kind, `${name}.kind`);
  if (typeof value.validate !== 'function') {
    throw new TypeError(`Map command handler ${kind} 缺少 validate()。`);
  }
  if (typeof value.execute !== 'function') {
    throw new TypeError(`Map command handler ${kind} 缺少 execute()。`);
  }
  return Object.freeze({
    kind,
    validate: value.validate as MapCommandHandler['validate'],
    execute: value.execute as MapCommandHandler['execute'],
  });
}

function assertCommandRecord(command: unknown, name: string): asserts command is MapRuleCommand {
  const record = assertPlainRecord(command, name);
  const descriptor = Object.getOwnPropertyDescriptor(record, 'kind');
  if (
    !descriptor
    || !descriptor.enumerable
    || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
  ) {
    throw new TypeError(`${name}.kind 必须是可枚举数据字段。`);
  }
  assertNonEmptyString(descriptor.value, `${name}.kind`);
}

export class MapCommandRegistry {
  readonly #handlers: ReadonlyMap<string, Readonly<MapCommandHandler>>;

  constructor(handlers: readonly MapCommandHandler[] = []) {
    if (!Array.isArray(handlers)) throw new TypeError('MapCommandRegistry handlers 必须是数组。');
    const registered = new Map<string, Readonly<MapCommandHandler>>();
    for (let index = 0; index < handlers.length; index += 1) {
      const handler = cloneHandler(handlers[index], index);
      if (registered.has(handler.kind)) {
        throw new RangeError(`重复 map command handler ${handler.kind}。`);
      }
      registered.set(handler.kind, handler);
    }
    this.#handlers = registered;
    Object.freeze(this);
  }

  assertSupported(commands: readonly unknown[]): asserts commands is readonly MapRuleCommand[] {
    if (!Array.isArray(commands)) throw new TypeError('map commands 必须是数组。');
    for (let index = 0; index < commands.length; index += 1) {
      const command = commands[index];
      const name = `map commands[${index}]`;
      assertCommandRecord(command, name);
      const handler = this.#handlers.get(command.kind);
      if (!handler) throw new RangeError(`未注册 map command ${String(command.kind)}。`);
      handler.validate(command, name);
    }
  }

  execute(commands: readonly unknown[], context: MapCommandExecutionContext): void {
    const commandSnapshot = cloneFrozenData(commands, 'map command batch');
    this.assertSupported(commandSnapshot);
    for (const command of commandSnapshot) {
      const handler = this.#handlers.get(command.kind);
      if (!handler) throw new Error(`已验证的 map command ${command.kind} 缺少 handler。`);
      handler.execute(command, context);
    }
  }
}
