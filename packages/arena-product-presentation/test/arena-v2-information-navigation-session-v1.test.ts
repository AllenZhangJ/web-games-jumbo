import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_BOTTOM_NAVIGATION_ITEM_V1 as BOTTOM,
  ARENA_V2_INFORMATION_NAVIGATION_CANDIDATE_V1,
  ARENA_V2_INFORMATION_SCREEN_DEFINITIONS_CANDIDATE_V1,
  ARENA_V2_INFORMATION_SCREEN_ID_V1 as SCREEN,
  ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  ARENA_V2_INFORMATION_UI_INTENT_V1 as INTENT,
  ArenaV2InformationNavigationSessionV1,
  ArenaV2InformationScreenRegistryV1,
} from '../src/index.js';

function session(initialScreenId: 'loading' | 'home' = 'home') {
  const value = new ArenaV2InformationNavigationSessionV1({
    registry: ARENA_V2_INFORMATION_SCREEN_REGISTRY_CANDIDATE_V1,
  });
  value.start({ initialScreenId });
  return value;
}

function dispatch(
  value: ArenaV2InformationNavigationSessionV1,
  screenId: string,
  intentId: string,
  selectedModeKind: 'duel' | 'race' | 'survival' | null = null,
  resultDecision: 'play-again' | 'next-goal' | null = null,
  resultTargetScreenId: string | null = resultDecision === 'next-goal' ? SCREEN.HOME : null,
) {
  return value.dispatchPrimaryIntent({
    expectedRevision: value.getSnapshot().revision,
    screenId,
    intentId,
    selectedModeKind,
    resultDecision,
    resultTargetScreenId,
  });
}

