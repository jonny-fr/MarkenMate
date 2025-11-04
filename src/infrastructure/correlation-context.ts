import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * Infrastructure Service: Correlation ID Manager
 *
 * Provides distributed tracing support by maintaining correlation IDs
 * across async operations. Uses AsyncLocalStorage for context propagation.
 *
 * Benefits:
 * - Track requests across service boundaries
 * - Correlate logs for debugging
 * - Measure end-to-end latency
 * - Support OpenTelemetry integration
 *
 * Usage:
 * ```typescript
 * // In middleware or API route:
 * await correlationContext.run(async () => {
 *   const id = correlationContext.getId(); // Available in nested calls
 *   await someAsyncOperation();
 * });
 * ```
 */

interface CorrelationContext {
  correlationId: string;
  startTime: number;
}

class CorrelationContextManager {
  private storage = new AsyncLocalStorage<CorrelationContext>();

  /**
   * Runs a callback with a correlation context
   */
  run<T>(callback: () => T): T {
    const context: CorrelationContext = {
      correlationId: randomUUID(),
      startTime: Date.now(),
    };
    return this.storage.run(context, callback);
  }

  /**
   * Gets the current correlation ID
   */
  getId(): string | undefined {
    return this.storage.getStore()?.correlationId;
  }

  /**
   * Gets the elapsed time since context started (in ms)
   */
  getElapsedTime(): number | undefined {
    const store = this.storage.getStore();
    if (!store) return undefined;
    return Date.now() - store.startTime;
  }

  /**
   * Gets the full context
   */
  getContext(): CorrelationContext | undefined {
    return this.storage.getStore();
  }
}

export const correlationContext = new CorrelationContextManager();
