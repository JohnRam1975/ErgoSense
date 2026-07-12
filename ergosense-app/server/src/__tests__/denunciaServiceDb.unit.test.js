import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMockRunQuery, rows } from './helpers/mockQuery.js';
import {
  mapDenunciaRow,
  nextProtocol,
  logDenunciaHistory,
  DENUNCIA_STATUS,
} from '../services/denunciaService.js';

describe('denunciaService — funções com runQuery mock', () => {
  it('nextProtocol incrementa sequência anual', async () => {
    const runQuery = createMockRunQuery([rows([{ c: 12 }])]);
    const protocol = await nextProtocol(runQuery, 'tenant-a');
    const year = new Date().getFullYear();
    assert.equal(protocol, `DEN-${year}-00013`);
  });

  it('mapDenunciaRow anonimiza denunciante em modalidade ANONIMA', () => {
    const mapped = mapDenunciaRow({
      id: 1,
      tenant_id: 't1',
      protocolo: 'DEN-2026-00001',
      tipo: 'ASSEDIO_MORAL',
      modalidade: 'ANONIMA',
      status: 'ABERTA',
      gravidade: 'alto',
      descricao: 'Relato',
      denunciante_nome: 'Secret',
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-02'),
    });
    assert.equal(mapped.reporterName, null);
    assert.equal(mapped.typeLabel, 'Assédio moral');
  });

  it('mapDenunciaRow identificada expõe contato', () => {
    const mapped = mapDenunciaRow({
      id: 2,
      tenant_id: 't1',
      protocolo: 'DEN-2026-00002',
      tipo: 'VIOLENCIA',
      modalidade: 'IDENTIFICADA',
      status: DENUNCIA_STATUS[0],
      gravidade: 'critico',
      descricao: 'Relato',
      denunciante_nome: 'João',
      denunciante_email: 'j@co.com',
      created_at: new Date(),
      updated_at: new Date(),
    });
    assert.equal(mapped.reporterName, 'João');
    assert.equal(mapped.reporterEmail, 'j@co.com');
  });

  it('logDenunciaHistory persiste ação', async () => {
    const calls = [];
    const runQuery = async (sql, params) => {
      calls.push({ sql, params });
      return rows([]);
    };
    await logDenunciaHistory(runQuery, 't1', 'den-1', 'STATUS', { id: 'u1', name: 'Admin' }, { from: 'A' });
    assert.ok(calls[0].sql.includes('denuncia_historico'));
    assert.equal(calls[0].params[2], 'STATUS');
  });
});
