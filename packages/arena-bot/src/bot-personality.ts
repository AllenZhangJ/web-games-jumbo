import { createRng } from '@number-strategy-jump/arena-contracts';

const ARCHETYPES = Object.freeze([
  Object.freeze({ id: 'hunter', aggression: 0.84, riskTolerance: 0.52, patience: 0.42 }),
  Object.freeze({ id: 'tactician', aggression: 0.68, riskTolerance: 0.34, patience: 0.78 }),
  Object.freeze({ id: 'brawler', aggression: 0.92, riskTolerance: 0.68, patience: 0.30 }),
  Object.freeze({ id: 'survivor', aggression: 0.56, riskTolerance: 0.20, patience: 0.74 }),
  Object.freeze({ id: 'opportunist', aggression: 0.76, riskTolerance: 0.42, patience: 0.62 }),
] as const);

export type BotPersonalityArchetypeId = typeof ARCHETYPES[number]['id'];

export interface BotPersonality {
  readonly id: BotPersonalityArchetypeId;
  readonly aggression: number;
  readonly riskTolerance: number;
  readonly patience: number;
}

function validateSeed(seed: unknown): number {
  if (!Number.isSafeInteger(seed) || (seed as number) < 0 || (seed as number) > 0xffffffff) {
    throw new RangeError('bot personality seed 必须是 uint32。');
  }
  return seed as number;
}

export function createBotPersonality(seed: unknown): BotPersonality {
  const rng = createRng(validateSeed(seed));
  const archetype = rng.pick(ARCHETYPES);
  const variation = (): number => (rng.next() - 0.5) * 0.08;
  const clamp = (value: number): number => Math.max(0, Math.min(1, value));
  return Object.freeze({
    id: archetype.id,
    aggression: clamp(archetype.aggression + variation()),
    riskTolerance: clamp(archetype.riskTolerance + variation()),
    patience: clamp(archetype.patience + variation()),
  });
}
