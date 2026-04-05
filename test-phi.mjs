import fs from 'fs';
const src = fs.readFileSync('./src/phiEngine.js', 'utf8');
const calculatePHIStr = src.replace('export function calculatePHI', 'function calculatePHI');
eval(calculatePHIStr + '\nconsole.log(calculatePHI([], [], {}));');
