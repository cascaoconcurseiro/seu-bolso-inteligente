# 🎨 Elite Design System - Guia de Tamanhos Compactos

## Visão Geral

Sistema de componentes padronizados seguindo o **Elite Design System** com tamanhos **compactos e modernos** para uma experiência otimizada em mobile e desktop.

## 🎯 Princípios do Elite Compact Design

### 1. **Hierarquia Visual Clara**
- **3 tamanhos de texto máximo**: base (16px), sm (14px), xs (12px)
- Uso de peso e cor para criar hierarquia, não tamanho excessivo

### 2. **Espaçamento Compacto**
- Escala de 8px rigorosa
- Padding: 16px (p-4) - componentes gerais
- Gap: 16px (gap-4) - espaçamento vertical
- Dialog: p-4, gap-4

### 3. **Componentes Compactos**
- Cards com padding reduzido (p-4)
- Tipografia moderada (text-base, text-lg max)
- Border radius: rounded-md (6px) ou rounded-lg (8px)

### 4. **Inputs Compactos**
- Altura: 36px (h-9)
- Rounded: 6px (rounded-md)
- Padding: px-3 py-2
- Tipografia: text-sm
- Border: border (1px)

### 5. **Botões Compactos**
- Altura padrão: 36px (h-9)
- Padding: px-3 py-2
- Rounded: rounded-md
- Tipografia: text-sm font-medium
- Size sm: h-8 (32px)
- Size lg: h-10 (40px)

## 📦 Componentes Disponíveis

### `<EliteFormHeader />`
```tsx
<EliteFormHeader 
  title="Pagar Fatura"
  subtitle="Carrefour"
  icon={<CreditCard className="w-8 h-8" />}
  onClose={handleClose}
  progress={50} // 0-100, opcional
/>
```

### `<EliteHighlightCard />`
```tsx
<EliteHighlightCard 
  label="Total da Fatura"
  value="R$ 250,00"
/>
```

### `<EliteCurrencyInput />`
```tsx
<EliteCurrencyInput 
  value={amount}
  onChange={setAmount}
  currency="R$"
  placeholder="0,00"
/>
```

### `<ElitePrimaryButton />`
```tsx
<ElitePrimaryButton 
  onClick={handleContinue}
  icon={<ChevronRight className="w-5 h-5" />}
  loading={isProcessing}
>
  Continuar
</ElitePrimaryButton>
```

### `<EliteSecondaryButton />`
```tsx
<EliteSecondaryButton onClick={handleBack}>
  Voltar
</EliteSecondaryButton>
```

### `<EliteTextInput />`
```tsx
<EliteTextInput 
  value={description}
  onChange={setDescription}
  placeholder="Descrição"
  icon={<Tag className="w-5 h-5" />}
/>
```

### `<EliteSelect />`
```tsx
<EliteSelect 
  value={selectedAccount}
  onChange={setSelectedAccount}
  options={[
    { value: "1", label: "Conta Corrente", icon: <Wallet /> },
    { value: "2", label: "Poupança" }
  ]}
  placeholder="Selecione a conta"
/>
```

### `<EliteFormSection />`
```tsx
<EliteFormSection label="Qual valor deseja pagar agora?">
  <EliteCurrencyInput value={amount} onChange={setAmount} />
</EliteFormSection>
```

### `<EliteBottomActions />`
```tsx
<EliteBottomActions>
  <ElitePrimaryButton onClick={handleSubmit}>
    Confirmar
  </ElitePrimaryButton>
  <EliteSecondaryButton onClick={handleCancel}>
    Cancelar
  </EliteSecondaryButton>
</EliteBottomActions>
```

## 🔄 Padrão de Migração

### ANTES (Sistema Antigo)
```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Pagar Fatura</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      <Label>Valor</Label>
      <Input type="number" value={amount} />
      <Button>Pagar</Button>
    </div>
  </DialogContent>
</Dialog>
```

