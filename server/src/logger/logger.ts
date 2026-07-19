import winston from 'winston';
import type { LogMeta } from './logger.types';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const isDevelopment = process.env.NODE_ENV !== 'production';

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${level}]${metaStr}: ${message}`;
  }),
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: isDevelopment ? devFormat : prodFormat,
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

export const logRequest = (meta: LogMeta, message: string) =>
  logger.info(message, { ...meta, category: 'request' });

export const logAI = (meta: LogMeta, message: string) =>
  logger.info(message, { ...meta, category: 'ai' });

export const logRotation = (meta: LogMeta, message: string) =>
  logger.info(message, { ...meta, category: 'rotation' });

export const logDatabase = (meta: LogMeta, message: string) =>
  logger.info(message, { ...meta, category: 'database' });

export const logError = (meta: LogMeta, message: string, error?: unknown) =>
  logger.error(message, {
    ...meta,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
