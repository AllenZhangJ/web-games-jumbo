import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PresentationEventWindow,
  projectArenaV2WeaponFeedbackPresentationEvent,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  runArenaV2WeaponMultiplayerEdgeReplayPrototype,
} from '@number-strategy-jump/arena-v1-experiment';

test('maps real multiplayer-edge Replay hit events to presentation cues without rejudging them', () => {
  const result = runArenaV2WeaponMultiplayerEdgeReplayPrototype();
  const expectedVisualCues = new Map([
    ['research-line-pressure', 'ring-out'],
    ['research-read-punish', 'impact-confirm'],
    ['research-flank', 'impact-confirm'],
  ]);
  for (const candidate of result.results) {
    const window = new PresentationEventWindow({ capacity: 8 });
    const events = candidate.hits.map((hit) => (
      projectArenaV2WeaponFeedbackPresentationEvent({
        id: hit.sourceEventId,
        tick: hit.tick,
        sequence: hit.sequence,
        action: hit.actionDefinitionId,
        targetId: hit.targetId,
        attackerId: hit.attackerId,
        feedback: candidate.feedback,
      })
    ));
    const accepted = window.consume(events);
    assert.equal(accepted.length, events.length);
    assert.equal(accepted.every(({ sourceEventId }, index) => (
      sourceEventId === candidate.hits[index]?.sourceEventId
    )), true);
    assert.deepEqual(new Set(accepted.map(({ visualCue }) => visualCue)), new Set([
      expectedVisualCues.get(candidate.weaponId),
    ]));
    window.destroy();
  }
});
