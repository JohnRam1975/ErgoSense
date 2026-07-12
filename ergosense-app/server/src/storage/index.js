/**
 * Abstração de storage — hoje: PostgreSQL (base64).
 * Futuro: MinIO / S3 / Azure Blob sem alterar controllers.
 */
import { config } from '../config/env.js';

export function getStorageDriver() {
  return config.storage.driver;
}

/**
 * @param {{ tenantId: string, avaliacaoId: string, buffer: Buffer, mimeType: string, filename?: string }} params
 * @returns {Promise<{ storageKey: string, url?: string, driver: string }>}
 */
export async function uploadMedia(params) {
  const driver = getStorageDriver();

  if (driver === 'database') {
    return {
      driver: 'database',
      storageKey: null,
      url: null,
      note: 'Use imagem_base64 via API atual até STORAGE_DRIVER=minio|s3',
    };
  }

  if (driver === 'minio' || driver === 's3') {
    const key = `${params.tenantId}/${params.avaliacaoId}/${params.filename ?? 'capture.jpg'}`;
    // Integração @aws-sdk/client-s3 em fase posterior
    return {
      driver,
      storageKey: key,
      url: config.storage.publicBaseUrl
        ? `${config.storage.publicBaseUrl}/${config.storage.bucket}/${key}`
        : undefined,
      pendingImplementation: true,
    };
  }

  throw new Error(`STORAGE_DRIVER invalido: ${driver}`);
}

export function storageHealth() {
  return {
    driver: config.storage.driver,
    bucket: config.storage.bucket,
    endpointConfigured: Boolean(config.storage.endpoint),
  };
}
