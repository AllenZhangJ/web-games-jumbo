import test from 'node:test';
import assert from 'node:assert/strict';
import { InputPilotFormModel } from '../../../src/arena/presentation/pilot/input-pilot-form-model.js';
import {
  ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-device-acceptance';
import { INPUT_PILOT_COMPREHENSION } from '../../../src/arena/presentation/pilot/input-pilot-record.js';
import { downloadInputPilotJson } from '../../../src/entry/input-pilot-json-download.js';
import {
  loadInputPilotBuildIdentity,
} from '../../../src/entry/input-pilot-build-identity.js';
import {
  createInputPilotPageOwnerId,
  detectInputPilotWebEnvironment,
} from '../../../src/entry/input-pilot-web-environment.js';

const COMMIT = 'a'.repeat(40);
const SHA256 = 'b'.repeat(64);

function buildManifest({ sourceDirty = false, includePilot = true } = {}) {
  return {
    schemaVersion: ARENA_BUILD_MANIFEST_SCHEMA_VERSION,
    buildId: 'arena-input-pilot-build',
    commit: COMMIT,
    sourceDirty,
    target: 'web',
    defaultEntry: 'product',
    artifacts: [
      'greybox.html',
      'index.html',
      'product.html',
      ...(includePilot ? ['pilot.html'] : []),
    ].map((artifactPath) => ({ path: artifactPath, sha256: SHA256, byteLength: 1 })),
  };
}

test('pilot form model bounds counters and restores a persisted review draft', () => {
  const model = new InputPilotFormModel();
  assert.equal(model.adjustCounter('intentMismatchCount', -1), 0);
  assert.equal(model.adjustCounter('intentMismatchCount', 3), 3);
  model.setCompletion('oneHandCompleted', true);
  model.setComprehension('airAction', INPUT_PILOT_COMPREHENSION.PARTIAL);
  assert.equal(model.getSnapshot().observer.intentMismatchCount, 3);
  assert.equal(model.getSnapshot().observer.oneHandCompleted, true);
  assert.equal(model.getSnapshot().selfReport.airAction, INPUT_PILOT_COMPREHENSION.PARTIAL);

  const restored = model.restore({
    observer: {
      intentMismatchCount: 4,
      accidentalInputCount: 1,
      repeatedInputCount: 2,
      abandonedInputCount: 0,
      correctionCount: 3,
      oneHandCompleted: false,
      objectiveCompleted: true,
    },
    selfReport: {
      groundAction: INPUT_PILOT_COMPREHENSION.CORRECT,
      airAction: INPUT_PILOT_COMPREHENSION.INCORRECT,
      equipmentAction: INPUT_PILOT_COMPREHENSION.NOT_ANSWERED,
    },
  });
  assert.equal(restored.observer.repeatedInputCount, 2);
  assert.equal(restored.selfReport.groundAction, INPUT_PILOT_COMPREHENSION.CORRECT);
  assert.throws(() => model.setCounter('unknown', 1), /未知观察计数/);
  assert.throws(() => model.setCounter('correctionCount', 1000), /0～999/);
  const beforeInvalidRestore = model.getSnapshot();
  assert.throws(() => model.restore({
    observer: { ...beforeInvalidRestore.observer, correctionCount: 999 },
    selfReport: { ...beforeInvalidRestore.selfReport, airAction: 'unknown' },
  }), /不受支持/);
  assert.deepEqual(model.getSnapshot(), beforeInvalidRestore);
  assert.throws(() => { restored.observer.correctionCount = 99; }, /read only|Cannot assign/i);
});

test('web pilot environment distinguishes coarse phone touch from desktop mouse', () => {
  const phone = detectInputPilotWebEnvironment({
    innerWidth: 390,
    innerHeight: 844,
    screen: { width: 390, height: 844 },
    navigator: { maxTouchPoints: 5, userAgentData: { mobile: true } },
    matchMedia: () => ({ matches: true }),
  });
  assert.deepEqual(phone, {
    platform: 'web',
    formFactor: 'phone',
    orientation: 'portrait',
    inputMode: 'touch',
  });
  const desktop = detectInputPilotWebEnvironment({
    innerWidth: 1440,
    innerHeight: 900,
    screen: { width: 1440, height: 900 },
    navigator: { maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false }),
  });
  assert.equal(desktop.formFactor, 'desktop');
  assert.equal(desktop.orientation, 'landscape');
  assert.equal(desktop.inputMode, 'mouse');
});

test('Input Pilot formal collection requires a clean Web build containing pilot.html', async () => {
  const clean = await loadInputPilotBuildIdentity({
    fetch: async () => ({ ok: true, json: async () => buildManifest() }),
  });
  assert.equal(clean.collectable, true);
  assert.equal(clean.manifest.commit, COMMIT);
  const dirty = await loadInputPilotBuildIdentity({
    fetch: async () => ({
      ok: true,
      json: async () => buildManifest({ sourceDirty: true }),
    }),
  });
  assert.equal(dirty.collectable, false);
  assert.equal(dirty.reason, 'dirty-source-build');
  const missing = await loadInputPilotBuildIdentity({
    fetch: async () => ({
      ok: true,
      json: async () => buildManifest({ includePilot: false }),
    }),
  });
  assert.equal(missing.collectable, false);
  assert.equal(missing.reason, 'build-manifest-invalid');
});

