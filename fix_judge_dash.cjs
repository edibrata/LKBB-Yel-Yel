const fs = require('fs');
let content = fs.readFileSync('src/pages/JudgeDashboard.tsx', 'utf8');

// Remove selectedPost state
content = content.replace(/  const \[selectedPost, setSelectedPost\] = useState<number>\(1\);\n/g, '');

// Remove the admin selectedPost updater
content = content.replace(/  useEffect\(\(\) => \{\n    \/\/ Allows switching post for testing\/flexibility if needed, but only for admins\n    if \(user\?\.uid && user\.appRole === 'admin'\) \{\n      updateDoc\(doc\(db, 'users', user\.uid\), \{ post: selectedPost \}\)\.catch\(console\.error\);\n    \}\n  \}, \[selectedPost, user\?\.uid, user\?\.appRole\]\);\n/g, '');

// Fix score fetch filter
content = content.replace(/if \(data\.judgeId === user\.uid && data\.post === selectedPost\) \{/g, 'if (data.judgeId === user.uid) {');
content = content.replace(/\}, \[user, selectedPost\]\);/g, '}, [user]);');

// Fix disqualification
content = content.replace(/const docId = `\$\{participant\.id\}_\$\{user\.uid\}_\$\{activePost\}`;/g, 'const docId = `${participant.id}_${user.uid}`;');
content = content.replace(/localStorage\.removeItem\(`draft_score_\$\{user\.uid\}_\$\{participant\.id\}_\$\{activePost\}`\);/g, 'localStorage.removeItem(`draft_score_${user.uid}_${participant.id}`);');
content = content.replace(/        post: activePost,\n/g, '');
content = content.replace(/        `Peserta \$\{participant\.number\} \(Kategori: \$\{participant\.category\}\) di Pos \$\{activePost\}`/g, '        `Peserta ${participant.number} (Kategori: ${participant.category}) diskualifikasi`');

// Remove activePost var
content = content.replace(/  const activePost = selectedPost;\n/g, '');

// Fix Navigation
content = content.replace(/navigate\(`\/judge\/scoring\/\$\{p\.id\}\?post=\$\{activePost\}`\);/g, 'navigate(`/judge/scoring/${p.id}`);');
content = content.replace(/navigate\(`\/judge\/scoring\/\$\{confirmParticipant\.id\}\?post=\$\{activePost\}`\);/g, 'navigate(`/judge/scoring/${confirmParticipant.id}`);');

// Fix headers
content = content.replace(/<h1 className="text-xl font-bold text-slate-900">Juri App - Pos \{activePost\}<\/h1>/g, '<h1 className="text-xl font-bold text-slate-900">Juri App - LKBB dan Yel-Yel</h1>');
content = content.replace(/<h1 className="text-xl font-bold text-slate-900">Juri App - LKBB dan Yel-Yel<\/h1>/g, '<h1 className="text-xl font-bold text-slate-900">Juri App - LKBB dan Yel-Yel</h1>');

fs.writeFileSync('src/pages/JudgeDashboard.tsx', content);
