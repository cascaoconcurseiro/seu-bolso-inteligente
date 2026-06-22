#!/usr/bin/env python3
"""
Script de auditoria completa de Elite Design Compliance
Verifica TODOS os componentes em busca de violações
"""

import os
import re
from pathlib import Path
from collections import defaultdict

# Padrões que violam Elite Design
VIOLATIONS = {
    # Espaçamento não múltiplo de 8
    'spacing': [
        r'p-[1357](?!\d)',  # p-1, p-3, p-5, p-7
        r'px-[1357](?!\d)', 
        r'py-[1357](?!\d)',
        r'gap-[1357](?!\d)',
        r'space-[xy]-[1357](?!\d)',
        r'm-[1357](?!\d)',
        r'mx-[1357](?!\d)',
        r'my-[1357](?!\d)',
    ],
    # Alturas não múltiplas de 8
    'height': [
        r'h-[1357911](?!\d)',  # h-1, h-3, h-5, h-7, h-9, h-11
    ],
    # Larguras problemáticas
    'width': [
        r'w-[1357911](?!\d)',
    ],
    # Arredondamentos não padrão
    'rounded': [
        r'rounded-\[[\d.]+(?:px|rem)\]',  # valores customizados
    ],
    # Tamanhos de fonte problemáticos
    'text': [
        r'text-\[[\d.]+(?:px|rem)\]',  # valores customizados
        r'text-xs(?!l)',  # text-xs (usar text-sm no Elite)
    ],
}

def scan_file(file_path):
    """Escaneia um arquivo em busca de violações"""
    violations = defaultdict(list)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
            
            for category, patterns in VIOLATIONS.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        # Encontrar número da linha
                        pos = match.start()
                        line_num = content[:pos].count('\n') + 1
                        line_content = lines[line_num - 1].strip()
                        
                        violations[category].append({
                            'line': line_num,
                            'match': match.group(),
                            'content': line_content[:100]
                        })
    except Exception as e:
        print(f"Erro ao ler {file_path}: {e}")
    
    return violations

def main():
    src_dir = Path('src')
    
    # Escanear todos os arquivos .tsx
    tsx_files = list(src_dir.rglob('*.tsx'))
    
    print("=" * 80)
    print("AUDITORIA ELITE DESIGN COMPLIANCE")
    print("=" * 80)
    print(f"\nAnalisando {len(tsx_files)} arquivos...\n")
    
    total_violations = defaultdict(int)
    files_with_violations = []
    
    for file_path in tsx_files:
        violations = scan_file(file_path)
        
        if violations:
            rel_path = file_path.relative_to(src_dir)
            files_with_violations.append((rel_path, violations))
            
            for category, items in violations.items():
                total_violations[category] += len(items)
    
    # Relatório por categoria
    print("\n📊 RESUMO POR CATEGORIA:")
    print("-" * 80)
    for category, count in sorted(total_violations.items()):
        print(f"{category.upper():20} {count:5} violações")
    
    print(f"\n{'TOTAL':20} {sum(total_violations.values()):5} violações")
    print(f"Arquivos afetados: {len(files_with_violations)}/{len(tsx_files)}")
    
    # Top 10 arquivos com mais violações
    if files_with_violations:
        print("\n\n🔴 TOP 20 ARQUIVOS COM MAIS VIOLAÇÕES:")
        print("-" * 80)
        
        sorted_files = sorted(
            files_with_violations,
            key=lambda x: sum(len(v) for v in x[1].values()),
            reverse=True
        )[:20]
        
        for rel_path, violations in sorted_files:
            total = sum(len(v) for v in violations.values())
            print(f"\n📄 {rel_path} ({total} violações)")
            
            for category, items in violations.items():
                if items:
                    print(f"   {category}: {len(items)} ocorrências")
                    # Mostrar algumas examples
                    for item in items[:3]:
                        print(f"      L{item['line']}: {item['match']}")
    
    # Componentes críticos que precisam revisão manual
    print("\n\n⚠️  COMPONENTES CRÍTICOS PARA REVISÃO MANUAL:")
    print("-" * 80)
    critical = [
        'TransactionModal',
        'QuickAddModal',
        'TransactionForm',
        'CategorySelector',
        'SplitModal',
        'SharedSettleDialog',
        'PayInvoiceDialog',
        'ImportBillsDialog',
        'AccountFormModal',
        'TransferModal',
    ]
    
    for component in critical:
        matches = [f for f, _ in files_with_violations if component in str(f)]
        if matches:
            print(f"❌ {component}: {len(matches)} arquivo(s) com violações")
        else:
            print(f"✅ {component}: Não encontrado ou sem violações óbvias")
    
    print("\n" + "=" * 80)
    print(f"Status: {'🔴 REQUER ATENÇÃO' if files_with_violations else '✅ COMPLIANT'}")
    print("=" * 80)

if __name__ == '__main__':
    main()
