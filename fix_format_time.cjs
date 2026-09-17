const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

const oldFormatTime = `const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return \`\${m}:\${s}\`;
  };`;

const newFormatTime = `const formatTime = (elapsedSeconds: number) => {
    const remaining = 300 - elapsedSeconds;
    const isNegative = remaining < 0;
    const absRemaining = Math.abs(remaining);
    const m = Math.floor(absRemaining / 60).toString().padStart(2, '0');
    const s = (absRemaining % 60).toString().padStart(2, '0');
    return isNegative ? \`-\${m}:\${s}\` : \`\${m}:\${s}\`;
  };`;

if(code.includes(oldFormatTime)) {
    code = code.replace(oldFormatTime, newFormatTime);
    fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
    console.log("Replaced successfully via exact match.");
} else {
    // fallback regex if spaces differ
    const regex = /const formatTime = \(secs: number\) => \{[\s\S]*?return \`\$\{m\}:\$\{s\}\`;\s*\};/m;
    code = code.replace(regex, newFormatTime);
    fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
    console.log("Replaced via regex.");
}
