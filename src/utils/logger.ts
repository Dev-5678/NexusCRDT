/**
 * NexusCRDT - Structured Telemetry Logger
 * 
 * @author Dev Jangid <https://github.com/Dev-5678>
 */

export class CRDTLogger {
  private prefix: string;

  constructor(prefix = 'NexusCRDT') {
    this.prefix = prefix;
  }

  public info(message: string, context?: Record<string, any>): void {
    console.log(`[${new Date().toISOString()}] [${this.prefix}] [INFO] ${message}`, context || '');
  }

  public warn(message: string, context?: Record<string, any>): void {
    console.warn(`[${new Date().toISOString()}] [${this.prefix}] [WARN] ${message}`, context || '');
  }

  public error(message: string, error?: any): void {
    console.error(`[${new Date().toISOString()}] [${this.prefix}] [ERROR] ${message}`, error || '');
  }
}
