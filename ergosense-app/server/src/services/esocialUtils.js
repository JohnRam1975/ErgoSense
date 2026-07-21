import { query } from '../db.js';
import { buildEsocialXml, generateEventId, hashXml } from './esocialXml.js';
import { validateEsocialPayload } from './esocialValidator.js';
import { validateEsocialXsdS13 } from './esocialXsdValidator.js';
import { createIcpSigner, stripExistingSignatures } from './esocialIcpSigner.js';

export async function getEsocialConfig(tenantId) {
  const { rows } = await query(`SELECT * FROM esocial_config WHERE tenant_id = $1`, [tenantId]);
  return rows[0] ?? null;
}

export async function ensureEsocialConfig(tenantId, defaults = {}) {
  let cfg = await getEsocialConfig(tenantId);
  if (cfg) return cfg;
  const nrInsc = defaults.nrInsc ?? '00000000000000';
  const { rows } = await query(
    `INSERT INTO esocial_config (tenant_id, nr_insc, razao_social, ambiente)
     VALUES ($1, $2, $3, 2) RETURNING *`,
    [tenantId, nrInsc, defaults.razaoSocial ?? 'Empregador'],
  );
  return rows[0];
}

export function mapConfig(row) {
  if (!row) return null;
  return {
    tpInsc: row.tp_insc,
    nrInsc: row.nr_insc,
    razaoSocial: row.razao_social,
    ambiente: row.ambiente,
    procEmi: row.proc_emi,
    verProc: row.ver_proc,
    certificadoSerial: row.certificado_serial,
    certificadoValidade: row.certificado_validade,
    govbrHabilitado: row.govbr_habilitado,
    govbrModo: row.govbr_modo ?? 'MOCK',
    certificadoPfxPath: row.certificado_pfx_path,
    certificadoSenhaEnv: row.certificado_senha_env,
    govbrEndpointProd: row.govbr_endpoint_prod,
    govbrEndpointRestrito: row.govbr_endpoint_restrito,
  };
}

export function mapEvento(row, colaborador = null) {
  return {
    id: String(row.id),
    eventType: row.tipo_evento,
    eventId: row.evento_id,
    collaboratorId: row.colaborador_id ? String(row.colaborador_id) : null,
    collaboratorName: colaborador?.nome ?? null,
    analysisId: row.analise_id ? String(row.analise_id) : null,
    riskId: row.inventario_risco_id ? String(row.inventario_risco_id) : null,
    payload: row.dados_json ?? {},
    status: row.status,
    validationOk: row.validacao_ok,
    validationErrors: row.validacao_erros ?? [],
    hashDocument: row.hash_documento,
    govbrProtocol: row.govbr_protocolo,
    govbrMessage: row.govbr_mensagem,
    govbrLoteId: row.govbr_lote_id,
    processingStatus: row.status_processamento ?? 'NAO_ENVIADO',
    transmissionAttempts: row.tentativas_envio ?? 0,
    lastTransmissionId: row.ultima_transmissao_id ? String(row.ultima_transmissao_id) : null,
    sentAt: row.enviado_em,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasXml: !!row.xml_gerado,
    hasSignedXml: !!row.xml_assinado,
  };
}

export function mapAssinatura(row) {
  return {
    id: String(row.id),
    eventDbId: String(row.evento_id),
    type: row.tipo,
    name: row.nome,
    document: row.documento,
    registry: row.registro_profissional,
    hashDocument: row.hash_documento,
    certificateSerial: row.certificado_serial,
    signedAt: row.assinado_em,
  };
}

export function mapHistorico(row) {
  return {
    id: String(row.id),
    eventDbId: row.evento_id ? String(row.evento_id) : null,
    action: row.acao,
    userName: row.usuario_nome,
    details: row.detalhes,
    createdAt: row.created_at,
  };
}

