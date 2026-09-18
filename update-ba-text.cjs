const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const oldCodeText = `const baText = \`Pada hari ini \${dayStr} tanggal Sembilan Belas bulan September tahun Dua Ribu Dua Puluh Enam bertempat di Kecamatan Sukaresmi telah dilaksanakan Kegiatan Penjelajahan Pramuka Penggalang Tahun 2026.\\n\\nBerdasarkan kegiatan tersebut diperoleh hasil lomba LKBB dan Yel-Yel sebagaimana terlampir.\\n\\nDemikian Berita Acara ini dibuat untuk diketahui dan digunakan sebagaimana mestinya.\`;`;

const newCodeText = `const baText = \`Pada hari ini \${dayStr} tanggal Sembilan Belas bulan September tahun Dua Ribu Dua Puluh Enam bertempat di Cikuya Kecamatan Sukaresmi telah dilaksanakan Lomba Keterampilan Baris Berbaris (LKBB) dan Yel-Yel dalam Kegiatan Penjelajahan Pramuka Penggalang Tahun 2026.\\n\\nBerdasarkan kegiatan tersebut diperoleh hasil sebagaimana terlampir.\\n\\nDemikian Berita Acara ini dibuat untuk diketahui dan digunakan sebagaimana mestinya.\`;`;

if (content.includes(oldCodeText)) {
  content = content.replace(oldCodeText, newCodeText);
  // Juga update judul menjadi BERITA ACARA HASIL LOMBA jika sebelumnya hanya BERITA ACARA
  content = content.replace('doc.text("BERITA ACARA", 105, 25, { align: \'center\' });', 'doc.text("BERITA ACARA HASIL LOMBA", 105, 25, { align: \'center\' });');
  fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
  console.log('Successfully updated Berita Acara text!');
} else {
  console.log('Could not find the exact code block to replace.');
}
