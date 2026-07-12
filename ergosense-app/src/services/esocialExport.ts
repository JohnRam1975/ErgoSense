/**
 * eSocial — exportação XML (client-side download + stub offline V2)
 */
export type EsocialEventType = 'S-2210' | 'S-2220' | 'S-2240';

export interface EsocialExportPayload {
  eventType: EsocialEventType;
  tenantId: string;
  analysisId: string;
  generatedAt: string;
  xml: string;
  summary: Record<string, string>;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Stub offline — preferir API /api/esocial/eventos para XML layout S-1.3 completo */
export function buildEsocialXmlStub(
  eventType: EsocialEventType,
  data: { tenantId: string; analysisId: string; cpf?: string; matricula?: string; setor?: string; agente?: string },
): string {
  const ns = eventType === 'S-2210'
    ? 'http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_03_00'
    : eventType === 'S-2220'
      ? 'http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00'
      : 'http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00';
  const root = eventType === 'S-2210' ? 'evtCAT' : eventType === 'S-2220' ? 'evtMonit' : 'evtExpRisco';
  const body = eventType === 'S-2240'
    ? `<infoExpRisco><infoAmb><dscSetor>${escapeXml(data.setor ?? '')}</dscSetor></infoAmb><agNoc><dscAgNoc>${escapeXml(data.agente ?? 'Postura inadequada')}</dscAgNoc></agNoc></infoExpRisco>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?><eSocial xmlns="${ns}"><${root} Id="ID${data.analysisId.slice(0, 32).padEnd(32, '0')}"><ideEvento><tpAmb>2</tpAmb></ideEvento><ideVinculo><matricula>${escapeXml(data.matricula ?? '')}</matricula></ideVinculo>${body}</${root}></eSocial>`;
}

export function createEsocialExport(
  eventType: EsocialEventType,
  data: Parameters<typeof buildEsocialXmlStub>[1],
): EsocialExportPayload {
  return {
    eventType,
    tenantId: data.tenantId,
    analysisId: data.analysisId,
    generatedAt: new Date().toISOString(),
    xml: buildEsocialXmlStub(eventType, data),
    summary: { evento: eventType, analise: data.analysisId },
  };
}

export function downloadEsocialXmlFromString(xml: string, eventType: string, eventId: string): void {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${eventType}_${eventId}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadEsocialXml(payload: EsocialExportPayload): void {
  downloadEsocialXmlFromString(payload.xml, payload.eventType, payload.analysisId);
}
