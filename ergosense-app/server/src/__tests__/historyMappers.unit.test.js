/**
 * Mappers de histórico — PGR, GRO, SST
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPgrHistoryRow } from '../services/pgrHistory.js';
import { mapHistoryRow } from '../services/groHistory.js';
import {
  mapApr,
  mapEpi,
  mapEpc,
  mapInspecao,
  mapNc,
  mapCapa,
  mapTreinamento,
} from '../services/sstUtils.js';

const now = new Date('2026-06-01T12:00:00Z');

test('mapPgrHistoryRow — converte IDs e detalhes', () => {
  const row = {
    id: 10,
    tenant_id: 'vale',
    versao_id: 5,
    numero: 'PGR-001',
    acao: 'APROVACAO',
    usuario_id: 2,
    usuario_nome: 'Auditor',
    detalhes: { ok: true },
    created_at: now,
  };
  const m = mapPgrHistoryRow(row);
  assert.equal(m.id, '10');
  assert.equal(m.versionId, '5');
  assert.equal(m.versionNumber, 'PGR-001');
  assert.equal(m.action, 'APROVACAO');
});

test('mapHistoryRow — GRO com risco e etapa', () => {
  const row = {
    id: 1,
    tenant_id: 'vale',
    inventario_risco_id: 99,
    plano_acao_id: null,
    indicador_id: 3,
    etapa: 'CONTROLE',
    acao: 'AVANCO',
    usuario_id: 7,
    usuario_nome: 'Erg',
    detalhes: null,
    created_at: now,
    risco_perigo: 'Postura',
  };
  const m = mapHistoryRow(row);
  assert.equal(m.riskId, '99');
  assert.equal(m.stage, 'CONTROLE');
  assert.equal(m.riskHazard, 'Postura');
});

test('mapApr — campos SST APR', () => {
  const m = mapApr({
    id: 1,
    titulo: 'APR Solda',
    setor_id: 2,
    setor_nome: 'Solda',
    colaborador_id: null,
    inventario_risco_id: 3,
    atividade: 'Soldagem',
    local_trabalho: 'Galpão',
    etapas_json: [1],
    riscos_json: [2],
    medidas_json: [3],
    status: 'ativo',
    elaborado_por: 'RT',
    aprovado_em: now,
    validade_em: now,
    created_at: now,
    updated_at: now,
  });
  assert.equal(m.title, 'APR Solda');
  assert.equal(m.riskId, '3');
  assert.equal(m.validUntil, '2026-06-01');
});

test('mapEpi — CA e validade', () => {
  const m = mapEpi({
    id: 1,
    ca: '12345',
    tipo: 'Luva',
    descricao: 'Proteção',
    fabricante: 'Fab',
    validade_ca: now,
    inventario_risco_id: null,
    gro_plano_acao_id: null,
    ativo: true,
    observacoes: '',
    created_at: now,
  });
  assert.equal(m.ca, '12345');
  assert.equal(m.caExpiry, '2026-06-01');
});

test('mapEpc — localização e manutenção', () => {
  const m = mapEpc({
    id: 1,
    tipo: 'Exaustor',
    descricao: 'Ventilação',
    localizacao: 'Setor A',
    setor_id: 1,
    inventario_risco_id: 2,
    status: 'ok',
    manutencao_em: now,
    conformidade: 'conforme',
    observacoes: '',
  });
  assert.equal(m.location, 'Setor A');
  assert.equal(m.maintenanceDate, '2026-06-01');
});

test('mapInspecao — checklist e datas', () => {
  const m = mapInspecao({
    id: 1,
    titulo: 'Inspeção',
    tipo: 'rotina',
    setor_id: 1,
    inventario_risco_id: null,
    data_programada: now,
    data_realizada: null,
    checklist_json: [],
    resultado: 'ok',
    responsavel: 'João',
    status: 'pendente',
    observacoes: '',
  });
  assert.equal(m.scheduledDate, '2026-06-01');
  assert.equal(m.performedDate, null);
});

test('mapNc — severidade e prazo', () => {
  const m = mapNc({
    id: 1,
    titulo: 'NC-1',
    descricao: 'Falha',
    origem_tipo: 'auditoria',
    origem_id: 5,
    inventario_risco_id: 2,
    severidade: 'alta',
    status: 'aberta',
    data_identificacao: now,
    responsavel: 'Maria',
    prazo: now,
  });
  assert.equal(m.originId, '5');
  assert.equal(m.severity, 'alta');
});

test('mapCapa — vínculo NC e GRO', () => {
  const m = mapCapa({
    id: 1,
    nc_id: 2,
    inventario_risco_id: 3,
    gro_plano_acao_id: 4,
    tipo: 'corretiva',
    descricao: 'Ação',
    causa_raiz: 'Falta treino',
    acao: 'Treinar',
    responsavel: 'RH',
    prazo: now,
    status: 'andamento',
    evidencia: '',
    data_conclusao: null,
  });
  assert.equal(m.ncId, '2');
  assert.equal(m.groPlanId, '4');
});

test('mapTreinamento — horas e participantes', () => {
  const m = mapTreinamento({
    id: 1,
    titulo: 'NR-17',
    tipo: 'presencial',
    conteudo: 'Ergonomia',
    carga_horaria: 4,
    data_programada: now,
    data_realizada: now,
    instrutor: 'Erg',
    inventario_risco_id: null,
    status: 'realizado',
    participantes: 12,
  });
  assert.equal(m.hours, 4);
  assert.equal(m.participants, 12);
});
