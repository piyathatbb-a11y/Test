// ============================================
// UNIT HUNTER — In-memory run state
// ============================================

export class RunState {
  constructor() {
    this.reset();
  }

  reset({ maxHp = 100 } = {}) {
    this.hp = maxHp;
    this.maxHp = maxHp;
    this.buffs = [];
    this.missionIndex = 0;
    this.rankHistory = [];
    this.eventHistory = [];
    this.active = true;
  }

  setHp(hp) {
    this.hp = Math.max(0, Math.min(this.maxHp, hp));
    return this.hp;
  }

  setMaxHp(maxHp, preserveRatio = true) {
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = Math.max(1, maxHp);
    this.hp = preserveRatio ? this.maxHp * ratio : Math.min(this.hp, this.maxHp);
    return this.maxHp;
  }

  addBuff(buff) {
    if (!buff?.id) return false;
    this.buffs.push({ ...buff });
    return true;
  }

  recordRank(rank) {
    if (!rank) return false;
    this.rankHistory.push({ ...rank });
    return true;
  }

  recordEvent(event) {
    if (!event?.type) return false;
    this.eventHistory.push({ ...event });
    return true;
  }

  advanceMission() {
    this.missionIndex += 1;
    return this.missionIndex;
  }

  endRun() {
    this.active = false;
  }

  isAlive() {
    return this.active && this.hp > 0;
  }

  snapshot() {
    return Object.freeze({
      hp: this.hp,
      maxHp: this.maxHp,
      buffs: this.buffs.map(buff => ({ ...buff })),
      missionIndex: this.missionIndex,
      rankHistory: this.rankHistory.map(rank => ({ ...rank })),
      eventHistory: this.eventHistory.map(event => ({ ...event })),
      active: this.active
    });
  }
}
