import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config'

// R2 is S3-compatible — region must be 'auto' for Cloudflare
const r2 = new S3Client({
  region: 'auto',
  endpoint: config.r2.endpoint,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
})

/**
 * Returns a pre-signed GET URL valid for config.r2.presignTtlSeconds (15 min).
 * Never returns the raw R2 bucket path — Rule 6.
 */
export async function generatePresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.r2.bucketName,
    Key: key,
  })
  return getSignedUrl(r2, command, { expiresIn: config.r2.presignTtlSeconds })
}
