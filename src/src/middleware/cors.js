const cors = require('cors');

// Parse allowed origins from environment variable
const getAllowedOrigins = () => {
  const origins = process.env.ALLOWED_ORIGINS || '*';
  
  if (origins === '*') {
    return '*';
  }
  
  return origins.split(',').map(origin => origin.trim());
};

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow all origins if set to '*'
    if (allowedOrigins === '*') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Origin not allowed
    const error = new Error('Not allowed by CORS');
    error.code = 'CORS_ERROR';
    callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Range',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Range',
    'X-Request-Id'
  ],
  maxAge: 86400 // 24 hours
};

module.exports = cors(corsOptions);
