import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, CreditCard, Trash2, Archive, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMonth } from "@/contexts/MonthContext";
import { getBankById } from "@/lib/banks";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useArchiveAccount, useArchivedAccounts, useUnarchiveAccount, useCreditCardInvoice, useAccountDependencies } from "@/hooks/useAccounts";
import { useDependentTransactions } from "@/hooks/transactions/useDependentTransactions";
import { useTransactions, useCreateTransaction, useDeleteTransaction, useBulkCreateTransactions } from "@/hooks/useTransactions";
import * as dateFns from "date-fns";
import { ptBR } from "date-fns/locale";
import { getInvoiceData, getTargetDate, formatCycleRange } from "@/lib/invoiceUtils";
import { formatDateISO, getMonthDateRange } from "@/utils/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import { TransactionModal } from "@/components/modals/TransactionModal";
import { DeleteTransactionModal, CascadeDeleteType } from "@/components/modals/DeleteTransactionModal";
import { EmptyState } from "@/components/ui/empty-state";

// Modular Components
import { CreditCardDetailView } from "@/components/credit-cards/CreditCardDetailView";
import { CreditCardsList } from "@/components/credit-cards/CreditCardsList";
import { NewCardDialog } from "@/components/credit-cards/NewCardDialog";
import { ImportBillsDialog } from "@/components/credit-cards/ImportBillsDialog";

import { PayInvoiceDialog } from "@/components/credit-cards/PayInvoiceDialog";
import { ArchivedCardsSection } from "@/components/credit-cards/ArchivedCardsSection";
import { ArchiveConfirmModal } from "@/components/modals/ArchiveConfirmModal";
import { ShareCardDialog } from "@/components/credit-cards/ShareCardDialog";
import { PendingSharedCardInvitationsAlert } from "@/components/credit-cards/PendingSharedCardInvitationsAlert";
import { moneyUtils } from "@/utils/money";
import { useCreditCardsDashboard } from "@/hooks/credit-cards/useCreditCardsDashboard";

type CardView = "list" | "detail";

interface CreditCardAccount {
  id: string;
  name: string;
  bank_id: string | null;
  credit_limit: number | null;
  balance: number;
  closing_day: number | null;
  due_day: number | null;
  currency?: string;
  is_international?: boolean;
}

