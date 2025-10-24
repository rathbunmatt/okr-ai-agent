import { config } from './index';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

export interface SecurityConfig {
  rateLimits: {
    global: RateLimitRequestHandler;
    api: RateLimitRequestHandler;
    auth: RateLimitRequestHandler;
    claude: RateLimitRequestHandler;
  };
  helmet: {
    contentSecurityPolicy: any;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: any;
    dnsPrefetchControl: boolean;
    frameguard: any;
    hidePoweredBy: boolean;
    hsts: any;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: any;
    xssFilter: boolean;
  };
  cors: {
    origin: string[] | boolean;
    credentials: boolean;
    optionsSuccessStatus: number;
    methods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAge: number;
  };
}

/**
 * Comprehensive security configuration for production and development
 */
export function getSecurityConfig(): SecurityConfig {
  const isDevelopment = config.env === 'development';

  return {
    rateLimits: {
      // Global rate limiting (per IP)
      global: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: isDevelopment ? 1000 : 100, // requests per window
        message: {
          error: 'Too many requests from this IP, please try again later.',
          retryAfter: '15 minutes',
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
          return req.ip || req.socket.remoteAddress || 'unknown';
        },
      }),

      // API endpoints rate limiting
      api: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: isDevelopment ? 500 : 100, // requests per window
        message: {
          error: 'API rate limit exceeded. Please try again later.',
          retryAfter: '15 minutes',
        },
        standardHeaders: true,
        legacyHeaders: false,
      }),

      // Authentication endpoints (stricter)
      auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: isDevelopment ? 50 : 10, // requests per window
        message: {
          error: 'Too many authentication attempts. Please try again later.',
          retryAfter: '15 minutes',
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // Don't count successful auth requests
      }),

      // Claude API calls (per session)
      claude: rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: isDevelopment ? 100 : 20, // requests per window per session
        message: {
          error: 'Claude API rate limit exceeded. Please slow down your requests.',
          retryAfter: '1 minute',
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
          // Rate limit per session ID if available, otherwise per IP
          return (req.body?.sessionId || req.params?.id || req.ip) as string;
        },
      }),
    },

    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            isDevelopment ? "'unsafe-eval'" : null, // Allow eval in development for HMR
            isDevelopment ? "'unsafe-inline'" : null, // Allow inline scripts in development
          ].filter(Boolean),
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for CSS-in-JS
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          fontSrc: ["'self'", "https:", "data:"],
          connectSrc: [
            "'self'",
            "ws:",
            "wss:",
            "https://api.anthropic.com", // Claude API
            isDevelopment ? "http://localhost:*" : null,
            isDevelopment ? "ws://localhost:*" : null,
          ].filter(Boolean),
          mediaSrc: ["'self'", "blob:", "data:"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: !isDevelopment, // Only in production
        },
      },
      crossOriginEmbedderPolicy: !isDevelopment, // Disable in development
      crossOriginOpenerPolicy: !isDevelopment,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: false,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
    },

    cors: {
      origin: config.cors.origin,
      credentials: true,
      optionsSuccessStatus: 200, // Some legacy browsers choke on 204
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Session-ID',
        'X-User-ID',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      maxAge: 86400, // 24 hours
    },
  };
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(req: Request, res: Response, next: Function): void {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key name
    const sanitizedKey = sanitizeValue(key);
    if (typeof sanitizedKey === 'string' && sanitizedKey.length > 0) {
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
  }
  return sanitized;
}

function sanitizeValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove potentially dangerous characters and patterns
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

/**
 * Request validation middleware
 */
export function validateRequest(req: Request, res: Response, next: Function): void {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(\.|%2e)(\.|%2e)(\/|%2f)/i, // Directory traversal
    /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i, // SQL injection
    /<script|javascript:|on\w+=/i, // XSS
    /\$\{.*\}/i, // Template injection
  ];

  const checkValue = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkValue(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(checkObject);
    }
    return false;
  };

  // Check body, query, and params
  if (checkObject(req.body) || checkObject(req.query) || checkObject(req.params)) {
    res.status(400).json({
      success: false,
      error: 'Invalid request detected',
      code: 'INVALID_REQUEST',
    });
    return;
  }

  next();
}

/**
 * Security headers middleware for API responses
 */
export function securityHeaders(req: Request, res: Response, next: Function): void {
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');

  next();
  return;
}