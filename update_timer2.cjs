const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

// The internal state timerSeconds will still represent the actual elapsed seconds (starting at 0 and going up).
// This way we don't break the save logic or the penalty calculation which relies on elapsed seconds.
// We will just change HOW IT IS DISPLAYED.
// Target 300 seconds (5 minutes)

// We need to replace the formatTime function to handle the negative formatting and countdown
const formatTimeRegex = /const formatTime = \(seconds: number\) => {[\s\S]*?};/m;
const newFormatTime = `const formatTime = (elapsedSeconds: number) => {
    const remaining = 300 - elapsedSeconds;
    const isNegative = remaining < 0;
    const absRemaining = Math.abs(remaining);
    
    const m = Math.floor(absRemaining / 60);
    const s = absRemaining % 60;
    const formatted = \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
    
    return isNegative ? \`-\${formatted}\` : formatted;
  };`;

code = code.replace(formatTimeRegex, newFormatTime);

// Update the timer display UI
// We need to change the colors based on elapsed seconds
// 0 - 240 (5m to 1m): Blue/Black
// 241 - 299 (< 1m): Orange warning
// 300+ (0 or negative): Red pulse

const timerUIRegex = /<div className="flex items-center gap-2">\s*<div className={`text-2xl font-bold font-mono \${hasTimerReachedLimit \? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>\s*\{formatTime\(timerSeconds\)\}\s*<\/div>\s*\{hasTimerReachedLimit && <span className="text-xs font-bold text-red-600">OVERTIME<\/span>\}\s*<\/div>/m;
const newTimerUI = `<div className="flex flex-col items-center justify-center bg-slate-900 px-4 sm:px-6 py-2 rounded-xl shadow-inner border border-slate-700 w-28 sm:w-32">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Sisa Waktu</div>
            <div className={\`text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight leading-none \${
              timerSeconds >= 300 
                ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                : timerSeconds >= 240 
                  ? 'text-amber-400' 
                  : 'text-emerald-400'
            }\`}>
              {formatTime(timerSeconds)}
            </div>
          </div>`;

code = code.replace(timerUIRegex, newTimerUI);

// Make the header taller and more prominent to fit the big timer
const headerRegex = /<div className="max-w-3xl mx-auto p-3 sm:p-4 flex items-center justify-between w-full min-h-\[72px\]">/m;
const newHeader = `<div className="max-w-3xl mx-auto p-3 sm:p-4 flex items-center justify-between w-full bg-slate-800 text-white rounded-b-xl shadow-lg border-b-4 border-slate-900 mb-2 gap-2">`;
code = code.replace(headerRegex, newHeader);

// Update button styles in the header to look good on dark background
const buttonRegex = /<Button variant=\{isTimerRunning \? "outline" : "default"\} size="sm" onClick=\{toggleTimer\}>/m;
const newButton = `<Button variant={isTimerRunning ? "destructive" : "default"} size="sm" className={isTimerRunning ? "w-20 sm:w-24 font-bold" : "w-20 sm:w-24 font-bold bg-blue-600 hover:bg-blue-500 text-white"} onClick={toggleTimer}>`;
code = code.replace(buttonRegex, newButton);

const resetBtnRegex = /<Button variant="ghost" size="sm" onClick=\{resetTimer\} className="text-slate-500">/m;
const newResetBtn = `<Button variant="ghost" size="sm" onClick={resetTimer} className="text-slate-400 hover:text-white hover:bg-slate-700">`;
code = code.replace(resetBtnRegex, newResetBtn);

// We should also remove the old name display in the header since we made it a dark bar, let's keep it simple or restyle it
const nameDisplayRegex = /<div className="flex-1 min-w-0 px-2 sm:px-4 text-center">\s*<h2 className="font-bold text-slate-900 truncate">\s*\{participant\?.name || 'Loading...'\}\s*<\/h2>\s*<p className="text-xs text-slate-500 truncate">Juri \{post\} • \{participant\?.category\}\<\/p>\s*<\/div>/m;
const newNameDisplay = `<div className="flex-1 min-w-0 px-2 text-left">
            <h2 className="font-bold text-white text-base sm:text-lg truncate drop-shadow-sm leading-tight">
              {participant?.name || 'Loading...'}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="bg-slate-700 text-slate-300 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-medium">{participant?.category}</span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 whitespace-nowrap">Juri {post}</span>
            </div>
          </div>`;
code = code.replace(nameDisplayRegex, newNameDisplay);

// Replace back button color
code = code.replace(/<Button variant="ghost" size="icon" onClick=\{\(\) => {/m, '<Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700 shrink-0" onClick={() => {');

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
