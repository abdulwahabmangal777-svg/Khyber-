// Backend Configuration & Environment Variables
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fleet_db',
    directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || ''
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'saudi_fleet_super_secure_jwt_secret_key_2026_x9910',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'saudi_fleet_refresh_token_secret_key_2026_r9910',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || 'https://s3.me-central-1.amazonaws.com',
    bucket: process.env.STORAGE_BUCKET || 'saudi-fleet-documents-prod',
    accessKey: process.env.STORAGE_ACCESS_KEY || '',
    secretKey: process.env.STORAGE_SECRET_KEY || '',
    maxFileSizeBytes: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp'
    ]
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || ''
  },

  security: {
    rateLimitMax: 300, // requests per window
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15
  }
};
