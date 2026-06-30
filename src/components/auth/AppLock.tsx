import { useEffect } from 'react';
import { logger } from '@/utils/logger';

/**
 * AppLock — DEPRECATED. Use PinWrapper (bcrypt server-side via verify_pin RPC) instead.
 *
 * Este componente usava SHA-256 client-side com localStorage, o que é bypassável.
 * Mantido como stub para não quebrar imports existentes, mas não bloqueia mais nada.
 *
 * @deprecated Use PinWrapper + verify_pin RPC
 */

interface AppLockProps {
  children: React.ReactNode;
}

export function AppLock({ children }: AppLockProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPin = localStorage.getItem('@BolsoInteligente:pin');
      if (savedPin) {
        logger.warn('[AppLock] PIN legado detectado. Configure o PIN em Configurações > Segurança para migrar ao sistema bcrypt.');
      }
    }
  }, []);

  return <>{children}</>;
}
