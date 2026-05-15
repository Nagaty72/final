import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,

  // JWT
  JWT_SECRET:
    process.env.JWT_SECRET || 'change-this-to-a-strong-secret-in-production',

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    'change-this-refresh-secret-in-production',

  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // CORS
  FRONTEND_URL:
    process.env.FRONTEND_URL || 'http://localhost:3000',

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,

  // AI Service
  AI_SERVICE_URL:
    process.env.AI_SERVICE_URL || 'http://localhost:8000',
};