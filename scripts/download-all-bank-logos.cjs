const https = require('https');
const fs = require('fs');
const path = require('path');

const FIGMA_TOKEN = process.env.FIGMA_ACCESS_TOKEN || 'your_figma_token_here';
const FILE_KEY = 'L5GXVGy8GZrXTow73pl826';

const LOGOS_DIR = path.join(__dirname, '..', 'public', 'bank-logos-all');
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

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function main() {
  try {
    console.log('🔍 Buscando arquivo Figma...\n');
    
    const fileData = await makeRequest(`https://api.figma.com/v1/files/${FILE_KEY}`);
    console.log(`📄 Arquivo: ${fileData.name}\n`);
    
    // Coletar TODOS os nós (frames, componentes, instâncias)
    const allNodes = new Map();
    
    function collectNodes(node, depth = 0) {
      // Pegar apenas nós que parecem ser logos de bancos
      if (node.name && !node.name.includes('Type=') && !node.name.includes('Background=') && 
          !node.name.includes('Property') && node.name !== 'Frame 1') {
        
        // Filtrar nós que são realmente bancos (não metadados)
        const isBankNode = node.type === 'COMPONENT' || 
                          node.type === 'INSTANCE' || 
                          node.type === 'FRAME' ||
                          node.type === 'GROUP';
        
        if (isBankNode && node.id) {
          const key = sanitizeFilename(node.name);
          // Evitar duplicatas, preferir componentes
          if (!allNodes.has(key) || node.type === 'COMPONENT') {
            allNodes.set(key, {
              id: node.id,
              name: node.name,
              type: node.type
            });
          }
        }
      }
      
      if (node.children) {
        node.children.forEach(child => collectNodes(child, depth + 1));
      }
    }
    
    fileData.document.children.forEach(page => collectNodes(page));
    
    console.log(`✅ Encontrados ${allNodes.size} logos únicos\n`);
    
    // Converter para array e processar em lotes
    const nodes = Array.from(allNodes.values());
    const BATCH_SIZE = 100; // API do Figma tem limite
    let downloaded = 0;
    
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE);
      const nodeIds = batch.map(n => n.id).join(',');
      
      console.log(`📥 Baixando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(nodes.length / BATCH_SIZE)}...`);
      
      try {
        const imagesData = await makeRequest(
          `https://api.figma.com/v1/images/${FILE_KEY}?ids=${nodeIds}&format=png&scale=2`
        );
        
        if (!imagesData.images) {
          console.log('⚠️  Nenhuma imagem neste lote');
          continue;
        }
        
        // Baixar cada imagem do lote
        for (const node of batch) {
          const imageUrl = imagesData.images[node.id];
          if (imageUrl) {
            const filename = sanitizeFilename(node.name) + '.png';
            const filepath = path.join(LOGOS_DIR, filename);
            
            try {
              await downloadImage(imageUrl, filepath);
              downloaded++;
              console.log(`  ✅ ${downloaded}/${nodes.length} - ${node.name}`);
            } catch (err) {
              console.log(`  ❌ Erro: ${node.name}`);
            }
          }
        }
        
        // Pequeno delay entre lotes para não sobrecarregar a API
        if (i + BATCH_SIZE < nodes.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (err) {
        console.log(`⚠️  Erro no lote: ${err.message}`);
      }
    }
    
    console.log(`\n🎉 Download concluído! ${downloaded} logos salvos em: ${LOGOS_DIR}`);
    
    // Criar índice JSON
    const index = nodes
      .filter(n => fs.existsSync(path.join(LOGOS_DIR, sanitizeFilename(n.name) + '.png')))
      .map(n => ({
        name: n.name,
        filename: sanitizeFilename(n.name) + '.png',
        type: n.type
      }));
    
    fs.writeFileSync(
      path.join(LOGOS_DIR, 'index.json'),
      JSON.stringify(index, null, 2)
    );
    
    console.log(`📋 Índice criado: ${index.length} logos catalogados`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
