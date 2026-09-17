const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// The issue is in the logic for rendering the penalty badge in the UI:
// p.totalPenalty > 0 ? ( render badge ) : ...
// Wait, the PDF says "Penalti Waktu (Kelebihan: 109 dtk) -9.08" but in the UI it says "Aman".
// Let's check how the UI renders it.
// In the UI: {p.totalPenalty > 0 ? ( Badge ) : p.juri1Total > 0 || p.juri2Total > 0 ? ( Aman Badge ) : ...}
// If PDF says totalPenalty is 9.08, but UI says Aman (meaning p.totalPenalty is 0), then the data for PDF and UI might be diverging.

// Let's check how p.totalPenalty is calculated in groupedScores.
