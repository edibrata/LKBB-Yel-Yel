const fs = require('fs');
let content = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf8');

// Remove post param
content = content.replace(/  const \[searchParams\] = useSearchParams\(\);\n  const post = parseInt\(searchParams\.get\('post'\) \|\| '1'\);\n/g, '');

// Update Draft key & Doc ID
content = content.replace(/const docId = `\$\{participantId\}_\$\{user\.uid\}_\$\{post\}`;/g, 'const docId = `${participantId}_${user.uid}`;');
content = content.replace(/const draftKey = `draft_score_\$\{user\.uid\}_\$\{participantId\}_\$\{post\}`;/g, 'const draftKey = `draft_score_${user.uid}_${participantId}`;');

// Update setDoc
content = content.replace(/        post,\n/g, '');

// UI replacements
content = content.replace(/Juri \{post\}/g, 'Juri {user?.uid.charAt(0).toUpperCase() + user?.uid.slice(1)}');
content = content.replace(/Pos Penilaian Juri \{user\?\.uid\.charAt\(0\)\.toUpperCase\(\) \+ user\?\.uid\.slice\(1\)\}/g, 'Juri Penilai');

fs.writeFileSync('src/pages/JudgeScoring.tsx', content);
