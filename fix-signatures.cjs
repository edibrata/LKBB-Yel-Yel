const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const oldSignatureLogic = `      const signatureData = [
        [1, "Mulyadi", "Ketua Kwarran", ""],
        [2, "Deden Sanarudin", "Koordinator Kegiatan", ""],
        [3, "Edi Brata, M.Pd.", "Koordinator LKBB dan Yel-Yel", ""],
        [4, juri1Name, "Juri 1", ""],
        [5, juri2Name, "Juri 2", ""]
      ];`;

const newSignatureLogic = `      // Generate dynamic signature rows for judges
      const signatureData: any[] = [
        [1, "Mulyadi", "Ketua Kwarran", ""],
        [2, "Deden Sanarudin", "Koordinator Kegiatan", ""],
        [3, "Edi Brata, M.Pd.", "Koordinator LKBB dan Yel-Yel", ""]
      ];

      // Ambil semua juri yang aktif (berdasarkan data user, tidak harus menunggu nilai masuk jika ingin form kosong)
      const allJudges = appUsers.filter(u => u.role === 'judge');
      
      let sigIndex = 4;
      allJudges.forEach(j => {
        // Fallback jika tidak ada data penugasan
        const posts = j.assignedPosts && j.assignedPosts.length > 0 ? j.assignedPosts : ['Juri'];
        const cats = j.assignedCategories && j.assignedCategories.length > 0 ? j.assignedCategories : ['Semua Kategori'];
        
        posts.forEach(post => {
          cats.forEach(cat => {
            const roleStr = \`\${post} \${cat}\`;
            // Cek apakah juri ini sudah pernah memberi nilai untuk kategori ini
            const hasScored = scores.some(s => s.judgeId === j.id);
            const judgeName = hasScored ? j.name : ".........................";
            
            signatureData.push([
              sigIndex++,
              judgeName,
              roleStr,
              ""
            ]);
          });
        });
      });
      
      // Jika ternyata tidak ada user juri sama sekali di database, buat 2 juri dummy agar form tidak jelek
      if (allJudges.length === 0) {
        signatureData.push([sigIndex++, ".........................", "Juri 1", ""]);
        signatureData.push([sigIndex++, ".........................", "Juri 2", ""]);
      }
`;

if (content.includes(oldSignatureLogic)) {
  content = content.replace(oldSignatureLogic, newSignatureLogic);
  fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
  console.log('Successfully patched signature logic!');
} else {
  console.log('Could not find the exact code block to replace.');
}
