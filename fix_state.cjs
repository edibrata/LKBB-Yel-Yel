const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

code = code.replace(
  /setScores\(\{ \.\.\.dbScores, \.\.\.cleanedDraftScores \}\);\s*setIsDirty\(true\);\s*\} catch \(e\) \{\s*setScores\(dbScores\);\s*\}\s*\} else \{\s*setScores\(dbScores\);\s*\}\s*setIsLoaded\(true\);/,
  `setScores({ ...dbScores, ...cleanedDraftScores });
          setIsDirty(true);
          if (Object.keys(dbScores).length > 0 || Object.keys(cleanedDraftScores).length > 0) setHasStarted(true);
        } catch (e) {
          setScores(dbScores);
          if (Object.keys(dbScores).length > 0) setHasStarted(true);
        }
      } else {
        setScores(dbScores);
        if (Object.keys(dbScores).length > 0) setHasStarted(true);
      }
      setIsLoaded(true);`
);

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
console.log("State updated");
