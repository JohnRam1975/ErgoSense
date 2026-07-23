/**
 * Comparação entre versões normativas — diff textual
 */
import { query } from '../db.js';
import { compareNormTexts } from './complianceDiffCore.js';

export async function compareNormVersions(tenantId, normId, fromVersionId, toVersionId) {
  const { rows } = await query(
    `SELECT id, numero_versao, tipo_alteracao, texto_resumo, texto_completo, data_publicacao, validada_por
     FROM compliance_norma_versoes
     WHERE tenant_id = $1 AND norma_id = $2 AND id = ANY($3::bigint[])`,
    [tenantId, normId, [fromVersionId, toVersionId]],
  );
  if (rows.length < 2) return null;

  const fromVer = rows.find((r) => Number(r.id) === Number(fromVersionId));
  const toVer = rows.find((r) => Number(r.id) === Number(toVersionId));
  if (!fromVer || !toVer) return null;

  const fromText = fromVer.texto_completo || fromVer.texto_resumo || '';
  const toText = toVer.texto_completo || toVer.texto_resumo || '';
  const diff = compareNormTexts(fromText, toText);

  return {
    normId: String(normId),
    from: {
      id: String(fromVer.id),
      versionNumber: fromVer.numero_versao,
      changeType: fromVer.tipo_alteracao,
      publishedAt: fromVer.data_publicacao,
    },
    to: {
      id: String(toVer.id),
      versionNumber: toVer.numero_versao,
      changeType: toVer.tipo_alteracao,
      publishedAt: toVer.data_publicacao,
      validatedBy: toVer.validada_por,
    },
    diff,
  };
}
