import {
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY,
} from './arena-v2-weapon-blood-shadow-hook-blade-case-study.js';
import {
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY,
} from './arena-v2-weapon-magic-blood-scythe-case-study.js';
import {
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY,
} from './arena-v2-weapon-mammoth-stone-axe-case-study.js';
import {
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY,
} from './arena-v2-weapon-phantom-tiger-fist-case-study.js';
import {
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY,
} from './arena-v2-weapon-true-hades-hook-scythe-case-study.js';
import {
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY,
} from './arena-v2-weapon-white-platinum-dual-guns-case-study.js';
import {
  auditArenaV2WeaponValueChain,
  type ArenaV2WeaponCaseStudy,
  type ArenaV2WeaponValueChainAudit,
} from './arena-v2-weapon-case-study-contract.js';

export interface ArenaV2WeaponValueChainAuditReport {
  readonly caseCount: number;
  readonly passedCount: number;
  readonly blockedCount: number;
  readonly allCasesPass: boolean;
  readonly cases: readonly ArenaV2WeaponValueChainAudit[];
}

const CASE_STUDIES: readonly ArenaV2WeaponCaseStudy[] = Object.freeze([
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY,
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY,
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY,
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY,
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY,
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY,
]);

export function createArenaV2WeaponValueChainAuditReport(): ArenaV2WeaponValueChainAuditReport {
  const cases = Object.freeze(CASE_STUDIES.map(auditArenaV2WeaponValueChain));
  const passedCount = cases.filter(({ allGatesPassed }) => allGatesPassed).length;
  return Object.freeze({
    caseCount: cases.length,
    passedCount,
    blockedCount: cases.length - passedCount,
    allCasesPass: passedCount === cases.length,
    cases,
  });
}
