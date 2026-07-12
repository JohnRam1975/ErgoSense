/**
 * Validação XSD oficial eSocial S-1.3 — regras estruturais dos layouts v_S_01_03_00
 * Desacoplado: pode ser substituído por validador libxml/xmllint sem alterar rotas.
 */
import { DOMParser } from '@xmldom/xmldom';
import { ESOCIAL_SCHEMA_S13 } from './esocialConstants.js';

const REQUIRED_BY_EVENT = {
  'S-2210': {
    groups: ['ideEvento', 'ideEmpregador', 'ideVinculo', 'cat'],
    paths: [
      'ideEvento/indRetif',
      'ideEvento/tpAmb',
      'ideEvento/procEmi',
      'ideEvento/verProc',
      'ideEmpregador/tpInsc',
      'ideEmpregador/nrInsc',
      'cat/dtAcid',
      'cat/tpAcid',
      'cat/hrAcid',
      'cat/tpCat',
      'cat/codSitGeradora',
      'cat/localAcidente/tpLocal',
      'cat/parteAtingida/codParteAting',
      'cat/agenteCausador/codAgntCausador',
      'cat/atestado/dtAtendimento',
      'cat/atestado/codCID',
    ],
  },
  'S-2220': {
    groups: ['ideEvento', 'ideEmpregador', 'ideVinculo', 'exMedOcup'],
    paths: [
      'ideEvento/tpAmb',
      'exMedOcup/tpExameOcup',
      'exMedOcup/exame/dtExm',
      'exMedOcup/exame/procRealizado',
      'exMedOcup/medico/nmMed',
      'exMedOcup/medico/nrCRM',
    ],
  },
  'S-2240': {
    groups: ['ideEvento', 'ideEmpregador', 'ideVinculo', 'infoExpRisco'],
    paths: [
      'ideEvento/tpAmb',
      'infoExpRisco/dtIniCondicao',
      'infoExpRisco/infoAmb/localAmb',
      'infoExpRisco/infoAmb/dscSetor',
      'infoExpRisco/infoAtiv/dscAtiv',
      'infoExpRisco/agNoc/codAgNoc',
      'infoExpRisco/agNoc/tpAval',
      'infoExpRisco/agNoc/intConc',
    ],
  },
};

function pushError(errors, field, message) {
  errors.push({ field, message, severity: 'error', source: 'XSD-S1.3' });
}

function pushWarning(warnings, field, message) {
  warnings.push({ field, message, severity: 'warning', source: 'XSD-S1.3' });
}

function localName(node) {
  return node?.localName ?? node?.nodeName?.split(':').pop() ?? '';
}

function findFirst(doc, tagName) {
  const nodes = doc.getElementsByTagName(tagName);
  return nodes.length ? nodes[0] : null;
}

function hasPath(root, path) {
  const parts = path.split('/');
  let node = root;
  for (const part of parts) {
    if (!node) return false;
    const children = [...node.childNodes].filter((n) => n.nodeType === 1 && localName(n) === part);
    if (!children.length) return false;
    node = children[0];
  }
  return true;
}

function validateEventId(eventEl) {
  const id = eventEl?.getAttribute?.('Id') ?? '';
  return id.length === 36 && /^ID[A-Za-z0-9]+$/.test(id);
}

export function validateEsocialXsdS13(xml, tipoEvento) {
  const errors = [];
  const warnings = [];
  const schema = ESOCIAL_SCHEMA_S13[tipoEvento];
  const rules = REQUIRED_BY_EVENT[tipoEvento];

  if (!schema || !rules) {
    pushError(errors, 'tipoEvento', `Layout S-1.3 não definido para ${tipoEvento}`);
    return { valid: false, errors, warnings, schemaVersion: 'S-1.3' };
  }

  let doc;
  try {
    doc = new DOMParser().parseFromString(xml, 'text/xml');
    const parseErr = doc.getElementsByTagName('parsererror');
    if (parseErr.length) {
      pushError(errors, 'xml', 'XML malformado — parser error');
      return { valid: false, errors, warnings, schemaVersion: 'S-1.3' };
    }
  } catch (err) {
    pushError(errors, 'xml', `XML inválido: ${err.message}`);
    return { valid: false, errors, warnings, schemaVersion: 'S-1.3' };
  }

  const eSocial = findFirst(doc, 'eSocial');
  if (!eSocial) pushError(errors, 'eSocial', 'Elemento raiz eSocial ausente');

  const ns = eSocial?.getAttribute?.('xmlns') ?? '';
  if (ns && ns !== schema.namespace) {
    pushError(errors, 'xmlns', `Namespace esperado ${schema.namespace}, encontrado ${ns || '(vazio)'}`);
  }

  const eventEl = findFirst(doc, schema.root);
  if (!eventEl) {
    pushError(errors, schema.root, `Elemento ${schema.root} ausente`);
    return { valid: false, errors, warnings, schemaVersion: 'S-1.3' };
  }

  if (!validateEventId(eventEl)) {
    pushError(errors, 'Id', 'Atributo Id do evento deve ter 36 caracteres (padrão eSocial)');
  }

  for (const group of rules.groups) {
    if (!findFirst(eventEl, group)) {
      pushError(errors, group, `Grupo obrigatório ${group} ausente (layout S-1.3)`);
    }
  }

  for (const path of rules.paths) {
    if (!hasPath(eventEl, path)) {
      pushError(errors, path, `Campo obrigatório ${path} ausente (XSD S-1.3)`);
    }
  }

  const ideEvento = findFirst(eventEl, 'ideEvento');
  const tpAmb = ideEvento ? findFirst(ideEvento, 'tpAmb')?.textContent : null;
  if (tpAmb && !['1', '2'].includes(tpAmb)) {
    pushError(errors, 'tpAmb', 'tpAmb deve ser 1 (produção) ou 2 (restrito)');
  }

  const signatures = eventEl.getElementsByTagName('Signature');
  if (signatures.length === 0) {
    pushWarning(warnings, 'Signature', 'Assinatura XML-DSig ausente — obrigatória para transmissão gov.br');
  } else {
    const sigValue = signatures[0].getElementsByTagName('SignatureValue')[0]?.textContent ?? '';
    if (sigValue.includes('PENDENTE') || sigValue.length < 16) {
      pushWarning(warnings, 'SignatureValue', 'Assinatura ICP-Brasil incompleta ou placeholder');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    schemaVersion: 'S-1.3',
    namespace: schema.namespace,
    root: schema.root,
  };
}

export { REQUIRED_BY_EVENT, ESOCIAL_SCHEMA_S13 };
