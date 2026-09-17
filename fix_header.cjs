const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

const regex = /<header className="bg-white border-b sticky top-0 z-10 flex flex-col">[\s\S]*?<\/header>/m;

const newHeader = `<header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 flex flex-col shadow-md">
        {isDirty && (
          <div className="bg-amber-100 text-amber-800 px-4 py-1.5 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 border-b border-amber-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Ada nilai yang belum disimpan.</span>
          </div>
        )}
        <div className="max-w-3xl mx-auto px-2 py-2 flex items-center justify-between w-full gap-2 overflow-x-auto">
          {/* Left: Back + Info */}
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-800 shrink-0 h-8 w-8" onClick={() => {
              if (isDirty) {
                setIsConfirmingExit(true);
                return;
              }
              navigate('/judge');
            }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <Badge className="px-1.5 py-0 text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700">{participant?.number || '...'}</Badge>
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-[80px] sm:max-w-[120px]">{participant?.name || 'Loading'}</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">{participant?.category} • Juri {post}</p>
            </div>
          </div>
          
          {/* Right: Timer & Controls (Inline) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Timer Box */}
            <div className={\`flex items-center justify-center bg-slate-950 px-2.5 py-1 rounded-md shadow-inner border border-slate-800 min-w-[70px] \${
                hasTimerReachedLimit ? 'bg-red-950/40 border-red-900/50' : ''
            }\`}>
              <div className={\`text-lg sm:text-xl font-bold font-mono tabular-nums tracking-tight leading-none \${
                timerSeconds >= 300 
                  ? 'text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                  : timerSeconds >= 240 
                    ? 'text-amber-400' 
                    : 'text-emerald-400'
              }\`}>
                {formatTime(timerSeconds)}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1">
              <Button 
                variant={isTimerRunning ? "destructive" : "default"} 
                size="sm" 
                className={\`h-8 px-2 sm:px-3 text-xs font-bold \${!isTimerRunning ? "bg-blue-600 hover:bg-blue-500 text-white" : ""}\`} 
                onClick={toggleTimer}
              >
                {isTimerRunning ? 'Jeda' : (timerSeconds > 0 ? 'Lanjut' : 'Mulai')}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetTimer} 
                className="h-8 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      </header>`;

code = code.replace(regex, newHeader);
fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
