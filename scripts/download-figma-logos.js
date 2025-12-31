// Script para baixar logos do Figma
// Uso: node scripts/download-figma-logos.js

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || 'YOUR_FIGMA_TOKEN_HERE';
const FILE_KEY = 'PlaR6YeIs3ElRSx6NZeK7w';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'bank-logos');

// Criar diretório se não existir
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Função para fazer requisição HTTPS
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

// Função para baixar imagem
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
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

// Função para sanitizar nome de arquivo
function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Função principal
async function main() {
  console.log('🚀 Iniciando download das logos do Figma...\n');

  try {
    // 1. Buscar estrutura do arquivo
    console.log('📋 Buscando estrutura do arquivo...');
    const fileData = await httpsGet(
      `https://api.figma.com/v1/files/${FILE_KEY}`,
      { 'X-Figma-Token': FIGMA_TOKEN }
    );

    console.log(`✅ Arquivo encontrado: ${fileData.name}\n`);

    // 2. Encontrar todos os componentes/frames com logos
    console.log('🔍 Procurando logos...');
    const logoNodes = [];
    
    function findLogoNodes(node, depth = 0) {
      if (!node) return;
      
      // Procurar por frames/componentes que parecem ser logos
      if (node.type === 'COMPONENT' || node.type === 'FRAME' || node.type === 'INSTANCE') {
        const name = node.name.toLowerCase();
        // Filtrar apenas logos de bancos (ignorar outros elementos)
        if (name.includes('banco') || name.includes('bank') || 
            name.includes('nubank') || name.includes('inter') || 
            name.includes('itau') || name.includes('bradesco') ||
            name.includes('santander') || name.includes('caixa') ||
            name.includes('btg') || name.includes('safra') ||
            name.includes('pan') || name.includes('neon') ||
            name.includes('picpay') || name.includes('mercado') ||
            name.includes('stone') || name.includes('sicoob') ||
            name.includes('sicredi') || name.includes('banrisul') ||
            name.includes('bnb') || name.includes('daycoval') ||
            name.includes('bmg') || name.includes('mercantil') ||
            name.includes('genial') || name.includes('iti') ||
            name.includes('agibank') || name.includes('parana')) {
          logoNodes.push({
            id: node.id,
            name: node.name,
          });
        }
      }
      
      // Recursivamente procurar em filhos
      if (node.children) {
        node.children.forEach(child => findLogoNodes(child, depth + 1));
      }
    }

    fileData.document.children.forEach(page => {
      console.log(`  📄 Página: ${page.name}`);
      findLogoNodes(page);
    });

    console.log(`✅ Encontradas ${logoNodes.length} logos\n`);

    if (logoNodes.length === 0) {
      console.log('⚠️  Nenhuma logo encontrada. Verifique o arquivo do Figma.');
      return;
    }

    // 3. Buscar URLs de exportação (em lotes para evitar rate limit)
    console.log('🔗 Gerando URLs de exportação...');
    const BATCH_SIZE = 10; // Baixar 10 por vez
    const DELAY_MS = 2000; // 2 segundos entre lotes
    
    let allImages = {};
    
    for (let i = 0; i < logoNodes.length; i += BATCH_SIZE) {
      const batch = logoNodes.slice(i, i + BATCH_SIZE);
      const nodeIds = batch.map(n => n.id).join(',');
      
      console.log(`  Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(logoNodes.length / BATCH_SIZE)}...`);
      
      try {
        const imagesData = await httpsGet(
          `https://api.figma.com/v1/images/${FILE_KEY}?ids=${nodeIds}&format=png&scale=2`,
          { 'X-Figma-Token': FIGMA_TOKEN }
        );

        if (imagesData.err) {
          console.log(`  ⚠️  Erro no lote: ${imagesData.err}`);
          continue;
        }

        allImages = { ...allImages, ...imagesData.images };
        
        // Delay entre lotes
        if (i + BATCH_SIZE < logoNodes.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (err) {
        console.log(`  ⚠️  Erro ao processar lote: ${err.message}`);
      }
    }

    console.log(`✅ URLs geradas para ${Object.keys(allImages).length} logos\n`);

    // 4. Baixar cada logo
    console.log('⬇️  Baixando logos...\n');
    let downloaded = 0;
    let failed = 0;

    for (const node of logoNodes) {
      const imageUrl = allImages[node.id];
      
      if (!imageUrl) {
        console.log(`  ⚠️  Sem URL para: ${node.name}`);
        failed++;
        continue;
      }

      const filename = sanitizeFilename(node.name) + '.png';
      const filepath = path.join(OUTPUT_DIR, filename);

      try {
        await downloadImage(imageUrl, filepath);
        console.log(`  ✅ ${filename}`);
        downloaded++;
        
        // Pequeno delay entre downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.log(`  ❌ Erro ao baixar ${filename}: ${err.message}`);
        failed++;
      }
    }

    // 5. Resumo
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO');
    console.log('='.repeat(50));
    console.log(`✅ Logos baixadas: ${downloaded}`);
    console.log(`❌ Falhas: ${failed}`);
    console.log(`📁 Pasta: ${OUTPUT_DIR}`);
    console.log('='.repeat(50) + '\n');

    if (downloaded > 0) {
      console.log('🎉 Download concluído com sucesso!');
    } else {
      console.log('⚠️  Nenhuma logo foi baixada.');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error('\nDetalhes:', error);
    process.exit(1);
  }
}

// Executar
main();
