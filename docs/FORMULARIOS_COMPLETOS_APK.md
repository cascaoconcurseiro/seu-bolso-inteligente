# 📝 FORMULÁRIOS COMPLETOS - Seu Bolso Inteligente APK

## 🎯 DOCUMENTAÇÃO COMPLETA DE TODOS OS FORMULÁRIOS

Este documento descreve TODOS os formulários do sistema para implementação no APK.

---

## 1. 🔐 AUTENTICAÇÃO

### 1.1 Formulário de Login
**Campos:**
- Email (text, required, email validation)
- Senha (password, required, min 6 caracteres)
- Lembrar-me (checkbox, optional)

**Botões:**
- "Entrar" (primary)
- "Esqueci minha senha" (link)
- "Criar conta" (link)

**Validações:**
- Email válido
- Senha mínimo 6 caracteres
- Mensagem de erro se credenciais inválidas

---

### 1.2 Formulário de Cadastro
**Campos:**
- Nome completo (text, required, min 3 caracteres)
- Email (text, required, email validation)
- Senha (password, required, min 6 caracteres)
- Confirmar senha (password, required, deve ser igual à senha)
- Aceitar termos (checkbox, required)

**Botões:**
- "Criar conta" (primary)
- "Já tenho conta" (link)

**Validações:**
- Nome mínimo 3 caracteres
- Email válido e único
- Senhas devem coincidir
- Senha mínimo 6 caracteres
- Termos devem ser aceitos

---

### 1.3 Formulário de Recuperação de Senha
**Campos:**
- Email (text, required, email validation)

**Botões:**
- "Enviar link de recuperação" (primary)
- "Voltar ao login" (link)

**Validações:**
- Email válido
- Email deve existir no sistema

---

## 2. 💰 TRANSAÇÕES

### 2.1 Formulário de Nova Transação
**Campos Principais:**
- Tipo (select, required)
  - Opções: Receita, Despesa, Transferência
- Valor (number, required, > 0)
- Descrição (text, required, max 200 caracteres)
- Data (date, required, default hoje)
- Conta (select, required)
- Categoria (select, required para Receita/Despesa)
- Notas (textarea, optional, max 500 caracteres)

**Campos Condicionais:**

**Se Transferência:**
- Conta de destino (select, required, diferente da origem)

**Campos Avançados (Accordion/Expansível):**
- Parcelamento (toggle)
  - Se ativo:
    - Número de parcelas (number, required, 2-60)
    - Valor por parcela (readonly, calculado)
- Recorrência (toggle)
  - Se ativo:
    - Frequência (select): Diária, Semanal, Mensal, Anual
    - Data de término (date, optional)
- Compartilhamento (toggle)
  - Se ativo:
    - Membros da família (multi-select, required)
    - Divisão (radio):
      - Igualmente
      - Personalizada (percentuais por membro)
    - Quem pagou (select, optional)
- Viagem (toggle)
  - Se ativo:
    - Selecionar viagem (select, required)
    - Moeda (select, default da viagem)

**Botões:**
- "Salvar" (primary)
- "Cancelar" (secondary)

**Validações:**
- Valor > 0
- Descrição obrigatória
- Conta obrigatória
- Categoria obrigatória (exceto transferência)
- Se transferência: conta destino diferente da origem
- Se parcelamento: número de parcelas entre 2 e 60
- Se compartilhamento: pelo menos 1 membro selecionado
- Se divisão personalizada: soma dos percentuais = 100%
- Se viagem: viagem deve estar selecionada

---

### 2.2 Formulário de Editar Transação
**Mesmos campos do formulário de nova transação**

**Campos Adicionais:**
- Se é parcela:
  - Opção: "Editar apenas esta parcela" ou "Editar todas as parcelas"
- Se é recorrente:
  - Opção: "Editar apenas esta" ou "Editar todas as futuras"

**Restrições:**
- Se transação está acertada (compartilhada): não pode editar valor nem divisão
- Se fatura fechada (cartão): não pode editar

