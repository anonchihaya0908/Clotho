/**
 * Coordinator Decorators
 * ======================
 * 
 * Provides decorators for automatic logging, error handling, and performance tracking
 * for coordinator classes that extend BaseCoordinator.
 */

import { errorHandler } from '../error-handler';
import { createModuleLogger } from '../logger/unified-logger';

/**
 * Decorator for automatic operation logging
 * Logs method entry, exit, duration, and parameters
 */
export function logOperation(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;
  const className = target.constructor.name;
  const logger = createModuleLogger(`${className}-Decorator`);

  descriptor.value = async function (...args: any[]) {
    const startTime = Date.now();

    logger.info(`Operation started: ${propertyKey}`, {
      module: className,
      operation: propertyKey,
      args: args.length > 0 ? `${args.length} arguments` : 'no arguments'
    });

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - startTime;

      logger.info(`Operation completed: ${propertyKey}`, {
        module: className,
        operation: propertyKey,
        duration: duration,
        success: true
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`Operation failed: ${propertyKey}`, error instanceof Error ? error : new Error(String(error)), {
        operation: propertyKey,
        duration,
        success: false
      });

      throw error;
    }
  };

  return descriptor;
}

/**
 * Decorator for automatic error handling in coordinator methods
 * Catches errors and delegates to the error handler with proper context
 */
export function handleCoordinatorErrors(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;
  const className = target.constructor.name;

  descriptor.value = async function (...args: any[]) {
    try {
      return await originalMethod.apply(this, args);
    } catch (error) {
      errorHandler.handle(error, {
        operation: propertyKey,
        module: className,
        showToUser: true,
        logLevel: 'error'
      });

      // Return undefined for failed operations
      return undefined;
    }
  };

  return descriptor;
}

/**
 * Decorator for performance tracking
 * Tracks method execution time and logs performance warnings for slow operations
 */
export function trackPerformance(slowThresholdMs: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const logger = createModuleLogger(`${className}-Performance`);

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        if (duration > slowThresholdMs) {
          logger.warn(`Slow operation detected: ${propertyKey}`, {
            module: className,
            operation: propertyKey,
            duration: duration,
            threshold: `${slowThresholdMs}ms`,
            performance: 'slow'
          });
        } else {
          logger.debug(`Performance tracked: ${propertyKey}`, {
            module: className,
            operation: propertyKey,
            duration: duration,
            performance: 'normal'
          });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        logger.error(`Operation failed with performance data: ${propertyKey}`, error instanceof Error ? error : new Error(String(error)), {
          operation: propertyKey,
          duration,
          performance: 'failed'
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Combined decorator that applies logging, error handling, and performance tracking
 * Convenient decorator for coordinator public methods
 */
export function coordinatorOperation(slowThresholdMs: number = 1000) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    // Apply decorators in reverse order (they wrap from inside out)
    trackPerformance(slowThresholdMs)(target, propertyKey, descriptor);
    handleCoordinatorErrors(target, propertyKey, descriptor);
    logOperation(target, propertyKey, descriptor);

    return descriptor;
  };
}

/**
 * Decorator for dependency validation
 * Validates that required dependencies are present before method execution
 */
export function requireDependencies(...dependencyNames: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const logger = createModuleLogger(`${className}-Dependencies`);

    descriptor.value = function (...args: any[]) {
      // Check if dependencies exist on the instance
      const missing: string[] = [];

      for (const depName of dependencyNames) {
        if (!(this as any)[depName]) {
          missing.push(depName);
        }
      }

      if (missing.length > 0) {
        const error = new Error(`Missing required dependencies for ${propertyKey}: ${missing.join(', ')}`);

        logger.error(`Dependency validation failed: ${propertyKey}`, error, {
          operation: propertyKey,
          metadata: {
            missing,
            required: dependencyNames
          }
        });

        throw error;
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Decorator that ensures the coordinator is not disposed before method execution
 */
export function requireNotDisposed(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;
  const className = target.constructor.name;
  const logger = createModuleLogger(`${className}-Lifecycle`);

  descriptor.value = function (...args: any[]) {
    if ((this as any).isDisposed) {
      const error = new Error(`Cannot execute ${propertyKey} on disposed coordinator`);

      logger.error(`Operation attempted on disposed coordinator: ${propertyKey}`, error, {
        operation: propertyKey,
        metadata: { state: 'disposed' }
      });

      throw error;
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}
