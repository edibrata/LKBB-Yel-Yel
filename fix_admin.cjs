const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');

// 1. Fix Modal Name for Reset Modal
code = code.replace(
  /Apakah Anda yakin ingin menghapus nilai untuk regu <strong>\{participantToReset\.name\}<\/strong>\? Tindakan ini tidak dapat dibatalkan\./,
  `Apakah Anda yakin ingin menghapus nilai untuk peserta <strong>No. {participantToReset.number}</strong>? Tindakan ini tidak dapat dibatalkan.`
);

// 2. Fix the "Reset Nilai" button condition.
// Current logic in UI prevents reset if grandTotal is 0:
// if (p.grandTotal > 0) { setParticipantToReset(p); } else { handleShowLocalToast('Regu ini belum memiliki nilai', e); }
// We want to allow reset if ANY score is present, or just allow it unconditionally because if it's 0, resetting does no harm.
// Let's change the condition to allow reset if p has any criteria scores or total score.

code = code.replace(
  /if \(p\.grandTotal > 0\) \{\s*setParticipantToReset\(p\);\s*\} else \{\s*handleShowLocalToast\('Regu ini belum memiliki nilai', e\);\s*\}/,
  `// Allow resetting as long as there is some juri total (or disqualified state)
                                        if (p.juri1Total > 0 || p.juri2Total > 0 || p.isDisqualified) {
                                          setParticipantToReset(p);
                                        } else {
                                          handleShowLocalToast('Regu ini belum memiliki nilai', e);
                                        }`
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
console.log("Admin Dashboard fixed.");
