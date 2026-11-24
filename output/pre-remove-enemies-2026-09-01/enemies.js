// ============================================
// UNIT HUNTER — Enemy Definitions
// ============================================

export const ENEMIES = [
  {
    id: 'glitch',
    name: 'Data Glitch',
    baseHp: 30,
    hpScale: 1.15,
    damage: 8,
    damageScale: 1.08,
    timer: 12,
    color: '#00e5c4',
    hue: 168
  },
  {
    id: 'fragment',
    name: 'Code Fragment',
    baseHp: 25,
    hpScale: 1.12,
    damage: 10,
    damageScale: 1.1,
    timer: 10,
    color: '#ff6b35',
    hue: 16
  },
  {
    id: 'corruptor',
    name: 'Bit Corruptor',
    baseHp: 40,
    hpScale: 1.18,
    damage: 12,
    damageScale: 1.12,
    timer: 14,
    color: '#7c4dff',
    hue: 260
  },
  {
    id: 'nullptr',
    name: 'Null Pointer',
    baseHp: 35,
    hpScale: 1.14,
    damage: 9,
    damageScale: 1.09,
    timer: 11,
    color: '#ff3355',
    hue: 350
  },
  {
    id: 'byte_drone',
    name: 'Byte Drone',
    baseHp: 28,
    hpScale: 1.13,
    damage: 9,
    damageScale: 1.08,
    timer: 13,
    color: '#3accff',
    hue: 190
  },
  {
    id: 'overflow',
    name: 'Stack Overflow',
    baseHp: 50,
    hpScale: 1.2,
    damage: 14,
    damageScale: 1.15,
    timer: 15,
    color: '#ffaa00',
    hue: 40
  },
  {
    id: 'signal_wraith',
    name: 'Signal Wraith',
    baseHp: 45,
    hpScale: 1.17,
    damage: 11,
    damageScale: 1.11,
    timer: 13,
    color: '#7ce7da',
    hue: 169
  },
  {
    id: 'packet_mimic',
    name: 'Packet Mimic',
    baseHp: 34,
    hpScale: 1.14,
    damage: 10,
    damageScale: 1.1,
    timer: 12,
    color: '#3c91ff',
    hue: 214
  },
  {
    id: 'checksum_beast',
    name: 'Checksum Beast',
    baseHp: 55,
    hpScale: 1.21,
    damage: 15,
    damageScale: 1.15,
    timer: 16,
    color: '#e96bff',
    hue: 292
  },
  {
    id: 'firewall_hound',
    name: 'Firewall Hound',
    baseHp: 42,
    hpScale: 1.16,
    damage: 13,
    damageScale: 1.12,
    timer: 12,
    color: '#ff7043',
    hue: 14
  }
];

// Pick a random enemy based on level (higher level = stronger enemies weighted)
export function pickEnemy(level) {
  const weighted = ENEMIES.map((e, i) => {
    const weight = 1 + (i * level * 0.05);
    return { enemy: e, weight };
  });
  const total = weighted.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weighted) {
    r -= w.weight;
    if (r <= 0) return w.enemy;
  }
  return ENEMIES[0];
}
