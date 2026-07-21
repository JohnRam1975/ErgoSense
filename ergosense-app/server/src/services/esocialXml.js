import crypto from 'crypto';

const SCHEMA = {
  'S-2210': { ns: 'http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_03_00', root: 'evtCAT' },
  'S-2220': { ns: 'http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00', root: 'evtMonit' },
  'S-2240': { ns: 'http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00', root: 'evtExpRisco' },
};

export function escapeXml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/** Gera Id do evento conforme padrão eSocial (36 posições após "ID") */
export function generateEventId(tpInsc, nrInsc, seq = 1) {
  const base = `${tpInsc}${onlyDigits(nrInsc).padStart(14, '0').slice(0, 14)}`;
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const suffix = String(seq).padStart(5, '0');
  const raw = `ID${base}${ts}${suffix}`;
  return raw.slice(0, 36).padEnd(36, '0');
}

export function hashXml(xml) {
  return crypto.createHash('sha256').update(xml, 'utf8').digest('hex');
}

function ideEvento(config, indRetif = 1, nrRecibo = null) {
  let xml = `<ideEvento><indRetif>${indRetif}</indRetif>`;
  if (indRetif === 2 && nrRecibo) xml += `<nrRecibo>${escapeXml(nrRecibo)}</nrRecibo>`;
  xml += `<tpAmb>${config.ambiente ?? 2}</tpAmb>`;
  xml += `<procEmi>${config.proc_emi ?? 1}</procEmi>`;
  xml += `<verProc>${escapeXml(config.ver_proc ?? 'ErgoSense 1.0')}</verProc>`;
  xml += `</ideEvento>`;
  return xml;
}

function ideEmpregador(config) {
  const nr = onlyDigits(config.nr_insc).slice(0, config.tp_insc === 1 ? 8 : 14);
  return `<ideEmpregador><tpInsc>${config.tp_insc ?? 1}</tpInsc><nrInsc>${escapeXml(nr)}</nrInsc></ideEmpregador>`;
}

function ideVinculo(data) {
  let xml = '<ideVinculo>';
  if (data.cpfTrab) xml += `<cpfTrab>${escapeXml(onlyDigits(data.cpfTrab))}</cpfTrab>`;
  if (data.matricula) xml += `<matricula>${escapeXml(data.matricula)}</matricula>`;
  if (data.codCateg) xml += `<codCateg>${escapeXml(data.codCateg)}</codCateg>`;
  xml += '</ideVinculo>';
  return xml;
}

