// backend/src/engine/logger.ts

export class EngineLogger {
  private simulationId: number;
  private enabled: boolean;

  constructor(simulationId: number, enabled = true) {
    this.simulationId = simulationId;
    this.enabled = enabled;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [ENGINE-${this.simulationId}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    if (this.enabled) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.enabled) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  error(message: string, meta?: any): void {
    if (this.enabled) {
      console.error(this.formatMessage('error', message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.enabled && process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}