/**
 * Storage abstrato — database (default) ou S3/MinIO
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/env.js';

let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;
  if (!config.storage.endpoint || !config.storage.accessKey) return null;
  s3Client = new S3Client({
    region: config.storage.region,
    endpoint: config.storage.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.storage.accessKey,
      secretAccessKey: config.storage.secretKey,
    },
  });
  return s3Client;
}

export function isExternalStorage() {
  const driver = config.storage.driver?.toLowerCase();
  return driver === 's3' || driver === 'minio';
}

export function buildStorageKey(tenantId, type, analiseId, ext) {
  return `${tenantId}/${type}/${analiseId}.${ext}`;
}

export async function storeMedia({ tenantId, analiseId, type, buffer, mimeType, ext }) {
  if (!isExternalStorage()) {
    return { storageKey: null, inlineBase64: buffer.toString('base64') };
  }

  const client = getS3Client();
  if (!client) {
    console.warn(JSON.stringify({ level: 'warn', msg: 'storage_s3_not_configured', fallback: 'database' }));
    return { storageKey: null, inlineBase64: buffer.toString('base64') };
  }

  const key = buildStorageKey(tenantId, type, analiseId, ext);
  await client.send(
    new PutObjectCommand({
      Bucket: config.storage.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  const publicUrl = config.storage.publicBaseUrl
    ? `${config.storage.publicBaseUrl.replace(/\/$/, '')}/${key}`
    : null;

  return { storageKey: key, inlineBase64: null, publicUrl };
}

export async function retrieveMedia(row) {
  if (row.storage_key && isExternalStorage()) {
    const client = getS3Client();
    if (!client) throw new Error('Storage S3 não configurado');

    const out = await client.send(
      new GetObjectCommand({
        Bucket: config.storage.bucket,
        Key: row.storage_key,
      }),
    );
    const chunks = [];
    for await (const chunk of out.Body) chunks.push(chunk);
    return {
      buffer: Buffer.concat(chunks),
      mimeType: row.mime_type || out.ContentType || 'application/octet-stream',
    };
  }

  if (row.video_base64) {
    return {
      buffer: Buffer.from(row.video_base64, 'base64'),
      mimeType: row.mime_type || 'video/mp4',
    };
  }

  throw new Error('Mídia não encontrada');
}

export function getStorageStatus() {
  return {
    driver: config.storage.driver,
    bucket: config.storage.bucket,
    external: isExternalStorage(),
    configured: isExternalStorage() ? Boolean(getS3Client()) : true,
  };
}
