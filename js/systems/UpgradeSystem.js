// ============================================
// UNIT HUNTER — UpgradeSystem
// ============================================

import { UPGRADES, UPGRADE_IDS } from '../data/upgrades.js';

export class UpgradeSystem {
  constructor(eventBus, synergyEngine) {
    this.eventBus = eventBus;
    this.synergyEngine = synergyEngine;
  }

  // Pick the standard three upgrades, with elite nodes receiving one extra option.
  getUpgradeChoices(player, requestedCount = 3) {
    const available = UPGRADE_IDS.filter(id => {
      const level = player.upgrades[id] || 0;
      return level < UPGRADES[id].maxLevel;
    });
    
    // Shuffle and take the requested number.
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, requestedCount);
    
    return picks.map(id => {
      const def = UPGRADES[id];
      const currentLevel = player.upgrades[id] || 0;
      const wouldActivate = this.synergyEngine.wouldActivateSynergy(id, player.upgrades);
      
      return {
        id,
        name: def.name,
        description: def.description,
        level: currentLevel + 1,
        maxLevel: def.maxLevel,
        tags: def.tags,
        hasSynergy: wouldActivate.length > 0,
        synergyNames: wouldActivate.map(s => s.name)
      };
    });
  }

  applyUpgrade(player, upgradeId) {
    const success = player.addUpgrade(upgradeId);
    if (success) {
      this.synergyEngine.recalculate(player.upgrades);
      player.setSynergyBonus(this.synergyEngine.getCombinedBonus());
      // Synergy bonuses can change max HP; preserve the player's current HP percentage.
      player.currentHp = Math.min(player.currentHp, player.getMaxHp());
      this.eventBus.emit('upgrade:select', { upgradeId, level: player.upgrades[upgradeId] });
    }
    return success;
  }
}
