/**
 * Serviço de transmissão eSocial — envio, reenvio, status, histórico
 * Orquestra adaptador gov.br (desacoplado) e persistência
 */
import { query } from '../db.js';
import { TRANSMISSION_STATUS, EVENT_STATUS_FROM_TRANSMISSION } from './esocialConstants.js';
import { createGovbrAdapter } from './esocialGovbrAdapter.js';
import { validateEsocialXsdS13 } from './esocialXsdValidator.js';
import { logEsocialHistory } from './esocialUtils.js';

export function mapTransmissao(row) {
  return {
    id: String(row.id),
    eventDbId: String(row.evento_id),
    attempt: row.tentativa,
    status: row.status,
    protocol: row.protocolo,
    loteId: row.lote_id,
    responseCode: row.codigo_resposta,
    message: row.mensagem,
    errors: row.erros_json ?? [],
    endpoint: row.endpoint,
    sentAt: row.enviado_em,
    processedAt: row.processado_em,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getEvent(tenantId, eventDbId) {
  const { rows } = await query(
    `SELECT * FROM esocial_eventos WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
    [eventDbId, tenantId],
  );
  return rows[0] ?? null;
}

async function getConfig(tenantId) {
  const { rows } = await query(`SELECT * FROM esocial_config WHERE tenant_id = $1`, [tenantId]);
  return rows[0] ?? null;
}

async function createTransmission(tenantId, eventDbId, tentativa, endpoint) {
  const { rows } = await query(
    `INSERT INTO esocial_transmissoes (tenant_id, evento_id, tentativa, status, endpoint)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [tenantId, eventDbId, tentativa, TRANSMISSION_STATUS.PENDENTE, endpoint ?? null],
  );
  return rows[0];
}

async function updateTransmission(id, fields) {
  const { rows } = await query(
    `UPDATE esocial_transmissoes SET
       status = COALESCE($2, status),
       protocolo = COALESCE($3, protocolo),
       lote_id = COALESCE($4, lote_id),
       codigo_resposta = COALESCE($5, codigo_resposta),
       mensagem = COALESCE($6, mensagem),
       erros_json = COALESCE($7, erros_json),
       xml_lote = COALESCE($8, xml_lote),
       resposta_raw = COALESCE($9, resposta_raw),
       enviado_em = COALESCE($10, enviado_em),
       processado_em = COALESCE($11, processado_em),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      id,
      fields.status ?? null,
      fields.protocolo ?? null,
      fields.loteId ?? null,
      fields.codigoResposta ?? null,
      fields.mensagem ?? null,
      fields.erros ? JSON.stringify(fields.erros) : null,
      fields.xmlLote ?? null,
      fields.respostaRaw ?? null,
      fields.enviadoEm ?? null,
      fields.processadoEm ?? null,
    ],
  );
  return rows[0];
}

async function syncEventFromTransmission(tenantId, eventDbId, transmission, eventStatus) {
  await query(
    `UPDATE esocial_eventos SET
       status = $3,
       status_processamento = $4,
       govbr_protocolo = COALESCE($5, govbr_protocolo),
       govbr_lote_id = COALESCE($6, govbr_lote_id),
       govbr_mensagem = COALESCE($7, govbr_mensagem),
       enviado_em = COALESCE($8, enviado_em),
       ultima_transmissao_id = $9,
       tentativas_envio = tentativas_envio + 1,
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [
      eventDbId,
      tenantId,
      eventStatus,
      transmission.status,
      transmission.protocolo,
      transmission.lote_id,
      transmission.mensagem,
      transmission.enviado_em ?? (transmission.status !== TRANSMISSION_STATUS.PENDENTE ? new Date() : null),
      transmission.id,
    ],
  );
}

export async function listTransmissions(tenantId, eventDbId) {
  const { rows } = await query(
    `SELECT * FROM esocial_transmissoes WHERE tenant_id = $1 AND evento_id = $2 ORDER BY created_at DESC`,
    [tenantId, eventDbId],
  );
  return rows.map(mapTransmissao);
}

export async function transmitEvent(tenantId, eventDbId, user, { resend = false } = {}) {
  const config = await getConfig(tenantId);
  const mode = config?.govbr_modo ?? 'MOCK';
  if (!config?.govbr_habilitado && mode !== 'MOCK') {
    throw new Error('Integração gov.br não habilitada');
  }

  const event = await getEvent(tenantId, eventDbId);
  if (!event) return null;

  const allowedStatuses = resend
    ? ['REJEITADO', 'ASSINADO', 'PRONTO_ENVIO', 'ENVIADO']
    : ['ASSINADO', 'PRONTO_ENVIO'];

  if (!allowedStatuses.includes(event.status) && !(resend && event.status === 'REJEITADO')) {
    throw new Error(`Status ${event.status} não permite ${resend ? 'reenvio' : 'envio'}`);
  }

  const xml = event.xml_assinado ?? event.xml_gerado;
  if (!xml) throw new Error('XML assinado ausente');

  const xsd = validateEsocialXsdS13(xml, event.tipo_evento);
  if (!xsd.valid) {
    throw new Error(`Validação XSD S-1.3 falhou: ${xsd.errors[0]?.message ?? 'erro estrutural'}`);
  }

  const adapter = createGovbrAdapter(config);
  const endpoint = config.ambiente === 1 ? config.govbr_endpoint_prod : config.govbr_endpoint_restrito;
  const tentativa = (event.tentativas_envio ?? 0) + 1;
  const loteId = `LOTE-${tenantId}-${eventDbId}-${Date.now()}`;

  let tx = await createTransmission(tenantId, eventDbId, tentativa, endpoint);
  tx = await updateTransmission(tx.id, { status: TRANSMISSION_STATUS.ENVIANDO, loteId, xmlLote: xml });

  await logEsocialHistory({
    tenantId,
    eventDbId,
    action: resend ? 'REENVIO_INICIADO' : 'TRANSMISSAO_INICIADA',
    user,
    details: { tentativa, loteId, endpoint },
  });

  let sendResult;
  try {
    sendResult = await adapter.sendLote({
      loteId,
      xml,
      eventType: event.tipo_evento,
      tenantId,
    });
  } catch (err) {
    tx = await updateTransmission(tx.id, {
      status: TRANSMISSION_STATUS.ERRO,
      mensagem: err.message,
      erros: [{ codigo: 'EXC', descricao: err.message }],
      enviadoEm: new Date(),
    });
    await syncEventFromTransmission(tenantId, eventDbId, tx, 'REJEITADO');
    await logEsocialHistory({ tenantId, eventDbId, action: 'TRANSMISSAO_ERRO', user, details: { error: err.message } });
    throw err;
  }

  tx = await updateTransmission(tx.id, {
    status: sendResult.status,
    protocolo: sendResult.protocolo,
    loteId: sendResult.loteId ?? loteId,
    codigoResposta: sendResult.codigoResposta,
    mensagem: sendResult.mensagem,
    erros: sendResult.erros ?? [],
    respostaRaw: sendResult.respostaRaw,
    enviadoEm: new Date(),
  });

  let finalStatus = sendResult.status;
  let finalMessage = sendResult.mensagem;
  let finalErrors = sendResult.erros ?? [];

  if ([TRANSMISSION_STATUS.PROCESSANDO, TRANSMISSION_STATUS.ENVIADO].includes(sendResult.status) && sendResult.protocolo) {
    const consult = await adapter.consultStatus({ protocolo: sendResult.protocolo, loteId });
    finalStatus = consult.status;
    finalMessage = consult.mensagem ?? finalMessage;
    finalErrors = consult.erros ?? finalErrors;
    tx = await updateTransmission(tx.id, {
      status: finalStatus,
      mensagem: finalMessage,
      erros: finalErrors,
      processadoEm: consult.processadoEm ? new Date(consult.processadoEm) : new Date(),
    });
  }

  const eventStatus = EVENT_STATUS_FROM_TRANSMISSION[finalStatus] ?? 'ENVIADO';
  await syncEventFromTransmission(tenantId, eventDbId, tx, eventStatus);

  await logEsocialHistory({
    tenantId,
    eventDbId,
    action: finalStatus === TRANSMISSION_STATUS.ACEITO ? 'TRANSMISSAO_ACEITA' : 'TRANSMISSAO_FINALIZADA',
    user,
    details: { protocolo: tx.protocolo, status: finalStatus, erros: finalErrors },
  });

  return { transmission: mapTransmissao(tx), eventStatus, protocol: tx.protocolo, errors: finalErrors };
}

export async function resendEvent(tenantId, eventDbId, user) {
  const event = await getEvent(tenantId, eventDbId);
  if (!event) return null;
  if (!['REJEITADO', 'ENVIADO'].includes(event.status) && (event.tentativas_envio ?? 0) < 1) {
    throw new Error('Somente eventos rejeitados ou já transmitidos podem ser reenviados');
  }
  await query(
    `UPDATE esocial_eventos SET status = 'ASSINADO', status_processamento = 'NAO_ENVIADO', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [eventDbId, tenantId],
  );
  return transmitEvent(tenantId, eventDbId, user, { resend: true });
}

export async function consultProcessingStatus(tenantId, eventDbId, user) {
  const event = await getEvent(tenantId, eventDbId);
  if (!event) return null;
  if (!event.govbr_protocolo) throw new Error('Evento sem protocolo gov.br');

  const config = await getConfig(tenantId);
  const adapter = createGovbrAdapter(config);
  const consult = await adapter.consultStatus({
    protocolo: event.govbr_protocolo,
    loteId: event.govbr_lote_id,
  });

  const { rows: txRows } = await query(
    `SELECT * FROM esocial_transmissoes WHERE evento_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [eventDbId, tenantId],
  );
  if (txRows.length) {
    await updateTransmission(txRows[0].id, {
      status: consult.status,
      mensagem: consult.mensagem,
      erros: consult.erros ?? [],
      processadoEm: consult.processadoEm ? new Date(consult.processadoEm) : new Date(),
    });
  }

  const eventStatus = EVENT_STATUS_FROM_TRANSMISSION[consult.status] ?? event.status;
  await query(
    `UPDATE esocial_eventos SET status = $3, status_processamento = $4, govbr_mensagem = $5, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [eventDbId, tenantId, eventStatus, consult.status, consult.mensagem],
  );

  await logEsocialHistory({
    tenantId,
    eventDbId,
    action: 'CONSULTA_STATUS_GOVBR',
    user,
    details: { protocolo: event.govbr_protocolo, status: consult.status },
  });

  return { status: consult.status, message: consult.mensagem, errors: consult.erros ?? [], eventStatus };
}
