# ⚡ INSTRUÇÕES URGENTES - DEBUG

## 🎯 O QUE FAZER AGORA

### 1. Recarregar a Página
- Abra a página "Compartilhados" no navegador
- Pressione **F5** ou **Ctrl+R** para recarregar
- Aguarde a página carregar completamente

### 2. Abrir Console do Navegador
- Pressione **F12** para abrir DevTools
- Clique na aba **Console**
- Limpe o console (ícone 🚫 ou Ctrl+L)

### 3. Recarregar Novamente
- Com o console aberto, pressione **F5** novamente
- Aguarde todos os logs aparecerem

### 4. Copiar TODOS os Logs
Procure e copie **TODOS** os logs que começam com:
- 🔍 (lupa azul)
- ✅ (check verde)
- ❌ (X vermelho)
- 📊 (gráfico)
- 🟣 (roxo)

### 5. Enviar os Logs
Cole TODOS os logs aqui no chat.

---

## 📋 LOGS ESPERADOS

Você deve ver algo como:

```javascript
🔍 [useSharedFinances] Members from useFamilyMembers: ...
🔍 [Query] Buscando splits para transactionIds: ...
✅ [Query Result - Splits]: ...
✅ [Query Result] Transações com splits: ...
🔍 [useMemo] Iniciando processamento: ...
✅ [useMemo] Inicializando invoiceMap para membro: ...
🔍 [CASO 1] Processando tx: ...
📊 [useSharedFinances] Invoice Map Final: ...
```

---

## ⚠️ IMPORTANTE

- **NÃO** feche o console
- **NÃO** recarregue a página antes de copiar os logs
- **COPIE TUDO**, mesmo que pareça muito texto
- Se houver erros em vermelho, copie também

---

## 🎯 O QUE ESTAMOS INVESTIGANDO

Com esses logs, vou identificar:

1. ✅ Se `useFamilyMembers()` retorna Fran
2. ✅ Se a query de splits retorna o split
3. ✅ Se os splits são combinados com as transações
4. ✅ Se o `useMemo` processa corretamente
5. ✅ Se o `invoiceMap` é criado
6. ✅ Onde exatamente o fluxo quebra

---

## 🚀 APÓS ENVIAR OS LOGS

Vou:
1. Analisar os logs
2. Identificar o problema exato
3. Aplicar a correção
4. Fazer commit e push
5. Pedir para você testar novamente

**TEMPO ESTIMADO**: 10-15 minutos após receber os logs

---

## ✅ CHECKLIST

- [ ] Página "Compartilhados" aberta
- [ ] Console aberto (F12)
- [ ] Página recarregada
- [ ] Logs copiados
- [ ] Logs enviados no chat

**AGUARDANDO SEUS LOGS!** 🎯
