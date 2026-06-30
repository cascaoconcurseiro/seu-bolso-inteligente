import os

with open('src/components/settings/useAccountingDRE.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

export_start = -1
export_end = -1
for i, line in enumerate(lines):
    if 'const handleExportPDF =' in line or 'const handleExportCSV =' in line:
        if export_start == -1:
            export_start = i
    if 'const renderSubcategories =' in line:
        export_end = i
        break

if export_start != -1 and export_end != -1:
    export_lines = lines[export_start:export_end]
    
    # Write the new hook
    new_hook = '''import { toast } from "sonner";
import { logger } from "@/utils/logger";
import { formatExportMoney } from "@/utils/exportCurrency";

export function useAccountingExport(dreData: any, balanceSheetData: any) {
''' + ''.join(export_lines) + '''
  return { handleExportPDF, handleExportCSV };
}
'''
    with open('src/components/settings/useAccountingExport.ts', 'w', encoding='utf-8') as f:
        f.write(new_hook)
        
    # Now remove from original hook
    original_lines = lines[:export_start] + lines[export_end:]
    
    # And add the import and hook usage
    # Find where to add import
    import_idx = 0
    for i, line in enumerate(original_lines):
        if line.startswith('import '):
            import_idx = i
            
    original_lines.insert(import_idx + 1, 'import { useAccountingExport } from "./useAccountingExport";\n')
    
    # Find where to add hook usage
    # Inside useAccountingDRE
    hook_usage_idx = -1
    for i, line in enumerate(original_lines):
        if 'const b = balanceSheetData;' in line:
            hook_usage_idx = i
            break
            
    if hook_usage_idx != -1:
        original_lines.insert(hook_usage_idx, '  const { handleExportPDF, handleExportCSV } = useAccountingExport(dreData, balanceSheetData);\n')
        
    with open('src/components/settings/useAccountingDRE.tsx', 'w', encoding='utf-8') as f:
        f.write(''.join(original_lines))
        
    print('Successfully extracted useAccountingExport')
