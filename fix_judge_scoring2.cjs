const fs = require('fs');
let content = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf8');

content = content.replace(/SCORING_CRITERIA\[post as keyof typeof SCORING_CRITERIA\]/g, 'FLAT_CRITERIA');
content = content.replace(/import \{ SCORING_CRITERIA, Criteria \}/g, 'import { FLAT_CRITERIA, Criteria }');
content = content.replace(/where\('post', '==', post\)/g, '/* removed post query */');
content = content.replace(/valid criteria for this post/g, 'valid criteria');
content = content.replace(/\}, \[participantId, user, post\]\);/g, '}, [participantId, user]);');

fs.writeFileSync('src/pages/JudgeScoring.tsx', content);
