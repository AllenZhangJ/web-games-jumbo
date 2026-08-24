import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CHARACTER_SOURCE = readFileSync(new URL(
  '../src/arena-v2-formal-gltf-character-view-candidate-v1.ts',
  import.meta.url,
), 'utf8');
const CONTROLLER_SOURCE = readFileSync(new URL(
  '../../arena-presentation-three/src/character-animation-controller.ts',
  import.meta.url,
), 'utf8');

describe('Arena V2 formal GLTF character hit direction candidate V1', () => {
  it('selects existing front/back reactions only from target facing and stable world direction', () => {
    expect(CHARACTER_SOURCE).toContain('const IMPACT_DIRECTION_DOT_THRESHOLD = 0.2');
    expect(CHARACTER_SOURCE).toContain("if (dot <= -IMPACT_DIRECTION_DOT_THRESHOLD) return 'front'");
    expect(CHARACTER_SOURCE).toContain("if (dot >= IMPACT_DIRECTION_DOT_THRESHOLD) return 'back'");
    expect(CHARACTER_SOURCE).toContain('hitDirection: resolvedImpactHitDirection');
    expect(CONTROLLER_SOURCE).toContain("const directional = hitDirection === 'back' ? 'Hit_B' : 'Hit_A'");
  });

  it('keeps unknown and departed targets bounded and clears direction lifecycle state', () => {
    expect(CHARACTER_SOURCE).toContain('applyImpactDirections(value: unknown): void');
    expect(CHARACTER_SOURCE).toContain('this.#impactDirections.get(participantId) ?? null');
    expect(CHARACTER_SOURCE).toContain('view.setImpactWorldDirection(directions.get(participantId) ?? null)');
    expect(CHARACTER_SOURCE).toContain('clearImpactDirections(): void');
    expect(CHARACTER_SOURCE).toMatch(/dispose\(\): void \{[\s\S]*this\.#impactWorldDirection = null;[\s\S]*this\.#controller\.dispose\(\)/u);
  });

  it('does not create a new hit semantic, clip, timer or global mixer pause', () => {
    expect(CHARACTER_SOURCE).toContain('impactDirectionCreatesHitState: false');
    expect(CHARACTER_SOURCE).not.toContain('setTimeout(');
    expect(CHARACTER_SOURCE).not.toContain('requestAnimationFrame(');
    expect(CHARACTER_SOURCE).not.toContain('mixer.timeScale');
  });
});
