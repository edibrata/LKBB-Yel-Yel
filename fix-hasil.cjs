const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

const exportHasilLombaImplementation = `  const exportHasilLomba = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      if (participants.length === 0) {
        showToast('Belum ada data peserta', 'error');
        return;
      }
      
      let hasPage = false;
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const today = new Date();
      const dateStr = \`\${today.getDate()} \${monthNames[today.getMonth()]} \${today.getFullYear()}\`;
      const dayStr = dayNames[today.getDay()];
      
      const uniqueJudges = appUsers.filter(u => u.role === 'judge').slice(0, 2);
      const juri1Name = uniqueJudges.length > 0 ? uniqueJudges[0].name : ".........................";
      const juri2Name = uniqueJudges.length > 1 ? uniqueJudges[1].name : ".........................";

      CATEGORIES.forEach((category) => {
        const catGroup = groupedScores.find(g => g.category === category);
        if (!catGroup || catGroup.participants.length === 0) return;
        
        if (hasPage) doc.addPage();
        hasPage = true;
        
        // --- HALAMAN BERITA ACARA ---
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("BERITA ACARA PENETAPAN HASIL LOMBA", 105, 30, { align: 'center' });
        doc.text("LKBB DAN YEL-YEL", 105, 37, { align: 'center' });
        doc.text(\`KATEGORI \${category.toUpperCase()}\`, 105, 44, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        
        const baText = \`Pada hari ini \${dayStr}, tanggal \${today.getDate()} bulan \${monthNames[today.getMonth()]} tahun \${today.getFullYear()}, telah dilaksanakan rekapitulasi nilai Lomba Ketangkasan Baris Berbaris (LKBB) dan Yel-Yel untuk kategori \${category}.\\n\\nBerdasarkan akumulasi penilaian dari para juri, maka ditetapkan daftar peringkat/juara sebagaimana terlampir yang merupakan bagian tidak terpisahkan dari Berita Acara ini.\\n\\nDemikian Berita Acara ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.\`;
        
        const splitText = doc.splitTextToSize(baText, 170);
        doc.text(splitText, 20, 65);
        
        doc.text(\`Serang, \${dateStr}\`, 140, 110);
        
        // Signatures on Berita Acara
        // Row 1
        doc.text("Ketua Kwarran,", 35, 125, { align: 'center' });
        doc.text("( Mulyadi )", 35, 150, { align: 'center' });
        
        doc.text("Koordinator Kegiatan,", 175, 125, { align: 'center' });
        doc.text("( Deden Sanarudin )", 175, 150, { align: 'center' });
        
        // Row 2
        doc.text("Koordinator LKBB dan Yel-Yel,", 105, 170, { align: 'center' });
        doc.text("( Edi Brata, M.Pd. )", 105, 195, { align: 'center' });
        
        // Row 3 (Juri)
        doc.text("Juri 1,", 55, 215, { align: 'center' });
        doc.text(\`( \${juri1Name} )\`, 55, 240, { align: 'center' });
        
        doc.text("Juri 2,", 155, 215, { align: 'center' });
        doc.text(\`( \${juri2Name} )\`, 155, 240, { align: 'center' });
        
        // --- HALAMAN LAMPIRAN ---
        doc.addPage();
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("LAMPIRAN: REKAPITULASI HASIL LOMBA", 105, 15, { align: 'center' });
        doc.text("LKBB DAN YEL-YEL", 105, 21, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(\`Kategori: \${category}\`, 14, 30);
        
        const tableData = [];
        catGroup.participants.forEach((p, index) => {
          tableData.push([
            p.rank !== '-' ? p.rank : '-',
            p.number,
            p.name,
            Number.isInteger(p.juri1Total) ? p.juri1Total : p.juri1Total.toFixed(2),
            Number.isInteger(p.juri2Total) ? p.juri2Total : p.juri2Total.toFixed(2),
            p.totalPenalty > 0 ? \`-\${p.totalPenalty.toFixed(2)}\` : '-',
            Number.isInteger(p.grandTotal) ? p.grandTotal : p.grandTotal.toFixed(2),
            p.isDisqualified ? p.disqualificationReason || 'Diskualifikasi' : (p.rank !== '-' ? \`Juara \${p.rank}\` : '-')
          ]);
        });
        
        autoTable(doc, {
          startY: 35,
          head: [['Rank', 'No', 'Pangkalan / Regu', 'Juri 1', 'Juri 2', 'Penalti', 'Nilai Akhir', 'Keterangan']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 55 },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 18, halign: 'center', textColor: [200, 0, 0] },
            6: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 26 }
          },
          styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: [200, 200, 200] },
          margin: { left: 14, right: 14 },
          didDrawPage: (data) => {
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
            const footerY = pageHeight - 15;
            
            doc.setDrawColor(200, 200, 200);
            doc.setLineWidth(0.5);
            doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(120, 120, 120);
            
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const timeStr = \`\${now.getFullYear()}\${pad(now.getMonth() + 1)}\${pad(now.getDate())} \${pad(now.getHours())}.\${pad(now.getMinutes())}.\${pad(now.getSeconds())}\`;
            
            doc.text(timeStr, 14, footerY);
            
            const pageStr = \`Hal. \${data.pageNumber} dari \${doc.internal.getNumberOfPages()}\`;
            doc.text(pageStr, pageWidth / 2, footerY, { align: 'center' });
            
            doc.text(\`Kategori: \${category}\`, pageWidth - 14, footerY, { align: 'right' });
          }
        });
        
        // Signatures on Lampiran (under table)
        let finalY = doc.lastAutoTable.finalY + 15;
        if (finalY > 250) {
            doc.addPage();
            finalY = 30;
        }
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text("Koordinator", 160, finalY, { align: 'center' });
        doc.text("LKBB dan Yel-Yel,", 160, finalY + 5, { align: 'center' });
        doc.text("Edi Brata, M.Pd.", 160, finalY + 25, { align: 'center' });
        
      });
      
      if (!hasPage) {
        showToast('Belum ada data nilai untuk diekspor', 'error');
        return;
      }
      
      doc.save(generateExportFilename("Berita Acara dan Hasil Lomba LKBB", "pdf"));
      showToast('Berhasil mengekspor hasil lomba', 'success');
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor hasil lomba', 'error');
    }
  };`;

