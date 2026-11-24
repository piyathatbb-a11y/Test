// ============================================
// UNIT HUNTER — Upgrade Definitions
// ============================================

export const UPGRADES = {
  damage: {
    id: 'damage',
    name: 'Damage Boost',
    description: '+1 base damage per level',
    maxLevel: 10,
    tags: ['damage'],
    getEffect: (level) => ({ baseDamage: level })
  },
  crit: {
    id: 'crit',
    name: 'Critical Strike',
    description: '+6% crit chance per level. Crits deal 1.5x base damage.',
    maxLevel: 10,
    tags: ['crit'],
    getEffect: (level) => ({ critChance: level * 0.06 })
  },
  combo: {
    id: 'combo',
    name: 'Combo Master',
    description: 'Increases score multiplier per combo stack and raises max combo cap.',
    maxLevel: 8,
    tags: ['score'],
    getEffect: (level) => ({ comboMultiplierBonus: level * 0.2, comboCapBonus: level * 3 })
  },
  lifesteal: {
    id: 'lifesteal',
    name: 'Life Drain',
    description: 'Heal 10% of max HP on enemy kill, per level.',
    maxLevel: 5,
    tags: ['sustain'],
    getEffect: (level) => ({ lifestealPercent: level * 0.10 })
  },
  timerBonus: {
    id: 'timerBonus',
    name: 'Time Dilation',
    description: '+1s answer time banked per correct answer per level. First timeout per fight does not break combo.',
    maxLevel: 5,
    tags: ['timer'],
    getEffect: (level) => ({ timerBonusPerCorrect: level, timeoutGracePerFight: level >= 1 ? 1 : 0 })
  },
  hp: {
    id: 'hp',
    name: 'Vitality',
    description: '+15 max HP per level.',
    maxLevel: 10,
    tags: ['sustain'],
    getEffect: (level) => ({ maxHpBonus: level * 15 })
  },
  def: {
    id: 'def',
    name: 'Armor Plating',
    description: '-8% damage taken from wrong answers/timeouts per level.',
    maxLevel: 8,
    tags: ['defense'],
    getEffect: (level) => ({ damageReduction: level * 0.08 })
  },
  // === Custom Upgrade 1: Shield Bash ===
  shieldBash: {
    id: 'shieldBash',
    name: 'Shield Bash',
    description: '15% chance per level to stun the enemy for 1 question (extra time, no counter-attack).',
    maxLevel: 5,
    tags: ['defense', 'timer'],
    getEffect: (level) => ({ stunChance: level * 0.15 })
  },
  // === Custom Upgrade 2: Time Warp ===
  timeWarp: {
    id: 'timeWarp',
    name: 'Time Warp',
    description: 'On correct answer, 10% chance per level to bank 35% of the enemy timer for your next question.',
    maxLevel: 5,
    tags: ['timer', 'score'],
    getEffect: (level) => ({ timeWarpChance: level * 0.10 })
  }
};

// All upgrade IDs as array
export const UPGRADE_IDS = Object.keys(UPGRADES);

// Synergy rules
export const SYNERGY_RULES = [
  {
    id: 'crit_damage',
    name: 'Devastating Blows',
    description: 'Crit multiplier increases with Damage level.',
    requires: [['crit'], ['damage']],
    getBonus: (upgrades) => {
      const dmgLevel = upgrades.damage || 0;
      return { critMultiplierBonus: dmgLevel * 0.1 };
    }
  },
  {
    id: 'lifesteal_hp',
    name: 'Eternal Hunger',
    description: 'Lifesteal heals % of max HP — more HP means bigger heals.',
    requires: [['lifesteal'], ['hp']],
    getBonus: () => ({}) // Emergent — handled in damage calculation
  },
  {
    id: 'def_timer',
    name: 'Iron Patience',
    description: 'Timeouts deal less damage AND grant a combo grace period.',
    requires: [['def'], ['timerBonus']],
    getBonus: (upgrades) => {
      const defLevel = upgrades.def || 0;
      return { timeoutGraceEnabled: true, timeoutExtraReduction: defLevel * 0.03 };
    }
  },
  {
    id: 'combo_timer',
    name: 'Flow State',
    description: 'Combo grace period before resetting is extended.',
    requires: [['combo'], ['timerBonus']],
    getBonus: (upgrades) => {
      const comboLevel = upgrades.combo || 0;
      return { comboGraceUsesBonus: Math.floor(comboLevel / 2) };
    }
  },
  {
    id: 'def_hp',
    name: 'Fortress',
    description: 'Tanky survivability — +10 max HP and +5% damage reduction while active.',
    requires: [['def'], ['hp']],
    getBonus: () => ({ maxHpBonus: 10, damageReductionBonus: 0.05 })
  }
];
