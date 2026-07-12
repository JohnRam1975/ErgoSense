/**
 * Adaptador gov.br — port desacoplado para transmissão eSocial
 * MOCK: homologação interna | HTTP: SOAP real (stub preparado)
 */
import { TRANSMISSION_STATUS } from './esocialConstants.js';

export class MockGovbrAdapter {
  constructor(config = {}) {
    this.config = config;
    this.endpoint = config.ambiente === 1
      ? config.govbr_endpoint_prod
      : config.govbr_endpoint_restrito;
  }

  async sendLote({ loteId, xml, eventType, tenantId }) {
    await delay(50);
    if (xml?.includes('ESOCIAL_FORCE_REJECT')) {
      return {
        status: TRANSMISSION_STATUS.REJEITADO,
        protocolo: null,
        loteId,
        codigoResposta: 'ERRO_VALIDACAO',
        mensagem: 'Rejeição simulada — evento contém marcador ESOCIAL_FORCE_REJECT',
        erros: [{ codigo: '999', descricao: 'Validação gov.br simulada — rejeição forçada' }],
        respostaRaw: JSON.stringify({ mock: true, rejected: true }),
      };
    }

    const protocolo = `MOCK-${tenantId}-${Date.now()}`;
    return {
      status: TRANSMISSION_STATUS.PROCESSANDO,
      protocolo,
      loteId,
      codigoResposta: '201',
      mensagem: 'Lote recebido — aguardando processamento (mock gov.br)',
      erros: [],
      respostaRaw: JSON.stringify({ mock: true, protocolo, loteId, eventType }),
    };
  }

  async consultStatus({ protocolo, loteId }) {
    await delay(30);
    if (!protocolo) {
      return {
        status: TRANSMISSION_STATUS.ERRO,
        mensagem: 'Protocolo ausente',
        erros: [{ codigo: '404', descricao: 'Protocolo não encontrado' }],
      };
    }
    if (protocolo.includes('REJECT') || loteId?.includes('REJECT')) {
      return {
        status: TRANSMISSION_STATUS.REJEITADO,
        protocolo,
        mensagem: 'Evento rejeitado pelo gov.br (mock)',
        erros: [{ codigo: '301', descricao: 'Rejeição de processamento simulada' }],
        processadoEm: new Date().toISOString(),
      };
    }
    return {
      status: TRANSMISSION_STATUS.ACEITO,
      protocolo,
      mensagem: 'Evento aceito pelo gov.br (mock S-1.3)',
      erros: [],
      processadoEm: new Date().toISOString(),
    };
  }
}

/** Stub SOAP — integração real gov.br (WsEnviarLoteEventos / ConsultarLoteEventos) */
export class HttpGovbrAdapter {
  constructor(config = {}) {
    this.config = config;
    this.endpoint = config.ambiente === 1
      ? config.govbr_endpoint_prod
      : config.govbr_endpoint_restrito;
  }

  buildSoapEnvelope(loteId, xmlBase64) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <EnviarLoteEventos xmlns="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0">
      <eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
        <envioLoteEventos grupo="1">
          <ideEmpregador><tpInsc>${this.config.tp_insc}</tpInsc><nrInsc>${this.config.nr_insc}</nrInsc></ideEmpregador>
          <ideTransmissor><tpInsc>1</tpInsc><nrInsc>${this.config.nr_insc}</nrInsc></ideTransmissor>
          <eventos><evento Id="${loteId}">${xmlBase64}</evento></eventos>
        </envioLoteEventos>
      </eSocial>
    </EnviarLoteEventos>
  </soap:Body>
</soap:Envelope>`;
  }

  async sendLote({ loteId, xml }) {
    if (!this.config?.govbr_habilitado) {
      throw new Error('Integração HTTP gov.br não habilitada');
    }
    const envelope = this.buildSoapEnvelope(loteId, Buffer.from(xml, 'utf8').toString('base64'));
    return {
      status: TRANSMISSION_STATUS.ERRO,
      protocolo: null,
      loteId,
      codigoResposta: 'NOT_IMPLEMENTED',
      mensagem: 'Adaptador HTTP SOAP preparado — configure credenciais e certificado mTLS gov.br',
      erros: [{ codigo: '501', descricao: 'Implementação SOAP pendente de credenciais gov.br' }],
      respostaRaw: envelope.slice(0, 500),
      pendingHttpIntegration: true,
    };
  }

  async consultStatus() {
    return {
      status: TRANSMISSION_STATUS.ERRO,
      mensagem: 'Consulta SOAP gov.br não implementada — use modo MOCK em homologação',
      erros: [{ codigo: '501', descricao: 'ConsultarLoteEventos pendente' }],
    };
  }
}

export function createGovbrAdapter(config) {
  const mode = config?.govbr_modo ?? 'MOCK';
  if (mode === 'HTTP') return new HttpGovbrAdapter(config);
  return new MockGovbrAdapter(config);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
