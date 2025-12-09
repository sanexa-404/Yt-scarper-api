require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('./middleware/cors');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Import routes
const searchRoutes = require('./routes/search');
const streamRoutes = require('./routes/stream');
const tracksRoutes = require('./routes/tracks');

const app = express();

// ========== MIDDLEWARE ==========
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(cors);
app.use(rateLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: logger.stream }));

// Request logger middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    query: req.query
  });
  next();
});

// ========== ROUTES ==========
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/stream', streamRoutes);
app.use('/api/v1/tracks', tracksRoutes);

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'music-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ========== ROOT ENDPOINT ==========
app.get('/', (req, res) => {
  res.json({
    message: '🎵 Music API',
    version: '1.0.0',
    documentation: 'https://github.com/yourusername/music-api',
    endpoints: {
      search: '/api/v1/search?q=query',
      track: '/api/v1/search/track/:id',
      stream: '/api/v1/stream/:id',
      related: '/api/v1/search/related/:id',
      trending: '/api/v1/tracks/trending'
    },
    usage: 'Add /api/v1/ before any endpoint'
  });
});

// ========== ERROR HANDLING ==========

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

// ========== SERVER START ==========
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server started on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🌐 Health: http://localhost:${PORT}/health`);
  logger.info(`🔍 API Base: http://localhost:${PORT}/api/v1`);
});

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
