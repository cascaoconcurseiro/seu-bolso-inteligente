# Design Document: Responsividade Mobile Completa

## Overview

Este documento detalha as soluções de design para tornar todo o sistema Pé de Meia totalmente responsivo e otimizado para dispositivos móveis (Chrome e Safari iOS).

## Architecture

### Abordagem Mobile-First
- Usar Tailwind CSS com breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Aplicar estilos mobile por padrão, adicionar modificadores para telas maiores
- Testar em dispositivos reais (iPhone, Android) além de DevTools

### Breakpoints Strategy
```css
/* Mobile: < 640px (padrão) */
/* Tablet: sm: >= 640px */
/* Desktop: md: >= 768px, lg: >= 1024px */
```

## Components and Interfaces

### 1. Layout Global (AppLayout.tsx)

**Problemas Identificados:**
- Header com muitos elementos em mobile
- Botões muito pequenos
- Menu não otimizado para touch

**Soluções:**

```tsx
// Header responsivo
<div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
  {/* Logo menor em mobile */}
  <Link to="/" className="flex items-center gap-2">
    <span className="font-display font-bold text-lg md:text-xl tracking-tight">
      pé de meia
    </span>
  </Link>

  {/* Botões com tamanho adequado para touch */}
  <div className="flex items-center gap-1 md:gap-2">
    <Button variant="ghost" size="icon" className="h-10 w-10 md:h-9 md:w-9">
      <Bell className="h-5 w-5 md:h-4 md:w-4" />
    </Button>
  </div>
</div>

// Month Selector responsivo
<div className="px-3 md:px-6 py-2 md:py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
  <div className="flex-1 w-full sm:w-auto" />
  <MonthSelector />
  <div className="flex-1 w-full sm:w-auto flex justify-end">
    <Button size="sm" className="w-full sm:w-auto gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Nova transação</span>
      <span className="sm:hidden">Nova</span>
    </Button>
  </div>
</div>
```

### 2. Dashboard (Dashboard.tsx)

**Problemas Identificados:**
- Saldo muito grande em mobile
- Cards de moedas estrangeiras não cabem
- Grid não responsivo

**Soluções:**

```tsx
// Hero Section responsivo
<div className="space-y-2">
  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
    Saldo atual (BRL)
  </p>
  {/* Tamanho reduzido em mobile */}
  <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight">
    {formatCurrency(balance)}
  </h1>
  {/* Entradas/Saídas empilhadas em mobile */}
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
    <span className="flex items-center gap-1.5">
      <ArrowUpRight className="h-4 w-4 text-green-500" />
      <span className="text-muted-foreground">Entradas</span>
      <span className="text-green-500 font-medium">{formatCurrency(income)}</span>
    </span>
    <span className="flex items-center gap-1.5">
      <ArrowDownRight className="h-4 w-4 text-red-500" />
      <span className="text-muted-foreground">Saídas</span>
      <span className="text-red-500 font-medium">{formatCurrency(expenses)}</span>
    </span>
  </div>
</div>

// Moedas estrangeiras em grid 2 colunas mobile
{hasForeignBalances && (
  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4">
    {Object.entries(balancesByForeignCurrency).map(([currency, currencyBalance]) => (
      <div key={currency} className="flex items-center gap-2 p-3 rounded-xl border">
        <Globe className="h-4 w-4 text-blue-500" />
        <div className="min-w-0">
          <p className="text-[10px] text-blue-600 uppercase tracking-wider font-medium truncate">
            {currency}
          </p>
          <p className="font-mono font-bold text-base sm:text-lg truncate">
            {formatCurrencyWithSymbol(currencyBalance, currency)}
          </p>
        </div>
      </div>
    ))}
  </div>
)}

// Grid principal responsivo
<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
  <div className="lg:col-span-8 space-y-6 md:space-y-8">
    {/* Conteúdo */}
  </div>
  <aside className="lg:col-span-4 space-y-4 md:space-y-6">
    {/* Sidebar */}
  </aside>
</div>
```

### 3. Transactions (Transactions.tsx)

**Problemas Identificados:**
- Filtros não cabem em uma linha
- Botões de ação muito pequenos
- Valores monetários cortados

**Soluções:**

```tsx
// Header responsivo
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight">Transações</h1>
    <p className="text-muted-foreground mt-1">{filteredTransactions.length} registros</p>
  </div>
  <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
    <Download className="h-4 w-4" />
    Exportar
  </Button>
</div>

// Summary responsivo
<div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 py-4 border-y border-border">
  <div className="flex-1">
    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Entradas</p>
    <p className="font-mono text-base sm:text-lg font-medium text-positive">
      +{formatCurrency(totalIncome)}
    </p>
  </div>
  <div className="flex-1">
    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Saídas</p>
    <p className="font-mono text-base sm:text-lg font-medium text-negative">
      -{formatCurrency(totalExpense)}
    </p>
  </div>
  <div className="flex-1">
    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Resultado</p>
    <p className="font-mono text-base sm:text-lg font-medium">
      {totalIncome - totalExpense >= 0 ? "+" : "-"}
      {formatCurrency(Math.abs(totalIncome - totalExpense))}
    </p>
  </div>
</div>

// Filtros empilhados em mobile
{showFilters && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border">
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase">Tipo</label>
      <Select value={selectedType} onValueChange={setSelectedType}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        {/* ... */}
      </Select>
    </div>
    {/* Outros filtros */}
  </div>
)}

// Item de transação responsivo
<div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-base md:text-lg shrink-0">
    {transaction.category?.icon}
  </div>
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 flex-wrap">
      <p className="font-medium text-sm md:text-base truncate">{transaction.description}</p>
      {/* Badges */}
    </div>
    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground flex-wrap mt-1">
      <span className="truncate">{transaction.category?.name}</span>
      {/* Outros detalhes */}
    </div>
  </div>
</div>
```
