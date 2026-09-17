const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Remove header
content = content.replace(/<th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors" onClick=\{\(\) => requestUserSort\('post'\)\}>Juri<\/th>\n/g, '');

// Remove table cell
content = content.replace(/<td className="px-4 py-3">\s*\{u\.role === 'judge' \? \(u\.posts && u\.posts\.length > 0 \? `Juri \$\{u\.posts\.join\(', '\)\}` : `Juri \$\{u\.post\}`\) : '-'\}\s*<\/td>\n/g, '');

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
