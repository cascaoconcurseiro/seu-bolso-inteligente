const https = require('https');
const fs = require('fs');
const path = require('path');

// Diretórios
const CARD_BRANDS_DIR = path.join(__dirname, '..', 'public', 'card-brands');
const BANK_LOGOS_DIR = path.join(__dirname, '..', 'public', 'bank-logos-all');

// Criar diretórios se não existirem
[CARD_BRANDS_DIR, BANK_LOGOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Bandeiras de cartão (URLs de CDNs públicas)
const CARD_BRANDS = {
  'visa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png',
  'mastercard': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png',
  'elo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Elo_card_association_logo.svg/1280px-Elo_card_association_logo.svg.png',
  'american-express': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/1280px-American_Express_logo_%282018%29.svg.png',
  'diners': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Diners_Club_Logo3.svg/1280px-Diners_Club_Logo3.svg.png',
  'hipercard': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Hipercard_logo.svg/1280px-Hipercard_logo.svg.png',
  'discover': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Discover_Card_logo.svg/1280px-Discover_Card_logo.svg.png',
  'jcb': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/JCB_logo.svg/1280px-JCB_logo.svg.png',
  'aura': 'https://logodownload.org/wp-content/uploads/2020/02/aura-logo.png',
};

// Bancos que faltam (URLs de logos oficiais ou Wikipedia)
const MISSING_BANKS = {
  'bradesco': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Bradesco_logo.svg/1280px-Bradesco_logo.svg.png',
  'hsbc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/HSBC_logo_%282018%29.svg/1280px-HSBC_logo_%282018%29.svg.png',
  'citibank': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Citi.svg/1280px-Citi.svg.png',
  'banco-votorantim': 'https://logodownload.org/wp-content/uploads/2020/02/banco-votorantim-logo.png',
  'banco-pine': 'https://logodownload.org/wp-content/uploads/2020/02/banco-pine-logo.png',
  'banco-rendimento': 'https://logodownload.org/wp-content/uploads/2020/02/banco-rendimento-logo.png',
  'banco-sofisa': 'https://logodownload.org/wp-content/uploads/2020/02/banco-sofisa-logo.png',
  'banco-fibra': 'https://logodownload.org/wp-content/uploads/2020/02/banco-fibra-logo.png',
  'banco-industrial': 'https://logodownload.org/wp-content/uploads/2020/02/banco-industrial-logo.png',
  'banco-abc': 'https://logodownload.org/wp-content/uploads/2020/02/banco-abc-brasil-logo.png',
  'banco-modal': 'https://logodownload.org/wp-content/uploads/2020/02/banco-modal-logo.png',
  'banco-bs2': 'https://logodownload.org/wp-content/uploads/2020/02/banco-bs2-logo.png',
  'banco-topazio': 'https://logodownload.org/wp-content/uploads/2020/02/banco-topazio-logo.png',
  'banco-master': 'https://logodownload.org/wp-content/uploads/2020/02/banco-master-logo.png',
  'banco-paulista': 'https://logodownload.org/wp-content/uploads/2020/02/banco-paulista-logo.png',
  'banco-indusval': 'https://logodownload.org/wp-content/uploads/2020/02/banco-indusval-logo.png',
  'banco-banese': 'https://logodownload.org/wp-content/uploads/2020/02/banco-banese-logo.png',
  'banco-banestes': 'https://logodownload.org/wp-content/uploads/2020/02/banco-banestes-logo.png',
  'banco-banpara': 'https://logodownload.org/wp-content/uploads/2020/02/banco-banpara-logo.png',
  'banco-banese': 'https://logodownload.org/wp-content/uploads/2020/02/banco-banese-logo.png',
};

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
        reject(new Error(`Status ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function downloadAll() {
  console.log('🎴 Baixando bandeiras de cartão...\n');
  
  let downloaded = 0;
  let failed = 0;
  
  // Baixar bandeiras de cartão
  for (const [name, url] of Object.entries(CARD_BRANDS)) {
    const filepath = path.join(CARD_BRANDS_DIR, `${name}.png`);
    
    try {
      await downloadImage(url, filepath);
      downloaded++;
      console.log(`  ✅ ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ❌ ${name}: ${err.message}`);
    }
  }
  
  console.log(`\n🏦 Baixando logos de bancos que faltam...\n`);
  
  // Baixar bancos que faltam
  for (const [name, url] of Object.entries(MISSING_BANKS)) {
    const filepath = path.join(BANK_LOGOS_DIR, `${name}.png`);
    
    // Pular se já existe
    if (fs.existsSync(filepath)) {
      console.log(`  ⏭️  ${name} (já existe)`);
      continue;
    }
    
    try {
      await downloadImage(url, filepath);
      downloaded++;
      console.log(`  ✅ ${name}`);
    } catch (err) {
      failed++;
      console.log(`  ❌ ${name}: ${err.message}`);
    }
  }
  
  console.log(`\n🎉 Concluído!`);
  console.log(`   ✅ ${downloaded} logos baixadas`);
  console.log(`   ❌ ${failed} falharam`);
  
  // Criar índices JSON
  const cardBrandsIndex = Object.keys(CARD_BRANDS)
    .filter(name => fs.existsSync(path.join(CARD_BRANDS_DIR, `${name}.png`)))
    .map(name => ({
      name,
      filename: `${name}.png`,
      displayName: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }));
  
  fs.writeFileSync(
    path.join(CARD_BRANDS_DIR, 'index.json'),
    JSON.stringify(cardBrandsIndex, null, 2)
  );
  
  console.log(`\n📋 Índices criados`);
  console.log(`   🎴 ${cardBrandsIndex.length} bandeiras de cartão`);
}

downloadAll().catch(console.error);
