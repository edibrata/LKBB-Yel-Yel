const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// 1. Ganti "Peserta: 01" menjadi "01 SD / MI / Sederajat" (format [Nomor Peserta] [Kategori])
content = content.replace(
  /const pInfo = \`Peserta: \$\{p\.number\}\`;/g,
  'const pInfo = `${p.number} ${p.category}`;'
);

// 2. Tinggikan sedikit ruang untuk tanda tangan (dari finalY + 16 menjadi finalY + 22)
// agar ada cukup ruang untuk menandatangani di antara teks "Juri Penilai" dan kurung nama
content = content.replace(
  /doc\.text\("\( \.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\. \)", 130, finalY \+ 16\);/g,
  'doc.text("( .......................................... )", 130, finalY + 22);'
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
