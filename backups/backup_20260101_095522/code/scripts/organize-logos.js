// Script para organizar logos existentes
// Uso: node scripts/organize-logos.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.join(__dirname, '..', 'public', 'bank-logos-all');
const TARGET_DIR = path.join(__dirname, '..', 'public', 'bank-logos');

// Mapeamento de nomes (ID do banco → padrões de busca)
const bankMapping = {
  'nubank': ['nubank'],
  'inter': ['inter'],
  'itau-unibanco': ['ita-unibanco', 'itau'],
  'banco-do-brasil': ['banco-do-brasil'],
  'caixa-economica-federal': ['caixa-econ-mica-federal', 'caixa'],
  'santander-brasil': ['santander-brasil', 'santander'],
  'bradesco': ['bradesco'],
  'btg-pactual': ['btg-pactual'],
  'banco-safra': ['banco-safra', 'safra'],
  'picpay': ['picpay'],
  'mercado-pago': ['mercado-pago'],
  'neon': ['neon'],
  'c6-bank': ['c6-bank'],
  'pagbank': ['pagbank'],
  'stone': ['stone'],
  'iti': ['iti'],
  'banco-pan': ['banco-pan'],
  'banco-bv': ['banco-bv'],
  'banco-original': ['banco-original'],
  'banco-next': ['banco-next'],
  'banrisul': ['banco-do-estado-do-rio-grande-do-sul-banrisul', 'banrisul'],
  'brb': ['banco-de-bras-lia-brb', 'banco-brb'],
  'banco-do-nordeste': ['banco-do-nordeste-bnb', 'bnb'],
  'parana-banco': ['paran-banco'],
  'banco-daycoval': ['banco-daycoval'],
  'banco-bmg': ['banco-bmg'],
  'banco-mercantil': ['banco-mercantil'],
  'agibank': ['agibank'],
  'sicoob': ['sistema-de-cooperativas-de-cr-dito-do-brasil-sicoob', 'sicoob'],
  'sicredi': ['sistema-de-cr-dito-cooperativo-sicredi', 'sicredi'],
  'genial': ['genial'],
  'banco-alfa': ['banco-alfa'],
  'banco-bs2': ['banco-bs2'],
  'banco-fibra': ['banco-fibra'],
  'banco-modal': ['banco-modal'],
  'banco-paulista': ['banco-paulista'],
  'banco-pine': ['banco-pine'],
  'banco-rendimento': ['banco-rendimento'],
  'banco-sofisa': ['banco-sofisa'],
  'banco-topazio': ['banco-topazio'],
  'banco-votorantim': ['banco-votorantim'],
  'citibank': ['citibank'],
  'hsbc': ['hsbc'],
  'banco-banese': ['banco-banese'],
  'banco-banestes': ['banco-banestes'],
  'banco-banpara': ['banco-banpara'],
  'banco-industrial': ['banco-industrial'],
  'banco-indusval': ['banco-indusval'],
  'banco-master': ['banco-master'],
  'bndes': ['banco-nacional-de-desenvolvimento-econ-mico-e-social-bndes', 'bndes'],
  'banco-abc': ['banco-abc'],
  'ef-bank': ['ef-bank'],
};

console.log('🚀 Organizando logos dos bancos...\n');

// Criar diretório de destino se não existir
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  console.log(`📁 Criado diretório: ${TARGET_DIR}\n`);
}

// Verificar se diretório de origem existe
if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`❌ Diretório de origem não encontrado: ${SOURCE_DIR}`);
  process.exit(1);
}

let copied = 0;
let notFound = 0;

// Processar cada banco
for (const [targetName, sourcePatterns] of Object.entries(bankMapping)) {
  const targetPath = path.join(TARGET_DIR, `${targetName}.png`);
  
  // Procurar arquivo correspondente
  let found = false;
  for (const pattern of sourcePatterns) {
    const files = fs.readdirSync(SOURCE_DIR);
    const matchingFile = files.find(f => 
      f.toLowerCase().includes(pattern.toLowerCase()) && f.endsWith('.png')
    );
    
    if (matchingFile) {
      const sourcePath = path.join(SOURCE_DIR, matchingFile);
      
      try {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`✅ ${targetName}.png (de ${matchingFile})`);
        copied++;
        found = true;
        break;
      } catch (err) {
        console.log(`❌ Erro ao copiar ${targetName}: ${err.message}`);
      }
    }
  }
  
  if (!found) {
    console.log(`⚠️  ${targetName}.png não encontrado`);
    notFound++;
  }
}

// Resumo
console.log('\n' + '='.repeat(50));
console.log('📊 RESUMO');
console.log('='.repeat(50));
console.log(`✅ Logos copiadas: ${copied}`);
console.log(`⚠️  Logos não encontradas: ${notFound}`);
console.log(`📁 Pasta de destino: ${TARGET_DIR}`);
console.log('='.repeat(50) + '\n');

if (copied > 0) {
  console.log('🎉 Organização concluída com sucesso!');
  console.log('\n💡 Próximos passos:');
  console.log('1. Verifique as logos em: public/bank-logos/');
  console.log('2. Inicie o servidor: npm run dev');
  console.log('3. Teste se as logos aparecem no sistema\n');
} else {
  console.log('⚠️  Nenhuma logo foi copiada.');
  console.log('Verifique se a pasta public/bank-logos-all/ contém arquivos PNG.\n');
}
