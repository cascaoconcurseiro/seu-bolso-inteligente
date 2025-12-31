# 🧪 Teste Rápido - Correções de Hoje

## 🚀 Iniciar Sistema

```bash
cd seu-bolso-inteligente
npm run dev
```

Acesse: `http://localhost:5173`

---

## ✅ Teste 1: Logos (2 minutos)

### Passo 1: Contas
1. Ir em **Contas** (menu lateral)
2. Clicar em **"Nova conta"**
3. Abrir seletor de **"Banco"**
4. **VERIFICAR:** Logos aparecem ao lado dos nomes ✅

### Passo 2: Cartões
1. Ir em **Cartões** (menu lateral)
2. Clicar em **"Novo cartão"**
3. Abrir seletor de **"Banco"**
4. **VERIFICAR:** Logos aparecem ao lado dos nomes ✅

**✅ Se viu as logos, está funcionando!**

---

## ✅ Teste 2: Parcelas Compartilhadas (3 minutos)

### Passo 1: Importar Parcelas
1. Ir em **Compartilhados** (menu lateral)
2. Clicar em **"Importar Parcelas"**
3. Preencher:
   - **Descrição:** Teste Geladeira
   - **Valor da Parcela:** 95,00
   - **Parcelas:** 10
   - **Data 1ª Parcela:** 01/01/2025
   - **Selecionar um membro**
4. Clicar em **"Confirmar"**

### Passo 2: Verificar
- **VERIFICAR:** Formulário fecha rápido (2-3 segundos) ✅
- **VERIFICAR:** Toast de sucesso aparece ✅
- **VERIFICAR:** Aparece "10 parcelas importadas" ✅

### Passo 3: Navegar pelos Meses
1. Na página de Compartilhados, usar as **setas** para navegar
2. **Janeiro 2025:** Deve mostrar apenas **1/10** (R$ 95,00) ✅
3. **Fevereiro 2025:** Deve mostrar apenas **2/10** (R$ 95,00) ✅
4. **Março 2025:** Deve mostrar apenas **3/10** (R$ 95,00) ✅

**✅ Se cada mês mostra apenas UMA parcela, está funcionando!**

---

## 🎯 O Que Esperar

### ✅ Logos
- Logos bonitas ao lado dos nomes dos bancos
- Fallback com ícone colorido se logo não carregar
- Logos em contas, cartões e dashboard

### ✅ Parcelas
- Valor correto: 95,00 = R$ 95,00 (não mais 9,50)
- Importação rápida: 2-3 segundos (não mais 10-30s)
- Uma parcela por mês (não mais duplicadas)

---

## 🐛 Se Algo Não Funcionar

### Logos não aparecem?
1. Verificar se pasta `public/bank-logos/` existe
2. Fazer hard refresh: `Ctrl + Shift + R`
3. Limpar cache do navegador

### Parcelas com valor errado?
1. Verificar se digitou corretamente (ex: 95 = R$ 95,00)
2. Verificar se selecionou um membro
3. Ver console do navegador (F12) para erros

### Parcelas duplicadas?
1. Verificar se está navegando pelos meses corretamente
2. Cada mês deve mostrar apenas a parcela daquele mês
3. Se duplicar, reportar o bug

---

## 📞 Documentação Completa

Se precisar de mais detalhes:

- **Logos:** `docs/INTEGRACAO_LOGOS_COMPLETA.md`
- **Parcelas:** `docs/CORRECAO_PARCELAS_COMPARTILHADAS.md`
- **Resumo:** `docs/RESUMO_CORRECOES_31_12_2024.md`

---

## 🎉 Pronto!

Se os dois testes passaram, **tudo está funcionando perfeitamente!** 🚀

Aproveite o sistema com as logos bonitas e parcelas funcionando corretamente!
