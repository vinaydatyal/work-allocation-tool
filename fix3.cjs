
const fs = require('fs');
let code = fs.readFileSync('src/components/VisualAgencyHub.tsx', 'utf-8');
let lines = code.split('\n');
// Replace line 2701 (which is index 2700) with )}
lines[2700] = '            )}';
lines[2701] = '          </div>'; // replace 2702 (index 2701)
fs.writeFileSync('src/components/VisualAgencyHub.tsx', lines.join('\n'));

