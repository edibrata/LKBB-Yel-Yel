const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /import \{ BrowserRouter as Router, Routes, Route, Navigate \} from 'react-router-dom';/g,
  `import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';`
);

fs.writeFileSync('src/App.tsx', code);
