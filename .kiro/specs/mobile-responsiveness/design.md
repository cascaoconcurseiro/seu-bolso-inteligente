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

### 4. SharedExpenses (SharedExpenses.tsx)

**Problemas Identificados:**
- Cards de membros muito largos
- Botões de acerto pequenos
- Tabs não scrolláveis
- Valores cortados

**Soluções:**

```tsx
// Tabs responsivas com scroll horizontal
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
    <TabsList className="inline-flex w-auto min-w-full md:w-full">
      <TabsTrigger value="REGULAR" className="flex-1 min-w-[100px]">
        <Users className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Família</span>
        <span className="sm:hidden">Família</span>
      </TabsTrigger>
      <TabsTrigger value="TRAVEL" className="flex-1 min-w-[100px]">
        <Plane className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">Viagens</span>
        <span className="sm:hidden">Viagens</span>
      </TabsTrigger>
    </TabsList>
  </div>

  {/* Cards de membros full-width em mobile */}
  <div className="space-y-4">
    {groupedExpenses.map(({ member, expenses, balance }) => (
      <Card key={member.id} className="overflow-hidden">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 md:h-12 md:w-12">
                <AvatarFallback>{member.full_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base md:text-lg">{member.full_name}</CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground">{expenses.length} transações</p>
              </div>
            </div>
            
            {/* Saldo empilhado em mobile */}
            <div className="flex flex-col sm:items-end gap-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Saldo</p>
              <p className={`font-mono text-lg md:text-xl font-bold ${
                balance > 0 ? 'text-positive' : balance < 0 ? 'text-negative' : 'text-muted-foreground'
              }`}>
                {balance > 0 ? '+' : ''}{formatCurrency(Math.abs(balance))}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 pt-0">
          {/* Lista de transações compacta */}
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{expense.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm font-medium">{formatCurrency(expense.amount)}</p>
                  {/* Botão de acerto touch-friendly */}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-full mt-1 text-xs"
                    onClick={() => handleSettle(expense.id)}
                  >
                    {expense.settled ? '✓ Acertado' : 'Acertar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Botão de acerto geral full-width em mobile */}
          {balance !== 0 && (
            <Button 
              className="w-full mt-4 h-11 md:h-10" 
              variant={balance > 0 ? 'default' : 'outline'}
              onClick={() => handleSettleAll(member.id)}
            >
              {balance > 0 ? 'Receber' : 'Pagar'} {formatCurrency(Math.abs(balance))}
            </Button>
          )}
        </CardContent>
      </Card>
    ))}
  </div>
</Tabs>
```

### 5. Trips (Trips.tsx)

**Problemas Identificados:**
- Cards de resumo não cabem em 4 colunas
- Header da viagem muito grande
- Tabs não scrolláveis
- Formulário de despesa não responsivo

**Soluções:**

