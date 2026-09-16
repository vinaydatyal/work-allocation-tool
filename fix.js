
const fs = require('fs');
let code = fs.readFileSync('src/components/VisualAgencyHub.tsx', 'utf-8');
let lines = code.split('\n');
lines.splice(2703, 0, '            </div>');
fs.writeFileSync('src/components/VisualAgencyHub.tsx', lines.join('\n'));

