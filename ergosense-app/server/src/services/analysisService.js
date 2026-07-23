/**
 * AnalysisService — persistência de análises ergonômicas (SRP)
 */
import { pool, query } from '../db.js';
import { validateLoadEffortPayload } from '../loadRiskValidate.js';
import { integrateFromAnalysis } from './riskIntegrationHub.js';
import { createAetFromAnalysis } from './aetAutoFromAnalysis.js';
import { storeMedia, retrieveMedia } from './storageService.js';
import { mapAnalysis, parseDateBR, parseTimeBR } from '../mappers/coreMappers.js';

const ANALYSIS_LIST_SQL = `
  SELECT a.id, a.colaborador_id, c.nome AS collaborator_name, s.nome AS setor, a.atividade,
         a.activity_context, a.observacoes, a.data_analise, a.hora_analise, a.modo, a.synced,
         a.duracao_gravacao, a.max_risk_streak_secs, a.total_risk_secs, a.session_sample_count,
         c.icone, c.icone_bg,
         r.score, r.risk_level, r.rula, r.reba, r.angulos_json, r.workstation_json,
         r.nr17_report_json, r.recomendacoes_json,
         r.load_params_json, r.load_result_json, r.load_estimate_json, r.load_manual_json,
         r.load_effort_json,
         f.imagem_base64,
         v.mime_type AS video_mime,
         v.formato AS video_formato,
         v.storage_key
  FROM analises a
  JOIN colaboradores c ON c.id = a.colaborador_id
  LEFT JOIN setores s ON s.id = a.setor_id
  LEFT JOIN resultados_ia r ON r.analise_id = a.id
  LEFT JOIN LATERAL (
    SELECT imagem_base64 FROM fotos_analise WHERE analise_id = a.id AND deleted_at IS NULL ORDER BY id DESC LIMIT 1
  ) f ON TRUE
  LEFT JOIN LATERAL (
    SELECT mime_type, formato, storage_key FROM videos_analise
    WHERE analise_id = a.id AND deleted_at IS NULL ORDER BY id DESC LIMIT 1
  ) v ON TRUE
  WHERE a.tenant_id = $1 AND a.deleted_at IS NULL
  ORDER BY a.data_analise DESC, a.hora_analise DESC
  LIMIT 200`;

export function validateAnalysisPayload(a) {
  const loadParamsPre = a.loadParams ?? a.loadAssessment?.params ?? null;
  const loadManualPre = a.loadManual ?? a.loadAssessment?.manual ?? null;
  const loadEffortPre = a.loadEffort ?? a.loadAssessment?.effort ?? null;

  if (loadEffortPre?.weightKg != null && loadEffortPre?.distanceCm != null) {
    const v = validateLoadEffortPayload(loadEffortPre.weightKg, loadEffortPre.distanceCm);
    if (!v.ok) return v;
  } else if (loadManualPre?.enabled) {
    const weight = loadManualPre.weightKg ?? loadParamsPre?.weightKg;
    const dist =
      loadManualPre.measuredDistanceCm ??
      loadManualPre.distanceCmManual ??
      loadParamsPre?.distanceCm;
    if (weight != null && Number(weight) > 0) {
      if (dist == null || Number(dist) <= 0) {
        return { ok: false, error: 'Distância da carga obrigatória para salvar.' };
      }
      const v = validateLoadEffortPayload(weight, dist);
      if (!v.ok) return v;
    }
  } else if (loadParamsPre?.weightKg != null && loadParamsPre?.distanceCm != null) {
    const v = validateLoadEffortPayload(loadParamsPre.weightKg, loadParamsPre.distanceCm);
    if (!v.ok) return v;
  }

  return { ok: true };
}

export async function listAnalyses(tenantId) {
  const { rows } = await query(ANALYSIS_LIST_SQL, [tenantId]);
  return rows.map(mapAnalysis);
}

