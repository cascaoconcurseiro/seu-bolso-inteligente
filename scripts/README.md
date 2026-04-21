# Scripts

Este diretório contém scripts utilitários para manutenção e operações do projeto.

## Estrutura

### `/sql/`
Scripts SQL para debug, correções e manutenção do banco de dados:
- `cleanup-and-fix.sql` - Limpeza e correções gerais
- `debug-*.sql` - Scripts de debug para investigação de problemas
- `fix-*.sql` - Scripts de correção específicos

### Scripts SQL (raiz)
Scripts SQL maiores para aplicação de migrações e melhorias:
- `APLICAR_*.sql` - Scripts para aplicar mudanças no banco
- `DEBUG_*.sql` - Scripts de diagnóstico
- `FIX_*.sql` - Scripts de correção de problemas específicos
- `LIMPAR_*.sql` - Scripts de limpeza
- `TESTE_*.sql` - Scripts de teste

### Scripts PowerShell
- `apply-all-migrations.ps1` - Aplica todas as migrações
- `backup-full.ps1` - Backup completo do sistema
- `backup-production.ps1` - Backup de produção
- `restore-backup.ps1` - Restaura backup

### Scripts Shell
- `apply-improvements.sh` - Aplica melhorias no sistema

### Scripts JavaScript/Node
- `download-*.js` / `download-*.cjs` - Scripts para download de logos e assets
- `organize-logos.js` - Organiza logos baixados

## Uso

Execute os scripts a partir da raiz do projeto:

```bash
# PowerShell
.\scripts\backup-production.ps1

# Bash
bash scripts/apply-improvements.sh

# Node
node scripts/download-bank-logos.cjs
```

## Notas

- Scripts SQL devem ser executados com cuidado em produção
- Sempre faça backup antes de executar scripts de correção
- Scripts de debug não modificam dados, apenas consultam
