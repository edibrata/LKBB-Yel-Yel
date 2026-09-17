const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const regex = /<div className="pt-2 border-t">\s*<label className="text-sm font-medium text-slate-700 mb-2 block">Tugas Juri<\/label>[\s\S]*?<\/div>\s*<label className="text-sm font-medium text-slate-700 mb-2 block">Kategori Peserta yang Dinilai<\/label>/;
content = content.replace(regex, '<div className="pt-2 border-t">\n<label className="text-sm font-medium text-slate-700 mb-2 block">Kategori Peserta yang Dinilai</label>');

content = content.replace(/const \[newUserPost, setNewUserPost\] = useState\(1\);\n/g, '');
content = content.replace(/const \[newUserPosts, setNewUserPosts\] = useState<number\[\]>\(\[1\]\);\n/g, '');

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
