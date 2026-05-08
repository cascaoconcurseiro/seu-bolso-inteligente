import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
let fixedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const originalLength = content.length;
    
    // Replace typical `: any` and `?: any` with `unknown` safely
    // Not replacing `any` in generic types or complex definitions to be safe
    let newContent = content
        .replace(/:\s*any\b/g, ': unknown')
        .replace(/\?:\s*any\b/g, '?: unknown')
        .replace(/<any>/g, '<unknown>')
        .replace(/<any,\s*/g, '<unknown, ')
        .replace(/,\s*any>/g, ', unknown>')
        .replace(/as\s+any\b/g, 'as unknown');
        
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        fixedCount++;
        console.log(`Fixed any types in: ${file}`);
    }
});

console.log(`Finished fixing 'any' types in ${fixedCount} files.`);
