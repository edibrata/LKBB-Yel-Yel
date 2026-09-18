const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

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
            rank: idx + 1,
            number: p.participant.number,
            name: p.participant.name,
            juri1: p.juri1Total,
            juri2: p.juri2Total,
            penalty: p.totalPenalty > 0 ? -p.totalPenalty : 0,
            final: p.grandTotal,
            status: p.isDisqualified ? p.disqualificationReason || 'Diskualifikasi' : \`Juara \${idx + 1}\`
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

content = content.replace(
  /const exportToXLSX = async \(\) => \{\s+showToast\("Fitur ekspor XLSX dalam perbaikan\.", 'success'\);\s+\};/g,
  exportToXLSXImplementation
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
