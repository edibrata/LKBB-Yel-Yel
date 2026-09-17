const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

const modalCode = `
    {!hasStarted && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 ml-1" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Mulai Penilaian</h2>
          <p className="text-sm text-slate-500 mb-6">
            Peserta <strong>{participant?.name}</strong>. Pastikan regu sudah bersiap di lapangan sebelum memulai timer.
          </p>
          <Button 
            size="lg" 
            className="w-full text-base h-12 bg-blue-600 hover:bg-blue-700 font-bold"
            onClick={() => {
              setHasStarted(true);
              if (!isTimerRunning && timerSeconds === 0) {
                setIsTimerRunning(true);
              }
            }}
          >
            Aktifkan Timer & Mulai
          </Button>
        </div>
      </div>
    )}
`;

code = code.replace(
  /<div className="min-h-screen bg-slate-50 pb-24 relative">/,
  `<div className="min-h-screen bg-slate-50 pb-24 relative">${modalCode}`
);

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
console.log("Modal added");
