const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const newExportHasilLomba = `  const exportHasilLomba = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      if (participants.length === 0) {
        showToast('Belum ada data peserta', 'error');
        return;
      }
      
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const today = new Date();
      const dateStr = \`\${today.getDate()} \${monthNames[today.getMonth()]} \${today.getFullYear()}\`;
      const dayStr = dayNames[today.getDay()];
      
      const uniqueJudges = appUsers.filter(u => u.role === 'judge').slice(0, 2);
      const juri1Name = uniqueJudges.length > 0 ? uniqueJudges[0].name : ".........................";
      const juri2Name = uniqueJudges.length > 1 ? uniqueJudges[1].name : ".........................";

      let validCategories = CATEGORIES.filter(category => {
        const catGroup = groupedScores.find(g => g.category === category);
        return catGroup && catGroup.participants.length > 0;
      });

      if (validCategories.length === 0) {
        showToast('Belum ada data nilai untuk diekspor', 'error');
        return;
      }

      // --- PAGE 1: BERITA ACARA ---
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("BERITA ACARA", 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const baText = \`Pada hari ini \${dayStr} tanggal \${today.getDate()} bulan \${monthNames[today.getMonth()]} tahun \${today.getFullYear()} bertempat di Kecamatan Sukaresmi telah dilaksanakan Lomba Ketangkasan Baris Berbaris (LKBB) dan Yel-Yel.\\n\\nBerdasarkan kegiatan tersebut diperoleh hasil lomba sebagaimana terlampir.\\n\\nDemikian Berita Acara ini dibuat untuk diketahui dan digunakan sebagaimana mestinya.\`;
      
      const splitText = doc.splitTextToSize(baText, 170);
      doc.text(splitText, 20, 30);
      
      doc.text(\`Sukaresmi, \${dateStr}\`, 105, 75, { align: 'center' });
      
      const signatureData = [
        [1, "Mulyadi", "Ketua Kwarran", ""],
        [2, "Deden Sanarudin", "Koordinator Kegiatan", ""],
        [3, "Edi Brata, M.Pd.", "Koordinator LKBB dan Yel-Yel", ""],
        [4, juri1Name, "Juri 1", ""],
        [5, juri2Name, "Juri 2", ""]
      ];

      autoTable(doc, {
        startY: 85,
        head: [['No.', 'Nama', 'Jabatan', 'Tanda Tangan']],
        body: signatureData,
        theme: 'plain',
        headStyles: { fontStyle: 'bold', halign: 'center', lineWidth: { top: 0.5, bottom: 0.5 }, lineColor: [0, 0, 0] },
        bodyStyles: { minCellHeight: 15, valign: 'middle' },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 50 },
          2: { cellWidth: 65 },
          3: { cellWidth: 40 }
        },
        margin: { left: 20, right: 20 },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            // Draw signature line
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.2);
            let yPos = data.cell.y + (data.cell.height / 2) + 2;
            let xPos = data.cell.x + 5;
            let xEnd = data.cell.x + data.cell.width - 5;
            
            // Adjust alternate positions
            if (data.row.index % 2 === 0) {
              // Left align for odd rows (1, 3, 5) => index 0, 2, 4
              xEnd = xPos + 25;
            } else {
              // Right align for even rows (2, 4) => index 1, 3
              xPos = xEnd - 25;
            }
            doc.line(xPos, yPos, xEnd, yPos);
          }
        },
        willDrawCell: (data) => {
          if (data.section === 'body' && data.row.index === signatureData.length - 1) {
            data.cell.styles.lineWidth = { bottom: 0.5 };
            data.cell.styles.lineColor = [0, 0, 0];
          }
        }
      });
      
      // Footer page 1
      doc.setFontSize(9);
      doc.text(\`Hal. 1 dari \${validCategories.length + 2}\`, 105, 285, { align: 'center' });

      // --- PAGE 2: LAMPIRAN 1 (DAFTAR JUARA) ---
      doc.addPage();
      doc.setFontSize(10);
      doc.text("Lampiran 1", 14, 15);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("DAFTAR JUARA LOMBA LKBB DAN YEL-YEL", 105, 25, { align: 'center' });
      doc.text("TINGKAT KECAMATAN SUKARESMI TAHUN " + today.getFullYear(), 105, 31, { align: 'center' });
      
      const juaraData = [];
      let rankOrder = [1, 2, 3];
      
      validCategories.forEach((category) => {
        const catGroup = groupedScores.find(g => g.category === category);
        if (catGroup && catGroup.participants.length > 0) {
          // get top 3
          let top3 = catGroup.participants.filter(p => p.rank !== '-' && parseInt(p.rank.toString()) <= 3);
          // Sort by rank
          top3.sort((a, b) => parseInt(a.rank.toString()) - parseInt(b.rank.toString()));
          
          if (top3.length > 0) {
            top3.forEach((p, idx) => {
              juaraData.push([
                idx === 0 ? (validCategories.indexOf(category) + 1) : '',
                idx === 0 ? category : '',
                p.rank === 1 ? 'I' : p.rank === 2 ? 'II' : p.rank === 3 ? 'III' : p.rank,
                Number.isInteger(p.grandTotal) ? p.grandTotal : p.grandTotal.toFixed(2),
                p.number,
                p.name
              ]);
            });
          }
        }
      });

      autoTable(doc, {
        startY: 40,
        head: [['No.', 'Kategori', 'Juara', 'Nilai', 'Nomor Peserta', 'Pangkalan / Regu']],
        body: juaraData,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.3, lineColor: [0, 0, 0] },
        bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.3, lineColor: [0, 0, 0] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', valign: 'middle' },
          1: { cellWidth: 45, valign: 'middle' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 65 }
        },
        margin: { left: 14, right: 14 }
      });

      let finalY1 = ((doc as any).lastAutoTable?.finalY || 240) + 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Catatan:", 14, finalY1);
      doc.text("Sesuai ketentuan, apabila terdapat total nilai yang sama, penentuan peringkat didasarkan berturut-turut pada akumulasi nilai tertinggi juri dan pengurangan penalti yang lebih kecil.", 14, finalY1 + 5, { maxWidth: 180 });
      
      doc.setFontSize(10);
      doc.text(\`Sukaresmi, \${dateStr}\`, 140, finalY1 + 25);
      doc.text("Koordinator", 140, finalY1 + 30);
      doc.text("LKBB dan Yel-Yel,", 140, finalY1 + 35);
      doc.setFont("helvetica", "bold");
      doc.text("Edi Brata, M.Pd.", 140, finalY1 + 55);
      doc.setFont("helvetica", "normal");
      
      doc.setFontSize(9);
      doc.text(\`Hal. 2 dari \${validCategories.length + 2}\`, 105, 285, { align: 'center' });

      // --- PAGE 3+: LAMPIRAN 2, 3... (REKAPITULASI NILAI) ---
      validCategories.forEach((category, catIdx) => {
        const catGroup = groupedScores.find(g => g.category === category);
        
        doc.addPage();
        doc.setFontSize(10);
        doc.text(\`Lampiran \${catIdx + 2}\`, 14, 15);
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("REKAPITULASI NILAI LOMBA LKBB DAN YEL-YEL", 105, 25, { align: 'center' });
        doc.text("TINGKAT KECAMATAN SUKARESMI TAHUN " + today.getFullYear(), 105, 31, { align: 'center' });
        doc.text(\`KATEGORI \${category.toUpperCase()}\`, 105, 37, { align: 'center' });
        
        const tableData = [];
        // Sort by rank so the final table is ordered nicely? Wait, original Gerak Jalan has Urut, Peserta, Pos 1, Pos 2... 
        // We will sort by number for the original Rekapitulasi or by Rank?
        // Let's sort by participant number as typically rekapitulasi is by entry order, or by rank?
        // Let's just follow the array which is currently sorted by rank.
        
        let sortedParticipants = [...catGroup.participants].sort((a,b) => {
           // Sort by rank, then number
           let aR = a.rank === '-' ? 999 : parseInt(a.rank);
           let bR = b.rank === '-' ? 999 : parseInt(b.rank);
           if (aR !== bR) return aR - bR;
           return a.number.localeCompare(b.number);
        });

        sortedParticipants.forEach((p, index) => {
          tableData.push([
            index + 1,
            p.number,
            p.name,
            Number.isInteger(p.juri1Total) ? p.juri1Total : p.juri1Total.toFixed(2),
            Number.isInteger(p.juri2Total) ? p.juri2Total : p.juri2Total.toFixed(2),
            p.totalPenalty > 0 ? \`-\${p.totalPenalty.toFixed(2)}\` : '-',
            Number.isInteger(p.grandTotal) ? p.grandTotal : p.grandTotal.toFixed(2),
            p.isDisqualified ? 'Diskualifikasi' : (p.rank !== '-' ? p.rank : '-')
          ]);
        });
        
        autoTable(doc, {
          startY: 45,
          head: [[
            { content: 'Nomor', colSpan: 2, styles: { halign: 'center' } },
            { content: 'Pangkalan / Regu', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Nilai', colSpan: 4, styles: { halign: 'center' } },
            { content: 'Rank', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
          ], [
            { content: 'Urut', styles: { halign: 'center' } },
            { content: 'Peserta', styles: { halign: 'center' } },
            { content: 'Juri 1', styles: { halign: 'center' } },
            { content: 'Juri 2', styles: { halign: 'center' } },
            { content: 'Penalti', styles: { halign: 'center' } },
            { content: 'Akhir', styles: { halign: 'center' } }
          ]],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.3, lineColor: [0, 0, 0] },
          bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.3, lineColor: [0, 0, 0] },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 16, halign: 'center' },
            2: { cellWidth: 60 },
            3: { cellWidth: 16, halign: 'center' },
            4: { cellWidth: 16, halign: 'center' },
            5: { cellWidth: 16, halign: 'center', textColor: [200, 0, 0] },
            6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 12, halign: 'center' }
          },
          margin: { left: 14, right: 14 }
        });
        
        let finalY2 = ((doc as any).lastAutoTable?.finalY || 240) + 15;
        if (finalY2 > 250) {
            doc.addPage();
            finalY2 = 30;
        }
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(\`Sukaresmi, \${dateStr}\`, 140, finalY2);
        doc.text("Koordinator", 140, finalY2 + 5);
        doc.text("LKBB dan Yel-Yel,", 140, finalY2 + 10);
        doc.setFont("helvetica", "bold");
        doc.text("Edi Brata, M.Pd.", 140, finalY2 + 30);
        doc.setFont("helvetica", "normal");
        
        doc.setFontSize(9);
        doc.text(\`Hal. \${catIdx + 3} dari \${validCategories.length + 2}\`, 105, 285, { align: 'center' });
      });
      
      doc.save(generateExportFilename("Hasil Lomba LKBB", "pdf"));
      showToast('Berhasil mengekspor hasil lomba', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor hasil lomba', 'error');
    }
  };`;

// Replace the existing exportHasilLomba function
let newContent = content.replace(
  /const exportHasilLomba = async \(\) => \{[\s\S]*?(?=const exportToXLSX = async \(\) => \{)/,
  newExportHasilLomba + '\n\n  '
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', newContent);
