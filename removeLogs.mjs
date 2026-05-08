import fs from 'fs';

const filePath = 'src/pages/SharedExpenses.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Regex para remover console.log().
// Pode não pegar casos muito complexos, mas vai pegar a maioria
const beforeLength = content.length;
content = content.replace(/^[ \t]*console\.log\([^;]*\);?[ \t]*\n/gm, '');

// Alguns console.logs quebram linha ou não estão no começo da linha, vamos tentar uma abordagem AST ou regex melhor se precisar, 
// Mas esta simples já deve limpar muito:
// content = content.replace(/console\.log\([\s\S]*?\);?/g, '');
// Isso seria perigoso pois pode casar coisa errada.

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Log cleaner finished. Original length: ${beforeLength}, New length: ${content.length}`);
