import { onlyDigits } from './esocialXml.js';
import { validateEsocialXsdS13 } from './esocialXsdValidator.js';

function isValidCpf(cpf) {
  const s = onlyDigits(cpf);
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(s[i]) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(s[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(s[i]) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(s[10]);
}

function isValidCnpj(cnpj) {
  const s = onlyDigits(cnpj);
  if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i += 1) sum += Number(s[i]) * w1[i];
  let d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (d1 !== Number(s[12])) return false;
  sum = 0;
  for (let i = 0; i < 13; i += 1) sum += Number(s[i]) * w2[i];
  let d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return d2 === Number(s[13]);
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
}

function pushError(errors, field, message) {
  errors.push({ field, message, severity: 'error' });
}

function pushWarning(warnings, field, message) {
  warnings.push({ field, message, severity: 'warning' });
}

export function validateEsocialConfig(config) {
  const errors = [];
  const warnings = [];
  if (!config?.nr_insc?.trim()) pushError(errors, 'nr_insc', 'CNPJ/CPF do empregador é obrigatório');
  else if (config.tp_insc === 1 && !isValidCnpj(config.nr_insc)) {
    pushWarning(warnings, 'nr_insc', 'CNPJ pode estar inválido — confira antes do envio gov.br');
  }
  if (![1, 2].includes(Number(config?.ambiente))) pushError(errors, 'ambiente', 'Ambiente deve ser 1 (produção) ou 2 (restrito)');
  return { valid: errors.length === 0, errors, warnings };
}

export function validateEsocialPayload(tipoEvento, config, payload) {
  const errors = [];
  const warnings = [];
  const cfg = validateEsocialConfig(config);
  errors.push(...cfg.errors);
  warnings.push(...cfg.warnings);

  if (!payload?.cpfTrab && !payload?.matricula && !payload?.codCateg) {
    pushError(errors, 'ideVinculo', 'Informe CPF, matrícula ou categoria do trabalhador');
  }
  if (payload?.cpfTrab && !isValidCpf(payload.cpfTrab)) {
    pushError(errors, 'cpfTrab', 'CPF do trabalhador inválido');
  }
  if (payload?.matricula && String(payload.matricula).length > 30) {
    pushError(errors, 'matricula', 'Matrícula excede 30 caracteres');
  }

  if (tipoEvento === 'S-2210') {
    const cat = payload?.cat ?? payload;
    if (!isIsoDate(cat?.dtAcid ?? payload?.dtAcid)) pushError(errors, 'dtAcid', 'Data do acidente obrigatória (AAAA-MM-DD)');
    if (!cat?.codSitGeradora && !payload?.codSitGeradora) pushWarning(warnings, 'codSitGeradora', 'Código situação geradora recomendado (Tabela 14)');
  }

  if (tipoEvento === 'S-2220') {
    const exames = payload?.monit?.exames ?? payload?.exames ?? [];
    if (!exames.length && !payload?.dtExm) pushError(errors, 'exames', 'Informe ao menos um exame ocupacional');
    for (const ex of exames) {
      if (!isIsoDate(ex.dtExm)) pushError(errors, 'dtExm', 'Data do exame inválida');
    }
  }

  if (tipoEvento === 'S-2240') {
    const agentes = payload?.expRisco?.agentes ?? payload?.agentes ?? [];
    if (!agentes.length && !payload?.codAgNoc && !payload?.agente) {
      pushError(errors, 'agentes', 'Informe ao menos um agente nocivo (Tabela 24)');
    }
    const dt = payload?.expRisco?.dtIniCondicao ?? payload?.dtIniCondicao;
    if (!isIsoDate(dt)) pushError(errors, 'dtIniCondicao', 'Data início condição obrigatória');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateEsocialXml(xml, tipoEvento) {
  return validateEsocialXsdS13(xml, tipoEvento);
}
