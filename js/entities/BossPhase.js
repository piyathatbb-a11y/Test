// ============================================
// UNIT HUNTER — Boss Phase value object
// ============================================

export class BossPhase {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.hpPct = config.hpPct;
    this.damageMultiplier = config.damageMultiplier ?? config.damageMod ?? 1;
    this.timerMod = config.timerMod ?? 0;
    this.attackIntervalSeconds = config.attackIntervalSeconds ?? null;
    this.attackPattern = config.attackPattern ?? 'standard';
    this.telegraphDurationMs = config.telegraphDurationMs ?? 900;
    this.restrictedCats = [...(config.restrictedCats || [])];
    this.specialAttack = config.specialAttack ? { ...config.specialAttack } : null;
  }
}
