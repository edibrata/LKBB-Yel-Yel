const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(/  post: number;\n/g, '');
content = content.replace(/  post\?: number;\n/g, '');
content = content.replace(/  posts\?: number\[\];\n/g, '');

content = content.replace(/let posts = posRaw \? posRaw\.split\(','\)\.map\(p => Number\(p\.trim\(\)\)\)\.filter\(p => \[1,2,3\]\.includes\(p\)\) : \[\];\n\s*if \(posts\.length === 0 && role === 'judge'\) \{\n\s*posts = \[1\];\n\s*\}/g, '');
content = content.replace(/post: role === 'judge' \? posts\[0\] : null,\n/g, '');
content = content.replace(/posts: role === 'judge' \? posts : null,\n/g, '');
content = content.replace(/post: newUserRole === 'judge' \? \(newUserPosts\[0\] \|\| newUserPost\) : null,\n/g, '');
content = content.replace(/posts: newUserRole === 'judge' \? newUserPosts : null,\n/g, '');

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
