// ============================================
// UNIT HUNTER — RunManager
// ============================================

import { Enemy } from '../entities/Enemy.js';
import { Boss } from '../entities/Boss.js';
import { ENEMIES, pickEnemy } from '../data/enemies.js';
import { pickBoss } from '../data/bosses.js';

export class RunManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.level = 0;
    this.currentEnemy = null;
    this.mode = 'run';
    this.modeOptions = {};
    this.route = { selected: 'standard', history: [] };
  }

  startRun(mode = 'run', options = {}) {
    this.level = 1;
    this.currentEnemy = null;
    this.mode = mode;
    this.modeOptions = { ...options };
    this.route = { selected: mode === 'daily' ? 'daily-boss' : 'standard', history: [] };
  }

  advanceLevel() {
    this.level++;
  }

  getRouteChoices() {
    if (this.mode === 'daily' || this.mode === 'training') return [];
    const nextLevel = this.level + 1;
    if (nextLevel % 5 === 0) {
      return [{
        id: 'boss',
        type: 'boss',
        label: 'BOSS GATE',
        title: 'Mandatory boss encounter',
        description: 'A fixed boss node. Prepare your build before entering.',
        locked: true
      }];
    }

    return [
      {
        id: 'standard',
        type: 'standard',
        label: 'STANDARD FIGHT',
        title: 'Baseline target',
        description: 'Normal enemy strength and standard upgrade flow.'
      },
      {
        id: 'elite',
        type: 'elite',
        label: 'ELITE FIGHT',
        title: 'High-value target',
        description: '+45% HP, +25% damage, and 50% more score.'
      },
      {
        id: 'repair',
        type: 'repair',
        label: 'REPAIR / INTEL',
        title: 'Stabilize the rig',
        description: 'Restore 25% HP and reveal the next target before combat.'
      },
      {
        id: 'heal_event',
        type: 'event-heal',
        label: 'SIGNAL / REPAIR',
        title: 'Emergency recovery signal',
        description: 'Restore 15% max HP before the next engagement.'
      },
      {
        id: 'treasure_event',
        type: 'event-treasure',
        label: 'CACHE / REWARD',
        title: 'Encrypted supply cache',
        description: 'Gain bonus score, but reveal no additional intel.'
      }
    ];
  }

  chooseRoute(nodeId) {
    const choice = this.getRouteChoices().find(node => node.id === nodeId);
    if (!choice) return null;
    this.route.selected = choice.type;
    this.route.history.push({ level: this.level + 1, ...choice });
    this.advanceLevel();
    return choice;
  }

  getRouteState() {
    return {
      mode: this.mode,
      currentLevel: this.level,
      nextLevel: this.level + 1,
      selected: this.route.selected,
      history: [...this.route.history],
      choices: this.getRouteChoices()
    };
  }

  getMode() {
    return this.mode;
  }

  getModeOptions() {
    return { ...this.modeOptions };
  }

  spawnEnemy() {
    const isDaily = this.mode === 'daily';
    const isBossLevel = isDaily || this.level % 5 === 0;
    
    if (isBossLevel) {
      const bossIndex = isDaily ? this.modeOptions.bossIndex : null;
      this.currentEnemy = new Boss(
        pickBoss(isDaily ? 5 : this.level, bossIndex),
        isDaily ? 5 : this.level,
        isDaily ? 'daily-boss' : 'boss',
        this.eventBus
      );
      this.eventBus.emit('enemy:spawn', { enemy: this.currentEnemy, level: this.level, isBoss: true });
    } else {
      const launchId = this.level === 1 && !this.currentEnemy ? this.modeOptions.initialEnemyId : null;
      const template = ENEMIES.find(enemy => enemy.id === launchId) || pickEnemy(this.level);
      if (launchId) this.modeOptions.initialEnemyId = null;
      const routeType = this.route.selected === 'repair' ? 'standard' : this.route.selected;
      this.currentEnemy = new Enemy(template, this.level, routeType);
      this.eventBus.emit('enemy:spawn', { enemy: this.currentEnemy, level: this.level, isBoss: false });
    }
    
    return this.currentEnemy;
  }

  getLevel() {
    return this.level;
  }

  getEnemy() {
    return this.currentEnemy;
  }

  isBossLevel() {
    return this.mode === 'daily' || this.level % 5 === 0;
  }
}