describe('Arena V2 information navigation session candidate V1', () => {
  it('keeps the two-primary-click quick start path and returns through result', () => {
    const value = session();
    expect(dispatch(value, SCREEN.HOME, INTENT.OPEN_MODE_SELECT)).toMatchObject({
      status: 'navigated', screenId: SCREEN.MODE_SELECT, command: null,
    });
    expect(dispatch(value, SCREEN.MODE_SELECT, INTENT.START_SELECTED_MODE, 'race')).toMatchObject({
      status: 'external-command', surface: 'match', screenId: null,
      command: 'start-match', selectedModeKind: 'race',
    });
    expect(value.completeMatch({ expectedRevision: 2 })).toMatchObject({
      status: 'navigated', screenId: SCREEN.RESULT_REWARD,
    });
    expect(dispatch(
      value,
      SCREEN.RESULT_REWARD,
      INTENT.PLAY_AGAIN_OR_NEXT,
      'race',
      'play-again',
    )).toMatchObject({ surface: 'match', command: 'start-match' });
    value.completeMatch({ expectedRevision: 4 });
    expect(dispatch(
      value,
      SCREEN.RESULT_REWARD,
      INTENT.PLAY_AGAIN_OR_NEXT,
      null,
      'next-goal',
      SCREEN.WEAPON_DETAIL,
    )).toMatchObject({ surface: 'information', screenId: SCREEN.WEAPON_DETAIL });
  });

  it('keeps character and preparation screens optional while enforcing mode compatibility', () => {
    const value = session();
    dispatch(value, SCREEN.HOME, INTENT.OPEN_MODE_SELECT);
    value.openDeclaredLink({ expectedRevision: 1, targetScreenId: SCREEN.CHARACTER_SELECT });
    expect(dispatch(value, SCREEN.CHARACTER_SELECT, INTENT.SAVE_CHARACTER)).toMatchObject({
      screenId: SCREEN.MODE_SELECT,
    });
    value.openDeclaredLink({ expectedRevision: 3, targetScreenId: SCREEN.SURVIVAL_PREP });
    expect(dispatch(value, SCREEN.SURVIVAL_PREP, INTENT.START_SURVIVAL, 'survival')).toMatchObject({
      surface: 'match', command: 'start-match', selectedModeKind: 'survival',
    });
  });

  it('allows both preparation pages to return to mode selection without starting', () => {
    const value = session();
    dispatch(value, SCREEN.HOME, INTENT.OPEN_MODE_SELECT);
    value.openDeclaredLink({ expectedRevision: 1, targetScreenId: SCREEN.MATCH_PREP });
    expect(value.openDeclaredLink({
      expectedRevision: 2,
      targetScreenId: SCREEN.MODE_SELECT,
    })).toMatchObject({ screenId: SCREEN.MODE_SELECT, surface: 'information' });
    value.openDeclaredLink({ expectedRevision: 3, targetScreenId: SCREEN.SURVIVAL_PREP });
    expect(value.openDeclaredLink({
      expectedRevision: 4,
      targetScreenId: SCREEN.MODE_SELECT,
    })).toMatchObject({ screenId: SCREEN.MODE_SELECT, surface: 'information' });
  });

  it('retains one preparation source for detail primary return only', () => {
    const competitive = session();
    dispatch(competitive, SCREEN.HOME, INTENT.OPEN_MODE_SELECT);
    competitive.openDeclaredLink({ expectedRevision: 1, targetScreenId: SCREEN.MATCH_PREP });
    competitive.openDeclaredLink({ expectedRevision: 2, targetScreenId: SCREEN.WEAPON_DETAIL });
    expect(competitive.getSnapshot().returnScreenId).toBe(SCREEN.MATCH_PREP);
    expect(dispatch(
      competitive,
      SCREEN.WEAPON_DETAIL,
      INTENT.USE_SELECTED_WEAPON_NEXT_MATCH,
    )).toMatchObject({ screenId: SCREEN.MATCH_PREP });
    expect(competitive.getSnapshot().returnScreenId).toBeNull();

    const survival = session();
    dispatch(survival, SCREEN.HOME, INTENT.OPEN_MODE_SELECT);
    survival.openDeclaredLink({ expectedRevision: 1, targetScreenId: SCREEN.SURVIVAL_PREP });
    survival.openDeclaredLink({ expectedRevision: 2, targetScreenId: SCREEN.MAP_DETAIL });
    expect(survival.getSnapshot().returnScreenId).toBe(SCREEN.SURVIVAL_PREP);
    expect(dispatch(
      survival,
      SCREEN.MAP_DETAIL,
      INTENT.USE_SELECTED_MAP_NEXT_MATCH,
    )).toMatchObject({ screenId: SCREEN.SURVIVAL_PREP });

    const collection = session();
    collection.openBottomNavigation({ expectedRevision: 0, itemId: BOTTOM.WEAPONS });
    dispatch(collection, SCREEN.WEAPON_INDEX, INTENT.OPEN_SELECTED_WEAPON);
    expect(collection.getSnapshot().returnScreenId).toBeNull();
    expect(dispatch(
      collection,
      SCREEN.WEAPON_DETAIL,
      INTENT.USE_SELECTED_WEAPON_NEXT_MATCH,
    )).toMatchObject({ screenId: SCREEN.MODE_SELECT });
  });

  it('returns from details to their directories and clears a retained preparation source', () => {
    const weapon = session();
    dispatch(weapon, SCREEN.HOME, INTENT.OPEN_MODE_SELECT);
    weapon.openDeclaredLink({ expectedRevision: 1, targetScreenId: SCREEN.MATCH_PREP });
    weapon.openDeclaredLink({ expectedRevision: 2, targetScreenId: SCREEN.WEAPON_DETAIL });
    expect(weapon.getSnapshot().returnScreenId).toBe(SCREEN.MATCH_PREP);
    expect(weapon.openDeclaredLink({
      expectedRevision: 3,
      targetScreenId: SCREEN.WEAPON_INDEX,
    })).toMatchObject({ screenId: SCREEN.WEAPON_INDEX });
    expect(weapon.getSnapshot().returnScreenId).toBeNull();

    const map = session();
    map.openBottomNavigation({ expectedRevision: 0, itemId: BOTTOM.MAPS });
    dispatch(map, SCREEN.MAP_INDEX, INTENT.OPEN_SELECTED_MAP);
    expect(map.openDeclaredLink({
      expectedRevision: 2,
      targetScreenId: SCREEN.MAP_INDEX,
    })).toMatchObject({ screenId: SCREEN.MAP_INDEX });
    expect(map.getSnapshot().returnScreenId).toBeNull();
  });

  it('routes four bottom entries without inventing a twelfth records screen', () => {
    const value = session();
    expect(value.openBottomNavigation({ expectedRevision: 0, itemId: BOTTOM.WEAPONS })).toMatchObject({
      screenId: SCREEN.WEAPON_INDEX, focusFieldId: null,
    });
    expect(value.openBottomNavigation({ expectedRevision: 1, itemId: BOTTOM.MAPS })).toMatchObject({
      screenId: SCREEN.MAP_INDEX, focusFieldId: null,
    });
    expect(value.openBottomNavigation({ expectedRevision: 2, itemId: BOTTOM.RECORDS })).toMatchObject({
      screenId: SCREEN.HOME, focusFieldId: 'recent-records',
    });
    expect(value.openBottomNavigation({ expectedRevision: 3, itemId: BOTTOM.START })).toMatchObject({
      screenId: SCREEN.HOME, focusFieldId: null,
    });
  });

  it('is deterministic for the same route and remains production unreachable', () => {
    const run = () => {
      const value = session('loading');
      value.loadingReady({ expectedRevision: 0 });
      dispatch(value, SCREEN.HOME, INTENT.OPEN_MODE_SELECT);
      dispatch(value, SCREEN.MODE_SELECT, INTENT.START_SELECTED_MODE, 'duel');
      return value.getSnapshot();
    };
    expect(createDeterministicDataHash(run())).toBe(createDeterministicDataHash(run()));
    expect(ARENA_V2_INFORMATION_NAVIGATION_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultNavigationWired: false,
      pageCount: 11, maximumPrimaryClicksFromHomeToStartMatch: 2,
      validationStatus: 'not-run',
    });
  });

  it('rejects stale, hostile and undeclared transitions before mutation', () => {
    const value = session();
    const initial = value.getSnapshot();
    expect(() => value.openDeclaredLink({
      expectedRevision: 0,
      targetScreenId: SCREEN.RESULT_REWARD,
    })).toThrow(/未声明导航/);
    expect(value.getSnapshot()).toEqual(initial);
    expect(() => value.openBottomNavigation({
      expectedRevision: 0,
      itemId: BOTTOM.START,
      extra: true,
    })).toThrow(/字段|extra|不受支持/);
    let targetGetterCalls = 0;
    const accessorTarget = { expectedRevision: 0 } as Record<string, unknown>;
    Object.defineProperty(accessorTarget, 'targetScreenId', {
      enumerable: true,
      get() {
        targetGetterCalls += 1;
        return SCREEN.MODE_SELECT;
      },
    });
    expect(() => value.openDeclaredLink(accessorTarget)).toThrow(/数据字段/u);
    expect(targetGetterCalls).toBe(0);
    expect(() => dispatch(value, SCREEN.HOME, INTENT.START_SELECTED_MODE)).toThrow(/intent/);
    expect(() => value.openBottomNavigation({
      expectedRevision: 9,
      itemId: BOTTOM.START,
    })).toThrow(/漂移/);
    expect(value.getSnapshot()).toEqual(initial);
  });

  it('rejects a swallowed Registry callback reentry before navigation commits', () => {
    let onRequire: (() => void) | null = null;
    class ReenteringRegistry extends ArenaV2InformationScreenRegistryV1 {
      override require(id: Parameters<ArenaV2InformationScreenRegistryV1['require']>[0]) {
        const definition = super.require(id);
        onRequire?.();
        return definition;
      }
    }
    const registry = new ReenteringRegistry(
      ARENA_V2_INFORMATION_SCREEN_DEFINITIONS_CANDIDATE_V1,
    );
    const value = new ArenaV2InformationNavigationSessionV1({ registry });
    value.start({ initialScreenId: SCREEN.HOME });
    const before = value.getSnapshot();
    let nestedError: unknown = null;
    onRequire = () => {
      try { value.destroy(); } catch (error) { nestedError = error; }
    };

    expect(() => dispatch(value, SCREEN.HOME, INTENT.OPEN_MODE_SELECT)).toThrow(/重入/u);
    expect(nestedError).toBeInstanceOf(Error);
    expect(value.getSnapshot()).toEqual(before);
    onRequire = null;
    expect(dispatch(value, SCREEN.HOME, INTENT.OPEN_MODE_SELECT)).toMatchObject({
      status: 'navigated',
      screenId: SCREEN.MODE_SELECT,
    });
  });

  it('clears retained navigation state on idempotent destroy and rejects later work', () => {
    const value = session();
    const first = value.destroy();
    expect(first).toMatchObject({
      lifecycle: 'destroyed', currentScreenId: null, returnScreenId: null,
    });
    expect(value.destroy()).toEqual(first);
    expect(() => value.loadingReady({ expectedRevision: first.revision })).toThrow(/active/);
  });
});
