const fs = require('fs');
let code = fs.readFileSync('src/components/VisualAgencyHub.tsx', 'utf-8');
let lines = code.split('\n');
let divCount = 0;
let inProjects = false;
let out = [];
for (let i = 1540; i <= 2704; i++) {
  if (lines[i].includes("hubSubTab === 'projects'")) inProjects = true;
  if (inProjects) {
    let opens = (lines[i].match(/<div(\s|>)/g) || []).length;
    let closes = (lines[i].match(/<\/div>/g) || []).length;
    divCount += opens - closes;
    out.push(i + ':' + divCount + ' ' + lines[i].trim());
  }
}
fs.writeFileSync('divs.log', out.join('\n'));
