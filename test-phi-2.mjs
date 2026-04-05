import fs from 'fs';
const src = fs.readFileSync('./src/phiEngine.js', 'utf8');
const calculatePHIStr = src.replace('export function calculatePHI', 'function calculatePHI');

const dummyJobs = [
  { status: 'Won', total: 10000, labor: 1000, equip: 500, fromReqId: 'req1', date: '2026-04-01T00:00:00Z' },
  { status: 'In Review', date: '2026-03-01T00:00:00Z' }
];
const dummyReqs = [
  { id: 'req1', date: '2026-03-25T00:00:00Z' }
];
const dummyConfig = {
  blend_company: 80, blend_industry: 20
};

eval(calculatePHIStr + '\nconsole.log(calculatePHI(dummyJobs, dummyReqs, dummyConfig));');
