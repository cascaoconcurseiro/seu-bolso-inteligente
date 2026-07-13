import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOTS = ['src', 'scripts', 'supabase'];
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.sql', '.ts', '.tsx']);
const FORBIDDEN_PATTERNS = [
  {
    name: 'numeric administrative password comparison',
    pattern: /admin_password\s*(?:!=|=|<>)\s*['"]\d{4,}['"]/gi,
  },
  {
    name: 'numeric administrative password assignment',
    pattern: /admin_password\s*:=\s*['"]\d{4,}['"]/gi,
  },
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return files.flat();
}

const findings = [];

for (const root of ROOTS) {
  const files = await listFiles(root);
  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(extname(file))) continue;
    const content = await readFile(file, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const { name, pattern } of FORBIDDEN_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of content.matchAll(pattern)) {
        const line = content.slice(0, match.index).split(/\r?\n/).length;
        findings.push(`${relative('.', file)}:${line}: ${name}: ${lines[line - 1].trim()}`);
      }
    }
  }
}

if (findings.length > 0) {
  console.error('Hardcoded secret patterns found:\n' + findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('No hardcoded administrative password patterns found.');
}
