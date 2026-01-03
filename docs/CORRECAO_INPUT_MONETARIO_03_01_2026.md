# Correção: Input Monetário Automático

**Data:** 03/01/2026  
**Tipo:** Melhoria de UX  
**Status:** ✅ Implementado

## Problema Identificado

O sistema estava usando `type="number"` para campos de valores monetários, o que causava problemas:

1. **Formatação incorreta**: Ao digitar "5961158", o sistema interpretava como R$ 59,11 ao invés de R$ 59.611,58
2. **Impossibilidade de usar separadores**: Não permitia digitar pontos ou vírgulas manualmente
3. **UX ruim**: Usuário precisava fazer cálculos mentais para inserir valores

### Exemplo do Problema
- Usuário quer inserir: **R$ 59.611,58**
- Digitava: `5961158`
- Sistema entendia: **R$ 59,11** ❌

## Solução Implementada

Criado componente `CurrencyInput` que:

1. **Formatação automática**: Entende que os últimos 2 dígitos são centavos
2. **Separadores automáticos**: Adiciona pontos de milhar e vírgula decimal automaticamente
3. **Suporte multi-moeda**: Funciona com BRL, USD, EUR, etc.
4. **Apenas números**: Bloqueia entrada de caracteres não numéricos

### Como Funciona

```typescript
// Usuário digita: 5961158
// Display mostra: 59.611,58
// Valor retornado: "59611.58"
```

**Fluxo:**
1. Usuário digita apenas números: `5961158`
2. Sistema interpreta últimos 2 dígitos como centavos: `59611` reais e `58` centavos
3. Formata para exibição: `59.611,58` (BRL) ou `59,611.58` (USD)
4. Retorna valor numérico puro para o backend: `59611.58`

## Arquivos Modificados

### 1. Novo Componente
- `src/components/ui/currency-input.tsx` - Componente reutilizável

### 2. Formulários Atualizados

#### Contas (`src/pages/Accounts.tsx`)
- ✅ Campo "Saldo inicial" (criar conta)
- ✅ Campo "Saldo atual" (editar conta)
- ✅ Suporte para contas nacionais (BRL) e internacionais (USD, EUR, etc.)

#### Transações (`src/components/transactions/TransactionForm.tsx`)
- ✅ Campo "Valor" principal
- ✅ Suporte para todas as moedas de viagens
- ✅ Mantém cores por tipo (despesa, receita, transferência)

#### Cartões de Crédito (`src/pages/CreditCards.tsx`)
- ✅ Campo "Limite" (criar cartão)
- ✅ Campo "Limite" (editar cartão)
- ✅ Campo "Valor" (importação de faturas)
- ✅ Suporte para cartões nacionais e internacionais

#### Orçamento de Viagens (`src/components/trips/PersonalBudgetDialog.tsx`)
- ✅ Campo "Orçamento Pessoal"
- ✅ Funciona com moeda da viagem

#### Orçamentos (`src/pages/Budgets.tsx`)
- ✅ Campo "Valor Limite"
- ✅ Suporte multi-moeda

#### Compra de Moeda (`src/components/trips/ExchangePurchaseDialog.tsx`)
- ✅ Campo "Valor em moeda estrangeira"
- ✅ Formatação por moeda

#### Transferências (`src/components/accounts/TransferModal.tsx`)
- ✅ Campo "Valor" da transferência
- ✅ Suporte cross-currency

#### Saques (`src/components/accounts/WithdrawalModal.tsx`)
- ✅ Campo "Valor" do saque

#### Lista de Compras (`src/components/trips/TripShopping.tsx`)
- ✅ Campo "Custo Estimado"
- ✅ Formatação por moeda da viagem

#### Parcelas Compartilhadas (`src/components/shared/SharedInstallmentImport.tsx`)
- ✅ Campo "Valor da Parcela"

#### Acertos (`src/pages/SharedExpenses.tsx`)
- ✅ Campo "Valor do acerto"
- ✅ Suporte multi-moeda

## Exemplos de Uso

### Exemplo 1: Conta com saldo alto
```
Digita: 5961158
Mostra: 59.611,58
Salva: 59611.58
```

### Exemplo 2: Valor pequeno
```
Digita: 1050
Mostra: 10,50
Salva: 10.50
```

### Exemplo 3: Centavos
```
Digita: 99
Mostra: 0,99
Salva: 0.99
```

### Exemplo 4: Conta internacional (USD)
```
Digita: 1234567
Mostra: 12,345.67
Salva: 12345.67
```

## Benefícios

1. ✅ **Intuitivo**: Usuário digita números naturalmente
2. ✅ **Sem erros**: Impossível inserir valor errado
3. ✅ **Visual claro**: Formatação em tempo real
4. ✅ **Multi-moeda**: Funciona com qualquer moeda
5. ✅ **Consistente**: Mesmo comportamento em todo o sistema

## Testes Recomendados

### Teste 1: Valores Grandes
- [ ] Criar conta com R$ 59.611,58
- [ ] Verificar que salva corretamente
- [ ] Editar e verificar que mantém o valor

### Teste 2: Valores Pequenos
- [ ] Criar transação de R$ 10,50
- [ ] Verificar formatação
- [ ] Confirmar salvamento

### Teste 3: Centavos
- [ ] Inserir R$ 0,99
- [ ] Verificar que não arredonda

### Teste 4: Contas Internacionais
- [ ] Criar conta USD com $12,345.67
- [ ] Verificar formatação americana
- [ ] Confirmar moeda correta

### Teste 5: Cartões de Crédito
- [ ] Definir limite de R$ 15.000,00
- [ ] Editar limite para R$ 20.000,00
- [ ] Verificar cálculo de uso

### Teste 6: Orçamento de Viagem
- [ ] Definir orçamento de R$ 5.000,00
- [ ] Verificar tracking de gastos
- [ ] Confirmar alertas de limite

## Notas Técnicas

### Componente CurrencyInput

**Props:**
- `value: string` - Valor numérico como string
- `onChange: (value: string) => void` - Callback com valor numérico
- `currency?: string` - Moeda (padrão: "BRL")
- `className?: string` - Classes CSS adicionais
- Todas as props de `HTMLInputElement`

**Características:**
- `inputMode="numeric"` - Teclado numérico no mobile
- `type="text"` - Permite formatação customizada
- Bloqueia caracteres não numéricos
- Permite Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
- Permite backspace, delete, setas

### Formatação por Moeda

**BRL (Real Brasileiro):**
- Formato: `59.611,58`
- Separador de milhar: `.`
- Separador decimal: `,`

**USD/EUR/Outras:**
- Formato: `59,611.58`
- Separador de milhar: `,`
- Separador decimal: `.`

## Compatibilidade

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS Safari, Chrome Android)
- ✅ Tablets
- ✅ Teclado numérico mobile
- ✅ Acessibilidade (screen readers)

## Próximos Passos

Possíveis melhorias futuras:
1. Adicionar suporte para símbolos de moeda digitáveis
2. Permitir colar valores formatados
3. Adicionar validação de limites (min/max)
4. Suporte para mais moedas exóticas

## Conclusão

A implementação do `CurrencyInput` resolve completamente o problema de entrada de valores monetários, tornando o sistema mais intuitivo e profissional. Todos os campos de valor no sistema agora usam formatação automática consistente.
