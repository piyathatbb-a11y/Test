// ============================================
// UNIT HUNTER — SaveSystem (localStorage meta)
// ============================================

const SAVE_KEY = 'unit_hunter_save';
export const SCHEMA_VERSION = 2;

export class SaveSystem {
  constructor() {
    this.lastLoadStatus = 'empty';
    this.data = this.load();
  }

  load() {
    let raw;

    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (error) {
      this.lastLoadStatus = 'corrupt';
      console.warn('SaveSystem: unable to read save data; defaults used.', error);
      return this.getDefaults();
    }

    if (raw === null || raw === '') {
      this.lastLoadStatus = 'empty';
      return this.getDefaults();
    }

    try {
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new TypeError('Save data must be an object.');
      }

      return this.migrate(parsed);
    } catch (error) {
      this.lastLoadStatus = 'corrupt';
      console.warn('SaveSystem: invalid save data; defaults used.', error);
      return this.getDefaults();
    }
  }

  migrate(data) {
    const from = Number.isInteger(data.version) ? data.version : 1;

    if (from > SCHEMA_VERSION) {
      this.lastLoadStatus = 'corrupt';

      console.warn(
        `SaveSystem: save version ${from} is newer than supported version `
        + `${SCHEMA_VERSION}; defaults used.`
      );

      return this.getDefaults();
    }

    const defaults = this.getDefaults();

    const out = {
      ...defaults,
      ...data,

      localLeaderboard: Array.isArray(data.localLeaderboard)
        ? data.localLeaderboard.filter(entry => (
            entry && typeof entry === 'object' && !Array.isArray(entry)
            && typeof entry.name === 'string'
            && Number.isFinite(entry.score) && entry.score >= 0
            && Number.isInteger(entry.level) && entry.level >= 1
          ))
        : defaults.localLeaderboard,

      dailyChallenges: data.dailyChallenges
        && typeof data.dailyChallenges === 'object'
        && !Array.isArray(data.dailyChallenges)
        ? data.dailyChallenges
        : defaults.dailyChallenges,

      achievements: data.achievements
        && typeof data.achievements === 'object'
        && !Array.isArray(data.achievements)
        ? data.achievements
        : defaults.achievements
    };

    // Guard scalar save fields against invalid or corrupted values.
    const num = (v, d) => (
      Number.isFinite(v) && v >= 0 ? v : d
    );

    out.bestLevel = num(data.bestLevel, defaults.bestLevel);
    out.bestScore = num(data.bestScore, defaults.bestScore);
    out.bestCombo = num(data.bestCombo, defaults.bestCombo);
    out.totalCorrect = num(data.totalCorrect, defaults.totalCorrect);
    out.totalRuns = num(data.totalRuns, defaults.totalRuns);
    out.xp = num(data.xp, defaults.xp);

    out.rank = typeof data.rank === 'string'
      ? data.rank
      : defaults.rank;

    out.tutorialSeen = typeof data.tutorialSeen === 'boolean'
      ? data.tutorialSeen
      : defaults.tutorialSeen;

    out.version = SCHEMA_VERSION;

    this.lastLoadStatus = from < SCHEMA_VERSION
      ? 'migrated'
      : 'ok';

    return out;
  }

  getDefaults() {
    return {
      version: SCHEMA_VERSION,
      bestLevel: 0,
      bestScore: 0,
      bestCombo: 0,
      totalCorrect: 0,
      totalRuns: 0,
      localLeaderboard: [],
      dailyChallenges: {},
      tutorialSeen: false,
      xp: 0,
      rank: 'D',
      achievements: {}
    };
  }

  save() {
    try {
      this.data.version = SCHEMA_VERSION;
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.warn('SaveSystem failed:', error);
    }
  }

  updateRunStats(run) {
    this.data.totalRuns++;
    this.data.totalCorrect += run.correctAnswers;

    if (run.level > this.data.bestLevel) {
      this.data.bestLevel = run.level;
    }

    if (run.score > this.data.bestScore) {
      this.data.bestScore = run.score;
    }

    if (run.maxCombo > this.data.bestCombo) {
      this.data.bestCombo = run.maxCombo;
    }

    this.save();
  }

  getStats() {
    return { ...this.data };
  }

  hasSeenTutorial() {
    return this.data.tutorialSeen === true;
  }

  markTutorialSeen() {
    this.data.tutorialSeen = true;
    this.save();
  }

  getDailyStatus(dateKey) {
    const entry = this.data.dailyChallenges?.[dateKey];

    return entry
      ? { ...entry }
      : {
          dateKey,
          rankedSubmitted: false,
          attempts: 0,
          bestScore: 0,
          bestLevel: 0
        };
  }

  recordDailyAttempt(dateKey, result) {
    if (!dateKey) return false;

    if (
      !this.data.dailyChallenges
      || typeof this.data.dailyChallenges !== 'object'
    ) {
      this.data.dailyChallenges = {};
    }

    const current = this.getDailyStatus(dateKey);

    if (current.rankedSubmitted) {
      return false;
    }

    this.data.dailyChallenges[dateKey] = {
      ...current,
      rankedSubmitted: true,
      attempts: (current.attempts || 0) + 1,
      bestScore: Math.max(
        current.bestScore || 0,
        result.score || 0
      ),
      bestLevel: Math.max(
        current.bestLevel || 0,
        result.level || 0
      ),
      correctAnswers: result.correctAnswers || 0
    };

    this.save();
    return true;
  }

  // Local leaderboard
  addLocalEntry(name, score, level) {
    this.data.localLeaderboard.push({
      name,
      score,
      level,
      date: Date.now()
    });

    this.data.localLeaderboard.sort((a, b) => b.score - a.score);

    this.data.localLeaderboard =
      this.data.localLeaderboard.slice(0, 50);

    this.save();
  }

  getLocalLeaderboard(topN = 10) {
    return this.data.localLeaderboard.slice(0, topN);
  }

  getProgression() {
    const xp = Number(this.data.xp || 0);

    const ranks = [
      ['D', 0],
      ['C', 500],
      ['B', 1500],
      ['A', 3500],
      ['S', 7000]
    ];

    let index = 0;

    for (let i = 0; i < ranks.length; i++) {
      if (xp >= ranks[i][1]) {
        index = i;
      }
    }

    const current = ranks[index];
    const next = ranks[index + 1];

    return {
      xp,
      rank: current[0],
      nextRank: next ? next[0] : 'MAX',

      progress: next
        ? Math.min(
            100,
            ((xp - current[1]) / (next[1] - current[1])) * 100
          )
        : 100
    };
  }

  addProgression(run) {
    const earned = Math.max(
      25,
      Math.floor(
        (run.correctAnswers || 0) * 12
        + (run.level || 0) * 8
        + (run.maxCombo || 0) * 5
      )
    );

    this.data.xp =
      Number(this.data.xp || 0) + earned;

    this.data.achievements =
      this.data.achievements || {};

    if ((this.data.totalRuns || 0) >= 1) {
      this.data.achievements.firstRun = true;
    }

    if ((run.maxCombo || 0) >= 10) {
      this.data.achievements.combo10 = true;
    }

    if ((run.maxCombo || 0) >= 25) {
      this.data.achievements.combo25 = true;
    }

    if ((run.level || 0) >= 10) {
      this.data.achievements.level10 = true;
    }

    if (run.mode === 'daily' && run.outcome === 'victory') {
      this.data.achievements.bossHunter = true;
    }

    const progress = this.getProgression();

    this.data.rank = progress.rank;

    this.save();

    return {
      earned,
      ...progress
    };
  }
}
