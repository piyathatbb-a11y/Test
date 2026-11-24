import { RULESET, QUESTION_RULESET, TOPICS, QTE } from './Expedition.js';

export const dayKey = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const SAVE = 'unit-hunter-expedition-v1';
const ARCHIVE = 'unit-hunter-expedition-archive-v1';

export class ExpeditionStore {
  constructor(storage) { this.storage = storage; this.error = ''; }
  read(key, fallback) {
    try {
      const raw = this.storage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { this.error = 'อ่านข้อมูลบันทึกไม่ได้ สามารถเริ่มรอบใหม่ได้'; return fallback; }
  }
  write(key, value) {
    try { this.storage.setItem(key, JSON.stringify(value)); this.error = ''; return true; }
    catch { this.error = 'บันทึกไม่ได้ กรุณาตรวจพื้นที่จัดเก็บหรือการตั้งค่าเบราว์เซอร์'; return false; }
  }
  load() { return this.read(SAVE, null); }
  save(game) { return this.write(SAVE, game.snapshot()); }
  archive() {
    const data = this.read(ARCHIVE, {});
    return {
      rows: Array.isArray(data?.rows) ? data.rows.filter(r => r && r.version === RULESET && typeof r.name === 'string' && Object.prototype.hasOwnProperty.call(TOPICS, r.topic) && Number.isFinite(r.elapsed) && r.elapsed >= 0 && Number.isFinite(r.accuracy) && r.accuracy >= 0 && r.accuracy <= 100) : [],
      attempts: Array.isArray(data?.attempts) ? data.attempts.filter(v => typeof v === 'string') : [],
      learning: data?.learning && typeof data.learning === 'object' ? data.learning : {},
      finished: Array.isArray(data?.finished) ? data.finished : []
    };
  }
  attemptKey(topic, date) { return `${RULESET}:${QTE.version}:${date}:${topic}`; }
  attempted(topic, date) { return this.archive().attempts.includes(this.attemptKey(topic, date)); }
  startRanked(topic, date) {
    const data = this.archive();
    const key = this.attemptKey(topic, date);
    if (data.attempts.includes(key)) return false;
    data.attempts.push(key);
    return this.write(ARCHIVE, data);
  }
  record(game, name = '') {
    const s = game.s;
    if (s.phase !== 'ended') return false;
    const data = this.archive();
    const id = `${s.seed}:${s.startedAt}`;
    if (data.finished.includes(id)) return true;
    const topic = data.learning[s.topic] || {};
    data.learning[s.topic] = {
      correct: (Number(topic.correct) || 0) + s.correct,
      total: (Number(topic.total) || 0) + s.total,
      mistakes: [...(Array.isArray(topic.mistakes) ? topic.mistakes : []), ...s.mistakes].slice(-50)
    };
    // A finished run is recorded once, independent of how often its summary renders.
    data.rows.push({
      id, version: RULESET, questionVersion: QUESTION_RULESET, timingVersion: QTE.version, topic: s.topic, dateKey: s.dateKey, ranked: s.ranked,
      won: s.result.won, elapsed: s.result.elapsed,
      accuracy: s.total ? Math.round(s.correct / s.total * 100) : 0,
      name: String(name).trim().slice(0, 16) || 'HUNTER', rooms: s.history.length
    });
    data.rows = data.rows.slice(-200);
    data.finished.push(id);
    return this.write(ARCHIVE, data);
  }
  rename(game, name) {
    const data = this.archive();
    const row = data.rows.find(r => r.id === `${game.s.seed}:${game.s.startedAt}`);
    if (!row) return false;
    row.name = String(name).trim().slice(0, 16) || 'HUNTER';
    return this.write(ARCHIVE, data);
  }
  leaders(topic, ranked, date = '') {
    return this.archive().rows.filter(r => r.won && r.timingVersion === QTE.version && (!ranked || r.questionVersion === QUESTION_RULESET) && r.topic === topic && r.ranked === ranked && (!ranked || r.dateKey === date))
      .sort((a, b) => a.elapsed - b.elapsed || b.accuracy - a.accuracy).slice(0, 10);
  }
}
