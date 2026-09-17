const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

code = code.replace(
  /interface ScoreRecord \{[\s\S]*?isDisqualified\?\: boolean;/m,
  `interface ScoreRecord {
  id: string;
  participantId: string;
  post: number;
  totalScore: number;
  finalScore?: number;
  timePenalty?: number;
  timerSeconds?: number;
  criteriaScores?: Record<string, number>;
  isDisqualified?: boolean;`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Type fixed.");
