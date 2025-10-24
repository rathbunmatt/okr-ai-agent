import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  env: process.env.NODE_ENV || 'development',

  // Static files path
  staticPath: join(__dirname, '../../../client/dist'),

  // Database configuration
  database: {
    path: process.env.DB_PATH || join(__dirname, '../../data/okr-agent.db'),
  },

  // Claude API configuration
  // Using Claude Sonnet 4.5 (released Sept 29, 2025)
  // Specs: 200K context window, 64K max output, $3/$15 per million tokens
  // Knowledge cutoff: January 2025, Training data: July 2025
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '8192', 10),
    timeout: parseInt(process.env.CLAUDE_TIMEOUT || '30000', 10),
  },

  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'development'
      ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']
      : process.env.CORS_ORIGIN?.split(',') || false,
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || join(__dirname, '../../logs/app.log'),
  },
} as const;

// Validate required environment variables
export function validateConfig(): void {
  const requiredVars = ['ANTHROPIC_API_KEY'];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }
}