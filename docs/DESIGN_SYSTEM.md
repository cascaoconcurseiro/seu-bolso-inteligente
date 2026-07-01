# Design System — Fluxos e Formulários

> Documentação de design de todos os formulários, diálogos e modais do sistema.
> Última atualização: 2026-07-01

---

## Índice
1. [Transações](#1-transações)
2. [Contas](#2-contas)
3. [Cartões de Crédito](#3-cartões-de-crédito)
4. [Metas e Investimentos](#4-metas-e-investimentos)
5. [Viagens](#5-viagens)
6. [Família e Compartilhado](#6-família-e-compartilhado)
7. [Orçamentos](#7-orçamentos)
8. [Auth e Onboarding](#8-auth-e-onboarding)
9. [Configurações](#9-configurações)
10. [Padrões de Design](#10-padrões-de-design)

---

## 1. Transações

### 1.1 TransactionForm / TransactionModal
**Arquivo:** `src/components/transactions/TransactionForm.tsx`, `src/components/modals/TransactionModal.tsx`

**Fluxo:** Single-step com tabs implícitas (despesa / receita / transferência)

```
┌─────────────────────────────────┐
│ Tipo: [Despesa ▼]               │
│ Valor: R$ _______               │
│ Conta: [Selecionar ▼]           │
│ Categoria: [Selecionar ▼]       │
│ Data: [__/__/____]              │
│ Descrição: _____________        │
│ □ Recorrente  □ Parcelado       │
│ □ Compartilhado                 │
│ Tags: [tag1] [tag2]             │
│                                 │
│ [Salvar]                        │
└─────────────────────────────────┘
```

**Validações:** Zod schema (`useTransactionForm.ts`)
- Tipo obrigatório (INCOME/EXPENSE/TRANSFER)
- Valor > 0
- Conta obrigatória
- Se TRANSFER → conta destino obrigatória
- Se parcelado → número de parcelas ≥ 2

**Design patterns:**
- ✅ Campo de valor com máscara de moeda
- ✅ Select de categoria com ícones
- ✅ Toggle para recorrente/parcelado/compartilhado
- ⚠️ Muitos campos em tela única — poderia ser wizard de 2 passos

---

### 1.2 QuickAddModal
**Arquivo:** `src/components/modals/QuickAddModal.tsx`

**Fluxo:** Single-step ultra-rápido

```
┌─────────────────────────────────┐
│ R$ _______                      │
│ Descrição: _____________        │
│ Categoria: [AI sugere ▼]        │
│ Conta: [Selecionar ▼]          │
│ □ Viagem                        │
│                                 │
│ [Adicionar]                     │
└─────────────────────────────────┘
```

**Design patterns:**
- ✅ AI prediction: preenche categoria baseado na descrição
- ✅ Campo de valor em destaque (maior)
- ✅ Foco em velocidade (3 campos essenciais)
- ⚠️ Só cria despesas — não cobre receitas (decisão consciente)

---

### 1.3 SplitModal
**Arquivo:** `src/components/transactions/SplitModal.tsx`

**Fluxo:** Divide transação entre membros da família

```
┌─────────────────────────────────┐
│ Pagador: [Selecionar ▼]         │
│                                 │
│ Parceiro: 50%  [＿＿＿]         │
│ Você:     50%  [＿＿＿]         │
│ Total:    100%                  │
│                                 │
│ □ Parcelar esta compra          │
│                                 │
│ [Salvar Divisão]                │
└─────────────────────────────────┘
```

**Validações:**
- Soma dos % = 100%
- Auto-inicia 50/50 com primeiro membro

---

### 1.4 ConfirmTransactionDialog
**Arquivo:** `src/components/transactions/ConfirmTransactionDialog.tsx`

**Fluxo:** Confirma transação agendada/recorrente

```
┌─────────────────────────────────┐
│ Valor: R$ [editável]           │
│ Data: [__/__/____]             │
│                                 │
│ [Confirmar]                     │
└─────────────────────────────────┘
```

---

### 1.5 AdvancedInstallmentsDialog
**Arquivo:** `src/components/transactions/AdvanceInstallmentsDialog.tsx`

**Fluxo:** Adianta parcelas futuras para o mês atual

```
┌─────────────────────────────────┐
│ ☑ Parcela 2/12 — Ago/2026      │
│ ☑ Parcela 3/12 — Set/2026      │
│ ☐ Parcela 4/12 — Out/2026      │
│                                 │
│ [Adiantar Selecionadas]         │
└─────────────────────────────────┘
```

---

### 1.6 DeleteTransactionModal
**Arquivo:** `src/components/modals/DeleteTransactionModal.tsx`

**Fluxo:** Confirmação de exclusão com opções de cascata

```
┌─────────────────────────────────┐
│ ⚠️ Excluir transação?          │
│                                 │
│ ○ Só esta                       │
│ ○ Esta e futuras (série)        │
│ ○ Esta e compartilhadas         │
│                                 │
│ [Cancelar]  [Excluir]           │
└─────────────────────────────────┘
```

---

### 1.7 OFXImportModal
**Arquivo:** `src/components/modals/OFXImportModal.tsx`

**Fluxo:** Importa transações de arquivo OFX

```
┌─────────────────────────────────┐
│ Conta: [Selecionar ▼]           │
│                                 │
│ [📎 Selecionar arquivo OFX]     │
│                                 │
│ (Preview das transações)        │
│ ☑ Transação 1 — R$ 50,00       │
│ ☑ Transação 2 — R$ 120,00      │
│                                 │
│ [Importar]                      │
└─────────────────────────────────┘
```

**Validações:** Deduplicação contra transações existentes

---

## 2. Contas

### 2.1 AccountFormModal
**Arquivo:** `src/components/accounts/AccountFormModal.tsx`

**Fluxo:** Single-step

```
┌─────────────────────────────────┐
│ Nome: _____________             │
│ Tipo: [Corrente ▼]              │
│ Banco: [Selecionar ▼]           │
│ Saldo inicial: R$ _______       │
│ Moeda: [BRL ▼]                  │
│ (se cartão) Limite: R$ _____    │
│ (se cartão) Fechamento: [10 ▼]  │
│ (se cartão) Vencimento: [20 ▼]  │
│ □ Internacional                 │
│                                 │
│ [Salvar]                        │
└─────────────────────────────────┘
```

---

### 2.2 TransferModal
**Arquivo:** `src/components/accounts/TransferModal.tsx`

**Fluxo:** Single-step

```
┌─────────────────────────────────┐
│ De: [Conta origem ▼]            │
│ Para: [Conta destino ▼]         │
│ Valor: R$ _______               │
│ Descrição: _____________        │
│ (se cross-currency) Câmbio: ___ │
│                                 │
│ [Transferir]                    │
└─────────────────────────────────┘
```

---

### 2.3 WithdrawalModal
**Arquivo:** `src/components/accounts/WithdrawalModal.tsx`

**Fluxo:** Single-step

```
┌─────────────────────────────────┐
│ Valor: R$ _______               │
│ Descrição: _____________        │
│                                 │
│ [Sacar]                         │
└─────────────────────────────────┘
```

**Validação:** Valor > 0 e ≤ saldo disponível

---

## 3. Cartões de Crédito

### 3.1 NewCardDialog
**Arquivo:** `src/components/credit-cards/NewCardDialog.tsx`

**Fluxo:** Single-step

```
┌─────────────────────────────────┐
│ Banco: [Selecionar ▼]           │
│ Bandeira: [Visa ▼]              │
│ Nome: _____________             │
│ Fechamento: [10 ▼]              │
│ Vencimento: [20 ▼]              │
│ Limite: R$ _______             │
│ □ Internacional                 │
│ Moeda: [USD ▼]                  │
│                                 │
│ [Criar Cartão]                  │
└─────────────────────────────────┘
```

---

### 3.2 PayInvoiceDialog
**Arquivo:** `src/components/credit-cards/PayInvoiceDialog.tsx`

**Fluxo:** 2-step wizard com animação

```
┌─────────────────────────────────┐
│ ●○○○ Progresso                  │
│                                 │
│ STEP 1:                         │
│ ┌─────────────────────────────┐ │
│ │   Total da fatura           │ │
│ │   R$ 859,61                 │ │
│ └─────────────────────────────┘ │
│ Qual valor deseja pagar agora?  │
│ R$ [859,61]                     │
│ ⚠️ Pagamento parcial: restará  │
│    R$ X para o próximo mês      │
│                                 │
│ [Continuar →]                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ ●●○○ Progresso                  │
│                                 │
│ STEP 2:                         │
│ De onde sairá o dinheiro?       │
│ [Nubank - Conta Corrente ▼]     │
│ 💱 Câmbio: R$ 1 = USD [____]   │
│                                 │
│ R$ 859,61 serão debitados de   │
│ Nubank - Conta Corrente         │
│                                 │
│ [← Voltar]  [Pagar Fatura]      │
└─────────────────────────────────┘
```

**Design:**
- ✅ Wizard 2-passos reduz carga cognitiva
- ✅ Barra de progresso visual
- ✅ Transições animadas (spring)
- ✅ Mobile-first: bottom sheet
- ⚠️ Sem confirmação final — executa direto

---

### 3.3 ImportBillsDialog
**Arquivo:** `src/components/credit-cards/ImportBillsDialog.tsx`

**Fluxo:** 2 tabs (valores mensais / importação parcelada)

```
TAB 1 — Valores Mensais:
┌─────────────────────────────────┐
│ Jan: R$ ___  Fev: R$ ___  ...   │
│ (grid de 12 meses)              │
│                                 │
│ [Importar]                      │
└─────────────────────────────────┘

TAB 2 — Importação Parcelada:
┌─────────────────────────────────┐
│ Descrição: _____________        │
│ Valor total: R$ _______         │
│ Parcelas: [3 ▼]                 │
│ Mês inicial: [Julho ▼]          │
│ Categoria: [Selecionar ▼]       │
│ □ Compartilhado com: [____ ▼]   │
│                                 │
│ [Importar]                      │
└─────────────────────────────────┘
```

---

## 4. Metas e Investimentos

### 4.1 GoalFormDialog
**Arquivo:** `src/components/goals/GoalFormDialog.tsx`

```
┌─────────────────────────────────┐
│ Nome: _____________             │
│ Descrição: _____________        │
│ Valor alvo: R$ _______          │
│ Data alvo: [__/__/____]         │
│ Prioridade: [Média ▼]           │
│ Conta vinculada: [Nenhuma ▼]    │
│                                 │
│ [Salvar]                        │
└─────────────────────────────────┘
```

### 4.2 GoalContributeDialog
```
┌─────────────────────────────────┐
│ ○ Adicionar  ○ Retirar          │
│ Valor: R$ _______               │
│ Conta: [Selecionar ▼]           │
│                                 │
│ [Confirmar]                     │
│                                 │
│ (Confete ao atingir 100% 🎉)    │
└─────────────────────────────────┘
```

### 4.3 AssetFormDialog
**Arquivo:** `src/components/investments/AssetFormDialog.tsx`

```
┌─────────────────────────────────┐
│ Local: [Brasil ▼]               │
│ Tipo: [Ações ▼]                 │
│ Ticker: [PETR4 (autocomplete)]  │
│ Nome: _____________             │
│ Setor: [Financeiro ▼]           │
│ Quantidade: ___                 │
│ Preço médio: R$ _______         │
│ Corretora: [Clear ▼]            │
│ Data: [__/__/____]              │
│                                 │
│ [Adicionar Ativo]               │
└─────────────────────────────────┘
```

**Design:**
- ✅ Autocomplete de tickers (B3 + exterior + crypto)
- ✅ Campos condicionais por localização
- ✅ Corretora com autocomplete

---

## 5. Viagens

### 5.1 NewTripDialog / EditTripDialog

```
┌─────────────────────────────────┐
│ Nome: _____________             │
│ Destino: _____________          │
│ De: [__/__/____]                │
│ Até: [__/__/____]               │
│ Orçamento: R$ _______           │
│ Moeda: [BRL ▼]                  │
│                                 │
│ 👥 Participantes:               │
│ ☑ Wesley  ☐ Parceiro            │
│                                 │
│ [Criar Viagem]                  │
└─────────────────────────────────┘
```

### 5.2 AddParticipantDialog
```
┌─────────────────────────────────┐
│ [Família] [Contatos] [Convidado]│
│                                 │
│ Família:                        │
│ ☐ João                         │
│ ☐ Maria                        │
│                                 │
│ [Adicionar Selecionados]        │
└─────────────────────────────────┘
```

### 5.3 ExchangePurchaseDialog
```
┌─────────────────────────────────┐
│ Valor em BRL: R$ _______        │
│ Valor em USD: $ _______         │
│ Cotação: R$ 1 = USD [auto]     │
│ Descrição: _____________        │
│ Data: [__/__/____]              │
│                                 │
│ [Registrar]                     │
└─────────────────────────────────┘
```

---

## 6. Família e Compartilhado

### 6.1 InviteMemberDialog
```
┌─────────────────────────────────┐
│ [Família] [Contato]             │
│                                 │
│ Nome: _____________             │
│ Email: _____________            │
│ Função: [Membro ▼]              │
│ Compartilhar:                   │
│ ○ Tudo  ○ Por período  ○ Viagem│
│                                 │
│ [Enviar Convite]                │
└─────────────────────────────────┘
```

### 6.2 SharedSettleDialog
```
┌─────────────────────────────────┐
│ Itens a acertar:                │
│ ☑ Restaurante — R$ 100,00       │
│ ☑ Gasolina — R$ 50,00           │
│ Total: R$ 150,00                │
│                                 │
│ Conta: [Selecionar ▼]           │
│ Data: [__/__/____]              │
│ Valor: R$ [150,00]              │
│                                 │
│ [Acertar]                       │
└─────────────────────────────────┘
```

---

## 7. Orçamentos

**Arquivo:** `src/pages/Budgets.tsx` (inline)

```
┌─────────────────────────────────┐
│ Categoria: [Alimentação ▼]      │
│ Valor: R$ _______               │
│ Moeda: [BRL ▼]                  │
│                                 │
│ [Criar Orçamento]               │
└─────────────────────────────────┘
```

---

## 8. Auth e Onboarding

### 8.1 Auth (Login / Sign Up / Reset)
```
┌─────────────────────────────────┐
│ Email: _____________            │
│ Senha: _____________ 👁         │
│ (signup) Nome: _________        │
│                                 │
│ [Entrar]  [Criar conta]         │
│ Esqueci minha senha             │
└─────────────────────────────────┘
```

### 8.2 WelcomeOnboarding (4 passos)
```
STEP 1: Conta inicial
STEP 2: Cartão de crédito (opcional)
STEP 3: Pular
STEP 4: Concluir
```

### 8.3 PinWrapper
```
┌─────────────────────────────────┐
│ Digite seu PIN: [____]          │
│                                 │
│ (5 tentativas → bloqueio 60s)   │
└─────────────────────────────────┘
```

---

## 9. Configurações

### 9.1 Settings (vários inline dialogs)
- **Nova Categoria:** nome + tipo + ícone
- **Alterar Senha:** nova senha + confirmar
- **Editar Cartão:** nome + fechamento + vencimento + limite
- **Editar Nome:** campo único
- **PIN:** 4-6 dígitos
- **Preferências:** moeda + idioma + tema + formato data
- **Avatar:** grid de seleção

---

## 10. Padrões de Design

### Validação
| Padrão              | Onde                      |
| ------------------- | ------------------------- |
| Zod schema          | TransactionForm           |
| Inline (amount > 0) | QuickAddModal, Withdrawal |
| % até 100%          | SplitModal                |
| Server-side RPC     | PinWrapper                |

### Navegação
| Padrão             | Onde                                    |
| ------------------ | --------------------------------------- |
| Wizard multi-step  | PayInvoiceDialog, Onboarding            |
| Single-step modal  | Maioria                                 |
| Tabs               | ImportBillsDialog, AddParticipantDialog |
| Inline (na página) | Budgets, Settings                       |

### Feedback
| Padrão                               | Onde                        |
| ------------------------------------ | --------------------------- |
| Toast sonner                         | Todos (erro/sucesso)        |
| Loading spinner                      | Botões de submit            |
| Confete 🎉                            | GoalContributeDialog (100%) |
| ActionFeedback (animação tela cheia) | Transações, settlement      |

### Oportunidades de melhoria
- ⚠️ **Sem confirmação pré-submit** — PayInvoiceDialog, TransferModal, WithdrawalModal executam direto
- ⚠️ **Sem indicador de saldo** — PayInvoiceDialog não mostra saldo da conta selecionada
- ⚠️ **TransactionForm sobrecarregado** — muitos campos em tela única, poderia ser wizard
- ⚠️ **Falta consistência** — alguns usam Zod, outros validação inline
