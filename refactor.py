import os
import re

pattern = re.compile(r'\.reduce\(\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\)\s*=>\s*\1\s*\+\s*(Number\(\2\.amount\)|Math\.abs\(\2\.amount\)|\2\.amount|\2\.value|\2\.compras|\2\.vendas|\2\.lucroEstimado|\2\.estimatedCost|Number\(\2\)|Number\(\2\.balance\s*\|\|\s*0\))\s*,\s*0\s*\)')

def replacement(match):
    var_sum = match.group(1)
    var_item = match.group(2)
    expr = match.group(3)
    return f'.reduce(({var_sum}, {var_item}) => SafeFinancialCalculator.add({var_sum}, {expr}), 0)'

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
                
            new_content = pattern.sub(replacement, content)
            
            if new_content != content:
                if 'SafeFinancialCalculator' not in new_content:
                    # try to insert after the last import
                    lines = new_content.split('\n')
                    last_import = -1
                    for i, line in enumerate(lines):
                        if line.startswith('import '):
                            last_import = i
                    if last_import != -1:
                        lines.insert(last_import + 1, 'import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";')
                        new_content = '\n'.join(lines)
                    else:
                        new_content = 'import { SafeFinancialCalculator } from "@/services/SafeFinancialCalculator";\n' + new_content

                with open(path, 'w', encoding='utf-8') as file:
                    file.write(new_content)
                print(f'Updated {path}')
