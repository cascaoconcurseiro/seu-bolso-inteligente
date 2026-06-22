# 🎨 Elite Design System - Plano de Correção Completo

## Status Atual
- **2,018 violações** encontradas em 145 arquivos
- **10 modais críticos** para correção imediata
- Componentes base (Dialog, Input, Button, Label) já atualizados ✅

## 🎯 Estratégia de Correção

### FASE 1: Modais Críticos (Prioridade MÁXIMA) ⚡
**Meta: Corrigir os 10 modais mais usados no sistema**

1. ✅ **TransactionDetailsModal** - COMPLETO
2. 🔄 **TransactionModal** - EM PROGRESSO
3. 🔄 **QuickAddModal** - EM PROGRESSO  
4. 🔄 **TransactionForm** - EM PROGRESSO
5. 🔄 **SplitModal** - EM PROGRESSO
6. 🔄 **SharedSettleDialog** - EM PROGRESSO
7. ⏳ **ImportBillsDialog** - PENDENTE
8. ⏳ **AccountFormModal** - PENDENTE
9. ⏳ **TransferModal** - PENDENTE
10. ⏳ **CategorySelector** - PENDENTE

### FASE 2: Top 20 Arquivos com Mais Violações 📊
**Meta: Reduzir violações em 60%**

Arquivos com mais impacto visual:
1. `AccountingDRE.tsx` (78 violações)
2. `AdminResetPanel.tsx` (77 violações)
3. `HelpSettings.tsx` (77 violações)
4. `InvestmentIRPanel.tsx` (64 violações)
5. `DashboardHero.tsx` (50 violações)
6. `MobileNav.tsx` (50 violações)
7. `AdvancedOptions.tsx` (50 violações)
8. `SharedTripCard.tsx` (48 violações)
9. `TripExpensesTab.tsx` (44 violações)
10. `Reports.tsx` (41 violações)

### FASE 3: Violações Globais por Categoria 🔍
**Meta: Criar script de correção automática**

#### Spacing (1,111 violações)
- `p-1` → `p-2` (múltiplo de 8px = 8px)
- `p-3` → `p-4` (múltiplo de 8px = 16px)
- `p-5` → `p-6` ou `p-8` (24px ou 32px)
- `gap-1` → `gap-2`
- `gap-3` → `gap-4`
- `gap-5` → `gap-6` ou `gap-8`
- `space-y-1` → `space-y-2`
- `space-y-3` → `space-y-4`

#### Height (369 violações)
- `h-3` → `h-4` (16px)
- `h-5` → `h-6` (24px)
- `h-7` → `h-8` (32px)
- `h-9` → `h-10` (40px)
- `h-11` → `h-12` (48px) ou `h-16` (64px Elite)

#### Width (382 violações)
- `w-1` → `w-2`
- `w-3` → `w-4`
- `w-5` → `w-6`
- `w-7` → `w-8`
- `w-9` → `w-10`

#### Text (153 violações)
- `text-xs` → `text-sm` (caption)
- `text-[8px]` → `text-sm`
- `text-[9px]` → `text-sm`
- `text-[10px]` → `text-sm`
- `text-[11px]` → `text-sm`

#### Rounded (3 violações)
- Valores customizados → `rounded-2xl`, `rounded-3xl`, ou `rounded-4xl`

## 📋 Regras de Elite Design

### Espaçamento
```tsx
// ❌ EVITAR
<div className="p-3 gap-1 space-y-3">
  
// ✅ USAR
<div className="p-4 gap-2 space-y-4"> // ou p-6, p-8
```

### Alturas
```tsx
// ❌ EVITAR
<Button className="h-9">
<Input className="h-11">

// ✅ USAR (Elite Standard)
<Button className="h-16">  // 64px - Elite button
<Input className="h-16">   // 64px - Elite input

// ✅ USAR (Compact quando necessário)
<Button className="h-12">  // 48px - Compact button
<Input className="h-12">   // 48px - Compact input
```

