const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

// Fix in save function
code = code.replace(
    /const avg = aspects\[asp\]\.total \/ aspects\[asp\]\.count;\s*totalScore \+= \(avg \* \(aspects\[asp\]\.weight \/ 100\)\);/,
    "const avg = aspects[asp].total / aspects[asp].count;\n        totalScore += (avg * 20 * (aspects[asp].weight / 100));"
);

// Fix in display function
code = code.replace(
    /const avg = aspects\[asp\]\.total \/ aspects\[asp\]\.count;\s*displayTotal \+= \(avg \* \(aspects\[asp\]\.weight \/ 100\)\);/,
    "const avg = aspects[asp].total / aspects[asp].count;\n                displayTotal += (avg * 20 * (aspects[asp].weight / 100));"
);

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
