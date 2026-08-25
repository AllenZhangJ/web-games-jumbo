import assert from 'node:assert/strict';
import test from 'node:test';
import {
  runArenaThreeModeWeaponFeedbackRealFailureReplayCandidateV1,
} from '../../packages/arena-regression/src/arena-three-mode-weapon-feedback-real-failure-replay-candidate-v1.js';

test('P4 three-mode real failure replay matrix keeps all 33 injected failures and cleanup paths observable', () => {
  const report = runArenaThreeModeWeaponFeedbackRealFailureReplayCandidateV1();
  assert.equal(report.caseCount, 33);
  assert.equal(report.expectedFailureObservedCount, 33);
  assert.equal(report.allExpectedFailuresObserved, true);
  assert.deepEqual(
    report.modeReports.map(({ modeDefinitionId, caseCount, expectedFailureObservedCount }) => ({
      modeDefinitionId,
      caseCount,
      expectedFailureObservedCount,
    })),
    [
      {
        modeDefinitionId: 'arena-v2.mode.duel.candidate.v1',
        caseCount: 11,
        expectedFailureObservedCount: 11,
      },
      {
        modeDefinitionId: 'arena-v2.mode.race.candidate.v1',
        caseCount: 11,
        expectedFailureObservedCount: 11,
      },
      {
        modeDefinitionId: 'arena-v2.mode.survival.candidate.v1',
        caseCount: 11,
        expectedFailureObservedCount: 11,
      },
    ],
  );
  assert.equal(
    report.cases.every(({ status, evidence }) => (
      status === 'expected-failure-observed'
      && evidence.pendingFailures.length === 0
      && evidence.injectedFailureCount > 0
    )),
    true,
  );
});
