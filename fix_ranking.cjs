const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// Inside groupedScores, let's add proper ranking assignment
code = code.replace(
  /participantsWithScores\.sort\(\(a, b\) => b\.grandTotal \- a\.grandTotal\)/g,
  `(() => {
        // First sort by grand total descending
        const sorted = participantsWithScores.sort((a, b) => b.grandTotal - a.grandTotal);
        // Then assign rank based on grandTotal > 0, handling ties
        let currentRank = 1;
        let previousScore = null;
        let tieCount = 0;
        
        return sorted.map((p, index) => {
          if (p.isDisqualified) {
             return { ...p, rank: '-' };
          }
          if (p.grandTotal === 0) {
             return { ...p, rank: '-' };
          }
          if (previousScore !== null && p.grandTotal === previousScore) {
             tieCount++;
             return { ...p, rank: currentRank };
          }
          currentRank += tieCount;
          if (previousScore === null) {
             currentRank = 1; // reset for first element just in case
          }
          previousScore = p.grandTotal;
          tieCount = 1;
          const assignedRank = currentRank;
          return { ...p, rank: assignedRank };
        });
      })()`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Ranking added.");
