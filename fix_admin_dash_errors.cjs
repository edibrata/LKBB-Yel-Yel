const fs = require('fs');
let adminContent = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Ensure FLAT_CRITERIA is imported
adminContent = adminContent.replace(/import \{ SCORING_CRITERIA \} from '\.\.\/lib\/constants';/g, "import { SCORING_CRITERIA, FLAT_CRITERIA } from '../lib/constants';");
// If SCORING_CRITERIA is already replaced with SCORING_CRITERIA, FLAT_CRITERIA, it might have failed. Let's force it.
if (!adminContent.includes('FLAT_CRITERIA } from')) {
    adminContent = adminContent.replace(/import \{ SCORING_CRITERIA, FLAT_CRITERIA \} from '\.\.\/lib\/constants';/g, ""); // clear if half-done
    adminContent = adminContent.replace(/import \{ ([^}]+) \} from '\.\.\/lib\/constants';/g, "import { $1, FLAT_CRITERIA } from '../lib/constants';");
}

// PDF fixes
adminContent = adminContent.replace(/const t1 = p1\?\.timerSeconds \|\| 0;\n\s*const t2 = p2\?\.timerSeconds \|\| 0;\n\s*let validTimer = 0;\n\s*if \(t1 > 0 && t2 > 0\) validTimer = Math\.min\(t1, t2\);\n\s*else if \(t1 > 0\) validTimer = t1;\n\s*else if \(t2 > 0\) validTimer = t2;\n/g, "");
adminContent = adminContent.replace(/if \(validTimer > 300\) \{\s*let excess = validTimer - 300;\s*timePenalty = excess \* \(5 \/ 60\);\s*\}/g, "");
adminContent = adminContent.replace(/const t1 = s1\?\.timerSeconds \|\| 0;\n\s*const t2 = s2\?\.timerSeconds \|\| 0;\n\s*let validTimer = 0;\n\s*if \(t1 > 0 && t2 > 0\) validTimer = Math\.min\(t1, t2\);\n\s*else if \(t1 > 0\) validTimer = t1;\n\s*else if \(t2 > 0\) validTimer = t2;\n/g, "");
adminContent = adminContent.replace(/const raw1 = s1\?\.totalScore \|\| 0;\n\s*const raw2 = s2 \? \(s2\?\.totalScore \|\| 0\) : raw1;/g, "");

// Other p1, p2 usages inside PDF generator
adminContent = adminContent.replace(/if \(!p1 && !p2\) return currentY;/g, "if (!validScores[0]) return currentY;");
adminContent = adminContent.replace(/const p2 = detailScores\.find\(s => Number\(s\.post\) === 2\);/g, ""); // should be removed, but just in case
adminContent = adminContent.replace(/drawJudgeTable\('Juri 2', p2, startY_P2\);/g, "drawJudgeTable('Juri 2', validScores[1], startY_P2);");

// Removing remaining t1, t2, validTimer, raw1, raw2 loops that I missed
adminContent = adminContent.replace(/const raw1 \= validScores\[0\]\?\.totalScore \|\| 0;\n\s*const raw2 \= validScores\[1\]\?\.totalScore \|\| 0;/g, ""); // I introduced this earlier

// I will write a regex to just strip out the offending lines
let lines = adminContent.split('\n');
let newLines = [];
for(let line of lines) {
    if(line.includes('const t1 =') || line.includes('const t2 =') || line.includes('let validTimer =') || 
       line.includes('validTimer = Math.min') || line.includes('validTimer = t1') || line.includes('validTimer = t2') ||
       line.includes('validTimer > 300') || line.includes('let excess = validTimer') || line.includes('const raw1 =') ||
       line.includes('const raw2 =') || line.includes('raw1 + raw2') || line.includes('drawJudgeTable(\'Juri 1\', p1') ||
       line.includes('drawJudgeTable(\'Juri 2\', p2') || line.includes('!p1 && !p2') || line.includes('const p1 =') || line.includes('const p2 =') ||
       line.includes('if (p2) {') || line.includes('drawJudgeTable(\'Juri 2\', validScores[1]') || line.includes('if (validScores.length > 1) {') ) {
        continue;
    }
    newLines.push(line);
}
adminContent = newLines.join('\n');

// Since I stripped the rendering of the tables, I need to add them back cleanly
adminContent = adminContent.replace(/\/\/\s*Determine penalties and final totals/g, `
    if (validScores.length === 0) return currentY;
    drawJudgeTable('Juri 1', validScores[0], startY_P1);
    if (validScores.length > 1) {
        drawJudgeTable('Juri 2', validScores[1], startY_P2);
    }
    // Determine penalties and final totals
`);


fs.writeFileSync('src/pages/AdminDashboard.tsx', adminContent);

let judgeContent = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf8');
if (!judgeContent.includes('FLAT_CRITERIA } from')) {
    judgeContent = judgeContent.replace(/import \{ ([^}]+) \} from '\.\.\/lib\/constants';/g, "import { $1, FLAT_CRITERIA } from '../lib/constants';");
}
// Fix FLAT_CRITERIA type
judgeContent = judgeContent.replace(/\{FLAT_CRITERIA\.map\(\(crit/g, "{(FLAT_CRITERIA as any[]).map((crit");
fs.writeFileSync('src/pages/JudgeScoring.tsx', judgeContent);