---

## 3. 🏦 CONTAS

### 3.1 Formulário de Nova Conta
**Campos:**
- Nome da conta (text, required, max 50 caracteres)
- Tipo (select, required)
  - Opções: Conta Corrente, Poupança, Cartão de Crédito, Investimentos, Dinheiro, Fundo de Emergência
- Banco (select with search, optional)
  - Lista de bancos com logos
  - Opção "Outro"
- Saldo inicial (number, required, default 0)
- Moeda (select, required, default BRL)
  - Opções: BRL, USD, EUR, GBP, ARS, CLP, UYU, PYG, etc.
- Conta internacional (toggle, default false)

**Campos Condicionais (Se Cartão de Crédito):**
- Dia de fechamento (number, required, 1-31)
- Dia de vencimento (number, required, 1-31)
- Limite de crédito (number, required, > 0)

**Botões:**
- "Criar conta" (primary)
- "Cancelar" (secondary)

**Validações:**
- Nome obrigatório
- Tipo obrigatório
- Saldo inicial >= 0
- Se cartão: dia fechamento e vencimento entre 1-31
- Se cartão: limite > 0

---

### 3.2 Formulário de Editar Conta
**Mesmos campos do formulário de nova conta**

**Campos Adicionais:**
- Ajustar saldo (toggle)
  - Se ativo: Novo saldo (number)
  - Cria transação de ajuste automaticamente

**Restrições:**
- Não pode mudar o tipo da conta
- Não pode mudar a moeda se já tem transações

---

### 3.3 Formulário de Transferência
**Campos:**
- Conta de origem (select, required, readonly se veio de uma conta)
- Conta de destino (select, required, diferente da origem)
- Valor (number, required, > 0)
- Descrição (text, required, default "Transferência")
- Data (date, required, default hoje)
- Notas (textarea, optional)

**Botões:**
- "Transferir" (primary)
- "Cancelar" (secondary)

**Validações:**
- Contas diferentes
- Valor > 0
- Descrição obrigatória
- Mesma moeda (ou conversão automática)

---

### 3.4 Formulário de Saque/Depósito
**Campos:**
- Conta (select, required)
- Tipo (radio, required)
  - Saque (despesa)
  - Depósito (receita)
- Valor (number, required, > 0)
- Descrição (text, required)
- Data (date, required, default hoje)

**Botões:**
- "Confirmar" (primary)
- "Cancelar" (secondary)

---

## 4. 💳 CARTÕES DE CRÉDITO

### 4.1 Formulário de Novo Cartão
**Usa o mesmo formulário de Nova Conta com tipo = Cartão de Crédito**

---

### 4.2 Formulário de Pagar Fatura
**Campos:**
- Cartão (readonly)
- Mês da fatura (readonly)
- Valor total (readonly)
- Valor a pagar (number, required, <= valor total)
- Conta de pagamento (select, required)
- Data de pagamento (date, required, default hoje)

**Botões:**
- "Pagar" (primary)
- "Cancelar" (secondary)

**Validações:**
- Valor a pagar > 0
- Valor a pagar <= valor total
- Conta de pagamento obrigatória

---

## 5. 👥 DESPESAS COMPARTILHADAS

### 5.1 Formulário de Acertar Despesas
**Campos:**
- Membro (readonly)
- Despesas selecionadas (list, readonly)
- Valor total (readonly, calculado)
- Método de acerto (radio, required)
  - Dinheiro
  - Transferência
  - Pix
  - Outro
- Data do acerto (date, required, default hoje)
- Notas (textarea, optional)

**Botões:**
- "Confirmar acerto" (primary)
- "Cancelar" (secondary)

**Validações:**
- Pelo menos 1 despesa selecionada
- Método obrigatório
- Data obrigatória

---

## 6. ✈️ VIAGENS