test('Web build identity rejects capability accessors without executing them', async () => {
  let fetchReads = 0;
  const root = {};
  Object.defineProperty(root, 'fetch', {
    get() {
      fetchReads += 1;
      return async () => ({ ok: true, json: async () => buildManifest() });
    },
  });
  const invalidFetch = await loadInputPilotBuildIdentity(root);
  assert.equal(invalidFetch.collectable, false);
  assert.equal(invalidFetch.reason, 'build-manifest-fetch-invalid');
  assert.equal(fetchReads, 0);

  let jsonReads = 0;
  const invalidJson = await loadInputPilotBuildIdentity({
    fetch: async () => {
      const response = { ok: true };
      Object.defineProperty(response, 'json', {
        get() {
          jsonReads += 1;
          return async () => buildManifest();
        },
      });
      return response;
    },
  });
  assert.equal(invalidJson.collectable, false);
  assert.equal(invalidJson.reason, 'build-manifest-invalid');
  assert.equal(jsonReads, 0);
});

test('web pilot owner ids prefer crypto and JSON export revokes its temporary URL', () => {
  assert.equal(createInputPilotPageOwnerId({
    crypto: { randomUUID: () => 'stable-id' },
  }), 'pilot-page-stable-id');
  const actions = [];
  const parent = {
    appendChild(value) { actions.push(['append', value.download]); },
  };
  const anchor = {
    hidden: false,
    click() { actions.push(['click', this.download]); },
    remove() { actions.push(['remove', this.download]); },
  };
  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  }
  const filename = downloadInputPilotJson({
    Blob: FakeBlob,
    URL: {
      createObjectURL(blob) {
        assert.match(blob.parts[0], /"revision": 7/);
        return 'blob:pilot';
      },
      revokeObjectURL(value) { actions.push(['revoke', value]); },
    },
    document: {
      body: parent,
      createElement: () => anchor,
    },
  }, {
    kind: 'aggregate',
    revision: 7,
    value: { revision: 7 },
  });
  assert.equal(filename, 'arena-input-pilot-aggregate-r7.json');
  assert.equal(anchor.href, 'blob:pilot');
  assert.deepEqual(actions, [
    ['append', filename],
    ['click', filename],
    ['remove', filename],
    ['revoke', 'blob:pilot'],
  ]);
});

test('Pilot JSON download rejects unsafe data and rolls back failed DOM ownership', () => {
  let nestedReads = 0;
  const nested = {};
  Object.defineProperty(nested, 'secret', {
    get() {
      nestedReads += 1;
      return 'unsafe';
    },
  });
  assert.throws(() => downloadInputPilotJson({}, {
    kind: 'aggregate',
    revision: 1,
    value: { nested },
  }), /数据字段|访问器/);
  assert.equal(nestedReads, 0);

  const actions = [];
  class FakeBlob {}
  const anchor = {
    click() {
      actions.push('click');
      throw new Error('click failed');
    },
    remove() { actions.push('remove'); },
  };
  assert.throws(() => downloadInputPilotJson({
    Blob: FakeBlob,
    URL: {
      createObjectURL() { return 'blob:rollback'; },
      revokeObjectURL(value) { actions.push(`revoke:${value}`); },
    },
    document: {
      body: { appendChild() { actions.push('append'); } },
      createElement() { return anchor; },
    },
  }, {
    kind: 'audit',
    revision: 2,
    value: { ok: true },
  }), /click failed/);
  assert.deepEqual(actions, ['append', 'click', 'remove', 'revoke:blob:rollback']);

  const rollback = [];
  assert.throws(() => downloadInputPilotJson({
    Blob: FakeBlob,
    URL: {
      createObjectURL() { return 'blob:async'; },
      revokeObjectURL(value) { rollback.push(`revoke:${value}`); },
    },
    document: {
      body: { async appendChild() {} },
      createElement() {
        return {
          click() {},
          remove() { rollback.push('remove'); },
        };
      },
    },
  }, {
    kind: 'evidence',
    revision: 3,
    value: { ok: true },
  }), /appendChild 必须同步完成/);
  assert.deepEqual(rollback, ['remove', 'revoke:blob:async']);

  const legacyCleanup = [];
  const legacyAnchor = {
    click() { throw new Error('click failed'); },
  };
  assert.throws(() => downloadInputPilotJson({
    Blob: FakeBlob,
    URL: {
      createObjectURL() { return 'blob:legacy'; },
      revokeObjectURL(value) { legacyCleanup.push(`revoke:${value}`); },
    },
    document: {
      body: {
        appendChild() {},
        removeChild(value) { legacyCleanup.push(value === legacyAnchor ? 'removeChild' : 'wrong'); },
      },
      createElement() { return legacyAnchor; },
    },
  }, {
    kind: 'aggregate',
    revision: 4,
    value: { ok: true },
  }), /click failed/);
  assert.deepEqual(legacyCleanup, ['removeChild', 'revoke:blob:legacy']);
});