```tsx
// Header da viagem compacto
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
        <Plane className="h-5 w-5 md:h-6 md:w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-bold text-xl md:text-2xl tracking-tight truncate">
          {trip.name}
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
        </p>
      </div>
    </div>
  </div>
  
  {/* Botões empilhados em mobile */}
  <div className="flex flex-col sm:flex-row gap-2">
    <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
      <Users className="h-4 w-4" />
      <span className="hidden sm:inline">Participantes</span>
      <span className="sm:hidden">Membros</span>
    </Button>
    <Button size="sm" className="w-full sm:w-auto gap-2">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Nova Despesa</span>
      <span className="sm:hidden">Nova</span>
    </Button>
  </div>
</div>

// Cards de resumo em grid 2 colunas mobile
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
  {/* Orçamento */}
  <Card className="p-3 md:p-4">
    <div className="flex items-center gap-2 mb-2">
      <DollarSign className="h-4 w-4 text-blue-500" />
      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">
        Orçamento
      </p>
    </div>
    <p className="font-mono text-base md:text-lg font-bold truncate">
      {formatCurrencyWithSymbol(trip.budget, trip.currency)}
    </p>
  </Card>

  {/* Compartilhadas */}
  <Card className="p-3 md:p-4">
    <div className="flex items-center gap-2 mb-2">
      <Users className="h-4 w-4 text-purple-500" />
      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">
        Compartilhadas
      </p>
    </div>
    <p className="font-mono text-base md:text-lg font-bold truncate">
      {formatCurrencyWithSymbol(summary.total_shared, trip.currency)}
    </p>
  </Card>

  {/* Meus Individuais */}
  <Card className="p-3 md:p-4">
    <div className="flex items-center gap-2 mb-2">
      <User className="h-4 w-4 text-blue-500" />
      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">
        Meus Individuais
      </p>
    </div>
    <p className="font-mono text-base md:text-lg font-bold truncate">
      {formatCurrencyWithSymbol(myTripSpent, trip.currency)}
    </p>
  </Card>

  {/* Acertado */}
  <Card className="p-3 md:p-4">
    <div className="flex items-center gap-2 mb-2">
      <CheckCircle className="h-4 w-4 text-green-500" />
      <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">
        Acertado
      </p>
    </div>
    <p className="font-mono text-base md:text-lg font-bold truncate">
      {formatCurrencyWithSymbol(summary.total_settled, trip.currency)}
    </p>
  </Card>
</div>

// Meu Resumo responsivo
<Card className={`p-4 md:p-6 ${myBalance === 0 ? 'border-green-500 border-2' : myBalance > 0 ? 'border-blue-500' : 'border-orange-500'}`}>
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 md:h-12 md:h-12">
        <AvatarFallback>{user?.user_metadata?.full_name?.[0]}</AvatarFallback>
      </Avatar>
      <div>
        <h3 className="font-semibold text-base md:text-lg">Meu Resumo</h3>
        <p className="text-xs md:text-sm text-muted-foreground">
          {myBalance === 0 ? '✓ Tudo acertado!' : myBalance > 0 ? 'Você receberá' : 'Você deve'}
        </p>
      </div>
    </div>
    
    <div className="text-left sm:text-right">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saldo</p>
      <p className={`font-mono text-xl md:text-2xl font-bold ${
        myBalance === 0 ? 'text-green-500' : myBalance > 0 ? 'text-blue-500' : 'text-orange-500'
      }`}>
        {myBalance > 0 ? '+' : ''}{formatCurrencyWithSymbol(Math.abs(myBalance), trip.currency)}
      </p>
      {myBalance !== 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          Acerte em Compartilhados → Viagem
        </p>
      )}
    </div>
  </div>
</Card>

// Tabs scrolláveis
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
    <TabsList className="inline-flex w-auto min-w-full md:w-full">
      <TabsTrigger value="expenses" className="flex-1 min-w-[100px]">
        <Receipt className="h-4 w-4 mr-2" />
        Gastos
      </TabsTrigger>
      <TabsTrigger value="participants" className="flex-1 min-w-[100px]">
        <Users className="h-4 w-4 mr-2" />
        Membros
      </TabsTrigger>
      <TabsTrigger value="summary" className="flex-1 min-w-[100px]">
        <BarChart3 className="h-4 w-4 mr-2" />
        Resumo
      </TabsTrigger>
    </TabsList>
  </div>
</Tabs>
```

### 6. TransactionForm (TransactionForm.tsx)

**Problemas Identificados:**
- Formulário não responsivo
- Inputs muito pequenos
- Botões de ação não tocáveis
- Seletor de data difícil de usar

**Soluções:**

