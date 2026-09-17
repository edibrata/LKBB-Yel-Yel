const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(/\['Nama Pengguna', 'Password', 'Peran', 'Tugas Juri', 'Kategori'\],/g, "['Nama Pengguna', 'Password', 'Peran', 'Kategori'],");
content = content.replace(/\['juri_sd1', 'rahasia123', 'juri', '1', 'SD Putra, SD Putri'\],/g, "['juri_sd1', 'rahasia123', 'juri', 'SD Putra, SD Putri'],");
content = content.replace(/\['juri_smp2', 'rahasia123', 'juri', '2', 'SMP Putra, SMP Putri'\],/g, "['juri_smp2', 'rahasia123', 'juri', 'SMP Putra, SMP Putri'],");
content = content.replace(/\['admin_pusat', 'admin123', 'admin', '', ''\],/g, "['admin_pusat', 'admin123', 'admin', ''],");
content = content.replace(/\['admin_nilai', 'admin123', 'admin_leaderboard', '', ''\]/g, "['admin_nilai', 'admin123', 'admin_leaderboard', '']");

// Also check for reading Excel rows
content = content.replace(/const roleRaw = String\(row\[2\] \|\| ''\)\.toLowerCase\(\)\.trim\(\);\n\s*const posRaw = String\(row\[3\] \|\| ''\);\n\s*const catRaw = String\(row\[4\] \|\| ''\);/g, 
"const roleRaw = String(row[2] || '').toLowerCase().trim();\n          const catRaw = String(row[3] || '');");

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
