const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

code = code.replace(
  /let timePenalty = 0;\s*if \(timerSeconds > 300\) \{\s*timePenalty = \(timerSeconds - 300\) \* \(5 \/ 60\);\s*\}/g,
  `let timePenalty = 0;
              let excessSeconds = 0;
              if (timerSeconds > 300) {
                excessSeconds = timerSeconds - 300;
                timePenalty = excessSeconds * (5 / 60);
              }`
);

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
console.log("Judge penalty calculation fixed again.");
