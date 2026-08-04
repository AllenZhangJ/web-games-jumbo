import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_LANE,
  createActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ACTION_AFFORDANCE_PROFILE,
  ACTION_PRIORITY,
  ActionAffordanceProjector,
  ActionResolver,
} from '@number-strategy-jump/arena-core';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  runArenaPa6FormalReadStepRoundV2,
  runArenaPa6ReadModelProbeV2,
  runFormalSurvivalBotPressure,
} from './arena-formal-survival-bot-pressure.js';
import {
  readArenaPa6LoaderAttestationV2,
  requireArenaPa6ActiveLoaderConfigV2,
} from './lib/arena-pa6-source-transform-register-v2.js';
import {
  assertArenaPa6SourceIdentityEqualV1,
  readArenaPa6SourceIdentityV1,
  type ArenaPa6SourceIdentityV1,
} from './lib/arena-pa6-read-step-abba-v1.js';

export const ARENA_PA6_EXPECTED_SOURCE_ENV_V2 = 'ARENA_PA6_EXPECTED_SOURCE_V2' as const;
const IPC_SCHEMA_VERSION = 2 as const;

interface ArenaPa6WorkerRequestV2 {
  readonly schemaVersion: typeof IPC_SCHEMA_VERSION;
  readonly requestId: number;
  readonly type: 'warmup' | 'measure' | 'probe-read-model' | 'probe-resolver' | 'shutdown';
}

function parseExpectedSourceFromEnvironment(): ArenaPa6SourceIdentityV1 {
  const raw = process.env[ARENA_PA6_EXPECTED_SOURCE_ENV_V2];
  Reflect.deleteProperty(process.env, ARENA_PA6_EXPECTED_SOURCE_ENV_V2);
  if (raw === undefined || Buffer.byteLength(raw, 'utf8') > 4_096) {
    throw new Error('PA6 worker expected source env 缺失或超限。');
  }
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('PA6 worker expected source 不是完整 JSON。');
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('PA6 worker expected source 必须是 record。');
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 3 || keys[0] !== 'dirty' || keys[1] !== 'fingerprint' || keys[2] !== 'head') {
    throw new TypeError('PA6 worker expected source 字段集合不精确。');
  }
  if (typeof record.head !== 'string' || !/^[0-9a-f]{40}$/.test(record.head)
    || typeof record.dirty !== 'boolean'
    || typeof record.fingerprint !== 'string' || !/^[0-9a-f]{64}$/.test(record.fingerprint)) {
    throw new Error('PA6 worker expected source identity 非法。');
  }
  return Object.freeze({
    head: record.head,
    dirty: record.dirty,
    fingerprint: record.fingerprint,
  });
}

function parseWorkerRequest(value: unknown): ArenaPa6WorkerRequestV2 {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('PA6 worker request 必须是 record。');
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 3 || keys[0] !== 'requestId' || keys[1] !== 'schemaVersion'
    || keys[2] !== 'type') {
    throw new TypeError('PA6 worker request 字段集合不精确。');
  }
  if (record.schemaVersion !== IPC_SCHEMA_VERSION
    || !Number.isSafeInteger(record.requestId) || (record.requestId as number) < 1
    || (record.type !== 'warmup' && record.type !== 'measure'
      && record.type !== 'probe-read-model' && record.type !== 'probe-resolver'
      && record.type !== 'shutdown')) {
    throw new Error('PA6 worker request schema/id/type 非法。');
  }
  return Object.freeze({
    schemaVersion: IPC_SCHEMA_VERSION,
    requestId: record.requestId as number,
    type: record.type,
  });
}

function runResolverPathProbe(): Readonly<Record<string, unknown>> {
  const definition = createActionDefinition({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: 'pa6-resolver-probe-action',
    kind: 'pa6-governance-probe',
    input: { channel: ACTION_INPUT_CHANNEL.PRIMARY, trigger: 'pressed' },
    lane: ACTION_LANE.COMBAT,
    conflictTags: [],
    timing: { windupTicks: 0, activeTicks: 1, recoveryTicks: 0, cooldownTicks: 0 },
    targeting: { kind: 'self', parameters: {} },
    effects: [{
      id: 'pa6-resolver-probe-effect',
      kind: 'pa6-governance-probe',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: {},
    }],
    tags: [],
  });
  let registryRequireCalls = 0;
  const resolver = new ActionResolver({
    actionRegistry: {
      require(id: string) {
        registryRequireCalls += 1;
        if (id !== definition.id) throw new Error('PA6 resolver probe action id 漂移。');
        return definition;
      },
    },
  });
  const result = new ActionAffordanceProjector({ resolver }).projectProfile({
    tick: 7,
    participantId: 'player-1',
    canAct: true,
    // Deliberately non-frozen: each real sequential resolve must prepare/evaluate it again.
    candidates: [{
      id: 'pa6-resolver-probe-candidate',
      actionDefinitionId: definition.id,
      source: 'pa6-governance-probe',
      priority: ACTION_PRIORITY.BASE,
      available: true,
      blocksFallback: false,
      unavailableReason: null,
    }],
    occupiedLanes: [],
    activeConflictTags: [],
  }, ACTION_AFFORDANCE_PROFILE.FULL_AUDIT);
  return Object.freeze({
    schemaVersion: IPC_SCHEMA_VERSION,
    registryRequireCalls,
    channelCount: Object.keys(result.channels).length,
    resultHash: createDeterministicDataHash(result, 'PA6 resolver path probe'),
  });
}

function sendIpc(value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof process.send !== 'function' || !process.connected) {
      reject(new Error('PA6 worker IPC channel 不可用。'));
      return;
    }
    process.send(value, (error) => {
      if (error === null) resolve();
      else reject(error);
    });
  });
}

