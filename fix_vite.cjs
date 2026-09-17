const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf-8');

// For GitHub Pages, the base should usually match the repository name if it's a project site.
// If the repo is LKBB-Yel-Yel, the base should be /LKBB-Yel-Yel/.
// Alternatively, setting base to '' or './' works, but let's change it to match the repo name to be perfectly safe for Vite + GH Pages.

code = code.replace(
  /base: '\.\/',/,
  `base: '/LKBB-Yel-Yel/',`
);

fs.writeFileSync('vite.config.ts', code);