export async function logEsocialHistory({ tenantId, eventDbId, action, user, details }) {
  await query(
    `INSERT INTO esocial_historico (tenant_id, evento_id, acao, usuario_id, usuario_nome, detalhes)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, eventDbId ?? null, action, user?.id ?? null, user?.name ?? user?.email ?? '', details ? JSON.stringify(details) : null],
  );
}

export async function buildEsocialDashboard(tenantId) {
  const { rows } = await query(
    `SELECT tipo_evento, status, COUNT(*)::int AS c
     FROM esocial_eventos WHERE tenant_id = $1 AND deleted_at IS NULL
     GROUP BY tipo_evento, status`,
    [tenantId],
  );
  const dash = {
    total: 0,
    rascunho: 0,
    validado: 0,
    assinado: 0,
    prontoEnvio: 0,
    enviado: 0,
    aceito: 0,
    rejeitado: 0,
    s2210: 0,
    s2220: 0,
    s2240: 0,
  };
  for (const r of rows) {
    dash.total += r.c;
    dash[r.tipo_evento.toLowerCase().replace('-', '')] = (dash[r.tipo_evento.toLowerCase().replace('-', '')] ?? 0) + r.c;
    const st = r.status.toLowerCase();
    if (st === 'rascunho') dash.rascunho += r.c;
    else if (st === 'validado') dash.validado += r.c;
    else if (st === 'assinado') dash.assinado += r.c;
    else if (st === 'pronto_envio') dash.prontoEnvio += r.c;
    else if (st === 'enviado') dash.enviado += r.c;
    else if (st === 'aceito') dash.aceito += r.c;
    else if (st === 'rejeitado') dash.rejeitado += r.c;
  }
  const cfg = await getEsocialConfig(tenantId);
  dash.govbrHabilitado = cfg?.govbr_habilitado ?? false;
  dash.configOk = !!(cfg?.nr_insc && cfg.nr_insc !== '00000000000000');
  return dash;
}

export async function generateEventXml(tenantId, tipoEvento, payload, seq = 1) {
  const config = await ensureEsocialConfig(tenantId);
  const eventId = generateEventId(config.tp_insc, config.nr_insc, seq);
  const xml = buildEsocialXml(tipoEvento, config, eventId, payload);
  return { config, eventId, xml, hash: hashXml(xml) };
}

export async function validateAndPersistEvent(tenantId, eventDbId, user) {
  const { rows } = await query(
    `SELECT e.*, c.nome AS colaborador_nome FROM esocial_eventos e
     LEFT JOIN colaboradores c ON c.id = e.colaborador_id
     WHERE e.id = $1 AND e.tenant_id = $2 AND e.deleted_at IS NULL`,
    [eventDbId, tenantId],
  );
  if (!rows.length) return null;
  const row = rows[0];
  const config = await ensureEsocialConfig(tenantId);
  const payloadVal = validateEsocialPayload(row.tipo_evento, config, row.dados_json ?? {});
  let xml = row.xml_gerado;
  if (!xml) {
    const gen = await generateEventXml(tenantId, row.tipo_evento, row.dados_json ?? {}, row.id);
    xml = gen.xml;
    await query(
      `UPDATE esocial_eventos SET evento_id=$3, xml_gerado=$4, hash_documento=$5, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
      [eventDbId, tenantId, gen.eventId, xml, gen.hash],
    );
  }
  const xmlVal = validateEsocialXsdS13(xml, row.tipo_evento);
  const errors = [...payloadVal.errors, ...xmlVal.errors];
  const warnings = [...payloadVal.warnings, ...xmlVal.warnings];
  const valid = errors.length === 0;

  await query(
    `INSERT INTO esocial_validacoes (tenant_id, evento_id, valido, erros_json, avisos_json, validado_por)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [tenantId, eventDbId, valid, JSON.stringify(errors), JSON.stringify(warnings), user?.name ?? ''],
  );
  await query(
    `UPDATE esocial_eventos SET validacao_ok=$3, validacao_erros=$4, status=$5, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
    [eventDbId, tenantId, valid, JSON.stringify(errors), valid ? 'VALIDADO' : 'RASCUNHO'],
  );
  await logEsocialHistory({ tenantId, eventDbId, action: valid ? 'EVENTO_VALIDADO' : 'VALIDACAO_FALHOU', user, details: { errors, warnings, schema: 'S-1.3' } });
  return { valid, errors, warnings, xml, schemaVersion: 'S-1.3' };
}

