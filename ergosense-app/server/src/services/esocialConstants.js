/**
 * eSocial S-1.3 — constantes oficiais (layouts evt v_S_01_03_00)
 */
export const ESOCIAL_SCHEMA_S13 = {
  'S-2210': {
    namespace: 'http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_03_00',
    root: 'evtCAT',
    layout: 'S-1.3',
  },
  'S-2220': {
    namespace: 'http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_03_00',
    root: 'evtMonit',
    layout: 'S-1.3',
  },
  'S-2240': {
    namespace: 'http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_03_00',
    root: 'evtExpRisco',
    layout: 'S-1.3',
  },
};

export const TRANSMISSION_STATUS = {
  PENDENTE: 'PENDENTE',
  ENVIANDO: 'ENVIANDO',
  ENVIADO: 'ENVIADO',
  PROCESSANDO: 'PROCESSANDO',
  ACEITO: 'ACEITO',
  REJEITADO: 'REJEITADO',
  ERRO: 'ERRO',
  TIMEOUT: 'TIMEOUT',
};

export const EVENT_STATUS_FROM_TRANSMISSION = {
  ACEITO: 'ACEITO',
  REJEITADO: 'REJEITADO',
  ENVIADO: 'ENVIADO',
  PROCESSANDO: 'ENVIADO',
  ERRO: 'REJEITADO',
};

export const GOVBR_MODES = ['MOCK', 'HTTP'];
