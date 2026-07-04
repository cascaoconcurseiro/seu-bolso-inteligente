import { createContext, useContext, useState, ReactNode } from "react";

interface TransactionContext {
  tripId?: string;
  accountId?: string;
  categoryId?: string;
}

interface TransactionModalContextType {
  showTransactionModal: boolean;
  setShowTransactionModal: (show: boolean, context?: TransactionContext) => void;
  transactionContext?: TransactionContext;
}

const TransactionModalContext = createContext<TransactionModalContextType | undefined>(undefined);

export function TransactionModalProvider({ children }: { children: ReactNode }) {
  const [showTransactionModal, setShowModal] = useState(false);
  const [transactionContext, setTransactionContext] = useState<TransactionContext>({});

  const setShowTransactionModal = (show: boolean, context?: TransactionContext) => {
    setShowModal(show);
    if (context) {
      setTransactionContext(context);
    } else if (!show) {
      setTransactionContext({});
    }
  };

  return (
    <TransactionModalContext.Provider
      value={{ showTransactionModal, setShowTransactionModal, transactionContext }}
    >
      {children}
    </TransactionModalContext.Provider>
  );
}

export function useTransactionModal() {
  const context = useContext(TransactionModalContext);
  if (!context) {
    throw new Error("useTransactionModal must be used within TransactionModalProvider");
  }
  return context;
}
