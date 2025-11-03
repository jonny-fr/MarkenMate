/**
 * Logger port interface
 * Infrastructure layer provides concrete implementation
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  [key: string]: unknown;
}

export interface ILogger {
  /**
   * Log informational message
   */
  info(message: string, context?: LogContext, userId?: string): Promise<void>;

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext, userId?: string): Promise<void>;

  /**
   * Log error message
   */
  error(message: string, context?: LogContext, userId?: string): Promise<void>;

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext, userId?: string): Promise<void>;

  /**
   * Log audit trail for security-relevant operations
   */
  audit(action: string, context: LogContext, userId: string): Promise<void>;
}
