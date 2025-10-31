/**
 * Utility functions for consistent error handling
 */

export function getErrorMessage(error: unknown): string {
  try {
    if (error instanceof Error) {
      return error.message;
    }
    if (error && typeof error === 'object') {
      // Try to safely stringify object errors
      if ('message' in error && typeof (error as any).message === 'string') {
        return (error as any).message;
      }
      // Attempt JSON.stringify with a fallback
      try {
        return JSON.stringify(error);
      } catch {
        return 'Error object could not be serialized';
      }
    }
    return String(error);
  } catch (e) {
    // If all else fails, return a safe fallback
    return 'Unknown error occurred';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, identifier?: string) {
    super(`${resource}${identifier ? ` with id '${identifier}'` : ''} not found`);
    this.name = 'NotFoundError';
  }
}