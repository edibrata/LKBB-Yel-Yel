const fs = require('fs');
let code = fs.readFileSync('src/pages/JudgeScoring.tsx', 'utf-8');

// Strip out any weird prepended HTML that got added to the top
const reactImportIndex = code.indexOf("import { useEffect, useState, useRef } from 'react';");
if (reactImportIndex > 0) {
    code = code.substring(reactImportIndex);
}

fs.writeFileSync('src/pages/JudgeScoring.tsx', code);
