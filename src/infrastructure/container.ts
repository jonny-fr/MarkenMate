import "server-only";
import type { ILogger } from "@/application/ports/logger";
import type { IAuthorizationService } from "@/application/ports/authorization-service";
import { DatabaseLogger } from "./adapters/database-logger";
import { AuthorizationService } from "./adapters/authorization-service";

/**
 * Dependency injection container
 * Creates and wires all infrastructure dependencies
 */
export interface Container {
  logger: ILogger;
  authorizationService: IAuthorizationService;
}

let containerInstance: Container | null = null;

/**
 * Get or create the application container
 * Singleton pattern ensures single instance
 */
export function getContainer(): Container {
  if (!containerInstance) {
    containerInstance = createContainer();
  }
  return containerInstance;
}

/**
 * Create a new container with all dependencies
 */
function createContainer(): Container {
  const logger = new DatabaseLogger();
  const authorizationService = new AuthorizationService();

  return {
    logger,
    authorizationService,
  };
}

/**
 * Reset container (useful for testing)
 */
export function resetContainer(): void {
  containerInstance = null;
}
