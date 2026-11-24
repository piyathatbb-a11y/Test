// ============================================
// UNIT HUNTER — Boss Definitions
// ============================================

import { CONVERSION_CATEGORIES } from './conversions.js';

export const BOSSES = [
  {
    id: 'quantum_sentry',
    name: 'Quantum Sentry',
    baseHp: 100,
    hpScale: 1.3,
    damage: 15,
    damageScale: 1.15,
    timer: 12,
    color: '#00e5c4',
    hue: 168,
    phases: [
      { hpPct: 100, name: 'Phase 1', restrictedCats: [], timerMod: 0, damageMod: 1 },
      { hpPct: 65,  name: 'Phase 2', restrictedCats: ['length'], timerMod: -2, damageMod: 1.2 },
      { hpPct: 30,  name: 'Phase 3', restrictedCats: ['length', 'mass'], timerMod: -4, damageMod: 1.5 }
    ],
    enrageTurns: 8,
    enrageDamageMod: 1.8,
    description: 'A guardian of dimensional constants. Restricts spatial units at low health.'
  },
  {
    id: 'entropy_lord',
    name: 'Lord of Entropy',
    baseHp: 120,
    hpScale: 1.35,
    damage: 18,
    damageScale: 1.18,
    timer: 14,
    color: '#ff6b35',
    hue: 16,
    phases: [
      { hpPct: 100, name: 'Phase 1', restrictedCats: [], timerMod: 0, damageMod: 1 },
      { hpPct: 65,  name: 'Phase 2', restrictedCats: ['time'], timerMod: -3, damageMod: 1.3 },
      { hpPct: 30,  name: 'Phase 3', restrictedCats: ['time', 'temperature'], timerMod: -5, damageMod: 1.6 }
    ],
    enrageTurns: 10,
    enrageDamageMod: 2.0,
    description: 'Feeds on temporal chaos. Bans time conversions and accelerates the clock.'
  },
  {
    id: 'void_architect',
    name: 'Void Architect',
    baseHp: 150,
    hpScale: 1.4,
    damage: 20,
    damageScale: 1.2,
    timer: 15,
    color: '#7c4dff',
    hue: 260,
    phases: [
      { hpPct: 100, name: 'Phase 1', restrictedCats: [], timerMod: 0, damageMod: 1 },
      { hpPct: 65,  name: 'Phase 2', restrictedCats: ['amount'], timerMod: -2, damageMod: 1.25 },
      { hpPct: 30,  name: 'Phase 3', restrictedCats: ['amount', 'luminous'], timerMod: -4, damageMod: 1.7 }
    ],
    enrageTurns: 12,
    enrageDamageMod: 2.2,
    description: 'Shapes emptiness into form. Locks substance and luminous units at critical health.'
  },
  {
    id: 'protocol_colossus',
    name: 'Protocol Colossus',
    baseHp: 180,
    hpScale: 1.45,
    damage: 22,
    damageScale: 1.2,
    timer: 16,
    color: '#3c91ff',
    hue: 214,
    phases: [
      { hpPct: 100, name: 'Phase 1', restrictedCats: [], timerMod: 0, damageMod: 1 },
      { hpPct: 65, name: 'Phase 2', restrictedCats: ['mass'], timerMod: -2, damageMod: 1.3 },
      { hpPct: 30, name: 'Phase 3', restrictedCats: ['mass', 'current'], timerMod: -4, damageMod: 1.8 }
    ],
    enrageTurns: 14,
    enrageDamageMod: 2.3,
    description: 'A hardened protocol giant that locks mass and current under pressure.'
  },
  {
    id: 'singularity_core',
    name: 'Singularity Core',
    baseHp: 200,
    hpScale: 1.5,
    damage: 24,
    damageScale: 1.22,
    timer: 17,
    color: '#ff3864',
    hue: 348,
    phases: [
      { hpPct: 100, name: 'Phase 1', restrictedCats: [], timerMod: 0, damageMod: 1 },
      { hpPct: 65, name: 'Phase 2', restrictedCats: ['temperature'], timerMod: -3, damageMod: 1.35 },
      { hpPct: 30, name: 'Phase 3', restrictedCats: ['temperature', 'luminous'], timerMod: -5, damageMod: 2.0 }
    ],
    enrageTurns: 15,
    enrageDamageMod: 2.5,
    description: 'A collapsing answer engine that bends thermal and luminous conversions.'
  }
];

// Pick a boss; intentionally does not scale — scaling lives in the Boss constructor.
export function pickBoss(level, forcedIndex = null) {
  const cycle = Math.max(0, Math.floor((level / 5) - 1));
  const index = Number.isInteger(forcedIndex) ? Math.abs(forcedIndex) % BOSSES.length : cycle % BOSSES.length;
  const bossTemplate = BOSSES[index];
  
  // Boss constructor is the single source of truth for cycle scaling.
  return {
    ...bossTemplate,
    cycle,
    isBoss: true
  };
}

// Validate boss restrictions against the conversion data at startup.
export function validateBossRestrictions() {
  const knownCategories = new Set(Object.keys(CONVERSION_CATEGORIES));
  const warnings = [];

  for (const boss of BOSSES) {
    for (const phase of boss.phases) {
      for (const categoryId of phase.restrictedCats || []) {
        if (!knownCategories.has(categoryId)) {
          warnings.push(`${boss.id} ${phase.name}: unknown category "${categoryId}"`);
        }
      }
    }
  }

  for (const warning of warnings) {
    console.warn(`Boss restriction validation: ${warning}`);
  }

  return warnings;
}
