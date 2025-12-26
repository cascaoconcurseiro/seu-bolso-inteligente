# 📋 ORDEM DOS CAMPOS - FORMULÁRIOS

## 🎯 ORDEM CORRETA (PE COPY)

### 1. **HEADER**
- Tabs: Despesa | Receita | Transferência
- Botão Fechar (X)

### 2. **ALERTAS** (se aplicável)
- Badge "Editando" (se modo edição)
- Alerta de Duplicata (se detectado)

### 3. **VALOR** (destaque no topo)
- Input grande centralizado
- Moeda dinâmica (R$ / USD / etc)
- Indicador de moeda da viagem (se vinculado)

### 4. **DESCRIÇÃO**
- Input de texto simples
- Placeholder: "Ex: Almoço, Uber, Salário"

### 5. **DATA E CATEGORIA** (lado a lado)
- **Coluna 1**: Data (com calendário)
- **Coluna 2**: Categoria (dropdown)
  - Alerta se data fora do período da viagem

### 6. **VIAGEM** (apenas para Despesas)
- Seletor de viagem (opcional)
- Mostra moeda da viagem selecionada
- Botão "Criar Viagem" se não houver nenhuma

### 7. **CONTA**
- **Se payerId === 'me'**: Seletor de conta
- **Se payerId !== 'me'**: Badge "Pago por [Nome]"
- Para Transferências: Origem + Destino

### 8. **DIVISÃO/COMPARTILHAMENTO** (apenas para Despesas)
- Card com ícone de Users
- Botão "Dividir" ou "Editar"
- Mostra resumo: "X pessoa(s) · Eu paguei/Outro pagou"
- Mostra valor por pessoa

### 9. **PARCELAMENTO** (apenas para Despesas com Cartão de Crédito)
- Switch "Parcelado"
- Seletor de número de parcelas (2x a 12x)
- Mostra valor de cada parcela

### 10. **RECORRÊNCIA** (opcional)
- Switch "Recorrente"
- Seletor de frequência
- Dia da recorrência

### 11. **LEMBRETE** (opcional)
- Switch "Lembrete"
- Data do lembrete
- Opções de antecedência

### 12. **OBSERVAÇÕES**
- Textarea (opcional)
- Placeholder: "Alguma anotação..."

### 13. **BOTÕES DE AÇÃO**
- Botão "Salvar" (principal)
- Botão "Atualizar Futuras" (se recorrente em edição)

---

## ❌ ORDEM ATUAL (INCORRETA)

1. Header (Tabs + Fechar) ✅
2. Valor ✅
3. Descrição ✅
4. Data ✅
5. Conta ❌ **ERRADO - Deveria vir DEPOIS de Categoria e Viagem**
6. Categoria ❌ **ERRADO - Deveria vir ANTES de Conta**
7. Viagem ❌ **ERRADO - Deveria vir ANTES de Conta**
8. Divisão/Compartilhamento ✅
9. Parcelamento ✅
10. Observações ✅
11. Botão Salvar ✅

---

## 🔧 CORREÇÕES NECESSÁRIAS

### Reordenar campos:
1. ✅ Valor (já está correto)
2. ✅ Descrição (já está correto)
3. ✅ Data (já está correto)
4. ❌ **MOVER**: Categoria (deve vir junto com Data, lado a lado)
5. ❌ **MOVER**: Viagem (deve vir ANTES de Conta)
6. ❌ **MOVER**: Conta (deve vir DEPOIS de Viagem)
7. ✅ Divisão (já está correto)
8. ✅ Parcelamento (já está correto)
9. ✅ Observações (já está correto)

### Adicionar campos faltantes:
- ❌ **FALTA**: Recorrência (switch + frequência + dia)
- ❌ **FALTA**: Lembrete (switch + data + opções)
- ❌ **FALTA**: Botão "Atualizar Futuras" (para recorrentes)

### Ajustar lógica:
- ❌ **FALTA**: Parcelamento deve funcionar para QUALQUER despesa (não só cartão de crédito)
- ❌ **FALTA**: Parcelamento deve estar no SplitModal (junto com divisão)
- ❌ **FALTA**: Validação de data dentro do período da viagem
- ❌ **FALTA**: Conversão de moeda para transferências internacionais

---

## 📝 PRÓXIMOS PASSOS

1. Reordenar campos no TransactionForm.tsx
2. Adicionar campos de Recorrência
3. Adicionar campos de Lembrete
4. Mover Parcelamento para SplitModal
5. Adicionar validações de data da viagem
6. Adicionar suporte a conversão de moeda
7. Testar todos os fluxos

