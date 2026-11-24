// ============================================
// UNIT HUNTER — Player Entity
// ============================================

import { UPGRADES } from '../data/upgrades.js';

export class Player {
  constructor() {
    this.baseMaxHp = 100;
    this.currentHp = 100;
    this.upgrades = {}; // { upgradeId: level }
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.correctAnswers = 0;
    this.bankTime = 0; // banked bonus time from Timer Bonus upgrade
    this.timeoutGraceUsed = 0; // how many timeout graces used this fight
    this.synergyBonus = {};
  }

  setSynergyBonus(bonus = {}) {
    this.synergyBonus = { ...bonus };
  }

  getMaxHp(synergyBonus = this.synergyBonus) {
    const hpBonus = this.getUpgradeEffect('hp').maxHpBonus || 0;
    return this.baseMaxHp + hpBonus + (synergyBonus.maxHpBonus || 0);
  }

  getBaseDamage() {
    return 10 + (this.getUpgradeEffect('damage').baseDamage || 0);
  }

  getCritChance() {
    return this.getUpgradeEffect('crit').critChance || 0;
  }

  getCritMultiplier(synergyBonus = 0) {
    return 1.5 + synergyBonus;
  }

  getDamageReduction(synergyBonus = this.synergyBonus, isTimeout = false) {
    const defReduction = this.getUpgradeEffect('def').damageReduction || 0;
    const synergyReduction = synergyBonus.damageReductionBonus || 0;
    const timeoutReduction = isTimeout ? (synergyBonus.timeoutExtraReduction || 0) : 0;
    return Math.min(0.8, defReduction + synergyReduction + timeoutReduction);
  }

  getComboMultiplier() {
    const base = 1 + (this.combo * 0.1);
    const bonus = (this.getUpgradeEffect('combo').comboMultiplierBonus || 0);
    return base + (this.combo > 0 ? bonus : 0);
  }

  getComboCap() {
    return 10 + (this.getUpgradeEffect('combo').comboCapBonus || 0);
  }

  getLifestealPercent() {
    return this.getUpgradeEffect('lifesteal').lifestealPercent || 0;
  }

  getTimerBonus() {
    const timer = this.getUpgradeEffect('timerBonus');
    return {
      perCorrect: timer.timerBonusPerCorrect || 0,
      gracePerFight: (timer.timeoutGracePerFight || 0) + (this.synergyBonus.comboGraceUsesBonus || 0)
    };
  }

  getStunChance() {
    return this.getUpgradeEffect('shieldBash').stunChance || 0;
  }

  getTimeWarpChance() {
    return this.getUpgradeEffect('timeWarp').timeWarpChance || 0;
  }

  getUpgradeEffect(id) {
    const level = this.upgrades[id] || 0;
    if (level === 0) return {};
    const def = UPGRADES[id];
    return def ? def.getEffect(level) : {};
  }

  hasUpgrade(id) {
    return (this.upgrades[id] || 0) > 0;
  }

  addUpgrade(id) {
    const def = UPGRADES[id];
    if (!def) return false;
    const current = this.upgrades[id] || 0;
    if (current >= def.maxLevel) return false;
    this.upgrades[id] = current + 1;
    if (id === 'hp') {
      // Heal to full on HP upgrade
      this.currentHp = this.getMaxHp();
    }
    return true;
  }

  takeDamage(amount, isTimeout = false, preserveCombo = false) {
    // Timeout-specific synergy reduction is already included by getDamageReduction().
    // Do not add it a second time here.
    const reduction = this.getDamageReduction(this.synergyBonus, isTimeout);
    const actual = Math.max(1, Math.floor(amount * (1 - reduction)));
    this.currentHp = Math.max(0, this.currentHp - actual);
    if (!preserveCombo) this.combo = 0;
    return actual;
  }

  heal(amount) {
    const max = this.getMaxHp();
    const actual = Math.min(amount, max - this.currentHp);
    this.currentHp += actual;
    return actual;
  }

  healPercentOfMax(pct) {
    return this.heal(Math.floor(this.getMaxHp() * pct));
  }

  addScore(baseAmount) {
    const multiplier = this.getComboMultiplier();
    const gained = Math.floor(baseAmount * multiplier);
    this.score += gained;
    return gained;
  }

  incrementCombo() {
    const cap = this.getComboCap();
    this.combo = Math.min(this.combo + 1, cap);
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
  }

  resetCombo() {
    this.combo = 0;
  }

  isAlive() {
    return this.currentHp > 0;
  }

  getHpPercent() {
    return this.currentHp / this.getMaxHp();
  }

  resetForNewRun() {
    this.currentHp = this.getMaxHp();
    this.combo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.correctAnswers = 0;
    this.bankTime = 0;
    this.timeoutGraceUsed = 0;
  }

  resetUpgrades() {
    this.upgrades = {};
    this.currentHp = this.baseMaxHp;
  }
}
