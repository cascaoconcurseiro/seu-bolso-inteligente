import { useState, useEffect } from 'react';

/**
 * Hook para gerenciar o modal de transação globalmente
 * Escuta o evento 'openTransactionModal' disparado pelo botão no AppLayout
 */
export function useTransactionModal() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => setShowTransactionModal(true);
    window.addEventListener('openTransactionModal', handleOpenModal);
    return () => window.removeEventListener('openTransactionModal', handleOpenModal);
  }, []);

  return {
    showTransactionModal,
    setShowTransactionModal,
  };
}
