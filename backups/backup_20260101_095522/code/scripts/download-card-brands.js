// Script para baixar/atualizar bandeiras de cartão em alta qualidade
// Uso: node scripts/download-card-brands.js

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'card-brands');

// URLs públicas de logos de bandeiras (SVG/PNG de alta qualidade)
const cardBrandUrls = {
  'visa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png',
  'mastercard': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png',
  'american-express': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png',
  'elo': 'https://logodownload.org/wp-content/uploads/2017/04/elo-logo-1.png',
  'diners': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Diners_Club_Logo3.svg/1200px-Diners_Club_Logo3.svg.png',
  'discover': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Discover_Card_logo.svg/1200px-Discover_Card_logo.svg.png',
  'jcb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/JCB_logo.svg/1200px-JCB_logo.svg.png',
  'hipercard': 'https://logodownload.org/wp-content/uploads/2018/05/hipercard-logo-1.png',
  'aura': 'https://logodownload.org/wp-content/uploads/2020/04/aura-logo-1.png',
};

// Função para baixar imagem
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      // Seguir redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadImage(response.headers.location, filepath)
          .then(resolve)
          .catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Função principal
async function main() {
  console.log('🎴 Atualizando bandeiras de cartão...\n');

  // Criar diretório se não existir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  for (const [brand, url] of Object.entries(cardBrandUrls)) {
    const filepath = path.join(OUTPUT_DIR, `${brand}.png`);
    
    // Verificar se já existe
    if (fs.existsSync(filepath)) {
      console.log(`  ⏭️  ${brand}.png (já existe)`);
      skipped++;
      continue;
    }

    try {
      console.log(`  ⬇️  Baixando ${brand}...`);
      await downloadImage(url, filepath);
      console.log(`  ✅ ${brand}.png`);
      downloaded++;
      
      // Delay entre downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.log(`  ❌ Erro ao baixar ${brand}: ${err.message}`);
      failed++;
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO');
  console.log('='.repeat(50));
  console.log(`✅ Bandeiras baixadas: ${downloaded}`);
  console.log(`⏭️  Bandeiras já existentes: ${skipped}`);
  console.log(`❌ Falhas: ${failed}`);
  console.log(`📁 Pasta: ${OUTPUT_DIR}`);
  console.log('='.repeat(50) + '\n');

  if (downloaded > 0) {
    console.log('🎉 Atualização concluída!');
  } else if (skipped > 0) {
    console.log('✅ Todas as bandeiras já estão disponíveis!');
  } else {
    console.log('⚠️  Nenhuma bandeira foi baixada.');
  }
}

// Executar
main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
