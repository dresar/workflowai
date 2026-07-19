import './config/env.config';
import express from 'express';
import cors from 'cors';
import { env, corsOrigins } from './config/env.config';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { globalErrorHandler, notFoundHandler } from './errors/global-error-handler';
import { logger } from './logger/logger';
import router from './routes';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    if (corsOrigins.indexOf(origin) !== -1) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

app.use(env.API_PREFIX, router);

app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(env.PORT, () => {
  logger.info(`AI Software Architect API started on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`API available at: ${env.APP_URL}${env.API_PREFIX}`);
});

export default app;
