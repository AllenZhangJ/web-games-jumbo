import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const MOVEMENT_COMMAND_KIND = Object.freeze({
  REQUEST_GROUND_JUMP: 'request-ground-jump',
  REQUEST_AIR_JUMP: 'request-air-jump',
  BEGIN_CROUCH_JUMP: 'begin-crouch-jump',
  RELEASE_CROUCH_JUMP: 'release-crouch-jump',
  BEGIN_DOWN_SMASH: 'begin-down-smash',
} as const);

export type MovementCommandKind =
  typeof MOVEMENT_COMMAND_KIND[keyof typeof MOVEMENT_COMMAND_KIND];

export interface MovementCommand {
  readonly kind: MovementCommandKind;
  readonly participantId: string;
  readonly actionDefinitionId: string;
}

const COMMAND_KINDS: ReadonlySet<unknown> = new Set(Object.values(MOVEMENT_COMMAND_KIND));
const COMMAND_KEYS = new Set(['kind', 'participantId', 'actionDefinitionId']);

export function createMovementCommand(value: unknown): MovementCommand {
  const source = cloneFrozenData(value, 'MovementCommand');
  assertKnownKeys(source, COMMAND_KEYS, 'MovementCommand');
  if (!COMMAND_KINDS.has(source.kind)) {
    throw new RangeError(`MovementCommand.kind 不受支持：${String(source.kind)}。`);
  }
  return Object.freeze({
    kind: source.kind as MovementCommandKind,
    participantId: assertNonEmptyString(
      source.participantId,
      'MovementCommand.participantId',
    ),
    actionDefinitionId: assertNonEmptyString(
      source.actionDefinitionId,
      'MovementCommand.actionDefinitionId',
    ),
  });
}

export function isMovementCommandKind(kind: unknown): kind is MovementCommandKind {
  return COMMAND_KINDS.has(kind);
}
