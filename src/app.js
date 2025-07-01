import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { httpError } from './utils/httpError.js';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import {
  correlationIdMiddleware,
  limiter,
  metricsMiddleware,
  swaggerDocument
} from './middlewares/serverMiddleware.js';
import healthRoutes from './routes/healthRoutes.js';
import jobsRoutes from './routes/jobsRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

const server = express();

server.use(helmet());

server.use(
  compression({
    level: 6,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 15 * 1000
  })
);

server.use('/api', limiter);

server.use(express.json({ limit: '16kb' }));

server.use(express.urlencoded({ extended: true }));

server.use(mongoSanitize());

server.use(xss());

server.use(
  hpp({
    whitelist: []
  })
);

const corsOptions = {
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
};

server.use(cors(corsOptions));

server.use(metricsMiddleware);

server.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true
    }
  })
);

// Prometheus metrics endpoint
// server.get('/metrics', async (req, res) => {
//   res.set('Content-Type', register.contentType);
//   res.end(await register.metrics());
// });

server.use(correlationIdMiddleware);

server.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});
server.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Auth Service API 🚀.' });
});
server.use('/api/v1/health', healthRoutes);
server.use('/api/v1/jobs', jobsRoutes);
server.use('/api/v1/vendor-webhook', webhookRoutes);

server.all('*', (req, res, next) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

server.use(globalErrorHandler);

export default server;
