# 📋 INSTRUÇÕES PARA AUDITORIA DO BANCO DE DADOS
**Data**: 31/12/2024  
**Status**: ✅ PRONTO PARA EXECUTAR

---

## 🎯 ARQUIVOS CRIADOS

### 1. AUDITORIA_SIMPLES.sql ✅ RECOMENDADO
**Use este para**: Verificar o estado atual do banco

**O que faz**:
- ✅ Conta duplicados (splits, mirrors, ledger)
- ✅ Lista triggers ativos
- ✅ Lista funções de mirroring
- ✅ Mostra resumo geral
- ✅ Status final (OK ou com problemas)

**Como usar**:
```
1. Abrir Supabase SQL Editor
2. Copiar todo o conteúdo de AUDITORIA_SIMPLES.sql
3. Colar no editor
4. Clicar em "Run"
5. Analisar resultados
```

**Tempo**: ~30 segundos

---

### 2. LIMPAR_DUPLICADOS_AGORA.sql ⚠️ CUIDADO
**Use este para**: Remover duplicados encontrados

**O que faz**:
- ⚠️ Remove splits duplicados
- ⚠️ Remove mirrors duplicados
- ⚠️ Remove ledger duplicado
- ✅ Adiciona constraints para prevenir duplicações futuras
- ✅ Valida que limpeza funcionou

**Como usar**:
```
1. FAZER BACKUP DO BANCO (Supabase Dashboard > Database > Backups)
2. Abrir Supabase SQL Editor
3. Copiar todo o conteúdo de LIMPAR_DUPLICADOS_AGORA.sql
4. Colar no editor
5. Clicar em "Run"
6. Verificar resultados
```

**Tempo**: ~1-2 minutos

**⚠️ ATENÇÃO**: Este script DELETA dados! Fazer backup antes!

---

### 3. QUERIES_VERIFICACAO_RAPIDA.sql 📊 OPCIONAL
**Use este para**: Monitoramento contínuo

**O que faz**:
- 📊 Queries individuais para verificações específicas
- 📊 Análise de performance
- 📊 Verificação de integridade
- 📊 Saúde geral do sistema

**Como usar**:
```
1. Abrir arquivo
2. Copiar apenas a query que você precisa
3. Executar no SQL Editor
```

**Tempo**: Variável (cada query ~5 segundos)

---

## 🚀 PASSO A PASSO RECOMENDADO

### ETAPA 1: AUDITORIA (OBRIGATÓRIO)
```bash
Arquivo: AUDITORIA_SIMPLES.sql
Ação: Executar completo
Tempo: 30 segundos
Risco: ZERO (somente leitura)
```

**Resultado esperado**:
- Você verá quantos duplicados existem
- Você verá quais triggers estão ativos
- Você verá o status geral do banco

**Decisão**:
- ✅ Se status mostrar "SEM DUPLICADOS" → Tudo OK, não precisa limpar
- ⚠️ Se status mostrar "TEM DUPLICADOS" → Prosseguir para ETAPA 2

---

### ETAPA 2: BACKUP (OBRIGATÓRIO SE HOUVER DUPLICADOS)
```bash
Local: Supabase Dashboard
Caminho: Database > Backups > Create Backup
Tempo: 1-2 minutos
```

**Como fazer**:
1. Abrir Supabase Dashboard
2. Clicar em "Database" no menu lateral
3. Clicar em "Backups"
4. Clicar em "Create Backup"
5. Aguardar confirmação

**⚠️ NÃO PROSSIGA SEM BACKUP!**

---

### ETAPA 3: LIMPEZA (SOMENTE SE HOUVER DUPLICADOS)
```bash
Arquivo: LIMPAR_DUPLICADOS_AGORA.sql
Ação: Executar completo
Tempo: 1-2 minutos
Risco: BAIXO (com backup)
```

**O que vai acontecer**:
1. Script verifica duplicados
2. Remove duplicados (mantém o mais antigo)
3. Adiciona constraints para prevenir duplicações futuras
4. Valida que limpeza funcionou
5. Mostra resumo final

**Resultado esperado**:
- ✅ SEM SPLITS DUPLICADOS
- ✅ SEM MIRRORS DUPLICADOS
- ✅ SEM LEDGER DUPLICADO

