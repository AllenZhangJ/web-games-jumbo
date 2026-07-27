import {
  createArenaV1MapSystem,
  createArenaV1MatchCore,
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import type {
  MatchCoreFactoryContext,
  MatchCoreMapFactoryContext,
  ReplayCoreFactoryOptions,
} from '@number-strategy-jump/arena-match';
import { createArenaV2WeaponLanguageResearchContent } from './arena-v2-weapon-language-prototype.js';

export function createArenaV2WeaponResearchReplayCore({
  seed,
  config,
}: ReplayCoreFactoryOptions): ReturnType<typeof createArenaV1MatchCore> {
  const authorityContent = createArenaV2WeaponLanguageResearchContent();
  return createArenaV1MatchCore({
    seed,
    config,
    ruleEngineFactory: ({
      participantIds,
      config: matchConfig,
    }: MatchCoreFactoryContext) => (
      createArenaV1RuleEngine({
        participantIds,
        config: matchConfig,
        authorityContent,
      })
    ),
    mapSystemFactory: (context: MatchCoreMapFactoryContext) => createArenaV1MapSystem({
      ...context,
      authorityContent,
    }),
  });
}
