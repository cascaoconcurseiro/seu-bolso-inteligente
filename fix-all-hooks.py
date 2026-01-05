#!/usr/bin/env python3
"""
Script para padronizar todos os hooks com staleTime: 0 e refetchOnMount: 'always'
"""

import re
import os
from pathlib import Path

def fix_hook_file(filepath):
    """Corrige um arquivo de hook adicionando staleTime e refetchOnMount"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Padrão 1: enabled: !!user, (sem staleTime)
    # Adicionar staleTime e refetchOnMount
    pattern1 = r'(enabled: !!user,)\s*\n(\s*)\}\);'
    replacement1 = r'\1\n\2staleTime: 0, // ✅ Dados sempre frescos\n\2refetchOnMount: \'always\',\n\2});'
    content = re.sub(pattern1, replacement1, content)
    
    # Padrão 2: enabled: !!user && !!something, (sem staleTime)
    pattern2 = r'(enabled: !!user && .*?,)\s*\n(\s*)\}\);'
    replacement2 = r'\1\n\2staleTime: 0, // ✅ Dados sempre frescos\n\2refetchOnMount: \'always\',\n\2});'
    content = re.sub(pattern2, replacement2, content)
    
    # Padrão 3: enabled: !!tripId && !!user, (sem staleTime)
    pattern3 = r'(enabled: !!tripId && !!user,)\s*\n(\s*)\}\);'
    replacement3 = r'\1\n\2staleTime: 0, // ✅ Dados sempre frescos\n\2refetchOnMount: \'always\',\n\2});'
    content = re.sub(pattern3, replacement3, content)
    
    # Padrão 4: enabled: !!accountId, (sem staleTime)
    pattern4 = r'(enabled: .*?,)\s*\n(\s*)\}\);'
    replacement4 = r'\1\n\2staleTime: 0, // ✅ Dados sempre frescos\n\2refetchOnMount: \'always\',\n\2});'
    content = re.sub(pattern4, replacement4, content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    hooks_dir = Path('src/hooks')
    fixed_count = 0
    
    for filepath in hooks_dir.glob('*.ts'):
        if filepath.name.startswith('use') and not filepath.name.endswith('.tsx'):
            if fix_hook_file(filepath):
                print(f'✅ Fixed: {filepath.name}')
                fixed_count += 1
            else:
                print(f'⏭️  Skipped: {filepath.name}')
    
    print(f'\n🎉 Fixed {fixed_count} files!')

if __name__ == '__main__':
    main()
