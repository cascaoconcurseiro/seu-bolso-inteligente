const https = require('https');
const fs = require('fs');
const path = require('path');

const BRANDS_DIR = path.join(__dirname, '..', 'public', 'card-brands');
if (!fs.existsSync(BRANDS_DIR)) {
  fs.mkdirSync(BRANDS_DIR, { recursive: true });
}

// URLs públicas dos logos das bandeiras (SVG/PNG de alta qualidade)
const cardBrands = {
  'visa': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg',
  'mastercard': 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg',
  'elo': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Elo_card_association_logo.svg',
  'amex': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg',
  'hipercard': 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Hipercard_logo.svg',
  'diners': 'https://upload.wikimedia.org/wikipedia/commons/6/65/Diners_Club_Logo3.svg',
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    
    protocol.get(url, (res) => {
      // Seguir redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, filepath).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`Status ${res.statusCode}`));
        return;
      }
      
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
  console.log('🎴 Baixando logos de bandeiras de cartão...\n');
  
  let downloaded = 0;
  const total = Object.keys(cardBrands).length;
  
  for (const [brand, url] of Object.entries(cardBrands)) {
    const ext = url.endsWith('.svg') ? '.svg' : '.png';
    const filepath = path.join(BRANDS_DIR, brand + ext);
    
    try {
      await downloadFile(url, filepath);
      downloaded++;
      console.log(`✅ ${downloaded}/${total} - ${brand}`);
    } catch (err) {
      console.log(`❌ Erro ao baixar ${brand}: ${err.message}`);
    }
  }
  
  console.log(`\n🎉 Download concluído! ${downloaded} bandeiras salvas em: ${BRANDS_DIR}`);
  
  // Criar índice
  const index = Object.keys(cardBrands).map(brand => ({
    name: brand,
    filename: brand + (cardBrands[brand].endsWith('.svg') ? '.svg' : '.png')
  }));
  
  fs.writeFileSync(
    path.join(BRANDS_DIR, 'index.json'),
    JSON.stringify(index, null, 2)
  );
}

main();
