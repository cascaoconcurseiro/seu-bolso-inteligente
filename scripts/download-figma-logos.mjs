#!/usr/bin/env node
/**
 * Script para baixar todos os logos de bancos do Figma
 * Arquivo: Brazilian Banks Logos (Community)
 * https://www.figma.com/design/Cn0hnUpjuWr62R2Toli3Tu/
 *
 * Como usar:
 *   1. Gere um Personal Access Token no Figma:
 *      Figma > Settings > Security > Personal access tokens
 *   2. Execute:
 *      FIGMA_TOKEN=seu_token node scripts/download-figma-logos.mjs
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIGMA_TOKEN = process.env.FIGMA_TOKEN;
const FILE_KEY = 'Cn0hnUpjuWr62R2Toli3Tu';
const OUTPUT_DIR = path.join(__dirname, '../public/banks');
const MAPPING_FILE = path.join(__dirname, '../src/utils/bankLogos.ts');

if (!FIGMA_TOKEN) {
  console.error('❌ FIGMA_TOKEN não definido.');
  console.error('   Execute: FIGMA_TOKEN=seu_token node scripts/download-figma-logos.mjs');
  console.error('\n   Gere o token em: Figma > Settings > Security > Personal access tokens');
  process.exit(1);
}

// Normaliza nome de componente para nome de arquivo
function toFileName(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[_\s]+/g, '-')
    .replace(/[àáâãä]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Mapeia nome do componente Figma para ID do banco no sistema
const BANK_ID_MAP = {
  // Digitais
  'nubank': 'nubank',
  'inter': 'inter',
  'neon': 'neon',
  'c6-bank': 'c6',
  'c6bank': 'c6',
  'picpay': 'picpay',
  'mercado-pago': 'mercadopago',
  'pagbank': 'pagbank',
  'stone': 'stone',
  'iti': 'iti',
  'banco-next': 'next',
  'banco-original': 'original',
  'agibank': 'agibank',
  'will-bank': 'will_bank',
  'digio': 'digio',
  'trigg': 'trigg',
  'credicard': 'credicard',
  'cora': 'cora',
  'infinitepay': 'infinitepay',

  // Grandes bancos
  'itau-unibanco': 'itau',
  'itau': 'itau',
  'bradesco': 'bradesco',
  'banco-do-brasil': 'bb',
  'caixa-economica-federal': 'caixa',
  'santander-brasil': 'santander',
  'santander': 'santander',

  // Investimento
  'btg-pactual': 'btg',
  'btg': 'btg',
  'banco-safra': 'safra',
  'safra': 'safra',
  'xp-investimentos': 'xp',
  'xp': 'xp',
  'rico': 'rico',
  'clear': 'clear',
  'agora': 'agora',
  'toro-investimentos': 'toro',
  'genial': 'genial',
  'guide': 'guide',
  'mirae-asset': 'mirae',

  // Médios
  'banco-pan': 'pan',
  'banco-bv': 'bv',
  'banco-bmg': 'bmg',
  'banco-daycoval': 'daycoval',
  'banco-mercantil': 'mercantil',
  'banco-modal': 'modal',
  'banco-sofisa': 'sofisa',
  'banco-pine': 'pine',
  'banco rendimento': 'rendimento',
  'banco-paulista': 'paulista',
  'banco-topazio': 'topazio',
  'banco-votorantim': 'votorantim',
  'banco-master': 'master',
  'banco-abc': 'abc',
  'banco-alfa': 'alfa',
  'banco-bs2': 'bs2',
  'banco-fibra': 'fibra',
  'banco-industrial': 'industrial',
  'banco-indusval': 'indusval',
  'banco-bmg': 'bmg',

  // Regionais
  'banco-do-estado-do-rio-grande-do-sul-banrisul': 'banrisul',
  'banrisul': 'banrisul',
  'banco-de-brasilia-brb': 'brb',
  'brb': 'brb',
  'banco-do-nordeste-bnb': 'bnb',
  'bnb': 'bnb',
  'paranabanco': 'parana',
  'banese': 'banese',
  'banestes': 'banestes',
  'banpara': 'banpara',
  'banco-da-amazonia': 'banpara',

  // Cooperativas
  'sistema-de-cooperativas-de-credito-do-brasil-sicoob': 'sicoob',
  'sicoob': 'sicoob',
  'sistema-de-credito-cooperativo-sicredi': 'sicredi',
  'sicredi': 'sicredi',
  'unicred': 'unicred',
  'uniprime': 'uniprime',
  'credisis': 'credisis',
  'ailos': 'ailos',

  // Outros
  'efi-bank': 'ef',
  'efi': 'ef',
  'bndes': 'bndes',
  'pagseguro': 'pagseguro',
  'mercado-pago': 'mercadopago',
  'letsbank': 'letsbank',
  'bees-bank': 'bees',
  'bkbank': 'bkbank',
  'conta-simples': 'contasimples',
  'grafeno': 'grafeno',
  'omni': 'omni',
  'transfeera': 'transfeera',
  'recargapay': 'recargapay',
  'tribanco': 'tribanco',
  'bnp': 'bnp',
  'omie': 'omie',
  'quality': 'quality',
  'mufg': 'mufg',

  // Internacionais
  'wise': 'wise',
  'nomad': 'nomad',
  'payoneer': 'payoneer',
  'revolut': 'revolut',
  'paypal': 'paypal',
  'avenue': 'avenue',
  'husky': 'husky',

  // Lojas/Financeiras
  'renner-realize': 'renner',
  'riachuelo-midway': 'riachuelo',
  'porto-seguro': 'porto_seguro',
  'carrefour': 'carrefour',
};

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${url}\n${body.toString().slice(0, 200)}`));
        } else {
          resolve({ body, headers: res.headers, status: res.statusCode });
        }
      });
    });
    req.on('error', reject);
  });
}

async function fetchFigmaAPI(endpoint) {
  const url = `https://api.figma.com/v1${endpoint}`;
  const { body } = await get(url, { 'X-Figma-Token': FIGMA_TOKEN });
  return JSON.parse(body.toString());
}

async function downloadFile(url, dest) {
  const { body } = await get(url);
  fs.writeFileSync(dest, body);
}

// Resolve redirecionamentos (S3 presigned URLs)
async function downloadWithRedirect(url, dest) {
  return new Promise((resolve, reject) => {
    function doGet(u) {
      https.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          doGet(res.headers.location);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          fs.writeFileSync(dest, Buffer.concat(chunks));
          resolve();
        });
      }).on('error', reject);
    }
    doGet(url);
  });
}

async function main() {
  console.log('🏦 Baixando logos de bancos do Figma...\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 1. Busca todos os componentes do arquivo
  console.log('📋 Buscando componentes do arquivo Figma...');
  const file = await fetchFigmaAPI(`/files/${FILE_KEY}/components`);

  const components = file.meta?.components || [];
  console.log(`   Encontrados ${components.length} componentes\n`);

  if (components.length === 0) {
    console.log('⚠️  Nenhum componente encontrado. Tentando pela estrutura do arquivo...');
    // Fallback: busca direto no arquivo
    const fullFile = await fetchFigmaAPI(`/files/${FILE_KEY}`);
    console.log('   Arquivo carregado. Verificar estrutura manualmente.');
    return;
  }

  // 2. Filtra apenas componentes que parecem ser logos de bancos
  const bankComponents = components.filter(c => {
    const name = c.name.toLowerCase();
    // Exclui variantes de cores (geralmente têm "=", "branco", "fundo", etc.)
    return !name.includes('=') && !name.startsWith('.');
  });

  console.log(`🏦 ${bankComponents.length} logos de bancos identificados\n`);

  // 3. Exporta em lotes de 50 (limite da API)
  const BATCH_SIZE = 50;
  const downloaded = [];
  const failed = [];

  for (let i = 0; i < bankComponents.length; i += BATCH_SIZE) {
    const batch = bankComponents.slice(i, i + BATCH_SIZE);
    const ids = batch.map(c => c.node_id).join(',');

    console.log(`📥 Exportando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(bankComponents.length / BATCH_SIZE)}...`);

    try {
      const exportData = await fetchFigmaAPI(
        `/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg&svg_include_id=false&svg_simplify_stroke=true`
      );

      const imageUrls = exportData.images || {};

      for (const comp of batch) {
        const url = imageUrls[comp.node_id];
        if (!url) {
          console.log(`   ⚠️  Sem URL para: ${comp.name}`);
          failed.push(comp.name);
          continue;
        }

        const fileName = `${toFileName(comp.name)}.svg`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        try {
          await downloadWithRedirect(url, filePath);
          console.log(`   ✅ ${comp.name} → ${fileName}`);
          downloaded.push({ comp, fileName });
        } catch (err) {
          console.log(`   ❌ Falha ao baixar ${comp.name}: ${err.message}`);
          failed.push(comp.name);
        }
      }
    } catch (err) {
      console.error(`   ❌ Erro no lote: ${err.message}`);
      batch.forEach(c => failed.push(c.name));
    }

    // Respeita rate limit do Figma (máx 30 req/min)
    if (i + BATCH_SIZE < bankComponents.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n✅ ${downloaded.length} logos baixados`);
  if (failed.length > 0) {
    console.log(`⚠️  ${failed.length} falhas: ${failed.join(', ')}`);
  }

  // 4. Gera o mapeamento bankLogos.ts
  console.log('\n📝 Gerando src/utils/bankLogos.ts...');
  generateBankLogosFile(downloaded);

  console.log('\n🎉 Pronto! Logos em /public/banks/ e mapeamento atualizado em src/utils/bankLogos.ts');
}

function generateBankLogosFile(downloaded) {
  // Mantém os logos existentes que não foram sobrescritos
  const existingLogos = {
    nubank: '/banks/nubank.svg',
    inter: '/banks/inter.svg',
    neon: '/banks/neon.svg',
    c6: '/banks/c6.svg',
    picpay: '/banks/picpay.svg',
    mercadopago: '/banks/mercadopago.svg',
    pagbank: '/banks/pagbank.svg',
    stone: '/banks/stone.svg',
    iti: '/banks/itau.svg',
    next: '/banks/bradesco.svg',
    original: '/banks/original.svg',
    itau: '/banks/itau.svg',
    bradesco: '/banks/bradesco.svg',
    bb: '/banks/banco-do-brasil.svg',
    caixa: '/banks/caixa.svg',
    santander: '/banks/santander.svg',
    btg: '/banks/btg.svg',
    safra: '/banks/safra.svg',
    xp: '/banks/xp.svg',
    bv: '/banks/banco-bv-logo.svg',
    bmg: '/banks/banco-bmg-logo.svg',
    daycoval: '/banks/logo-Daycoval.svg',
    mercantil: '/banks/banco-mercantil-novo-azul.svg',
    sofisa: '/banks/logo-banco-sofisa.svg',
    pine: '/banks/banco-pine.svg',
    rendimento: '/banks/banco rendimento logo nova .svg',
    paulista: '/banks/banco-paulista.svg',
    topazio: '/banks/logo-banco-topazio.svg',
    abc: '/banks/logoabc.svg',
    bs2: '/banks/Banco_BS2.svg',
    banrisul: '/banks/banrisul.svg',
    brb: '/banks/brb-logo.svg',
    bnb: '/banks/Logo_BNB.svg',
    parana: '/banks/Logo_do_Banpará.svg',
    banese: '/banks/logo banese.svg',
    banestes: '/banks/banestes.svg',
    banpara: '/banks/banpara-logo-sem-fundo.svg',
    sicoob: '/banks/sicoob.svg',
    sicredi: '/banks/sicredi.svg',
    ef: '/banks/logo-efi-bank-laranja.svg',
    cora: '/banks/icone-cora-rosa-2500px.svg',
    contasimples: '/banks/conta-simples_logo-novo.svg',
    infinitepay: '/banks/InfitePay.svg',
    omni: '/banks/logo-omni.svg',
    pagseguro: '/banks/pagseguro.svg',
    transfeera: '/banks/transfeera-logo-verde-nova.svg',
    unicred: '/banks/unicred-centralizada.svg',
    uniprime: '/banks/uniprime.svg',
    tribanco: '/banks/logotribanco.svg',
    bnp: '/banks/logo-bnp.svg',
    quality: '/banks/quality-logo-cinza.svg',
    grafeno: '/banks/grafeno.svg',
    credisis: '/banks/credisis.svg',
    ailos: '/banks/logo-ailos.svg',
    letsbank: '/banks/Logo Letsbank.svg',
    bees: '/banks/BEESBank_Horizontal.svg',
    bib: '/banks/BIB-logo.svg',
    bkbank: '/banks/bkBank.svg',
    duepay: '/banks/Duepay.svg',
    iugo: '/banks/Iugo.svg',
    recargapay: '/banks/RecargaPay.svg',
    arbi: '/banks/Banco_Arbi .svg',
    contaip: '/banks/conta-ip.svg',
    mufg: '/banks/mufg-seeklogo.svg',
  };

  // Adiciona logos baixados do Figma
  const newLogos = { ...existingLogos };

  for (const { comp, fileName } of downloaded) {
    const normalizedName = toFileName(comp.name);
    const bankId = BANK_ID_MAP[normalizedName] || BANK_ID_MAP[comp.name.toLowerCase()];

    if (bankId) {
      newLogos[bankId] = `/banks/${fileName}`;
    }
    // Sempre adiciona pelo nome normalizado também (como chave extra)
    newLogos[normalizedName] = `/banks/${fileName}`;
  }

  const entries = Object.entries(newLogos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `  ${key}: '${val}',`)
    .join('\n');

  const content = `// Logos dos bancos brasileiros
// Gerado automaticamente por scripts/download-figma-logos.mjs
// Fonte: https://www.figma.com/design/Cn0hnUpjuWr62R2Toli3Tu/Brazilian-Banks-Logos--Community-

export const BANK_LOGOS: Record<string, string> = {
${entries}
};

export const CARD_BRAND_LOGOS = {
  visa: '/card-brands/visa.png',
  mastercard: '/card-brands/mastercard.png',
  elo: '/card-brands/elo.png',
  amex: '/card-brands/american-express.png',
  hipercard: '/card-brands/hipercard.png',
  diners: '/card-brands/diners.png',
  aura: '/card-brands/aura.png',
  discover: '/card-brands/discover.png',
  jcb: '/card-brands/jcb.png',
} as const;

export type CardBrandCode = keyof typeof CARD_BRAND_LOGOS;

export function getBankLogo(bankName: string): string | undefined {
  if (!bankName) return undefined;
  const normalized = bankName.toLowerCase().replace(/\\s+/g, '');
  return BANK_LOGOS[normalized] || BANK_LOGOS[bankName.toLowerCase()] || undefined;
}

export function getCardBrandLogo(brandName: string): string | undefined {
  if (!brandName) return undefined;
  const normalized = brandName.toLowerCase().replace(/\\s+/g, '');
  const aliases: Record<string, CardBrandCode> = {
    americanexpress: 'amex',
    dinersclub: 'diners',
    diners: 'diners',
  };
  if (CARD_BRAND_LOGOS[normalized as CardBrandCode]) {
    return CARD_BRAND_LOGOS[normalized as CardBrandCode];
  }
  const code = aliases[normalized];
  return code ? CARD_BRAND_LOGOS[code] : undefined;
}
`;

  fs.writeFileSync(MAPPING_FILE, content, 'utf-8');
  console.log(`   ✅ ${Object.keys(newLogos).length} logos mapeados`);
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
