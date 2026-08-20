import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret'),
  JWT_REFRESH_SECRET: z.string().min(1).default('dev-refresh-secret'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),
  APP_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  WHATSAPP_APP_SECRET: z.string().default(''),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().default('wa-verify-token'),
  WHATSAPP_API_VERSION: z.string().default('v22.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_API_TOKEN: z.string().default(''),
  VITE_API_URL: z.string().default('http://localhost:4000/api/v1'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
   
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
export const isProd = env.APP_ENV === 'production';