### 6.1 Formulário de Nova Viagem
**Campos:**
- Nome da viagem (text, required, max 100 caracteres)
- Destino (text, required, max 100 caracteres)
- Data de início (date, required)
- Data de fim (date, required, >= data início)
- Moeda principal (select, required, default USD)
- Orçamento total (number, optional, > 0)
- Descrição (textarea, optional, max 500 caracteres)
- Membros (multi-select, required, mínimo 1)

**Botões:**
- "Criar viagem" (primary)
- "Cancelar" (secondary)

**Validações:**
- Nome obrigatório
- Destino obrigatório
- Data fim >= data início
- Moeda obrigatória
- Pelo menos 1 membro

---

### 6.2 Formulário de Editar Viagem
**Mesmos campos do formulário de nova viagem**

**Restrições:**
- Não pode mudar moeda se já tem transações
- Não pode remover membros que têm transações

---

### 6.3 Formulário de Orçamento Pessoal da Viagem
**Campos:**
- Viagem (readonly)
- Meu orçamento (number, required, > 0)

**Botões:**
- "Salvar" (primary)
- "Cancelar" (secondary)

**Validações:**
- Orçamento > 0

---

### 6.4 Formulário de Compra de Moeda
**Campos:**
- Viagem (readonly)
- Moeda comprada (select, required)
- Valor em moeda estrangeira (number, required, > 0)
- Taxa de câmbio (number, required, > 0)
- Valor em BRL (readonly, calculado)
- Data da compra (date, required, default hoje)
- Local (text, optional)
- Notas (textarea, optional)

**Botões:**
- "Salvar" (primary)
- "Cancelar" (secondary)

**Validações:**
- Moeda obrigatória
- Valores > 0
- Taxa > 0

---

### 6.5 Formulário de Item do Checklist
**Campos:**
- Item (text, required, max 100 caracteres)
- Categoria (select, optional)
  - Opções: Documentos, Roupas, Eletrônicos, Medicamentos, Outros
  - Ou criar nova categoria

**Botões:**
- "Adicionar" (primary)
- "Cancelar" (secondary)

---

### 6.6 Formulário de Item do Itinerário
**Campos:**
- Data (date, required)
- Horário início (time, required)
- Horário fim (time, optional)
- Título (text, required, max 100 caracteres)
- Local (text, optional, max 100 caracteres)
- Descrição (textarea, optional, max 500 caracteres)
- Custo estimado (number, optional, >= 0)

**Botões:**
- "Salvar" (primary)
- "Cancelar" (secondary)

**Validações:**
- Data obrigatória
- Horário início obrigatório
- Título obrigatório
- Se horário fim: deve ser >= horário início

---

## 7. 👨‍👩‍👧‍👦 FAMÍLIA

### 7.1 Formulário de Convidar Membro
**Campos:**
- Email (text, required, email validation)
- Nome (text, required, max 50 caracteres)
- Permissões (checkboxes)
  - Visualizar despesas
  - Criar despesas
  - Editar despesas
  - Deletar despesas
- Escopo de compartilhamento (radio, required)
  - Tudo
  - Apenas viagens
  - Período específico
  - Viagem específica

**Campos Condicionais:**
- Se "Período específico":
  - Data início (date, required)
  - Data fim (date, required, >= data início)
- Se "Viagem específica":
  - Viagem (select, required)

**Botões:**
- "Enviar convite" (primary)
- "Cancelar" (secondary)

**Validações:**
- Email válido
- Nome obrigatório
- Pelo menos 1 permissão selecionada
- Se período: data fim >= data início
- Se viagem: viagem obrigatória

---

### 7.2 Formulário de Editar Membro
**Campos:**
- Nome (text, required, max 50 caracteres)
- Permissões (checkboxes)
- Escopo de compartilhamento (radio)
- Avatar (image picker, optional)

**Botões:**
- "Salvar" (primary)
- "Cancelar" (secondary)

---

## 8. 📊 ORÇAMENTOS

### 8.1 Formulário de Novo Orçamento
**Campos:**
- Nome (text, required, max 50 caracteres)
- Categoria (select, required)
- Valor limite (number, required, > 0)
- Período (select, required)
  - Opções: Mensal, Anual
