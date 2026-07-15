import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  CURRENT_SAVE_VERSION,
  GAME_SAVE_KEY,
  ReplayRecorder,
  SaveRepository,
  exportSaveDiagnostics,
  migrateSaveEnvelope,
  replaySave,
} from '../src/index.js';

async function fixture(name: string): Promise<unknown> {
  const source = await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
  return JSON.parse(source) as unknown;
}

describe('versioned local saves', () => {
  it('loads current and migrates the prior two fixture versions', async () => {
    for (const name of ['save-v1.json', 'save-v2.json', 'save-v3.json', 'save-v4.json']) {
      const migrated = migrateSaveEnvelope(await fixture(name));
      expect(migrated.version).toBe(CURRENT_SAVE_VERSION);
      expect(migrated.game).toMatchObject({
        seed: 45,
        difficulty: { id: 'normal', version: 1 },
        gameplay: { id: 'number-strategy-jump', version: 1 },
        task: { id: 'reach-number', version: 1 },
        character: { id: 'jumbo-red', version: 1 },
      });
    }
  });

  it('contains corrupt storage and writes migrated data back once', async () => {
    let stored = await fixture('save-v1.json');
    let removals = 0;
    const repository = new SaveRepository({
      read: () => stored,
      write: (_key, value) => { stored = value; return true; },
      remove: () => { removals += 1; stored = undefined; return true; },
    });
    expect(repository.load()?.version).toBe(4);
    expect(repository.diagnostics().migrations).toBe(1);
    stored = { format: 'bad', version: 99 };
    expect(repository.load()).toBeNull();
    expect(repository.diagnostics().invalidLoads).toBe(1);
    expect(removals).toBe(1);
    expect(stored).toBeUndefined();
    expect(repository.clear()).toBe(true);
  });

  it('records and replays deterministic commands in order', () => {
    const recorder = new ReplayRecorder({
      seed: 45,
      difficulty: { id: 'normal', version: 1 },
      gameplay: { id: 'number-strategy-jump', version: 1 },
      task: { id: 'reach-number', version: 1 },
      character: { id: 'jumbo-red', version: 1 },
    });
    recorder.append({ type: 'jump', choiceIndex: 1, chargeMs: 600 });
    recorder.append({ type: 'restart' });
    const calls: string[] = [];
    expect(replaySave(recorder.envelope(10), {
      jump: (choice, charge) => { calls.push(`jump:${choice}:${charge}`); return true; },
      restart: () => { calls.push('restart'); return true; },
      nextRound: () => false,
    })).toBe(2);
    expect(calls).toEqual(['jump:1:600', 'restart']);
  });

  it('exports local-only diagnostics without inventing user identifiers', async () => {
    const envelope = migrateSaveEnvelope(await fixture('save-v3.json'));
    const output = exportSaveDiagnostics(envelope, {
      loads: 1,
      migrations: 0,
      invalidLoads: 0,
      writeFailures: 0,
      removeFailures: 0,
      lastError: null,
    });
    expect(output).toContain(GAME_SAVE_KEY.split('.')[0] ?? 'number-strategy');
    expect(output).not.toMatch(/deviceId|email|location/);
  });
});
