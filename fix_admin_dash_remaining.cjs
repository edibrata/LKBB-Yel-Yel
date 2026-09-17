const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. PDF generation logic
content = content.replace(/const p1 = detailScores\.find\(s => Number\(s\.post\) === 1\);\s*const p2 = detailScores\.find\(s => Number\(s\.post\) === 2\);\s*const raw1 = p1\?\.totalScore \|\| 0;\s*const raw2 = p2 \? \(p2\?\.totalScore \|\| 0\) : raw1;/g,
  `const validScores = detailScores.filter(s => !s.isDisqualified);
   const raw1 = validScores[0]?.totalScore || 0;
   const raw2 = validScores[1]?.totalScore || 0;`);

content = content.replace(/\{ content: `Jumlah Nilai Juri \$\{post\}`/g, 
  `{ content: \`Jumlah Nilai Juri \${index + 1}\``);

// 2. Remove newUserPost and newUserPosts
content = content.replace(/const \[newUserPost, setNewUserPost\] = useState<number>\(1\);\n/g, '');
content = content.replace(/const \[newUserPosts, setNewUserPosts\] = useState<number\[\]>\(\[1\]\);\n/g, '');
content = content.replace(/setNewUserPost\(u\.post \|\| 1\);\n/g, '');
content = content.replace(/setNewUserPosts\(u\.posts \|\| \(u\.post \? \[u\.post\] : \[1\]\)\);\n/g, '');
content = content.replace(/setNewUserPost\(1\);\n/g, '');
content = content.replace(/setNewUserPosts\(\[1\]\);\n/g, '');

content = content.replace(/post: newUserPosts\.length === 1 \? newUserPosts\[0\] : newUserPosts\[0\],\n/g, '');
content = content.replace(/posts: newUserPosts,\n/g, '');
content = content.replace(/post: newUserRole === 'judge' \? \(newUserPosts\.length === 1 \? newUserPosts\[0\] : newUserPosts\[0\]\) : undefined,\n/g, '');
content = content.replace(/posts: newUserRole === 'judge' \? newUserPosts : undefined,\n/g, '');

// 3. User sort config
content = content.replace(/else if \(userSortConfig\.key === 'post'\) \{ valA = a\.post\?\.toString\(\) \|\| ''; valB = b\.post\?\.toString\(\) \|\| ''; \}/g, '');

// 4. Transfer scores option & payload
content = content.replace(/<option key=\{j\.id\} value=\{j\.id\}>Juri \{j\.posts \? j\.posts\.join\(', '\) : \(j\.post \|\| '\?'\)\} - \{j\.id\.charAt\(0\)\.toUpperCase\(\) \+ j\.id\.slice\(1\)\} \{j\.assignedCategories \? `\(\$\{j\.assignedCategories\.join\(', '\)\}\)` : ''\}<\/option>/g, 
  `<option key={j.id} value={j.id}>Juri: {j.id.charAt(0).toUpperCase() + j.id.slice(1)} {j.assignedCategories ? \`(\${j.assignedCategories.join(', ')})\` : ''}</option>`);

content = content.replace(/post: targetJudge\.post,\n\s*posts: targetJudge\.posts,\n/g, '');

// 5. validPosCount / completion check
content = content.replace(/return new Set\(pScores\.map\(s => s\.post\)\)\.size === 2;/g, 'return pScores.length >= appUsers.filter(u => u.role === "judge").length && pScores.length > 0;');
content = content.replace(/const validPosCount = new Set\(pScores\.map\(s => s\.post\)\)\.size;/g, 'const validPosCount = pScores.length;');

// 6. Trash display
content = content.replace(/<p className="text-xs text-slate-500">Juri \{s\.post\} • Juri: \{s\.judgeName\}<\/p>/g, '<p className="text-xs text-slate-500">Juri: {s.judgeName}</p>');

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
