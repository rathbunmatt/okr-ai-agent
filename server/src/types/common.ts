/**
 * Common Types
 * Shared type definitions used across the application
 */

/**
 * Generic metadata object for extensible data
 */
export type Metadata = Record<string, unknown>;

/**
 * JSON-serializable value types
 */
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

/**
 * Health check details
 */
export interface HealthDetails {
  status?: string;
  message?: string;
  timestamp?: string;
  [key: string]: JsonValue | undefined;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Metadata;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Time range for queries
 */
export interface TimeRange {
  startDate: Date | string;
  endDate: Date | string;
}

/**
 * Generic filter options
 */
export interface FilterOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string | number | boolean>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  duration: number;
  timestamp: Date;
  operation: string;
  success: boolean;
  metadata?: Metadata;
}

/**
 * Event data for analytics
 */
export interface EventData {
  eventType: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  data: JsonObject;
}

/**
 * Generic error details
 */
export interface ErrorDetails {
  code?: string;
  message: string;
  stack?: string;
  context?: Metadata;
}

/**
 * Database query result
 */
export interface QueryResult<T = unknown> {
  rows: T[];
  rowCount: number;
  metadata?: Metadata;
}

/**
 * Cache entry metadata
 */
export interface CacheMetadata {
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size?: number;
}

/**
 * Webhook payload
 */
export interface WebhookPayload {
  event: string;
  timestamp: Date;
  data: JsonObject;
  signature?: string;
}

/**
 * File upload metadata
 */
export interface FileMetadata {
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  action: string;
  userId: string;
  timestamp: Date;
  resource: string;
  resourceId: string;
  changes?: JsonObject;
  metadata?: Metadata;
}

/**
 * Feature flag
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  conditions?: JsonObject;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Type guard helpers
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value);
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (isJsonArray(value)) return value.every(isJsonValue);
  if (isJsonObject(value)) return Object.values(value).every(isJsonValue);
  return false;
}
