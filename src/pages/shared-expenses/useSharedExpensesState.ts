import { useState } from "react";
import * as dateFns from "date-fns";
import { InvoiceItem } from "@/utils/sharedFinanceCalculations";

export function useSharedExpensesState() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleAccountId, setSettleAccountId] = useState("");
  const [settleDate, setSettleDate] = useState(dateFns.format(new Date(), "yyyy-MM-dd"));
  const [settleType, setSettleType] = useState<"PAY" | "RECEIVE">("PAY");
  const [isSettling, setIsSettling] = useState(false);
  const [settlingMode, setSettlingMode] = useState<"ALL" | "SINGLE">("ALL");

  const [undoConfirm, setUndoConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>({
    isOpen: false,
    item: null,
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; item: InvoiceItem | null }>(
    { isOpen: false, item: null }
  );
  const [deleteSeriesConfirm, setDeleteSeriesConfirm] = useState<{
    isOpen: boolean;
    item: InvoiceItem | null;
  }>({ isOpen: false, item: null });
  const [undoAllConfirm, setUndoAllConfirm] = useState(false);
  const [isUndoingAll, setIsUndoingAll] = useState(false);
  const [anticipateDialog, setAnticipateDialog] = useState<{
    isOpen: boolean;
    seriesId: string | null;
    currentInstallment: number;
    totalInstallments: number;
  }>({ isOpen: false, seriesId: null, currentInstallment: 0, totalInstallments: 0 });

  return {
    selectedItems,
    setSelectedItems,
    showSettleDialog,
    setShowSettleDialog,
    showImportDialog,
    setShowImportDialog,
    selectedMember,
    setSelectedMember,
    settleAmount,
    setSettleAmount,
    settleAccountId,
    setSettleAccountId,
    settleDate,
    setSettleDate,
    settleType,
    setSettleType,
    isSettling,
    setIsSettling,
    settlingMode,
    setSettlingMode,
    undoConfirm,
    setUndoConfirm,
    deleteConfirm,
    setDeleteConfirm,
    deleteSeriesConfirm,
    setDeleteSeriesConfirm,
    undoAllConfirm,
    setUndoAllConfirm,
    isUndoingAll,
    setIsUndoingAll,
    anticipateDialog,
    setAnticipateDialog,
  };
}
