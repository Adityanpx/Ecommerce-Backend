import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // Customer JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Admin JWT
  ADMIN_JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'ADMIN_JWT_ACCESS_SECRET must be at least 32 characters'),
  ADMIN_JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'ADMIN_JWT_REFRESH_SECRET must be at least 32 characters'),
  ADMIN_JWT_ACCESS_EXPIRY: z.string().default('15m'),
  ADMIN_JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Security
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),

  // CORS
  CUSTOMER_APP_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_APP_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),

  // Cloudinary (optional in dev — image upload simply won't work without it)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('sportstore'),

  // Cloudflare R2 (optional in dev — image upload simply won't work without it)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_PUBLIC_BUCKET: z.string().default('ecommerce-sportstore-media'),
  R2_PRIVATE_BUCKET: z.string().default('ecommerce-sportstore-media-private'),
  // Public dev URL (pub-xxx.r2.dev) locally; swap for the custom CDN domain in production.
  R2_PUBLIC_BASE_URL: z.string().optional(),

  // Razorpay (optional in dev)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // MSG91 (optional in dev)
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_SENDER_ID: z.string().optional(),
  MSG91_OTP_TEMPLATE_ID: z.string().optional(),
  MSG91_ORDER_TEMPLATE_ID: z.string().optional(),
  MSG91_SHIPPED_TEMPLATE_ID: z.string().optional(),
  MSG91_DELIVERED_TEMPLATE_ID: z.string().optional(),

  // Resend (optional in dev)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@example.com'),
  EMAIL_FROM_NAME: z.string().default('Sports Store'),
  ADMIN_ALERT_EMAIL: z.string().optional(),

  // Sentry (optional — blank disables it)
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  // Meilisearch
  MEILISEARCH_HOST: z.string().url().optional(),
  MEILISEARCH_API_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('\n  Invalid environment variables:\n');
  parsed.error.issues.forEach((issue) => {
    // eslint-disable-next-line no-console
    console.error(`   ${issue.path.join('.')}: ${issue.message}`);
  });
  // eslint-disable-next-line no-console
  console.error('\n  Check your .env file against .env.example\n');
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  apiVersion: env.API_VERSION,
  apiPrefix: `/api/${env.API_VERSION}`,

  database: {
    url: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
  },

  jwt: {
    customer: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiry: env.JWT_ACCESS_EXPIRY,
      refreshExpiry: env.JWT_REFRESH_EXPIRY,
    },
    admin: {
      accessSecret: env.ADMIN_JWT_ACCESS_SECRET,
      refreshSecret: env.ADMIN_JWT_REFRESH_SECRET,
      accessExpiry: env.ADMIN_JWT_ACCESS_EXPIRY,
      refreshExpiry: env.ADMIN_JWT_REFRESH_EXPIRY,
    },
  },

  security: {
    bcryptRounds: env.BCRYPT_SALT_ROUNDS,
    cookieSecret: env.COOKIE_SECRET,
  },

  cors: {
    customerAppUrl: env.CUSTOMER_APP_URL,
    adminAppUrl: env.ADMIN_APP_URL,
    origins: env.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    folder: env.CLOUDINARY_FOLDER,
    isConfigured: Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
    ),
  },

  r2: {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    endpoint: env.R2_ENDPOINT,
    publicBucket: env.R2_PUBLIC_BUCKET,
    privateBucket: env.R2_PRIVATE_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
    isConfigured: Boolean(
      env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ENDPOINT,
    ),
  },

  razorpay: {
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    isConfigured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
  },

  msg91: {
    authKey: env.MSG91_AUTH_KEY,
    senderId: env.MSG91_SENDER_ID,
    templates: {
      otp: env.MSG91_OTP_TEMPLATE_ID,
      order: env.MSG91_ORDER_TEMPLATE_ID,
      shipped: env.MSG91_SHIPPED_TEMPLATE_ID,
      delivered: env.MSG91_DELIVERED_TEMPLATE_ID,
    },
    isConfigured: Boolean(env.MSG91_AUTH_KEY && env.MSG91_SENDER_ID),
  },

  email: {
    apiKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    fromName: env.EMAIL_FROM_NAME,
    adminAlertEmail: env.ADMIN_ALERT_EMAIL,
    isConfigured: Boolean(env.RESEND_API_KEY),
  },

  sentry: {
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    isConfigured: Boolean(env.SENTRY_DSN),
  },

  meilisearch: {
    host: env.MEILISEARCH_HOST,
    apiKey: env.MEILISEARCH_API_KEY,
    isConfigured: Boolean(env.MEILISEARCH_HOST && env.MEILISEARCH_API_KEY),
  },

  logging: {
    level: env.LOG_LEVEL,
  },
} as const;

export type Config = typeof config;
