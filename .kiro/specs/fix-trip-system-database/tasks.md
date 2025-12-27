# Implementation Plan: Fix Trip System Database

## Overview

Este plano implementa as correções no sistema de viagens seguindo a ordem de prioridade: primeiro corrigir o banco de dados (triggers e RLS), depois validar dados, e por último atualizar o frontend e limpar código obsoleto.

## Tasks

- [x] 1. Criar migration de correção do sistema de viagens
  - Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_fix_trip_system.sql`
  - Implementar correção do trigger `add_trip_owner()` com ON CONFLICT
  - Implementar simplificação da política RLS de SELECT em trips
  - Implementar correção de dados inconsistentes (owners faltando, membros de convites aceitos)
  - Implementar remoção de duplicatas em trip_members
  - Adicionar comentários explicativos
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 8.1, 8.2, 8.3, 8.4_

- [x] 2. Aplicar migration no banco de dados
  - Executar `supabase db push` ou aplicar migration manualmente
  - Verificar que não há erros na aplicação
  - Verificar logs do Supabase
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Criar script de validação de integridade
  - Criar arquivo `scripts/validate-trip-integrity.sql`
  - Implementar query para viagens sem owner
  - Implementar query para owners não em trip_members
  - Implementar query para duplicatas em trip_members
  - Implementar query para convites aceitos sem membro
  - Implementar query para viagens com múltiplos owners
  - Adicionar comentários explicativos
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 4. Executar validação e documentar resultados
  - Executar script de validação
  - Documentar problemas encontrados
  - Verificar se correções da migration resolveram os problemas
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 5. Testar criação de viagem
  - Criar viagem via interface
  - Verificar que não há erro de chave duplicada
  - Verificar que viagem aparece imediatamente na lista
  - Verificar que owner está em trip_members com role='owner'
  - _Requirements: 1.1, 1.3, 1.4, 2.3_

- [ ] 6. Testar sistema de convites
  - Criar convite para outro usuário
  - Aceitar convite como outro usuário
  - Verificar que membro foi adicionado em trip_members
  - Verificar que viagem aparece para o novo membro
  - _Requirements: 2.4, 7.1, 7.2, 7.3, 7.4_

- [x] 7. Atualizar hook useTrips no frontend
  - Abrir arquivo `src/hooks/useTrips.ts`
  - Simplificar query para buscar viagens diretamente (remover query intermediária em trip_members)
  - Confiar na política RLS para filtrar viagens
  - Atualizar comentários
  - Testar que viagens aparecem corretamente
  - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3_

- [x] 8. Limpar comentários no hook useCreateTrip
  - Abrir arquivo `src/hooks/useTrips.ts`
  - Simplificar comentário sobre trigger add_trip_owner
  - Remover comentário longo sobre não inserir manualmente
  - Manter apenas comentário curto e claro
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Verificar hook useTripMembers
  - Abrir arquivo `src/hooks/useTripMembers.ts`
  - Verificar que não há código tentando inserir owner manualmente
  - Verificar que queries estão corretas
  - Verificar que retry e staleTime estão configurados adequadamente
  - _Requirements: 4.1, 4.2_

- [x] 10. Criar documentação de scripts obsoletos
  - Criar arquivo `docs/SCRIPTS_OBSOLETOS.md`
  - Listar scripts que podem ser removidos
  - Explicar por que cada script é obsoleto
  - Documentar qual migration substituiu cada script
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4_

- [x] 11. Remover scripts obsoletos (OPCIONAL)
  - Remover `scripts/FIX_RLS_TRIP_MEMBERS_ACEITAR_CONVITE.sql`
  - Remover `scripts/CONSOLIDATE_RLS_TRIP_MEMBERS.sql`
  - Remover `scripts/REPARAR_CONVITES_VIAGEM.sql`
  - Remover `scripts/FIX_FINAL_CONVITES_VIAGEM.sql`
  - Remover `scripts/FIX_COMPLETO_SISTEMA_VIAGENS.sql`
  - Manter scripts de diagnóstico para referência
  - _Requirements: 3.3, 3.4, 5.3, 5.4_

- [ ] 12. Checkpoint - Validar sistema completo
  - Executar script de validação novamente
  - Verificar que não há problemas de integridade
  - Testar fluxo completo: criar viagem → convidar → aceitar → ver viagem
  - Verificar que não há erros no console
  - Verificar que performance está adequada
  - Perguntar ao usuário se há alguma dúvida ou problema

- [x] 13. Atualizar documentação do projeto
  - Atualizar README ou documentação relevante
  - Documentar como o sistema de viagens funciona
  - Documentar triggers e políticas RLS
  - Adicionar exemplos de uso
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

## Notes

- Tasks 1-6 são críticas e devem ser executadas primeiro
- Tasks 7-9 atualizam o frontend para alinhar com as correções do banco
- Tasks 10-11 são limpeza e podem ser feitas depois
- Task 12 é checkpoint para validar tudo
- Task 13 é documentação final
- Prioridade: Banco → Validação → Frontend → Limpeza → Documentação
