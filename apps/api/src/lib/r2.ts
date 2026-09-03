import { S3Client } from '@aws-sdk/client-s3';

const hasR2Config = Boolean(
  process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET,
);

export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID ?? '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  bucket: process.env.R2_BUCKET ?? 'novaflow-media',
  publicUrl: process.env.R2_PUBLIC_URL ?? '',
  isConfigured: hasR2Config,
};

export const r2Client: S3Client | null = hasR2Config
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${r2Config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    })
  : null;

export function getMediaUrl(r2Key: string): string {
  if (r2Config.publicUrl) {
    return `${r2Config.publicUrl}/${r2Key}`;
  }
  // Fallback: local path for dev without R2
  return `/${r2Key}`;
}