const exportToXLSXImplementation = `  const exportToXLSX = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      let hasData = false;
      CATEGORIES.forEach(category => {
        const catGroup = groupedScores.find(g => g.category === category);
        if (!catGroup || catGroup.participants.length === 0) return;
        
        hasData = true;
        const worksheet = workbook.addWorksheet(category.substring(0, 31).replace(/[\\\\/*?:\\[\\]]/g, ''));
        
        worksheet.columns = [
          { header: 'Rank', key: 'rank', width: 8 },
          { header: 'No. Undian', key: 'number', width: 12 },
          { header: 'Pangkalan / Regu', key: 'name', width: 40 },
          { header: 'Juri 1', key: 'juri1', width: 12 },
          { header: 'Juri 2', key: 'juri2', width: 12 },
          { header: 'Penalti', key: 'penalty', width: 12 },
          { header: 'Nilai Akhir', key: 'final', width: 15 },
          { header: 'Keterangan', key: 'status', width: 25 },
        ];
        
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        
        catGroup.participants.forEach((p, idx) => {
          worksheet.addRow({
            rank: p.rank !== '-' ? p.rank : '-',
            number: p.number,
            name: p.name,
            juri1: p.juri1Total,
            juri2: p.juri2Total,
            penalty: p.totalPenalty > 0 ? -p.totalPenalty : 0,
            final: p.grandTotal,
            status: p.isDisqualified ? p.disqualificationReason || 'Diskualifikasi' : (p.rank !== '-' ? \`Juara \${p.rank}\` : '-')
          });
        });
        
        worksheet.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
            cell.border = {
              top: {style:'thin'},
              left: {style:'thin'},
              bottom: {style:'thin'},
              right: {style:'thin'}
            };
          });
        });
      });
      
      if (!hasData) {
        showToast('Belum ada data nilai untuk diekspor', 'error');
        return;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", generateExportFilename("Rekap Hasil Lomba LKBB", "xlsx"));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(err) {
      console.error(err);
      showToast('Gagal mengekspor hasil lomba', 'error');
    }
  };`;

// replace exportHasilLomba
let newContent = content.replace(
  /const exportHasilLomba = async \(\) => \{[\s\S]*?(?=const exportToXLSX = async \(\) => \{)/,
  exportHasilLombaImplementation + '\n\n  '
);

newContent = newContent.replace(
  /const exportToXLSX = async \(\) => \{[\s\S]*?(?=const exportFullRealDataExcel = async \(\) => \{)/,
  exportToXLSXImplementation + '\n\n  '
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', newContent);
