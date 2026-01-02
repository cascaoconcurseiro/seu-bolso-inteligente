# Correções de Responsividade Mobile - Aplicar Agora

## Data: 02/01/2026

## Correções Críticas Identificadas

### 1. SharedExpenses.tsx - Botões de Menu Dropdown

**Problema:** Botões muito pequenos para toque em mobile (h-8 w-8 = 32x32px, mínimo recomendado: 44x44px)

**Linhas afetadas:** 1066, 1329

**Correção:**
```tsx
// ANTES
<Button variant="ghost" size="icon" className="h-8 w-8">
  <MoreHorizontal className="h-4 w-4" />
</Button>

// DEPOIS
<Button variant="ghost" size="icon" className="h-11 w-11 md:h-8 md:w-8">
  <MoreHorizontal className="h-5 w-5 md:h-4 md:w-4" />
</Button>
```

### 2. Accounts.tsx - Botões de Menu

**Problema:** Mesma issue - botões muito pequenos

**Correção:** Aplicar mesmo padrão

### 3. CreditCards.tsx - Botões de Menu

**Problema:** Mesma issue - botões muito pequenos

**Correção:** Aplicar mesmo padrão

### 4. Settings.tsx - Botões de Ação

**Problema:** Botões sem altura mínima

**Correção:**
```tsx
// ANTES
<Button size="sm" onClick={handleSaveName}>

// DEPOIS
<Button size="sm" className="h-11 md:h-9" onClick={handleSaveName}>
```

### 5. Family.tsx - Botão Convidar

**Problema:** Falta classe de altura responsiva

**Correção:**
```tsx
// ANTES
<Button size="lg" onClick={() => setShowInviteDialog(true)}>

// DEPOIS
<Button size="lg" className="h-12 md:h-11" onClick={() => setShowInviteDialog(true)}>
```

## Padrão Estabelecido

### Botões
```tsx
// Botões principais
className="h-12 md:h-11"

// Botões secundários
className="h-11 md:h-9"

// Botões de ícone (área de toque mínima 44x44px)
className="h-11 w-11 md:h-8 md:w-8"

// Ícones dentro dos botões
className="h-5 w-5 md:h-4 md:w-4"
```

### Textos
```tsx
// Títulos principais
className="text-2xl sm:text-3xl md:text-4xl"

// Títulos secundários  
className="text-xl sm:text-2xl md:text-3xl"

// Textos de corpo
className="text-sm md:text-base"
```

## Comando para Aplicar

Vou aplicar essas correções agora usando strReplace com contexto único para cada ocorrência.
