// ============================================
// UNIT HUNTER — SynergyEngine
// ============================================

import { SYNERGY_RULES } from '../data/upgrades.js';

export class SynergyEngine {
  constructor() {
    this.activeSynergies = new Map();
  }

  // Check which synergies are active given the player's current upgrades
  recalculate(upgrades) {
    this.activeSynergies.clear();
    
    for (const rule of SYNERGY_RULES) {
      if (this.meetsRequirements(rule.requires, upgrades)) {
        const bonus = rule.getBonus(upgrades);
        this.activeSynergies.set(rule.id, { ...rule, bonus });
      }
    }
    
    return this.getActiveSynergies();
  }

  meetsRequirements(requires, upgrades) {
    // requires is array of arrays: each inner array is a set of alternative tags/ids
    for (const reqGroup of requires) {
      let groupMet = false;
      for (const req of reqGroup) {
        if (upgrades[req] > 0) {
          groupMet = true;
          break;
        }
      }
      if (!groupMet) return false;
    }
    return true;
  }

  getActiveSynergies() {
    return Array.from(this.activeSynergies.values());
  }

  getBonus(id) {
    const syn = this.activeSynergies.get(id);
    return syn ? syn.bonus : {};
  }

  getCombinedBonus() {
    const combined = {};
    for (const { bonus } of this.activeSynergies.values()) {
      for (const [key, value] of Object.entries(bonus || {})) {
        if (typeof value !== 'number') {
          if (value) combined[key] = value;
          continue;
        }
        combined[key] = (combined[key] || 0) + value;
      }
    }
    return combined;
  }

  // Check if selecting a new upgrade would activate any new synergy
  wouldActivateSynergy(upgradeId, currentUpgrades) {
    const hypothetical = { ...currentUpgrades };
    hypothetical[upgradeId] = (hypothetical[upgradeId] || 0) + 1;
    
    const newSynergies = [];
    for (const rule of SYNERGY_RULES) {
      // Skip already active
      if (this.activeSynergies.has(rule.id)) continue;
      if (this.meetsRequirements(rule.requires, hypothetical)) {
        newSynergies.push(rule);
      }
    }
    return newSynergies;
  }
}