```tsx
// Modal fullscreen em mobile
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0">
    <DialogHeader className="p-4 md:p-6 pb-4 sticky top-0 bg-background z-10 border-b">
      <DialogTitle className="text-lg md:text-xl">
        {transaction ? 'Editar Transação' : 'Nova Transação'}
      </DialogTitle>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="p-4 md:p-6 pt-0 space-y-4 md:space-y-6">
      {/* Tipo de transação - botões grandes e tocáveis */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={formData.type === 'INCOME' ? 'default' : 'outline'}
            className="h-12 md:h-10 gap-2"
            onClick={() => setFormData({ ...formData, type: 'INCOME' })}
          >
            <ArrowUpRight className="h-4 w-4" />
            Entrada
          </Button>
          <Button
            type="button"
            variant={formData.type === 'EXPENSE' ? 'default' : 'outline'}
            className="h-12 md:h-10 gap-2"
            onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
          >
            <ArrowDownRight className="h-4 w-4" />
            Saída
          </Button>
        </div>
      </div>

      {/* Descrição - input maior */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
          Descrição
        </Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Ex: Almoço no restaurante"
          className="h-12 md:h-10 text-base"
          required
        />
      </div>

      {/* Valor - input numérico grande */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="text-sm font-medium">
          Valor
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            R$
          </span>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0,00"
            className="h-12 md:h-10 pl-10 text-base font-mono"
            inputMode="decimal"
            required
          />
        </div>
      </div>

      {/* Categoria e Conta em grid responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Categoria</Label>
          <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
            <SelectTrigger className="h-12 md:h-10 text-base">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-base py-3">
                  <span className="mr-2">{cat.icon}</span>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Conta</Label>
          <Select value={formData.account_id} onValueChange={(value) => setFormData({ ...formData, account_id: value })}>
            <SelectTrigger className="h-12 md:h-10 text-base">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id} className="text-base py-3">
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data - input maior */}
      <div className="space-y-2">
        <Label htmlFor="date" className="text-sm font-medium">
          Data
        </Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="h-12 md:h-10 text-base"
          required
        />
      </div>

      {/* Parcelamento - apenas para cartão de crédito */}
      {selectedAccount?.type === 'CREDIT_CARD' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="installments"
              checked={formData.installments > 1}
              onCheckedChange={(checked) => setFormData({ 
                ...formData, 
                installments: checked ? 2 : 1 
              })}
            />
            <Label htmlFor="installments" className="text-sm font-medium cursor-pointer">
              Parcelar compra
            </Label>
          </div>
          {formData.installments > 1 && (
            <Input
              type="number"
              min="2"
              max="48"
              value={formData.installments}
              onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}
              className="h-12 md:h-10 text-base"
            />
          )}
        </div>
      )}

      {/* Compartilhar - switch grande */}
      {canShare && (
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="flex-1">
            <Label htmlFor="shared" className="text-sm font-medium cursor-pointer">
              Compartilhar despesa
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Dividir com membros da família
            </p>
          </div>
          <Switch
            id="shared"
            checked={formData.is_shared}
            onCheckedChange={(checked) => setFormData({ ...formData, is_shared: checked })}
            className="scale-110"
          />
        </div>
      )}
    </form>

    {/* Footer sticky com botões grandes */}
    <div className="sticky bottom-0 bg-background border-t p-4 md:p-6 flex flex-col sm:flex-row gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onOpenChange}
        className="flex-1 h-12 md:h-10"
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        onClick={handleSubmit}
        className="flex-1 h-12 md:h-10"
        disabled={loading}
      >
        {loading ? 'Salvando...' : transaction ? 'Salvar' : 'Criar'}
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### 7. MonthSelector (MonthSelector.tsx)

**Problemas Identificados:**
- Botões muito pequenos
- Texto do mês cortado
- Não responsivo

**Soluções:**

```tsx
<div className="flex items-center gap-1 md:gap-2">
  <Button
    variant="ghost"
    size="icon"
    onClick={handlePreviousMonth}
    className="h-9 w-9 md:h-8 md:w-8 shrink-0"
  >
    <ChevronLeft className="h-5 w-5 md:h-4 md:w-4" />
  </Button>

  <div className="min-w-[140px] md:min-w-[160px] text-center">
    <p className="font-medium text-sm md:text-base capitalize">
      {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
    </p>
  </div>

  <Button
    variant="ghost"
    size="icon"
    onClick={handleNextMonth}
    className="h-9 w-9 md:h-8 md:w-8 shrink-0"
  >
    <ChevronRight className="h-5 w-5 md:h-4 md:w-4" />
  </Button>

  <Button
    variant="outline"
    size="sm"
    onClick={handleToday}
    className="h-9 md:h-8 px-3 md:px-4 text-xs md:text-sm shrink-0"
  >
    Hoje
  </Button>
</div>
```

## Safari iOS Specific Fixes

### Viewport Configuration

```html
<!-- index.html -->
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
```

### Safe Area Insets

```css
/* App.css ou global styles */
:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
  --safe-area-inset-left: env(safe-area-inset-left);
  --safe-area-inset-right: env(safe-area-inset-right);
}