function buildS2210Body(data) {
  const cat = data.cat ?? {};
  return `<cat>
    <dtAcid>${escapeXml(cat.dtAcid ?? data.dtAcid)}</dtAcid>
    <tpAcid>${escapeXml(cat.tpAcid ?? '1')}</tpAcid>
    <hrAcid>${escapeXml(cat.hrAcid ?? '0800')}</hrAcid>
    <hrsTrabAntesAcid>${escapeXml(cat.hrsTrabAntesAcid ?? '0400')}</hrsTrabAntesAcid>
    <tpCat>${escapeXml(cat.tpCat ?? '1')}</tpCat>
    <indCatObito>${escapeXml(cat.indCatObito ?? 'N')}</indCatObito>
    <dtObito>${escapeXml(cat.dtObito ?? '')}</dtObito>
    <indComunPolicia>${escapeXml(cat.indComunPolicia ?? 'N')}</indComunPolicia>
    <codSitGeradora>${escapeXml(cat.codSitGeradora ?? '200004300')}</codSitGeradora>
    <iniciatCAT>${escapeXml(cat.iniciatCAT ?? '1')}</iniciatCAT>
    <localAcidente>
      <tpLocal>${escapeXml(cat.tpLocal ?? '1')}</tpLocal>
      <dscLocal>${escapeXml(cat.dscLocal ?? data.local ?? 'Local do trabalho')}</dscLocal>
      <tpLograd>${escapeXml(cat.tpLograd ?? 'R')}</tpLograd>
      <dscLograd>${escapeXml(cat.dscLograd ?? 'Endereço não informado')}</dscLograd>
      <nrLograd>${escapeXml(cat.nrLograd ?? 'S/N')}</nrLograd>
      <codMunic>${escapeXml(cat.codMunic ?? '3550308')}</codMunic>
      <uf>${escapeXml(cat.uf ?? 'SP')}</uf>
    </localAcidente>
    <parteAtingida>
      <codParteAting>${escapeXml(cat.codParteAting ?? '753030000')}</codParteAting>
      <lateralidade>${escapeXml(cat.lateralidade ?? '0')}</lateralidade>
    </parteAtingida>
    <agenteCausador>
      <codAgntCausador>${escapeXml(cat.codAgntCausador ?? '302010200')}</codAgntCausador>
    </agenteCausador>
    <atestado>
      <dtAtendimento>${escapeXml(cat.dtAtendimento ?? cat.dtAcid ?? data.dtAcid)}</dtAtendimento>
      <hrAtendimento>${escapeXml(cat.hrAtendimento ?? '0900')}</hrAtendimento>
      <indInternacao>${escapeXml(cat.indInternacao ?? 'N')}</indInternacao>
      <durTrat>${escapeXml(cat.durTrat ?? '0')}</durTrat>
      <indAfast>${escapeXml(cat.indAfast ?? 'N')}</indAfast>
      <dscLesao>${escapeXml(cat.dscLesao ?? data.descricao ?? 'Lesão não especificada')}</dscLesao>
      <dscCompLesao>${escapeXml(cat.dscCompLesao ?? '')}</dscCompLesao>
      <diagProvavel>${escapeXml(cat.diagProvavel ?? '')}</diagProvavel>
      <codCID>${escapeXml(cat.codCID ?? 'S699')}</codCID>
      <observacao>${escapeXml(cat.observacao ?? data.observacao ?? '')}</observacao>
      <nmEmit>${escapeXml(cat.nmEmit ?? data.medicoNome ?? 'Médico responsável')}</nmEmit>
      <ideOC>${escapeXml(cat.ideOC ?? '1')}</ideOC>
      <nrOC>${escapeXml(cat.nrOC ?? data.medicoCrm ?? '000000')}</nrOC>
      <ufOC>${escapeXml(cat.ufOC ?? 'SP')}</ufOC>
    </atestado>
  </cat>`;
}

function buildS2220Body(data) {
  const mon = data.monit ?? {};
  const exames = mon.exames ?? data.exames ?? [{ dtExm: data.dtExm, procRealizado: data.procRealizado ?? '0295' }];
  let examesXml = '';
  for (const ex of exames) {
    examesXml += `<exame>
      <dtExm>${escapeXml(ex.dtExm ?? new Date().toISOString().slice(0, 10))}</dtExm>
      <procRealizado>${escapeXml(ex.procRealizado ?? '0295')}</procRealizado>
      <obsProc>${escapeXml(ex.obsProc ?? '')}</obsProc>
      <ordExame>${escapeXml(ex.ordExame ?? '1')}</ordExame>
      <indResult>${escapeXml(ex.indResult ?? '1')}</indResult>
    </exame>`;
  }
  return `<exMedOcup>
    <tpExameOcup>${escapeXml(mon.tpExameOcup ?? data.tpExameOcup ?? '1')}</tpExameOcup>
    ${examesXml}
    <medico>
      <nmMed>${escapeXml(mon.nmMed ?? data.medicoNome ?? 'Médico coordenador')}</nmMed>
      <nrCRM>${escapeXml(mon.nrCRM ?? data.medicoCrm ?? '000000')}</nrCRM>
      <ufCRM>${escapeXml(mon.ufCRM ?? 'SP')}</ufCRM>
    </medico>
  </exMedOcup>`;
}

