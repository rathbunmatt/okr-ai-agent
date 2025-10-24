import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Validation middleware for API requests
 */

// Maximum lengths for inputs
const MAX_USER_ID_LENGTH = 255;
const MAX_MESSAGE_LENGTH = 10000;
const MAX_STRING_LENGTH = 5000;

/**
 * Validate userId for SQL injection patterns and length
 */
export function validateUserId(req: Request, res: Response, next: NextFunction) {
  const { userId } = req.body;

  if (!userId) {
    return next();
  }

  // Check length
  if (userId.length > MAX_USER_ID_LENGTH) {
    logger.warn('User ID exceeds maximum length', { length: userId.length });
    return res.status(400).json({
      success: false,
      error: `User ID exceeds maximum length of ${MAX_USER_ID_LENGTH} characters`
    });
  }

  // Check for SQL injection patterns
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,  // SQL comment and quote chars
    /(\bunion\b.*\bselect\b)/i,        // UNION SELECT
    /(\bdrop\b.*\btable\b)/i,          // DROP TABLE
    /(\binsert\b.*\binto\b)/i,         // INSERT INTO
    /(\bupdate\b.*\bset\b)/i,          // UPDATE SET
    /(\bdelete\b.*\bfrom\b)/i,         // DELETE FROM
    /(\bexec\b|\bexecute\b)/i,         // EXEC/EXECUTE
    /(\bor\b.*\=.*\b)/i,               // OR 1=1
    /;.*drop/i,                        // ; DROP
    /;.*delete/i,                      // ; DELETE
    /;.*update/i                       // ; UPDATE
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(userId)) {
      logger.warn('Potential SQL injection attempt detected', { userId });
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }
  }

  next();
}

/**
 * Validate request body string lengths
 */
export function validateInputLengths(req: Request, res: Response, next: NextFunction) {
  const { userId, message, content } = req.body;

  // Check userId length
  if (userId && userId.length > MAX_USER_ID_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `User ID exceeds maximum length of ${MAX_USER_ID_LENGTH} characters`
    });
  }

  // Check message length
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`
    });
  }

  // Check content length
  if (content && content.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`
    });
  }

  // Check other string fields
  if (req.body.context) {
    const contextStr = JSON.stringify(req.body.context);
    if (contextStr.length > MAX_STRING_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Context data exceeds maximum length of ${MAX_STRING_LENGTH} characters`
      });
    }
  }

  next();
}

/**
 * Validate Content-Type header
 */
export function validateContentType(req: Request, res: Response, next: NextFunction) {
  // Skip for GET requests
  if (req.method === 'GET' || req.method === 'DELETE') {
    return next();
  }

  const contentType = req.get('Content-Type');

  if (!contentType) {
    logger.warn('Missing Content-Type header');
    return res.status(400).json({
      success: false,
      error: 'Content-Type header is required'
    });
  }

  if (!contentType.includes('application/json')) {
    logger.warn('Invalid Content-Type header', { contentType });
    return res.status(400).json({
      success: false,
      error: 'Content-Type must be application/json'
    });
  }

  next();
}

/**
 * Sanitize user inputs to prevent XSS
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      // Remove potentially dangerous HTML/script tags
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

/**
 * Combined validation middleware
 */
export function validateRequest(req: Request, res: Response, next: NextFunction) {
  // Chain validations
  validateContentType(req, res, (err) => {
    if (err) return next(err);

    validateInputLengths(req, res, (err) => {
      if (err) return next(err);

      validateUserId(req, res, (err) => {
        if (err) return next(err);

        sanitizeInputs(req, res, next);
      });
    });
  });
}
