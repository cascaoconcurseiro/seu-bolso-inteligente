import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const versionFilePath = path.join(publicDir, 'version.json');

// Garantir que a pasta public exista
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const versionData = {
  version: "1.0.0",
  buildTimestamp: Date.now()
};

fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2), 'utf-8');
console.log(`✅ Arquivo version.json gerado com sucesso em public/! Timestamp: ${versionData.buildTimestamp}`);
