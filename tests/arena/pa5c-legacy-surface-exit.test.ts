import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.resolve(relativePath), 'utf8');
}

function assertNoMethod(sourceText: string, method: string, label: string): void {
  assert.doesNotMatch(
    sourceText,
    new RegExp(`^\\s+(?:public\\s+)?${method}\\s*\\(`, 'm'),
    `${label} 不得保留模糊 ${method}()。`,
  );
}

function assertExactMethod(sourceText: string, signature: RegExp, label: string): void {
  assert.match(sourceText, signature, `${label} 必须以精确方法合同存在。`);
}

test('PA5c removes the ambiguous LocalSession and Product legacy surfaces', () => {
  const localSession = source('packages/arena-session/src/local-match-session.ts');
  assert.match(localSession, /stepWithLegacySnapshotForAudit\(/);
  assert.match(localSession, /getLegacyFullSnapshotForAudit\(/);
  assert.match(localSession, /runLegacyUntilEndedForAudit\(/);
  assertNoMethod(localSession, 'step', 'LocalMatchSession');
  assertNoMethod(localSession, 'getSnapshot', 'LocalMatchSession');
  assertNoMethod(localSession, 'runUntilEnded', 'LocalMatchSession');

  const runtime = source('packages/arena-product-match/src/product-match-runtime.ts');
  for (const method of ['startWithReadFrame', 'getReadFrame', 'stepWithReadFrame']) {
    assert.match(runtime, new RegExp(`${method}\\s*\\(`));
  }
  for (const method of ['start', 'step', 'getSnapshot']) assertNoMethod(runtime, method, 'ProductMatchRuntime');
  assert.doesNotMatch(runtime, /ProductMatchStepOutcome|ProductMatchReadMode|selectReadMode/);

  const coordinator = source('packages/arena-product-match/src/product-match-coordinator.ts');
  for (const method of ['start', 'step', 'getMatchSnapshot']) assertNoMethod(coordinator, method, 'ProductMatchCoordinator');
  assert.match(coordinator, /getSnapshot\(\): ProductMatchCoordinatorSnapshot/);
  assert.match(coordinator, /startWithReadFrame\(/);
  assert.match(coordinator, /stepWithReadFrame\(/);
  assert.match(coordinator, /getMatchReadFrame\(/);

  const controller = source('packages/arena-product-session/src/product-session-controller.ts');
  for (const method of ['beginMatch', 'stepMatch', 'getActiveMatchSnapshot']) {
    assertNoMethod(controller, method, 'ProductSessionController');
  }
  assert.doesNotMatch(controller, /ProductSessionStepOutcome/);
  assert.match(controller, /beginMatchWithReadFrame\(/);
  assert.match(controller, /stepMatchWithReadFrame\(/);
  assert.match(controller, /getActiveMatchReadFrame\(/);
  assert.match(controller, /getSnapshot\(\): ProductSessionSnapshot/);

  for (const indexPath of [
    'packages/arena-product-match/src/index.ts',
    'packages/arena-product-session/src/index.ts',
  ]) {
    assert.doesNotMatch(source(indexPath), /Product(?:Match|Session)StepOutcome/);
  }
});

test('PA5c keeps production reachability V2-only and research explicit', () => {
  const quickMatch = source('packages/arena-quick-match/src/quick-match-service.ts');
  const survival = source('packages/arena-v1-composition/src/arena-v2-survival-supply-bot-composition.ts');
  for (const productionSource of [quickMatch, survival]) {
    assert.doesNotMatch(
      productionSource,
      /['"](?:step|runUntilEnded|getSnapshot|trustedBinding|trustedBotBinding)['"]|\.(?:step|runUntilEnded|getSnapshot)\(\)/,
      'QuickMatch/survival 不得捕获模糊 LocalSession surface。',
    );
    assert.match(productionSource, /getPresentationReadFrame|stepWithPresentationReadFrame/);
  }

  const regression = source('packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts');
  const experiment = source('packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts');
  const greybox = source('packages/arena-v1-greybox-session/src/greybox-presentation-session.ts');
  const resources = source('packages/arena-presentation-runtime/src/arena-match-resources.ts');
  const pilot = source('packages/arena-input-pilot/src/input-pilot-observed-session.ts');
  for (const researchSource of [regression, experiment, greybox, resources, pilot]) {
    assert.doesNotMatch(
      researchSource,
      /(?:session|matchSession|delegate|candidate)\.(?:step|runUntilEnded|getSnapshot)\(\)/,
      '研究/灰盒/InputPilot 只能调用显式 Legacy/Audit adapter。',
    );
  }
  assert.match(regression, /stepWithLegacySnapshotForAudit/);
  assert.match(experiment, /stepWithLegacySnapshotForAudit/);
  assert.match(greybox, /stepWithLegacySnapshotForAudit/);
  assert.match(resources, /getLegacyFullSnapshotForAudit/);
  assert.match(pilot, /stepWithLegacySnapshotForAudit/);

  const productFlow = source('packages/arena-product-presentation/src/product-presentation-flow.ts');
  assert.match(productFlow, /stepMatch\(\)/);
  assert.match(productFlow, /stepMatchWithReadFrame/);
  const experimentContract = source('packages/arena-experiment/src/simulation-workload-registry.ts');
  assert.match(experimentContract, /getSnapshot/);
  const headless = source('packages/arena-match/src/replay.ts');
  assert.match(headless, /step\(/);
  assert.match(headless, /runLegacyUntilEndedForAudit/);
});

test('PA5c closes Product ports and production reachability with independent exact spans', () => {
  const matchPort = source('packages/arena-product-match/src/ports.ts');
  const sessionPort = source('packages/arena-product-session/src/ports.ts');
  const oldPortNames = /['"](?:start|step|getMatchSnapshot|beginMatch|stepMatch|getActiveMatchSnapshot)['"]/;
  assert.doesNotMatch(matchPort, oldPortNames, 'ProductMatch port 不得捕获旧 legacy 方法名。');
  assert.doesNotMatch(sessionPort, oldPortNames, 'ProductSession port 不得捕获旧 legacy 方法名。');
  assert.doesNotMatch(matchPort, /ProductMatchStepOutcome/);
  assert.doesNotMatch(sessionPort, /ProductSessionStepOutcome/);
  for (const indexPath of [
    'packages/arena-product-match/src/index.ts',
    'packages/arena-product-session/src/index.ts',
  ]) {
    const indexSource = source(indexPath);
    assert.doesNotMatch(indexSource, /Product(?:Match|Session)StepOutcome/);
    assert.doesNotMatch(indexSource, oldPortNames, `${indexPath} 不得导出或捕获旧方法名。`);
  }

  const productionPaths = [
    'packages/arena-product-match/src/product-match-runtime.ts',
    'packages/arena-product-match/src/product-match-coordinator.ts',
    'packages/arena-product-session/src/product-session-controller.ts',
    'packages/arena-product-presentation/src/product-match-presentation-runtime.ts',
    'packages/arena-product-presentation/src/product-presentation-flow.ts',
    'packages/arena-product-presentation/src/product-presentation-session.ts',
    'packages/arena-product-presentation/src/product-input-router.ts',
    'packages/arena-v1-presentation-content/src/arena-frame-projector.ts',
    'packages/arena-v1-application-session/src/product-presentation-session-composition.ts',
    'packages/arena-presentation-runtime/src/arena-input-mapper.ts',
    'packages/arena-presentation-runtime/src/input-sampler.ts',
    'packages/arena-presentation-runtime/src/arena-input-router.ts',
  ];
  const forbiddenProductionAudit = /(?:getLegacyFullSnapshotForAudit|stepWithLegacySnapshotForAudit|runLegacyUntilEndedForAudit|(?:core|matchCore|session)\.get(?:LegacyFullSnapshotForAudit|Snapshot)\s*\()/;
  for (const productionPath of productionPaths) {
    assert.doesNotMatch(
      source(productionPath),
      forbiddenProductionAudit,
      `${productionPath} 不得回流 Legacy/Audit/Core full getter。`,
    );
  }

  const researchRules: ReadonlyArray<Readonly<{
    path: string;
    required: RegExp;
    forbidden: RegExp;
  }>> = [
    {
      path: 'packages/arena-regression/src/arena-v1-golden-replay-scenarios.ts',
      required: /session\.stepWithLegacySnapshotForAudit\(|session\.runLegacyUntilEndedForAudit\(/,
      forbidden: /session\.(?:step|runUntilEnded|getSnapshot)\s*\(|['"](?:step|runUntilEnded|getSnapshot)['"]/
    },
    {
      path: 'packages/arena-v1-experiment/src/arena-v1-bot-capability-workload.ts',
      required: /this\.\#session\.stepWithLegacySnapshotForAudit\(|this\.\#session\.getLegacyFullSnapshotForAudit\(/,
      forbidden: /this\.\#session\.(?:step|runUntilEnded|getSnapshot)\s*\(|['"](?:step|runUntilEnded|getSnapshot)['"]/
    },
    {
      path: 'packages/arena-v1-greybox-session/src/greybox-presentation-session.ts',
      required: /matchSession\.stepWithLegacySnapshotForAudit|matchSession\.getLegacyFullSnapshotForAudit/,
      forbidden: /matchSession\.(?:step|runUntilEnded|getSnapshot)\s*\(|['"](?:step|runUntilEnded|getSnapshot)['"]/
    },
    {
      path: 'packages/arena-presentation-runtime/src/arena-match-resources.ts',
      required: /stepWithLegacySnapshotForAudit|getLegacyFullSnapshotForAudit|legacySnapshotForAudit/,
      forbidden: /(?:session|matchSession)\.(?:step|runUntilEnded|getSnapshot)\s*\(|['"](?:step|runUntilEnded|getSnapshot)['"]/
    },
    {
      path: 'packages/arena-input-pilot/src/input-pilot-observed-session.ts',
      required: /stepWithLegacySnapshotForAudit|getLegacyFullSnapshotForAudit|runLegacyUntilEndedForAudit/,
      forbidden: /(?:delegate|session)\.(?:step|runUntilEnded|getSnapshot)\s*\(/
    },
  ];
  for (const rule of researchRules) {
    const researchSource = source(rule.path);
    assert.match(researchSource, rule.required, `${rule.path} 必须调用显式 adapter。`);
    assert.doesNotMatch(researchSource, rule.forbidden, `${rule.path} 不得回流模糊 API。`);
  }

  const productFlow = source('packages/arena-product-presentation/src/product-presentation-flow.ts');
  assertExactMethod(
    productFlow,
    /^  stepMatch\(\): ProductPresentationFlowSnapshot \{/m,
    'ProductPresentationFlow.stepMatch',
  );
  const experimentContract = source('packages/arena-experiment/src/simulation-workload-registry.ts');
  assertExactMethod(experimentContract, /readonly getSnapshot: \(\) => unknown;/, 'ArenaSimulationCase.getSnapshot');
  const headless = source('packages/arena-match/src/replay.ts');
  assertExactMethod(
    headless,
    /^  step\(frames: unknown = \[\]\): readonly ArenaAuthorityEvent\[\] \{/m,
    'HeadlessMatchRunner.step',
  );
  assertExactMethod(headless, /^  runLegacyUntilEndedForAudit\(/m, 'HeadlessMatchRunner.runLegacyUntilEndedForAudit');
});
