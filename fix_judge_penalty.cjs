const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

// The submit block calculation
code = code.replace(
  /let penaltyMinutes = 0;\s*if \(timerSeconds > 300\) \{\s*penaltyMinutes = Math\.ceil\(\(timerSeconds - 300\) \/ 60\);\s*\}\s*const timePenalty = penaltyMinutes \* 5;/g,
  `let timePenalty = 0;
      if (timerSeconds > 300) {
        timePenalty = (timerSeconds - 300) * (5 / 60);
      }`
);

// The display block calculation
code = code.replace(
  /let penaltyMinutes = 0;\s*if \(timerSeconds > 300\) \{\s*penaltyMinutes = Math\.ceil\(\(timerSeconds - 300\) \/ 60\);\s*\}\s*const timePenalty = penaltyMinutes \* 5;/g,
  `let timePenalty = 0;
              let excessSeconds = 0;
              if (timerSeconds > 300) {
                excessSeconds = timerSeconds - 300;
                timePenalty = excessSeconds * (5 / 60);
              }`
);

// Display block UI
code = code.replace(
  /\{timePenalty > 0 && <div className="text-red-500 text-xs font-bold">- \{timePenalty\} \(Penalti \{penaltyMinutes\}m\)<\/div>\}/g,
  `{timePenalty > 0 && <div className="text-red-500 text-xs font-bold">- {timePenalty.toFixed(2)} pt (Lebih {excessSeconds} dtk)</div>}`
);

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
console.log("Judge penalty calculation fixed.");
