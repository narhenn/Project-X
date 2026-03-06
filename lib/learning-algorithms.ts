/**
 * Client-side learning science algorithms.
 * Pure functions — no API calls. Everything computed from quiz history + study sessions already in memory.
 */

export interface QuizEntry {
  topic: string;
  score: number;
  week: number;
  /** Days since this quiz was taken (optional — enables sub-week decay precision) */
  daysSince?: number;
}

export interface RetentionRate {
  topic: string;
  originalScore: number;
  retention: number;
  daysSinceStudied: number;
  reviewInDays: number;
  urgency: 'critical' | 'review-soon' | 'fading' | 'fresh';
}

export interface LearningVelocity {
  velocity: number;
  trend: 'accelerating' | 'steady' | 'decelerating';
  efficiency: number;
}

export interface PredictedScore {
  predicted: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface StudyEfficiency {
  pointsPerHour: number;
  rating: 'excellent' | 'good' | 'needs-improvement';
}

/**
 * Ebbinghaus forgetting curve per topic.
 * Groups by topic, uses most recent score, applies R = score * e^(-0.3 * weeksSince).
 */
export function computeRetentionRates(quizHistory: QuizEntry[], weeksActive: number): RetentionRate[] {
  if (!quizHistory || quizHistory.length === 0) return [];

  // Group by topic → keep most recent entry (lowest daysSince, or highest week)
  const latest: Record<string, QuizEntry> = {};
  for (const q of quizHistory) {
    const existing = latest[q.topic];
    if (!existing) { latest[q.topic] = q; continue; }
    // Prefer daysSince comparison (smaller = more recent)
    if (q.daysSince !== undefined && existing.daysSince !== undefined) {
      if (q.daysSince < existing.daysSince) latest[q.topic] = q;
    } else if (q.week > existing.week) {
      latest[q.topic] = q;
    }
  }

  return Object.values(latest).map((q) => {
    // Use daysSince directly if available, otherwise fall back to week-level
    const daysSinceStudied = q.daysSince !== undefined
      ? q.daysSince
      : Math.max(0, weeksActive - q.week) * 7;
    const weeksSince = daysSinceStudied / 7;
    const retention = Math.max(5, Math.round((q.score / 100) * 100 * Math.exp(-0.3 * weeksSince)));
    const reviewInDays = Math.max(1, Math.round(7 * Math.exp(-0.1 * (100 - q.score))));

    let urgency: RetentionRate['urgency'];
    if (retention < 40) urgency = 'critical';
    else if (retention < 60) urgency = 'review-soon';
    else if (retention < 75) urgency = 'fading';
    else urgency = 'fresh';

    return { topic: q.topic, originalScore: q.score, retention, daysSinceStudied: Math.round(daysSinceStudied), reviewInDays, urgency };
  });
}

/**
 * Weighted average of all topic retentions → single "Memory Retention Rate" percentage.
 */
export function computeOverallRetention(retentionRates: RetentionRate[]): number {
  if (!retentionRates || retentionRates.length === 0) return 0;
  const sum = retentionRates.reduce((acc, r) => acc + r.retention, 0);
  return Math.round(sum / retentionRates.length);
}

/**
 * Average score delta between consecutive quizzes.
 * Trend: accelerating (>+2), steady (-2 to +2), decelerating (<-2).
 * Efficiency = total score gain / total study hours.
 */
export function computeLearningVelocity(quizHistory: QuizEntry[]): LearningVelocity {
  if (!quizHistory || quizHistory.length < 2) {
    return { velocity: 0, trend: 'steady', efficiency: 0 };
  }

  // Sort by week for chronological order
  const sorted = [...quizHistory].sort((a, b) => a.week - b.week);
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    deltas.push(sorted[i].score - sorted[i - 1].score);
  }

  const velocity = Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10;
  let trend: LearningVelocity['trend'];
  if (velocity > 2) trend = 'accelerating';
  else if (velocity < -2) trend = 'decelerating';
  else trend = 'steady';

  return { velocity, trend, efficiency: 0 };
}

/**
 * Simple linear regression on recent scores to predict next score.
 */
export function computePredictedScore(quizHistory: QuizEntry[]): PredictedScore {
  if (!quizHistory || quizHistory.length < 2) {
    return { predicted: 0, confidence: 0, trend: 'stable' };
  }

  const sorted = [...quizHistory].sort((a, b) => a.week - b.week);
  const recent = sorted.slice(-8); // use last 8 data points
  const n = recent.length;

  // Linear regression: y = mx + b
  const xMean = recent.reduce((s, _, i) => s + i, 0) / n;
  const yMean = recent.reduce((s, q) => s + q.score, 0) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (recent[i].score - yMean);
    den += (i - xMean) ** 2;
  }

  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  const predicted = Math.round(Math.min(100, Math.max(0, slope * n + intercept)));

  // R-squared for confidence
  const ssTot = recent.reduce((s, q) => s + (q.score - yMean) ** 2, 0);
  const ssRes = recent.reduce((s, q, i) => s + (q.score - (slope * i + intercept)) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const confidence = Math.round(Math.max(0.3, Math.min(0.95, rSquared)) * 100) / 100;

  let trend: PredictedScore['trend'];
  if (slope > 1) trend = 'improving';
  else if (slope < -1) trend = 'declining';
  else trend = 'stable';

  return { predicted, confidence, trend };
}

/**
 * Points gained per hour studied.
 */
export function computeStudyEfficiency(quizHistory: QuizEntry[], weeklyHoursHistory: number[]): StudyEfficiency {
  if (!quizHistory || quizHistory.length < 2 || !weeklyHoursHistory || weeklyHoursHistory.length === 0) {
    return { pointsPerHour: 0, rating: 'needs-improvement' };
  }

  const totalHours = weeklyHoursHistory.reduce((a, b) => a + b, 0);
  if (totalHours === 0) return { pointsPerHour: 0, rating: 'needs-improvement' };

  const sorted = [...quizHistory].sort((a, b) => a.week - b.week);
  const totalGain = Math.abs(sorted[sorted.length - 1].score - sorted[0].score);
  const pointsPerHour = Math.round((totalGain / totalHours) * 10) / 10;

  let rating: StudyEfficiency['rating'];
  if (pointsPerHour >= 3) rating = 'excellent';
  else if (pointsPerHour >= 1) rating = 'good';
  else rating = 'needs-improvement';

  return { pointsPerHour, rating };
}

/**
 * Filter topics needing review (retention < 60% or urgency critical/review-soon).
 * Sorted by urgency (most urgent first).
 */
export function getReviewDueTopics(retentionRates: RetentionRate[]): RetentionRate[] {
  if (!retentionRates || retentionRates.length === 0) return [];

  const urgencyOrder: Record<string, number> = { critical: 0, 'review-soon': 1, fading: 2, fresh: 3 };

  return retentionRates
    .filter((r) => r.retention < 60 || r.urgency === 'critical' || r.urgency === 'review-soon')
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
}