- Moeda (select, required, default BRL)
- Alertas (checkboxes, optional)
  - Alertar em 80%
  - Alertar em 100%
  - Alertar acima de 100%

**Botões:**
- "Criar orçamento" (primary)
- "Cancelar" (secondary)

**Validações:**
- Nome obrigatório
- Categoria obrigatória
- Valor > 0
- Período obrigatório

---

### 8.2 Formulário de Editar Orçamento
**Mesmos campos do formulário de novo orçamento**

---

## 9. 🏷️ CATEGORIAS

### 9.1 Formulário de Nova Categoria
**Campos:**
- Nome (text, required, max 50 caracteres)
- Tipo (radio, required)
  - Receita
  - Despesa
- Ícone (icon picker, required)
  - Grid de ícones para escolher
- Cor (color picker, required)
  - Paleta de cores predefinidas
- Categoria pai (select, optional)
  - Para criar subcategorias

**Botões:**
- "Criar categoria" (primary)
- "Cancelar" (secondary)

**Validações:**
- Nome obrigatório e único
- Tipo obrigatório
- Ícone obrigatório
- Cor obrigatória

---

### 9.2 Formulário de Editar Categoria
**Mesmos campos do formulário de nova categoria**

**Restrições:**
- Não pode mudar o tipo se já tem transações

---

## 10. ⚙️ CONFIGURAÇÕES

### 10.1 Formulário de Editar Perfil
**Campos:**
- Nome completo (text, required, max 100 caracteres)
- Email (text, readonly)
- Avatar (image picker, optional)
  - Opção: Tirar foto
  - Opção: Escolher da galeria
  - Opção: Usar avatar padrão

**Botões:**
- "Salvar" (primary)
- "Cancelar" (secondary)

**Validações:**
- Nome obrigatório

---

### 10.2 Formulário de Trocar Senha
**Campos:**
- Senha atual (password, required)
- Nova senha (password, required, min 6 caracteres)
- Confirmar nova senha (password, required, igual à nova senha)

**Botões:**
- "Alterar senha" (primary)
- "Cancelar" (secondary)

**Validações:**
- Senha atual correta
- Nova senha mínimo 6 caracteres
- Senhas devem coincidir
- Nova senha diferente da atual

---

### 10.3 Formulário de Preferências
**Campos:**
- Moeda padrão (select, required)
- Idioma (select, required)
  - Opções: Português (BR), Inglês, Espanhol
- Formato de data (select, required)
  - DD/MM/YYYY
  - MM/DD/YYYY
  - YYYY-MM-DD
- Formato de número (select, required)
  - 1.234,56 (BR)
  - 1,234.56 (US)
- Tema (radio, required)
  - Claro
  - Escuro
  - Automático (sistema)
- Primeira tela (select, required)
  - Dashboard
  - Transações
  - Contas

**Botões:**
- "Salvar" (primary)
- "Cancelar" (secondary)

---

### 10.4 Formulário de Configurações de Notificações
**Campos (todos toggles):**
- Notificações push (master toggle)
- Tipos de notificação:
  - Faturas próximas do vencimento
  - Orçamentos em alerta
  - Transações recorrentes
  - Convites para família
  - Acertos de despesas
  - Metas atingidas
- Horário de silêncio (toggle)
  - Se ativo:
    - Início (time picker)
    - Fim (time picker)
- Som (toggle)
- Vibração (toggle)

**Botões:**
- "Salvar" (primary)

---

### 10.5 Formulário de Configurações de Segurança
**Campos:**
- Autenticação biométrica (toggle)
  - Impressão digital
  - Reconhecimento facial
- PIN de acesso (toggle)
  - Se ativo: Definir PIN (4-6 dígitos)
- Autenticação de dois fatores (toggle)
- Logout automático (select)
  - Opções: Nunca, 5 min, 15 min, 30 min, 1 hora