export function CreditCards() {
  const {
    view, setView,
    selectedCard, setSelectedCard,
    showArchiveConfirmModal, setShowArchiveConfirmModal,
    showNewCardDialog, setShowNewCardDialog,
    showImportDialog, setShowImportDialog,
    showPayDialog, setShowPayDialog,
    showSharingDialog, setShowSharingDialog,
    showTransactionModal, setShowTransactionModal,
    selectedDate, setSelectedDate,
    
    newBankId, setNewBankId,
    newBrand, setNewBrand,
    newCardName, setNewCardName,
    newClosingDay, setNewClosingDay,
    newDueDay, setNewDueDay,
    newLimit, setNewLimit,
    newIsInternational, setNewIsInternational,
    newCurrency, setNewCurrency,
    
    isLoading,
    transactionsLoading,
    creditCards,
    archivedCards,
    
    createAccount,
    archiveAccountMutation,
    unarchiveAccountMutation,
    deleteAccountMutation,
    bulkCreateTransactions,
    
    deleteCardConfirm, setDeleteCardConfirm,
    deleteCardCanDelete,
    selectedCardCanDelete,
    
    editingTransaction, setEditingTransaction,
    deleteConfirm, setDeleteConfirm,
    
    showEditCardDialog, setShowEditCardDialog,
    editCardName, setEditCardName,
    editClosingDay, setEditClosingDay,
    editDueDay, setEditDueDay,
    editLimit, setEditLimit,
    
    invoiceData,
    invoiceFetching,
    
    getCardInvoice,
    getCardInstallments,
    formatCurrency,
    getDaysUntilDue,
    
    handleCreateCard,
    handleDeleteTransaction,
    handleEditCard,
    handleExportCards,
    handlePayInvoice,
    
    totalInvoices,
    totalDebt,
    nextDueDate,
    exportTransactions,
    
    refetchAccounts,
    refetchTransactions,
    user
  } = useCreditCardsDashboard();

  const { data: accounts = [] } = useAccounts();

  if (isLoading) return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-6 border border-border/50 bg-card/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-10 w-36 rounded-xl" />
            <div className="skeleton h-4 w-52 rounded-lg" />
          </div>
          <div className="skeleton h-11 w-36 rounded-xl" />
        </div>
      </div>
      {/* Summary skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      {/* Cards list skeleton */}
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  if (view === "detail" && selectedCard && invoiceData) {
    return (
      <>
        <CreditCardDetailView 
          selectedCard={selectedCard} goBack={() => { setView("list"); setSelectedCard(null); }}
          openEditCardDialog={(card) => { setEditCardName(card.name); setEditClosingDay(card.closing_day?.toString() || ""); setEditDueDay(card.due_day?.toString() || ""); setEditLimit(card.credit_limit?.toString() || ""); setShowEditCardDialog(true); }}
          setDeleteCardConfirm={setDeleteCardConfirm} selectedDate={selectedDate} changeMonth={(offset) => setSelectedDate(prev => dateFns.addMonths(prev, offset))}
          goToCurrentMonth={() => setSelectedDate(dateFns.startOfMonth(new Date()))} monthName={dateFns.format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
          cycleRange={formatCycleRange(invoiceData.startDate, invoiceData.closingDate)} invoiceFetching={invoiceFetching} invoiceData={invoiceData}
          formatCurrency={formatCurrency} daysUntilDue={getDaysUntilDue(invoiceData.dueDate)} usagePercent={selectedCard.credit_limit ? (invoiceData.invoiceTotal / selectedCard.credit_limit) * 100 : 0}
          bank={getBankById(selectedCard.bank_id)} setShowPayDialog={setShowPayDialog} setShowImportDialog={setShowImportDialog}
          handleEditTransaction={(tx) => { 
            setEditingTransaction({
              ...tx,
              category_id: tx.category_id || tx.category?.id,
              date: tx.date.includes('T') ? tx.date : `${tx.date}T00:00:00`
            }); 
            setShowTransactionModal(true); 
          }} setDeleteConfirm={setDeleteConfirm} installments={getCardInstallments(invoiceData.transactions)}
          allYearTransactions={exportTransactions}
          canDelete={selectedCardCanDelete}
          onArchive={(card) => setShowArchiveConfirmModal(true)}
          onUnarchive={async (card) => { await unarchiveAccountMutation.mutateAsync(card.id); toast.success("Cartão desarquivado!"); setView("list"); setSelectedCard(null); }}
          setShowSharingDialog={setShowSharingDialog}
        />

        <ShareCardDialog isOpen={showSharingDialog} onClose={() => setShowSharingDialog(false)} card={selectedCard} />

        <ImportBillsDialog isOpen={showImportDialog} onClose={() => setShowImportDialog(false)} account={selectedCard} onImport={async (txs) => { 
          await bulkCreateTransactions.mutateAsync(txs as any); 
          toast.success("Faturas importadas!"); 
          setShowImportDialog(false); 
        }} />
        
        <PayInvoiceDialog 
          isOpen={showPayDialog} onClose={() => setShowPayDialog(false)} card={selectedCard} invoiceTotal={invoiceData.invoiceTotal} accounts={accounts.filter(a => a.type !== 'CREDIT_CARD')}
          onPay={handlePayInvoice}
        />

        <TransactionModal isOpen={showTransactionModal} onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); refetchTransactions(); }} initialData={editingTransaction} />

        <DeleteTransactionModal 
          isOpen={deleteConfirm.isOpen} 
          onClose={() => setDeleteConfirm({ isOpen: false, transaction: null })}
          onConfirm={handleDeleteTransaction}
          transaction={deleteConfirm.transaction}
        />

        <Dialog open={showEditCardDialog} onOpenChange={setShowEditCardDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Cartão</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={editCardName} onChange={(e) => setEditCardName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fechamento</Label>
                  <Input type="number" inputMode="decimal" value={editClosingDay} onChange={(e) => setEditClosingDay(e.target.value)} disabled={selectedCard?.user_id !== user?.id} title={selectedCard?.user_id !== user?.id ? "Apenas o dono do cartão pode alterar o ciclo" : ""} />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Input type="number" inputMode="decimal" value={editDueDay} onChange={(e) => setEditDueDay(e.target.value)} disabled={selectedCard?.user_id !== user?.id} title={selectedCard?.user_id !== user?.id ? "Apenas o dono do cartão pode alterar o ciclo" : ""} />
                </div>
              </div>
              <div className="space-y-2"><Label>Limite</Label><Input type="number" inputMode="decimal" value={editLimit} onChange={(e) => setEditLimit(e.target.value)} /></div>
              {selectedCard?.user_id !== user?.id && (
                <p className="text-xs text-amber-600">As datas de ciclo (Fechamento e Vencimento) são gerenciadas pelo dono do cartão.</p>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShowEditCardDialog(false)}>Cancelar</Button><Button onClick={handleEditCard}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteCardConfirm.isOpen} onOpenChange={(open) => !open && setDeleteCardConfirm({ isOpen: false, card: null })}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Remover cartão "{deleteCardConfirm.card?.name}"?</AlertDialogTitle></AlertDialogHeader>
            <div className="flex flex-col gap-3 py-4">
               <Button variant="outline" className="justify-start gap-3" onClick={async () => { if (deleteCardConfirm.card) { await archiveAccountMutation.mutateAsync(deleteCardConfirm.card.id); setDeleteCardConfirm({ isOpen: false, card: null }); } }}><Archive className="h-4 w-4" /> Arquivar (Recomendado)</Button>
               {deleteCardCanDelete && (
                 <Button variant="destructive" className="justify-start gap-3" onClick={async () => { if (deleteCardConfirm.card) { await deleteAccountMutation.mutateAsync(deleteCardConfirm.card.id); setDeleteCardConfirm({ isOpen: false, card: null }); setView("list"); refetchAccounts(); } }}><Trash2 className="h-4 w-4" /> Excluir Permanentemente</Button>
               )}
            </div>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="relative overflow-hidden rounded-2xl p-4 md:p-6 transition-all duration-700 ease-out bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl md:text-4xl tracking-tighter">Cartões</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base font-medium">Gerencie faturas e limites</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="default" variant="outline" className="gap-2 shadow-sm border-border/80 w-full sm:w-auto h-10 md:h-11 px-2">
                  <Download className="h-4 w-4" />
                  <span className="text-xs md:text-sm">Exportar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuItem onClick={() => handleExportCards('PDF', 'MONTH')}>
                  Mensal em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCards('CSV', 'MONTH')}>
                  Mensal em Excel (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCards('PDF', 'YEAR')}>
                  Anual em PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCards('CSV', 'YEAR')}>
                  Anual em Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="default" onClick={() => setShowNewCardDialog(true)} className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 group w-full sm:w-auto h-10 md:h-11 font-bold px-2">
              <Plus className="h-4 w-4 mr-1 md:mr-2 group-hover:scale-110 transition-transform" /> 
              <span className="text-xs md:text-sm">Novo cartão</span>
            </Button>
          </div>
        </div>
      </div>

      {creditCards.length > 0 ? (
        <CreditCardsList
          creditCards={creditCards}
          totalInvoices={totalInvoices}
          totalDebt={totalDebt}
          nextDueDate={nextDueDate}
          formatCurrency={formatCurrency}
          getCardInvoice={getCardInvoice}
          isLoading={isLoading || transactionsLoading}
          onRefresh={() => { refetchAccounts(); refetchTransactions(); }}
          onSelectCard={(c) => { setSelectedCard(c); setView("detail"); }}
          onNewCard={() => setShowNewCardDialog(true)}
        />
      ) : (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Você ainda não possui cartões de crédito. Adicione um para controlar faturas e limites."
          actionLabel="Novo cartão"
          onAction={() => setShowNewCardDialog(true)}
          className="my-8"
        />
      )}

      <ArchivedCardsSection archivedCards={archivedCards} formatCurrency={formatCurrency} onUnarchive={(id) => unarchiveAccountMutation.mutate(id)} isUnarchiving={unarchiveAccountMutation.isPending} onCardSelect={(card) => { setSelectedCard(card); setView("detail"); }} />

      <NewCardDialog open={showNewCardDialog} onOpenChange={setShowNewCardDialog} onSubmit={handleCreateCard} isLoading={createAccount.isPending} bankId={newBankId} setBankId={setNewBankId} brand={newBrand} setBrand={setNewBrand} cardName={newCardName} setCardName={setNewCardName} closingDay={newClosingDay} setClosingDay={setNewClosingDay} dueDay={newDueDay} setDueDay={setNewDueDay} limit={newLimit} setLimit={setNewLimit} isInternational={newIsInternational} setIsInternational={setNewIsInternational} currency={newCurrency} setCurrency={setNewCurrency} />
      
      {selectedCard && (
        <ArchiveConfirmModal
          isOpen={showArchiveConfirmModal}
          onClose={() => setShowArchiveConfirmModal(false)}
          onConfirm={async () => {
            await archiveAccountMutation.mutateAsync(selectedCard.id);
            toast.success("Cartão arquivado com sucesso!");
            setShowArchiveConfirmModal(false);
            setView("list");
            setSelectedCard(null);
          }}
          itemName={selectedCard.name}
          isArchiving={archiveAccountMutation.isPending}
        />
      )}
    </div>
  );
}
