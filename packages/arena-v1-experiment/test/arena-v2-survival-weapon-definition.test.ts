import { describe, expect, it } from 'vitest';
import { createArenaV1MatchConfig } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS,
  createArenaV2SurvivalTierAuthorityContent,
  selectArenaV2SurvivalTierWeapon,
} from '../src/arena-v2-survival-weapon-definition.js';

describe('Arena V2 survival weapon definitions', () => {
  it('derives public ground and aerial values from the current action definitions', () => {
    expect(ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS.map(({ id }) => id)).toEqual([
      'hammer',
      'chain',
      'shield',
    ]);
    for (const definition of ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS) {
      expect(definition.baseStats.effectiveDistance).toBeGreaterThan(0);
      expect(definition.aerialStats.effectiveDistance).toBeGreaterThan(0);
      expect(definition.tierSteps.map(({ tier }) => tier)).toEqual([1, 5, 10]);
      expect(definition.tierSteps.every(({ stats, aerialStats }) => (
        stats.horizontalControl >= definition.baseStats.horizontalControl
        && aerialStats.horizontalControl >= definition.aerialStats.horizontalControl
      ))).toBe(true);
    }
    expect(ARENA_V2_SURVIVAL_WEAPON_DEFINITIONS.map(({ growthField }) => growthField)).toEqual([
      'target-horizontal-control',
      'target-reposition-control',
      'target-contact-control',
    ]);
  });

  it('creates deterministic tier-specific action and equipment identities', () => {
    const config = createArenaV1MatchConfig({ equipment: { initialSpawns: [] } });
    const tierOne = createArenaV2SurvivalTierAuthorityContent(1, config);
    const tierTen = createArenaV2SurvivalTierAuthorityContent(10, config);
    expect(tierOne.definitionBundleHash).not.toBe(tierTen.definitionBundleHash);
    expect(tierOne.definitionBundleHash).toBe(
      createArenaV2SurvivalTierAuthorityContent(1, config).definitionBundleHash,
    );
    const hammer = selectArenaV2SurvivalTierWeapon(tierTen, 'hammer');
    expect(hammer.equipmentDefinitionId).toBe('hammer.survival-tier-10');
    expect(tierTen.actionRegistry.require(hammer.groundActionDefinitionId).id).toBe(
      'hammer-smash.survival-tier-10',
    );
    expect(tierTen.equipmentRegistry.require(hammer.equipmentDefinitionId).tags).toContain(
      'tier-10',
    );
  });

  it('scales the weapon-specific target effect while preserving shield self-risk', () => {
    const config = createArenaV1MatchConfig({ equipment: { initialSpawns: [] } });
    const content = createArenaV2SurvivalTierAuthorityContent(10, config);
    const hammer = selectArenaV2SurvivalTierWeapon(content, 'hammer');
    const chain = selectArenaV2SurvivalTierWeapon(content, 'chain');
    const shield = selectArenaV2SurvivalTierWeapon(content, 'shield');
    const hammerImpulse = content.actionRegistry.require(hammer.groundActionDefinitionId)
      .effects.find(({ kind }) => kind === 'apply-directional-impulse');
    const chainPull = content.actionRegistry.require(chain.groundActionDefinitionId)
      .effects.find(({ kind }) => kind === 'pull-to-source');
    const shieldTargetImpulse = content.actionRegistry.require(shield.groundActionDefinitionId)
      .effects.find(({ id }) => id === 'shield-target-impulse');
    const shieldSelfImpulse = content.actionRegistry.require(shield.groundActionDefinitionId)
      .effects.find(({ id }) => id === 'shield-self-charge');
    expect(hammerImpulse?.parameters).toMatchObject({
      horizontalImpulse: hammer.stats.horizontalControl,
    });
    expect(chainPull?.parameters).toMatchObject({
      horizontalImpulse: chain.stats.horizontalControl,
    });
    expect(shieldTargetImpulse?.parameters).toMatchObject({
      horizontalImpulse: shield.stats.horizontalControl,
    });
    expect(shieldSelfImpulse?.parameters).toMatchObject({ horizontalImpulse: 6.5 });
  });
});
