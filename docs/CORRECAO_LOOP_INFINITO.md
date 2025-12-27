# Correção: Loop Infinito no TransactionForm

## 🐛 Problema
Ao clicar em "Nova Transação", o formulário ficava em loop infinito de carregamento (spinner girando sem parar).

## 🔍 Causa Raiz
O `useEffect` que cria categorias padrão estava causando um loop infinito:

```typescript
// ❌ ANTES - Loop infinito
useEffect(() => {
  if (!categoriesLoading && categories?.length === 0) {
    createDefaultCategories.mutate();
  }
}, [categoriesLoading, categories]); // categories muda constantemente
```

**Por que causava loop:**
1. useEffect verifica se `categories` está vazio
2. Se vazio, chama `createDefaultCategories.mutate()`
3. Categorias são criadas, `categories` array muda
4. Mudança em `categories` dispara o useEffect novamente
5. Volta ao passo 1 → **LOOP INFINITO**

## ✅ Solução
Adicionada flag `categoriesChecked` para garantir que a verificação aconteça apenas uma vez:

```typescript
// ✅ DEPOIS - Executa apenas uma vez
const [categoriesChecked, setCategoriesChecked] = useState(false);

useEffect(() => {
  if (!categoriesLoading && !categoriesChecked) {
    setCategoriesChecked(true);
    if (categories?.length === 0) {
      createDefaultCategories.mutate();
    }
  }
}, [categoriesLoading, categoriesChecked, categories?.length, createDefaultCategories]);
```

**Como funciona:**
1. useEffect verifica se já foi executado (`categoriesChecked`)
2. Se não foi, marca como executado (`setCategoriesChecked(true)`)
3. Verifica se precisa criar categorias
4. Cria categorias se necessário
5. **Nunca mais executa** porque `categoriesChecked` é `true`

## 📁 Arquivo Modificado
- `src/components/transactions/TransactionForm.tsx`

## 🧪 Como Testar
1. Abrir qualquer página do sistema
2. Clicar em "Nova Transação"
3. **Resultado Esperado**: 
   - Formulário abre normalmente
   - Não fica em loop de loading
   - Todos os campos aparecem
   - Console sem erros

## 💾 Commit
```
ad0a714 - fix: corrige loop infinito no TransactionForm

- Adiciona flag categoriesChecked para evitar loop no useEffect
- useEffect de categorias agora executa apenas uma vez
- Formulário não fica mais em loading infinito
```

## 📊 Status
- ✅ Bug corrigido
- ✅ Commit realizado
- ✅ Push para repositório
- ✅ Pronto para teste

## 🎯 Próximos Passos
1. Testar formulário de transação
2. Verificar se convites de viagem aparecem
3. Testar todas as funcionalidades do sistema
