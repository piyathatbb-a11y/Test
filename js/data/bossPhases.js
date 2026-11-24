// ============================================
// UNIT HUNTER — Data-driven boss phase configs
// ============================================

const STANDARD_PHASES = [
  {
    id: 'phase_1',
    name: 'Phase 1',
    hpPct: 100,
    damageMultiplier: 1,
    timerMod: 0,
    attackIntervalSeconds: 12,
    attackPattern: 'standard',
    telegraphDurationMs: 0,
    restrictedCats: []
  },
  {
    id: 'phase_2',
    name: 'Phase 2',
    hpPct: 65,
    damageMultiplier: 1.2,
    timerMod: -2,
    attackIntervalSeconds: 10,
    attackPattern: 'standard_fast',
    telegraphDurationMs: 900,
    restrictedCats: []
  },
  {
    id: 'phase_3',
    name: 'Phase 3',
    hpPct: 30,
    damageMultiplier: 1.5,
    timerMod: -4,
    attackIntervalSeconds: 8,
    attackPattern: 'special_qte',
    telegraphDurationMs: 1200,
    restrictedCats: [],
    specialAttack: {
      id: 'boss_qte',
      type: 'qte',
      durationMs: 1400,
      successDamageMultiplier: 0.5,
      failDamageMultiplier: 1.5,
      cooldownTurns: 3
    }
  }
];

const withRestrictions = (restrictions) => STANDARD_PHASES.map((phase, index) => ({
  ...phase,
  restrictedCats: restrictions[index] || []
}));

export const BOSS_PHASE_CONFIGS = Object.freeze({
  quantum_sentry: withRestrictions([[], ['length'], ['length', 'mass']]),
  entropy_lord: withRestrictions([[], ['time'], ['time', 'temperature']]),
  void_architect: withRestrictions([[], ['amount'], ['amount', 'luminous']]),
  protocol_colossus: withRestrictions([[], ['mass'], ['mass', 'current']]),
  singularity_core: withRestrictions([[], ['temperature'], ['temperature', 'luminous']])
});

export function getBossPhaseConfig(bossId) {
  const config = BOSS_PHASE_CONFIGS[bossId];
  if (!config) throw new Error(`Unknown boss phase config: ${bossId}`);
  return config.map(phase => ({
    ...phase,
    restrictedCats: [...phase.restrictedCats],
    specialAttack: phase.specialAttack ? { ...phase.specialAttack } : null
  }));
}