**Botões:**
- "Salvar" (primary)

---

## 11. 📤 IMPORTAÇÃO/EXPORTAÇÃO

### 11.1 Formulário de Importar Dados
**Campos:**
- Tipo de arquivo (radio, required)
  - CSV
  - Excel (XLSX)
  - OFX
- Arquivo (file picker, required)
- Conta de destino (select, required)
- Mapeamento de colunas (se CSV/Excel)
  - Data → (select coluna)
  - Descrição → (select coluna)
  - Valor → (select coluna)
  - Tipo → (select coluna)

**Botões:**
- "Importar" (primary)
- "Cancelar" (secondary)

**Validações:**
- Arquivo obrigatório
- Conta obrigatória
- Mapeamento completo (CSV/Excel)

---

### 11.2 Formulário de Exportar Dados
**Campos:**
- Formato (radio, required)
  - CSV
  - Excel (XLSX)
  - PDF
- Período (radio, required)
  - Mês atual
  - Últimos 3 meses
  - Últimos 6 meses
  - Último ano
  - Tudo
  - Personalizado
- Se personalizado:
  - Data início (date, required)
  - Data fim (date, required)
- Incluir (checkboxes)
  - Transações
  - Contas
  - Orçamentos
  - Categorias
  - Compartilhados

**Botões:**
- "Exportar" (primary)
- "Cancelar" (secondary)

**Validações:**
- Formato obrigatório
- Período obrigatório
- Se personalizado: data fim >= data início
- Pelo menos 1 item selecionado

---

## 12. 🔍 FILTROS

### 12.1 Formulário de Filtros de Transações
**Campos:**
- Período (radio)
  - Mês atual
  - Últimos 30 dias
  - Últimos 90 dias
  - Personalizado
- Se personalizado:
  - Data início (date)
  - Data fim (date)
- Tipo (multi-select)
  - Receita
  - Despesa
  - Transferência
- Contas (multi-select)
- Categorias (multi-select)
- Domínio (multi-select)
  - Pessoal
  - Compartilhado
  - Viagem
- Valor (range)
  - Mínimo (number)
  - Máximo (number)
- Status (multi-select)
  - Pago
  - Pendente
  - Acertado

**Botões:**
- "Aplicar filtros" (primary)
- "Limpar filtros" (secondary)

---

## 13. 🎯 METAS FINANCEIRAS (Futuro)

### 13.1 Formulário de Nova Meta
**Campos:**
- Nome da meta (text, required)
- Valor alvo (number, required, > 0)
- Valor atual (number, optional, default 0)
- Data alvo (date, optional)
- Categoria (select, optional)
- Descrição (textarea, optional)

**Botões:**
- "Criar meta" (primary)
- "Cancelar" (secondary)

---

## 📋 PADRÕES GERAIS

### Validações Comuns
- Campos obrigatórios marcados com *
- Validação em tempo real (on blur)
- Mensagens de erro abaixo do campo
- Desabilitar botão submit se form inválido
- Loading state no botão durante submit

### UX Patterns
- Autofocus no primeiro campo
- Tab order lógico
- Enter para submit (quando apropriado)
- ESC para cancelar
- Confirmação antes de ações destrutivas
- Toast de sucesso/erro após submit
- Voltar para tela anterior após sucesso

### Acessibilidade
- Labels descritivos
- Placeholders informativos
- Mensagens de erro claras
- Contraste adequado
- Tamanho mínimo de toque: 44x44px
- Suporte a screen readers

### Mobile Specific
- Teclado numérico para campos de número
- Teclado de email para campos de email
- Date picker nativo
- Time picker nativo
- Color picker nativo
- File picker nativo
- Camera integration

---

**TOTAL DE FORMULÁRIOS:** 35+ formulários completos
**TOTAL DE CAMPOS:** 200+ campos diferentes
**VALIDAÇÕES:** 100+ regras de validação

Este documento contém TODOS os formulários necessários para implementar o APK completo!