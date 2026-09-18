const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

code = code.replace(
  `                        <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('categories')}>KATEGORI AKSES</th>
                        <th className="px-4 py-3 font-medium rounded-tr-md cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('posts')}>TUGAS JURI</th>
                        <th className="px-4 py-3 font-medium rounded-tr-md cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('posts')}>TUGAS JURI</th>`,
  `                        <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('categories')}>KATEGORI AKSES</th>
                        <th className="px-4 py-3 font-medium rounded-tr-md cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestUserSort('posts')}>TUGAS JURI</th>`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
