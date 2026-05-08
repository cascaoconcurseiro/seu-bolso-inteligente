import fs from 'fs';

const data = JSON.parse(fs.readFileSync('eslint.json', 'utf8'));
const summary = {};

let totalErrors = 0;
let totalWarnings = 0;

data.forEach(file => {
  if (file.messages.length > 0) {
    const relativePath = file.filePath.replace(process.cwd(), '').replace(/\\/g, '/');
    summary[relativePath] = {};
    
    file.messages.forEach(msg => {
      const rule = msg.ruleId || 'syntax-error';
      if (!summary[relativePath][rule]) {
        summary[relativePath][rule] = 0;
      }
      summary[relativePath][rule]++;
      
      if (msg.severity === 2) totalErrors++;
      else totalWarnings++;
    });
  }
});

console.log(`Total Errors: ${totalErrors}`);
console.log(`Total Warnings: ${totalWarnings}`);
console.log('--- Top Files by Issue Count ---');

const sortedFiles = Object.entries(summary)
  .map(([path, rules]) => {
    const total = Object.values(rules).reduce((a, b) => a + b, 0);
    return { path, rules, total };
  })
  .sort((a, b) => b.total - a.total)
  .slice(0, 10);

sortedFiles.forEach(f => {
  console.log(`${f.path}: ${f.total} issues`);
  Object.entries(f.rules).forEach(([rule, count]) => {
    console.log(`  - ${rule}: ${count}`);
  });
});
