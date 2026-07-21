import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  ARENA_IMPACT_AUDIO_SOURCE_BY_ACTION,
  ArenaImpactAudio,
} from '../../../src/arena/presentation/audio/arena-impact-audio.js';

function voiceHarness() {
  return {
    src: '',
    preload: '',
    volume: 0,
    currentTime: 4,
    loads: 0,
    plays: 0,
    pauses: 0,
    destroyed: 0,
    load() { this.loads += 1; },
    play() { this.plays += 1; return Promise.resolve(); },
    pause() { this.pauses += 1; },
    destroy() { this.destroyed += 1; },
  };
}

test('impact audio preloads a bounded pool, rotates voices and honors sound settings', () => {
  const voices = [];
  const audio = new ArenaImpactAudio({
    createAudio: () => {
      const voice = voiceHarness();
      voices.push(voice);
      return voice;
    },
  });
  assert.strictEqual(audio.load(), audio);
  assert.strictEqual(audio.load(), audio);
  assert.equal(voices.length, Object.keys(ARENA_IMPACT_AUDIO_SOURCE_BY_ACTION).length * 2);
  assert.equal(voices.every(({ loads }) => loads === 1), true);

  assert.equal(audio.play('hammer-smash'), true);
  assert.equal(audio.play('hammer-smash'), true);
  assert.equal(audio.play('hammer-smash'), true);
  const hammerVoices = voices.filter(({ src }) => src.endsWith('/hammer-smash.ogg'));
  assert.deepEqual(hammerVoices.map(({ plays }) => plays), [2, 1]);
  assert.equal(hammerVoices.every(({ currentTime }) => currentTime === 0), true);
  assert.equal(audio.play('hammer-smash', { enabled: false }), false);
  assert.equal(audio.play('unknown-action'), false);

  audio.dispose();
  audio.dispose();
  assert.equal(voices.every(({ destroyed }) => destroyed === 1), true);
  assert.throws(() => audio.play('base-push'), /已销毁/);
});

test('impact audio fails soft when a host has no usable audio object', () => {
  const audio = new ArenaImpactAudio({ createAudio: () => null });
  audio.load();
  assert.equal(audio.play('base-push'), false);
  assert.deepEqual(audio.getDebugSnapshot().voiceCounts, {
    'base-push': 0,
    'hammer-smash': 0,
    'chain-pull': 0,
    'shield-charge': 0,
  });
  audio.dispose();
});

test('Kenney impact audio bytes stay pinned to the recorded CC0 intake', async () => {
  const hashes = {
    'base-push.ogg': '486988aa2d6440ffc4c62a0e8ccf3c23673ba84424bd4723378d451b7255eb5c',
    'hammer-smash.ogg': 'e07045693e4a2b3d165c424e3dab4c781d9ff8880a386880ac89a51315d7f831',
    'chain-pull.ogg': '33b5e6e37c6e9d54e07bf5a89b12c76e879f40c1ea83cdd82714df1d6f9fec6d',
    'shield-charge.ogg': '112d4f93ddcc370b410630f971c0f5d991856102da9c76bc5c5540d388e75aaa',
  };
  for (const [name, expected] of Object.entries(hashes)) {
    const bytes = await readFile(new URL(
      `../../../public/assets/arena/audio/kenney-impact-sounds/${name}`,
      import.meta.url,
    ));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'OggS');
  }
});