### DEPOIS (Elite Form System)
```tsx
<Dialog>
  <DialogContent className="p-6">
    <EliteFormHeader 
      title="Pagar Fatura"
      subtitle="Carrefour"
      icon={<CreditCard className="w-8 h-8" />}
      onClose={handleClose}
      progress={50}
    />
    
    <div className="space-y-8 my-8">
      <EliteHighlightCard 
        label="Total da Fatura"
        value="R$ 250,00"
      />
      
      <EliteFormSection label="Qual valor deseja pagar agora?">
        <EliteCurrencyInput 
          value={amount}
          onChange={setAmount}
        />
      </EliteFormSection>
    </div>
    
    <EliteBottomActions>
      <ElitePrimaryButton 
        onClick={handlePay}
        icon={<ChevronRight className="w-5 h-5" />}
      >
        Continuar
      </ElitePrimaryButton>
    </EliteBottomActions>
  </DialogContent>
</Dialog>
```

## 📋 Checklist de Migração

### Formulários Prioritários (Alta prioridade)

- [ ] `PayInvoiceDialog.tsx` ✅ (Exemplo referência)
- [ ] `TransactionModal.tsx`
- [ ] `QuickAddModal.tsx`
- [ ] `AccountFormModal.tsx`
- [ ] `TransferModal.tsx`
- [ ] `WithdrawalModal.tsx`
- [ ] `NewCardDialog.tsx`
- [ ] `ShareCardDialog.tsx`
- [ ] `GoalFormDialog.tsx`
- [ ] `GoalContributeDialog.tsx`
- [ ] `AssetFormDialog.tsx`
- [ ] `AssetTransactionDialog.tsx`
- [ ] `NewTripDialog.tsx`
- [ ] `EditTripDialog.tsx`
- [ ] `ExchangePurchaseDialog.tsx`
- [ ] `InviteMemberDialog.tsx`
- [ ] `SharedSettleDialog.tsx`
- [ ] `SharedInstallmentImport.tsx`
- [ ] `SplitModal.tsx`
- [ ] `CategorySelector.tsx`
- [ ] `AdvanceInstallmentsDialog.tsx`
- [ ] `AnticipateInstallmentsDialog.tsx`

## 🎨 Paleta de Cores Elite

```typescript
// Hierarquia por cor, não por tamanho
const ELITE_COLORS = {
  primary: "text-foreground",      // Texto principal
  secondary: "text-muted-foreground", // Texto secundário
  tertiary: "text-muted-foreground/60", // Texto terciário
  
  // Fundos
  highlight: "bg-muted/50",        // Cards de destaque
  input: "bg-background",          // Inputs
  button: "bg-foreground",         // Botão principal
  buttonText: "text-background",   // Texto do botão
}
```

## 📐 Tamanhos Padronizados (Compactos)

```typescript
// Hierarquia tipográfica (máximo 3 tamanhos)
const TYPOGRAPHY = {
  display: "text-lg font-semibold",  // Títulos de dialogs, cards
  body: "text-sm font-medium",       // Texto corrido, labels
  caption: "text-xs",                // Metadados, labels pequenos
}

// Alturas de componentes
const HEIGHTS = {
  button: "h-9",      // 36px (padrão)
  buttonSm: "h-8",    // 32px (pequeno)
  buttonLg: "h-10",   // 40px (grande)
  input: "h-9",       // 36px
  select: "h-9",      // 36px
  textarea: "min-h-[80px]", // 80px mínimo
}

// Arredondamentos
const ROUNDED = {
  primary: "rounded-md",    // 6px - botões, inputs
  secondary: "rounded-lg",  // 8px - cards
  dialog: "rounded-lg sm:rounded-xl", // 8px mobile, 12px desktop
}

// Padding e Spacing
const SPACING = {
  dialog: "p-4 gap-4",           // 16px
  card: "p-4",                   // 16px
  cardHeader: "p-4 space-y-1.5", // 16px, gap 6px
  input: "px-3 py-2",            // 12px horizontal, 8px vertical
  button: "px-3 py-2",           // 12px horizontal, 8px vertical
}
```

## ⚡ Dicas de Implementação

