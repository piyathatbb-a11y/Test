// ============================================
// UNIT HUNTER — Combat rank calculator
// ============================================

const RANKS = [
  { grade: 'S', minScore: 90 },
  { grade: 'A', minScore: 75 },
  { grade: 'B', minScore: 55 },
  { grade: 'C', minScore: 35 },
  { grade: 'D', minScore: 0 }
];

export class RankCalculator {
  calculate(metrics = {}) {
    const answers = (metrics.answersCorrect || 0)
      + (metrics.answersWrong || 0)
      + (metrics.answersTimedOut || 0);
    const accuracy = answers > 0 ? metrics.answersCorrect / answers : 0;
    const qtes = (metrics.qteSuccesses || 0)
      + (metrics.qteGoods || 0)
      + (metrics.qteMisses || 0);
    const qteQuality = qtes > 0
      ? ((metrics.qteSuccesses || 0) + (metrics.qteGoods || 0) * 0.7) / qtes
      : 0;
    const damagePenalty = Math.min(25, (metrics.damageTaken || 0) * 1.5);
    const score = Math.max(0, Math.min(100,
      accuracy * 55 + qteQuality * 30 - damagePenalty));
    const rank = RANKS.find(entry => score >= entry.minScore) || RANKS.at(-1);

    return {
      grade: rank.grade,
      score: Math.round(score * 10) / 10,
      accuracy: Math.round(accuracy * 1000) / 10,
      qteQuality: Math.round(qteQuality * 1000) / 10,
      damageTaken: metrics.damageTaken || 0
    };
  }
}
