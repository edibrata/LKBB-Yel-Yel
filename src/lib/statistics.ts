export function calculateMean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function calculateVariance(arr: number[]): number {
  if (arr.length <= 1) return 0;
  const mean = calculateMean(arr);
  return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (arr.length - 1); // Sample variance
}

export function calculateStandardDeviation(arr: number[]): number {
  return Math.sqrt(calculateVariance(arr));
}

export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const n = x.length;
  const meanX = calculateMean(x);
  const meanY = calculateMean(y);
  
  let num = 0;
  let den1 = 0;
  let den2 = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    den1 += dx * dx;
    den2 += dy * dy;
  }
  
  if (den1 === 0 || den2 === 0) return 0;
  return num / Math.sqrt(den1 * den2);
}

export function getRankings(scores: number[]): number[] {
  const sorted = [...scores].map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score);
  const ranks = new Array(scores.length).fill(0);
  sorted.forEach((item, rank) => {
    ranks[item.index] = rank + 1;
  });
  return ranks;
}

export function calculateSpearmanRankCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const rankX = getRankings(x);
  const rankY = getRankings(y);
  return calculatePearsonCorrelation(rankX, rankY);
}
