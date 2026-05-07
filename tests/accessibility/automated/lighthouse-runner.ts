// TODO: case-study scaffold. Invoke Lighthouse CI and write JSON.
import { mkdirSync, writeFileSync } from 'fs'; mkdirSync('tests/accessibility/results',{recursive:true}); writeFileSync('tests/accessibility/results/scaffold-lighthouse.json', JSON.stringify({status:'scaffold',budget:'automated/lighthouse-budget.json'},null,2));
