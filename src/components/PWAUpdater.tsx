import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export function PWAUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Verifica atualizações silenciosamente a cada hora
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('Erro no Service Worker do PWA:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast('Nova versão disponível!', {
        description: 'Baixamos uma atualização do sistema. Clique para atualizar e usar os novos recursos.',
        icon: <RefreshCw className="h-4 w-4 animate-spin text-primary" />,
        duration: Infinity, // Toast não some até o usuário clicar ou fechar
        action: {
          label: 'Atualizar Agora',
          onClick: () => updateServiceWorker(true),
        },
        onDismiss: () => setNeedRefresh(false), // Se o usuário fechar o toast
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
}