function buildS2240Body(data) {
  const exp = data.expRisco ?? data;
  const agentes = exp.agentes ?? data.agentes ?? [{
    codAgNoc: data.codAgNoc ?? '302010200',
    dscAgNoc: data.dscAgNoc ?? data.agente ?? 'Postura inadequada ou posição forçada',
    tpAval: data.tpAval ?? '1',
    intConc: data.intConc ?? '3',
    unMed: data.unMed ?? 'NA',
    tecMedicao: data.tecMedicao ?? 'ErgoSense — avaliação ergonômica',
  }];
  let agXml = '';
  for (const ag of agentes) {
    agXml += `<agNoc>
      <codAgNoc>${escapeXml(ag.codAgNoc ?? '302010200')}</codAgNoc>
      <dscAgNoc>${escapeXml(ag.dscAgNoc ?? '')}</dscAgNoc>
      <tpAval>${escapeXml(ag.tpAval ?? '1')}</tpAval>
      <intConc>${escapeXml(ag.intConc ?? '3')}</intConc>
      <limTol>${escapeXml(ag.limTol ?? 'NA')}</limTol>
      <unMed>${escapeXml(ag.unMed ?? 'NA')}</unMed>
      <tecMedicao>${escapeXml(ag.tecMedicao ?? 'ErgoSense')}</tecMedicao>
      <epcEpi>
        <utilizEPC>${escapeXml(ag.utilizEPC ?? '0')}</utilizEPC>
        <utilizEPI>${escapeXml(ag.utilizEPI ?? '0')}</utilizEPI>
      </epcEpi>
    </agNoc>`;
  }
  return `<infoExpRisco>
    <dtIniCondicao>${escapeXml(exp.dtIniCondicao ?? data.dtIniCondicao ?? new Date().toISOString().slice(0, 10))}</dtIniCondicao>
    <infoAmb>
      <localAmb>${escapeXml(exp.localAmb ?? '1')}</localAmb>
      <dscSetor>${escapeXml(exp.dscSetor ?? data.setor ?? 'Setor não informado')}</dscSetor>
    </infoAmb>
    <infoAtiv>
      <dscAtiv>${escapeXml(exp.dscAtiv ?? data.atividade ?? 'Atividade habitual')}</dscAtiv>
    </infoAtiv>
    ${agXml}
    <obs>${escapeXml(exp.obs ?? data.observacao ?? '')}</obs>
  </infoExpRisco>`;
}

export function buildEsocialXml(tipoEvento, config, eventId, payload) {
  const schema = SCHEMA[tipoEvento];
  if (!schema) throw new Error(`Tipo de evento inválido: ${tipoEvento}`);

  const bodyFn = {
    'S-2210': buildS2210Body,
    'S-2220': buildS2220Body,
    'S-2240': buildS2240Body,
  }[tipoEvento];

  const inner = `${ideEvento(config, payload.indRetif, payload.nrRecibo)}${ideEmpregador(config)}${ideVinculo(payload)}${bodyFn(payload)}`;
  const rootOpen = `<${schema.root} Id="${escapeXml(eventId)}">`;
  const rootClose = `</${schema.root}>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="${schema.ns}">
  ${rootOpen}${inner}${rootClose}
</eSocial>`;
}

/** Bloco de assinatura preparado para certificado ICP-Brasil (gov.br) */
export function appendSignaturePlaceholder(xml, assinatura) {
  const sigBlock = `
<!-- Assinatura digital ErgoSense — pronta para XML-DSig gov.br -->
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
    <Reference URI="">
      <Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
      <DigestValue>${escapeXml(assinatura.digestValue ?? '')}</DigestValue>
    </Reference>
  </SignedInfo>
  <SignatureValue>${escapeXml(assinatura.signatureValue ?? 'PENDENTE_CERTIFICADO_ICP_BRASIL')}</SignatureValue>
  <KeyInfo>
    <X509Data>
      <X509Certificate>${escapeXml(assinatura.certificado ?? 'PENDENTE')}</X509Certificate>
    </X509Data>
  </KeyInfo>
  <Object>
    <Assinante nome="${escapeXml(assinatura.nome)}" documento="${escapeXml(assinatura.documento ?? '')}" registro="${escapeXml(assinatura.registro ?? '')}" data="${escapeXml(assinatura.data ?? new Date().toISOString())}"/>
  </Object>
</Signature>`;
  return xml.replace('</eSocial>', `${sigBlock}\n</eSocial>`);
}

export { SCHEMA };
