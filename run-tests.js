import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const suites = [
  { name: 'Error Handling', file: 'src/tests/errors.test.js' },
  { name: 'Cache Module', file: 'src/tests/cache.test.js' },
  { name: 'Contract Integration', file: 'src/tests/contract.test.js' },
];

console.log('\n+------------------------------------------+');
console.log('¦   Decentralized VPN — Test Suite         ¦');
console.log('+------------------------------------------+\n');

let totalPassed = 0;
let totalFailed = 0;

for (const suite of suites) {
  console.log(`+- ${suite.name} ${'-'.repeat(45 - suite.name.length)}`);
  const fullPath = path.join(__dirname, suite.file);
  try {
    execSync(`node "${fullPath}"`, { stdio: 'inherit' });
    totalPassed++;
  } catch (e) {
    totalFailed++;
  }
}

console.log('\n+------------------------------------------+');
console.log(`¦  TOTAL: ${totalPassed} passed, ${totalFailed} failed                          ¦`);
console.log('+------------------------------------------+\n');
