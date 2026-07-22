import {
  ACTION_PRIORITY,
  type ActionCandidate,
  type ActionRegistryContract,
} from '@number-strategy-jump/arena-core';
import {
  MOVEMENT_MODE,
  type MovementCapabilities,
} from '@number-strategy-jump/arena-movement';
import { STAGE6_MOVEMENT_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import { assertKnownKeys, assertNonEmptyString } from '@number-strategy-jump/arena-contracts';

const CAPABILITY_KEYS = new Set([
  'participantId',
  'canMove',
  'grounded',
  'mode',
  'crouchActionDefinitionId',
  'hasBufferedJump',
  'canGroundJump',
  'canAirJump',
  'canBeginCrouchJump',
  'canReleaseCrouchJump',
  'canBeginDownSmash',
]);
const BOOLEAN_KEYS = Object.freeze([
  'canMove',
  'grounded',
  'hasBufferedJump',
  'canGroundJump',
  'canAirJump',
  'canBeginCrouchJump',
  'canReleaseCrouchJump',
  'canBeginDownSmash',
] as const);
const MODES: ReadonlySet<unknown> = new Set(Object.values(MOVEMENT_MODE));

function candidate(
  actionDefinitionId: string,
  priority: number,
  available: boolean,
  unavailableReason: string | null,
): ActionCandidate {
  return Object.freeze({
    id: `movement:${actionDefinitionId}`,
    actionDefinitionId,
    source: 'movement-action-candidate-provider',
    priority,
    available,
    blocksFallback: false,
    unavailableReason: available ? null : unavailableReason,
  });
}

function validateCapabilities(value: unknown): MovementCapabilities {
  assertKnownKeys(value, CAPABILITY_KEYS, 'MovementCapabilities');
  assertNonEmptyString(value.participantId, 'MovementCapabilities.participantId');
  for (const key of BOOLEAN_KEYS) {
    if (typeof value[key] !== 'boolean') {
      throw new TypeError(`MovementCapabilities.${key} 必须是布尔值。`);
    }
  }
  if (!MODES.has(value.mode)) {
    throw new RangeError(`MovementCapabilities.mode 不受支持：${String(value.mode)}。`);
  }
  if (
    value.crouchActionDefinitionId !== null
    && (typeof value.crouchActionDefinitionId !== 'string'
      || value.crouchActionDefinitionId.length === 0)
  ) throw new TypeError('MovementCapabilities.crouchActionDefinitionId 必须是 null 或非空字符串。');
  return value as unknown as MovementCapabilities;
}

export class MovementActionCandidateProvider {
  readonly #actionRegistry: ActionRegistryContract;
  readonly #candidateCache: Map<string, readonly ActionCandidate[]>;
  readonly #contextPrimaryEnabled: boolean;

  constructor({
    actionRegistry,
    contextPrimaryEnabled = true,
  }: Readonly<{
    actionRegistry: ActionRegistryContract;
    contextPrimaryEnabled?: boolean;
  }>) {
    if (!actionRegistry || typeof actionRegistry.require !== 'function') {
      throw new TypeError('MovementActionCandidateProvider 需要只读 ActionRegistry。');
    }
    for (const definitionId of Object.values(STAGE6_MOVEMENT_ACTION_ID)) {
      actionRegistry.require(definitionId);
    }
    if (typeof contextPrimaryEnabled !== 'boolean') {
      throw new TypeError('MovementActionCandidateProvider.contextPrimaryEnabled 必须是布尔值。');
    }
    this.#actionRegistry = actionRegistry;
    this.#candidateCache = new Map();
    this.#contextPrimaryEnabled = contextPrimaryEnabled;
    Object.freeze(this);
  }

  getCandidates(capabilities: unknown): readonly ActionCandidate[] {
    const value = validateCapabilities(capabilities);
    let booleanMask = 0;
    for (let index = 0; index < BOOLEAN_KEYS.length; index += 1) {
      const key = BOOLEAN_KEYS[index];
      if (key !== undefined && value[key]) booleanMask |= 1 << index;
    }
    const cacheKey = `${value.mode}\u0000${value.crouchActionDefinitionId ?? ''}\u0000${booleanMask}`;
    const cached = this.#candidateCache.get(cacheKey);
    if (cached) return cached;
    const candidates = [
      candidate(
        STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN,
        ACTION_PRIORITY.LOCOMOTION + 10,
        value.canBeginCrouchJump,
        'crouch-jump-unavailable',
      ),
      candidate(
        STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
        ACTION_PRIORITY.LOCOMOTION + 30,
        value.canGroundJump,
        'ground-jump-unavailable',
      ),
      candidate(
        STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
        ACTION_PRIORITY.LOCOMOTION + 20,
        value.canAirJump,
        'air-jump-unavailable',
      ),
      candidate(
        STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH,
        ACTION_PRIORITY.LOCOMOTION,
        value.canBeginDownSmash,
        'down-smash-unavailable',
      ),
    ];
    if (this.#contextPrimaryEnabled) {
      candidates.push(
        candidate(
          STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
          ACTION_PRIORITY.BASE - 10,
          value.canGroundJump,
          'context-ground-jump-unavailable',
        ),
        candidate(
          STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN,
          ACTION_PRIORITY.BASE - 30,
          value.canBeginCrouchJump,
          'context-crouch-jump-unavailable',
        ),
        candidate(
          STAGE6_MOVEMENT_ACTION_ID.CONTEXT_AIR_JUMP,
          ACTION_PRIORITY.BASE - 20,
          value.canAirJump,
          'context-air-jump-unavailable',
        ),
      );
    }
    if (value.canReleaseCrouchJump) {
      if (value.crouchActionDefinitionId === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN) {
        candidates.push(candidate(
          STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE,
          ACTION_PRIORITY.LOCOMOTION + 40,
          true,
          null,
        ));
      } else if (
        value.crouchActionDefinitionId === STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN
      ) {
        if (!this.#contextPrimaryEnabled) {
          throw new RangeError('显式输入模式不能保留 context crouch action。');
        }
        candidates.push(candidate(
          STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE,
          ACTION_PRIORITY.BASE,
          true,
          null,
        ));
      } else {
        throw new RangeError(
          `未知 crouch begin action ${String(value.crouchActionDefinitionId)}。`,
        );
      }
    }
    const frozen = Object.freeze(candidates);
    this.#candidateCache.set(cacheKey, frozen);
    return frozen;
  }
}
