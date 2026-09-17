const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. Remove Tugas Juri logic from Create User Modal
content = content.replace(/<div className="pt-2 border-t">\s*<label className="text-sm font-medium text-slate-700 mb-2 block">Tugas Juri<\/label>\s*<div className="space-y-2 max-h-\[150px\] overflow-y-auto p-2 border rounded-md bg-slate-50 mb-4">\s*\{\[1, 2\]\.map\(pos => \(\s*<label key=\{pos\} className="flex items-center space-x-2">\s*<input\s*type="checkbox"\s*checked=\{newUserPosts\.includes\(pos\)\}\s*onChange=\{\(e\) => \{\s*if \(e\.target\.checked\) \{\s*setNewUserPosts\(\[...newUserPosts, pos\]\);\s*\} else \{\s*setNewUserPosts\(newUserPosts\.filter\(p => p !== pos\)\);\s*\}\s*\}\}\s*\/>\s*<span className="text-sm text-slate-700">Juri \{pos\}<\/span>\s*<\/label>\s*\)\)\}\s*<\/div>/, '');

// 2. Remove posToReset and related options
content = content.replace(/const \[posToReset, setPosToReset\] = useState<'all' \| 1 \| 2 \| 3>\('all'\);/g, 'const [judgeToReset, setJudgeToReset] = useState<string>(\'all\');');

content = content.replace(/<div className="mb-6">\s*<label className="text-sm font-medium text-slate-700 block mb-1">Pilih Juri yang Direset:<\/label>\s*<select\s*className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"\s*value=\{posToReset\}\s*onChange=\{\(e\) => setPosToReset\(e\.target\.value === 'all' \? 'all' : Number\(e\.target\.value\) as 1 \| 2 \| 3\)\}\s*>\s*<option value="all">Semua Juri<\/option>\s*<option value=\{1\}>Juri 1<\/option>\s*<option value=\{2\}>Juri 2<\/option>\s*<\/select>\s*<\/div>/g, 
  `<div className="mb-6">
    <label className="text-sm font-medium text-slate-700 block mb-1">Pilih Juri yang Direset:</label>
    <select
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      value={judgeToReset}
      onChange={(e) => setJudgeToReset(e.target.value)}
    >
      <option value="all">Semua Juri</option>
      {Array.from(new Set(scores.filter((s:any) => s.participantId === participantToReset?.id).map((s:any) => s.judgeName || s.judgeId))).map(jName => (
        <option key={jName as string} value={jName as string}>{jName as string}</option>
      ))}
    </select>
  </div>`);

// 3. Update handleResetParticipantScore logic
content = content.replace(/const scoresToDelete = posToReset === 'all'\s*\?\s*pScores\s*:\s*pScores\.filter\(\(score: any\) => score\.post === posToReset\);/g, 
  `const scoresToDelete = judgeToReset === 'all' 
    ? pScores 
    : pScores.filter((score: any) => (score.judgeName || score.judgeId) === judgeToReset);`);
content = content.replace(/setPosToReset\('all'\);/g, 'setJudgeToReset(\'all\');');

// 4. Update the detailed view (Participant Detail Modal) 
content = content.replace(/\{\[1, 2\]\.map\(post => \{\s*const pScore = scores\.find\(s => s\.participantId === participantForDetail\.id && s\.post === post\);/g, 
  `{scores.filter((s:any) => s.participantId === participantForDetail.id && !s.deletedAt).map((pScore: any) => {`);
content = content.replace(/<div key=\{post\} className="bg-white border rounded-lg overflow-hidden shadow-sm">/g, 
  `<div key={pScore.id} className="bg-white border rounded-lg overflow-hidden shadow-sm">`);
content = content.replace(/<span className="font-semibold text-slate-800 text-xs sm:text-sm">Juri \{post\}<\/span>/g, 
  `<span className="font-semibold text-slate-800 text-xs sm:text-sm">Juri: {pScore.judgeName || pScore.judgeId}</span>`);
content = content.replace(/SCORING_CRITERIA\[post as 1\|2\|3\]/g, 'FLAT_CRITERIA');

// 5. Update PDF Generation logic (this might be tricky, will do separately if needed)

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
