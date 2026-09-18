const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const oldCodeStart = `      const uniqueJudges = appUsers.filter(u => u.role === 'judge').slice(0, 2);
      const juri1Name = uniqueJudges.length > 0 ? uniqueJudges[0].name : ".........................";
      const juri2Name = uniqueJudges.length > 1 ? uniqueJudges[1].name : ".........................";`;

const newCodeStart = `      // Cari Juri yang benar-benar memberikan nilai
      const judgeIdsWithScores = Array.from(new Set(scores.map((s:any) => s.judgeId)));
      const activeJudges = appUsers.filter(u => judgeIdsWithScores.includes(u.id) && u.role === 'judge');

      const j1 = activeJudges.find(u => u.assignedPosts?.includes('Juri 1')) || activeJudges[0];
      const j2 = activeJudges.find(u => u.assignedPosts?.includes('Juri 2')) || activeJudges.find(u => u.id !== j1?.id);

      const juri1Name = j1 ? j1.name : ".........................";
      const juri2Name = j2 ? j2.name : ".........................";`;

content = content.replace(oldCodeStart, newCodeStart);

const oldCodeText = `      const baText = \`Pada hari ini \${dayStr} tanggal Sembilan Belas bulan September tahun Dua Ribu Dua Puluh Enam bertempat di Kecamatan Sukaresmi telah dilaksanakan Kegiatan Penjelajahan Pramuka Penggalang Tahun 2026.\\n\\nBerdasarkan kegiatan tersebut diperoleh hasil lomba LKBB dan Yel-Yel sebagaimana terlampir.\\n\\nDemikian Berita Acara ini dibuat untuk diketahui dan digunakan sebagaimana mestinya.\`;
      
      const splitText = doc.splitTextToSize(baText, 160);
      doc.text(splitText, 25, 40, { align: 'justify', maxWidth: 160 });`;

const newCodeText = `      const baText = \`Pada hari ini \${dayStr} tanggal Sembilan Belas bulan September tahun Dua Ribu Dua Puluh Enam bertempat di Kecamatan Sukaresmi telah dilaksanakan Kegiatan Penjelajahan Pramuka Penggalang Tahun 2026.\\n\\nBerdasarkan kegiatan tersebut diperoleh hasil lomba LKBB dan Yel-Yel sebagaimana terlampir.\\n\\nDemikian Berita Acara ini dibuat untuk diketahui dan digunakan sebagaimana mestinya.\`;
      
      const paragraphs = baText.split('\\n');
      let currentY = 40;
      paragraphs.forEach(paragraph => {
        if (!paragraph.trim()) {
          currentY += 2;
          return;
        }
        const lines = doc.splitTextToSize(paragraph, 160);
        lines.forEach((line: string, index: number) => {
          if (index === lines.length - 1) {
             doc.text(line, 25, currentY, { align: 'left' });
          } else {
             doc.text(line, 25, currentY, { align: 'justify', maxWidth: 160 });
          }
          currentY += 5.5;
        });
      });`;

content = content.replace(oldCodeText, newCodeText);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
