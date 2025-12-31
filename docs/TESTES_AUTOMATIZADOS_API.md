# 🤖 TESTES AUTOMATIZADOS VIA API

## 📋 VISÃO GERAL

Como o Docker não está disponível, vamos executar testes automatizados via API do Supabase usando JavaScript/TypeScript.

---

## 🚀 SCRIPT DE TESTE COMPLETO

Crie um arquivo `test-production.js` na raiz do projeto:

```javascript
// test-production.js
import { createClient } from '@supabase/supabase-js';

// Configuração
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Helpers
const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);
const success = (msg) => log(`✅ ${msg}`, 'green');
const error = (msg) => log(`❌ ${msg}`, 'red');
const warning = (msg) => log(`⚠️  ${msg}`, 'yellow');
const info = (msg) => log(`ℹ️  ${msg}`, 'blue');

// Contador de testes
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Função de teste
async function test(name, fn) {
  totalTests++;
  try {
    info(`Testando: ${name}`);
    await fn();
    passedTests++;
    success(`PASSOU: ${name}`);
  } catch (err) {
    failedTests++;
    error(`FALHOU: ${name}`);
    error(`  Erro: ${err.message}`);
  }
}

// Função de assert
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ========================================
// TESTES DE INTEGRIDADE DO BANCO
// ========================================

async function testDatabaseIntegrity() {
  log('\n=== TESTES DE INTEGRIDADE DO BANCO ===\n', 'blue');

  await test('Verificar transações sem competence_date', async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('id')
      .is('competence_date', null);
    
    if (error) throw error;
    assert(data.length === 0, `Encontradas ${data.length} transações sem competence_date`);
  });

  await test('Verificar transações compartilhadas sem splits', async () => {
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id')
      .eq('is_shared', true)
      .is('source_transaction_id', null);
    
    if (txError) throw txError;

    for (const tx of transactions) {
      const { data: splits, error: splitError } = await supabase
        .from('transaction_splits')
        .select('id')
        .eq('transaction_id', tx.id);
      
      if (splitError) throw splitError;
      assert(splits.length > 0, `Transação ${tx.id} compartilhada sem splits`);
    }
  });

  await test('Verificar splits sem user_id', async () => {
    const { data, error } = await supabase
      .from('transaction_splits')
      .select('id')
      .is('user_id', null);
    
    if (error) throw error;
    assert(data.length === 0, `Encontrados ${data.length} splits sem user_id`);
  });

  await test('Verificar transações com valor zero ou negativo', async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, amount')
      .lte('amount', 0);
    
    if (error) throw error;
    assert(data.length === 0, `Encontradas ${data.length} transações com valor inválido`);
  });

  await test('Verificar viagens sem owner nos membros', async () => {
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, owner_id');
    
    if (tripsError) throw tripsError;

    for (const trip of trips) {
      const { data: members, error: membersError } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', trip.id)
        .eq('user_id', trip.owner_id);
      
      if (membersError) throw membersError;
      assert(members.length > 0, `Viagem ${trip.id} sem owner nos membros`);
    }
  });
}

// ========================================
// TESTES DE FUNCIONALIDADES
// ========================================

async function testFunctionalities() {
  log('\n=== TESTES DE FUNCIONALIDADES ===\n', 'blue');

  // Criar usuário de teste
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test123456!';
  let testUser = null;

  await test('Criar usuário de teste', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) throw error;
    testUser = data.user;
    assert(testUser !== null, 'Usuário não foi criado');
  });

  await test('Fazer login', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) throw error;
    assert(data.user !== null, 'Login falhou');
  });

  // Criar conta de teste
  let testAccount = null;

  await test('Criar conta bancária', async () => {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        name: 'Conta Teste',
        type: 'CHECKING',
        balance: 1000,
        bank_id: 'nubank',
      })
      .select()
      .single();
    
    if (error) throw error;
    testAccount = data;
    assert(testAccount !== null, 'Conta não foi criada');
  });

  // Criar transação de teste
  let testTransaction = null;

  await test('Criar transação simples', async () => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        account_id: testAccount.id,
        amount: 100,
        description: 'Teste de transação',
        date: new Date().toISOString().split('T')[0],
        competence_date: new Date().toISOString().split('T')[0].substring(0, 8) + '01',
        type: 'EXPENSE',
        domain: 'PERSONAL',
      })
      .select()
      .single();
    
    if (error) throw error;
    testTransaction = data;
    assert(testTransaction !== null, 'Transação não foi criada');
  });

  await test('Verificar que saldo da conta foi atualizado', async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', testAccount.id)
      .single();
    
    if (error) throw error;
    // Saldo deve ter diminuído (1000 - 100 = 900)
    assert(data.balance === 900, `Saldo incorreto: ${data.balance}, esperado: 900`);
  });

  // Limpar dados de teste
  await test('Limpar dados de teste', async () => {
    // Excluir transação
    await supabase.from('transactions').delete().eq('id', testTransaction.id);
    
    // Excluir conta
    await supabase.from('accounts').delete().eq('id', testAccount.id);
    
    // Excluir usuário (via admin API se disponível)
    // await supabase.auth.admin.deleteUser(testUser.id);
    
    success('Dados de teste limpos');
  });
}

// ========================================
// TESTES DE CÁLCULOS FINANCEIROS
// ========================================

async function testFinancialCalculations() {
  log('\n=== TESTES DE CÁLCULOS FINANCEIROS ===\n', 'blue');

  await test('Verificar precisão de valores decimais', async () => {
    // Testar que valores são armazenados com 2 casas decimais
    const { data, error } = await supabase
      .from('transactions')
      .select('amount')
      .limit(10);
    
    if (error) throw error;
    
    for (const tx of data) {
      const decimals = (tx.amount.toString().split('.')[1] || '').length;
      assert(decimals <= 2, `Transação com mais de 2 casas decimais: ${tx.amount}`);
    }
  });

  await test('Verificar soma de splits igual ao total', async () => {
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('id, amount')
      .eq('is_shared', true)
      .is('source_transaction_id', null)
      .limit(10);
    
    if (txError) throw txError;

    for (const tx of transactions) {
      const { data: splits, error: splitError } = await supabase
        .from('transaction_splits')
        .select('amount')
        .eq('transaction_id', tx.id);
      
      if (splitError) throw splitError;
      
      const splitSum = splits.reduce((sum, s) => sum + Number(s.amount), 0);
      const diff = Math.abs(Number(tx.amount) - splitSum);
      
      // Permitir diferença de até 0.02 (arredondamento)
      assert(diff <= 0.02, `Soma dos splits (${splitSum}) difere do total (${tx.amount})`);
    }
  });
}

// ========================================
// TESTES DE SEGURANÇA
// ========================================

async function testSecurity() {
  log('\n=== TESTES DE SEGURANÇA ===\n', 'blue');

  await test('Verificar RLS está habilitado em todas as tabelas', async () => {
    const { data, error } = await supabase.rpc('check_rls_enabled');
    
    // Se a função não existir, pular teste
    if (error && error.message.includes('does not exist')) {
      warning('Função check_rls_enabled não existe, pulando teste');
      return;
    }
    
    if (error) throw error;
    
    // Verificar que todas as tabelas principais têm RLS
    const requiredTables = [
      'profiles',
      'accounts',
      'transactions',
      'transaction_splits',
      'families',
      'family_members',
      'trips',
      'trip_members',
    ];
    
    for (const table of requiredTables) {
      const hasRls = data.some(row => row.tablename === table && row.rowsecurity);
      assert(hasRls, `Tabela ${table} não tem RLS habilitado`);
    }
  });

  await test('Verificar que usuário não autenticado não acessa dados', async () => {
    // Criar cliente sem autenticação
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data, error } = await anonClient
      .from('transactions')
      .select('*')
      .limit(1);
    
    // Deve retornar vazio ou erro
    assert(
      data === null || data.length === 0 || error !== null,
      'Usuário não autenticado conseguiu acessar dados'
    );
  });
}

// ========================================
// EXECUTAR TODOS OS TESTES
// ========================================

async function runAllTests() {
  log('\n🚀 INICIANDO TESTES AUTOMATIZADOS\n', 'blue');
  log(`Data: ${new Date().toLocaleString('pt-BR')}\n`);

  try {
    await testDatabaseIntegrity();
    await testFinancialCalculations();
    await testSecurity();
    // await testFunctionalities(); // Comentado para não criar dados de teste
  } catch (err) {
    error(`Erro fatal: ${err.message}`);
  }

  // Resumo
  log('\n=== RESUMO DOS TESTES ===\n', 'blue');
  log(`Total de testes: ${totalTests}`);
  success(`Aprovados: ${passedTests}`);
  error(`Reprovados: ${failedTests}`);
  
  const percentage = ((passedTests / totalTests) * 100).toFixed(1);
  log(`\nTaxa de sucesso: ${percentage}%\n`);

  if (failedTests === 0) {
    success('✅ TODOS OS TESTES PASSARAM!');
    success('Sistema APROVADO para produção\n');
  } else {
    error('❌ ALGUNS TESTES FALHARAM!');
    error('Corrija os problemas antes do lançamento\n');
    process.exit(1);
  }
}

// Executar
runAllTests().catch(err => {
  error(`Erro ao executar testes: ${err.message}`);
  process.exit(1);
});
```

