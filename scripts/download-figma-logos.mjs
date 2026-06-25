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

// ─── Coletores de IDs do Figma ──────────────────────────────────────────────

/**
 * Extrai componentes "Type=Logo" dos COMPONENT_SET do arquivo.
 * O arquivo deste community tem a estrutura:
 *   Page "Brazilian Institutions" → FRAME "Categoria" →
 *     FRAME "Content" → COMPONENT_SET "Banco_do_Brasil" →
 *       COMPONENT "Type=Logo" (id exportável)
 *       COMPONENT "Type=Icon, Background=False"
 *       COMPONENT "Type=Icon, Background=True"
 */
async function extractLogoComponents() {
  // Tenta carregar do cache local primeiro (evita rate limit do /files)
  const CACHE_FILE = path.join(__dirname, '../scratch/figma-logo-components.json');
  if (fs.existsSync(CACHE_FILE)) {
    console.log('📋 Usando cache local de componentes (scratch/figma-logo-components.json)...');
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    // Normaliza nomes de campo (setName → componentSetName, id → nodeId)
    const normalized = cached.map(c => ({
      componentSetName: c.componentSetName || c.setName || c.name,
      variantName: c.variantName || c.name || '',
      nodeId: c.nodeId || c.id,
    }));
    console.log(`   Encontrados ${normalized.length} componentes "Type=Logo" (cache)\n`);
    return normalized;
  }

  console.log('📋 Carregando estrutura do arquivo Figma...');
  const file = await fetchFigmaAPI(`/files/${FILE_KEY}?geometry=paths`);

  const doc = file.document || file;
  const logoComponents = [];

  function walk(node) {
    if (!node) return;
    if (node.type === 'COMPONENT_SET' && node.children) {
      for (const child of node.children) {
        if (child.type === 'COMPONENT' && child.name && child.name.includes('Logo')) {
          logoComponents.push({
            componentSetName: node.name,
            variantName: child.name,
            nodeId: child.id,
          });
        }
      }
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
  }

  for (const page of doc.children) {
    walk(page);
  }

  console.log(`   Encontrados ${logoComponents.length} componentes "Type=Logo"\n`);
  return logoComponents;
}

// ─── Filtro de categorias não-bancárias ─────────────────────────────────────

const NON_BANK_CATEGORIES = [
  'ame_digital', 'smiles', 'livelo', 'dotz', 'latam_pass', 'coopera',
  'esfera', 'tudo_azul', 'petrobras_premia', 'semparar', 'taggy', 'veloe',
  'zul', 'conectcar', 'movemais', 'brasilcard', 'credicard', 'poupex',
  'boavista', 'serasa', 'transunion', 'crefisa', 'zema',
  'viacerta', 'tentoscap', 'stellantis', 'sf3', 'empresta', 'realize',
  'midway', 'mercado_credito', 'lecca', 'kab', 'kanastra', 'gazin',
  'facta', 'credita', 'santander_financiamentos', 'atria', 'al5',
  'banco_central', 'cvm', 'b3', 'susep', 'febraban', 'fgc', 'acrefi',
  'rede', 'ton', 'sumup', 'yelly', 'cielo', 'iugu', 'interpag',
  'c6pay', 'getnet', 'pagueveloz', 'conectcar', 'petrobras',
];

function isBankComponent(comp) {
  const key = toFileName(comp.componentSetName);
  return !NON_BANK_CATEGORIES.some(excl => key.includes(excl.toLowerCase()));
}

// ─── Exportação dos SVGs ────────────────────────────────────────────────────

async function exportAndDownload(components) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const BATCH_MAX = 50; // limite da Figma Images API
  const downloaded = [];
  const failed = [];
  let total = 0;

  for (let i = 0; i < components.length; i += BATCH_MAX) {
    const batch = components.slice(i, i + BATCH_MAX);
    const ids = batch.map(c => c.nodeId).join(',');
    const batchNum = Math.floor(i / BATCH_MAX) + 1;
    const totalBatches = Math.ceil(components.length / BATCH_MAX);

    console.log(`📥 Exportando lote ${batchNum}/${totalBatches} (${batch.length} logos)...`);

    try {
      const result = await fetchFigmaAPI(
        `/images/${FILE_KEY}?ids=${encodeURIComponent(ids)}&format=svg&svg_include_id=false&svg_simplify_stroke=true`
      );

      const imageUrls = result.images || {};

      for (const comp of batch) {
        const url = imageUrls[comp.nodeId];
        if (!url) {
          console.log(`   ⚠️  Sem URL: ${comp.componentSetName}`);
          failed.push(comp.componentSetName);
          continue;
        }

        const fileName = `${toFileName(comp.componentSetName)}.svg`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        try {
          await downloadWithRedirect(url, filePath);
          console.log(`   ✅ ${comp.componentSetName} → ${fileName}`);
          downloaded.push({ componentSetName: comp.componentSetName, fileName });
          total++;
        } catch (err) {
          console.log(`   ❌ Erro ao baixar ${comp.componentSetName}: ${err.message}`);
          failed.push(comp.componentSetName);
        }
      }
    } catch (err) {
      console.error(`   ❌ Erro no lote: ${err.message}`);
      batch.forEach(c => failed.push(c.componentSetName));
    }

    // Rate limit: 30 req/min para o endpoint /images
    if (i + BATCH_MAX < components.length) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  console.log(`\n✅ ${total} logos baixados com sucesso`);
  if (failed.length > 0) {
    console.log(`⚠️  ${failed.length} falhas: ${failed.slice(0, 10).join(', ')}${failed.length > 10 ? '...' : ''}`);
  }

  return downloaded;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏦 Download de logos de bancos do Figma\n');

  // 1. Extrai IDs dos COMPONENT_SET → COMPONENT "Type=Logo"
  const allComponents = await extractLogoComponents();

  if (allComponents.length === 0) {
    console.log('❌ Nenhum componente "Type=Logo" encontrado no arquivo.');
    process.exit(1);
  }

  // 2. Filtra apenas bancos (exclui rewards, toll tags, reguladores etc.)
  const bankComponents = allComponents.filter(isBankComponent);

  console.log(`🏦 ${bankComponents.length} logos de bancos (filtrados de ${allComponents.length} total)\n`);

  // 3. Exporta SVGs e baixa
  const downloaded = await exportAndDownload(bankComponents);

  // 4. Gera mapeamento
  if (downloaded.length > 0) {
    console.log('\n📝 Gerando src/utils/bankLogos.ts...');
    generateBankLogosFile(downloaded);
  }

  console.log('\n🎉 Pronto! Logos em /public/banks/');
}

function generateBankLogosFile(downloaded) {
  // Logos existentes (fallback manual)
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

  for (const { componentSetName, fileName } of downloaded) {
    const normalizedName = toFileName(componentSetName);
    const bankId = BANK_ID_MAP[normalizedName] || BANK_ID_MAP[(componentSetName || '').toLowerCase()];

    if (bankId) {
      newLogos[bankId] = `/banks/${fileName}`;
    }
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
