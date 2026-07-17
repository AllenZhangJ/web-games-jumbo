import test from 'node:test';
import assert from 'node:assert/strict';
import { InputPilotFormModel } from '../../../src/arena/presentation/pilot/input-pilot-form-model.js';
import { INPUT_PILOT_COMPREHENSION } from '../../../src/arena/presentation/pilot/input-pilot-record.js';
import { downloadInputPilotJson } from '../../../src/entry/input-pilot-json-download.js';
import {
  createInputPilotPageOwnerId,
  detectInputPilotWebEnvironment,
} from '../../../src/entry/input-pilot-web-environment.js';

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
