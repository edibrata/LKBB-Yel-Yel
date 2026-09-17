const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf-8');

if (!code.includes('base:')) {
  code = code.replace(
    /export default defineConfig\(\(\) => \{\n\s*return \{/,
    `export default defineConfig(() => {\n  return {\n    base: './',`
  );
  fs.writeFileSync('vite.config.ts', code);
}
