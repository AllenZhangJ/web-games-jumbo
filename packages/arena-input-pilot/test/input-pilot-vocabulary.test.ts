import { describe, expect, it } from 'vitest';
import {
  ARENA_INPUT_PILOT_VARIANT_ID,
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_EXCLUSION_REASON,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
  INPUT_PILOT_TRIAL_STATUS,
  InputPilotRegistry,
  createArenaInputPilotV1Definition,
  createInputPilotAssignment,
  createInputPilotDefinition,
} from '../src/index.js';

const VOCABULARIES = [
  INPUT_PILOT_ACTION_OUTCOME,
  INPUT_PILOT_COMPREHENSION,
  INPUT_PILOT_EXCLUSION_REASON,
  INPUT_PILOT_TERMINATION_REASON,
  INPUT_PILOT_TRIAL_CONTROLLER_STATE,
  INPUT_PILOT_TRIAL_STATUS,
] as const;

describe('Input Pilot strict vocabulary', () => {
  it('publishes immutable and unique wire values', () => {
    expect(VOCABULARIES.every((vocabulary) => Object.isFrozen(vocabulary))).toBe(true);
    for (const vocabulary of VOCABULARIES) {
      const values = Object.values(vocabulary);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('keeps lifecycle and evidence terminal values explicit', () => {
    expect(INPUT_PILOT_TRIAL_CONTROLLER_STATE.DESTROYED).toBe('destroyed');
    expect(INPUT_PILOT_TERMINATION_REASON.RUNTIME_FAILED).toBe('runtime-failed');
    expect(INPUT_PILOT_TRIAL_STATUS.INVALIDATED).toBe('invalidated');
    expect(INPUT_PILOT_EXCLUSION_REASON.INPUT_MODE_MISMATCH).toBe('input-mode-mismatch');
  });
});

describe('Input Pilot strict definition and assignment', () => {
  it('publishes one immutable V1 definition and deterministic balanced blocks', () => {
    const definition = createArenaInputPilotV1Definition();
    const registry = new InputPilotRegistry([definition]);
    const assignments = [0, 1, 2, 3].map((enrollmentIndex) => createInputPilotAssignment({
      definition,
      participantId: `participant-${enrollmentIndex}`,
      enrollmentIndex,
    }));
    expect(registry.require(definition.id)).toBe(definition);
    expect(registry.list()).toEqual([definition]);
    expect(Object.isFrozen(definition)).toBe(true);
    for (let index = 0; index < assignments.length; index += 2) {
      expect(new Set(assignments.slice(index, index + 2).map(({ variantId }) => variantId))).toEqual(
        new Set(Object.values(ARENA_INPUT_PILOT_VARIANT_ID)),
      );
    }
  });

  it('rejects definition and assignment accessors without executing them', () => {
    let reads = 0;
    const definitionValue = createArenaInputPilotV1Definition().toJSON();
    Object.defineProperty(definitionValue, 'assignmentSeed', {
      enumerable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    expect(() => createInputPilotDefinition(definitionValue)).toThrow(/数据字段/);

    const assignmentOptions = {
      participantId: 'participant',
      enrollmentIndex: 0,
    };
    Object.defineProperty(assignmentOptions, 'definition', {
      enumerable: true,
      get() {
        reads += 1;
        return createArenaInputPilotV1Definition();
      },
    });
    expect(() => createInputPilotAssignment(assignmentOptions)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});
