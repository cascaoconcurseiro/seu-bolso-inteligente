/**
 * Sistema de Logging Centralizado
 * 
 * Substitui console.log/warn/error por sistema controlado
 * que só exibe logs em desenvolvimento e pode integrar
 * com serviços de monitoramento (Sentry) em produção.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private isProd = import.meta.env.PROD;

  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug(message: string, data?: any): void {
    if (this.isDev) {
      console.log(`🔍 [DEBUG] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log informativo - apenas em desenvolvimento
   */
  info(message: string, data?: any): void {
    if (this.isDev) {
      console.info(`ℹ️ [INFO] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log de aviso - sempre exibido
   */
  warn(message: string, data?: any): void {
    console.warn(`⚠️ [WARN] ${message}`, data !== undefined ? data : '');
    
    // TODO: Enviar para Sentry em produção
    if (this.isProd) {
      this.sendToMonitoring('warn', message, data);
    }
  }

  /**
   * Log de erro - sempre exibido
   */
  error(message: string, error?: any): void {
    console.error(`❌ [ERROR] ${message}`, error !== undefined ? error : '');
    
    // TODO: Enviar para Sentry em produção
    if (this.isProd) {
      this.sendToMonitoring('error', message, error);
    }
  }

  /**
   * Log de sucesso - apenas em desenvolvimento
   */
  success(message: string, data?: any): void {
    if (this.isDev) {
      console.log(`✅ [SUCCESS] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Enviar para serviço de monitoramento (Sentry, etc)
   * TODO: Implementar integração com Sentry
   */
  private sendToMonitoring(level: LogLevel, message: string, data?: any): void {
    // Placeholder para integração futura com Sentry
    // Sentry.captureMessage(message, { level, extra: data });
  }

  /**
   * Criar grupo de logs (útil para debug)
   */
  group(label: string): void {
    if (this.isDev) {
      console.group(label);
    }
  }

  /**
   * Fechar grupo de logs
   */
  groupEnd(): void {
    if (this.isDev) {
      console.groupEnd();
    }
  }

  /**
   * Medir tempo de execução
   */
  time(label: string): void {
    if (this.isDev) {
      console.time(label);
    }
  }

  /**
   * Finalizar medição de tempo
   */
  timeEnd(label: string): void {
    if (this.isDev) {
      console.timeEnd(label);
    }
  }
}

// Exportar instância única (singleton)
export const logger = new Logger();

// Exportar tipo para uso em outros arquivos
export type { LogLevel, LogEntry };
