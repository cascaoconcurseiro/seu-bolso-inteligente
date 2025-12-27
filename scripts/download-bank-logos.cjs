const https = require('https');
const fs = require('fs');
const path = require('path');

// Token do Figma do arquivo .env
const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN || 'your_figma_token_here';
const FILE_KEY = 'L5GXVGy8GZrXTow73pl826';

// Criar pasta para os logos
const LOGOS_DIR = path.join(__dirname, '..', 'public', 'bank-logos');
if (!fs.existsSync(LOGOS_DIR)) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const fileStream = fs.createWriteStream(filepath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  try {
    console.log('🔍 Buscando informações do arquivo Figma...');
    
    // Buscar estrutura do arquivo
    const fileData = await makeRequest(`https://api.figma.com/v1/files/${FILE_KEY}`);
    
    console.log(`📄 Arquivo: ${fileData.name}`);
    console.log('🔎 Procurando componentes de logos...\n');
    
    // Encontrar todos os componentes (logos)
    const components = [];
    
    function findComponents(node) {
      if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        components.push({
          id: node.id,
          name: node.name
        });
      }
      if (node.children) {
        node.children.forEach(findComponents);
      }
    }
    
    fileData.document.children.forEach(findComponents);
    
    console.log(`✅ Encontrados ${components.length} componentes\n`);
    
    if (components.length === 0) {
      console.log('❌ Nenhum componente encontrado. Tentando buscar todos os nós...');
      return;
    }
    
    // Buscar URLs das imagens
    const nodeIds = components.map(c => c.id).join(',');
    console.log('📥 Baixando URLs das imagens...');
    
    const imagesData = await makeRequest(
      `https://api.figma.com/v1/images/${FILE_KEY}?ids=${nodeIds}&format=png&scale=2`
    );
    
    if (!imagesData.images || Object.keys(imagesData.images).length === 0) {
      console.log('❌ Nenhuma imagem disponível para download');
      return;
    }
    
    console.log(`\n🎨 Baixando ${Object.keys(imagesData.images).length} logos...\n`);
    
    // Baixar cada logo
    let downloaded = 0;
    for (const component of components) {
      const imageUrl = imagesData.images[component.id];
      if (imageUrl) {
        const filename = component.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '.png';
        
        const filepath = path.join(LOGOS_DIR, filename);
        
        try {
          await downloadImage(imageUrl, filepath);
          downloaded++;
          console.log(`✅ ${downloaded}/${components.length} - ${component.name} → ${filename}`);
        } catch (err) {
          console.log(`❌ Erro ao baixar ${component.name}: ${err.message}`);
        }
      }
    }
    
    console.log(`\n🎉 Download concluído! ${downloaded} logos salvos em: ${LOGOS_DIR}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