### Tipografia (Máximo 3 tamanhos)
```tsx
// ✅ Display (Títulos, valores grandes)
<h1 className="text-3xl font-black">R$ 1.250,00</h1>

// ✅ Body (Texto corrido, labels)
<p className="text-base font-medium">Descrição da transação</p>
<Label className="text-sm font-bold uppercase tracking-widest">Categoria</Label>

// ✅ Caption (Metadados, datas)
<span className="text-sm text-muted-foreground">12/06/2026</span>

// ❌ EVITAR
<p className="text-xs">Muito pequeno</p>
<span className="text-[11px]">Tamanho customizado</span>
```

### Arredondamentos
```tsx
// ✅ USAR (escala de 8px)
rounded-2xl  // 16px - badges, chips
rounded-3xl  // 24px - botões, inputs, cards principais  
rounded-4xl  // 32px - modais, containers grandes

// ❌ EVITAR
rounded-[1.5rem]  // Valor customizado
rounded-[2rem]    // Valor customizado
```

## 🔧 Correções Específicas por Modal

### TransactionModal
```tsx
// Aplicar nos componentes internos:
- DialogContent: p-0 → usar padding do Dialog base (p-8)
- Remover overrides de padding customizados
- Garantir TransactionForm usa espaçamento Elite
```

### QuickAddModal
```tsx
// Correções necessárias:
1. Form spacing: space-y-4 → space-y-6 ou space-y-8
2. Button height: h-12 → h-16 (Elite standard)
3. Input heights: todos h-10 ou h-12 → h-16
4. Labels: adicionar uppercase tracking-widest
5. Trip mode card: p-3 → p-4 ou p-6
6. Grid gaps: gap-4 → gap-6 ou gap-8
```

### SplitModal
```tsx
// Correções necessárias:
1. DialogContent: p-6 pb-4 → p-8
2. Space-y-3 → space-y-6 ou space-y-8
3. py-2.5 → py-4 (botões de toggle)
4. p-4 → p-6 ou p-8 (cards internos)
5. gap-2 → gap-4 (grid de presets)
6. Button heights padronizar em h-12 ou h-16
```

### SharedSettleDialog
```tsx
// Correções necessárias:
1. p-4 → p-6 ou p-8 (seções)
2. gap-4, gap-6 → gap-8
3. py-4 → py-6 ou py-8
4. space-y-2 → space-y-4
5. Avatares: w-12 h-12 → w-16 h-16 (Elite size)
```

### ImportBillsDialog
```tsx
// Correções necessárias:
1. Todos inputs: h-8 → h-12 ou h-16
2. p-3 → p-4 ou p-6 (cards)
3. space-y-2 → space-y-4
4. space-y-4 → space-y-6 ou space-y-8
5. gap-4 → gap-6 ou gap-8
```

### AccountFormModal
```tsx
// Correções necessárias:
1. px-6 pb-6 → p-8 (container principal)
2. p-4 → p-6 (switch cards)
3. space-y-2 → space-y-4 (form fields)
4. space-y-4 → space-y-6 ou space-y-8 (sections)
5. gap-3 → gap-4 (bottom buttons)
```

## 🚀 Próximas Ações

### Ação Imediata (Hoje)
1. ✅ Executar audit script
2. 🔄 Corrigir 6 modais críticos
3. ⏳ Testar build e verificar erros
4. ⏳ Commit "fix: Elite Design compliance - critical modals"

### Curto Prazo (Esta Semana)
1. Corrigir Top 10 arquivos com mais violações
2. Criar script Python v2 para correções automáticas restantes
3. Migrar 5 formulários para Elite Form System
4. Validar responsividade mobile

### Médio Prazo (Próximas 2 Semanas)
1. Aplicar correções automáticas nos 145 arquivos
2. Migrar todos os 20+ formulários para Elite Form System
3. Documentar padrões específicos (câmbio, parcelamento)
4. Testes de acessibilidade WCAG AA

## 📊 Métricas de Sucesso

### Antes
- 2,018 violações
- 145 arquivos afetados
- 0 modais em padrão Elite

### Meta
- < 100 violações (95% redução)
- < 20 arquivos com violações críticas
- 25+ modais migrados para Elite Form System
- 100% componentes base padronizados ✅

---

**Criado**: 22/06/2026  
**Última atualização**: 22/06/2026  
**Status**: 🔄 EM EXECUÇÃO
