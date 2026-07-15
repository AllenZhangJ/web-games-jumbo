export const OPERATION_KINDS = ['add', 'subtract', 'multiply', 'divide'] as const;

export type OperationKind = typeof OPERATION_KINDS[number];
export type DefinitionId = string;

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type ValidationResult =
  | { readonly valid: true; readonly issues: readonly [] }
  | { readonly valid: false; readonly issues: readonly ValidationIssue[] };

export interface VersionedDefinition {
  readonly id: DefinitionId;
  readonly version: number;
}

export interface DefinitionPresentation {
  readonly name: string;
  readonly description: string;
}

export interface GameplayDefinition<TConfig = unknown, TSession = unknown>
  extends VersionedDefinition {
  readonly presentation: DefinitionPresentation;
  readonly supportedTaskTypes: readonly DefinitionId[];
  validateConfig(config: unknown): ValidationResult;
  createSession(config: TConfig, context: GameplayContext): TSession;
}

export interface GameplayContext {
  readonly seed: number;
  readonly difficultyId: DefinitionId;
  readonly difficultyVersion: number;
}

export interface TaskDefinition<TConfig = unknown, TTask = unknown, TSnapshot = unknown>
  extends VersionedDefinition {
  readonly presentation: DefinitionPresentation;
  validate(config: unknown): ValidationResult;
  create(config: TConfig, context: TaskContext): TTask;
  evaluate(task: TTask, snapshot: TSnapshot): TaskResult;
}

export interface TaskContext {
  readonly seed: number;
  readonly gameplayId: DefinitionId;
  readonly difficultyId: DefinitionId;
}

export interface TaskResult {
  readonly status: 'active' | 'completed' | 'failed';
  readonly reason?: string;
  readonly message?: string;
}

export interface CharacterAssetManifest {
  readonly model?: string;
  readonly textures: readonly string[];
  readonly audio: readonly string[];
}

export interface SceneTheme {
  readonly background: number;
  readonly floor: number;
  readonly fogNear: number;
  readonly fogFar: number;
}

export interface SceneLighting {
  readonly hemisphereSky: number;
  readonly hemisphereGround: number;
  readonly hemisphereIntensity: number;
  readonly directionalColor: number;
  readonly directionalIntensity: number;
}

export interface SceneDefinition extends VersionedDefinition {
  readonly rendererKey: string;
  readonly theme: SceneTheme;
  readonly lighting: SceneLighting;
}

export interface CharacterAnimationSet {
  readonly idle: string;
  readonly charging: string;
  readonly jumping: string;
  readonly landing: string;
  readonly failed: string;
}

export type CharacterBodyShape = 'jumbo' | 'capsule' | 'orb' | 'bot' | 'cone';
export type CharacterAccessory = 'none' | 'antenna' | 'visor' | 'ears' | 'ring' | 'crown';
export type CharacterMotionStyle = 'balanced' | 'spring' | 'heavy' | 'float' | 'swift';

export interface CharacterAppearance {
  readonly bodyShape: CharacterBodyShape;
  readonly accessory: CharacterAccessory;
  readonly motionStyle: CharacterMotionStyle;
  readonly secondaryColor: number;
}

export interface CharacterDefinition extends VersionedDefinition {
  readonly presentation: DefinitionPresentation;
  readonly rendererKey: string;
  readonly assetManifest: CharacterAssetManifest;
  readonly animationSet: CharacterAnimationSet;
  readonly visualScale: number;
  readonly primaryColor: number;
  readonly appearance: CharacterAppearance;
}

export type GameCommand =
  | { readonly type: 'start-charge'; readonly choice: 'left' | 'right'; readonly pointerId: number }
  | { readonly type: 'release-charge'; readonly pointerId: number }
  | { readonly type: 'cancel-charge'; readonly pointerId?: number }
  | { readonly type: 'tick'; readonly deltaMs: number }
  | { readonly type: 'pause' }
  | { readonly type: 'resume' }
  | { readonly type: 'restart' }
  | { readonly type: 'next-round' };

export interface GameEvent<TPayload = unknown> {
  readonly id: number;
  readonly type: string;
  readonly occurredAtMs: number;
  readonly payload: TPayload;
}

export interface GameSnapshot {
  readonly revision: number;
  readonly phase: string;
  readonly gameplayId: DefinitionId;
  readonly taskId: DefinitionId;
  readonly difficultyId: DefinitionId;
  readonly difficultyVersion: number;
  readonly state: Readonly<Record<string, unknown>>;
  readonly world: Readonly<Record<string, unknown>>;
  readonly presentation: Readonly<Record<string, unknown>>;
}

export interface RendererPort {
  load(): Promise<void>;
  resize(): boolean;
  render(snapshot: GameSnapshot, events: readonly GameEvent[]): boolean;
  dispose(): void;
}

export interface FeedbackPort {
  handle(events: readonly GameEvent[]): void;
  dispose(): void;
}

export interface StoragePort {
  read(key: string): unknown;
  write(key: string, value: unknown): boolean;
  remove(key: string): boolean;
}

export interface ClockPort {
  now(): number;
  requestFrame(callback: () => void): unknown;
  cancelFrame(id: unknown): void;
}

export function definitionKey(definition: unknown): string {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('definition 必须是对象。');
  }
  const candidate = definition as Partial<VersionedDefinition>;
  if (typeof candidate.id !== 'string') {
    throw new TypeError('definition.id 必须是字符串。');
  }
  const id = candidate.id.trim();
  if (id !== candidate.id) {
    throw new TypeError('definition.id 不能包含首尾空白。');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new TypeError('definition.id 必须是小写短横线标识符。');
  }
  if (!Number.isSafeInteger(candidate.version) || (candidate.version ?? 0) <= 0) {
    throw new RangeError('definition.version 必须是正安全整数。');
  }
  return `${id}@${candidate.version}`;
}