export async function runArenaPa6VariantWorkerAttestationProbeV2(): Promise<unknown> {
  if (typeof runFormalSurvivalBotPressure !== 'function') {
    throw new Error('PA6 source graph 未加载 formal survival pressure entry。');
  }
  const config = requireArenaPa6ActiveLoaderConfigV2();
  const attestation = await readArenaPa6LoaderAttestationV2();
  if (attestation.variantId !== config.variantId
    || attestation.sourceFingerprint !== config.sourceFingerprint) {
    throw new Error('PA6 worker loader config/attestation identity 漂移。');
  }
  return attestation;
}

async function runIpcWorker(): Promise<void> {
  if (typeof process.send !== 'function' || !process.connected) {
    throw new Error('PA6 variant worker 必须由 IPC parent 启动。');
  }
  const expectedSource = parseExpectedSourceFromEnvironment();
  const config = requireArenaPa6ActiveLoaderConfigV2();
  if (config.sourceFingerprint !== expectedSource.fingerprint) {
    throw new Error('PA6 worker loader/source fingerprint 不一致。');
  }
  const before = readArenaPa6SourceIdentityV1(process.cwd());
  assertArenaPa6SourceIdentityEqualV1(before, expectedSource, 'PA6 variant worker 前置');
  const attestation = await readArenaPa6LoaderAttestationV2();
  await sendIpc(Object.freeze({
    schemaVersion: IPC_SCHEMA_VERSION,
    type: 'ready',
    variantId: config.variantId,
    source: expectedSource,
    loaderAttestation: attestation,
  }));
  let expectedRequestId = 1;
  let warmupCompleted = false;
  let measurementCount = 0;
  let handling = false;
  let terminal = false;
  const fail = async (requestId: number | null, error: unknown): Promise<void> => {
    if (terminal) return;
    terminal = true;
    await sendIpc(Object.freeze({
      schemaVersion: IPC_SCHEMA_VERSION,
      type: 'failed',
      requestId,
      error: error instanceof Error ? error.message : 'PA6 worker unknown failure',
    })).catch(() => undefined);
    process.exitCode = 1;
    process.disconnect();
  };
  process.on('message', (value: unknown) => {
    if (terminal || handling) {
      void fail(null, new Error('PA6 worker 不接受 terminal/并发 request。'));
      return;
    }
    handling = true;
    void (async () => {
      let requestId: number | null = null;
      try {
        const request = parseWorkerRequest(value);
        requestId = request.requestId;
        if (request.requestId !== expectedRequestId) {
          throw new Error('PA6 worker requestId 不连续。');
        }
        expectedRequestId += 1;
        let result: unknown;
        if (request.type === 'warmup') {
          if (warmupCompleted || measurementCount !== 0) {
            throw new Error('PA6 worker warmup 必须且只能先执行一次。');
          }
          const warmup = runArenaPa6FormalReadStepRoundV2({
            variantId: config.variantId,
            loaderAttestation: attestation,
          });
          warmupCompleted = true;
          result = Object.freeze({
            variantId: warmup.variantId,
            parityIdentity: warmup.parityIdentity,
            denominatorTicks: warmup.denominatorTicks,
          });
        } else if (request.type === 'measure') {
          if (!warmupCompleted || measurementCount >= 2) {
            throw new Error('PA6 worker measurement 必须在 warmup 后且最多两轮。');
          }
          result = runArenaPa6FormalReadStepRoundV2({
            variantId: config.variantId,
            loaderAttestation: attestation,
          });
          measurementCount += 1;
        } else if (request.type === 'probe-read-model') {
          if (warmupCompleted || measurementCount !== 0) {
            throw new Error('PA6 read-model probe 只允许在未测量 worker 执行。');
          }
          result = runArenaPa6ReadModelProbeV2();
        } else if (request.type === 'probe-resolver') {
          if (warmupCompleted || measurementCount !== 0) {
            throw new Error('PA6 resolver probe 只允许在未测量 worker 执行。');
          }
          result = runResolverPathProbe();
        } else {
          const after = readArenaPa6SourceIdentityV1(process.cwd());
          assertArenaPa6SourceIdentityEqualV1(after, expectedSource, 'PA6 variant worker 后置');
          terminal = true;
          result = Object.freeze({
            variantId: config.variantId,
            warmupCompleted,
            measurementCount,
            source: after,
          });
        }
        await sendIpc(Object.freeze({
          schemaVersion: IPC_SCHEMA_VERSION,
          type: 'result',
          requestId,
          result,
        }));
        if (terminal) process.disconnect();
      } catch (error: unknown) {
        await fail(requestId, error);
      } finally {
        handling = false;
      }
    })();
  });
}

async function main(): Promise<void> {
  if (process.argv.length !== 3) {
    throw new Error('PA6 variant worker 只接受一个精确 mode。');
  }
  if (process.argv[2] === '--attestation-probe') {
    const result = await runArenaPa6VariantWorkerAttestationProbeV2();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return;
  }
  if (process.argv[2] !== '--ipc-worker') {
    throw new Error('PA6 variant worker mode 非法。');
  }
  await runIpcWorker();
}

const invokedScript = process.argv[1] === undefined
  ? false
  : pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invokedScript) void main().catch(async (error: unknown) => {
  if (process.argv[2] === '--ipc-worker' && typeof process.send === 'function' && process.connected) {
    await sendIpc(Object.freeze({
      schemaVersion: IPC_SCHEMA_VERSION,
      type: 'failed',
      requestId: null,
      error: error instanceof Error ? error.message : 'PA6 variant worker failure',
    })).catch(() => undefined);
    process.disconnect();
  } else {
    process.stderr.write(`${error instanceof Error ? error.message : 'PA6 variant worker failure'}\n`);
  }
  process.exitCode = 1;
});
