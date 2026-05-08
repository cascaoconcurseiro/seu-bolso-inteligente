import fs from 'fs';

const filePath = 'src/pages/SharedExpenses.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startText = "  const handleSettle = async () => {";
const endText = "  // Group items by trip";

const startIndex = content.indexOf(startText);
const endIndex = content.indexOf(endText);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const extractedLogic = content.slice(startIndex, endIndex);

const hookContent = `import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  logSettlementCreated, 
  logSettlementUndone, 
  logOperationBlocked,
  logTransactionDeleted,
  logSeriesDeleted
} from "@/services/auditLog";
import { ERROR_MESSAGES, SettlementErrorCode } from "@/services/settlementValidation";
import { InvoiceItem } from "@/hooks/useSharedFinances";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSharedExpensesActions(props: any) {
  const {
    selectedMember, settleAccountId, settleType, settleAmount, selectedItems, settleDate,
    members, getFilteredInvoice, createTransaction, user, invalidateRelated, refetch,
    undoConfirm, setUndoConfirm, deleteConfirm, setDeleteConfirm, deleteSeriesConfirm,
    setDeleteSeriesConfirm, setIsUndoingAll, setUndoAllConfirm, setIsSettling,
    setShowSettleDialog, setSelectedMember, setSettleAmount, setSettleAccountId,
    setSettleDate, setSelectedItems, formatCurrency
  } = props;

${extractedLogic}

  return {
    handleSettle,
    handleUndoSettlement,
    handleDeleteTransaction,
    handleDeleteSeries,
    handleUndoAll
  };
}
`;

fs.writeFileSync('src/hooks/useSharedExpensesActions.ts', hookContent, 'utf8');

// Replace in original file
const hookUsage = `  const {
    handleSettle,
    handleUndoSettlement,
    handleDeleteTransaction,
    handleDeleteSeries,
    handleUndoAll
  } = useSharedExpensesActions({
    selectedMember, settleAccountId, settleType, settleAmount, selectedItems, settleDate,
    members, getFilteredInvoice, createTransaction, user, invalidateRelated, refetch,
    undoConfirm, setUndoConfirm, deleteConfirm, setDeleteConfirm, deleteSeriesConfirm,
    setDeleteSeriesConfirm, setIsUndoingAll, setUndoAllConfirm, setIsSettling,
    setShowSettleDialog, setSelectedMember, setSettleAmount, setSettleAccountId,
    setSettleDate, setSelectedItems, formatCurrency
  });\n\n`;

content = content.slice(0, startIndex) + hookUsage + content.slice(endIndex);

// Add import
const importHook = `import { useSharedExpensesActions } from "@/hooks/useSharedExpensesActions";\n`;
const importIndex = content.indexOf('import { useSharedFinances');
if (importIndex !== -1) {
    content = content.slice(0, importIndex) + importHook + content.slice(importIndex);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Extraction complete!');
