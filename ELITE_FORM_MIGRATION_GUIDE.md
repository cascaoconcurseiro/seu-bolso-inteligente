# 🎨 Elite Form System - Guia de Migração

## Visão Geral

Sistema de componentes padronizados para formulários seguindo o **Elite Design System** baseado no padrão fornecido.

## 🎯 Princípios do Elite Form Design

### 1. **Hierarquia Visual Clara**
- **3 tamanhos de texto máximo**: Display (3xl), Body (base), Caption (sm)
- Uso de peso e cor para criar hierarquia, não tamanho

### 2. **Espaçamento Generoso**
- Escala de 8px rigorosa
- Muito espaço em branco
- Padding: 24px (p-6) ou 32px (p-8)

### 3. **Componentes de Destaque**
- Cards com fundo `bg-muted/50`
- Informação principal centralizada
- Tipografia grande e bold

### 4. **Inputs Grandes e Clean**
- Altura: 64px (h-16)
- Rounded: 24px (rounded-3xl)
- Símbolo de moeda separado do valor
- Tipografia: text-3xl

### 5. **CTAs Únicos e Diretos**
- Um botão principal por tela
- Fundo preto (`bg-foreground`)
- Texto branco (`text-background`)
- Altura: 64px (h-16)
- Ícone de seta indicando continuidade

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

## 📐 Tamanhos Padronizados

```typescript
// Hierarquia tipográfica (máximo 3 tamanhos)
const TYPOGRAPHY = {
  display: "text-3xl font-black",  // Títulos, valores de destaque
  body: "text-base font-medium",   // Texto corrido, labels
  caption: "text-sm font-bold uppercase tracking-widest", // Metadados, labels pequenos
}

// Alturas de componentes
const HEIGHTS = {
  button: "h-16",      // 64px
  input: "h-16",       // 64px
  card: "p-8",         // 32px padding
}

// Arredondamentos
const ROUNDED = {
  primary: "rounded-3xl",  // 24px - botões, inputs, cards
  secondary: "rounded-2xl", // 16px - badges, chips
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
**Status**: 🟡 Em migração (1/25 componentes)
