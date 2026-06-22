#!/usr/bin/env python3
"""
Script para corrigir violações do Design System Elite
Seguindo as regras: escala de 8px, hierarquia tipográfica, remover valores customizados
"""

import os
import re
from pathlib import Path

# Mapeamento de correções
CORRECTIONS = {
    # Violações de escala de 8px
    'h-11': 'h-12',  # 44px → 48px
    'h-9': 'h-10',   # 36px → 40px (padrão para inputs, selects)
    'gap-1.5': 'gap-2',
    'space-y-1': 'space-y-2',
    'space-x-1': 'space-x-2',
    'h-1.5': 'h-2',
    
    # Valores customizados
    'text-\\[11px\\]': 'text-xs',
    'text-\\[10px\\]': 'text-xs',
    'rounded-\\[1.25rem\\]': 'rounded-2xl',
    'rounded-\\[1.5rem\\]': 'rounded-3xl',
    'rounded-\\[2rem\\]': 'rounded-4xl',
}

# Mapeamento de hierarquia tipográfica
# Regra: máximo 3 tamanhos por tela
# Paleta: display (text-3xl), body (text-base), caption (text-sm)
TYPOGRAPHY_MAPPING = {
    'text-5xl': 'text-3xl',  # muito grande → display
    'text-4xl': 'text-3xl',  # muito grande → display
    'text-xl': 'text-lg',    # reduzir variação
    'text-lg': 'text-base',  # body padrão
    'text-xs': 'text-sm',    # caption
}

def analyze_file(file_path):
    """Analisa um arquivo para violações"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    violations = []
    
    # Verificar h-11
    if 'h-11' in content:
        violations.append('h-11')
    
    # Verificar h-9
    if 'h-9' in content:
        violations.append('h-9')
    
    # Verificar valores customizados
    for pattern in CORRECTIONS.keys():
        if re.search(pattern, content):
            violations.append(pattern.replace('\\', ''))
    
    return violations

def fix_file(file_path):
    """Corrige violações em um arquivo"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Aplicar correções
    for pattern, replacement in CORRECTIONS.items():
        content = re.sub(pattern, replacement, content)
    
    # Aplicar hierarquia tipográfica (opcional)
    for old_size, new_size in TYPOGRAPHY_MAPPING.items():
        # Só substituir se estiver entre aspas
        content = re.sub(f'"{old_size}"', f'"{new_size}"', content)
        content = re.sub(f"'{old_size}'", f"'{new_size}'", content)
        content = re.sub(f'className=".*?{old_size}.*?"', lambda m: m.group(0).replace(old_size, new_size), content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

def main():
    src_dir = Path('src')
    
    # Listar todos os arquivos .tsx
    tsx_files = list(src_dir.rglob('*.tsx'))
    
    print(f"Analisando {len(tsx_files)} arquivos...")
    print()
    
    for file_path in tsx_files:
        violations = analyze_file(file_path)
        if violations:
            print(f"📄 {file_path.relative_to(src_dir)}")
            print(f"   Violações: {', '.join(violations)}")
            
            # Corrigir
            if fix_file(file_path):
                print(f"   ✅ Corrigido")
            print()

if __name__ == '__main__':
    main()