### 1. **Fluxo Multi-Step**
```tsx
const [step, setStep] = useState(1);

// Step 1: Definir valor
<EliteHighlightCard label="Total" value={total} />
<EliteCurrencyInput value={amount} onChange={setAmount} />

// Step 2: Selecionar origem
<EliteSelect value={account} onChange={setAccount} options={accounts} />

// Step 3: Confirmar
<EliteBottomActions>
  <ElitePrimaryButton onClick={handleConfirm}>
    Confirmar
  </ElitePrimaryButton>
</EliteBottomActions>
```

### 2. **Progress Indicator**
```tsx
<EliteFormHeader 
  title="Pagar Fatura"
  progress={(step / totalSteps) * 100}
/>
```

### 3. **Validação Visual**
```tsx
<EliteCurrencyInput 
  value={amount}
  onChange={setAmount}
  className={amount < 0 ? "border-red-500" : ""}
/>

{error && (
  <p className="text-sm text-red-500 mt-2">
    {error}
  </p>
)}
```

### 4. **Loading States**
```tsx
<ElitePrimaryButton 
  loading={isProcessing}
  onClick={handleSubmit}
>
  Processar Pagamento
</ElitePrimaryButton>
```

## 🚀 Próximos Passos

1. **Migrar formulários prioritários** (20 componentes)
2. **Testar responsividade** em mobile
3. **Validar acessibilidade** (WCAG AA)
4. **Documentar padrões específicos** (câmbio, parcelamento, etc)

## 📚 Referências

- ADR-001: Design System Elite Compliance
- Elite Agency Rules: `.kiro/steering/elite-agency-rules.md`
- Design Audit: `DESIGN_AUDIT_REPORT_COMPLETO.md`

---

**Última atualização**: 22/06/2026  
**Status**: ✅ Componentes base atualizados para tamanhos compactos
**Versão**: Compact v2.0 (h-9 buttons/inputs, p-4 dialogs)

## � Resumo das Alterações (Rodada 5 - Compacto Final)

### Componentes Base Atualizados:

✅ **Button** (`src/components/ui/button.tsx`)
- default: h-10 → **h-9** (36px)
- sm: h-9 → **h-8** (32px)  
- lg: h-11 → **h-10** (40px)
- icon: h-10 → **h-9** (36px)
- padding: px-4 py-2 → **px-3 py-2**

✅ **Input** (`src/components/ui/input.tsx`)
- h-10 → **h-9** (36px)
- padding: px-3 py-2 (mantido)
- text-sm (mantido)

✅ **Dialog** (`src/components/ui/dialog.tsx`)
- padding: p-6 → **p-4** (16px)
- gap: gap-6 → **gap-4** (16px)
- rounded: rounded-2xl → **rounded-lg sm:rounded-xl**
- DialogHeader space-y: space-y-2 → **space-y-1.5**
- DialogTitle: text-lg → **text-base** (16px)
- Close button: right-4 top-4 → **right-3 top-3**

✅ **Select** (`src/components/ui/select.tsx`)
- h-12 → **h-9** (36px)
- rounded: rounded-xl → **rounded-md**
- padding: px-4 → **px-3**
- text: text-base → **text-sm**
- border: border-input/50 → **border-input**
- removed: backdrop-blur, shadow-sm, focus effects fancy

✅ **Textarea** (`src/components/ui/textarea.tsx`)
- min-h: 120px → **80px**
- rounded: rounded-xl → **rounded-md**
- padding: px-4 py-3 → **px-3 py-2**
- text: text-base → **text-sm**
- border: border-input/50 → **border-input**
- removed: backdrop-blur, shadow-sm

✅ **Card** (`src/components/ui/card.tsx`)
- CardHeader padding: p-6 → **p-4**
- CardHeader space-y: space-y-2.5 → **space-y-1.5**
- CardTitle: text-2xl → **text-lg**
- CardContent padding: p-6 → **p-4**
- CardFooter padding: p-6 → **p-4**

✅ **Label** (`src/components/ui/label.tsx`)
- Já estava correto: text-sm font-medium

### Próximos Passos (Opcional):

Os componentes base agora estão compactos. Componentes customizados específicos (como elite-form.tsx com h-16) podem ser ajustados conforme necessário por demanda.
