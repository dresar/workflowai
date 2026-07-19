export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'request' | 'ai' | 'rotation' | 'database' | 'auth' | 'system';

export interface LogMeta {
  requestId?: string;
  category?: LogCategory;
  [key: string]: unknown;
}