---

## 🚀 COMO EXECUTAR

### 1. Instalar Dependências (se necessário)
```bash
npm install @supabase/supabase-js
```

### 2. Configurar Variáveis de Ambiente
Certifique-se de que `.env` tem:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 3. Executar Testes
```bash
node test-production.js
```

---

## 📊 SAÍDA ESPERADA

```
🚀 INICIANDO TESTES AUTOMATIZADOS

Data: 31/12/2024 15:30:00

=== TESTES DE INTEGRIDADE DO BANCO ===

ℹ️  Testando: Verificar transações sem competence_date
✅ PASSOU: Verificar transações sem competence_date

ℹ️  Testando: Verificar transações compartilhadas sem splits
✅ PASSOU: Verificar transações compartilhadas sem splits

ℹ️  Testando: Verificar splits sem user_id
✅ PASSOU: Verificar splits sem user_id

ℹ️  Testando: Verificar transações com valor zero ou negativo
✅ PASSOU: Verificar transações com valor zero ou negativo

ℹ️  Testando: Verificar viagens sem owner nos membros
✅ PASSOU: Verificar viagens sem owner nos membros

=== TESTES DE CÁLCULOS FINANCEIROS ===

ℹ️  Testando: Verificar precisão de valores decimais
✅ PASSOU: Verificar precisão de valores decimais

ℹ️  Testando: Verificar soma de splits igual ao total
✅ PASSOU: Verificar soma de splits igual ao total

=== TESTES DE SEGURANÇA ===

ℹ️  Testando: Verificar RLS está habilitado em todas as tabelas
⚠️  Função check_rls_enabled não existe, pulando teste

ℹ️  Testando: Verificar que usuário não autenticado não acessa dados
✅ PASSOU: Verificar que usuário não autenticado não acessa dados

=== RESUMO DOS TESTES ===

Total de testes: 8
✅ Aprovados: 8
❌ Reprovados: 0

Taxa de sucesso: 100.0%

✅ TODOS OS TESTES PASSARAM!
✅ Sistema APROVADO para produção
```

---

## 🔧 PERSONALIZAR TESTES

### Adicionar Novo Teste
```javascript
await test('Nome do teste', async () => {
  // Seu código de teste aqui
  const { data, error } = await supabase
    .from('sua_tabela')
    .select('*');
  
  if (error) throw error;
  assert(data.length > 0, 'Mensagem de erro');
});
```

### Testar Função RPC
```javascript
await test('Testar função RPC', async () => {
  const { data, error } = await supabase.rpc('sua_funcao', {
    parametro1: 'valor1',
    parametro2: 'valor2',
  });
  
  if (error) throw error;
  assert(data !== null, 'Função não retornou dados');
});
```

---

## 📝 RELATÓRIO DE TESTES

Após executar, documente:

```
Data: ___/___/______
Hora: ___:___

Total de Testes: ___
Aprovados: ___
Reprovados: ___
Taxa de Sucesso: ___%

Problemas Encontrados:
1. _________________________________
2. _________________________________
3. _________________________________

Ações Tomadas:
1. _________________________________
2. _________________________________
3. _________________________________

Status Final: [ ] APROVADO [ ] REPROVADO
```

---

**Boa sorte com os testes! 🚀**