---

### ETAPA 4: VALIDAÇÃO (OBRIGATÓRIO)
```bash
Ação: Testar sistema manualmente
Tempo: 10-15 minutos
```

**Testes a fazer**:
1. ✅ Criar nova despesa compartilhada
2. ✅ Verificar que aparece na tela "Compartilhados"
3. ✅ Verificar que valores estão corretos
4. ✅ Testar acerto de contas
5. ✅ Criar convite de família
6. ✅ Aceitar convite

**Se algo não funcionar**:
1. ⚠️ Restaurar backup imediatamente
2. ⚠️ Reportar problema
3. ⚠️ Não usar sistema até corrigir

---

## 📊 PROBLEMAS COMUNS E SOLUÇÕES

### Problema: "Syntax error at or near..."
**Causa**: Supabase SQL Editor não suporta alguns comandos

**Solução**: 
- Use AUDITORIA_SIMPLES.sql (já corrigido)
- Use LIMPAR_DUPLICADOS_AGORA.sql (já corrigido)

### Problema: "Permission denied"
**Causa**: Usuário não tem permissão para executar

**Solução**:
- Executar como owner do projeto
- Verificar permissões no Supabase Dashboard

### Problema: "Constraint violation"
**Causa**: Tentando criar constraint que já existe

**Solução**:
- Ignorar erro (constraint já existe é bom!)
- Ou remover linha "CREATE UNIQUE INDEX IF NOT EXISTS"

---

## ⚠️ REGRAS DE SEGURANÇA

### ✅ SEMPRE FAZER:
1. Backup antes de qualquer DELETE
2. Executar auditoria primeiro
3. Ler resultados antes de prosseguir
4. Testar após limpeza

### ❌ NUNCA FAZER:
1. Executar DELETE sem backup
2. Executar em produção sem testar em dev
3. Ignorar erros
4. Prosseguir se algo der errado

---

## 🎯 RESUMO EXECUTIVO

### Se você tem 5 minutos:
```
1. Executar AUDITORIA_SIMPLES.sql
2. Ver se há duplicados
3. Se não houver, está tudo OK!
```

### Se você tem 30 minutos:
```
1. Executar AUDITORIA_SIMPLES.sql
2. Fazer backup
3. Executar LIMPAR_DUPLICADOS_AGORA.sql
4. Validar funcionamento
```

### Se você tem 2 horas:
```
1. Executar AUDITORIA_SIMPLES.sql
2. Analisar resultados detalhadamente
3. Fazer backup
4. Executar LIMPAR_DUPLICADOS_AGORA.sql
5. Validar funcionamento completo
6. Monitorar por algumas horas
```

---

## 📝 CHECKLIST FINAL

Antes de começar:
- [ ] Li as instruções completas
- [ ] Entendi o que cada script faz
- [ ] Tenho acesso ao Supabase Dashboard
- [ ] Tenho permissão para fazer backup
- [ ] Tenho tempo para validar após limpeza

Durante execução:
- [ ] Executei AUDITORIA_SIMPLES.sql
- [ ] Analisei resultados
- [ ] Fiz backup (se necessário)
- [ ] Executei LIMPAR_DUPLICADOS_AGORA.sql (se necessário)
- [ ] Verifiquei que limpeza funcionou

Após execução:
- [ ] Testei criar despesa compartilhada
- [ ] Testei acerto de contas
- [ ] Verifiquei que não há erros
- [ ] Sistema está funcionando normalmente

---

## ✅ CONCLUSÃO

**Arquivos prontos para uso**:
1. ✅ AUDITORIA_SIMPLES.sql (verificação)
2. ✅ LIMPAR_DUPLICADOS_AGORA.sql (limpeza)
3. ✅ QUERIES_VERIFICACAO_RAPIDA.sql (monitoramento)

**Tempo total estimado**: 30 minutos a 2 horas

**Risco**: 🟢 BAIXO (com backup)

**Benefício**: 🟢 ALTO (sistema limpo e sem duplicações)

**Recomendação**: Executar em horário de baixo tráfego

---

**Última atualização**: 31/12/2024  
**Versão**: 1.0 (Testada e corrigida)  
**Status**: ✅ PRONTO PARA USO
