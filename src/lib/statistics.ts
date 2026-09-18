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

// 1. Inter-Rater Reliability / Agreement (ICC & Pearson Agreement)
export function calculateInterRaterAgreement(j1Scores: number[], j2Scores: number[]): {
  coefficient: number;
  judgement: string;
  badgeColor: string;
} {
  if (j1Scores.length < 2 || j2Scores.length < 2 || j1Scores.length !== j2Scores.length) {
    return {
      coefficient: 0,
      judgement: "Data Belum Cukup (Minimal 2 Regu Dinilai Bersama)",
      badgeColor: "text-slate-500"
    };
  }

  const r = calculatePearsonCorrelation(j1Scores, j2Scores);
  const clampedR = Math.max(-1, Math.min(1, r));

  let judgement = "Rendah (Penyamaan Persepsi Diperlukan)";
  let badgeColor = "text-red-600";
  if (clampedR >= 0.85) {
    judgement = "Sangat Tinggi (Konsensus Juri Sangat Kuat)";
    badgeColor = "text-emerald-600";
  } else if (clampedR >= 0.70) {
    judgement = "Tinggi (Objektif & Selaras)";
    badgeColor = "text-emerald-500";
  } else if (clampedR >= 0.50) {
    judgement = "Cukup / Moderat";
    badgeColor = "text-blue-500";
  } else if (clampedR >= 0.30) {
    judgement = "Kurang Selaras";
    badgeColor = "text-amber-500";
  }

  return {
    coefficient: Number(clampedR.toFixed(3)),
    judgement,
    badgeColor
  };
}

// 2. Uji Efek Kelelahan & Urutan Tampil (Fatigue & Order Effect Audit)
export function calculateOrderEffectStability(orders: number[], totalScores: number[]): {
  r: number;
  judgement: string;
  isStable: boolean;
} {
  if (orders.length < 3 || totalScores.length < 3 || orders.length !== totalScores.length) {
    return {
      r: 0,
      judgement: "Data Belum Cukup",
      isStable: true
    };
  }

  const r = calculatePearsonCorrelation(orders, totalScores);
  const absR = Math.abs(r);

  let judgement = "Stabil & Netral (Bebas Efek Urutan Tampil)";
  let isStable = true;

  if (absR < 0.25) {
    judgement = "Sangat Stabil (Independen dari Nomor Undian / Jam Tampil)";
    isStable = true;
  } else if (absR < 0.45) {
    judgement = "Cukup Stabil (Fluktuasi Minor yang Wajar)";
    isStable = true;
  } else if (r >= 0.45) {
    judgement = "Kecenderungan Skor Meningkat pada Regu Akhir";
    isStable = false;
  } else {
    judgement = "Kecenderungan Skor Menurun pada Regu Akhir (Efek Kelelahan)";
    isStable = false;
  }

  return {
    r: Number(r.toFixed(3)),
    judgement,
    isStable
  };
}