export async function signEvent(tenantId, eventDbId, assinatura, user, ip) {
  const { rows } = await query(`SELECT * FROM esocial_eventos WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL`, [eventDbId, tenantId]);
  if (!rows.length) return null;
  const row = rows[0];
  if (!row.validacao_ok) throw new Error('Valide o evento antes de assinar');
  let xml = row.xml_gerado;
  if (!xml) throw new Error('XML não gerado');

  const config = await ensureEsocialConfig(tenantId);
  xml = stripExistingSignatures(xml, row.tipo_evento);

  const signer = createIcpSigner(config);
  const { signedXml, certificateSerial, signatureMode } = await signer.sign(xml, row.tipo_evento);
  const signedHash = hashXml(signedXml);

  const xsdAfterSign = validateEsocialXsdS13(signedXml, row.tipo_evento);
  if (!xsdAfterSign.valid) {
    throw new Error(`XML assinado inválido (XSD S-1.3): ${xsdAfterSign.errors[0]?.message}`);
  }

  await query(
    `INSERT INTO esocial_assinaturas (tenant_id, evento_id, tipo, nome, documento, registro_profissional, hash_documento, certificado_serial, usuario_id, ip_assinatura)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [tenantId, eventDbId, assinatura.type ?? 'EMITENTE', assinatura.name, assinatura.document ?? null,
      assinatura.registry ?? null, signedHash, certificateSerial ?? assinatura.certificateSerial ?? null,
      user?.id ?? null, ip ?? null],
  );
  await query(
    `UPDATE esocial_eventos SET xml_assinado=$3, hash_documento=$4, status='ASSINADO', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
    [eventDbId, tenantId, signedXml, signedHash],
  );
  await logEsocialHistory({
    tenantId,
    eventDbId,
    action: 'EVENTO_ASSINADO_ICP',
    user,
    details: { tipo: assinatura.type, nome: assinatura.name, signatureMode, certificateSerial },
  });
  return { hash: signedHash, signedXml, signatureMode, certificateSerial };
}

/** Prepara lote para envio gov.br (stub — integração futura) */
export async function prepareGovbrSend(tenantId, eventDbId, user) {
  const config = await getEsocialConfig(tenantId);
  if (!config?.govbr_habilitado) throw new Error('Integração gov.br não habilitada — configure em eSocial > Configuração');
  const { rows } = await query(`SELECT * FROM esocial_eventos WHERE id=$1 AND tenant_id=$2`, [eventDbId, tenantId]);
  if (!rows.length) return null;
  const row = rows[0];
  if (row.status !== 'ASSINADO' && row.status !== 'PRONTO_ENVIO') throw new Error('Evento deve estar assinado');
  const endpoint = config.ambiente === 1 ? config.govbr_endpoint_prod : config.govbr_endpoint_restrito;
  const loteId = `LOTE-${tenantId}-${Date.now()}`;
  await query(
    `UPDATE esocial_eventos SET status='PRONTO_ENVIO', govbr_lote_id=$3, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
    [eventDbId, tenantId, loteId],
  );
  await logEsocialHistory({ tenantId, eventDbId, action: 'LOTE_PREPARADO_GOVBR', user, details: { endpoint, loteId } });
  return { loteId, endpoint, xml: row.xml_assinado ?? row.xml_gerado, status: 'PRONTO_ENVIO' };
}

export async function buildPayloadFromAnalysis(tenantId, analysisId, tipoEvento) {
  const { rows } = await query(
    `SELECT a.*, c.nome AS colaborador_nome, c.matricula, s.nome AS setor_nome
     FROM analises a
     JOIN colaboradores c ON c.id = a.colaborador_id
     LEFT JOIN setores s ON s.id = a.setor_id
     WHERE a.id = $1 AND a.tenant_id = $2`,
    [analysisId, tenantId],
  );
  if (!rows.length) return null;
  const a = rows[0];
  const base = {
    cpfTrab: '',
    matricula: a.matricula,
    setor: a.setor_nome,
    atividade: a.atividade,
    observacao: a.observacoes,
  };
  if (tipoEvento === 'S-2240') {
    return {
      ...base,
      agentes: [{
        codAgNoc: '302010200',
        dscAgNoc: 'Postura inadequada ou posição forçada — avaliação ErgoSense',
        tpAval: '1',
        intConc: '3',
        tecMedicao: `Análise ergonômica #${analysisId}`,
      }],
      expRisco: { dscSetor: a.setor_nome, dscAtiv: a.atividade },
    };
  }
  if (tipoEvento === 'S-2220') {
    return {
      ...base,
      tpExameOcup: '1',
      exames: [{ dtExm: a.data_analise, procRealizado: '0295', indResult: '1' }],
    };
  }
  return {
    ...base,
    dtAcid: a.data_analise,
    descricao: a.observacoes ?? 'Acidente registrado via ErgoSense',
    cat: { dtAcid: a.data_analise, dscLocal: a.setor_nome },
  };
}
