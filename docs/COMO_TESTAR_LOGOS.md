# 🧪 Como Testar as Logos

## 🚀 Iniciar o Sistema

```bash
cd seu-bolso-inteligente
npm run dev
```

Acesse: `http://localhost:5173`

---

## ✅ Checklist de Testes

### 1. Testar Logos em Contas

**Página:** `/contas`

- [ ] Clicar em "Nova conta"
- [ ] Abrir seletor de "Banco"
- [ ] **VERIFICAR:** Logos aparecem ao lado dos nomes dos bancos
- [ ] Selecionar um banco (ex: Nubank)
- [ ] Criar a conta
- [ ] **VERIFICAR:** Logo aparece no card da conta na lista

**Teste com conta internacional:**
- [ ] Clicar em "Nova conta"
- [ ] Ativar toggle "Conta Internacional"
- [ ] Abrir seletor de "Instituição"
- [ ] **VERIFICAR:** Logos de bancos internacionais (Wise, Nomad, etc.)
- [ ] Criar conta internacional
- [ ] **VERIFICAR:** Logo aparece no card com badge de moeda

### 2. Testar Logos em Cartões

**Página:** `/cartoes`

- [ ] Clicar em "Novo cartão"
- [ ] Abrir seletor de "Banco"
- [ ] **VERIFICAR:** Logos aparecem ao lado dos nomes dos bancos
- [ ] Selecionar um banco (ex: Inter)
- [ ] Selecionar bandeira (ex: Mastercard)
- [ ] Criar o cartão
- [ ] **VERIFICAR:** Logo do banco aparece no card do cartão
- [ ] **VERIFICAR:** Logo da bandeira aparece ao lado dos últimos 4 dígitos

**Teste com cartão internacional:**
- [ ] Clicar em "Novo cartão"
- [ ] Ativar toggle "Cartão Internacional"
- [ ] Selecionar instituição internacional
- [ ] Selecionar moeda (USD, EUR, etc.)
- [ ] Criar cartão
- [ ] **VERIFICAR:** Logo aparece com badge de moeda

### 3. Testar Detalhe do Cartão

**Página:** `/cartoes` → Clicar em um cartão

- [ ] **VERIFICAR:** Logo grande do banco no topo
- [ ] **VERIFICAR:** Nome do banco abaixo da logo
- [ ] Navegar entre meses (setas)
- [ ] **VERIFICAR:** Logo permanece visível

### 4. Testar Dashboard

**Página:** `/` (Dashboard)

- [ ] **VERIFICAR:** Logos aparecem nos cards de contas
- [ ] **VERIFICAR:** Logos aparecem nos cards de cartões
- [ ] **VERIFICAR:** Logos aparecem na lista de transações recentes

---

## 🎨 Bancos para Testar

### Principais Digitais
- ✅ Nubank (roxo)
- ✅ Inter (laranja)
- ✅ Neon (verde água)
- ✅ C6 Bank (preto)
- ✅ PicPay (verde)

### Grandes Tradicionais
- ✅ Itaú (azul escuro)
- ✅ Bradesco (vermelho)
- ✅ Banco do Brasil (amarelo)
- ✅ Caixa (azul)
- ✅ Santander (vermelho)

### Investimento
- ✅ BTG Pactual (azul marinho)
- ✅ Banco Safra (azul)

### Regionais
- ✅ Banrisul
- ✅ BRB
- ✅ Banco do Nordeste

---

## 🔍 O Que Verificar

### ✅ Logo Carregou Corretamente
- Imagem PNG nítida
- Tamanho proporcional
- Sem distorção

### ✅ Fallback Funcionando
- Se logo não carregar, deve aparecer ícone colorido com letra
- Cor de fundo correta do banco
- Letra/ícone visível

### ✅ Responsividade
- Logos aparecem bem em desktop
- Logos aparecem bem em mobile
- Tamanhos ajustados (sm, md, lg)

---

## 🐛 Problemas Comuns

### Logo não aparece
**Solução:** Verificar se arquivo existe em `public/bank-logos/`

### Logo distorcida
**Solução:** Verificar se classe CSS `object-contain` está aplicada

### Banco não tem logo
**Solução:** Normal! Sistema usa fallback com ícone colorido

### Console mostra erro 404
**Solução:** Verificar caminho da logo em `bankLogos.ts`

---

## 📸 Screenshots Esperados

### Seletor de Banco
```
┌─────────────────────────────┐
│ [🟣] Nubank                 │
│ [🟠] Inter                  │
│ [🔵] Itaú                   │
│ [🟡] Banco do Brasil        │
└─────────────────────────────┘
```

### Card de Conta
```
┌─────────────────────────────┐
│ [LOGO]  Nubank              │
│         Conta Corrente      │
│                             │
│ Saldo                       │
│ R$ 1.234,56                 │
└─────────────────────────────┘
```

### Card de Cartão
```
┌─────────────────────────────┐
│ [LOGO]  Inter               │
│         •••• 4532 [M]       │
│                             │
│ R$ 567,89                   │
│ 15 dias                     │
└─────────────────────────────┘
```

---

## ✅ Teste Completo

Após testar todos os itens acima, você deve ter:

- ✅ Logos aparecendo em todos os seletores
- ✅ Logos aparecendo em todos os cards
- ✅ Logos aparecendo no detalhe
- ✅ Fallback funcionando para bancos sem logo
- ✅ Bandeiras de cartão aparecendo
- ✅ Sistema responsivo

---

## 🎉 Sucesso!

Se todos os testes passaram, a integração está **100% funcional**!

**Próximo passo:** Usar o sistema normalmente e aproveitar as logos bonitas! 🚀
