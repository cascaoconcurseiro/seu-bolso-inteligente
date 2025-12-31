# 🎨 COMO BAIXAR LOGOS DO FIGMA

## ⚠️ PROBLEMA
O token do Figma está com rate limit (limite de requisições excedido). Vamos baixar manualmente.

---

## 📋 OPÇÃO 1: Download Manual via Figma (RECOMENDADO)

### Passo 1: Abrir o Arquivo
1. Acesse: https://www.figma.com/design/PlaR6YeIs3ElRSx6NZeK7w/Brazilian-Banks-Logos--Community-
2. Faça login no Figma (se necessário)

### Passo 2: Selecionar Logos
1. Vá para a página "𝗕𝗔𝗡𝗞 𝗜𝗖𝗢𝗡𝗦"
2. Vá para "↳ 🟢 Brazilian Institutions / Instituições Brasileiras"
3. Selecione todas as logos que você quer (Ctrl+A ou Cmd+A)

### Passo 3: Exportar
1. No painel direito, clique em "Export"
2. Configurações:
   - **Formato:** PNG
   - **Escala:** 2x (para melhor qualidade)
   - **Suffix:** (deixe vazio)
3. Clique em "Export [número] layers"

### Passo 4: Organizar
1. As logos serão baixadas em um ZIP
2. Extraia o ZIP
3. Copie todos os arquivos PNG para: `public/bank-logos/`
4. Renomeie os arquivos se necessário (remover espaços, caracteres especiais)

---

## 📋 OPÇÃO 2: Usar Plugin do Figma

### Passo 1: Instalar Plugin
1. No Figma, vá em Plugins > Browse plugins
2. Procure por "Batch Export"
3. Instale o plugin

### Passo 2: Exportar em Lote
1. Selecione todas as logos
2. Execute o plugin "Batch Export"
3. Configure:
   - Format: PNG
   - Scale: 2x
   - Naming: Use layer names
4. Export

---

## 📋 OPÇÃO 3: Aguardar Rate Limit (24 horas)

O rate limit do Figma geralmente reseta em 24 horas. Você pode:

1. Aguardar 24 horas
2. Executar novamente: `node scripts/download-figma-logos.js`

---

## 📋 OPÇÃO 4: Usar Token Diferente

Se você tem outra conta do Figma:

1. Acesse: https://www.figma.com/developers/api#access-tokens
2. Gere um novo token
3. Edite `scripts/download-figma-logos.js`
4. Substitua o token na linha 12
5. Execute: `node scripts/download-figma-logos.js`

---

## 📝 LOGOS NECESSÁRIAS

Aqui está a lista das logos que precisamos:

### Bancos Principais (Prioridade Alta)
- [x] Nubank
- [x] Inter
- [x] Itaú Unibanco
- [x] Banco do Brasil
- [x] Caixa Econômica Federal
- [x] Santander Brasil
- [x] Bradesco
- [x] BTG Pactual
- [x] Banco Safra
- [x] PicPay
- [x] Mercado Pago
- [x] Neon
- [x] C6 Bank
- [x] PagBank
- [x] Stone
- [x] Iti
- [x] Banco Pan
- [x] Banco BV
- [x] Banco Original
- [x] Banco Next

### Bancos Regionais (Prioridade Média)
- [x] Banrisul
- [x] BRB (Banco de Brasília)
- [x] Banco do Nordeste (BNB)
- [x] Paraná Banco
- [x] Banco Daycoval
- [x] Banco BMG
- [x] Banco Mercantil
- [x] AgiBank

### Cooperativas (Prioridade Média)
- [x] Sicoob
- [x] Sicredi

### Outros (Prioridade Baixa)
- [ ] Genial
- [ ] Efí Bank
- [ ] Banco Alfa
- [ ] Banco BS2
- [ ] Banco Fibra
- [ ] Banco Modal
- [ ] Banco Paulista
- [ ] Banco Pine
- [ ] Banco Rendimento
- [ ] Banco Sofisa
- [ ] Banco Topázio
- [ ] Banco Votorantim
- [ ] Citibank
- [ ] HSBC

---

## 🔧 APÓS BAIXAR AS LOGOS

### 1. Verificar Arquivos
```bash
# Listar logos baixadas
ls public/bank-logos/

# Contar logos
ls public/bank-logos/ | wc -l
```

### 2. Renomear (se necessário)
```bash
# Remover espaços e caracteres especiais
# Exemplo: "Banco do Brasil.png" → "banco-do-brasil.png"
```

### 3. Atualizar Código
Verifique se os nomes dos arquivos correspondem aos IDs usados no código:

```typescript
// src/lib/banks.ts
export const banks = [
  {
    id: 'nubank',
    name: 'Nubank',
    logo: '/bank-logos/nubank.png', // ← Verificar nome do arquivo
  },
  // ...
];
```

### 4. Testar
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Abrir navegador e verificar se logos aparecem
```

---

## 📊 STATUS ATUAL

### Logos Já Disponíveis
Você já tem **muitas logos** na pasta `public/bank-logos-all/`:
- 500+ arquivos PNG
- Incluindo todos os bancos principais

### O Que Fazer
1. **Copiar logos existentes** de `public/bank-logos-all/` para `public/bank-logos/`
2. **Renomear** para nomes padronizados
3. **Atualizar** `src/lib/banks.ts` com os nomes corretos

---

## 🚀 SCRIPT PARA ORGANIZAR LOGOS EXISTENTES

Vou criar um script para organizar as logos que você já tem:

```javascript
// scripts/organize-logos.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DIR = path.join(__dirname, '..', 'public', 'bank-logos-all');
const TARGET_DIR = path.join(__dirname, '..', 'public', 'bank-logos');

// Mapeamento de nomes
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
};

// Criar diretório de destino se não existir
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

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
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ ${targetName}.png (de ${matchingFile})`);
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log(`⚠️  ${targetName}.png não encontrado`);
  }
}

console.log('\n✅ Organização concluída!');
```

Execute:
```bash
node scripts/organize-logos.js
```

---

## 📞 SUPORTE

Se tiver problemas:
1. Verifique se as logos estão em `public/bank-logos/`
2. Verifique se os nomes correspondem aos IDs em `src/lib/banks.ts`
3. Limpe o cache do navegador (Ctrl+Shift+R)
4. Reinicie o servidor de desenvolvimento

---

**Boa sorte! 🚀**
