import fs from 'fs';

const filePath = 'src/pages/SharedExpenses.tsx';
let content = fs.readFileSync(filePath, 'utf8');

function removeConsoleLogs(str) {
    let result = str;
    while (true) {
        const index = result.indexOf('console.log(');
        if (index === -1) break;
        
        // Acha onde começou a linha do console.log
        let lineStart = index;
        while (lineStart > 0 && result[lineStart - 1] !== '\n') {
            lineStart--;
        }

        let i = index + 'console.log('.length;
        let openCount = 1;
        
        while (i < result.length && openCount > 0) {
            if (result[i] === '(') openCount++;
            else if (result[i] === ')') openCount--;
            i++;
        }
        
        // Pega ponto e vírgula se tiver
        if (i < result.length && result[i] === ';') {
            i++;
        }
        
        // Se a linha for só espaço, tira a linha inteira
        let hasCodeBefore = false;
        for(let j = lineStart; j < index; j++) {
            if (result[j] !== ' ' && result[j] !== '\t') {
                hasCodeBefore = true;
                break;
            }
        }
        
        let endIdx = i;
        if (!hasCodeBefore) {
            while (endIdx < result.length && (result[endIdx] === ' ' || result[endIdx] === '\t')) {
                endIdx++;
            }
            if (endIdx < result.length && result[endIdx] === '\n') {
                endIdx++;
            }
            result = result.slice(0, lineStart) + result.slice(endIdx);
        } else {
            result = result.slice(0, index) + result.slice(endIdx);
        }
    }
    return result;
}

const originalLength = content.length;
content = removeConsoleLogs(content);

if (content.length !== originalLength) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Logs removed. Original: ${originalLength}, New: ${content.length}`);
} else {
    console.log('No logs removed.');
}