/* Aplicar em containers principais */
.app-container {
  padding-top: max(1rem, var(--safe-area-inset-top));
  padding-bottom: max(1rem, var(--safe-area-inset-bottom));
  padding-left: max(1rem, var(--safe-area-inset-left));
  padding-right: max(1rem, var(--safe-area-inset-right));
}
```

### Prevent Zoom on Input Focus

```css
/* Garantir que inputs tenham font-size >= 16px */
input, select, textarea {
  font-size: 16px !important;
}

@media (min-width: 768px) {
  input, select, textarea {
    font-size: 14px !important;
  }
}
```

### Webkit Specific Fixes

```css
/* Remover bounce scroll */
body {
  overscroll-behavior-y: none;
  -webkit-overflow-scrolling: touch;
}

/* Remover tap highlight */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Smooth scroll */
html {
  scroll-behavior: smooth;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

## Implementation Strategy

### Phase 1: Core Layout (Priority: HIGH)
1. Atualizar AppLayout.tsx com header e navegação responsivos
2. Adicionar safe-area-insets para iOS
3. Configurar viewport meta tag
4. Testar em dispositivos reais

### Phase 2: Main Pages (Priority: HIGH)
1. Dashboard.tsx - cards e grid responsivos
2. Transactions.tsx - lista e filtros responsivos
3. SharedExpenses.tsx - cards de membros responsivos
4. Trips.tsx - resumo e tabs responsivos

### Phase 3: Forms and Modals (Priority: MEDIUM)
1. TransactionForm.tsx - formulário fullscreen mobile
2. Outros modais e dialogs
3. Inputs com tamanho adequado (>= 16px)
4. Botões touch-friendly (>= 44x44px)

### Phase 4: Components (Priority: MEDIUM)
1. MonthSelector.tsx - botões maiores
2. BankIcon.tsx - tamanhos responsivos
3. Cards e badges - padding responsivo
4. Tabelas - conversão para cards em mobile

### Phase 5: Polish and Testing (Priority: LOW)
1. Animações e transições
2. Performance optimization
3. Testes em Safari iOS
4. Testes em Chrome Android
5. Ajustes finais baseados em feedback

## Testing Checklist

### Devices to Test
- [ ] iPhone SE (375px)
- [ ] iPhone 12/13/14 (390px)
- [ ] iPhone 14 Pro Max (430px)
- [ ] Android Small (360px)
- [ ] Android Medium (412px)
- [ ] iPad Mini (768px)
- [ ] iPad Pro (1024px)

### Browsers to Test
- [ ] Safari iOS 15+
- [ ] Chrome Android
- [ ] Chrome iOS
- [ ] Firefox Android

### Features to Test
- [ ] Navigation and menu
- [ ] Forms and inputs
- [ ] Buttons and touch targets
- [ ] Cards and lists
- [ ] Modals and dialogs
- [ ] Tables and data display
- [ ] Images and icons
- [ ] Animations and transitions
- [ ] Orientation changes
- [ ] Keyboard behavior
- [ ] Scroll behavior

## Success Metrics

1. **No horizontal scroll** em nenhuma página
2. **Todos os botões >= 44x44px** para touch
3. **Todos os inputs >= 16px** para prevenir zoom no iOS
4. **Tempo de carregamento < 3s** em 3G
5. **Score Lighthouse Mobile >= 90**
6. **Zero erros de layout** em DevTools mobile
7. **Feedback positivo** de usuários mobile
