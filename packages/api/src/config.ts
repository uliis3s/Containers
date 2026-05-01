import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_ENDPOINT: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌  Missing or invalid environment variables:')
  const fieldErrors = parsed.error.flatten().fieldErrors
  for (const [field, messages] of Object.entries(fieldErrors)) {
    console.error(`   ${field}: ${messages?.join(', ')}`)
  }
  process.exit(1)
}

const env = parsed.data

export const config = {
  api: {
    port: env.API_PORT,
    host: env.API_HOST,
  },
  db: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: '8h',
    refreshExpiresIn: '7d',
  },
  r2: {
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    endpoint: env.R2_PUBLIC_ENDPOINT,
    presignTtlSeconds: 900, // 15 minutes — Rule 6
  },
} as const

export type Config = typeof config
