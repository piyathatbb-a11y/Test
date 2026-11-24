// ============================================
// UNIT HUNTER — Enemy Entity
// ============================================

import { getEnemyBehavior } from '../data/enemyBehaviors.js';

export class Enemy {
  constructor(template, level, routeType = 'standard') {
    this.id = template.id;
    this.name = template.name;
    this.color = template.color;
    this.hue = template.hue;
    this.isBoss = false;
    this.routeType = routeType;
    this.rewardMultiplier = routeType === 'elite' ? 1.5 : 1;
    this.behaviorId = template.behaviorId || 'standard';
    Object.assign(this, getEnemyBehavior(this.behaviorId));
    
    // Scale stats by level
    const scaleFactor = Math.pow(template.hpScale || 1.1, level - 1);
    const dmgScaleFactor = Math.pow(template.damageScale || 1.08, level - 1);
    
    const hpMultiplier = routeType === 'elite' ? 1.45 : 1;
    const damageMultiplier = routeType === 'elite' ? 1.25 : 1;
    this.maxHp = Math.floor(template.baseHp * scaleFactor * hpMultiplier);
    this.currentHp = this.maxHp;
    this.damage = Math.floor(template.damage * dmgScaleFactor * damageMultiplier);
    this.timer = template.timer;
  }

  takeDamage(amount) {
    this.currentHp = Math.max(0, this.currentHp - amount);
    return this.currentHp <= 0;
  }

  isAlive() {
    return this.currentHp > 0;
  }

  getHpPercent() {
    return this.currentHp / this.maxHp;
  }
}
