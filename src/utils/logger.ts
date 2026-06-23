/**
 * Sistema de Logging Centralizado
 *
 * Exibe logs em desenvolvimento e envia warn/error ao Sentry em produção.
 * Use sempre este logger — nunca console.log direto em código de produção.
 *
 * Hierarquia: debug/info/success → só em DEV | warn/error → sempre + Sentry em PROD
 */
import * as Sentry from '@sentry/react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: Date;
}

class Logger {
  private isDev = import.meta.env.DEV;
  private isProd = import.meta.env.PROD;

  /** Log de debug — apenas em desenvolvimento */
  debug(message: string, data?: unknown): void {
    if (this.isDev) {
      console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  }

  /** Log informativo — apenas em desenvolvimento */
  info(message: string, data?: unknown): void {
    if (this.isDev) {
      console.info(`[INFO] ${message}`, data !== undefined ? data : '');
    }
  }

  /** Log de sucesso — apenas em desenvolvimento */
  success(message: string, data?: unknown): void {
    if (this.isDev) {
      console.log(`[OK] ${message}`, data !== undefined ? data : '');
    }
  }

  /** Log de aviso — sempre exibido + Sentry em produção */
  warn(message: string, data?: unknown): void {
    console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    if (this.isProd) {
      Sentry.captureMessage(message, { level: 'warning', extra: { data } });
    }
  }

  /**
   * Log de erro — sempre exibido + Sentry em produção.
   * @param message - descrição do erro
   * @param error - instância de Error ou dado extra
   */
  error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
    if (this.isProd) {
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: { message } });
      } else {
        Sentry.captureMessage(message, { level: 'error', extra: { error } });
      }
    }
  }

  /** Medir tempo de execução — apenas em desenvolvimento */
  time(label: string): void {
    if (this.isDev) console.time(label);
  }

  timeEnd(label: string): void {
    if (this.isDev) console.timeEnd(label);
  }

  group(label: string): void {
    if (this.isDev) console.group(label);
  }

  groupEnd(): void {
    if (this.isDev) console.groupEnd();
  }
}

export const logger = new Logger();
export type { LogLevel, LogEntry };
