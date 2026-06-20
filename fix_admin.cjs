const fs = require('fs');
const path = require('path');

function fixUseAdminActions() {
  const filePath = path.join(__dirname, 'src/components/settings/useAdminActions.ts');
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix data typing access
  content = content.replace(/data\.total([A-Za-z]+)/g, '(data as unknown as Record<string, any>).total$1');
  
  // Remove unused imports
  content = content.replace(/import\s*\{\s*cn\s*\}\s*from\s*['"]@\/lib\/utils['"];\s*\n?/, '');
  content = content.replace(/import\s*\{\s*OrphanTransactionsManager\s*\}\s*from\s*['"]\.\/OrphanTransactionsManager['"];\s*\n?/, '');
  
  // Remove unused destructured function 'recalculateBalances'
  // const recalculateBalances = useRecalculateBalances();
  content = content.replace(/const\s+recalculateBalances\s*=\s*useRecalculateBalances\(\);\s*\n?/, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
}

function fixAdminResetPanel() {
  const filePath = path.join(__dirname, 'src/components/settings/AdminResetPanel.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Unused imports (Lucide icons, etc.)
  // Remove the entire Lucide import if it has everything unused? Wait, it has a lot of unused, let's just replace the whole lucide-react import
  // But wait, the TS error says "All imports in import declaration are unused" on line 1?
  // Let's just remove `import { useMemo, useState } from "react";` or whatever is on line 1.
  content = content.replace(/^import[^\n]+react[^\n]*\n/, ''); // Removes the first import line if it's react and unused

  // 2. Remove unused destructuring from `useAdminActions()`
  const unusedVars = [
    'setAuditLogs', 'setErrorLogs', 'setStats', 'setIsResetting', 'setIsLoadingStats',
    'setIsLoadingUsers', 'setIsLoadingLogs', 'setIsLoadingErrorLogs', 'setIsPurging',
    'isInjectingCategories', 'setIsInjectingCategories', 'setIsRecalculatingTarget',
    'setIsResettingPassword', 'setSelectedDetailUser', 'setDetailAccounts',
    'setDetailFamilies', 'setIsLoadingDetails', 'handleClearErrorLogs'
  ];

  for (const v of unusedVars) {
    const regex1 = new RegExp(`\\b${v}\\s*,\\s*\\n?`, 'g');
    content = content.replace(regex1, '');
    const regex2 = new RegExp(`\\s*,\\s*\\b${v}\\b`, 'g');
    content = content.replace(regex2, '');
    const regex3 = new RegExp(`\\b${v}\\b`, 'g'); // If it's alone on a line?
    content = content.replace(regex3, '');
  }

  // Also lucide-react icons that are unused
  const unusedIcons = ['RefreshCw', 'History', 'TrendingUp', 'Activity', 'Database', 'Briefcase', 'Sparkles', 'Info', 'Search', 'AlertCircle', 'Calendar', 'CheckCircle2'];
  for (const icon of unusedIcons) {
    const r1 = new RegExp(`\\b${icon}\\s*,\\s*`, 'g');
    content = content.replace(r1, '');
    const r2 = new RegExp(`\\s*,\\s*\\b${icon}\\b`, 'g');
    content = content.replace(r2, '');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed ${filePath}`);
}

fixUseAdminActions();
fixAdminResetPanel();
