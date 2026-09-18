const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const oldCodeText = `      const paragraphs = baText.split('\\n');
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

const newCodeText = `      const paragraphs = baText.split('\\n\\n');
      let currentY = 40;
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          // jsPDF secara otomatis akan men-justify seluruh baris KECUALI baris terakhir
          // jika kita memberikan string utuh (paragraf) beserta maxWidth
          doc.text(paragraph, 25, currentY, { align: 'justify', maxWidth: 160 });
          
          const lines = doc.splitTextToSize(paragraph, 160);
          // Tinggi bawaan jsPDF untuk size 11 adalah ~4.5mm per baris. 
          // Ditambah jarak antar paragraf 4mm.
          currentY += (lines.length * 4.5) + 4;
        }
      });`;

if (content.includes(oldCodeText)) {
  content = content.replace(oldCodeText, newCodeText);
  fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
  console.log('Successfully patched justify logic!');
} else {
  console.log('Could not find the exact code block to replace.');
}