export async function createAnalysis(tenantId, body, user) {
  const validation = validateAnalysisPayload(body);
  if (!validation.ok) {
    const err = new Error(validation.error);
    err.status = 400;
    throw err;
  }

  const a = body;
  const loadParamsPre = a.loadParams ?? a.loadAssessment?.params ?? null;
  const loadManualPre = a.loadManual ?? a.loadAssessment?.manual ?? null;
  const loadEffortPre = a.loadEffort ?? a.loadAssessment?.effort ?? null;

  const riskLevel = String(a.risk ?? a.riskLevel ?? 'baixo').toLowerCase() || 'baixo';
  let score =
    typeof a.score === 'number' && Number.isFinite(a.score) ? Math.round(a.score) : null;
  if (score == null) {
    if (riskLevel.includes('crit') || riskLevel === 'alto') score = 75;
    else if (riskLevel.includes('medio') || riskLevel.includes('médio')) score = 45;
    else score = 20;
  }
  score = Math.max(0, Math.min(100, score));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const colabId = Number(a.collaboratorId);
    if (!colabId) throw Object.assign(new Error('colaborador inválido'), { status: 400 });

    const setorRes = await client.query(
      `SELECT setor_id FROM colaboradores WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [colabId, tenantId],
    );
    if (!setorRes.rows.length) {
      throw Object.assign(new Error('Colaborador não encontrado'), { status: 400 });
    }
    const setorId = setorRes.rows[0]?.setor_id ?? null;

    const ins = await client.query(
      `INSERT INTO analises (tenant_id, colaborador_id, setor_id, atividade, activity_context, modo,
        observacoes, data_analise, hora_analise, duracao_gravacao, max_risk_streak_secs,
        total_risk_secs, session_sample_count, synced, id_local_mobile)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        tenantId,
        colabId,
        setorId,
        a.activity,
        a.activityContext ?? null,
        a.mode ?? 'complete',
        a.notes ?? null,
        parseDateBR(a.date),
        parseTimeBR(a.time),
        a.recordingSecs ?? null,
        a.maxRiskStreakSecs ?? null,
        a.totalRiskSecs ?? null,
        a.sessionSampleCount ?? null,
        a.synced !== false,
        a.id?.startsWith('a-') ? null : a.id ?? null,
      ],
    );
    const analiseId = ins.rows[0].id;

    await client.query(
      `INSERT INTO resultados_ia (tenant_id, analise_id, score, risk_level, rula, reba,
        angulos_json, workstation_json, nr17_report_json, engine, recomendacoes_json,
        load_params_json, load_result_json, load_estimate_json, load_manual_json, load_effort_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        tenantId,
        analiseId,
        score,
        riskLevel,
        a.rula ?? null,
        a.reba ?? null,
        JSON.stringify(a.angles ?? {}),
        JSON.stringify(a.workstation ?? null),
        JSON.stringify(a.nr17Report ?? null),
        'mediapipe',
        JSON.stringify(a.nr17Report?.recommendations ?? a.loadResult?.recomendacoes ?? null),
        JSON.stringify(loadParamsPre),
        JSON.stringify(a.loadResult ?? a.loadAssessment?.result ?? null),
        JSON.stringify(a.loadEstimate ?? a.loadAssessment?.estimate ?? null),
        JSON.stringify(loadManualPre),
        JSON.stringify(loadEffortPre),
      ],
    );

    if (a.captureImage) {
      await client.query(
        `INSERT INTO fotos_analise (tenant_id, analise_id, imagem_base64, mime_type, tamanho_bytes)
         VALUES ($1,$2,$3,'image/jpeg',$4)`,
        [tenantId, analiseId, a.captureImage, a.captureImage.length],
      );
    }

    let vr = a.videoRecording;
    if (typeof vr === 'string' && vr.includes('base64,')) {
      vr = {
        data: vr,
        mimeType: vr.startsWith('data:video/mp4') ? 'video/mp4' : 'video/webm',
        format: vr.startsWith('data:video/mp4') ? 'mp4' : 'webm',
      };
    }
    if (vr?.data) {
      try {
        const raw = String(vr.data).includes('base64,')
          ? String(vr.data).split('base64,').pop()
          : String(vr.data);
        const mime = vr.mimeType ?? 'video/mp4';
        const formato = vr.format === 'webm' ? 'webm' : mime.includes('mp4') ? 'mp4' : 'webm';
        const buffer = Buffer.from(raw, 'base64');
        const stored = await storeMedia({
          tenantId,
          analiseId,
          type: 'videos',
          buffer,
          mimeType: mime,
          ext: formato,
        });

        await client.query(
          `INSERT INTO videos_analise (tenant_id, analise_id, video_base64, mime_type, formato, duracao_seg, tamanho_bytes, storage_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            tenantId,
            analiseId,
            stored.inlineBase64 ?? '',
            mime,
            formato,
            vr.durationSecs ?? a.recordingSecs ?? null,
            vr.sizeBytes ?? buffer.length,
            stored.storageKey,
          ],
        );
      } catch (videoErr) {
        console.warn(JSON.stringify({ level: 'warn', msg: 'video_save_failed', error: videoErr.message }));
      }
    }

    if (a.v2Report) {
      try {
        await client.query(`UPDATE analises SET v2_report_json = $1 WHERE id = $2`, [
          JSON.stringify(a.v2Report),
          analiseId,
        ]);
        const videoReport = a.v2Report.videoErgonomicReport;
        if (videoReport) {
          await client.query(
            `INSERT INTO video_analise (tenant_id, analise_id, frames_processados, resumo_json)
             VALUES ($1, $2, $3, $4)`,
            [tenantId, String(analiseId), videoReport.frameCount ?? 0, JSON.stringify(videoReport)],
          );
        }
      } catch (v2Err) {
        console.warn(JSON.stringify({ level: 'warn', msg: 'v2_report_save_failed', error: v2Err.message }));
      }
    }

    if (a.nr17Report) {
      await client.query(
        `INSERT INTO relatorios (tenant_id, analise_id, titulo, subtitulo, tipo, status, tamanho, id_local)
         VALUES ($1,$2,$3,$4,'NR17','ready','2.1 MB',$5)`,
        [
          tenantId,
          analiseId,
          `NR-17 · ${a.collaboratorName}`,
          `${a.date} · Conformidade ${a.nr17Report.ergoIndices?.internalConformityIndex ?? a.nr17Report.complianceScore}%`,
          a.reportId ?? `r-${Date.now()}`,
        ],
      );
    }

    await client.query(
      `UPDATE colaboradores SET risk_level = $1, updated_at = NOW() WHERE id = $2`,
      [a.risk, colabId],
    );

    try {
      await integrateFromAnalysis(client, tenantId, analiseId, a, user);
    } catch (intErr) {
      console.warn(JSON.stringify({ level: 'warn', msg: 'integrate_from_analysis_failed', error: intErr.message }));
    }

    await client.query('COMMIT');

    let aetMeta = null;
    try {
      aetMeta = await createAetFromAnalysis({
        tenantId,
        analiseId,
        analysis: a,
        user,
        generateReport: true,
      });
    } catch (aetErr) {
      console.warn(JSON.stringify({ level: 'warn', msg: 'aet_auto_from_analysis_failed', error: aetErr.message }));
    }

    return {
      id: String(analiseId),
      aetProcessId: aetMeta?.processId ?? null,
      aetCreated: Boolean(aetMeta?.created),
      aetReportGenerated: Boolean(aetMeta?.reportGenerated),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAnalysis(tenantId, id) {
  const { rows } = await query(
    `UPDATE analises SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
     RETURNING id`,
    [id, tenantId],
  );
  return rows.length > 0;
}

export async function getAnalysisVideo(tenantId, analiseId) {
  const { rows } = await query(
    `SELECT v.video_base64, v.mime_type, v.formato, v.duracao_seg, v.storage_key
     FROM videos_analise v
     JOIN analises a ON a.id = v.analise_id
     WHERE v.analise_id = $1 AND v.tenant_id = $2 AND a.deleted_at IS NULL AND v.deleted_at IS NULL
     ORDER BY v.id DESC LIMIT 1`,
    [analiseId, tenantId],
  );
  if (!rows[0]) return null;

  const media = await retrieveMedia(rows[0]);
  return {
    buffer: media.buffer,
    mimeType: media.mimeType,
    formato: rows[0].formato,
    duracaoSeg: rows[0].duracao_seg,
  };
}

export async function listReports(tenantId) {
  const { rows } = await query(
    `SELECT r.id, r.titulo, r.subtitulo, r.tipo, r.status, r.tamanho, r.analise_id, r.id_local
     FROM relatorios r WHERE r.tenant_id = $1 ORDER BY r.created_at DESC LIMIT 100`,
    [tenantId],
  );
  return rows.map((r) => ({
    id: r.id_local ?? `r-${r.id}`,
    title: r.titulo,
    subtitle: r.subtitulo,
    size: r.tamanho ?? '2.1 MB',
    status: r.status,
    type: r.tipo,
    analysisId: r.analise_id ? String(r.analise_id) : undefined,
  }));
}
