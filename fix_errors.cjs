const fs = require('fs');
let adminContent = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Import FLAT_CRITERIA
adminContent = adminContent.replace(/import \{ SCORING_CRITERIA \} from '\.\.\/lib\/constants';/g, "import { SCORING_CRITERIA, FLAT_CRITERIA } from '../lib/constants';");

// PDF fixing (p1, p2)
adminContent = adminContent.replace(/if \(!p1 && !p2\) return currentY;/g, "if (validScores.length === 0) return currentY;");
adminContent = adminContent.replace(/if \(p2\) \{\s*drawJudgeTable\('Juri 2', p2, startY_P2\);\s*\}/g, 
  "if (validScores[1]) {\n      drawJudgeTable('Juri 2', validScores[1], startY_P2);\n    }");

adminContent = adminContent.replace(/const t1 = p1\?\.timerSeconds \|\| 0;/g, "");
adminContent = adminContent.replace(/const t2 = p2\?\.timerSeconds \|\| 0;/g, "");
adminContent = adminContent.replace(/let validTimer = 0;/g, "");

// PDF fixing loop for juri box
adminContent = adminContent.replace(/drawJudgeTable\('Juri 1', p1, startY_P1\);/g, "drawJudgeTable('Juri 1', validScores[0], startY_P1);");
adminContent = adminContent.replace(/if \(p2\) \{\s*drawJudgeTable\('Juri 2', p2, startY_P2\);\s*\}/g, "if (validScores.length > 1) { drawJudgeTable('Juri 2', validScores[1], startY_P2); }");

// Replace remaining s1, s2 references
adminContent = adminContent.replace(/const raw1 = s1\?\.totalScore \|\| 0;/g, "");
adminContent = adminContent.replace(/const raw2 = s2 \? \(s2\?\.totalScore \|\| 0\) : raw1;/g, "");
adminContent = adminContent.replace(/const t1 = s1\?\.timerSeconds \|\| 0;/g, "");
adminContent = adminContent.replace(/const t2 = s2\?\.timerSeconds \|\| 0;/g, "");

fs.writeFileSync('src/pages/AdminDashboard.tsx', adminContent);

let judgeContent = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf8');
judgeContent = judgeContent.replace(/import \{ SCORING_CRITERIA, Criteria \} from '\.\.\/lib\/constants';/g, "import { FLAT_CRITERIA, Criteria } from '../lib/constants';");

// Fixing map property missing on FLAT_CRITERIA - sometimes it's grouped. Wait, FLAT_CRITERIA is an array, let's make sure we typed it properly.
// In JudgeScoring.tsx: SCORING_CRITERIA[post as keyof typeof SCORING_CRITERIA] || [] 
// was replaced by FLAT_CRITERIA. Let's see line 393 in JudgeScoring.
fs.writeFileSync('src/pages/JudgeScoring.tsx', judgeContent);

