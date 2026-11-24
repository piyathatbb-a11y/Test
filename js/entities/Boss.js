// ============================================
// UNIT HUNTER — Boss Entity (extends Enemy logic)
// ============================================

import { BossState } from './BossState.js';
import { getBossPhaseConfig } from '../data/bossPhases.js';

/**
 * Boss entity. Cycle scaling is applied here only; pickBoss() only selects a template.
 * @param {object} template Boss template from pickBoss() or a raw BOSSES entry.
 * @param {number} level Current game level, used as a fallback cycle source.
 * @param {string} routeType Route type for the encounter.
 */
export class Boss {
  constructor(template, level, routeType = 'boss', eventBus = null) {
    this.id = template.id;
    const cycle = Math.max(0, Number.isFinite(template.cycle)
      ? template.cycle
      : Math.floor((level / 5) - 1));

    // Boss constructor is the single source of truth for cycle scaling.
    // NOTE: 'cycle >= 5' assumes BOSSES.length === 5. If adding more bosses, update this scaling.
    this.name = `${template.name} ${cycle >= 5 ? `MK-${Math.floor(cycle / 5) + 1}` : ''}`.trim();
    this.color = template.color;
    this.hue = template.hue;
    this.isBoss = true;
    this.routeType = routeType;
    this.rewardMultiplier = 2;
    const baseHp = Number.isFinite(template.baseHp) ? template.baseHp : template.maxHp;
    this.maxHp = Math.floor(baseHp * Math.pow(template.hpScale, cycle));
    this.currentHp = this.maxHp;
    this.baseDamage = Math.floor(template.damage * Math.pow(template.damageScale, cycle));
    this.damage = this.baseDamage;
    this.baseTimer = Math.max(6, template.timer - Math.floor(cycle * 0.5));
    this.timer = this.baseTimer;
    
    const phaseConfig = getBossPhaseConfig(template.phaseConfigId || template.id);
    this.state = new BossState({ bossId: this.id, phases: phaseConfig, eventBus });
    this.phases = this.state.phases;
    this.currentPhase = 0;
    this.turnsElapsed = 0;
    this.enrageTurns = Math.max(5, template.enrageTurns - cycle);
    this.enrageDamageMod = template.enrageDamageMod;
    this.enraged = false;
    
    this.attackWindupActive = false;
    this.attackWindupDuration = 3000; // ms
    this.attackWindupStart = 0;
  }

  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    this.updatePhase();
    return this.currentHp <= 0;
  }

  updatePhase(now = performance.now()) {
    this.state.evaluateHp(this.getHpPercent() * 100);
    const phaseChanged = this.state.update(now);
    this.currentPhase = this.state.currentPhaseIndex;
    const phase = this.state.currentPhase;
    this.timer = Math.max(5, this.baseTimer + phase.timerMod);
    this.damage = Math.floor(this.baseDamage * phase.damageMultiplier
      * (this.enraged ? this.enrageDamageMod : 1));
    return phaseChanged;
  }

  canAttack(now = performance.now()) {
    this.updatePhase(now);
    return this.state.canAttack();
  }

  isTelegraphing() {
    return this.state.isTelegraphing;
  }

  getAttackIntervalSeconds() {
    return this.state.currentPhase.attackIntervalSeconds;
  }

  getSpecialAttack() {
    return this.state.currentPhase.specialAttack;
  }

  incrementTurn() {
    this.turnsElapsed++;
    if (!this.enraged && this.turnsElapsed >= this.enrageTurns) {
      this.enraged = true;
      this.updatePhase();
      return 'enrage';
    }
    return null;
  }

  getRestrictedCategories() {
    return this.phases[this.currentPhase].restrictedCats || [];
  }

  getPhaseName() {
    return this.phases[this.currentPhase].name;
  }

  startAttackWindup() {
    this.attackWindupActive = true;
    this.attackWindupStart = performance.now();
  }

  isAttackWindupComplete() {
    if (!this.attackWindupActive) return false;
    return performance.now() - this.attackWindupStart >= this.attackWindupDuration;
  }

  getWindupProgress() {
    if (!this.attackWindupActive) return 0;
    const elapsed = performance.now() - this.attackWindupStart;
    return Math.min(1, elapsed / this.attackWindupDuration);
  }

  cancelAttack() {
    this.attackWindupActive = false;
  }

  isAlive() {
    return this.currentHp > 0;
  }

  getHpPercent() {
    return this.currentHp / this.maxHp;
  }
}
