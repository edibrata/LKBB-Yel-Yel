const fs = require('fs');
let code = fs.readFileSync('src/lib/constants.ts', 'utf-8');

// The newlines and redundant spaces are probably in the actual string. Let's sanitize them.
code = code.replace(/desc:\s*'([^']+)'/g, (match, p1) => {
    const cleaned = p1.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return `desc: '${cleaned}'`;
});

fs.writeFileSync('src/lib/constants.ts', code);
console.log('constants.ts cleaned');
