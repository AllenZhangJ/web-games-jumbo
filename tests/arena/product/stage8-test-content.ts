import {
  MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  createMatchContentPublicView,
  createMatchContentSelection,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductMatchResult,
  type ProductMatchResult,
  type ProductPublicMatchInfo,
} from '@number-strategy-jump/arena-product-contracts';
import { ARENA_V1_CHARACTER_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';
import { ARENA_V1_MAP_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';
import { STAGE4_EQUIPMENT_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';

const characterDefinitionIds = ARENA_V1_CHARACTER_DEFINITIONS.map(({ id }) => id);
const mapDefinitionIds = ARENA_V1_MAP_DEFINITIONS.map(({ id }) => id);

export const TEST_MATCH_CONTENT_SELECTION = createMatchContentSelection({
  schemaVersion: MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
  contentDefinitionId: 'test-match-content',
  contentVersion: 1,
  characterDefinitionIds,
  equipmentDefinitionIds: STAGE4_EQUIPMENT_DEFINITIONS.map(({ id }) => id),
  mapDefinitionIds,
  selectedMapDefinitionId: mapDefinitionIds[0],
  participantCharacters: [
    { participantId: 'player-1', definitionId: characterDefinitionIds[0] },
    { participantId: 'player-2', definitionId: characterDefinitionIds[1] },
  ],
});

export const TEST_MATCH_CONTENT_PUBLIC_VIEW = createMatchContentPublicView(
  TEST_MATCH_CONTENT_SELECTION,
);

export function createStage8ProductMatchResult({
  publicInfo,
  endedAtTick,
}: Readonly<{
  readonly publicInfo: ProductPublicMatchInfo;
  readonly endedAtTick: number;
}>): ProductMatchResult {
  return createProductMatchResult({
    matchSeed: publicInfo.matchSeed,
    opponent: publicInfo.opponent,
    content: publicInfo.content,
    replay: {
      replaySchemaVersion: 5,
      schemaVersion: 5,
      physicsBackendVersion: 'lightweight-v3',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      finalHash: '11223344',
      matchSeed: publicInfo.matchSeed,
      config: { contentSelection: publicInfo.content },
      result: {
        winnerId: null,
        reason: 'stage8-test-completed',
        isDraw: true,
        endedAtTick,
      },
    },
  });
}
